import { getDraft } from "../lib/sleeperClient.mjs";
import { rosterCap } from "../lib/leagueUtils.mjs";
import { nextWeekdayAfter, formatDateLong } from "../lib/dateUtils.mjs";
import { PRESEASON_WAIVER_WEEKDAY as WAIVER_WEEKDAY, PRESEASON_WAIVER_TIME_LABEL as WAIVER_TIME_LABEL } from "../config.mjs";

// Fires once the rookie draft's status flips to "complete" (drafts here run
// slow, async, over roughly a week — trigger is the status change itself,
// not a fixed duration).
export async function getDraftCompleteTrigger(league) {
  if (!league.draft_id) return null;
  const draft = await getDraft(league.draft_id);
  if (draft.status !== "complete") return null;
  return { draft };
}

export function buildDraftCompleteMessage(league) {
  const cap = rosterCap(league);
  const nextWaiverDate = formatDateLong(nextWeekdayAfter(new Date(), WAIVER_WEEKDAY));

  const body = `That concludes our draft — thank you all for staying engaged throughout the week. A few things to note:

1. Please ensure your roster has no more than ${cap} total players as soon as possible.

2. Waivers will begin running weekly starting next ${WAIVER_WEEKDAY}, ${nextWaiverDate} (${WAIVER_WEEKDAY}s at ${WAIVER_TIME_LABEL}).

3. Free agents will remain locked until the season starts, so waivers are the only way to add players until then.

4. Our league schedule will be posted later this week.`;

  return {
    subject: `${league.season} Rookie Draft Complete`,
    body,
    needsManualInput: [],
  };
}
