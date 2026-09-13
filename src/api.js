const express = require("express");
const repository = require("./measurement-repository");
const alarmDatabase = require("./alarm-database");
const path = require("path");
const database = require("./database");
const { getCurrentState, getAllCurrentStates } =
  require("./alarm-manager");

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

  const state =
    database.getAlarmState(transducerId);

  if (!state) {
    return res.status(404).json({
      error: "No current alarm state found",
    });
  }

  res.json(state);
});
app.get("/api/alarms", (req, res) => {
  const requestedLimit = Number(req.query.limit);

  const limit =
    Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 1000)
      : 100;

  const alarms =
    alarmDatabase.getRecentAlarmEvents(limit);

  res.json(alarms);
});
app.post(
  "/api/alarms/:transducerId/acknowledge",
  (req, res) => {
    const transducerId =
      Number(req.params.transducerId);

    if (
      !Number.isInteger(transducerId) ||
      transducerId < 1 ||
      transducerId > 10
    ) {
      return res.status(400).json({
        error: "Invalid transducer ID",
      });
    }

    const acknowledgedBy =
      req.body?.acknowledgedBy || "operator";

    const result =
      database.acknowledgeAlarm(
        transducerId,
        acknowledgedBy
      );

    if (!result.updated) {
      return res.status(404).json({
        error:
          "No active alarm found for this transducer",
      });
    }

    res.json({
      success: true,
      transducerId,
      acknowledged: true,
      acknowledgedBy,
      acknowledgedAt:
        result.timestamp.toISOString(),
    });
  }
);
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

  const alarms =
    alarmDatabase.getRecentAlarmEventsByTransducer(
      transducerId,
      limit
    );

  res.json(alarms);
});



app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
