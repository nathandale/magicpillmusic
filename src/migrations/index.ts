import * as migration_20260307_033448 from './20260307_033448';
import * as migration_20260309_025522_add_roles_and_audio_media from './20260309_025522_add_roles_and_audio_media';
import * as migration_20260911_052236_add_myradio_presentation from './20260911_052236_add_myradio_presentation';
import * as migration_20260911_054053_add_track_funding_and_provider from './20260911_054053_add_track_funding_and_provider';
import * as migration_20260911_062718_add_channel_order from './20260911_062718_add_channel_order';
import * as migration_20260911_090401_add_track_hide_funding from './20260911_090401_add_track_hide_funding';
import * as migration_20260916_203716_add_track_credits_story from './20260916_203716_add_track_credits_story';
import * as migration_20260916_205150_replace_credits_with_notes from './20260916_205150_replace_credits_with_notes';
import * as migration_20260916_211319_add_track_year from './20260916_211319_add_track_year';
import * as migration_20260917_204320_add_signal_publishing_ws1a from './20260917_204320_add_signal_publishing_ws1a';

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
    name: '20260911_054053_add_track_funding_and_provider',
  },
  {
    up: migration_20260911_062718_add_channel_order.up,
    down: migration_20260911_062718_add_channel_order.down,
    name: '20260911_062718_add_channel_order',
  },
  {
    up: migration_20260911_090401_add_track_hide_funding.up,
    down: migration_20260911_090401_add_track_hide_funding.down,
    name: '20260911_090401_add_track_hide_funding',
  },
  {
    up: migration_20260916_203716_add_track_credits_story.up,
    down: migration_20260916_203716_add_track_credits_story.down,
    name: '20260916_203716_add_track_credits_story',
  },
  {
    up: migration_20260916_205150_replace_credits_with_notes.up,
    down: migration_20260916_205150_replace_credits_with_notes.down,
    name: '20260916_205150_replace_credits_with_notes',
  },
  {
    up: migration_20260916_211319_add_track_year.up,
    down: migration_20260916_211319_add_track_year.down,
    name: '20260916_211319_add_track_year',
  },
  {
    up: migration_20260917_204320_add_signal_publishing_ws1a.up,
    down: migration_20260917_204320_add_signal_publishing_ws1a.down,
    name: '20260917_204320_add_signal_publishing_ws1a'
  },
];
