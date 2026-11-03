import { useState } from 'react'
import { copyText, joinUrl, mailLink, nativeShare, prettyUrl, smsLink, whatsappLink } from '../lib/device'
import { useNotify } from './ui'

/** Partage du lien : pas de QR code, juste un lien à envoyer comme on veut. */
export function Invite() {
  const { toast } = useNotify()
  const [copied, setCopied] = useState(false)
  const canShare = typeof navigator !== 'undefined' && !!navigator.share
  return (
    <div className="invite">
      <p className="muted">Envoie ce lien à tes proches. Ils n’ont rien à installer : il suffit de l’ouvrir et de taper son prénom.</p>
      <div className="invite-url">{prettyUrl()}</div>
      {canShare && (
        <button className="btn btn-gold btn-block" onClick={() => nativeShare()}>
          📤 Partager le lien
        </button>
      )}
      <div className="invite-grid">
        <a className="btn btn-whatsapp" href={whatsappLink()} target="_blank" rel="noreferrer">
          💬 WhatsApp
        </a>
        <a className="btn" href={smsLink()}>
          ✉️ SMS
        </a>
        <a className="btn" href={mailLink()}>
          📧 E-mail
        </a>
        <button
          className="btn"
          onClick={async () => {
            const ok = await copyText(joinUrl())
            setCopied(ok)
            toast(ok ? 'Lien copié ! Colle-le où tu veux.' : 'Impossible de copier : recopie le lien affiché.', ok ? 'good' : 'bad')
          }}
        >
          {copied ? '✅ Copié' : '📋 Copier'}
        </button>
      </div>
    </div>
  )
}
