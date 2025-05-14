import sys, json, joblib
import pandas as pd

# 1. Load the trained model once
model = joblib.load("model/rf_verifier.pkl")

def main():
    # 2. Read feature dict from stdin
    features = json.loads(sys.stdin.read())
    df = pd.DataFrame([features])

    # 3. Predict eligibility and probability
    pred = model.predict(df)[0]
    prob = float(model.predict_proba(df)[0][pred])

    # 4. Output JSON
    print(json.dumps({"eligible": bool(pred), "confidence": prob}))

if __name__ == "__main__":
    main()
