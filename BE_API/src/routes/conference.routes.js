const express = require('express');
const router = express.Router();

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
 *             properties:
 *               name:
 *                 type: string
 *               year:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Conference created successfully
 */
router.post('/', (req, res) => {
  res.status(201).json({ message: 'Conference created' });
});

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
 *     responses:
 *       200:
 *         description: Conference detail
 */
router.get('/:id', (req, res) => {
  res.json({ id: req.params.id });
});

module.exports = router;
