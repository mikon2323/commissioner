import { rosterCap } from "../lib/leagueUtils.mjs";
import { TRAINING_CAMP_START_DATE } from "../config.mjs";

// Trigger for this one is NOT derivable from Sleeper's API — it's the
// real-world date the first NFL team opens training camp, which varies year
// to year. check.mjs (running locally, not in the sandboxed cloud routine)
// can't do a live web search, so TRAINING_CAMP_START_DATE in config.mjs is a
// manually-set date the commissioner updates once each offseason.
export function getTrainingCampActiveTrigger() {
  if (!TRAINING_CAMP_START_DATE) return null;
  const startDate = new Date(`${TRAINING_CAMP_START_DATE}T00:00:00-05:00`);
  return Date.now() >= startDate.getTime() ? {} : null;
}

export function buildTrainingCampActiveMessage(league) {
  const activeSpots = league.roster_positions.length;
  const taxiSlots = league.settings.taxi_slots || 0;
  const irSlots = league.settings.reserve_slots || 0;
  const oldCap = rosterCap(league); // active + taxi, no IR usable pre-camp

  const body = `@all With all training camps kicking off this week, ${irSlots} IR slots and ${taxiSlots} taxi slots are now active. Active rosters were ${oldCap} spots, now they will be ${activeSpots} spots + ${taxiSlots} taxi + ${irSlots} IR.`;

  return {
    subject: `Training Camp Roster Update — ${league.season}`,
    body,
    needsManualInput: [],
  };
}
