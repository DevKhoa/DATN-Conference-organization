const agendaService = require('../services/agendaService');

// Create Draft 
exports.createDraft = async (req, res) => {
    try {
        const { conference_id, user_id } = req.body;
        if (!conference_id || !user_id) {
            return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ conference_id và user_id' });
        }
        const result = await agendaService.createDraft({ conference_id, user_id });
        return res.status(201).json({ message: 'Tạo bản nháp thành công', data: result });
    } catch (err) {
        if (err.code === '23503') {
            if (err.detail && err.detail.includes('conference_id')) return res.status(400).json({ message: 'Mã hội nghị không tồn tại' });
            if (err.detail && (err.detail.includes('user_id') || err.detail.includes('created_by'))) return res.status(400).json({ message: 'Mã người dùng không tồn tại' });
        }
        return res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
};

exports.addComment = async (req, res) => {
    try {
        const { draft_id, user_id, comment_text } = req.body;

        // Validation cơ bản
        if (!draft_id || !user_id || !comment_text) {
            return res.status(400).json({ message: 'Thiếu thông tin: draft_id, user_id hoặc nội dung góp ý' });
        }

        const result = await agendaService.addComment({ draft_id, user_id, comment_text });
        
        res.status(201).json({
            message: 'Đã thêm góp ý thành công',
            data: result
        });
    } catch (err) {
        // Bắt lỗi khóa ngoại (Foreign Key Violation)
        if (err.code === '23503') {
            // Postgres trả về err.detail dạng: "Key (draft_id)=(999) is not present in table..."
            if (err.detail && err.detail.includes('draft_id')) {
                return res.status(404).json({ message: 'Không tìm thấy bản nháp (draft_id) này' });
            }
            if (err.detail && err.detail.includes('commenter_id')) { // Trong DB cột là commenter_id
                return res.status(404).json({ message: 'Người dùng (user_id) không tồn tại' });
            }
            return res.status(404).json({ message: 'Dữ liệu tham chiếu không hợp lệ' });
        }
        res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
};

// Get Comments
exports.getComments = async (req, res) => {
    try {
        const { draftId } = req.params;
        const result = await agendaService.getComments(draftId);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
};


exports.approveDraft = async (req, res) => {
    try {
        const { draft_id } = req.body;

        if (!draft_id) {
            return res.status(400).json({ message: 'Vui lòng cung cấp draft_id' });
        }

        const result = await agendaService.approveDraft(draft_id);

        // Nếu Repository trả về undefined/null nghĩa là không có dòng nào được update
        if (!result) {
            return res.status(404).json({ message: 'Không tìm thấy bản nháp để duyệt (Kiểm tra lại draft_id)' });
        }

        res.status(200).json({ message: 'Đã duyệt lịch trình thành công', data: result });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
};

exports.getPublicAgenda = async (req, res) => {
    try {
        const { conf_id } = req.query;
        
        if (!conf_id) {
            return res.status(400).json({ message: 'Vui lòng cung cấp conf_id' });
        }

        const agenda = await agendaService.getPublicAgenda(conf_id);
        
        // CASE 3: Thành công -> Trả về dữ liệu
        res.status(200).json(agenda);

    } catch (err) {
        // CASE 1: Hội nghị không tồn tại
        if (err.message === 'CONFERENCE_NOT_FOUND') {
            return res.status(404).json({ message: 'Không tìm thấy Hội nghị này (ID không tồn tại)' });
        }
        
        // CASE 2: Hội nghị có, nhưng chưa chốt lịch
        if (err.message === 'AGENDA_NOT_PUBLISHED') {
            return res.status(404).json({ message: 'Lịch trình hội nghị này chưa được công bố' });
        }

        // Lỗi server khác
        res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
};