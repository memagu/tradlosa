(function () {
  var canvas = document.getElementById('net-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var dpr = Math.min(2, window.devicePixelRatio || 1);
  var W = 0, H = 0, nodes = [], edges = [], packets = [], raf = 0, last = 0;
  var count = 34;
  var pulseColors = [
    { color: 'rgba(11,111,122,.9)', glow: 'rgba(11,111,122,.7)', rgb: '11,111,122' },
    { color: 'rgba(217,154,43,.95)', glow: 'rgba(217,154,43,.65)', rgb: '217,154,43' },
    { color: 'rgba(108,58,122,.75)', glow: 'rgba(108,58,122,.5)', rgb: '108,58,122' }
  ];

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  function build() {
    nodes = [];
    edges = [];
    packets = [];
    var seed = 7;
    function rnd() { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }
    for (var i = 0; i < count; i++) {
      nodes.push({
        x: 0.04 + rnd() * 0.92,
        y: 0.04 + rnd() * 0.92,
        r: 1.3 + rnd() * 2.2,
        // Very slow drift: the network should feel alive, not busy.
        vx: (rnd() - 0.5) * 0.000028,
        vy: (rnd() - 0.5) * 0.000028,
        kind: rnd() < 0.18 ? 'hub' : 'node',
        flash: 0,
        pulseColor: '11,111,122'
      });
    }
    for (var a = 0; a < nodes.length; a++) {
      for (var b = a + 1; b < nodes.length; b++) {
        var dx = nodes[a].x - nodes[b].x, dy = nodes[a].y - nodes[b].y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < 0.24 && edges.length < 62) edges.push({ a: a, b: b });
      }
    }
    for (var p = 0; p < 28; p++) {
      var idx = Math.floor(rnd() * edges.length);
      if (!edges[idx]) continue;
      var dir = rnd() < 0.5 ? 1 : -1;
      packets.push({
        e: edges[idx],
        t: dir > 0 ? 0 : 1,
        speed: 0.00010 + rnd() * 0.00024,
        dir: dir,
        size: 1.9 + rnd() * 1.1,
        color: pulseColors[Math.floor(rnd() * pulseColors.length)]
      });
    }
  }

  function posOf(n, shift, drift) {
    return {
      x: n.x * W + drift,
      y: n.y * H - shift,
      r: n.r * (0.8 + Math.min(1, W / 1100) * 0.5)
    };
  }

  function pointOnEdge(e, t, pos) {
    var a = pos[e.a], b = pos[e.b];
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }

  function pulseNode(index, rgb) {
    if (!nodes[index]) return;
    nodes[index].flash = 1;
    nodes[index].pulseColor = rgb || '11,111,122';
  }

  function respawn(p) {
    if (!edges.length) return;
    p.e = edges[Math.floor(Math.random() * edges.length)];
    p.t = Math.random() < 0.5 ? 0 : 1;
    p.dir = p.t === 0 ? 1 : -1;
    p.speed = 0.00010 + Math.random() * 0.00024;
    p.size = 1.9 + Math.random() * 1.1;
    p.color = pulseColors[Math.floor(Math.random() * pulseColors.length)];
    // The source node lights up when a new signal is injected into the graph.
    pulseNode(p.dir > 0 ? p.e.a : p.e.b, p.color.rgb);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    var scroll = window.scrollY || window.pageYOffset || 0;
    // The graph repeats vertically instead of hitting a hard cap. Scrolling
    // keeps moving it forever, while a soft horizontal sway avoids a static
    // background on very long pages.
    var shift = (scroll * 0.13) % H;
    var drift = Math.sin(scroll * 0.0009) * 18;
    var pos = nodes.map(function (n) { return posOf(n, shift, drift); });

    for (var layer = -1; layer <= 1; layer++) {
    ctx.save();
    ctx.translate(0, layer * H);

    ctx.strokeStyle = 'rgba(11,111,122,.12)';
    ctx.lineWidth = 1;
    edges.forEach(function (e) {
      ctx.beginPath();
      ctx.moveTo(pos[e.a].x, pos[e.a].y);
      ctx.lineTo(pos[e.b].x, pos[e.b].y);
      ctx.stroke();
    });

    // Pulses travel along links like packets on a network.
    packets.forEach(function (p) {
      var headT = Math.max(0, Math.min(1, p.t));
      var tailT = Math.max(0, Math.min(1, p.t - p.dir * 0.055));
      var head = pointOnEdge(p.e, headT, pos);
      var tail = pointOnEdge(p.e, tailT, pos);
      var grad = ctx.createLinearGradient(tail.x, tail.y, head.x, head.y);
      grad.addColorStop(0, 'rgba(11,111,122,0)');
      grad.addColorStop(0.65, p.color.glow);
      grad.addColorStop(1, p.color.color);
      ctx.save();
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.1;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tail.x, tail.y);
      ctx.lineTo(head.x, head.y);
      ctx.stroke();
      ctx.shadowColor = p.color.glow;
      ctx.shadowBlur = 9;
      ctx.fillStyle = p.color.color;
      ctx.beginPath();
      ctx.arc(head.x, head.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    pos.forEach(function (n, i) {
      var hub = nodes[i].kind === 'hub';
      var flash = nodes[i].flash || 0;
      var rgb = nodes[i].pulseColor || '11,111,122';
      if (flash > 0.02) {
        // Concentric receiving/sending ripple.
        ctx.save();
        ctx.strokeStyle = 'rgba(' + rgb + ',' + (0.55 * flash).toFixed(3) + ')';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + 3 + (1 - flash) * 17, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      if (hub) {
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 4.5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(11,111,122,.18)'; ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.save();
      if (flash > 0.03) {
        ctx.shadowColor = 'rgba(' + rgb + ',' + (0.8 * flash).toFixed(3) + ')';
        ctx.shadowBlur = 8 + 14 * flash;
      }
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = hub ? 'rgba(217,154,43,.55)' : 'rgba(11,111,122,.36)';
      ctx.fill();
      if (flash > 0.02) {
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r * (1 + 0.35 * flash), 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + rgb + ',' + (0.35 * flash).toFixed(3) + ')';
        ctx.fill();
      }
      ctx.restore();
    });
    ctx.restore();
    }
  }

  function tick(t) {
    var dt = last ? Math.min(50, t - last) : 16;
    last = t;
    nodes.forEach(function (n) {
      n.x += n.vx * dt; n.y += n.vy * dt;
      if (n.x < 0.03 || n.x > 0.97) n.vx *= -1;
      if (n.y < 0.03 || n.y > 0.97) n.vy *= -1;
      if (n.flash > 0) n.flash *= 0.945;
      if (n.flash < 0.01) n.flash = 0;
    });
    packets.forEach(function (p) {
      p.t += p.speed * dt * p.dir;
      if (p.t > 1) {
        pulseNode(p.e.b, p.color.rgb);
        respawn(p);
      } else if (p.t < 0) {
        pulseNode(p.e.a, p.color.rgb);
        respawn(p);
      }
    });
    draw();
    raf = requestAnimationFrame(tick);
  }

  resize();
  window.addEventListener('resize', function () { resize(); if (reduce) draw(); });

  if (reduce) {
    draw();
  } else {
    raf = requestAnimationFrame(tick);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf) {
        last = 0;
        raf = requestAnimationFrame(tick);
      }
    });
  }
})();
