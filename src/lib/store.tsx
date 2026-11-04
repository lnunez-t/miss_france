import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { backend, toGameError, type Updater } from './backend'
import { emptySnapshot, type Player, type PredictionKind, type Reaction, type RoundId, type Snapshot } from './types'

const SECRET_KEY = `mf27-secret-${backend.mode}`

function readSecret(): string | null {
  try {
    return localStorage.getItem(SECRET_KEY)
  } catch {
    return null
  }
}
function writeSecret(s: string | null) {
  try {
    if (s) localStorage.setItem(SECRET_KEY, s)
    else localStorage.removeItem(SECRET_KEY)
  } catch {
    /* ignore */
  }
}

/** Lien de reconnexion : /?rejoindre=<secret> (généré depuis l'admin). */
function takeSecretFromUrl(): string | null {
  const url = new URL(window.location.href)
  const s = url.searchParams.get('rejoindre')
  if (!s) return null
  url.searchParams.delete('rejoindre')
  window.history.replaceState(null, '', url.pathname + url.search + url.hash)
  return s
}

type ReactionListener = (r: Reaction) => void

interface GameCtx {
  snap: Snapshot
  /** Premières données reçues. */
  ready: boolean
  connected: boolean
  /** Cause technique de la dernière erreur de connexion. */
  connectionError: string | null
  me: Player | null
  secret: string | null
  join(name: string, avatar: string): Promise<void>
  logout(): void
  updateProfile(name: string, avatar: string): Promise<void>
  savePrediction(kind: PredictionKind, payload: unknown): Promise<void>
  saveRating(candidateId: string, round: RoundId, score: number): Promise<void>
  answerBet(betId: string, choice: string): Promise<void>
  react(emoji: string): void
  onReaction(fn: ReactionListener): () => void
  reload(): Promise<void>
}

const Ctx = createContext<GameCtx | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const [snap, setSnap] = useState<Snapshot>(emptySnapshot)
  const [ready, setReady] = useState(false)
  const [connected, setConnected] = useState(true)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(() => {
    const fromUrl = takeSecretFromUrl()
    if (fromUrl) writeSecret(fromUrl)
    return fromUrl ?? readSecret()
  })
  const reactionListeners = useRef(new Set<ReactionListener>())
  // Compteur de mises à jour temps réel : un rechargement complet lancé avant
  // une mise à jour ne doit pas l'écraser avec des données plus anciennes.
  const version = useRef(0)

  const reload = useCallback(async () => {
    try {
      for (let attempt = 0; ; attempt++) {
        const v = version.current
        const s = await backend.load()
        if (v === version.current || attempt >= 2) {
          setSnap(s)
          break
        }
      }
      setReady(true)
      setConnected(true)
      setConnectionError(null)
    } catch (e) {
      const err = toGameError(e)
      console.error('Chargement impossible :', err.detail ?? err.message)
      setConnected(false)
      setConnectionError(`Chargement : ${err.detail ?? err.message}`)
    }
  }, [])

  useEffect(() => {
    reload()
    const unsub = backend.subscribe({
      onUpdate: (fn: Updater) => {
        version.current++
        setSnap((s) => fn(s))
      },
      onReaction: (r) => reactionListeners.current.forEach((l) => l(r)),
      onStatus: (ok, detail) => {
        setConnected(ok)
        if (detail) console.error(detail)
        setConnectionError(ok ? null : (detail ?? null))
      },
    })
    // Téléphone qui sort de veille ou réseau qui revient : on resynchronise.
    const onVisible = () => document.visibilityState === 'visible' && reload()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', reload)
    window.addEventListener('focus', reload)
    // Filet de sécurité : resynchronisation complète toutes les 45 s.
    const timer = window.setInterval(() => document.visibilityState === 'visible' && reload(), 45_000)
    return () => {
      unsub()
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', reload)
      window.removeEventListener('focus', reload)
      window.clearInterval(timer)
    }
  }, [reload])

  // Vérifie que la session enregistrée correspond toujours à un joueur.
  const [meId, setMeId] = useState<string | null>(null)
  useEffect(() => {
    if (!secret) {
      setMeId(null)
      return
    }
    let alive = true
    backend.whoami(secret).then((p) => {
      if (!alive) return
      if (p) setMeId(p.id)
      else {
        writeSecret(null)
        setSecret(null)
      }
    })
    return () => {
      alive = false
    }
  }, [secret])

  const me = useMemo(() => snap.players.find((p) => p.id === meId) ?? null, [snap.players, meId])

  const requireSecret = () => {
    if (!secret || !meId) throw toGameError(new Error('NOT_FOUND'))
    return secret
  }

  const value: GameCtx = {
    snap,
    ready,
    connected,
    connectionError,
    me,
    secret,
    async join(name, avatar) {
      const session = await backend.join(name, avatar).catch((e) => Promise.reject(toGameError(e)))
      writeSecret(session.secret)
      setMeId(session.playerId)
      setSecret(session.secret)
      await reload()
    },
    logout() {
      writeSecret(null)
      setSecret(null)
    },
    async updateProfile(name, avatar) {
      await backend.updateProfile(requireSecret(), name, avatar).catch((e) => Promise.reject(toGameError(e)))
      await reload()
    },
    async savePrediction(kind, payload) {
      const s = requireSecret()
      const prev = snap
      // Mise à jour optimiste : l'écran réagit tout de suite.
      setSnap((cur) => ({
        ...cur,
        predictions: [
          ...cur.predictions.filter((p) => !(p.playerId === meId && p.kind === kind)),
          { playerId: meId!, kind, payload: payload as never, updatedAt: new Date().toISOString() },
        ],
      }))
      try {
        await backend.savePrediction(s, kind, payload)
      } catch (e) {
        setSnap(prev)
        throw toGameError(e)
      }
    },
    async saveRating(candidateId, round, score) {
      const s = requireSecret()
      setSnap((cur) => ({
        ...cur,
        ratings: [
          ...cur.ratings.filter((r) => !(r.playerId === meId && r.candidateId === candidateId && r.round === round)),
          ...(score > 0 ? [{ playerId: meId!, candidateId, round, score }] : []),
        ],
      }))
      try {
        await backend.saveRating(s, candidateId, round, score)
      } catch (e) {
        reload()
        throw toGameError(e)
      }
    },
    async answerBet(betId, choice) {
      const s = requireSecret()
      setSnap((cur) => ({
        ...cur,
        betAnswers: [...cur.betAnswers.filter((a) => !(a.betId === betId && a.playerId === meId)), { betId, playerId: meId!, choice }],
      }))
      try {
        await backend.answerBet(s, betId, choice)
      } catch (e) {
        reload()
        throw toGameError(e)
      }
    },
    react(emoji) {
      const r: Reaction = { emoji, playerId: me?.id ?? 'anon', name: me?.name ?? '' }
      backend.sendReaction(r)
      if (backend.mode === 'live') reactionListeners.current.forEach((l) => l(r))
    },
    onReaction(fn) {
      reactionListeners.current.add(fn)
      return () => reactionListeners.current.delete(fn)
    },
    reload,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useGame(): GameCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useGame hors GameProvider')
  return ctx
}

/** Valeur précédente d'une donnée (pour détecter les changements). */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined)
  useEffect(() => {
    ref.current = value
  })
  return ref.current
}
