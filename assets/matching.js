(function () {
  var data = Array.isArray(window.ETSN11_TERMS) ? window.ETSN11_TERMS.slice() : [];
  var promptsEl = document.querySelector('[data-match-prompts]');
  if (!promptsEl) return;
  var optionsEl = document.querySelector('[data-match-options]');
  var feedbackEl = document.querySelector('[data-match-feedback]');
  var resultEl = document.querySelector('[data-match-result]');
  var scoreEl = document.querySelector('[data-match-score]');
  var streakEl = document.querySelector('[data-match-streak]');
  var bestEl = document.querySelector('[data-match-best]');
  var progressEl = document.querySelector('[data-match-progress]');
  var cablesEl = document.querySelector('[data-match-cables]');
  var boardEl = document.querySelector('[data-match-board]');
  var modeButtons = Array.prototype.slice.call(document.querySelectorAll('[data-match-mode]'));
  var newBtn = document.querySelector('[data-match-new]');
  var mode = 'definition';
  var round = [];
  var options = [];
  var selected = null;
  var score = 0;
  var streak = 0;
  var best = 0;
  var seen = {};
  var cableRaf = 0;
  var cableGroups = {};
  var pairColors = ['#0b6f7a', '#d99a2b', '#6c3a7a', '#2f8f5a', '#b84a4a', '#3c7f9e'];

  try { best = parseInt(localStorage.getItem('etsn11-match-best') || '0', 10) || 0; } catch (e) {}
  try { streak = parseInt(localStorage.getItem('etsn11-match-streak') || '0', 10) || 0; } catch (e) {}
  try { seen = JSON.parse(localStorage.getItem('etsn11-match-seen') || '{}') || {}; } catch (e) {}
  if (bestEl) bestEl.textContent = String(best);
  if (streakEl) streakEl.textContent = String(streak);

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function sample(a, n) { return shuffle(a.slice()).slice(0, n); }
  function byTopic(pool, topics) {
    if (!topics || !topics.length) return pool;
    return pool.filter(function (t) {
      return (t.topics || []).some(function (x) { return topics.indexOf(x) >= 0; });
    });
  }
  function topicSet(items) {
    var out = [];
    items.forEach(function (t) { (t.topics || []).forEach(function (x) { if (out.indexOf(x) < 0) out.push(x); }); });
    return out;
  }
  function saveSeen() {
    try { localStorage.setItem('etsn11-match-seen', JSON.stringify(seen)); } catch (e) {}
  }
  function setFeedback(text, good) {
    if (!feedbackEl) return;
    feedbackEl.textContent = text || '';
    feedbackEl.className = 'match-feedback' + (good === true ? ' good' : good === false ? ' bad' : '');
  }
  function doneCount() {
    return round.filter(function (r) { return r.locked; }).length;
  }
  function updateStats() {
    if (scoreEl) scoreEl.textContent = String(score);
    if (streakEl) streakEl.textContent = String(streak);
    if (bestEl) bestEl.textContent = String(best);
    if (progressEl) progressEl.textContent = doneCount() + ' / ' + (round.length || 0);
  }

  function makeRound() {
    data.forEach(function (t) { t._used = false; });
    clearCables();
    if (!data.length) {
      promptsEl.innerHTML = '<div class="exam-note"><strong>Inga begrepp ännu.</strong> Begreppsbanken fylls på här.</div>';
      if (optionsEl) optionsEl.innerHTML = '';
      return;
    }
    var n = Math.min(6, data.length);
    var unseen = data.filter(function (t) { return !seen[t.id]; });
    var pool = unseen.length >= n ? unseen : data;
    round = sample(pool, n).map(function (t, i) {
      return { term: t, choice: null, locked: false, wrong: false, color: pairColors[i % pairColors.length] };
    });
    var topics = topicSet(round.map(function (r) { return r.term; }));
    var correctTerms = round.map(function (r) { return r.term; });
    var correctIds = correctTerms.map(function (t) { return t.id; });
    var distractPool = byTopic(data.filter(function (t) { return correctIds.indexOf(t.id) < 0; }), topics);
    if (distractPool.length < 4) distractPool = data.filter(function (t) { return correctIds.indexOf(t.id) < 0; });
    var distractors = sample(distractPool, Math.min(4, distractPool.length));
    options = shuffle(correctTerms.concat(distractors));
    selected = null;
    score = 0;
    if (resultEl) { resultEl.hidden = true; resultEl.innerHTML = ''; }
    setFeedback('Välj en fråga och klicka sedan på rätt begrepp.', null);
    render();
    updateStats();
  }

  function promptText(item, index) {
    if (mode === 'usage') return item.term.usage || item.term.definition || item.term.term;
    if (mode === 'mixed') return (index % 2 === 0) ? (item.term.definition || '') : (item.term.usage || item.term.definition || '');
    return item.term.definition || item.term.usage || '';
  }

  function render() {
    promptsEl.innerHTML = '';
    optionsEl.innerHTML = '';
    round.forEach(function (r, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'match-prompt' + (r.locked ? ' correct' : '') + (r.wrong ? ' wrong' : '');
      b.setAttribute('data-prompt', String(i));
      b.setAttribute('aria-pressed', selected === i ? 'true' : 'false');
      b.style.setProperty('--pair-color', r.color);
      if (r.locked) b.disabled = true;
      var label = mode === 'mixed' ? ((i % 2 === 0 ? 'Definition → ' : 'Användning → ') + 'begrepp') : (mode === 'usage' ? 'Användning → begrepp' : 'Definition → begrepp');
      b.innerHTML = '<span class="match-prompt-text">' + escapeHtml(promptText(r, i)) + '</span>'
        + '<span class="match-slot">' + (r.choice ? '✓ ' + escapeHtml(r.choice.term) : label) + '</span>';
      if (!r.locked) {
        b.addEventListener('click', function () {
          selected = i;
          setFeedback(r.choice ? 'Välj ett annat begrepp.' : 'Välj begreppet till höger.', null);
          render();
        });
      }
      var wrap = document.createElement('div');
      wrap.className = 'match-prompt-wrap';
      wrap.style.setProperty('--pair-color', r.color);
      wrap.appendChild(b);
      if (r.locked && r.term.source) {
        var source = document.createElement('a');
        source.className = 'match-source';
        source.href = 'course-material/' + encodeURIComponent(r.term.source) + (r.term.page ? '#page=' + r.term.page : '');
        source.target = '_blank';
        source.rel = 'noopener noreferrer';
        source.textContent = 'Kursmaterial s. ' + (r.term.page || 1) + ' ↗';
        wrap.appendChild(source);
      }
      promptsEl.appendChild(wrap);
    });
    options.forEach(function (t) {
      var assignedTo = -1;
      round.forEach(function (r, i) { if (r.choice && r.choice.id === t.id) assignedTo = i; });
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'match-option' + (assignedTo >= 0 ? ' used' : '');
      if (assignedTo >= 0 && round[assignedTo].locked) b.className += ' correct';
      if (assignedTo >= 0) b.style.setProperty('--pair-color', round[assignedTo].color);
      b.textContent = t.term;
      if (round.some(function (r) { return r.locked && r.term.id === t.id; })) b.disabled = true;
      b.addEventListener('click', function () { choose(t, b); });
      optionsEl.appendChild(b);
    });
    scheduleCables();
  }

  function choose(term, button) {
    if (selected === null) {
      setFeedback('Välj en fråga först.', false);
      return;
    }
    var r = round[selected];
    if (!r || r.locked) return;
    if (r.choice && r.choice.id === term.id) return;
    if (r.term.id === term.id) {
      r.choice = term;
      r.locked = true;
      r.wrong = false;
      term._used = true;
      streak += 1;
      best = Math.max(best, streak);
      var gain = 10 + Math.min(10, streak * 2);
      score += gain;
      seen[r.term.id] = true;
      saveSeen();
      try { localStorage.setItem('etsn11-match-best', String(best)); } catch (e) {}
      try { localStorage.setItem('etsn11-match-streak', String(streak)); } catch (e) {}
      var milestone = streakMilestone(streak);
      if (milestone) {
        score += milestone.bonus;
        setTimeout(function () { showStreakMilestone(streak, milestone); }, 120);
      }
      setFeedback('Rätt! +' + gain + ' p' + (milestone ? ' · milstolpe +' + milestone.bonus + ' p' : '') + '. ' + r.term.term, true);
      sparkBurst(button);
      selected = null;
      for (var i = 0; i < round.length; i++) {
        if (!round[i].locked) { selected = i; break; }
      }
      render();
      updateStats();
      if (doneCount() === round.length) finish();
    } else {
      r.wrong = true;
      streak = 0;
      try { localStorage.setItem('etsn11-match-streak', '0'); } catch (e) {}
      setFeedback('Inte rätt den här gången. Streak nollställd – försök igen.', false);
      button.classList.add('wrong');
      setTimeout(function () {
        r.wrong = false;
        button.classList.remove('wrong');
        render();
      }, 420);
      updateStats();
    }
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  function sparkBurst(el) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var r = el.getBoundingClientRect();
    var box = document.createElement('span');
    box.className = 'match-sparks';
    box.style.left = (r.left + r.width / 2) + 'px';
    box.style.top = (r.top + r.height / 2) + 'px';
    for (var i = 0; i < 10; i++) {
      var p = document.createElement('i');
      var a = Math.random() * Math.PI * 2;
      var d = 16 + Math.random() * 30;
      p.style.setProperty('--dx', Math.cos(a) * d + 'px');
      p.style.setProperty('--dy', Math.sin(a) * d + 'px');
      p.style.background = i % 2 ? '#d99a2b' : '#0b6f7a';
      box.appendChild(p);
    }
    document.body.appendChild(box);
    setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 650);
  }

  function scheduleCables() {
    if (cableRaf) return;
    cableRaf = requestAnimationFrame(function () {
      cableRaf = 0;
      drawCables();
    });
  }

  function clearCables() {
    if (cablesEl) cablesEl.innerHTML = '';
    cableGroups = {};
  }

  function makeSvgEl(name, attrs) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.keys(attrs).forEach(function (k) { el.setAttribute(k, String(attrs[k])); });
    return el;
  }

  function drawCables() {
    if (!cablesEl || !boardEl) return;
    var wide = window.innerWidth > 760;
    if (!wide) return;
    var br = boardEl.getBoundingClientRect();
    cablesEl.setAttribute('viewBox', '0 0 ' + Math.max(1, br.width) + ' ' + Math.max(1, br.height));
    cablesEl.setAttribute('width', String(Math.max(1, br.width)));
    cablesEl.setAttribute('height', String(Math.max(1, br.height)));
    var active = {};

    round.forEach(function (r, i) {
      if (!r.locked) return;
      var p = promptsEl.querySelector('[data-prompt="' + i + '"]');
      var opts = optionsEl.querySelectorAll('.match-option');
      var o = null;
      for (var k = 0; k < opts.length; k++) {
        if (opts[k].textContent === r.term.term) { o = opts[k]; break; }
      }
      if (!p || !o) return;
      var pr = p.getBoundingClientRect(), or = o.getBoundingClientRect();
      var x1 = pr.right - br.left, y1 = pr.top + pr.height / 2 - br.top;
      var x2 = or.left - br.left, y2 = or.top + or.height / 2 - br.top;
      var dx = Math.max(40, Math.abs(x2 - x1) * 0.42);
      var d = 'M ' + x1 + ' ' + y1 + ' C ' + (x1 + dx) + ' ' + y1 + ', ' + (x2 - dx) + ' ' + y2 + ', ' + x2 + ' ' + y2;
      var key = r.term.id;
      active[key] = true;
      var g = cableGroups[key];
      var isNew = !g;
      if (!g) {
        g = makeSvgEl('g', { 'data-cable': key });
        var path = makeSvgEl('path', {
          fill: 'none', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.72
        });
        var c1 = makeSvgEl('circle', { r: 3.5, opacity: 0.9 });
        var c2 = makeSvgEl('circle', { r: 3.5, opacity: 0.9 });
        var pulse = makeSvgEl('circle', { r: 6, fill: 'none', 'stroke-width': 2, opacity: 0.7, class: 'cable-pulse' });
        g.appendChild(path); g.appendChild(c1); g.appendChild(c2); g.appendChild(pulse);
        cablesEl.appendChild(g);
        cableGroups[key] = { g: g, path: path, c1: c1, c2: c2, pulse: pulse, drawn: false };
        g._new = true;
      } else {
        g.path = g.path; // existing
      }
      var group = cableGroups[key];
      group.path.setAttribute('d', d);
      group.path.setAttribute('stroke', r.color);
      group.path.style.filter = 'drop-shadow(0 0 4px ' + r.color + ')';
      group.c1.setAttribute('cx', x1); group.c1.setAttribute('cy', y1); group.c1.setAttribute('fill', r.color);
      group.c2.setAttribute('cx', x2); group.c2.setAttribute('cy', y2); group.c2.setAttribute('fill', r.color);
      group.pulse.setAttribute('cx', x2); group.pulse.setAttribute('cy', y2);
      group.pulse.setAttribute('stroke', r.color);
      if (!group.drawn) {
        group.drawn = true;
        var len = 0;
        try { len = group.path.getTotalLength(); } catch (e) {}
        if (len) {
          group.path.style.strokeDasharray = len + ' ' + len;
          group.path.style.strokeDashoffset = String(len);
          group.path.style.animation = 'cableDraw .5s ease forwards';
        }
      }
    });

    Object.keys(cableGroups).forEach(function (key) {
      if (!active[key]) {
        var g = cableGroups[key].g;
        if (g.parentNode) g.parentNode.removeChild(g);
        delete cableGroups[key];
      }
    });
  }

  function streakMilestone(n) {
    if (n === 3) return { title: '3 I RAD', sub: 'Snyggt! Nu är du igång.', bonus: 20, cls: 'streak-3' };
    if (n === 5) return { title: '5 I RAD', sub: 'Fem rätt i rad – imponerande!', bonus: 40, cls: 'streak-5' };
    if (n === 10) return { title: 'NÄTVERKSLEGEND', sub: '10 i rad. Du äger nätet.', bonus: 100, cls: 'streak-10' };
    if (n > 10 && n % 5 === 0) return { title: n + ' I RAD', sub: 'Ännu en milstolpe.', bonus: 50, cls: 'streak-5' };
    return null;
  }

  function showStreakMilestone(n, m) {
    var banner = document.createElement('div');
    banner.className = 'streak-banner ' + m.cls;
    banner.setAttribute('role', 'status');
    banner.innerHTML = '<div class="streak-kicker">STREAK</div>'
      + '<div class="streak-title">' + escapeHtml(m.title) + '</div>'
      + '<div class="streak-sub">' + escapeHtml(m.sub) + ' <strong>+' + m.bonus + ' p</strong></div>';
    document.body.appendChild(banner);
    if (!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      sparkBurst(banner);
      if (m.cls === 'streak-10') {
        setTimeout(function () { sparkBurst(banner); }, 180);
        setTimeout(function () { sparkBurst(banner); }, 360);
      }
    }
    setTimeout(function () { if (banner.parentNode) banner.parentNode.removeChild(banner); }, 2400);
  }

  function finish() {
    if (!resultEl) return;
    resultEl.hidden = false;
    resultEl.innerHTML = '<h3>Snyggt! Alla par är matchade.</h3>'
      + '<p>Du fick <strong>' + score + ' poäng</strong> och är på <strong>' + streak + ' i rad</strong>.</p>'
      + '<p style="margin-top:6px"><button type="button" class="match-new" data-match-again>Kör en ny runda</button></p>';
    var again = resultEl.querySelector('[data-match-again]');
    if (again) again.addEventListener('click', makeRound);
  }

  modeButtons.forEach(function (b) {
    b.addEventListener('click', function () {
      mode = b.getAttribute('data-match-mode');
      modeButtons.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      makeRound();
    });
  });
  if (newBtn) newBtn.addEventListener('click', makeRound);
  window.addEventListener('resize', scheduleCables);
  document.addEventListener('scroll', scheduleCables, true);
  makeRound();
})();
