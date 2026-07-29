import { writeFile } from 'node:fs/promises';

const calendarUrl =
    'https://ical-cdn.teamsnap.com/team_schedule/15222939-f83d-47f8-af98-0779a11b114f.ics';

const response = await fetch(calendarUrl);
if (!response.ok) throw new Error(`TeamSnap returned HTTP ${response.status}`);

const calendar = await response.text();
if (!calendar.includes('BEGIN:VCALENDAR') || !calendar.includes('BEGIN:VEVENT')) {
    throw new Error('TeamSnap response is not a valid event calendar');
}

await writeFile(new URL('../calendar.ics', import.meta.url), calendar, 'utf8');
console.log(`Saved calendar.ics (${calendar.length} characters)`);
