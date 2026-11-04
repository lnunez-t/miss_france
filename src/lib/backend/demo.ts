// Mode démo : tout est stocké dans le navigateur (localStorage) et synchronisé entre onglets.
// Sert à tester l'application sans Supabase. Code admin : 0000.
import { canEditPrediction, canRate, PHASE_BY_ID } from '../phases'
import { bingoLines, isFullCard } from '../../data/bingo'
import { emptySnapshot, type Snapshot } from '../types'
import { GameError, type Backend, type Listener } from './types'

const KEY = 'mf27-demo-db'
const DEMO_PIN = '0000'

interface DB extends Snapshot {
  secrets: Record<string, string>
}

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36))
const now = () => new Date().toISOString()

function read(): DB {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { bingo: [], ...JSON.parse(raw) } as DB
  } catch {
    /* stockage indisponible */
  }
  return { ...emptySnapshot(), secrets: {} }
}

const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('mf27-demo') : null
const listeners = new Set<Listener>()

function notify(db: DB) {
  const snap = strip(db)
  listeners.forEach((l) => l.onUpdate(() => snap))
}

function write(db: DB) {
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch {
    /* ignore */
  }
  // On envoie la base dans le message : entre onglets, localStorage peut être relu avant d'être à jour.
  channel?.postMessage({ type: 'db', db })
  notify(db)
}

function strip(db: DB): Snapshot {
  const { secrets: _secrets, ...snap } = db
  return structuredClone(snap)
}

function mutate(fn: (db: DB) => void) {
  const db = read()
  fn(db)
  write(db)
}

function playerId(db: DB, secret: string): string {
  const id = db.secrets[secret]
  if (!id || !db.players.some((p) => p.id === id)) throw new GameError('NOT_FOUND')
  return id
}

function pin(p: string) {
  if (p !== DEMO_PIN) throw new GameError('BAD_PIN')
}

const nameTaken = (db: DB, name: string, except?: string) =>
  db.players.some((p) => p.id !== except && p.name.toLowerCase() === name.toLowerCase())

channel?.addEventListener('message', (e) => {
  if (e.data?.type === 'db') notify(e.data.db as DB)
  if (e.data?.type === 'reaction') listeners.forEach((l) => l.onReaction(e.data.r))
})

const delay = () => new Promise((r) => setTimeout(r, 60))

export const demoBackend: Backend = {
  mode: 'demo',
  async load() {
    return strip(read())
  },
  subscribe(l) {
    listeners.add(l)
    l.onStatus(true)
    return () => listeners.delete(l)
  },
  async join(name, avatar) {
    await delay()
    const clean = name.trim()
    if (!clean || clean.length > 24) throw new GameError('INVALID')
    let session = { playerId: '', secret: '' }
    mutate((db) => {
      if (nameTaken(db, clean)) throw new GameError('NAME_TAKEN')
      const id = uid()
      const secret = uid()
      db.players.push({ id, name: clean, avatar, createdAt: now() })
      db.secrets[secret] = id
      session = { playerId: id, secret }
    })
    return session
  },
  async whoami(secret) {
    const db = read()
    const id = db.secrets[secret]
    return db.players.find((p) => p.id === id) ?? null
  },
  async updateProfile(secret, name, avatar) {
    mutate((db) => {
      const id = playerId(db, secret)
      const clean = name.trim()
      if (!clean || clean.length > 24) throw new GameError('INVALID')
      if (nameTaken(db, clean, id)) throw new GameError('NAME_TAKEN')
      const p = db.players.find((x) => x.id === id)!
      p.name = clean
      p.avatar = avatar
    })
  },
  async savePrediction(secret, kind, payload) {
    mutate((db) => {
      const id = playerId(db, secret)
      if (!canEditPrediction(db.game.phase, kind)) throw new GameError('LOCKED')
      db.predictions = db.predictions.filter((p) => !(p.playerId === id && p.kind === kind))
      db.predictions.push({ playerId: id, kind, payload: payload as never, updatedAt: now() })
    })
  },
  async saveRating(secret, candidateId, round, score) {
    mutate((db) => {
      const id = playerId(db, secret)
      if (!canRate(db.game.phase, round)) throw new GameError('LOCKED')
      db.ratings = db.ratings.filter((r) => !(r.playerId === id && r.candidateId === candidateId && r.round === round))
      if (score >= 1 && score <= 5) db.ratings.push({ playerId: id, candidateId, round, score })
    })
  },
  async answerBet(secret, betId, choice) {
    mutate((db) => {
      const id = playerId(db, secret)
      const bet = db.bets.find((b) => b.id === betId)
      if (!bet) throw new GameError('NOT_FOUND')
      if (bet.status !== 'open') throw new GameError('LOCKED')
      db.betAnswers = db.betAnswers.filter((a) => !(a.betId === betId && a.playerId === id))
      db.betAnswers.push({ betId, playerId: id, choice })
    })
  },
  async saveBingo(secret, cells, checked) {
    mutate((db) => {
      const id = playerId(db, secret)
      const phase = db.game.phase
      const cur = db.bingo.find((b) => b.playerId === id)
      const newGrid = !cur || cur.cells.join() !== cells.join()
      if (cur && newGrid && phase !== 'accueil') throw new GameError('LOCKED')
      const marks = newGrid ? [] : [...new Set(checked)].filter((i) => i >= 0 && i < 25)
      if (marks.length && (phase === 'accueil' || phase === 'fin')) throw new GameError('LOCKED')
      const lines = bingoLines(marks).length
      const at = now()
      const card = {
        playerId: id,
        cells,
        checked: marks,
        lines,
        bingoAt: cur?.bingoAt ?? (lines > 0 ? at : null),
        fullAt: cur?.fullAt ?? (isFullCard(marks) ? at : null),
      }
      if (newGrid) {
        card.bingoAt = null
        card.fullAt = null
      }
      db.bingo = [...db.bingo.filter((b) => b.playerId !== id), card]
    })
  },
  sendReaction(r) {
    channel?.postMessage({ type: 'reaction', r })
    listeners.forEach((l) => l.onReaction(r))
  },
  admin: {
    async check(p) {
      return p === DEMO_PIN
    },
    async setPhase(p, phase) {
      pin(p)
      if (!PHASE_BY_ID[phase]) throw new GameError('INVALID')
      mutate((db) => {
        db.game.phase = phase
        db.game.updatedAt = now()
      })
    },
    async setOnStage(p, candidateId) {
      pin(p)
      mutate((db) => {
        db.game.onStage = candidateId
        db.game.updatedAt = now()
      })
    },
    async setResults(p, results) {
      pin(p)
      mutate((db) => {
        db.game.results = results
        db.game.updatedAt = now()
      })
    },
    async createBet(p, bet) {
      pin(p)
      mutate((db) => {
        db.bets.push({ id: uid(), ...bet, status: 'open', answer: null, createdAt: now() })
      })
    },
    async updateBet(p, id, status, answer) {
      pin(p)
      mutate((db) => {
        const bet = db.bets.find((b) => b.id === id)
        if (!bet) throw new GameError('NOT_FOUND')
        bet.status = status
        bet.answer = answer
      })
    },
    async deleteBet(p, id) {
      pin(p)
      mutate((db) => {
        db.bets = db.bets.filter((b) => b.id !== id)
        db.betAnswers = db.betAnswers.filter((a) => a.betId !== id)
      })
    },
    async renamePlayer(p, id, name) {
      pin(p)
      mutate((db) => {
        const clean = name.trim()
        if (!clean || clean.length > 24) throw new GameError('INVALID')
        if (nameTaken(db, clean, id)) throw new GameError('NAME_TAKEN')
        const pl = db.players.find((x) => x.id === id)
        if (pl) pl.name = clean
      })
    },
    async deletePlayer(p, id) {
      pin(p)
      mutate((db) => {
        db.players = db.players.filter((x) => x.id !== id)
        db.predictions = db.predictions.filter((x) => x.playerId !== id)
        db.ratings = db.ratings.filter((x) => x.playerId !== id)
        db.betAnswers = db.betAnswers.filter((x) => x.playerId !== id)
        db.bingo = db.bingo.filter((x) => x.playerId !== id)
        for (const [s, pid] of Object.entries(db.secrets)) if (pid === id) delete db.secrets[s]
      })
    },
    async playerSecret(p, id) {
      pin(p)
      const db = read()
      const found = Object.entries(db.secrets).find(([, pid]) => pid === id)
      if (!found) throw new GameError('NOT_FOUND')
      return found[0]
    },
    async reset(p, keepPlayers) {
      pin(p)
      mutate((db) => {
        const fresh = emptySnapshot()
        db.game = fresh.game
        db.predictions = []
        db.ratings = []
        db.bets = []
        db.betAnswers = []
        db.bingo = []
        if (!keepPlayers) {
          db.players = []
          db.secrets = {}
        }
      })
    },
  },
}
