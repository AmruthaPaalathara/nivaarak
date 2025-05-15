
const express = require('express');
const router  = express.Router();
const {
    submitPriorityApplication,
    getAllPriorityApplications,
    updatePriorityStatus
} = require('../../controllers/application/priorityApplicationController');

// POST   /api/priority-applications/submit
router.post('/submit', submitPriorityApplication);

// GET    /api/priority-applications
router.get('/', getAllPriorityApplications);

// PATCH  /api/priority-applications/:id/status
router.patch('/:id/status', updatePriorityStatus);

module.exports = router;
