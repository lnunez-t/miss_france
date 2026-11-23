import { useState } from 'react'
import { Countdown } from '../components/ui'
import { SHOW_START } from '../data/candidates'
import { GameError } from '../lib/backend'
import { AVATARS } from '../lib/device'
import { useGame } from '../lib/store'

type Mode = 'new' | 'back'

/** Champ « code à 4 chiffres ». */
function CodeInput({ id, value, onChange, autoFocus }: { id: string; value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <input
      id={id}
      className="input input-lg input-code"
      value={value}
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      maxLength={4}
      placeholder="••••"
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
    />
  )
}

export function Join() {
  const { join, reconnect, snap } = useGame()
  const [mode, setMode] = useState<Mode>('new')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [avatar, setAvatar] = useState(AVATARS[0])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const switchMode = (m: Mode) => {
    setMode(m)
    setCode('')
    setError(null)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setError(mode === 'new' ? 'Écris ton prénom pour rejoindre la soirée.' : 'Choisis ou écris ton prénom.')
    if (code.length !== 4) return setError('Le code doit faire 4 chiffres.')
    setBusy(true)
    setError(null)
    try {
      if (mode === 'new') await join(name, avatar, code)
      else await reconnect(name, code)
    } catch (err) {
      if (mode === 'new' && err instanceof GameError && err.code === 'NAME_TAKEN') {
        // Prénom déjà inscrit : c'est peut-être la même personne qui revient.
        setMode('back')
        setCode('')
        setError(`« ${name.trim()} » est déjà inscrit. Si c’est toi, entre ton code ci-dessous. Sinon, reviens sur « Nouveau » et ajoute une initiale (ex. « Marie D. »).`)
      } else setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="join">
      <div className="join-hero">
        <div className="crown" aria-hidden>
          👑
        </div>
        <h1 className="title">
          Soirée
          <br />
          Miss France 2027
        </h1>
        <p className="join-sub">
          Samedi 12 décembre · TF1 · <Countdown to={SHOW_START} />
        </p>
      </div>

      <div className="join-modes" role="tablist" aria-label="Arrivée">
        <button type="button" role="tab" aria-selected={mode === 'new'} className={mode === 'new' ? 'on' : ''} onClick={() => switchMode('new')}>
          ✨ Nouveau
        </button>
        <button type="button" role="tab" aria-selected={mode === 'back'} className={mode === 'back' ? 'on' : ''} onClick={() => switchMode('back')}>
          🔑 Déjà inscrit
        </button>
      </div>

      {mode === 'new' ? (
        <form className="card join-form" onSubmit={submit}>
          <label htmlFor="name" className="label">
            Ton prénom
          </label>
          <input
            id="name"
            className="input input-lg"
            value={name}
            maxLength={24}
            autoComplete="given-name"
            autoCapitalize="words"
            placeholder="Ex. Mamie Jo"
            onChange={(e) => setName(e.target.value)}
          />

          <label htmlFor="code" className="label">
            Choisis un code secret (4 chiffres)
          </label>
          <CodeInput id="code" value={code} onChange={setCode} />
          <p className="muted small">Retiens-le : il te servira à revenir dans la partie si tu es déconnecté ou si tu changes de téléphone.</p>

          <div className="label">Choisis ton emoji</div>
          <div className="avatar-grid" role="radiogroup" aria-label="Emoji">
            {AVATARS.map((a) => (
              <button key={a} type="button" role="radio" aria-checked={a === avatar} className={a === avatar ? 'on' : ''} onClick={() => setAvatar(a)}>
                {a}
              </button>
            ))}
          </div>

          {error && <p className="error">{error}</p>}
          <button className="btn btn-gold btn-block btn-lg" disabled={busy}>
            {busy ? 'Un instant…' : `${avatar} Rejoindre la soirée`}
          </button>
        </form>
      ) : (
        <form className="card join-form" onSubmit={submit}>
          <div className="label">Qui es-tu ?</div>
          {snap.players.length > 0 ? (
            <div className="chips join-pick" role="radiogroup" aria-label="Joueurs inscrits">
              {[...snap.players]
                .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
                .map((p) => {
                  const on = p.name.toLowerCase() === name.trim().toLowerCase()
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      className={`chip chip-btn${on ? ' chip-gold' : ''}`}
                      onClick={() => {
                        setName(p.name)
                        setError(null)
                      }}
                    >
                      {p.avatar} {p.name}
                    </button>
                  )
                })}
            </div>
          ) : (
            <input
              className="input input-lg"
              value={name}
              maxLength={24}
              autoCapitalize="words"
              placeholder="Ton prénom"
              aria-label="Ton prénom"
              onChange={(e) => setName(e.target.value)}
            />
          )}

          <label htmlFor="code-back" className="label">
            Ton code secret
          </label>
          <CodeInput id="code-back" value={code} onChange={setCode} />

          {error && <p className="error">{error}</p>}
          <button className="btn btn-gold btn-block btn-lg" disabled={busy}>
            {busy ? 'Un instant…' : '🔑 Revenir dans la partie'}
          </button>
          <p className="muted small">Code oublié ? Demande ton lien de reconnexion à la personne qui anime la soirée.</p>
        </form>
      )}

      {mode === 'new' && snap.players.length > 0 && (
        <p className="join-players">
          Déjà là : {snap.players.slice(0, 12).map((p) => `${p.avatar} ${p.name}`).join(' · ')}
          {snap.players.length > 12 && ` et ${snap.players.length - 12} autres`}
        </p>
      )}
    </main>
  )
}
