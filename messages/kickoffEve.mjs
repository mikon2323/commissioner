import { getNFLState } from "../lib/sleeperClient.mjs";
import { REGULAR_SEASON_WAIVER_WEEKDAY, REGULAR_SEASON_WAIVER_TIME_LABEL } from "../config.mjs";

// Fires the day before the NFL regular season kicks off. season_start_date
// comes straight from Sleeper's /state/nfl — no external lookup needed.
export async function getKickoffEveTrigger() {
  const nflState = await getNFLState();
  if (!nflState.season_start_date) return null;

  const kickoff = new Date(`${nflState.season_start_date}T00:00:00-05:00`); // ET calendar date
  const dayBefore = new Date(kickoff.getTime() - 24 * 60 * 60 * 1000);

  const now = new Date();
  if (now < dayBefore) return null; // not yet the day before
  if (now >= kickoff) return null; // kickoff already happened

  return { kickoff };
}

export function buildKickoffEveMessage(league) {
  const autosubs = league.settings.max_subs;

  const body = `🚨 @all As kickoff approaches tomorrow, a few final announcements:

Waivers are now on regular schedule (${REGULAR_SEASON_WAIVER_WEEKDAY} ${REGULAR_SEASON_WAIVER_TIME_LABEL})

Taxi Squads will lock in when the first game starts

${autosubs} autosubs are available to use per week

Good luck @all and enjoy the season.`;

  return {
    subject: `${league.season} Season Kickoff — Final Announcements`,
    body,
    needsManualInput: [],
  };
}
