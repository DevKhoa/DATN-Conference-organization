const repo = require('../repositories/conference.repo');

exports.createConference = async (payload) => {
  if (!payload.conf_name) {
    throw new Error('Conference name is required');
  }
  return repo.createConference(payload);
};

exports.getConference = async (id) => {
  const conf = await repo.getConferenceById(id);
  if (!conf) throw new Error('Conference not found');
  return conf;
};

exports.updateConference = async (id, payload) => {
  return repo.updateConference(id, payload);
};

exports.changeStatus = async (id, status) => {
  const allowed = ['DRAFT', 'PUBLISHED', 'CLOSED'];
  if (!allowed.includes(status)) {
    throw new Error('Invalid status');
  }
  return repo.updateStatus(id, status);
};
