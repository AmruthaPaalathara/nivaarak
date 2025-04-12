const priorityMap = {
    "Birth Certificate": 1,
    "Pension Documents": 1,
    "Land Records": 1,
    "Income Certificate": 2,
    "Domicile Certificate": 2,
    "Caste Certificate": 2,
    "Marriage Certificate": 3,
    "Property Documents": 3,
    "Educational Certificates": 4,
    "Other": 5
};

const departmentMap = {
    "Birth Certificate": "Registrar Office",
    "Pension Documents": "Pension & Welfare Department",
    "Land Records": "Revenue Department",
    "Income Certificate": "Finance Department",
    "Domicile Certificate": "Home Affairs",
    "Caste Certificate": "Social Welfare Department",
    "Marriage Certificate": "Family Welfare Office",
    "Property Documents": "Land & Property Registration",
    "Educational Certificates": "Education Board",
    "Other": "General Administration"
};

const getPriority = (certificateType) => priorityMap[certificateType] || 5;
const getDepartment = (certificateType) => departmentMap[certificateType] || "General Administration";

module.exports = { getPriority, getDepartment };
