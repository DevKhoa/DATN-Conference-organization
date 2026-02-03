const statsRepository = require('../repositories/statsRepository');

const getOverview = async (conferenceId) => {
    return await statsRepository.getOverviewStats(conferenceId);
};

const getGeoStats = async (conferenceId) => {
    return await statsRepository.getGeoStats(conferenceId);
};

module.exports = {
    getOverview,
    getGeoStats
};