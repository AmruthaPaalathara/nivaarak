const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Applicant = require('./models/Registration');

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect('mongodb://localhost:27017/nivaarak');

app.post('/registration', (req, res) => {
  const { first_name, last_name, username, email, password } = req.body;
  const fullName = `${first_name} ${last_name}`;
  
  Applicant.create({ name: fullName, email, password })
      .then(applicant => res.json(applicant))
      .catch(err => res.json(err));
});


app.listen(3001, () => {
  console.log('Server started');
});
