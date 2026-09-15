const repository = require("./measurement-repository");
const config = require("./config");
const database = require("./database");
const { processCommunicationAlarm } = require("./alarm-manager");

const states = new Map();

const CHECK_INTERVAL_MS = 1000;

function checkTransducer(transducer) {
  const latest = repository.getLatestByTransducer(transducer.id);

  if (!latest) {
    return;
  }

  const ageSeconds = (Date.now() - new Date(latest.timestamp).getTime()) / 1000;

  let state;

  if (ageSeconds >= config.alarm.communication.alarmAfterSeconds) {
    state = "ALARM";
  } else if (ageSeconds >= config.alarm.communication.staleAfterSeconds) {
    state = "WARNING";
  } else {
    state = "NORMAL";
  }

  const previousState = states.get(transducer.id);

  const currentDatabaseState = database.getAlarmState(transducer.id);

  const databaseOutOfSync =
    !currentDatabaseState ||
    currentDatabaseState.state !== state ||
    (state === "ALARM" &&
      currentDatabaseState.alarm_code !== "COMMUNICATION_ALARM") ||
    (state === "WARNING" &&
      currentDatabaseState.alarm_code !== "COMMUNICATION_WARNING");

  if (previousState !== state || databaseOutOfSync) {
    processCommunicationAlarm({
      transducerId: transducer.id,
      state,
      ageSeconds,
      timestamp: new Date(),
    });

    states.set(transducer.id, state);
  }
}

function checkAll() {
  for (const transducer of config.transducers) {
    checkTransducer(transducer);
  }
}

function start() {
  checkAll();

  setInterval(checkAll, CHECK_INTERVAL_MS);
}

module.exports = {
  start,
};
