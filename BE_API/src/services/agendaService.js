const agendaRepository = require('../repositories/agendaRepository');

// Biến lưu Cache đơn giản (Lưu trong RAM của server)
// Cấu trúc: { "conf_1": { data: [...], timestamp: 123456789 } }
let agendaCache = {};
const CACHE_DURATION = 60 * 1000; // Cache tồn tại trong 60 giây

const createDraft = async (data) => {
    const { conference_id, user_id } = data;
    return await agendaRepository.createDraft(conference_id, user_id);
};

const addComment = async (data) => {
    const { draft_id, user_id, comment_text } = data;
    return await agendaRepository.addComment(draft_id, user_id, comment_text);
};

const getComments = async (draftId) => {
    return await agendaRepository.getCommentsByDraft(draftId);
};

const approveDraft = async (draftId) => {
    const result = await agendaRepository.approveDraft(draftId);
    
    // Quan trọng: Khi duyệt mới, phải XÓA CACHE cũ để người dùng thấy cái mới ngay
    // (Ở đây ta chưa biết conf_id nên có thể clear all hoặc query thêm để clear đúng key. 
    // Tạm thời để đơn giản ta reset toàn bộ cache để đảm bảo tính đúng đắn)
    agendaCache = {}; 
    
    return result;
};

const getPublicAgenda = async (conferenceId) => {
    // 1. Kiểm tra Cache trước (Ưu tiên tốc độ)
    const cacheKey = `conf_${conferenceId}`;
    const now = Date.now();
    if (agendaCache[cacheKey] && (now - agendaCache[cacheKey].timestamp < CACHE_DURATION)) {
        console.log(`[LOG] Trả về dữ liệu từ Cache cho Conference ${conferenceId}`);
        return agendaCache[cacheKey].data;
    }

    // 2. CHECK 1: Kiểm tra Hội nghị có tồn tại không?
    const isExist = await agendaRepository.checkConferenceExists(conferenceId);
    if (!isExist) {
        throw new Error('CONFERENCE_NOT_FOUND'); // Ném mã lỗi riêng để Controller bắt
    }

    // 3. CHECK 2: Kiểm tra xem đã có bản Final chưa
    const finalDraft = await agendaRepository.getFinalDraft(conferenceId);
    if (!finalDraft) {
        throw new Error('AGENDA_NOT_PUBLISHED'); // Ném mã lỗi riêng
    }

    // 4. Nếu đủ điều kiện -> Query DB lấy dữ liệu
    const agendaData = await agendaRepository.getAgendaDetails(conferenceId);

    // 5. Lưu Cache
    agendaCache[cacheKey] = {
        data: agendaData,
        timestamp: now
    };
    console.log(`[LOG] Query DB và lưu Cache mới cho Conference ${conferenceId}`);

    return agendaData;
};

module.exports = {
    createDraft,
    addComment,
    getComments,
    approveDraft,
    getPublicAgenda
};