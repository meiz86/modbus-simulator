const config = {
  host: "127.0.0.1",

  transducers: [
    { id: 1, port: 15001, mode: "low", updateIntervalMs: 1000 }, { id: 2, port: 15002, mode: "normal", updateIntervalMs: 1000 },
    { id: 3, port: 15003, mode: "normal", updateIntervalMs: 1000 },
    { id: 4, port: 15004, mode: "normal", updateIntervalMs: 1000 },
    { id: 5, port: 15005, mode: "normal", updateIntervalMs: 1000 },
    { id: 6, port: 15006, mode: "normal", updateIntervalMs: 1000 },
    { id: 7, port: 15007, mode: "normal", updateIntervalMs: 1000 },
    { id: 8, port: 15008, mode: "normal", updateIntervalMs: 1000 },
    { id: 9, port: 15009, mode: "normal", updateIntervalMs: 1000 },
    { id: 10, port: 15010, mode: "normal", updateIntervalMs: 1000 },
  ],

  frequency: {
    min: 49.20,
    max: 50.20,
    nominal: 50.00,
    scale: 100,
  },

  alarm: {
    frequency: {
      lowAlarm: 49.20,
      lowWarning: 49.70,

      highWarning: 50.01,
      highAlarm: 50.1,
    },

    communication: {
      staleAfterSeconds: 5,
      alarmAfterSeconds: 10,
    },
  },
};

module.exports = config;