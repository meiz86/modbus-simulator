const Database = require("better-sqlite3");

const db = new Database("data.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS measurements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transducer_id INTEGER NOT NULL,
    timestamp TEXT NOT NULL,
    raw_value INTEGER NOT NULL,
    frequency REAL NOT NULL
  )
`);

function saveMeasurement(measurement) {
  const stmt = db.prepare(`
    INSERT INTO measurements (
      transducer_id,
      timestamp,
      raw_value,
      frequency
    )
    VALUES (?, ?, ?, ?)
  `);

  stmt.run(
    measurement.transducerId,
    measurement.timestamp.toISOString(),
    measurement.rawValue,
    measurement.frequency,
  );
}
function getRecentMeasurements(limit = 100) {
  return db
    .prepare(
      `
      SELECT
        id,
        transducer_id,
        timestamp,
        raw_value,
        frequency
      FROM measurements
      ORDER BY id DESC
      LIMIT ?
    `,
    )
    .all(limit);
}
function getRecentMeasurementsByTransducer(transducerId, limit = 100) {
  return db
    .prepare(
      `
      SELECT
        id,
        transducer_id,
        timestamp,
        raw_value,
        frequency
      FROM measurements
      WHERE transducer_id = ?
      ORDER BY id DESC
      LIMIT ?
    `,
    )
    .all(transducerId, limit);
}
function getLatestMeasurementByTransducer(transducerId) {
  return db
    .prepare(
      `
      SELECT
        id,
        transducer_id,
        timestamp,
        raw_value,
        frequency
      FROM measurements
      WHERE transducer_id = ?
      ORDER BY id DESC
      LIMIT 1
    `,
    )
    .get(transducerId);
}
module.exports = {
  saveMeasurement,
  getRecentMeasurements,
  getRecentMeasurementsByTransducer,
  getLatestMeasurementByTransducer,
};
