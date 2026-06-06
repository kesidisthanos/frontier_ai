/* ============================================================================
   frontier_ai (v2.2): master-detail UI. Categories and Companies render as
   uniform tiles; clicking a tile opens a slide-in drawer with its products, so
   the grid never reflows. Plus the theme toggle and filters. Graph is graph.js.
   ========================================================================== */
(function () {
  "use strict";

  var grid = document.getElementById("grid");
  var companiesEl = document.getElementById("companies");
  var data = Array.isArray(window.ECOSYSTEM) ? window.ECOSYSTEM : null;

  if (!data || !data.length) {
    grid.innerHTML = '<div class="empty"><h2>Couldn’t load the data</h2><p>data/ecosystem.js did not define a non-empty window.ECOSYSTEM array.</p></div>';
    return;
  }

  var CATEGORIES = [
    { key: "frontier", label: "Frontier", sub: "labs" },
    { key: "search",   label: "Search",   sub: "answer engines" },
    { key: "coding",   label: "Coding",   sub: "dev tools" },
    { key: "image",    label: "Image",    sub: "generation" },
    { key: "video",    label: "Video",    sub: "generation" },
    { key: "audio",    label: "Audio",    sub: "voice & music" },
    { key: "agents",   label: "Agents",   sub: "autonomous" },
    { key: "infra",    label: "Infra",    sub: "chips & clouds" },
    { key: "open",     label: "Open",     sub: "open weights" }
  ];
  var CAT_BY_KEY = {}, CAT_ORDER = {};
  CATEGORIES.forEach(function (c, i) { CAT_BY_KEY[c.key] = c; CAT_ORDER[c.key] = i; });

  var ICONS = {
    frontier: '<path d="M12 4l1.5 6.5L20 12l-6.5 1.5L12 20l-1.5-6.5L4 12l6.5-1.5z"/>',
    search:   '<circle cx="11" cy="11" r="6.5"/><path d="M21 21l-4.3-4.3"/>',
    coding:   '<path d="M8.5 8 4.5 12l4 4"/><path d="M15.5 8l4 4-4 4"/><path d="M13.6 6l-3.2 12"/>',
    image:    '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="8.8" cy="10" r="1.6"/><path d="M4 17.5l4.8-4.4a2 2 0 0 1 2.7-.05L20 19.5"/>',
    video:    '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9.2v5.6l4.8-2.8z"/>',
    audio:    '<path d="M5 10.5v3M9 8v8M13 6v12M17 8.5v7M21 11v2" stroke-linecap="round"/>',
    agents:   '<circle cx="12" cy="12" r="2.4"/><circle cx="5.5" cy="6.5" r="1.7"/><circle cx="18.5" cy="6.5" r="1.7"/><circle cx="12" cy="19.8" r="1.7"/><path d="M10.4 10.6 7 7.9M13.6 10.6 17 7.9M12 14.4v3.6" stroke-linecap="round"/>',
    infra:    '<rect x="7.5" y="7.5" width="9" height="9" rx="1.5"/><rect x="10.4" y="10.4" width="3.2" height="3.2" rx="0.6"/><path d="M10 7.5v-3M14 7.5v-3M10 19.5v-3M14 19.5v-3M7.5 10h-3M7.5 14h-3M19.5 10h-3M19.5 14h-3" stroke-linecap="round"/>',
    open:     '<rect x="5" y="11" width="14" height="9" rx="2.2"/><path d="M8 11V7.6a4 4 0 0 1 7.7-1.5"/><circle cx="12" cy="15.4" r="1"/>'
  };
  function iconFor(k) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round">' + (ICONS[k] || "") + "</svg>"; }
  var ARROW = '<span class="tile-arrow" aria-hidden="true">&#8594;</span>';

  var REGION = { us: "US", china: "CN", europe: "EU" };
  var STALE_DAYS = 90, TODAY = new Date();
  var state = { cats: new Set(), region: "all", q: "", view: "categories" };

  /* ---- helpers ---------------------------------------------------------- */
  function daysSince(iso) { var d = new Date(iso + "T00:00:00"); return isNaN(d) ? 0 : Math.floor((TODAY - d) / 86400000); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function badge(status) { return status && status !== "ga" ? '<span class="badge" data-status="' + status + '">' + status + "</span>" : ""; }
  function matchesRegionSearch(p) {
    if (state.region !== "all" && p.region !== state.region) return false;
    if (state.q) {
      var hay = (p.name + " " + p.org + " " + (p.version || "") + " " + (p.blurb || "") + " " + p.category + " " + p.status).toLowerCase();
      if (hay.indexOf(state.q) === -1) return false;
    }
    return true;
  }
  function catSelected(key) { return state.cats.size === 0 || state.cats.has(key); }
  function isActive(p) { return catSelected(p.category) && matchesRegionSearch(p); }
  function monogram(name) { var w = name.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean); return ((w.length > 1 ? w[0][0] + w[1][0] : name.slice(0, 2)) || "?").toUpperCase(); }
  function previewOf(prods) { return prods.slice(0, 7).map(function (p) { return p.name; }).join(", "); }

  /* ---- static header / footer ------------------------------------------- */
  var ORG_NAMES = []; (function () { var seen = {}; data.forEach(function (p) { if (!seen[p.org]) { seen[p.org] = 1; ORG_NAMES.push(p.org); } }); })();
  var latest = data.reduce(function (a, p) { return p.lastVerified > a ? p.lastVerified : a; }, "0000-00-00");
  document.getElementById("metaLine").innerHTML =
    data.length + ' products <span class="dot">·</span> ' + ORG_NAMES.length + ' companies <span class="dot">·</span> ' +
    CATEGORIES.length + ' categories <span class="dot">·</span> updated ' + esc(latest);
  document.getElementById("footMeta").textContent = data.length + " products · " + ORG_NAMES.length + " companies · last verified " + latest;

  /* ---- theme ------------------------------------------------------------ */
  var themeToggle = document.getElementById("themeToggle");
  var THEME_ICON = {
    system: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" stroke="none"/></svg>',
    light:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19"/></svg>',
    dark:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>'
  };
  function themePref() { return document.documentElement.dataset.themePref || "system"; }
  function applyTheme(pref) {
    try { localStorage.setItem("fa-theme", pref); } catch (e) {}
    document.documentElement.dataset.themePref = pref;
    var dark = pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    themeToggle.innerHTML = THEME_ICON[pref];
    themeToggle.title = "Theme: " + pref + " (click to change)";
    if (window.FrontierGraph && window.FrontierGraph.refreshTheme) window.FrontierGraph.refreshTheme();
  }
  themeToggle.addEventListener("click", function () { var o = ["system", "light", "dark"], i = o.indexOf(themePref()); applyTheme(o[(i + 1) % 3]); });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { if (themePref() === "system") applyTheme("system"); });
  applyTheme(themePref());

  /* ---- category filter chips -------------------------------------------- */
  var catFilter = document.getElementById("catFilter");
  CATEGORIES.forEach(function (c) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "chip-cat"; b.setAttribute("data-cat", c.key); b.setAttribute("aria-pressed", "false");
    b.innerHTML = '<span class="swatch" aria-hidden="true"></span>' + c.label + ' <span class="k" data-k="' + c.key + '">0</span>';
    b.addEventListener("click", function () { if (state.cats.has(c.key)) state.cats.delete(c.key); else state.cats.add(c.key); render(); });
    catFilter.appendChild(b);
  });

  /* ---- region + search + reset ------------------------------------------ */
  var regionSeg = document.getElementById("regionSegment");
  regionSeg.addEventListener("click", function (ev) {
    var btn = ev.target.closest("button"); if (!btn) return;
    state.region = btn.getAttribute("data-region");
    Array.prototype.forEach.call(regionSeg.children, function (x) { x.setAttribute("aria-pressed", String(x === btn)); });
    render();
  });
  var searchWrap = document.getElementById("searchWrap");
  var search = document.getElementById("search");
  search.addEventListener("input", function () { state.q = search.value.trim().toLowerCase(); searchWrap.classList.toggle("has-value", search.value.length > 0); render(); });
  document.getElementById("searchClear").addEventListener("click", function () { search.value = ""; state.q = ""; searchWrap.classList.remove("has-value"); search.focus(); render(); });
  var resetBtn = document.getElementById("reset");
  function resetAll() {
    state.cats.clear(); state.region = "all"; state.q = ""; search.value = ""; searchWrap.classList.remove("has-value");
    Array.prototype.forEach.call(regionSeg.children, function (x) { x.setAttribute("aria-pressed", String(x.getAttribute("data-region") === "all")); });
    render();
  }
  resetBtn.addEventListener("click", resetAll);

  /* ---- view toggle ------------------------------------------------------ */
  var viewSeg = document.getElementById("viewSegment");
  var graphView = document.getElementById("graphView");
  function setView(v) {
    state.view = v;
    Array.prototype.forEach.call(viewSeg.children, function (x) { x.setAttribute("aria-pressed", String(x.getAttribute("data-view") === v)); });
    document.body.classList.remove("view-categories", "view-companies", "view-graph");
    document.body.classList.add("view-" + v);
    graphView.hidden = v !== "graph";
    if (window.FrontierGraph) window.FrontierGraph.setVisible(v === "graph");
    closeDrawer();
    render();
  }
  viewSeg.addEventListener("click", function (ev) { var b = ev.target.closest("button"); if (b) setView(b.getAttribute("data-view")); });

  /* ---- detail drawer ---------------------------------------------------- */
  var drawer = document.getElementById("drawer");
  var overlay = document.getElementById("drawerOverlay");
  var drawerHead = document.getElementById("drawerHead");
  var drawerBody = document.getElementById("drawerBody");
  var drawerOpen = false, lastFocus = null, hideTimer = null;

  function drawerRow(p, kind) {
    return '<a class="drawer-row" data-cat="' + p.category + '" href="' + esc(p.url) + '" target="_blank" rel="noopener noreferrer" title="' + esc(p.blurb) + '">' +
      '<span class="dr-dot" aria-hidden="true"></span><span class="dr-name">' + esc(p.name) + "</span>" + badge(p.status) +
      '<span class="dr-tag">' + (kind === "category" ? esc(p.org) : esc(p.category)) + "</span>" +
      '<span class="dr-ver">' + (p.version ? esc(p.version) : "") + "</span>" +
      '<span class="dr-arrow" aria-hidden="true">↗</span></a>';
  }
  function openDrawer(kind, key) {
    var prods, head;
    if (kind === "category") {
      var c = CAT_BY_KEY[key]; if (!c) return;
      prods = data.filter(function (p) { return p.category === key && matchesRegionSearch(p); });
      drawer.dataset.cat = key;
      head = '<span class="dh-icon cat" aria-hidden="true">' + iconFor(key) + "</span>" +
        '<div class="dh-main"><div class="dh-kind">category &middot; ' + esc(c.sub) + "</div>" +
        '<div class="dh-name">' + c.label + "</div>" +
        '<div class="dh-meta"><span>' + prods.length + " products</span></div></div>";
    } else {
      prods = data.filter(function (p) { return p.org === key && catSelected(p.category) && matchesRegionSearch(p); });
      delete drawer.dataset.cat;
      var f = prods[0] || {};
      head = '<span class="dh-icon org" aria-hidden="true">' + esc(monogram(key)) + "</span>" +
        '<div class="dh-main"><div class="dh-kind">company</div>' +
        '<div class="dh-name">' + esc(key) + "</div>" +
        '<div class="dh-meta"><span>' + esc(REGION[f.region] || f.region || "") + "</span><span>" + prods.length + " products</span>" +
        (f.orgUrl ? '<a class="dh-visit" href="' + esc(f.orgUrl) + '" target="_blank" rel="noopener noreferrer">visit site &#8599;</a>' : "") + "</div></div>";
    }
    prods.sort(function (a, b) { return (CAT_ORDER[a.category] - CAT_ORDER[b.category]) || a.name.localeCompare(b.name); });
    drawerHead.innerHTML = head;
    drawerBody.innerHTML = prods.map(function (p) { return drawerRow(p, kind); }).join("");
    drawerBody.scrollTop = 0;
    lastFocus = document.activeElement;
    clearTimeout(hideTimer);
    drawer.hidden = false; overlay.hidden = false; drawerOpen = true;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(function () { overlay.classList.add("show"); drawer.classList.add("show"); });
    document.getElementById("drawerClose").focus();
  }
  function closeDrawer() {
    if (!drawerOpen) return;
    drawerOpen = false;
    overlay.classList.remove("show"); drawer.classList.remove("show");
    document.body.style.overflow = "";
    hideTimer = setTimeout(function () { drawer.hidden = true; overlay.hidden = true; }, 260);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.getElementById("drawerClose").addEventListener("click", closeDrawer);
  overlay.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && drawerOpen) closeDrawer(); });
  function onTileClick(ev) { var t = ev.target.closest("[data-kind]"); if (t) openDrawer(t.getAttribute("data-kind"), t.getAttribute("data-key")); }
  grid.addEventListener("click", onTileClick);
  companiesEl.addEventListener("click", onTileClick);

  /* ---- expose for graph ------------------------------------------------- */
  window.Frontier = { data: data, categories: CATEGORIES, isActive: isActive, onFilter: null };

  /* ---- tiles ------------------------------------------------------------ */
  function renderCategoryTiles(animate) {
    var html = "", shown = 0;
    CATEGORIES.forEach(function (c) {
      if (!catSelected(c.key)) return;
      var items = data.filter(function (p) { return p.category === c.key && matchesRegionSearch(p); });
      if (!items.length) return;
      shown++;
      html += '<button type="button" class="cat-card tile" data-cat="' + c.key + '" data-kind="category" data-key="' + c.key + '" style="--d:' + (shown * 28) + 'ms">' +
        '<span class="tile-icon cat" aria-hidden="true">' + iconFor(c.key) + "</span>" +
        '<span class="tile-main"><span class="tile-name">' + c.label + "</span>" +
        '<span class="tile-sub">' + esc(c.sub) + "</span>" +
        '<span class="tile-preview">' + esc(previewOf(items)) + "</span></span>" +
        '<span class="tile-count">' + items.length + "</span>" + ARROW + "</button>";
    });
    grid.className = "grid" + (animate ? " animate" : "");
    grid.innerHTML = html || emptyHTML("emptyReset");
    wireEmpty("emptyReset");
  }
  function renderCompanyTiles(animate) {
    var byOrg = {};
    data.forEach(function (p) { if (matchesRegionSearch(p) && catSelected(p.category)) (byOrg[p.org] = byOrg[p.org] || []).push(p); });
    var orgs = ORG_NAMES.filter(function (o) { return byOrg[o]; });
    orgs.sort(function (a, b) { return byOrg[b].length - byOrg[a].length || a.localeCompare(b); });
    var html = orgs.map(function (o, i) {
      var prods = byOrg[o];
      return '<button type="button" class="company-card tile" data-kind="company" data-key="' + esc(o) + '" style="--d:' + (i * 16) + 'ms">' +
        '<span class="tile-icon org" aria-hidden="true">' + esc(monogram(o)) + "</span>" +
        '<span class="tile-main"><span class="tile-name">' + esc(o) + "</span>" +
        '<span class="tile-sub">' + esc(REGION[prods[0].region] || prods[0].region) + " &middot; " + prods.length + " products</span>" +
        '<span class="tile-preview">' + esc(previewOf(prods)) + "</span></span>" +
        '<span class="tile-count">' + prods.length + "</span>" + ARROW + "</button>";
    }).join("");
    companiesEl.className = "companies" + (animate ? " animate" : "");
    companiesEl.innerHTML = html || emptyHTML("emptyReset2");
    wireEmpty("emptyReset2");
  }
  function emptyHTML(id) { return '<div class="empty"><h2>Nothing matches these filters</h2><p>Try a different region, clear the search, or reset.</p><button type="button" id="' + id + '">Reset filters</button></div>'; }
  function wireEmpty(id) { var er = document.getElementById(id); if (er) er.addEventListener("click", resetAll); }

  /* ---- render ----------------------------------------------------------- */
  var first = true;
  function render() {
    var counts = {}; CATEGORIES.forEach(function (c) { counts[c.key] = 0; });
    data.forEach(function (p) { if (matchesRegionSearch(p) && counts.hasOwnProperty(p.category)) counts[p.category]++; });
    CATEGORIES.forEach(function (c) {
      var k = catFilter.querySelector('[data-k="' + c.key + '"]'); if (k) k.textContent = counts[c.key];
      var chip = catFilter.querySelector('.chip-cat[data-cat="' + c.key + '"]'); if (chip) chip.setAttribute("aria-pressed", String(state.cats.has(c.key)));
    });
    var total = data.filter(isActive).length;
    document.getElementById("tallyN").textContent = total;
    document.getElementById("tallyOf").textContent = " / " + data.length;
    document.getElementById("showing").innerHTML = "showing <b>" + total + "</b> of " + data.length;
    resetBtn.disabled = state.cats.size === 0 && state.region === "all" && state.q === "";

    if (state.view === "categories") renderCategoryTiles(first);
    else if (state.view === "companies") renderCompanyTiles(first);
    if (first) { first = false; setTimeout(function () { grid.classList.remove("animate"); companiesEl.classList.remove("animate"); }, 800); }

    if (window.Frontier && typeof window.Frontier.onFilter === "function") window.Frontier.onFilter();
  }

  document.body.classList.add("view-categories");
  render();
})();
