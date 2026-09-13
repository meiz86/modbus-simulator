function createFrequencyGenerator(config) {
  let frequency = config.nominal;
  let frozenFrequency = null;

  function update() {
    if (config.mode === "spike") {
      if (Math.random() < 0.1) {
        frequency = config.max;
      } else {
        const change = (Math.random() - 0.5) * 0.04;

        frequency += change;

        if (frequency < config.min) {
          frequency = config.min;
        }

        if (frequency > config.max) {
          frequency = config.max;
        }
      }

      return frequency;
    }
    if (config.mode === "freeze") {
      if (frozenFrequency === null) {
        frozenFrequency = frequency;
      }

      return frozenFrequency;
    }
    if (config.mode === "low") {
      frequency = 49.3;
      return frequency;
    }
    if (config.mode === "high") {
      frequency = 50.15;
      return frequency;
    }
    if (config.mode === "random") {
      frequency = config.min + Math.random() * (config.max - config.min);

      return frequency;
    }

    const change = (Math.random() - 0.5) * 0.04;

    frequency += change;

    if (frequency < config.min) {
      frequency = config.min;
    }

    if (frequency > config.max) {
      frequency = config.max;
    }

    return frequency;
  }

  return {
    update,
  };
}

module.exports = createFrequencyGenerator;
