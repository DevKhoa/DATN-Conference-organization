import os
import ast
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from k_means_constrained import KMeansConstrained
from sklearn.metrics import adjusted_rand_score, normalized_mutual_info_score
from google import genai
from google.genai import types

# Load API key from server/.env
load_dotenv(os.path.join(os.path.dirname(__file__), "../server/.env"))

# Fix Google Credentials path if it's relative (since it's relative to server/src/)
creds_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
if creds_path and not os.path.isabs(creds_path):
    absolute_creds_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../server/src", creds_path))
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = absolute_creds_path

client = genai.Client()
EMBEDDING_MODEL = "gemini-embedding-001"
TEXT_MODEL = "gemini-3-flash-preview"

# Load prompts
try:
    with open(os.path.join(os.path.dirname(__file__), "../server/Prompts/session_title_giver.txt"), "r", encoding="utf-8") as f:
        SESSION_TITLE_GIVER = f.read()
except FileNotFoundError:
    SESSION_TITLE_GIVER = "You are a helpful assistant. Please generate a concise session title for these papers."

def get_embeddings(texts, task_type="CLUSTERING"):
    print(f"Requesting embeddings for {len(texts)} items (task: {task_type})...")
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
        print(f"Error generating title: {e}")
        return "General Session"

def compute_cosine_similarity(vec1, vec2):
    return np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))

def is_match(session_cat, chair_keywords):
    s_cat = session_cat.lower().replace("&", "").replace("processing", "").strip()
    c_keys = [k.lower() for k in chair_keywords]
    for word in s_cat.split():
        if len(word) > 3:
            for k in c_keys:
                if word in k:
                    return True
    return False

def get_main_category(cat_str):
    try:
        cats = ast.literal_eval(cat_str)
        if isinstance(cats, list) and len(cats) > 0:
            return cats[0] 
    except:
        pass
    return "Unknown"

def main():
    print("=== Setup: Precomputing Base Embeddings ===")
    
    # 1. Read All Papers
    df_papers = pd.read_csv(os.path.join(os.path.dirname(__file__), "../riel_paper_ncate.csv"))
    df_papers["label"] = df_papers["categories"].apply(get_main_category)
    df_papers["text_for_embed"] = df_papers["title"].fillna("") + " " + df_papers["abstract"].fillna("")
    
    # Pre-embed all papers to save API calls in the loop
    all_paper_texts = df_papers["text_for_embed"].tolist()
    all_paper_embeddings = get_embeddings(all_paper_texts, task_type="CLUSTERING")
    df_papers["embedding"] = all_paper_embeddings

    # 2. Read and embed chairs
    chairs = []
    with open(os.path.join(os.path.dirname(__file__), "../chair.txt"), "r", encoding="utf-8") as f:
        for line in f:
            if ":" in line:
                name, keywords = line.strip().split(":", 1)
                chairs.append({"name": name.strip(), "keywords": keywords.strip()})
                
    chair_texts = [f"{c['name']} expertise: {c['keywords']}" for c in chairs]
    print(f"Loaded {len(chairs)} chairs. Getting embeddings for chairs...")
    chair_embeddings = get_embeddings(chair_texts, task_type="SEMANTIC_SIMILARITY")
    
    for i, c in enumerate(chairs):
        c["embedding"] = chair_embeddings[i]
        c["ground_truth_categories"] = [k.strip().lower() for k in c["keywords"].split(",")]

    # Accumulators for metrics
    total_iterations = 10
    n_sessions = 3
    min_papers = 5
    max_papers = 8
    
    sum_ari = 0
    sum_nmi = 0
    sum_p1 = 0
    sum_p3 = 0
    
    print("\n=== Starting 10x Shuffle Benchmark ===")
    
    for iter_idx in range(total_iterations):
        print(f"\n--- Iteration {iter_idx + 1}/{total_iterations} ---")
        
        # Shuffle and pick 20
        df_sample = df_papers.sample(n=20, random_state=iter_idx).reset_index(drop=True)
        
        X = np.array(df_sample["embedding"].tolist())
        
        # Clustering
        clf = KMeansConstrained(
            n_clusters=n_sessions,
            size_min=min_papers,
            size_max=max_papers,
            random_state=42 + iter_idx
        )
        clf.fit(X)
        df_sample["cluster_id"] = clf.labels_
        
        true_labels = df_sample["label"].tolist()
        pred_labels = df_sample["cluster_id"].tolist()
        
        iter_ari = adjusted_rand_score(true_labels, pred_labels)
        iter_nmi = normalized_mutual_info_score(true_labels, pred_labels)
        
        sum_ari += iter_ari
        sum_nmi += iter_nmi
        
        print(f"Clustering -> ARI: {iter_ari:.4f}, NMI: {iter_nmi:.4f}")
        
        # Build sessions
        sessions = []
        for cluster_idx in range(n_sessions):
            cluster_papers = df_sample[df_sample['cluster_id'] == cluster_idx]
            paper_titles = cluster_papers['title'].tolist()
            
            dominant_category = cluster_papers['label'].mode()[0].lower()
            session_title = generate_session_title(paper_titles)
            
            context_parts = [f"Session Context: {session_title}"]
            paper_list = []
            for _, row in cluster_papers.iterrows():
                context_parts.append(f"Paper Title: {row['title']}. Abstract: {row['abstract']}")
                paper_list.append({"title": row['title'], "cat": row['label']})
            session_context = "\n".join(context_parts)[:8000]
            
            sessions.append({
                "id": cluster_idx,
                "title": session_title,
                "context": session_context,
                "true_category": dominant_category,
                "num_papers": len(cluster_papers),
                "paper_list": paper_list
            })
            
        # Get embeddings for these 3 sessions
        session_contexts = [s["context"] for s in sessions]
        session_embeddings = get_embeddings(session_contexts, task_type="SEMANTIC_SIMILARITY")
        
        iter_hits_top1 = 0
        iter_hits_top3 = 0
        
        for i, s in enumerate(sessions):
            s["embedding"] = session_embeddings[i]
            
            similarities = []
            for chair in chairs:
                sim = compute_cosine_similarity(s["embedding"], chair["embedding"])
                similarities.append((chair, sim))
                
            similarities.sort(key=lambda x: x[1], reverse=True)
            top3_chairs = similarities[:3]
            
            match_top1 = is_match(s['true_category'], top3_chairs[0][0]["ground_truth_categories"])
            match_top3 = any(is_match(s['true_category'], c[0]["ground_truth_categories"]) for c in top3_chairs)
            
            if match_top1: iter_hits_top1 += 1
            if match_top3: iter_hits_top3 += 1
            
            if iter_idx == 0: # Only print details for the first iteration to avoid console spam
                print(f"\n  Session {s['id']}: {s['title']} (True Cat: {s['true_category']}, Papers: {s['num_papers']})")
                for rank, (chair, sim) in enumerate(top3_chairs):
                    print(f"    {rank+1}. {chair['name']} (Sim: {sim:.4f})")
                    
        iter_p1 = iter_hits_top1 / n_sessions
        iter_p3 = iter_hits_top3 / n_sessions
        
        sum_p1 += iter_p1
        sum_p3 += iter_p3
        
        print(f"Recommendation -> Precision@1: {iter_p1:.4f}, Precision@3: {iter_p3:.4f}")

    print("\n===========================================")
    print("=== FINAL AVERAGE RESULTS (10 ITERATIONS) ===")
    print(f"Average ARI: {sum_ari / total_iterations:.4f}")
    print(f"Average NMI: {sum_nmi / total_iterations:.4f}")
    print(f"Average Precision@1: {sum_p1 / total_iterations:.4f}")
    print(f"Average Precision@3: {sum_p3 / total_iterations:.4f}")
    print("===========================================\n")

if __name__ == "__main__":
    main()
