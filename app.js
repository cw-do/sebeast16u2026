const TEAMSNAP_ICAL_URL =
    'https://ical-cdn.teamsnap.com/team_schedule/15222939-f83d-47f8-af98-0779a11b114f.ics';

let events = [];
const today = new Date();
let currentYear = today.getFullYear();
let currentMonth = today.getMonth();
const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[character]);
}

function unescapeIcal(value = '') {
    return value
        .replace(/\\n/gi, ' ')
        .replace(/\\,/g, ',')
        .replace(/\\;/g, ';')
        .replace(/\\\\/g, '\\');
}

function parseIcalDate(value) {
    const match = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?/);
    if (!match) return null;
    return {
        date: `${match[1]}-${match[2]}-${match[3]}`,
        hour: match[4] === undefined ? null : Number(match[4]),
        minute: match[5] === undefined ? 0 : Number(match[5])
    };
}

function formatTime(value) {
    if (!value || value.hour === null) return 'All day';
    const hour = value.hour % 12 || 12;
    return `${hour}:${String(value.minute).padStart(2, '0')} ${value.hour < 12 ? 'AM' : 'PM'}`;
}

function parseIcal(text) {
    const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
    const parsed = [];
    let item = null;

    for (const line of lines) {
        if (line === 'BEGIN:VEVENT') {
            item = {};
            continue;
        }
        if (line === 'END:VEVENT') {
            const start = parseIcalDate(item.DTSTART || '');
            const end = parseIcalDate(item.DTEND || '');
            if (start) {
                parsed.push({
                    date: start.date,
                    title: unescapeIcal(item.SUMMARY || 'Team event'),
                    time: end && start.hour !== null
                        ? `${formatTime(start)} - ${formatTime(end)}`
                        : formatTime(start),
                    loc: unescapeIcal(item.LOCATION),
                    type: /camp/i.test(item.SUMMARY || '') ? 'camp' : 'u16'
                });
            }
            item = null;
            continue;
        }
        if (!item) continue;
        const separator = line.indexOf(':');
        if (separator < 0) continue;
        const key = line.slice(0, separator).split(';')[0];
        if (['DTSTART', 'DTEND', 'SUMMARY', 'LOCATION'].includes(key)) {
            item[key] = line.slice(separator + 1);
        }
    }

    return parsed.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
}

function renderCalendar(year, month) {
    document.getElementById('monthYear').innerText = `${monthNames[month]} ${year}`;
    const calendarBody = document.getElementById('calendarBody');
    calendarBody.innerHTML = '';
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDaysInMonth = new Date(year, month, 0).getDate();
    let date = 1;
    let nextDate = 1;

    for (let rowIndex = 0; rowIndex < 6; rowIndex++) {
        const row = document.createElement('tr');
        let hasDateInRow = false;
        for (let column = 0; column < 7; column++) {
            const cell = document.createElement('td');
            if (rowIndex === 0 && column < firstDay) {
                const prevDay = prevDaysInMonth - firstDay + column + 1;
                cell.classList.add('other-month');
                cell.innerHTML = `<div class="date-num">${prevDay}</div>`;
            } else if (date > daysInMonth) {
                cell.classList.add('other-month');
                cell.innerHTML = `<div class="date-num">${nextDate++}</div>`;
            } else {
                hasDateInRow = true;
                const dateString =
                    `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
                let content = `<div class="date-num">${date}</div>`;
                for (const event of events.filter(entry => entry.date === dateString)) {
                    content += `
                        <div class="event ${event.type}">
                            <div class="event-time">${escapeHtml(event.time)}</div>
                            <b>${escapeHtml(event.title)}</b>
                            ${event.loc
                                ? `<div class="event-loc">@ ${escapeHtml(event.loc)}</div>`
                                : ''}
                        </div>`;
                }
                cell.innerHTML = content;
                date++;
            }
            row.appendChild(cell);
        }
        if (hasDateInRow || rowIndex < 5) calendarBody.appendChild(row);
    }
}

function changeMonth(delta) {
    currentMonth += delta;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    } else if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    renderCalendar(currentYear, currentMonth);
}

function downloadICS() {
    window.location.href = TEAMSNAP_ICAL_URL;
}

async function loadSchedule() {
    const status = document.getElementById('syncStatus');
    try {
        const response = await fetch(`calendar.ics?v=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        events = parseIcal(await response.text());
        if (!events.length) throw new Error('No events found');
        status.textContent =
            `${events.length} TeamSnap events · Automatically refreshed every 4 hours`;
    } catch (error) {
        status.textContent =
            'The latest TeamSnap schedule could not be loaded. Please try again shortly.';
        console.error('Calendar load failed:', error);
    }
    renderCalendar(currentYear, currentMonth);
}

loadSchedule();
