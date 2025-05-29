import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from pymongo import MongoClient
import os
import json

# === MongoDB Connection ===
client = MongoClient("mongodb://localhost:27017/")
db = client["nivaarak"]
collection = db["documentrules"]

# === Load Rules ===
def load_rules():
    readable = []
    raw_docs = collection.find()
    for doc in raw_docs:
        doc_type = doc.get("docType", "Unknown Certificate")
        required_map = doc.get("requiredDocs", {})
        flat = []
        for group in required_map.values():
            flat.extend(group)
        flat = list(set(flat))
        readable.append(f"{doc_type} requires: {', '.join(flat)}")
    return readable

rules_text = load_rules()
print(f" Loaded {len(rules_text)} document rules.")

# === Embeddings ===
model = SentenceTransformer("all-MiniLM-L6-v2")
embeddings = model.encode(rules_text, convert_to_numpy=True).astype("float32")
faiss.normalize_L2(embeddings)

# === FAISS Index ===
dimension = embeddings.shape[1]
index = faiss.IndexIDMap(faiss.IndexFlatIP(dimension))
ids = np.arange(1000, 1000 + len(rules_text)).astype("int64")
index.add_with_ids(embeddings, ids)
print(f" Added {len(ids)} rule vectors to FAISS index.")

# === Save Output ===
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
output_dir = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "faiss_index"))
os.makedirs(output_dir, exist_ok=True)

faiss.write_index(index, os.path.join(output_dir, "rules.index"))
with open(os.path.join(output_dir, "rules_text.json"), "w", encoding="utf-8") as f:
    json.dump({str(i): txt for i, txt in zip(ids, rules_text)}, f, indent=2)

print(f"Saved rules.index and rules_text.json to {output_dir}")
