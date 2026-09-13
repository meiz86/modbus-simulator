const Database = require("better-sqlite3");

const db = new Database("data.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS alarm_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transducer_id INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    alarm_code TEXT,
    message TEXT NOT NULL,
    frequency REAL NOT NULL,
    timestamp TEXT NOT NULL
  )
`);

function saveAlarmEvent(event) {
  const stmt = db.prepare(`
    INSERT INTO alarm_events (
      transducer_id,
      event_type,
      alarm_code,
      message,
      frequency,
      timestamp
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    event.transducerId,
    event.eventType,
    event.alarmCode,
    event.message,
    event.frequency,
    event.timestamp.toISOString()
  );
}

function getRecentAlarmEvents(limit = 100) {
  return db
    .prepare(`
      SELECT
        id,
        transducer_id,
        event_type,
        alarm_code,
        message,
        frequency,
        timestamp
      FROM alarm_events
      ORDER BY id DESC
      LIMIT ?
    `)
    .all(limit);
}
function getRecentAlarmEventsByTransducer(
  transducerId,
  limit = 100
) {
  return db
    .prepare(`
      SELECT
        id,
        transducer_id,
        event_type,
        alarm_code,
        message,
        frequency,
        timestamp
      FROM alarm_events
      WHERE transducer_id = ?
      ORDER BY id DESC
      LIMIT ?
    `)
    .all(transducerId, limit);
}

module.exports = {
  saveAlarmEvent,
  getRecentAlarmEvents,
  getRecentAlarmEventsByTransducer
};