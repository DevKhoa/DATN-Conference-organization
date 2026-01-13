const cmsService = require('../services/cmsService');

// POST /cms/partners
exports.createPartner = async (req, res) => {
    try {
        const { conference_id, partner_name, logo_url, website_url, sponsorship_level } = req.body;
        
        if (!conference_id || !partner_name) {
            return res.status(400).json({ message: 'Thiếu conference_id hoặc partner_name' });
        }

        const result = await cmsService.createPartner({ 
            conference_id, partner_name, logo_url, website_url, sponsorship_level 
        });

        res.status(201).json(result);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
};

// GET /cms/partners?conf_id=1
exports.getPartners = async (req, res) => {
    try {
        const { conf_id } = req.query;
        const result = await cmsService.getPartners(conf_id);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// POST /cms/news
exports.createNews = async (req, res) => {
    try {
        const { conference_id, title, body_content, content_type, scheduled_publish_time, is_published, user_id } = req.body;

        if (!conference_id || !title || !content_type) {
            return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
        }

        const result = await cmsService.createNews({
            conference_id, title, body_content, content_type, 
            scheduled_publish_time, is_published, created_by: user_id
        });

        res.status(201).json(result);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
};

// GET /cms/news?conf_id=1
exports.getNews = async (req, res) => {
    try {
        const { conf_id } = req.query;
        const result = await cmsService.getNews(conf_id);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};