import { useState } from 'react'
import { Invite } from '../components/Invite'
import { FlyingReactions, ReactionBar } from '../components/Reactions'
import { Avatar, ConnectionBanner, Sheet, useNotify } from '../components/ui'
import { backend } from '../lib/backend'
import { AVATARS, isAwake, toggleAwake } from '../lib/device'
import { PHASE_BY_ID } from '../lib/phases'
import { scorePlayer } from '../lib/scoring'
import { useGame } from '../lib/store'
import { useGameEvents } from '../lib/useGameEvents'
import { Candidates } from './Candidates'
import { Join } from './Join'
import { Live } from './Live'
import { Pronos } from './Pronos'
import { Ranking, Rules } from './Ranking'

export type Tab = 'live' | 'pronos' | 'candidates' | 'ranking'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'live', label: 'Direct', icon: '🔴' },
  { id: 'pronos', label: 'Pronos', icon: '🔮' },
  { id: 'candidates', label: 'Candidates', icon: '👑' },
  { id: 'ranking', label: 'Classement', icon: '🏆' },
]

function readTab(): Tab {
  try {
    const t = sessionStorage.getItem('mf27-tab') as Tab | null
    return t && TABS.some((x) => x.id === t) ? t : 'live'
  } catch {
    return 'live'
  }
}

function Profile({ onClose }: { onClose: () => void }) {
  const { me, updateProfile, logout } = useGame()
  const { toast } = useNotify()
  const [name, setName] = useState(me?.name ?? '')
  const [avatar, setAvatar] = useState(me?.avatar ?? AVATARS[0])
  const [awake, setAwake] = useState(isAwake)
  if (!me) return null
  return (
    <div className="stack">
      <section>
        <h3 className="section-title">Mon profil</h3>
        <input className="input" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} aria-label="Prénom" />
        <div className="avatar-grid small">
          {AVATARS.map((a) => (
            <button key={a} type="button" className={a === avatar ? 'on' : ''} onClick={() => setAvatar(a)} aria-label={`Emoji ${a}`}>
              {a}
            </button>
          ))}
        </div>
        <button
          className="btn btn-gold btn-block"
          disabled={name.trim() === me.name && avatar === me.avatar}
          onClick={async () => {
            try {
              await updateProfile(name, avatar)
              toast('Profil mis à jour !', 'good')
            } catch (e) {
              toast((e as Error).message, 'bad')
            }
          }}
        >
          Enregistrer
        </button>
      </section>

      <section>
        <h3 className="section-title">📣 Inviter du monde</h3>
        <Invite />
      </section>

      <section>
        <h3 className="section-title">⚙️ Pratique</h3>
        <button
          className="btn btn-block"
          onClick={async () => {
            const on = await toggleAwake()
            setAwake(on)
            if (on) toast('L’écran restera allumé tant que l’appli est ouverte.', 'good')
            else if (!awake) toast('Ton téléphone ne permet pas cette option.', 'bad')
          }}
        >
          {awake ? '🔆 Écran toujours allumé : activé' : '💡 Garder l’écran allumé'}
        </button>
        <p className="muted small">
          📱 Astuce : ajoute l’appli à ton écran d’accueil (menu Partager › « Sur l’écran d’accueil » sur iPhone, menu ⋮ › « Ajouter à l’écran d’accueil » sur Android).
        </p>
        <a className="btn btn-block" href="/tv" target="_blank" rel="noreferrer">
          📺 Ouvrir l’écran TV (à projeter)
        </a>
      </section>

      <section>
        <h3 className="section-title">📜 Règles du jeu</h3>
        <Rules />
      </section>

      <button
        className="btn btn-ghost btn-block"
        onClick={() => {
          if (confirm('Te déconnecter de ce téléphone ? Tes points sont conservés, mais tu auras besoin d’un lien de reconnexion.')) {
            logout()
            onClose()
          }
        }}
      >
        Ce n’est pas moi / Se déconnecter
      </button>
    </div>
  )
}

export function PlayerApp() {
  const { ready, me, snap, connected, connectionError } = useGame()
  const [tab, setTabState] = useState<Tab>(readTab)
  const [sheet, setSheet] = useState<'profile' | 'invite' | null>(null)
  useGameEvents('player')

  const setTab = (t: Tab) => {
    setTabState(t)
    try {
      sessionStorage.setItem('mf27-tab', t)
    } catch {
      /* ignore */
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!ready)
    return (
      <div className="loading">
        <div className="crown spin">👑</div>
        <p>Chargement de la soirée…</p>
        <ConnectionBanner connected={connected} detail={connectionError} />
      </div>
    )
  if (!me) return <Join />

  const phase = PHASE_BY_ID[snap.game.phase]
  const pts = scorePlayer(snap, me.id).total

  return (
    <div className="app">
      <header className="topbar">
        <button className="topbar-me" onClick={() => setSheet('profile')} aria-label="Mon profil">
          <Avatar emoji={me.avatar} />
          <span>
            <span className="topbar-name">{me.name}</span>
            <span className="topbar-pts">{pts} pts</span>
          </span>
        </button>
        <div className="topbar-phase" aria-live="polite">
          <span aria-hidden>{phase.emoji}</span> {phase.short}
        </div>
        <button className="btn btn-sm btn-gold" onClick={() => setSheet('invite')}>
          📣 Inviter
        </button>
      </header>
      {backend.mode === 'demo' && <div className="demo-banner">Mode démo (données sur cet appareil uniquement)</div>}
      <ConnectionBanner connected={connected} detail={connectionError} />

      <main className="content">
        {tab === 'live' && <Live go={setTab} />}
        {tab === 'pronos' && <Pronos />}
        {tab === 'candidates' && <Candidates />}
        {tab === 'ranking' && <Ranking />}
      </main>

      <FlyingReactions />
      <div className="bottom">
        {snap.game.phase !== 'accueil' && <ReactionBar />}
        <nav className="tabbar" aria-label="Navigation">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
              <span className="tab-icon" aria-hidden>
                {t.icon}
              </span>
              <span className="tab-label">{t.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <Sheet open={sheet === 'profile'} onClose={() => setSheet(null)} title={`${me.avatar} ${me.name}`}>
        <Profile onClose={() => setSheet(null)} />
      </Sheet>
      <Sheet open={sheet === 'invite'} onClose={() => setSheet(null)} title="📣 Inviter à la soirée">
        <Invite />
      </Sheet>
    </div>
  )
}
