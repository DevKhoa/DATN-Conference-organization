const express = require('express');
const router = express.Router();
const cmsController = require('../controllers/cmsController');

/**
 * @swagger
 * tags:
 *   name: CMS
 *   description: Quản lý nội dung (Tin tức & Đối tác)
 */

/**
 * @swagger
 * /cms/news:
 *   post:
 *     summary: Đăng tin CMS ('CFP', 'AGENDA', 'VENUE', 'POST_EVENT_MAIL')
 *     tags: [CMS]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               conference_id:
 *                 type: integer
 *               user_id:
 *                 type: integer
 *               title:
 *                 type: string
 *               body_content:
 *                 type: string
 *               content_type:
 *                 type: string
 *                 enum: [CFP, AGENDA, VENUE, POST_EVENT_MAIL]
 *               is_published:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Tạo tin thành công
 *   get:
 *     summary: Lấy danh sách tin tức
 *     tags: [CMS]
 *     parameters:
 *       - in: query
 *         name: conf_id
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Danh sách tin tức
 */
router.post('/news', cmsController.createNews);
router.get('/news', cmsController.getNews);

/**
 * @swagger
 * /cms/partners:
 *   post:
 *     summary: Thêm đối tác/nhà tài trợ
 *     tags: [CMS]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               conference_id:
 *                 type: integer
 *               partner_name:
 *                 type: string
 *               logo_url:
 *                 type: string
 *                 example: "/uploads/abc.png"
 *               sponsorship_level:
 *                 type: string
 *                 example: "GOLD"
 *     responses:
 *       201:
 *         description: Thêm đối tác thành công
 *   get:
 *     summary: Lấy danh sách đối tác
 *     tags: [CMS]
 *     parameters:
 *       - in: query
 *         name: conf_id
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Danh sách đối tác
 */
router.post('/partners', cmsController.createPartner);
router.get('/partners', cmsController.getPartners);

module.exports = router;
