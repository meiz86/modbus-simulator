const eventList = document.getElementById("event-list");

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

function eventTitle(type) {
  switch (type) {
    case "ALARM_STARTED":
      return "🔴 شروع آلارم";

    case "WARNING_STARTED":
      return "🟠 شروع هشدار";

    case "ALARM_CLEARED":
      return "🟢 رفع آلارم";

    case "ACKNOWLEDGED":
      return "🔵 تایید اپراتور";

    default:
      return type;
  }
}

async function loadEvents() {
  try {
    const response = await fetch("/api/events?limit=100");

    const events = await response.json();

    eventList.innerHTML = "";

    if (events.length === 0) {
      eventList.innerHTML = `
        <div class="no-event">
          هنوز رویدادی ثبت نشده است
        </div>
      `;

      return;
    }

    events.forEach((event) => {
      const card = document.createElement("div");

      card.className = "event-card";

      card.innerHTML = `

        <h2>
          ${eventTitle(event.event_type)}
        </h2>


        <p>
          ترانسدیوسر:
          ${toPersianDigits(event.transducer_id)}
        </p>


        <p>
          پیام:
          ${event.message || "-"}
        </p>


        <p>
          فرکانس:
          ${
            event.frequency
              ? toPersianDigits(Number(event.frequency).toFixed(2)) + " Hz"
              : "-"
          }
        </p>


        <p>
          زمان:
          ${formatDate(event.timestamp)}
        </p>


        ${
          event.operator
            ? `
          <p>
          اپراتور:
          ${event.operator}
          </p>
          `
            : ""
        }


      `;

      eventList.appendChild(card);
    });
  } catch (error) {
    console.error("Event loading error:", error);
  }
}

loadEvents();

setInterval(loadEvents, 2000);
