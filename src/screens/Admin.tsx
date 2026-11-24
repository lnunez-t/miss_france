import { useEffect, useRef, useState } from 'react'
import { CandidatePicker } from '../components/CandidatePicker'
import { Avatar, CandidatePhoto, ConnectionBanner, useNotify } from '../components/ui'
import { CANDIDATES, missLabel } from '../data/candidates'
import { backend, type NewBet } from '../lib/backend'
import { copyText, joinUrl, prettyUrl } from '../lib/device'
import { currentRound, PHASES, phaseIndex, ROUNDS, roundCandidates, VERDICT_TITLES } from '../lib/phases'
import { leaderboard, myPicks } from '../lib/scoring'
import { useGame } from '../lib/store'
import type { Bet, Results } from '../lib/types'

const PIN_KEY = 'mf27-admin-pin'
/** Ce que verrouille le passage à chaque étape. */
const LOCKS: Partial<Record<string, string>> = {
  top15: 'les Top 15 des joueurs',
  top5: 'les Top 5 des joueurs',
  verdict: 'les classements finaux (Miss + dauphines)',
}
const ALL = CANDIDATES.map((c) => c.id)
const sortIds = (ids: string[]) => ALL.filter((id) => ids.includes(id))

const PRESETS: NewBet[] = [
  { question: 'Qui aura la meilleure note au test de culture générale ?', type: 'candidate', options: [], points: 3 },
  { question: 'Jean-Pierre Foucault va-t-il se tromper de prénom ou de région ?', type: 'choices', options: ['Oui', 'Non'], points: 2 },
  { question: 'Combien de Miss d’Outre-mer dans le Top 5 ?', type: 'choices', options: ['0', '1', '2', '3 ou plus'], points: 3 },
  { question: 'Qui sera la 1re dauphine ?', type: 'candidate', options: [], points: 3 },
  { question: 'Hinaupoko Devèze va-t-elle pleurer en rendant sa couronne ?', type: 'choices', options: ['Oui', 'Non'], points: 2 },
  { question: 'La nouvelle Miss France va-t-elle pleurer à l’annonce ?', type: 'choices', options: ['Oui', 'Non'], points: 2 },
]

function PinGate({ onOk }: { onOk: (pin: string) => void }) {
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  return (
    <main className="join">
      <div className="join-hero">
        <div className="crown">🎬</div>
        <h1 className="title">Régie de la soirée</h1>
        <p className="muted">Réservé à la personne qui anime.</p>
      </div>
      <form
        className="card join-form"
        onSubmit={async (e) => {
          e.preventDefault()
          const ok = await backend.admin.check(pin).catch(() => false)
          if (ok) onOk(pin)
          else setErr('Code incorrect.')
        }}
      >
        <label className="label" htmlFor="pin">
          Code admin
        </label>
        <input id="pin" className="input input-lg" type="password" autoComplete="current-password" value={pin} onChange={(e) => setPin(e.target.value)} />
        {backend.mode === 'demo' && <p className="muted small">Mode démo : le code est 0000.</p>}
        {err && <p className="error">{err}</p>}
        <button className="btn btn-gold btn-block btn-lg">Entrer</button>
      </form>
    </main>
  )
}

export function Admin() {
  const [pin, setPin] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(PIN_KEY)
    } catch {
      return null
    }
  })
  if (!pin)
    return (
      <PinGate
        onOk={(p) => {
          try {
            sessionStorage.setItem(PIN_KEY, p)
          } catch {
            /* ignore */
          }
          setPin(p)
        }}
      />
    )
  return <Regie pin={pin} />
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  // S'ouvre tout seul quand l'étape devient pertinente, mais ne se referme jamais sans clic.
  const [open, setOpen] = useState(defaultOpen)
  useEffect(() => {
    if (defaultOpen) setOpen(true)
  }, [defaultOpen])
  return (
    <details className="admin-section" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>{title}</summary>
      <div className="admin-body">{children}</div>
    </details>
  )
}

function Regie({ pin }: { pin: string }) {
  const { snap, ready, connected, connectionError } = useGame()
  const { toast } = useNotify()

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn()
      if (ok) toast(ok, 'good')
    } catch (e) {
      toast((e as Error).message, 'bad')
    }
  }

  // Résultats : on garde une copie locale pour enchaîner les clics rapides sans perdre d'annonce.
  const [results, setLocalResults] = useState<Results>(snap.game.results)
  const pending = useRef(0)
  useEffect(() => {
    if (pending.current === 0) setLocalResults(snap.game.results)
  }, [snap.game.results])
  const pushResults = (next: Results) => {
    setLocalResults(next)
    pending.current++
    run(() => backend.admin.setResults(pin, next)).finally(() => pending.current--)
  }

  if (!ready) return <div className="loading">🎬</div>

  const { phase, onStage } = snap.game
  const idx = phaseIndex(phase)
  const round = currentRound(phase)
  const stageList = round ? roundCandidates(round, results) : []

  const toggleTop15 = (id: string) => {
    const top15 = results.top15.includes(id) ? results.top15.filter((x) => x !== id) : results.top15.length < 15 ? [...results.top15, id] : results.top15
    if (top15 === results.top15) return toast('Le Top 15 est complet.')
    pushResults({ top15, top5: results.top5.filter((x) => top15.includes(x)), verdict: results.verdict.filter((x) => top15.includes(x)) })
  }
  const toggleTop5 = (id: string) => {
    const top5 = results.top5.includes(id) ? results.top5.filter((x) => x !== id) : results.top5.length < 5 ? [...results.top5, id] : results.top5
    if (top5 === results.top5) return toast('Le Top 5 est complet.')
    pushResults({ ...results, top5, verdict: results.verdict.filter((x) => top5.includes(x)) })
  }
  const remainingVerdict = sortIds(results.top5.filter((x) => !results.verdict.includes(x)))

  return (
    <div className="admin">
      <ConnectionBanner connected={connected} detail={connectionError} />
      <header className="admin-head">
        <div>
          <div className="title-sm">🎬 Régie</div>
          <div className="muted small">
            {snap.players.length} joueur{snap.players.length > 1 ? 's' : ''} · {backend.mode === 'demo' ? 'mode démo' : 'en ligne'}
          </div>
        </div>
        <div className="admin-links">
          <a className="btn btn-sm" href="/tv" target="_blank" rel="noreferrer">
            📺 Écran TV
          </a>
          <a className="btn btn-sm" href="/" target="_blank" rel="noreferrer">
            📱 Appli
          </a>
        </div>
      </header>

      <Section title={`1 · Étape en cours : ${PHASES[idx].emoji} ${PHASES[idx].label}`}>
        <div className="admin-row">
          <button className="btn" disabled={idx === 0} onClick={() => run(() => backend.admin.setPhase(pin, PHASES[idx - 1].id))}>
            ‹ Précédente
          </button>
          <button className="btn btn-gold btn-grow" disabled={idx === PHASES.length - 1} onClick={() => run(() => backend.admin.setPhase(pin, PHASES[idx + 1].id))}>
            {idx < PHASES.length - 1 ? `Suivante : ${PHASES[idx + 1].emoji} ${PHASES[idx + 1].short} ›` : 'Fin'}
          </button>
        </div>
        <div className="phase-list">
          {PHASES.map((p, i) => (
            <button key={p.id} className={`phase-item ${p.id === phase ? 'on' : i < idx ? 'done' : ''}`} onClick={() => run(() => backend.admin.setPhase(pin, p.id))}>
              {p.emoji} {p.label}
            </button>
          ))}
        </div>
        {LOCKS[PHASES[idx + 1]?.id] && (
          <p className="warn">⚠️ Passer à « {PHASES[idx + 1].label} » verrouille {LOCKS[PHASES[idx + 1].id]} : fais-le juste avant l’annonce à la télé.</p>
        )}
      </Section>

      {round && (
        <Section title={`2 · Sur scène (${ROUNDS[round].emoji} ${ROUNDS[round].label})`}>
          <div className="admin-row">
            <div className="onstage-now">
              {onStage ? (
                <>
                  <CandidatePhoto id={onStage} size="sm" /> <b>{missLabel(onStage)}</b>
                </>
              ) : (
                <span className="muted">Personne</span>
              )}
            </div>
            <button
              className="btn btn-gold"
              onClick={() => {
                const i = onStage ? stageList.indexOf(onStage) : -1
                const next = stageList[i + 1] ?? null
                run(() => backend.admin.setOnStage(pin, next))
              }}
            >
              Suivante ›
            </button>
            <button className="btn" onClick={() => run(() => backend.admin.setOnStage(pin, null))}>
              Personne
            </button>
          </div>
          <CandidatePicker ids={stageList} selected={onStage ? [onStage] : []} max={1} onChange={(s) => run(() => backend.admin.setOnStage(pin, s[0] ?? null))} />
        </Section>
      )}

      <Section title={`3 · Top 15 (${results.top15.length}/15)`} defaultOpen={idx >= phaseIndex('ouverture') && results.top15.length < 15}>
        <p className="muted small">Touche chaque candidate au moment où elle est annoncée : tous les téléphones l’affichent aussitôt. Re-touche pour annuler.</p>
        <CandidatePicker
          ids={ALL}
          selected={results.top15}
          max={15}
          onChange={(next) => toggleTop15(next.find((x) => !results.top15.includes(x)) ?? results.top15.find((x) => !next.includes(x))!)}
          onFull={() => toast('Le Top 15 est complet.')}
          badge={(id) => (results.top15.includes(id) ? String(results.top15.indexOf(id) + 1) : null)}
        />
      </Section>

      <Section title={`4 · Top 5 (${results.top5.length}/5)`} defaultOpen={results.top15.length === 15 && results.top5.length < 5}>
        {results.top15.length < 15 ? (
          <p className="muted">Complète d’abord le Top 15.</p>
        ) : (
          <CandidatePicker
            ids={sortIds(results.top15)}
            selected={results.top5}
            max={5}
            onChange={(next) => toggleTop5(next.find((x) => !results.top5.includes(x)) ?? results.top5.find((x) => !next.includes(x))!)}
            onFull={() => toast('Le Top 5 est complet.')}
            badge={(id) => (results.top5.includes(id) ? String(results.top5.indexOf(id) + 1) : null)}
          />
        )}
      </Section>

      <Section title={`5 · Verdict (${results.verdict.length}/5)`} defaultOpen={results.top5.length === 5}>
        {results.top5.length < 5 ? (
          <p className="muted">Complète d’abord le Top 5.</p>
        ) : (
          <>
            <ol className="verdict-admin">
              {results.verdict.map((id, i) => (
                <li key={id}>
                  <b>{VERDICT_TITLES[i]}</b> : {missLabel(id)}
                </li>
              ))}
            </ol>
            {remainingVerdict.length > 0 && (
              <>
                <p className="instruction">
                  Révéler la <b>{VERDICT_TITLES[results.verdict.length]}</b> :
                </p>
                <div className="admin-row wrap">
                  {remainingVerdict.map((id) => (
                    <button
                      key={id}
                      className={`btn ${results.verdict.length === 4 ? 'btn-gold btn-lg' : ''}`}
                      onClick={() => {
                        pushResults({ ...results, verdict: [...results.verdict, id] })
                      }}
                    >
                      {results.verdict.length === 4 ? '👑 ' : ''}
                      {missLabel(id)}
                    </button>
                  ))}
                </div>
              </>
            )}
            {results.verdict.length > 0 && (
              <button className="btn btn-ghost" onClick={() => pushResults({ ...results, verdict: results.verdict.slice(0, -1) })}>
                ↺ Annuler la dernière révélation
              </button>
            )}
          </>
        )}
      </Section>

      <BetsAdmin pin={pin} run={run} />
      <PlayersAdmin pin={pin} run={run} />

      <Section title="⚠️ Zone sensible" defaultOpen={false}>
        <p className="muted small">Pour une répétition avant le jour J : remet la partie à zéro.</p>
        <div className="admin-row wrap">
          <button className="btn" onClick={() => confirm('Effacer pronostics, notes, paris et résultats (les joueurs restent) ?') && run(() => backend.admin.reset(pin, true), 'Partie remise à zéro.')}>
            Remettre à zéro (garder les joueurs)
          </button>
          <button className="btn btn-danger" onClick={() => confirm('TOUT effacer, y compris les joueurs ?') && run(() => backend.admin.reset(pin, false), 'Tout a été effacé.')}>
            Tout effacer
          </button>
        </div>
        <button
          className="btn btn-ghost"
          onClick={() => {
            sessionStorage.removeItem(PIN_KEY)
            location.reload()
          }}
        >
          Quitter la régie
        </button>
      </Section>
    </div>
  )
}

function BetsAdmin({ pin, run }: { pin: string; run: (fn: () => Promise<unknown>, ok?: string) => Promise<void> }) {
  const { snap } = useGame()
  const [draft, setDraft] = useState<NewBet>({ question: '', type: 'choices', options: ['Oui', 'Non'], points: 3 })
  const [optionsText, setOptionsText] = useState('Oui\nNon')
  const [resolving, setResolving] = useState<string | null>(null)

  const usePreset = (p: NewBet) => {
    setDraft(p)
    setOptionsText(p.options.join('\n'))
  }
  const create = () => {
    const options = draft.type === 'choices' ? optionsText.split('\n').map((s) => s.trim()).filter(Boolean) : []
    if (!draft.question.trim() || (draft.type === 'choices' && options.length < 2)) return
    run(() => backend.admin.createBet(pin, { ...draft, question: draft.question.trim(), options }), 'Pari lancé sur tous les téléphones ⚡').then(() =>
      setDraft({ ...draft, question: '' }),
    )
  }
  const label = (b: Bet, v: string) => (b.type === 'candidate' ? missLabel(v) : v)
  const choicesFor = (b: Bet) => (b.type === 'choices' ? b.options : ALL)

  return (
    <Section title={`6 · Paris éclair (${snap.bets.filter((b) => b.status === 'open').length} ouvert)`} defaultOpen={false}>
      <div className="presets">
        {PRESETS.map((p) => (
          <button key={p.question} className="chip chip-btn" onClick={() => usePreset(p)}>
            {p.question}
          </button>
        ))}
      </div>
      <div className="bet-form">
        <input className="input" placeholder="Question" value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} />
        <div className="admin-row">
          <select className="input" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as Bet['type'] })}>
            <option value="choices">Réponses libres</option>
            <option value="candidate">Choisir une candidate</option>
          </select>
          <label className="points-input">
            Points
            <input className="input" type="number" min={1} max={20} value={draft.points} onChange={(e) => setDraft({ ...draft, points: Number(e.target.value) || 1 })} />
          </label>
        </div>
        {draft.type === 'choices' && <textarea className="input" rows={3} value={optionsText} onChange={(e) => setOptionsText(e.target.value)} placeholder="Une réponse par ligne" />}
        <button className="btn btn-gold btn-block" onClick={create}>
          ⚡ Lancer le pari
        </button>
      </div>

      {[...snap.bets].reverse().map((b) => {
        const answers = snap.betAnswers.filter((a) => a.betId === b.id)
        return (
          <div key={b.id} className="card admin-bet">
            <div>
              <b>{b.question}</b>
            </div>
            <div className="muted small">
              {b.status === 'open' ? '🟢 Ouvert' : b.status === 'closed' ? '⏸️ Fermé' : `✅ Réponse : ${label(b, b.answer ?? '')}`} · {answers.length} réponse(s) · {b.points} pts
            </div>
            <div className="admin-row wrap">
              {b.status === 'open' && (
                <button className="btn" onClick={() => run(() => backend.admin.updateBet(pin, b.id, 'closed', null))}>
                  ⏸️ Fermer les paris
                </button>
              )}
              {b.status !== 'open' && (
                <button className="btn" onClick={() => run(() => backend.admin.updateBet(pin, b.id, 'open', null))}>
                  Rouvrir
                </button>
              )}
              <button className="btn btn-gold" onClick={() => setResolving(resolving === b.id ? null : b.id)}>
                ✅ Donner la réponse
              </button>
              <button className="btn btn-ghost" onClick={() => confirm('Supprimer ce pari ?') && run(() => backend.admin.deleteBet(pin, b.id))}>
                🗑️
              </button>
            </div>
            {resolving === b.id && (
              <div className="admin-row wrap">
                {choicesFor(b).map((o) => (
                  <button
                    key={o}
                    className="btn btn-sm"
                    onClick={() => {
                      setResolving(null)
                      run(() => backend.admin.updateBet(pin, b.id, 'resolved', o), 'Résultat envoyé !')
                    }}
                  >
                    {label(b, o)} ({answers.filter((a) => a.choice === o).length})
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </Section>
  )
}

function PlayersAdmin({ pin, run }: { pin: string; run: (fn: () => Promise<unknown>, ok?: string) => Promise<void> }) {
  const { snap } = useGame()
  const { toast } = useNotify()
  const board = leaderboard(snap)
  return (
    <Section title={`7 · Joueurs (${snap.players.length})`} defaultOpen={false}>
      <p className="muted small">
        Lien d’invitation : <b>{prettyUrl()}</b>. Si quelqu’un change de téléphone, envoie-lui son <b>lien de reconnexion</b>.
      </p>
      <ul className="admin-players">
        {board.map(({ player: p, score }) => {
          const picks = myPicks(snap, p.id)
          const status = `Top 15 ${picks.top15.length === 15 ? '✅' : '✗'} · Top 5 ${picks.top5.length === 5 ? '✅' : '✗'} · Classement ${picks.order.length === 5 ? '✅' : '✗'}`
          return (
            <li key={p.id}>
              <Avatar emoji={p.avatar} size="sm" />
              <span className="grow">
                <b>{p.name}</b>
                <span className="muted small">
                  {' '}
                  · {score.total} pts · {status}
                </span>
              </span>
              <button
                className="btn btn-sm"
                onClick={() =>
                  run(async () => {
                    const secret = await backend.admin.playerSecret(pin, p.id)
                    const ok = await copyText(`${joinUrl()}?rejoindre=${secret}`)
                    toast(ok ? `Lien de ${p.name} copié : envoie-le-lui !` : 'Copie impossible', ok ? 'good' : 'bad')
                  })
                }
              >
                🔗
              </button>
              <button
                className="btn btn-sm"
                onClick={() => {
                  const name = prompt('Nouveau prénom', p.name)
                  if (name) run(() => backend.admin.renamePlayer(pin, p.id, name))
                }}
              >
                ✏️
              </button>
              <button className="btn btn-sm btn-ghost" onClick={() => confirm(`Supprimer ${p.name} et tous ses votes ?`) && run(() => backend.admin.deletePlayer(pin, p.id))}>
                🗑️
              </button>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}
