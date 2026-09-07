import { rosterCap } from "../lib/leagueUtils.mjs";

// Trigger for this one is NOT derivable from Sleeper's API — it's the
// real-world date the first NFL team opens training camp, which varies year
// to year and must be looked up (see check.mjs status / fire). This module
// only builds the message content once the caller has confirmed camp is open.
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
