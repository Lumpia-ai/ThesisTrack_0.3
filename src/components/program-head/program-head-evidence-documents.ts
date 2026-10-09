/*
 * Draws realistic-looking document "scans" for sample evidence (application forms,
 * certificates, result sheets, manuscripts, reports, letters, slides) as inline SVG.
 * Each image looks like a phone photo of a page on a desk; tilt, backdrop, paper tone,
 * stamps and signatures vary by seed, so no two samples look alike. No network needed.
 */

/* Palette defaults (inline SVGs can't read CSS variables). */
const NAVY = '#003A8F';
const GOLD = '#C99A00';
const INK = '#1d3a8a'; // handwriting ink
const PRINT = '#1f2937';
const MUTED = '#6b7280';
const RULE = '#cbd5e1';
const HAND = "'Segoe Script','Bradley Hand','Brush Script MT','Comic Sans MS',cursive";
const SANS = 'Arial, Helvetica, sans-serif';
const SERIF = "Georgia, 'Times New Roman', serif";

const PAGE_W = 560;
const PAGE_H = 740;

export type SampleDocSpec =
  | { type: 'application'; stage: string; group: string; title: string; adviser: string; members: string[]; date: string; decision: 'approved' | 'revision' | 'pending' }
  | { type: 'results'; heading: string; group: string; title: string; rows: Array<[string, number]>; remark: string; date: string }
  | { type: 'manuscript'; title: string; authors: string[]; adviser: string; date: string }
  | { type: 'certificate'; heading: string; recipients: string[]; event: string; date: string }
  | { type: 'activity'; event: string; venue: string; group: string; attendees: string[]; date: string }
  | { type: 'letter'; heading: string; to: string; subject: string; paragraphs: number; signatory: string; date: string }
  | { type: 'slides'; title: string; group: string; bullets: string[] };

/* ── Seeded randomness ───────────────────────────────────────────────── */

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: string) {
  let a = hash(seed) || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rand = () => number;
const between = (rand: Rand, min: number, max: number) => min + rand() * (max - min);
const pick = <T,>(rand: Rand, list: readonly T[]) => list[Math.floor(rand() * list.length)];

/* ── Drawing helpers ─────────────────────────────────────────────────── */

const esc = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Trim long text to fit a line (rough, but good enough for sample pages). */
const fit = (text: string, maxChars: number) => (text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text);

const text = (x: number, y: number, value: string, size: number, opts: { fill?: string; weight?: number; family?: string; anchor?: 'start' | 'middle' | 'end'; spacing?: number; italic?: boolean } = {}) =>
  `<text x="${x}" y="${y}" font-family="${opts.family ?? SANS}" font-size="${size}" font-weight="${opts.weight ?? 400}" fill="${opts.fill ?? PRINT}" text-anchor="${opts.anchor ?? 'start'}"${opts.spacing ? ` letter-spacing="${opts.spacing}"` : ''}${opts.italic ? ' font-style="italic"' : ''}>${esc(value)}</text>`;

const line = (x1: number, y1: number, x2: number, y2: number, stroke = RULE, width = 1) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}"/>`;

/** Grey bars standing in for paragraph text. */
function paragraph(rand: Rand, x: number, y: number, width: number, lines: number, gap = 14) {
  let out = '';
  for (let i = 0; i < lines; i += 1) {
    const w = i === lines - 1 ? width * between(rand, 0.35, 0.7) : width * between(rand, 0.86, 1);
    out += `<rect x="${x}" y="${y + i * gap}" width="${w.toFixed(1)}" height="5" rx="2.5" fill="#d7dde6"/>`;
  }
  return out;
}

/** A hand-drawn-looking signature scribble. */
function signature(rand: Rand, x: number, y: number, width = 120) {
  let d = `M ${x} ${y}`;
  let cx = x;
  const steps = 5 + Math.floor(rand() * 3);
  for (let i = 0; i < steps; i += 1) {
    const nx = cx + width / steps;
    d += ` C ${(cx + between(rand, 4, 14)).toFixed(1)} ${(y - between(rand, 6, 22)).toFixed(1)}, ${(nx - between(rand, 4, 14)).toFixed(1)} ${(y + between(rand, 4, 18)).toFixed(1)}, ${nx.toFixed(1)} ${(y + between(rand, -6, 6)).toFixed(1)}`;
    cx = nx;
  }
  d += ` M ${(x + width * 0.15).toFixed(1)} ${(y + 8).toFixed(1)} Q ${(x + width * 0.5).toFixed(1)} ${(y + between(rand, 10, 18)).toFixed(1)} ${(x + width * 0.95).toFixed(1)} ${(y + 4).toFixed(1)}`;
  return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" opacity="0.9"/>`;
}

function signatureBlock(rand: Rand, x: number, y: number, name: string, role: string, signed = true) {
  return `${signed ? signature(rand, x + 10, y - 14, 130) : ''}${line(x, y, x + 170, y, PRINT, 0.8)}${text(x + 85, y + 16, fit(name, 26), 11, { weight: 700, anchor: 'middle' })}${text(x + 85, y + 30, role, 9.5, { fill: MUTED, anchor: 'middle' })}`;
}

function checkbox(x: number, y: number, label: string, checked: boolean) {
  const mark = checked ? `<path d="M ${x + 3} ${y + 7} L ${x + 7} ${y + 11} L ${x + 14} ${y + 1}" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>` : '';
  return `<rect x="${x}" y="${y}" width="12" height="12" rx="2" fill="none" stroke="${PRINT}" stroke-width="1"/>${mark}${text(x + 20, y + 10, label, 11)}`;
}

/** Labelled field with a handwritten value (handwriting runs wider than print, so fit ~9.6px per char). */
function field(x: number, y: number, width: number, label: string, value: string) {
  return `${text(x, y, label.toUpperCase(), 8.5, { fill: MUTED, weight: 700, spacing: 0.6 })}${text(x + 4, y + 20, fit(value, Math.floor(width / 9.6)), 15, { family: HAND, fill: INK })}${line(x, y + 25, x + width, y + 25, RULE)}`;
}

function stamp(rand: Rand, x: number, y: number, label: string, color: string, date: string) {
  const r = between(rand, -16, 14).toFixed(1);
  return `<g transform="rotate(${r} ${x + 80} ${y + 30})" opacity="0.82">
<rect x="${x}" y="${y}" width="160" height="60" rx="8" fill="none" stroke="${color}" stroke-width="3"/>
<rect x="${x + 5}" y="${y + 5}" width="150" height="50" rx="5" fill="none" stroke="${color}" stroke-width="1"/>
${text(x + 80, y + 32, label, 20, { fill: color, weight: 800, anchor: 'middle', spacing: 2 })}
${text(x + 80, y + 48, date, 10, { fill: color, weight: 700, anchor: 'middle' })}
</g>`;
}

/** Institution header shared by most documents. */
function letterhead(y = 36) {
  return `<circle cx="58" cy="${y + 8}" r="22" fill="${NAVY}"/><circle cx="58" cy="${y + 8}" r="15" fill="none" stroke="#fff" stroke-width="1.5"/>${text(58, y + 13, 'TT', 12, { fill: '#fff', weight: 800, anchor: 'middle' })}
${text(92, y + 4, 'THESISTRACK STATE UNIVERSITY', 14, { weight: 800, fill: NAVY, spacing: 0.5 })}
${text(92, y + 21, 'College of Information Technology · Capstone Office', 10, { fill: MUTED })}
${line(36, y + 40, PAGE_W - 36, y + 40, NAVY, 2)}${line(36, y + 44, PAGE_W - 36, y + 44, GOLD, 1)}`;
}

/* ── Document layouts (page coordinates 0..PAGE_W × 0..PAGE_H) ──────── */

function applicationPage(rand: Rand, spec: Extract<SampleDocSpec, { type: 'application' }>) {
  const checks = ['Adviser endorsement attached', 'Manuscript / chapters submitted', 'Similarity check (≤ 20%)', 'Consent of panel availability'];
  let out = letterhead();
  out += text(PAGE_W / 2, 124, 'ORAL DEFENSE APPLICATION FORM', 17, { weight: 800, anchor: 'middle', spacing: 1 });
  out += text(PAGE_W / 2, 144, `${spec.stage}`, 12, { fill: MUTED, anchor: 'middle', italic: true });
  out += field(40, 180, 230, 'Group code', spec.group);
  out += field(290, 180, 230, 'Date filed', spec.date);
  out += field(40, 232, 480, 'Project title', spec.title);
  out += field(40, 284, 230, 'Adviser', spec.adviser);
  out += field(290, 284, 230, 'Group leader', spec.members[0] ?? '');
  out += text(40, 346, 'MEMBERS', 8.5, { fill: MUTED, weight: 700, spacing: 0.6 });
  spec.members.forEach((member, index) => {
    const y = 368 + index * 24;
    out += text(40, y, `${index + 1}.`, 11, { fill: MUTED }) + text(58, y, member, 14, { family: HAND, fill: INK }) + line(56, y + 5, 300, y + 5, RULE);
  });
  out += text(320, 346, 'REQUIREMENTS', 8.5, { fill: MUTED, weight: 700, spacing: 0.6 });
  checks.forEach((label, index) => {
    const checked = spec.decision !== 'revision' || index < 2 ? rand() > 0.12 : rand() > 0.6;
    out += checkbox(320, 358 + index * 24, fit(label, 30), checked);
  });
  out += signatureBlock(rand, 50, 640, spec.adviser, 'Adviser');
  out += signatureBlock(rand, 330, 640, 'Program Head', 'Endorsed by', spec.decision !== 'pending');
  if (spec.decision === 'approved') out += stamp(rand, 330, 520, 'APPROVED', NAVY, spec.date);
  if (spec.decision === 'revision') out += stamp(rand, 330, 520, 'FOR REVISION', GOLD, spec.date);
  return out;
}

function resultsPage(rand: Rand, spec: Extract<SampleDocSpec, { type: 'results' }>) {
  let out = letterhead();
  out += text(PAGE_W / 2, 124, spec.heading.toUpperCase(), 16, { weight: 800, anchor: 'middle', spacing: 0.8 });
  out += field(40, 160, 180, 'Group', spec.group);
  out += field(240, 160, 280, 'Project', spec.title);
  const top = 222;
  const rowH = 34;
  out += `<rect x="40" y="${top}" width="480" height="30" fill="${NAVY}"/>`;
  out += text(52, top + 20, 'CRITERION', 10, { fill: '#fff', weight: 700 }) + text(400, top + 20, 'SCORE', 10, { fill: '#fff', weight: 700 }) + text(470, top + 20, 'PASS', 10, { fill: '#fff', weight: 700 });
  spec.rows.forEach(([label, score], index) => {
    const y = top + 30 + index * rowH;
    if (index % 2 === 1) out += `<rect x="40" y="${y}" width="480" height="${rowH}" fill="#f3f6fb"/>`;
    out += text(52, y + 22, fit(label, 44), 11.5) + text(404, y + 23, `${score}`, 16, { family: HAND, fill: INK });
    out += score >= 75
      ? `<path d="M 478 ${y + 17} L 484 ${y + 23} L 494 ${y + 11}" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`
      : `<path d="M 478 ${y + 11} L 494 ${y + 25} M 494 ${y + 11} L 478 ${y + 25}" stroke="${GOLD}" stroke-width="2.2" stroke-linecap="round"/>`;
    out += line(40, y + rowH, 520, y + rowH, RULE);
  });
  const bottom = top + 30 + spec.rows.length * rowH;
  const average = Math.round(spec.rows.reduce((sum, [, score]) => sum + score, 0) / (spec.rows.length || 1));
  out += `<rect x="40" y="${top}" width="480" height="${bottom - top}" fill="none" stroke="${PRINT}" stroke-width="0.8"/>`;
  out += text(52, bottom + 30, 'AVERAGE', 10, { fill: MUTED, weight: 700 }) + text(404, bottom + 32, `${average}`, 20, { family: HAND, fill: INK });
  out += text(40, bottom + 70, 'REMARKS', 8.5, { fill: MUTED, weight: 700, spacing: 0.6 });
  out += text(44, bottom + 94, fit(spec.remark, 58), 14, { family: HAND, fill: INK }) + line(40, bottom + 99, 520, bottom + 99, RULE) + line(40, bottom + 123, 520, bottom + 123, RULE);
  out += signatureBlock(rand, 50, 680, 'Test Evaluator', 'Name & signature') + signatureBlock(rand, 330, 680, spec.date, 'Date evaluated', false);
  return out;
}

function manuscriptPage(rand: Rand, spec: Extract<SampleDocSpec, { type: 'manuscript' }>) {
  const words = spec.title.split(' ');
  const lines: string[] = [];
  words.forEach((word) => {
    const current = lines[lines.length - 1];
    if (current && (current + ' ' + word).length <= 30) lines[lines.length - 1] = `${current} ${word}`;
    else lines.push(word);
  });
  let out = `<circle cx="${PAGE_W / 2}" cy="92" r="34" fill="${NAVY}"/><circle cx="${PAGE_W / 2}" cy="92" r="25" fill="none" stroke="#fff" stroke-width="1.5"/>${text(PAGE_W / 2, 98, 'TT', 16, { fill: '#fff', weight: 800, anchor: 'middle' })}`;
  out += text(PAGE_W / 2, 158, 'THESISTRACK STATE UNIVERSITY', 13, { weight: 800, anchor: 'middle', fill: NAVY, spacing: 1 });
  out += text(PAGE_W / 2, 176, 'College of Information Technology', 11, { anchor: 'middle', fill: MUTED });
  lines.slice(0, 4).forEach((value, index) => { out += text(PAGE_W / 2, 262 + index * 30, value.toUpperCase(), 21, { family: SERIF, weight: 700, anchor: 'middle' }); });
  out += text(PAGE_W / 2, 400, 'A Capstone Project', 12, { family: SERIF, anchor: 'middle', italic: true, fill: MUTED });
  out += text(PAGE_W / 2, 418, 'Presented to the Faculty of the College of Information Technology', 11, { family: SERIF, anchor: 'middle', fill: MUTED });
  out += text(PAGE_W / 2, 434, 'in Partial Fulfillment of the Requirements for the Degree', 11, { family: SERIF, anchor: 'middle', fill: MUTED });
  out += text(PAGE_W / 2, 450, 'Bachelor of Science in Information Technology', 11, { family: SERIF, anchor: 'middle', fill: MUTED, weight: 700 });
  out += text(PAGE_W / 2, 500, 'by', 12, { family: SERIF, anchor: 'middle', italic: true, fill: MUTED });
  spec.authors.forEach((author, index) => { out += text(PAGE_W / 2, 528 + index * 22, author.toUpperCase(), 13, { family: SERIF, anchor: 'middle', weight: 700 }); });
  out += text(PAGE_W / 2, 660, `Adviser: ${spec.adviser}`, 11, { family: SERIF, anchor: 'middle', fill: MUTED });
  out += text(PAGE_W / 2, 690, spec.date, 12, { family: SERIF, anchor: 'middle' });
  if (rand() > 0.4) out += line(PAGE_W / 2 - 150, 222, PAGE_W / 2 + 150, 222, GOLD, 1.2);
  return out;
}

function certificatePage(rand: Rand, spec: Extract<SampleDocSpec, { type: 'certificate' }>) {
  let out = `<rect x="22" y="22" width="${PAGE_W - 44}" height="${PAGE_H - 44}" fill="none" stroke="${GOLD}" stroke-width="5"/>
<rect x="34" y="34" width="${PAGE_W - 68}" height="${PAGE_H - 68}" fill="none" stroke="${NAVY}" stroke-width="1.5"/>`;
  out += text(PAGE_W / 2, 110, 'THESISTRACK STATE UNIVERSITY', 13, { weight: 800, anchor: 'middle', fill: NAVY, spacing: 1.5 });
  out += text(PAGE_W / 2, 190, 'CERTIFICATE', 38, { family: SERIF, weight: 700, anchor: 'middle', fill: NAVY, spacing: 3 });
  out += text(PAGE_W / 2, 222, `OF ${spec.heading.toUpperCase()}`, 15, { family: SERIF, anchor: 'middle', fill: GOLD, spacing: 3, weight: 700 });
  out += text(PAGE_W / 2, 272, 'is proudly presented to', 13, { family: SERIF, anchor: 'middle', italic: true, fill: MUTED });
  spec.recipients.forEach((name, index) => { out += text(PAGE_W / 2, 318 + index * 36, name, 26, { family: HAND, anchor: 'middle', fill: INK }); });
  const after = 318 + spec.recipients.length * 36;
  out += line(PAGE_W / 2 - 170, after - 18, PAGE_W / 2 + 170, after - 18, RULE);
  out += text(PAGE_W / 2, after + 14, fit(spec.event, 56), 13, { family: SERIF, anchor: 'middle' });
  out += text(PAGE_W / 2, after + 34, `Given this ${spec.date}.`, 11.5, { family: SERIF, anchor: 'middle', fill: MUTED, italic: true });
  // Gold seal
  const cx = PAGE_W / 2;
  const cy = 600;
  let star = '';
  for (let i = 0; i < 24; i += 1) {
    const angle = (i / 24) * Math.PI * 2;
    const radius = i % 2 === 0 ? 44 : 36;
    star += `${i === 0 ? 'M' : 'L'} ${(cx + Math.cos(angle) * radius).toFixed(1)} ${(cy + Math.sin(angle) * radius).toFixed(1)} `;
  }
  out += `<path d="${star}Z" fill="${GOLD}"/><circle cx="${cx}" cy="${cy}" r="28" fill="#e7b820" stroke="#fff" stroke-width="1.5"/>${text(cx, cy + 5, '★', 18, { anchor: 'middle', fill: '#fff' })}`;
  out += signatureBlock(rand, 50, 690, 'Dean, College of IT', 'Signature') + signatureBlock(rand, 340, 690, 'Program Head', 'Signature');
  return out;
}

function activityPage(rand: Rand, spec: Extract<SampleDocSpec, { type: 'activity' }>) {
  let out = letterhead();
  out += text(PAGE_W / 2, 124, 'ACTIVITY REPORT', 17, { weight: 800, anchor: 'middle', spacing: 1 });
  out += field(40, 160, 300, 'Activity', spec.event);
  out += field(360, 160, 160, 'Date', spec.date);
  out += field(40, 212, 300, 'Venue', spec.venue);
  out += field(360, 212, 160, 'Group', spec.group);
  // Photo box (a printed snapshot)
  const sky = pick(rand, ['#bcd6f5', '#cfe3f7', '#f3dcb2', '#d6ecd2']);
  out += `<rect x="40" y="262" width="480" height="210" fill="${sky}" stroke="${PRINT}" stroke-width="0.8"/>
<path d="M 40 430 L ${(160 + rand() * 60).toFixed(0)} ${(330 + rand() * 30).toFixed(0)} L 290 420 L ${(370 + rand() * 50).toFixed(0)} ${(350 + rand() * 30).toFixed(0)} L 520 440 L 520 472 L 40 472 Z" fill="#5f8f5a" opacity="0.8"/>
<circle cx="${(420 + rand() * 60).toFixed(0)}" cy="${(300 + rand() * 20).toFixed(0)}" r="18" fill="#fff5c2" opacity="0.9"/>`;
  for (let i = 0; i < 3 + Math.floor(rand() * 3); i += 1) {
    const px = 120 + i * 70 + rand() * 20;
    out += `<circle cx="${px.toFixed(0)}" cy="412" r="9" fill="#3b3b3b"/><rect x="${(px - 9).toFixed(0)}" y="422" width="18" height="34" rx="6" fill="${pick(rand, [NAVY, '#7c4a1d', '#8a1c1c', '#2f5d3a'])}"/>`;
  }
  out += text(280, 488, 'Photo documentation', 9.5, { fill: MUTED, anchor: 'middle', italic: true });
  out += text(40, 520, 'ATTENDANCE', 8.5, { fill: MUTED, weight: 700, spacing: 0.6 });
  spec.attendees.forEach((name, index) => {
    const y = 544 + index * 24;
    out += text(40, y, `${index + 1}.`, 11, { fill: MUTED }) + text(58, y, name, 14, { family: HAND, fill: INK }) + signature(rand, 330, y - 4, 90) + line(56, y + 5, 520, y + 5, RULE);
  });
  out += signatureBlock(rand, 330, 700, 'Activity Coordinator', 'Verified by');
  return out;
}

function letterPage(rand: Rand, spec: Extract<SampleDocSpec, { type: 'letter' }>) {
  let out = letterhead();
  out += text(40, 120, spec.date, 12);
  out += text(40, 150, spec.to, 12, { weight: 700 });
  out += text(40, 168, 'Office of the Barangay Chairperson', 11, { fill: MUTED });
  out += text(PAGE_W / 2, 214, spec.heading.toUpperCase(), 15, { weight: 800, anchor: 'middle', spacing: 0.8 });
  out += text(40, 248, `Subject: ${fit(spec.subject, 60)}`, 12, { weight: 700 });
  let y = 276;
  for (let p = 0; p < spec.paragraphs; p += 1) {
    const lines = 3 + Math.floor(rand() * 3);
    out += paragraph(rand, 40, y, 480, lines);
    y += lines * 14 + 18;
  }
  out += text(40, y + 16, 'Respectfully,', 12, { family: SERIF, italic: true });
  out += signatureBlock(rand, 40, y + 80, spec.signatory, 'Program Head, College of IT');
  if (rand() > 0.35) out += signatureBlock(rand, 330, y + 80, spec.to, 'Conforme');
  out += `<text x="${PAGE_W - 40}" y="${PAGE_H - 30}" font-family="${SANS}" font-size="9" fill="${MUTED}" text-anchor="end">DRAFT · for review</text>`;
  return out;
}

function slidesPage(rand: Rand, spec: Extract<SampleDocSpec, { type: 'slides' }>) {
  let out = '';
  // Two slides printed per page (handout style)
  [0, 1].forEach((slide) => {
    const top = 40 + slide * 350;
    out += `<rect x="40" y="${top}" width="480" height="300" fill="#fff" stroke="${RULE}" stroke-width="1.5"/>`;
    out += `<rect x="40" y="${top}" width="480" height="54" fill="${NAVY}"/>`;
    out += text(58, top + 34, slide === 0 ? fit(spec.title, 40) : 'Results & Recommendations', 17, { fill: '#fff', weight: 700 });
    out += `<rect x="40" y="${top + 54}" width="480" height="4" fill="${GOLD}"/>`;
    if (slide === 0) {
      out += text(58, top + 100, spec.group, 13, { fill: MUTED, weight: 700 });
      spec.bullets.forEach((bullet, index) => { out += `<circle cx="64" cy="${top + 132 + index * 34}" r="4" fill="${NAVY}"/>${text(78, top + 137 + index * 34, fit(bullet, 46), 13)}`; });
    } else {
      // Bar chart
      const bars = 5;
      for (let i = 0; i < bars; i += 1) {
        const h = between(rand, 50, 180);
        out += `<rect x="${80 + i * 80}" y="${(top + 260 - h).toFixed(0)}" width="44" height="${h.toFixed(0)}" rx="4" fill="${i % 2 ? '#58A2F5' : NAVY}"/>`;
      }
      out += line(64, top + 260, 500, top + 260, PRINT, 1);
    }
    out += text(508, top + 290, `${slide + 1}`, 10, { fill: MUTED, anchor: 'end' });
  });
  return out;
}

function renderPage(rand: Rand, spec: SampleDocSpec) {
  switch (spec.type) {
    case 'application': return applicationPage(rand, spec);
    case 'results': return resultsPage(rand, spec);
    case 'manuscript': return manuscriptPage(rand, spec);
    case 'certificate': return certificatePage(rand, spec);
    case 'activity': return activityPage(rand, spec);
    case 'letter': return letterPage(rand, spec);
    case 'slides': return slidesPage(rand, spec);
  }
}

/**
 * Returns a data URI of the document, photographed on a desk: random tilt, backdrop and
 * paper tone per seed, with a soft shadow and a faint crease so it reads as a real scan.
 */
export function renderSampleDocument(spec: SampleDocSpec, seed: string) {
  const rand = rng(seed);
  const width = 640;
  const height = 820;
  const tilt = between(rand, -3.2, 3.2).toFixed(2);
  const desk = pick(rand, [
    ['#8b6b4a', '#6f5238'], // wood
    ['#c9ced6', '#aab1bc'], // grey table
    ['#2d3748', '#1a202c'], // dark desk
    ['#d9c6a5', '#bfa77f'], // light wood
    ['#9fb3c8', '#7f95ab'] // blue board
  ] as const);
  const paper = pick(rand, ['#ffffff', '#fffdf6', '#fbfaf5', '#fdfcf8'] as const);
  const creaseY = between(rand, 300, 520).toFixed(0);
  const ox = (width - PAGE_W) / 2;
  const oy = (height - PAGE_H) / 2;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs>
<linearGradient id="desk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${desk[0]}"/><stop offset="1" stop-color="${desk[1]}"/></linearGradient>
<linearGradient id="light" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.16"/><stop offset="0.6" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity="0.08"/></linearGradient>
<filter id="shadow" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000" flood-opacity="0.35"/></filter>
</defs>
<rect width="${width}" height="${height}" fill="url(#desk)"/>
<g transform="rotate(${tilt} ${width / 2} ${height / 2})">
<g transform="translate(${ox} ${oy})">
<rect width="${PAGE_W}" height="${PAGE_H}" fill="${paper}" filter="url(#shadow)"/>
${renderPage(rand, spec)}
<rect y="${creaseY}" width="${PAGE_W}" height="1.2" fill="#000" opacity="0.05"/>
<rect width="${PAGE_W}" height="${PAGE_H}" fill="url(#light)"/>
</g>
</g>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
