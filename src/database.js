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

const alarmEventsColumns = db.prepare(`PRAGMA table_info(alarm_events)`).all();

if (alarmEventsColumns.length === 0) {
  db.exec(`
    CREATE TABLE alarm_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transducer_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      state TEXT,
      alarm_code TEXT,
      message TEXT NOT NULL,
      frequency REAL,
      timestamp TEXT NOT NULL,
      operator TEXT
    )
  `);
} else {
  const hasTimestamp = alarmEventsColumns.some(
    (column) => column.name === "timestamp",
  );

  const hasCreatedAt = alarmEventsColumns.some(
    (column) => column.name === "created_at",
  );

  if (!hasTimestamp && hasCreatedAt) {
    db.exec(`
      ALTER TABLE alarm_events
      RENAME TO alarm_events_old
    `);

    db.exec(`
      CREATE TABLE alarm_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transducer_id INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        state TEXT,
        alarm_code TEXT,
        message TEXT NOT NULL,
        frequency REAL,
        timestamp TEXT NOT NULL,
        operator TEXT
      )
    `);

    db.exec(`
      INSERT INTO alarm_events (
        id,
        transducer_id,
        event_type,
        state,
        alarm_code,
        message,
        frequency,
        timestamp,
        operator
      )
      SELECT
        id,
        transducer_id,
        event_type,
        state,
        alarm_code,
        message,
        frequency,
        created_at,
        operator
      FROM alarm_events_old
    `);

    db.exec(`
      DROP TABLE alarm_events_old
    `);
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

  const currentState = getAlarmState(transducerId);

  if (
    !currentState ||
    !["ALARM", "WARNING"].includes(currentState.state) ||
    currentState.acknowledged
  ) {
    return {
      updated: false,
      timestamp,
    };
  }

  const transaction = db.transaction(() => {
    const stmt = db.prepare(`
      UPDATE alarm_states
      SET
        acknowledged = 1,
        acknowledged_at = ?,
        acknowledged_by = ?
      WHERE transducer_id = ?
        AND state IN ('ALARM', 'WARNING')
        AND acknowledged = 0
    `);

    const result = stmt.run(
      timestamp.toISOString(),
      acknowledgedBy,
      transducerId,
    );

    if (result.changes === 0) {
      return false;
    }

    const eventStmt = db.prepare(`
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

    eventStmt.run(
      transducerId,
      "ACKNOWLEDGED",
      currentState.state,
      currentState.alarm_code,
      "تایید اپراتور",
      null,
      timestamp.toISOString(),
      acknowledgedBy,
    );

    return true;
  });

  return {
    updated: transaction(),
    timestamp,
  };
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
    event.frequency ?? null,
    event.timestamp
      ? new Date(event.timestamp).toISOString()
      : new Date().toISOString(),
    event.operator || null,
  );
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
