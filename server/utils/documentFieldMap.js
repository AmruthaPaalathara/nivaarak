const expectedFields = {
    "Birth Certificate": ["dob", "father_name", "mother_name", "place_of_birth"],
    "Death Certificate": ["dob", "name", "death_date"],
    "Income Certificate": ["income", "dob", "aadhar", "address"],
    "Domicile Certificate": ["aadhar", "address", "school_name"],
    "Caste Certificate": ["caste", "aadhar", "address"],
    "Agricultural Certificate": ["land_area", "aadhar", "address"],
    "Non- Creamy Layer": ["caste", "income", "aadhar"],
    "Property Documents": ["property_id", "owner_name", "aadhar"],
    "Marriage Certificates": ["spouse1_name", "spouse2_name", "marriage_date"],
    "Senior Citizen Certificate": ["dob", "aadhar"],
    "Solvency Certificate": ["property_value", "bank_balance"],
    "Shop and Establishment Registration": ["electricity_bill", "rent_agreement"],
    "Contract Labour License": ["employer_name", "business_name"],
    "Factory Registration Certificate": ["factory_name", "layout_plan"],
    "Boiler Registration Certificate": ["technical_spec", "manufacturer_approval"],
    "Landless Certificate": ["aadhar", "revenue_status"],
    "New Water Connection": ["land_proof", "aadhar"],
};

module.exports = expectedFields;
