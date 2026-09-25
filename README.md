# PIPS Lab Website Documentation

This repository contains the front-end source code for the lab's website. It is a lightweight, static, multi-page site built with plain HTML, CSS, and JavaScript that dynamically loads all of its content from JSON files. It's deployed on **Vercel** (not plain GitHub Pages), because the per-person profile pages rely on a Vercel rewrite rule — see [Person profile pages](#-person-profile-pages-peoplename) below.

## 📁 Project Structure

* `index.html`: Home — hero intro plus a portal grid linking to the other pages.
* `people.html`: Two flat grids — Current and Alumni — with everyone (including the PI) shown the same way: photo, name, role, no grouping by role and no link buttons on the card itself.
* `people/profile.html`: One shared template that renders whichever person the URL points at. See below.
* `publications.html`: Recent Publications, with tag filtering.
* `grants.html`: Grants and funding.
* `news.html`: News.
* `styles.css`: Contains the "PIPS Lab Dark Theme" styling, including responsive layouts, CSS variables for theming, and scroll animations.
* `script.js`: Shared across every page. Fetches all data concurrently on load, then populates whichever sections exist in that page's HTML (each block is guarded by an `if ($('some-id'))` check), handles publication filtering, and triggers intersection observers for fade-in animations.
* `data/`: This directory must contain the six JSON data files that power the site content: `lab.json`, `themes.json`, `people.json`, `publications.json`, `grants.json`, and `news.json`.
* `vercel.json`: Holds the one rewrite rule that makes `/people/<name>` work. Don't delete it.

To add a new page, copy the `<nav>` and `<footer>` markup from an existing page, mark the matching `.nav-link` as `active`, and reuse `script.js` as-is — it only touches elements that are actually present on the page. **Every internal `href`/`src` in the `<head>` and `<nav>` is root-absolute** (e.g. `/styles.css`, `/people.html`, not `styles.css`), including in `script.js`'s own `fetch()` calls and dynamically-generated image tags — this is what lets `people/profile.html`, which lives one directory deeper than everything else, share the exact same markup and script as the rest of the site. Keep new pages consistent with that (don't switch back to bare relative paths).

## 👤 Person profile pages (`/people/<name>`)

Clicking a person's card on the People page navigates to a real URL like `/people/thivya-kandappu` instead of opening a popup. The card itself only shows a photo, name, and role — no link buttons; those (website/scholar/GitHub/email) only appear on the person's own profile page. There's no server and no per-person files — one template (`people/profile.html`) handles every person, styled as a proper full page (`#profile` fills the viewport height, no boxed card), not a "back to People" link — use the nav or the browser's back button to leave.

1. The card's link is built from the person's name via `slugify()` in `script.js` (lowercased, non-alphanumeric runs collapsed to a single `-`).
2. `vercel.json` rewrites any `/people/<name>` request to `people/profile.html`, transparently — the browser's address bar keeps the clean `/people/<name>` URL.
3. On load, `people/profile.html` reads the last segment of `location.pathname` as the slug, finds the matching person in `people.json` by re-running `slugify()` on each `name`, and renders their photo/role/bio/links.
4. It also lists that person's **Publications**: any entry in `publications.json` whose `authors` array contains a name matching theirs (via the shared `namesMatch()` helper — see below) is rendered underneath, most-recent-highlighted-first. If nobody's papers match, that whole "Publications" section is hidden rather than shown empty.

Because it's all client-side and slug-driven, **adding, renaming, or removing someone in `people.json` needs no other changes** — no generator script to re-run, no file to create per person. The trade-off: this specific routing (clean URL, no `.html`, no per-person file) only works once deployed to Vercel. Testing it locally with `python -m http.server` won't apply the rewrite; open `people/profile.html?name=<slug>` directly instead (the template falls back to that `?name=` query param when the path doesn't resolve to a real slug).

**Matching authors by name (`namesMatch()` in `script.js`):** `people.json` names can carry an honorific `publications.json` author strings don't — e.g. the PI is `"Dr. Thivya Kandappu"` in `people.json` but just `"Thivya Kandappu"` in every paper's `authors` array. A plain `===` comparison would never match, silently showing zero publications for anyone with a title. `namesMatch(a, b)` strips a leading `Dr.`/`Prof.`/`Professor` and lowercases both sides before comparing. This same helper also drives the "self" highlighting of the PI's name in the author list on `publications.html` — that had the identical exact-match bug, now fixed alongside this feature. If you add someone with a different honorific, extend the regex in `stripTitle()`.

## 🚀 Local Development & Debugging

Because this site uses the JavaScript `fetch()` API to load local JSON files, it **cannot** be run simply by double-clicking `index.html` in your browser (the fetches will fail with a CORS/file:// error). You must serve it over a local HTTP server. There's no `npm start` — there's no `package.json`, this is plain static HTML/CSS/JS.

Pick one, run it from the repo root:

```bash
# Quick preview — everything works except the clean /people/<name> URLs
python3 -m http.server 8000
# or
npx serve -p 8000 .
```

```bash
# Full preview, including clean /people/<name> URLs — reads vercel.json
# and actually applies the rewrite, matching production exactly.
# First run may ask you to log in / link the project to Vercel.
npx vercel dev
```

Then open `http://localhost:8000` (or whatever port `vercel dev` prints, typically `:3000`).

* With the **quick preview** servers, `/people/<name>` won't resolve (no rewrite support) — open `people/profile.html?name=<slug>` directly instead, e.g. `people/profile.html?name=gevindu-ganganath`.
* With `vercel dev`, `/people/gevindu-ganganath` works exactly as it will live.

**Debugging tips:**
* Open the browser DevTools **Console** first — `script.js` logs a single error there ("Failed to load lab data...") if any of the six JSON files under `data/` fail to fetch or fail to parse; that's almost always a JSON syntax error (trailing comma, missing quote) in the file you just edited.
* Check the **Network** tab for any request to `/data/*.json` or `/images/*` returning 404 — since every path in this repo is root-absolute, a 404 there usually means the server isn't running from the repo root, or a typo in a JSON `photo`/`image` path.
* A blank content section with no console error usually means the JSON loaded but didn't match what the render code expects (e.g. a `role` string that doesn't exactly match one of the case-sensitive values documented below).

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
* **Profile page:** Every card — PI included — links to `/people/<slugified-name>`. See [Person profile pages](#-person-profile-pages-peoplename) above. The website/scholar/GitHub/email buttons (formatted with icons for the predefined keys `scholar`, `github`, and `email`) show up there, not on the card.

### 2. Publications (`publications.json`)
* **Tags & Filtering:** The publication filter buttons at the top of the section are generated dynamically based on the unique `tags` you assign to each paper in the JSON array.
* **Highlights:** Set `"highlight": true` on a publication to give it a "Featured" badge and a prominent gold border.
* **Self-Highlighting:** If a string in the `authors` array exactly matches the Principal Investigator's name, that author's name will be automatically highlighted in the UI.

### 3. Grants (`grants.json`)
This section displays the lab's current and past funding.
* **Data Fields:** Each grant object displays the `title`, `amount`, `role` (e.g., PI, Co-PI), `funder`, and `period`.
* **Optional Descriptions:** You can include an optional `description` string to provide a brief summary of the project. If omitted, the grant card will simply condense its layout to fit the available metadata.

### 4. News Updates (`news.json`)
News items are visually styled based on their category. You must use one of the following exact categories to trigger the correct background and text colors:
* `Award` (Yellow)
* `Paper` (Blue)
* `Talk` (Green)
* `Join` (Purple)
* `Grant` (Red)

### 5. Lab Info & Themes (`lab.json` & `themes.json`)
* `lab.json`: Controls the site-wide metadata, the hero headline, contact info, and the top navigation bar name.
* `themes.json`: Populates the grid of "Our Research" theme cards displayed in the hero section.

## 🎨 Customization

If you need to rebrand the lab's primary colors or fonts, open `styles.css` and modify the `:root` variables at the top of the file.
* `--accent` and `--gold` control the primary highlight colors.
* `--paper`, `--paper2`, and `--paper3` control the dark navy background layers.