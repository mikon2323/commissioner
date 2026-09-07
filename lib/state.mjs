import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_PATH = path.join(__dirname, "..", "state.json");

const DEFAULT_STATE = {
  // leagues[league_id] = { [messageType]: true } once that message has been
  // drafted for that league_id, so each one-time message fires exactly once
  // per league year.
  leagues: {},
};

export async function readState() {
  if (!existsSync(STATE_PATH)) return structuredClone(DEFAULT_STATE);
  const raw = await readFile(STATE_PATH, "utf-8");
  return { ...structuredClone(DEFAULT_STATE), ...JSON.parse(raw) };
}

export async function writeState(state) {
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2) + "\n", "utf-8");
}

export function wasSent(state, leagueId, messageType) {
  return Boolean(state.leagues[leagueId]?.[messageType]);
}

export function markSent(state, leagueId, messageType) {
  state.leagues[leagueId] = { ...(state.leagues[leagueId] || {}), [messageType]: true };
  return state;
}

// For messages that recur multiple times per league year (e.g. weekly),
// dedupe by date instead of a single sent flag.
export function wasSentOnDate(state, leagueId, messageType, dateStr) {
  const dates = state.leagues[leagueId]?.recurring?.[messageType] || [];
  return dates.includes(dateStr);
}

export function markSentOnDate(state, leagueId, messageType, dateStr) {
  const league = state.leagues[leagueId] || {};
  const recurring = league.recurring || {};
  const dates = recurring[messageType] || [];
  if (!dates.includes(dateStr)) dates.push(dateStr);
  state.leagues[leagueId] = { ...league, recurring: { ...recurring, [messageType]: dates } };
  return state;
}
