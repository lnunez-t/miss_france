// Importe les portraits : `npm run photos` (ou `npm run photos -- <dossier>` pour un autre dossier source)
//
// 1. Dépose les images (jpg, png, webp…) dans le dossier photos-src/ à la racine du projet.
//    Le nom de fichier doit contenir la région : « Miss-Alsace.jpg », « nouvelle_caledonie.png »,
//    « 20-Lana-Prost-Nouvelle-Caledonie.jpeg »… (accents, majuscules et tirets ignorés).
// 2. Le script recadre en portrait 3:4 (450×600), compresse en WebP et écrit public/photos/<id>.webp.
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const SRC = path.resolve(process.argv[2] ?? 'photos-src')
const OUT = path.resolve('public/photos')

// Identifiants (voir src/data/candidates.ts) + variantes de noms courantes.
const REGIONS = {
  alsace: ['alsace'],
  aquitaine: ['aquitaine'],
  auvergne: ['auvergne'],
  bretagne: ['bretagne'],
  bourgogne: ['bourgogne'],
  'centre-val-de-loire': ['centre val de loire', 'centre'],
  'champagne-ardenne': ['champagne ardenne', 'champagne'],
  corse: ['corse'],
  'cote-d-azur': ['cote d azur', 'cote dazur', 'azur'],
  'franche-comte': ['franche comte'],
  guyane: ['guyane'],
  guadeloupe: ['guadeloupe'],
  'ile-de-france': ['ile de france', 'idf'],
  languedoc: ['languedoc'],
  limousin: ['limousin'],
  lorraine: ['lorraine'],
  martinique: ['martinique'],
  mayotte: ['mayotte'],
  'midi-pyrenees': ['midi pyrenees'],
  'nouvelle-caledonie': ['nouvelle caledonie', 'caledonie'],
  'nord-pas-de-calais': ['nord pas de calais', 'nord'],
  normandie: ['normandie'],
  'pays-de-la-loire': ['pays de la loire'],
  picardie: ['picardie'],
  'poitou-charentes': ['poitou charentes', 'poitou'],
  provence: ['provence'],
  reunion: ['reunion'],
  'rhone-alpes': ['rhone alpes'],
  roussillon: ['roussillon'],
  'saint-martin-saint-barthelemy': ['saint martin', 'st martin', 'saint barthelemy', 'st barth'],
  tahiti: ['tahiti'],
}

const norm = (s) => ` ${s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `

function match(file) {
  const n = norm(path.parse(file).name)
  // Les variantes les plus longues d'abord (« nord pas de calais » avant « nord »).
  const all = Object.entries(REGIONS).flatMap(([id, names]) => names.map((name) => [id, name]))
  all.sort((a, b) => b[1].length - a[1].length)
  return all.find(([, name]) => n.includes(` ${name} `))?.[0]
}

if (!fs.existsSync(SRC)) {
  fs.mkdirSync(SRC)
  console.log(`📁 Dossier créé : ${SRC}\n   Dépose les photos dedans puis relance « npm run photos ».`)
  process.exit(0)
}
fs.mkdirSync(OUT, { recursive: true })

const files = fs.readdirSync(SRC).filter((f) => /\.(jpe?g|png|webp|avif|heic|tiff?)$/i.test(f))
const done = new Set()
for (const f of files) {
  const id = match(f)
  if (!id) {
    console.log(`⚠️  Région non reconnue : ${f} (renomme le fichier avec le nom de la région)`)
    continue
  }
  if (done.has(id)) console.log(`⚠️  Deux photos pour ${id} : ${f} remplace la précédente`)
  await sharp(path.join(SRC, f))
    .rotate()
    .resize(450, 600, { fit: 'cover', position: 'attention' })
    .webp({ quality: 80 })
    .toFile(path.join(OUT, `${id}.webp`))
  done.add(id)
  console.log(`✅ ${f} → public/photos/${id}.webp`)
}

const missing = Object.keys(REGIONS).filter((id) => !fs.existsSync(path.join(OUT, `${id}.webp`)))
console.log(`\n${31 - missing.length}/31 photos pr