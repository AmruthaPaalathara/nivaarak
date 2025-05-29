const express = require('express');
const router = express.Router();
const { submitPriorityApplication, getAllPriorityApplications, updatePriorityStatus } = require('../../controllers/application/priorityApplicationController');
const {isAdmin} = require('../../middleware/rbac');
const { authenticateJWT } = require('../../middleware/authenticationMiddleware/authMiddleware');

// 💥 SMOKE TEST
router.get('/__test', (req, res) => {
    return res.json({ ok: true, timestamp: Date.now() });
});

router.get('/all', authenticateJWT(), isAdmin, getAllPriorityApplications);
router.put('/update-status/:id', authenticateJWT(),  isAdmin, updatePriorityStatus);

module.exports = router;