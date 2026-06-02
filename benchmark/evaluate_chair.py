import os
import sys
import re
import ast
import json
import numpy as np
import pandas as pd
from dotenv import load_dotenv
import serpapi
from k_means_constrained import KMeansConstrained
from google import genai
from google.genai import types

# Add server/src to path to import schema and prompts
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../server/src")))
from packages.schema import ScholarAuthor

# Load env
load_dotenv(os.path.join(os.path.dirname(__file__), "../server/.env"))

# Fix Google Credentials path
creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
if creds_path and not os.path.isabs(creds_path):
    absolute_creds_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../server/src", creds_path))
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = absolute_creds_path

client = genai.Client()
EMBEDDING_MODEL = "gemini-embedding-001"
TEXT_MODEL = "gemini-3-flash-preview"
SERP_API_KEY = os.environ.get("SERP_API_KEY")

try:
    with open(os.path.join(os.path.dirname(__file__), "../server/Prompts/session_title_giver.txt"), "r", encoding="utf-8") as f:
        SESSION_TITLE_GIVER = f.read()
except FileNotFoundError:
    SESSION_TITLE_GIVER = "You are a helpful assistant. Please generate a concise session title for these papers."

try:
    with open(os.path.join(os.path.dirname(__file__), "../server/Prompts/scholar_prompt.txt"), "r", encoding="utf-8") as f:
        SCHOLAR_PROMPT = f.read()
except FileNotFoundError:
    # Fallback just in case
    SCHOLAR_PROMPT = "Analyze the articles and infer the research fields, directions, and themes."

CACHE_FILE = os.path.join(os.path.dirname(__file__), "cache_scholars.json")

def get_embeddings(texts, task_type="CLUSTERING"):
    response = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=texts,
        config=types.EmbedContentConfig(task_type=task_type)
    )
    return [np.array(e.values) for e in response.embeddings]

def generate_session_title(paper_titles):
    paper_list_str = "\n".join([f"- {t}" for t in paper_titles])
    try:
        response = client.models.generate_content(
            model=TEXT_MODEL,
            contents=f"Papers in Session:\n {paper_list_str}",
            config=types.GenerateContentConfig(
                system_instruction=SESSION_TITLE_GIVER,
            )
        )
        return response.text.strip()
    except Exception as e:
        return "General Session"

def get_main_category(cat_str):
    try:
        cats = ast.literal_eval(cat_str)
        if isinstance(cats, list) and len(cats) > 0:
            return set(cats)
    except:
        pass
    return set(["Unknown"])

def compute_cosine_similarity(vec1, vec2):
    return np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))

def is_match(session_cats, chair_keywords):
    c_keys = [k.lower() for k in chair_keywords]
    for s_cat in session_cats:
        s_cat_clean = s_cat.lower().replace("&", "").replace("processing", "").strip()
        for word in s_cat_clean.split():
            if len(word) > 3:
                for k in c_keys:
                    if word in k:
                        return True
    return False

def process_chair_via_scholar(chair_url, chair_name):
    # Same logic as routers/users.py import_scholar_profile
    m = re.search(r"user=([^&]+)", chair_url)
    author_id = m.group(1) if m else None
    
    if not author_id:
        print(f"  [ERROR] Invalid URL for {chair_name}")
        return None
        
    print(f"  Fetching SerpApi for {chair_name} ({author_id})...")
    params = {
        "engine": "google_scholar_author",
        "author_id": author_id,
        "api_key": SERP_API_KEY
    }
    
    api_response = serpapi.search(params)
    if 'error' in api_response:
        print(f"  [ERROR] SerpApi Error: {api_response['error']}")
        return None
        
    author_info = api_response.get('author', {})
    articles_list = api_response.get('articles', [])
    
    if not author_info:
        return None

    author_affiliations = author_info.get('affiliations', 'None')
    interests = [interest['title'] for interest in author_info.get('interests', [])]
    
    articles = [{'title': article.get('title'), 'venues': article.get('publication')} for article in articles_list] 
    articles_str = json.dumps(articles, indent=2)

    print(f"  Analyzing articles using Gemini for {chair_name}...")
    AI_response = client.models.generate_content(
        model=TEXT_MODEL,
        contents=[SCHOLAR_PROMPT, articles_str],
        config={
            "response_mime_type": "application/json",
            "response_schema": ScholarAuthor,
        },
    )
    
    research_bio = json.loads(AI_response.text)

    articles_md = '\n'.join([
        f"- [{article.get('title', 'No title')}]({article.get('link', '#')}) — {article.get('publication', 'Unknown venue')}"
        for article in articles_list
    ])

    author_profile = f"""
        ## {chair_name.upper()}

        **Affiliations:** {author_affiliations}

        ### Research Interests
        {', '.join(interests).title()}

        ### Research Fields
        {'\n'.join([f"- {field}" for field in research_bio.get('research_fields', [])])}

        ### Research Directions
        {'\n'.join([f"- {direction}" for direction in research_bio.get('research_directions', [])])}

        ### Research Themes
        {'\n'.join([f"- {theme}" for theme in research_bio.get('research_themes', [])])}

        ### Articles
        {articles_md}
        """.strip()

    cleaned_text = '\n'.join([line.strip() for line in author_profile.strip().split('\n')])
    return cleaned_text

def main():
    print("=== Chair Recommendation Benchmark (Real Google Scholar Data) ===\n")
    
    # 1. Load chairs from chair.txt
    chairs = []
    with open(os.path.join(os.path.dirname(__file__), "../chair.txt"), "r", encoding="utf-8") as f:
        lines = [line.strip() for line in f if line.strip()]
        
    for i in range(0, len(lines), 3):
        if i + 2 < len(lines):
            name_part = lines[i]
            url_part = lines[i+2]
            
            name, keywords = name_part.split(":", 1)
            name = name.strip()
            keywords = keywords.strip()
            url = url_part.replace("->", "").strip()
            
            chairs.append({
                "name": name,
                "ground_truth_categories": [k.strip().lower() for k in keywords.split(",")],
                "url": url
            })
            
    # 2. Load Cache or Fetch from API
    cache = {}
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            cache = json.load(f)
            
    print(f"Loaded {len(chairs)} chairs. Processing via Scholar...")
    for chair in chairs:
        if chair["name"] in cache:
            chair["profile_text"] = cache[chair["name"]]
        else:
            profile_text = process_chair_via_scholar(chair["url"], chair["name"])
            if profile_text:
                cache[chair["name"]] = profile_text
                chair["profile_text"] = profile_text
            else:
                chair["profile_text"] = chair["name"] + " " + " ".join(chair["ground_truth_categories"])
                
    # Save cache
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)
        
    # Get Chair Embeddings
    print("\nRequesting Embeddings for Scholar Profiles...")
    chair_texts = [c["profile_text"] for c in chairs]
    chair_embeddings = get_embeddings(chair_texts, task_type="SEMANTIC_SIMILARITY")
    for i, c in enumerate(chairs):
        c["embedding"] = chair_embeddings[i]
        
    # 3. Clustering Papers
    print("\nReading papers and precomputing paper embeddings...")
    df_papers = pd.read_csv(os.path.join(os.path.dirname(__file__), "../riel_paper_ncate.csv"))
    df_papers["label_set"] = df_papers["categories"].apply(get_main_category)
    df_papers["text_for_embed"] = df_papers["title"].fillna("") + " " + df_papers["abstract"].fillna("")
    
    all_paper_texts = df_papers["text_for_embed"].tolist()
    all_paper_embeddings = get_embeddings(all_paper_texts, task_type="CLUSTERING")
    df_papers["embedding"] = all_paper_embeddings
    
    n_sessions = 5
    min_papers = 5
    max_papers = 15
    
    print("\n--- Running 1 Iteration ---")
    df_sample = df_papers.head(60)
    X = np.array(df_sample["embedding"].tolist())
    
    clf = KMeansConstrained(
        n_clusters=n_sessions,
        size_min=min_papers,
        size_max=max_papers,
        random_state=42
    )
    clf.fit(X)
    df_sample["cluster_id"] = clf.labels_
    
    # 4. Generate Sessions
    sessions = []
    for cluster_idx in range(n_sessions):
        cluster_papers = df_sample[df_sample['cluster_id'] == cluster_idx]
        paper_titles = cluster_papers['title'].tolist()
        
        session_title = generate_session_title(paper_titles)
        
        # Accumulate all labels for evaluation
        session_categories = set()
        for cats in cluster_papers['label_set']:
            session_categories.update(cats)
            
        context_parts = [f"Session Context: {session_title}"]
        paper_list = []
        for _, row in cluster_papers.iterrows():
            context_parts.append(f"Paper Title: {row['title']}. Abstract: {row['abstract']}")
            cats_str = ", ".join(list(row['label_set']))
            paper_list.append(f"      - {row['title']} | Categories: [{cats_str}]")
            
        session_context = "\n".join(context_parts)[:8000]
        
        sessions.append({
            "id": cluster_idx,
            "title": session_title,
            "context": session_context,
            "categories": session_categories,
            "paper_list": paper_list
        })
        
    print("\nRequesting Embeddings for Sessions...")
    session_contexts = [s["context"] for s in sessions]
    session_embeddings = get_embeddings(session_contexts, task_type="SEMANTIC_SIMILARITY")
    
    hits_top1 = 0
    hits_top3 = 0
    
    print("\n================= EVALUATION REPORT =================")
    for i, s in enumerate(sessions):
        s["embedding"] = session_embeddings[i]
        
        similarities = []
        for chair in chairs:
            sim = compute_cosine_similarity(s["embedding"], chair["embedding"])
            similarities.append((chair, sim))
            
        similarities.sort(key=lambda x: x[1], reverse=True)
        top3_chairs = similarities[:3]
        
        match_top1 = is_match(s['categories'], top3_chairs[0][0]["ground_truth_categories"])
        match_top3 = any(is_match(s['categories'], c[0]["ground_truth_categories"]) for c in top3_chairs)
        
        if match_top1: hits_top1 += 1
        if match_top3: hits_top3 += 1
        
        print(f"\n[Session {s['id']}]: {s['title']}")
        print("  [Papers]:")
        for paper_str in s["paper_list"]:
            print(paper_str)
            
        print("\n  [Top Recommended Chairs (Real Scholar Profiles)]:")
        for rank, (chair, sim) in enumerate(top3_chairs):
            print(f"    {rank+1}. {chair['name']} (Sim: {sim:.4f})")
            print(f"       Ground Truth Exp: {', '.join(chair['ground_truth_categories'])}")
            
        print(f"  -> Top 1 Match: {match_top1}, Top 3 Match: {match_top3}")
        
    p1 = hits_top1 / n_sessions
    p3 = hits_top3 / n_sessions
    print("\n===========================================")
    print(f"Precision@1: {p1:.4f}")
    print(f"Precision@3: {p3:.4f}")
    print("===========================================\n")

if __name__ == "__main__":
    main()
