import os
import ast
import math
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from k_means_constrained import KMeansConstrained
from google import genai
from google.genai import types

# Load API key
load_dotenv(os.path.join(os.path.dirname(__file__), "../server/.env"))

# Fix Google Credentials path
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

def get_category_set(cat_str):
    try:
        cats = ast.literal_eval(cat_str)
        if isinstance(cats, list):
            return set(cats)
    except:
        pass
    return set(["Unknown"])

def jaccard_similarity(set1, set2):
    if not set1 and not set2:
        return 1.0
    return len(set1.intersection(set2)) / len(set1.union(set2))

def compute_intra_cluster_jaccard(cluster_labels):
    # cluster_labels: list of sets of categories
    if len(cluster_labels) <= 1:
        return 1.0
    
    total_sim = 0
    pairs = 0
    for i in range(len(cluster_labels)):
        for j in range(i + 1, len(cluster_labels)):
            total_sim += jaccard_similarity(cluster_labels[i], cluster_labels[j])
            pairs += 1
    return total_sim / pairs

def compute_cluster_entropy(cluster_labels):
    # Count frequency of each category in the cluster
    category_counts = {}
    total_categories = 0
    for labels in cluster_labels:
        for cat in labels:
            category_counts[cat] = category_counts.get(cat, 0) + 1
            total_categories += 1
            
    if total_categories == 0:
        return 0.0
        
    entropy = 0
    for count in category_counts.values():
        p = count / total_categories
        entropy -= p * math.log2(p)
    return entropy

def compute_bcubed_metrics(all_labels, cluster_assignments):
    # all_labels: list of sets of categories for all items
    # cluster_assignments: list of cluster IDs
    n = len(all_labels)
    
    # Precompute match matrix: match(i, j) = 1 if intersection is not empty else 0
    match_matrix = np.zeros((n, n))
    for i in range(n):
        for j in range(n):
            if len(all_labels[i].intersection(all_labels[j])) > 0:
                match_matrix[i, j] = 1
                
    precisions = []
    recalls = []
    
    for i in range(n):
        # Items in same cluster as i
        same_cluster = [j for j in range(n) if cluster_assignments[i] == cluster_assignments[j]]
        # Items sharing at least one category with i
        share_category = [j for j in range(n) if match_matrix[i, j] == 1]
        
        # Precision for item i
        correct_in_cluster = sum(1 for j in same_cluster if match_matrix[i, j] == 1)
        precisions.append(correct_in_cluster / len(same_cluster))
        
        # Recall for item i
        correct_overall = sum(1 for j in share_category if cluster_assignments[i] == cluster_assignments[j])
        if len(share_category) > 0:
            recalls.append(correct_overall / len(share_category))
        else:
            recalls.append(1.0)
            
    avg_precision = np.mean(precisions)
    avg_recall = np.mean(recalls)
    f1 = 0
    if avg_precision + avg_recall > 0:
        f1 = 2 * avg_precision * avg_recall / (avg_precision + avg_recall)
        
    return avg_precision, avg_recall, f1

def main():
    print("=== Setup: Precomputing Base Embeddings ===")
    
    df_papers = pd.read_csv(os.path.join(os.path.dirname(__file__), "../riel_paper_ncate_temp.csv"))
    df_papers["label_set"] = df_papers["categories"].apply(get_category_set)
    df_papers["text_for_embed"] = df_papers["title"].fillna("") + " " + df_papers["abstract"].fillna("")
    
    all_paper_texts = df_papers["text_for_embed"].tolist()
    all_paper_embeddings = get_embeddings(all_paper_texts, task_type="CLUSTERING")
    df_papers["embedding"] = all_paper_embeddings

    total_iterations = 1
    n_sessions = 5
    min_papers = 5
    max_papers = 15
    
    sum_jaccard = 0
    sum_entropy = 0
    sum_bcubed_p = 0
    sum_bcubed_r = 0
    sum_bcubed_f1 = 0
    
    print("\n=== Starting 10x Shuffle Benchmark for Multi-label Clustering ===")
    
    for iter_idx in range(total_iterations):
        print(f"\n--- Iteration {iter_idx + 1}/{total_iterations} ---")
        
        df_sample = df_papers.head(60)
        X = np.array(df_sample["embedding"].tolist())
        
        clf = KMeansConstrained(
            n_clusters=n_sessions,
            size_min=min_papers,
            size_max=max_papers,
            random_state=42 + iter_idx
        )
        clf.fit(X)
        df_sample["cluster_id"] = clf.labels_
        
        all_labels = df_sample["label_set"].tolist()
        cluster_assignments = df_sample["cluster_id"].tolist()
        
        # 1. Compute BCubed Metrics
        b_p, b_r, b_f1 = compute_bcubed_metrics(all_labels, cluster_assignments)
        
        # 2. Compute Intra-cluster Jaccard and Entropy
        jaccards = []
        entropies = []
        for cluster_idx in range(n_sessions):
            cluster_papers = df_sample[df_sample["cluster_id"] == cluster_idx]
            cluster_labels = cluster_papers["label_set"].tolist()
            jaccards.append(compute_intra_cluster_jaccard(cluster_labels))
            entropies.append(compute_cluster_entropy(cluster_labels))
            
            if iter_idx == 0:
                paper_titles = cluster_papers['title'].tolist()
                session_title = generate_session_title(paper_titles)
                print(f"\n  Cluster {cluster_idx} - Session Title: {session_title}")
                print(f"  Metrics: Jaccard={jaccards[-1]:.4f}, Entropy={entropies[-1]:.4f}")
                print("    [Papers in this cluster]:")
                for _, row in cluster_papers.iterrows():
                    cats_str = ", ".join(list(row['label_set']))
                    print(f"      - {row['title']} | Categories: [{cats_str}]")
                
        avg_jaccard = np.mean(jaccards)
        avg_entropy = np.mean(entropies)
        
        sum_jaccard += avg_jaccard
        sum_entropy += avg_entropy
        sum_bcubed_p += b_p
        sum_bcubed_r += b_r
        sum_bcubed_f1 += b_f1
        
        print(f"BCubed F1: {b_f1:.4f} (P: {b_p:.4f}, R: {b_r:.4f})")
        print(f"Average Intra-cluster Jaccard: {avg_jaccard:.4f}")
        print(f"Average Category Entropy: {avg_entropy:.4f}")

    print("\n===========================================")
    print(f"=== FINAL AVERAGE RESULTS ({total_iterations} ITERATIONS) ===")
    print(f"BCubed Precision: {sum_bcubed_p / total_iterations:.4f}")
    print(f"BCubed Recall: {sum_bcubed_r / total_iterations:.4f}")
    print(f"BCubed F1-Score: {sum_bcubed_f1 / total_iterations:.4f}")
    print(f"Intra-cluster Category Jaccard: {sum_jaccard / total_iterations:.4f} (Higher is better)")
    print(f"Category Entropy per Cluster: {sum_entropy / total_iterations:.4f} (Lower is better)")
    print("===========================================\n")

if __name__ == "__main__":
    main()
