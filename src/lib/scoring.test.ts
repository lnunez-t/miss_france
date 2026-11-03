import { describe, expect, it } from 'vitest'
import { CANDIDATES } from '../data/candidates'
import { canEditPrediction, canRate, currentRound, roundCandidates } from './phases'
import { awards, familyFavorites, leaderboard, POINTS, scorePlayer } from './scoring'
import { emptySnapshot, type Snapshot } from './types'

const ids = CANDIDATES.map((c) => c.id)

function base(): Snapshot {
  const s = emptySnapshot()
  s.players = [
    { id: 'a', name: 'Alice', avatar: '👑', createdAt: '' },
    { id: 'b', name: 'Bob', avatar: '🦊', createdAt: '' },
  ]
  return s
}

describe('données', () => {
  it('31 candidates avec des identifiants uniques', () => {
    expect(CANDIDATES).toHaveLength(31)
    expect(new Set(ids).size).toBe(31)
    expect(ids).toContain('nouvelle-caledonie')
  })
})

describe('scoring', () => {
  it('compte les points au fil des annonces', () => {
    const s = base()
    const top15 = ids.slice(0, 15)
    const top5 = ids.slice(0, 5)
    s.predictions.push({ playerId: 'a', kind: 'avant', updatedAt: '', payload: { top15, top5, miss: ids[0] } })
    // Top 15 officiel : 10 bons pour Alice
    s.game.results.top15 = [...ids.slice(5, 15), ...ids.slice(20, 25)]
    expect(scorePlayer(s, 'a').avant).toBe(10 * POINTS.avantTop15)

    // Top 5 officiel : aucun de son Top 5 (ses 5 premiers ne sont pas dans le Top 15)
    s.game.results.top5 = ids.slice(5, 10)
    expect(scorePlayer(s, 'a').top5Hits).toBe(0)

    // Classement final + 2e chance
    s.predictions.push({ playerId: 'a', kind: 'apres15', updatedAt: '', payload: { top5: ids.slice(5, 10), miss: ids[9] } })
    s.predictions.push({ playerId: 'a', kind: 'final', updatedAt: '', payload: { order: [ids[9], ids[8], ids[7], ids[5], ids[6]] } })
    // verdict révélé dans l'ordre 4e → Miss
    s.game.results.verdict = [ids[5], ids[6], ids[7], ids[8], ids[9]]
    const sc = scorePlayer(s, 'a')
    expect(sc.apres15).toBe(5 * POINTS.apres15Top5 + POINTS.apres15Miss)
    expect(sc.finalExactHits).toBe(3) // Miss, 1re et 2e dauphines exactes
    expect(sc.missHit).toBe(false)
  })

  it('Miss trouvée uniquement quand les 5 places sont révélées', () => {
    const s = base()
    s.predictions.push({ playerId: 'a', kind: 'avant', updatedAt: '', payload: { top15: [], top5: [], miss: ids[3] } })
    s.game.results.verdict = [ids[1], ids[2], ids[4], ids[5]]
    expect(scorePlayer(s, 'a').missHit).toBe(false)
    s.game.results.verdict.push(ids[3])
    expect(scorePlayer(s, 'a').avant).toBe(POINTS.avantMiss)
  })

  it('paris éclair', () => {
    const s = base()
    s.bets.push({ id: 'x', question: '?', type: 'choices', options: ['Oui', 'Non'], status: 'resolved', answer: 'Oui', points: 4, createdAt: '' })
    s.betAnswers.push({ betId: 'x', playerId: 'a', choice: 'Oui' }, { betId: 'x', playerId: 'b', choice: 'Non' })
    expect(scorePlayer(s, 'a').bets).toBe(4)
    expect(scorePlayer(s, 'b').bets).toBe(0)
  })

  it('ex æquo : même rang', () => {
    const s = base()
    s.players.push({ id: 'c', name: 'Chloé', avatar: '🐱', createdAt: '' })
    s.bets.push({ id: 'x', question: '?', type: 'choices', options: ['Oui', 'Non'], status: 'resolved', answer: 'Oui', points: 2, createdAt: '' })
    s.betAnswers.push({ betId: 'x', playerId: 'a', choice: 'Oui' }, { betId: 'x', playerId: 'b', choice: 'Oui' })
    const board = leaderboard(s)
    expect(board.map((r) => r.rank)).toEqual([1, 1, 3])
  })

  it('palmarès et coups de cœur sans planter sur une partie vide', () => {
    expect(awards(emptySnapshot())).toEqual([])
    expect(leaderboard(emptySnapshot())).toEqual([])
    const s = base()
    s.ratings.push({ playerId: 'a', candidateId: ids[0], round: 'costume', score: 5 }, { playerId: 'b', candidateId: ids[0], round: 'costume', score: 3 })
    expect(familyFavorites(s)[0]).toMatchObject({ candidateId: ids[0], average: 4, votes: 2 })
  })
})

describe('étapes', () => {
  it('verrouillage des pronostics', () => {
    expect(canEditPrediction('accueil', 'avant')).toBe(true)
    expect(canEditPrediction('ouverture', 'avant')).toBe(false)
    expect(canEditPrediction('maillot', 'apres15')).toBe(true)
    expect(canEditPrediction('top5', 'apres15')).toBe(false)
    expect(canEditPrediction('discours', 'final')).toBe(true)
    expect(canEditPrediction('verdict', 'final')).toBe(false)
    expect(canEditPrediction('fin', 'chouchoute')).toBe(true)
  })
  it('tours de notes', () => {
    expect(canRate('accueil', 'costume')).toBe(false)
    expect(canRate('costumes', 'costume')).toBe(true)
    expect(canRate('top5', 'costume')).toBe(true)
    expect(canRate('fin', 'costume')).toBe(false)
    expect(currentRound('top15')).toBe('costume')
    expect(currentRound('accueil')).toBe(null)
    const r = { top15: ids.slice(0, 15), top5: [], verdict: [] }
    expect(roundCandidates('maillot', r)).toHaveLength(15)
    expect(roundCandidates('costume', r)).toHaveLength(31)
  })
})
