import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib
from sklearn.model_selection import cross_val_score
import os

# 1. Load
df = pd.read_csv("data/training_data.csv")
X = df.drop(columns=["eligible"])
y = df["eligible"]

# 2. Split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# 3. Train
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

scores = cross_val_score(model, X, y, cv=5)
print("5-fold CV accuracy:", scores, "mean:", scores.mean())

# 4. Evaluate
y_pred = model.predict(X_test)
print(classification_report(y_test, y_pred))

# 5. Save
os.makedirs("model", exist_ok=True)
joblib.dump(model, "model/rf_verifier.pkl")
print("Model saved to model/rf_verifier.pkl")
