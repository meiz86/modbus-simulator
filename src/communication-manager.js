const config = require("./config");

function getCommunicationState(lastTimestamp) {
  const now = Date.now();

  const last = new Date(lastTimestamp).getTime();

  const ageSeconds = (now - last) / 1000;

  if (ageSeconds >= config.communication.alarmAfterSeconds) {
    return {
      state: "ALARM",
      ageSeconds,
    };
  }

  if (ageSeconds >= config.communication.staleAfterSeconds) {
    return {
      state: "WARNING",
      ageSeconds,
    };
  }

  return {
    state: "OK",
    ageSeconds,
  };
}

module.exports = {
  getCommunicationState,
};
