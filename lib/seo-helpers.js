// Shared helpers for the api/ serverless functions. Kept outside api/ on purpose —
// anything directly under api/ becomes a public route on Vercel, and this file
// isn't meant to be one.
//
// slugify() here MUST stay byte-for-byte identical to the one in script.js
// (client-side), since both sides need to agree on what a person's URL slug is.

const slugify = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const escapeHtml = s => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// Trims to a search-snippet-friendly length without cutting a word in half.
const truncate = (text, max) => {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(' ')) + '…';
};

const baseUrl = req => {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${req.headers.host}`;
};

module.exports = { slugify, escapeHtml, truncate, baseUrl };
