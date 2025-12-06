import streamlit as st
import pandas as pd
import os # Nécessaire pour vérifier l'existence des fichiers si besoin, bien que st.image gère l'absence de fichier.

# --- CONFIGURATION ---
st.set_page_config(page_title="Miss France 2026 👑", layout="wide", page_icon="👑")

# List of 30 Candidates (Based on 2025 regions)
CANDIDATES = [
    "Alsace", "Aquitaine", "Auvergne", "Bourgogne", "Bretagne", "Centre-Val de Loire",
    "Champagne-Ardenne", "Corse", "Côte d'Azur", "Franche-Comté", "Guadeloupe", "Guyane",
    "Île-de-France", "Languedoc", "Limousin", "Lorraine", "Martinique", "Mayotte",
    "Midi-Pyrénées", "Nord-Pas-de-Calais", "Normandie", "Pays de la Loire", "Picardie",
    "Poitou-Charentes", "Provence", "Réunion", "Rhône-Alpes", "Roussillon",
    "Tahiti"
]

CANDIDATES_IMG = [
    "alsace", "aquitaine", "auvergne", "bourgogne", "bretagne", "centre-val-de-loire",
    "champagne-ardenne", "corse", "cote-azur", "franche-comte", "guadeloupe", "guyane",
    "ile-de-france", "languedoc", "limousin", "lorraine", "martinique", "mayotte",
    "midi-pyrenees", "nord-pas-de-calais", "normandie", "pays-de-la-loire", "picardie",
    "poitou-charentes", "provence", "reunion", "rhone-alpes", "roussillon",
    "tahiti"
]

# Initialize Session State to store votes in memory
if 'family_votes' not in st.session_state:
    st.session_state['family_votes'] = {}
if 'official_results' not in st.session_state:
    st.session_state['official_results'] = {"top12": [], "top5": [], "winner": None}

# --- SIDEBAR: USER LOGIN ---
# Assurez-vous d'avoir le fichier logo-MF.png dans le même dossier que votre script
logo_path = f"logo-MF.png"
try:
    st.sidebar.image("public/logo-MF.png", width=150)
except FileNotFoundError:
    st.sidebar.info("Mettez votre fichier 'logo-MF.png' à la racine.")

st.sidebar.title("Nouvel utilisateur 👤")
user_name = st.sidebar.text_input("Entrez votre prénom:", placeholder="ex: Sandra, Jolie Maman")

# --- MAIN APP ---
st.title("🇫🇷 Bienvenue à la soirée Miss France 2026 👑")
st.markdown(f"**Utilisateur actuel :** {user_name if user_name else 'Guest'}")

# --- AJOUT DU NOUVEL ONGLETS ---
tab_gala, tab_notation, tab_predictions, tab_scores, tab_officiel, tab_podium = st.tabs([
    "📸 Gala des Miss",
    "💃 Noter les miss",
    "🔮 Prédictions", 
    "📊 Scores", 
    "🏆 Résultats officiels", 
    "🥇 Podium"
])

# --- NOUVEL ONGLETS 1 : GALA DES MISS ---
with tab_gala:
    st.header("✨ Les candidates Miss France 2026")
    st.info("Parcourez le profil de chaque Miss")
    
    # Définir le nombre de colonnes (par exemple, 4 images par ligne)
    NUM_COLS = 5
    
    # Créer les colonnes et parcourir les candidates
    # On utilise un itérateur de colonnes pour distribuer les images
    cols = st.columns(NUM_COLS)
    
    for index, candidate in enumerate(CANDIDATES_IMG):
        # Déterminer la colonne actuelle
        col_index = index % NUM_COLS
        col = cols[col_index]
        
        # Le chemin d'accès à l'image dans le dossier "public"
        # Streamlit recherche les fichiers dans le dossier principal ou le dossier "static" / "public"
        # Si vos images sont dans un dossier nommé "public" à la racine de votre projet, 
        # le chemin doit être simplement le nom du fichier.
        # Assurez-vous que les noms des fichiers correspondent exactement aux régions (ex: "Alsace.jpg")
        image_path = f"public/{candidate}.jpeg"
        
        with col:
            st.image(image_path, caption=candidate, width="content")
            # Ajout du nom de la région sous l'image
            #st.markdown(f"**Région :** **{CANDIDATES[index]}**")
            st.markdown("---") # Séparateur pour les profils


# --- TAB 2: RATINGS (Bikini & Costume) ---
with tab_notation:
    st.header("Noter la performance")
    if user_name:
        st.info("Regardez l'émission et notez les miss en direct !")
        
        # Select a candidate to rate
        candidate_to_rate = st.selectbox("Choisir une candidate:", CANDIDATES)
        
        col1, col2, col3 = st.columns(3)
        with col1:
            bikini_score = st.slider(f"👙 {candidate_to_rate} - Passage en bikini", 0, 5, 3)
        with col2:
            costume_score = st.slider(f"🎭 {candidate_to_rate} - Costume régional", 0, 5, 3)
        with col3:
            talk_score = st.slider(f"🎭 {candidate_to_rate} - Éloquence", 0, 5, 3)
            
        if st.button("Enregistrer mes notes"):
            if user_name not in st.session_state['family_votes']:
                st.session_state['family_votes'][user_name] = {'ratings': {}, 'predictions': {}}
            
            st.session_state['family_votes'][user_name]['ratings'][candidate_to_rate] = {
                'bikini': bikini_score,
                'costume': costume_score,
                'talk': talk_score,
                'total': bikini_score + costume_score + talk_score
            }
            st.success(f"Notes enregistrées pour {candidate_to_rate} !")
    else:
        st.warning("Entrez d'abord votre prénom dans la colonne à gauche de l'écran.")

# --- TAB 3: PREDICTIONS (Top 12 & 5) ---
with tab_predictions:
    st.header("Faites vos prédictions")
    if user_name:
        st.write("Qui sera la gagnante ? (Devinez avant le vote des juges !)")
        
        # Initialize user dict if needed
        if user_name not in st.session_state['family_votes']:
            st.session_state['family_votes'][user_name] = {'ratings': {}, 'predictions': {}}
            
        current_preds = st.session_state['family_votes'][user_name].get('predictions', {})

        # Top 12 Input
        top12_guess = st.multiselect(
            "Sélectionnez votre Top 12:", 
            CANDIDATES, 
            default=current_preds.get('top12', []),
            max_selections=12
        )
        
        # Top 5 Input
        top5_guess = st.multiselect(
            "Sélectionnez votre Top 5:", 
            top12_guess, # Can only select from previously chosen top 12
            default=current_preds.get('top5', []),
            max_selections=5
        )

        # Winner Input
        winner_guess = st.selectbox(
            "Qui sera couronnée MISS FRANCE 2026 ?", 
            top5_guess if top5_guess else CANDIDATES,
            index=None,
            placeholder="Sélectionnez la gagnante"
        )

        if st.button("Enregistrer mes prédictions 🔒"):
            st.session_state['family_votes'][user_name]['predictions'] = {
                'top12': top12_guess,
                'top5': top5_guess,
                'winner': winner_guess
            }
            st.balloons()
            st.success("Prédictions enregistrées !")
    else:
        st.warning("Entrez d'abord votre prénom dans la colonne à gauche de l'écran.")

# --- TAB 4: VIEW FAMILY SCORES ---
with tab_scores:
    st.header("Tableau des scores")
    st.write("Découvrez les notes de chacun")
    
    # Aggregate data
    data = []
    for member, votes in st.session_state['family_votes'].items():
        for region, scores in votes['ratings'].items():
            # Correction: 'eloquence' n'était pas défini dans le dictionnaire de ratings, il faut utiliser 'talk'
            # Assurez-vous que le score existe avant de l'ajouter
            talk_score_val = scores.get('talk', 0) 
            data.append({
                "Membre": member,
                "Région": region,
                "Bikini": scores['bikini'],
                "Costume": scores['costume'],
                "Éloquence": talk_score_val,
                "Total": scores['total']
            })
    
    if data:
        df = pd.DataFrame(data)
        st.dataframe(df.style.background_gradient(cmap='Oranges', subset=['Total']), use_container_width=True)
        
        # Pivot table for easier viewing
        st.subheader("Tableau de comparaison")
        # Correction: 'Region' dans le pivot doit être 'Région'
        pivot = df.pivot_table(index="Région", columns="Membre", values="Total")
        st.dataframe(pivot)
    else:
        st.info("Pas encore de votes enregistrés.")

# --- TAB 5: OFFICIAL RESULTS (Admin) ---
with tab_officiel:
    st.header("🔴 Espace admin: Entrez les vrais résultats")
    st.warning("Désignez une personne qui entrera les scores réels durant l'émission !")
    
    real_top12 = st.multiselect("Top 12 Officiel :", CANDIDATES, key="real_12", max_selections=12)
    real_top5 = st.multiselect("Top 5 Officiel :", real_top12, key="real_5", max_selections=5)
    real_winner = st.selectbox("Gagnante officielle :", real_top5 if real_top5 else CANDIDATES, key="real_win", index=None)
    
    if st.button("Mettre à jour les résultats officiels"):
        st.session_state['official_results'] = {
            "top12": real_top12,
            "top5": real_top5,
            "winner": real_winner
        }
        st.success("Résultats mis à jour !")

# --- TAB 6: PODIUM (Game Results) ---
with tab_podium:
    st.header("🏆 Podium")
    st.markdown("Qui a obtenu le meilleur score ? (Points pour les réponses correctes)")
    
    official = st.session_state['official_results']
    
    if not official['top12']:
        st.info("En attente des résultats officiels...")
    else:
        scores = []
        for member, data in st.session_state['family_votes'].items():
            preds = data.get('predictions', {})
            points = 0
            details = []
            
            # 1 Point for each correct Top 12
            correct_12 = set(preds.get('top12', [])) & set(official['top12'])
            points += len(correct_12) * 1
            
            # 3 Points for each correct Top 5
            correct_5 = set(preds.get('top5', [])) & set(official['top5'])
            points += len(correct_5) * 3
            
            # 10 Points for correct Winner
            if preds.get('winner') == official['winner'] and official['winner'] is not None:
                points += 10
                details.append("Gagnante trouvée ! (+10)")
            
            scores.append({"Membre": member, "Points": points, "Top 12 correct": len(correct_12), "Top 5 correct": len(correct_5)})
            
        leaderboard = pd.DataFrame(scores).sort_values(by="Points", ascending=False)
        
        # Display Podium
        if not leaderboard.empty:
            # Correction: 'Player' n'existe pas, il faut utiliser 'Membre'
            winner_name = leaderboard.iloc[0]['Membre']
            st.success(f"🎉 Le/La gagnant(e) est **{winner_name}** ! 🎉")
            st.table(leaderboard)
            
            if st.button("Bravo !"):
                st.balloons()