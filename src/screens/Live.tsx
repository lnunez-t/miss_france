import { BetCard } from '../components/BetCard'
import { CandidatePhoto, Countdown, Stars, useNotify } from '../components/ui'
import { candidate, missLabel, SHOW_START } from '../data/candidates'
import { canEditPrediction, currentRound, PHASE_BY_ID, PHASES, phaseIndex, RANK_TITLES, ROUNDS, roundCandidates } from '../lib/phases'
import { candidateStats, getPrediction, leaderboard } from '../lib/scoring'
import { useGame } from '../lib/store'
import type { PredAvant, PredApres15, PredChouchoute, PredFinal } from '../lib/types'
import type { Tab } from './PlayerApp'

export function Timeline({ compact = false }: { compact?: boolean }) {
  const { snap } = useGame()
  const cur = phaseIndex(snap.game.phase)
  return (
    <ol className={`timeline ${compact ? 'timeline-compact' : ''}`} aria-label="Déroulé de la soirée">
      {PHASES.map((p, i) => (
        <li key={p.id} className={i < cur ? 'done' : i === cur ? 'current' : ''} aria-current={i === cur ? 'step' : undefined}>
          <span className="tl-dot">{i < cur ? '✓' : p.emoji}</span>
          {!compact && <span className="tl-label">{p.short}</span>}
        </li>
      ))}
    </ol>
  )
}

function OnStage() {
  const { snap, me, saveRating } = useGame()
  const { toast } = useNotify()
  const { onStage, phase, results } = snap.game
  const round = currentRound(phase)
  const c = candidate(onStage)
  if (!c || !round || !roundCandidates(round, results).includes(c.id)) return null
  const mine = snap.ratings.find((r) => r.playerId === me?.id && r.candidateId === c.id && r.round === round)?.score ?? 0
  const stats = candidateStats(snap, c.id).byRound[round]
  return (
    <section className="card onstage">
      <div className="onstage-live">
        <span className="live-dot" /> Sur scène · {ROUNDS[round].emoji} {ROUNDS[round].label}
      </div>
      <div className="onstage-body">
        <CandidatePhoto id={c.id} size="lg" />
        <div>
          <div className="onstage-region">Miss {c.region}</div>
          <div className="muted">{c.name}</div>
          {mine > 0 && stats && (
            <div className="onstage-avg">
              Famille : <b>{stats.average.toFixed(1)}</b>/5 · {stats.votes} vote{stats.votes > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
      <Stars size="lg" value={mine} onChange={(v) => saveRating(c.id, round, v).catch((e) => toast((e as Error).message, 'bad'))} />
    </section>
  )
}

function PronoStatus({ go }: { go: (t: Tab) => void }) {
  const { snap, me } = useGame()
  if (!me) return null
  const phase = snap.game.phase
  const avant = getPrediction(snap, me.id, 'avant') as PredAvant | undefined
  const apres = getPrediction(snap, me.id, 'apres15') as PredApres15 | undefined
  const fin = getPrediction(snap, me.id, 'final') as PredFinal | undefined
  const chou = (getPrediction(snap, me.id, 'chouchoute') as PredChouchoute | undefined)?.candidate

  let todo: { title: string; text: string } | null = null
  if (canEditPrediction(phase, 'avant')) {
    const done = avant?.top15.length === 15 && avant.top5.length === 5 && !!avant.miss
    todo = done
      ? { title: '✅ Pronostic complet', text: 'Tu peux encore le modifier jusqu’au début du show.' }
      : { title: '🔮 Fais ton pronostic !', text: 'Top 15, Top 5 et Miss France 2027 — verrouillé au lancement du show.' }
  } else if (canEditPrediction(phase, 'apres15') && snap.game.results.top15.length === 15) {
    todo = apres?.miss
      ? { title: '✅ 2e chance validée', text: 'Modifiable jusqu’à l’annonce du Top 5.' }
      : { title: '🎯 2e chance !', text: 'Refais ton Top 5 et ta Miss parmi les 15 demi-finalistes.' }
  } else if (canEditPrediction(phase, 'final') && snap.game.results.top5.length === 5) {
    todo = fin?.order.length === 5
      ? { title: '✅ Classement final validé', text: 'Modifiable jusqu’au verdict.' }
      : { title: '🏁 Classement final !', text: 'Classe les 5 finalistes, de Miss France à la 4e dauphine.' }
  }

  return (
    <>
      {todo && (
        <button className={`card cta ${todo.title.startsWith('✅') ? 'cta-done' : 'cta-todo'}`} onClick={() => go('pronos')}>
          <div className="cta-title">{todo.title}</div>
          <div className="cta-text">{todo.text}</div>
          <span className="cta-arrow" aria-hidden>
            ›
          </span>
        </button>
      )}
      {!chou && phaseIndex(phase) < phaseIndex('verdict') && (
        <button className="card cta" onClick={() => go('candidates')}>
          <div className="cta-title">💖 Choisis ta chouchoute</div>
          <div className="cta-text">Pour le plaisir, sans points : qui te fait vibrer ?</div>
          <span className="cta-arrow" aria-hidden>
            ›
          </span>
        </button>
      )}
    </>
  )
}

function ResultsStrip() {
  const { snap, me } = useGame()
  const { top15, top5, verdict } = snap.game.results
  const avant = me ? (getPrediction(snap, me.id, 'avant') as PredAvant | undefined) : undefined
  if (verdict.length) {
    return (
      <section className="card">
        <h3 className="section-title">👑 Le verdict</h3>
        <ol className="verdict-list">
          {[...verdict].reverse().map((id) => {
            const rank = 4 - verdict.indexOf(id)
            return (
              <li key={id} className={rank === 0 ? 'verdict-miss' : ''}>
                <CandidatePhoto id={id} size="sm" />
                <span>
                  <b>{RANK_TITLES[rank]}</b>
                  <br />
                  {missLabel(id)}
                </span>
              </li>
            )
          })}
        </ol>
      </section>
    )
  }
  const list = top5.length ? top5 : top15
  if (!list.length) return null
  const label = top5.length ? `🔥 Top 5 (${top5.length}/5)` : `🌟 Top 15 (${top15.length}/15)`
  const mine = (id: string) => (top5.length ? avant?.top5.includes(id) : avant?.top15.includes(id))
  return (
    <section className="card">
      <h3 className="section-title">{label}</h3>
      <div className="mini-grid">
        {list.map((id) => (
          <div key={id} className={`mini ${mine(id) ? 'mini-hit' : ''}`}>
            <CandidatePhoto id={id} size="sm" />
            <span>{candidate(id)?.region}</span>
            {mine(id) && <span className="mini-check">✓</span>}
          </div>
        ))}
      </div>
      {avant && <p className="muted small">✓ = dans ton pronostic d’avant-show</p>}
    </section>
  )
}

function MiniBoard({ go }: { go: (t: Tab) => void }) {
  const { snap, me } = useGame()
  const board = leaderboard(snap)
  if (!board.some((r) => r.score.total > 0)) return null
  const mine = board.find((r) => r.player.id === me?.id)
  return (
    <button className="card mini-board" onClick={() => go('ranking')}>
      <h3 className="section-title">🏆 Classement</h3>
      {board.slice(0, 3).map((r) => (
        <div key={r.player.id} className={`mb-row ${r.player.id === me?.id ? 'me' : ''}`}>
          <span className="mb-rank">{['🥇', '🥈', '🥉'][r.rank - 1] ?? r.rank}</span>
          <span className="mb-name">
            {r.player.avatar} {r.player.name}
          </span>
          <span className="mb-pts">{r.score.total} pts</span>
        </div>
      ))}
      {mine && mine.rank > 3 && (
        <div className="mb-row me">
          <span className="mb-rank">{mine.rank}</span>
          <span className="mb-name">
            {mine.player.avatar} {mine.player.name}
          </span>
          <span className="mb-pts">{mine.score.total} pts</span>
        </div>
      )}
    </button>
  )
}

export function Live({ go }: { go: (t: Tab) => void }) {
  const { snap } = useGame()
  const phase = PHASE_BY_ID[snap.game.phase]
  const openBets = snap.bets.filter((b) => b.status !== 'resolved')
  const lastResolved = snap.bets.filter((b) => b.status === 'resolved').slice(-1)

  return (
    <div className="stack">
      <section className="card phase-card">
        <div className="phase-kicker">En ce moment</div>
        <div className="phase-title">
          <span aria-hidden>{phase.emoji}</span> {phase.label}
        </div>
        <p className="phase-hint">{phase.hint}</p>
        {phase.id === 'accueil' && (
          <p className="countdown">
            Début du show dans <Countdown to={SHOW_START} />
          </p>
        )}
        <Timeline />
      </section>

      <OnStage />
      {openBets.map((b) => (
        <BetCard key={b.id} bet={b} />
      ))}
      <PronoStatus go={go} />
      {phase.round && (
        <button className="card cta" onClick={() => go('candidates')}>
          <div className="cta-title">
            {ROUNDS[phase.round].emoji} Noter toutes les candidates
          </div>
          <div className="cta-text">Tu as raté un passage ? Note-les depuis la liste.</div>
          <span className="cta-arrow" aria-hidden>
            ›
          </span>
        </button>
      )}
      <ResultsStrip />
      {lastResolved.map((b) => (
        <BetCard key={b.id} bet={b} />
      ))}
      <MiniBoard go={go} />
    </div>
  )
}
