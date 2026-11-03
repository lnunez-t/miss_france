import { useState } from 'react'
import { CANDIDATES, missLabel } from '../data/candidates'
import { useGame } from '../lib/store'
import type { Bet } from '../lib/types'
import { CandidatePicker } from './CandidatePicker'
import { Sheet, useNotify } from './ui'

/** Liste des candidates proposées pour un pari « candidate » : les plus pertinentes selon l'avancée du show. */
export function betCandidateIds(top15: string[], top5: string[]): string[] {
  if (top5.length === 5) return top5
  if (top15.length === 15) return top15
  return CANDIDATES.map((c) => c.id)
}

export function BetCard({ bet }: { bet: Bet }) {
  const { snap, me, answerBet } = useGame()
  const { toast } = useNotify()
  const [picking, setPicking] = useState(false)
  const mine = snap.betAnswers.find((a) => a.betId === bet.id && a.playerId === me?.id)
  const answers = snap.betAnswers.filter((a) => a.betId === bet.id)
  const label = (v: string) => (bet.type === 'candidate' ? missLabel(v) : v)

  const choose = async (choice: string) => {
    try {
      await answerBet(bet.id, choice)
      toast(<>Pari enregistré : <b>{label(choice)}</b></>, 'good')
    } catch (e) {
      toast((e as Error).message, 'bad')
    }
  }

  const open = bet.status === 'open'
  const won = bet.status === 'resolved' && mine && mine.choice === bet.answer

  return (
    <div className={`card bet bet-${bet.status}`}>
      <div className="bet-head">
        <span className="chip chip-gold">⚡ Pari éclair · {bet.points} pts</span>
        <span className="muted small">
          {answers.length} réponse{answers.length > 1 ? 's' : ''}
        </span>
      </div>
      <div className="bet-question">{bet.question}</div>

      {bet.type === 'choices' && (
        <div className="bet-options">
          {bet.options.map((o) => {
            const count = answers.filter((a) => a.choice === o).length
            const isAnswer = bet.status === 'resolved' && bet.answer === o
            return (
              <button key={o} className={`btn ${mine?.choice === o ? 'btn-gold' : ''} ${isAnswer ? 'btn-correct' : ''}`} disabled={!open} onClick={() => choose(o)}>
                {o}
                {!open && <span className="bet-count">{count}</span>}
              </button>
            )
          })}
        </div>
      )}

      {bet.type === 'candidate' && (
        <>
          <button className={`btn btn-block ${mine ? 'btn-gold' : ''}`} disabled={!open} onClick={() => setPicking(true)}>
            {mine ? `👉 ${label(mine.choice)}` : 'Choisir une candidate'}
          </button>
          <Sheet open={picking} onClose={() => setPicking(false)} title={bet.question}>
            <CandidatePicker
              ids={betCandidateIds(snap.game.results.top15, snap.game.results.top5)}
              selected={mine ? [mine.choice] : []}
              max={1}
              onChange={(sel) => {
                if (sel[0]) {
                  choose(sel[0])
                  setPicking(false)
                }
              }}
            />
          </Sheet>
        </>
      )}

      <div className="bet-status">
        {open && !mine && <span className="pulse-text">À toi de jouer !</span>}
        {open && mine && <span className="muted">Tu peux changer d’avis tant que c’est ouvert.</span>}
        {bet.status === 'closed' && <span className="muted">⏱️ Paris fermés — résultat bientôt…</span>}
        {bet.status === 'resolved' && bet.answer && (
          <span className={won ? 'good' : 'muted'}>
            Réponse : <b>{label(bet.answer)}</b> {mine ? (won ? `— gagné, +${bet.points} pts 🎉` : '— perdu') : ''}
          </span>
        )}
      </div>
    </div>
  )
}
