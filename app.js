/* ============================================================================
   frontier_ai (v4): a drill-down living map.
   Home = nine category tiles. Click one -> its companies, each with their
   models. Click a model -> inline popover (with "all from this company" to
   drill the other way). A Graph mode shows companies linked to the categories
   they build in. Filters (region, pricing, search, sort) apply throughout.
   ========================================================================== */
(function () {
  "use strict";

  var home = document.getElementById("home");
  var catView = document.getElementById("catView");
  var graphView = document.getElementById("graphView");
  var crumbs = document.getElementById("crumbs");
  var data = Array.isArray(window.ECOSYSTEM) ? window.ECOSYSTEM : null;
  if (!data || !data.length) { home.innerHTML = '<div class="empty"><h2>Couldn’t load the data</h2></div>'; return; }
  data.forEach(function (p, i) { p._i = i; });

  var CATEGORIES = [
    { key: "frontier", label: "Frontier", sub: "labs & flagship models" },
    { key: "search",   label: "Search",   sub: "answer engines" },
    { key: "coding",   label: "Coding",   sub: "dev tools & agents" },
    { key: "image",    label: "Image",    sub: "generation & editing" },
    { key: "video",    label: "Video",    sub: "generation" },
    { key: "audio",    label: "Audio",    sub: "voice & music" },
    { key: "agents",   label: "Agents",   sub: "autonomous & assistants" },
    { key: "infra",    label: "Infra",    sub: "chips, clouds & APIs" },
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

  var REGION = { us: "US", china: "China", europe: "Europe" };
  var PRICE_LABEL = { free: "Free", freemium: "Freemium", paid: "Paid", enterprise: "Enterprise" };
  var PRICE_RANK = { free: 0, freemium: 1, paid: 2, enterprise: 3 };
  var STATUS_RANK = { ga: 0, beta: 1, preview: 2, waitlist: 3, research: 4, announced: 5, deprecated: 6 };
  function srank(s) { return STATUS_RANK[s] == null ? 9 : STATUS_RANK[s]; }
  var PROMINENCE = ["Anthropic","OpenAI","Google","Meta","xAI","Microsoft","Mistral AI","DeepSeek","Alibaba","NVIDIA","Perplexity","Cognition","Anysphere","Midjourney","Black Forest Labs","Runway","Luma AI","Pika","ElevenLabs","Stability AI","Suno","Adobe","Moonshot AI","Z.ai","ByteDance","Tencent","Baidu","MiniMax","Kuaishou","Replit","Hugging Face","Groq","Cerebras","Together AI","Fireworks AI","Sierra","Glean","Harvey","Lindy","Manus","You.com","Udio","Cartesia"];
  var ORG_RANK = {}; PROMINENCE.forEach(function (o, i) { ORG_RANK[o] = i; });
  function rank(o) { return ORG_RANK.hasOwnProperty(o) ? ORG_RANK[o] : 999; }
  var SORT = {
    featured: function (a, b) { return rank(a.org) - rank(b.org) || a.name.localeCompare(b.name); },
    name: function (a, b) { return a.name.localeCompare(b.name); },
    status: function (a, b) { return srank(a.status) - srank(b.status) || rank(a.org) - rank(b.org) || a.name.localeCompare(b.name); },
    pricing: function (a, b) { return (PRICE_RANK[a.pricing] - PRICE_RANK[b.pricing]) || rank(a.org) - rank(b.org) || a.name.localeCompare(b.name); }
  };
  function sortProds(arr) { return arr.slice().sort(SORT[state.sort] || SORT.featured); }

  var state = { view: "map", category: null, company: null, region: "all", price: "all", q: "", sort: "featured" };

  function daysSince(iso) { var d = new Date(iso + "T00:00:00"); return isNaN(d) ? 0 : Math.floor((new Date() - d) / 86400000); }
  function isStale(p) { return daysSince(p.lastVerified) > 90; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function badge(s) { return s && s !== "ga" ? '<span class="badge">' + s + "</span>" : ""; }
  function matches(p) {
    if (state.region !== "all" && p.region !== state.region) return false;
    if (state.price !== "all" && p.pricing !== state.price) return false;
    if (state.q) { var h = (p.name + " " + p.org + " " + (p.version || "") + " " + (p.blurb || "") + " " + p.status + " " + p.pricing).toLowerCase(); if (h.indexOf(state.q) === -1) return false; }
    return true;
  }
  function monogram(n) { var w = n.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean); return ((w.length > 1 ? w[0][0] + w[1][0] : n.slice(0, 2)) || "?").toUpperCase(); }

  /* static text */
  var ORG_NAMES = []; (function () { var s = {}; data.forEach(function (p) { if (!s[p.org]) { s[p.org] = 1; ORG_NAMES.push(p.org); } }); })();
  var latest = data.reduce(function (a, p) { return p.lastVerified > a ? p.lastVerified : a; }, "0");
  document.getElementById("metaLine").innerHTML = data.length + ' products <span class="dot">·</span> ' + ORG_NAMES.length + ' companies <span class="dot">·</span> ' + CATEGORIES.length + ' categories <span class="dot">·</span> updated ' + esc(latest);
  document.getElementById("footMeta").textContent = data.length + " products · " + ORG_NAMES.length + " companies · last verified " + latest;
  document.getElementById("priceLegend").innerHTML = ["free", "freemium", "paid", "enterprise"].map(function (k) { return '<span class="lg" data-price="' + k + '"><span class="pdot"></span>' + PRICE_LABEL[k] + "</span>"; }).join("");

  /* theme */
  var themeToggle = document.getElementById("themeToggle");
  var TI = {
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
    themeToggle.innerHTML = TI[pref]; themeToggle.title = "Theme: " + pref;
    if (window.FrontierGraph && window.FrontierGraph.refreshTheme) window.FrontierGraph.refreshTheme();
  }
  themeToggle.addEventListener("click", function () { var o = ["system", "light", "dark"], i = o.indexOf(themePref()); applyTheme(o[(i + 1) % 3]); });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { if (themePref() === "system") applyTheme("system"); });
  applyTheme(themePref());

  /* controls */
  var viewSeg = document.getElementById("viewSegment");
  viewSeg.addEventListener("click", function (ev) { var b = ev.target.closest("button"); if (!b) return; state.view = b.getAttribute("data-view"); render(); });
  var regionSeg = document.getElementById("regionSegment");
  regionSeg.addEventListener("click", function (ev) { var b = ev.target.closest("button"); if (!b) return; state.region = b.getAttribute("data-region"); render(); });
  var priceSelect = document.getElementById("priceSelect");
  priceSelect.addEventListener("change", function () { state.price = priceSelect.value; render(); });
  var sortSelect = document.getElementById("sortSelect");
  sortSelect.addEventListener("change", function () { state.sort = sortSelect.value; render(); });
  var searchWrap = document.getElementById("searchWrap"), search = document.getElementById("search");
  search.addEventListener("input", function () { state.q = search.value.trim().toLowerCase(); searchWrap.classList.toggle("has-value", search.value.length > 0); render(); });
  document.getElementById("searchClear").addEventListener("click", function () { search.value = ""; state.q = ""; searchWrap.classList.remove("has-value"); search.focus(); render(); });
  var resetBtn = document.getElementById("reset");
  function resetAll() {
    state.region = "all"; state.price = "all"; state.q = ""; state.category = null; state.company = null;
    search.value = ""; searchWrap.classList.remove("has-value"); priceSelect.value = "all";
    Array.prototype.forEach.call(regionSeg.children, function (x) { x.setAttribute("aria-pressed", String(x.getAttribute("data-region") === "all")); });
    render();
  }
  resetBtn.addEventListener("click", resetAll);

  /* navigation */
  function openCategory(key) { state.view = "map"; state.category = key; state.company = null; window.scrollTo({ top: 0, behavior: "smooth" }); render(); }
  function openCompany(org) { state.view = "map"; state.company = org; state.category = null; window.scrollTo({ top: 0, behavior: "smooth" }); render(); }
  function goHome() { state.category = null; state.company = null; render(); }
  crumbs.addEventListener("click", function (ev) { if (ev.target.closest("[data-home]")) goHome(); });

  /* popover */
  var popover = document.getElementById("popover"); var popOpen = false, popEl = null;
  function closePopover() { if (!popOpen) return; popOpen = false; popEl = null; popover.hidden = true; }
  function openPopover(p, el) {
    var c = CAT_BY_KEY[p.category];
    popover.dataset.cat = p.category; popover.dataset.price = p.pricing;
    popover.innerHTML =
      '<button class="pv-close" id="pvClose" type="button" aria-label="Close">&#10005;</button>' +
      '<div class="pv-cat">' + esc(c.label) + badge(p.status) + "</div>" +
      '<div class="pv-name">' + esc(p.name) + "</div>" +
      '<div class="pv-org">' + esc(p.org) + (p.version ? ' <span class="v">' + esc(p.version) + "</span>" : "") + "</div>" +
      '<div class="pv-blurb">' + esc(p.blurb) + "</div>" +
      '<div class="pv-tags"><span class="pv-tag" data-price="' + p.pricing + '"><span class="pdot"></span>' + PRICE_LABEL[p.pricing] + "</span>" +
        '<span class="pv-tag">' + esc(p.access) + '</span><span class="pv-tag">' + (REGION[p.region] || p.region) + '</span><span class="pv-tag">' + esc(p.lastVerified) + "</span></div>" +
      '<div class="pv-actions"><a class="pv-visit" href="' + esc(p.url) + '" target="_blank" rel="noopener noreferrer">Visit site &#8599;</a>' +
        '<button type="button" class="pv-kin" id="pvKin">All from ' + esc(p.org) + "</button></div>";
    popover.hidden = false; popOpen = true; popEl = el;
    var r = el.getBoundingClientRect(), pw = popover.offsetWidth, ph = popover.offsetHeight, vw = document.documentElement.clientWidth;
    var left = Math.max(window.scrollX + 12, Math.min(r.left + window.scrollX, window.scrollX + vw - pw - 12));
    var top = (r.bottom + ph + 10 < window.innerHeight) ? (r.bottom + window.scrollY + 8) : Math.max(window.scrollY + 8, r.top + window.scrollY - ph - 8);
    popover.style.left = left + "px"; popover.style.top = top + "px";
    document.getElementById("pvClose").addEventListener("click", closePopover);
    document.getElementById("pvKin").addEventListener("click", function () { closePopover(); openCompany(p.org); });
  }
  document.addEventListener("click", function (ev) { if (popOpen && !popover.contains(ev.target) && !ev.target.closest(".model")) closePopover(); });
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && popOpen) closePopover(); });
  window.addEventListener("scroll", closePopover, true);

  /* expose for graph */
  window.Frontier = { data: data, categories: CATEGORIES, matches: matches, rank: rank, openCategory: openCategory, openCompany: openCompany, onFilter: null };

  /* cells / blocks */
  function modelCell(p) {
    return '<button type="button" class="model' + (isStale(p) ? " is-stale" : "") + '" data-cat="' + p.category + '" data-price="' + p.pricing + '" data-i="' + p._i + '"' + (p.status && p.status !== "ga" ? ' data-status="' + p.status + '"' : "") + ">" +
      '<span class="model-top"><span class="pdot" aria-hidden="true"></span><span class="model-name">' + esc(p.name) + "</span>" + badge(p.status) + "</span>" +
      (p.version ? '<span class="model-ver">' + esc(p.version) + "</span>" : "") + "</button>";
  }
  function companyBlock(org, models, metaRight) {
    return '<div class="company-block"><div class="company-head"><span class="company-mono" aria-hidden="true">' + esc(monogram(org)) + "</span>" +
      '<div><div class="company-name">' + esc(org) + '</div><div class="company-meta">' + metaRight + "</div></div></div>" +
      '<div class="company-models">' + models.map(modelCell).join("") + "</div></div>";
  }
  function catBlock(label, key, models) {
    return '<div class="company-block" data-cat="' + key + '"><div class="company-head"><span class="cat-icon" style="width:32px;height:32px" aria-hidden="true">' + iconFor(key) + "</span>" +
      '<div><div class="company-name">' + label + '</div><div class="company-meta">' + models.length + (models.length === 1 ? " product" : " products") + "</div></div></div>" +
      '<div class="company-models">' + models.map(modelCell).join("") + "</div></div>";
  }

  /* renders */
  function renderHome(animate) {
    var html = "";
    CATEGORIES.forEach(function (c) {
      var items = data.filter(function (p) { return p.category === c.key && matches(p); });
      if (!items.length) return;
      var orgs = {}; items.forEach(function (p) { orgs[p.org] = 1; });
      var orgList = Object.keys(orgs).sort(function (a, b) { return rank(a) - rank(b) || a.localeCompare(b); });
      var preview = orgList.slice(0, 7).join(", ");
      html += '<button type="button" class="cat-card" data-cat="' + c.key + '" data-key="' + c.key + '">' +
        '<span class="cat-card-head"><span class="cat-icon" aria-hidden="true">' + iconFor(c.key) + "</span>" +
        '<span class="cat-title"><span class="name">' + c.label + '</span><span class="sub">' + esc(c.sub) + "</span></span>" +
        '<span class="cat-count">' + items.length + "</span></span>" +
        '<span class="cat-stat">' + orgList.length + " companies &middot; " + items.length + " products</span>" +
        '<span class="cat-preview">' + esc(preview) + "</span><span class=\"go\" aria-hidden=\"true\">&#8594;</span></button>";
    });
    home.className = "home" + (animate ? " animate" : "");
    home.innerHTML = html || '<div class="empty"><h2>Nothing matches these filters</h2><p>Try a different region, pricing, or search.</p><button type="button" id="emptyReset">Reset</button></div>';
    var er = document.getElementById("emptyReset"); if (er) er.addEventListener("click", resetAll);
  }
  function renderCategory(key, animate) {
    var c = CAT_BY_KEY[key];
    var items = data.filter(function (p) { return p.category === key && matches(p); });
    var byOrg = {}; items.forEach(function (p) { (byOrg[p.org] = byOrg[p.org] || []).push(p); });
    var orgs = Object.keys(byOrg).sort(function (a, b) { return rank(a) - rank(b) || a.localeCompare(b); });
    catView.className = "cat-view" + (animate ? " animate" : "");
    catView.innerHTML = orgs.length ? orgs.map(function (o) {
      var ms = byOrg[o]; return companyBlock(o, sortProds(ms), (REGION[ms[0].region] || ms[0].region) + " &middot; " + ms.length + (ms.length === 1 ? " product" : " products"));
    }).join("") : '<div class="empty"><h2>Nothing here under these filters</h2><button type="button" id="emptyReset2">Reset</button></div>';
    var er = document.getElementById("emptyReset2"); if (er) er.addEventListener("click", resetAll);
  }
  function renderCompany(org, animate) {
    var items = data.filter(function (p) { return p.org === org && matches(p); });
    var byCat = {}; items.forEach(function (p) { (byCat[p.category] = byCat[p.category] || []).push(p); });
    catView.className = "cat-view" + (animate ? " animate" : "");
    catView.innerHTML = CATEGORIES.filter(function (c) { return byCat[c.key]; }).map(function (c) {
      return catBlock(c.label, c.key, sortProds(byCat[c.key]));
    }).join("") || '<div class="empty"><h2>Nothing here under these filters</h2></div>';
  }

  function showLevel(which) {
    home.style.display = which === "home" ? "grid" : "none";
    catView.style.display = (which === "category" || which === "company") ? "block" : "none";
    graphView.style.display = which === "graph" ? "block" : "none";
    crumbs.style.display = (which === "category" || which === "company") ? "flex" : "none";
  }
  function setCrumb(label) {
    crumbs.innerHTML = '<button type="button" data-home>&#8592; All categories</button><span class="sep">/</span><span class="cur">' + esc(label) + "</span>";
  }

  /* events on the two content areas */
  home.addEventListener("click", function (ev) { var t = ev.target.closest(".cat-card"); if (t) openCategory(t.getAttribute("data-key")); });
  catView.addEventListener("click", function (ev) { var m = ev.target.closest(".model"); if (m) { ev.stopPropagation(); openPopover(data[+m.getAttribute("data-i")], m); } });

  var first = true;
  function render() {
    closePopover();
    var total = data.filter(matches).length;
    document.getElementById("tallyN").textContent = total;
    document.getElementById("tallyOf").textContent = " / " + data.length;
    document.getElementById("showing").innerHTML = "showing <b>" + total + "</b> of " + data.length;
    resetBtn.disabled = state.region === "all" && state.price === "all" && state.q === "" && !state.category && !state.company;
    Array.prototype.forEach.call(viewSeg.children, function (x) { x.setAttribute("aria-pressed", String(x.getAttribute("data-view") === state.view)); });

    if (state.view === "graph") {
      showLevel("graph");
      if (window.FrontierGraph) window.FrontierGraph.setVisible(true);
      if (window.Frontier.onFilter) window.Frontier.onFilter();
      return;
    }
    if (window.FrontierGraph) window.FrontierGraph.setVisible(false);

    if (state.company) { showLevel("company"); setCrumb(state.company); renderCompany(state.company, first); }
    else if (state.category) { showLevel("category"); setCrumb(CAT_BY_KEY[state.category].label); renderCategory(state.category, first); }
    else { showLevel("home"); renderHome(first); }
    if (first) { first = false; setTimeout(function () { home.classList.remove("animate"); catView.classList.remove("animate"); }, 800); }
  }

  render();
})();
