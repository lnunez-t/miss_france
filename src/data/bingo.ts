// Bingo Miss France 2027 : 24 cases tirées au hasard + la case centrale offerte.
// L'ordre de cette liste ne doit plus changer une fois les grilles distribuées
// (les grilles enregistrent l'index de chaque case).

export const BINGO_ITEMS = [
  'Thierry Baumann surgit tel un génie des votes',
  'Thierry Baumann dit « votez » plus de fois que JPF dit « bonsoir »',
  'Thierry Baumann récite le numéro plus vite qu’un rappeur',
  'Thierry Baumann rappelle le prix du SMS avec un sourire à 1 000 €',
  'Thierry Baumann a l’air de sortir d’une pub Lindt',
  'Thierry Baumann a changé de costume (personne ne l’a vu partir)',
  'Thierry Baumann ferme les votes comme on ferme un coffre-fort',
  'Thierry Baumann et JPF : le duo comique de la soirée',
  'JPF dit « Bonsoir ! » avec l’énergie d’un ado de 20 ans',
  'JPF : « Quelle émotion ! » (pour la 3e fois)',
  'JPF est plus ému que les familles des candidates',
  'JPF ralentit volontairement avant un nom… très… très… lentement',
  'JPF trouve chaque région « magnifique »',
  'JPF fait un pas de danse',
  '« Porter haut les couleurs de ma région » (bingo assuré)',
  '« Être un modèle pour les jeunes filles »',
  '« C’est un rêve de petite fille » : le classique des classiques',
  '« Je danse depuis l’âge de 4 ans »',
  'Une candidate fait médecine, du droit ET de l’humanitaire',
  'Une candidate fait un coucou à sa boulangerie de quartier',
  'Une Miss envoie un bisou à la caméra (et à toute la France)',
  '« Merci la France ! » crié avec tout le cœur',
  '« On est une vraie famille entre Miss » 🫶',
  'Une Miss dit le nom de son village, toute la France cherche sur Google',
  'Le mot « bienveillance »',
  'Le mot « sororité »',
  'Le mot « aventure humaine »',
  'Le mot « incroyable » 3 fois dans la même phrase',
  'Des plumes tellement grandes qu’elles ont leur propre loge',
  'Un costume régional avec un monument sur la tête',
  'Un costume régional qui ressemble à un plat typique',
  'Un costume régional qui clignote comme un sapin de Noël',
  'Un costume régional qui ne passe pas les portes',
  'Défilé en maillot sur un tube que tu chantais en 2004',
  'Une robe qui brille plus que la couronne',
  'Une traîne si longue qu’elle arrive en coulisses',
  'Assez de paillettes pour décorer Poitiers',
  'Feux d’artifice : le Futuroscope prend feu (pour de faux)',
  'Pluie de confettis',
  'Un chanteur invité, et les Miss dansent derrière',
  'Une chorégraphie avec des éventails',
  'Images de Saint-Martin, cheveux au vent (comme dans une pub de shampoing)',
  'Un portrait filmé au drone, façon film d’action',
  'Un portrait avec un chien qui vole la vedette',
  'Un portrait dans les champs, les vignes ou à la plage',
  'Une maman tient une pancarte plus grande qu’elle',
  'Le public scande le nom d’une région comme au stade',
  'Le Futuroscope est cité pour la 5e fois',
  'On parle du test de culture G, et tu révises en douce',
  'Une ancienne Miss France dans le jury',
  'Cindy Fabre apparaît, élégance niveau maximum',
  'Miss France 2026 dit au revoir et toute la salle sort les mouchoirs',
  'Miss France 2026 : « Profitez de chaque instant ! »',
  'Il est plus de minuit et le suspense est intact',
  'Coupure pub PILE avant le résultat',
  'Une Miss saute de joie comme si elle avait gagné au loto',
  'Câlin collectif géant des Miss',
  'La gagnante met les mains sur la bouche',
  'La gagnante pleure de joie sous la couronne',
  'La couronne est posée avec la délicatesse d’un démineur',
  'La nouvelle Miss France reçoit un bouquet plus gros qu’elle',
  'Les dauphines font un câlin à la gagnante',
]

/** Index de la case centrale (offerte). */
export const BINGO_FREE = 12
export const BINGO_FREE_LABEL = '👑 Case offerte : Jean-Pierre est là'

/** Les 12 lignes gagnantes : 5 lignes, 5 colonnes, 2 diagonales. */
export const BINGO_LINES: number[][] = [
  ...[0, 1, 2, 3, 4].map((r) => [0, 1, 2, 3, 4].map((c) => r * 5 + c)),
  ...[0, 1, 2, 3, 4].map((c) => [0, 1, 2, 3, 4].map((r) => r * 5 + c)),
  [0, 6, 12, 18, 24],
  [4, 8, 12, 16, 20],
]

/** Nouvelle grille : 25 index de BINGO_ITEMS, la case centrale vaut -1. */
export function newBingoCard(): number[] {
  const idx = BINGO_ITEMS.map((_, i) => i)
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  const cells = idx.slice(0, 24)
  cells.splice(BINGO_FREE, 0, -1)
  return cells
}

/** Lignes complètes pour des cases cochées (la case centrale compte toujours). */
export function bingoLines(checked: number[]): number[][] {
  const on = new Set([...checked, BINGO_FREE])
  return BINGO_LINES.filter((l) => l.every((i) => on.has(i)))
}

export function isFullCard(checked: number[]): boolean {
  const on = new Set([...checked, BINGO_FREE])
  return on.size >= 25
}
