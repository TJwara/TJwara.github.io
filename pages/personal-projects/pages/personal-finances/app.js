/* Coursemaccon Finance — app logic
   Everything lives in localStorage under one key. No server, no accounts:
   your data stays on this device unless you export it. See exportData()/importData(). */

const STORAGE_KEY = "coursemaccon-finance-v1";

const CATEGORIES = [
  "Groceries",
  "Transport",
  "Housing",
  "Utilities",
  "Insurance",
  "Subscriptions",
  "Entertainment",
  "Dining",
  "Shopping",
  "Health",
  "Income",
  "Savings",
  "Other",
];

const KEYWORD_MAP = [
  [
    ["woolworths", "checkers", "pick n pay", "pnp", "shoprite", "spar"],
    "Groceries",
  ],
  [
    ["uber", "bolt", "petrol", "fuel", "gautrain", "taxi", "parking"],
    "Transport",
  ],
  [
    ["netflix", "showmax", "spotify", "dstv", "apple music", "prime video"],
    "Subscriptions",
  ],
  [
    [
      "eskom",
      "electricity",
      "prepaid power",
      "water",
      "fibre",
      "wifi",
      "telkom",
      "vodacom",
      "mtn",
      "cell c",
    ],
    "Utilities",
  ],
  [["rent", "bond", "levy"], "Housing"],
  [
    [
      "medical aid",
      "discovery",
      "momentum",
      "insurance",
      "outsurance",
      "santam",
    ],
    "Insurance",
  ],
  [
    [
      "restaurant",
      "takeaway",
      "mcdonald",
      "kfc",
      "nando",
      "coffee",
      "uber eats",
      "mr d",
    ],
    "Dining",
  ],
  [
    [
      "salary",
      "wage",
      "payment received",
      "freelance income",
      "bonus",
      "gift",
      "refund",
    ],
    "Income",
  ],
  [["takealot", "amazon", "clothing", "mall"], "Shopping"],
  [["pharmacy", "clicks", "dischem", "doctor", "dentist", "gym"], "Health"],
];

function categorize(desc, type) {
  const d = (desc || "").toLowerCase();
  for (const [keywords, cat] of KEYWORD_MAP) {
    if (keywords.some((k) => d.includes(k))) return cat;
  }
  return type === "income" ? "Income" : "Other";
}

/* ---------------- icons (inline SVG, currentColor, consistent with the sidebar) ---------------- */

const ICON_EDIT =
  '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M11.3 2.3a1.5 1.5 0 0 1 2.1 2.1L5.6 12.2l-3 .8.8-3 7.9-7.7Z"/></svg>';
const ICON_TRASH =
  '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 4.2h11M6.2 4.2V2.6h3.6v1.6M4.6 4.2l.6 8.7a1 1 0 0 0 1 .9h3.6a1 1 0 0 0 1-.9l.6-8.7"/></svg>';
const ICON_SNOOZE =
  '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="9" r="5"/><path d="M8 6.5V9l1.8 1.2M5.7 1.3h4.6"/></svg>';
const ICON_PAUSE =
  '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><rect x="4" y="3" width="2.6" height="10" rx="0.6"/><rect x="9.4" y="3" width="2.6" height="10" rx="0.6"/></svg>';
const ICON_PLAY =
  '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M4.5 2.8v10.4l9-5.2-9-5.2z"/></svg>';

/* ---------------- storage ---------------- */

function defaultState() {
  return {
    startingBalance: 0,
    transactions: [],
    recurring: [],
    budgets: {},
    sampleBudgetCategories: [],
    sampleDataPresent: false,
    alertActions: {},
    settings: { browserNotify: false, lastNotifyCheck: null },
    lastExportDate: null,
  };
}

/* Local state is stored only in this browser; imported backups are a separate file.
   Keep persisted field names stable so an existing user can reopen their data. */
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedSampleData(defaultState());
    const parsed = JSON.parse(raw);
    const merged = Object.assign(defaultState(), parsed);
    merged.settings = Object.assign(
      defaultState().settings,
      parsed.settings || {},
    );
    return merged;
  } catch (e) {
    console.error("Could not read saved data, starting fresh.", e);
    return seedSampleData(defaultState());
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ---------------- sample data ---------------- */

/* Demo records are explicitly marked sample so Clear sample data can remove them.
   Never mix a sample-only record with a user-entered transaction. */
function seedSampleData(s) {
  const today = new Date();
  const iso = (d) => localISO(d);
  const daysAgo = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return iso(d);
  };

  s.startingBalance = 6400;
  s.sampleDataPresent = true;

  s.recurring = [
    {
      id: uid(),
      name: "Rent",
      amount: 8500,
      category: "Housing",
      kind: "bill",
      frequency: "monthly",
      day: 1,
      active: true,
      sample: true,
    },
    {
      id: uid(),
      name: "Eskom electricity",
      amount: 950,
      category: "Utilities",
      kind: "bill",
      frequency: "monthly",
      day: 5,
      active: true,
      sample: true,
    },
    {
      id: uid(),
      name: "Discovery medical aid",
      amount: 2400,
      category: "Insurance",
      kind: "bill",
      frequency: "monthly",
      day: 1,
      active: true,
      sample: true,
    },
    {
      id: uid(),
      name: "Vodacom contract",
      amount: 699,
      category: "Utilities",
      kind: "subscription",
      frequency: "monthly",
      day: 20,
      active: true,
      sample: true,
    },
    {
      id: uid(),
      name: "Netflix",
      amount: 199,
      category: "Subscriptions",
      kind: "subscription",
      frequency: "monthly",
      day: 12,
      active: true,
      sample: true,
    },
    {
      id: uid(),
      name: "Gym membership",
      amount: 450,
      category: "Health",
      kind: "subscription",
      frequency: "monthly",
      day: 25,
      active: true,
      sample: true,
    },
    {
      id: uid(),
      name: "Salary",
      amount: 28000,
      category: "Income",
      kind: "income",
      frequency: "monthly",
      day: 25,
      active: true,
      sample: true,
    },
  ];

  s.budgets = {
    Groceries: 3500,
    Dining: 1200,
    Transport: 1500,
    Shopping: 1200,
    Entertainment: 600,
  };
  s.sampleBudgetCategories = Object.keys(s.budgets);

  const t = (daysBack, desc, amount, type, category) =>
    s.transactions.push({
      id: uid(),
      date: daysAgo(daysBack),
      desc,
      amount,
      type,
      category: category || categorize(desc, type),
      sample: true,
    });

  t(25, "Salary", 28000, "income");
  t(24, "Rent", 8500, "expense");
  t(24, "Discovery medical aid", 2400, "expense");
  t(23, "Eskom electricity", 950, "expense");
  t(22, "Woolworths groceries", 840, "expense");
  t(20, "Pick n Pay groceries", 610, "expense");
  t(19, "Uber rides", 220, "expense");
  t(18, "Netflix", 199, "expense");
  t(17, "Nando's dinner", 315, "expense");
  t(16, "Checkers groceries", 705, "expense");
  t(15, "Fuel", 780, "expense");
  t(14, "Clicks pharmacy", 260, "expense");
  t(13, "Takealot — new headphones", 1899, "expense", "Shopping");
  t(12, "Coffee", 65, "expense");
  t(11, "Vodacom contract", 699, "expense");
  t(10, "Woolworths groceries", 910, "expense");
  t(9, "Mr D takeaway", 245, "expense");
  t(8, "Gym membership", 450, "expense");
  t(7, "Freelance design gig", 1500, "income");
  t(6, "Spar groceries", 530, "expense");
  t(5, "Uber rides", 180, "expense");
  t(4, "Cinema tickets", 320, "expense", "Entertainment");
  t(3, "Woolworths groceries", 875, "expense");
  t(3, "Takealot — phone case", 349, "expense", "Shopping");
  t(2, "Coffee", 58, "expense");
  t(1, "Fuel", 750, "expense");

  return s;
}

function clearSampleData() {
  state.transactions = state.transactions.filter((t) => !t.sample);
  state.recurring = state.recurring.filter((r) => !r.sample);
  for (const cat of state.sampleBudgetCategories || []) {
    delete state.budgets[cat];
  }
  state.sampleBudgetCategories = [];
  if (state.transactions.length === 0 && state.recurring.length === 0) {
    state.startingBalance = 0;
  }
  state.alertActions = {};
  state.sampleDataPresent = false;
  saveState();
  renderAll();
  showToast("Sample data cleared.");
}

/* ---------------- date helpers ---------------- */

/* Use local calendar-date components, never toISOString(), which converts to UTC
   and silently shifts the date for anyone east of Greenwich (incl. South Africa). */
function localISO(d) {
  const y = d.getFullYear(),
    m = String(d.getMonth() + 1).padStart(2, "0"),
    day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function isoToday() {
  return localISO(new Date());
}
function daysInMonth(y, m) {
  return new Date(y, m + 1, 0).getDate();
}
function fmtDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}
function fmtMoney(n) {
  const sign = n < 0 ? "-" : "";
  return (
    sign +
    "R " +
    Math.abs(Math.round(n)).toLocaleString("en-ZA", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
}
function withinLastNDays(iso, n) {
  const d = new Date(iso + "T00:00:00");
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - n);
  return d >= cutoff;
}

/* next occurrence of a recurring item on/after `from` (Date) */
function nextOccurrence(r, from) {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  if (r.frequency === "monthly") {
    let cand = new Date(
      start.getFullYear(),
      start.getMonth(),
      Math.min(r.day, daysInMonth(start.getFullYear(), start.getMonth())),
    );
    if (cand < start) {
      const m = start.getMonth() + 1;
      cand = new Date(
        start.getFullYear(),
        m,
        Math.min(r.day, daysInMonth(start.getFullYear(), m)),
      );
    }
    return cand;
  }
  // annual
  let cand = new Date(
    start.getFullYear(),
    (r.month || 1) - 1,
    Math.min(r.day, daysInMonth(start.getFullYear(), (r.month || 1) - 1)),
  );
  if (cand < start)
    cand = new Date(
      start.getFullYear() + 1,
      (r.month || 1) - 1,
      Math.min(r.day, daysInMonth(start.getFullYear() + 1, (r.month || 1) - 1)),
    );
  return cand;
}

/* all occurrences of r between today and today+days (inclusive) */
function occurrencesWithin(r, days) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(end.getDate() + days);
  const out = [];
  let cursor = today;
  let guard = 0;
  while (guard++ < 24) {
    const occ = nextOccurrence(r, cursor);
    if (occ > end) break;
    out.push(occ);
    cursor = new Date(occ);
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

/* ---------------- core numbers ---------------- */

function currentBalance() {
  let bal = state.startingBalance || 0;
  for (const t of state.transactions)
    bal += t.type === "income" ? t.amount : -t.amount;
  return bal;
}

function monthTotals() {
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const totals = {};
  let income = 0,
    expense = 0;
  for (const t of state.transactions) {
    if (!t.date.startsWith(monthStr)) continue;
    if (t.type === "expense") {
      totals[t.category] = (totals[t.category] || 0) + t.amount;
      expense += t.amount;
    } else income += t.amount;
  }
  return { byCategory: totals, income, expense };
}

/* daily variable-spend average, excluding categories already covered by an active recurring bill/subscription */
function dailyVariableAvg() {
  const recurringCats = new Set(
    state.recurring
      .filter((r) => r.active && r.kind !== "income")
      .map((r) => r.category),
  );
  const relevant = state.transactions.filter(
    (t) =>
      t.type === "expense" &&
      !recurringCats.has(t.category) &&
      withinLastNDays(t.date, 30),
  );
  const total = relevant.reduce((s, t) => s + t.amount, 0);
  return total / 30;
}

/* projected balance for today + each of the next `days` days. Point 0 is today itself (no drift/events applied),
   so the chart and any consumer always has a real "where you are right now" anchor. Each point also carries the
   list of recurring items (if any) landing on that exact day, so the chart/narrative can name what caused a move. */
/* Produce a daily balance series from recorded transactions and upcoming recurring items.
   Index zero represents today before future-day events are applied. */
function buildForecast(days) {
  const dailyAvg = dailyVariableAvg();
  const active = state.recurring.filter((r) => r.active);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const eventsByDate = {};
  for (const r of active) {
    for (const occ of occurrencesWithin(r, days)) {
      const key = localISO(occ);
      (eventsByDate[key] = eventsByDate[key] || []).push(r);
    }
  }

  const points = [
    {
      date: localISO(today),
      balance: Math.round(currentBalance()),
      events: [],
    },
  ];
  let bal = currentBalance();
  for (let i = 1; i <= days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const key = localISO(d);
    bal -= dailyAvg;
    const dayItems = eventsByDate[key] || [];
    for (const r of dayItems) bal += r.kind === "income" ? r.amount : -r.amount;
    points.push({ date: key, balance: Math.round(bal), events: dayItems });
  }
  return points;
}

function upcomingRecurring(days) {
  const active = state.recurring.filter((r) => r.active);
  const list = [];
  for (const r of active) {
    for (const occ of occurrencesWithin(r, days)) list.push({ r, date: occ });
  }
  list.sort((a, b) => a.date - b.date);
  return list;
}

/* ---------------- alerts (with stable ids so they can be snoozed/dismissed) ---------------- */

function buildAlerts() {
  const raw = [];

  const upcoming = upcomingRecurring(7).filter((u) => u.r.kind !== "income");
  for (const u of upcoming) {
    const days = Math.round(
      (u.date - new Date().setHours(0, 0, 0, 0)) / 86400000,
    );
    raw.push({
      id: `bill:${u.r.id}:${localISO(u.date)}`,
      level: days <= 2 ? "warn" : "info",
      title: `${u.r.name} due ${days === 0 ? "today" : days === 1 ? "tomorrow" : "in " + days + " days"}`,
      detail: `${fmtMoney(u.r.amount)} · ${u.r.category}`,
    });
  }

  const now = new Date();
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const { byCategory } = monthTotals();
  for (const cat in state.budgets) {
    const limit = state.budgets[cat];
    const spent = byCategory[cat] || 0;
    if (limit > 0 && spent >= limit) {
      raw.push({
        id: `budget:${cat}:${monthStr}:over`,
        level: "warn",
        title: `${cat} budget exceeded`,
        detail: `${fmtMoney(spent)} spent of ${fmtMoney(limit)}`,
      });
    } else if (limit > 0 && spent >= limit * 0.85) {
      raw.push({
        id: `budget:${cat}:${monthStr}:near`,
        level: "warn",
        title: `${cat} budget nearly used up`,
        detail: `${fmtMoney(spent)} of ${fmtMoney(limit)} (${Math.round((spent / limit) * 100)}%)`,
      });
    }
  }

  const byCat = {};
  for (const t of state.transactions) {
    if (t.type !== "expense") continue;
    (byCat[t.category] = byCat[t.category] || []).push(t);
  }
  for (const cat in byCat) {
    const list = byCat[cat];
    if (list.length < 3) continue;
    const avg = list.reduce((s, t) => s + t.amount, 0) / list.length;
    const recentBig = list
      .filter((t) => withinLastNDays(t.date, 14) && t.amount > avg * 2)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    for (const t of recentBig.slice(0, 3)) {
      raw.push({
        id: `unusual:${t.id}`,
        level: "info",
        title: `Unusual ${cat} spend: ${t.desc}`,
        detail: `${fmtMoney(t.amount)} — about ${(t.amount / avg).toFixed(1)}x your usual ${cat} transaction`,
      });
    }
  }

  const today = isoToday();
  const actions = state.alertActions || {};
  return raw.filter((a) => !(actions[a.id] && actions[a.id] >= today));
}

function dismissAlert(id) {
  state.alertActions = state.alertActions || {};
  state.alertActions[id] = "9999-12-31";
  saveState();
  renderAll();
  showToast("Alert dismissed.");
}
function snoozeAlert(id, days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  state.alertActions = state.alertActions || {};
  state.alertActions[id] = localISO(d);
  saveState();
  renderAll();
  showToast(`Snoozed for ${days} days.`);
}

/* ---------------- forecast narrative + chart ---------------- */

function buildForecastNarrative(points) {
  const start = points[0].balance;
  const future = points.slice(1);
  const low = future.reduce(
    (m, p) => (p.balance < m.balance ? p : m),
    future[0],
  );
  const high = future.reduce(
    (m, p) => (p.balance > m.balance ? p : m),
    future[0],
  );

  let s = `You're starting at ${fmtMoney(start)} today. `;
  if (low.balance < 0) {
    s += `On current patterns you're projected to dip into the red — down to ${fmtMoney(low.balance)} around ${fmtDate(low.date)}. `;
  } else {
    s += `Your tightest point is ${fmtMoney(low.balance)}, around ${fmtDate(low.date)}. `;
  }

  const lowIdx = points.findIndex((p) => p.date === low.date);
  const recovery = points
    .slice(lowIdx + 1, lowIdx + 8)
    .find((p) => p.events.some((e) => e.kind === "income"));
  if (recovery) {
    const names = recovery.events
      .filter((e) => e.kind === "income")
      .map((e) => e.name)
      .join(" and ");
    s += `That's shortly before ${names} lands on ${fmtDate(recovery.date)}, which takes you back up to ${fmtMoney(recovery.balance)}. `;
  }
  if (
    Math.round(high.balance) !== Math.round(recovery ? recovery.balance : -1) &&
    high.balance > low.balance
  ) {
    s += `The high point over this stretch is ${fmtMoney(high.balance)}, around ${fmtDate(high.date)}.`;
  }
  return s.trim();
}

function svgForecastChart(points) {
  const W = 880,
    H = 260;
  const mL = 60,
    mR = 20,
    mT = 46,
    mB = 30;
  const plotW = W - mL - mR,
    plotH = H - mT - mB;
  const n = points.length;
  const balances = points.map((p) => p.balance);
  const realMax = Math.max(...balances),
    realMin = Math.min(...balances);
  let minV = Math.min(0, realMin),
    maxV = Math.max(realMax, realMin + 1);
  const pad = Math.max((maxV - minV) * 0.12, 50);
  minV -= pad;
  maxV += pad;

  const X = (i) => mL + (i / (n - 1)) * plotW;
  const Y = (v) => mT + (1 - (v - minV) / (maxV - minV)) * plotH;

  const linePath = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${X(i).toFixed(1)} ${Y(p.balance).toFixed(1)}`,
    )
    .join(" ");
  const zeroY = Y(0);
  const areaPath = `${linePath} L ${X(n - 1).toFixed(1)} ${zeroY.toFixed(1)} L ${X(0).toFixed(1)} ${zeroY.toFixed(1)} Z`;
  const zeroFrac = Math.max(
    0,
    Math.min(100, ((maxV - 0) / (maxV - minV)) * 100),
  );

  // biggest single-day positive / negative net events, for callouts
  let bestPos = null,
    bestNeg = null;
  points.forEach((p, i) => {
    if (!p.events.length) return;
    const net = p.events.reduce(
      (s, r) => s + (r.kind === "income" ? r.amount : -r.amount),
      0,
    );
    if (net > 0 && (!bestPos || net > bestPos.net)) bestPos = { i, p, net };
    if (net < 0 && (!bestNeg || net < bestNeg.net)) bestNeg = { i, p, net };
  });

  const dots = points
    .map((p, i) => {
      if (!p.events.length) return "";
      const net = p.events.reduce(
        (s, r) => s + (r.kind === "income" ? r.amount : -r.amount),
        0,
      );
      const color = net >= 0 ? "var(--good)" : "var(--maroon)";
      return `<circle cx="${X(i).toFixed(1)}" cy="${Y(p.balance).toFixed(1)}" r="3.4" fill="${color}" stroke="var(--white)" stroke-width="1"/>`;
    })
    .join("");

  function callout(entry, positive) {
    if (!entry) return "";
    const cx = X(entry.i),
      cy = Y(entry.p.balance);
    const anchor = cx < W * 0.22 ? "start" : cx > W * 0.82 ? "end" : "middle";
    const dy = positive ? -14 : 20;
    const relevant = entry.p.events.filter((e) =>
      positive ? e.kind === "income" : e.kind !== "income",
    );
    const names = (relevant.length ? relevant : entry.p.events)
      .map((e) => e.name)
      .join(" & ");
    const label = `${positive ? "+" : ""}${fmtMoney(entry.net)} · ${names}`;
    return `<text x="${cx.toFixed(1)}" y="${(cy + dy).toFixed(1)}" text-anchor="${anchor}" class="fchart-label" fill="${positive ? "var(--good)" : "var(--maroon-dark)"}">${escapeHtml(label)}</text>`;
  }

  // x-axis ticks
  const tickCount = 5;
  const ticks = [];
  for (let k = 0; k < tickCount; k++) {
    const idx = Math.round((k / (tickCount - 1)) * (n - 1));
    ticks.push(
      `<text x="${X(idx).toFixed(1)}" y="${H - 8}" text-anchor="${idx === 0 ? "start" : idx === n - 1 ? "end" : "middle"}" class="fchart-axis">${fmtDate(points[idx].date)}</text>`,
    );
  }

  const refLines = `
    <line x1="${mL}" y1="${Y(realMax).toFixed(1)}" x2="${W - mR}" y2="${Y(realMax).toFixed(1)}" class="fchart-grid"/>
    <text x="${mL - 8}" y="${Y(realMax).toFixed(1)}" text-anchor="end" dominant-baseline="central" class="fchart-axis">${fmtMoney(realMax)}</text>
    <line x1="${mL}" y1="${Y(realMin).toFixed(1)}" x2="${W - mR}" y2="${Y(realMin).toFixed(1)}" class="fchart-grid"/>
    <text x="${mL - 8}" y="${Y(realMin).toFixed(1)}" text-anchor="end" dominant-baseline="central" class="fchart-axis">${fmtMoney(realMin)}</text>
    ${realMin < 0 ? `<line x1="${mL}" y1="${zeroY.toFixed(1)}" x2="${W - mR}" y2="${zeroY.toFixed(1)}" class="fchart-zero"/><text x="${mL - 8}" y="${zeroY.toFixed(1)}" text-anchor="end" dominant-baseline="central" class="fchart-axis">R 0</text>` : ""}
  `;

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Projected balance over the next ${n - 1} days">
    <defs>
      <linearGradient id="fchartArea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="${zeroFrac.toFixed(1)}%" style="stop-color:var(--maroon-tint)"/>
        <stop offset="${zeroFrac.toFixed(1)}%" style="stop-color:var(--warn-tint)"/>
      </linearGradient>
    </defs>
    ${refLines}
    <path d="${areaPath}" fill="url(#fchartArea)" stroke="none"/>
    <path d="${linePath}" fill="none" stroke="var(--maroon)" stroke-width="2.2" stroke-linejoin="round"/>
    <circle cx="${X(0).toFixed(1)}" cy="${Y(points[0].balance).toFixed(1)}" r="4" fill="var(--maroon-dark)" stroke="var(--white)" stroke-width="1.5"/>
    <text x="${X(0).toFixed(1)}" y="${(Y(points[0].balance) - 14).toFixed(1)}" text-anchor="start" class="fchart-label" fill="var(--maroon-dark)">Today</text>
    ${dots}
    ${callout(bestPos, true)}
    ${callout(bestNeg, false)}
    ${ticks.join("")}
  </svg>`;
}

/* ---------------- rendering ---------------- */

let state = loadState();

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}

/* Sidebar navigation: buttons precede all view sections in the HTML. */

/* The navigation changes the active view without loading a different HTML page. */
function showView(name) {
  document
    .querySelectorAll(".view")
    .forEach((v) => v.classList.toggle("active", v.id === "view-" + name));
  document
    .querySelectorAll("nav.mainnav button[data-view]")
    .forEach((b) => b.classList.toggle("active", b.dataset.view === name));
  document.getElementById("mobileTitle").textContent = document.querySelector(
    `nav.mainnav button[data-view="${name}"] .navlabel`,
  ).textContent;
}

/* Views share one state object; a state change redraws the dependent summaries. */
function renderAll() {
  populateCategorySelects();
  renderSampleBanner();
  renderBackupReminder();
  renderDashboard();
  renderTransactions();
  renderBills();
  renderOnceOffIncome();
  renderBudget();
  renderForecast();
  renderWhatIf();
  renderAlertsView();
  renderNotifySettings();
}

function renderSampleBanner() {
  document.getElementById("sampleBanner").hidden = !state.sampleDataPresent;
}

function renderBackupReminder() {
  const el = document.getElementById("backupReminder");
  const hasRealData =
    state.transactions.some((t) => !t.sample) ||
    state.recurring.some((r) => !r.sample);
  if (!hasRealData) {
    el.hidden = true;
    return;
  }
  const days = state.lastExportDate
    ? Math.floor(
        (new Date() - new Date(state.lastExportDate + "T00:00:00")) / 86400000,
      )
    : Infinity;
  el.hidden = days < 14;
}

/* Dashboard: #view-dashboard is the first HTML view. */
function renderDashboard() {
  const el = document.getElementById("view-dashboard");
  const bal = currentBalance();
  const { income, expense } = monthTotals();
  const alerts = buildAlerts();
  const upcoming = upcomingRecurring(14)
    .filter((u) => u.r.kind !== "income")
    .slice(0, 4);
  const recentTx = [...state.transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  el.querySelector(".hero-balance .num").textContent = fmtMoney(bal);
  el.querySelector("#dashIncome").textContent = fmtMoney(income);
  el.querySelector("#dashExpense").textContent = fmtMoney(expense);
  el.querySelector("#dashAlertCount .num").textContent = alerts.length;
  el.querySelector("#dashAlertCount .sub").textContent =
    alerts.length === 1 ? "needs a look" : "need a look";

  const upEl = el.querySelector("#dashUpcoming");
  upEl.innerHTML = upcoming.length
    ? upcoming
        .map((u) =>
          rowHtml({
            desc: u.r.name,
            meta: fmtDate(localISO(u.date)),
            amt: fmtMoney(u.r.amount),
            amtClass: "expense",
          }),
        )
        .join("")
    : emptyHtml(
        "Nothing due soon",
        "Add a bill or subscription to see it here.",
      );

  const recentEl = el.querySelector("#dashRecent");
  recentEl.innerHTML = recentTx.length
    ? recentTx
        .map((t) =>
          rowHtml({
            desc: t.desc,
            meta: `${fmtDate(t.date)} · ${t.category}`,
            amt: (t.type === "income" ? "+" : "-") + fmtMoney(t.amount),
            amtClass: t.type,
          }),
        )
        .join("")
    : emptyHtml("No transactions yet", "Add your first one to get started.");
}

function rowHtml({ desc, meta, amt, amtClass }) {
  return `<div class="row"><div class="row-left"><span class="catdot"></span><div><div class="desc">${escapeHtml(desc)}</div><div class="meta">${escapeHtml(meta)}</div></div></div><div class="amt ${amtClass || ""}">${amt}</div></div>`;
}
function emptyHtml(title, sub) {
  return `<div class="empty"><strong>${escapeHtml(title)}</strong>${escapeHtml(sub)}</div>`;
}

function txRowActions(id) {
  return `<div class="row-actions">
    <button class="icon-btn" title="Edit" aria-label="Edit transaction" onclick="openTxModal('${id}')">${ICON_EDIT}</button>
    <button class="icon-btn" title="Delete" aria-label="Delete transaction" onclick="deleteTx('${id}')">${ICON_TRASH}</button>
  </div>`;
}

/* Transactions: #view-transactions follows Dashboard. */
function renderTransactions() {
  const list = document.getElementById("txList");
  const filterCat = document.getElementById("txFilter").value;
  let rows = [...state.transactions].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );
  if (filterCat !== "all") rows = rows.filter((t) => t.category === filterCat);

  list.innerHTML = rows.length
    ? rows
        .map(
          (t) => `
    <div class="row">
      <div class="row-left"><span class="catdot"></span>
        <div><div class="desc">${escapeHtml(t.desc)}</div><div class="meta">${fmtDate(t.date)} · ${escapeHtml(t.category)}</div></div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="amt ${t.type}">${t.type === "income" ? "+" : "-"}${fmtMoney(t.amount)}</div>
        ${txRowActions(t.id)}
      </div>
    </div>`,
        )
        .join("")
    : emptyHtml(
        "No transactions here",
        "Try a different filter, or add a new transaction.",
      );
}

/* Bills and income: the three lists inside #view-bills. */
function renderBills() {
  const billsList = document.getElementById("billsList");
  const incomeList = document.getElementById("incomeList");
  const bills = state.recurring
    .filter((r) => r.kind !== "income")
    .sort((a, b) => a.day - b.day);
  const incomes = state.recurring
    .filter((r) => r.kind === "income")
    .sort((a, b) => a.day - b.day);

  billsList.innerHTML = bills.length
    ? bills.map((r) => recurringRow(r)).join("")
    : emptyHtml(
        "No bills or subscriptions yet",
        "Add one to start tracking due dates.",
      );
  incomeList.innerHTML = incomes.length
    ? incomes.map((r) => recurringRow(r)).join("")
    : emptyHtml(
        "No recurring income yet",
        "Add your salary or other regular income for a real forecast.",
      );
}

function renderOnceOffIncome() {
  const el = document.getElementById("onceOffIncomeList");
  const rows = state.transactions
    .filter((t) => t.type === "income")
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  el.innerHTML = rows.length
    ? rows
        .map(
          (t) => `
    <div class="row">
      <div class="row-left"><span class="catdot" style="background:var(--good)"></span>
        <div><div class="desc">${escapeHtml(t.desc)}</div><div class="meta">${fmtDate(t.date)}</div></div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="amt income">+${fmtMoney(t.amount)}</div>
        ${txRowActions(t.id)}
      </div>
    </div>`,
        )
        .join("")
    : emptyHtml(
        "No once-off income logged",
        "Gifts, refunds, bonuses, freelance payments — anything that isn't on a regular schedule.",
      );
}

function recurringRow(r) {
  const next = nextOccurrence(r, new Date());
  return `<div class="row">
    <div class="row-left"><span class="catdot" style="background:${r.active ? "var(--maroon)" : "var(--line)"}"></span>
      <div><div class="desc">${escapeHtml(r.name)}</div><div class="meta">${r.kind === "income" ? "Income" : r.kind === "subscription" ? "Subscription" : "Bill"} · ${escapeHtml(r.category)} · next ${fmtDate(localISO(next))}</div></div>
    </div>
    <div style="display:flex;align-items:center;gap:10px;">
      <div class="amt ${r.kind === "income" ? "income" : "expense"}">${fmtMoney(r.amount)}</div>
      <div class="row-actions">
        <button class="icon-btn" title="Edit" aria-label="Edit ${escapeHtml(r.name)}" onclick="openRecurringModal('${r.id}')">${ICON_EDIT}</button>
        <button class="icon-btn" title="${r.active ? "Pause" : "Resume"}" aria-label="${r.active ? "Pause" : "Resume"} ${escapeHtml(r.name)}" onclick="toggleRecurring('${r.id}')">${r.active ? ICON_PAUSE : ICON_PLAY}</button>
        <button class="icon-btn" title="Delete" aria-label="Delete ${escapeHtml(r.name)}" onclick="deleteRecurring('${r.id}')">${ICON_TRASH}</button>
      </div>
    </div>
  </div>`;
}

/* Budget: #view-budget category progress rows. */
function renderBudget() {
  const el = document.getElementById("budgetList");
  const { byCategory } = monthTotals();
  const cats = CATEGORIES.filter((c) => c !== "Income");
  el.innerHTML = cats
    .map((c) => {
      const limit = state.budgets[c] || 0;
      const spent = byCategory[c] || 0;
      const pct =
        limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
      const over = limit > 0 && spent > limit;
      return `<div class="budget-row">
      <div class="toprow"><span class="catname">${c}</span><span class="figures">${fmtMoney(spent)} ${limit ? "of " + fmtMoney(limit) : "· no budget set"}</span></div>
      <div class="progress-track"><div class="progress-fill ${over ? "over" : ""}" style="width:${limit ? pct : 0}%"></div></div>
      <div style="margin-top:6px;"><input type="number" min="0" step="50" placeholder="Set monthly budget" value="${limit || ""}" data-cat="${c}" class="budget-input" aria-label="Monthly budget for ${c}" style="border:1px solid var(--line);border-radius:8px;padding:6px 10px;font-size:13px;width:160px;"></div>
    </div>`;
    })
    .join("");
  el.querySelectorAll(".budget-input").forEach((input) => {
    input.addEventListener("change", (e) => {
      const cat = e.target.dataset.cat;
      const val = parseFloat(e.target.value) || 0;
      if (val > 0) {
        state.budgets[cat] = val;
        state.sampleBudgetCategories = (
          state.sampleBudgetCategories || []
        ).filter((c) => c !== cat);
      } else delete state.budgets[cat];
      saveState();
      renderBudget();
      renderAlertsView();
      renderDashboard();
    });
  });
}

/* Forecast: #view-forecast chart and explanatory note. */
function renderForecast() {
  const days = 45;
  const points = buildForecast(days);
  document.getElementById("forecastChart").innerHTML = svgForecastChart(points);
  document.getElementById("forecastNote").textContent =
    buildForecastNarrative(points);
}

/* What-if: #view-whatif scenario result. */
function renderWhatIf(result) {
  const el = document.getElementById("whatifResult");
  if (!result) {
    el.innerHTML = "";
    el.className = "";
    return;
  }
  const cls = result.ok ? "good" : "bad";
  el.className = "whatif-result " + cls;
  el.innerHTML = `<div class="headline">${result.ok ? "Looks affordable" : "This would put you in the red"}</div>
    <p>After a ${fmtMoney(result.amount)} purchase on ${fmtDate(result.date)}, your projected balance that day is <strong>${fmtMoney(result.balanceAfter)}</strong> (before this purchase: ${fmtMoney(result.balanceBefore)}).</p>
    <p style="margin-top:8px;color:var(--ink-soft);font-size:12.5px;">Based on your recurring bills and recent day-to-day spending — not a guarantee, just a projection from your current patterns.</p>`;
}

/* What-if form: the scenario lives after Forecast and before Alerts. */

function runWhatIf(e) {
  e.preventDefault();
  const amount = parseFloat(document.getElementById("whatifAmount").value);
  const date = document.getElementById("whatifDate").value;
  if (!amount || !date) return;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date + "T00:00:00");
  const days = Math.max(1, Math.round((target - today) / 86400000));
  const points = buildForecast(Math.max(days, 45));
  const point = points[days] || points[points.length - 1];
  const balanceBefore = point.balance;
  const balanceAfter = balanceBefore - amount;
  renderWhatIf({
    ok: balanceAfter >= 0,
    amount,
    date,
    balanceBefore,
    balanceAfter,
  });
}

/* Alerts view: warning rows and notification controls. */
function renderAlertsView() {
  const el = document.getElementById("alertsList");
  const alerts = buildAlerts();
  el.innerHTML = alerts.length
    ? alerts
        .map(
          (a) => `
    <div class="alert-item"><span class="alert-dot ${a.level}"></span>
      <div style="flex:1;min-width:0;"><div class="t">${escapeHtml(a.title)}</div><div class="d">${escapeHtml(a.detail)}</div></div>
      <div class="row-actions">
        <button class="icon-btn" title="Snooze 3 days" aria-label="Snooze this alert for 3 days" onclick="snoozeAlert('${a.id}',3)">${ICON_SNOOZE}</button>
        <button class="icon-btn" title="Dismiss" aria-label="Dismiss this alert" onclick="dismissAlert('${a.id}')">${ICON_TRASH}</button>
      </div>
    </div>`,
        )
        .join("")
    : emptyHtml(
        "All clear",
        "No budget, bill, or unusual-spending alerts right now.",
      );
  const navBadge = document.getElementById("alertNavBadge");
  if (alerts.length) {
    navBadge.style.display = "flex";
    navBadge.textContent = alerts.length;
  } else {
    navBadge.style.display = "none";
    navBadge.textContent = "";
  }
}

function renderNotifySettings() {
  const btn = document.getElementById("notifyBtn");
  if (!btn) return;
  const hint = document.getElementById("notifyHint");
  const installed =
    window.matchMedia &&
    window.matchMedia("(display-mode: standalone)").matches;
  if (!("Notification" in window)) {
    btn.textContent = "Notifications not supported here";
    btn.disabled = true;
    return;
  }
  if (Notification.permission === "granted" && state.settings.browserNotify) {
    btn.textContent = "Notifications on ✓";
    btn.disabled = true;
    if (hint)
      hint.textContent = installed
        ? "Installed — you'll get these reliably."
        : "Notifications work best while this page is open.";
  } else if (Notification.permission === "denied") {
    btn.textContent = "Blocked — enable in browser settings";
    btn.disabled = true;
  } else {
    btn.textContent = "Enable notifications";
    btn.disabled = false;
    if (hint) hint.textContent = "";
  }
}

function populateCategorySelects() {
  document.querySelectorAll(".category-select").forEach((sel) => {
    const current = sel.value;
    sel.innerHTML = CATEGORIES.map(
      (c) => `<option value="${c}">${c}</option>`,
    ).join("");
    if (current) sel.value = current;
  });
  const filter = document.getElementById("txFilter");
  if (filter && filter.dataset.populated !== "1") {
    filter.innerHTML =
      `<option value="all">All categories</option>` +
      CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join("");
    filter.dataset.populated = "1";
  }
}

/* First HTML dialog: add or edit a transaction. */

let editingTxId = null;

function openTxModal(id, defaultType) {
  editingTxId = id || null;
  const t = id ? state.transactions.find((x) => x.id === id) : null;
  document.getElementById("txModalTitle").textContent = id
    ? "Edit transaction"
    : "Add transaction";
  document.getElementById("txDesc").value = t ? t.desc : "";
  document.getElementById("txAmount").value = t ? t.amount : "";
  document.getElementById("txDate").value = t ? t.date : isoToday();
  document.getElementById("txCategory").value = t
    ? t.category
    : defaultType === "income"
      ? "Income"
      : "Groceries";
  setTxType(t ? t.type : defaultType || "expense");
  document.getElementById("txModal").hidden = false;
  document.getElementById("txDesc").focus();
}
function closeTxModal() {
  document.getElementById("txModal").hidden = true;
  editingTxId = null;
}
function setTxType(type) {
  document.getElementById("txModal").dataset.type = type;
  document
    .querySelectorAll("#txTypeToggle button")
    .forEach((b) => b.classList.toggle("active", b.dataset.type === type));
}
function onTxDescInput() {
  if (editingTxId) return; // don't fight a user editing an existing categorisation
  const desc = document.getElementById("txDesc").value;
  const type = document.getElementById("txModal").dataset.type;
  if (desc.length > 2)
    document.getElementById("txCategory").value = categorize(desc, type);
}
function saveTxModal(e) {
  e.preventDefault();
  const desc = document.getElementById("txDesc").value.trim();
  const amount = parseFloat(document.getElementById("txAmount").value);
  const date = document.getElementById("txDate").value;
  const category = document.getElementById("txCategory").value;
  const type = document.getElementById("txModal").dataset.type;
  if (!desc || !amount || amount <= 0 || !date) return;

  if (editingTxId) {
    const t = state.transactions.find((x) => x.id === editingTxId);
    Object.assign(t, { desc, amount, date, category, type });
  } else {
    state.transactions.push({ id: uid(), desc, amount, date, category, type });
  }
  saveState();
  closeTxModal();
  renderAll();
}
function deleteTx(id) {
  const idx = state.transactions.findIndex((t) => t.id === id);
  if (idx === -1) return;
  const [removed] = state.transactions.splice(idx, 1);
  saveState();
  renderAll();
  showToast("Transaction deleted.", () => {
    state.transactions.splice(idx, 0, removed);
    saveState();
    renderAll();
  });
}

/* Second HTML dialog: add or edit bills and income. */

let editingRecId = null;

function openRecurringModal(id, defaultKind) {
  editingRecId = id || null;
  const r = id ? state.recurring.find((x) => x.id === id) : null;
  document.getElementById("recModalTitle").textContent = id
    ? "Edit recurring item"
    : "Add recurring item";
  document.getElementById("recName").value = r ? r.name : "";
  document.getElementById("recAmount").value = r ? r.amount : "";
  setRecKind(r ? r.kind : defaultKind || "bill");
  document.getElementById("recCategory").value = r
    ? r.category
    : r || defaultKind === "income"
      ? "Income"
      : "Housing";
  setRecFrequency(r ? r.frequency : "monthly");
  document.getElementById("recDay").value = r ? r.day : 1;
  document.getElementById("recMonth").value = r ? r.month || 1 : 1;
  document.getElementById("recModal").hidden = false;
  document.getElementById("recName").focus();
}
function closeRecurringModal() {
  document.getElementById("recModal").hidden = true;
  editingRecId = null;
}
function setRecKind(kind) {
  document.getElementById("recModal").dataset.kind = kind;
  document
    .querySelectorAll("#recKindToggle button")
    .forEach((b) => b.classList.toggle("active", b.dataset.kind === kind));
  if (kind === "income" && !editingRecId)
    document.getElementById("recCategory").value = "Income";
}
function setRecFrequency(freq) {
  document.getElementById("recModal").dataset.freq = freq;
  document
    .querySelectorAll("#recFreqToggle button")
    .forEach((b) => b.classList.toggle("active", b.dataset.freq === freq));
  document.getElementById("recMonthField").hidden = freq !== "annual";
}
function saveRecurringModal(e) {
  e.preventDefault();
  const name = document.getElementById("recName").value.trim();
  const amount = parseFloat(document.getElementById("recAmount").value);
  const category = document.getElementById("recCategory").value;
  const kind = document.getElementById("recModal").dataset.kind;
  const frequency = document.getElementById("recModal").dataset.freq;
  const day = parseInt(document.getElementById("recDay").value, 10);
  const month = parseInt(document.getElementById("recMonth").value, 10);
  if (!name || !amount || amount <= 0 || !day) return;

  if (editingRecId) {
    const r = state.recurring.find((x) => x.id === editingRecId);
    Object.assign(r, { name, amount, category, kind, frequency, day, month });
  } else {
    state.recurring.push({
      id: uid(),
      name,
      amount,
      category,
      kind,
      frequency,
      day,
      month,
      active: true,
    });
  }
  saveState();
  closeRecurringModal();
  renderAll();
}
function toggleRecurring(id) {
  const r = state.recurring.find((x) => x.id === id);
  r.active = !r.active;
  saveState();
  renderAll();
}
function deleteRecurring(id) {
  const idx = state.recurring.findIndex((r) => r.id === id);
  if (idx === -1) return;
  const [removed] = state.recurring.splice(idx, 1);
  saveState();
  renderAll();
  showToast(`"${removed.name}" deleted.`, () => {
    state.recurring.splice(idx, 0, removed);
    saveState();
    renderAll();
  });
}

/* Third HTML dialog: starting balance. */

function openBalanceModal() {
  document.getElementById("balanceInput").value = state.startingBalance || 0;
  document.getElementById("balanceModal").hidden = false;
}
function closeBalanceModal() {
  document.getElementById("balanceModal").hidden = true;
}
function saveBalanceModal(e) {
  e.preventDefault();
  state.startingBalance =
    parseFloat(document.getElementById("balanceInput").value) || 0;
  saveState();
  closeBalanceModal();
  renderAll();
}

/* Fourth HTML dialog: preview spreadsheet imports; also handles backups. */

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `coursemaccon-finance-${isoToday()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  state.lastExportDate = isoToday();
  saveState();
  renderBackupReminder();
}

function exportTransactionsExcel() {
  const rows = [...state.transactions]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((t) => ({
      Date: t.date,
      Description: t.desc,
      Category: t.category,
      Type: t.type,
      Amount: t.amount,
    }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 12 },
    { wch: 34 },
    { wch: 16 },
    { wch: 10 },
    { wch: 12 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transactions");
  XLSX.writeFile(wb, `coursemaccon-finance-transactions-${isoToday()}.xlsx`);
}

function downloadExcelTemplate() {
  const sample = [
    {
      Date: "2026-09-01",
      Description: "Woolworths groceries",
      Category: "Groceries",
      Type: "expense",
      Amount: 450,
    },
    {
      Date: "2026-09-01",
      Description: "Salary",
      Category: "Income",
      Type: "income",
      Amount: 28000,
    },
  ];
  const ws = XLSX.utils.json_to_sheet(sample);
  ws["!cols"] = [
    { wch: 12 },
    { wch: 34 },
    { wch: 16 },
    { wch: 10 },
    { wch: 12 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transactions");
  const catRows = CATEGORIES.map((c) => ({ "Valid category names": c }));
  const ws2 = XLSX.utils.json_to_sheet(catRows);
  ws2["!cols"] = [{ wch: 22 }];
  XLSX.utils.book_append_sheet(wb, ws2, "Categories");
  XLSX.writeFile(wb, "coursemaccon-finance-template.xlsx");
}

function parseExcelDate(val) {
  if (val instanceof Date && !isNaN(val)) return localISO(val);
  if (typeof val === "number") {
    // Excel serial date, in case cellDates parsing didn't catch it
    const d = XLSX.SSF ? XLSX.SSF.parse_date_code(val) : null;
    if (d)
      return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  if (typeof val === "string") {
    const d = new Date(val);
    if (!isNaN(d)) return localISO(d);
  }
  return null;
}

let pendingImportRows = [];

function handleExcelImport(file) {
  if (!file) return;
  if (typeof XLSX === "undefined") {
    alert(
      "Excel support didn't load — check your internet connection and try again.",
    );
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const wb = XLSX.read(reader.result, { type: "array", cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      if (!rows.length) throw new Error("That sheet looks empty.");

      const valid = [];
      const errors = [];
      rows.forEach((row, i) => {
        const get = (name) => {
          const key = Object.keys(row).find(
            (k) => k.trim().toLowerCase() === name,
          );
          return key ? row[key] : undefined;
        };
        const rawDate = get("date");
        const desc = String(get("description") || "").trim();
        const rawType = String(get("type") || "")
          .trim()
          .toLowerCase();
        const rawAmount = get("amount");
        const rawCategory = String(get("category") || "").trim();
        const rowNum = i + 2; // account for header row

        const date = parseExcelDate(rawDate);
        const amountNum = parseFloat(rawAmount);

        if (!date) {
          errors.push(`Row ${rowNum}: couldn't read the date ("${rawDate}").`);
          return;
        }
        if (!desc) {
          errors.push(`Row ${rowNum}: missing a description.`);
          return;
        }
        if (amountNum === undefined || isNaN(amountNum) || amountNum === 0) {
          errors.push(
            `Row ${rowNum}: amount must be a number ("${rawAmount}").`,
          );
          return;
        }

        let type;
        if (rawType.startsWith("in")) type = "income";
        else if (rawType.startsWith("ex")) type = "expense";
        else type = amountNum < 0 ? "expense" : "income";

        const canonical = CATEGORIES.find(
          (c) => c.toLowerCase() === rawCategory.toLowerCase(),
        );
        const category = canonical || categorize(desc, type);

        valid.push({
          id: uid(),
          date,
          desc,
          amount: Math.abs(amountNum),
          type,
          category,
        });
      });

      pendingImportRows = valid;
      document.getElementById("importPreviewSummary").innerHTML =
        `Found <strong>${rows.length}</strong> row${rows.length === 1 ? "" : "s"} — <strong>${valid.length}</strong> ready to import` +
        (errors.length ? `, <strong>${errors.length}</strong> skipped.` : ".");
      document.getElementById("importPreviewErrors").innerHTML = errors
        .slice(0, 20)
        .map((e) => `<div>${escapeHtml(e)}</div>`)
        .join("");
      document.getElementById("confirmImportBtn").disabled = valid.length === 0;
      document.getElementById("confirmImportBtn").textContent = valid.length
        ? `Import ${valid.length} transaction${valid.length === 1 ? "" : "s"}`
        : "Nothing to import";
      document.getElementById("importPreviewModal").hidden = false;
    } catch (err) {
      alert(
        "Couldn't read that file — make sure it's a .xlsx/.xls with Date, Description, Category, Type and Amount columns. (" +
          err.message +
          ")",
      );
    }
  };
  reader.readAsArrayBuffer(file);
}

function closeImportPreview() {
  document.getElementById("importPreviewModal").hidden = true;
  pendingImportRows = [];
}

/* Commit the reviewed spreadsheet rows only after the preview is accepted. */
function confirmExcelImport() {
  state.transactions.push(...pendingImportRows);
  saveState();
  closeImportPreview();
  renderAll();
  showToast(
    `Imported ${pendingImportRows.length} transaction${pendingImportRows.length === 1 ? "" : "s"}.`,
  );
  pendingImportRows = [];
}

function importData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!Array.isArray(parsed.transactions))
        throw new Error("Not a recognised backup file");
      if (
        !confirm(
          "This replaces everything currently in the app with the contents of this file. Continue?",
        )
      )
        return;
      state = Object.assign(defaultState(), parsed);
      saveState();
      renderAll();
      showToast("Data imported.");
    } catch (err) {
      alert(
        "Couldn't read that file — is it a Coursemaccon Finance export? (" +
          err.message +
          ")",
      );
    }
  };
  reader.readAsText(file);
}

/* ---------------- notifications ----------------
   Real pop-up notifications via the service worker (the same mechanism native app
   notifications use), not email/SMS — a static page can't safely hold that kind of
   API key. They fire reliably whenever the app is open or in the foreground. Some
   Android/Chrome installs also support Periodic Background Sync, which can wake the
   service worker to notify even when the app isn't open — best-effort only: the OS
   decides if/when it actually runs, and iOS/desktop mostly don't support it yet. */

function requestBrowserNotify() {
  if (!("Notification" in window)) return;
  Notification.requestPermission().then((perm) => {
    state.settings.browserNotify = perm === "granted";
    saveState();
    renderNotifySettings();
    if (perm === "granted" && "serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification("Coursemaccon Finance", {
          body: "You're set — you'll get real notifications here when something needs attention.",
          icon: "images/favicon.ico.png",
          badge: "images/favicon.ico.png",
        });
      });
      tryRegisterPeriodicSync();
    }
  });
}

function tryRegisterPeriodicSync() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.ready.then((reg) => {
    if (!("periodicSync" in reg) || !navigator.permissions) return;
    navigator.permissions
      .query({ name: "periodic-background-sync" })
      .then((status) => {
        if (status.state === "granted") {
          reg.periodicSync
            .register("check-alerts", { minInterval: 12 * 60 * 60 * 1000 })
            .catch(() => {});
        }
      })
      .catch(() => {});
  });
}

function checkAndNotify() {
  const today = isoToday();
  if (state.settings.lastNotifyCheck === today) return; // at most once per session/day
  state.settings.lastNotifyCheck = today;
  const urgent = buildAlerts().filter((a) => a.level === "warn");
  if (
    urgent.length &&
    state.settings.browserNotify &&
    "serviceWorker" in navigator
  ) {
    navigator.serviceWorker.ready.then((reg) => {
      reg.showNotification("Coursemaccon Finance", {
        body:
          urgent.length === 1
            ? urgent[0].title
            : `${urgent.length} things need attention: ${urgent[0].title} and more`,
        icon: "images/favicon.ico.png",
        badge: "images/favicon.ico.png",
        tag: "finance-alerts",
        renotify: true,
      });
    });
  }
  saveState();
}

/* Undo toast: the final UI element after the dialogs in the HTML. */

let toastTimer = null;
let pendingUndo = null;
function showToast(message, undoFn) {
  clearTimeout(toastTimer);
  const el = document.getElementById("toast");
  document.getElementById("toastMsg").textContent = message;
  const undoBtn = document.getElementById("toastUndoBtn");
  undoBtn.style.display = undoFn ? "inline-block" : "none";
  pendingUndo = undoFn || null;
  el.hidden = false;
  toastTimer = setTimeout(() => {
    el.hidden = true;
    pendingUndo = null;
  }, 6000);
}

/* ---------------- init ---------------- */

function init() {
  document
    .querySelectorAll("nav.mainnav button[data-view]")
    .forEach((b) =>
      b.addEventListener("click", () => showView(b.dataset.view)),
    );
  document.getElementById("txForm").addEventListener("submit", saveTxModal);
  document.getElementById("txDesc").addEventListener("input", onTxDescInput);
  document
    .getElementById("recForm")
    .addEventListener("submit", saveRecurringModal);
  document.getElementById("whatifForm").addEventListener("submit", runWhatIf);
  document
    .getElementById("balanceForm")
    .addEventListener("submit", saveBalanceModal);
  document
    .getElementById("txFilter")
    .addEventListener("change", renderTransactions);
  document.getElementById("toastUndoBtn").addEventListener("click", () => {
    if (pendingUndo) pendingUndo();
    document.getElementById("toast").hidden = true;
    clearTimeout(toastTimer);
  });
  document.getElementById("whatifDate").value = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return localISO(d);
  })();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("./sw.js")
      .catch((e) => console.warn("Service worker registration failed", e));
  }

  showView("dashboard");
  renderAll();
  checkAndNotify();
}

document.addEventListener("DOMContentLoaded", init);
