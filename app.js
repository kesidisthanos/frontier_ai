/* ============================================================================
   frontier_ai: renders the dashboard from window.ECOSYSTEM and runs the
   category / region / search filters. No dependencies, no build step.
   ========================================================================== */
(function () {
  "use strict";

  var grid = document.getElementById("grid");
  var data = Array.isArray(window.ECOSYSTEM) ? window.ECOSYSTEM : null;

  if (!data || !data.length) {
    grid.innerHTML =
      '<div class="empty"><h2>Couldn’t load the data</h2>' +
      "<p>data/ecosystem.js did not define a non-empty window.ECOSYSTEM array.</p></div>";
    return;
  }

  /* The nine branches: order, labels, and inline icons (currentColor strokes). */
  var CATEGORIES = [
    { key: "frontier", label: "Frontier", sub: "labs" },
    { key: "search",   label: "Search",   sub: "answer engines" },
    { key: "coding",   label: "Coding",   sub: "dev agents" },
    { key: "image",    label: "Image",    sub: "generation" },
    { key: "video",    label: "Video",    sub: "generation" },
    { key: "audio",    label: "Audio",    sub: "voice & music" },
    { key: "agents",   label: "Agents",   sub: "autonomous" },
    { key: "infra",    label: "Infra",    sub: "chips & clouds" },
    { key: "open",     label: "Open",     sub: "open weights" }
  ];

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

  function iconFor(key) {
    return (
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" ' +
      'stroke-linejoin="round">' + (ICONS[key] || "") + "</svg>"
    );
  }

  var REGION_LABEL = { us: "US", china: "CN", europe: "EU" };
  var STALE_DAYS = 90;
  var TODAY = new Date();

  var state = { cats: new Set(), region: "all", q: "" };

  /* ---- helpers ---------------------------------------------------------- */
  function daysSince(iso) {
    var d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return 0;
    return Math.floor((TODAY - d) / 86400000);
  }
  function isStale(e) { return daysSince(e.lastVerified) > STALE_DAYS; }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function matchesRegionSearch(e) {
    if (state.region !== "all" && e.region !== state.region) return false;
    if (state.q) {
      var hay = (e.name + " " + (e.flagship || "") + " " + (e.blurb || "") + " " + e.category).toLowerCase();
      if (hay.indexOf(state.q) === -1) return false;
    }
    return true;
  }

  function countsByCat() {
    var m = {};
    CATEGORIES.forEach(function (c) { m[c.key] = 0; });
    data.forEach(function (e) {
      if (matchesRegionSearch(e) && m.hasOwnProperty(e.category)) m[e.category]++;
    });
    return m;
  }

  function catSelected(key) { return state.cats.size === 0 || state.cats.has(key); }

  /* ---- static header / footer text (filter-independent) ----------------- */
  var latestVerified = data.reduce(function (a, e) {
    return e.lastVerified > a ? e.lastVerified : a;
  }, "0000-00-00");

  document.getElementById("metaLine").innerHTML =
    data.length + ' players <span class="dot">·</span> ' +
    CATEGORIES.length + ' categories <span class="dot">·</span> updated ' + esc(latestVerified);

  document.getElementById("footMeta").textContent =
    data.length + " entries · last verified " + latestVerified;

  /* ---- category filter chips (built once) ------------------------------- */
  var catFilter = document.getElementById("catFilter");
  CATEGORIES.forEach(function (c) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "chip-cat";
    b.setAttribute("data-cat", c.key);
    b.setAttribute("aria-pressed", "false");
    b.innerHTML =
      '<span class="swatch" aria-hidden="true"></span>' + c.label +
      ' <span class="k" data-k="' + c.key + '">0</span>';
    b.addEventListener("click", function () {
      if (state.cats.has(c.key)) state.cats.delete(c.key);
      else state.cats.add(c.key);
      render();
    });
    catFilter.appendChild(b);
  });

  /* ---- region segmented control ----------------------------------------- */
  var regionSeg = document.getElementById("regionSegment");
  regionSeg.addEventListener("click", function (ev) {
    var btn = ev.target.closest("button");
    if (!btn) return;
    state.region = btn.getAttribute("data-region");
    Array.prototype.forEach.call(regionSeg.children, function (x) {
      x.setAttribute("aria-pressed", String(x === btn));
    });
    render();
  });

  /* ---- search ----------------------------------------------------------- */
  var searchWrap = document.getElementById("searchWrap");
  var search = document.getElementById("search");
  var searchClear = document.getElementById("searchClear");
  search.addEventListener("input", function () {
    state.q = search.value.trim().toLowerCase();
    searchWrap.classList.toggle("has-value", search.value.length > 0);
    render();
  });
  searchClear.addEventListener("click", function () {
    search.value = "";
    state.q = "";
    searchWrap.classList.remove("has-value");
    search.focus();
    render();
  });

  /* ---- reset ------------------------------------------------------------ */
  var resetBtn = document.getElementById("reset");
  function resetAll() {
    state.cats.clear();
    state.region = "all";
    state.q = "";
    search.value = "";
    searchWrap.classList.remove("has-value");
    Array.prototype.forEach.call(regionSeg.children, function (x) {
      x.setAttribute("aria-pressed", String(x.getAttribute("data-region") === "all"));
    });
    render();
  }
  resetBtn.addEventListener("click", resetAll);

  /* ---- entry chip ------------------------------------------------------- */
  function entryHTML(e) {
    var stale = isStale(e);
    var foot =
      '<span class="entry-region">' + esc(REGION_LABEL[e.region] || e.region) + "</span>" +
      '<span class="entry-access">' + esc(e.access) + "</span>";
    if (stale) {
      foot +=
        '<span class="stale-dot" title="Last verified ' + daysSince(e.lastVerified) +
        ' days ago, may be out of date">' + esc(e.lastVerified) + "</span>";
    } else {
      foot += '<span class="entry-date">' + esc(e.lastVerified) + "</span>";
    }
    return (
      '<a class="entry' + (stale ? " is-stale" : "") + '" href="' + esc(e.url) +
      '" target="_blank" rel="noopener noreferrer" title="' + esc(e.blurb) + '">' +
      '<span class="entry-top"><span class="entry-name">' + esc(e.name) +
      '</span><span class="entry-arrow" aria-hidden="true">↗</span></span>' +
      '<span class="entry-flagship">' + esc(e.flagship) + "</span>" +
      '<span class="entry-foot">' + foot + "</span>" +
      "</a>"
    );
  }

  /* ---- render ----------------------------------------------------------- */
  var first = true;

  function render() {
    var counts = countsByCat();
    CATEGORIES.forEach(function (c) {
      var k = catFilter.querySelector('[data-k="' + c.key + '"]');
      if (k) k.textContent = counts[c.key];
      var chip = catFilter.querySelector('.chip-cat[data-cat="' + c.key + '"]');
      if (chip) chip.setAttribute("aria-pressed", String(state.cats.has(c.key)));
    });

    var html = "";
    var total = 0;
    var shown = 0;

    CATEGORIES.forEach(function (c) {
      if (!catSelected(c.key)) return;
      var items = data.filter(function (e) {
        return e.category === c.key && matchesRegionSearch(e);
      });
      if (!items.length) return;
      total += items.length;
      shown++;
      html +=
        '<section class="cat-card" data-cat="' + c.key + '" style="--d:' + (shown * 45) + 'ms">' +
        '<div class="cat-head">' +
        '<span class="cat-icon" aria-hidden="true">' + iconFor(c.key) + "</span>" +
        '<div class="cat-title"><div class="name">' + c.label +
        '</div><div class="sub">' + esc(c.sub) + "</div></div>" +
        '<span class="cat-count">' + items.length + "</span>" +
        "</div>" +
        '<div class="entries">' + items.map(entryHTML).join("") + "</div>" +
        "</section>";
    });

    if (total === 0) {
      html =
        '<div class="empty"><h2>No players match these filters</h2>' +
        "<p>Try a different region, clear the search, or reset.</p>" +
        '<button type="button" id="emptyReset">Reset filters</button></div>';
    }

    grid.innerHTML = html;
    if (first) {
      grid.classList.add("animate");
      first = false;
      setTimeout(function () { grid.classList.remove("animate"); }, 800);
    }

    var er = document.getElementById("emptyReset");
    if (er) er.addEventListener("click", resetAll);

    document.getElementById("tallyN").textContent = total;
    document.getElementById("tallyOf").textContent = " / " + data.length;
    document.getElementById("showing").innerHTML =
      "showing <b>" + total + "</b> of " + data.length;

    resetBtn.disabled = state.cats.size === 0 && state.region === "all" && state.q === "";
  }

  render();
})();
