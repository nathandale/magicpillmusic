#!/usr/bin/env bash
# Deploy one DEMU commit to production as an immutable release folder.
#
#   deploy/deploy-release.sh <commit> [release-name]
#
# Run from the dev box inside this repo, in an interactive terminal. It ships
# `git archive <commit>` (never the working tree) and works in three phases:
#
#   1. Stage the release beside the live one and back up Postgres.
#   2. Run `payload migrate` attached to YOUR terminal. Payload may ask you to
#      confirm (production still carries a stale batch -1 "dev" marker from
#      2026-09-11); that answer is yours, never scripted.
#   3. Verify every migration is recorded, build, switch
#      /var/www/magicpillmusic-current, restart payload.service and health-check,
#      switching back to the previous release if the checks fail.
#
# Migrations run before the build because `next build` prerenders pages that
# query the database. They must stay additive so the live release keeps working
# on the migrated schema even if the build then fails.
set -euo pipefail

HOST="${DEMU_HOST:-root@74.207.247.179}"
COMMIT="$(git rev-parse --short "${1:?usage: deploy/deploy-release.sh <commit> [release-name]}")"
NAME="${2:-$COMMIT}"

git merge-base --is-ancestor "$COMMIT" origin/main || { echo "Refusing: $COMMIT is not on origin/main." >&2; exit 1; }
[[ -t 0 ]] || { echo "Run this from an interactive terminal: the migration step may ask you to confirm." >&2; exit 1; }

TAR="$(mktemp)"
trap 'rm -f "$TAR"' EXIT
git archive --format=tar -o "$TAR" "$COMMIT"
scp -q "$TAR" "$HOST:/root/demu-$NAME.tar"

# ── Phase 1: stage and back up ────────────────────────────────────────────────
ssh "$HOST" bash -s -- "$NAME" <<'REMOTE'
set -euo pipefail
NAME="$1"
TAR="/root/demu-$NAME.tar"
RELEASES=/var/www/magicpillmusic-releases
CURRENT=/var/www/magicpillmusic-current
R="$RELEASES/$NAME"
PREV="$(readlink -f "$CURRENT")"

if [[ -e "$R" ]]; then
  [[ "$(readlink -f "$R")" == "$PREV" ]] && { echo "$R is the live release." >&2; exit 1; }
  echo "==> Removing $R left by an earlier attempt that never went live"
  rm -rf "$R"
fi
echo "==> Staging $R (live: $PREV)"
mkdir "$R"
tar -x -C "$R" -f "$TAR"
rm -f "$TAR"
ln -s /etc/magicpillmusic.env "$R/.env"
rm -rf "$R/public/media" "$R/public/audio"
ln -s /var/lib/magicpillmusic/public-media "$R/public/media"
ln -s /var/lib/magicpillmusic/public-audio "$R/public/audio"

# Dependencies: reuse the live install only when the lockfiles are identical.
if cmp -s "$PREV/package-lock.json" "$R/package-lock.json" && cmp -s "$PREV/pnpm-lock.yaml" "$R/pnpm-lock.yaml"; then
  cp -al "$PREV/node_modules" "$R/node_modules"
else
  echo "Dependencies changed; install them in $R before deploying." >&2
  exit 1
fi
chown -R nathandale:nathandale "$R"
chown -h nathandale:nathandale "$R/.env" "$R/public/media" "$R/public/audio"

BACKUP="/var/backups/magicpillmusic/pre-$NAME-$(date -u +%Y%m%dT%H%MZ).dump"
echo "==> Backing up payload_db to $BACKUP"
(cd /tmp && sudo -u postgres pg_dump -Fc payload_db) > "$BACKUP"
chmod 600 "$BACKUP"
REMOTE

# ── Phase 2: migrate, attached to your terminal ───────────────────────────────
echo "==> Migrating. If Payload asks about dev mode, answer it yourself."
ssh -t "$HOST" "sudo -u nathandale bash -c 'cd /var/www/magicpillmusic-releases/$NAME && npx payload migrate'"

# ── Phase 3: verify, build, switch, health-check ──────────────────────────────
ssh "$HOST" bash -s -- "$NAME" <<'REMOTE'
set -euo pipefail
NAME="$1"
CURRENT=/var/www/magicpillmusic-current
R="/var/www/magicpillmusic-releases/$NAME"
PREV="$(readlink -f "$CURRENT")"

# Payload exits 0 even when its prompt is declined, so check the result itself.
RECORDED="$(cd /tmp && sudo -u postgres psql -d payload_db -Atc 'select name from payload_migrations')"
for file in "$R"/src/migrations/*.ts; do
  name="$(basename "$file" .ts)"
  [[ "$name" == index ]] && continue
  grep -qx "$name" <<<"$RECORDED" || { echo "Migration $name was not applied; stopping before the build. Live release untouched." >&2; exit 1; }
done
echo "==> All migrations recorded"

echo "==> Building (low priority; the live site keeps serving)"
sudo -u nathandale bash -c "cd '$R' && nice -n 19 ionice -c 3 npm run build" > "$R/build.log" 2>&1 \
  || { tail -40 "$R/build.log" >&2; echo "Build failed; live release untouched (the additive migration stays applied)." >&2; exit 1; }

health() {
  for _ in $(seq 1 60); do
    curl -fsS -o /dev/null http://127.0.0.1:3000/feeds/publisher && break
    sleep 2
  done
  curl -fsS -o /dev/null http://127.0.0.1:3000/feeds/publisher &&
  curl -fsS -o /dev/null https://magicpillmusic.com/admin/login &&
  curl -fsS -o /dev/null https://magicpillmusic.com/feeds/myradio-site &&
  [[ "$(curl -fsS -o /dev/null -w '%{content_type}' https://magicpillmusic.com/cards/myradio)" == image/jpeg* ]]
}

echo "==> Switching to $NAME and restarting"
ln -sfn "$R" "$CURRENT"
systemctl restart payload.service
if health; then
  echo "==> DEMU $NAME is live. Previous release kept at $PREV"
else
  echo "Health check failed; restoring $PREV" >&2
  ln -sfn "$PREV" "$CURRENT"
  systemctl restart payload.service
  exit 1
fi
REMOTE
