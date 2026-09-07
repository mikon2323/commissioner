import { getNFLState } from "../lib/sleeperClient.mjs";

// Weekly reminder, sent Tuesdays at/after 10am EST, only while the season is
// active: from kickoff (Sleeper's season_start_date) through the end of the
// fantasy season (league.status flips off "in_season" once the season, incl.
// playoffs, fully concludes). Recurs every Tuesday in that window, so the
// trigger returns a dateStr used to dedupe — see wasSentOnDate/markSentOnDate.
export async function getPoachingReminderTrigger(league) {
  if (league.status !== "in_season") return null;

  const nflState = await getNFLState();
  if (!nflState.season_start_date) return null;

  const kickoff = new Date(`${nflState.season_start_date}T00:00:00-05:00`);
  const now = new Date();
  if (now < kickoff) return null;

  const weekday = now.toLocaleString("en-US", { timeZone: "America/New_York", weekday: "long" });
  if (weekday !== "Tuesday") return null;

  const hour = Number(now.toLocaleString("en-US", { timeZone: "America/New_York", hour: "numeric", hour12: false }));
  if (hour < 10) return null;

  const dateStr = now.toLocaleString("sv-SE", { timeZone: "America/New_York" }).slice(0, 10); // YYYY-MM-DD
  return { dateStr };
}

export function buildPoachingReminderMessage() {
  return {
    subject: "Weekly Reminder — Poaching Window",
    body: "Reminder: Poaching window open today",
    needsManualInput: [],
  };
}
