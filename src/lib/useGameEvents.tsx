import { useEffect, useRef } from 'react'
import { useNotify } from '../components/ui'
import { candidate, missLabel } from '../data/candidates'
import { PHASE_BY_ID, VERDICT_TITLES } from './phases'
import { getPrediction, POINTS } from './scoring'
import { useGame } from './store'
import type { PredAvant, PredApres15, PredFinal, Snapshot } from './types'

/**
 * Compare l'état avant/après chaque mise à jour et déclenche les annonces :
 * changement d'étape, candidate sur scène, Top 15 / Top 5 / verdict, paris éclair.
 */
export function useGameEvents(mode: 'player' | 'tv') {
  const { snap, ready, me } = useGame()
  const { toast, announce } = useNotify()
  const prev = useRef<Snapshot | null>(null)

  useEffect(() => {
    if (!ready) return
    const before = prev.current
    prev.current = snap
    if (!before) return // premier chargement : pas d'annonce

    const g = snap.game
    const old = before.game
    const meId = me?.id

    if (g.phase !== old.phase) {
      const p = PHASE_BY_ID[g.phase]
      announce({ kicker: 'Nouvelle étape', title: `${p.emoji} ${p.label}`, note: mode === 'player' ? p.hint : undefined })
    }

    if (g.onStage && g.onStage !== old.onStage && mode === 'player') {
      const c = candidate(g.onStage)
      if (c) toast(<>🎙️ Sur scène : <b>Miss {c.region}</b> — note-la !</>)
    }

    const avant = meId ? (getPrediction(snap, meId, 'avant') as PredAvant | undefined) : undefined
    const apres = meId ? (getPrediction(snap, meId, 'apres15') as PredApres15 | undefined) : undefined
    const fin = meId ? (getPrediction(snap, meId, 'final') as PredFinal | undefined) : undefined

    for (const id of g.results.top15.filter((x) => !old.results.top15.includes(x))) {
      const mine = avant?.top15.includes(id)
      announce({
        kicker: `Top 15 · ${g.results.top15.length}/15`,
        title: missLabel(id),
        candidateId: id,
        note: mode === 'player' ? (mine ? `Tu l’avais choisie ! +${POINTS.avantTop15} pt` : avant ? 'Pas dans ton pronostic…' : undefined) : undefined,
      })
    }

    for (const id of g.results.top5.filter((x) => !old.results.top5.includes(x))) {
      const pts = (avant?.top5.includes(id) ? POINTS.avantTop5 : 0) + (apres?.top5.includes(id) ? POINTS.apres15Top5 : 0)
      announce({
        kicker: `Top 5 · ${g.results.top5.length}/5`,
        title: missLabel(id),
        candidateId: id,
        note: mode === 'player' && meId ? (pts ? `Bien vu ! +${pts} pts` : 'Tu ne l’avais pas vue venir…') : undefined,
      })
    }

    const newVerdict = g.results.verdict.slice(old.results.verdict.length)
    newVerdict.forEach((id, i) => {
      const idx = old.results.verdict.length + i
      const rank = 4 - idx
      const isMiss = idx === 4
      let note: string | undefined
      if (mode === 'player' && meId) {
        let pts = fin?.order[rank] === id ? POINTS.finalExact : 0
        if (isMiss) pts += (avant?.miss === id ? POINTS.avantMiss : 0) + (apres?.miss === id ? POINTS.apres15Miss : 0)
        note = pts ? `🎯 Bien joué ! +${pts} pts` : isMiss ? 'Raté pour cette fois !' : undefined
      }
      announce({ kicker: VERDICT_TITLES[idx], title: missLabel(id), candidateId: id, note, big: isMiss })
    })

    for (const bet of snap.bets) {
      const was = before.bets.find((b) => b.id === bet.id)
      if (!was && bet.status === 'open') {
        if (mode === 'player') announce({ kicker: '⚡ Pari éclair', title: bet.question, note: `Réponds vite ! +${bet.points} pts` })
      } else if (was && was.status !== 'resolved' && bet.status === 'resolved' && bet.answer) {
        const answerLabel = bet.type === 'candidate' ? missLabel(bet.answer) : bet.answer
        if (mode === 'player' && meId) {
          const mine = snap.betAnswers.find((a) => a.betId === bet.id && a.playerId === meId)
          if (!mine) toast(<>⚡ Réponse : <b>{answerLabel}</b></>)
          else if (mine.choice === bet.answer) toast(<>✅ Pari gagné ! « {answerLabel} » <b>+{bet.points} pts</b></>, 'good')
          else toast(<>❌ Pari perdu… c’était <b>{answerLabel}</b></>, 'bad')
        }
      } else if (was && was.status === 'open' && bet.status === 'closed' && mode === 'player') {
        toast('⏱️ Les paris sont fermés !')
      }
    }
  }, [snap, ready, me?.id, mode, toast, announce])
}
