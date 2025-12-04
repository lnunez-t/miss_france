import streamlit as st
import pandas as pd

# --- CONFIGURATION ---
st.set_page_config(page_title="Miss France Family Vote 👑", layout="wide", page_icon="👑")

# List of 30 Candidates (Based on 2025 regions)
CANDIDATES = [
    "Alsace", "Aquitaine", "Auvergne", "Bourgogne", "Bretagne", "Centre-Val de Loire",
    "Champagne-Ardenne", "Corse", "Côte d'Azur", "Franche-Comté", "Guadeloupe", "Guyane",
    "Île-de-France", "Languedoc", "Limousin", "Lorraine", "Martinique", "Mayotte",
    "Midi-Pyrénées", "Nord-Pas-de-Calais", "Normandie", "Pays de la Loire", "Picardie",
    "Poitou-Charentes", "Provence", "Réunion", "Rhône-Alpes", "Roussillon",
    "Saint-Martin/St-Barthélemy", "Tahiti"
]

# Initialize Session State to store votes in memory
if 'family_votes' not in st.session_state:
    st.session_state['family_votes'] = {}
if 'official_results' not in st.session_state:
    st.session_state['official_results'] = {"top12": [], "top5": [], "winner": None}

# --- SIDEBAR: USER LOGIN ---
st.sidebar.image("https://upload.wikimedia.org/wikipedia/fr/thumb/2/26/Miss_France_logo.svg/1200px-Miss_France_logo.svg.png", width=150)
st.sidebar.title("Family Member 👤")
user_name = st.sidebar.text_input("Enter your name:", placeholder="e.g., Dad, Mom, Sarah")

# --- MAIN APP ---
st.title("🇫🇷 Miss France Family Party 👑")
st.markdown(f"**Current User:** {user_name if user_name else 'Guest'}")

tab1, tab2, tab3, tab4, tab5 = st.tabs(["💃 Rate the Walk", "🔮 Predictions", "📊 Family Scores", "🏆 Official Results", "🥇 Podium"])

# --- TAB 1: RATINGS (Bikini & Costume) ---
with tab1:
    st.header("Rate the Performance")
    if user_name:
        st.info("Watch the show and rate the candidates live!")
        
        # Select a candidate to rate
        candidate_to_rate = st.selectbox("Select Candidate:", CANDIDATES)
        
        col1, col2 = st.columns(2)
        with col1:
            bikini_score = st.slider(f"👙 {candidate_to_rate} - Bikini Walk", 0, 5, 3)
        with col2:
            costume_score = st.slider(f"🎭 {candidate_to_rate} - Regional Costume", 0, 5, 3)
            
        if st.button("Save Rating"):
            if user_name not in st.session_state['family_votes']:
                st.session_state['family_votes'][user_name] = {'ratings': {}, 'predictions': {}}
            
            st.session_state['family_votes'][user_name]['ratings'][candidate_to_rate] = {
                'bikini': bikini_score,
                'costume': costume_score,
                'total': bikini_score + costume_score
            }
            st.success(f"Saved scores for {candidate_to_rate}!")
    else:
        st.warning("Please enter your name in the sidebar to vote.")

# --- TAB 2: PREDICTIONS (Top 12 & 5) ---
with tab2:
    st.header("Make your Predictions")
    if user_name:
        st.write("Who will make the cut? (Guess before the judges decide!)")
        
        # Initialize user dict if needed
        if user_name not in st.session_state['family_votes']:
            st.session_state['family_votes'][user_name] = {'ratings': {}, 'predictions': {}}
            
        current_preds = st.session_state['family_votes'][user_name].get('predictions', {})

        # Top 12 Input
        top12_guess = st.multiselect(
            "Select your Top 12:", 
            CANDIDATES, 
            default=current_preds.get('top12', []),
            max_selections=12
        )
        
        # Top 5 Input
        top5_guess = st.multiselect(
            "Select your Top 5:", 
            top12_guess, # Can only select from previously chosen top 12
            default=current_preds.get('top5', []),
            max_selections=5
        )

        # Winner Input
        winner_guess = st.selectbox(
            "Who is your MISS FRANCE 2025?", 
            top5_guess if top5_guess else CANDIDATES,
            index=None,
            placeholder="Select the Winner"
        )

        if st.button("Lock in Predictions 🔒"):
            st.session_state['family_votes'][user_name]['predictions'] = {
                'top12': top12_guess,
                'top5': top5_guess,
                'winner': winner_guess
            }
            st.balloons()
            st.success("Predictions locked!")
    else:
        st.warning("Enter your name in the sidebar first.")

# --- TAB 3: VIEW FAMILY SCORES ---
with tab3:
    st.header("Family Scoreboard")
    st.write("See who liked who the most.")
    
    # Aggregate data
    data = []
    for member, votes in st.session_state['family_votes'].items():
        for region, scores in votes['ratings'].items():
            data.append({
                "Member": member,
                "Region": region,
                "Bikini": scores['bikini'],
                "Costume": scores['costume'],
                "Total": scores['total']
            })
    
    if data:
        df = pd.DataFrame(data)
        st.dataframe(df.style.background_gradient(cmap='Oranges', subset=['Total']), use_container_width=True)
        
        # Pivot table for easier viewing
        st.subheader("Comparison Matrix")
        pivot = df.pivot_table(index="Region", columns="Member", values="Total")
        st.dataframe(pivot)
    else:
        st.info("No ratings submitted yet.")

# --- TAB 4: OFFICIAL RESULTS (Admin) ---
with tab4:
    st.header("🔴 Admin Area: Input Real Results")
    st.warning("Designate one person to update this live during the TV show!")
    
    real_top12 = st.multiselect("Official Top 12:", CANDIDATES, key="real_12", max_selections=12)
    real_top5 = st.multiselect("Official Top 5:", real_top12, key="real_5", max_selections=5)
    real_winner = st.selectbox("Official Winner:", real_top5 if real_top5 else CANDIDATES, key="real_win", index=None)
    
    if st.button("Update Official Results"):
        st.session_state['official_results'] = {
            "top12": real_top12,
            "top5": real_top5,
            "winner": real_winner
        }
        st.success("Results updated!")

# --- TAB 5: PODIUM (Game Results) ---
with tab5:
    st.header("🏆 The Family Podium")
    st.markdown("Who has the most 'Realistic' eye? (Points for correct guesses)")
    
    official = st.session_state['official_results']
    
    if not official['top12']:
        st.info("Waiting for official results to be entered in Tab 4...")
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
                details.append("Guessed Winner! (+10)")
            
            scores.append({"Player": member, "Points": points, "Correct Top 12": len(correct_12), "Correct Top 5": len(correct_5)})
            
        leaderboard = pd.DataFrame(scores).sort_values(by="Points", ascending=False)
        
        # Display Podium
        if not leaderboard.empty:
            winner_name = leaderboard.iloc[0]['Player']
            st.success(f"🎉 The Winner is **{winner_name}**! 🎉")
            st.table(leaderboard)
            
            if st.button("Celebrate Winner"):
                st.balloons()