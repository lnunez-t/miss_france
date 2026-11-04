// Mode en ligne : base partagée Supabase + temps réel.
// Les lectures passent par les tables (lecture seule pour le public),
// toutes les écritures passent par des fonctions SQL qui vérifient les règles (voir supabase/schema.sql).
import { createClient, type RealtimeChannel } from '@supabase/supabase-js'
import type { Bet, BetAnswer, GameState, Player, Prediction, Rating, Snapshot } from '../types'
import { toGameError, type Backend, type Listener, type Updater } from './types'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>

const mapGame = (r: Row): GameState => ({ phase: r.phase, onStage: r.on_stage, results: r.results, updatedAt: r.updated_at })
const mapPlayer = (r: Row): Player => ({ id: r.id, name: r.name, avatar: r.avatar, createdAt: r.created_at })
const mapPrediction = (r: Row): Prediction => ({ playerId: r.player_id, kind: r.kind, payload: r.payload, updatedAt: r.updated_at })
const mapRating = (r: Row): Rating => ({ playerId: r.player_id, candidateId: r.candidate_id, round: r.round, score: r.score })
const mapBet = (r: Row): Bet => ({ id: r.id, question: r.question, type: r.type, options: r.options ?? [], status: r.status, answer: r.answer, points: r.points, createdAt: r.created_at })
const mapAnswer = (r: Row): BetAnswer => ({ betId: r.bet_id, playerId: r.player_id, choice: r.choice })

type ListKey = 'players' | 'predictions' | 'ratings' | 'bets' | 'betAnswers'

const TABLES: { table: string; key: ListKey; map: (r: Row) => any; same: (a: any, b: any) => boolean }[] = [
  { table: 'players', key: 'players', map: mapPlayer, same: (a, b) => a.id === b.id },
  { table: 'predictions', key: 'predictions', map: mapPrediction, same: (a, b) => a.playerId === b.playerId && a.kind === b.kind },
  { table: 'ratings', key: 'ratings', map: mapRating, same: (a, b) => a.playerId === b.playerId && a.candidateId === b.candidateId && a.round === b.round },
  { table: 'bets', key: 'bets', map: mapBet, same: (a, b) => a.id === b.id },
  { table: 'bet_answers', key: 'betAnswers', map: mapAnswer, same: (a, b) => a.betId === b.betId && a.playerId === b.playerId },
]

export function createSupabaseBackend(url: string, anonKey: string): Backend {
  const sb = createClient(url, anonKey, {
    auth: { persistSession: false },
    realtime: { params: { eventsPerSecond: 20 } },
  })

  async function rpc<T = unknown>(fn: string, args: Row): Promise<T> {
    const { data, error } = await sb.rpc(fn, args)
    if (error) throw toGameError(new Error(error.message))
    return data as T
  }

  async function all(table: string): Promise<Row[]> {
    // Pagination au cas où (Supabase renvoie 1000 lignes max par requête).
    const rows: Row[] = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb.from(table).select('*').range(from, from + 999)
      if (error) throw toGameError(new Error(error.message))
      rows.push(...(data ?? []))
      if (!data || data.length < 1000) return rows
    }
  }

  let reactionChannel: RealtimeChannel | null = null

  return {
    mode: 'live',
    async load(): Promise<Snapshot> {
      const [game, players, predictions, ratings, bets, answers] = await Promise.all([
        sb.from('game').select('*').eq('id', 1).single(),
        all('players'),
        all('predictions'),
        all('ratings'),
        all('bets'),
        all('bet_answers'),
      ])
      if (game.error) throw toGameError(new Error(game.error.message))
      return {
        game: mapGame(game.data),
        players: players.map(mapPlayer),
        predictions: predictions.map(mapPrediction),
        ratings: ratings.map(mapRating),
        bets: bets.map(mapBet),
        betAnswers: answers.map(mapAnswer),
      }
    },

    subscribe(l: Listener) {
      let ch = sb.channel('db-changes')
      ch = ch.on('postgres_changes', { event: '*', schema: 'public', table: 'game' }, (p) => {
        if (p.new && 'phase' in p.new) {
          const g = mapGame(p.new)
          l.onUpdate((s) => ({ ...s, game: g }))
        }
      })
      for (const t of TABLES) {
        ch = ch.on('postgres_changes', { event: '*', schema: 'public', table: t.table }, (p) => {
          const upd: Updater = (s) => {
            const list = s[t.key] as any[]
            if (p.eventType === 'DELETE') {
              const old = t.map(p.old)
              return { ...s, [t.key]: list.filter((x) => !t.same(x, old)) }
            }
            const row = t.map(p.new)
            return { ...s, [t.key]: [...list.filter((x) => !t.same(x, row)), row] }
          }
          l.onUpdate(upd)
        })
      }
      let wasConnected = false
      ch.subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          // Après une reconnexion (téléphone en veille…), on recharge tout.
          if (wasConnected) this.load().then((snap) => l.onUpdate(() => snap)).catch(() => {})
          wasConnected = true
          l.onStatus(true)
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          l.onStatus(false, `Temps réel : ${status}${err ? ` — ${err.message}` : ''}`)
        }
      })

      reactionChannel = sb.channel('reactions', { config: { broadcast: { self: false } } })
      reactionChannel.on('broadcast', { event: 'reaction' }, ({ payload }) => l.onReaction(payload)).subscribe()

      return () => {
        sb.removeChannel(ch)
        if (reactionChannel) sb.removeChannel(reactionChannel)
        reactionChannel = null
      }
    },

    async join(name, avatar) {
      return rpc('join_game', { p_name: name, p_avatar: avatar })
    },
    async whoami(secret) {
      const data = await rpc<Row | null>('whoami', { p_secret: secret }).catch(() => null)
      return data ? mapPlayer(data) : null
    },
    async updateProfile(secret, name, avatar) {
      await rpc('update_profile', { p_secret: secret, p_name: name, p_avatar: avatar })
    },
    async savePrediction(secret, kind, payload) {
      await rpc('save_prediction', { p_secret: secret, p_kind: kind, p_payload: payload })
    },
    async saveRating(secret, candidateId, round, score) {
      await rpc('save_rating', { p_secret: secret, p_candidate: candidateId, p_round: round, p_score: score })
    },
    async answerBet(secret, betId, choice) {
      await rpc('answer_bet', { p_secret: secret, p_bet: betId, p_choice: choice })
    },
    sendReaction(r) {
      reactionChannel?.send({ type: 'broadcast', event: 'reaction', payload: r })
    },

    admin: {
      check: (pin) => rpc<boolean>('admin_check', { p_pin: pin }),
      setPhase: async (pin, phase) => void (await rpc('admin_set_phase', { p_pin: pin, p_phase: phase })),
      setOnStage: async (pin, id) => void (await rpc('admin_set_on_stage', { p_pin: pin, p_candidate: id })),
      setResults: async (pin, results) => void (await rpc('admin_set_results', { p_pin: pin, p_results: results })),
      createBet: async (pin, b) =>
        void (await rpc('admin_create_bet', { p_pin: pin, p_question: b.question, p_type: b.type, p_options: b.options, p_points: b.points })),
      updateBet: async (pin, id, status, answer) => void (await rpc('admin_update_bet', { p_pin: pin, p_id: id, p_status: status, p_answer: answer })),
      deleteBet: async (pin, id) => void (await rpc('admin_delete_bet', { p_pin: pin, p_id: id })),
      renamePlayer: async (pin, id, name) => void (await rpc('admin_rename_player', { p_pin: pin, p_id: id, p_name: name })),
      deletePlayer: async (pin, id) => void (await rpc('admin_delete_player', { p_pin: pin, p_id: id })),
      playerSecret: (pin, id) => rpc<string>('admin_player_secret', { p_pin: pin, p_id: id }),
      reset: async (pin, keep) => void (await rpc('admin_reset', { p_pin: pin, p_keep_players: keep })),
    },
  }
}
