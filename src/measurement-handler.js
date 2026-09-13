const repository = require("./measurement-repository");
const { processMeasurement } = require("./alarm-manager");

function handleMeasurement(measurement) {
  const alarmResult = processMeasurement(measurement);

  repository.save(measurement);

  console.log(
    `T${String(measurement.transducerId).padStart(2, "0")} | ` +
    `${measurement.frequency.toFixed(2)} Hz | ` +
    `${alarmResult.current.state} | ` +
    `${alarmResult.current.message} | ` +
    `${measurement.timestamp.toISOString()}`
  );

  if (alarmResult.event === "ALARM_STARTED") {
    console.log(
      `🔴 ALARM STARTED | ` +
      `T${String(measurement.transducerId).padStart(2, "0")} | ` +
      `${alarmResult.current.message}`
    );
  }

  if (alarmResult.event === "ALARM_CLEARED") {
    console.log(
      `🟢 ALARM CLEARED | ` +
      `T${String(measurement.transducerId).padStart(2, "0")}`
    );
  }

  if (alarmResult.event === "STATE_CHANGED") {
    console.log(
      `⚠️ STATE CHANGED | ` +
      `T${String(measurement.transducerId).padStart(2, "0")} | ` +
      `${alarmResult.previous.state} → ${alarmResult.current.state}`
    );
  }
}

module.exports = handleMeasurement;