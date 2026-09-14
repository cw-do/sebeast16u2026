#!/usr/bin/env node

const SHEET_CSV_URL =
    'https://docs.google.com/spreadsheets/d/1II5uBT_KuIPIJ2D8Y_UILltH9FOIQxzb/export?format=csv';

function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;

    for (let i = 0; i < text.length; i += 1) {
        const character = text[i];
        const next = text[i + 1];
        if (character === '"' && quoted && next === '"') {
            field += '"';
            i += 1;
        } else if (character === '"') {
            quoted = !quoted;
        } else if (character === ',' && !quoted) {
            row.push(field);
            field = '';
        } else if ((character === '\n' || character === '\r') && !quoted) {
            if (character === '\r' && next === '\n') i += 1;
            row.push(field);
            if (row.some(value => value !== '')) rows.push(row);
            row = [];
            field = '';
        } else {
            field += character;
        }
    }
    if (field || row.length) {
        row.push(field);
        if (row.some(value => value !== '')) rows.push(row);
    }
    return rows;
}

const args = process.argv.slice(2);
const playerFlag = args.indexOf('--player');
const player = playerFlag >= 0 ? args[playerFlag + 1] : 'Jason Do';
if (!player) throw new Error('Usage: node scripts/player-stats.mjs --player "Jason Do"');

const response = await fetch(SHEET_CSV_URL);
if (!response.ok) throw new Error(`Google Sheets returned HTTP ${response.status}`);
const rows = parseCsv(await response.text());
const headerIndex = rows.findIndex(row => row[0] === 'Athlete');
if (headerIndex < 0) throw new Error('Could not find the Athlete header row');

const header = rows[headerIndex];
const normalizedPlayer = player.trim().toLowerCase();
const matches = rows.slice(headerIndex + 1)
    .map((row, index) => ({ row, sourceRow: headerIndex + index + 2 }))
    .filter(({ row }) => (row[0] || '').trim().toLowerCase().endsWith(normalizedPlayer));

if (!matches.length) {
    console.error(`No player named ${player} found.`);
    process.exitCode = 1;
} else {
    console.log(`Source: ${SHEET_CSV_URL}`);
    console.log(`Player: ${player}`);
    console.log(`Matches: ${matches.length}`);
    for (const { row, sourceRow } of matches) {
        console.log(`\nSheet row ${sourceRow}`);
        header.forEach((name, index) => {
            if (name && row[index] !== undefined && row[index] !== '') {
                console.log(`${name}: ${row[index]}`);
            }
        });
    }
}
