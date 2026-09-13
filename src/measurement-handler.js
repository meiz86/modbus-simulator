const repository = require("./measurement-repository");
function handleMeasurement(measurement) {
  repository.save(measurement);
  console.log(
    `T${String(measurement.transducerId).padStart(2, "0")} | ` +
      `${measurement.frequency.toFixed(2)} Hz | ` +
      `${measurement.timestamp.toISOString()}`,
  );
}

module.exports = handleMeasurement;
