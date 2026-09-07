import { getDraft } from "../lib/sleeperClient.mjs";
import { rosterCap, getConsolationBonusPick } from "../lib/leagueUtils.mjs";

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

function formatDraftDateTime(startTimeMs) {
  const d = new Date(startTimeMs);
  const weekday = d.toLocaleString("en-US", { timeZone: "America/New_York", weekday: "long" });
  const monthDay = d.toLocaleString("en-US", { timeZone: "America/New_York", month: "long", day: "numeric" });
  const hour = Number(d.toLocaleString("en-US", { timeZone: "America/New_York", hour: "numeric", hour12: false }));
  const minute = Number(d.toLocaleString("en-US", { timeZone: "America/New_York", minute: "numeric" }));
  const period = hour < 12 ? "am" : "pm";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const time = minute === 0 ? `${hour12}${period}` : `${hour12}:${String(minute).padStart(2, "0")}${period}`;
  return `${weekday} ${monthDay} at ${time} EST`;
}

// Returns null if the draft has no scheduled start_time yet (commissioner
// hasn't set it in Sleeper's draft settings), or if we're not yet within the
// 2-week send window.
export async function getRookieDraftReminderTrigger(league) {
  if (!league.draft_id) return null;
  const draft = await getDraft(league.draft_id);
  if (!draft.start_time) return null;

  const sendAt = draft.start_time - TWO_WEEKS_MS;
  if (Date.now() < sendAt) return null;
  if (Date.now() >= draft.start_time) return null; // draft already happened

  return { draft, sendAt };
}

export async function buildRookieDraftReminderMessage(league, draft) {
  const cap = rosterCap(league);
  const rounds = league.settings.draft_rounds;
  const teams = league.settings.num_teams || league.total_rosters;
  const lastPickLabel = `${rounds}.${String(teams).padStart(2, "0")}`;

  const bonusPick = await getConsolationBonusPick(league);
  // "Halfway through the round" is a fixed structural point (half of the
  // team count), independent of which team's draft slot the bonus pick label
  // uses — those are two unrelated numbers.
  const halfway = teams / 2;
  const beforeHalf = String(halfway).padStart(2, "0");
  const afterHalf = String(halfway + 1).padStart(2, "0");
  let bonusPickLine;
  if (bonusPick?.label) {
    bonusPickLine = `3. Please be mindful that we have an extra 2nd round pick, which will be made halfway through the round (between picks 2.${beforeHalf} and 2.${afterHalf}). The placeholder for this pick is ${bonusPick.label}, and the selection should be announced in the chat. I will then manually assign that player to pick ${bonusPick.label}. Whoever owns pick 2.${afterHalf}, please do not make your selection until then.`;
  } else {
    bonusPickLine = `3. {{CONSOLATION_BONUS_PICK_DETAILS}}`;
  }

  const dateTimeLabel = formatDraftDateTime(draft.start_time);

  const body = `🚨 @all Our rookie draft kicks off in 2 weeks on ${dateTimeLabel}.

A few reminders for the draft:

1. The pick timer is unlimited, so take the time you need to evaluate your options — but please stay as active as possible while on the clock. I will check in if an unreasonable amount of time passes with no activity.

2. The draft will run ${rounds} rounds. I will end the draft after pick ${lastPickLabel}.

${bonusPickLine}

4. Once the draft concludes, weekly waivers will be activated and you will be able to bid on available players. Free agency will remain locked, meaning you will not be able to add players outside of waivers.

5. If your roster exceeds ${cap} players once the draft ends, you will not be able to make roster moves until you get under the limit — please make sure you're compliant post-draft.`;

  return {
    subject: `Rookie Draft Reminder — ${dateTimeLabel}`,
    body,
    needsManualInput: bonusPick?.slot
      ? []
      : [
          {
            placeholder: "{{CONSOLATION_BONUS_PICK_DETAILS}}",
            prompt:
              "Could not auto-determine the consolation bonus pick slot (draft order may not be set) — fill in item 3 manually.",
          },
        ],
  };
}
