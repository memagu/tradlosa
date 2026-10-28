(function () {
  function setupSwitcher(switcher) {
    var buttons = Array.prototype.slice.call(switcher.querySelectorAll('[data-panel-target]'));
    if (!buttons.length) return;
    var scope = switcher.closest('[data-switch-scope]') || document;
    var panels = Array.prototype.slice.call(scope.querySelectorAll('.switch-panel'));

    function show(id, scroll) {
      var found = false;
      panels.forEach(function (panel) {
        var on = panel.id === id;
        panel.hidden = !on;
        if (on) found = true;
      });
      if (!found) return false;
      buttons.forEach(function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-panel-target') === id ? 'true' : 'false');
      });
      window.dispatchEvent(new Event('resize'));
      if (scroll) {
        var el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return true;
    }

    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        show(b.getAttribute('data-panel-target'), true);
      });
    });

    var initial = buttons[0].getAttribute('data-panel-target');
    if (window.location.hash) {
      var hash = window.location.hash.slice(1);
      if (panels.some(function (p) { return p.id === hash; })) initial = hash;
    }
    show(initial, false);
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-switcher]'), setupSwitcher);

  // Category tabs: keep the selected exam/set when switching back.
  Array.prototype.forEach.call(document.querySelectorAll('.tab[role="tab"]'), function (tab) {
    tab.addEventListener('click', function () {
      window.dispatchEvent(new Event('resize'));
    });
  });

  // Make the current category panel's switcher buttons keyboard friendly.
  Array.prototype.forEach.call(document.querySelectorAll('[data-switcher]'), function (sw) {
    sw.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var buttons = Array.prototype.slice.call(sw.querySelectorAll('[data-panel-target]'));
      var i = buttons.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      var next = buttons[(i + (e.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length];
      next.focus();
      next.click();
    });
  });
})();

// Fill every point checkbox in a question in one click.
document.addEventListener('click', function (e) {
  var btn = e.target.closest ? e.target.closest('[data-score-all]') : null;
  if (!btn) return;
  var card = btn.closest('.qcard');
  if (!card) return;
  var inputs = card.querySelectorAll('.pt-input');
  var first = null;
  Array.prototype.forEach.call(inputs, function (inp) {
    if (!inp.checked) {
      inp.checked = true;
      if (!first) first = inp;
    }
  });
  if (first) {
    first.dispatchEvent(new Event('change', { bubbles: true }));
  }
});

// Jump from an "Alla frågor" card to the correct exam/set and question.
document.addEventListener('click', function (e) {
  var btn = e.target.closest ? e.target.closest('[data-open-all-question]') : null;
  if (!btn) return;
  var tab = document.getElementById(btn.getAttribute('data-tab'));
  if (tab) tab.click();
  var target = btn.getAttribute('data-panel');
  var switchBtn = document.querySelector('[data-panel-target="' + target + '"]');
  if (switchBtn) switchBtn.click();
  var cardId = btn.getAttribute('data-card');
  window.requestAnimationFrame(function () {
    window.requestAnimationFrame(function () {
      var card = document.getElementById(cardId);
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
});
