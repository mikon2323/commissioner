import { getUsers, getRosters, getWinnersBracket, getLosersBracket } from "./sleeperClient.mjs";
import { draftRounds } from "./leagueUtils.mjs";

function teamName(user) {
  return user?.metadata?.team_name || user?.display_name || "Unknown";
}

// Top 3 finishers from the winners bracket's placement matches: p:1 is the
// championship (winner = 1st, loser = 2nd), p:3 is the third-place game.
export async function getFinalStandingsTop3(league) {
  const [bracket, rosters, users] = await Promise.all([
    getWinnersBracket(league.league_id),
    getRosters(league.league_id),
    getUsers(league.league_id),
  ]);

  const userById = new Map(users.map((u) => [u.user_id, u]));
  const rosterById = new Map(rosters.map((r) => [r.roster_id, r]));
  const describe = (rosterId) => {
    const r = rosterById.get(rosterId);
    return {
      rosterId,
      name: teamName(userById.get(r.owner_id)),
      wins: r.settings.wins,
      losses: r.settings.losses,
      ties: r.settings.ties,
    };
  };

  const championshipMatch = bracket.find((m) => m.p === 1);
  const thirdPlaceMatch = bracket.find((m) => m.p === 3);
  if (!championshipMatch) return null;

  const championId = championshipMatch.w;
  const runnerUpId = championshipMatch.t1 === championId ? championshipMatch.t2 : championshipMatch.t1;

  return {
    champion: describe(championId),
    runnerUp: describe(runnerUpId),
    third: thirdPlaceMatch ? describe(thirdPlaceMatch.w) : null,
  };
}

// Next season's rookie draft order (commissioner's house rule): the 9 teams
// outside the top 3 finishers are sorted ascending by ppts ("Max PF" —
// potential/optimal-lineup points), picking 1-9; the top 3 finishers draft
// last, in reverse order of finish (3rd place picks 10, 2nd picks 11,
// champion picks 12).
export async function computeNextDraftOrder(league, top3) {
  const [rosters, users] = await Promise.all([getRosters(league.league_id), getUsers(league.league_id)]);
  const userById = new Map(users.map((u) => [u.user_id, u]));

  const top3RosterIds = new Set([top3.champion.rosterId, top3.runnerUp.rosterId, top3.third?.rosterId].filter(Boolean));

  const rest = rosters
    .filter((r) => !top3RosterIds.has(r.roster_id))
    .map((r) => ({
      rosterId: r.roster_id,
      name: teamName(userById.get(r.owner_id)),
      ppts: (r.settings.ppts || 0) + (r.settings.ppts_decimal || 0) / 100,
    }))
    .sort((a, b) => a.ppts - b.ppts);

  const order = [...rest, top3.third, top3.runnerUp, top3.champion].filter(Boolean);
  return order.map((t, i) => ({ ...t, pick: i + 1 }));
}

// Winner of the just-finished season's consolation bracket (losers_bracket
// p:1 match), and their slot in the freshly computed draft order above —
// this is derivable before the new league_id / draft object even exists.
export function findConsolationBonusPick(league, draftOrder, consolationWinnerRosterId) {
  const entry = draftOrder.find((t) => t.rosterId === consolationWinnerRosterId);
  if (!entry) return null;
  const round = draftRounds(league) + 1;
  return { ...entry, label: `${round}.${String(entry.pick).padStart(2, "0")}` };
}

export async function getConsolationWinnerRosterId(league) {
  const losersBracket = await getLosersBracket(league.league_id);
  const final = losersBracket.find((m) => m.p === 1);
  return final ? final.w : null;
}
