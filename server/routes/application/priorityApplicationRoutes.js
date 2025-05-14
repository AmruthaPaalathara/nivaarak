const express = require('express');
const router = express.Router();
const { submitPriorityApplication, getAllPriorityApplications, updatePriorityStatus } = require('../../controllers/application/priorityApplicationController');
const {isAdmin} = require('../../middleware/rbac');
const { authenticateJWT } = require('../../middleware/authenticationMiddleware/authMiddleware');

router.post('/submit', submitPriorityApplication);
router.get('/all', getAllPriorityApplications);
router.put('/update-status/:id', authenticateJWT(), isAdmin, updatePriorityStatus);

module.exports = router;