import { useState } from 'react'
import { CandidatePicker } from '../components/CandidatePicker'
import { CandidatePhoto, Empty, useNotify } from '../components/ui'
import { CANDIDATES, candidate, missLabel } from '../data/candidates'
import { canEditPrediction, RANK_TITLES } from '../lib/phases'
import { getPrediction, officialMiss, POINTS, scorePlayer } from '../lib/scoring'
import { useGame } from '../lib/store'
import type { PredAvant, PredApres15, PredFinal, PredictionKind } from '../lib/types'

const ALL_IDS = CANDIDATES.map((c) => c.id)
const sortIds = (ids: string[]) => ALL_IDS.filter((id) => ids.includes(id))

function useSave() {
  const { savePrediction } = useGame()
  const { toast } = useNotify()
  return async (kind: PredictionKind, payload: unknown, msg?: string) => {
    try {
      await savePrediction(kind, payload)
      if (msg) toast(msg, 'good')
      return true
    } catch (e) {
      toast((e as Error).message, 'bad')
      return false
    }
  }
}

function StepBar({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="stepbar">
      {steps.map((s, i) => (
        <span key={s} className={i === current ? 'on' : i < current ? 'done' : ''}>
          {i < current ? '✓ ' : ''}
          {s}
        </span>
      ))}
    </div>
  )
}

function StickyFooter({ count, max, label, onNext, onBack, disabled }: { count?: number; max?: number; label: string; onNext: () => void; onBack?: () => void; disabled?: boolean }) {
  return (
    <div className="sticky-footer">
      {onBack && (
        <button className="btn" onClick={onBack}>
          ‹ Retour
        </button>
      )}
      {max != null && (
        <span className={`counter ${count === max ? 'full' : ''}`}>
          {count}/{max}
        </span>
      )}
      <button className="btn btn-gold" onClick={onNext} disabled={disabled}>
        {label}
      </button>
    </div>
  )
}

/* -------------------------------------------------------- Pronostic d'avant-show */

function AvantEditor() {
  const { snap, me } = useGame()
  const { toast } = useNotify()
  const save = useSave()
  const saved = (me && (getPrediction(snap, me.id, 'avant') as PredAvant | undefined)) || { top15: [], top5: [], miss: null }
  const complete = saved.top15.length === 15 && saved.top5.length === 5 && !!saved.miss
  const [draft, setDraft] = useState<PredAvant>(saved)
  const [step, setStep] = useState(complete ? 3 : 0)

  const setTop15 = (top15: string[]) => {
    const top5 = draft.top5.filter((id) => top15.includes(id))
    setDraft({ top15, top5, miss: draft.miss && top5.includes(draft.miss) ? draft.miss : null })
  }
  const setTop5 = (top5: string[]) => setDraft({ ...draft, top5, miss: draft.miss && top5.includes(draft.miss) ? draft.miss : null })

  const next = async () => {
    if (await save('avant', draft)) setStep(step + 1)
  }

  return (
    <section>
      <h2 className="h2">🔮 Mon pronostic d’avant-show</h2>
      <p className="muted">
        Verrouillé dès le début de l’émission. Barème : +{POINTS.avantTop15} par candidate du Top 15, +{POINTS.avantTop5} par candidate du Top 5, +{POINTS.avantMiss} pour Miss France.
      </p>
      <StepBar steps={['Top 15', 'Top 5', 'Miss', 'Résumé']} current={step} />

      {step === 0 && (
        <>
          <p className="instruction">Choisis les <b>15 demi-finalistes</b> :</p>
          <CandidatePicker ids={ALL_IDS} selected={draft.top15} max={15} onChange={setTop15} onFull={() => toast('Tu as déjà 15 candidates : retires-en une d’abord.')} />
          <StickyFooter count={draft.top15.length} max={15} label="Suivant ›" onNext={next} disabled={draft.top15.length !== 15} />
        </>
      )}
      {step === 1 && (
        <>
          <p className="instruction">Parmi tes 15, choisis ton <b>Top 5</b> :</p>
          <CandidatePicker ids={sortIds(draft.top15)} selected={draft.top5} max={5} onChange={setTop5} onFull={() => toast('5 maximum !')} />
          <StickyFooter count={draft.top5.length} max={5} label="Suivant ›" onNext={next} onBack={() => setStep(0)} disabled={draft.top5.length !== 5} />
        </>
      )}
      {step === 2 && (
        <>
          <p className="instruction">Et ta <b>Miss France 2027</b> ? 👑</p>
          <CandidatePicker ids={sortIds(draft.top5)} selected={draft.miss ? [draft.miss] : []} max={1} onChange={(s) => setDraft({ ...draft, miss: s[0] ?? null })} />
          <StickyFooter
            label="🔒 Valider mon pronostic"
            onBack={() => setStep(1)}
            disabled={!draft.miss}
            onNext={async () => {
              if (await save('avant', draft, 'Pronostic enregistré ! 🎉')) setStep(3)
            }}
          />
        </>
      )}
      {step === 3 && (
        <>
          <AvantSummary p={draft} />
          <button className="btn btn-block" onClick={() => setStep(0)}>
            ✏️ Modifier mon pronostic
          </button>
        </>
      )}
    </section>
  )
}

function Chips({ ids, hits }: { ids: string[]; hits?: string[] }) {
  return (
    <div className="chips">
      {sortIds(ids).map((id) => (
        <span key={id} className={`chip ${hits?.includes(id) ? 'chip-hit' : hits && hits.length ? 'chip-miss' : ''}`}>
          {hits?.includes(id) ? '✓ ' : ''}
          {candidate(id)?.region}
        </span>
      ))}
    </div>
  )
}

function AvantSummary({ p }: { p: PredAvant }) {
  const { snap } = useGame()
  const { top15, top5 } = snap.game.results
  const miss = officialMiss(snap)
  return (
    <div className="card summary">
      {p.miss && (
        <div className="summary-miss">
          <CandidatePhoto id={p.miss} size="md" />
          <div>
            <div className="muted small">Ma Miss France 2027</div>
            <div className="summary-miss-name">
              {missLabel(p.miss)} {miss && (miss === p.miss ? '🎯' : '✗')}
            </div>
          </div>
        </div>
      )}
      <div className="label">Mon Top 5</div>
      <Chips ids={p.top5} hits={top5.length ? p.top5.filter((x) => top5.includes(x)) : undefined} />
      <div className="label">Mon Top 15</div>
      <Chips ids={p.top15} hits={top15.length ? p.top15.filter((x) => top15.includes(x)) : undefined} />
    </div>
  )
}

/* -------------------------------------------------------- 2e chance (après le Top 15) */

function Apres15Editor() {
  const { snap, me } = useGame()
  const { toast } = useNotify()
  const save = useSave()
  const saved = (me && (getPrediction(snap, me.id, 'apres15') as PredApres15 | undefined)) || { top5: [], miss: null }
  const [draft, setDraft] = useState<PredApres15>(saved)
  const [step, setStep] = useState(saved.miss ? 2 : 0)
  const top15 = sortIds(snap.game.results.top15)
  return (
    <section>
      <h2 className="h2">🎯 2e chance</h2>
      <p className="muted">
        Le Top 15 est connu : refais ton Top 5 et ta Miss. +{POINTS.apres15Top5} par finaliste trouvée, +{POINTS.apres15Miss} pour Miss France. Verrouillé à l’annonce du Top 5.
      </p>
      <StepBar steps={['Top 5', 'Miss', 'Résumé']} current={step} />
      {step === 0 && (
        <>
          <CandidatePicker
            ids={top15}
            selected={draft.top5}
            max={5}
            onChange={(top5) => setDraft({ top5, miss: draft.miss && top5.includes(draft.miss) ? draft.miss : null })}
            onFull={() => toast('5 maximum !')}
          />
          <StickyFooter count={draft.top5.length} max={5} label="Suivant ›" disabled={draft.top5.length !== 5} onNext={async () => (await save('apres15', draft)) && setStep(1)} />
        </>
      )}
      {step === 1 && (
        <>
          <CandidatePicker ids={sortIds(draft.top5)} selected={draft.miss ? [draft.miss] : []} max={1} onChange={(s) => setDraft({ ...draft, miss: s[0] ?? null })} />
          <StickyFooter label="🔒 Valider" onBack={() => setStep(0)} disabled={!draft.miss} onNext={async () => (await save('apres15', draft, '2e chance enregistrée !')) && setStep(2)} />
        </>
      )}
      {step === 2 && (
        <>
          <Apres15Summary p={draft} />
          <button className="btn btn-block" onClick={() => setStep(0)}>
            ✏️ Modifier
          </button>
        </>
      )}
    </section>
  )
}

function Apres15Summary({ p }: { p: PredApres15 }) {
  const { snap } = useGame()
  const { top5 } = snap.game.results
  return (
    <div className="card summary">
      <div className="label">Ma Miss (2e chance)</div>
      <div className="summary-miss-name">{missLabel(p.miss)}</div>
      <div className="label">Mon Top 5 (2e chance)</div>
      <Chips ids={p.top5} hits={top5.length ? p.top5.filter((x) => top5.includes(x)) : undefined} />
    </div>
  )
}

/* -------------------------------------------------------- Classement final */

function FinalEditor() {
  const { snap, me } = useGame()
  const save = useSave()
  const saved = (me && (getPrediction(snap, me.id, 'final') as PredFinal | undefined)) || { order: [] }
  const [order, setOrder] = useState<string[]>(saved.order)
  const top5 = sortIds(snap.game.results.top5)
  const remaining = top5.filter((id) => !order.includes(id))

  const pick = async (id: string) => {
    const next = [...order, id]
    // La dernière place se remplit toute seule.
    const left = top5.filter((x) => !next.includes(x))
    const full = left.length === 1 ? [...next, left[0]] : next
    setOrder(full)
    if (full.length === 5) await save('final', { order: full }, 'Classement final enregistré ! 🏁')
  }

  return (
    <section>
      <h2 className="h2">🏁 Mon classement final</h2>
      <p className="muted">+{POINTS.finalExact} pts par place exacte. Modifiable jusqu’au verdict.</p>
      <ol className="final-slots">
        {RANK_TITLES.map((title, rank) => {
          const id = order[rank]
          return (
            <li key={title} className={id ? 'filled' : rank === order.length ? 'next' : ''}>
              <span className="slot-title">{title}</span>
              {id ? (
                <span className="slot-cand">
                  <CandidatePhoto id={id} size="sm" /> {missLabel(id)}
                </span>
              ) : (
                <span className="muted">{rank === order.length ? '👇 Choisis ci-dessous' : '…'}</span>
              )}
            </li>
          )
        })}
      </ol>
      {remaining.length > 0 && order.length < 5 && (
        <>
          <p className="instruction">
            Qui sera <b>{RANK_TITLES[order.length]}</b> ?
          </p>
          <CandidatePicker ids={remaining} selected={[]} max={1} onChange={(s) => s[0] && pick(s[0])} />
        </>
      )}
      {order.length > 0 && (
        <button className="btn btn-block" onClick={() => setOrder([])}>
          ↺ Recommencer
        </button>
      )}
    </section>
  )
}

/* -------------------------------------------------------- Ce que la famille a pronostiqué */

function FamilyPicks() {
  const { snap } = useGame()
  if (canEditPrediction(snap.game.phase, 'avant')) return null
  const groups = new Map<string, string[]>()
  for (const p of snap.players) {
    const miss = (getPrediction(snap, p.id, 'avant') as PredAvant | undefined)?.miss
    if (!miss) continue
    groups.set(miss, [...(groups.get(miss) ?? []), `${p.avatar} ${p.name}`])
  }
  if (!groups.size) return null
  const sorted = [...groups.entries()].sort((a, b) => b[1].length - a[1].length)
  return (
    <section className="card">
      <h3 className="section-title">👀 Les Miss de la famille</h3>
      {sorted.map(([id, names]) => (
        <div key={id} className="family-pick">
          <CandidatePhoto id={id} size="sm" />
          <div>
            <b>{missLabel(id)}</b>
            <div className="muted small">{names.join(', ')}</div>
          </div>
        </div>
      ))}
    </section>
  )
}

export function Pronos() {
  const { snap, me } = useGame()
  if (!me) return null
  const { phase, results } = snap.game
  const avant = getPrediction(snap, me.id, 'avant') as PredAvant | undefined
  const apres = getPrediction(snap, me.id, 'apres15') as PredApres15 | undefined
  const fin = getPrediction(snap, me.id, 'final') as PredFinal | undefined
  const score = scorePlayer(snap, me.id)

  const editAvant = canEditPrediction(phase, 'avant')
  const editApres = canEditPrediction(phase, 'apres15')
  const editFinal = canEditPrediction(phase, 'final')

  return (
    <div className="stack">
      {editFinal && (results.top5.length === 5 ? <FinalEditor /> : <Empty emoji="⏳">Le classement final s’ouvrira quand les 5 finalistes seront annoncées.</Empty>)}
      {editApres && (results.top15.length === 15 ? <Apres15Editor /> : <Empty emoji="⏳">Ta 2e chance s’ouvrira dès que les 15 demi-finalistes seront connues.</Empty>)}
      {editAvant && <AvantEditor />}

      {!editAvant && (
        <section>
          <h2 className="h2">🔒 Mes pronostics</h2>
          <p className="muted">
            Points gagnés : <b>{score.total}</b>
          </p>
          {!editFinal && fin && fin.order.length === 5 && (
            <div className="card summary">
              <div className="label">Mon classement final ({score.finalExactHits} place{score.finalExactHits > 1 ? 's' : ''} exacte{score.finalExactHits > 1 ? 's' : ''})</div>
              <ol className="final-mini">
                {fin.order.map((id, i) => (
                  <li key={id}>
                    {RANK_TITLES[i]} : {missLabel(id)}
                  </li>
                ))}
              </ol>
            </div>
          )}
          {!editApres && apres?.miss && <Apres15Summary p={apres} />}
          {avant ? <AvantSummary p={avant} /> : <Empty emoji="🙈">Tu n’as pas fait de pronostic avant le show… Rattrape-toi avec les paris éclair !</Empty>}
        </section>
      )}
      <FamilyPicks />
    </div>
  )
}
