const express = require('express');
const router = express.Router();
const controller = require('../controllers/proceedings.controller');

/**
 * @openapi
 * /proceedings/generate:
 *   post:
 *     summary: Generate proceedings list for a specific conference
 *     tags:
 *       - Proceedings
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - conference_id
 *             properties:
 *               conference_id:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: List of papers
 */
router.post('/proceedings/generate', controller.generate);

/**
 * @openapi
 * /proceedings/doi:
 *   post:
 *     summary: Assign DOI to a paper
 *     tags:
 *       - Proceedings
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paper_id
 *               - doi
 *             properties:
 *               paper_id:
 *                 type: integer
 *               doi:
 *                 type: string
 *                 example: "10.1234/icai.2026.101"
 *     responses:
 *       200:
 *         description: DOI assigned
 */
router.post('/proceedings/doi', controller.assignDoi);

/**
 * @openapi
 * /proceedings/export:
 *   get:
 *     summary: Export proceedings PDF for a conference
 *     tags:
 *       - Proceedings
 *     parameters:
 *       - in: query
 *         name: conference_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the conference to export
 *     responses:
 *       200:
 *         description: Download URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 file_type:
 *                   type: string
 *                 download_url:
 *                   type: string
 */
router.get('/proceedings/export', controller.export);

module.exports = router;
