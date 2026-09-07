# Sleeper Commish Bot

Drafts recurring commissioner messages for the "Dynasty Dealers" Sleeper dynasty
league using live data from the Sleeper API. See `config.mjs` for league/user
IDs and a few settings that aren't derivable from the API (waiver day/time,
payout amounts).

## Usage

```
node check.mjs            # Run all auto-triggerable message checks
node check.mjs status     # JSON report of every message type's status
node check.mjs fire <key> # Manually draft + mark a message type as sent
```

Drafted messages are written to `output/` as markdown files. Anything
computed but not derivable from an API (e.g. LeagueSafe payment status, NFL
training camp dates) is left as a `{{PLACEHOLDER}}` for manual review before
sending.

## State persistence

`state.json` tracks which messages have already been sent per league_id (and,
for weekly recurring messages, per date) so nothing fires twice. **This file
must be committed back to the repo after every run** — a scheduled cloud
routine gets a fresh clone each time, so if state.json isn't pushed back,
every run will think nothing has ever been sent.

## Message types

See `lib/messageRegistry.mjs` for the full list, trigger logic, and which
ones need an external check (currently only `trainingCampActive`, since NFL
training camp dates aren't in Sleeper's API).

## Automation architecture

- **Local**: Windows Task Scheduler (`SleeperCommishBot-DailyCheck`, see
  `run-daily-check.ps1`) runs `check.mjs` daily and pushes any new drafts /
  state changes to this repo. This does the actual work — the Sleeper API
  isn't reachable from the cloud sandbox below.
- **Cloud**: a claude.ai routine ("Sleeper Commish Bot — Daily Notify") runs
  shortly after, reads recent git history for new files under `output/`, and
  sends a push notification with the drafted text. It's read-only against
  this repo and cannot reach api.sleeper.app.
- **Dashboard**: https://claude.ai/code/artifact/d1f5e3cd-98af-4332-91f1-fd8bc042c418
  shows drafted messages in a browsable feed. It does **not** auto-update —
  writing to an artifact's database from an unattended cloud routine hangs on
  a permission prompt nobody can approve (tried both `allowed_tools` and
  `permission_mode: bypassPermissions`; neither works around it). Ask Claude
  in an interactive session to sync it from the latest GitHub state whenever
  you want it current.
