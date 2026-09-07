import { writeFile } from "node:fs/promises";
import path from "node:path";
import { getUsers, getRosters } from "./lib/sleeperClient.mjs";
import { resolveCurrentLeague } from "./lib/leagueUtils.mjs";
import { generateSchedule } from "./lib/scheduleGenerator.mjs";

// Usage: node generate-schedule.mjs
//
// Generates this season's 14-week regular season schedule: 11 round-robin
// games (every team plays every other team once) + 3 extra tiered games
// (one vs a Contender, one vs a Middle team, one vs a Rebuilder, based on
// last season's Max PF), randomized within that structure. Run this once
// per season (after the rookie draft, before kickoff) and review the output
// before entering it into Sleeper — this is not reversible once posted.

async function main() {
  const league = await resolveCurrentLeague();
  if (!league.previous_league_id || league.previous_league_id === "0") {
    console.error("No previous season found — this generator needs last season's Max PF data for tiering.");
    process.exit(1);
  }

  const { tiers, weeks } = await generateSchedule(league, league.previous_league_id);
  const [users, rosters] = await Promise.all([getUsers(league.league_id), getRosters(league.league_id)]);
  const userById = new Map(users.map((u) => [u.user_id, u]));
  const ownerByRoster = new Map(rosters.map((r) => [r.roster_id, r.owner_id]));
  const nameOf = (rosterId) => {
    const user = userById.get(ownerByRoster.get(rosterId));
    return user?.metadata?.team_name || user?.display_name || `Roster ${rosterId}`;
  };

  const tierLines = [
    `### Contenders (last season's top 4 Max PF)`,
    ...tiers.contenders.map((t) => `- ${t.name} (${t.ppts.toFixed(2)})`),
    ``,
    `### Middle (5th-8th)`,
    ...tiers.middle.map((t) => `- ${t.name} (${t.ppts.toFixed(2)})`),
    ``,
    `### Rebuilders (9th-12th)`,
    ...tiers.rebuilders.map((t) => `- ${t.name} (${t.ppts.toFixed(2)})`),
  ].join("\n");

  const weekLines = weeks
    .map((w) => {
      const matchupLines = w.matchups.map(([a, b]) => `  - ${nameOf(a)} vs ${nameOf(b)}`).join("\n");
      return `**Week ${w.week}**\n${matchupLines}`;
    })
    .join("\n\n");

  const contents = `# ${league.season} Regular Season Schedule\n\n## Tiers (from last season's Max PF)\n\n${tierLines}\n\n## Schedule\n\n${weekLines}\n`;

  const outPath = path.join("output", `schedule-${league.season}.md`);
  await writeFile(outPath, contents, "utf-8");
  console.log(`Schedule written to ${outPath}`);
}

main().catch((err) => {
  console.error("generate-schedule.mjs failed:", err);
  process.exit(1);
});
