const statsService = require('../services/statsService');

exports.getOverview = async (req, res) => {
    try {
        const { conf_id } = req.query;
        if (!conf_id) return res.status(400).json({ message: 'Thiếu conf_id' });
        
        const result = await statsService.getOverview(conf_id);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
};

exports.getGeo = async (req, res) => {
    try {
        const { conf_id } = req.query;
        if (!conf_id) return res.status(400).json({ message: 'Thiếu conf_id' });

        const result = await statsService.getGeoStats(conf_id);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server: ' + err.message });
    }
};