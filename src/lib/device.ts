import confetti from 'canvas-confetti'

/** Lien d'accès à la partie (adresse du site, sans chemin). */
export function joinUrl(): string {
  return window.location.origin + '/'
}

/** Adresse lisible pour l'affichage (sans https://). */
export function prettyUrl(): string {
  return window.location.host
}

export const INVITE_TEXT = '👑 Soirée Miss France 2027 ! Viens faire tes pronostics et noter les candidates avec nous :'

export async function nativeShare(): Promise<boolean> {
  if (!navigator.share) return false
  try {
    await navigator.share({ title: 'Soirée Miss France 2027', text: INVITE_TEXT, url: joinUrl() })
    return true
  } catch {
    return true // partage annulé par l'utilisateur : rien d'autre à faire
  }
}

export function whatsappLink(): string {
  return `https://wa.me/?text=${encodeURIComponent(`${INVITE_TEXT} ${joinUrl()}`)}`
}

export function smsLink(): string {
  // « ?&body= » fonctionne à la fois sur iPhone et Android.
  return `sms:?&body=${encodeURIComponent(`${INVITE_TEXT} ${joinUrl()}`)}`
}

export function mailLink(): string {
  return `mailto:?subject=${encodeURIComponent('Soirée Miss France 2027 👑')}&body=${encodeURIComponent(`${INVITE_TEXT}\n${joinUrl()}`)}`
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  }
}

export function vibrate(pattern: number | number[] = 40) {
  try {
    // Le navigateur refuse de vibrer tant que personne n'a touché l'écran (ex. écran TV).
    const activated = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive ?? true
    if (activated) navigator.vibrate?.(pattern)
  } catch {
    /* non supporté (iPhone) */
  }
}

const GOLD = ['#f5d77a', '#e8b84a', '#ffffff', '#f7a1c4', '#7aa7ff']

export function burst(big = false) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  confetti({ particleCount: big ? 160 : 70, spread: big ? 110 : 70, origin: { y: 0.6 }, colors: GOLD, disableForReducedMotion: true })
  if (big) {
    const end = Date.now() + 2500
    const frame = () => {
      confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors: GOLD })
      confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors: GOLD })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()
  }
}

/** Empêche l'écran de se mettre en veille (si le navigateur le permet). */
export async function keepAwake(): Promise<(() => void) | null> {
  const wl = (navigator as Navigator & { wakeLock?: { request(t: 'screen'): Promise<{ release(): Promise<void> }> } }).wakeLock
  if (!wl) return null
  let sentinel: { release(): Promise<void> } | null = null
  const acquire = async () => {
    try {
      sentinel = await wl.request('screen')
    } catch {
      /* refusé */
    }
  }
  const onVisible = () => document.visibilityState === 'visible' && acquire()
  await acquire()
  document.addEventListener('visibilitychange', onVisible)
  return () => {
    document.removeEventListener('visibilitychange', onVisible)
    sentinel?.release().catch(() => {})
  }
}

export const AVATARS = ['👑', '💃', '🕺', '🦄', '🌸', '🐱', '🐶', '🦊', '🐼', '🐸', '🦁', '🐝', '🍷', '🥂', '🍿', '🎩', '👵', '👴', '👩', '👨', '👧', '👦', '😎', '🤩']

export const REACTIONS = ['😍', '👏', '🔥', '😂', '😱', '👑', '💔', '🤔']

let release: (() => void) | null = null

export function isAwake(): boolean {
  return release != null
}

/** Active/désactive l'écran toujours allumé. Renvoie le nouvel état. */
export async function toggleAwake(): Promise<boolean> {
  if (release) {
    release()
    release = null
    return false
  }
  release = await keepAwake()
  return release != null
}
