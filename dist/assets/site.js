/* Unibind Technologies · progressive enhancements.
   Every page reads fully with JavaScript disabled. */
(() => {
  'use strict';

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- fixed menu button + full screen overlay ---------- */
  const button = document.querySelector('.menu-button');
  const overlay = document.querySelector('.menu-overlay');
  if (button && overlay) {
    const links = overlay.querySelectorAll('a');
    overlay.querySelectorAll('.menu-nav li').forEach((li, i) => li.style.setProperty('--i', i));
    let lastFocus = null;

    const setOpen = open => {
      overlay.classList.toggle('is-open', open);
      overlay.toggleAttribute('inert', !open);
      button.setAttribute('aria-expanded', String(open));
      button.querySelector('.menu-word').textContent = open ? 'Close' : 'Menu';
      document.body.classList.toggle('menu-open', open);
      if (open) {
        lastFocus = document.activeElement;
        (links[0] || overlay).focus({ preventScroll: true });
      } else if (lastFocus) {
        lastFocus.focus({ preventScroll: true });
      }
    };

    overlay.setAttribute('inert', '');
    button.addEventListener('click', () => setOpen(!overlay.classList.contains('is-open')));
    overlay.addEventListener('click', e => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && overlay.classList.contains('is-open')) setOpen(false);
      if (e.key === 'Tab' && overlay.classList.contains('is-open')) {
        const focusables = [...overlay.querySelectorAll('a, button')].filter(el => el.offsetParent !== null);
        const list = [button, ...focusables];
        const index = list.indexOf(document.activeElement);
        if (e.shiftKey && index <= 0) { e.preventDefault(); list[list.length - 1].focus(); }
        else if (!e.shiftKey && index === list.length - 1) { e.preventDefault(); list[0].focus(); }
      }
    });
  }

  /* ---------- scroll reveal + chart arming ---------- */
  const revealables = document.querySelectorAll('[data-reveal]');
  const charts = document.querySelectorAll('.chart-arm');
  if (!reducedMotion && 'IntersectionObserver' in window) {
    charts.forEach(chart => chart.classList.add('chart-pending'));
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.replace('reveal-pending', 'reveal-visible');
        entry.target.querySelectorAll('.chart-pending').forEach(c => c.classList.remove('chart-pending'));
        if (entry.target.classList.contains('chart-pending')) entry.target.classList.remove('chart-pending');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' });
    revealables.forEach((el, index) => {
      if (el.getBoundingClientRect().top <= innerHeight) {
        el.querySelectorAll('.chart-pending').forEach(c => c.classList.remove('chart-pending'));
        return;
      }
      el.style.setProperty('--reveal-delay', `${(index % 3) * 90}ms`);
      el.classList.add('reveal-pending');
      io.observe(el);
    });
    charts.forEach(chart => {
      if (!chart.closest('[data-reveal]')) io.observe(chart);
    });
  }

  /* ---------- chart hover tooltips ---------- */
  const tipTargets = document.querySelectorAll('.chart [data-tip]');
  if (tipTargets.length) {
    const tip = document.createElement('div');
    tip.className = 'chart-tip';
    tip.setAttribute('role', 'status');
    document.body.append(tip);
    const show = (target, x, y) => {
      tip.innerHTML = target.dataset.tip;
      tip.classList.add('is-visible');
      const w = tip.offsetWidth;
      const left = Math.min(Math.max(8, x - w / 2), innerWidth - w - 8);
      tip.style.left = `${left}px`;
      tip.style.top = `${Math.max(8, y - tip.offsetHeight - 14)}px`;
    };
    tipTargets.forEach(target => {
      target.addEventListener('pointermove', e => show(target, e.clientX, e.clientY));
      target.addEventListener('pointerleave', () => tip.classList.remove('is-visible'));
      target.addEventListener('focus', () => {
        const r = target.getBoundingClientRect();
        show(target, r.left + r.width / 2, r.top);
      });
      target.addEventListener('blur', () => tip.classList.remove('is-visible'));
    });
    addEventListener('scroll', () => tip.classList.remove('is-visible'), { passive: true });
  }

  /* ---------- cover size finder ---------- */
  const finder = document.querySelector('[data-finder]');
  if (finder) {
    const input = finder.querySelector('input');
    const output = finder.querySelector('[role="status"]');
    const sizes = JSON.parse(finder.dataset.sizes).sort((a, b) => a - b);
    const types = JSON.parse(finder.dataset.types);
    const max = sizes[sizes.length - 1];
    const line = (tag, text) => { const el = document.createElement(tag); el.textContent = text; return el; };
    input.addEventListener('input', () => {
      const raw = input.value.trim();
      const count = Number(raw);
      input.removeAttribute('aria-invalid');
      if (!raw && !input.validity.badInput) { output.textContent = 'Enter a sheet count to see a size recommendation.'; return; }
      if (!Number.isFinite(count) || !Number.isInteger(count) || count < 1 || input.validity.badInput) {
        output.textContent = `Enter a whole number from 1 to ${max}.`;
        input.setAttribute('aria-invalid', 'true');
        return;
      }
      if (count > max) {
        output.textContent = `The stated range holds up to ${max} sheets. Book an assessment to plan this record.`;
        input.setAttribute('aria-invalid', 'true');
        return;
      }
      const size = sizes.find(v => v >= count);
      output.replaceChildren(
        line('span', 'Recommended spine size'),
        line('strong', `${size} sheets`),
        line('p', 'Cover types available in the stated range:')
      );
      const list = document.createElement('ul');
      types.forEach(t => list.append(line('li', t)));
      output.append(list);
    });
  }

  /* ---------- assessment form (Netlify Forms) ---------- */
  const form = document.querySelector('.assessment-form');
  if (form) {
    const status = form.querySelector('.form-status');
    const submit = form.querySelector('button[type="submit"]');
    let sending = false;
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (sending || !form.reportValidity()) return;
      const data = new FormData(form);
      if (data.get('bot-field')) return;
      sending = true;
      submit.disabled = true;
      status.textContent = 'Sending your request…';
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch('/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(data),
          signal: controller.signal
        });
        if (!response.ok) throw new Error('rejected');
        const heading = document.createElement('h3');
        heading.textContent = 'Your assessment request has been received.';
        const body = document.createElement('p');
        body.textContent = 'We will contact you using the details you supplied to arrange the thirty minute conversation.';
        status.replaceChildren(heading, body);
        [...form.children].forEach(el => { if (el !== status) el.hidden = true; });
        status.setAttribute('tabindex', '-1');
        status.focus();
      } catch {
        status.textContent = 'Your request could not be sent. Please try again, or book by email or phone using the details on this page.';
      } finally {
        clearTimeout(timer);
        sending = false;
        submit.disabled = false;
      }
    });
  }
})();
