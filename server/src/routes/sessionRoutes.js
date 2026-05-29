const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { requireRoomMember } = require('../middleware/roomMemberMiddleware');
const {
	startSession,
	pauseCurrentSession,
	resumeCurrentSession,
	endCurrentSession,
	getRoomSessionState,
	joinCurrentSession,
	leaveCurrentSession,
	getUserSessionHistory,
	getSessionDetails,
} = require('../controllers/sessionController');

const router = express.Router();

router.post('/start', protect, startSession);
router.post('/:id/pause', protect, pauseCurrentSession);
router.post('/:id/resume', protect, resumeCurrentSession);
router.post('/:id/end', protect, endCurrentSession);
router.get('/room/:roomId/current', protect, requireRoomMember, getRoomSessionState);
router.get('/history', protect, getUserSessionHistory);
router.get('/:id/details', protect, getSessionDetails);
router.post('/:id/join', protect, joinCurrentSession);
router.post('/:id/leave', protect, leaveCurrentSession);

module.exports = router;
