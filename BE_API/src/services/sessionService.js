const sessionRepository = require('../repositories/sessionRepository');

const getAllSessions = async (conferenceId) => {
    return await sessionRepository.getAllSessions(conferenceId);
};

const createSession = async (data) => {
    const { start_time, end_time } = data;

    // VALIDATION: Logic nghiệp vụ kiểm tra thời gian
    if (new Date(end_time) <= new Date(start_time)) {
        throw new Error('Thời gian kết thúc phải sau thời gian bắt đầu');
    }

    // Gọi Repository để lưu
    return await sessionRepository.createSession(data);
};

const updateSession = async (id, data) => {
    const { start_time, end_time } = data;

    // VALIDATION: Logic nghiệp vụ kiểm tra thời gian
    if (new Date(end_time) <= new Date(start_time)) {
        throw new Error('Thời gian kết thúc phải sau thời gian bắt đầu');
    }

    return await sessionRepository.updateSession(id, data);
};

const addPaperToSession = async (sessionId, paperId, order) => {
    // Có thể thêm logic: Kiểm tra xem bài báo này đã được gán vào session nào khác chưa?
    return await sessionRepository.addPaperToSession(sessionId, paperId, order);
};

module.exports = {
    getAllSessions,
    createSession,
    updateSession,
    addPaperToSession
};