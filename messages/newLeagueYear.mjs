import { diffOwners, rosterCap, draftRounds, getConsolationBonusPick } from "../lib/leagueUtils.mjs";

// Message #1 of the offseason cycle: sent once the commissioner rolls the
// league forward into a new season in Sleeper. Fires when resolveCurrentLeague()
// returns a league_id that differs from the previously known one.
export async function buildNewLeagueYearMessage(league) {
  const [{ newCount }, bonusPick] = await Promise.all([
    diffOwners(league.league_id, league.previous_league_id),
    getConsolationBonusPick(league),
  ]);
  const cap = rosterCap(league);
  const rounds = draftRounds(league);
  const bonusPickLabel = bonusPick?.label ?? "{{CONSOLATION_BONUS_PICK}}";

  const body = `Welcome to the ${league.season} league year!

A few notes as we kick off the new season:

1. We are pleased to welcome ${newCount} new member${newCount === 1 ? "" : "s"} to the league this year.

2. {{RULE_PROPOSALS}}

3. Waivers will remain disabled until after the rookie draft concludes.

4. Taxi squad and IR slots are locked until the preseason. Once rosters are unlocked, please confirm your taxi squad and IR are empty and that your total roster does not exceed ${cap} players.

5. The draft order has been finalized. As a reminder, our draft consists of ${rounds} rounds, and pick ${bonusPickLabel} is the additional selection awarded to the winner of the consolation bracket.`;

  const needsManualInput = [
    {
      placeholder: "{{RULE_PROPOSALS}}",
      prompt:
        'Fill in item 2 manually, e.g. "No new rule proposals this season." or a summary of the proposal(s) and outcome.',
    },
  ];
  if (!bonusPick?.label) {
    needsManualInput.push({
      placeholder: "{{CONSOLATION_BONUS_PICK}}",
      prompt:
        "Could not auto-determine the consolation bracket bonus pick (draft order may not be set yet) — fill in manually, e.g. \"6.05\".",
    });
  }

  return {
    subject: `Welcome to the ${league.season} League Year`,
    body,
    needsManualInput,
  };
}
