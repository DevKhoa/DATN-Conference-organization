import os
import sys
import re
import ast
import json
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from k_means_constrained import KMeansConstrained
from google import genai
from google.genai import types

# Add server/src to path to import utils
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../server/src")))

# Load env
load_dotenv(os.path.join(os.path.dirname(__file__), "../server/.env"))

# Fix Google Credentials path before importing utils
creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
if creds_path and not os.path.isabs(creds_path):
    absolute_creds_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../server/src", creds_path))
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = absolute_creds_path

from packages.utils import supabase_client

client = genai.Client()
EMBEDDING_MODEL = "gemini-embedding-001"
TEXT_MODEL = "gemini-3-flash-preview"

try:
    with open(os.path.join(os.path.dirname(__file__), "../server/Prompts/session_title_giver.txt"), "r", encoding="utf-8") as f:
        SESSION_TITLE_GIVER = f.read()
except FileNotFoundError:
    SESSION_TITLE_GIVER = "You are a helpful assistant. Please generate a concise session title for these papers."

def get_embeddings(texts, task_type="CLUSTERING"):
    response = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=texts,
        config=types.EmbedContentConfig(
            task_type=task_type,
            output_dimensionality=1536
        )
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

def parse_vector(vec_data):
    if isinstance(vec_data, list):
        return np.array(vec_data)
    elif isinstance(vec_data, str):
        try:
            return np.array(ast.literal_eval(vec_data))
        except:
            return np.array([float(x) for x in vec_data.strip("[]").split(",")])
    return None

def main():
    print("=== Chair Recommendation Benchmark (Using Supabase Database) ===\n")
    
    # 1. Load ground truth chairs from chair.txt
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
                "url": url,
                "embedding": None
            })
            
    # 2. Fetch profiles from Supabase DB
    print(f"Fetching profiles from Supabase database...")
    response = supabase_client.table("profiles").select("full_name, description_embed").execute()
    db_profiles = response.data
    
    # Match database profiles to chair.txt
    for chair in chairs:
        matched = False
        for db_prof in db_profiles:
            if db_prof.get("full_name") and chair["name"].lower() == db_prof["full_name"].lower():
                embed_data = db_prof.get("description_embed")
                if embed_data:
                    chair["embedding"] = parse_vector(embed_data)
                    matched = True
                break
        if not matched:
            print(f"  [WARNING] Could not find embedding for {chair['name']} in database!")
            
    # Remove chairs that we couldn't find embeddings for
    chairs = [c for c in chairs if c["embedding"] is not None]
    print(f"Loaded embeddings for {len(chairs)} chairs from the database.\n")
    
    # 3. Clustering Papers
    print("Reading papers and precomputing paper embeddings...")
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
            
        print("\n  [Top Recommended Chairs (From Database)]:")
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
