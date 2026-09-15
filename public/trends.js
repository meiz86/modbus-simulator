let chart;
let customFromPicker;
let customToPicker;
let FREQUENCY_LIMITS = null;

async function loadConfig() {
  const response = await fetch("/api/config");

  if (!response.ok) {
    throw new Error("Failed to load configuration");
  }

  const data = await response.json();

  FREQUENCY_LIMITS = data.frequency;
}

function getQuickRange(minutes) {
  const to = new Date();

  const from = new Date(to.getTime() - minutes * 60 * 1000);

  return {
    from,
    to,
  };
}

function getCustomRange() {
  if (!customFromPicker || !customToPicker) {
    return null;
  }

  const from = customFromPicker.getDate();
  const to = customToPicker.getDate();

  if (
    !(from instanceof Date) ||
    Number.isNaN(from.getTime()) ||
    !(to instanceof Date) ||
    Number.isNaN(to.getTime())
  ) {
    return null;
  }

  if (from >= to) {
    alert("زمان شروع باید قبل از زمان پایان باشد.");
    return null;
  }

  return {
    from,
    to,
  };
}

function updateCustomRangeVisibility() {
  const rangeSelect = document.getElementById("range-select");

  const customRange = document.getElementById("custom-range");

  if (rangeSelect.value === "custom") {
    customRange.classList.add("visible");
  } else {
    customRange.classList.remove("visible");
  }
}

async function loadTrend() {
  try {
    if (!FREQUENCY_LIMITS) {
      await loadConfig();
    }

    const transducerId = document.getElementById("transducer-select").value;

    const rangeValue = document.getElementById("range-select").value;

    let range;

    if (rangeValue === "custom") {
      range = getCustomRange();

      if (!range) {
        alert("لطفاً تاریخ و زمان شروع و پایان را انتخاب کنید.");

        return;
      }
    } else {
      range = getQuickRange(Number(rangeValue));
    }

    if (range.from >= range.to) {
      alert("زمان شروع باید قبل از زمان پایان باشد.");

      return;
    }

    const url =
      `/api/trends/${transducerId}` +
      `?from=${encodeURIComponent(range.from.toISOString())}` +
      `&to=${encodeURIComponent(range.to.toISOString())}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Failed to load trend data");
    }

    const data = await response.json();

    updateStatistics(data.statistics);

    updateChart(data.measurements);
  } catch (error) {
    console.error("Trend loading error:", error);

    alert("خطا در دریافت اطلاعات روند.");
  }
}

function updateStatistics(stats) {
  document.getElementById("statistics").innerHTML = `
    <div class="event-card">

      <h2>آمار فرکانس</h2>

      <p>
        حداقل:
        ${
          stats.min !== null && stats.min !== undefined
            ? stats.min.toFixed(2)
            : "--"
        }
        Hz
      </p>

      <p>
        حداکثر:
        ${
          stats.max !== null && stats.max !== undefined
            ? stats.max.toFixed(2)
            : "--"
        }
        Hz
      </p>

      <p>
        میانگین:
        ${
          stats.average !== null && stats.average !== undefined
            ? stats.average.toFixed(2)
            : "--"
        }
        Hz
      </p>

      <p>
        تعداد نمونه:
        ${stats.count ?? 0}
      </p>

    </div>
  `;
}

function updateChart(measurements) {
  const labels = measurements.map((measurement) =>
    new Date(measurement.timestamp).toLocaleTimeString("fa-IR"),
  );

  const values = measurements.map((measurement) => measurement.frequency);

  const limits = FREQUENCY_LIMITS;

  const ctx = document.getElementById("frequency-chart").getContext("2d");

  if (chart) {
    chart.destroy();
  }

  chart = new Chart(ctx, {
    type: "line",

    data: {
      labels,

      datasets: [
        {
          label: "فرکانس (Hz)",

          data: values,

          borderWidth: 2,

          pointRadius: 0,

          tension: 0.2,
        },

        {
          label: "High Alarm",

          data: Array(values.length).fill(limits.highAlarm),

          borderDash: [8, 8],

          pointRadius: 0,
        },

        {
          label: "High Warning",

          data: Array(values.length).fill(limits.highWarning),

          borderDash: [8, 8],

          pointRadius: 0,
        },

        {
          label: "Low Warning",

          data: Array(values.length).fill(limits.lowWarning),

          borderDash: [8, 8],

          pointRadius: 0,
        },

        {
          label: "Low Alarm",

          data: Array(values.length).fill(limits.lowAlarm),

          borderDash: [8, 8],

          pointRadius: 0,
        },
      ],
    },

    options: {
      responsive: true,

      interaction: {
        mode: "index",

        intersect: false,
      },

      plugins: {
        annotation: {
          annotations: {
            highAlarmZone: {
              type: "box",

              yMin: limits.highAlarm,

              yMax: 55,

              backgroundColor: "rgba(255,0,0,0.08)",
            },

            highWarningZone: {
              type: "box",

              yMin: limits.highWarning,

              yMax: limits.highAlarm,

              backgroundColor: "rgba(255,193,7,0.10)",
            },

            lowWarningZone: {
              type: "box",

              yMin: limits.lowAlarm,

              yMax: limits.lowWarning,

              backgroundColor: "rgba(255,193,7,0.10)",
            },

            lowAlarmZone: {
              type: "box",

              yMin: 45,

              yMax: limits.lowAlarm,

              backgroundColor: "rgba(255,0,0,0.08)",
            },
          },
        },

        legend: {
          labels: {
            color: "#ffffff",
          },
        },

        zoom: {
          pan: {
            enabled: true,

            mode: "x",
          },

          zoom: {
            wheel: {
              enabled: true,
            },

            drag: {
              enabled: true,
            },

            pinch: {
              enabled: true,
            },

            mode: "x",
          },
        },
      },

      scales: {
        x: {
          ticks: {
            color: "#aaa",
          },

          grid: {
            color: "#333",
          },
        },

        y: {
          ticks: {
            color: "#aaa",
          },

          min: limits.lowAlarm - 0.1,

          max: limits.highAlarm + 0.1,

          grid: {
            color: "#333",
          },

          title: {
            display: true,

            text: "Hz",

            color: "#fff",
          },
        },
      },
    },
  });
}

document
  .getElementById("range-select")
  .addEventListener("change", updateCustomRangeVisibility);

customFromPicker = new JalaliDateTimePicker(
  document.getElementById("custom-from"),
);

customToPicker = new JalaliDateTimePicker(document.getElementById("custom-to"));

// Default custom range: last 1 hour.
const defaultTo = new Date();

const defaultFrom = new Date(defaultTo.getTime() - 60 * 60 * 1000);

customFromPicker.setDate(defaultFrom);

customToPicker.setDate(defaultTo);

document.getElementById("load-trend").addEventListener("click", loadTrend);

document.getElementById("reset-zoom").addEventListener("click", () => {
  if (chart) {
    chart.resetZoom();
  }
});

updateCustomRangeVisibility();

loadConfig()
  .then(() => loadTrend())
  .catch((error) => {
    console.error("Initial trend loading error:", error);
  });
