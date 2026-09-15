class JalaliDateTimePicker {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;

    const now = new Date();

    const jalali = this.gregorianToJalali(
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate(),
    );

    this.year = jalali.jy;
    this.month = jalali.jm;
    this.day = jalali.jd;

    this.hour = now.getHours();
    this.minute = now.getMinutes();

    this.render();
  }

  pad(value) {
    return String(value).padStart(2, "0");
  }

  toPersianDigits(value) {
    return String(value).replace(/\d/g, (digit) => {
      return "۰۱۲۳۴۵۶۷۸۹"[digit];
    });
  }

  jalaliMonthName(month) {
    const months = [
      "فروردین",
      "اردیبهشت",
      "خرداد",
      "تیر",
      "مرداد",
      "شهریور",
      "مهر",
      "آبان",
      "آذر",
      "دی",
      "بهمن",
      "اسفند",
    ];

    return months[month - 1];
  }

  jalaliMonthDays(year, month) {
    if (month <= 6) {
      return 31;
    }

    if (month <= 11) {
      return 30;
    }

    return this.isLeapJalaliYear(year) ? 30 : 29;
  }

  isLeapJalaliYear(year) {
    const breaks = [
      -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097,
      2192, 2262, 2274, 2294, 2340, 2380, 2391, 2406, 2434, 2470, 2477, 2494,
      2496, 2526, 2527, 2532, 2560, 2582, 2595, 2596, 2606, 2610, 2611, 2620,
      2625,
    ];

    let leapJ = -14;
    let jp = breaks[0];
    let jump = 0;

    for (let i = 1; i < breaks.length; i++) {
      const jm = breaks[i];

      jump = jm - jp;

      if (year < jm) {
        break;
      }

      leapJ += Math.floor(jump / 33) * 8;
      leapJ += Math.floor((jump % 33) / 4);

      jp = jm;
    }

    let n = year - jp;

    leapJ += Math.floor(n / 33) * 8;
    leapJ += Math.floor(((n % 33) + 3) / 4);

    return (leapJ + 1) % 4 === 0;
  }

  div(a, b) {
    return Math.floor(a / b);
  }

  gregorianToJalali(gy, gm, gd) {
    const gDaysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    const gy2 = gm > 2 ? gy + 1 : gy;

    let days =
      355666 +
      365 * gy +
      this.div(gy2 + 3, 4) -
      this.div(gy2 + 99, 100) +
      this.div(gy2 + 399, 400) +
      gd;

    for (let i = 0; i < gm - 1; i++) {
      days += gDaysInMonth[i];
    }

    if (gm > 2 && ((gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0)) {
      days++;
    }

    let jy = -1595 + 33 * this.div(days, 12053);

    days %= 12053;

    jy += 4 * this.div(days, 1461);

    days %= 1461;

    if (days > 365) {
      jy += this.div(days - 1, 365);
      days = (days - 1) % 365;
    }

    let jm;

    if (days < 186) {
      jm = 1 + this.div(days, 31);
    } else {
      jm = 7 + this.div(days - 186, 30);
    }

    const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);

    return {
      jy,
      jm,
      jd,
    };
  }

  jalaliToGregorian(jy, jm, jd) {
    jy += 1595;

    let days =
      -355668 +
      365 * jy +
      this.div(jy, 33) * 8 +
      this.div((jy % 33) + 3, 4) +
      jd;

    if (jm < 7) {
      days += (jm - 1) * 31;
    } else {
      days += (jm - 7) * 30 + 186;
    }

    let gy = 400 * this.div(days, 146097);

    days %= 146097;

    if (days > 36524) {
      days--;

      gy += 100 * this.div(days, 36524);

      days %= 36524;

      if (days >= 365) {
        days++;
      }
    }

    gy += 4 * this.div(days, 1461);

    days %= 1461;

    if (days > 365) {
      gy += this.div(days - 1, 365);
      days = (days - 1) % 365;
    }

    const gd = days + 1;

    const leap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;

    const monthDays = [
      31,
      leap ? 29 : 28,
      31,
      30,
      31,
      30,
      31,
      31,
      30,
      31,
      30,
      31,
    ];

    let gm = 1;
    let remaining = gd;

    for (const daysInMonth of monthDays) {
      if (remaining <= daysInMonth) {
        break;
      }

      remaining -= daysInMonth;
      gm++;
    }

    return {
      gy,
      gm,
      gd: remaining,
    };
  }

  getMonthGrid() {
    const gregorian = this.jalaliToGregorian(this.year, this.month, 1);

    const date = new Date(gregorian.gy, gregorian.gm - 1, gregorian.gd);

    let weekday = date.getDay();

    // JavaScript:
    // Sunday = 0
    // Convert so Saturday = 0.
    weekday = (weekday + 1) % 7;

    const days = [];

    for (let i = 0; i < weekday; i++) {
      days.push(null);
    }

    const monthDays = this.jalaliMonthDays(this.year, this.month);

    for (let day = 1; day <= monthDays; day++) {
      days.push(day);
    }

    return days;
  }

  changeMonth(offset) {
    this.month += offset;

    if (this.month > 12) {
      this.month = 1;
      this.year++;
    }

    if (this.month < 1) {
      this.month = 12;
      this.year--;
    }

    const maxDay = this.jalaliMonthDays(this.year, this.month);

    if (this.day > maxDay) {
      this.day = maxDay;
    }

    this.render();
  }

  setDay(day) {
    if (!day) {
      return;
    }

    this.day = Number(day);

    this.render();
  }

  setHour(hour) {
    this.hour = Number(hour);

    this.updateTimeControls();
  }

  setMinute(minute) {
    this.minute = Number(minute);

    this.updateTimeControls();
  }

  /*
   * Set the picker from a normal JavaScript Date.
   *
   * This is used by trends.js to initialize:
   *   - start = now - 1 hour
   *   - end   = now
   */
  setDate(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
      return;
    }

    const jalali = this.gregorianToJalali(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate(),
    );

    this.year = jalali.jy;
    this.month = jalali.jm;
    this.day = jalali.jd;

    this.hour = date.getHours();
    this.minute = date.getMinutes();

    this.render();
  }

  getDate() {
    const gregorian = this.jalaliToGregorian(this.year, this.month, this.day);

    return new Date(
      gregorian.gy,
      gregorian.gm - 1,
      gregorian.gd,
      this.hour,
      this.minute,
      0,
      0,
    );
  }

  getISO() {
    return this.getDate().toISOString();
  }

  updateTimeControls() {
    const hour = document.getElementById(`${this.container.id}-hour`);

    const minute = document.getElementById(`${this.container.id}-minute`);

    if (hour) {
      hour.value = this.pad(this.hour);
    }

    if (minute) {
      minute.value = this.pad(this.minute);
    }

    const display = document.getElementById(`${this.container.id}-selected`);

    if (display) {
      display.textContent =
        `${this.toPersianDigits(this.year)}/` +
        `${this.toPersianDigits(this.pad(this.month))}/` +
        `${this.toPersianDigits(this.pad(this.day))} ` +
        `${this.toPersianDigits(this.pad(this.hour))}:` +
        `${this.toPersianDigits(this.pad(this.minute))}`;
    }
  }

  render() {
    const days = this.getMonthGrid();

    const weekdays = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

    this.container.innerHTML = `
      <div class="jalali-picker">

        <div class="jalali-picker-header">

          <button
            type="button"
            class="jalali-picker-nav"
            data-action="previous"
          >
            ‹
          </button>

          <div class="jalali-picker-title">
            ${this.jalaliMonthName(this.month)}
            ${this.toPersianDigits(this.year)}
          </div>

          <button
            type="button"
            class="jalali-picker-nav"
            data-action="next"
          >
            ›
          </button>

        </div>

        <div class="jalali-picker-weekdays">
          ${weekdays.map((day) => `<div>${day}</div>`).join("")}
        </div>

        <div class="jalali-picker-days">
          ${days
            .map((day) => {
              if (!day) {
                return `<div></div>`;
              }

              const selected = day === this.day ? "selected" : "";

              return `
                <button
                  type="button"
                  class="jalali-picker-day ${selected}"
                  data-day="${day}"
                >
                  ${this.toPersianDigits(day)}
                </button>
              `;
            })
            .join("")}
        </div>

        <div class="jalali-picker-time">

          <div class="jalali-picker-time-title">
            ساعت
          </div>

          <div class="jalali-picker-time-controls">

            <select
              id="${this.container.id}-hour"
            >
              ${Array.from(
                { length: 24 },
                (_, hour) => `
                  <option
                    value="${this.pad(hour)}"
                    ${hour === this.hour ? "selected" : ""}
                  >
                    ${this.toPersianDigits(this.pad(hour))}
                  </option>
                `,
              ).join("")}
            </select>

            <span>:</span>

            <select
              id="${this.container.id}-minute"
            >
              ${Array.from(
                { length: 60 },
                (_, minute) => `
                  <option
                    value="${this.pad(minute)}"
                    ${minute === this.minute ? "selected" : ""}
                  >
                    ${this.toPersianDigits(this.pad(minute))}
                  </option>
                `,
              ).join("")}
            </select>

          </div>

        </div>

        <div
          id="${this.container.id}-selected"
          class="jalali-picker-selected"
        >
          ${this.toPersianDigits(this.year)}/
          ${this.toPersianDigits(this.pad(this.month))}/
          ${this.toPersianDigits(this.pad(this.day))}
          ${this.toPersianDigits(this.pad(this.hour))}:
          ${this.toPersianDigits(this.pad(this.minute))}
        </div>

      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    this.container
      .querySelector('[data-action="previous"]')
      .addEventListener("click", () => {
        this.changeMonth(-1);
      });

    this.container
      .querySelector('[data-action="next"]')
      .addEventListener("click", () => {
        this.changeMonth(1);
      });

    this.container.querySelectorAll("[data-day]").forEach((button) => {
      button.addEventListener("click", () => {
        this.setDay(Number(button.dataset.day));
      });
    });

    const hour = document.getElementById(`${this.container.id}-hour`);

    const minute = document.getElementById(`${this.container.id}-minute`);

    if (hour) {
      hour.addEventListener("change", (event) => {
        this.setHour(event.target.value);
      });
    }

    if (minute) {
      minute.addEventListener("change", (event) => {
        this.setMinute(event.target.value);
      });
    }
  }
}

window.JalaliDateTimePicker = JalaliDateTimePicker;
