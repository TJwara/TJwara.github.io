# Developer guide

This archive contains a static portfolio and two separate finance projects. Start with this map, then follow the section comments in the source files. Existing user-visible wording and functionality were not redesigned during the documentation and cleanup pass.

## Entry points

| Area | Entry page | Styles | Application code and data |
| --- | --- | --- | --- |
| Portfolio | `index.html`, `pages/about.html`, `pages/contact.html`, `pages/personal-projects/personal-projects.html` | `styles.css` | `script.js` handles on-load and scroll reveals plus mobile navigation. |
| Shared project legal page | `pages/personal-projects/legal.html` | Inline `<style>` | Inline script highlights the visible legal section. |
| Business finance | `pages/personal-projects/pages/business-finances/business-finances.html` | `assets/css/app.css` | `assets/js/*.js` share the `window.IAP` namespace and store company data in IndexedDB. |
| Personal finance | `pages/personal-projects/pages/personal-finances/personal-finances.html` | `styles.css` | `app.js` stores state in localStorage; `sw.js` handles offline caching and notifications. |

The two finance applications have different storage and interfaces. They do not share a database or transaction state. HTML generated at runtime by their JavaScript also uses CSS classes, so a selector absent from the initial HTML may still be active.

## Business finance script order

The business HTML loads the local libraries, then `core.js`, `schemas.js`, `accounting.js`, `managerial.js`, `reports.js` and `app.js`, in that order. `core.js` owns IndexedDB and common record operations. Schemas describe registers and their fields. The calculation modules operate on snapshots of company data. Reports assemble data and exports. `app.js` renders the shell, routes, forms, tables and delegated `data-action` clicks. The local bundles in `assets/vendor/` are third-party code; keep their licence comments and consult that folder's README before replacing a bundle.

The business project's own `README.md` describes its data model and commands. From that project directory, run `npm install` and `npm test`. For local development use `npm run dev` and open `/business-finances.html`. The current `npm run build` command fails because Vite expects `index.html` but this archive contains `business-finances.html`; the build entry and post-build checks need to be aligned before making a production bundle.

## Personal finance flow

`app.js` loads one browser-local state object, renders all view sections, and updates state through transactions, recurring items, budgets and imports. Sample rows are marked for the separate Clear sample data action. The service worker caches an app shell and handles notification clicks; check every entry in `APP_SHELL` against the deployed folder before relying on offline installation. That path check was outside this source-comment and unused-code cleanup.

## Cleanup boundary

Only selectors with no reference in the supplied HTML or application JavaScript were removed, including old accounting product-card styles and unused personal-finance pill styles. A shared small-screen `h1` rule was retained because it still matches portfolio headings. Two unused local variables were removed from `script.js` and personal finance `app.js`. All local third-party bundles, dynamic screen classes and inline-handler functions were retained.

## Existing deployment issues to review separately

The prior archive review found references to a missing social preview image, several incorrect relative links, a personal-finance manifest start URL and service-worker paths that do not match files in this archive, and a sitemap that lists only three pages. The business finance build entry mismatch described above is also pre-existing. The About page also contains an unclosed `<span>` inside its main heading. These pre-existing values were left in place so this cleanup does not silently change routes or rendered content.
