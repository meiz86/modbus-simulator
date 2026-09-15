const { evaluateFrequency } = require("./alarm");
const alarmDatabase = require("./alarm-database");
const database = require("./database");

const states = new Map();
const communicationStates = new Map();

function saveEvent(measurement, eventType, alarm) {
  alarmDatabase.saveAlarmEvent({
    transducerId: measurement.transducerId,
    eventType,
    alarmCode: alarm.code,
    message: alarm.message,
    frequency: measurement.frequency,
    timestamp: measurement.timestamp,
    state: alarm.state,
  });
}

function saveCurrentState(measurement, alarm) {
  const existingState = database.getAlarmState(measurement.transducerId);

  const communicationState = communicationStates.get(measurement.transducerId);

  // Communication warning/alarm has priority over frequency state.
  if (
    communicationState &&
    (communicationState.state === "ALARM" ||
      communicationState.state === "WARNING")
  ) {
    return;
  }

  const isNewAlarm =
    alarm.state === "ALARM" &&
    (!existingState || existingState.state !== "ALARM");

  const previousAlarmState = existingState?.state || "NORMAL";
  const currentAlarmState = alarm.state;

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

  if (currentAlarmState === "NORMAL" && previousAlarmState !== "NORMAL") {
    database.saveAlarmEvent({
      transducerId: measurement.transducerId,
      eventType: "ALARM_CLEARED",
      state: "NORMAL",
      alarmCode: null,
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

function processCommunicationAlarm({
  transducerId,
  state,
  ageSeconds,
  timestamp,
}) {
  const previousCommunicationState = communicationStates.get(transducerId);

  const communicationAlarm = {
    state,

    code:
      state === "ALARM"
        ? "COMMUNICATION_ALARM"
        : state === "WARNING"
          ? "COMMUNICATION_WARNING"
          : null,

    message:
      state === "ALARM"
        ? "خطای ارتباط"
        : state === "WARNING"
          ? "هشدار ارتباط"
          : "ارتباط برقرار",
  };

  communicationStates.set(transducerId, communicationAlarm);

  const currentDatabaseState = database.getAlarmState(transducerId);

  /*
   * Communication recovery.
   *
   * If communication returns to NORMAL, record a
   * COMMUNICATION_CLEARED event when the previous
   * communication state was WARNING or ALARM.
   */
  if (state === "NORMAL") {
    const currentFrequencyState = states.get(transducerId);

    if (currentFrequencyState && currentFrequencyState.state !== "NORMAL") {
      const frequencyAlarm = currentFrequencyState;

      const alreadyFrequencyState =
        currentDatabaseState &&
        currentDatabaseState.state === frequencyAlarm.state &&
        currentDatabaseState.alarm_code === frequencyAlarm.code;

      if (!alreadyFrequencyState) {
        database.saveAlarmState({
          transducerId,
          state: frequencyAlarm.state,
          alarmCode: frequencyAlarm.code,
          message: frequencyAlarm.message,
          updatedAt: timestamp,

          acknowledged: Boolean(currentDatabaseState?.acknowledged),

          acknowledgedAt: currentDatabaseState?.acknowledged_at
            ? new Date(currentDatabaseState.acknowledged_at)
            : null,

          acknowledgedBy: currentDatabaseState?.acknowledged_by || null,
        });
      }

      if (
        previousCommunicationState &&
        (previousCommunicationState.state === "ALARM" ||
          previousCommunicationState.state === "WARNING")
      ) {
        alarmDatabase.saveAlarmEvent({
          transducerId,
          eventType: "COMMUNICATION_CLEARED",
          state: "NORMAL",
          alarmCode: null,
          message: "ارتباط برقرار",
          frequency: null,
          timestamp,
        });
      }

      return;
    }

    /*
     * No active frequency alarm exists, so communication
     * recovery can safely clear the communication alarm.
     */
    if (
      currentDatabaseState &&
      (currentDatabaseState.alarm_code === "COMMUNICATION_ALARM" ||
        currentDatabaseState.alarm_code === "COMMUNICATION_WARNING")
    ) {
      database.saveAlarmState({
        transducerId,
        state: "NORMAL",
        alarmCode: null,
        message: "عادی",
        updatedAt: timestamp,
        acknowledged: false,
        acknowledgedAt: null,
        acknowledgedBy: null,
      });
    }

    if (
      previousCommunicationState &&
      (previousCommunicationState.state === "ALARM" ||
        previousCommunicationState.state === "WARNING")
    ) {
      alarmDatabase.saveAlarmEvent({
        transducerId,
        eventType: "COMMUNICATION_CLEARED",
        state: "NORMAL",
        alarmCode: null,
        message: "ارتباط برقرار",
        frequency: null,
        timestamp,
      });
    }

    return;
  }

  /*
   * Communication WARNING / ALARM.
   *
   * These states have priority over frequency states.
   */
  const stateChanged =
    !previousCommunicationState || previousCommunicationState.state !== state;

  const databaseOutOfSync =
    !currentDatabaseState ||
    currentDatabaseState.state !== state ||
    currentDatabaseState.alarm_code !== communicationAlarm.code;

  if (!stateChanged && !databaseOutOfSync) {
    return;
  }

  database.saveAlarmState({
    transducerId,
    state: communicationAlarm.state,
    alarmCode: communicationAlarm.code,
    message: communicationAlarm.message,
    updatedAt: timestamp,
    acknowledged: false,
    acknowledgedAt: null,
    acknowledgedBy: null,
  });

  /*
   * Create an event only when communication state actually
   * changes, not when we merely repair database synchronization.
   */
  if (stateChanged) {
    alarmDatabase.saveAlarmEvent({
      transducerId,

      eventType: state === "ALARM" ? "ALARM_STARTED" : "WARNING_STARTED",

      state,
      alarmCode: communicationAlarm.code,
      message: communicationAlarm.message,
      frequency: null,
      timestamp,
    });
  }

  console.log(
    `COMMUNICATION STATE | T${String(transducerId).padStart(2, "0")} | ` +
      `${state} | age=${ageSeconds.toFixed(1)}s`,
  );
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
  processCommunicationAlarm,
};
