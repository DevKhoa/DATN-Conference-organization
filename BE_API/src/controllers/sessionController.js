const sessionRepository = require('../repositories/sessionRepository');

// GET: Lấy danh sách
exports.getSessions = async (req, res) => {
    try {
        const sessions = await sessionRepository.getAllSessions();
        res.status(200).json(sessions);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
};

// POST: Tạo phiên họp
exports.createSession = async (req, res) => {
    try {
        const { session_name, start_time, end_time, location_id } = req.body;

        // 1. Validate: Giờ kết thúc phải sau Giờ bắt đầu
        if (new Date(end_time) <= new Date(start_time)) {
            return res.status(400).json({ message: 'Thời gian kết thúc phải sau thời gian bắt đầu' });
        }

        // 2. Gọi Repository lưu vào DB
        const newSession = await sessionRepository.createSession({ 
            session_name, start_time, end_time, location_id 
        });

        res.status(201).json(newSession);
    } catch (err) {
        // Lỗi Foreign Key (nếu nhập ID phòng không tồn tại)
        if (err.code === '23503') {
            return res.status(400).json({ message: 'Phòng họp (location_id) không tồn tại' });
        }
        res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
};


// PUT: Update phiên họp
exports.updateSession = async (req, res) => {
    try {
        const { id } = req.params;
        const { session_name, start_time, end_time, location_id } = req.body;

        // 1. Validate logic ngày giờ (giống lúc tạo)
        if (new Date(end_time) <= new Date(start_time)) {
            return res.status(400).json({ message: 'Thời gian kết thúc phải sau thời gian bắt đầu' });
        }

        const updatedSession = await sessionRepository.updateSession(id, {
            session_name, start_time, end_time, location_id
        });

        if (!updatedSession) {
            return res.status(404).json({ message: 'Không tìm thấy phiên họp' });
        }

        res.status(200).json(updatedSession);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
};

// PUT: Gán paper vào session
exports.addPaper = async (req, res) => {
    try {
        const { id } = req.params; // session_id lấy từ URL
        const { paper_id, presentation_order } = req.body; // paper_id lấy từ body

        // Gọi repository
        const result = await sessionRepository.addPaperToSession(id, paper_id, presentation_order);
        
        res.status(200).json({
            message: 'Gán bài báo thành công',
            data: result
        });
    } catch (err) {
        // Bắt lỗi trùng lặp (Bài báo đã có trong session này rồi)
        if (err.code === '23505') { // Mã lỗi duplicate key của Postgres
            return res.status(400).json({ message: 'Bài báo này đã được gán vào phiên họp rồi' });
        }
        // Bắt lỗi khóa ngoại (Session hoặc Paper không tồn tại)
        if (err.code === '23503') {
            return res.status(400).json({ message: 'Mã phiên họp hoặc Mã bài báo không tồn tại' });
        }
        res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
};