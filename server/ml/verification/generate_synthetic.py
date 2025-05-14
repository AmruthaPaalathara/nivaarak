# server/ml/applicant_gen/generate_applicants.py
import csv, os
from faker import Faker

fake = Faker("en_IN")
out_dir = os.path.abspath(os.path.join(__file__, "..", "..", "..", "data"))
os.makedirs(out_dir, exist_ok=True)
csv_path = os.path.join(out_dir, "applicants_master2.csv")

fields = [
    "first_name",
    "last_name",
    "father_name",
    "mother_name",
    "dob",
    "aadhar_number",
    "pan_number",
    "address",
    "email",
    "phone"
]

rows = []
for _ in range(500):
    fn = fake.first_name()
    ln = fake.last_name()
    rows.append({
        "first_name": fn,
        "last_name": ln,
        "father_name": fake.name(),
        "mother_name": fake.name(),
        "dob": fake.date_of_birth(minimum_age=18, maximum_age=90).strftime("%d-%m-%Y"),
        "aadhar_number": "".join(str(fake.random_digit()) for _ in range(12)),
        "pan_number": (
            "".join(fake.random_uppercase_letter() for _ in range(5)) +
            "".join(str(fake.random_digit()) for _ in range(4)) +
            fake.random_uppercase_letter()
        ),
        "address": fake.address().replace("\n", ", "),
        "email": fake.email(),
        "phone": fake.msisdn()[:10]
    })

with open(csv_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=fields)
    writer.writeheader()
    writer.writerows(rows)

print(f"Written {len(rows)} rows to {csv_path}")
