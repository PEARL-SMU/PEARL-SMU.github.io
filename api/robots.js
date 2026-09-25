// Serves /robots.txt (via the rewrite in vercel.json). A function rather than
// a static file so the Sitemap directive can point at the actual request
// host — a static file would have to hardcode a domain, which would be wrong
// on preview deployments and break if the production domain ever changes.

const { baseUrl } = require('../lib/seo-helpers');

module.exports = (req, res) => {
  const body = `User-agent: *\nAllow: /\n\nSitemap: ${baseUrl(req)}/sitemap.xml\n`;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.status(200).send(body);
};
