// Maakt uit data/transactions.json:
//   docs/data/summary.json     publiek: totaal en aantal per cafédag
//   docs/data/detail.enc.json  versleuteld met DETAIL_PIN: alle transacties
//   reports/week-YYYY-Www.md   weekoverzicht van de laatste volledige week
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { STORE_FILE, DOCS_DATA_DIR, REPORTS_DIR, CUTOFF_HOUR, DETAIL_PIN } from './lib/config.mjs';
import { addDays, weekStart, isoWeek, todayLocal, toBe, pad } from './lib/dates.mjs';

if (!DETAIL_PIN) {
  console.error('DETAIL_PIN ontbreekt in .env');
  process.exit(1);
}

const { transactions } = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
const ok = transactions.filter((t) => t.ok);

// ---- publieke samenvatting ----
const days = new Map();
for (const t of ok) {
  const d = days.get(t.day) ?? { cents: 0, count: 0 };
  d.cents += t.cents;
  if (t.cents > 0) d.count += 1;
  days.set(t.day, d);
}
const summary = {
  generated: new Date().toISOString(),
  cutoffHour: CUTOFF_HOUR,
  lastTransaction: ok.at(-1)?.ts ?? null,
  // [cafédag, bedrag in cent, aantal betalingen]
  days: [...days].sort(([a], [b]) => a.localeCompare(b)).map(([day, d]) => [day, d.cents, d.count]),
};

// ---- versleutelde details ----
// PBKDF2 + AES-GCM, te ontcijferen met WebCrypto in de browser.
function encrypt(obj, pin) {
  const iter = 250_000;
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(pin, salt, iter, 32, 'sha256');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(obj), 'utf8'), cipher.final(), cipher.getAuthTag()]);
  return { v: 1, iter, salt: salt.toString('base64'), iv: iv.toString('base64'), data: data.toString('base64') };
}

const brands = [...new Set(ok.map((t) => t.brand))];
const detail = {
  brands,
  // [tijdstip, bedrag cent, commissie cent, merk-index, kaarttype, land]
  tx: ok.map((t) => [t.ts, t.cents, t.fee, brands.indexOf(t.brand), t.cardType, t.country]),
};

fs.mkdirSync(DOCS_DATA_DIR, { recursive: true });
fs.writeFileSync(path.join(DOCS_DATA_DIR, 'summary.json'), JSON.stringify(summary));
fs.writeFileSync(path.join(DOCS_DATA_DIR, 'detail.enc.json'), JSON.stringify(encrypt(detail, DETAIL_PIN)));

// ---- weekrapport (laatste volledige week, ma t.e.m. zo) ----
const euro = (c) => '€ ' + (c / 100).toLocaleString('nl-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dayNames = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'];
const thisMonday = weekStart(todayLocal());
const monday = addDays(thisMonday, -7);
const prevMonday = addDays(monday, -7);
const weekTotal = (start) => [...Array(7)].reduce((s, _, i) => s + (days.get(addDays(start, i))?.cents ?? 0), 0);
const { year, week } = isoWeek(monday);

const lines = [
  `# Week ${week} (${toBe(monday)} – ${toBe(addDays(monday, 6))})`,
  '',
  `Een dag loopt tot ${pad(CUTOFF_HOUR)}:00 de volgende ochtend.`,
  '',
  '| Dag | Datum | Omzet | Betalingen | Gem. bedrag |',
  '|---|---|---:|---:|---:|',
];
for (let i = 0; i < 7; i++) {
  const day = addDays(monday, i);
  const d = days.get(day) ?? { cents: 0, count: 0 };
  lines.push(`| ${dayNames[i]} | ${toBe(day)} | ${euro(d.cents)} | ${d.count} | ${d.count ? euro(d.cents / d.count) : '–'} |`);
}
const total = weekTotal(monday);
const prev = weekTotal(prevMonday);
const diff = prev ? ((total - prev) / prev) * 100 : null;
lines.push(`| **Totaal** | | **${euro(total)}** | | |`, '');
lines.push(`Vorige week: ${euro(prev)}${diff === null ? '' : ` (${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%)`}`);

fs.mkdirSync(REPORTS_DIR, { recursive: true });
const reportFile = path.join(REPORTS_DIR, `week-${year}-W${pad(week)}.md`);
fs.writeFileSync(reportFile, lines.join('\n') + '\n');

console.log(`${summary.days.length} cafédagen, ${ok.length} betalingen. Site-data bijgewerkt in docs/data/.`);
console.log('\n' + lines.join('\n'));
console.log(`\nRapport: ${path.relative(process.cwd(), reportFile)}`);
