document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Fetch all JSON data concurrently
    const [labRes, themesRes, peopleRes, pubsRes, newsRes] = await Promise.all([
      fetch('data/lab.json'),
      fetch('data/themes.json'),
      fetch('data/people.json'),
      fetch('data/publications.json'),
      fetch('data/news.json')
    ]);

    // Parse JSON
    const d = {
      lab: await labRes.json(),
      themes: await themesRes.json(),
      people: await peopleRes.json(),
      publications: await pubsRes.json(),
      news: await newsRes.json()
    };

    /* ── helpers ─────────────────────────────────────────── */
    const $ = id => document.getElementById(id);
    const fmt = iso => new Date(iso).toLocaleDateString('en-GB', { year:'numeric', month:'short', day:'numeric' });
    const PI_NAME = d.people.find(p => p.role === 'Principal Investigator')?.name || '';

    /* ── Nav brand ────────────────────────────────────────── */
    $('nav-lab-name').textContent = d.lab.name;

    /* ── Hero ─────────────────────────────────────────────── */
    $('hero-affiliation').textContent = d.lab.affiliation;
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

    /* ── People ───────────────────────────────────────────── */
    const ORDER = ['Principal Investigator','Postdoc','Research Engineer','PhD Student','Masters Student','Visiting Researcher','Alumni'];
    const groups = {};
    d.people.forEach(p => { (groups[p.role] = groups[p.role]||[]).push(p); });

    $('people-container').innerHTML = ORDER.filter(r => groups[r]).map(r => `
      <div class="people-group fade-in">
        <div class="people-group-label">${r}</div>
        <div class="people-grid">
          ${groups[r].map((p, i) => `
            <div class="person-card" data-person="${d.people.indexOf(p)}" tabindex="0" role="button" aria-label="View profile of ${p.name}">
              <img class="person-photo" src="${p.photo}" alt="${p.name}" loading="lazy" />
              <div class="person-info">
                <div class="person-name">${p.name}</div>
                <div class="person-role">${p.role}</div>
              </div>
            </div>`).join('')}
        </div>
      </div>`).join('');

    /* modal */
    const overlay = $('modal-overlay');
    const modalContent = $('modal-content');
    const openModal = idx => {
      const p = d.people[idx];
      const linkLabels = { website:'🌐 Website', scholar:'📄 Scholar', twitter:'🐦 Twitter', github:'💻 GitHub', email:'✉️ Email' };
      modalContent.innerHTML = `
        <div class="modal-header">
          <img class="modal-photo" src="${p.photo}" alt="${p.name}" />
          <div>
            <div class="modal-name">${p.name}</div>
            <div class="modal-role">${p.role}</div>
          </div>
        </div>
        <div class="modal-bio">${p.bio}</div>
        <div class="modal-links">
          ${Object.entries(p.links||{}).map(([k,v])=>`<a class="modal-link" href="${v}" target="_blank">${linkLabels[k]||k}</a>`).join('')}
        </div>`;
      overlay.classList.add('open');
    };
    
    document.querySelectorAll('.person-card').forEach(c => {
      const open = () => openModal(+c.dataset.person);
      c.addEventListener('click', open);
      c.addEventListener('keydown', e => e.key === 'Enter' && open());
    });
    
    $('modal-close').addEventListener('click', () => overlay.classList.remove('open'));
    overlay.addEventListener('click', e => e.target === overlay && overlay.classList.remove('open'));
    document.addEventListener('keydown', e => e.key === 'Escape' && overlay.classList.remove('open'));

    /* ── Publications ─────────────────────────────────────── */
    let activeFilter = 'All';
    const allTags = ['All', ...new Set(d.publications.flatMap(p => p.tags))];

    const renderFilters = () => {
      $('pub-filters').innerHTML = allTags.map(t => `
        <button class="filter-btn ${t===activeFilter?'active':''}" data-tag="${t}">${t}</button>`).join('');
      $('pub-filters').querySelectorAll('.filter-btn').forEach(b =>
        b.addEventListener('click', () => { activeFilter = b.dataset.tag; renderPubs(); renderFilters(); }));
    };

    /* ── Intersection fade-in ─────────────────────────────── */
    const observeFadeIns = () => {
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => e.isIntersecting && e.target.classList.add('visible'));
      }, { threshold: 0.1 });
      document.querySelectorAll('.fade-in:not(.visible)').forEach(el => io.observe(el));
    };

    const renderPubs = () => {
      const pubs = activeFilter === 'All' ? d.publications : d.publications.filter(p => p.tags.includes(activeFilter));
      $('pub-list').innerHTML = pubs.map((p, i) => `
        <div class="pub-card fade-in ${p.highlight?'featured':''}" data-pub="${i}">
          <div class="pub-top">
            <div class="pub-title">${p.title}</div>
            ${p.highlight ? '<span class="pub-badge">Featured</span>' : ''}
          </div>
          <div class="pub-authors">${p.authors.map(a=>a===PI_NAME?`<span class="self">${a}</span>`:a).join(', ')}</div>
          <div class="pub-venue">${p.venue}</div>
          <div class="pub-tags">${p.tags.map(t=>`<span class="pub-tag">${t}</span>`).join('')}</div>
          <div class="pub-abstract">${p.abstract}</div>
          <button class="pub-toggle" data-pub="${i}">▸ Abstract</button>
          <div class="pub-links">
            ${Object.entries(p.links||{}).map(([k,v])=>`<a class="pub-link" href="${v}" target="_blank">${k.toUpperCase()}</a>`).join('')}
          </div>
        </div>`).join('');

      $('pub-list').querySelectorAll('.pub-toggle').forEach(btn =>
        btn.addEventListener('click', () => {
          const card = btn.closest('.pub-card');
          const expanded = card.classList.toggle('expanded');
          btn.textContent = expanded ? '▾ Abstract' : '▸ Abstract';
        }));
      observeFadeIns();
    };

    renderFilters();
    renderPubs();

    /* ── News ─────────────────────────────────────────────── */
    $('news-list').innerHTML = d.news.map(n => `
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

    /* ── Footer ───────────────────────────────────────────── */
    $('footer').innerHTML = `© ${new Date().getFullYear()} ${d.lab.fullName} · ${d.lab.affiliation} ·
      <a href="mailto:${d.lab.email}">${d.lab.email}</a>`;

    /* ── Active nav highlight on scroll ──────────────────── */
    const sections = ['home','people','publications','news'].map(id => $( id));
    const navLinks  = document.querySelectorAll('nav .nav-link');
    const onScroll  = () => {
      const mid = window.scrollY + window.innerHeight / 3;
      sections.forEach((s, i) => {
        if (!s) return;
        if (s.offsetTop <= mid && s.offsetTop + s.offsetHeight > mid)
          navLinks.forEach((l, j) => l.classList.toggle('active', i === j));
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    observeFadeIns();
    
  } catch (error) {
    console.error("Failed to load lab data. Are you running a local server?", error);
  }
});