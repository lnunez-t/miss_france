import { useState } from 'react'
import { Countdown } from '../components/ui'
import { SHOW_START } from '../data/candidates'
import { AVATARS } from '../lib/device'
import { useGame } from '../lib/store'

export function Join() {
  const { join, snap } = useGame()
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(AVATARS[0])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setError('Écris ton prénom pour rejoindre la soirée.')
    setBusy(true)
    setError(null)
    try {
      await join(name, avatar)
    } catch (err) {
      setError((err as Error).message)
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
          enterKeyHint="go"
          placeholder="Ex. Mamie Jo"
          onChange={(e) => setName(e.target.value)}
        />

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

      {snap.players.length > 0 && (
        <p className="join-players">
          Déjà là : {snap.players.slice(0, 12).map((p) => `${p.avatar} ${p.name}`).join(' · ')}
          {snap.players.length > 12 && ` et ${snap.players.length - 12} autres`}
        </p>
      )}
      <p className="muted small center">
        Tu as déjà rejoint sur un autre téléphone ? Demande ton lien de reconnexion à la personne qui anime la soirée.
      </p>
    </main>
  )
}
