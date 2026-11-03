import { useState } from 'react'
import { CandidateSheet } from '../components/CandidateSheet'
import { CandidatePhoto } from '../components/ui'
import { CANDIDATES } from '../data/candidates'
import { currentRound, ROUNDS, roundCandidates } from '../lib/phases'
import { finalRank, getPrediction } from '../lib/scoring'
import { useGame } from '../lib/store'
import type { PredChouchoute } from '../lib/types'

type Filter = 'all' | 'round' | 'top15' | 'top5'

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function Candidates() {
  const { snap, me } = useGame()
  const [open, setOpen] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const { results, phase } = snap.game
  const round = currentRound(phase)
  const [filter, setFilter] = useState<Filter>(round ? 'round' : 'all')
  const chou = me ? (getPrediction(snap, me.id, 'chouchoute') as PredChouchoute | undefined)?.candidate : null

  const pool =
    filter === 'round' && round
      ? roundCandidates(round, results)
      : filter === 'top15'
        ? results.top15
        : filter === 'top5'
          ? results.top5
          : CANDIDATES.map((c) => c.id)
  const q = norm(query.trim())
  const list = CANDIDATES.filter((c) => pool.includes(c.id) && (!q || norm(`${c.region} ${c.name} ${c.town}`).includes(q)))

  const myScore = (id: string) => (round ? snap.ratings.find((r) => r.playerId === me?.id && r.candidateId === id && r.round === round)?.score : undefined)
  const ratedCount = round ? roundCandidates(round, results).filter((id) => myScore(id)).length : 0

  return (
    <div className="stack">
      <input className="input" type="search" placeholder="🔍 Rechercher une région, un prénom…" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="filters" role="tablist">
        {round && (
          <button role="tab" aria-selected={filter === 'round'} className={filter === 'round' ? 'on' : ''} onClick={() => setFilter('round')}>
            {ROUNDS[round].emoji} À noter ({ratedCount}/{roundCandidates(round, results).length})
          </button>
        )}
        <button role="tab" aria-selected={filter === 'all'} className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>
          Toutes (31)
        </button>
        {results.top15.length > 0 && (
          <button role="tab" aria-selected={filter === 'top15'} className={filter === 'top15' ? 'on' : ''} onClick={() => setFilter('top15')}>
            🌟 Top 15
          </button>
        )}
        {results.top5.length > 0 && (
          <button role="tab" aria-selected={filter === 'top5'} className={filter === 'top5' ? 'on' : ''} onClick={() => setFilter('top5')}>
            🔥 Top 5
          </button>
        )}
      </div>

      <div className="cand-grid">
        {list.map((c) => {
          const score = myScore(c.id)
          const rank = finalRank(snap, c.id)
          const out = results.top15.length === 15 && !results.top15.includes(c.id)
          return (
            <button key={c.id} className={`cand-card ${out ? 'out' : ''} ${snap.game.onStage === c.id ? 'live' : ''}`} onClick={() => setOpen(c.id)}>
              <CandidatePhoto id={c.id} />
              <span className="cand-card-region">{c.region}</span>
              <span className="cand-card-name">{c.name}</span>
              <span className="cand-card-badges">
                {chou === c.id && <span title="Ma chouchoute">💖</span>}
                {rank === 0 && <span>👑</span>}
                {rank == null && results.top5.includes(c.id) && <span>🔥</span>}
                {!results.top5.includes(c.id) && results.top15.includes(c.id) && <span>🌟</span>}
              </span>
              {snap.game.onStage === c.id && <span className="cand-card-live">Sur scène</span>}
              {round && filter === 'round' && <span className={`cand-card-score ${score ? 'done' : ''}`}>{score ? `${'★'.repeat(score)}` : 'À noter'}</span>}
            </button>
          )
        })}
      </div>
      <CandidateSheet id={open} onClose={() => setOpen(null)} />
    </div>
  )
}
