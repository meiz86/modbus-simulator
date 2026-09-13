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
    database.saveAlarmState({
        transducerId: measurement.transducerId,
        state: alarm.state,
        alarmCode: alarm.code,
        message: alarm.message,
        updatedAt: measurement.timestamp,
    });
}

function processMeasurement(measurement) {
    const transducerId = measurement.transducerId;

    const currentAlarm =
        evaluateFrequency(measurement.frequency);

    const previousAlarm =
        states.get(transducerId);

    states.set(transducerId, currentAlarm);

    // Persist current state
    saveCurrentState(
        measurement,
        currentAlarm
    );

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

    if (
        previousAlarm.state !== "ALARM" &&
        currentAlarm.state === "ALARM"
    ) {
        saveEvent(
            measurement,
            "ALARM_STARTED",
            currentAlarm
        );

        return {
            event: "ALARM_STARTED",
            previous: previousAlarm,
            current: currentAlarm,
        };
    }

    if (
        previousAlarm.state === "ALARM" &&
        currentAlarm.state !== "ALARM"
    ) {
        saveEvent(
            measurement,
            "ALARM_CLEARED",
            previousAlarm
        );

        return {
            event: "ALARM_CLEARED",
            previous: previousAlarm,
            current: currentAlarm,
        };
    }

    saveEvent(
        measurement,
        "STATE_CHANGED",
        currentAlarm
    );

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