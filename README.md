# 👑 Soirée Miss France 2027

Application web pour vivre l'élection de **Miss France 2027** (samedi 12 décembre 2026, TF1) en famille ou entre amis.
Chacun ouvre un **simple lien** sur son téléphone, tape son prénom, et suit toute l'émission en direct :

- 🔮 **Pronostics en 3 niveaux** : Top 15, Top 5, puis classement final (Miss France + 4 dauphines) — chacun modifiable jusqu'à **juste avant son annonce**
- ⭐ **Notes en direct** à chaque défilé (costumes, maillot, robes, grand oral) — la candidate « sur scène » s'affiche sur tous les téléphones
- ⚡ **Paris éclair** lancés pendant l'émission (« JPF va-t-il se tromper de prénom ? »…)
- 😍 **Réactions** émojis qui s'envolent sur tous les écrans
- 🎉 **Annonces plein écran** à chaque qualifiée et pour le verdict, avec les points gagnés
- 🏆 **Classement** en temps réel, coup de cœur de la famille et **palmarès** humoristique de fin de soirée
- 📺 **Écran TV** à projeter dans le salon (`/tv`)
- 🎬 **Régie** pour la personne qui anime (`/admin`, protégée par un code)

## Lancer en local (mode démo)

```bash
npm install
npm run dev
```

Ouvre http://localhost:5173. Sans configuration Supabase, l'appli tourne en **mode démo** : les données restent dans le navigateur (pratique pour tester avec plusieurs onglets). Code de la régie en démo : `0000`.

## Mise en ligne (≈ 15 minutes, gratuit)

### 1. Base de données — Supabase
1. Crée un compte sur https://supabase.com puis un **nouveau projet** (région Europe, ex. Paris/Francfort).
2. Menu **SQL Editor › New query** : colle le contenu de [`supabase/schema.sql`](supabase/schema.sql) et clique **Run**.
3. Choisis ton code admin (dans le même SQL Editor) :
   ```sql
   update admin_settings set pin = 'ton-code-secret';
   ```
4. Menu **Project Settings › API** : note l'**URL** et la clé **anon public**.

### 2. Hébergement — Vercel
1. Pousse ce dépôt sur GitHub, puis sur https://vercel.com : **Add New › Project** et importe le dépôt.
2. Dans **Environment Variables**, ajoute `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.
3. **Le nom du projet Vercel devient le lien** : choisis-le court et facile à dicter, par exemple `miss-famille` → `miss-famille.vercel.app`.
4. Deploy. C'est en ligne !

> 💡 Pour un lien encore plus simple, tu peux brancher un nom de domaine à toi (Vercel › Settings › Domains).

## Partager le lien (sans QR code)

- Dans l'appli, bouton **📣 Inviter** : partage natif du téléphone, **WhatsApp**, **SMS**, **e-mail** ou copie du lien.
- Le lien est aussi affiché en grand sur l'**écran TV**.
- Le lien est court (`miss-famille.vercel.app`) : il se dicte à voix haute ou s'écrit sur un papier.
- Si quelqu'un change de téléphone : **Régie › Joueurs › 🔗** copie son lien de reconnexion personnel.

## Ajouter les photos officielles

Dès que les portraits officiels sont publiés :

Des photos provisoires (diaporama 20 Minutes) sont déjà en place dans `public/photos/`. Pour les remplacer :

1. Dépose les images dans un dossier `photos-src/` à la racine (le nom de fichier doit contenir la région, ex. `Miss-Alsace.jpg`).
2. `npm run photos` → elles sont recadrées, compressées et rangées dans `public/photos/`.
3. Redéploie (commit + push). Sans photo, une vignette colorée avec les initiales de la région s'affiche.

> ⚠️ Les photos officielles appartiennent à la société Miss France / TF1 : garde l'appli pour un usage privé (elle est déjà exclue des moteurs de recherche).

## Le soir J — mode d'emploi de la régie

| Moment de l'émission | Dans la régie |
|---|---|
| Avant 21 h 10 | Étape « Avant l'émission » : tout le monde découvre les Miss et commence son grand pronostic |
| Début du show | **Suivante** → « Ouverture » (pronostics toujours modifiables) |
| Défilé des costumes | Étape Costumes, puis **Suivante ›** dans « Sur scène » à chaque passage |
| Annonce du Top 15 | Passe à cette étape **juste avant** l'annonce (→ grands pronostics verrouillés), puis touche chaque candidate **au moment où elle est annoncée** |
| Maillot / robes | Étape suivante + « Sur scène » |
| Annonce du Top 5 | Passe à cette étape **juste avant** l'annonce (→ Top 5 verrouillés), puis touche les 5 finalistes |
| Grand oral | Étape « Grand oral » |
| Verdict | Passe à cette étape **juste avant** l'annonce (→ classements verrouillés), puis révèle la 4e dauphine, la 3e… jusqu'à Miss France 👑 |
| Après | Étape « Palmarès » : classement final et récompenses |

À tout moment : **Paris éclair** (questions toutes prêtes ou personnalisées), puis « Donner la réponse ».

### Check-list avant le 12 décembre
- [ ] Faire une **répétition** à 3-4 personnes (Régie › Zone sensible › Remettre à zéro ensuite)
- [ ] ⚠️ Un projet Supabase gratuit se **met en pause après 7 jours sans activité** : ouvre l'appli (ou le tableau de bord Supabase) dans les jours qui précèdent et **le jour J dans l'après-midi**
- [ ] Envoyer le lien la veille pour que chacun fasse ses pronostics à l'avance
- [ ] Brancher un ordinateur sur la télé avec `/tv` (ou une 2e télé / tablette)
- [ ] Vérifier le Wi-Fi pour les invités

## Barème

| Niveau | Modifiable jusqu'à | Points |
|---|---|---|
| Top 15 | l'annonce du Top 15 | +1 par demi-finaliste trouvée |
| Top 5 | l'annonce du Top 5 | +3 par finaliste trouvée |
| Classement final | le verdict | +10 pour Miss France à la bonne place, +3 par dauphine à la bonne place |
| Paris éclair | fermeture du pari | selon le pari |

Le barème se modifie dans [`src/lib/scoring.ts`](src/lib/scoring.ts).

## Technique

React 19 + Vite + TypeScript · Supabase (Postgres, temps réel) · hébergement statique Vercel.
Toutes les écritures passent par des fonctions SQL qui vérifient les règles (étape en cours, code admin) : personne ne peut modifier son pronostic après coup.

```bash
npm test         # tests du calcul des points et des étapes
npm run build    # build de production
```
