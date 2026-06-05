/* ============================================================================
   frontier_ai: graph view. A small force-directed layout drawn on canvas,
   no dependencies. Nodes are the players plus category and company hubs;
   edges link each player to its category and (when 2+ share one) its company.
   Reads live filter state from window.Frontier and themes from CSS variables.
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

  /* ---- tunables --------------------------------------------------------- */
  var REP = 6800;     // repulsion strength
  var GRAV = 0.022;   // pull toward center
  var DAMP = 0.82;    // velocity damping
  var ALPHA_MIN = 0.02;

  /* ---- helpers ---------------------------------------------------------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function hexToRgb(h) {
    h = (h || "").replace("#", "").trim();
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function mix(rgb, t, amt) { return rgb.map(function (c, i) { return Math.round(c + (t[i] - c) * amt); }); }
  function rgba(rgb, a) { return "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + (a == null ? 1 : a) + ")"; }

  /* ---- read the category palette straight from CSS (single source) ------ */
  var RAW = {};
  (function readPalette() {
    var probe = document.createElement("div");
    probe.style.display = "none";
    document.body.appendChild(probe);
    CATS.forEach(function (c) {
      probe.setAttribute("data-cat", c.key);
      var cs = getComputedStyle(probe);
      RAW[c.key] = {
        fg: hexToRgb(cs.getPropertyValue("--c-fg")),
        bg: hexToRgb(cs.getPropertyValue("--c-bg"))
      };
    });
    document.body.removeChild(probe);
  })();

  /* ---- theme (recomputed on light/dark change) -------------------------- */
  var theme = {}, STYLE = {};
  function readTheme() {
    var cs = getComputedStyle(document.documentElement);
    function v(k) { return cs.getPropertyValue(k).trim(); }
    var dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    theme = {
      dark: dark,
      text: v("--text"), muted: v("--text-muted"), faint: v("--text-faint"),
      surface: v("--surface"), bg: v("--bg"),
      bgRgb: hexToRgb((v("--bg").match(/#([0-9a-f]{3,6})/i) || ["", "100f0e"])[0] || "#100f0e"),
      edge: v("--border-strong"), edgeFaint: v("--border")
    };
    var white = [255, 255, 255];
    CATS.forEach(function (c) {
      var fg = RAW[c.key].fg, bg = RAW[c.key].bg;
      STYLE[c.key] = dark
        ? { node: rgba(mix(fg, white, 0.46)), hubFill: rgba(fg, 0.22), hubRing: rgba(mix(fg, white, 0.5)), label: rgba(mix(fg, white, 0.55)) }
        : { node: rgba(fg), hubFill: rgba(bg), hubRing: rgba(fg), label: rgba(fg) };
    });
  }

  /* ---- build the node / edge model -------------------------------------- */
  var nodes = [], edges = [], byId = {};
  function add(n) { byId[n.id] = n; nodes.push(n); return n; }

  CATS.forEach(function (c) {
    add({ id: "cat:" + c.key, type: "cat", label: c.label, catKey: c.key, r: 13, mass: 6 });
  });

  var orgCount = {};
  data.forEach(function (e) { var o = e.org || e.name; orgCount[o] = (orgCount[o] || 0) + 1; });
  Object.keys(orgCount).forEach(function (o) {
    if (orgCount[o] >= 2) add({ id: "org:" + o, type: "org", label: o, r: 8.5, mass: 3 });
  });

  data.forEach(function (e, i) {
    var n = add({ id: "p:" + i, type: "player", label: e.name, catKey: e.category, entry: e, r: 5.5, mass: 1 });
    edges.push({ a: n, b: byId["cat:" + e.category], len: 78, k: 0.04 });
    var o = e.org || e.name;
    if (orgCount[o] >= 2) edges.push({ a: n, b: byId["org:" + o], len: 50, k: 0.07 });
  });

  /* ---- layout state ----------------------------------------------------- */
  var W = 0, H = 0, alpha = 1, inited = false, visible = false, running = false, needsDraw = true;
  var cam = { x: 0, y: 0, k: 1 };
  var dragNode = null, panning = false, hoverNode = null, focusNode = null;
  var neighbors = new Set(), hoverNeighbors = new Set();
  var downX = 0, downY = 0, moved = false;

  function resize() {
    var r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    needsDraw = true;
  }

  function initPositions() {
    var cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.30;
    CATS.forEach(function (c, i) {
      var a = (i / CATS.length) * TAU - Math.PI / 2;
      var n = byId["cat:" + c.key];
      n.x = cx + Math.cos(a) * R; n.y = cy + Math.sin(a) * R; n.vx = 0; n.vy = 0;
    });
    nodes.forEach(function (n) {
      if (n.type === "player") {
        var h = byId["cat:" + n.catKey];
        n.x = h.x + (Math.random() * 2 - 1) * 55;
        n.y = h.y + (Math.random() * 2 - 1) * 55;
      } else if (n.type === "org") {
        n.x = cx + (Math.random() * 2 - 1) * R * 0.6;
        n.y = cy + (Math.random() * 2 - 1) * R * 0.6;
      }
      n.vx = 0; n.vy = 0;
    });
    inited = true;
  }

  /* ---- physics ---------------------------------------------------------- */
  function step() {
    var i, j, a, b, cx = W / 2, cy = H / 2;
    for (i = 0; i < nodes.length; i++) { nodes[i].fx = 0; nodes[i].fy = 0; }
    for (i = 0; i < nodes.length; i++) {
      a = nodes[i];
      for (j = i + 1; j < nodes.length; j++) {
        b = nodes[j];
        var dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
        if (d2 < 0.01) { dx = Math.random() * 0.2 - 0.1; dy = Math.random() * 0.2 - 0.1; d2 = dx * dx + dy * dy + 0.01; }
        var dist = Math.sqrt(d2);
        var rep = REP * a.mass * b.mass / d2;
        var fx = dx / dist * rep, fy = dy / dist * rep;
        a.fx += fx; a.fy += fy; b.fx -= fx; b.fy -= fy;
      }
    }
    edges.forEach(function (ed) {
      a = ed.a; b = ed.b;
      var dx = b.x - a.x, dy = b.y - a.y, dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
      var f = ed.k * (dist - ed.len), fx = dx / dist * f, fy = dy / dist * f;
      a.fx += fx; a.fy += fy; b.fx -= fx; b.fy -= fy;
    });
    nodes.forEach(function (n) {
      n.fx += (cx - n.x) * GRAV; n.fy += (cy - n.y) * GRAV;
      if (n === dragNode) { n.x = n.px; n.y = n.py; n.vx = 0; n.vy = 0; return; }
      n.vx = (n.vx + n.fx) * DAMP; n.vy = (n.vy + n.fy) * DAMP;
      n.x += n.vx * alpha; n.y += n.vy * alpha;
    });
    alpha = Math.max(alpha * 0.99, ALPHA_MIN);
  }

  /* ---- filtering (active set from window.Frontier) ---------------------- */
  function applyFilter() {
    nodes.forEach(function (n) { if (n.type !== "player") n._fa = false; });
    nodes.forEach(function (n) {
      if (n.type !== "player") return;
      n._fa = F.isActive(n.entry);
      if (n._fa) {
        var ch = byId["cat:" + n.catKey]; if (ch) ch._fa = true;
        var oh = byId["org:" + (n.entry.org || n.entry.name)]; if (oh) oh._fa = true;
      }
    });
    needsDraw = true;
  }
  F.onFilter = applyFilter;

  /* ---- what is highlighted ---------------------------------------------- */
  function lit(n) {
    if (focusNode) return n === focusNode || neighbors.has(n.id);
    if (hoverNode) return n === hoverNode || hoverNeighbors.has(n.id);
    return n._fa;
  }

  /* ---- rendering -------------------------------------------------------- */
  var SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

  function draw() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.translate(cam.x, cam.y);
    ctx.scale(cam.k, cam.k);

    // edges
    ctx.lineWidth = 1 / cam.k;
    edges.forEach(function (ed) {
      var on = lit(ed.a) && lit(ed.b);
      ctx.globalAlpha = on ? 0.6 : 0.12;
      ctx.strokeStyle = on ? theme.muted : theme.faint;
      ctx.beginPath(); ctx.moveTo(ed.a.x, ed.a.y); ctx.lineTo(ed.b.x, ed.b.y); ctx.stroke();
    });
    ctx.globalAlpha = 1;

    // nodes (hubs last so labels sit on top)
    nodes.forEach(function (n) { if (n.type === "player") drawNode(n); });
    nodes.forEach(function (n) { if (n.type !== "player") drawNode(n); });
  }

  function drawNode(n) {
    var on = lit(n), st = n.catKey ? STYLE[n.catKey] : null;
    ctx.globalAlpha = on ? 1 : 0.12;
    ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, TAU);

    if (n.type === "cat") {
      ctx.fillStyle = st.hubFill; ctx.fill();
      ctx.lineWidth = 1.6 / cam.k; ctx.strokeStyle = st.hubRing; ctx.stroke();
    } else if (n.type === "org") {
      ctx.fillStyle = theme.surface; ctx.fill();
      ctx.lineWidth = 1.5 / cam.k; ctx.strokeStyle = theme.muted; ctx.stroke();
    } else {
      ctx.fillStyle = st.node; ctx.fill();
      if (n === hoverNode || n === focusNode) { ctx.lineWidth = 2 / cam.k; ctx.strokeStyle = theme.text; ctx.stroke(); }
    }

    var showLabel = n.type !== "player" ||
      n === hoverNode || n === focusNode || neighbors.has(n.id) || cam.k > 1.3;
    if (showLabel) {
      var size = (n.type === "cat" ? 12 : n.type === "org" ? 10.5 : 10) / cam.k;
      ctx.font = (n.type === "player" ? "" : "600 ") + size + "px " + SANS;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      var ly = n.y + n.r + 3 / cam.k;
      var col = n.type === "cat" ? (on ? st.label : theme.faint)
        : n.type === "org" ? (on ? theme.text : theme.faint)
          : (on ? theme.text : theme.faint);
      // halo for legibility
      ctx.lineWidth = 3 / cam.k; ctx.strokeStyle = theme.bg; ctx.lineJoin = "round";
      ctx.globalAlpha = on ? 0.9 : 0.1;
      ctx.strokeText(n.label, n.x, ly);
      ctx.fillStyle = col;
      ctx.globalAlpha = on ? 1 : 0.35;
      ctx.fillText(n.label, n.x, ly);
    }
    ctx.globalAlpha = 1;
  }

  /* ---- loop ------------------------------------------------------------- */
  function loop() {
    if (!visible) { running = false; return; }
    if (alpha > ALPHA_MIN + 0.003 || dragNode || panning) { step(); needsDraw = true; }
    if (needsDraw) { draw(); needsDraw = false; }
    requestAnimationFrame(loop);
  }
  function kick(a) { alpha = Math.max(alpha, a || 0.4); }

  /* ---- coordinate + picking --------------------------------------------- */
  function toWorld(ev) {
    var r = canvas.getBoundingClientRect();
    return { x: (ev.clientX - r.left - cam.x) / cam.k, y: (ev.clientY - r.top - cam.y) / cam.k };
  }
  function pick(wx, wy) {
    var best = null, bd = Infinity;
    for (var i = nodes.length - 1; i >= 0; i--) {
      var n = nodes[i], dx = n.x - wx, dy = n.y - wy, d = dx * dx + dy * dy;
      var rr = (n.r + 6 / cam.k);
      if (d < rr * rr && d < bd) { bd = d; best = n; }
    }
    return best;
  }

  /* ---- tooltip + panel -------------------------------------------------- */
  function showTooltip(n) {
    if (!n) { tooltip.hidden = true; return; }
    var sub = n.type === "player" ? esc(n.entry.flagship) : (n.type === "cat" ? "category" : "company");
    tooltip.innerHTML = "<span>" + esc(n.type === "player" ? n.entry.name : n.label) + "</span>" +
      '<span class="tt-flag">' + sub + "</span>";
    tooltip.hidden = false;
    tooltip.style.left = (n.x * cam.k + cam.x) + "px";
    tooltip.style.top = (n.y * cam.k + cam.y - n.r * cam.k) + "px";
  }

  function setFocus(n) {
    focusNode = n;
    neighbors = new Set();
    if (n) edges.forEach(function (ed) {
      if (ed.a === n) neighbors.add(ed.b.id);
      if (ed.b === n) neighbors.add(ed.a.id);
    });
    showPanel(n);
    needsDraw = true;
  }

  function showPanel(n) {
    if (!n) { panel.hidden = true; return; }
    if (n.type === "player") {
      var e = n.entry, fg = STYLE[e.category].label;
      panel.innerHTML =
        '<button class="gp-close" type="button" aria-label="Close">&#10005;</button>' +
        '<div class="gp-cat" style="color:' + fg + '">' + esc(e.category) + "</div>" +
        '<div class="gp-name">' + esc(e.name) + "</div>" +
        '<div class="gp-flag">' + esc(e.flagship) + "</div>" +
        '<div class="gp-blurb">' + esc(e.blurb) + "</div>" +
        '<div class="gp-meta"><span class="gp-tag">' + (REGION[e.region] || e.region) + "</span>" +
        "<span>" + esc(e.access) + "</span><span>" + esc(e.org) + "</span><span>" + esc(e.lastVerified) + "</span></div>" +
        '<a class="gp-visit" href="' + esc(e.url) + '" target="_blank" rel="noopener noreferrer">Visit site &#8599;</a>';
    } else {
      var members = data.filter(function (e) {
        return n.type === "cat" ? e.category === n.catKey : (e.org || e.name) === n.label;
      });
      panel.innerHTML =
        '<button class="gp-close" type="button" aria-label="Close">&#10005;</button>' +
        '<div class="gp-cat">' + (n.type === "cat" ? "category" : "company") + "</div>" +
        '<div class="gp-name">' + esc(n.label) + "</div>" +
        '<div class="gp-flag">' + members.length + (n.type === "cat" ? " players" : " products") + "</div>" +
        '<div class="gp-blurb">' + esc(members.map(function (e) { return e.name; }).join(", ")) + "</div>";
    }
    panel.hidden = false;
    var c = panel.querySelector(".gp-close");
    if (c) c.addEventListener("click", function () { setFocus(null); });
  }

  /* ---- interaction ------------------------------------------------------ */
  canvas.addEventListener("mousedown", function (ev) {
    var p = toWorld(ev), n = pick(p.x, p.y);
    downX = ev.clientX; downY = ev.clientY; moved = false;
    if (n) { dragNode = n; n.px = p.x; n.py = p.y; kick(0.5); }
    else { panning = true; }
    canvas.classList.add("grabbing");
  });

  window.addEventListener("mousemove", function (ev) {
    if (dragNode) {
      var p = toWorld(ev); dragNode.px = p.x; dragNode.py = p.y; kick(0.5);
      moved = moved || Math.abs(ev.clientX - downX) + Math.abs(ev.clientY - downY) > 4;
      showTooltip(dragNode);
      return;
    }
    if (panning) {
      cam.x += ev.movementX; cam.y += ev.movementY; needsDraw = true;
      moved = moved || Math.abs(ev.clientX - downX) + Math.abs(ev.clientY - downY) > 4;
      return;
    }
    if (!visible) return;
    var p2 = toWorld(ev), n = pick(p2.x, p2.y);
    if (n !== hoverNode) {
      hoverNode = n;
      hoverNeighbors = new Set();
      if (n) edges.forEach(function (ed) {
        if (ed.a === n) hoverNeighbors.add(ed.b.id);
        if (ed.b === n) hoverNeighbors.add(ed.a.id);
      });
      canvas.style.cursor = n ? "pointer" : "grab";
      showTooltip(n);
      needsDraw = true;
    } else if (n) {
      showTooltip(n);
    }
  });

  window.addEventListener("mouseup", function (ev) {
    var wasDrag = dragNode, wasPan = panning;
    dragNode = null; panning = false;
    canvas.classList.remove("grabbing");
    if (!moved && (wasDrag || wasPan)) {
      var p = toWorld(ev), n = pick(p.x, p.y);
      setFocus(n || null);
    }
  });

  canvas.addEventListener("wheel", function (ev) {
    ev.preventDefault();
    var r = canvas.getBoundingClientRect();
    var mx = ev.clientX - r.left, my = ev.clientY - r.top;
    var wx = (mx - cam.x) / cam.k, wy = (my - cam.y) / cam.k;
    var k2 = clamp(cam.k * Math.exp(-ev.deltaY * 0.0016), 0.35, 4);
    cam.k = k2; cam.x = mx - wx * k2; cam.y = my - wy * k2;
    needsDraw = true;
  }, { passive: false });

  canvas.addEventListener("mouseleave", function () {
    if (!dragNode && !panning) { hoverNode = null; tooltip.hidden = true; needsDraw = true; }
  });

  /* ---- zoom buttons + fit ----------------------------------------------- */
  function zoomBy(f) {
    var cx = W / 2, cy = H / 2, wx = (cx - cam.x) / cam.k, wy = (cy - cam.y) / cam.k;
    cam.k = clamp(cam.k * f, 0.35, 4); cam.x = cx - wx * cam.k; cam.y = cy - wy * cam.k; needsDraw = true;
  }
  function fit() {
    var minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    nodes.forEach(function (n) {
      minx = Math.min(minx, n.x - n.r); miny = Math.min(miny, n.y - n.r);
      maxx = Math.max(maxx, n.x + n.r); maxy = Math.max(maxy, n.y + n.r);
    });
    var pad = 48, bw = Math.max(1, maxx - minx), bh = Math.max(1, maxy - miny);
    cam.k = clamp(Math.min((W - pad * 2) / bw, (H - pad * 2) / bh), 0.35, 2.2);
    cam.x = (W - (minx + maxx) * cam.k) / 2;
    cam.y = (H - (miny + maxy) * cam.k) / 2;
    needsDraw = true;
  }
  view.querySelector(".graph-toolbar").addEventListener("click", function (ev) {
    var b = ev.target.closest("button"); if (!b) return;
    var g = b.getAttribute("data-g");
    if (g === "zoomin") zoomBy(1.25);
    else if (g === "zoomout") zoomBy(0.8);
    else if (g === "fit") fit();
  });

  legend.innerHTML =
    '<span class="lg"><span class="gly"></span>player</span>' +
    '<span class="lg"><span class="gly cat"></span>category</span>' +
    '<span class="lg"><span class="gly org"></span>company</span>';

  /* ---- theme change ----------------------------------------------------- */
  var mq = window.matchMedia("(prefers-color-scheme: dark)");
  (mq.addEventListener ? mq.addEventListener.bind(mq, "change") : mq.addListener.bind(mq))(function () {
    readTheme(); needsDraw = true;
  });
  window.addEventListener("resize", function () { if (visible) { resize(); needsDraw = true; } });

  /* ---- public API ------------------------------------------------------- */
  window.FrontierGraph = {
    setVisible: function (v) {
      visible = v;
      if (!v) { tooltip.hidden = true; return; }
      readTheme();
      resize();
      if (!inited) {
        initPositions();
        applyFilter();
        for (var w = 0; w < 300; w++) step(); // settle synchronously so the reveal is calm
        alpha = ALPHA_MIN;
        fit();
      } else {
        applyFilter();
      }
      if (!running) { running = true; requestAnimationFrame(loop); }
    }
  };

  // prime the active set so the first reveal is correct
  applyFilter();
})();
