import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { candidate, candidateHue } from '../data/candidates'
import { burst, vibrate } from '../lib/device'

/* ------------------------------------------------------------------ Photo */

const missing = new Set<string>()

export function CandidatePhoto({ id, size = 'md', className = '' }: { id: string; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const c = candidate(id)
  const [failed, setFailed] = useState(missing.has(id))
  const hue = candidateHue(id)
  const initials = c ? c.region.replace(/^(Saint-|Île-de-|Côte d')/, '').slice(0, 2).toUpperCase() : '?'
  return (
    <div className={`photo photo-${size} ${className}`} style={{ ['--hue' as string]: hue }}>
      {!failed ? (
        <img
          src={`/photos/${id}.webp`}
          alt={c ? `Miss ${c.region}, ${c.name}` : ''}
          loading="lazy"
          decoding="async"
          onError={() => {
            missing.add(id)
            setFailed(true)
          }}
        />
      ) : (
        <span className="photo-fallback" aria-hidden>
          {initials}
        </span>
      )}
    </div>
  )
}

/**
 * Photo d'une candidate en plein écran (version HD si disponible).
 * Avec `ids`, on passe d'une candidate à l'autre (balayage, flèches ‹ ›, touches ← →).
 * `footer` affiche des actions sous la photo (ex. bouton « Choisir »).
 * Toucher le fond, ✕ ou Échap ferme.
 */
export function PhotoViewer({
  id,
  onClose,
  ids,
  footer,
}: {
  id: string | null
  onClose: () => void
  ids?: string[]
  footer?: (id: string) => ReactNode
}) {
  const [current, setCurrent] = useState(id)
  const [hdFailed, setHdFailed] = useState(false)
  const close = useRef(onClose)
  close.current = onClose
  const touchX = useRef<number | null>(null)
  const swiped = useRef(false)

  useEffect(() => setCurrent(id), [id])
  // Bloque le défilement de la page derrière (sans toucher au blocage posé par une fiche ouverte).
  useEffect(() => {
    if (!id || document.body.classList.contains('no-scroll')) return
    document.body.classList.add('no-scroll')
    return () => document.body.classList.remove('no-scroll')
  }, [id])
  useEffect(() => setHdFailed(false), [current])

  const list = ids && current && ids.includes(current) ? ids : null
  const go = useCallback(
    (step: number) => {
      if (!list || !current) return
      setCurrent(list[(list.indexOf(current) + step + list.length) % list.length])
    },
    [list, current],
  )

  useEffect(() => {
    if (!id) return
    // Capture sur window : Échap ferme la photo sans fermer aussi la fiche en dessous.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        close.current()
      } else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [id, go])

  const c = candidate(current)
  if (!current || !c) return null
  const pos = list ? list.indexOf(current) : -1
  const stop = (e: React.SyntheticEvent) => e.stopPropagation()

  return (
    <div
      className="photo-viewer"
      role="dialog"
      aria-modal="true"
      aria-label={`Photo de Miss ${c.region}`}
      onClick={() => {
        // Un balayage ne doit pas fermer la photo.
        if (swiped.current) swiped.current = false
        else onClose()
      }}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX
        swiped.current = false
      }}
      onTouchEnd={(e) => {
        if (touchX.current == null || !list) return
        const dx = e.changedTouches[0].clientX - touchX.current
        touchX.current = null
        if (Math.abs(dx) > 50) {
          swiped.current = true
          go(dx < 0 ? 1 : -1)
        }
      }}
    >
      <img
        key={current}
        src={hdFailed ? `/photos/${current}.webp` : `/photos/hd/${current}.webp`}
        alt={`Miss ${c.region}, ${c.name}`}
        onError={() => setHdFailed(true)}
      />
      <div className="photo-viewer-caption">
        <strong>Miss {c.region}</strong> · {c.name}
        {list && (
          <span className="muted small">
            {' '}
            · {pos + 1}/{list.length}
          </span>
        )}
      </div>
      {footer && (
        <div className="photo-viewer-footer" onClick={stop}>
          {footer(current)}
        </div>
      )}
      {list && list.length > 1 && (
        <>
          <button className="photo-viewer-nav prev" onClick={(e) => {
              stop(e)
              go(-1)
            }} aria-label="Miss précédente">
            ‹
          </button>
          <button className="photo-viewer-nav next" onClick={(e) => {
              stop(e)
              go(1)
            }} aria-label="Miss suivante">
            ›
          </button>
        </>
      )}
      <button className="icon-btn photo-viewer-close" onClick={(e) => {
              stop(e)
              onClose()
            }} aria-label="Fermer la photo">
        ✕
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ Étoiles */

const STAR_LABELS = ['Bof', 'Moyen', 'Bien', 'Très bien', 'Sublime !']

export function Stars({ value, onChange, size = 'md', disabled }: { value: number; onChange?: (v: number) => void; size?: 'md' | 'lg'; disabled?: boolean }) {
  return (
    <div className={`stars stars-${size}`} role="radiogroup" aria-label="Note sur 5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} sur 5 — ${STAR_LABELS[n - 1]}`}
          className={n <= value ? 'on' : ''}
          disabled={disabled || !onChange}
          onClick={() => {
            vibrate(15)
            onChange?.(value === n ? 0 : n)
          }}
        >
          ★
        </button>
      ))}
      {size === 'lg' && <span className="stars-label">{value ? STAR_LABELS[value - 1] : 'Touche une étoile'}</span>}
    </div>
  )
}

/* ------------------------------------------------------------------ Fenêtre du bas */

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.classList.add('no-scroll')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('no-scroll')
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <div className="sheet-title">{title}</div>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ Notifications */

interface Toast {
  id: number
  text: ReactNode
  tone: 'info' | 'good' | 'bad'
}
export interface Announcement {
  id: number
  kicker: string
  title: string
  candidateId?: string
  note?: string
  big?: boolean
}

interface NotifyCtx {
  toast(text: ReactNode, tone?: Toast['tone']): void
  announce(a: Omit<Announcement, 'id'>): void
}
const NCtx = createContext<NotifyCtx>({ toast: () => {}, announce: () => {} })
export const useNotify = () => useContext(NCtx)

let seq = 0

export function NotifyProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [queue, setQueue] = useState<Announcement[]>([])
  const timer = useRef<number>(0)

  const toast = useCallback((text: ReactNode, tone: Toast['tone'] = 'info') => {
    const id = ++seq
    setToasts((t) => [...t.slice(-2), { id, text, tone }])
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200)
  }, [])

  const announce = useCallback((a: Omit<Announcement, 'id'>) => {
    vibrate(a.big ? [80, 60, 80, 60, 200] : [60, 40, 60])
    setQueue((q) => [...q, { ...a, id: ++seq }])
  }, [])

  const current = queue[0]
  const next = useCallback(() => setQueue((q) => q.slice(1)), [])
  useEffect(() => {
    if (!current) return
    if (current.big) burst(true)
    // Annonces en rafale (Top 15 annoncé vite) : on accélère pour ne pas prendre de retard sur la télé.
    timer.current = window.setTimeout(next, current.big ? 7000 : queue.length > 2 ? 1800 : 3800)
    return () => window.clearTimeout(timer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, next])

  return (
    <NCtx.Provider value={{ toast, announce }}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            {t.text}
          </div>
        ))}
      </div>
      {current && (
        <div className={`announce ${current.big ? 'announce-big' : ''}`} onClick={next} role="alert">
          <div className="announce-card" key={current.id}>
            <div className="announce-kicker">{current.kicker}</div>
            {current.candidateId && <CandidatePhoto id={current.candidateId} size="xl" />}
            <div className="announce-title">{current.title}</div>
            {current.note && <div className="announce-note">{current.note}</div>}
            <div className="announce-tap">Touche pour fermer</div>
          </div>
        </div>
      )}
    </NCtx.Provider>
  )
}

/* ------------------------------------------------------------------ Divers */

export function Avatar({ emoji, size = 'md' }: { emoji: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={`avatar avatar-${size}`} aria-hidden>
      {emoji}
    </span>
  )
}

export function Countdown({ to }: { to: Date }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])
  const diff = to.getTime() - now
  if (diff <= 0) return <span>C’est l’heure ! 📺</span>
  const d = Math.floor(diff / 86_400_000)
  const h = Math.floor((diff / 3_600_000) % 24)
  const m = Math.floor((diff / 60_000) % 60)
  const s = Math.floor((diff / 1000) % 60)
  if (d > 0) return <span>{d} j {h} h {m} min</span>
  return (
    <span className="tabnum">
      {h > 0 && `${h} h `}
      {String(m).padStart(2, '0')} min {String(s).padStart(2, '0')} s
    </span>
  )
}

export function Empty({ emoji, children }: { emoji: string; children: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-emoji">{emoji}</div>
      <div>{children}</div>
    </div>
  )
}

export function ConnectionBanner({ connected, detail }: { connected: boolean; detail?: string | null }) {
  if (connected) return null
  return (
    <div className="offline">
      Connexion perdue… reconnexion en cours 📶
      {detail && <div className="offline-detail">{detail}</div>}
    </div>
  )
}
