const Database = require("better-sqlite3");

const db = new Database("data.db");

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

function getRecentAlarmEvents(limit = 100) {
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

function getRecentAlarmEventsByTransducer(transducerId, limit = 100) {
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
      WHERE transducer_id = ?
      ORDER BY id DESC
      LIMIT ?
    `,
    )
    .all(transducerId, limit);
}

module.exports = {
  saveAlarmEvent,
  getRecentAlarmEvents,
  getRecentAlarmEventsByTransducer,
};
