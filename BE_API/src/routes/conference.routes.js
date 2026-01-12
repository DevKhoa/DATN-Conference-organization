const express = require('express');
const router = express.Router();
const controller = require('../controllers/conference.controller');

/**
 * @openapi
 * /conferences:
 *   post:
 *     summary: Create a new conference
 *     tags:
 *       - Conferences
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - conf_name
 *             properties:
 *               conf_name:
 *                 type: string
 *                 example: International Data Science Conference
 *               start_date:
 *                 type: string
 *                 format: date
 *                 example: 2026-06-01
 *               end_date:
 *                 type: string
 *                 format: date
 *                 example: 2026-06-03
 *               location:
 *                 type: string
 *                 example: Ho Chi Minh City
 *     responses:
 *       201:
 *         description: Conference created successfully
 */
router.post('/', controller.createConference);

/**
 * @openapi
 * /conferences/{id}:
 *   get:
 *     summary: Get conference detail
 *     tags:
 *       - Conferences
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Conference ID
 *     responses:
 *       200:
 *         description: Conference detail
 *       404:
 *         description: Conference not found
 */
router.get('/:id', controller.getConferenceById);

/**
 * @openapi
 * /conferences/{id}:
 *   put:
 *     summary: Update conference information
 *     tags:
 *       - Conferences
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Conference ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               conf_name:
 *                 type: string
 *                 example: Updated Conference Name
 *               start_date:
 *                 type: string
 *                 format: date
 *                 example: 2026-06-05
 *               end_date:
 *                 type: string
 *                 format: date
 *                 example: 2026-06-07
 *               location:
 *                 type: string
 *                 example: Hanoi
 *     responses:
 *       200:
 *         description: Conference updated successfully
 *       404:
 *         description: Conference not found
 */
router.put('/:id', controller.updateConference);

/**
 * @openapi
 * /conferences/{id}/status:
 *   patch:
 *     summary: Change conference status
 *     tags:
 *       - Conferences
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Conference ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [DRAFT, PUBLISHED, CLOSED]
 *                 example: PUBLISHED
 *     responses:
 *       200:
 *         description: Conference status updated
 *       400:
 *         description: Invalid status
 *       404:
 *         description: Conference not found
 */
router.patch('/:id/status', controller.updateConferenceStatus);

/**
 * @openapi
 * /conferences/{id}/overview:
 *   get:
 *     summary: Get conference overview
 *     tags:
 *       - Conferences
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Conference ID
 *     responses:
 *       200:
 *         description: Conference overview
 *       404:
 *         description: Conference not found
 */
router.get('/:id/overview', controller.getConferenceOverview);

module.exports = router;
