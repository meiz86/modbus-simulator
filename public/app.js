const container = document.getElementById("transducers");
const status = document.getElementById("status");


// const FREQUENCY_LIMITS = {
//   lowAlarm: 49.2,

//   lowWarning: 49.8,

//   highWarning: 49.9,

//   highAlarm: 49.93,
// };
let COMMUNICATION_LIMITS = null;
let FREQUENCY_LIMITS = null;
async function loadConfig() {
  // FREQUENCY_LIMITS = data.frequency;
  const response = await fetch("/api/config");

  const data = await response.json();

  FREQUENCY_LIMITS = data.frequency;
  COMMUNICATION_LIMITS = data.communication;
}
function getFrequencyState(frequency) {
  if (frequency <= FREQUENCY_LIMITS.lowAlarm) {
    return "alarm";
  }

  if (frequency <= FREQUENCY_LIMITS.lowWarning) {
    return "warning";
  }

  if (frequency >= FREQUENCY_LIMITS.highAlarm) {
    return "alarm";
  }

  if (frequency >= FREQUENCY_LIMITS.highWarning) {
    return "warning";
  }

  return "normal";
}

function toPersianDigits(value) {
  return String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[digit]);
}

/*
  Main dashboard date and time
*/
function updateDashboardDateTime() {
  const dateTimeElement = document.getElementById("dashboard-datetime");

  if (!dateTimeElement) {
    return;
  }

  const now = new Date();

  const dateFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const timeFormatter = new Intl.DateTimeFormat("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const date = dateFormatter.format(now);
  const time = timeFormatter.format(now);

  dateTimeElement.textContent = `${date} — ${time}`;
}

// ایجاد ۱۰ کارت ترانسدیوسر
for (let id = 1; id <= 10; id++) {
  const element = document.createElement("div");

  element.className = "transducer";
  element.id = `transducer-${id}`;

  element.innerHTML = `
    <div class="transducer-info">
      <h2>ترانسدیوسر ${toPersianDigits(id)}</h2>

      <div class="frequency">
        -- هرتز
      </div>

      <p class="frequency-status">
        وضعیت فرکانس: --
      </p>

      <p class="communication-status">
        وضعیت ارتباط: --
      </p>

      <p class="age">
        سن اندازه‌گیری: -- ثانیه
      </p>
    </div>

    <div class="transducer-chart">
      <div class="chart-title">
        تاریخچه فرکانس — ترانسدیوسر ${toPersianDigits(id)} — ۶۰ مقدار آخر
      </div>

      <canvas id="chart-${id}"></canvas>
    </div>
  `;

  container.appendChild(element);
}

async function updateTransducer(id) {
  const element = document.getElementById(`transducer-${id}`);

  try {
    const response = await fetch(`/api/measurements/${id}/latest`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    const frequency = Number(data.frequency);
    const frequencyState = getFrequencyState(frequency);
    // decide text
    let frequencyStatus;
    element.classList.remove("state-normal", "state-warning", "state-alarm");

    element.classList.add(`state-${frequencyState}`);
    const minFrequency = 49.2;
    const maxFrequency = 50.2;

    if (frequencyState === "normal") {
      frequencyStatus = "🟢 عادی";
    } else if (frequencyState === "warning") {
      frequencyStatus = "🟡 هشدار";
    } else {
      frequencyStatus = "🔴 آلارم";
    }

    const measurementTime = new Date(data.timestamp).getTime();

    const now = Date.now();

    const ageSeconds = (now - measurementTime) / 1000;

    let statusText;
    let statusClass;

    if (ageSeconds <= COMMUNICATION_LIMITS.staleAfterSeconds) {
      statusText = "🟢 ارتباط برقرار";
      statusClass = "status-ok";
    } else if (ageSeconds <= COMMUNICATION_LIMITS.alarmAfterSeconds) {
      statusText = "🟠 ارتباط قدیمی";
      statusClass = "status-stale";
    } else {
      statusText = "🔴 خطای ارتباط";
      statusClass = "status-error";
    }

    let frequencyClass;

    if (frequencyState === "normal") {
      frequencyClass = "frequency-normal";
    } else if (frequencyState === "warning") {
      frequencyClass = "frequency-warning";
    } else {
      frequencyClass = "frequency-alarm";
    }

    element.querySelector(".frequency").className =
      `frequency ${frequencyClass}`;

    element.querySelector(".frequency").textContent =
      `${toPersianDigits(frequency.toFixed(2))} هرتز`;

    const frequencyStatusElement = element.querySelector(".frequency-status");

    frequencyStatusElement.textContent = `وضعیت فرکانس: ${frequencyStatus}`;

    const communicationStatusElement = element.querySelector(
      ".communication-status",
    );

    communicationStatusElement.className = `communication-status ${statusClass}`;

    communicationStatusElement.textContent = `وضعیت ارتباط: ${statusText}`;

    element.querySelector(".age").textContent =
      `سن اندازه‌گیری: ${toPersianDigits(ageSeconds.toFixed(1))} ثانیه`;

    if (ageSeconds > COMMUNICATION_LIMITS.alarmAfterSeconds) {
      return "error";
    }

    if (ageSeconds > COMMUNICATION_LIMITS.staleAfterSeconds) {
      return "stale";
    }

    return "ok";
  } catch (error) {
    console.error(`T${id}:`, error);

    const frequencyElement = element.querySelector(".frequency");

    frequencyElement.className = "frequency"; frequencyElement.textContent = "-- هرتز";

    const frequencyStatusElement = element.querySelector(".frequency-status");

    frequencyStatusElement.textContent = "وضعیت فرکانس: --";

    const communicationStatusElement = element.querySelector(
      ".communication-status",
    );

    communicationStatusElement.className = "communication-status status-error";

    communicationStatusElement.textContent = "وضعیت ارتباط: 🔴 خطای ارتباط";

    element.querySelector(".age").textContent = "سن اندازه‌گیری: -- ثانیه";

    return "error";
  }
}

async function loadTransducers() {
  let errorCount = 0;
  let staleCount = 0;

  for (let id = 1; id <= 10; id++) {
    const result = await updateTransducer(id);

    if (result === "error") {
      errorCount++;
    } else if (result === "stale") {
      staleCount++;
    }
  }

  if (errorCount > 0) {
    status.textContent = `🔴 ${toPersianDigits(
      errorCount,
    )} ترانسدیوسر دارای خطا`;
  } else if (staleCount > 0) {
    status.textContent = `🟠 ${toPersianDigits(
      staleCount,
    )} ترانسدیوسر دارای ارتباط قدیمی`;
  } else {
    status.textContent = "🟢 وضعیت تمام سیستم‌ها عادی است";
  }
}
function formatAlarmTime(timestamp) {
  if (!timestamp) {
    return "--";
  }

  const date = new Date(timestamp);

  const formatter = new Intl.DateTimeFormat("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return formatter.format(date);
}
async function loadLatestAlarm() {
  const banner = document.getElementById("alarm-banner");
  const title = document.getElementById("alarm-banner-title");
  const message = document.getElementById("alarm-banner-message");
  const time = document.getElementById("alarm-banner-time");

  try {
    const response = await fetch("/api/alarms/current");

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const states = await response.json();

    const transducers = Object.values(states);

    const activeAlarms = transducers.filter((state) => state.state === "ALARM");

    const warnings = transducers.filter((state) => state.state === "WARNING");

    // Highest priority: ALARM
    if (activeAlarms.length > 0) {
      const alarm = activeAlarms[0];

      banner.className = "alarm-banner alarm-banner-alarm";

      title.textContent = `🔴 آلارم — ترانسدیوسر ${toPersianDigits(
        alarm.transducer_id,
      )}`;

      message.textContent = `${alarm.message}`;

      time.textContent = formatAlarmTime(alarm.updated_at);

      return;
    }

    // Second priority: WARNING
    if (warnings.length > 0) {
      const warning = warnings[0];

      banner.className = "alarm-banner alarm-banner-warning";

      title.textContent = `🟠 هشدار — ترانسدیوسر ${toPersianDigits(
        warning.transducer_id,
      )}`;

      message.textContent = `${warning.message}`;

      time.textContent = formatAlarmTime(warning.updated_at);

      return;
    }

    // Everything normal
    banner.className = "alarm-banner alarm-banner-cleared";

    title.textContent = "🟢 وضعیت سیستم";

    message.textContent = "تمام ترانسدیوسرها در وضعیت عادی هستند";

    time.textContent = formatAlarmTime(
      transducers.length > 0 ? transducers[0].updated_at : null,
    );
  } catch (error) {
    console.error("خطای دریافت وضعیت آلارم:", error);
  }
}

async function loadFrequencyHistories() {
  const requests = [];

  for (let id = 1; id <= 10; id++) {
    requests.push(
      fetch(`/api/measurements/${id}?limit=60`)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          return response.json();
        })
        .then((data) => {
          drawTransducerChart(id, data);
        })
        .catch((error) => {
          console.error(`خطای تاریخچه T${id}:`, error);
        }),
    );
  }

  await Promise.all(requests);
}

function drawTransducerChart(id, data) {
  const canvas = document.getElementById(`chart-${id}`);

  if (!canvas) {
    return;
  }

  const ctx = canvas.getContext("2d");

  const width = canvas.clientWidth;
  const height = 180;

  canvas.width = width;
  canvas.height = height;

  ctx.clearRect(0, 0, width, height);

  if (data.length < 2) {
    return;
  }

  const latestFrequency = Number(data[data.length - 1].frequency);

  const points = [...data].reverse();

  const minFrequency = 49.2;
  const maxFrequency = 50.2;
  const nominalFrequency = 50.0;

  const paddingLeft = 12;
  const paddingRight = 78;
  const paddingTop = 24;
  const paddingBottom = 28;

  const chartWidth = width - paddingLeft - paddingRight;

  const chartHeight = height - paddingTop - paddingBottom;

  function xPosition(index) {
    return paddingLeft + (index / (points.length - 1)) * chartWidth;
  }

  function yPosition(frequency) {
    return (
      height -
      paddingBottom -
      ((frequency - minFrequency) / (maxFrequency - minFrequency)) * chartHeight
    );
  }

  /*
    Background grid
  */
  ctx.strokeStyle = "#252525";
  ctx.lineWidth = 1;

  const gridValues = [49.4, 49.6, 49.8, 50.0];

  gridValues.forEach((frequency) => {
    const y = yPosition(frequency);

    ctx.beginPath();

    ctx.moveTo(paddingLeft, y);

    ctx.lineTo(width - paddingRight, y);

    ctx.stroke();
  });

  /*
    Lower limit: 49.20 Hz
  */
  ctx.beginPath();

  ctx.moveTo(paddingLeft, yPosition(minFrequency));

  ctx.lineTo(width - paddingRight, yPosition(minFrequency));

  ctx.strokeStyle = "#555";
  ctx.lineWidth = 1;

  ctx.stroke();

  /*
    Upper limit: 50.20 Hz
  */
  ctx.beginPath();

  ctx.moveTo(paddingLeft, yPosition(maxFrequency));

  ctx.lineTo(width - paddingRight, yPosition(maxFrequency));

  ctx.strokeStyle = "#555";
  ctx.stroke();

  /*
    Nominal frequency: 50.00 Hz
  */
  ctx.beginPath();

  ctx.moveTo(paddingLeft, yPosition(nominalFrequency));

  ctx.lineTo(width - paddingRight, yPosition(nominalFrequency));

  ctx.strokeStyle = "#555";
  ctx.setLineDash([5, 5]);

  ctx.stroke();

  ctx.setLineDash([]);

  /*
    Frequency curve
  */
  ctx.beginPath();

  points.forEach((point, index) => {
    const x = xPosition(index);

    const y = yPosition(Number(point.frequency));

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.strokeStyle = "#39d98a";
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  ctx.stroke();

  /*
    Right-side frequency scale
  */
  const labelX = width - paddingRight + 1;

  ctx.fillStyle = "#d8d8d8";
  ctx.font = "bold 12px Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  ctx.fillText("    50.2Hz", labelX, yPosition(maxFrequency) + 2);

  ctx.fillText("    50Hz", labelX, yPosition(nominalFrequency));

  ctx.fillText("    49.2Hz", labelX, yPosition(minFrequency) + 2);

  /*
    Latest value
  */
  ctx.font = "bold 11px Arial";
  ctx.fillStyle = "#39d98a";
  ctx.textAlign = "right";

  ctx.fillText(
    `آخرین مقدار: ${toPersianDigits(latestFrequency.toFixed(2))} هرتز`,
    width - paddingRight,
    14,
  );
}

/*
  Initial load
*/
updateDashboardDateTime();
loadConfig().then(() => {
  loadTransducers();
});
loadFrequencyHistories();
loadLatestAlarm();

setInterval(updateDashboardDateTime, 1000);

setInterval(loadTransducers, 1000);

setInterval(loadFrequencyHistories, 1000);

setInterval(loadLatestAlarm, 1000);
