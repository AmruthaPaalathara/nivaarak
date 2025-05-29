import faiss
import numpy as np
import pandas as pd
from sentence_transformers import SentenceTransformer
import sys
import json
import os
import time

start_time = time.time()

try:
    # === Setup Paths ===
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    faiss_dir = os.path.normpath(os.path.join(BASE_DIR, "..", "..", "faiss_index"))
    data_dir = os.path.normpath(os.path.join(BASE_DIR, "..", "..", "..", "data"))
    os.environ["TRANSFORMERS_CACHE"] = "D:/PG/Trimester-6/Project/nivaarak/cache"

    # === Load Model ===
    model = SentenceTransformer("all-MiniLM-L6-v2")

    # === Load Query ===
    if len(sys.argv) < 2:
        raise ValueError("Missing input query.")
    query = sys.argv[1]
    query_vec = model.encode([query], convert_to_numpy=True).astype("float32")
    query_vec = query_vec / np.linalg.norm(query_vec, axis=1, keepdims=True)

    # === Paths ===
    app_index_path = os.path.join(faiss_dir, "applicants.index")
    rule_index_path = os.path.join(faiss_dir, "rules.index")
    rule_json_path = os.path.join(faiss_dir, "rules_text.json")
    applicants_csv_path = os.path.join(data_dir, "applicants_master2.csv")

    for path in [app_index_path, rule_index_path, rule_json_path, applicants_csv_path]:
        if not os.path.exists(path):
            raise FileNotFoundError(f"Missing file: {path}")

    # === Load Applicants ===
    app_df = pd.read_csv(applicants_csv_path)
    app_texts = app_df.apply(lambda row: ", ".join(f"{col}: {row[col]}" for col in row.index), axis=1).tolist()
    app_index = faiss.read_index(app_index_path)
    app_score, app_id = app_index.search(query_vec, 1)

    # === Load Rules ===
    with open(rule_json_path, "r", encoding="utf-8") as f:
        rule_texts_map = json.load(f)
    rule_index = faiss.read_index(rule_index_path)
    rule_score, rule_id = rule_index.search(query_vec, 1)

    # === Fetch Results ===
    best_app_text = app_texts[app_id[0][0]] if app_id[0][0] != -1 else "No matching applicant found."
    best_rule_text = rule_texts_map.get(str(rule_id[0][0]), "No matching rule found.")
    combined = f"Rule: {best_rule_text}\nDocument: {best_app_text}"

    # === Output JSON ONLY ===
    result = {
        "rule_text": best_rule_text,
        "rule_score": float(rule_score[0][0]),
        "applicant_text": best_app_text,
        "applicant_score": float(app_score[0][0]),
        "combined_context": combined,
        "time_taken_sec": round(time.time() - start_time, 2)
    }

    print(json.dumps(result))  # ✅ This is the ONLY output

except Exception as e:
    print(json.dumps({ "error": str(e) }))
    sys.exit(1)
