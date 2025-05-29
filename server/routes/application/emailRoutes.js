const express = require('express');
const router  = express.Router();
const { sendGeneratedPdfs } = require('../../controllers/application/emailController');

router.post('/send-email', sendGeneratedPdfs);

module.exports = router;
