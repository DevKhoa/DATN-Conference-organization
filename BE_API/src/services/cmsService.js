const cmsRepository = require('../repositories/cmsRepository');

// --- PARTNER ---
const createPartner = async (data) => {
    // Có thể thêm validate partner_name tại đây
    return await cmsRepository.createPartner(data);
};

const getPartners = async (confId) => {
    return await cmsRepository.getPartners(confId);
};

// --- NEWS ---
const createNews = async (data) => {
    const { content_type } = data;
    // Validate Enum content_type theo DB
    const validTypes = ['CFP', 'AGENDA', 'VENUE', 'POST_EVENT_MAIL'];
    if (!validTypes.includes(content_type)) {
        throw new Error('Loại nội dung không hợp lệ (Phải là: CFP, AGENDA, VENUE, POST_EVENT_MAIL)');
    }
    
    const rawResult = await cmsRepository.createNews(data);
    
    // Format lại response
    return {
        content_id: rawResult.content_id,
        title: rawResult.title,
        status: rawResult.is_published ? 'PUBLISHED' : 'DRAFT',
        // Trả thêm vài field để dễ debug
        content_type: rawResult.content_type,
        created_at: rawResult.scheduled_publish_time
    };
};

const getNews = async (confId) => {
    return await cmsRepository.getNews(confId);
};

module.exports = {
    createPartner,
    getPartners,
    createNews,
    getNews
};