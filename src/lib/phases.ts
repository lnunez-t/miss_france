import type { PhaseId, PredictionKind, Results, RoundId } from './types'
import { CANDIDATES } from '../data/candidates'

export interface PhaseDef {
  id: PhaseId
  label: string
  short: string
  emoji: string
  /** Ce que les joueurs doivent faire pendant cette étape. */
  hint: string
  /** Tour de notes qui s'ouvre à cette étape. */
  round?: RoundId
  /** Pronostics modifiables pendant cette étape. */
  predictions: PredictionKind[]
}

// Déroulé de l'émission. L'animateur·rice (page /admin) passe d'une étape à l'autre en direct.
export const PHASES: PhaseDef[] = [
  { id: 'accueil', label: "Avant l'émission", short: 'Avant', emoji: '🍿', hint: 'Fais tes pronostics avant le début du show : ils seront verrouillés au lancement !', predictions: ['avant'] },
  { id: 'ouverture', label: 'Ouverture du show', short: 'Ouverture', emoji: '✨', hint: 'Pronostics verrouillés. Installe-toi et réagis en direct !', predictions: [] },
  { id: 'costumes', label: 'Défilé des costumes régionaux', short: 'Costumes', emoji: '🎭', round: 'costume', hint: 'Note chaque costume régional pendant le défilé.', predictions: [] },
  { id: 'top15', label: 'Annonce du Top 15', short: 'Top 15', emoji: '🌟', hint: 'Qui sont les 15 demi-finalistes ? Ensuite, 2e chance : refais ton Top 5 !', predictions: ['apres15'] },
  { id: 'maillot', label: 'Défilé en maillot de bain', short: 'Maillot', emoji: '👙', round: 'maillot', hint: 'Note le passage des 15 demi-finalistes.', predictions: ['apres15'] },
  { id: 'robes', label: 'Défilé en robe de soirée', short: 'Robes', emoji: '👗', round: 'robe', hint: 'Note les robes de soirée. Dernière chance pour ton Top 5 !', predictions: ['apres15'] },
  { id: 'top5', label: 'Annonce du Top 5', short: 'Top 5', emoji: '🔥', hint: 'Les 5 finalistes sont connues : fais ton classement final !', predictions: ['final'] },
  { id: 'discours', label: 'Le grand oral du Top 5', short: 'Grand oral', emoji: '🎤', round: 'discours', hint: 'Note les réponses des finalistes. Classement final modifiable jusqu’au verdict.', predictions: ['final'] },
  { id: 'verdict', label: 'Le verdict', short: 'Verdict', emoji: '👑', hint: 'Les dauphines sont annoncées une par une… Qui sera Miss France 2027 ?', predictions: [] },
  { id: 'fin', label: 'Palmarès de la soirée', short: 'Palmarès', emoji: '🏆', hint: 'Découvre qui a eu le meilleur œil de la soirée !', predictions: [] },
]

export const PHASE_BY_ID = Object.fromEntries(PHASES.map((p) => [p.id, p])) as Record<PhaseId, PhaseDef>

export function phaseIndex(id: PhaseId): number {
  return PHASES.findIndex((p) => p.id === id)
}

export const ROUNDS: Record<RoundId, { label: string; emoji: string; phase: PhaseId }> = {
  costume: { label: 'Costume régional', emoji: '🎭', phase: 'costumes' },
  maillot: { label: 'Maillot de bain', emoji: '👙', phase: 'maillot' },
  robe: { label: 'Robe de soirée', emoji: '👗', phase: 'robes' },
  discours: { label: 'Grand oral', emoji: '🎤', phase: 'discours' },
}
export const ROUND_IDS = Object.keys(ROUNDS) as RoundId[]

export function canEditPrediction(phase: PhaseId, kind: PredictionKind): boolean {
  if (kind === 'chouchoute') return true
  return PHASE_BY_ID[phase].predictions.includes(kind)
}

/** Un tour de notes reste ouvert dès que son défilé a commencé, jusqu'au palmarès. */
export function canRate(phase: PhaseId, round: RoundId): boolean {
  return phase !== 'fin' && phaseIndex(phase) >= phaseIndex(ROUNDS[round].phase)
}

export function openRounds(phase: PhaseId): RoundId[] {
  return ROUND_IDS.filter((r) => canRate(phase, r))
}

/** Le tour de notes « en cours » : celui de l'étape, sinon le dernier ouvert. */
export function currentRound(phase: PhaseId): RoundId | null {
  const own = PHASE_BY_ID[phase].round
  if (own) return own
  const open = openRounds(phase)
  return open.length ? open[open.length - 1] : null
}

/** Candidates concernées par un tour de notes. */
export function roundCandidates(round: RoundId, results: Results): string[] {
  const all = CANDIDATES.map((c) => c.id)
  if ((round === 'maillot' || round === 'robe') && results.top15.length) return all.filter((id) => results.top15.includes(id))
  if (round === 'discours' && results.top5.length) return all.filter((id) => results.top5.includes(id))
  return all
}

export const VERDICT_TITLES = ['4e dauphine', '3e dauphine', '2e dauphine', '1re dauphine', 'Miss France 2027']
/** Titre selon le rang final (0 = Miss). */
export const RANK_TITLES = ['Miss France 2027', '1re dauphine', '2e dauphine', '3e dauphine', '4e dauphine']
