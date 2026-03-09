import * as migration_20260307_033448 from './20260307_033448';
import * as migration_20260309_025522_add_roles_and_audio_media from './20260309_025522_add_roles_and_audio_media';

export const migrations = [
  {
    up: migration_20260307_033448.up,
    down: migration_20260307_033448.down,
    name: '20260307_033448',
  },
  {
    up: migration_20260309_025522_add_roles_and_audio_media.up,
    down: migration_20260309_025522_add_roles_and_audio_media.down,
    name: '20260309_025522_add_roles_and_audio_media'
  },
];
