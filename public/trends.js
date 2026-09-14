let chart;
let FREQUENCY_LIMITS = null;
let FREQUENCY_CONFIG = null;
let config = null;

async function loadConfig() {
  const response = await fetch("/api/config");

  const data = await response.json();

  FREQUENCY_CONFIG = data.frequency;
  config = FREQUENCY_CONFIG;
  FREQUENCY_LIMITS = data.frequency;
}
async function loadTrend() {
  if (!FREQUENCY_LIMITS) {
    await loadConfig();
  }
  const transducerId = document.getElementById("transducer-select").value;

  const to = new Date();

  const from = new Date(to.getTime() - 60 * 60 * 1000);

  const url =
    `/api/trends/${transducerId}` +
    `?from=${from.toISOString()}` +
    `&to=${to.toISOString()}`;

  const response = await fetch(url);

  const data = await response.json();

  updateStatistics(data.statistics);

  updateChart(data.measurements);
}

function updateStatistics(stats) {
  document.getElementById("statistics").innerHTML = `

    <div class="event-card">

      <h2>
      آمار فرکانس
      </h2>

      <p>
      حداقل:
      ${stats.min?.toFixed(2)}
      Hz
      </p>

      <p>
      حداکثر:
      ${stats.max?.toFixed(2)}
      Hz
      </p>

      <p>
      میانگین:
      ${stats.average?.toFixed(2)}
      Hz
      </p>

      <p>
      تعداد نمونه:
      ${stats.count}
      </p>

    </div>

  `;
}
function createLimitLine(value, label) {
  return {
    label: label,

    data: Array(chartLabelsLength).fill(value),

    borderWidth: 1,

    pointRadius: 0,

    borderDash: [6, 6],
  };
}
function updateChart(measurements) {
  const labels = measurements.map((m) =>
    new Date(m.timestamp).toLocaleTimeString("fa-IR"),
  );

  const values = measurements.map((m) => m.frequency);

  const limits = FREQUENCY_LIMITS;
  const config = FREQUENCY_CONFIG;

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
          min: FREQUENCY_LIMITS.lowAlarm - 0.1,

          max: FREQUENCY_LIMITS.highAlarm + 0.1,

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

document.getElementById("load-trend").addEventListener("click", loadTrend);
document.getElementById("reset-zoom").addEventListener("click", () => {
  if (chart) {
    chart.resetZoom();
  }
});
