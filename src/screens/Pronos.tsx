import { useState, type ReactNode } from 'react'
import { CandidatePicker } from '../components/CandidatePicker'
import { CandidatePhoto, useNotify } from '../components/ui'
import { CANDIDATES, candidate, missLabel } from '../data/candidates'
import { canEditPrediction, RANK_TITLES } from '../lib/phases'
import { myPicks, POINTS, rankPoints, scorePlayer } from '../lib/scoring'
import { useGame } from '../lib/store'
import type { PredictionKind, Snapshot } from '../lib/types'

// Pronostic en 3 niveaux, chacun verrouillé juste avant son annonce :
// 1. Top 15  2. Top 5  3. Classement final (Miss France + 4 dauphines).

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

/** Candidates proposées pour chaque niveau, selon ce qui est déjà annoncé. */
export function pronoPools(snap: Snapshot, playerId: string) {
  const { top15, top5 } = snap.game.results
  const picks = myPicks(snap, playerId)
  const off15 = top15.length === 15 ? sortIds(top15) : null
  const off5 = top5.length === 5 ? sortIds(top5) : null
  // Top 5 : parmi le Top 15 officiel s'il est connu, sinon parmi mon Top 15 (ou toutes).
  const top5Pool = off15 ?? (picks.top15.length === 15 ? sortIds(picks.top15) : ALL_IDS)
  const top5Valid = picks.top5.filter((id) => top5Pool.includes(id))
  // Classement : parmi le Top 5 officiel s'il est connu, sinon parmi mon Top 5.
  const orderPool = off5 ?? (top5Valid.length === 5 ? sortIds(top5Valid) : null)
  const orderValid = !!orderPool && picks.order.length === 5 && picks.order.every((id) => orderPool.includes(id))
  return {
    picks,
    top5Pool,
    top5Valid,
    orderPool,
    orderValid,
    complete: {
      top15: picks.top15.length === 15,
      top5: top5Valid.length === 5,
      final: orderValid,
    },
  }
}

function Level({ n, title, lockAt, kind, children }: { n: number; title: string; lockAt: string; kind: PredictionKind; children: ReactNode }) {
  const { snap } = useGame()
  const open = canEditPrediction(snap.game.phase, kind)
  return (
    <section className={`card level ${open ? 'level-open' : 'level-locked'}`}>
      <div className="level-head">
        <h2 className="level-title">
          <span className="level-n">{n}</span> {title}
        </h2>
        <span className={`chip ${open ? 'chip-gold' : ''}`}>{open ? `🔓 ${lockAt}` : '🔒 Verrouillé'}</span>
      </div>
      {children}
    </section>
  )
}

function Chips({ ids, official }: { ids: string[]; official: string[] }) {
  const known = official.length > 0
  return (
    <div className="chips">
      {sortIds(ids).map((id) => {
        const hit = official.includes(id)
        return (
          <span key={id} className={`chip ${hit ? 'chip-hit' : known ? 'chip-miss' : ''}`}>
            {hit ? '✓ ' : ''}
            {candidate(id)?.region}
          </span>
        )
      })}
    </div>
  )
}

function StickyFooter({ count, max, label, onNext, onBack, disabled }: { count?: number; max?: number; label: string; onNext: () => void; onBack?: () => void; disabled?: boolean }) {
  return (
    <div className="sticky-footer">
      {onBack && (
        <button className="btn" onClick={onBack}>
          Annuler
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

/* -------------------------------------------------------- 1. Top 15 */

function Top15Level() {
  const { snap, me } = useGame()
  const { toast } = useNotify()
  const save = useSave()
  const picks = myPicks(snap, me!.id)
  const open = canEditPrediction(snap.game.phase, 'avant')
  const [draft, setDraft] = useState<string[] | null>(null)
  const official = snap.game.results.top15
  const score = scorePlayer(snap, me!.id)

  return (
    <Level n={1} title="Mon Top 15" lockAt="jusqu’à l’annonce du Top 15" kind="avant">
      <p className="muted small">+{POINTS.top15} pt par demi-finaliste trouvée.</p>
      {draft && open ? (
        <>
          <p className="instruction">
            Choisis les <b>15 demi-finalistes</b> :
          </p>
          <CandidatePicker ids={ALL_IDS} selected={draft} max={15} onChange={setDraft} onFull={() => toast('Tu as déjà 15 candidates : retires-en une d’abord.')} />
          <StickyFooter
            count={draft.length}
            max={15}
            label="✅ Valider"
            disabled={draft.length !== 15}
            onBack={() => setDraft(null)}
            onNext={async () => {
              if (await save('avant', { top15: draft }, 'Top 15 enregistré ! Passe à ton Top 5 👇')) setDraft(null)
            }}
          />
        </>
      ) : picks.top15.length ? (
        <>
          {official.length > 0 && (
            <p>
              <b>{score.top15Hits}</b>/{official.length} trouvée{score.top15Hits > 1 ? 's' : ''} · <b>{score.top15} pts</b>
            </p>
          )}
          <Chips ids={picks.top15} official={official} />
          {open && (
            <button className="btn btn-block" onClick={() => setDraft(picks.top15)}>
              ✏️ Modifier mon Top 15
            </button>
          )}
        </>
      ) : open ? (
        <button className="btn btn-gold btn-block" onClick={() => setDraft([])}>
          🔮 Faire mon Top 15
        </button>
      ) : (
        <p className="muted">Tu n’as pas fait ton Top 15… rattrape-toi sur la suite !</p>
      )}
    </Level>
  )
}

/* -------------------------------------------------------- 2. Top 5 */

function Top5Level() {
  const { snap, me } = useGame()
  const { toast } = useNotify()
  const save = useSave()
  const { picks, top5Pool, top5Valid } = pronoPools(snap, me!.id)
  const open = canEditPrediction(snap.game.phase, 'apres15')
  const [draft, setDraft] = useState<string[] | null>(null)
  const official = snap.game.results.top5
  const off15Known = snap.game.results.top15.length === 15
  const dropped = picks.top5.length - top5Valid.length
  const score = scorePlayer(snap, me!.id)
  const canStart = off15Known || picks.top15.length === 15

  return (
    <Level n={2} title="Mon Top 5" lockAt="jusqu’à l’annonce du Top 5" kind="apres15">
      <p className="muted small">
        +{POINTS.top5} pts par finaliste trouvée. {off15Known ? 'Choisis parmi les 15 demi-finalistes officielles.' : 'Choisis parmi ton Top 15.'}
      </p>
      {open && dropped > 0 && !draft && (
        <p className="warn">
          ⚠️ {dropped} de tes choix {dropped > 1 ? 'ne sont plus en lice' : 'n’est plus en lice'} : complète ton Top 5 !
        </p>
      )}
      {draft && open ? (
        <>
          <p className="instruction">
            Choisis tes <b>5 finalistes</b> :
          </p>
          <CandidatePicker ids={top5Pool} selected={draft} max={5} onChange={setDraft} onFull={() => toast('5 maximum !')} />
          <StickyFooter
            count={draft.length}
            max={5}
            label="✅ Valider"
            disabled={draft.length !== 5}
            onBack={() => setDraft(null)}
            onNext={async () => {
              if (await save('apres15', { top5: draft }, 'Top 5 enregistré ! Classe-les maintenant 👇')) setDraft(null)
            }}
          />
        </>
      ) : (open ? top5Valid.length : picks.top5.length) ? (
        <>
          {official.length > 0 && (
            <p>
              <b>{score.top5Hits}</b>/{official.length} trouvée{score.top5Hits > 1 ? 's' : ''} · <b>{score.top5} pts</b>
            </p>
          )}
          <Chips ids={open ? top5Valid : picks.top5} official={official} />
          {open && (
            <button className={`btn btn-block ${top5Valid.length < 5 ? 'btn-gold' : ''}`} onClick={() => setDraft(top5Valid)}>
              {top5Valid.length < 5 ? '🔥 Compléter mon Top 5' : '✏️ Modifier mon Top 5'}
            </button>
          )}
        </>
      ) : !open ? (
        <p className="muted">Pas de Top 5 enregistré.</p>
      ) : canStart ? (
        <button className="btn btn-gold btn-block" onClick={() => setDraft([])}>
          🔥 Faire mon Top 5
        </button>
      ) : (
        <p className="muted">👆 Termine d’abord ton Top 15.</p>
      )}
    </Level>
  )
}

/* -------------------------------------------------------- 3. Classement final */

function FinalLevel() {
  const { snap, me } = useGame()
  const save = useSave()
  const { picks, orderPool, orderValid } = pronoPools(snap, me!.id)
  const open = canEditPrediction(snap.game.phase, 'final')
  const [order, setOrder] = useState<string[] | null>(null)
  const off5Known = snap.game.results.top5.length === 5
  const verdict = snap.game.results.verdict
  const score = scorePlayer(snap, me!.id)
  // Ce qu'on affiche : la saisie en cours, sinon le classement enregistré (s'il est encore valable).
  const shown = order ?? (orderValid || !open ? picks.order : [])
  const remaining = (orderPool ?? []).filter((id) => !shown.includes(id))

  const pick = async (id: string) => {
    const next = [...shown, id]
    const left = (orderPool ?? []).filter((x) => !next.includes(x))
    // La dernière place se remplit toute seule.
    const full = left.length === 1 ? [...next, left[0]] : next
    setOrder(full)
    if (full.length === 5 && (await save('final', { order: full }, 'Classement final enregistré ! 👑'))) setOrder(null)
  }

  return (
    <Level n={3} title="Mon classement final" lockAt="jusqu’au verdict" kind="final">
      <p className="muted small">
        +{POINTS.miss} pts pour Miss France à la bonne place, +{POINTS.dauphine} pts par dauphine à la bonne place.{' '}
        {off5Known ? 'Classe les 5 finalistes officielles.' : 'Classe ton Top 5.'}
      </p>
      {!orderPool && open ? (
        <p className="muted">👆 Termine d’abord ton Top 5.</p>
      ) : (
        <>
          {open && !orderValid && picks.order.length > 0 && order === null && <p className="warn">⚠️ Ton Top 5 a changé : refais ton classement !</p>}
          {verdict.length > 0 && (
            <p>
              {score.missHit ? '👑 Miss France trouvée ! ' : ''}
              <b>{score.dauphineHits}</b> dauphine{score.dauphineHits > 1 ? 's' : ''} à la bonne place · <b>{score.final} pts</b>
            </p>
          )}
          <ol className="final-slots">
            {RANK_TITLES.map((title, rank) => {
              const id = shown[rank]
              const real = verdict.length > 4 - rank ? verdict[4 - rank] : null
              const isNext = !!order && rank === shown.length
              return (
                <li key={title} className={`${id ? 'filled' : ''} ${isNext ? 'next' : ''} ${real ? (real === id ? 'exact' : 'wrong') : ''}`}>
                  <span className="slot-title">
                    {title}
                    {real && real === id && <span className="good"> +{rankPoints(rank)}</span>}
                  </span>
                  {id ? (
                    <span className="slot-cand">
                      <CandidatePhoto id={id} size="sm" /> {missLabel(id)}
                    </span>
                  ) : (
                    <span className="muted">{isNext ? '👇 Choisis ci-dessous' : '…'}</span>
                  )}
                </li>
              )
            })}
          </ol>
          {open && order && remaining.length > 0 && shown.length < 5 && (
            <>
              <p className="instruction">
                Qui sera <b>{RANK_TITLES[shown.length]}</b> ?
              </p>
              <CandidatePicker ids={remaining} selected={[]} max={1} onChange={(s) => s[0] && pick(s[0])} />
            </>
          )}
          {open && !order && (
            <button className={`btn btn-block ${orderValid ? '' : 'btn-gold'}`} onClick={() => setOrder([])}>
              {orderValid ? '✏️ Refaire mon classement' : '👑 Faire mon classement'}
            </button>
          )}
          {open && order && order.length > 0 && (
            <button className="btn btn-block" onClick={() => setOrder([])}>
              ↺ Recommencer
            </button>
          )}
        </>
      )}
    </Level>
  )
}

/* -------------------------------------------------------- Ce que la famille a pronostiqué */

function FamilyPicks() {
  const { snap } = useGame()
  if (canEditPrediction(snap.game.phase, 'final')) return null
  const groups = new Map<string, string[]>()
  for (const p of snap.players) {
    const miss = myPicks(snap, p.id).order[0]
    if (!miss) continue
    groups.set(miss, [...(groups.get(miss) ?? []), `${p.avatar} ${p.name}`])
  }
  if (!groups.size) return null
  const sorted = [...groups.entries()].sort((a, b) => b[1].length - a[1].length)
  return (
    <section className="card">
      <h3 className="section-title">👀 Les Miss France de la famille</h3>
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
  const score = scorePlayer(snap, me.id)
  return (
    <div className="stack">
      <div>
        <h2 className="h2">🔮 Mes pronostics</h2>
        <p className="muted">
          3 niveaux, chacun modifiable jusqu’à son annonce : prends le temps de découvrir les Miss pendant l’émission ! Points gagnés : <b>{score.total}</b>
        </p>
      </div>
      <Top15Level />
      <Top5Level />
      <FinalLevel />
      <FamilyPicks />
    </div>
  )
}
