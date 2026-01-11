const sessionService = require('../services/sessionService');

// GET /sessions
exports.getSessions = async (req, res) => {
    try {
        const { conf_id } = req.query; // Lấy filter từ URL
        const sessions = await sessionService.getAllSessions(conf_id);
        return res.status(200).json(sessions);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Lỗi server' });
    }
};

// POST /sessions
exports.createSession = async (req, res) => {
    try {
        // Lấy dữ liệu từ body (bao gồm cả conference_id)
        const { session_name, start_time, end_time, location_id, conference_id } = req.body;

        const newSession = await sessionService.createSession({ 
            session_name, start_time, end_time, location_id, conference_id 
        });

        return res.status(201).json(newSession);
    } catch (err) {
        // Xử lý các loại lỗi cụ thể
        if (err.message === 'Thời gian kết thúc phải sau thời gian bắt đầu') {
            return res.status(400).json({ message: err.message });
        }
        if (err.code === '23503') { // Lỗi Foreign Key (Postgres)
            return res.status(400).json({ message: 'ID Phòng họp hoặc ID Hội nghị không hợp lệ' });
        }
        console.error(err);
        return res.status(500).json({ message: 'Lỗi server khi tạo phiên họp' });
    }
};

// PUT /sessions/:id
exports.updateSession = async (req, res) => {
    try {
        const { id } = req.params;
        const { session_name, start_time, end_time, location_id, conference_id } = req.body;

        const updatedSession = await sessionService.updateSession(id, {
            session_name, start_time, end_time, location_id, conference_id
        });

        if (!updatedSession) {
            return res.status(404).json({ message: 'Không tìm thấy phiên họp' });
        }

        return res.status(200).json(updatedSession);
    } catch (err) {
        if (err.message === 'Thời gian kết thúc phải sau thời gian bắt đầu') {
            return res.status(400).json({ message: err.message });
        }
        if (err.code === '23503') {
            return res.status(400).json({ message: 'ID Phòng họp hoặc ID Hội nghị không hợp lệ' });
        }
        console.error(err);
        return res.status(500).json({ message: 'Lỗi server khi cập nhật' });
    }
};

// PUT /sessions/:id/add-paper
exports.addPaper = async (req, res) => {
    try {
        const { id } = req.params;
        const { paper_id, presentation_order } = req.body;

        const result = await sessionService.addPaperToSession(id, paper_id, presentation_order);
        
        return res.status(200).json({ 
            message: 'Gán bài báo thành công', 
            data: result 
        });
    } catch (err) {
        if (err.code === '23505') { // Duplicate Key
            return res.status(400).json({ message: 'Bài báo này đã được gán vào phiên họp này rồi' });
        }
        if (err.code === '23503') { // Foreign Key
            return res.status(400).json({ message: 'Mã phiên họp hoặc Mã bài báo không tồn tại' });
        }
        console.error(err);
        return res.status(500).json({ message: 'Lỗi server khi gán bài báo' });
    }
};