const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');

/**
 * @swagger
 * tags:
 *   name: Sessions
 *   description: Quản lý phiên họp hội nghị
 */

/**
 * @swagger
 * /sessions:
 *   get:
 *     summary: Lấy danh sách phiên họp
 *     tags: [Sessions]
 *     parameters:
 *       - in: query
 *         name: conf_id
 *         schema:
 *           type: integer
 *         description: Lọc theo ID hội nghị (Optional)
 *     responses:
 *       200:
 *         description: Thành công
 *   post:
 *     summary: Tạo phiên họp mới
 *     tags: [Sessions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               session_name:
 *                 type: string
 *                 example: "Phiên Khai Mạc"
 *               start_time:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-06-10T08:00:00Z"
 *               end_time:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-06-10T11:30:00Z"
 *               location_id:
 *                 type: integer
 *                 example: 1
 *               conference_id:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Tạo thành công
 *       400:
 *         description: Lỗi logic ngày giờ hoặc ID không hợp lệ
 */

router.get('/', sessionController.getSessions);
router.post('/', sessionController.createSession);

/**
 * @swagger
 * /sessions/{id}:
 *   put:
 *     summary: Cập nhật thông tin phiên họp
 *     tags: [Sessions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               session_name:
 *                 type: string
 *               start_time:
 *                 type: string
 *                 format: date-time
 *               end_time:
 *                 type: string
 *                 format: date-time
 *               location_id:
 *                 type: integer
 *               conference_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy phiên họp
 */

router.put('/:id', sessionController.updateSession);

/**
 * @swagger
 * /sessions/{id}/add-paper:
 *   put:
 *     summary: Gán bài báo vào phiên họp
 *     tags: [Sessions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID của phiên họp
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paper_id:
 *                 type: integer
 *                 example: 120
 *               presentation_order:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Gán thành công
 *       400:
 *         description: Bài báo đã tồn tại trong phiên hoặc ID không đúng
 */

router.put('/:id/add-paper', sessionController.addPaper);

module.exports = router;
