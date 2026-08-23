const TEAMSNAP_ICAL_URL =
    'https://ical-cdn.teamsnap.com/team_schedule/15222939-f83d-47f8-af98-0779a11b114f.ics';

let events = [];
let selectedLocationKey = '';
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

const GAME_LOCATION_DETAILS = {
    knoxville: { name: 'Knoxville, TN', match: /knoxville|cool sports|ice chalet|kcac|civic coliseum|howard baker|watt rd|lebanon st/i, lat: 35.9606, lng: -83.9207, home: true },
    pittsburgh: { name: 'Pittsburgh, PA', match: /pittsburgh|valencia|frozen pond/i, lat: 40.4406, lng: -79.9959, drive: { miles: 491, hours: 9.3 } },
    sylvania: { name: 'Sylvania, OH', match: /sylvania|tam-o-shanter|toledo/i, lat: 41.7189, lng: -83.7127, drive: { miles: 458, hours: 8.7 } },
    chicago: { name: 'Chicago, IL', match: /chicago|elk grove|vernon hills|lake forest|rosemont|hoffman estates/i, lat: 41.8781, lng: -87.6298, drive: { miles: 527, hours: 10.2 } },
    troy: { name: 'Troy, MI', match: /troy/i, lat: 42.6064, lng: -83.1498, drive: { miles: 531, hours: 10.1 } },
    detroit: { name: 'Detroit, MI', match: /detroit\b/i, lat: 42.3314, lng: -83.0458, drive: { miles: 510, hours: 9.7 } },
    waterloo: { name: 'Waterloo, ON', match: /waterloo/i, lat: 43.4643, lng: -80.5204, drive: { miles: 692, hours: 13.3 } },
    boston: { name: 'Boston, MA', match: /boston|middleton|tewksbury|new england sports center|essex sports|breakaway ice/i, lat: 42.3601, lng: -71.0589, drive: { miles: 919, hours: 17.8 } },
    raleigh: { name: 'Raleigh, NC', match: /raleigh|wake forest/i, lat: 35.7796, lng: -78.6382, drive: { miles: 367, hours: 7.0 } },
    chesterfield: { name: 'Chesterfield, MO', match: /chesterfield|car shield|maryville/i, lat: 38.6631, lng: -90.5771, drive: { miles: 506, hours: 9.3 } }
};

// Historical daily-normal style averages, shown because most games are too far out for forecasts.
// Values are monthly average high/low Fahrenheit by game-location metro area.
const MONTHLY_AVERAGE_TEMPS = {
    knoxville: { high: [48, 53, 62, 71, 78, 85, 88, 87, 82, 71, 60, 51], low: [30, 33, 41, 49, 58, 66, 70, 69, 62, 50, 40, 33] },
    pittsburgh: { high: [36, 39, 49, 62, 72, 80, 84, 82, 76, 64, 51, 40], low: [21, 23, 31, 42, 52, 61, 65, 63, 56, 45, 35, 26] },
    sylvania: { high: [33, 37, 48, 61, 72, 81, 84, 82, 76, 63, 50, 38], low: [19, 21, 29, 40, 51, 61, 65, 63, 56, 44, 34, 25] },
    chicago: { high: [32, 36, 47, 59, 70, 80, 84, 82, 75, 62, 49, 37], low: [18, 22, 31, 41, 51, 61, 67, 65, 57, 45, 34, 24] },
    troy: { high: [32, 35, 46, 59, 70, 79, 83, 81, 74, 61, 48, 36], low: [18, 20, 29, 39, 50, 60, 64, 62, 55, 43, 33, 24] },
    detroit: { high: [32, 35, 46, 59, 70, 79, 83, 81, 74, 61, 48, 36], low: [18, 20, 29, 39, 50, 60, 64, 62, 55, 43, 33, 24] },
    waterloo: { high: [27, 30, 40, 54, 66, 75, 79, 77, 70, 57, 44, 32], low: [12, 14, 23, 34, 45, 55, 60, 58, 50, 39, 30, 19] },
    boston: { high: [37, 39, 46, 57, 67, 76, 82, 80, 73, 62, 51, 42], low: [22, 24, 31, 41, 50, 60, 66, 65, 57, 46, 37, 28] },
    raleigh: { high: [51, 55, 63, 72, 80, 87, 90, 88, 82, 72, 62, 53], low: [32, 35, 42, 50, 59, 68, 72, 70, 64, 51, 41, 35] },
    chesterfield: { high: [40, 45, 57, 68, 77, 86, 90, 88, 81, 69, 56, 44], low: [23, 27, 37, 47, 57, 67, 71, 69, 61, 49, 38, 28] }
};

const HOTEL_PLANS = {
    '2026-09-05|pittsburgh': {
        hotel: 'Hilton Garden Inn Pittsburgh/Cranberry',
        hotelLocation: 'Cranberry Township, PA',
        status: 'booked',
        checkIn: 'Friday Sep 4',
        checkOut: 'Sunday Sep 6',
        nights: '2 nights',
        note: 'Team mostly booked here; families reserved individually.'
    },
    '2026-09-12|sylvania': {
        hotel: 'Hampton Inn Toledo-South/Maumee',
        hotelLocation: 'Maumee, OH',
        status: 'waiting',
        checkIn: 'TBD',
        checkOut: 'TBD',
        nights: 'TBD',
        note: 'Team-recommended hotel exists; group booking link has not been shared yet.'
    },
    '2026-09-19|chicago': {
        hotel: 'Embassy Suites by Hilton Chicago North Shore Deerfield',
        hotelLocation: 'Deerfield, IL',
        status: 'booked',
        checkIn: 'Tournament week of Sep 17',
        checkOut: 'TBD',
        nights: 'TBD',
        emailReceived: 'Aug 17',
        note: 'Team booking link was received.'
    },
    '2026-12-12|waterloo': {
        hotel: 'Hilton Garden Inn Kitchener/Cambridge',
        hotelLocation: '746 Old Hespeler Rd, Cambridge, ON, Canada',
        status: 'booked',
        checkIn: 'Dec 10',
        checkOut: 'Sunday Dec 13',
        nights: '3 nights',
        emailReceived: 'Aug 16',
        note: 'Team booking link was received by email.'
    }
};

const HOME_LOCATION_KEY = 'knoxville';
let locationMapInstance = null;
let locationMarkers = {};
let drivingRouteLayer = null;
let routeRequestId = 0;

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

function isWeekendDate(dateString) {
    const day = new Date(`${dateString}T00:00:00`).getDay();
    return day === 0 || day === 6;
}

function isGameEventTitle(value = '') {
    return /\b(?:vs|at)\b/i.test(value) && !/practice|video review|off ice|training camp|pool party|top golf/i.test(value);
}

function resolveGameLocation(event) {
    const haystack = `${event.loc || ''} ${event.description || ''} ${event.title || ''}`;
    return Object.entries(GAME_LOCATION_DETAILS).find(([, location]) => location.match.test(haystack))?.[0] || '';
}

function enrichEvent(event) {
    const tournament = TOURNAMENT_DETAILS[event.date];
    const descriptionUrl = extractUrl(event.description);
    const label = tournament?.label || '';
    const shortTitle = simplifyTitle(event.title);
    const shortLocation = simplifyLocation(event.loc);
    const isTournament = Boolean(tournament || /tournament|showcase|playoffs|UT1HL|NAT1HL|CCM|Icebreaker/i.test(event.description));
    const isWeekendGame = isWeekendDate(event.date) && isGameEventTitle(event.title);
    const locationKey = isTournament || isWeekendGame ? resolveGameLocation(event) : '';
    return {
        ...event,
        shortTitle,
        displayLoc: shortLocation,
        locationKey,
        tournamentLabel: label,
        tournamentUrl: tournament?.url || descriptionUrl,
        tournamentNote: tournament?.note || '',
        displayTitle: label || shortTitle,
        isTournament,
        isWeekendGame
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
    return Boolean(event.isTournament || event.isWeekendGame || event.tournamentLabel || event.tournamentUrl || event.tournamentNote);
}

function formatDateShort(dateString) {
    const date = new Date(`${dateString}T00:00:00`);
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

function formatAverageTemp(locationKey, dateString) {
    const averages = MONTHLY_AVERAGE_TEMPS[locationKey];
    if (!averages) return '';
    const monthIndex = Number(dateString.slice(5, 7)) - 1;
    const high = averages.high?.[monthIndex];
    const low = averages.low?.[monthIndex];
    if (!Number.isFinite(high) || !Number.isFinite(low)) return '';
    return `${Math.round(low)}F~${Math.round(high)}F avg`;
}

function formatLocationDateHtml(item) {
    return escapeHtml(item).replace(/\((\d+F~\d+F avg)\)/g, '<span class="location-temp">($1)</span>');
}

function summarizeLocationEvents(locationKey, locationEvents) {
    return buildTravelWeekends(locationKey, locationEvents).map(weekend => formatWeekendSummary(weekend));
}

function getWeekStartDate(dateString) {
    const date = new Date(`${dateString}T00:00:00`);
    const day = date.getDay();
    const diffToMonday = (day + 6) % 7;
    date.setDate(date.getDate() - diffToMonday);
    return date.toISOString().slice(0, 10);
}

function buildTravelWeekends(locationKey, locationEvents) {
    const byWeek = new Map();
    for (const event of locationEvents) {
        const weekStart = getWeekStartDate(event.date);
        const groupKey = `${weekStart}|${locationKey}`;
        if (!byWeek.has(groupKey)) byWeek.set(groupKey, { key: groupKey, locationKey, weekStart, events: [] });
        byWeek.get(groupKey).events.push(event);
    }
    return Array.from(byWeek.values())
        .map(weekend => {
            weekend.events.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
            weekend.dates = [...new Set(weekend.events.map(event => event.date))];
            weekend.primaryDate = weekend.dates[0];
            weekend.endDate = weekend.dates[weekend.dates.length - 1];
            weekend.title = [...new Set(weekend.events.map(event => event.displayTitle || event.title))].join(', ');
            weekend.temp = formatAverageTemp(locationKey, weekend.primaryDate);
            weekend.hotel = HOTEL_PLANS[`${weekend.primaryDate}|${locationKey}`] || HOTEL_PLANS[`${weekend.weekStart}|${locationKey}`] || null;
            return weekend;
        })
        .sort((a, b) => a.primaryDate.localeCompare(b.primaryDate));
}

function formatWeekendSummary(weekend) {
    const dateLabel = formatDateRange(weekend.primaryDate, weekend.endDate);
    const tempLabel = weekend.temp ? ` (${weekend.temp})` : '';
    const hotelLabel = weekend.hotel?.hotel ? ` · ${weekend.hotel.hotel}` : '';
    return `${dateLabel} — ${weekend.title}${tempLabel}${hotelLabel}`;
}

function getAllTravelWeekends() {
    return buildGameLocations()
        .filter(location => !location.home)
        .flatMap(location => buildTravelWeekends(location.key, location.events).map(weekend => ({
            ...weekend,
            locationName: location.name,
            driveSummary: formatDriveSummary(location)
        })))
        .sort((a, b) => a.primaryDate.localeCompare(b.primaryDate) || a.locationName.localeCompare(b.locationName));
}

function hotelStatusLabel(plan) {
    if (!plan) return { text: 'No hotel note yet', className: 'unknown' };
    if (plan.status === 'booked') return { text: 'Booked', className: 'booked' };
    if (plan.status === 'waiting') return { text: 'Waiting for team link', className: 'waiting' };
    return { text: 'Planning', className: 'planning' };
}

function renderHotelReservationCell(plan, status) {
    if (!plan) return '<span class="hotel-muted">No hotel note yet</span>';
    const bits = [`<span class="hotel-status hotel-status--${escapeHtml(status.className)}">${escapeHtml(status.text)}</span>`];
    if (plan.emailReceived) bits.push(`<div class="hotel-private">Email received ${escapeHtml(plan.emailReceived)}</div>`);
    if (plan.confirmedDate) bits.push(`<div class="hotel-private">${escapeHtml(plan.confirmedDate)}</div>`);
    return bits.join('');
}

function renderHotelTracker() {
    const container = document.getElementById('hotelTracker');
    if (!container) return;
    const weekends = getAllTravelWeekends().filter(weekend => weekend.hotel || weekend.events.some(event => event.isTournament || event.isWeekendGame));
    if (!weekends.length) {
        container.innerHTML = '<p class="location-empty">No travel weekends found yet.</p>';
        return;
    }
    const rows = weekends.map(weekend => {
        const plan = weekend.hotel;
        const status = hotelStatusLabel(plan);
        const hotel = plan
            ? `<b>${escapeHtml(plan.hotel)}</b>${plan.hotelLocation ? `<br><span class="hotel-muted">${escapeHtml(plan.hotelLocation)}</span>` : ''}${plan.note ? `<br><span class="hotel-note">${escapeHtml(plan.note)}</span>` : ''}`
            : '<span class="hotel-muted">No hotel info added yet</span>';
        const stay = plan
            ? `${escapeHtml(plan.checkIn || 'TBD')} → ${escapeHtml(plan.checkOut || 'TBD')}${plan.nights ? `<br><span class="hotel-muted">${escapeHtml(plan.nights)}</span>` : ''}`
            : '<span class="hotel-muted">TBD</span>';
        const selectedClass = selectedLocationKey === weekend.locationKey ? ' is-highlighted' : '';
        return `
            <tr class="hotel-row${selectedClass}" data-location-key="${escapeHtml(weekend.locationKey)}" title="Click to show ${escapeHtml(weekend.locationName)} route on map">
                <td><button class="hotel-route-button" type="button" data-location-key="${escapeHtml(weekend.locationKey)}">${escapeHtml(formatDateRange(weekend.primaryDate, weekend.endDate))}</button></td>
                <td><b>${escapeHtml(weekend.title)}</b><br><span class="hotel-muted">${escapeHtml(weekend.locationName)}${weekend.driveSummary ? ` · ${escapeHtml(weekend.driveSummary)}` : ''}</span></td>
                <td>${weekend.temp ? `<span class="location-temp">${escapeHtml(weekend.temp)}</span>` : '<span class="hotel-muted">—</span>'}</td>
                <td>${hotel}</td>
                <td>${stay}</td>
                <td>${renderHotelReservationCell(plan, status)}</td>
            </tr>`;
    }).join('');
    container.innerHTML = `
        <div class="hotel-table-wrap">
            <table class="hotel-table">
                <thead>
                    <tr>
                        <th>Weekend</th>
                        <th>Game / location</th>
                        <th>Temp</th>
                        <th>Hotel</th>
                        <th>Stay</th>
                        <th>Reservation</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
}

function formatDateRange(startDateString, endDateString) {
    const start = new Date(`${startDateString}T00:00:00`);
    const end = new Date(`${endDateString}T00:00:00`);
    const startMonth = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(start);
    const endMonth = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(end);
    const startDay = start.getDate();
    const endDay = end.getDate();

    if (startDateString === endDateString) return `${startMonth} ${startDay}`;
    if (startMonth === endMonth) return `${startMonth} ${startDay}-${endDay}`;
    return `${startMonth} ${startDay}-${endMonth} ${endDay}`;
}

function summarizeLocationMarkerDates(locationEvents) {
    const dates = [...new Set(locationEvents.map(event => event.date))].sort();
    if (!dates.length) return '';

    const ranges = [];
    let rangeStart = dates[0];
    let rangeEnd = dates[0];

    for (const dateString of dates.slice(1)) {
        const nextExpected = new Date(`${rangeEnd}T00:00:00`);
        nextExpected.setDate(nextExpected.getDate() + 1);
        const expectedString = nextExpected.toISOString().slice(0, 10);

        if (dateString === expectedString) {
            rangeEnd = dateString;
        } else {
            ranges.push(formatDateRange(rangeStart, rangeEnd));
            rangeStart = dateString;
            rangeEnd = dateString;
        }
    }
    ranges.push(formatDateRange(rangeStart, rangeEnd));

    return ranges.join('/');
}

function summarizeLocationMarkerLabel(location) {
    if (location.home) return location.name;
    const dateLabel = summarizeLocationMarkerDates(location.events);
    return dateLabel ? `${dateLabel}, ${location.name}` : location.name;
}

function formatDriveSummary(location) {
    if (!location.drive) return '';
    return `${location.drive.hours.toFixed(1)} hr · ${location.drive.miles.toLocaleString()} mi`;
}

function renderLocationCards(locations) {
    const mutedClass = key => selectedLocationKey && key !== selectedLocationKey ? ' is-muted' : '';
    const highlightedClass = key => selectedLocationKey === key ? ' is-highlighted' : '';
    const cards = [];

    for (const location of locations) {
        const driveSummary = formatDriveSummary(location);
        if (location.home) {
            cards.push(`
        <button class="location-card${mutedClass(location.key)}${highlightedClass(location.key)}" type="button" data-location-key="${escapeHtml(location.key)}">
            <div class="location-card-title">
                <span>${escapeHtml(location.name)} <span class="location-home-label">HOME</span></span>
            </div>
            <div class="location-card-dates"><div>${formatLocationDateHtml(location.dates[0])}</div></div>
            ${selectedLocationKey === location.key ? '<div class="location-card-note">Selected — home base highlighted on map</div>' : ''}
        </button>`);
            continue;
        }

        for (const weekend of buildTravelWeekends(location.key, location.events)) {
            cards.push(`
        <button class="location-card${mutedClass(location.key)}${highlightedClass(location.key)}" type="button" data-location-key="${escapeHtml(location.key)}">
            <div class="location-card-title">
                <span>${escapeHtml(formatDateRange(weekend.primaryDate, weekend.endDate))} · ${escapeHtml(location.name)}</span>
                ${driveSummary ? `<span class="location-drive-summary">${escapeHtml(driveSummary)}</span>` : ''}
            </div>
            <div class="location-card-dates"><div>${formatLocationDateHtml(formatWeekendSummary(weekend))}</div></div>
            ${selectedLocationKey === location.key ? '<div class="location-card-note">Selected — driving route shown on map</div>' : ''}
        </button>`);
        }
    }
    return cards.join('');
}

function firstLocationGameDate(location) {
    return location.events
        .map(event => event.date)
        .sort()[0] || '9999-12-31';
}

function buildGameLocations() {
    const grouped = new Map();
    for (const event of events.filter(entry => entry.locationKey && (entry.isTournament || entry.isWeekendGame))) {
        if (!grouped.has(event.locationKey)) grouped.set(event.locationKey, []);
        grouped.get(event.locationKey).push(event);
    }
    return Object.entries(GAME_LOCATION_DETAILS)
        .filter(([key, detail]) => detail.home || grouped.has(key))
        .map(([key, detail]) => {
            const locationEvents = (grouped.get(key) || []).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
            return {
                key,
                ...detail,
                events: locationEvents,
                firstDate: locationEvents[0]?.date || '',
                dates: detail.home
                    ? ['Home base — Knoxville / Cool Sports / Ice Chalet / KCAC']
                    : summarizeLocationEvents(key, locationEvents)
            };
        })
        .sort((a, b) => {
            if (a.home !== b.home) return a.home ? -1 : 1;
            return firstLocationGameDate(a).localeCompare(firstLocationGameDate(b)) || a.name.localeCompare(b.name);
        });
}

function markerHtml(location) {
    const highlighted = selectedLocationKey === location.key ? ' highlighted' : '';
    const home = location.home ? ' home' : '';
    const label = summarizeLocationMarkerLabel(location);
    return `
        <div class="location-marker-row${highlighted ? ' highlighted' : ''}">
            <div class="location-marker${home}${highlighted}">${location.home ? 'H' : '•'}</div>
            <div class="location-marker-label">${escapeHtml(label)}</div>
        </div>`;
}

function markerIcon(location) {
    const muted = selectedLocationKey && location.key !== selectedLocationKey ? ' is-muted' : '';
    return L.divIcon({
        className: `location-marker-wrap${muted}`,
        html: markerHtml(location),
        iconSize: [210, 34],
        iconAnchor: [14, 17],
        popupAnchor: [0, -17]
    });
}

function updateLeafletMarkerStyles(locations = []) {
    const byKey = new Map(locations.map(location => [location.key, location]));
    Object.entries(locationMarkers).forEach(([key, marker]) => {
        const location = byKey.get(key) || { key, ...GAME_LOCATION_DETAILS[key], events: [] };
        marker.setIcon(markerIcon(location));
    });
}

function fitLeafletMap(bounds) {
    if (!locationMapInstance || !bounds.length) return;
    locationMapInstance.invalidateSize();
    locationMapInstance.fitBounds(bounds, { padding: [32, 32], maxZoom: 5 });
}

function clearDrivingRoute() {
    if (drivingRouteLayer) {
        drivingRouteLayer.remove();
        drivingRouteLayer = null;
    }
}

async function drawDrivingRoute(location) {
    clearDrivingRoute();
    if (!locationMapInstance || !location || location.home) return;
    const home = GAME_LOCATION_DETAILS[HOME_LOCATION_KEY];
    if (!home) return;

    const requestId = ++routeRequestId;
    const routeUrl =
        `https://router.project-osrm.org/route/v1/driving/${home.lng},${home.lat};${location.lng},${location.lat}` +
        '?overview=full&geometries=geojson';

    try {
        const response = await fetch(routeUrl);
        if (!response.ok) throw new Error(`Route HTTP ${response.status}`);
        const data = await response.json();
        if (requestId !== routeRequestId || !data.routes?.[0]?.geometry) return;

        drivingRouteLayer = L.geoJSON(data.routes[0].geometry, {
            style: {
                color: '#f59e0b',
                opacity: 0.9,
                weight: 5
            }
        }).addTo(locationMapInstance);
    } catch (error) {
        console.warn('Driving route could not be loaded:', error);
        clearDrivingRoute();
    }
}

function updateSelectedDrivingRoute(locations) {
    const selected = locations.find(location => location.key === selectedLocationKey);
    if (selected && !selected.home) {
        drawDrivingRoute(selected);
    } else {
        routeRequestId++;
        clearDrivingRoute();
    }
}

function renderLeafletMap(locations) {
    const mapContainer = document.getElementById('gameLocationMap');
    if (!mapContainer) return;
    if (typeof L === 'undefined') {
        mapContainer.innerHTML = '<p class="location-empty">Interactive map could not be loaded. Please refresh the page.</p>';
        return;
    }
    if (!locationMapInstance) {
        locationMapInstance = L.map('gameLocationMap', {
            scrollWheelZoom: false,
            worldCopyJump: false
        }).setView([39.6, -82.8], 5);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 12,
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(locationMapInstance);
    }

    Object.values(locationMarkers).forEach(marker => marker.remove());
    locationMarkers = {};

    const bounds = [];
    for (const location of locations) {
        const marker = L.marker([location.lat, location.lng], {
            icon: markerIcon(location)
        }).addTo(locationMapInstance);
        marker.bindPopup(`<strong>${escapeHtml(location.name)}</strong><br>${location.dates.map(item => formatLocationDateHtml(item)).join('<br>')}`);
        marker.on('click', () => selectLocation(location.key));
        locationMarkers[location.key] = marker;
        bounds.push([location.lat, location.lng]);
    }

    updateLeafletMarkerStyles(locations);
    updateSelectedDrivingRoute(locations);
    fitLeafletMap(bounds);
    setTimeout(() => {
        if (!selectedLocationKey) fitLeafletMap(bounds);
    }, 100);
}

function renderLocationMap() {
    const container = document.getElementById('locationMap');
    if (!container) return;
    const locations = buildGameLocations();
    if (!locations.length) {
        container.innerHTML = '<p class="location-empty">No game locations found yet.</p>';
        return;
    }

    if (locationMapInstance) {
        clearDrivingRoute();
        locationMapInstance.remove();
        locationMapInstance = null;
        locationMarkers = {};
    }
    container.innerHTML = `
        <div class="map-panel"><div id="gameLocationMap" role="img" aria-label="Game locations map"></div></div>
    `;
    renderLeafletMap(locations);
}

function updateLocationSelection() {
    const locations = buildGameLocations();
    if (!locationMapInstance) {
        renderLocationMap();
        renderHotelTracker();
        return;
    }
    updateLeafletMarkerStyles(locations);
    updateSelectedDrivingRoute(locations);
    renderHotelTracker();
}

function selectLocation(locationKey = '') {
    selectedLocationKey = selectedLocationKey === locationKey ? '' : locationKey;
    renderCalendar(currentYear, currentMonth);
    updateLocationSelection();
}

function selectLocationForDate(dateString) {
    const locationKey = events.find(event => event.date === dateString && event.locationKey)?.locationKey || '';
    if (!locationKey) return;
    selectedLocationKey = locationKey;
    renderCalendar(currentYear, currentMonth);
    updateLocationSelection();
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
                const dayEvents = events.filter(entry => entry.date === dateString);
                const locationEvent = dayEvents.find(entry => entry.locationKey);
                if (locationEvent) {
                    cell.classList.add('has-location-event');
                    cell.dataset.date = dateString;
                    if (selectedLocationKey && locationEvent.locationKey === selectedLocationKey) {
                        cell.classList.add('selected-date');
                    }
                }
                let content = `<div class="date-num">${date}</div>`;
                for (const event of dayEvents) {
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
    if (event.locationKey && selectedLocationKey !== event.locationKey) {
        selectedLocationKey = event.locationKey;
        renderCalendar(currentYear, currentMonth);
        updateLocationSelection();
    }
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
    const locationTarget = event.target.closest('[data-location-key]');
    if (locationTarget) {
        selectLocation(locationTarget.dataset.locationKey);
        return;
    }
    const dateCell = event.target.closest('td.has-location-event');
    if (dateCell?.dataset.date) {
        selectLocationForDate(dateCell.dataset.date);
        return;
    }
    if (event.target.matches('[data-close-modal]')) closeEventDetails();
});

document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeEventDetails();
    if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-location-key]')) {
        event.preventDefault();
        selectLocation(event.target.dataset.locationKey);
    }
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
    }
    renderCalendar(currentYear, currentMonth);
    renderLocationMap();
    renderHotelTracker();
}

loadSchedule();
