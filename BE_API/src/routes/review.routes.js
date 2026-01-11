const express = require('express');
const router = express.Router();
const controller = require('../controllers/review.controller');

/**
 * @openapi
 * /reviewers:
 *   get:
 *     summary: Get list of reviewers
 *     tags: [Reviews]
 *     responses:
 *       200:
 *         description: List of reviewers
 */
router.get('/reviewers', controller.getReviewers);

/**
 * @openapi
 * /reviews/assign:
 *   post:
 *     summary: Assign reviewer to paper
 *     tags: [Reviews]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             required: [paper_id, reviewer_id, assigned_by]
 *             properties:
 *               paper_id:
 *                 type: integer
 *               reviewer_id:
 *                 type: integer
 *               assigned_by:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Reviewer assigned
 */
router.post('/reviews/assign', controller.assignReviewer);

/**
 * @openapi
 * /reviewer/dashboard:
 *   get:
 *     summary: Reviewer dashboard
 *     tags: [Reviews]
 *     parameters:
 *       - in: query
 *         name: reviewer_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Assigned papers
 */
router.get('/reviewer/dashboard', controller.reviewerDashboard);

/**
 * @openapi
 * /reviews/submit:
 *   post:
 *     summary: Submit review
 *     tags: [Reviews]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             required: [paper_id, reviewer_id, score, recommendation]
 *             properties:
 *               paper_id:
 *                 type: integer
 *               reviewer_id:
 *                 type: integer
 *               score:
 *                 type: number
 *               recommendation:
 *                 type: string
 *                 enum: [ACCEPT, REJECT, WEAK_ACCEPT, REVISION]
 *               comments:
 *                 type: string
 *     responses:
 *       201:
 *         description: Review submitted
 */
router.post('/reviews/submit', controller.submitReview);

/**
 * @openapi
 * /reviews/summary:
 *   get:
 *     summary: Review summary for chair
 *     tags: [Reviews]
 *     parameters:
 *       - in: query
 *         name: paper_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Review summary
 */
router.get('/reviews/summary', controller.reviewSummary);

module.exports = router;
