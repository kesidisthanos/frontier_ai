/* ============================================================================
   frontier_ai: graph view. A dependency-free force layout on canvas.

   Layout is driven only by the players and the nine category hubs, so the
   nine categories settle into clear islands. Company hubs are PASSIVE: each is
   drawn at the centroid of its products with faint curved threads, which
   brighten when you hover or focus a product or its company. That keeps the
   map readable instead of a hairball while still revealing who owns what.
   ========================================================================== */
(function () {
  "use strict";

  var F = window.Frontier;
  if (!F || !F.data || !F.categories) return;

  var data = F.data;
  var CATS = F.categories;

  var canvas = document.getElementById("graphCanvas");
  var ctx = canvas.getContext("2d");
  var tooltip = document.getElementById("graphTooltip");
  var panel = document.getElementById("graphPanel");
  var legend = document.getElementById("graphLegend");
  var view = document.getElementById("graphView");

  var TAU = Math.PI * 2;
  var DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  var REGION = { us: "US", china: "CN", europe: "EU" };
  var FONT = '"Space Grotesk", -apple-system, system-ui, sans-serif';

  /* ---- tunables --------------------------------------------------------- */
  var REP = 9000;       // repulsion (spread)
  var GRAV = 0.013;     // pull to center
  var DAMP = 0.85;
  var SPRING_LEN = 70, SPRING_K = 0.08;
  var ALPHA_MIN = 0.02;

  /* ---- helpers ---------------------------------------------------------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function badge(s) { return s && s !== "ga" ? '<span class="badge" data-status="' + s + '">' + s + "</span>" : ""; }
  function hexToRgb(h) {
    h = (h || "").replace("#", "").trim();
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function mix(rgb, t, amt) { return rgb.map(function (c, i) { return Math.round(c + (t[i] - c) * amt); }); }
  function rgba(rgb, a) { return "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + (a == null ? 1 : a) + ")"; }

  /* ---- category palette from CSS ---------------------------------------- */
  var RAW = {};
  (function () {
    var probe = document.createElement("div");
    probe.style.display = "none";
    document.body.appendChild(probe);
    CATS.forEach(function (c) {
      probe.setAttribute("data-cat", c.key);
      var cs = getComputedStyle(probe);
      RAW[c.key] = { fg: hexToRgb(cs.getPropertyValue("--c-fg")), bg: hexToRgb(cs.getPropertyValue("--c-bg")) };
    });
    document.body.removeChild(probe);
  })();

  /* ---- theme ------------------------------------------------------------ */
  var theme = {}, NODE = {};
  function readTheme() {
    var cs = getComputedStyle(document.documentElement);
    function v(k) { return cs.getPropertyValue(k).trim(); }
    var dark = document.documentElement.dataset.theme === "dark";
    var bgHex = (v("--bg").match(/#([0-9a-f]{3,6})/i) || ["#0b0b0f"])[0];
    theme = {
      dark: dark,
      text: v("--text"), muted: v("--text-muted"), faint: v("--text-faint"),
      surface: v("--surface"), bg: v("--bg"), bgRgb: hexToRgb(bgHex),
      thread: dark ? [150, 150, 170] : [90, 88, 110]
    };
    var white = [255, 255, 255];
    CATS.forEach(function (c) {
      var fg = RAW[c.key].fg, bg = RAW[c.key].bg;
      NODE[c.key] = dark
        ? { dot: mix(fg, white, 0.5), hubFill: rgba(fg, 0.24), hubRing: rgba(mix(fg, white, 0.55)), label: rgba(mix(fg, white, 0.6)) }
        : { dot: fg, hubFill: rgba(bg), hubRing: rgba(fg), label: rgba(fg) };
    });
  }

  /* ---- model ------------------------------------------------------------ */
  var hubs = [], players = [], orgs = [], force = [], all = [], byCat = {};

  CATS.forEach(function (c) {
    var n = { id: "cat:" + c.key, type: "cat", label: c.label, catKey: c.key, r: 15, mass: 9, members: [] };
    hubs.push(n); force.push(n); all.push(n); byCat[c.key] = n;
  });

  var orgMembers = {};
  data.forEach(function (e, i) {
    var p = { id: "p:" + i, type: "player", label: e.name, catKey: e.category, entry: e, r: 6, mass: 1 };
    players.push(p); force.push(p); all.push(p);
    byCat[e.category].members.push(p);
    p.hub = byCat[e.category];
    var o = e.org || e.name;
    (orgMembers[o] = orgMembers[o] || []).push(p);
  });

  Object.keys(orgMembers).forEach(function (o) {
    if (orgMembers[o].length >= 2) {
      var n = { id: "org:" + o, type: "org", label: o, r: 5, members: orgMembers[o], x: 0, y: 0 };
      orgs.push(n); all.push(n);
      n.members.forEach(function (p) { p.org = n; });
    }
  });

  /* ---- layout state ----------------------------------------------------- */
  var W = 0, H = 0, alpha = 1, inited = false, visible = false, running = false, needsDraw = true;
  var cam = { x: 0, y: 0, k: 1 };
  var dragNode = null, panning = false, hoverNode = null, focusNode = null;
  var userMoved = false;
  var neighbors = new Set(), activeOrg = null;
  var downX = 0, downY = 0, moved = false;

  function resize() {
    var r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    needsDraw = true;
  }

  function initPositions() {
    var cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.34;
    hubs.forEach(function (n, i) {
      var a = (i / hubs.length) * TAU - Math.PI / 2;
      n.x = cx + Math.cos(a) * R; n.y = cy + Math.sin(a) * R; n.vx = 0; n.vy = 0;
    });
    players.forEach(function (p) {
      p.x = p.hub.x + (Math.random() * 2 - 1) * 50;
      p.y = p.hub.y + (Math.random() * 2 - 1) * 50;
      p.vx = 0; p.vy = 0;
    });
    inited = true;
  }

  function step() {
    var i, j, a, b, cx = W / 2, cy = H / 2;
    for (i = 0; i < force.length; i++) { force[i].fx = 0; force[i].fy = 0; }
    for (i = 0; i < force.length; i++) {
      a = force[i];
      for (j = i + 1; j < force.length; j++) {
        b = force[j];
        var dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
        if (d2 < 0.01) { dx = Math.random() * 0.2 - 0.1; dy = Math.random() * 0.2 - 0.1; d2 = dx * dx + dy * dy + 0.01; }
        var dist = Math.sqrt(d2), rep = REP * a.mass * b.mass / d2;
        var fx = dx / dist * rep, fy = dy / dist * rep;
        a.fx += fx; a.fy += fy; b.fx -= fx; b.fy -= fy;
      }
    }
    players.forEach(function (p) {
      var h = p.hub, dx = h.x - p.x, dy = h.y - p.y, dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
      var f = SPRING_K * (dist - SPRING_LEN), fx = dx / dist * f, fy = dy / dist * f;
      p.fx += fx; p.fy += fy; h.fx -= fx; h.fy -= fy;
    });
    force.forEach(function (n) {
      n.fx += (cx - n.x) * GRAV; n.fy += (cy - n.y) * GRAV;
      if (n === dragNode) { n.x = n.px; n.y = n.py; n.vx = 0; n.vy = 0; return; }
      n.vx = (n.vx + n.fx) * DAMP; n.vy = (n.vy + n.fy) * DAMP;
      n.x += n.vx * alpha; n.y += n.vy * alpha;
    });
    alpha = Math.max(alpha * 0.99, ALPHA_MIN);
  }

  function updateOrgs() {
    orgs.forEach(function (o) {
      var sx = 0, sy = 0;
      o.members.forEach(function (p) { sx += p.x; sy += p.y; });
      o.x = sx / o.members.length; o.y = sy / o.members.length;
    });
  }

  /* ---- filter ----------------------------------------------------------- */
  function applyFilter() {
    hubs.forEach(function (h) { h._fa = false; });
    orgs.forEach(function (o) { o._fa = false; });
    players.forEach(function (p) {
      p._fa = F.isActive(p.entry);
      if (p._fa) { p.hub._fa = true; if (p.org) p.org._fa = true; }
    });
    needsDraw = true;
  }
  F.onFilter = applyFilter;

  function lit(n) {
    if (focusNode) return n === focusNode || neighbors.has(n.id);
    if (hoverNode) return n === hoverNode || neighbors.has(n.id);
    return n._fa;
  }

  /* ---- rendering -------------------------------------------------------- */
  function draw() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.translate(cam.x, cam.y);
    ctx.scale(cam.k, cam.k);
    ctx.lineJoin = "round";

    // company threads (centroid -> member), faint unless the company is active
    orgs.forEach(function (o) {
      var hot = activeOrg === o;
      o.members.forEach(function (p) {
        var base = hot ? 0.5 : 0.06;
        if (!hot && !(p._fa && o._fa)) base = 0.03;
        ctx.globalAlpha = base;
        ctx.strokeStyle = hot ? NODE[p.catKey].label : rgba(theme.thread);
        ctx.lineWidth = (hot ? 1.4 : 1) / cam.k;
        var mx = (o.x + p.x) / 2, my = (o.y + p.y) / 2, dx = p.x - o.x, dy = p.y - o.y;
        var nl = Math.sqrt(dx * dx + dy * dy) || 1, off = Math.min(38, nl * 0.14);
        ctx.beginPath();
        ctx.moveTo(o.x, o.y);
        ctx.quadraticCurveTo(mx + (-dy / nl) * off, my + (dx / nl) * off, p.x, p.y);
        ctx.stroke();
      });
    });

    // category edges (player -> hub)
    ctx.lineWidth = 1 / cam.k;
    players.forEach(function (p) {
      var on = lit(p) && lit(p.hub);
      ctx.globalAlpha = on ? 0.4 : 0.1;
      ctx.strokeStyle = on ? NODE[p.catKey].label : rgba(theme.thread, 0.8);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.hub.x, p.hub.y); ctx.stroke();
    });
    ctx.globalAlpha = 1;

    orgs.forEach(drawOrg);
    players.forEach(drawPlayer);
    hubs.forEach(drawHub);
  }

  function drawPlayer(p) {
    var on = lit(p), col = NODE[p.catKey].dot, hot = p === hoverNode || p === focusNode;
    ctx.globalAlpha = on ? 1 : 0.1;
    if (on) { ctx.shadowColor = rgba(p.catKey ? NODE[p.catKey].dot : [0, 0, 0], 0.9); ctx.shadowBlur = (hot ? 16 : 7) / 1; }
    ctx.beginPath(); ctx.arc(p.x, p.y, hot ? p.r + 1.5 : p.r, 0, TAU);
    ctx.fillStyle = rgba(col); ctx.fill();
    ctx.shadowBlur = 0;
    if (hot) { ctx.lineWidth = 2 / cam.k; ctx.strokeStyle = theme.text; ctx.stroke(); }
    if (on && (hot || neighbors.has(p.id) || cam.k > 1.25)) label(p.label, p.x, p.y + p.r + 3 / cam.k, 10, "500", theme.text);
    ctx.globalAlpha = 1;
  }

  function drawHub(h) {
    var on = lit(h), st = NODE[h.catKey];
    ctx.globalAlpha = on ? 1 : 0.14;
    if (on) { ctx.shadowColor = st.hubRing; ctx.shadowBlur = 14; }
    ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, TAU);
    ctx.fillStyle = st.hubFill; ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 2 / cam.k; ctx.strokeStyle = st.hubRing; ctx.stroke();
    label(h.label, h.x, h.y + h.r + 4 / cam.k, 12.5, "600", on ? st.label : theme.faint);
    ctx.globalAlpha = 1;
  }

  function drawOrg(o) {
    var on = lit(o), hot = o === hoverNode || o === focusNode || activeOrg === o;
    ctx.globalAlpha = on ? (hot ? 1 : 0.7) : 0.12;
    ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, TAU);
    ctx.fillStyle = theme.surface; ctx.fill();
    ctx.lineWidth = 1.5 / cam.k; ctx.strokeStyle = hot ? theme.text : theme.muted; ctx.stroke();
    if (hot || cam.k > 1.25) label(o.label, o.x, o.y + o.r + 3 / cam.k, 9.5, "600", theme.muted);
    ctx.globalAlpha = 1;
  }

  function label(text, x, y, px, weight, color) {
    var size = px / cam.k;
    ctx.font = weight + " " + size + 'px ' + FONT;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.lineWidth = 3 / cam.k; ctx.strokeStyle = theme.bg; ctx.lineJoin = "round";
    ctx.globalAlpha *= 0.9; ctx.strokeText(text, x, y);
    ctx.globalAlpha /= 0.9; ctx.fillStyle = color; ctx.fillText(text, x, y);
  }

  /* ---- loop ------------------------------------------------------------- */
  function loop() {
    if (!visible) { running = false; return; }
    if (alpha > ALPHA_MIN + 0.003 || dragNode || panning) { step(); needsDraw = true; }
    updateOrgs();
    if (needsDraw) { draw(); needsDraw = false; }
    requestAnimationFrame(loop);
  }
  function kick(a) { alpha = Math.max(alpha, a || 0.4); }

  /* ---- picking ---------------------------------------------------------- */
  function toWorld(ev) {
    var r = canvas.getBoundingClientRect();
    return { x: (ev.clientX - r.left - cam.x) / cam.k, y: (ev.clientY - r.top - cam.y) / cam.k };
  }
  function pick(wx, wy) {
    var best = null, bd = Infinity;
    for (var i = all.length - 1; i >= 0; i--) {
      var n = all[i], dx = n.x - wx, dy = n.y - wy, d = dx * dx + dy * dy, rr = n.r + 7 / cam.k;
      if (d < rr * rr && d < bd) { bd = d; best = n; }
    }
    return best;
  }

  /* ---- highlight bookkeeping -------------------------------------------- */
  function setNeighbors(n) {
    neighbors = new Set();
    activeOrg = null;
    if (!n) return;
    if (n.type === "player") {
      neighbors.add(n.hub.id);
      if (n.org) { activeOrg = n.org; neighbors.add(n.org.id); n.org.members.forEach(function (m) { neighbors.add(m.id); }); }
    } else if (n.type === "cat") {
      n.members.forEach(function (m) { neighbors.add(m.id); });
    } else if (n.type === "org") {
      activeOrg = n; n.members.forEach(function (m) { neighbors.add(m.id); });
    }
  }

  function showTooltip(n) {
    if (!n) { tooltip.hidden = true; return; }
    var sub = n.type === "player" ? esc(n.entry.version || n.entry.org)
      : n.type === "cat" ? (n.members.length + " products") : (n.members.length + " products");
    tooltip.innerHTML = "<span>" + esc(n.type === "player" ? n.entry.name : n.label) + "</span>" +
      '<span class="tt-flag">' + sub + "</span>";
    tooltip.hidden = false;
    tooltip.style.left = (n.x * cam.k + cam.x) + "px";
    tooltip.style.top = (n.y * cam.k + cam.y - n.r * cam.k) + "px";
  }

  function setFocus(n) {
    focusNode = n;
    setNeighbors(n);
    showPanel(n);
    needsDraw = true;
  }

  function showPanel(n) {
    if (!n) { panel.hidden = true; return; }
    if (n.type === "player") {
      var e = n.entry;
      panel.innerHTML =
        '<button class="gp-close" type="button" aria-label="Close">&#10005;</button>' +
        '<div class="gp-cat" style="color:' + NODE[e.category].label + '">' + esc(e.category) + badge(e.status) + "</div>" +
        '<div class="gp-name">' + esc(e.name) + "</div>" +
        '<div class="gp-flag">' + esc(e.org) + (e.version ? " · " + esc(e.version) : "") + "</div>" +
        '<div class="gp-blurb">' + esc(e.blurb) + "</div>" +
        '<div class="gp-meta"><span class="gp-tag">' + (REGION[e.region] || e.region) + "</span>" +
        "<span>" + esc(e.access) + "</span><span>" + esc(e.lastVerified) + "</span></div>" +
        '<a class="gp-visit" href="' + esc(e.url) + '" target="_blank" rel="noopener noreferrer">Visit site &#8599;</a>';
    } else {
      panel.innerHTML =
        '<button class="gp-close" type="button" aria-label="Close">&#10005;</button>' +
        '<div class="gp-cat">' + (n.type === "cat" ? "category" : "company") + "</div>" +
        '<div class="gp-name">' + esc(n.label) + "</div>" +
        '<div class="gp-flag">' + n.members.length + (n.type === "cat" ? " players" : " products") + "</div>" +
        '<div class="gp-blurb">' + esc(n.members.map(function (m) { return m.label; }).join(", ")) + "</div>";
    }
    panel.hidden = false;
    var c = panel.querySelector(".gp-close");
    if (c) c.addEventListener("click", function () { setFocus(null); });
  }

  /* ---- interaction ------------------------------------------------------ */
  canvas.addEventListener("mousedown", function (ev) {
    var p = toWorld(ev), n = pick(p.x, p.y);
    downX = ev.clientX; downY = ev.clientY; moved = false;
    if (n && n.type !== "org") { dragNode = n; n.px = p.x; n.py = p.y; kick(0.5); }
    else panning = true;
    canvas.classList.add("grabbing");
  });

  window.addEventListener("mousemove", function (ev) {
    if (dragNode) {
      var p = toWorld(ev); dragNode.px = p.x; dragNode.py = p.y; kick(0.5);
      moved = moved || Math.abs(ev.clientX - downX) + Math.abs(ev.clientY - downY) > 4;
      showTooltip(dragNode); return;
    }
    if (panning) {
      cam.x += ev.movementX; cam.y += ev.movementY; needsDraw = true; userMoved = true;
      moved = moved || Math.abs(ev.clientX - downX) + Math.abs(ev.clientY - downY) > 4; return;
    }
    if (!visible) return;
    var w = toWorld(ev), n = pick(w.x, w.y);
    if (n !== hoverNode) {
      hoverNode = n;
      if (!focusNode) setNeighbors(n);
      canvas.style.cursor = n ? "pointer" : "grab";
      showTooltip(n); needsDraw = true;
    } else if (n) showTooltip(n);
  });

  window.addEventListener("mouseup", function (ev) {
    var wasDrag = dragNode, wasPan = panning;
    dragNode = null; panning = false;
    canvas.classList.remove("grabbing");
    if (!moved && (wasDrag || wasPan)) {
      var p = toWorld(ev);
      setFocus(pick(p.x, p.y) || null);
    }
  });

  canvas.addEventListener("wheel", function (ev) {
    ev.preventDefault();
    var r = canvas.getBoundingClientRect(), mx = ev.clientX - r.left, my = ev.clientY - r.top;
    var wx = (mx - cam.x) / cam.k, wy = (my - cam.y) / cam.k;
    var k2 = clamp(cam.k * Math.exp(-ev.deltaY * 0.0016), 0.4, 4);
    cam.k = k2; cam.x = mx - wx * k2; cam.y = my - wy * k2; needsDraw = true; userMoved = true;
  }, { passive: false });

  canvas.addEventListener("mouseleave", function () {
    if (!dragNode && !panning) { hoverNode = null; if (!focusNode) setNeighbors(null); tooltip.hidden = true; needsDraw = true; }
  });

  function zoomBy(f) {
    var cx = W / 2, cy = H / 2, wx = (cx - cam.x) / cam.k, wy = (cy - cam.y) / cam.k;
    cam.k = clamp(cam.k * f, 0.4, 4); cam.x = cx - wx * cam.k; cam.y = cy - wy * cam.k; needsDraw = true;
  }
  function fit() {
    var a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
    force.forEach(function (n) { a = Math.min(a, n.x - n.r); b = Math.min(b, n.y - n.r); c = Math.max(c, n.x + n.r); d = Math.max(d, n.y + n.r); });
    var pad = 56, bw = Math.max(1, c - a), bh = Math.max(1, d - b);
    cam.k = clamp(Math.min((W - pad * 2) / bw, (H - pad * 2) / bh) * 0.9, 0.4, 1.9);
    cam.x = (W - (a + c) * cam.k) / 2; cam.y = (H - (b + d) * cam.k) / 2; needsDraw = true; userMoved = false;
  }
  view.querySelector(".graph-toolbar").addEventListener("click", function (ev) {
    var b = ev.target.closest("button"); if (!b) return;
    var g = b.getAttribute("data-g");
    if (g === "zoomin") zoomBy(1.25); else if (g === "zoomout") zoomBy(0.8); else if (g === "fit") fit();
  });

  legend.innerHTML =
    '<span class="lg"><span class="gly"></span>player</span>' +
    '<span class="lg"><span class="gly cat"></span>category</span>' +
    '<span class="lg"><span class="gly org"></span>company</span>';

  // theme is driven by app.js, which calls FrontierGraph.refreshTheme() on change
  window.addEventListener("resize", function () { if (visible) { resize(); if (userMoved) needsDraw = true; else fit(); } });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { needsDraw = true; });

  window.FrontierGraph = {
    setVisible: function (v) {
      visible = v;
      if (!v) { tooltip.hidden = true; return; }
      readTheme(); resize();
      if (!inited) {
        initPositions(); applyFilter();
        for (var w = 0; w < 320; w++) step();
        alpha = ALPHA_MIN; updateOrgs(); fit();
      } else applyFilter();
      if (!running) { running = true; requestAnimationFrame(loop); }
    },
    refreshTheme: function () { readTheme(); needsDraw = true; }
  };

  applyFilter();
})();
