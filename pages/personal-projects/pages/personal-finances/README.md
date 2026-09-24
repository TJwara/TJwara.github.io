# Coursemaccon Finance

The first module of Personal Life OS: personal finance intelligence. Runs entirely in
your browser — no server, no account, no data leaving your device unless you export it.

## Try it right now

Just double-click `index.html` to open it in your browser. Everything works —
adding transactions, bills, budgets, the forecast, what-if — because it's all plain
HTML/CSS/JS reading and writing to your browser's local storage.

The one thing that **won't** work yet from a local file is installing it as an app —
browsers require a real, secure (https://) address for that. That takes two minutes:

## Get a real installable link (free, no signup)

1. Go to **https://app.netlify.com/drop** in your browser.
2. Drag the whole `coursemaccon-finance` folder (all six files, keeping the `icons`
   folder inside it) onto the page.
3. You'll get a live `https://` link in a few seconds. Open it on your phone and
   tap **"Add to Home Screen"** (iOS Safari) or use the **install** icon in the
   address bar (Android Chrome / desktop Chrome/Edge) — that's the real installed app.

For something more permanent than Netlify's random URL, push the same folder to a
GitHub repo and turn on **GitHub Pages** in the repo settings — same result, your
own URL.

## Moving to a new device

Sidebar → **Export backup (.json)** on the old device, then **Import backup** on the
new one (after opening the same hosted link there). Your data travels in that one file.

## About the logo

The circular mark and wordmark in the sidebar are my best re-creation from your
screenshot, in your brand's maroon. If you send me the actual logo file (SVG or PNG),
I'll drop it in as an exact replacement — just swap `images/favicon.ico.png`,
`images/favicon.ico.png` and `images/favicon.ico.png`, and the `<img>` tag in the
sidebar of `index.html`.

## Notifications

Alerts → **Enable notifications** turns on real pop-up notifications (the same
mechanism native apps use — actual OS notifications, not a browser tab making noise).
They fire reliably whenever the app is open. Installed + on Android/Chrome, the OS may
also wake it periodically in the background (Periodic Background Sync) — that part is
best-effort only; there's no way to guarantee timing, and iOS/desktop mostly don't
support it yet. There's no email/SMS option: a page like this can't safely hold that
kind of API key.

## Bulk-adding data from Excel

Transactions → **Download Excel template** gives you a `.xlsx` with the right columns
(Date, Description, Category, Type, Amount) plus a sheet listing valid category names.
Fill it in, then **Import from Excel** — it shows you exactly how many rows will import
and lists anything it had to skip (bad date, missing description, etc.) before you
confirm. **Export transactions** now saves as `.xlsx` too. This needs an internet
connection the first time (it loads the Excel engine from a CDN) — after that, the
browser caches it.

## What's real vs. simplified right now

- **Auto-categorisation** is keyword matching (see `KEYWORD_MAP` in `app.js`) — add
  your own merchants there any time.
- **Forecast** = your recurring bills/income on their due dates, plus your recent
  average day-to-day spend in categories that don't already have a recurring bill.
  It's a projection from your patterns, not a guarantee.
- Opens with a few weeks of **sample data** so you can see it working — clear it
  from the banner at the top whenever you're ready to start for real.

## Next modules

Home management, family admin, and item marketplace are designed to slot into the
same sidebar and the same local-storage pattern once you're ready for them.
