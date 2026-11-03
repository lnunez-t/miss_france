import { candidate } from '../data/candidates'
import { vibrate } from '../lib/device'
import { CandidatePhoto } from './ui'

interface Props {
  ids: string[]
  selected: string[]
  /** Nombre max de sélections (1 = choix unique, remplace la sélection). */
  max: number
  onChange: (next: string[]) => void
  disabled?: boolean
  /** Badge optionnel affiché sur la vignette (ex. ✅ si qualifiée). */
  badge?: (id: string) => string | null
  onFull?: () => void
}

/** Grille de vignettes à cocher, pensée pour le doigt. */
export function CandidatePicker({ ids, selected, max, onChange, disabled, badge, onFull }: Props) {
  const toggle = (id: string) => {
    if (disabled) return
    vibrate(12)
    if (max === 1) return onChange(selected[0] === id ? [] : [id])
    if (selected.includes(id)) return onChange(selected.filter((x) => x !== id))
    if (selected.length >= max) return onFull?.()
    onChange([...selected, id])
  }
  return (
    <div className="picker">
      {ids.map((id) => {
        const c = candidate(id)!
        const on = selected.includes(id)
        const b = badge?.(id)
        return (
          <button key={id} type="button" className={`tile ${on ? 'tile-on' : ''}`} onClick={() => toggle(id)} aria-pressed={on} disabled={disabled}>
            <CandidatePhoto id={id} />
            <span className="tile-region">{c.region}</span>
            <span className="tile-name">{c.name.split(' ')[0]}</span>
            {on && <span className="tile-check">{max === 1 ? '👑' : '✓'}</span>}
            {b && <span className="tile-badge">{b}</span>}
          </button>
        )
      })}
    </div>
  )
}
