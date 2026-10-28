
(function () {
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('[role="tabpanel"]'));
  function select(tab) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });
    panels.forEach(function (p) {
      if (p.id === tab.getAttribute('aria-controls')) {
        p.removeAttribute('hidden');
        p.querySelectorAll('details.answer img').forEach(function (img) { img.loading = 'eager'; });
      } else {
        p.setAttribute('hidden', '');
      }
    });
    tab.scrollIntoView({block: 'nearest', inline: 'nearest'});
    window.scrollTo({top: 0});
    scheduleEdgeHints();
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { select(tab); });
    tab.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      var next = tabs[(i + d + tabs.length) % tabs.length];
      next.focus(); select(next);
    });
  });


  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('[data-open-question]') : null;
    if (!btn) return;
    var exam = btn.getAttribute('data-exam');
    var qn = btn.getAttribute('data-q');
    var tab = document.querySelector('[role="tab"][aria-controls="exam-' + exam + '"]');
    if (!tab) return;
    select(tab);
    window.requestAnimationFrame(function () {
      var card = document.getElementById(exam + '-q' + qn);
      if (card) card.scrollIntoView({behavior: 'smooth', block: 'start'});
    });
  });

  var allPanel = document.getElementById('exam-all');
  if (allPanel) {
    var filterButtons = Array.prototype.slice.call(allPanel.querySelectorAll('[data-filter-tag]'));
    var allItems = Array.prototype.slice.call(allPanel.querySelectorAll('.all-item'));
    var filterCount = allPanel.querySelector('[data-filter-count]');
    var allEmpty = allPanel.querySelector('.all-empty');
    var generatedToggle = allPanel.querySelector('[data-all-generated]');
    var selectedTags = {};
    function applyTagFilter() {
      var shown = 0;
      var keys = Object.keys(selectedTags);
      var includeGenerated = !generatedToggle || generatedToggle.checked;
      allItems.forEach(function (item) {
        var tags = (item.getAttribute('data-tags') || '').split('|');
        var tagMatch = keys.length === 0 || tags.some(function (t) { return selectedTags[t]; });
        var generated = item.getAttribute('data-generated') === '1';
        var show = tagMatch && (includeGenerated || !generated);
        item.hidden = !show;
        if (show) shown += 1;
      });
      filterButtons.forEach(function (b) {
        b.setAttribute('aria-pressed', selectedTags[b.getAttribute('data-filter-tag')] ? 'true' : 'false');
      });
      if (filterCount) filterCount.textContent = 'Visar ' + shown + ' av ' + allItems.length + ' frågor';
      if (allEmpty) allEmpty.hidden = shown !== 0;
    }
    if (generatedToggle) generatedToggle.addEventListener('change', applyTagFilter);
    allPanel.addEventListener('click', function (e) {
      var tagBtn = e.target.closest ? e.target.closest('[data-filter-tag]') : null;
      if (tagBtn) {
        var t = tagBtn.getAttribute('data-filter-tag');
        if (selectedTags[t]) delete selectedTags[t]; else selectedTags[t] = true;
        applyTagFilter();
        return;
      }
      var clear = e.target.closest ? e.target.closest('[data-filter-clear]') : null;
      if (clear) {
        selectedTags = {};
        if (generatedToggle) generatedToggle.checked = true;
        applyTagFilter();
      }
    });
    applyTagFilter();
  }

  function clearAnswerBody(body) {
    if (!body) return;
    body.style.maxHeight = '';
    body.style.overflow = '';
    body.style.opacity = '';
    body.style.transform = '';
    body.style.transition = '';
  }

  function openAnswerAnimated(d) {
    if (!d || !d.matches || !d.matches('details.answer') || d.open) return;
    var body = d.querySelector('.answer-body');
    if (!body) {
      d.open = true;
      return;
    }
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      d.open = true;
      scheduleEdgeHints();
      return;
    }
    var img = d.querySelector('img');
    if (img) img.loading = 'eager';
    var token = (d._answerAnim = (d._answerAnim || 0) + 1);
    body.style.transition = 'none';
    body.style.overflow = 'hidden';
    body.style.maxHeight = '0px';
    body.style.opacity = '0';
    body.style.transform = 'translateY(-6px)';
    d.open = true;
    void body.offsetHeight;
    var target = body.scrollHeight;
    body.style.transition = 'max-height .4s cubic-bezier(.2,.8,.25,1), opacity .28s ease, transform .4s cubic-bezier(.2,.8,.25,1)';
    body.style.maxHeight = target + 'px';
    body.style.opacity = '1';
    body.style.transform = 'none';
    var done = false;
    var timer = setTimeout(finish, 700);
    function finish() {
      if (done || d._answerAnim !== token) return;
      done = true;
      clearTimeout(timer);
      body.removeEventListener('transitionend', onEnd);
      clearAnswerBody(body);
      scheduleEdgeHints();
    }
    function onEnd(e) {
      if (e.target === body && e.propertyName === 'max-height') finish();
    }
    body.addEventListener('transitionend', onEnd);
    scheduleEdgeHints();
  }

  function closeAnswerInstant(d) {
    if (!d) return;
    d._answerAnim = (d._answerAnim || 0) + 1;
    var body = d.querySelector('.answer-body');
    d.open = false;
    clearAnswerBody(body);
  }

  document.addEventListener('click', function (e) {
    var summary = e.target.closest ? e.target.closest('summary') : null;
    if (!summary) return;
    var d = summary.parentElement;
    if (!d || !d.matches('details.answer')) return;
    e.preventDefault();
    if (d.open) closeAnswerInstant(d);
    else openAnswerAnimated(d);
  });

  document.addEventListener('toggle', function (e) {
    var d = e.target;
    if (!d.matches || !d.matches('details.answer')) return;
    var label = d.querySelector('summary .label');
    if (label) label.textContent = d.open ? 'Dölj lösning' : 'Visa lösning';
    if (d.open) {
      var img = d.querySelector('img');
      if (img) img.loading = 'eager';
      scheduleEdgeHints();
    }
  }, true);

  document.addEventListener('click', function (e) {
    var open = e.target.closest('[data-open-all]');
    var close = e.target.closest('[data-close-all]');
    if (!open && !close) return;
    var panel = e.target.closest('[data-score-panel]') || e.target.closest('[role="tabpanel"], .standalone');
    if (!panel) panel = document;
    if (open) {
      panel.querySelectorAll('details.answer img').forEach(function (img) { img.loading = 'eager'; });
      panel.querySelectorAll('details.answer').forEach(function (d) { openAnswerAnimated(d); });
    } else {
      panel.querySelectorAll('details.answer').forEach(function (d) { closeAnswerInstant(d); });
    }
    scheduleEdgeHints();
  });


  var edgeRaf = 0;
  function updateEdgeHints() {
    document.querySelectorAll('.qbody').forEach(function (wrap) {
      var sc = wrap.querySelector('.qscroll');
      if (!sc) return;
      wrap.classList.toggle('can-left', sc.scrollLeft > 2);
      wrap.classList.toggle('can-right', sc.scrollLeft + sc.clientWidth < sc.scrollWidth - 2);
    });
    document.querySelectorAll('.answer-inner').forEach(function (wrap) {
      var sc = wrap.querySelector('.answer-scroll');
      if (!sc) return;
      wrap.classList.toggle('can-left', sc.scrollLeft > 2);
      wrap.classList.toggle('can-right', sc.scrollLeft + sc.clientWidth < sc.scrollWidth - 2);
    });
  }
  function scheduleEdgeHints() {
    if (edgeRaf) return;
    edgeRaf = requestAnimationFrame(function () {
      edgeRaf = 0;
      updateEdgeHints();
    });
  }
  document.addEventListener('scroll', function (e) {
    var t = e.target;
    if (t && t.matches && (t.matches('.qscroll') || t.matches('.answer-scroll'))) {
      scheduleEdgeHints();
    }
  }, true);
  window.addEventListener('resize', scheduleEdgeHints);
  window.addEventListener('load', scheduleEdgeHints);
  document.querySelectorAll('img').forEach(function (img) {
    img.addEventListener('load', scheduleEdgeHints);
  });
  scheduleEdgeHints();

  function fmtP(n) {
    var r = Math.round(n * 2) / 2;
    return String(r).replace('.', ',');
  }
  function progressPhrase(pct) {
    if (pct < 20) return 'BRA START';
    if (pct < 40) return 'PÅ GÅNG';
    if (pct < 60) return 'HALVVÄGS';
    if (pct < 80) return 'SNART I MÅL';
    return 'SISTA BITEN';
  }
  function panelOf(el) {
    return (el && el.closest && (el.closest('[data-score-panel]') || el.closest('[role="tabpanel"], .standalone'))) || document;
  }
  function motionOff() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function burstAt(target, count, spread, palette) {
    if (!target || motionOff()) return;
    var r = target.getBoundingClientRect();
    var burst = document.createElement('div');
    burst.className = 'local-burst';
    burst.setAttribute('aria-hidden', 'true');
    burst.style.left = (r.left + r.width / 2) + 'px';
    burst.style.top = (r.top + r.height / 2) + 'px';
    var colors = palette || ['#3f8f5a', '#e0a03a', '#d64545', '#3c7f9e', '#e8c05a', '#c06c84'];
    for (var i = 0; i < count; i++) {
      var p = document.createElement('i');
      var angle = Math.random() * Math.PI * 2;
      var dist = spread * (0.35 + Math.random() * 0.8);
      p.style.setProperty('--dx', (Math.cos(angle) * dist).toFixed(1) + 'px');
      p.style.setProperty('--dy', (Math.sin(angle) * dist).toFixed(1) + 'px');
      p.style.setProperty('--rot', Math.round(Math.random() * 720 - 360) + 'deg');
      var w = 4 + Math.random() * 5;
      p.style.width = w.toFixed(1) + 'px';
      p.style.height = (w * (0.5 + Math.random())).toFixed(1) + 'px';
      p.style.background = colors[Math.floor(Math.random() * colors.length)];
      if (Math.random() < 0.35) p.className = 'round';
      burst.appendChild(p);
    }
    document.body.appendChild(burst);
    setTimeout(function () {
      if (burst.parentNode) burst.parentNode.removeChild(burst);
    }, 1000);
  }

  function showScoreToast(card, text, variant) {
    var sc = card.querySelector('.scoring');
    if (!sc) return;
    var old = sc.querySelector('.score-toast');
    if (old) old.remove();
    var toast = document.createElement('span');
    toast.className = 'score-toast' + (variant ? ' ' + variant : '');
    toast.textContent = text;
    toast.setAttribute('role', 'status');
    sc.appendChild(toast);
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 1900);
  }

  function celebrateGroup(group) {
    if (motionOff()) return;
    group.classList.remove('group-celebrate');
    void group.offsetWidth;
    group.classList.add('group-celebrate');
    setTimeout(function () { group.classList.remove('group-celebrate'); }, 600);
    burstAt(group, 12, 55);
  }

  function celebrateFull(card) {
    if (motionOff()) return;
    card.classList.remove('qcard-slaktad-celebrate');
    void card.offsetWidth;
    card.classList.add('qcard-slaktad-celebrate');
    setTimeout(function () { card.classList.remove('qcard-slaktad-celebrate'); }, 900);
    var sc = card.querySelector('.scoring');
    if (!sc) return;
    showScoreToast(card, 'UPPGIFT SLAKTAD!', 'score-toast-slaktad');
    burstAt(sc, 44, 160, ['#e0a03a', '#e8c05a', '#f0d28a', '#3f8f5a', '#d64545', '#c06c84']);
  }

  function syncCompletion(card, earned, total, celebrate) {
    var sc = card.querySelector('.scoring');
    if (!sc) return false;
    sc.querySelectorAll('.point-group').forEach(function (group) {
      var inputs = group.querySelectorAll('.pt-input');
      if (!inputs.length) return;
      var checked = 0;
      Array.prototype.forEach.call(inputs, function (inp) { if (inp.checked) checked += 1; });
      var done = checked === inputs.length;
      var progress = checked > 0 && !done;
      var was = group.classList.contains('is-complete');
      group.classList.toggle('is-complete', done);
      group.classList.toggle('has-progress', progress);
      if (done && !was && celebrate) celebrateGroup(group);
    });
    var full = total > 0 && earned >= total - 0.001;
    var started = earned > 0;
    var wasFull = card.classList.contains('question-slaktad');
    card.classList.toggle('question-slaktad', full);
    card.classList.toggle('question-progress', started && !full);
    if (!full) {
      var staleToast = sc.querySelector('.score-toast');
      if (staleToast) staleToast.remove();
      card.classList.remove('qcard-slaktad-celebrate');
    }
    if (full && !wasFull && celebrate) {
      var oldToast = sc.querySelector('.score-toast');
      if (oldToast) oldToast.remove();
      var token = (card._doneToken = (card._doneToken || 0) + 1);
      setTimeout(function () {
        if (card._doneToken === token && card.classList.contains('question-slaktad')) {
          celebrateFull(card);
        }
      }, 220);
    }
    return full;
  }

  function updateCard(card, celebrate) {
    var sc = card.querySelector('.scoring');
    if (!sc) return 0;
    var earned = 0;
    sc.querySelectorAll('.pt-input:checked').forEach(function (inp) {
      earned += parseFloat(inp.dataset.value || '0');
    });
    var total = parseFloat(sc.dataset.total || '0');
    var badge = card.querySelector('[data-card-points]');
    syncCompletion(card, earned, total, celebrate);
    if (badge) {
      var full = total > 0 && earned >= total - 0.001;
      var started = earned > 0;
      var pct = total > 0 ? Math.max(0, Math.min(100, (earned / total) * 100)) : 0;
      var phrase = full ? 'SLAKTAD' : (started ? progressPhrase(pct) : '');
      badge.textContent = (phrase ? phrase + ' ' : '') + fmtP(earned) + ' / ' + fmtP(total) + ' p';
      var state = full ? 'Uppgift slaktad' : (started ? 'Pågående: ' + progressPhrase(pct) : 'Poäng');
      badge.setAttribute('aria-label', state + ': ' + fmtP(earned) + ' av ' + fmtP(total) + ' poäng');
    }
    return earned;
  }

  var confettiCanvas = null, confettiCtx = null, confettiPieces = [], confettiRaf = 0;
  var confettiColors = ['#d64545', '#e0a03a', '#3f8f5a', '#3c7f9e', '#e8c05a', '#c06c84', '#f5efe3'];

  function resizeConfetti() {
    if (!confettiCanvas || !confettiCtx) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = window.innerWidth, h = window.innerHeight;
    confettiCanvas.width = Math.floor(w * dpr);
    confettiCanvas.height = Math.floor(h * dpr);
    confettiCanvas.style.width = w + 'px';
    confettiCanvas.style.height = h + 'px';
    confettiCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function ensureConfetti() {
    if (confettiCanvas) return;
    confettiCanvas = document.createElement('canvas');
    confettiCanvas.className = 'confetti-canvas';
    confettiCanvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(confettiCanvas);
    confettiCtx = confettiCanvas.getContext('2d');
    resizeConfetti();
    window.addEventListener('resize', resizeConfetti);
  }
  function spawnConfetti(count, energy) {
    ensureConfetti();
    if (!confettiCtx) return;
    var w = window.innerWidth, h = window.innerHeight;
    for (var i = 0; i < count; i++) {
      var mode = Math.random(), x, y, vx, vy;
      if (mode < 0.38) {
        x = Math.random() * w;
        y = -20 - Math.random() * h * 0.25;
        vx = (Math.random() - 0.5) * 3;
        vy = 1.5 + Math.random() * 3;
      } else if (mode < 0.69) {
        x = -20 - Math.random() * 40;
        y = h * (0.15 + Math.random() * 0.55);
        vx = (3 + Math.random() * 6) * energy;
        vy = -(2 + Math.random() * 5.5);
      } else {
        x = w + 20 + Math.random() * 40;
        y = h * (0.15 + Math.random() * 0.55);
        vx = -(3 + Math.random() * 6) * energy;
        vy = -(2 + Math.random() * 5.5);
      }
      var shape = Math.random();
      confettiPieces.push({
        x: x, y: y, vx: vx, vy: vy,
        w: shape < 0.38 ? 5 + Math.random() * 5 : (shape < 0.75 ? 8 + Math.random() * 6 : 4),
        h: shape < 0.38 ? 5 + Math.random() * 5 : (shape < 0.75 ? 4 + Math.random() * 4 : 12 + Math.random() * 8),
        color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.35,
        ttl: 130 + Math.random() * 120,
        circle: shape < 0.38,
        drag: 0.995,
        gravity: 0.1 + Math.random() * 0.06
      });
    }
    if (!confettiRaf) confettiRaf = window.requestAnimationFrame(drawConfetti);
  }
  function drawConfetti() {
    if (!confettiCtx) { confettiRaf = 0; return; }
    var w = window.innerWidth, h = window.innerHeight;
    confettiCtx.clearRect(0, 0, w, h);
    var alive = [];
    for (var i = 0; i < confettiPieces.length; i++) {
      var p = confettiPieces[i];
      p.ttl -= 1;
      p.vy += p.gravity;
      p.vx *= p.drag;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      if (p.ttl <= 0 || p.y > h + 100 || p.x < -120 || p.x > w + 120) continue;
      confettiCtx.save();
      confettiCtx.translate(p.x, p.y);
      confettiCtx.rotate(p.rot);
      confettiCtx.globalAlpha = Math.min(1, p.ttl / 35);
      confettiCtx.fillStyle = p.color;
      if (p.circle) {
        confettiCtx.beginPath();
        confettiCtx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
        confettiCtx.fill();
      } else {
        confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      confettiCtx.restore();
      alive.push(p);
    }
    confettiPieces = alive;
    if (alive.length) {
      confettiRaf = window.requestAnimationFrame(drawConfetti);
    } else {
      confettiCtx.clearRect(0, 0, w, h);
      confettiRaf = 0;
    }
  }

  function showGradeBanner(grade, score, total) {
    var old = document.querySelector('.grade-banner');
    if (old) old.remove();
    var el = document.createElement('div');
    el.className = 'grade-banner grade-banner-' + grade;
    el.setAttribute('role', 'status');
    var kicker = grade === 6 ? '★ Alla poäng ★' : grade === 5 ? '★ Maxbetyg ★' : 'Du klarade gränsen';
    var sub = grade === 6 ? score + ' / ' + total + ' p' : score + ' p';
    el.innerHTML =
      '<span class="banner-kicker">' + kicker + '</span>' +
      '<strong class="banner-title">BETYG ' + grade + '</strong>' +
      '<span class="banner-sub">' + sub + '</span>';
    document.body.appendChild(el);
    window.requestAnimationFrame(function () { el.classList.add('show'); });
    setTimeout(function () {
      el.classList.remove('show');
      setTimeout(function () { el.remove(); }, 500);
    }, grade === 6 ? 7200 : grade === 5 ? 4300 : 3100);
  }
  function showGradeFlash(grade) {
    document.querySelectorAll('.grade-flash').forEach(function (old) { old.remove(); });
    var f = document.createElement('div');
    f.className = 'grade-flash grade-flash-' + grade;
    document.body.appendChild(f);
    setTimeout(function () { f.remove(); }, 1100);
  }
  function spawnLightsabers(count) {
    var colors = ['#4cc9f0', '#4ade80', '#f87171', '#c084fc', '#facc15'];
    for (var i = 0; i < count; i++) {
      var s = document.createElement('div');
      var ltr = Math.random() < 0.5;
      s.className = 'lightsaber ' + (ltr ? 'ltr' : 'rtl');
      s.style.setProperty('--top', (8 + Math.random() * 80).toFixed(1) + 'vh');
      s.style.setProperty('--angle', (Math.random() * 36 - 18).toFixed(1) + 'deg');
      s.style.setProperty('--saber', colors[Math.floor(Math.random() * colors.length)]);
      s.style.setProperty('--len', (150 + Math.random() * 170).toFixed(0) + 'px');
      s.style.setProperty('--dur', (0.9 + Math.random() * 0.7).toFixed(2) + 's');
      s.style.setProperty('--delay', (Math.random() * 0.8).toFixed(2) + 's');
      s.addEventListener('animationend', function () { this.remove(); });
      document.body.appendChild(s);
    }
  }

  function showPartyMode(grade) {
    var old = document.querySelector('.party-overlay');
    if (old) old.remove();
    var wild = grade === 6;
    var o = document.createElement('div');
    o.className = 'party-overlay' + (wild ? ' party-6' : ' party-5');
    o.setAttribute('aria-hidden', 'true');
    o.innerHTML = '<div class="party-floor"></div><div class="disco-ball">🪩</div>';
    var colors = ['#ff3d81', '#3ddc97', '#3a86ff', '#ffd166', '#c77dff'];
    var i;
    var spotCount = wild ? 4 : 3;
    for (i = 0; i < spotCount; i++) {
      var sp = document.createElement('div');
      sp.className = 'spotlight';
      sp.style.left = (8 + i * (84 / (spotCount - 1))) + '%';
      sp.style.setProperty('--spot', colors[i]);
      sp.style.setProperty('--dur', (3.1 + i * 0.45) + 's');
      sp.style.setProperty('--delay', (-i * 0.55) + 's');
      o.appendChild(sp);
    }
    var laserCount = wild ? 10 : 4;
    for (i = 0; i < laserCount; i++) {
      var l = document.createElement('div');
      l.className = 'laser ' + (i % 2 ? 'rtl' : 'ltr');
      l.style.top = (10 + Math.random() * 80) + 'vh';
      l.style.setProperty('--laser', colors[i % colors.length]);
      l.style.setProperty('--dur', (1.4 + Math.random() * 1.4) + 's');
      l.style.setProperty('--delay', (-Math.random() * 2) + 's');
      o.appendChild(l);
    }
    var dancers = wild ? ['🕺', '💃', '🕺', '💃', '🕺', '💃', '🕺'] : ['🕺', '💃', '🕺', '💃'];
    for (i = 0; i < dancers.length; i++) {
      var d = document.createElement('div');
      d.className = 'dancer';
      d.textContent = dancers[i];
      d.style.left = (4 + i * (92 / (dancers.length - 1))) + '%';
      d.style.fontSize = (40 + (i % 3) * 9) + 'px';
      d.style.setProperty('--delay', (-i * 0.13) + 's');
      o.appendChild(d);
    }
    var fireCount = wild ? 9 : 3;
    for (i = 0; i < fireCount; i++) {
      var f = document.createElement('div');
      f.className = 'fire';
      f.textContent = '🔥';
      f.style.left = (5 + i * (90 / (fireCount - 1))) + '%';
      f.style.setProperty('--delay', (-Math.random() * 0.6) + 's');
      o.appendChild(f);
    }
    var dotCount = wild ? 14 : 8;
    for (i = 0; i < dotCount; i++) {
      var dot = document.createElement('div');
      dot.className = 'disco-dot';
      dot.style.left = (Math.random() * 100) + '%';
      dot.style.top = (Math.random() * 90) + '%';
      dot.style.setProperty('--dot', colors[i % colors.length]);
      dot.style.setProperty('--dur', (1.5 + Math.random() * 2.2) + 's');
      dot.style.setProperty('--delay', (-Math.random() * 2) + 's');
      o.appendChild(dot);
    }
    var stars = ['🎉', '✨', '🥳', '🎊', '⭐'];
    var starCount = wild ? 10 : 6;
    for (i = 0; i < starCount; i++) {
      var st = document.createElement('div');
      st.className = 'party-star';
      st.textContent = stars[i % stars.length];
      st.style.left = (Math.random() * 96) + '%';
      st.style.top = (10 + Math.random() * 70) + '%';
      st.style.setProperty('--dur', (2.2 + Math.random() * 2) + 's');
      st.style.setProperty('--delay', (-Math.random() * 2) + 's');
      o.appendChild(st);
    }
    document.body.appendChild(o);
    var life = wild ? 8400 : 5600;
    setTimeout(function () { o.classList.add('party-out'); }, life);
    setTimeout(function () { o.remove(); }, life + 700);
  }

  function celebrateGrade(panel, grade) {
    var gb = panel.querySelector('.gradebar');
    var badge = gb ? gb.querySelector('[data-grade-badge]') : null;
    if (gb) {
      gb.classList.remove('celebrate');
      void gb.offsetWidth;
      gb.classList.add('celebrate');
      setTimeout(function () { gb.classList.remove('celebrate'); }, 1300);
    }
    if (badge) {
      badge.classList.remove('grade-pop');
      void badge.offsetWidth;
      badge.classList.add('grade-pop');
      setTimeout(function () { badge.classList.remove('grade-pop'); }, 750);
    }
    var scoreEl = gb ? gb.querySelector('[data-grade-score]') : null;
    var score = scoreEl ? scoreEl.textContent : '';
    var total = gb ? gb.dataset.total : '';
    if (!reduceMotion) showGradeFlash(grade);
    showGradeBanner(grade, score, total);
    if (!reduceMotion && grade >= 5) {
      spawnLightsabers(grade === 6 ? 12 : 7);
      setTimeout(function () { spawnLightsabers(grade === 6 ? 8 : 5); }, 450);
      if (grade === 6) setTimeout(function () { spawnLightsabers(8); }, 1100);
    }
    if (!reduceMotion && grade >= 5) showPartyMode(grade);
    if (reduceMotion) return;
    if (grade === 3) {
      spawnConfetti(110, 1);
    } else if (grade === 4) {
      spawnConfetti(160, 1.15);
      setTimeout(function () { spawnConfetti(80, 1.25); }, 250);
    } else if (grade === 5) {
      spawnConfetti(210, 1.35);
      setTimeout(function () { spawnConfetti(120, 1.5); }, 300);
      setTimeout(function () { spawnConfetti(90, 1.6); }, 650);
    } else {
      spawnConfetti(280, 1.5);
      [200, 450, 750, 1100, 1500].forEach(function (delay) {
        setTimeout(function () { spawnConfetti(120, 1.6); }, delay);
      });
    }
  }

  function updateGrade(panel, celebrate) {
    var gb = panel.querySelector('.gradebar');
    if (!gb) return;
    var prevGrade = parseInt(panel.dataset.grade || '0', 10) || 0;
    var earned = 0;
    panel.querySelectorAll('.qcard').forEach(function (card) { earned += updateCard(card, celebrate); });
    var b = {};
    try { b = JSON.parse(gb.dataset.boundaries || '{}'); } catch (e) {}
    var grade = 0;
    [3, 4, 5].forEach(function (g) {
      if (b[g] != null && earned >= parseFloat(b[g])) grade = g;
    });
    var maxPoints = parseFloat(gb.dataset.total || '0');
    if (maxPoints > 0 && earned >= maxPoints - 0.001) grade = 6;
    var score = gb.querySelector('[data-grade-score]');
    if (score) score.textContent = fmtP(earned);
    var badge = gb.querySelector('[data-grade-badge]');
    if (badge) {
      badge.className = 'grade-badge ' + (grade ? 'grade-' + grade : 'grade-u');
      var strong = badge.querySelector('strong');
      if (strong) strong.textContent = grade ? String(grade) : 'U';
      badge.title = grade ? 'Betyg ' + grade : 'Underkänt';
      badge.setAttribute('aria-label', grade ? 'Betyg ' + grade : 'Underkänt');
    }
    var note = gb.querySelector('[data-grade-note]');
    if (note) {
      if (grade >= 6) {
        note.textContent = 'Alla poäng! Betyg 6';
      } else if (grade >= 5) {
        note.textContent = 'Betyg 5 uppnått';
      } else {
        var next = grade < 3 ? 3 : grade + 1;
        var need = parseFloat(b[next] || 0) - earned;
        note.textContent = fmtP(Math.max(0, need)) + ' p kvar till betyg ' + next;
      }
    }
    panel.dataset.grade = String(grade);
    if (celebrate && grade > prevGrade && grade >= 3) celebrateGrade(panel, grade);
  }
  function savePanel(panel) {
    var gb = panel.querySelector('.gradebar');
    if (!gb) return;
    var data = {};
    panel.querySelectorAll('.pt-input').forEach(function (inp) {
      if (inp.checked) data[inp.dataset.key] = 1;
    });
    try { localStorage.setItem('etsn11-grading:' + gb.dataset.exam, JSON.stringify(data)); } catch (e) {}
  }
  function loadPanel(panel) {
    var gb = panel.querySelector('.gradebar');
    if (!gb) return;
    var data = {};
    try { data = JSON.parse(localStorage.getItem('etsn11-grading:' + gb.dataset.exam) || '{}'); } catch (e) {}
    panel.querySelectorAll('.pt-input').forEach(function (inp) {
      inp.checked = !!data[inp.dataset.key];
    });
  }
  function pointImpact(inp) {
    var box = inp.parentElement ? inp.parentElement.querySelector('.pt-box') : null;
    if (!box) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    box.classList.remove('pt-hit');
    void box.offsetWidth;
    box.classList.add('pt-hit');
    var hitToken = (box._ptHit = (box._ptHit || 0) + 1);
    setTimeout(function () {
      if (box._ptHit === hitToken) box.classList.remove('pt-hit');
    }, 480);
    var old = box.querySelector('.pt-sparks');
    if (old) old.remove();
    var sparks = document.createElement('span');
    sparks.className = 'pt-sparks';
    sparks.setAttribute('aria-hidden', 'true');
    var colors = ['#d64545', '#e0a03a', '#3f8f5a', '#3c7f9e'];
    for (var i = 0; i < 9; i++) {
      var p = document.createElement('i');
      var angle = (Math.PI * 2 * i / 9) + (Math.random() * 0.5 - 0.25);
      var dist = 16 + Math.random() * 14;
      p.style.setProperty('--dx', (Math.cos(angle) * dist).toFixed(1) + 'px');
      p.style.setProperty('--dy', (Math.sin(angle) * dist - 2).toFixed(1) + 'px');
      var color = colors[i % colors.length];
      p.style.background = color;
      p.style.boxShadow = '0 0 6px ' + color;
      var sz = 3 + Math.random() * 2.5;
      p.style.width = sz.toFixed(1) + 'px';
      p.style.height = sz.toFixed(1) + 'px';
      p.style.animationDelay = (Math.random() * 0.04).toFixed(2) + 's';
      sparks.appendChild(p);
    }
    box.appendChild(sparks);
    setTimeout(function () {
      if (sparks.parentNode) sparks.parentNode.removeChild(sparks);
    }, 650);
  }
  document.addEventListener('change', function (e) {
    var inp = e.target.closest ? e.target.closest('.pt-input') : null;
    if (!inp) return;
    if (inp.checked) pointImpact(inp);
    var panel = panelOf(inp);
    updateGrade(panel, true);
    savePanel(panel);
  });
  document.addEventListener('click', function (e) {
    var reset = e.target.closest ? e.target.closest('[data-reset]') : null;
    if (!reset) return;
    var panel = panelOf(reset);
    panel.querySelectorAll('.pt-input').forEach(function (inp) { inp.checked = false; });
    var gb = panel.querySelector('.gradebar');
    if (gb) {
      try { localStorage.removeItem('etsn11-grading:' + gb.dataset.exam); } catch (e) {}
    }
    panel.querySelectorAll('.score-toast').forEach(function (el) { el.remove(); });
    document.querySelectorAll('.local-burst').forEach(function (el) { el.remove(); });
    updateGrade(panel);
  });
  document.querySelectorAll('.gradebar').forEach(function (gb) {
    var panel = panelOf(gb);
    loadPanel(panel);
    updateGrade(panel);
  });


  var mathMarks = Array.prototype.slice.call(document.querySelectorAll('.math-mark'));
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var parallaxQueued = false;
  function updateParallax() {
    parallaxQueued = false;
    if (!mathMarks.length || reduceMotion) return;
    var vh = window.innerHeight || 800;
    var scroll = window.scrollY || window.pageYOffset || 0;
    var range = vh + 160;
    mathMarks.forEach(function (mark) {
      var base = (parseFloat(mark.dataset.top) / 100) * vh;
      var speed = parseFloat(mark.dataset.speed) || 0.12;
      var op = parseFloat(mark.dataset.op) || 0.1;
      var y = base - scroll * speed;
      y = ((y + 80) % range + range) % range - 80;
      var fade = 1;
      if (y < 40) fade = Math.max(0, (y + 80) / 120);
      else if (y > vh - 120) fade = Math.max(0, (vh + 80 - y) / 200);
      mark.style.top = '0px';
      mark.style.transform = 'translate3d(0,' + y.toFixed(2) + 'px,0)';
      mark.style.opacity = (op * fade).toFixed(3);
    });
  }
  function queueParallax() {
    if (!parallaxQueued) {
      parallaxQueued = true;
      window.requestAnimationFrame(updateParallax);
    }
  }
  if (mathMarks.length && !reduceMotion) {
    window.addEventListener('scroll', queueParallax, {passive: true});
    window.addEventListener('resize', queueParallax);
    updateParallax();
  }


  function retryImage(img) {
    if (img.dataset.retry) return;
    img.dataset.retry = '1';
    var src = (img.getAttribute('src') || '').split('?')[0];
    img.src = src + '?retry=' + Date.now();
  }
  document.querySelectorAll('img').forEach(function (img) {
    img.addEventListener('error', function () { retryImage(img); });
    if (img.complete && img.naturalWidth === 0) retryImage(img);
  });
})();

(function () {
  var blocks = document.querySelectorAll('.draw-block');
  if (!blocks.length) return;

  function setup(block) {
    var img = block.querySelector('img');
    var canvas = block.querySelector('.draw-canvas');
    if (!img || !canvas) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var mode = null;
    var strokes = [];
    var lines = [];
    var rects = [];
    var current = null;
    var drag = null;
    var ready = false;
    var color = '#d64545';
    var lw = 3.5;
    var handle = 9;
    var eraseR = 18;

    function d2(a, b) {
      var dx = a.x - b.x, dy = a.y - b.y;
      return dx * dx + dy * dy;
    }
    function segDist(p, a, b) {
      var dx = b.x - a.x, dy = b.y - a.y;
      if (dx === 0 && dy === 0) return Math.sqrt(d2(p, a));
      var t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy);
      t = Math.max(0, Math.min(1, t));
      return Math.sqrt(d2(p, { x: a.x + t * dx, y: a.y + t * dy }));
    }
    function pos(e) {
      var r = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - r.left) * canvas.width / r.width,
        y: (e.clientY - r.top) * canvas.height / r.height
      };
    }
    function drawHandle(x, y) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, handle, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.restore();
    }
    function drawStroke(s) {
      if (!s.points.length) return;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = lw;
      if (s.points.length === 1) {
        ctx.beginPath();
        ctx.arc(s.points[0].x, s.points[0].y, lw / 2, 0, Math.PI * 2);
        ctx.fill();
        return;
      }
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      for (var i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i].x, s.points[i].y);
      }
      ctx.stroke();
    }
    function drawLine(l, handles) {
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(l.x1, l.y1);
      ctx.lineTo(l.x2, l.y2);
      ctx.stroke();
      if (handles) {
        drawHandle(l.x1, l.y1);
        drawHandle(l.x2, l.y2);
      }
    }
    function rectBox(r) {
      return {
        x: Math.min(r.x1, r.x2),
        y: Math.min(r.y1, r.y2),
        w: Math.abs(r.x2 - r.x1),
        h: Math.abs(r.y2 - r.y1)
      };
    }
    function drawRect(r, handles) {
      var b = rectBox(r);
      ctx.save();
      ctx.fillStyle = 'rgba(214,69,69,.06)';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.restore();
      if (handles) {
        drawHandle(b.x, b.y);
        drawHandle(b.x + b.w, b.y);
        drawHandle(b.x + b.w, b.y + b.h);
        drawHandle(b.x, b.y + b.h);
      }
    }
    function draw() {
      if (!ready) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      strokes.forEach(drawStroke);
      lines.forEach(function (l) { drawLine(l, mode === 'line'); });
      rects.forEach(function (r) { drawRect(r, mode === 'rect'); });
      if (current) {
        if (current.type === 'pen') drawStroke(current);
        else if (current.type === 'line') drawLine(current.line, true);
        else if (current.type === 'rect') drawRect(current.rect, true);
      }
    }
    function resize() {
      if (!img.naturalWidth || !img.naturalHeight) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ready = true;
      draw();
    }
    if (img.complete && img.naturalWidth) resize();
    img.addEventListener('load', resize);

    function setMode(m) {
      mode = (mode === m) ? null : m;
      Array.prototype.forEach.call(block.querySelectorAll('[data-draw-mode]'), function (b) {
        b.setAttribute('aria-pressed',
          b.getAttribute('data-draw-mode') === mode ? 'true' : 'false');
      });
      canvas.style.pointerEvents = mode ? 'auto' : 'none';
      canvas.style.cursor = mode === 'erase' ? 'cell' : 'crosshair';
      var hint = block.querySelector('.draw-hint');
      if (hint) {
        hint.hidden = !(mode === 'line' || mode === 'rect');
        hint.textContent = mode === 'line'
          ? 'Dra i linjens ändpunkter för att flytta dem.'
          : 'Dra i rektangelns hörn för att ändra den.';
      }
      current = null;
      drag = null;
      draw();
    }
    Array.prototype.forEach.call(block.querySelectorAll('[data-draw-mode]'), function (btn) {
      btn.addEventListener('click', function () {
        setMode(btn.getAttribute('data-draw-mode'));
      });
    });
    var clearBtn = block.querySelector('.draw-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        strokes = [];
        lines = [];
        rects = [];
        current = null;
        drag = null;
        draw();
      });
    }

    function eraseAt(p) {
      lines = lines.filter(function (l) {
        return segDist(p, { x: l.x1, y: l.y1 }, { x: l.x2, y: l.y2 }) > eraseR;
      });
      rects = rects.filter(function (r) {
        var b = rectBox(r);
        var x1 = b.x, y1 = b.y, x2 = b.x + b.w, y2 = b.y + b.h;
        return !(
          segDist(p, { x: x1, y: y1 }, { x: x2, y: y1 }) <= eraseR ||
          segDist(p, { x: x2, y: y1 }, { x: x2, y: y2 }) <= eraseR ||
          segDist(p, { x: x2, y: y2 }, { x: x1, y: y2 }) <= eraseR ||
          segDist(p, { x: x1, y: y2 }, { x: x1, y: y1 }) <= eraseR
        );
      });
      strokes = strokes.filter(function (s) {
        if (s.points.length === 1) return Math.sqrt(d2(p, s.points[0])) > eraseR;
        for (var i = 1; i < s.points.length; i++) {
          if (segDist(p, s.points[i - 1], s.points[i]) <= eraseR) return false;
        }
        return true;
      });
      draw();
    }

    function down(e) {
      if (!mode || !ready) return;
      e.preventDefault();
      var p = pos(e);
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      if (mode === 'erase') {
        eraseAt(p);
        return;
      }
      if (mode === 'pen') {
        current = { type: 'pen', points: [p] };
        draw();
        return;
      }
      if (mode === 'line') {
        for (var i = lines.length - 1; i >= 0; i--) {
          var l = lines[i];
          if (d2(p, { x: l.x1, y: l.y1 }) < 400) {
            drag = { kind: 'line', line: l, which: 'p1' };
            draw();
            return;
          }
          if (d2(p, { x: l.x2, y: l.y2 }) < 400) {
            drag = { kind: 'line', line: l, which: 'p2' };
            draw();
            return;
          }
        }
        for (var j = lines.length - 1; j >= 0; j--) {
          var l2 = lines[j];
          if (segDist(p, { x: l2.x1, y: l2.y1 }, { x: l2.x2, y: l2.y2 }) < 10) {
            drag = { kind: 'line', line: l2, which: 'move', lx: p.x, ly: p.y };
            draw();
            return;
          }
        }
        current = { type: 'line', line: { x1: p.x, y1: p.y, x2: p.x, y2: p.y } };
        draw();
        return;
      }
      if (mode === 'rect') {
        for (var k = rects.length - 1; k >= 0; k--) {
          var r = rects[k];
          var b = rectBox(r);
          var corners = [
            { x: b.x, y: b.y, which: 'nw' },
            { x: b.x + b.w, y: b.y, which: 'ne' },
            { x: b.x + b.w, y: b.y + b.h, which: 'se' },
            { x: b.x, y: b.y + b.h, which: 'sw' }
          ];
          for (var c = 0; c < corners.length; c++) {
            if (d2(p, corners[c]) < 400) {
              drag = { kind: 'rect', rect: r, which: corners[c].which };
              draw();
              return;
            }
          }
        }
        current = { type: 'rect', rect: { x1: p.x, y1: p.y, x2: p.x, y2: p.y } };
        draw();
      }
    }

    function move(e) {
      if (!mode || !ready) return;
      var p = pos(e);
      if (mode === 'erase') {
        if (e.buttons) eraseAt(p);
        return;
      }
      if (current && current.type === 'pen') {
        var pts = current.points;
        if (d2(p, pts[pts.length - 1]) > 4) {
          pts.push(p);
          draw();
        }
        return;
      }
      if (current && current.type === 'line') {
        current.line.x2 = p.x;
        current.line.y2 = p.y;
        draw();
        return;
      }
      if (current && current.type === 'rect') {
        current.rect.x2 = p.x;
        current.rect.y2 = p.y;
        draw();
        return;
      }
      if (!drag) return;
      if (drag.kind === 'line') {
        if (drag.which === 'p1') {
          drag.line.x1 = p.x;
          drag.line.y1 = p.y;
        } else if (drag.which === 'p2') {
          drag.line.x2 = p.x;
          drag.line.y2 = p.y;
        } else {
          var dx = p.x - drag.lx, dy = p.y - drag.ly;
          drag.line.x1 += dx;
          drag.line.x2 += dx;
          drag.line.y1 += dy;
          drag.line.y2 += dy;
          drag.lx = p.x;
          drag.ly = p.y;
        }
        draw();
        return;
      }
      if (drag.kind === 'rect') {
        if (drag.which === 'nw') {
          drag.rect.x1 = p.x; drag.rect.y1 = p.y;
        } else if (drag.which === 'ne') {
          drag.rect.x2 = p.x; drag.rect.y1 = p.y;
        } else if (drag.which === 'se') {
          drag.rect.x2 = p.x; drag.rect.y2 = p.y;
        } else {
          drag.rect.x1 = p.x; drag.rect.y2 = p.y;
        }
        draw();
      }
    }

    function up(e) {
      if (!ready) return;
      if (current && current.type === 'pen') {
        if (current.points.length === 1) {
          current.points.push({ x: current.points[0].x, y: current.points[0].y });
        }
        strokes.push(current);
        current = null;
        draw();
      } else if (current && current.type === 'line') {
        var l = current.line;
        if (d2({ x: l.x1, y: l.y1 }, { x: l.x2, y: l.y2 }) > 25) lines.push(l);
        current = null;
        draw();
      } else if (current && current.type === 'rect') {
        var r = current.rect;
        if (Math.abs(r.x2 - r.x1) > 4 && Math.abs(r.y2 - r.y1) > 4) {
          if (r.x1 > r.x2) { var t = r.x1; r.x1 = r.x2; r.x2 = t; }
          if (r.y1 > r.y2) { var u = r.y1; r.y1 = r.y2; r.y2 = u; }
          rects.push(r);
        }
        current = null;
        draw();
      }
      if (drag && drag.kind === 'rect') {
        var rr = drag.rect;
        if (Math.abs(rr.x2 - rr.x1) > 4 && Math.abs(rr.y2 - rr.y1) > 4) {
          if (rr.x1 > rr.x2) { var t2 = rr.x1; rr.x1 = rr.x2; rr.x2 = t2; }
          if (rr.y1 > rr.y2) { var u2 = rr.y1; rr.y1 = rr.y2; rr.y2 = u2; }
        }
      }
      drag = null;
      try {
        if (canvas.hasPointerCapture && canvas.hasPointerCapture(e.pointerId)) {
          canvas.releasePointerCapture(e.pointerId);
        }
      } catch (err) {}
    }

    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
  }

  Array.prototype.forEach.call(blocks, setup);
})();

