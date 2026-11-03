import type { Player, PredAvant, PredApres15, PredFinal, Prediction, PredictionKind, RoundId, Snapshot } from './types'

export const POINTS = {
  avantTop15: 1,
  avantTop5: 3,
  avantMiss: 10,
  apres15Top5: 2,
  apres15Miss: 5,
  finalExact: 3,
}

export interface Breakdown {
  avant: number
  apres15: number
  final: number
  bets: number
  total: number
  top15Hits: number
  top5Hits: number
  missHit: boolean
  apres15Top5Hits: number
  apres15MissHit: boolean
  finalExactHits: number
  betHits: number
}

export function getPrediction<K extends PredictionKind>(snap: Snapshot, playerId: string, kind: K): Prediction<K>['payload'] | undefined {
  const p = snap.predictions.find((x) => x.playerId === playerId && x.kind === kind)
  return p?.payload as Prediction<K>['payload'] | undefined
}

/** Miss France élue (connue quand les 5 places du verdict sont révélées). */
export function officialMiss(snap: Snapshot): string | null {
  const v = snap.game.results.verdict
  return v.length >= 5 ? v[4] : null
}

/** Rang final d'une candidate (0 = Miss, 1 = 1re dauphine…) ou null si pas encore révélé. */
export function finalRank(snap: Snapshot, candidateId: string): number | null {
  const idx = snap.game.results.verdict.indexOf(candidateId)
  return idx === -1 ? null : 4 - idx
}

const count = (picked: string[] | undefined, official: string[]) => (picked ?? []).filter((id) => official.includes(id)).length

export function scorePlayer(snap: Snapshot, playerId: string): Breakdown {
  const { top15, top5, verdict } = snap.game.results
  const miss = officialMiss(snap)
  const avant = getPrediction(snap, playerId, 'avant') as PredAvant | undefined
  const apres = getPrediction(snap, playerId, 'apres15') as PredApres15 | undefined
  const fin = getPrediction(snap, playerId, 'final') as PredFinal | undefined

  const top15Hits = count(avant?.top15, top15)
  const top5Hits = count(avant?.top5, top5)
  const missHit = !!miss && avant?.miss === miss
  const apres15Top5Hits = count(apres?.top5, top5)
  const apres15MissHit = !!miss && apres?.miss === miss

  let finalExactHits = 0
  verdict.forEach((cid, idx) => {
    const rank = 4 - idx
    if (fin?.order?.[rank] === cid) finalExactHits++
  })

  let bets = 0
  let betHits = 0
  for (const bet of snap.bets) {
    if (bet.status !== 'resolved' || bet.answer == null) continue
    const a = snap.betAnswers.find((x) => x.betId === bet.id && x.playerId === playerId)
    if (a && a.choice === bet.answer) {
      bets += bet.points
      betHits++
    }
  }

  const avantPts = top15Hits * POINTS.avantTop15 + top5Hits * POINTS.avantTop5 + (missHit ? POINTS.avantMiss : 0)
  const apresPts = apres15Top5Hits * POINTS.apres15Top5 + (apres15MissHit ? POINTS.apres15Miss : 0)
  const finalPts = finalExactHits * POINTS.finalExact

  return {
    avant: avantPts,
    apres15: apresPts,
    final: finalPts,
    bets,
    total: avantPts + apresPts + finalPts + bets,
    top15Hits,
    top5Hits,
    missHit,
    apres15Top5Hits,
    apres15MissHit,
    finalExactHits,
    betHits,
  }
}

export interface LeaderRow {
  player: Player
  score: Breakdown
  rank: number
}

/** Classement avec gestion des ex æquo (même rang pour le même total). */
export function leaderboard(snap: Snapshot): LeaderRow[] {
  const rows = snap.players
    .map((player) => ({ player, score: scorePlayer(snap, player.id), rank: 0 }))
    .sort((a, b) => b.score.total - a.score.total || a.player.name.localeCompare(b.player.name, 'fr'))
  rows.forEach((row, i) => {
    row.rank = i > 0 && rows[i - 1].score.total === row.score.total ? rows[i - 1].rank : i + 1
  })
  return rows
}

export interface CandidateStats {
  candidateId: string
  average: number | null
  votes: number
  byRound: Partial<Record<RoundId, { average: number; votes: number }>>
}

export function candidateStats(snap: Snapshot, candidateId: string): CandidateStats {
  const rs = snap.ratings.filter((r) => r.candidateId === candidateId)
  const byRound: CandidateStats['byRound'] = {}
  for (const r of rs) {
    const cur = byRound[r.round] ?? { average: 0, votes: 0 }
    cur.average = (cur.average * cur.votes + r.score) / (cur.votes + 1)
    cur.votes++
    byRound[r.round] = cur
  }
  return {
    candidateId,
    average: rs.length ? rs.reduce((s, r) => s + r.score, 0) / rs.length : null,
    votes: rs.length,
    byRound,
  }
}

/** Candidates classées par moyenne des notes de la famille (coup de cœur). */
export function familyFavorites(snap: Snapshot, round?: RoundId): { candidateId: string; average: number; votes: number }[] {
  const map = new Map<string, { sum: number; votes: number }>()
  for (const r of snap.ratings) {
    if (round && r.round !== round) continue
    const cur = map.get(r.candidateId) ?? { sum: 0, votes: 0 }
    cur.sum += r.score
    cur.votes++
    map.set(r.candidateId, cur)
  }
  return [...map.entries()]
    .map(([candidateId, v]) => ({ candidateId, average: v.sum / v.votes, votes: v.votes }))
    .sort((a, b) => b.average - a.average || b.votes - a.votes)
}

export interface Award {
  emoji: string
  title: string
  winner: string
  detail: string
}

/** Récompenses humoristiques du palmarès de fin de soirée. */
export function awards(snap: Snapshot): Award[] {
  const out: Award[] = []
  const board = leaderboard(snap)
  if (board.length && board[0].score.total > 0) {
    const winners = board.filter((r) => r.rank === 1)
    out.push({
      emoji: '🏆',
      title: 'Meilleur œil de la soirée',
      winner: winners.map((w) => `${w.player.avatar} ${w.player.name}`).join(' & '),
      detail: `${winners[0].score.total} points`,
    })
  }

  const miss = officialMiss(snap)
  if (miss) {
    const seers = snap.players.filter((p) => (getPrediction(snap, p.id, 'avant') as PredAvant | undefined)?.miss === miss)
    if (seers.length)
      out.push({ emoji: '🔮', title: 'Voyance extralucide', winner: seers.map((p) => `${p.avatar} ${p.name}`).join(', '), detail: 'avait trouvé Miss France avant le show' })
  }

  const avgByPlayer = snap.players
    .map((p) => {
      const rs = snap.ratings.filter((r) => r.playerId === p.id)
      return { p, n: rs.length, avg: rs.length ? rs.reduce((s, r) => s + r.score, 0) / rs.length : 0 }
    })
    .filter((x) => x.n >= 5)
  if (avgByPlayer.length >= 2) {
    const sorted = [...avgByPlayer].sort((a, b) => b.avg - a.avg)
    const gen = sorted[0]
    const sev = sorted[sorted.length - 1]
    out.push({ emoji: '💖', title: 'Cœur d’artichaut', winner: `${gen.p.avatar} ${gen.p.name}`, detail: `moyenne de ${gen.avg.toFixed(1)}/5 — le jury le plus généreux` })
    if (sev.p.id !== gen.p.id)
      out.push({ emoji: '🧊', title: 'Jury impitoyable', winner: `${sev.p.avatar} ${sev.p.name}`, detail: `moyenne de ${sev.avg.toFixed(1)}/5` })
  }

  const busiest = snap.players
    .map((p) => ({ p, n: snap.ratings.filter((r) => r.playerId === p.id).length }))
    .sort((a, b) => b.n - a.n)[0]
  if (busiest && busiest.n > 0) out.push({ emoji: '📝', title: 'Le plus assidu', winner: `${busiest.p.avatar} ${busiest.p.name}`, detail: `${busiest.n} note${busiest.n > 1 ? 's' : ''} donnée${busiest.n > 1 ? 's' : ''}` })

  const fav = familyFavorites(snap)[0]
  if (fav) out.push({ emoji: '😍', title: 'Coup de cœur de la famille', winner: fav.candidateId, detail: `${fav.average.toFixed(1)}/5 sur ${fav.votes} note${fav.votes > 1 ? 's' : ''}` })

  return out
}
