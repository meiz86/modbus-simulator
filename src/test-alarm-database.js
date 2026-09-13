const alarmDatabase = require("./alarm-database");

alarmDatabase.saveAlarmEvent({
    transducerId: 1,
    eventType: "ALARM_STARTED",
    alarmCode: "HIGH_FREQUENCY",
    message: "فرکانس بالا",
    frequency: 50.30,
    timestamp: new Date(),
});

console.log(
    alarmDatabase.getRecentAlarmEvents(10)
);