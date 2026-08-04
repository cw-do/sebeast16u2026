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

const TOURNAMENT_DETAILS = {
    '2026-09-12': {
        label: 'Jackson Weis Memorial / OVC',
        url: 'https://tamohockey.com/jackson-weis-memorial%2Fovc',
        note: 'Tournament weekend in the Toledo/Sylvania area.'
    },
    '2026-09-19': {
        label: 'Chicago Icebreaker',
        url: 'https://superserieshockey.com/events/chicago-icebreaker/',
        note: 'SuperSeries tournament weekend in the Chicago area.'
    },
    '2026-10-17': {
        label: 'CCM Motown',
        url: 'http://200x85.com/ccm-motown/',
        note: '200x85 CCM Motown tournament weekend in Detroit.'
    },
    '2026-11-14': {
        label: 'UT1HL Futures Showcase',
        url: 'https://unitedtier1hockeyleague.com/futures-showcase-2/',
        note: 'United Tier 1 Hockey League showcase weekend in Massachusetts.'
    },
    '2026-12-12': {
        label: 'Gold Puck AAA',
        url: 'https://waterloominorhockey.com/Tournaments/6456/Gold_Puck_AAA_Tournament/',
        note: 'Gold Puck AAA Tournament in Waterloo, Ontario.'
    },
    '2026-12-19': {
        label: 'UT1HL',
        url: 'https://unitedtier1hockeyleague.com/missouri/',
        note: 'United Tier 1 Hockey League weekend in Missouri.'
    },
    '2027-01-09': {
        label: 'UT1HL',
        url: 'https://unitedtier1hockeyleague.com/missouri/',
        note: 'United Tier 1 Hockey League weekend.'
    },
    '2027-01-16': {
        label: 'NAT1HL',
        url: 'https://nat1hl.com/',
        note: 'NAT1HL tournament weekend in the Detroit/Troy area.'
    },
    '2027-01-30': {
        label: 'UT1HL Tournament',
        note: 'United Tier 1 Hockey League tournament weekend in Boston.'
    },
    '2027-02-27': {
        label: 'UT1HL Tier 1 Playoffs',
        url: 'https://unitedtier1hockeyleague.com/tier-1-playoffs/',
        note: 'United Tier 1 Hockey League playoffs in Massachusetts.'
    }
};

function cleanDescription(value = '') {
    return unescapeIcal(value)
        .replace(/\s*-\s*\(Arrival Time:[^)]+\)\s*$/i, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractUrl(value = '') {
    const match = value.match(/https?:\/\/[^\s)]+|\b(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}\/[^\s)]+/i);
    if (!match) return '';
    const url = match[0].replace(/[.,;]+$/, '');
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function simplifyTitle(value = '') {
    return value
        .replace(/^Southeast\s+Beast\s+16u\s*-\s*/i, '')
        .replace(/^Southeast\s+Beast\s+16u\s+/i, '')
        .replace(/\b16u\b/gi, '16U')
        .trim();
}

function simplifyLocation(value = '') {
    const location = value.trim();
    if (!location) return '';
    if (/110\s+S\s+Watt\s+Rd|Cool\s+Sports/i.test(location)) return 'Cool Sports';
    if (/100\s+Lebanon\s+St|Ice\s+Chalet/i.test(location)) return 'Ice Chalet';
    if (/500\s+Howard\s+Baker\s+Jr\s+Blvd|Civic\s+Coliseum|KCAC/i.test(location)) return 'KCAC';
    return location;
}

function enrichEvent(event) {
    const tournament = TOURNAMENT_DETAILS[event.date];
    const descriptionUrl = extractUrl(event.description);
    const label = tournament?.label || '';
    const shortTitle = simplifyTitle(event.title);
    const shortLocation = simplifyLocation(event.loc);
    return {
        ...event,
        shortTitle,
        displayLoc: shortLocation,
        tournamentLabel: label,
        tournamentUrl: tournament?.url || descriptionUrl,
        tournamentNote: tournament?.note || '',
        displayTitle: label || shortTitle,
        isTournament: Boolean(tournament || /tournament|showcase|playoffs|UT1HL|NAT1HL|CCM|Icebreaker/i.test(event.description))
    };
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
                parsed.push(enrichEvent({
                    id: `event-${parsed.length}`,
                    date: start.date,
                    title: unescapeIcal(item.SUMMARY || 'Team event'),
                    time: end && start.hour !== null
                        ? (start.hour === 0 && start.minute === 0 && end.hour === 0 && end.minute === 0 && end.date !== start.date
                            ? 'All day'
                            : `${formatTime(start)} - ${formatTime(end)}`)
                        : formatTime(start),
                    loc: unescapeIcal(item.LOCATION),
                    description: cleanDescription(item.DESCRIPTION || ''),
                    type: /camp/i.test(item.SUMMARY || '') ? 'camp' : 'u16'
                }));
            }
            item = null;
            continue;
        }
        if (!item) continue;
        const separator = line.indexOf(':');
        if (separator < 0) continue;
        const key = line.slice(0, separator).split(';')[0];
        if (['DTSTART', 'DTEND', 'SUMMARY', 'LOCATION', 'DESCRIPTION', 'URL'].includes(key)) {
            item[key] = line.slice(separator + 1);
        }
    }

    return parsed.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
}

function eventNeedsDetails(event) {
    return Boolean(event.isTournament || event.tournamentLabel || event.tournamentUrl || event.tournamentNote);
}

function renderEvent(event) {
    const detailsClass = eventNeedsDetails(event) ? ' has-details' : '';
    const tournamentClass = event.isTournament ? ' tournament' : '';
    const label = event.tournamentLabel
        ? `<div class="event-badge">Tournament</div>`
        : '';
    const linkHint = eventNeedsDetails(event)
        ? '<div class="event-hint">Click for details ↗</div>'
        : '';

    return `
        <button class="event ${event.type}${detailsClass}${tournamentClass}"
                type="button"
                data-event-id="${escapeHtml(event.id)}"
                ${eventNeedsDetails(event) ? '' : 'disabled'}>
            ${label}
            <div class="event-time">${escapeHtml(event.time)}</div>
            <b>${escapeHtml(event.displayTitle || event.title)}</b>
            ${event.displayLoc ? `<div class="event-loc">@ ${escapeHtml(event.displayLoc)}</div>` : ''}
            ${linkHint}
        </button>`;
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
                    content += renderEvent(event);
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

function openEventDetails(eventId) {
    const event = events.find(entry => entry.id === eventId);
    if (!event) return;

    const modal = document.getElementById('eventModal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const link = document.getElementById('modalLink');

    title.textContent = event.displayTitle || event.title;
    body.innerHTML = `
        <dl class="event-details-list">
            <div><dt>Date</dt><dd>${escapeHtml(event.date)}</dd></div>
            <div><dt>Time</dt><dd>${escapeHtml(event.time)}</dd></div>
            ${event.displayLoc ? `<div><dt>Location</dt><dd>${escapeHtml(event.displayLoc)}${event.loc && event.loc !== event.displayLoc ? `<br><span class="event-full-location">${escapeHtml(event.loc)}</span>` : ''}</dd></div>` : ''}
            ${event.tournamentNote ? `<div><dt>Scout note</dt><dd>${escapeHtml(event.tournamentNote)}</dd></div>` : ''}
            ${event.description ? `<div><dt>TeamSnap details</dt><dd>${escapeHtml(event.description)}</dd></div>` : ''}
        </dl>`;

    if (event.tournamentUrl) {
        link.href = event.tournamentUrl;
        link.textContent = `Open ${event.tournamentLabel || 'event page'}`;
        link.hidden = false;
    } else {
        link.hidden = true;
        link.removeAttribute('href');
    }

    modal.hidden = false;
    modal.classList.add('is-open');
    document.body.classList.add('modal-open');
    document.getElementById('modalClose').focus();
}

function closeEventDetails() {
    const modal = document.getElementById('eventModal');
    modal.classList.remove('is-open');
    modal.hidden = true;
    document.body.classList.remove('modal-open');
}

document.addEventListener('click', event => {
    const eventButton = event.target.closest('[data-event-id]');
    if (eventButton) {
        openEventDetails(eventButton.dataset.eventId);
        return;
    }
    if (event.target.matches('[data-close-modal]')) closeEventDetails();
});

document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeEventDetails();
});

function formatSyncedAt(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Sync time unavailable';
    return new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short'
    }).format(date);
}

async function loadSchedule() {
    const status = document.getElementById('syncStatus');
    const button = document.getElementById('syncButton');
    button.disabled = true;
    button.textContent = 'Refreshing…';
    try {
        const cacheBuster = Date.now();
        const [calendarResponse, metadataResponse] = await Promise.all([
            fetch(`calendar.ics?v=${cacheBuster}`, { cache: 'no-store' }),
            fetch(`calendar-meta.json?v=${cacheBuster}`, { cache: 'no-store' })
        ]);
        if (!calendarResponse.ok) throw new Error(`Calendar HTTP ${calendarResponse.status}`);
        if (!metadataResponse.ok) throw new Error(`Metadata HTTP ${metadataResponse.status}`);
        events = parseIcal(await calendarResponse.text());
        if (!events.length) throw new Error('No events found');
        const metadata = await metadataResponse.json();
        status.textContent =
            `🕒 Last TeamSnap sync: ${formatSyncedAt(metadata.syncedAt)} · ${events.length} events`;
    } catch (error) {
        status.textContent =
            'The latest TeamSnap schedule could not be loaded. Please try again shortly.';
        console.error('Calendar load failed:', error);
    } finally {
        button.disabled = false;
        button.textContent = '↻ Refresh';
    }
    renderCalendar(currentYear, currentMonth);
}

function refreshSchedule() {
    document.getElementById('syncStatus').textContent = 'Checking for the latest synced schedule…';
    loadSchedule();
}

loadSchedule();
