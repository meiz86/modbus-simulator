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

db.exec(`
  CREATE TABLE IF NOT EXISTS alarm_states (
    transducer_id INTEGER PRIMARY KEY,
    state TEXT NOT NULL,
    alarm_code TEXT,
    message TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    acknowledged INTEGER NOT NULL DEFAULT 0,
    acknowledged_at TEXT,
    acknowledged_by TEXT
  )
`);
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_measurements_transducer_timestamp
  ON measurements (transducer_id, timestamp)
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS alarm_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    transducer_id INTEGER NOT NULL,

    event_type TEXT NOT NULL,

    state TEXT,

    alarm_code TEXT,

    message TEXT,

    frequency REAL,

    created_at TEXT NOT NULL,

    operator TEXT
  )
`);
try {
  db.exec(`
    ALTER TABLE alarm_states
    ADD COLUMN acknowledged INTEGER NOT NULL DEFAULT 0
  `);
} catch (error) {
  if (!error.message.includes("duplicate column name")) {
    throw error;
  }
}

try {
  db.exec(`
    ALTER TABLE alarm_states
    ADD COLUMN acknowledged_at TEXT
  `);
} catch (error) {
  if (!error.message.includes("duplicate column name")) {
    throw error;
  }
}

try {
  db.exec(`
    ALTER TABLE alarm_states
    ADD COLUMN acknowledged_by TEXT
  `);
} catch (error) {
  if (!error.message.includes("duplicate column name")) {
    throw error;
  }
}

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
function saveAlarmEvent(event) {
  const stmt = db.prepare(`
    INSERT INTO alarm_events (
      transducer_id,
      event_type,
      state,
      alarm_code,
      message,
      frequency,
      timestamp,
      operator
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    event.transducerId,
    event.eventType,
    event.state || null,
    event.alarmCode || null,
    event.message || null,
    event.frequency || null,
    event.timestamp
      ? new Date(event.timestamp).toISOString()
      : new Date().toISOString(),
    event.operator || null,
  );
}
function getMeasurementsByTimeRange(transducerId, from, to) {
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
        AND timestamp >= ?
        AND timestamp <= ?
      ORDER BY timestamp ASC
    `,
    )
    .all(
      transducerId,
      new Date(from).toISOString(),
      new Date(to).toISOString(),
    );
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
      ORDER BY timestamp DESC
      LIMIT 1
    `,
    )
    .get(transducerId);
}

function saveAlarmState(state) {
  const stmt = db.prepare(`
    INSERT INTO alarm_states (
      transducer_id,
      state,
      alarm_code,
      message,
      updated_at,
      acknowledged,
      acknowledged_at,
      acknowledged_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(transducer_id)
    DO UPDATE SET
      state = excluded.state,
      alarm_code = excluded.alarm_code,
      message = excluded.message,
      updated_at = excluded.updated_at,
      acknowledged = excluded.acknowledged,
      acknowledged_at = excluded.acknowledged_at,
      acknowledged_by = excluded.acknowledged_by
  `);

  stmt.run(
    state.transducerId,
    state.state,
    state.alarmCode,
    state.message,
    state.updatedAt.toISOString(),
    state.acknowledged ? 1 : 0,
    state.acknowledgedAt ? state.acknowledgedAt.toISOString() : null,
    state.acknowledgedBy || null,
  );
}
function getAlarmState(transducerId) {
  return db
    .prepare(
      `
      SELECT
        transducer_id,
        state,
        alarm_code,
        message,
        updated_at,
        acknowledged,
        acknowledged_at,
        acknowledged_by
      FROM alarm_states
      WHERE transducer_id = ?
    `,
    )
    .get(transducerId);
}

function getAllAlarmStates() {
  return db
    .prepare(
      `
      SELECT
        transducer_id,
        state,
        alarm_code,
        message,
        updated_at,
        acknowledged,
        acknowledged_at,
        acknowledged_by
      FROM alarm_states
      ORDER BY transducer_id
    `,
    )
    .all();
}
function acknowledgeAlarm(transducerId, acknowledgedBy) {
  const timestamp = new Date();

  const stmt = db.prepare(`
    UPDATE alarm_states
    SET
      acknowledged = 1,
      acknowledged_at = ?,
      acknowledged_by = ?
    WHERE transducer_id = ?
      AND state IN ('ALARM', 'WARNING')
  `);

  const result = stmt.run(
    timestamp.toISOString(),
    acknowledgedBy,
    transducerId,
  );

  return {
    updated: result.changes > 0,
    timestamp,
  };
}
function getAlarmEvents(limit = 100) {
  return db
    .prepare(
      `
      SELECT
        id,
        transducer_id,
        event_type,
        state,
        alarm_code,
        message,
        frequency,
        timestamp,
        operator
      FROM alarm_events
      ORDER BY id DESC
      LIMIT ?
    `,
    )
    .all(limit);
}
function getMeasurementStats(transducerId, from, to) {
  return db
    .prepare(
      `
      SELECT
        COUNT(*) AS count,
        MIN(frequency) AS min,
        MAX(frequency) AS max,
        AVG(frequency) AS average
      FROM measurements
      WHERE transducer_id = ?
        AND timestamp >= ?
        AND timestamp <= ?
    `,
    )
    .get(
      transducerId,
      new Date(from).toISOString(),
      new Date(to).toISOString(),
    );
}
module.exports = {
  saveMeasurement,
  getRecentMeasurements,
  getRecentMeasurementsByTransducer,
  getLatestMeasurementByTransducer,
  saveAlarmState,
  getAlarmState,
  getAllAlarmStates,
  acknowledgeAlarm,
  saveAlarmEvent,
  getAlarmEvents,
  getMeasurementsByTimeRange,
  getMeasurementStats,
};
