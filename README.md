# PIPS Lab Website Documentation

This repository contains the front-end source code for the lab's website. It's a static, multi-page site — plain HTML, CSS, and JavaScript that dynamically loads all of its content from JSON files — plus a handful of small Node.js serverless functions under `api/` that exist purely for SEO (see [SEO: per-person meta tags, sitemap, robots.txt](#-seo-per-person-meta-tags-sitemap-robotstxt) below). It's deployed on **Vercel**, not plain GitHub Pages, because both the person-profile routing and those functions depend on Vercel — GitHub Pages can't run either.

## 📁 Project Structure

* `index.html`: Home — hero intro (`#home`), then a "What We Study" research-themes grid (`#research`, from `themes.json`), then a portal grid linking to the other pages (`#explore`).
* `people.html`: Two flat grids — Current and Alumni — with everyone (including the PI) shown the same way: photo, name, role, no grouping by role and no link buttons on the card itself.
* `people/profile.html`: One shared template that renders whichever person the URL points at. See below.
* `publications.html`: Recent Publications, with tag filtering.
* `grants.html`: Grants and funding.
* `news.html`: News.
* `styles.css`: Contains the "PIPS Lab Light Theme" styling (white body, navy header/footer — see [Customization](#-customization) below), including responsive layouts, CSS variables for theming, and scroll animations.
* `script.js`: Shared across every page. Fetches all data concurrently on load, then populates whichever sections exist in that page's HTML (each block is guarded by an `if ($('some-id'))` check), handles publication filtering, and triggers intersection observers for fade-in animations.
* `data/`: This directory must contain the six JSON data files that power the site content: `lab.json`, `themes.json`, `people.json`, `publications.json`, `grants.json`, and `news.json`.
* `images/people/`, `images/publications/`: Where photos and paper thumbnails referenced from `people.json`/`publications.json` actually live — drop a new file in here, then point to it with a `photo`/`image` path relative to the repo root (see [Managing Content](#-managing-content-json-data) below). `images/PIPS-favicons/` holds the favicon/app-icon set and shouldn't need touching.
* `api/people.js`, `api/sitemap.js`, `api/robots.js`: Vercel serverless functions. Reached via the rewrites in `vercel.json`, not called directly. See [SEO](#-seo-per-person-meta-tags-sitemap-robotstxt) below.
* `lib/seo-helpers.js`: Small helpers shared by the three functions above (`slugify`, HTML-escaping, etc.). Deliberately kept *outside* `api/` — anything directly under `api/` becomes a public route on Vercel, and this file isn't meant to be one.
* `vercel.json`: The three rewrite rules that make `/people/<name>`, `/sitemap.xml`, and `/robots.txt` work. Don't delete it.

To add a new page, copy the `<nav>` and `<footer>` markup from an existing page, mark the matching `.nav-link` as `active`, and reuse `script.js` as-is — it only touches elements that are actually present on the page. **Every internal `href`/`src` in the `<head>` and `<nav>` is root-absolute** (e.g. `/styles.css`, `/people.html`, not `styles.css`), including in `script.js`'s own `fetch()` calls and dynamically-generated image tags — this is what lets `people/profile.html`, which lives one directory deeper than everything else, share the exact same markup and script as the rest of the site. Keep new pages consistent with that (don't switch back to bare relative paths).

## 👤 Person profile pages (`/people/<name>`)

Clicking a person's card on the People page navigates to a real URL like `/people/thivya-kandappu` instead of opening a popup. The card itself only shows a photo, name, and role — no link buttons; those (website/scholar/GitHub/email) only appear on the person's own profile page. There's no server and no per-person files — one template (`people/profile.html`) handles every person, styled as a proper full page (`#profile` fills the viewport height, no boxed card), not a "back to People" link — use the nav or the browser's back button to leave.

1. The card's link is built from the person's name via `slugify()` in `script.js` (lowercased, non-alphanumeric runs collapsed to a single `-`).
2. `vercel.json` rewrites any `/people/<name>` request to the `api/people.js` serverless function (as `/api/people?name=<name>`), transparently — the browser's address bar keeps the clean `/people/<name>` URL. That function reads `people/profile.html` off disk, injects that person's `<title>`/meta tags into it (see [SEO](#-seo-per-person-meta-tags-sitemap-robotstxt) below), and returns the result — it does **not** duplicate any rendering logic; the page body is still filled in entirely by `script.js` after that HTML reaches the browser.
3. On load, `script.js` reads the last segment of `location.pathname` as the slug, finds the matching person in `people.json` by re-running `slugify()` on each `name`, and renders their photo/role/bio/links into `#profile-container`.
4. It also lists that person's **Publications**: any entry in `publications.json` whose `authors` array contains a name matching theirs (via the shared `namesMatch()` helper — see below) is rendered underneath, most-recent-highlighted-first. If nobody's papers match, that whole "Publications" section is hidden rather than shown empty.

Because it's all slug-driven off the same `people.json`, **adding, renaming, or removing someone needs no other changes** — no generator script to re-run, no file to create per person, and the sitemap/meta tags pick it up automatically too. The trade-off: none of this — the clean URL, the meta tags, the sitemap, `robots.txt` — works from a plain static server; it all requires either `npx vercel dev` or an actual Vercel deployment. See [Local Development](#-local-development--debugging).

**Matching authors by name (`namesMatch()` in `script.js`):** `people.json` names can carry an honorific `publications.json` author strings don't — e.g. the PI is `"Dr. Thivya Kandappu"` in `people.json` but just `"Thivya Kandappu"` in every paper's `authors` array. A plain `===` comparison would never match, silently showing zero publications for anyone with a title. `namesMatch(a, b)` strips a leading `Dr.`/`Prof.`/`Professor` and lowercases both sides before comparing. This same helper also drives the "self" highlighting of the PI's name in the author list on `publications.html` — that had the identical exact-match bug, now fixed alongside this feature. If you add someone with a different honorific, extend the regex in `stripTitle()`.

## 🔍 SEO: per-person meta tags, sitemap, robots.txt

Why this exists: a page whose entire content is filled in by client-side JS (like every person's profile page) is real content to a browser, but it's a gamble for a search engine — the crawler has to actually execute the JS and wait on a `fetch()` before it can see anything, which happens on a delay and isn't guaranteed to succeed. Worse, every profile page shared one generic `<title>Profile — PIPS Lab</title>` until that JS ran, so if Google indexed the page before then, that's what it would show for someone's name search — not their name. `api/people.js` fixes this by injecting the real, per-person `<title>`, `<meta name="description">`, canonical link, and Open Graph/Twitter tags into the HTML **before** it's sent to the browser, so a crawler (or a chat app generating a link preview) sees correct content on the very first request, with no JS required.

* **`api/people.js`** — reads `people/profile.html` and `data/people.json` + `data/lab.json` off disk, finds the person matching the requested slug, and string-replaces the template's placeholder `<title>` with that person's real title/description/OG tags. It touches nothing in `<body>` — `script.js` still does 100% of the actual content rendering, exactly as before. If the slug doesn't match anyone, it returns a 404 with `<meta name="robots" content="noindex">` instead, so a broken/typo'd link can't get indexed.
* **`api/sitemap.js`** — serves `/sitemap.xml`, generated fresh on every request from the live `people.json` plus the fixed top-level pages. Add someone to `people.json` and they appear in the sitemap immediately, no rebuild step.
* **`api/robots.js`** — serves `/robots.txt`. It's a function rather than a static file specifically so the `Sitemap:` line can point at whatever host actually served the request (`req.headers.host`) — a static file would have to hardcode one domain, which would be wrong on Vercel preview deployments and break if the production domain ever changes.
* **`lib/seo-helpers.js`** — `slugify()` (**must** stay identical to the copy in `script.js` — both sides need to agree on what a person's URL slug is), `escapeHtml()`, `truncate()` (cuts the meta description to ~160 characters at a word boundary, not mid-word), and `baseUrl()` (builds `https://<host>` from the request).

None of this needs any deploy-time configuration — Vercel auto-detects the `api/` directory and runs those files as Node.js serverless functions with zero config. Nothing to enable, nothing to toggle.

## 🚀 Local Development & Debugging

Because this site uses the JavaScript `fetch()` API to load local JSON files, it **cannot** be run simply by double-clicking `index.html` in your browser (the fetches will fail with a CORS/file:// error). You must serve it over a local HTTP server. There's no `npm start` — there's no `package.json`, this is plain static HTML/CSS/JS.

Pick one, run it from the repo root:

```bash
# Quick preview — a plain static file server. Fine for everything except
# /people/<name>, /sitemap.xml, and /robots.txt, which all need vercel.json's
# rewrites and the api/ functions — neither of which a static server runs.
python3 -m http.server 8000
# or
npx serve -p 8000 .
```

```bash
# Full preview — actually runs the api/ serverless functions and applies
# vercel.json's rewrites, matching production exactly.
# First run may ask you to log in / link the project to Vercel.
npx vercel dev
```

Then open `http://localhost:8000` (or whatever port `vercel dev` prints, typically `:3000`).

* With the **quick preview** servers, `/people/<name>` won't resolve — open `people/profile.html?name=<slug>` directly instead, e.g. `people/profile.html?name=gevindu-ganganath` (this still exercises all of `script.js`'s rendering; it just skips the server-injected meta tags, since those only exist in `api/people.js`). `/sitemap.xml` and `/robots.txt` won't resolve at all there — there's no static file at those paths for the server to serve.
* With `vercel dev`, everything works exactly as it will live: `/people/gevindu-ganganath`, `/sitemap.xml`, `/robots.txt`. To check the injected meta tags specifically: `curl -s http://localhost:3000/people/gevindu-ganganath | grep -i '<title>\|description'`.

**Debugging tips:**
* Open the browser DevTools **Console** first — `script.js` logs a single error there ("Failed to load lab data...") if any of the six JSON files under `data/` fail to fetch or fail to parse; that's almost always a JSON syntax error (trailing comma, missing quote) in the file you just edited.
* Check the **Network** tab for any request to `/data/*.json` or `/images/*` returning 404 — since every path in this repo is root-absolute, a 404 there usually means the server isn't running from the repo root, or a typo in a JSON `photo`/`image` path.
* A blank content section with no console error usually means that JSON file's array is genuinely empty, or every entry got filtered out by something field-specific — e.g. a publication whose `tags` array is empty won't show up under any filter button except "All." It's rarely a crash; check the actual JSON content against the field-by-field behavior documented below rather than assuming something broke.

## 📦 Deploying / Publishing Updates

This site is deployed on **Vercel**, not GitHub Pages (plain GitHub Pages can't run the `vercel.json` rewrite that the person profile pages depend on).

* **If the Vercel project is linked to this GitHub repo** (the usual setup): just commit and push to the branch Vercel is watching (typically `main`). Vercel builds and deploys automatically — no separate "publish" step. Check the deployment status on the Vercel dashboard or via `vercel ls`.
* **Manual deploy** (if it isn't linked, or you want to push a preview without committing): run `npx vercel` from the repo root for a preview URL, or `npx vercel --prod` to push straight to the production domain.

There's nothing to build — no bundler, no compile step. Whatever is in the repo is exactly what gets served.

## 📝 Managing Content (JSON Data)

All text, images, and links are managed via the JSON files in the `data/` directory. You do not need to touch the HTML or JavaScript to add new members, papers, grants, or news.

### 1. The Team (`people.json`)
Everyone in this array — including the Principal Investigator — is split into exactly two flat, uncategorized grids on `people.html`: **Current** and **Alumni**. Within each grid there's no further grouping by role. Each card shows just `name`, `photo`, and `role`, and links to that person's own page — no link buttons on the card itself.
* **`isAlumni`:** `true` puts them in the Alumni grid, `false`/omitted puts them in Current. This is the only thing that affects grouping.
* **`role`:** Free text — shown on the card and (unless `title` is set) on their profile page too — but within each grid, people are also *sorted* by a seniority order hardcoded as `ROLE_ORDER` in `script.js`:
  1. `Principal Investigator`
  2. `Research Scientist`
  3. `PhD Candidate`
  4. `PhD Student`
  5. `Masters Student`
  6. `Research Engineer`
  7. `Visiting Researcher`

  People who share a role keep their relative order from the JSON array. A `role` string that isn't in this list still displays fine — it just sorts after everyone whose role is listed. To change the ordering (e.g. add a new role at a specific rank), edit the `ROLE_ORDER` array in `script.js`, not this file.
* **`title` (optional):** A longer title shown on the person's profile page instead of `role` (the card still shows `role`). Used for the PI's "Assistant Professor of Computer Science, ResWORK Fellow" — add it to anyone else who needs a fuller title on their own page without changing what their card says.
* **`photo`:** A path to an image, relative to the repo root — e.g. `"images/people/gevindu.jpg"` (existing photos live in `images/people/`; drop a new file there and point to it, any common format works — `.jpg`, `.jpeg`, `.png`, and `.avif` are all in use already). Displayed cropped to a square (`object-fit: cover`) both on the card and on the profile page, so a roughly-square headshot crops best; a wide or tall photo will get cropped at the sides/top-bottom.
* **`bio`:** Plain text, shown on the profile page only (not on the card). `""` is fine for someone without a bio yet — their profile page just shows an empty space where it would go, nothing breaks.
* **`links`:** An object. Any key works, but only five get a matching icon (via `linkLabels` in `script.js`): `website`, `scholar`, `twitter`, `github`, `email`. Anything else falls back to showing the raw key name as plain text. To hide a link entirely (no button at all) rather than show a broken one, set its value to `null`, `""`, or `"#"` — all three are treated as "no link."
* **Profile page:** Every card — PI included — links to `/people/<slugified-name>`. See [Person profile pages](#-person-profile-pages-peoplename) above. The link buttons live there, not on the card.

### 2. Publications (`publications.json`)
Every field, `title`/`authors`/`venue`/`tags`/`highlight`/`image`/`abstract`/`links` — except `year` (see below) — is used somewhere:
* **`authors`:** An array of plain name strings, shown as-is (joined by commas) — no one's name is specially highlighted on `publications.html`. This same array is also what a person's profile page scans to find their own publications (matching by name — see `namesMatch()` under [Person profile pages](#-person-profile-pages-peoplename)), so a name here needs to be spellable-back to a `people.json` entry (honorifics like "Dr." are stripped automatically before comparing, so those don't need to match).
* **`tags`:** An array of strings. The filter buttons at the top of `publications.html` are generated dynamically from every unique tag across all publications — add a new tag string to a paper and a new filter button appears automatically, no other change needed.
* **`highlight`:** `true` gives the paper a "Featured" badge and a gold left border, and sorts it to the top of the list (and to the top of that person's list on their own profile page, if they're a co-author).
* **`image` (optional):** A path to a thumbnail, relative to the repo root — e.g. `"images/publications/ICML26.png"` (existing thumbnails live in `images/publications/`). Omit the field (or leave it falsy) and the card just renders without an image slot, no broken-image icon.
* **`abstract`:** Plain text, hidden by default behind a "▸ Abstract" toggle button under each card — click it to expand/collapse. This per-card toggle is a separate feature from the (now-disabled) "show N more" list-collapsing — see the code comments in `script.js` if you ever want to re-enable that one.
* **`links`:** An object, e.g. `{ "paper": "https://...", "code": null, "demo": null }`. Unlike people's `links`, there's no icon vocabulary here — any key you use is just capitalized and shown as plain text (`"paper"` → "Paper"). Same hide-it rule as people links: `null`, `""`, or `"#"` all mean "no link," so that key simply won't render a button.
* **`year`:** Present in the data but not currently used by any rendering (not shown, not sorted on) — it's there for your own reference when editing the file, not for the page.

### 3. Grants (`grants.json`)
This section displays the lab's current and past funding.
* **Data Fields:** Each grant object displays the `title`, `amount`, `role` (e.g., PI, Co-PI), `funder`, and `period`.
* **Optional Descriptions:** You can include an optional `description` string to provide a brief summary of the project. If omitted, the grant card will simply condense its layout to fit the available metadata.

### 4. News Updates (`news.json`)
* **`date`:** Controls both the displayed date *and* the sort order — items are always shown newest-first, regardless of their order in the JSON array. Use an ISO date like `"2026-08-14"` for a specific day, or just a bare 4-character year string like `"2024"` if you only know the year (it's then shown as-is instead of being reformatted). Other formats are parsed with JavaScript's `Date` constructor, which is inconsistent across formats — stick to one of the two above.
* **`category`:** Controls the colored badge. One of these exact, case-sensitive strings gets a matching color; anything else still renders (nothing breaks) but as a plain, uncolored badge:
  * `Award` (Yellow)
  * `Paper` (Blue)
  * `Talk` (Green)
  * `Join` (Purple)
  * `Grant` (Red)
* **`title`**, **`body`:** Plain text, shown as-is.

### 5. Lab Info & Themes (`lab.json` & `themes.json`)
`lab.json` fields aren't grouped in one place — each one feeds a specific, separate spot:
* **`fullName`** → the Home page's big `<h1>`, and the footer's copyright line (on every page).
* **`tagline`** → the italic line right under that `<h1>`.
* **`description`** → the paragraph under the tagline.
* **`location`**, **`email`**, **`founded`** → the 📍/✉️/Est. row under the description.
* **`affiliation`** → the footer only (on every page). It is *not* shown on the Home page anymore — that eyebrow line was removed.
* **`name`** (the short form, `"PIPS"`) → used only for `document.title` on person profile pages (`"<Person> — PIPS"`) and in their meta description (`"... at PIPS Lab..."`) — see [SEO](#-seo-per-person-meta-tags-sitemap-robotstxt).
* **`twitter`**, **`github`** → currently unused by any rendering. They're placeholder fields (`"#"`) for a future social-links row that hasn't been built; editing them won't change anything visible today.
* There is **no field that sets a nav-bar text label** — the nav only shows the logo image now, no lab name text next to it.

`themes.json` populates the "What We Study" grid in its own section on the Home page (`#research`, between the hero and the "Around the Lab" portal grid) — not inside the hero itself. Each entry is `{ icon, title, text }`; `icon` is rendered as-is (raw text/emoji/unicode symbol, not an icon font name), so paste a character like `◇` directly rather than a class name.

## 🎨 Customization

If you need to rebrand the lab's colors or fonts, open `styles.css` and modify the `:root` variables at the top of the file. There are **two separate palettes**, both defined right next to each other in `:root` — don't confuse them:

* **The body palette** (`--ink`, `--ink2`, `--ink3`, `--paper`, `--paper2`, `--paper3`, `--accent`, `--accent2`, `--gold`, `--gradient`, `--line`) — controls every page's actual content area, which is a light theme: white background (`--paper`), near-black navy text (`--ink`), and blue/violet/cyan accents (`--accent`/`--accent2`/`--gold`) sourced from the logo's gradient.
* **The chrome palette** (`--chrome-bg`, `--chrome-ink`, `--chrome-ink3`, `--chrome-accent`, `--chrome-line`) — controls only the `<nav>` bar and `<footer>`, which are **always** the brand navy (`--chrome-bg: #041936`) regardless of what the body palette above is set to. This is deliberate — it's what gives the nav logo its seamless look (the logo image's own background is the same navy). If you change `--chrome-bg`, update the nav logo artwork in `images/PIPS-favicons/` to match, or the logo will show a visible background-color seam.

`--ff-serif`, `--ff-sans`, `--ff-mono` set the three fonts (headings, body, and dates/labels/code respectively), loaded from Google Fonts in each page's `<head>` — swapping a font here without also changing that Google Fonts `<link>` won't do anything.