const Database = require("better-sqlite3");

const db = new Database("data.db");

const rows = db
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
    LIMIT 20
  `,
  )
  .all();

console.table(rows);

db.close();
