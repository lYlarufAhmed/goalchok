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
        yellow: 0,
        red: 0,
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

      // Disciplinary counts feed the Tie-Breaker (CONTEXT.md: GD > GF > H2H > Disciplinary)
      const cards = match.result.cards || []
      teamA.yellow += cards.filter((c) => c.type === 'yellow' && c.teamId === match.teamA).length
      teamB.yellow += cards.filter((c) => c.type === 'yellow' && c.teamId === match.teamB).length
      teamA.red += cards.filter((c) => c.type === 'red' && c.teamId === match.teamA).length
      teamB.red += cards.filter((c) => c.type === 'red' && c.teamId === match.teamB).length
      teamA.yellow += (match.result.yellowCards || []).filter((c) => c.teamId === match.teamA).length
      teamB.yellow += (match.result.yellowCards || []).filter((c) => c.teamId === match.teamB).length
      teamA.red += (match.result.redCards || []).filter((c) => c.teamId === match.teamA).length
      teamB.red += (match.result.redCards || []).filter((c) => c.teamId === match.teamB).length
    })

    return this._applyTieBreakers(Object.values(table), groupMatches)
  }

  /**
   * Sort standings by the documented Tie-Breaker chain:
   * pts > GD > GF > Head-to-Head (among tied teams) > Disciplinary.
   * Head-to-head is group-relative, so it is applied per tied partition,
   * not as a pairwise comparator.
   */
  _applyTieBreakers(entries, groupMatches) {
    const gd = (e) => e.gf - e.ga
    const discard = (e) => e.yellow + e.red * 3

    entries.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts
      if (gd(b) !== gd(a)) return gd(b) - gd(a)
      return b.gf - a.gf
    })

    // Partition teams still tied on pts/GD/GF and rank each partition
    // by its head-to-head mini-league, then disciplinary record.
    let i = 0
    while (i < entries.length) {
      let j = i + 1
      while (
        j < entries.length &&
        entries[j].pts === entries[i].pts &&
        gd(entries[j]) === gd(entries[i]) &&
        entries[j].gf === entries[i].gf
      ) {
        j++
      }

      if (j - i > 1) {
        const tied = entries.slice(i, j)
        const ids = new Set(tied.map((e) => e.id))
        const h2h = {}
        tied.forEach((e) => {
          h2h[e.id] = { pts: 0, gf: 0, ga: 0 }
        })

        groupMatches.forEach((match) => {
          if (!ids.has(match.teamA) || !ids.has(match.teamB)) return
          const { scoreA, scoreB } = match.result
          h2h[match.teamA].gf += scoreA
          h2h[match.teamA].ga += scoreB
          h2h[match.teamB].gf += scoreB
          h2h[match.teamB].ga += scoreA
          if (scoreA > scoreB) h2h[match.teamA].pts += 3
          else if (scoreB > scoreA) h2h[match.teamB].pts += 3
          else {
            h2h[match.teamA].pts++
            h2h[match.teamB].pts++
          }
        })

        const order = new Map()
        tied
          .slice()
          .sort((a, b) => {
            const ha = h2h[a.id]
            const hb = h2h[b.id]
            if (hb.pts !== ha.pts) return hb.pts - ha.pts
            if (hb.gf - hb.ga !== ha.gf - ha.ga) return hb.gf - hb.ga - (ha.gf - ha.ga)
            if (hb.gf !== ha.gf) return hb.gf - ha.gf
            return discard(a) - discard(b)
          })
          .forEach((e, idx) => order.set(e.id, idx))

        entries
          .slice(i, j)
          .sort((a, b) => order.get(a.id) - order.get(b.id))
          .forEach((e, idx) => {
            entries[i + idx] = e
          })
      }

      i = j
    }

    return entries
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
        yellow: third.yellow || 0,
        red: third.red || 0,
        qualifyType: 'bestThird',
      }
    }).filter(Boolean)

    thirds.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts
      if (b.gd !== a.gd) return b.gd - a.gd
      if (b.gf !== a.gf) return b.gf - a.gf
      // Thirds come from different groups, so head-to-head cannot apply;
      // disciplinary record is the remaining documented criterion.
      return (a.yellow + a.red * 3 || 0) - (b.yellow + b.red * 3 || 0)
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
   * Resolve the Knockout Progression bracket into canonical slots.
   * Slot identity comes from matchNumber, falling back to a trailing digit
   * in matchLabel, then to arrival order — never from substring-sniffing
   * round or label text.
   * @returns {{QF: (Object|null)[4], SF: (Object|null)[2], F: (Object|null)[1]}}
   */
  getBracket() {
    const rounds = {
      QF: Array(4).fill(null),
      SF: Array(2).fill(null),
      F: Array(1).fill(null),
    }

    const slotOf = (m, size) => {
      const n = Number(m.matchNumber)
      if (Number.isInteger(n) && n >= 1 && n <= size) return n - 1
      const labelDigit = String(m.matchLabel || '').match(/(\d+)\s*$/)
      if (labelDigit) {
        const l = Number(labelDigit[1])
        if (l >= 1 && l <= size) return l - 1
      }
      return null
    }

    this.knockoutMatches.forEach((m) => {
      const round = String(m.round || '').toUpperCase()
      if (!(round in rounds)) return
      const slots = rounds[round]
      let idx = slotOf(m, slots.length)
      if (idx === null || slots[idx]) idx = slots.findIndex((s) => !s)
      if (idx !== -1) slots[idx] = m
    })

    return rounds
  }

  // The bracket shape: how many matches feed each round, the labels and
  // slot pairings of the round it produces (QF slots 0v3, 1v2 → SF 1/2).
  static PROGRESSION_TABLE = [
    { from: 'QF', count: 4, to: 'SF', labels: ['SF 1', 'SF 2'], pairings: [[0, 3], [1, 2]] },
    { from: 'SF', count: 2, to: 'F', labels: ['النهائي'], pairings: [[0, 1]] },
  ]

  /**
   * Evaluate knockout bracket progression and return next round creation payload or champion
   */
  evaluateKnockoutProgression() {
    const bracket = this.getBracket()
    const newMatches = []
    let champion = null

    for (const spec of TournamentEngine.PROGRESSION_TABLE) {
      const from = bracket[spec.from]
      if (from.length !== spec.count || !from.every(Boolean)) continue
      if (!from.every((m) => m.status === 'completed')) continue
      if (bracket[spec.to].some(Boolean)) continue

      const winners = from.map((m) => this.getKnockoutWinner(m))
      if (!winners.every(Boolean)) continue

      spec.pairings.forEach(([a, b], i) => {
        newMatches.push({
          id: `ko-${spec.to.toLowerCase()}-${i + 1}-${Date.now()}`,
          round: spec.to,
          matchLabel: spec.labels[i],
          matchNumber: i + 1,
          teamA: winners[a],
          teamB: winners[b],
          status: 'scheduled',
          result: null,
          date: '',
          time: '',
          venue: '',
        })
      })
    }

    const finalSlot = bracket.F[0]
    if (finalSlot && finalSlot.status === 'completed') {
      champion = this.getKnockoutWinner(finalSlot)
    }

    return { newMatches, champion }
  }
}
