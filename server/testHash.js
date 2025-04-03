const bcrypt = require("bcrypt");

const password = "Ammu@2025";  // 🔹 The password you're testing

bcrypt.hash(password, 10).then(hashedPassword => {
    console.log("Newly Generated Hashed Password:", hashedPassword);
}).catch(err => console.error("Error:", err));
