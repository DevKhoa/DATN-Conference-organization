const express = require('express');
const router = express.Router();
const agendaController = require('../controllers/agendaController');

/**
 * @swagger
 * tags:
 *   name: Agenda
 *   description: Quản lý lịch trình (Draft, Comment, Approve, Public View)
 */

/**
 * @swagger
 * /agenda/draft:
 *   post:
 *     summary: Tạo bản nháp lịch trình (Tăng version)
 *     tags: [Agenda]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - conference_id
 *               - user_id
 *             properties:
 *               conference_id:
 *                 type: integer
 *                 example: 1
 *               user_id:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Tạo draft thành công
 *       400:
 *         description: Thiếu dữ liệu hoặc ID hội nghị/user không tồn tại
 *       500:
 *         description: Lỗi server
 */
router.post('/draft', agendaController.createDraft);


/**
 * @swagger
 * /agenda/comment:
 *   post:
 *     summary: Gửi góp ý cho bản nháp
 *     tags: [Agenda]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - draft_id
 *               - user_id
 *               - comment_text
 *             properties:
 *               draft_id:
 *                 type: integer
 *               user_id:
 *                 type: integer
 *               comment_text:
 *                 type: string
 *     responses:
 *       201:
 *         description: Gửi góp ý thành công
 *       400:
 *         description: Thiếu thông tin bắt buộc
 *       404:
 *         description: Không tìm thấy draft_id hoặc user_id
 */
router.post('/comment', agendaController.addComment);

/**
 * @swagger
 * /agenda/comments/{draftId}:
 *   get:
 *     summary: Lấy danh sách góp ý của một draft
 *     tags: [Agenda]
 *     parameters:
 *       - in: path
 *         name: draftId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Danh sách góp ý
 */
router.get('/comments/:draftId', agendaController.getComments);

/**
 * @swagger
 * /agenda/approve:
 *   post:
 *     summary: Duyệt và chốt lịch trình (is_final = TRUE)
 *     tags: [Agenda]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - draft_id
 *             properties:
 *               draft_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Đã duyệt lịch trình
 *       400:
 *         description: Thiếu draft_id
 *       404:
 *         description: Không tìm thấy bản nháp để duyệt
 */
router.post('/approve', agendaController.approveDraft);

/**
 * @swagger
 * /agenda/public:
 *   get:
 *     summary: Xem lịch trình chính thức
 *     tags: [Agenda]
 *     parameters:
 *       - in: query
 *         name: conf_id
 *         required: true
 *         description: ID hội nghị cần xem
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lịch trình chi tiết
 *       404:
 *         description: Có 2 trường hợp - "Không tìm thấy Hội nghị" HOẶC "Lịch trình chưa công bố"
 */
router.get('/public', agendaController.getPublicAgenda);

module.exports = router;
