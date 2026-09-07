import { getNFLState } from "../lib/sleeperClient.mjs";
import { computePlayoffPicture } from "../lib/playoffPicture.mjs";

const WEEK_LABELS = { 4: "1 month", 3: "3 weeks", 2: "2 weeks", 1: "1 week" };

// Weekly, Tuesdays at/after 10am EST, for the final month of the regular
// season (remainingWeeks 4 down through 1, i.e. up to and including the last
// week before playoffs start).
export async function getPlayoffPictureTrigger(league) {
  if (league.status !== "in_season") return null;

  const nflState = await getNFLState();
  const playoffWeekStart = league.settings.playoff_week_start;
  const remainingWeeks = playoffWeekStart - nflState.week;
  if (remainingWeeks < 1 || remainingWeeks > 4) return null;

  const now = new Date();
  const weekday = now.toLocaleString("en-US", { timeZone: "America/New_York", weekday: "long" });
  if (weekday !== "Tuesday") return null;
  const hour = Number(now.toLocaleString("en-US", { timeZone: "America/New_York", hour: "numeric", hour12: false }));
  if (hour < 10) return null;

  const dateStr = now.toLocaleString("sv-SE", { timeZone: "America/New_York" }).slice(0, 10);
  return { dateStr, remainingWeeks };
}

export async function buildPlayoffPictureMessage(league, trigger) {
  const picture = await computePlayoffPicture(league);
  const label = WEEK_LABELS[trigger.remainingWeeks] || `${trigger.remainingWeeks} weeks`;

  const byeLine = picture.byes.map((t) => `(${t.seed}) ${t.name}`).join("; ");
  const matchupLines = picture.matchups
    .map((m) => `(${m.higher.seed}) ${m.higher.name} vs (${m.lower.seed}) ${m.lower.name}`)
    .join("\n");
  const huntLine = picture.inTheHunt.length
    ? picture.inTheHunt.map((t) => `${t.name} (${t.gap.toFixed(2)} PF)`).join(", ")
    : "None";

  const body = `🚨 @all Playoff picture with ${label} of regular season left:

Bye: ${byeLine}

${matchupLines}

In The Hunt: ${huntLine}`;

  return {
    subject: `Playoff Picture — ${label} Left`,
    body,
    needsManualInput: [],
  };
}
