export type PhaseId =
  | 'accueil'
  | 'ouverture'
  | 'costumes'
  | 'top15'
  | 'maillot'
  | 'robes'
  | 'top5'
  | 'discours'
  | 'verdict'
  | 'fin'

export type RoundId = 'costume' | 'maillot' | 'robe' | 'discours'

/**
 * Pronostic en 3 niveaux, chacun verrouillé juste avant l'annonce correspondante :
 * avant      : Top 15 (verrouillé à « Annonce du Top 15 »)
 * apres15    : Top 5 (verrouillé à « Annonce du Top 5 »)
 * final      : classement Miss + 4 dauphines (verrouillé au « Verdict »)
 * chouchoute : sa candidate préférée (pas de points)
 * (Les identifiants historiques sont conservés pour rester compatibles avec la base.)
 */
export type PredictionKind = 'avant' | 'apres15' | 'final' | 'chouchoute'

export interface Results {
  top15: string[]
  top5: string[]
  /** Ordre de révélation : [4e dauphine, 3e, 2e, 1re, Miss France]. */
  verdict: string[]
}

export interface GameState {
  phase: PhaseId
  onStage: string | null
  results: Results
  updatedAt: string
}

export interface Player {
  id: string
  name: string
  avatar: string
  createdAt: string
}

/** Mon Top 15. */
export interface PredAvant {
  top15: string[]
}
/** Mon Top 5. */
export interface PredApres15 {
  top5: string[]
}
export interface PredFinal {
  /** [Miss, 1re dauphine, 2e, 3e, 4e] */
  order: string[]
}
export interface PredChouchoute {
  candidate: string | null
}

export interface PayloadByKind {
  avant: PredAvant
  apres15: PredApres15
  final: PredFinal
  chouchoute: PredChouchoute
}

export interface Prediction<K extends PredictionKind = PredictionKind> {
  playerId: string
  kind: K
  payload: PayloadByKind[K]
  updatedAt: string
}

export interface Rating {
  playerId: string
  candidateId: string
  round: RoundId
  score: number
}

export type BetStatus = 'open' | 'closed' | 'resolved'

export interface Bet {
  id: string
  question: string
  /** candidate : on choisit une candidate ; choices : options libres */
  type: 'candidate' | 'choices'
  options: string[]
  status: BetStatus
  answer: string | null
  points: number
  createdAt: string
}

export interface BetAnswer {
  betId: string
  playerId: string
  choice: string
}

export interface Snapshot {
  game: GameState
  players: Player[]
  predictions: Prediction[]
  ratings: Rating[]
  bets: Bet[]
  betAnswers: BetAnswer[]
}

export interface Session {
  playerId: string
  secret: string
}

export interface Reaction {
  emoji: string
  playerId: string
  name: string
}

export const EMPTY_RESULTS: Results = { top15: [], top5: [], verdict: [] }

export function emptySnapshot(): Snapshot {
  return {
    game: { phase: 'accueil', onStage: null, results: { ...EMPTY_RESULTS }, updatedAt: new Date(0).toISOString() },
    players: [],
    predictions: [],
    ratings: [],
    bets: [],
    betAnswers: [],
  }
}
