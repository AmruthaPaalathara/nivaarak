const express = require('express');
const router = express.Router();
const { submitPriorityApplication, getAllPriorityApplications, updatePriorityStatus } = require('../../controllers/application/priorityApplicationController');

router.post('/submit', submitPriorityApplication);
router.get('/all', getAllPriorityApplications);
router.put('/update-status/:id', updatePriorityStatus);

module.exports = router;