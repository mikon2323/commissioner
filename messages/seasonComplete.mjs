import { countSeasons } from "../lib/leagueUtils.mjs";
import {
  getFinalStandingsTop3,
  computeNextDraftOrder,
  getConsolationWinnerRosterId,
  findConsolationBonusPick,
} from "../lib/seasonWrapUp.mjs";
import { PAYOUT_1ST, PAYOUT_2ND, PAYOUT_3RD } from "../config.mjs";

const ORDINAL_WORDS = [
  "zeroth", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth",
  "eleventh", "twelfth", "thirteenth", "fourteenth", "fifteenth", "sixteenth", "seventeenth", "eighteenth",
  "nineteenth", "twentieth",
];
function ordinalWord(n) {
  return ORDINAL_WORDS[n] || `${n}th`;
}

// Fires once, when the just-finished season's league flips to status
// "complete" (playoffs done, champion decided) — this happens on the current
// league_id, before the commissioner manually rolls the league forward.
export async function getSeasonCompleteTrigger(league) {
  if (league.status !== "complete") return null;
  return {};
}

export async function buildSeasonCompleteMessage(league) {
  const top3 = await getFinalStandingsTop3(league);
  if (!top3) {
    return {
      subject: `${league.season} Season Complete`,
      body: "{{COULD_NOT_DETERMINE_PLAYOFF_RESULTS}}",
      needsManualInput: [{ placeholder: "{{COULD_NOT_DETERMINE_PLAYOFF_RESULTS}}", prompt: "Winners bracket data was incomplete — fill in this message manually." }],
    };
  }

  const [seasonCount, draftOrder, consolationWinnerRosterId] = await Promise.all([
    countSeasons(league),
    computeNextDraftOrder(league, top3),
    getConsolationWinnerRosterId(league),
  ]);
  const bonusPick = findConsolationBonusPick(league, draftOrder, consolationWinnerRosterId);

  const { champion, runnerUp, third } = top3;
  const recordPhrase =
    champion.losses === 0 && champion.ties === 0
      ? "completing an undefeated season"
      : `finishing the season ${champion.wins}-${champion.losses}${champion.ties ? `-${champion.ties}` : ""}`;

  const draftOrderLines = draftOrder.map((t) => `${t.pick}. ${t.name}`).join("\n");

  const payoutLine = third
    ? `${champion.name} ($${PAYOUT_1ST}) ${runnerUp.name} ($${PAYOUT_2ND}) ${third.name} ($${PAYOUT_3RD})`
    : `${champion.name} ($${PAYOUT_1ST}) ${runnerUp.name} ($${PAYOUT_2ND})`;

  const body = `🚨 @all Congratulations to ${champion.name} on ${recordPhrase} and winning the ${league.season} ${league.name} season!

We have now completed ${seasonCount} seasons and I am excited for the many more ahead. Thank you as always to those that have been here from the start, those that have joined along the way, and those who completed their first season with us for keeping this league fun and competitive.

Payouts for ${league.season} are assigned as follows: ${payoutLine}. A reminder that all members are required to be paid in two seasons ahead. {{PAID_IN_STATUS}} @all

The draft order (sorted by Max PF except top 3) is set as follows:

${draftOrderLines}

${
  bonusPick
    ? `Congrats to ${bonusPick.name} on winning the consolation bracket and securing an extra mid 2nd round pick. The placeholder for this pick will be the ${bonusPick.label}.`
    : "{{CONSOLATION_BONUS_PICK_DETAILS}}"
}

Once everyone is paid in I will transition the league to next season. Please continue to stay active and be on the lookout for announcements. Let me know if anyone has questions about anything I mentioned above. Once again thank you to everyone for a successful ${ordinalWord(seasonCount)} year. Happy offseason!`;

  const needsManualInput = [
    {
      placeholder: "{{PAID_IN_STATUS}}",
      prompt:
        `Fill in LeagueSafe payment status manually, e.g. "Everyone is paid in for ${Number(league.season) + 1} and should've received an email from LeagueSafe to pay in for ${Number(league.season) + 2}."`,
    },
  ];
  if (!bonusPick) {
    needsManualInput.push({
      placeholder: "{{CONSOLATION_BONUS_PICK_DETAILS}}",
      prompt: "Could not determine the consolation bracket winner — fill in that paragraph manually.",
    });
  }

  return {
    subject: `${league.season} Season Complete — ${champion.name} Champions!`,
    body,
    needsManualInput,
  };
}
