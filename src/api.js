const express = require("express");
const repository = require("./measurement-repository");
const path = require("path");

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
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
