const repository = require("./measurement-repository");

const measurements = repository.getRecent(10);

console.table(measurements);
