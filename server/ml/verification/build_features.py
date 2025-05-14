import pandas as pd
import random
import os

# 1. Load your “ground truth” applicants
applicants = pd.read_csv("../../data/applicants_master2.csv")

# 2. For each applicant, simulate an “extracted” version
rows = []
for _, user in applicants.iterrows():
    # Randomly decide if each field was extracted correctly
    match_dob      = random.random() < 0.9
    match_aadhaar  = random.random() < 0.9
    match_pan      = random.random() < 0.9
    # …add more fields as needed…

    # Label: only eligible if all matches are True
    eligible = int(match_dob and match_aadhaar and match_pan)

    rows.append({
        "match_dob": match_dob,
        "match_aadhaar": match_aadhaar,
        "match_pan": match_pan,
        # …other match_ fields…
        "eligible": eligible
    })

# 3. Write to CSV
out_dir = os.path.dirname(__file__) + "/data"
os.makedirs(out_dir, exist_ok=True)
pd.DataFrame(rows).to_csv(f"{out_dir}/training_data.csv", index=False)
print("Wrote", len(rows), "rows to training_data.csv")
