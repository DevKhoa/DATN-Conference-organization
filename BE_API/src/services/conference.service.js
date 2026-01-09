const conferenceRepo = require('../repositories/conference.repo');

exports.create = async (data) => {
  return conferenceRepo.insert(data);
};

exports.getById = async (id) => {
  const conference = await conferenceRepo.findById(id);
  if (!conference) {
    throw new Error('Conference not found');
  }
  return conference;
};

exports.update = async (id, data) => {
  return conferenceRepo.update(id, data);
};

exports.updateStatus = async (id, status) => {
  return conferenceRepo.updateStatus(id, status);
};

exports.getOverview = async (id) => {
  return conferenceRepo.getOverview(id);
};
