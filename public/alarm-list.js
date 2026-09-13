function toPersianDigits(value) {
    return String(value).replace(
        /\d/g,
        (digit) => "۰۱۲۳۴۵۶۷۸۹"[digit],
    );
}

function formatDateTime(timestamp) {
    if (!timestamp) {
        return "--";
    }

    const date = new Date(timestamp);

    const formatter =
        new Intl.DateTimeFormat(
            "fa-IR-u-ca-persian",
            {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
            },
        );

    return formatter.format(date);
}

function getEventLabel(eventType) {
    const labels = {
        ALARM_STARTED: "🔴 شروع آلارم",
        ALARM_CLEARED: "🟢 برطرف شد",
        STATE_CHANGED: "🟠 تغییر وضعیت",
    };

    return labels[eventType] || eventType;
}

async function loadAlarms() {
    const tableBody =
        document.getElementById(
            "alarm-table-body",
        );

    try {
        const response =
            await fetch("/api/alarms?limit=100");

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`,
            );
        }

        const alarms = await response.json();

        if (alarms.length === 0) {
            tableBody.innerHTML = `
        <tr>
          <td colspan="5">
            هیچ آلارمی ثبت نشده است
          </td>
        </tr>
      `;

            return;
        }

        tableBody.innerHTML = alarms
            .map(
                (alarm) => `
          <tr>
            <td>
              ${getEventLabel(alarm.event_type)}
            </td>

            <td>
              ترانسدیوسر
              ${toPersianDigits(
                    alarm.transducer_id,
                )}
            </td>

            <td>
              ${alarm.message}
            </td>

            <td>
              ${toPersianDigits(
                    Number(alarm.frequency).toFixed(2),
                )}
              هرتز
            </td>

            <td>
              ${formatDateTime(
                    alarm.timestamp,
                )}
            </td>
          </tr>
        `,
            )
            .join("");
    } catch (error) {
        console.error(
            "خطای دریافت آلارم‌ها:",
            error,
        );

        tableBody.innerHTML = `
      <tr>
        <td colspan="5">
          خطا در دریافت اطلاعات آلارم
        </td>
      </tr>
    `;
    }
}

function updateDateTime() {
    const element =
        document.getElementById(
            "dashboard-datetime",
        );

    const now = new Date();

    const dateFormatter =
        new Intl.DateTimeFormat(
            "fa-IR-u-ca-persian",
            {
                weekday: "long",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            },
        );

    const timeFormatter =
        new Intl.DateTimeFormat(
            "fa-IR",
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
            },
        );

    element.textContent =
        `${dateFormatter.format(now)} — ${timeFormatter.format(now)}`;
}

document
    .getElementById("refresh-alarms")
    .addEventListener(
        "click",
        loadAlarms,
    );

updateDateTime();
loadAlarms();

setInterval(
    updateDateTime,
    1000,
);

setInterval(
    loadAlarms,
    5000,
);