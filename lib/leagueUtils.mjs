import { getLeague, getUsers, getRosters, getLosersBracket, getDraft, getNFLState, getUserLeagues } from "./sleeperClient.mjs";
import { COMMISSIONER_USER_ID, FALLBACK_LEAGUE_ID, SPORT } from "../config.mjs";

// Every roster's owner_id plus any co_owners = every human actually controlling a team.
export async function getRosterOwnerIds(leagueId) {
  const rosters = await getRosters(leagueId);
  const ids = new Set();
  for (const r of rosters) {
    if (r.owner_id) ids.add(r.owner_id);
    for (const co of r.co_owners || []) ids.add(co);
  }
  return ids;
}

export async function diffOwners(currentLeagueId, previousLeagueId) {
  const [curIds, prevIds, curUsers] = await Promise.all([
    getRosterOwnerIds(currentLeagueId),
    getRosterOwnerIds(previousLeagueId),
    getUsers(currentLeagueId),
  ]);
  const nameMap = new Map(curUsers.map((u) => [u.user_id, u.display_name]));
  const newOwnerIds = [...curIds].filter((id) => !prevIds.has(id));
  const departedOwnerIds = [...prevIds].filter((id) => !curIds.has(id));
  return {
    newCount: newOwnerIds.length,
    newNames: newOwnerIds.map((id) => nameMap.get(id) || id),
    departedCount: departedOwnerIds.length,
  };
}

export function rosterCap(league) {
  return league.roster_positions.length + (league.settings.taxi_slots || 0);
}

export function draftRounds(league) {
  return league.settings.draft_rounds;
}

// The bonus round pick (e.g. "6.05") awarded to the winner of the previous
// season's consolation bracket. Consolation bracket final is the losers_bracket
// match with p === 1. Roster IDs are stable across a rollover even when a
// roster's owner changes, so we look the winning roster's draft slot up in the
// new league's draft object.
export async function getConsolationBonusPick(league) {
  if (!league.previous_league_id) return null;

  const losersBracket = await getLosersBracket(league.previous_league_id);
  const final = losersBracket.find((m) => m.p === 1);
  if (!final) return null;
  const winnerRosterId = final.w;

  if (!league.draft_id) return { winnerRosterId, round: null, slot: null };

  const draft = await getDraft(league.draft_id);
  const slotToRoster = draft.slot_to_roster_id || {};
  const slotEntry = Object.entries(slotToRoster).find(
    ([, rosterId]) => rosterId === winnerRosterId
  );
  if (!slotEntry) return { winnerRosterId, round: null, slot: null };

  const slot = Number(slotEntry[0]);
  const round = draftRounds(league) + 1;
  return { winnerRosterId, round, slot, label: `${round}.${String(slot).padStart(2, "0")}` };
}

// Total seasons this league has existed, counting `league` itself and walking
// back through previous_league_id until it terminates ("0" or empty).
export async function countSeasons(league) {
  let count = 1;
  let prevId = league.previous_league_id;
  while (prevId && prevId !== "0") {
    const prev = await getLeague(prevId);
    count++;
    prevId = prev.previous_league_id;
  }
  return count;
}

// Resolves the league_id for the league the commissioner is currently running.
// Starts from FALLBACK_LEAGUE_ID and walks forward if a new season's league
// has since been created (detected by matching league name under the
// commissioner's account for the current NFL season).
export async function resolveCurrentLeague() {
  const [nflState, fallbackLeague] = await Promise.all([
    getNFLState(),
    getLeague(FALLBACK_LEAGUE_ID),
  ]);

  if (fallbackLeague.season === nflState.season) {
    return fallbackLeague;
  }

  const candidates = await getUserLeagues(COMMISSIONER_USER_ID, SPORT, nflState.season);
  const match = candidates.find(
    (l) => l.name === fallbackLeague.name || l.previous_league_id === fallbackLeague.league_id
  );

  return match ? getLeague(match.league_id) : fallbackLeague;
}
