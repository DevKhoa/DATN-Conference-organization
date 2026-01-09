const conferenceService = require('../services/conference.service');

exports.createConference = async (req, res, next) => {
  try {
    const conference = await conferenceService.create(req.body);
    res.status(201).json(conference);
  } catch (err) {
    next(err);
  }
};

exports.getConferenceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const conference = await conferenceService.getById(id);
    res.json(conference);
  } catch (err) {
    next(err);
  }
};

exports.updateConference = async (req, res, next) => {
  try {
    const { id } = req.params;
    const conference = await conferenceService.update(id, req.body);
    res.json(conference);
  } catch (err) {
    next(err);
  }
};

exports.updateConferenceStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const result = await conferenceService.updateStatus(id, status);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.getConferenceOverview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const overview = await conferenceService.getOverview(id);
    res.json(overview);
  } catch (err) {
    next(err);
  }
};
