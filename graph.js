/* ============================================================================
   frontier_ai (v4): graph mode. A legible network of the nine category hubs and
   the companies, each company linked to the categories it builds in. Click a
   category to drill into it; click a company to see all it makes. Filters dim
   non-matching nodes. Reads window.Frontier; themes from CSS variables.
   ========================================================================== */
(function () {
  "use strict";
  var F = window.Frontier;
  if (!F || !F.data) return;
  var data = F.data, CATS = F.categories;
  var canvas = document.getElementById("graphCanvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var view = document.getElementById("graphView");
  var TAU = Math.PI * 2, DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  var FONT = '"Space Grotesk", -apple-system, system-ui, sans-serif';

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function hexToRgb(h) { h = (h || "").replace("#", "").trim(); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function mix(rgb, t, a) { return rgb.map(function (c, i) { return Math.round(c + (t[i] - c) * a); }); }
  function rgba(rgb, a) { return "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + (a == null ? 1 : a) + ")"; }

  var RAW = {};
  (function () { var probe = document.createElement("div"); probe.style.display = "none"; document.body.appendChild(probe);
    CATS.forEach(function (c) { probe.setAttribute("data-cat", c.key); var cs = getComputedStyle(probe); RAW[c.key] = { fg: hexToRgb(cs.getPropertyValue("--c-fg")), bg: hexToRgb(cs.getPropertyValue("--c-bg")) }; });
    document.body.removeChild(probe);
  })();

  var theme = {}, COL = {};
  function readTheme() {
    var cs = getComputedStyle(document.documentElement); function v(k) { return cs.getPropertyValue(k).trim(); }
    var dark = document.documentElement.dataset.theme === "dark";
    theme = { dark: dark, text: v("--text"), muted: v("--text-muted"), faint: v("--text-faint"), surface: v("--surface"), bg: v("--bg"), accent: v("--accent"), thread: dark ? [150, 150, 170] : [90, 88, 110] };
    var white = [255, 255, 255];
    CATS.forEach(function (c) { var fg = RAW[c.key].fg, bg = RAW[c.key].bg;
      COL[c.key] = dark ? { node: rgba(mix(fg, white, 0.5)), fill: rgba(fg, 0.24), ring: rgba(mix(fg, white, 0.55)), label: rgba(mix(fg, white, 0.62)) }
                        : { node: rgba(fg), fill: rgba(bg), ring: rgba(fg), label: rgba(fg) };
    });
  }

  /* model: category hubs + company nodes */
  var hubs = [], companies = [], nodes = [], edges = [], byCat = {}, byOrg = {};
  CATS.forEach(function (c) { var n = { id: "c:" + c.key, type: "cat", key: c.key, label: c.label, r: 16, mass: 9 }; hubs.push(n); nodes.push(n); byCat[c.key] = n; });
  data.forEach(function (p) {
    var o = byOrg[p.org]; if (!o) { o = byOrg[p.org] = { id: "o:" + p.org, type: "company", org: p.org, label: p.org, cats: {}, r: 6, mass: 1 }; companies.push(o); nodes.push(o); }
    o.cats[p.category] = true;
  });
  companies.forEach(function (o) { o.r = 5 + Math.min(5, Object.keys(o.cats).length); Object.keys(o.cats).forEach(function (k) { if (byCat[k]) edges.push({ a: o, b: byCat[k], cat: k }); }); });

  var W = 0, H = 0, alpha = 1, inited = false, visible = false, running = false, draw_ = true;
  var cam = { x: 0, y: 0, k: 1 }, drag = null, panning = false, hover = null, userMoved = false, dx0 = 0, dy0 = 0, moved = false;

  function resize() { var r = canvas.getBoundingClientRect(); W = r.width; H = r.height; canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR); draw_ = true; }
  function initPos() {
    var cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.32;
    hubs.forEach(function (n, i) { var a = (i / hubs.length) * TAU - Math.PI / 2; n.x = cx + Math.cos(a) * R; n.y = cy + Math.sin(a) * R; n.vx = 0; n.vy = 0; });
    companies.forEach(function (o) { var h = byCat[Object.keys(o.cats)[0]]; o.x = (h ? h.x : cx) + (Math.random() * 2 - 1) * 60; o.y = (h ? h.y : cy) + (Math.random() * 2 - 1) * 60; o.vx = 0; o.vy = 0; });
    inited = true;
  }
  function step() {
    var i, j, a, b, cx = W / 2, cy = H / 2;
    for (i = 0; i < nodes.length; i++) { nodes[i].fx = 0; nodes[i].fy = 0; }
    for (i = 0; i < nodes.length; i++) { a = nodes[i]; for (j = i + 1; j < nodes.length; j++) { b = nodes[j];
      var ddx = a.x - b.x, ddy = a.y - b.y, d2 = ddx * ddx + ddy * ddy; if (d2 < 0.01) { ddx = Math.random() * .2 - .1; ddy = Math.random() * .2 - .1; d2 = ddx * ddx + ddy * ddy + .01; }
      var dist = Math.sqrt(d2), rep = 8500 * a.mass * b.mass / d2, fx = ddx / dist * rep, fy = ddy / dist * rep; a.fx += fx; a.fy += fy; b.fx -= fx; b.fy -= fy; } }
    edges.forEach(function (e) { a = e.a; b = e.b; var ddx = b.x - a.x, ddy = b.y - a.y, dist = Math.sqrt(ddx * ddx + ddy * ddy) || .01; var f = 0.045 * (dist - 115), fx = ddx / dist * f, fy = ddy / dist * f; a.fx += fx; a.fy += fy; b.fx -= fx; b.fy -= fy; });
    nodes.forEach(function (n) { n.fx += (cx - n.x) * 0.02; n.fy += (cy - n.y) * 0.02; if (n === drag) { n.x = n.px; n.y = n.py; n.vx = 0; n.vy = 0; return; } n.vx = (n.vx + n.fx) * 0.85; n.vy = (n.vy + n.fy) * 0.85; n.x += n.vx * alpha; n.y += n.vy * alpha; });
    alpha = Math.max(alpha * 0.99, 0.02);
  }
  function applyFilter() {
    hubs.forEach(function (h) { h.act = data.some(function (p) { return p.category === h.key && F.matches(p); }); });
    companies.forEach(function (o) { o.act = data.some(function (p) { return p.org === o.org && F.matches(p); }); });
    edges.forEach(function (e) { e.act = data.some(function (p) { return p.org === e.a.org && p.category === e.cat && F.matches(p); }); });
    draw_ = true;
  }
  F.onFilter = applyFilter;

  var neigh = new Set();
  function lit(n) { if (hover) return n === hover || neigh.has(n.id); return n.act; }

  function draw() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H); ctx.translate(cam.x, cam.y); ctx.scale(cam.k, cam.k); ctx.lineJoin = "round";
    ctx.lineWidth = 1 / cam.k;
    edges.forEach(function (e) { var on = lit(e.a) && lit(e.b) && e.act; ctx.globalAlpha = on ? 0.5 : 0.07; ctx.strokeStyle = on ? COL[e.cat].label : rgba(theme.thread); ctx.beginPath(); ctx.moveTo(e.a.x, e.a.y); ctx.lineTo(e.b.x, e.b.y); ctx.stroke(); });
    ctx.globalAlpha = 1;
    companies.forEach(drawCompany);
    hubs.forEach(drawHub);
  }
  function label(text, x, y, px, weight, color, on) {
    var s = px / cam.k; ctx.font = weight + " " + s + "px " + FONT; ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.lineWidth = 3 / cam.k; ctx.strokeStyle = theme.bg; ctx.globalAlpha = on ? 0.92 : 0.12; ctx.strokeText(text, x, y);
    ctx.fillStyle = color; ctx.globalAlpha = on ? 1 : 0.3; ctx.fillText(text, x, y); ctx.globalAlpha = 1;
  }
  function drawHub(h) { var on = lit(h), st = COL[h.key], hot = h === hover; ctx.globalAlpha = on ? 1 : 0.16;
    if (on) { ctx.shadowColor = st.ring; ctx.shadowBlur = 14; } ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, TAU); ctx.fillStyle = st.fill; ctx.fill(); ctx.shadowBlur = 0;
    ctx.lineWidth = (hot ? 2.5 : 2) / cam.k; ctx.strokeStyle = st.ring; ctx.stroke();
    label(h.label, h.x, h.y + h.r + 4 / cam.k, 13, "600", on ? st.label : theme.faint, on); ctx.globalAlpha = 1;
  }
  function drawCompany(o) { var on = lit(o), hot = o === hover; ctx.globalAlpha = on ? 1 : 0.13;
    if (on && hot) { ctx.shadowColor = theme.accent; ctx.shadowBlur = 12; }
    ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, TAU); ctx.fillStyle = theme.surface; ctx.fill(); ctx.shadowBlur = 0;
    ctx.lineWidth = (hot ? 2 : 1.4) / cam.k; ctx.strokeStyle = hot ? theme.text : theme.muted; ctx.stroke();
    if (on && (hot || neigh.has(o.id) || cam.k > 0.95)) label(o.label, o.x, o.y + o.r + 3 / cam.k, 9.5, "500", theme.text, on); ctx.globalAlpha = 1;
  }

  function loop() { if (!visible) { running = false; return; } if (alpha > 0.023 || drag || panning) { step(); draw_ = true; } if (draw_) { draw(); draw_ = false; } requestAnimationFrame(loop); }
  function toWorld(ev) { var r = canvas.getBoundingClientRect(); return { x: (ev.clientX - r.left - cam.x) / cam.k, y: (ev.clientY - r.top - cam.y) / cam.k }; }
  function pick(x, y) { var best = null, bd = Infinity; for (var i = nodes.length - 1; i >= 0; i--) { var n = nodes[i], dx = n.x - x, dy = n.y - y, d = dx * dx + dy * dy, rr = n.r + 7 / cam.k; if (d < rr * rr && d < bd) { bd = d; best = n; } } return best; }
  function setNeigh(n) { neigh = new Set(); if (!n) return; edges.forEach(function (e) { if (e.a === n) neigh.add(e.b.id); if (e.b === n) neigh.add(e.a.id); }); }

  canvas.addEventListener("mousedown", function (ev) { var p = toWorld(ev), n = pick(p.x, p.y); dx0 = ev.clientX; dy0 = ev.clientY; moved = false; if (n) { drag = n; n.px = p.x; n.py = p.y; alpha = Math.max(alpha, .5); } else panning = true; canvas.classList.add("grabbing"); });
  window.addEventListener("mousemove", function (ev) {
    if (drag) { var p = toWorld(ev); drag.px = p.x; drag.py = p.y; alpha = Math.max(alpha, .5); moved = moved || Math.abs(ev.clientX - dx0) + Math.abs(ev.clientY - dy0) > 4; return; }
    if (panning) { cam.x += ev.movementX; cam.y += ev.movementY; userMoved = true; draw_ = true; moved = moved || Math.abs(ev.clientX - dx0) + Math.abs(ev.clientY - dy0) > 4; return; }
    if (!visible) return; var w = toWorld(ev), n = pick(w.x, w.y); if (n !== hover) { hover = n; setNeigh(n); canvas.style.cursor = n ? "pointer" : "grab"; draw_ = true; }
  });
  window.addEventListener("mouseup", function (ev) { var wasDrag = drag, wasPan = panning; drag = null; panning = false; canvas.classList.remove("grabbing");
    if (!moved && (wasDrag || wasPan)) { var p = toWorld(ev), n = pick(p.x, p.y); if (n && n.type === "cat") F.openCategory(n.key); else if (n && n.type === "company" && F.openCompany) F.openCompany(n.org); } });
  canvas.addEventListener("wheel", function (ev) { ev.preventDefault(); var r = canvas.getBoundingClientRect(), mx = ev.clientX - r.left, my = ev.clientY - r.top, wx = (mx - cam.x) / cam.k, wy = (my - cam.y) / cam.k, k2 = clamp(cam.k * Math.exp(-ev.deltaY * .0016), .4, 4); cam.k = k2; cam.x = mx - wx * k2; cam.y = my - wy * k2; userMoved = true; draw_ = true; }, { passive: false });
  canvas.addEventListener("mouseleave", function () { if (!drag && !panning) { hover = null; setNeigh(null); draw_ = true; } });

  function zoomBy(f) { var cx = W / 2, cy = H / 2, wx = (cx - cam.x) / cam.k, wy = (cy - cam.y) / cam.k; cam.k = clamp(cam.k * f, .4, 4); cam.x = cx - wx * cam.k; cam.y = cy - wy * cam.k; draw_ = true; }
  function fit() { var a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; nodes.forEach(function (n) { a = Math.min(a, n.x - n.r); b = Math.min(b, n.y - n.r); c = Math.max(c, n.x + n.r); d = Math.max(d, n.y + n.r); }); var pad = 70, bw = Math.max(1, c - a), bh = Math.max(1, d - b); cam.k = clamp(Math.min((W - pad * 2) / bw, (H - pad * 2) / bh) * 0.92, .4, 1.6); cam.x = (W - (a + c) * cam.k) / 2; cam.y = (H - (b + d) * cam.k) / 2; userMoved = false; draw_ = true; }
  view.querySelector(".graph-toolbar").addEventListener("click", function (ev) { var b = ev.target.closest("button"); if (!b) return; var g = b.getAttribute("data-g"); if (g === "zoomin") zoomBy(1.25); else if (g === "zoomout") zoomBy(.8); else fit(); });
  window.addEventListener("resize", function () { if (visible) { resize(); if (userMoved) draw_ = true; else fit(); } });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { draw_ = true; });

  window.FrontierGraph = {
    setVisible: function (v) { visible = v; if (!v) return; readTheme(); resize();
      if (!inited) { initPos(); applyFilter(); for (var w = 0; w < 320; w++) step(); alpha = 0.02; fit(); } else applyFilter();
      if (!running) { running = true; requestAnimationFrame(loop); } },
    refreshTheme: function () { readTheme(); draw_ = true; }
  };
  applyFilter();
})();
