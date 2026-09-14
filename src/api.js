const express = require("express");
const repository = require("./measurement-repository");
const alarmDatabase = require("./alarm-database");
const path = require("path");
const database = require("./database");
const config = require("./config");
const { getCurrentState, getAllCurrentStates } = require("./alarm-manager");

const app = express();
const PORT = 3001;

app.use(express.static(path.join(__dirname, "../public")));

app.get("/api/measurements", (req, res) => {
  const requestedLimit = Number(req.query.limit);
  const limit =
    Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 1000)
      : 100;
  const measurements = repository.getRecent(limit);

  res.json(measurements);
});
app.get("/api/config", (req, res) => {
  res.json({
    frequency: config.alarm.frequency,
  });
});
app.get("/api/measurements/:transducerId/range", (req, res) => {
  try {
    const transducerId = Number(req.params.transducerId);

    const { from, to } = req.query;

    if (
      !Number.isInteger(transducerId) ||
      transducerId < 1 ||
      transducerId > 10
    ) {
      return res.status(400).json({
        error: "Invalid transducer ID",
      });
    }

    if (!from || !to) {
      return res.status(400).json({
        error: "from and to are required",
      });
    }

    const measurements = repository.getByTimeRange(transducerId, from, to);

    res.json(measurements);
  } catch (error) {
    console.error("Measurement range API error:", error);

    res.status(500).json({
      error: "Failed to load measurements",
    });
  }
});

app.get("/api/measurements/:transducerId/stats", (req, res) => {
  try {
    const transducerId = Number(req.params.transducerId);

    const { from, to } = req.query;

    if (
      !Number.isInteger(transducerId) ||
      transducerId < 1 ||
      transducerId > 10
    ) {
      return res.status(400).json({
        error: "Invalid transducer ID",
      });
    }

    if (!from || !to) {
      return res.status(400).json({
        error: "from and to are required",
      });
    }

    const stats = repository.getStats(transducerId, from, to);

    res.json(stats);
  } catch (error) {
    console.error("Measurement stats API error:", error);

    res.status(500).json({
      error: "Failed to load measurement statistics",
    });
  }
});
app.get("/api/trends/:transducerId", (req, res) => {
  try {
    const transducerId = Number(req.params.transducerId);

    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        error: "from and to are required",
      });
    }

    const measurements = repository.getByTimeRange(transducerId, from, to);

    const statistics = repository.getStats(transducerId, from, to);

    res.json({
      transducer_id: transducerId,

      from,

      to,

      statistics,

      measurements: measurements.map((m) => ({
        timestamp: m.timestamp,
        frequency: m.frequency,
      })),
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Trend loading failed",
    });
  }
});
app.get("/api/measurements/:transducerId", (req, res) => {
  const transducerId = Number(req.params.transducerId);
  if (
    !Number.isInteger(transducerId) ||
    transducerId < 1 ||
    transducerId > 10
  ) {
    return res.status(400).json({
      error: "Invalid transducer ID",
    });
  }
  const requestedLimit = Number(req.query.limit);
  const limit =
    Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 1000)
      : 100;
  const measurements = repository.getRecentByTransducer(transducerId, limit);

  res.json(measurements);
});
app.get("/api/measurements/:transducerId/latest", (req, res) => {
  const transducerId = Number(req.params.transducerId);
  if (
    !Number.isInteger(transducerId) ||
    transducerId < 1 ||
    transducerId > 10
  ) {
    return res.status(400).json({
      error: "Invalid transducer ID",
    });
  }

  const measurement = repository.getLatestByTransducer(transducerId);

  if (!measurement) {
    return res.status(404).json({
      error: "No measurements found",
    });
  }

  res.json(measurement);
});
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "frequency-monitoring-api",
    timestamp: new Date().toISOString(),
  });
});
app.get("/api/alarms/current", (req, res) => {
  const states = database.getAllAlarmStates();

  res.json(states);
});

app.get("/api/alarms/current/:transducerId", (req, res) => {
  const transducerId = Number(req.params.transducerId);

  if (
    !Number.isInteger(transducerId) ||
    transducerId < 1 ||
    transducerId > 10
  ) {
    return res.status(400).json({
      error: "Invalid transducer ID",
    });
  }

  const state = database.getAlarmState(transducerId);

  if (!state) {
    return res.status(404).json({
      error: "No current alarm state found",
    });
  }

  res.json(state);
});
app.get("/api/alarms/active", (req, res) => {
  try {
    const alarms = database.getAllAlarmStates().filter((alarm) => {
      return (
        (alarm.state === "ALARM" || alarm.state === "WARNING") &&
        alarm.acknowledged === 0
      );
    });

    res.json(alarms);
  } catch (error) {
    console.error("Active alarms error:", error);

    res.status(500).json({
      error: "Failed to get active alarms",
    });
  }
});
app.get("/api/alarms", (req, res) => {
  const requestedLimit = Number(req.query.limit);

  const limit =
    Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 1000)
      : 100;

  const alarms = alarmDatabase.getRecentAlarmEvents(limit);

  res.json(alarms);
});
app.post("/api/alarms/:transducerId/acknowledge", (req, res) => {
  const transducerId = Number(req.params.transducerId);

  if (
    !Number.isInteger(transducerId) ||
    transducerId < 1 ||
    transducerId > 10
  ) {
    return res.status(400).json({
      error: "Invalid transducer ID",
    });
  }

  const acknowledgedBy = req.body?.acknowledgedBy || "operator";

  const result = database.acknowledgeAlarm(transducerId, acknowledgedBy);

  if (!result.updated) {
    return res.status(404).json({
      error: "No active alarm found for this transducer",
    });
  }

  res.json({
    success: true,
    transducerId,
    acknowledged: true,
    acknowledgedBy,
    acknowledgedAt: result.timestamp.toISOString(),
  });
});

app.get("/api/alarms/:transducerId", (req, res) => {
  const transducerId = Number(req.params.transducerId);

  if (
    !Number.isInteger(transducerId) ||
    transducerId < 1 ||
    transducerId > 10
  ) {
    return res.status(400).json({
      error: "Invalid transducer ID",
    });
  }

  const requestedLimit = Number(req.query.limit);

  const limit =
    Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 1000)
      : 100;

  const alarms = alarmDatabase.getRecentAlarmEventsByTransducer(
    transducerId,
    limit,
  );

  res.json(alarms);
});

app.get("/api/events", (req, res) => {
  try {
    const limit = Number(req.query.limit) || 100;

    const events = database.getAlarmEvents(limit);

    res.json(events);
  } catch (error) {
    console.error("Events API error:", error);

    res.status(500).json({
      error: "Failed to load events",
    });
  }
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
