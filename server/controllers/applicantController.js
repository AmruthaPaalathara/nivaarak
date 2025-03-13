//handles user registeration, and retrieving registered applicants in the express.js backend
//registers a new applcant and fetches all registered applicants

const Applicant = require("../models/applicantSchema"); //imports applicantschema from models (used to interact with the model)

// Register a new applicant
exports.registerApplicant = async (req, res) => { //async function to register a new applicant. handles user registeration process
  try {
    const { first_name, last_name, username, email, password } = req.body; //from request body, it handles firstname,lastname,username,email,password
    const fullName = `${first_name} ${last_name}`; //

    const newApplicant = new Applicant({ name: fullName, username, email, password });
    await newApplicant.save();
    res.status(201).json({ message: "User registered successfully!" });
  } catch (error) {
    res.status(500).json({ error: "Failed to register user" });
  }
};

// Fetch all registered applicants
exports.getApplicants = async (req, res) => {
  try {
    const applicants = await Applicant.find();
    res.json(applicants);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
};
