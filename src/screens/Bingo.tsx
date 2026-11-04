import { useEffect, useRef } from 'react'
import { Avatar, useNotify } from '../components/ui'
import { BINGO_FREE, BINGO_FREE_LABEL, BINGO_ITEMS, bingoLines, newBingoCard } from '../data/bingo'
import { burst, vibrate } from '../lib/device'
import { useGame } from '../lib/store'
import type { BingoCard, Player, Snapshot } from '../lib/types'

const LETTERS = ['M', 'I', 'S', 'S', '!']

/** Joueurs ayant fait bingo (puis carton plein), dans l'ordre d'arrivée. */
export function bingoRanking(snap: Snapshot, field: 'bingoAt' | 'fullAt'): { player: Player; card: BingoCard; at: string }[] {
  return snap.bingo
    .filter((b) => b[field])
    .map((card) => ({ card, at: card[field]!, player: snap.players.find((p) => p.id === card.playerId)! }))
    .filter((x) => x.player)
    .sort((a, b) => a.at.localeCompare(b.at))
}

const time = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

export function BingoWinners({ compact = false }: { compact?: boolean }) {
  const { snap, me } = useGame()
  const bingos = bingoRanking(snap, 'bingoAt')
  const fulls = bingoRanking(snap, 'fullAt')
  if (!bingos.length) return compact ? null : <p className="muted">Personne n’a encore fait bingo… à qui le tour ?</p>
  return (
    <div className="bingo-winners">
      {fulls[0] && (
        <div className="bingo-full">
          👑 <b>Carton plein</b> : {fulls[0].player.avatar} {fulls[0].player.name} — Miss Canapé 2027 !
        </div>
      )}
      <ol>
        {bingos.slice(0, compact ? 5 : 50).map((b, i) => (
          <li key={b.player.id} className={b.player.id === me?.id ? 'me' : ''}>
            <span className="board-rank">{['🥇', '🥈', '🥉'][i] ?? i + 1}</span>
            <Avatar emoji={b.player.avatar} size="sm" />
            <span className="board-name">{b.player.name}</span>
            <span className="muted small">{time(b.at)}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

export function Bingo() {
  const { snap, me, saveBingo } = useGame()
  const { toast } = useNotify()
  const card = snap.bingo.find((b) => b.playerId === me?.id)
  const phase = snap.game.phase
  const canCheck = phase !== 'accueil' && phase !== 'fin'
  const canShuffle = phase === 'accueil'
  const creating = useRef(false)

  // Première visite : on distribue une grille.
  useEffect(() => {
    if (!me || card || creating.current) return
    creating.current = true
    saveBingo(newBingoCard(), [])
      .catch((e) => toast((e as Error).message, 'bad'))
      .finally(() => (creating.current = false))
  }, [me, card, saveBingo, toast])

  if (!me) return null
  if (!card) return <div className="empty">🎱 Distribution de ta grille…</div>

  const lines = bingoLines(card.checked)
  const winCells = new Set(lines.flat())
  const checkedCount = new Set([...card.checked, BINGO_FREE]).size

  const toggle = async (i: number) => {
    if (i === BINGO_FREE) return
    if (!canCheck) return toast(phase === 'fin' ? 'Le bingo est terminé !' : 'Le bingo commence avec l’émission : patience 😉')
    vibrate(15)
    const next = card.checked.includes(i) ? card.checked.filter((x) => x !== i) : [...card.checked, i]
    const before = bingoLines(card.checked).length
    const after = bingoLines(next).length
    if (after > before) {
      burst()
      toast(after === 1 ? '🎱 BINGO ! Lève-toi et crie « BINGO, JEAN-PIERRE ! »' : `🎱 ${after} lignes, la couronne approche…`, 'good')
    }
    try {
      await saveBingo(card.cells, next)
    } catch (e) {
      toast((e as Error).message, 'bad')
    }
  }

  return (
    <div className="stack bingo">
      <div className="bingo-head">
        <h2 className="h2">🎱 Bingo Miss France</h2>
        <div className="bingo-sash">Grille officielle de Miss {me.name}</div>
        <div className="bingo-score">
          <span>
            Cases : <b>{checkedCount}</b>/25
          </span>
          <span>
            Lignes : <b>{lines.length}</b>
          </span>
        </div>
        {!canCheck && phase === 'accueil' && <p className="warn">⏳ Découvre ta grille : tu pourras cocher les cases dès le début de l’émission.</p>}
      </div>

      <div>
        <div className="bingo-letters" aria-hidden>
          {LETTERS.map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
        <div className="bingo-grid" role="grid" aria-label="Grille de bingo">
          {card.cells.map((itemIdx, i) => {
            const free = i === BINGO_FREE
            const on = free || card.checked.includes(i)
            return (
              <button
                key={i}
                type="button"
                className={`bingo-cell ${free ? 'free' : ''} ${on && !free ? 'on' : ''} ${winCells.has(i) && !free ? 'win' : ''}`}
                aria-pressed={on}
                onClick={() => toggle(i)}
              >
                {free ? BINGO_FREE_LABEL : BINGO_ITEMS[itemIdx] ?? '?'}
              </button>
            )
          })}
        </div>
      </div>

      {canShuffle && (
        <button
          className="btn btn-block"
          onClick={() =>
            saveBingo(newBingoCard(), [])
              .then(() => toast('Nouvelle grille distribuée 🔀', 'good'))
              .catch((e) => toast((e as Error).message, 'bad'))
          }
        >
          🔀 Nouvelle grille (possible jusqu’au début du show)
        </button>
      )}

      <section className="card">
        <h3 className="section-title">🏆 Les bingos de la soirée</h3>
        <BingoWinners />
      </section>

      <section className="card rules-card">
        <h3 className="section-title">📜 Les règles du salon</h3>
        <ol className="bingo-rules">
          <li>Chacun a sa grille, toutes différentes.</li>
          <li>Dès que ça arrive à l’écran, touche la case.</li>
          <li>
            Une ligne, une colonne ou une diagonale ? Tout le monde est prévenu, et tu cries <b>« BINGO, JEAN-PIERRE ! »</b>
          </li>
          <li>Premier carton plein = couronné(e) Miss Canapé 2027, avec écharpe en papier toilette.</li>
          <li>Toute triche sera jugée par le jury (= mamie).</li>
        </ol>
        <p className="muted small">Gages pour le dernier : défiler dans le salon, réciter son « discours de Miss » à minuit, ou faire la vaisselle du réveillon.</p>
      </section>
    </div>
  )
}
