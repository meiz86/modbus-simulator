const alarmList = document.getElementById("alarm-list");

function toPersianDigits(value) {
  return String(value).replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[digit]);
}

function formatDate(timestamp) {
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp));
}

async function loadActiveAlarms() {
  try {
    const response = await fetch("/api/alarms/active");

    const alarms = await response.json();

    alarmList.innerHTML = "";

    if (alarms.length === 0) {
      alarmList.innerHTML = `
        <div class="no-alarm">
          🟢 هیچ آلارم فعالی وجود ندارد
        </div>
      `;

      return;
    }

    alarms.forEach((alarm) => {
      const card = document.createElement("div");

      card.className =
        alarm.state === "ALARM"
          ? "alarm-card alarm-danger"
          : "alarm-card alarm-warning";

      card.innerHTML = `

        <h2>
          ترانسدیوسر ${toPersianDigits(alarm.transducer_id)}
        </h2>


        <p>
          وضعیت:
          ${alarm.state}
        </p>


        <p>
          کد:
          ${alarm.alarm_code}
        </p>


        <p>
          ${alarm.message}
        </p>


        <p>
          زمان:
          ${formatDate(alarm.updated_at)}
        </p>


        <button
          onclick="acknowledgeAlarm(${alarm.transducer_id})"
        >
          تایید اپراتور
        </button>


      `;

      alarmList.appendChild(card);
    });
  } catch (error) {
    console.error("Alarm loading error:", error);
  }
}

async function acknowledgeAlarm(id) {
  await fetch(`/api/alarms/${id}/acknowledge`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      acknowledgedBy: "operator",
    }),
  });

  loadActiveAlarms();
}

loadActiveAlarms();

setInterval(loadActiveAlarms, 1000);
