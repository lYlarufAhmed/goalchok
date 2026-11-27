export const MAX_TEAMS = 12
export const MAX_PLAYERS = 20

export const isDrawComplete = (teams, drawLocked) =>
  drawLocked || (teams.length === MAX_TEAMS && teams.every((team) => team.group))
