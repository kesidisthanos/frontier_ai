/* ============================================================================
   frontier_ai (v2): renders the product catalog as three views (categories,
   companies, graph), runs the filters, and owns the theme toggle. The graph
   view lives in graph.js and reads state through window.Frontier.
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
  var CAT_LABEL = {}; CATEGORIES.forEach(function (c) { CAT_LABEL[c.key] = c.label; });

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

  var REGION = { us: "US", china: "CN", europe: "EU" };
  var STALE_DAYS = 90;
  var TODAY = new Date();

  var state = { cats: new Set(), region: "all", q: "", view: "categories", openOrgs: new Set() };

  /* ---- helpers ---------------------------------------------------------- */
  function daysSince(iso) { var d = new Date(iso + "T00:00:00"); return isNaN(d) ? 0 : Math.floor((TODAY - d) / 86400000); }
  function isStale(p) { return daysSince(p.lastVerified) > STALE_DAYS; }
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
  themeToggle.addEventListener("click", function () {
    var order = ["system", "light", "dark"], i = order.indexOf(themePref());
    applyTheme(order[(i + 1) % 3]);
  });
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
    render();
  }
  viewSeg.addEventListener("click", function (ev) { var b = ev.target.closest("button"); if (b) setView(b.getAttribute("data-view")); });

  /* ---- companies: expand / collapse ------------------------------------- */
  companiesEl.addEventListener("click", function (ev) {
    var head = ev.target.closest(".company-head"); if (!head) return;
    var card = head.parentNode, org = card.getAttribute("data-org");
    if (state.openOrgs.has(org)) { state.openOrgs.delete(org); card.classList.remove("open"); }
    else { state.openOrgs.add(org); card.classList.add("open"); }
    head.setAttribute("aria-expanded", String(state.openOrgs.has(org)));
  });

  /* ---- expose for graph ------------------------------------------------- */
  window.Frontier = { data: data, categories: CATEGORIES, isActive: isActive, onFilter: null };

  /* ---- entry (category view) -------------------------------------------- */
  function entryHTML(p) {
    var stale = isStale(p);
    var sub = esc(p.org) + (p.version ? ' <span class="v">' + esc(p.version) + "</span>" : "");
    var foot = '<span class="entry-region">' + esc(REGION[p.region] || p.region) + "</span><span class=\"entry-access\">" + esc(p.access) + "</span>";
    foot += stale
      ? '<span class="stale-dot" title="Last verified ' + daysSince(p.lastVerified) + ' days ago, may be out of date">' + esc(p.lastVerified) + "</span>"
      : '<span class="entry-date">' + esc(p.lastVerified) + "</span>";
    return '<a class="entry' + (stale ? " is-stale" : "") + '" href="' + esc(p.url) + '" target="_blank" rel="noopener noreferrer" title="' + esc(p.blurb) + '">' +
      '<span class="entry-top"><span class="entry-name">' + esc(p.name) + "</span>" + badge(p.status) + '<span class="entry-arrow" aria-hidden="true">↗</span></span>' +
      '<span class="entry-sub">' + sub + "</span>" +
      '<span class="entry-foot">' + foot + "</span></a>";
  }

  function renderCategories(animate) {
    var html = "", shown = 0;
    CATEGORIES.forEach(function (c) {
      if (!catSelected(c.key)) return;
      var items = data.filter(function (p) { return p.category === c.key && matchesRegionSearch(p); });
      if (!items.length) return;
      shown++;
      html += '<section class="cat-card" data-cat="' + c.key + '" style="--d:' + (shown * 40) + 'ms">' +
        '<div class="cat-head"><span class="cat-icon" aria-hidden="true">' + iconFor(c.key) + "</span>" +
        '<div class="cat-title"><div class="name">' + c.label + '</div><div class="sub">' + esc(c.sub) + "</div></div>" +
        '<span class="cat-count">' + items.length + "</span></div>" +
        '<div class="entries">' + items.map(entryHTML).join("") + "</div></section>";
    });
    grid.className = "grid" + (animate ? " animate" : "");
    grid.innerHTML = html || '<div class="empty"><h2>No products match these filters</h2><p>Try a different region, clear the search, or reset.</p><button type="button" id="emptyReset">Reset filters</button></div>';
    var er = document.getElementById("emptyReset"); if (er) er.addEventListener("click", resetAll);
  }

  /* ---- companies view --------------------------------------------------- */
  function monogram(name) {
    var w = name.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean);
    return ((w.length > 1 ? w[0][0] + w[1][0] : (name.slice(0, 2))) || "?").toUpperCase();
  }
  var CHEVRON = '<svg class="company-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';

  function renderCompanies(animate) {
    var byOrg = {};
    data.forEach(function (p) { if (matchesRegionSearch(p) && catSelected(p.category)) (byOrg[p.org] = byOrg[p.org] || []).push(p); });
    var orgs = ORG_NAMES.filter(function (o) { return byOrg[o]; });
    orgs.sort(function (a, b) { return byOrg[b].length - byOrg[a].length || a.localeCompare(b); });

    if (!orgs.length) {
      companiesEl.className = "companies";
      companiesEl.innerHTML = '<div class="empty"><h2>No companies match these filters</h2><p>Try a different region, clear the search, or reset.</p><button type="button" id="emptyReset2">Reset filters</button></div>';
      var er = document.getElementById("emptyReset2"); if (er) er.addEventListener("click", resetAll);
      return;
    }
    var html = "";
    orgs.forEach(function (o, idx) {
      var prods = byOrg[o], region = prods[0].region, open = state.openOrgs.has(o);
      var rows = prods.map(function (p) {
        return '<a class="product-row" data-cat="' + p.category + '" href="' + esc(p.url) + '" target="_blank" rel="noopener noreferrer" title="' + esc(p.blurb) + '">' +
          '<span class="pdot" aria-hidden="true"></span><span class="pname">' + esc(p.name) + "</span>" +
          '<span class="pcat">' + esc(p.category) + "</span>" + badge(p.status) +
          (p.version ? '<span class="pver">' + esc(p.version) + "</span>" : '<span class="pver"></span>') +
          '<span class="parrow" aria-hidden="true">↗</span></a>';
      }).join("");
      html += '<div class="company-card' + (open ? " open" : "") + '" data-org="' + esc(o) + '" style="--d:' + (idx * 22) + 'ms">' +
        '<button type="button" class="company-head" aria-expanded="' + open + '">' +
        '<span class="company-monogram" aria-hidden="true">' + esc(monogram(o)) + "</span>" +
        '<span class="company-title"><span class="company-name">' + esc(o) + "</span>" +
        '<span class="company-meta">' + esc(REGION[region] || region) + " · " + prods.length + (prods.length === 1 ? " product" : " products") + "</span></span>" +
        '<span class="company-count">' + prods.length + "</span>" + CHEVRON + "</button>" +
        '<div class="company-body">' + rows + "</div></div>";
    });
    companiesEl.className = "companies" + (animate ? " animate" : "");
    companiesEl.innerHTML = html;
  }

  /* ---- render ----------------------------------------------------------- */
  var first = true;
  function render() {
    // chip counts (region + search, ignoring category selection)
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

    if (state.view === "categories") renderCategories(first);
    else if (state.view === "companies") renderCompanies(first);
    if (first) { first = false; setTimeout(function () { grid.classList.remove("animate"); companiesEl.classList.remove("animate"); }, 800); }

    if (window.Frontier && typeof window.Frontier.onFilter === "function") window.Frontier.onFilter();
  }

  document.body.classList.add("view-categories");
  render();
})();
