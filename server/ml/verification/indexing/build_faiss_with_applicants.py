import faiss
import numpy as np
import pandas as pd
from sentence_transformers import SentenceTransformer
import os

# === Load Applicant Data ===
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
csv_path = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "..", "data", "applicants_master2.csv"))
df = pd.read_csv(csv_path)
print(f" Loaded {len(df)} applicants")

texts = df.apply(lambda row: ", ".join(f"{col}: {row[col]}" for col in row.index), axis=1).tolist()

# === Embedding ===
model = SentenceTransformer("all-MiniLM-L6-v2")
embeddings = model.encode(texts, convert_to_numpy=True).astype("float32")
faiss.normalize_L2(embeddings)

# === FAISS Index ===
dimension = embeddings.shape[1]
index = faiss.IndexIDMap(faiss.IndexFlatIP(dimension))
ids = np.arange(len(texts)).astype("int64")
index.add_with_ids(embeddings, ids)
print(f" Added {len(ids)} applicant vectors to FAISS index.")

# === Save Output ===
output_dir = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "faiss_index"))
os.makedirs(output_dir, exist_ok=True)
faiss.write_index(index, os.path.join(output_dir, "applicants.index"))

print(f" Saved applicants.index to {output_dir}")
