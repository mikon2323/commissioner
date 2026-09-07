const BASE = "https://api.sleeper.app/v1";

async function getJSON(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    throw new Error(`Sleeper API ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const getLeague = (leagueId) => getJSON(`/league/${leagueId}`);
export const getUsers = (leagueId) => getJSON(`/league/${leagueId}/users`);
export const getRosters = (leagueId) => getJSON(`/league/${leagueId}/rosters`);
export const getMatchups = (leagueId, week) => getJSON(`/league/${leagueId}/matchups/${week}`);
export const getWinnersBracket = (leagueId) => getJSON(`/league/${leagueId}/winners_bracket`);
export const getLosersBracket = (leagueId) => getJSON(`/league/${leagueId}/losers_bracket`);
export const getDraft = (draftId) => getJSON(`/draft/${draftId}`);
export const getNFLState = () => getJSON(`/state/nfl`);
export const getUserLeagues = (userId, sport, season) =>
  getJSON(`/user/${userId}/leagues/${sport}/${season}`);
