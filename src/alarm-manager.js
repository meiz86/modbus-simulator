const { evaluateFrequency } = require("./alarm");
const alarmDatabase = require("./alarm-database");
const database = require("./database");

const states = new Map();

function saveEvent(measurement, eventType, alarm) {
  alarmDatabase.saveAlarmEvent({
    transducerId: measurement.transducerId,
    eventType,
    alarmCode: alarm.code,
    message: alarm.message,
    frequency: measurement.frequency,
    timestamp: measurement.timestamp,
  });
}

function saveCurrentState(measurement, alarm) {
  const existingState = database.getAlarmState(measurement.transducerId);

  const isNewAlarm =
    alarm.state === "ALARM" &&
    (!existingState || existingState.state !== "ALARM");
  const previousState = database.getAlarmState(measurement.transducerId);

  const previousAlarmState = previousState?.state || "NORMAL";

  const currentAlarmState = alarm.state;
  // Alarm or warning started
  if (currentAlarmState !== "NORMAL" && previousAlarmState === "NORMAL") {
    database.saveAlarmEvent({
      transducerId: measurement.transducerId,

      eventType:
        currentAlarmState === "ALARM" ? "ALARM_STARTED" : "WARNING_STARTED",

      state: currentAlarmState,

      alarmCode: alarm.code,

      message: alarm.message,

      frequency: measurement.frequency,

      timestamp: measurement.timestamp,
    });
  }

  // Alarm cleared
  if (currentAlarmState === "NORMAL" && previousAlarmState !== "NORMAL") {
    database.saveAlarmEvent({
      transducerId: measurement.transducerId,

      eventType: "ALARM_CLEARED",

      state: "NORMAL",

      message: "Alarm condition cleared",

      frequency: measurement.frequency,

      timestamp: measurement.timestamp,
    });
  }
  database.saveAlarmState({
    transducerId: measurement.transducerId,
    state: alarm.state,
    alarmCode: alarm.code,
    message: alarm.message,
    updatedAt: measurement.timestamp,

    acknowledged: isNewAlarm ? false : Boolean(existingState?.acknowledged),

    acknowledgedAt: isNewAlarm
      ? null
      : existingState?.acknowledged_at
        ? new Date(existingState.acknowledged_at)
        : null,

    acknowledgedBy: isNewAlarm ? null : existingState?.acknowledged_by || null,
  });
}

function processMeasurement(measurement) {
  const transducerId = measurement.transducerId;

  const currentAlarm = evaluateFrequency(measurement.frequency);

  const previousAlarm = states.get(transducerId);

  states.set(transducerId, currentAlarm);

  // Persist current state
  saveCurrentState(measurement, currentAlarm);

  if (!previousAlarm) {
    return {
      event: "INITIAL_STATE",
      previous: null,
      current: currentAlarm,
    };
  }

  if (previousAlarm.state === currentAlarm.state) {
    return {
      event: "NO_CHANGE",
      previous: previousAlarm,
      current: currentAlarm,
    };
  }

  if (previousAlarm.state !== "ALARM" && currentAlarm.state === "ALARM") {
    saveEvent(measurement, "ALARM_STARTED", currentAlarm);

    return {
      event: "ALARM_STARTED",
      previous: previousAlarm,
      current: currentAlarm,
    };
  }

  if (previousAlarm.state === "ALARM" && currentAlarm.state !== "ALARM") {
    saveEvent(measurement, "ALARM_CLEARED", previousAlarm);

    return {
      event: "ALARM_CLEARED",
      previous: previousAlarm,
      current: currentAlarm,
    };
  }

  saveEvent(measurement, "STATE_CHANGED", currentAlarm);

  return {
    event: "STATE_CHANGED",
    previous: previousAlarm,
    current: currentAlarm,
  };
}

function getCurrentState(transducerId) {
  return states.get(transducerId) || null;
}

function getAllCurrentStates() {
  const result = {};

  for (const [transducerId, state] of states.entries()) {
    result[transducerId] = state;
  }

  return result;
}

module.exports = {
  processMeasurement,
  getCurrentState,
  getAllCurrentStates,
};
