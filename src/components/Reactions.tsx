import { useEffect, useRef, useState } from 'react'
import { REACTIONS, vibrate } from '../lib/device'
import { useGame } from '../lib/store'

interface Flying {
  id: number
  emoji: string
  name: string
  x: number
}
let n = 0

/** Émojis qui s'envolent quand quelqu'un réagit. */
export function FlyingReactions({ showNames = false, max = 30 }: { showNames?: boolean; max?: number }) {
  const { onReaction } = useGame()
  const [items, setItems] = useState<Flying[]>([])
  useEffect(
    () =>
      onReaction((r) => {
        const id = ++n
        setItems((list) => [...list.slice(-max), { id, emoji: r.emoji, name: r.name, x: 8 + Math.random() * 80 }])
        window.setTimeout(() => setItems((list) => list.filter((i) => i.id !== id)), 3200)
      }),
    [onReaction, max],
  )
  return (
    <div className="flying" aria-hidden>
      {items.map((i) => (
        <div key={i.id} className="fly" style={{ left: `${i.x}%` }}>
          <span className="fly-emoji">{i.emoji}</span>
          {showNames && i.name && <span className="fly-name">{i.name}</span>}
        </div>
      ))}
    </div>
  )
}

/** Barre de réactions en direct (limitée à ~3 par seconde pour éviter le spam). */
export function ReactionBar() {
  const { react, me } = useGame()
  const last = useRef(0)
  if (!me) return null
  return (
    <div className="reaction-bar" role="toolbar" aria-label="Réagir en direct">
      {REACTIONS.map((e) => (
        <button
          key={e}
          onClick={() => {
            const t = Date.now()
            if (t - last.current < 300) return
            last.current = t
            vibrate(10)
            react(e)
          }}
          aria-label={`Réagir ${e}`}
        >
          {e}
        </button>
      ))}
    </div>
  )
}
