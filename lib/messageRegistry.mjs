import { buildNewLeagueYearMessage } from "../messages/newLeagueYear.mjs";
import { getRookieDraftReminderTrigger, buildRookieDraftReminderMessage } from "../messages/rookieDraftReminder.mjs";
import { getDraftCompleteTrigger, buildDraftCompleteMessage } from "../messages/draftComplete.mjs";
import { getTrainingCampActiveTrigger, buildTrainingCampActiveMessage } from "../messages/trainingCampActive.mjs";
import { getKickoffEveTrigger, buildKickoffEveMessage } from "../messages/kickoffEve.mjs";
import { getPoachingReminderTrigger, buildPoachingReminderMessage } from "../messages/poachingReminder.mjs";
import { getPlayoffPictureTrigger, buildPlayoffPictureMessage } from "../messages/playoffPicture.mjs";
import { getSeasonCompleteTrigger, buildSeasonCompleteMessage } from "../messages/seasonComplete.mjs";

// Every message type, in the order it occurs during the league year.
// autoTrigger(league) -> truthy trigger data | null; build(league, trigger)
// returns { subject, body, needsManualInput }.
//
// `recurring: true` means this fires repeatedly (not once per league_id) —
// trigger must return { dateStr } and dedupe is by date, not a single flag.
export const MESSAGE_TYPES = [
  {
    key: "newLeagueYear",
    label: "New league year welcome",
    autoTrigger: async () => true, // fires whenever this league_id is first seen; handled in check.mjs
    build: async (league) => buildNewLeagueYearMessage(league),
    fileName: (league) => `new-league-year-${league.season}.md`,
  },
  {
    key: "rookieDraftReminder",
    label: "Rookie draft reminder (2 weeks out)",
    autoTrigger: async (league) => getRookieDraftReminderTrigger(league),
    build: async (league, trigger) => buildRookieDraftReminderMessage(league, trigger.draft),
    fileName: (league) => `rookie-draft-reminder-${league.season}.md`,
  },
  {
    key: "draftComplete",
    label: "Draft complete",
    autoTrigger: async (league) => getDraftCompleteTrigger(league),
    build: async (league) => buildDraftCompleteMessage(league),
    fileName: (league) => `draft-complete-${league.season}.md`,
  },
  {
    key: "trainingCampActive",
    label: "Training camp / IR+taxi slots active",
    autoTrigger: async () => getTrainingCampActiveTrigger(),
    build: async (league) => buildTrainingCampActiveMessage(league),
    fileName: (league) => `training-camp-active-${league.season}.md`,
  },
  {
    key: "kickoffEve",
    label: "Season kickoff eve — final announcements",
    autoTrigger: async () => getKickoffEveTrigger(),
    build: async (league) => buildKickoffEveMessage(league),
    fileName: (league) => `kickoff-eve-${league.season}.md`,
  },
  {
    key: "poachingReminder",
    label: "Weekly poaching window reminder (Tuesdays)",
    recurring: true,
    autoTrigger: async (league) => getPoachingReminderTrigger(league),
    build: async () => buildPoachingReminderMessage(),
    fileName: (league, trigger) => `poaching-reminder-${trigger.dateStr}.md`,
  },
  {
    key: "playoffPicture",
    label: "Weekly playoff picture (final month of regular season)",
    recurring: true,
    autoTrigger: async (league) => getPlayoffPictureTrigger(league),
    build: async (league, trigger) => buildPlayoffPictureMessage(league, trigger),
    fileName: (league, trigger) => `playoff-picture-${trigger.dateStr}.md`,
  },
  {
    key: "seasonComplete",
    label: "Season complete — champion, payouts, next draft order",
    autoTrigger: async (league) => getSeasonCompleteTrigger(league),
    build: async (league) => buildSeasonCompleteMessage(league),
    fileName: (league) => `season-complete-${league.season}.md`,
  },
];
