const database = require("./database");

function save(measurement) {
  database.saveMeasurement(measurement);
}

function getRecent(limit = 100) {
  return database.getRecentMeasurements(limit);
}
function getRecentByTransducer(transducerId, limit = 100) {
  return database.getRecentMeasurementsByTransducer(transducerId, limit);
}
function getLatestByTransducer(transducerId) {
  return database.getLatestMeasurementByTransducer(transducerId);
}
function getByTimeRange(transducerId, from, to) {
  return database.getMeasurementsByTimeRange(transducerId, from, to);
}
function getStats(transducerId, from, to) {
  return database.getMeasurementStats(transducerId, from, to);
}
module.exports = {
  save,
  getRecent,
  getRecentByTransducer,
  getLatestByTransducer,
  getByTimeRange,
  getStats,
};
