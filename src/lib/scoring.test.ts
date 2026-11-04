import { describe, expect, it } from 'vitest'
import { BINGO_ITEMS, bingoLines, isFullCard, newBingoCard } from '../data/bingo'
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
  it('compte les points des 3 niveaux au fil des annonces', () => {
    const s = base()
    s.predictions.push({ playerId: 'a', kind: 'avant', updatedAt: '', payload: { top15: ids.slice(0, 15) } })
    s.predictions.push({ playerId: 'a', kind: 'apres15', updatedAt: '', payload: { top5: ids.slice(5, 10) } })
    // classement : [Miss, 1re, 2e, 3e, 4e]
    s.predictions.push({ playerId: 'a', kind: 'final', updatedAt: '', payload: { order: [ids[9], ids[8], ids[7], ids[5], ids[6]] } })

    // Top 15 officiel : 10 bons pour Alice
    s.game.results.top15 = [...ids.slice(5, 15), ...ids.slice(20, 25)]
    expect(scorePlayer(s, 'a').top15).toBe(10 * POINTS.top15)

    // Top 5 officiel : ses 5 sont bons
    s.game.results.top5 = ids.slice(5, 10)
    expect(scorePlayer(s, 'a').top5).toBe(5 * POINTS.top5)

    // Verdict révélé dans l'ordre 4e → Miss : Miss, 1re et 2e exactes
    s.game.results.verdict = [ids[5], ids[6], ids[7], ids[8], ids[9]]
    const sc = scorePlayer(s, 'a')
    expect(sc.missHit).toBe(true)
    expect(sc.dauphineHits).toBe(2)
    expect(sc.final).toBe(POINTS.miss + 2 * POINTS.dauphine)
    expect(sc.total).toBe(10 * POINTS.top15 + 5 * POINTS.top5 + POINTS.miss + 2 * POINTS.dauphine)
  })

  it('les dauphines comptent au fur et à mesure du verdict', () => {
    const s = base()
    s.predictions.push({ playerId: 'a', kind: 'final', updatedAt: '', payload: { order: [ids[0], ids[1], ids[2], ids[3], ids[4]] } })
    s.game.results.verdict = [ids[4]] // 4e dauphine exacte
    expect(scorePlayer(s, 'a').final).toBe(POINTS.dauphine)
    s.game.results.verdict.push(ids[2], ids[3]) // 3e fausse (ids[2]), 2e fausse
    expect(scorePlayer(s, 'a').dauphineHits).toBe(1)
    expect(scorePlayer(s, 'a').missHit).toBe(false)
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
    expect(canEditPrediction('ouverture', 'avant')).toBe(true)
    expect(canEditPrediction('costumes', 'avant')).toBe(true)
    expect(canEditPrediction('top15', 'avant')).toBe(false)
    expect(canEditPrediction('accueil', 'apres15')).toBe(true)
    expect(canEditPrediction('robes', 'apres15')).toBe(true)
    expect(canEditPrediction('top5', 'apres15')).toBe(false)
    expect(canEditPrediction('accueil', 'final')).toBe(true)
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

describe('bingo', () => {
  it('grille de 25 cases sans doublon, centre offert', () => {
    const g = newBingoCard()
    expect(g).toHaveLength(25)
    expect(g[12]).toBe(-1)
    const items = g.filter((x) => x >= 0)
    expect(new Set(items).size).toBe(24)
    expect(items.every((x) => x < BINGO_ITEMS.length)).toBe(true)
  })
  it('lignes, colonnes, diagonales et carton plein', () => {
    expect(bingoLines([])).toHaveLength(0)
    expect(bingoLines([0, 1, 2, 3])).toHaveLength(0)
    expect(bingoLines([0, 1, 2, 3, 4])).toHaveLength(1) // ligne
    expect(bingoLines([2, 7, 17, 22])).toHaveLength(1) // colonne du milieu (centre offert)
    expect(bingoLines([0, 6, 18, 24])).toHaveLength(1) // diagonale
    const all = Array.from({ length: 25 }, (_, i) => i).filter((i) => i !== 12)
    expect(bingoLines(all)).toHaveLength(12)
    expect(isFullCard(all)).toBe(true)
    expect(isFullCard(all.slice(1))).toBe(false)
  })
})
