import { writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveCurrentLeague } from "./lib/leagueUtils.mjs";
import { readState, writeState, wasSent, markSent, wasSentOnDate, markSentOnDate } from "./lib/state.mjs";
import { MESSAGE_TYPES } from "./lib/messageRegistry.mjs";

// Usage:
//   node check.mjs            Run all auto-triggerable message checks (default).
//   node check.mjs status     Report which message types are pending and which
//                             need an external lookup (e.g. web search) before
//                             they can be evaluated. For use by the scheduled agent.
//   node check.mjs fire <key> Draft + record a message type as sent, bypassing
//                             its auto-trigger. Used after an external check
//                             (e.g. the agent confirmed training camp is live).

function alreadySent(state, leagueId, type, trigger) {
  return type.recurring ? wasSentOnDate(state, leagueId, type.key, trigger?.dateStr) : wasSent(state, leagueId, type.key);
}

function markAsSent(state, leagueId, type, trigger) {
  return type.recurring ? markSentOnDate(state, leagueId, type.key, trigger.dateStr) : markSent(state, leagueId, type.key);
}

async function writeDraft(fileName, msg) {
  const outPath = path.join("output", fileName);
  const contents = `# ${msg.subject}\n\n${msg.body}\n\n---\n\n${
    msg.needsManualInput.length
      ? "## Before sending, fill in:\n" +
        msg.needsManualInput.map((m) => `- \`${m.placeholder}\`: ${m.prompt}`).join("\n")
      : "No manual edits needed — ready to send as-is."
  }\n`;
  await writeFile(outPath, contents, "utf-8");
  console.log(`ALERT: Draft written to ${outPath}`);
}

async function runAutoChecks() {
  const league = await resolveCurrentLeague();
  const state = await readState();
  let dirty = false;

  for (const type of MESSAGE_TYPES) {
    if (!type.autoTrigger) continue; // needs external check; use `status` / `fire`

    // For non-recurring types we can skip the trigger check entirely once sent.
    if (!type.recurring && wasSent(state, league.league_id, type.key)) continue;

    const trigger = await type.autoTrigger(league);
    if (!trigger) continue;
    if (alreadySent(state, league.league_id, type, trigger)) continue;

    console.log(`${type.label} is due for league ${league.league_id} (${league.season}).`);
    const msg = await type.build(league, trigger);
    await writeDraft(type.fileName(league, trigger), msg);
    markAsSent(state, league.league_id, type, trigger);
    dirty = true;
  }

  if (dirty) {
    await writeState(state);
  } else {
    console.log(`No action needed. Current league ${league.league_id} (${league.season}).`);
  }
}

async function runStatus() {
  const league = await resolveCurrentLeague();
  const state = await readState();
  const report = [];

  for (const type of MESSAGE_TYPES) {
    if (!type.autoTrigger) {
      const sent = !type.recurring && wasSent(state, league.league_id, type.key);
      report.push(
        sent
          ? { key: type.key, label: type.label, status: "already sent" }
          : { key: type.key, label: type.label, status: "needs external check", externalCheckHint: type.externalCheckHint }
      );
      continue;
    }

    if (!type.recurring && wasSent(state, league.league_id, type.key)) {
      report.push({ key: type.key, label: type.label, status: "already sent" });
      continue;
    }

    const trigger = await type.autoTrigger(league);
    const due = trigger && !alreadySent(state, league.league_id, type, trigger);
    report.push({ key: type.key, label: type.label, status: due ? "DUE (auto)" : "not yet due (auto-checked)" });
  }

  console.log(JSON.stringify({ league_id: league.league_id, season: league.season, messages: report }, null, 2));
}

async function runFire(key) {
  const type = MESSAGE_TYPES.find((t) => t.key === key);
  if (!type) {
    console.error(`Unknown message key "${key}". Valid keys: ${MESSAGE_TYPES.map((t) => t.key).join(", ")}`);
    process.exit(1);
  }
  const league = await resolveCurrentLeague();
  const state = await readState();

  const trigger = type.recurring
    ? { dateStr: new Date().toLocaleString("sv-SE", { timeZone: "America/New_York" }).slice(0, 10) }
    : {};

  if (alreadySent(state, league.league_id, type, trigger)) {
    console.log(`${type.label} was already sent for league ${league.league_id}${type.recurring ? ` on ${trigger.dateStr}` : ""}. Not re-firing.`);
    return;
  }
  const msg = await type.build(league, trigger);
  await writeDraft(type.fileName(league, trigger), msg);
  markAsSent(state, league.league_id, type, trigger);
  await writeState(state);
}

const [, , cmd, arg] = process.argv;

const run =
  cmd === "status" ? runStatus() : cmd === "fire" ? runFire(arg) : runAutoChecks();

run.catch((err) => {
  console.error("check.mjs failed:", err);
  process.exit(1);
});
