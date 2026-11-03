// Les 31 candidates de l'élection de Miss France 2027 (samedi 12 décembre 2026, Futuroscope, TF1).
// Source : liste officielle relayée par la presse (octobre 2026). Âges au moment de l'élection.
// Photos : déposer les portraits officiels dans public/photos/<id>.webp (voir scripts/import-photos.mjs).

export interface Candidate {
  id: string
  number: number
  region: string
  name: string
  age: number
  height: string
  town: string
}

export const CANDIDATES: Candidate[] = [
  { id: 'alsace', number: 1, region: 'Alsace', name: 'Chiara Blazevic', age: 24, height: '1,76 m', town: 'Rantzwiller' },
  { id: 'aquitaine', number: 2, region: 'Aquitaine', name: 'Solène Videau', age: 22, height: '1,73 m', town: 'Mérignac' },
  { id: 'auvergne', number: 3, region: 'Auvergne', name: 'Lina Berthelier', age: 24, height: '1,73 m', town: 'Commentry' },
  { id: 'bretagne', number: 4, region: 'Bretagne', name: 'Margot Ferré-Bernard', age: 20, height: '1,71 m', town: 'Guipavas' },
  { id: 'bourgogne', number: 5, region: 'Bourgogne', name: 'Ilona Perrot', age: 23, height: '1,76 m', town: 'La Fermeté' },
  { id: 'centre-val-de-loire', number: 6, region: 'Centre-Val de Loire', name: 'Justine Bourrelier', age: 26, height: '1,76 m', town: 'Dammarie' },
  { id: 'champagne-ardenne', number: 7, region: 'Champagne-Ardenne', name: 'Céline Leduc', age: 23, height: '1,83 m', town: 'Tagnon' },
  { id: 'corse', number: 8, region: 'Corse', name: 'Satine Nomary', age: 20, height: '1,76 m', town: 'Grosseto-Prugna' },
  { id: 'cote-d-azur', number: 9, region: "Côte d'Azur", name: 'May Haoues', age: 19, height: '1,74 m', town: 'Cagnes-sur-Mer' },
  { id: 'franche-comte', number: 10, region: 'Franche-Comté', name: 'Emma Ninot', age: 21, height: '1,75 m', town: 'Laire' },
  { id: 'guyane', number: 11, region: 'Guyane', name: 'Sandra Justine', age: 23, height: '1,77 m', town: 'Kourou' },
  { id: 'guadeloupe', number: 12, region: 'Guadeloupe', name: 'Julia Désirée', age: 20, height: '1,81 m', town: 'Les Abymes' },
  { id: 'ile-de-france', number: 13, region: 'Île-de-France', name: 'Camilla Alash', age: 24, height: '1,81 m', town: 'Clichy' },
  { id: 'languedoc', number: 14, region: 'Languedoc', name: 'Candice Gauch', age: 29, height: '1,77 m', town: 'Mende' },
  { id: 'limousin', number: 15, region: 'Limousin', name: 'Élise Escuriol', age: 22, height: '1,74 m', town: 'Brive-la-Gaillarde' },
  { id: 'lorraine', number: 16, region: 'Lorraine', name: 'Léane Froment', age: 21, height: '1,72 m', town: 'Gondreville' },
  { id: 'martinique', number: 17, region: 'Martinique', name: 'Maureen-Alycia Lucea-Merlin', age: 24, height: '1,76 m', town: 'Fort-de-France' },
  { id: 'mayotte', number: 18, region: 'Mayotte', name: 'Emma Saïd Issouf', age: 24, height: '1,76 m', town: 'Mamoudzou' },
  { id: 'midi-pyrenees', number: 19, region: 'Midi-Pyrénées', name: 'Carla Rachail', age: 23, height: '1,74 m', town: 'Toulouse' },
  { id: 'nouvelle-caledonie', number: 20, region: 'Nouvelle-Calédonie', name: 'Lana Prost', age: 18, height: '1,75 m', town: 'Le Mont-Dore' },
  { id: 'nord-pas-de-calais', number: 21, region: 'Nord-Pas-de-Calais', name: 'Shana Mendes', age: 18, height: '1,75 m', town: 'Hem' },
  { id: 'normandie', number: 22, region: 'Normandie', name: 'Pauline Gourlez', age: 22, height: '1,71 m', town: 'Giberville' },
  { id: 'pays-de-la-loire', number: 23, region: 'Pays de la Loire', name: 'Maëlle Hamon', age: 23, height: '1,72 m', town: 'Les Sorinières' },
  { id: 'picardie', number: 24, region: 'Picardie', name: 'Marie Villez', age: 26, height: '1,73 m', town: 'Amiens' },
  { id: 'poitou-charentes', number: 25, region: 'Poitou-Charentes', name: 'Mandy Goudal', age: 38, height: '1,74 m', town: 'Saintes' },
  { id: 'provence', number: 26, region: 'Provence', name: 'Ophélie Vitalbo', age: 28, height: '1,71 m', town: 'Velleron' },
  { id: 'reunion', number: 27, region: 'Réunion', name: 'Laetitia Roguet', age: 21, height: '1,72 m', town: 'Saint-Benoît' },
  { id: 'rhone-alpes', number: 28, region: 'Rhône-Alpes', name: 'Julia Grid-Costantino', age: 23, height: '1,74 m', town: 'Lyon' },
  { id: 'roussillon', number: 29, region: 'Roussillon', name: 'Juliette Gauthier', age: 23, height: '1,74 m', town: 'Le Boulou' },
  { id: 'saint-martin-saint-barthelemy', number: 30, region: 'Saint-Martin / Saint-Barthélemy', name: 'Naïla Parotte', age: 22, height: '1,82 m', town: 'Marigot' },
  { id: 'tahiti', number: 31, region: 'Tahiti', name: 'Leia Diard', age: 22, height: '1,72 m', town: 'Arue' },
]

export const CANDIDATE_BY_ID: Record<string, Candidate> = Object.fromEntries(CANDIDATES.map((c) => [c.id, c]))

export function candidate(id: string | null | undefined): Candidate | undefined {
  return id ? CANDIDATE_BY_ID[id] : undefined
}

export function missLabel(id: string | null | undefined): string {
  const c = candidate(id)
  return c ? `Miss ${c.region}` : '—'
}

/** Teinte stable par candidate, pour les vignettes sans photo. */
export function candidateHue(id: string): number {
  const c = CANDIDATE_BY_ID[id]
  return c ? Math.round((c.number * 360) / CANDIDATES.length) : 0
}

/** Date et heure de début de l'émission (heure de Paris). */
export const SHOW_START = new Date('2026-12-12T21:10:00+01:00')
