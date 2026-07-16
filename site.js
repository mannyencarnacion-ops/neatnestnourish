/* ============================================================
   Neat Nest & Nourish — site.js
   Built by ShopMora · 2026-07-16
   Vanilla JS, no dependencies.
   ============================================================ */
(function () {
  'use strict';

  /* ==========================================================
     CONFIG — the only thing that needs filling in.
     ----------------------------------------------------------
     ACCESS_KEY: the Web3Forms access key. The Shopify build
     already used Web3Forms; reuse that same key so DJ's inbox
     doesn't change. Find it in the old theme at
     assets/nnn-theme.js (search "access_key"), or generate a
     fresh one free at https://web3forms.com using DJ's email.

     Until this is filled in, both forms refuse to submit and
     tell the visitor to call instead — they never silently fail.
     ========================================================== */
  var CONFIG = {
    ACCESS_KEY: '',                                   // <-- PASTE WEB3FORMS ACCESS KEY
    ENDPOINT: 'https://api.web3forms.com/submit',
    PHONE_DISPLAY: '774·234·7307',
    PHONE_HREF: '+17742347307'
  };

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ==========================================================
     Footer year
     ========================================================== */
  var yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ==========================================================
     Sticky header shadow
     ========================================================== */
  var header = $('.site-header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-stuck', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ==========================================================
     Mobile menu
     ========================================================== */
  var toggle = $('.menu-toggle');
  var mobileNav = $('#mobile-nav');
  if (toggle && mobileNav) {
    var setMenu = function (open) {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      mobileNav.hidden = !open;
    };
    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });
    mobileNav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        toggle.focus();
      }
    });
  }

  /* ==========================================================
     Reveal on scroll
     ========================================================== */
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revealEls = $$('.reveal');
  if (reduced || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var revObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        revObs.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function (el) { revObs.observe(el); });
  }

  /* ==========================================================
     Stat count-up
     Numbers render server-side already (5.0 / 100% / 1), so if
     JS never runs the visitor still sees real values.
     ========================================================== */
  var statEls = $$('.stat-num');
  var animateStat = function (el) {
    var target = parseFloat(el.dataset.target || '0');
    var decimals = parseInt(el.dataset.decimals || '0', 10);
    var suffix = el.dataset.suffix || '';
    if (reduced) { el.textContent = target.toFixed(decimals) + suffix; return; }
    var start = performance.now();
    var dur = 1300;
    var tick = function (now) {
      var p = Math.min((now - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = target.toFixed(decimals) + suffix;
    };
    requestAnimationFrame(tick);
  };
  if ('IntersectionObserver' in window && statEls.length) {
    var statObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        animateStat(entry.target);
        statObs.unobserve(entry.target);
      });
    }, { threshold: 0.5 });
    statEls.forEach(function (el) { statObs.observe(el); });
  }

  /* ==========================================================
     Scroll-spy on nav
     ========================================================== */
  var navLinks = $$('.nav-list a');
  var spyTargets = navLinks
    .map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); })
    .filter(Boolean);
  if ('IntersectionObserver' in window && spyTargets.length) {
    var spyObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    spyTargets.forEach(function (t) { spyObs.observe(t); });
  }

  /* ==========================================================
     Form helpers
     ========================================================== */
  var setErr = function (input, msg) {
    var key = input.id || input.getAttribute('name');
    var box = $('[data-err-for="' + key + '"]');
    if (msg) {
      input.setAttribute('aria-invalid', 'true');
      if (box) { box.textContent = msg; box.hidden = false; }
    } else {
      input.removeAttribute('aria-invalid');
      if (box) { box.textContent = ''; box.hidden = true; }
    }
  };

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  var validate = function (form) {
    var problems = [];
    $$('input, textarea', form).forEach(function (el) {
      if (el.type === 'hidden' || el.classList.contains('honey') || el.type === 'radio') return;
      setErr(el, '');
      var v = (el.value || '').trim();
      if (el.hasAttribute('required') && !v) {
        setErr(el, 'This field is required.');
        problems.push(el);
        return;
      }
      if (el.type === 'email' && v && !EMAIL_RE.test(v)) {
        setErr(el, 'Please check this email address.');
        problems.push(el);
      }
      if (el.type === 'tel' && v && v.replace(/\D/g, '').length < 10) {
        setErr(el, 'Please enter a 10-digit phone number.');
        problems.push(el);
      }
    });
    return problems;
  };

  var setStatus = function (el, msg, kind) {
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('is-ok', 'is-err');
    if (kind) el.classList.add(kind);
  };

  var busy = function (btn, on, labelWhenBusy) {
    if (!on) {
      btn.classList.remove('is-busy');
      btn.textContent = btn.dataset.label || btn.textContent;
      btn.disabled = false;
      return;
    }
    btn.dataset.label = btn.dataset.label || btn.textContent;
    btn.classList.add('is-busy');
    btn.textContent = labelWhenBusy;
  };

  /* Posts to Web3Forms. Returns a promise that resolves true on success. */
  var send = function (payload) {
    if (!CONFIG.ACCESS_KEY) {
      return Promise.reject(new Error('NOT_CONFIGURED'));
    }
    payload.access_key = CONFIG.ACCESS_KEY;
    return fetch(CONFIG.ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data || data.success !== true) throw new Error(data && data.message ? data.message : 'SEND_FAILED');
        return true;
      });
  };

  var FALLBACK_MSG = 'Something went wrong sending that. Please call or text ' + CONFIG.PHONE_DISPLAY + ' and we will take care of you.';

  /* ==========================================================
     ESTIMATE WIZARD
     ----------------------------------------------------------
     Pricing replicates the original Shopify build exactly
     (verified against the live site 2026-07-16):
       low  = round(base_low  * (1 - discount)) + addons
       high = round(base_high * (1 - discount)) + addons
     Home size is captured for the quote but does NOT change the
     range — final price is set at consultation.
     ========================================================== */
  var wizard = $('#wizard');
  if (wizard) {
    var steps = $$('.wiz-step', wizard);
    var backBtn = $('#wizBack');
    var nextBtn = $('#wizNext');
    var progress = $('#wizProgress');
    var fill = $('#wizFill');
    var bar = $('.wizard-bar', wizard);
    var result = $('#estResult');

    var LABELS = ['The Service', 'Your Home', 'Frequency', 'Finishing Touches', 'Timing'];
    var current = 0;
    var answers = { service: null, size: null, freq: null, addons: [], timing: null };

    var renderStep = function () {
      steps.forEach(function (s, i) { s.hidden = i !== current; });
      progress.textContent = 'Step ' + (current + 1) + ' of ' + steps.length + ' — ' + LABELS[current];
      fill.style.width = ((current + 1) / steps.length) * 100 + '%';
      bar.setAttribute('aria-valuenow', String(current + 1));
      backBtn.hidden = current === 0;
      nextBtn.textContent = current === steps.length - 1 ? 'Reveal my estimate' : 'Continue';
      nextBtn.disabled = !stepAnswered();
    };

    var stepAnswered = function () {
      if (current === 0) return !!answers.service;
      if (current === 1) return !!answers.size;
      if (current === 2) return !!answers.freq;
      if (current === 3) return answers.addons.length > 0;
      if (current === 4) return !!answers.timing;
      return false;
    };

    // Single-select steps
    [0, 1, 2, 4].forEach(function (idx) {
      $$('.opt', steps[idx]).forEach(function (btn) {
        btn.addEventListener('click', function () {
          $$('.opt', steps[idx]).forEach(function (b) { b.classList.remove('is-selected'); });
          btn.classList.add('is-selected');
          if (idx === 0) {
            answers.service = {
              value: btn.dataset.value,
              low: parseInt(btn.dataset.low, 10),
              high: parseInt(btn.dataset.high, 10),
              plus: btn.dataset.plus === '1',
              window: btn.dataset.window
            };
          }
          if (idx === 1) answers.size = btn.dataset.value;
          if (idx === 2) answers.freq = { value: btn.dataset.value, discount: parseFloat(btn.dataset.discount) };
          if (idx === 4) answers.timing = btn.dataset.value;
          nextBtn.disabled = false;
        });
      });
    });

    // Multi-select add-ons (with a mutually-exclusive "None")
    $$('.opt-multi', steps[3]).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var isNone = btn.dataset.none === '1';
        var on = !btn.classList.contains('is-selected');

        if (isNone) {
          $$('.opt-multi', steps[3]).forEach(function (b) {
            b.classList.remove('is-selected');
            b.setAttribute('aria-pressed', 'false');
          });
          if (on) { btn.classList.add('is-selected'); btn.setAttribute('aria-pressed', 'true'); }
        } else {
          var none = $('.opt-none', steps[3]);
          none.classList.remove('is-selected');
          none.setAttribute('aria-pressed', 'false');
          btn.classList.toggle('is-selected', on);
          btn.setAttribute('aria-pressed', String(on));
        }

        answers.addons = $$('.opt-multi.is-selected', steps[3]).map(function (b) {
          return { value: b.dataset.value, price: parseInt(b.dataset.price || '0', 10), none: b.dataset.none === '1' };
        });
        nextBtn.disabled = !stepAnswered();
      });
    });

    var money = function (n) { return '$' + n.toLocaleString('en-US'); };

    var calculate = function () {
      var s = answers.service;
      var discount = answers.freq.discount || 0;
      var addonTotal = answers.addons.reduce(function (sum, a) { return sum + (a.none ? 0 : a.price); }, 0);
      var low = Math.round(s.low * (1 - discount)) + addonTotal;
      var high = Math.round(s.high * (1 - discount)) + addonTotal;
      return { low: low, high: high, addonTotal: addonTotal, discount: discount };
    };

    var showResult = function () {
      var calc = calculate();
      var s = answers.service;

      $('#estPrice').innerHTML =
        '<span class="est-amount">' + money(calc.low) + '–' + money(calc.high) + (s.plus ? '+' : '') + '</span>' +
        '<span class="est-per">per visit</span>';

      var note = $('#estNote');
      if (calc.discount > 0) {
        note.textContent = Math.round(calc.discount * 100) + '% ' + answers.freq.value.toLowerCase() +
          ' savings applied — standard rate ' + money(s.low) + '–' + money(s.high) + (s.plus ? '+' : '') + ' before touches.';
        note.hidden = false;
      } else {
        note.textContent = '';
        note.hidden = true;
      }

      var touches = answers.addons.filter(function (a) { return !a.none; });
      var touchText = touches.length
        ? touches.map(function (a) { return a.value + ' (+' + money(a.price) + ')'; }).join(', ')
        : 'None';

      $('#estSummary').innerHTML =
        '<dt>Service</dt><dd>' + s.value + '</dd>' +
        '<dt>Residence</dt><dd>' + answers.size + '</dd>' +
        '<dt>Cadence</dt><dd>' + answers.freq.value + (calc.discount > 0 ? ' · ' + Math.round(calc.discount * 100) + '% saved' : '') + '</dd>' +
        '<dt>Finishing touches</dt><dd>' + touchText + '</dd>' +
        '<dt>Timing</dt><dd>' + answers.timing + '</dd>';

      $('#estFine').textContent =
        'Includes ' + s.window + ' of labor; additional time is $75/hr. Your final quote depends on your ' +
        "home's size and condition, confirmed after a brief consultation.";

      wizard.hidden = true;
      result.hidden = false;
      result.focus({ preventScroll: true });
      result.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    };

    nextBtn.addEventListener('click', function () {
      if (!stepAnswered()) return;
      if (current === steps.length - 1) { showResult(); return; }
      current++;
      renderStep();
    });

    backBtn.addEventListener('click', function () {
      if (current === 0) return;
      current--;
      renderStep();
    });

    var restart = $('#estRestart');
    if (restart) {
      restart.addEventListener('click', function () {
        answers = { service: null, size: null, freq: null, addons: [], timing: null };
        $$('.opt', wizard).forEach(function (b) {
          b.classList.remove('is-selected');
          if (b.hasAttribute('aria-pressed')) b.setAttribute('aria-pressed', 'false');
        });
        var f = $('#estForm');
        if (f) { f.reset(); f.hidden = false; }
        setStatus($('#estStatus'), '');
        current = 0;
        result.hidden = true;
        wizard.hidden = false;
        renderStep();
        wizard.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      });
    }

    renderStep();

    /* ---- Estimate form submit ---- */
    var estForm = $('#estForm');
    if (estForm) {
      estForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var status = $('#estStatus');
        var btn = $('#estSubmit');

        if (estForm.querySelector('[name="_gotcha"]').value) return;   // bot

        var problems = validate(estForm);
        if (problems.length) {
          setStatus(status, 'Please check the highlighted fields.', 'is-err');
          problems[0].focus();
          return;
        }

        var calc = calculate();
        var touches = answers.addons.filter(function (a) { return !a.none; });

        busy(btn, true, 'Sending…');
        setStatus(status, '');

        send({
          subject: 'New estimate request — ' + $('#ef-name').value.trim() + ' (' + answers.service.value + ')',
          from_name: 'Neat Nest & Nourish website',
          name: $('#ef-name').value.trim(),
          email: $('#ef-email').value.trim(),
          phone: $('#ef-phone').value.trim() || '—',
          service_address: $('#ef-address').value.trim() || '—',
          notes: $('#ef-notes').value.trim() || '—',
          service: answers.service.value,
          residence: answers.size,
          cadence: answers.freq.value,
          finishing_touches: touches.length ? touches.map(function (a) { return a.value; }).join(', ') : 'None',
          timing: answers.timing,
          quoted_range: '$' + calc.low + '–$' + calc.high + (answers.service.plus ? '+' : '') + ' per visit',
          labor_window: answers.service.window
        })
          .then(function () {
            estForm.hidden = true;
            setStatus(status, '', null);
            var ok = document.createElement('div');
            ok.className = 'form-status is-ok';
            ok.setAttribute('role', 'status');
            ok.innerHTML = '<strong>Thank you — your estimate is on its way.</strong><br>' +
              'We have your details and will reply personally, usually within one business day. ' +
              'For anything urgent, call or text <a href="tel:' + CONFIG.PHONE_HREF + '">' + CONFIG.PHONE_DISPLAY + '</a>.';
            estForm.parentNode.insertBefore(ok, estForm);
          })
          .catch(function (err) {
            busy(btn, false);
            if (err.message === 'NOT_CONFIGURED') {
              setStatus(status, 'This form is not connected yet. Please call or text ' + CONFIG.PHONE_DISPLAY + '.', 'is-err');
            } else {
              setStatus(status, FALLBACK_MSG, 'is-err');
            }
          });
      });
    }
  }

  /* ==========================================================
     REVIEW FORM
     ----------------------------------------------------------
     The old build wrote reviews to localStorage only, so they
     were visible to nobody but the person typing them and the
     owner never saw them. This emails the review to DJ for
     approval. Nothing publishes automatically.
     ========================================================== */
  var revForm = $('#revForm');
  if (revForm) {
    revForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var status = $('#revStatus');
      var btn = $('#revSubmit');

      if (revForm.querySelector('[name="_gotcha"]').value) return;   // bot

      var problems = validate(revForm);

      var rating = revForm.querySelector('input[name="rating"]:checked');
      var rateErr = $('[data-err-for="revStars"]');
      if (!rating) {
        if (rateErr) { rateErr.textContent = 'Please choose a star rating.'; rateErr.hidden = false; }
        problems.unshift(revForm.querySelector('input[name="rating"]'));
      } else if (rateErr) {
        rateErr.textContent = ''; rateErr.hidden = true;
      }

      if (problems.length) {
        setStatus(status, 'Please check the highlighted fields.', 'is-err');
        problems[0].focus();
        return;
      }

      busy(btn, true, 'Sending…');
      setStatus(status, '');

      send({
        subject: 'New review (' + rating.value + '★) — ' + $('#rv-name').value.trim(),
        from_name: 'Neat Nest & Nourish website',
        reviewer: $('#rv-name').value.trim(),
        rating: rating.value + ' out of 5',
        relationship: $('#rv-role').value.trim() || '—',
        review: $('#rv-body').value.trim(),
        note_to_owner: 'This review was submitted from the website and is NOT published. Reply to approve, then add it to the Reviews section.'
      })
        .then(function () {
          revForm.hidden = true;
          var ok = document.createElement('div');
          ok.className = 'form-status is-ok';
          ok.setAttribute('role', 'status');
          ok.innerHTML = '<strong>Thank you for the kind words.</strong><br>' +
            'Your review has been sent to us personally. We will be in touch before publishing anything.';
          revForm.parentNode.insertBefore(ok, revForm);
        })
        .catch(function (err) {
          busy(btn, false);
          if (err.message === 'NOT_CONFIGURED') {
            setStatus(status, 'This form is not connected yet. Please call or text ' + CONFIG.PHONE_DISPLAY + '.', 'is-err');
          } else {
            setStatus(status, FALLBACK_MSG, 'is-err');
          }
        });
    });
  }
})();
