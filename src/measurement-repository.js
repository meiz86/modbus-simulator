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
  return database.getLatestMeasurementByTransducer(
    transducerId
  );
}

module.exports = {
  save,
  getRecent,
  getRecentByTransducer,
  getLatestByTransducer
};
