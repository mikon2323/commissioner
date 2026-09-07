import { getRosters, getUsers } from "./sleeperClient.mjs";

function teamName(user) {
  return user?.metadata?.team_name || user?.display_name || "Unknown";
}

// Tiers are based on last season's Max PF (ppts = optimal/potential lineup
// points), by roster_id (stable across a rollover even when ownership
// changes). Top 4 = Contenders, next 4 = Middle, bottom 4 = Rebuilders.
export async function classifyTiers(currentLeague, previousLeagueId) {
  const [prevRosters, curRosters, curUsers] = await Promise.all([
    getRosters(previousLeagueId),
    getRosters(currentLeague.league_id),
    getUsers(currentLeague.league_id),
  ]);

  const userById = new Map(curUsers.map((u) => [u.user_id, u]));
  const curOwnerByRoster = new Map(curRosters.map((r) => [r.roster_id, r.owner_id]));

  const ranked = prevRosters
    .map((r) => ({
      rosterId: r.roster_id,
      ppts: (r.settings.ppts || 0) + (r.settings.ppts_decimal || 0) / 100,
      name: teamName(userById.get(curOwnerByRoster.get(r.roster_id))),
    }))
    .sort((a, b) => b.ppts - a.ppts);

  if (ranked.length !== 12) {
    throw new Error(`Expected 12 teams, found ${ranked.length}. This generator assumes a 12-team league.`);
  }

  return {
    contenders: ranked.slice(0, 4),
    middle: ranked.slice(4, 8),
    rebuilders: ranked.slice(8, 12),
  };
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Random bipartite perfect matching between two equal-size groups.
function randomPerfectMatching(groupA, groupB) {
  const shuffledB = shuffle(groupB);
  return groupA.map((a, i) => [a, shuffledB[i]]);
}

// Random pairing within one group (must have even length).
function randomIntraPairing(group) {
  const shuffled = shuffle(group);
  const pairs = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    pairs.push([shuffled[i], shuffled[i + 1]]);
  }
  return pairs;
}

// Standard circle-method round robin: n-1 rounds, n/2 games each, every pair
// of teams meets exactly once. Requires even n.
export function generateRoundRobin(teamIds) {
  const arr = [...teamIds];
  const n = arr.length;
  const rounds = [];

  for (let r = 0; r < n - 1; r++) {
    const roundPairs = [];
    for (let i = 0; i < n / 2; i++) {
      roundPairs.push([arr[i], arr[n - 1 - i]]);
    }
    rounds.push(roundPairs);

    const last = arr[n - 1];
    for (let i = n - 1; i > 1; i--) arr[i] = arr[i - 1];
    arr[1] = last;
  }
  return rounds;
}

// The 3 extra tiered rounds. Structured so every team's 3 extra opponents are
// guaranteed to be exactly one Contender, one Middle, one Rebuilder (see
// scheduleGenerator design notes) — only WHICH specific team within each tier
// is randomized, matching "specific matchups will be made by randomized draw."
export function generateExtraRounds(contenderIds, middleIds, rebuilderIds) {
  const roundA = [...randomPerfectMatching(contenderIds, middleIds), ...randomIntraPairing(rebuilderIds)];
  const roundB = [...randomPerfectMatching(contenderIds, rebuilderIds), ...randomIntraPairing(middleIds)];
  const roundC = [...randomPerfectMatching(middleIds, rebuilderIds), ...randomIntraPairing(contenderIds)];
  return [roundA, roundB, roundC];
}

// Full 14-week schedule: 11 round-robin weeks + 3 tiered extra weeks,
// shuffled into a random week order. Returns { tiers, weeks: [{week, matchups: [[rosterId, rosterId], ...]}] }.
export async function generateSchedule(currentLeague, previousLeagueId) {
  const tiers = await classifyTiers(currentLeague, previousLeagueId);
  const contenderIds = tiers.contenders.map((t) => t.rosterId);
  const middleIds = tiers.middle.map((t) => t.rosterId);
  const rebuilderIds = tiers.rebuilders.map((t) => t.rosterId);
  const allIds = [...contenderIds, ...middleIds, ...rebuilderIds];

  const roundRobinRounds = generateRoundRobin(allIds);
  const extraRounds = generateExtraRounds(contenderIds, middleIds, rebuilderIds);
  const weeks = shuffle([...roundRobinRounds, ...extraRounds]).map((matchups, i) => ({
    week: i + 1,
    matchups,
  }));

  return { tiers, weeks };
}
