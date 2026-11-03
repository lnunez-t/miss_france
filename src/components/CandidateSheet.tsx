import { candidate } from '../data/candidates'
import { canRate, RANK_TITLES, ROUND_IDS, ROUNDS, roundCandidates } from '../lib/phases'
import { candidateStats, finalRank, getPrediction } from '../lib/scoring'
import { useGame } from '../lib/store'
import type { PredChouchoute } from '../lib/types'
import { CandidatePhoto, Sheet, Stars, useNotify } from './ui'

export function CandidateSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { snap, me, saveRating, savePrediction } = useGame()
  const { toast } = useNotify()
  const c = candidate(id)
  if (!id || !c) return <Sheet open={false} onClose={onClose}>{null}</Sheet>

  const { phase, results } = snap.game
  const stats = candidateStats(snap, id)
  const chouchoute = me ? (getPrediction(snap, me.id, 'chouchoute') as PredChouchoute | undefined)?.candidate : null
  const rank = finalRank(snap, id)
  const status =
    rank != null
      ? `👑 ${RANK_TITLES[rank]}`
      : results.top5.includes(id)
        ? '🔥 Top 5'
        : results.top15.includes(id)
          ? '🌟 Top 15'
          : results.top15.length === 15
            ? 'Éliminée'
            : null

  const rounds = ROUND_IDS.filter((r) => canRate(phase, r) && roundCandidates(r, results).includes(id))
  const myScore = (r: (typeof ROUND_IDS)[number]) => snap.ratings.find((x) => x.playerId === me?.id && x.candidateId === id && x.round === r)?.score ?? 0

  return (
    <Sheet open onClose={onClose} title={`Miss ${c.region}`}>
      <div className="cand-detail">
        <CandidatePhoto id={id} size="lg" />
        <div className="cand-info">
          <div className="cand-name">{c.name}</div>
          <div className="muted">
            {c.age} ans · {c.height}
          </div>
          <div className="muted">📍 {c.town}</div>
          {status && <span className="chip chip-gold">{status}</span>}
        </div>
      </div>

      {me && (
        <button
          className={`btn btn-block ${chouchoute === id ? 'btn-pink' : ''}`}
          onClick={async () => {
            try {
              await savePrediction('chouchoute', { candidate: chouchoute === id ? null : id })
              toast(chouchoute === id ? 'Ce n’est plus ta chouchoute.' : `💖 Miss ${c.region} est ta chouchoute !`, 'good')
            } catch (e) {
              toast((e as Error).message, 'bad')
            }
          }}
        >
          {chouchoute === id ? '💖 Ma chouchoute' : '🤍 En faire ma chouchoute'}
        </button>
      )}

      <h3 className="section-title">Mes notes</h3>
      {rounds.length === 0 && <p className="muted">Les notes s’ouvriront pendant les défilés.</p>}
      {rounds.map((r) => (
        <div key={r} className="rate-row">
          <div className="rate-label">
            {ROUNDS[r].emoji} {ROUNDS[r].label}
          </div>
          <Stars
            value={myScore(r)}
            onChange={(v) => saveRating(id, r, v).catch((e) => toast((e as Error).message, 'bad'))}
          />
          {stats.byRound[r] && (
            <div className="muted small">
              Famille : {stats.byRound[r]!.average.toFixed(1)}/5 ({stats.byRound[r]!.votes})
            </div>
          )}
        </div>
      ))}
      {stats.average != null && (
        <p className="muted">
          Moyenne générale de la famille : <b>{stats.average.toFixed(1)}/5</b> sur {stats.votes} notes
        </p>
      )}
    </Sheet>
  )
}
