import { useEffect } from 'react'
import { betCandidateIds } from '../components/BetCard'
import { FlyingReactions } from '../components/Reactions'
import { Avatar, CandidatePhoto, ConnectionBanner, Countdown } from '../components/ui'
import { candidate, missLabel, SHOW_START } from '../data/candidates'
import { keepAwake, prettyUrl } from '../lib/device'
import { currentRound, PHASE_BY_ID, RANK_TITLES, ROUNDS, roundCandidates } from '../lib/phases'
import { awards, candidateStats, familyFavorites, leaderboard } from '../lib/scoring'
import { useGame } from '../lib/store'
import { useGameEvents } from '../lib/useGameEvents'
import { BingoWinners } from './Bingo'
import { Timeline } from './Live'

/** Écran à projeter sur la télé / l'ordinateur du salon. */
export function Tv() {
  const { snap, ready, connected, connectionError } = useGame()
  useGameEvents('tv')
  useEffect(() => {
    let release: (() => void) | null = null
    keepAwake().then((r) => (release = r))
    return () => release?.()
  }, [])

  if (!ready) return <div className="loading">👑</div>

  const { phase, onStage, results } = snap.game
  const p = PHASE_BY_ID[phase]
  const board = leaderboard(snap).slice(0, 8)
  const round = currentRound(phase)
  const stage = candidate(onStage)
  const onStageInRound = !!stage && !!round && roundCandidates(round, results).includes(stage.id)
  const stageStats = stage && round ? candidateStats(snap, stage.id).byRound[round] : undefined
  const openBets = snap.bets.filter((b) => b.status !== 'resolved')
  const favs = familyFavorites(snap, round ?? undefined).slice(0, 5)
  const prizes = phase === 'fin' ? awards(snap) : []

  return (
    <div className="tv">
      <ConnectionBanner connected={connected} detail={connectionError} />
      <header className="tv-head">
        <div className="tv-title">👑 Miss France 2027 · Soirée</div>
        <div className="tv-phase">
          {p.emoji} {p.label}
        </div>
        <div className="tv-join">
          Rejoins-nous sur <b>{prettyUrl()}</b>
        </div>
      </header>
      <Timeline />

      <div className="tv-grid">
        <section className="tv-main">
          {phase === 'accueil' && (
            <div className="tv-hero">
              <div className="tv-hero-kicker">Début du show dans</div>
              <div className="tv-hero-count">
                <Countdown to={SHOW_START} />
              </div>
              <div className="tv-hero-sub">Ouvre <b>{prettyUrl()}</b> sur ton téléphone et fais tes pronostics !</div>
              <div className="tv-players">
                {snap.players.map((pl) => (
                  <span key={pl.id} className="tv-player">
                    {pl.avatar} {pl.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {stage && round && onStageInRound && (
            <div className="tv-stage">
              <CandidatePhoto id={stage.id} size="xl" />
              <div>
                <div className="onstage-live">
                  <span className="live-dot" /> Sur scène · {ROUNDS[round].label}
                </div>
                <div className="tv-stage-name">Miss {stage.region}</div>
                <div className="tv-stage-sub">{stage.name}</div>
                <div className="tv-stage-score">
                  {stageStats ? (
                    <>
                      {stageStats.average.toFixed(1)} <span className="gold">★</span> <small>({stageStats.votes} vote{stageStats.votes > 1 ? 's' : ''})</small>
                    </>
                  ) : (
                    <small>À vos étoiles ! ⭐</small>
                  )}
                </div>
              </div>
            </div>
          )}

          {openBets.map((b) => {
            const answers = snap.betAnswers.filter((a) => a.betId === b.id)
            const opts = b.type === 'choices' ? b.options : betCandidateIds(results.top15, results.top5).filter((id) => answers.some((a) => a.choice === id))
            return (
              <div key={b.id} className="tv-bet">
                <div className="chip chip-gold">⚡ Pari éclair · {b.status === 'open' ? 'ouvert' : 'fermé'}</div>
                <div className="tv-bet-q">{b.question}</div>
                <div className="tv-bet-bars">
                  {opts.map((o) => {
                    const n = answers.filter((a) => a.choice === o).length
                    return (
                      <div key={o} className="tv-bar">
                        <span>{b.type === 'candidate' ? missLabel(o) : o}</span>
                        <div className="tv-bar-track">
                          <div className="tv-bar-fill" style={{ width: `${answers.length ? (n / answers.length) * 100 : 0}%` }} />
                        </div>
                        <b>{n}</b>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {results.verdict.length > 0 ? (
            <div className="tv-verdict">
              {[...results.verdict].reverse().map((id) => {
                const rank = 4 - results.verdict.indexOf(id)
                return (
                  <div key={id} className={`tv-verdict-item ${rank === 0 ? 'miss' : ''}`}>
                    <CandidatePhoto id={id} size={rank === 0 ? 'xl' : 'lg'} />
                    <div className="tv-verdict-title">{RANK_TITLES[rank]}</div>
                    <div>{missLabel(id)}</div>
                  </div>
                )
              })}
            </div>
          ) : (
            (results.top5.length > 0 || results.top15.length > 0) && (
              <div>
                <h2 className="tv-h2">{results.top5.length ? `🔥 Top 5 (${results.top5.length}/5)` : `🌟 Top 15 (${results.top15.length}/15)`}</h2>
                <div className="tv-results">
                  {(results.top5.length ? results.top5 : results.top15).map((id) => (
                    <div key={id} className="tv-result">
                      <CandidatePhoto id={id} size="md" />
                      <span>{candidate(id)?.region}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}

          {prizes.length > 0 && (
            <div className="tv-awards">
              {prizes.map((a) => (
                <div key={a.title} className="award">
                  <span className="award-emoji">{a.emoji}</span>
                  <div>
                    <div className="award-title">{a.title}</div>
                    <div className="award-winner">{candidate(a.winner) ? missLabel(a.winner) : a.winner}</div>
                    <div className="muted">{a.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="tv-side">
          <h2 className="tv-h2">🏆 Classement</h2>
          <ol className="tv-board">
            {board.map((r) => (
              <li key={r.player.id}>
                <span className="board-rank">{r.score.total > 0 && r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}</span>
                <Avatar emoji={r.player.avatar} />
                <span className="board-name">{r.player.name}</span>
                <span className="board-pts">{r.score.total}</span>
              </li>
            ))}
          </ol>
          {snap.bingo.some((b) => b.bingoAt) && (
            <>
              <h2 className="tv-h2">🎱 Bingo</h2>
              <BingoWinners compact />
            </>
          )}
          {favs.length > 0 && (
            <>
              <h2 className="tv-h2">😍 Coups de cœur{round ? ` · ${ROUNDS[round].label}` : ''}</h2>
              <ol className="favs">
                {favs.map((f, i) => (
                  <li key={f.candidateId}>
                    <span className="fav-rank">{i + 1}</span>
                    <CandidatePhoto id={f.candidateId} size="sm" />
                    <span className="fav-name">{candidate(f.candidateId)?.region}</span>
                    <span className="fav-score">{f.average.toFixed(1)} ★</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </aside>
      </div>
      <FlyingReactions showNames max={60} />
    </div>
  )
}
