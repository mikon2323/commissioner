import { getUsers, getRosters, getMatchups, getNFLState } from "./sleeperClient.mjs";

function teamName(user) {
  return user?.metadata?.team_name || user?.display_name || "Unknown";
}

// Cumulative wins/losses/ties/fpts for every roster through the end of
// `throughWeek` (inclusive), derived from actual weekly matchup results —
// final-season roster totals don't reflect a specific point in time.
async function getCumulativeStats(leagueId, throughWeek) {
  const weekPromises = [];
  for (let w = 1; w <= throughWeek; w++) weekPromises.push(getMatchups(leagueId, w));
  const allWeeks = await Promise.all(weekPromises);

  const stats = {};
  for (const week of allWeeks) {
    const byMatchupId = {};
    for (const m of week) {
      (byMatchupId[m.matchup_id] ||= []).push(m);
    }
    for (const pair of Object.values(byMatchupId)) {
      if (pair.length !== 2) continue; // bye or malformed week
      const [a, b] = pair;
      stats[a.roster_id] ||= { wins: 0, losses: 0, ties: 0, fpts: 0 };
      stats[b.roster_id] ||= { wins: 0, losses: 0, ties: 0, fpts: 0 };
      stats[a.roster_id].fpts += a.points || 0;
      stats[b.roster_id].fpts += b.points || 0;
      if (a.points > b.points) {
        stats[a.roster_id].wins++;
        stats[b.roster_id].losses++;
      } else if (b.points > a.points) {
        stats[b.roster_id].wins++;
        stats[a.roster_id].losses++;
      } else {
        stats[a.roster_id].ties++;
        stats[b.roster_id].ties++;
      }
    }
  }
  return stats;
}

// League's playoff format (confirmed with commissioner): the 6 playoff spots
// are the top 3 teams by record PLUS the top 3 teams by points-for among the
// remaining teams (so a team can only occupy one qualifying slot; if it's
// top-3 in both categories, the next-highest-PF team backfills the PF side).
// Seeding among all 6 qualifiers is then purely by points-for, highest to
// lowest: seeds 1-2 get byes, 3v6 and 4v5 play the opening round.
export async function computePlayoffPicture(league, currentWeekOverride) {
  const currentWeek = currentWeekOverride ?? (await getNFLState()).week;
  const playoffWeekStart = league.settings.playoff_week_start;
  const lastCompletedWeek = Math.max(0, Math.min(currentWeek - 1, playoffWeekStart - 1));

  const [stats, rosters, users] = await Promise.all([
    getCumulativeStats(league.league_id, lastCompletedWeek),
    getRosters(league.league_id),
    getUsers(league.league_id),
  ]);

  const userById = new Map(users.map((u) => [u.user_id, u]));
  const teams = rosters.map((r) => {
    const s = stats[r.roster_id] || { wins: 0, losses: 0, ties: 0, fpts: 0 };
    return {
      rosterId: r.roster_id,
      name: teamName(userById.get(r.owner_id)),
      ...s,
    };
  });

  const byRecord = [...teams].sort((a, b) => b.wins - a.wins || b.fpts - a.fpts);
  const recordQualifiers = byRecord.slice(0, 3);
  const recordQualifierIds = new Set(recordQualifiers.map((t) => t.rosterId));

  const remaining = teams.filter((t) => !recordQualifierIds.has(t.rosterId));
  const byPF = [...remaining].sort((a, b) => b.fpts - a.fpts);
  const pfQualifiers = byPF.slice(0, 3);
  const pfCutoff = pfQualifiers[2]; // 3rd/lowest PF-qualifying spot

  const qualifiers = [...recordQualifiers, ...pfQualifiers].sort((a, b) => b.fpts - a.fpts);
  const seeds = qualifiers.map((t, i) => ({ ...t, seed: i + 1 }));

  const byes = seeds.slice(0, 2);
  const matchups = [
    { higher: seeds[2], lower: seeds[5] }, // 3 vs 6
    { higher: seeds[3], lower: seeds[4] }, // 4 vs 5
  ];

  const remainingWeeks = Math.max(0, playoffWeekStart - 1 - lastCompletedWeek);
  const outside = byPF.slice(3); // not in the 6 qualifiers, ranked by PF

  const inTheHunt = outside
    .map((t) => ({ ...t, gap: t.fpts - pfCutoff.fpts }))
    .filter((t) => Math.abs(t.gap) < 100) // commissioner's rule: within 100 PF is "in the hunt"
    .sort((a, b) => b.fpts - a.fpts);

  return { lastCompletedWeek, remainingWeeks, byes, matchups, inTheHunt, pfCutoff };
}
