const proceedingRepo = require('../repositories/proceedings.repo');

exports.generateProceedings = (data) => {
  const { conference_id } = data;
  if (!conference_id) throw new Error("conference_id is required");
  return proceedingRepo.generateProceedings(conference_id);
};

exports.assignDoi = (data) => {
  if (!data.paper_id || !data.doi) throw new Error("Missing required fields");
  return proceedingRepo.assignDoi(data);
};

exports.exportProceedings = (conference_id) => {
  if (!conference_id) throw new Error("conference_id is required to export PDF");
  return proceedingRepo.exportProceedings(conference_id);
};