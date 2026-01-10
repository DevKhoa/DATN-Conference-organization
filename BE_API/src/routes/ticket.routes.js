const express = require('express');
const router = express.Router();
//const authMiddleware = require('../middlewares/auth.middleware');
const ticketController = require('../controllers/ticket.controller');

router.post('/types', ticketController.createType);
router.put('/settings', ticketController.updateSettings);

/*
router.post('/types', authMiddleware, ticketController.createType);
router.put('/settings', authMiddleware, ticketController.updateSettings);
*/

module.exports = router;