const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');

/**
 * @swagger
 * tags:
 *   name: Locations
 *   description: Quản lý địa điểm tổ chức
 */

/**
 * @swagger
 * /locations:
 *   get:
 *     summary: Lấy danh sách phòng họp
 *     tags: [Locations]
 *     responses:
 *       200:
 *         description: Thành công
 *   post:
 *     summary: Tạo phòng họp mới
 *     tags: [Locations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               location_name:
 *                 type: string
 *                 example: "Grand Hall A"
 *               capacity:
 *                 type: integer
 *                 example: 500
 *               description:
 *                 type: string
 *                 example: "Có hệ thống âm thanh vòm, máy chiếu 4K"
 *               image_url:              
 *                 type: string
 *                 example: "https://example.com/images/hall-a.jpg"
 *     responses:
 *       201:
 *         description: Tạo thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */

router.get('/', locationController.getLocations);
router.post('/', locationController.createLocation);

module.exports = router;
