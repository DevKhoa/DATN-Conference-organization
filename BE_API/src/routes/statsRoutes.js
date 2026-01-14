const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

/**
 * @swagger
 * tags:
 *   name: Stats
 *   description: Thống kê & báo cáo
 */

/**
 * @swagger
 * /stats/overview:
 *   get:
 *     summary: Thống kê tổng quan
 *     tags: [Stats]
 *     parameters:
 *       - in: query
 *         name: conf_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/overview', statsController.getOverview);

/**
 * @swagger
 * /stats/geo:
 *   get:
 *     summary: Thống kê theo quốc gia
 *     tags: [Stats]
 *     parameters:
 *       - in: query
 *         name: conf_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/geo', statsController.getGeo);

module.exports = router;
