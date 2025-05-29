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
    "phone",
     "salary",
     "bank_statement",
     "property_ownership",
     "caste_proof",
        "wedding_invitation",
        "marriage_declaration",
        "age_proof",
        "factory_layout",
        "rent_agreement",
        "technical_specification"

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
        "phone": fake.msisdn()[:10],
        "salary": fake.random_int(min=10000, max=200000),
                "bank_statement": f"{fake.random_int(min=1000, max=50000)} INR",
                "property_ownership": fake.random_element(["Owned", "Rented"]),
                "caste_proof": fake.random_element(["General", "OBC", "SC", "ST"]),
                "wedding_invitation": fake.random_element(["Available", "Not Available"]),
                "marriage_declaration": fake.random_element(["Signed", "Not Signed"]),
                "age_proof": fake.random_element(["Passport", "Birth Certificate", "Aadhaar"]),
                "factory_layout": fake.random_element(["Approved", "Pending"]),
                "rent_agreement": fake.random_element(["Signed", "Not Signed"]),
                "technical_specification": fake.random_element(["Provided", "Not Provided"])
            })

    })

with open(csv_path, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=fields)
    writer.writeheader()
    writer.writerows(rows)

print(f"Written {len(rows)} rows to {csv_path}")
