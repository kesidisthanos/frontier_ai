/* ============================================================================
   frontier_ai (v3): the living landscape map.
   Renders nine category territories packed with product cells. Filters (region,
   pricing, search, category) reshape the map; sort orders cells; clicking a cell
   opens an inline popover; hovering shows a company's footprint; "Footprint"
   isolates a company across the whole map. Self-contained, no dependencies.
   ========================================================================== */
(function () {
  "use strict";

  var map = document.getElementById("map");
  var data = Array.isArray(window.ECOSYSTEM) ? window.ECOSYSTEM : null;
  if (!data || !data.length) {
    map.innerHTML = '<div class="empty"><h2>Couldn’t load the data</h2><p>data/ecosystem.js did not define a non-empty window.ECOSYSTEM array.</p></div>';
    return;
  }
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

  var state = { cats: new Set(), region: "all", price: "all", q: "", sort: "featured", company: null };

  function daysSince(iso) { var d = new Date(iso + "T00:00:00"); return isNaN(d) ? 0 : Math.floor((new Date() - d) / 86400000); }
  function isStale(p) { return daysSince(p.lastVerified) > 90; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function badge(status) { return status && status !== "ga" ? '<span class="badge">' + status + "</span>" : ""; }
  function matches(p) {
    if (state.region !== "all" && p.region !== state.region) return false;
    if (state.price !== "all" && p.pricing !== state.price) return false;
    if (state.q) {
      var hay = (p.name + " " + p.org + " " + (p.version || "") + " " + (p.blurb || "") + " " + p.status + " " + p.pricing).toLowerCase();
      if (hay.indexOf(state.q) === -1) return false;
    }
    return true;
  }
  function catSelected(k) { return state.cats.size === 0 || state.cats.has(k); }

  /* ---- static text ------------------------------------------------------ */
  var ORG_NAMES = []; (function () { var s = {}; data.forEach(function (p) { if (!s[p.org]) { s[p.org] = 1; ORG_NAMES.push(p.org); } }); })();
  var latest = data.reduce(function (a, p) { return p.lastVerified > a ? p.lastVerified : a; }, "0");
  document.getElementById("metaLine").innerHTML = data.length + ' products <span class="dot">·</span> ' + ORG_NAMES.length + ' companies <span class="dot">·</span> ' + CATEGORIES.length + ' categories <span class="dot">·</span> updated ' + esc(latest);
  document.getElementById("footMeta").textContent = data.length + " products · " + ORG_NAMES.length + " companies · last verified " + latest;
  document.getElementById("priceLegend").innerHTML = ["free", "freemium", "paid", "enterprise"].map(function (k) {
    return '<span class="lg" data-price="' + k + '"><span class="pdot"></span>' + PRICE_LABEL[k] + "</span>";
  }).join("");

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
  }
  themeToggle.addEventListener("click", function () { var o = ["system", "light", "dark"], i = o.indexOf(themePref()); applyTheme(o[(i + 1) % 3]); });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { if (themePref() === "system") applyTheme("system"); });
  applyTheme(themePref());

  /* ---- controls --------------------------------------------------------- */
  var catFilter = document.getElementById("catFilter");
  CATEGORIES.forEach(function (c) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "chip-cat"; b.setAttribute("data-cat", c.key); b.setAttribute("aria-pressed", "false");
    b.innerHTML = '<span class="swatch" aria-hidden="true"></span>' + c.label + ' <span class="k" data-k="' + c.key + '">0</span>';
    b.addEventListener("click", function () { if (state.cats.has(c.key)) state.cats.delete(c.key); else state.cats.add(c.key); render(); });
    catFilter.appendChild(b);
  });
  var regionSeg = document.getElementById("regionSegment");
  regionSeg.addEventListener("click", function (ev) {
    var b = ev.target.closest("button"); if (!b) return;
    state.region = b.getAttribute("data-region");
    Array.prototype.forEach.call(regionSeg.children, function (x) { x.setAttribute("aria-pressed", String(x === b)); });
    render();
  });
  var priceSelect = document.getElementById("priceSelect");
  priceSelect.addEventListener("change", function () { state.price = priceSelect.value; render(); });
  var sortSelect = document.getElementById("sortSelect");
  sortSelect.addEventListener("change", function () { state.sort = sortSelect.value; render(); });
  var searchWrap = document.getElementById("searchWrap");
  var search = document.getElementById("search");
  search.addEventListener("input", function () { state.q = search.value.trim().toLowerCase(); searchWrap.classList.toggle("has-value", search.value.length > 0); render(); });
  document.getElementById("searchClear").addEventListener("click", function () { search.value = ""; state.q = ""; searchWrap.classList.remove("has-value"); search.focus(); render(); });
  var isolateChip = document.getElementById("isolate");
  isolateChip.addEventListener("click", function () { state.company = null; render(); });
  var resetBtn = document.getElementById("reset");
  function resetAll() {
    state.cats.clear(); state.region = "all"; state.price = "all"; state.q = ""; state.company = null;
    search.value = ""; searchWrap.classList.remove("has-value"); priceSelect.value = "all";
    Array.prototype.forEach.call(regionSeg.children, function (x) { x.setAttribute("aria-pressed", String(x.getAttribute("data-region") === "all")); });
    render();
  }
  resetBtn.addEventListener("click", resetAll);

  /* ---- popover ---------------------------------------------------------- */
  var popover = document.getElementById("popover");
  var popOpen = false, popCell = null;
  function closePopover() { if (!popOpen) return; popOpen = false; popCell = null; popover.hidden = true; }
  function openPopover(p, cellEl) {
    var c = CAT_BY_KEY[p.category];
    popover.dataset.cat = p.category; popover.dataset.price = p.pricing;
    popover.innerHTML =
      '<button class="pv-close" id="pvClose" type="button" aria-label="Close">&#10005;</button>' +
      '<div class="pv-cat">' + esc(c.label) + badge(p.status) + "</div>" +
      '<div class="pv-name">' + esc(p.name) + "</div>" +
      '<div class="pv-org">' + esc(p.org) + (p.version ? ' <span class="v">' + esc(p.version) + "</span>" : "") + "</div>" +
      '<div class="pv-blurb">' + esc(p.blurb) + "</div>" +
      '<div class="pv-tags">' +
        '<span class="pv-tag" data-price="' + p.pricing + '"><span class="pdot"></span>' + PRICE_LABEL[p.pricing] + "</span>" +
        '<span class="pv-tag">' + esc(p.access) + "</span>" +
        '<span class="pv-tag">' + (REGION[p.region] || p.region) + "</span>" +
        '<span class="pv-tag">' + esc(p.lastVerified) + "</span>" +
      "</div>" +
      '<div class="pv-actions">' +
        '<a class="pv-visit" href="' + esc(p.url) + '" target="_blank" rel="noopener noreferrer">Visit site &#8599;</a>' +
        '<button type="button" class="pv-kin" id="pvKin">Footprint</button>' +
      "</div>";
    popover.hidden = false; popOpen = true; popCell = cellEl;
    position(cellEl);
    document.getElementById("pvClose").addEventListener("click", closePopover);
    document.getElementById("pvKin").addEventListener("click", function () { state.company = p.org; closePopover(); render(); });
  }
  function position(cellEl) {
    var r = cellEl.getBoundingClientRect();
    var pw = popover.offsetWidth, ph = popover.offsetHeight;
    var vw = document.documentElement.clientWidth;
    var left = Math.min(r.left + window.scrollX, window.scrollX + vw - pw - 12);
    left = Math.max(window.scrollX + 12, left);
    var top = (r.bottom + ph + 10 < window.innerHeight) ? (r.bottom + window.scrollY + 8) : (r.top + window.scrollY - ph - 8);
    if (top < window.scrollY + 8) top = window.scrollY + 8;
    popover.style.left = left + "px"; popover.style.top = top + "px";
  }
  document.addEventListener("click", function (ev) { if (popOpen && !popover.contains(ev.target) && !ev.target.closest(".cell")) closePopover(); });
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape") { if (popOpen) closePopover(); else if (state.company) { state.company = null; render(); } } });
  window.addEventListener("scroll", closePopover, true);
  window.addEventListener("resize", closePopover);

  /* ---- footprint hover -------------------------------------------------- */
  var hoverOrg = null;
  map.addEventListener("mouseover", function (ev) {
    var cell = ev.target.closest(".cell"); if (!cell) return;
    var org = cell.getAttribute("data-org"); if (org === hoverOrg || state.company) return;
    hoverOrg = org;
    map.querySelectorAll(".cell").forEach(function (x) { x.classList.toggle("hover-kin", x.getAttribute("data-org") === org); });
  });
  map.addEventListener("mouseout", function (ev) {
    if (!ev.target.closest(".cell")) return;
    hoverOrg = null;
    if (!state.company) map.querySelectorAll(".cell.hover-kin").forEach(function (x) { x.classList.remove("hover-kin"); });
  });
  map.addEventListener("click", function (ev) {
    var cell = ev.target.closest(".cell"); if (!cell) return;
    ev.stopPropagation();
    var p = data[+cell.getAttribute("data-i")];
    if (popOpen && popCell === cell) { closePopover(); return; }
    openPopover(p, cell);
  });

  /* ---- render ----------------------------------------------------------- */
  function cellHTML(p) {
    return '<button type="button" class="cell' + (isStale(p) ? " is-stale" : "") + '" data-cat="' + p.category + '" data-org="' + esc(p.org) + '" data-price="' + p.pricing + '" data-i="' + p._i + '"' + (p.status && p.status !== "ga" ? ' data-status="' + p.status + '"' : "") + ">" +
      '<span class="cell-top"><span class="pdot" aria-hidden="true"></span><span class="cell-name">' + esc(p.name) + "</span>" + badge(p.status) + "</span>" +
      '<span class="cell-org">' + esc(p.org) + "</span></button>";
  }
  var first = true;
  function render() {
    closePopover();
    var counts = {}; CATEGORIES.forEach(function (c) { counts[c.key] = 0; });
    data.forEach(function (p) { if (matches(p) && counts.hasOwnProperty(p.category)) counts[p.category]++; });
    CATEGORIES.forEach(function (c) {
      var k = catFilter.querySelector('[data-k="' + c.key + '"]'); if (k) k.textContent = counts[c.key];
      var chip = catFilter.querySelector('.chip-cat[data-cat="' + c.key + '"]'); if (chip) chip.setAttribute("aria-pressed", String(state.cats.has(c.key)));
    });

    var html = "", shown = 0, total = 0;
    CATEGORIES.forEach(function (c) {
      if (!catSelected(c.key)) return;
      var items = sortProds(data.filter(function (p) { return p.category === c.key && matches(p); }));
      if (!items.length) return;
      shown++; total += items.length;
      html += '<section class="territory" data-cat="' + c.key + '" style="--d:' + (shown * 35) + 'ms">' +
        '<div class="t-head"><span class="t-icon" aria-hidden="true">' + iconFor(c.key) + "</span>" +
        '<div class="t-title"><div class="t-name">' + c.label + '</div><div class="t-sub">' + esc(c.sub) + "</div></div>" +
        '<span class="t-count">' + items.length + "</span></div>" +
        '<div class="t-cells">' + items.map(cellHTML).join("") + "</div></section>";
    });
    map.className = "map" + (first ? " animate" : "") + (state.company ? " isolating" : "");
    map.innerHTML = html || '<div class="empty"><h2>Nothing matches these filters</h2><p>Try a different region, pricing, or search, or reset.</p><button type="button" id="emptyReset">Reset</button></div>';
    var er = document.getElementById("emptyReset"); if (er) er.addEventListener("click", resetAll);
    if (state.company) map.querySelectorAll(".cell").forEach(function (x) { x.classList.toggle("kin", x.getAttribute("data-org") === state.company); });
    if (first) { first = false; setTimeout(function () { map.classList.remove("animate"); }, 800); }

    document.getElementById("tallyN").textContent = total;
    document.getElementById("tallyOf").textContent = " / " + data.length;
    document.getElementById("showing").innerHTML = "showing <b>" + total + "</b> of " + data.length;
    isolateChip.hidden = !state.company; isolateChip.textContent = state.company || "";
    resetBtn.disabled = state.cats.size === 0 && state.region === "all" && state.price === "all" && state.q === "" && !state.company;
  }

  render();
})();
