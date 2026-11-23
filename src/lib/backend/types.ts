import type { Bet, BetStatus, PhaseId, Player, PredictionKind, Reaction, Results, RoundId, Session, Snapshot } from '../types'

export type Updater = (s: Snapshot) => Snapshot

export interface Listener {
  /** Applique une modification reçue en temps réel. */
  onUpdate: (fn: Updater) => void
  onReaction: (r: Reaction) => void
  /** Connexion temps réel établie (true) ou perdue (false). */
  onStatus: (connected: boolean, detail?: string) => void
}

/** Le joueur connecté, avec l'info « a-t-il défini un code de reconnexion ». */
export type Me = Player & { hasCode: boolean }

export interface NewBet {
  question: string
  type: Bet['type']
  options: string[]
  points: number
}

export interface Backend {
  mode: 'demo' | 'live'
  load(): Promise<Snapshot>
  subscribe(l: Listener): () => void

  /** code : 4 chiffres, pour pouvoir se reconnecter plus tard. */
  join(name: string, avatar: string, code: string): Promise<Session>
  /** Retrouver son compte avec son prénom et son code. */
  reconnect(name: string, code: string): Promise<Session>
  setCode(secret: string, code: string): Promise<void>
  whoami(secret: string): Promise<Me | null>
  updateProfile(secret: string, name: string, avatar: string): Promise<void>
  savePrediction(secret: string, kind: PredictionKind, payload: unknown): Promise<void>
  /** score = 0 retire la note. */
  saveRating(secret: string, candidateId: string, round: RoundId, score: number): Promise<void>
  answerBet(secret: string, betId: string, choice: string): Promise<void>
  /** Enregistre sa grille et ses cases cochées (le serveur calcule les lignes et l'heure du bingo). */
  saveBingo(secret: string, cells: number[], checked: number[]): Promise<void>
  sendReaction(r: Reaction): void

  admin: {
    check(pin: string): Promise<boolean>
    setPhase(pin: string, phase: PhaseId): Promise<void>
    setOnStage(pin: string, candidateId: string | null): Promise<void>
    setResults(pin: string, results: Results): Promise<void>
    createBet(pin: string, bet: NewBet): Promise<void>
    updateBet(pin: string, id: string, status: BetStatus, answer: string | null): Promise<void>
    deleteBet(pin: string, id: string): Promise<void>
    renamePlayer(pin: string, id: string, name: string): Promise<void>
    deletePlayer(pin: string, id: string): Promise<void>
    playerSecret(pin: string, id: string): Promise<string>
    reset(pin: string, keepPlayers: boolean): Promise<void>
  }
}

/** Codes d'erreur communs aux deux modes. */
export type ErrorCode = 'NAME_TAKEN' | 'LOCKED' | 'BAD_PIN' | 'BAD_CODE' | 'NO_CODE' | 'TOO_MANY' | 'NOT_FOUND' | 'INVALID' | 'NETWORK'

const MESSAGES: Record<ErrorCode, string> = {
  NAME_TAKEN: 'Ce prénom est déjà pris. Ajoute une initiale (ex. « Marie D. »).',
  LOCKED: 'Trop tard, c’est verrouillé pour cette étape !',
  BAD_PIN: 'Code admin incorrect.',
  BAD_CODE: 'Code incorrect. Réessaie !',
  NO_CODE: 'Ce joueur n’a pas encore de code. Demande ton lien de reconnexion à la personne qui anime la soirée.',
  TOO_MANY: 'Trop d’essais ratés. Patiente 5 minutes avant de réessayer.',
  NOT_FOUND: 'Joueur introuvable. Vérifie l’orthographe du prénom.',
  INVALID: 'Données invalides.',
  NETWORK: 'Connexion perdue. Vérifie ton réseau et réessaie.',
}

export class GameError extends Error {
  code: ErrorCode
  /** Message technique d'origine (affiché pour aider au diagnostic). */
  detail?: string
  constructor(code: ErrorCode, detail?: string) {
    super(MESSAGES[code])
    this.code = code
    this.detail = detail
  }
}

export function toGameError(e: unknown): GameError {
  if (e instanceof GameError) return e
  const msg = e instanceof Error ? e.message : String(e)
  const code = (Object.keys(MESSAGES) as ErrorCode[]).find((c) => msg.includes(c))
  return new GameError(code ?? 'NETWORK', msg)
}
