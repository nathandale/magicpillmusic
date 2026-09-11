import * as migration_20260307_033448 from './20260307_033448';
import * as migration_20260309_025522_add_roles_and_audio_media from './20260309_025522_add_roles_and_audio_media';
import * as migration_20260911_052236_add_myradio_presentation from './20260911_052236_add_myradio_presentation';
import * as migration_20260911_054053_add_track_funding_and_provider from './20260911_054053_add_track_funding_and_provider';

export const migrations = [
  {
    up: migration_20260307_033448.up,
    down: migration_20260307_033448.down,
    name: '20260307_033448',
  },
  {
    up: migration_20260309_025522_add_roles_and_audio_media.up,
    down: migration_20260309_025522_add_roles_and_audio_media.down,
    name: '20260309_025522_add_roles_and_audio_media',
  },
  {
    up: migration_20260911_052236_add_myradio_presentation.up,
    down: migration_20260911_052236_add_myradio_presentation.down,
    name: '20260911_052236_add_myradio_presentation',
  },
  {
    up: migration_20260911_054053_add_track_funding_and_provider.up,
    down: migration_20260911_054053_add_track_funding_and_provider.down,
    name: '20260911_054053_add_track_funding_and_provider'
  },
];
