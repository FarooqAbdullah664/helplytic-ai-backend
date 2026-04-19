const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { createRequest, getRequests, getRequestById, offerHelp, solveRequest } = require('../controllers/requestController');
router.route('/').get(getRequests).post(protect, createRequest);
router.route('/:id').get(getRequestById);
router.patch('/:id/help', protect, offerHelp);
router.patch('/:id/solve', protect, solveRequest);
module.exports = router;
