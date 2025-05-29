
const { parse, differenceInYears } = require("date-fns");

function calculateAge(dobText) {
    try {
        // Expect dobText like "DD-MM-YYYY"
        const dob = parse(dobText, "dd-MM-yyyy", new Date());
        return differenceInYears(new Date(), dob);
    } catch {
        return null;
    }
}

module.exports = { calculateAge };
