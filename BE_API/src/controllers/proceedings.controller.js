const proceedingService = require('../services/proceedings.service');

exports.generate = async (req, res) => {
  try {
    res.json(await proceedingService.generateProceedings(req.body));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.assignDoi = async (req, res) => {
  try {
    res.json(await proceedingService.assignDoi(req.body));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.export = async (req, res) => {
  try {
    const { conference_id } = req.query; 
    res.json(await proceedingService.exportProceedings(conference_id));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};