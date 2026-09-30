// Serves /people/<name> (via the rewrite in vercel.json). Injects a real,
// per-person <title>/meta description/Open Graph tags into the static
// people/profile.html template server-side, before script.js ever runs —
// so a crawler (or a link preview) sees the actual content immediately
// instead of having to execute JS first.
//
// script.js still does all the actual page rendering client-side exactly as
// before; this function only rewrites the <head>, nothing in <body>.

const fs = require('fs');
const path = require('path');
const { slugify, escapeHtml, truncate, baseUrl } = require('../lib/seo-helpers');

const TITLE_PLACEHOLDER = '<title>Profile — PIPS Lab</title>';

module.exports = (req, res) => {
  try {
    const slug = req.query.name;
    const template = fs.readFileSync(path.join(process.cwd(), 'people', 'profile.html'), 'utf8');
    const people = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'people.json'), 'utf8'));
    const lab = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'lab.json'), 'utf8'));

    const person = people.find(p => slugify(p.name) === slug);
    const site = baseUrl(req);

    if (!person) {
      const html = template
        .replace(TITLE_PLACEHOLDER, '<title>Person not found — PIPS Lab</title>')
        .replace('</head>', '  <meta name="robots" content="noindex">\n</head>');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(404).send(html);
      return;
    }

    const pageTitle = `${person.name} — ${lab.name}`;
    const role = person.title || person.role;
    // Keep the boilerplate short so most of the 160-char budget goes to the
    // person's own bio — that's the part that's actually unique to this page.
    const description = truncate(
      `${role} at ${lab.name} Lab. ${person.bio || ''}`.trim(),
      160
    );
    const photoUrl = person.photo
      ? `${site}/${String(person.photo).replace(/^\/+/, '')}`
      : `${site}/images/logos/favicon/android-chrome-512x512.png`;
    const pageUrl = `${site}/people/${slugify(person.name)}`;

    const head = `<title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${pageUrl}">
  <meta property="og:type" content="profile">
  <meta property="og:title" content="${escapeHtml(pageTitle)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:image" content="${photoUrl}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(pageTitle)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${photoUrl}">`;

    const html = template.replace(TITLE_PLACEHOLDER, head);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (err) {
    console.error('api/people failed:', err);
    res.status(500).send('Internal Server Error');
  }
};
