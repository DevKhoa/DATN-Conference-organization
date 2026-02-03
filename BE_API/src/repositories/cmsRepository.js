const db = require('../config/db');

// --- PHẦN PARTNERS ---
const createPartner = async (data) => {
    const { conference_id, partner_name, logo_url, website_url, sponsorship_level } = data;
    const query = `
        INSERT INTO partners (conference_id, partner_name, logo_url, website_url, sponsorship_level)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
    `;
    const result = await db.query(query, [conference_id, partner_name, logo_url, website_url, sponsorship_level]);
    return result.rows[0];
};

const getPartners = async (conferenceId) => {
    const query = `SELECT * FROM partners WHERE conference_id = $1 ORDER BY partner_id DESC`;
    const result = await db.query(query, [conferenceId]);
    return result.rows;
};

// --- PHẦN CMS NEWS ---
const createNews = async (data) => {
    const { conference_id, title, body_content, content_type, scheduled_publish_time, is_published, created_by } = data;
    const query = `
        INSERT INTO cms_contents 
        (conference_id, title, body_content, content_type, scheduled_publish_time, is_published, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
    `;
    const values = [conference_id, title, body_content, content_type, scheduled_publish_time, is_published || false, created_by];
    const result = await db.query(query, values);
    return result.rows[0];
};

const getNews = async (conferenceId) => {
    // Chỉ lấy các tin đã Published hoặc chưa publish nhưng người xem là Admin (Logic này xử lý ở Service sau, ở đây cứ lấy hết)
    const query = `
        SELECT * FROM cms_contents 
        WHERE conference_id = $1 
    `;
    const result = await db.query(query, [conferenceId]);
    return result.rows;
};

module.exports = {
    createPartner,
    getPartners,
    createNews,
    getNews
};