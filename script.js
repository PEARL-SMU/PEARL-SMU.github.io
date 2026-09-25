document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Fetch all JSON data concurrently
    const [labRes, themesRes, peopleRes, pubsRes, grantsRes, newsRes] = await Promise.all([
      fetch('/data/lab.json'),
      fetch('/data/themes.json'),
      fetch('/data/people.json'),
      fetch('/data/publications.json'),
      fetch('/data/grants.json'), // <-- NEW
      fetch('/data/news.json')
    ]);

    // Parse JSON
    const d = {
      lab: await labRes.json(),
      themes: await themesRes.json(),
      people: await peopleRes.json(),
      publications: await pubsRes.json(),
      grants: await grantsRes.json(), // <-- NEW
      news: await newsRes.json()
    };

    /* ── helpers ─────────────────────────────────────────── */
    const $ = id => document.getElementById(id);
    // JSON data stores asset paths relative to the site root (e.g. "images/people/x.jpg").
    // Root-anchor them so they still resolve correctly from a nested page like /people/profile.html.
    const abs = path => (!path || /^(https?:)?\/\//.test(path) || path.startsWith('/')) ? path : '/' + path;
    const slugify = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    // people.json names can carry an honorific ("Dr. Thivya Kandappu") that publications.json
    // author strings don't ("Thivya Kandappu") — strip it so the two sides still match.
    const stripTitle = name => name.replace(/^(dr|prof|professor)\.?\s+/i, '').trim().toLowerCase();
    const namesMatch = (a, b) => stripTitle(a) === stripTitle(b);
    const fmt = iso => {
      if (!iso) return '';
      // If the date is just a 4-digit year, return the year directly
      if (String(iso).trim().length === 4) return iso;
      return new Date(iso).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
    };
    const PI_NAME = d.people.find(p => p.role === 'Principal Investigator')?.name || '';

    /* ── Intersection fade-in (shared across every page) ──── */
    const observeFadeIns = () => {
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => e.isIntersecting && e.target.classList.add('visible'));
      }, { threshold: 0.1 });
      document.querySelectorAll('.fade-in:not(.visible)').forEach(el => io.observe(el));
    };

    // Centralized link labels with FontAwesome icons
    const linkLabels = {
      website: '<i class="fa-solid fa-globe"></i> Website',
      scholar: '<i class="fa-solid fa-graduation-cap"></i> Scholar',
      twitter: '<i class="fa-brands fa-x-twitter"></i> Twitter',
      github: '<i class="fa-brands fa-github"></i> GitHub',
      email: '<i class="fa-solid fa-envelope"></i> Email'
    };

    /* ── Hero (home page only) ──────────────────────────────── */
    if ($('hero-fullname')) {
      $('hero-fullname').textContent = d.lab.fullName;
      $('hero-tagline').textContent = d.lab.tagline;
      $('hero-desc').textContent = d.lab.description;
      $('hero-meta').innerHTML = [
        `<span>📍 ${d.lab.location}</span>`,
        `<span>✉️ ${d.lab.email}</span>`,
        `<span>Est. ${d.lab.founded}</span>`,
      ].join('');

      /* research themes */
      $('themes-grid').innerHTML = d.themes.map(t => `
        <div class="theme-card fade-in">
          <div class="theme-icon">${t.icon}</div>
          <div class="theme-title">${t.title}</div>
          <div class="theme-text">${t.text}</div>
        </div>`).join('');
    }

    /* ── People (current + alumni, each a flat grid, seniority-sorted) ── */
    if ($('people-container')) {
      // Anyone whose role isn't listed here sorts after everyone who is, in JSON order.
      const ROLE_ORDER = [
        'Principal Investigator',
        'Research Scientist',
        'PhD Candidate',
        'PhD Student',
        'Masters Student',
        'Research Engineer',
        'Visiting Researcher',
      ];
      const roleRank = role => {
        const i = ROLE_ORDER.indexOf(role);
        return i === -1 ? ROLE_ORDER.length : i;
      };
      // Array.sort is stable, so people who share a role keep their JSON order.
      const byRole = people => [...people].sort((a, b) => roleRank(a.role) - roleRank(b.role));

      const personCard = p => `
        <a class="person-card" href="/people/${slugify(p.name)}" aria-label="View profile of ${p.name}">
          <img class="person-photo" src="${abs(p.photo)}" alt="${p.name}" loading="lazy" />
          <div class="person-info">
            <div class="person-name">${p.name}</div>
            <div class="person-role">${p.role}</div>
          </div>
        </a>`;

      const current = byRole(d.people.filter(p => !p.isAlumni));
      const alumni = byRole(d.people.filter(p => p.isAlumni));

      const group = (label, people) => !people.length ? '' : `
        <div class="people-group fade-in">
          <div class="people-group-label">${label}</div>
          <div class="people-grid">
            ${people.map(personCard).join('')}
          </div>
        </div>`;

      $('people-container').innerHTML = group('Current', current) + group('Alumni', alumni);
    } // end people-container guard

    /* ── Person profile page (/people/<name>) ─────────────── */
    if ($('profile-container')) {
      // Vercel rewrites /people/<name> to this file while keeping the clean
      // URL in the address bar, so the slug is the last path segment. Fall
      // back to a ?name= query param for local testing without the rewrite.
      const seg = location.pathname.split('/').filter(Boolean).pop() || '';
      const slug = (seg && seg !== 'profile.html') ? seg : (new URLSearchParams(location.search).get('name') || '');
      const person = d.people.find(p => slugify(p.name) === slug);

      if (person) {
        document.title = `${person.name} — ${d.lab.name}`;
        $('profile-container').innerHTML = `
          <div class="profile-layout fade-in">
            <img class="profile-photo" src="${abs(person.photo)}" alt="${person.name}" loading="lazy" />
            <div class="profile-info">
              <h1 class="profile-name">${person.name}</h1>
              <div class="profile-role">${person.title || person.role}</div>
              <p class="profile-bio">${person.bio}</p>
              <div class="profile-links">
                ${Object.entries(person.links || {}).filter(([, v]) => v && v !== '#').map(([k, v]) => `
                  <a class="btn btn-outline"
                     href="${k === 'email' ? 'mailto:' + v : v}"
                     ${k === 'email' ? '' : 'target="_blank"'}>
                    ${linkLabels[k] || k}
                  </a>
                `).join('')}
              </div>
            </div>
          </div>`;

        // Publications where this person appears in the authors list, matched by name.
        const personPubs = d.publications
          .filter(pub => pub.authors.some(a => namesMatch(a, person.name)))
          .sort((a, b) => (b.highlight ? 1 : 0) - (a.highlight ? 1 : 0));

        if ($('profile-pub-list')) {
          if (personPubs.length) {
            $('profile-pub-list').innerHTML = personPubs.map(p => `
              <div class="pub-card fade-in ${p.highlight ? 'featured' : ''}">
                ${p.image ? `
                <div class="pub-image-wrapper">
                  <img src="${abs(p.image)}" alt="Thumbnail for ${p.title}" class="pub-image" loading="lazy" />
                </div>` : ''}
                <div class="pub-info">
                  <div class="pub-top">
                    <div class="pub-title">${p.title}</div>
                    ${p.highlight ? '<span class="pub-badge">Featured</span>' : ''}
                  </div>
                  <div class="pub-authors">${p.authors.map(a => namesMatch(a, person.name) ? `<span class="self">${a}</span>` : a).join(', ')}</div>
                  <div class="pub-venue">${p.venue}</div>
                  <div class="pub-tags">${p.tags.map(t => `<span class="pub-tag">${t}</span>`).join('')}</div>
                  <div class="pub-links">
                    ${Object.entries(p.links || {}).filter(([, v]) => v && v !== '#').map(([k, v]) => `<a class="pub-link" href="${v}" target="_blank">${k.charAt(0).toUpperCase() + k.slice(1)}</a>`).join('')}
                  </div>
                </div>
              </div>`).join('');
          } else if ($('profile-pubs')) {
            $('profile-pubs').style.display = 'none';
          }
        }
      } else {
        $('profile-container').innerHTML = `<p class="hero-desc">We couldn't find that person. <a href="/people.html">Back to People</a>.</p>`;
        if ($('profile-pubs')) $('profile-pubs').style.display = 'none';
      }
    } // end profile-container guard

    /* ── Publications ─────────────────────────────────────── */
    if ($('pub-list')) {
    let activeFilter = 'All';
    // ── Show-more (disabled) ───────────────────────────────
    // let pubsExpanded = false;
    // const PUBS_PREVIEW = 3;
    const allTags = ['All', ...new Set(d.publications.flatMap(p => p.tags))];

    const renderFilters = () => {
      $('pub-filters').innerHTML = allTags.map(t => `
        <button class="filter-btn ${t === activeFilter ? 'active' : ''}" data-tag="${t}">${t}</button>`).join('');
      $('pub-filters').querySelectorAll('.filter-btn').forEach(b =>
        b.addEventListener('click', () => {
          activeFilter = b.dataset.tag;
          // pubsExpanded = false; // a new filter starts collapsed again — show-more disabled
          renderPubs();
          renderFilters();
        }));
    };

    const renderPubs = () => {
      const matching = activeFilter === 'All' ? d.publications : d.publications.filter(p => p.tags.includes(activeFilter));
      // Featured papers first so they always land in the collapsed preview.
      // Array.sort is stable, so JSON order is preserved within each group.
      const pubs = [...matching].sort((a, b) => (b.highlight ? 1 : 0) - (a.highlight ? 1 : 0));
      $('pub-list').innerHTML = pubs.map((p, i) => `
        <div class="pub-card fade-in ${p.highlight ? 'featured' : ''}" data-pub="${i}">
          <!-- show-more disabled: card used to also get 'pub-hidden' here past the preview count -->

          ${/* New image wrapper */ p.image ? `
          <div class="pub-image-wrapper">
            <img src="${abs(p.image)}" alt="Thumbnail for ${p.title}" class="pub-image" loading="lazy" />
          </div>` : ''}

          <div class="pub-info">
            <div class="pub-top">
              <div class="pub-title">${p.title}</div>
              ${p.highlight ? '<span class="pub-badge">Featured</span>' : ''}
            </div>
            <div class="pub-authors">${p.authors.map(a => namesMatch(a, PI_NAME) ? `<span class="self">${a}</span>` : a).join(', ')}</div>
            <div class="pub-venue">${p.venue}</div>
            <div class="pub-tags">${p.tags.map(t => `<span class="pub-tag">${t}</span>`).join('')}</div>
            <div class="pub-abstract">${p.abstract}</div>
            <button class="pub-toggle" data-pub="${i}">▸ Abstract</button>
            <div class="pub-links">
              ${Object.entries(p.links || {}).filter(([, v]) => v && v !== '#').map(([k, v]) => `<a class="pub-link" href="${v}" target="_blank">${k.charAt(0).toUpperCase() + k.slice(1)}</a>`).join('')}
            </div>
          </div>

        </div>`).join('');

      $('pub-list').querySelectorAll('.pub-toggle').forEach(btn =>
        btn.addEventListener('click', () => {
          const card = btn.closest('.pub-card');
          const expanded = card.classList.toggle('expanded');
          btn.textContent = expanded ? '▾ Abstract' : '▸ Abstract';
        }));

      // renderPubsToggle(pubs.length); // show-more disabled
      observeFadeIns();
    };

    /* ── Show-more toggle (disabled) ─────────────────────────
    const renderPubsToggle = total => {
      const hiddenCount = total - PUBS_PREVIEW;

      if (hiddenCount <= 0) {
        $('pub-more').innerHTML = '';
        return;
      }

      $('pub-more').innerHTML = `
        <button class="grants-toggle" id="pub-more-btn" aria-expanded="${pubsExpanded}" aria-controls="pub-list">
          ${pubsExpanded ? 'Show less ▴' : `Show ${hiddenCount} more ▾`}
        </button>`;

      $('pub-more-btn').addEventListener('click', () => {
        pubsExpanded = !pubsExpanded;

        $('pub-list').querySelectorAll('.pub-card').forEach((card, i) => {
          if (i < PUBS_PREVIEW) return;
          card.classList.toggle('pub-hidden', !pubsExpanded);
          if (pubsExpanded) card.classList.add('visible');
        });

        renderPubsToggle(total);

        // Collapsing can leave the viewport below the section — pull it back into view
        if (!pubsExpanded) $('publications').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    };
    ── end disabled block ── */

    renderFilters();
    renderPubs();
    } // end pub-list guard

    /* ── Grants ────────────────────────────────────────────── */
    if ($('grants-list')) {
    // ── Show-more (disabled) ───────────────────────────────
    // const GRANTS_PREVIEW = 3;

    $('grants-list').innerHTML = d.grants.map((g, i) => `
      <div class="grant-card fade-in">
        <!-- show-more disabled: card used to also get 'grant-hidden' here past the preview count -->
        <div class="grant-top">
          <div class="grant-title">${g.title}</div>
          <span class="grant-amount">${g.amount}</span>
        </div>
        <div class="grant-details">
          <div class="grant-meta"><strong>Role:</strong> ${g.role}</div>
          <div class="grant-meta"><strong>Funder:</strong> ${g.funder}</div>
          <div class="grant-meta"><strong>Period:</strong> ${g.period}</div>
        </div>
        ${g.description ? `<div class="grant-desc">${g.description}</div>` : ''}
      </div>`).join('');

    /* ── Show-more toggle (disabled) ─────────────────────────
    if (d.grants.length > GRANTS_PREVIEW) {
      const hiddenCount = d.grants.length - GRANTS_PREVIEW;
      let grantsExpanded = false;

      $('grants-more').innerHTML = `
        <button class="grants-toggle" id="grants-toggle" aria-expanded="false" aria-controls="grants-list">
          Show ${hiddenCount} more ▾
        </button>`;

      $('grants-toggle').addEventListener('click', () => {
        grantsExpanded = !grantsExpanded;
        const btn = $('grants-toggle');

        $('grants-list').querySelectorAll('.grant-card').forEach((card, i) => {
          if (i < GRANTS_PREVIEW) return;
          card.classList.toggle('grant-hidden', !grantsExpanded);
          if (grantsExpanded) card.classList.add('visible');
        });

        btn.textContent = grantsExpanded ? 'Show less ▴' : `Show ${hiddenCount} more ▾`;
        btn.setAttribute('aria-expanded', String(grantsExpanded));

        // Collapsing can leave the viewport below the section — pull it back into view
        if (!grantsExpanded) $('grants').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    ── end disabled block ── */
    } // end grants-list guard


    /* ── News ─────────────────────────────────────────────── */
    if ($('news-list')) {
    const sortedNews = d.news.sort((a, b) => new Date(b.date) - new Date(a.date));

    $('news-list').innerHTML = sortedNews.map(n => `
      <div class="news-item fade-in">
        <div class="news-date-col">
          <div class="news-date">${fmt(n.date)}</div>
          <span class="news-cat cat-${n.category}">${n.category}</span>
        </div>
        <div>
          <div class="news-title">${n.title}</div>
          <div class="news-body">${n.body}</div>
        </div>
      </div>`).join('');
    } // end news-list guard

    /* ── Footer (present on every page) ────────────────────── */
    if ($('footer')) $('footer').innerHTML = `
      <div class="footer-logos">
        <img class="footer-logo-pips" src="/images/PIPS-favicons/apple-touch-icon.png" alt="PIPS Lab" loading="lazy" />
        <img class="footer-logo-smu" src="/images/smu-logo-cropped.png" alt="Singapore Management University" loading="lazy" />
      </div>
      <div>© ${new Date().getFullYear()} ${d.lab.fullName} · ${d.lab.affiliation}</div>`;

    observeFadeIns();

  } catch (error) {
    console.error("Failed to load lab data. Are you running a local server?", error);
  }
});