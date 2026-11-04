import { useState } from 'react'
import { Avatar, CandidatePhoto, Empty } from '../components/ui'
import { candidate, missLabel } from '../data/candidates'
import { awards, familyFavorites, leaderboard, POINTS, type Breakdown } from '../lib/scoring'
import { useGame } from '../lib/store'

function Detail({ s }: { s: Breakdown }) {
  return (
    <ul className="breakdown">
      <li>
        🌟 Top 15 : <b>{s.top15}</b> pts <span className="muted">({s.top15Hits} trouvée{s.top15Hits > 1 ? 's' : ''})</span>
      </li>
      <li>
        🔥 Top 5 : <b>{s.top5}</b> pts <span className="muted">({s.top5Hits} trouvée{s.top5Hits > 1 ? 's' : ''})</span>
      </li>
      <li>
        👑 Classement final : <b>{s.final}</b> pts{' '}
        <span className="muted">
          ({s.missHit ? 'Miss trouvée, ' : ''}
          {s.dauphineHits} dauphine{s.dauphineHits > 1 ? 's' : ''} à la bonne place)
        </span>
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
        🌟 <b>Top 15</b> (modifiable jusqu’à l’annonce du Top 15) : +{POINTS.top15} par demi-finaliste trouvée.
      </li>
      <li>
        🔥 <b>Top 5</b> (jusqu’à l’annonce du Top 5) : +{POINTS.top5} par finaliste trouvée.
      </li>
      <li>
        👑 <b>Classement final</b> (jusqu’au verdict) : +{POINTS.miss} pour Miss France à la bonne place, +{POINTS.dauphine} par dauphine à la bonne place.
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
