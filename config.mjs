// Commissioner's Sleeper user_id (stable across seasons; used to auto-discover
// each new league_id as the league rolls forward year to year).
export const COMMISSIONER_USER_ID = "555144740743131136";

// Known league_id as of setup (2026 season). Auto-discovery falls back to this
// if the API lookup for the current season comes up empty.
export const FALLBACK_LEAGUE_ID = "1314670832131276800";

export const SPORT = "nfl";

// Weekly waiver processing day/time. Not reliably derivable from Sleeper's
// waiver_day_of_week/daily_waivers_days settings (undocumented encoding), so
// this is maintained here — update if the league's waiver schedule changes.
// Preseason runs on a slower once-a-week cadence right after the rookie draft;
// the regular season switches to the standard Wednesday early-morning cycle.
export const PRESEASON_WAIVER_WEEKDAY = "Friday";
export const PRESEASON_WAIVER_TIME_LABEL = "3am EST";
export const REGULAR_SEASON_WAIVER_WEEKDAY = "Wednesday";
export const REGULAR_SEASON_WAIVER_TIME_LABEL = "3am EST";

// End-of-season payouts. Fixed every season per the commissioner.
export const PAYOUT_1ST = 300;
export const PAYOUT_2ND = 200;
export const PAYOUT_3RD = 100;
