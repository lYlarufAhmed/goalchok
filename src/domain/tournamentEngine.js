import { resolveTeamColor } from '../utils/teamColors'

const GROUPS = ['A', 'B', 'C']

function findPlayerPhoto(team, playerName) {
  if (!team?.players || !playerName) return null
  const player = team.players.find((p) => p.name === playerName)
  return player?.photo || null
}

export class TournamentEngine {
  constructor(teams = [], matches = [], knockoutMatches = []) {
    this.teams = teams || []
    this.matches = matches || []
    this.knockoutMatches = knockoutMatches || []
  }

  /**
   * Calculate group standings for a single group (A, B, C)
   */
  getStandings(group) {
    const groupTeams = this.teams.filter((t) => t.group === group)

    const table = {}
    groupTeams.forEach((team) => {
      table[team.id] = {
        id: team.id,
        name: team.name,
        logo: team.logo,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        gf: 0,
        ga: 0,
        pts: 0,
      }
    })

    const groupMatches = this.matches.filter(
      (m) => m.status === 'completed' && m.result && m.group === group && table[m.teamA] && table[m.teamB]
    )

    groupMatches.forEach((match) => {
      const { scoreA, scoreB } = match.result
      const teamA = table[match.teamA]
      const teamB = table[match.teamB]
      if (!teamA || !teamB) return

      teamA.played++
      teamB.played++
      teamA.gf += scoreA
      teamA.ga += scoreB
      teamB.gf += scoreB
      teamB.ga += scoreA

      if (scoreA > scoreB) {
        teamA.won++
        teamA.pts += 3
        teamB.lost++
      } else if (scoreB > scoreA) {
        teamB.won++
        teamB.pts += 3
        teamA.lost++
      } else {
        teamA.drawn++
        teamB.drawn++
        teamA.pts++
        teamB.pts++
      }
    })

    return Object.values(table).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts
      const diffA = a.gf - a.ga
      const diffB = b.gf - b.ga
      if (diffB !== diffA) return diffB - diffA
      return b.gf - a.gf
    })
  }

  /**
   * Compute standings for all groups
   */
  getAllStandings() {
    const result = {}
    GROUPS.forEach((group) => {
      result[group] = this.getStandings(group)
    })
    return result
  }

  /**
   * Determine the 8 qualified teams from group standings
   */
  getQualifiedTeams() {
    const allStandings = this.getAllStandings()
    const qualifiedTeams = []
    let seed = 1

    GROUPS.forEach((group) => {
      const standings = allStandings[group] || []
      const top2 = standings.slice(0, 2)
      top2.forEach((standing) => {
        const team = this.teams.find((t) => t.id === standing.id)
        if (team) {
          qualifiedTeams.push({
            seed,
            teamId: team.id,
            name: team.name,
            logo: team.logo || null,
            color: team.color || null,
            group: team.group,
            pts: standing.pts,
            gd: standing.gf - standing.ga,
            gf: standing.gf,
            qualifyType: 'direct',
          })
          seed++
        }
      })
    })

    const thirds = GROUPS.map((group) => {
      const standings = allStandings[group] || []
      const third = standings[2]
      if (!third) return null
      const team = this.teams.find((t) => t.id === third.id)
      if (!team) return null
      return {
        seed: 0,
        teamId: team.id,
        name: team.name,
        logo: team.logo || null,
        color: team.color || null,
        group: team.group,
        pts: third.pts,
        gd: third.gf - third.ga,
        gf: third.gf,
        qualifyType: 'bestThird',
      }
    }).filter(Boolean)

    thirds.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts
      if (b.gd !== a.gd) return b.gd - a.gd
      return b.gf - a.gf
    })

    thirds.slice(0, 2).forEach((t) => {
      t.seed = seed++
      qualifiedTeams.push(t)
    })

    return qualifiedTeams
  }

  /**
   * Aggregate top scorers across group matches and knockout matches
   */
  getTopScorers() {
    const scorerMap = {}
    const allMatches = [...this.matches, ...this.knockoutMatches]

    allMatches
      .filter((m) => m.status === 'completed' && m.result?.scorers)
      .forEach((match) => {
        match.result.scorers.forEach((scorer) => {
          const team = this.teams.find((t) => t.id === scorer.teamId)
          const key = `${scorer.player}-${scorer.teamId}`
          if (!scorerMap[key]) {
            scorerMap[key] = {
              id: key,
              name: scorer.player,
              team: team?.name || '—',
              teamId: scorer.teamId,
              logo: team?.logo || null,
              teamColor: resolveTeamColor(team),
              photo: findPlayerPhoto(team, scorer.player),
              goals: 0,
            }
          }
          scorerMap[key].goals++
        })
      })

    return Object.values(scorerMap).sort((a, b) => b.goals - a.goals)
  }

  /**
   * Merge group and knockout matches into unified array
   */
  getMergedMatches() {
    const koMap = new Map()
    this.knockoutMatches.forEach((km) => {
      if (km?.id) koMap.set(String(km.id), km)
    })

    const merged = this.matches.map((gm) => {
      const id = String(gm.id)
      return koMap.has(id) ? { ...gm, ...koMap.get(id) } : gm
    })

    this.knockoutMatches.forEach((km) => {
      const id = String(km.id)
      if (!merged.some((m) => String(m.id) === id)) {
        merged.push(km)
      }
    })

    return merged
  }

  /**
   * Determine winning team ID from a completed knockout match
   */
  getKnockoutWinner(match) {
    if (!match || match.status !== 'completed' || !match.result) return null
    const { scoreA, scoreB, penaltyWinner } = match.result
    const sA = Number(scoreA) || 0
    const sB = Number(scoreB) || 0
    if (sA > sB) return match.teamA
    if (sB > sA) return match.teamB
    return penaltyWinner || null
  }

  /**
   * Evaluate knockout bracket progression and return next round creation payload or champion
   */
  evaluateKnockoutProgression() {
    const qfMatches = this.knockoutMatches.filter((m) => m.round === 'QF')
    const sfMatches = this.knockoutMatches.filter((m) => m.round === 'SF')
    const finalMatches = this.knockoutMatches.filter((m) => m.round === 'F')

    const newMatches = []
    let champion = null

    // Evaluate QF -> create SF
    if (qfMatches.length === 4 && qfMatches.every((m) => m.status === 'completed')) {
      const getW = (matchLabel) => {
        const m = qfMatches.find((x) => x.matchLabel === matchLabel || x.id === matchLabel)
        return this.getKnockoutWinner(m)
      }

      const qf1W = getW('QF 1') || this.getKnockoutWinner(qfMatches[0])
      const qf2W = getW('QF 2') || this.getKnockoutWinner(qfMatches[1])
      const qf3W = getW('QF 3') || this.getKnockoutWinner(qfMatches[2])
      const qf4W = getW('QF 4') || this.getKnockoutWinner(qfMatches[3])

      if (sfMatches.length === 0 && qf1W && qf2W && qf3W && qf4W) {
        newMatches.push({
          id: `ko-sf-1-${Date.now()}`,
          round: 'SF',
          matchLabel: 'SF 1',
          matchNumber: 1,
          teamA: qf1W,
          teamB: qf4W,
          status: 'scheduled',
          result: null,
          venue: 'ملاعب فيا',
        })
        newMatches.push({
          id: `ko-sf-2-${Date.now()}`,
          round: 'SF',
          matchLabel: 'SF 2',
          matchNumber: 2,
          teamA: qf2W,
          teamB: qf3W,
          status: 'scheduled',
          result: null,
          venue: 'ملاعب فيا',
        })
      }
    }

    // Evaluate SF -> create Final
    if (sfMatches.length === 2 && sfMatches.every((m) => m.status === 'completed')) {
      const sf1W = this.getKnockoutWinner(sfMatches[0])
      const sf2W = this.getKnockoutWinner(sfMatches[1])

      if (finalMatches.length === 0 && sf1W && sf2W) {
        newMatches.push({
          id: `ko-f-1-${Date.now()}`,
          round: 'F',
          matchLabel: 'Final',
          matchNumber: 1,
          teamA: sf1W,
          teamB: sf2W,
          status: 'scheduled',
          result: null,
          venue: 'ملاعب فيا الرئيسية',
        })
      }
    }

    // Evaluate Final -> declare Champion
    if (finalMatches.length === 1 && finalMatches[0].status === 'completed') {
      champion = this.getKnockoutWinner(finalMatches[0])
    }

    return { newMatches, champion }
  }
}
