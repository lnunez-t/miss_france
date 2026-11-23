import { useState } from 'react'
import { candidate } from '../data/candidates'
import { vibrate } from '../lib/device'
import { CandidatePhoto, PhotoViewer } from './ui'

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

/** Grille de vignettes à cocher, pensée pour le doigt. La loupe 🔍 ouvre les photos en grand. */
export function CandidatePicker({ ids, selected, max, onChange, disabled, badge, onFull }: Props) {
  const [zoom, setZoom] = useState<string | null>(null)

  const toggle = (id: string) => {
    if (disabled) return
    vibrate(12)
    if (max === 1) return onChange(selected[0] === id ? [] : [id])
    if (selected.includes(id)) return onChange(selected.filter((x) => x !== id))
    if (selected.length >= max) return onFull?.()
    onChange([...selected, id])
  }

  return (
    <>
      <div className="picker">
        {ids.map((id) => {
          const c = candidate(id)!
          const on = selected.includes(id)
          const b = badge?.(id)
          return (
            <div key={id} className="tile-wrap">
              <button type="button" className={`tile ${on ? 'tile-on' : ''}`} onClick={() => toggle(id)} aria-pressed={on} disabled={disabled}>
                <CandidatePhoto id={id} />
                <span className="tile-region">{c.region}</span>
                <span className="tile-name">{c.name.split(' ')[0]}</span>
                {on && <span className="tile-check">{max === 1 ? '👑' : '✓'}</span>}
                {b && <span className="tile-badge">{b}</span>}
              </button>
              {/* Calque calé sur la photo : la loupe se place dans son coin bas-droit. */}
              <div className="tile-zoom-zone">
                <div>
                  <button type="button" className="tile-zoom" onClick={() => setZoom(id)} aria-label={`Voir Miss ${c.region} en grand`}>
                    🔍
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {zoom && (
        <PhotoViewer
          id={zoom}
          ids={ids}
          onClose={() => setZoom(null)}
          footer={
            disabled
              ? undefined
              : (id) => {
                  const on = selected.includes(id)
                  const full = !on && max > 1 && selected.length >= max
                  return (
                    <>
                      {max > 1 && (
                        <div className="muted small">
                          {selected.length}/{max} choisies
                        </div>
                      )}
                      <button
                        type="button"
                        className={`btn btn-block ${on ? '' : 'btn-gold'}`}
                        disabled={full}
                        onClick={() => {
                          toggle(id)
                          // Choix unique (classement final) : on revient tout de suite à la grille.
                          if (max === 1 && !on) setZoom(null)
                        }}
                      >
                        {on ? '✕ Retirer de ma sélection' : full ? `Sélection complète (${max})` : max === 1 ? '👑 Choisir cette Miss' : '✓ Choisir cette Miss'}
                      </button>
                    </>
                  )
                }
          }
        />
      )}
    </>
  )
}
