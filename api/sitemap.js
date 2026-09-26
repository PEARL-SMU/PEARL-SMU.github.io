// Serves /sitemap.xml (via the rewrite in vercel.json). Generated on request
// from the live data files, so it never drifts out of sync with people.json —
// add someone there and they show up here automatically, no rebuild needed.

const fs = require('fs');
const path = require('path');
const { slugify, baseUrl } = require('../lib/seo-helpers');

const STATIC_PATHS = ['/', '/research.html', '/people.html', '/publications.html', '/grants.html', '/news.html'];

module.exports = (req, res) => {
  try {
    const people = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'people.json'), 'utf8'));
    const site = baseUrl(req);

    const paths = [...STATIC_PATHS, ...people.map(p => `/people/${slugify(p.name)}`)];
    const urls = paths.map(p => `  <url><loc>${site}${p}</loc></url>`).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.status(200).send(xml);
  } catch (err) {
    console.error('api/sitemap failed:', err);
    res.status(500).send('Internal Server Error');
  }
};
