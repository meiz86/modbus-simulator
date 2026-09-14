const repository = require("./measurement-repository");

const measurements = repository.getRecent(10);

console.table(measurements);
const now = new Date();
const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

const rangeMeasurements = repository.getByTimeRange(1, oneHourAgo, now);

console.log("Time range measurements:", rangeMeasurements.length);

const stats = repository.getStats(1, oneHourAgo, now);

console.log("Measurement stats:", stats);
