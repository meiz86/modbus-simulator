const config = require("./config");

function evaluateFrequency(frequency) {
    const limits = config.alarm.frequency;

    if (frequency < limits.lowAlarm) {
        return {
            state: "ALARM",
            code: "LOW_FREQUENCY",
            message: "فرکانس پایین",
        };
    }

    if (frequency < limits.lowWarning) {
        return {
            state: "WARNING",
            code: "LOW_FREQUENCY_WARNING",
            message: "هشدار فرکانس پایین",
        };
    }

    if (frequency <= limits.highWarning) {
        return {
            state: "NORMAL",
            code: null,
            message: "عادی",
        };
    }

    if (frequency <= limits.highAlarm) {
        return {
            state: "WARNING",
            code: "HIGH_FREQUENCY_WARNING",
            message: "هشدار فرکانس بالا",
        };
    }

    return {
        state: "ALARM",
        code: "HIGH_FREQUENCY",
        message: "فرکانس بالا",
    };
}

module.exports = {
    evaluateFrequency,
};