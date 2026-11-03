import { useState } from 'react'
import { Avatar, CandidatePhoto, Empty } from '../components/ui'
import { candidate, missLabel } from '../data/candidates'
import { awards, familyFavorites, leaderboard, POINTS, type Breakdown } from '../lib/scoring'
import { useGame } from '../lib/store'

function Detail({ s }: { s: Breakdown }) {
  return (
    <ul className="breakdown">
      <li>
        🔮 Avant-show : <b>{s.avant}</b> pts <span className="muted">({s.top15Hits} du Top 15, {s.top5Hits} du Top 5{s.missHit ? ', Miss trouvée !' : ''})</span>
      </li>
      <li>
        🎯 2e chance : <b>{s.apres15}</b> pts <span className="muted">({s.apres15Top5Hits} du Top 5{s.apres15MissHit ? ', Miss trouvée !' : ''})</span>
      </li>
      <li>
        🏁 Classement final : <b>{s.final}</b> pts <span className="muted">({s.finalExactHits} place{s.finalExactHits > 1 ? 's' : ''} exacte{s.finalExactHits > 1 ? 's' : ''})</span>
      </li>
      <li>
        ⚡ Paris éclair : <b>{s.bets}</b> pts <span className="muted">({s.betHits} gagné{s.betHits > 1 ? 's' : ''})</span>
      </li>
    </ul>
  )
}

export function Rules() {
  return (
    <ul className="rules">
      <li>
        🔮 <b>Avant le show</b> : +{POINTS.avantTop15} par demi-finaliste trouvée, +{POINTS.avantTop5} par finaliste, +{POINTS.avantMiss} pour Miss France.
      </li>
      <li>
        🎯 <b>2e chance</b> (après le Top 15) : +{POINTS.apres15Top5} par finaliste, +{POINTS.apres15Miss} pour Miss France.
      </li>
      <li>
        🏁 <b>Classement final</b> (après le Top 5) : +{POINTS.finalExact} par place exacte.
      </li>
      <li>
        ⚡ <b>Paris éclair</b> lancés pendant l’émission : points indiqués sur chaque pari.
      </li>
      <li>⭐ Les notes et la chouchoute ne rapportent pas de points : elles désignent le coup de cœur de la famille !</li>
    </ul>
  )
}

export function Ranking() {
  const { snap, me } = useGame()
  const [open, setOpen] = useState<string | null>(null)
  const board = leaderboard(snap)
  const favs = familyFavorites(snap).slice(0, 5)
  const prizes = snap.game.phase === 'fin' || snap.game.results.verdict.length === 5 ? awards(snap) : []

  return (
    <div className="stack">
      {prizes.length > 0 && (
        <section className="card awards">
          <h2 className="h2">🏆 Palmarès de la soirée</h2>
          {prizes.map((a) => (
            <div key={a.title} className="award">
              <span className="award-emoji">{a.emoji}</span>
              <div>
                <div className="award-title">{a.title}</div>
                <div className="award-winner">{candidate(a.winner) ? missLabel(a.winner) : a.winner}</div>
                <div className="muted small">{a.detail}</div>
              </div>
            </div>
          ))}
        </section>
      )}

      <section>
        <h2 className="h2">🏆 Classement des joueurs</h2>
        {board.length === 0 && <Empty emoji="🪑">Personne n’a encore rejoint la partie.</Empty>}
        <ol className="board">
          {board.map((r) => (
            <li key={r.player.id} className={`${r.player.id === me?.id ? 'me' : ''} ${r.rank <= 3 && r.score.total > 0 ? `podium-${r.rank}` : ''}`}>
              <button className="board-row" onClick={() => setOpen(open === r.player.id ? null : r.player.id)} aria-expanded={open === r.player.id}>
                <span className="board-rank">{r.score.total > 0 && r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}</span>
                <Avatar emoji={r.player.avatar} />
                <span className="board-name">
                  {r.player.name}
                  {r.player.id === me?.id && <span className="muted"> (moi)</span>}
                </span>
                <span className="board-pts">{r.score.total}</span>
              </button>
              {open === r.player.id && <Detail s={r.score} />}
            </li>
          ))}
        </ol>
      </section>

      {favs.length > 0 && (
        <section className="card">
          <h3 className="section-title">😍 Coup de cœur de la famille</h3>
          <p className="muted small">Moyenne de toutes les notes données ce soir.</p>
          <ol className="favs">
            {favs.map((f, i) => (
              <li key={f.candidateId}>
                <span className="fav-rank">{i + 1}</span>
                <CandidatePhoto id={f.candidateId} size="sm" />
                <span className="fav-name">{missLabel(f.candidateId)}</span>
                <span className="fav-score">
                  {f.average.toFixed(1)} ★<span className="muted small"> ({f.votes})</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="card">
        <h3 className="section-title">📜 Règles du jeu</h3>
        <Rules />
      </section>
    </div>
  )
}
