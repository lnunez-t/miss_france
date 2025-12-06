import streamlit as st
import pandas as pd
import traceback
import os
import gspread
from google.oauth2.service_account import Credentials

# --- CONFIGURATION PAGE ---
st.set_page_config(page_title="Miss France 2026 👑", layout="wide", page_icon="👑")

# --- CONSTANTES ---
CANDIDATES = [
    "Alsace", "Aquitaine", "Auvergne", "Bourgogne", "Bretagne", "Centre-Val de Loire",
    "Champagne-Ardenne", "Corse", "Côte d'Azur", "Franche-Comté", "Guadeloupe", "Guyane",
    "Île-de-France", "Languedoc", "Limousin", "Lorraine", "Martinique", "Mayotte",
    "Midi-Pyrénées", "Nord-Pas-de-Calais", "Normandie", "Nouvelle Calédonie", "Pays de la Loire", "Picardie",
    "Poitou-Charentes", "Provence", "Réunion", "Rhône-Alpes", "Roussillon",
    "Tahiti"
]

CANDIDATES_IMG = [
    "alsace", "aquitaine", "auvergne", "bourgogne", "bretagne", "centre-val-de-loire",
    "champagne-ardenne", "corse", "cote-azur", "franche-comte", "guadeloupe", "guyane",
    "ile-de-france", "languedoc", "limousin", "lorraine", "martinique", "mayotte",
    "midi-pyrenees", "nord-pas-de-calais", "normandie", "nouvelle-caledonie", "pays-de-la-loire", "picardie",
    "poitou-charentes", "provence", "reunion", "rhone-alpes", "roussillon",
    "tahiti"
]

# --- SESSION STATE INIT ---
if 'family_votes' not in st.session_state:
    st.session_state['family_votes'] = {}
if 'official_results' not in st.session_state:
    st.session_state['official_results'] = {"top12": [], "top5": [], "winner": None}

# --- SIDEBAR ---
st.sidebar.title("Nouvel utilisateur 👤")
user_name = st.sidebar.text_input("Entrez votre prénom:", placeholder="ex: Sandra, Jolie Maman")

# --- LOGO ---
logo_path = "public/logo-MF.png"
if os.path.exists(logo_path):
    st.sidebar.image(logo_path, width=150)
else:
    st.sidebar.info("Mettez votre fichier 'logo-MF.png' dans /public")

# --- SHEET CONFIG ---
SHEET_ID = None
try:
    SHEET_ID = st.secrets["gsheet"]["sheet_id"]
except KeyError:
    st.warning("ID de la feuille Google Sheet non configuré dans secrets.toml")

def get_gspread_client():
    """Renvoie un client gspread si les credentials sont valides, sinon None"""
    try:
        creds_dict = st.secrets["gcp_service_account"]
        creds = Credentials.from_service_account_info(
            creds_dict,
            scopes=["https://www.googleapis.com/auth/spreadsheets"]
        )
        client = gspread.authorize(creds)
        return client
    except Exception as e:
        st.warning("Impossible de se connecter à Google Sheets : vérifie vos secrets.")
        st.text(str(e))
        return None

# --- UTILS ---
def append_vote_to_sheet(sheet_name, row_dict):
    client = get_gspread_client()
    if not client or not SHEET_ID:
        st.error("Impossible d'enregistrer le vote. Feuille ou client manquant.")
        return False
    try:
        sheet = client.open_by_key(SHEET_ID).worksheet(sheet_name)
        headers = sheet.row_values(1)
        values = [row_dict.get(h, "") for h in headers]
        sheet.append_row(values)
        return True
    except Exception as e:
        st.error(f"Erreur lors de l'écriture dans {sheet_name}: {e}")
        return False

def load_sheet_csv(sheet_id, gid=0):
    if not sheet_id:
        return pd.DataFrame()
    url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv&gid={gid}"
    try:
        df = pd.read_csv(url)
        return df
    except Exception as e:
        st.warning("Impossible de charger la Google Sheet via CSV.")
        st.text(str(e))
        return pd.DataFrame()

# --- MAIN APP ---
st.title("🇫🇷 Bienvenue à la soirée Miss France 2026 👑")
st.markdown(f"**Utilisateur actuel :** {user_name if user_name else 'Guest'}")

# --- TABS ---
tab_gala, tab_notation, tab_predictions, tab_scores, tab_officiel, tab_podium = st.tabs([
    "📸 Gala des Miss",
    "💃 Noter les miss",
    "🔮 Prédictions",
    "📊 Scores",
    "🏆 Résultats officiels",
    "🥇 Podium"
])

# --- TAB GALA ---
with tab_gala:
    st.header("✨ Les candidates Miss France 2026")
    NUM_COLS = 5
    cols = st.columns(NUM_COLS)
    for i, candidate in enumerate(CANDIDATES_IMG):
        col = cols[i % NUM_COLS]
        img_path = f"public/{candidate}.jpeg"
        with col:
            if os.path.exists(img_path):
                st.image(img_path, caption=CANDIDATES[i], width="content")
            else:
                st.info(f"Image manquante pour {CANDIDATES[i]}")
            st.markdown("---")

# --- TAB NOTATION ---
with tab_notation:
    st.header("Noter la performance")
    if not user_name:
        st.warning("Entrez d'abord votre prénom")
    else:
        candidate_to_rate = st.selectbox("Choisissez la candidate à noter :", CANDIDATES)
        bikini_score = st.slider("Score Bikini", 0, 10, 5)
        costume_score = st.slider("Score Costume", 0, 10, 5)
        talk_score = st.slider("Score Talk", 0, 10, 5)
        if st.button("Enregistrer mes notes"):
            vote = {
                "Membre": user_name,
                "Région": candidate_to_rate,
                "Bikini": bikini_score,
                "Costume": costume_score,
                "Talk": talk_score,
                "Total": bikini_score + costume_score + talk_score
            }
            if append_vote_to_sheet("Notes", vote):
                st.success(f"Notes enregistrées pour {candidate_to_rate} ! ✅")

# --- TAB PREDICTIONS ---
with tab_predictions:
    st.header("Faites vos prédictions")
    if not user_name:
        st.warning("Entrez d'abord votre prénom")
    elif not SHEET_ID:
        st.warning("Google Sheet non configurée")
    else:
        client = get_gspread_client()
        if client:
            try:
                ws = client.open_by_key(SHEET_ID).worksheet("Predictions")
                records = ws.get_all_records()
                user_preds = next((r for r in records if r["Membre"] == user_name), {})
            except Exception as e:
                st.warning("Impossible de récupérer les prédictions existantes")
                st.text(str(e))
                user_preds = {}
        else:
            user_preds = {}

        top12_guess = st.multiselect("Sélectionnez votre Top 12:", CANDIDATES, default=user_preds.get("top12", []), max_selections=12)
        top5_guess = st.multiselect("Sélectionnez votre Top 5:", top12_guess, default=user_preds.get("top5", []), max_selections=5)
        winner_guess = st.selectbox("Qui sera couronnée MISS FRANCE 2026 ?", top5_guess if top5_guess else CANDIDATES)

        if st.button("Enregistrer mes prédictions 🔒"):
            preds = {
                "Membre": user_name,
                "top12": ",".join(top12_guess),
                "top5": ",".join(top5_guess),
                "winner": winner_guess
            }
            append_vote_to_sheet("Predictions", preds)
            st.success("Prédictions enregistrées ! 🎉")

# --- TAB SCORES ---
with tab_scores:
    st.header("Tableau des scores")
    df = load_sheet_csv(SHEET_ID)
    if not df.empty:
        df['Total'] = pd.to_numeric(df['Total'], errors='coerce').fillna(0).astype(int)
        st.dataframe(df.style.background_gradient(cmap='Oranges', subset=['Total']), use_container_width=True)
        pivot = df.pivot_table(index="Région", columns="Membre", values="Total")
        st.subheader("Tableau de comparaison")
        st.dataframe(pivot)
    else:
        st.info("Pas encore de votes enregistrés.")

# --- TAB OFFICIEL ---
with tab_officiel:
    st.header("🔴 Espace admin: Entrez les vrais résultats")
    real_top12 = st.multiselect("Top 12 Officiel :", CANDIDATES, key="real_12", max_selections=12)
    real_top5 = st.multiselect("Top 5 Officiel :", real_top12, key="real_5", max_selections=5)
    real_winner = st.selectbox("Gagnante officielle :", real_top5 if real_top5 else CANDIDATES, key="real_win")
    if st.button("Mettre à jour les résultats officiels"):
        st.session_state['official_results'] = {"top12": real_top12, "top5": real_top5, "winner": real_winner}
        st.success("Résultats mis à jour !")

# --- TAB PODIUM ---
with tab_podium:
    st.header("🏆 Podium")
    official = st.session_state['official_results']
    if not official['top12']:
        st.info("En attente des résultats officiels...")
    else:
        df = load_sheet_csv(SHEET_ID)
        if df.empty:
            st.info("Pas encore de votes pour calculer le podium")
        else:
            leaderboard = []
            for member in df['Membre'].unique():
                # Pour le moment, les prédictions sont stockées dans la feuille ou st.session_state
                preds = {}
                points = 0
                leaderboard.append({"Membre": member, "Points": points})
            leaderboard_df = pd.DataFrame(leaderboard).sort_values(by="Points", ascending=False)
            if not leaderboard_df.empty:
                st.table(leaderboard_df)
