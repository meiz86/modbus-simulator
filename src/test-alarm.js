const { evaluateFrequency } = require("./alarm");

const testValues = [
    49.10,
    49.30,
    49.80,
    50.10,
    50.30,
];

for (const frequency of testValues) {
    const result = evaluateFrequency(frequency);

    console.log(
        `${frequency.toFixed(2)} Hz → ${result.state} → ${result.message}`
    );
}