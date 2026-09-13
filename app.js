document.addEventListener('DOMContentLoaded', () => {

  const reduceMotionEarly = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pointerFine = window.matchMedia('(pointer:fine)').matches;

  // ---- preloader ----
  const preloader = document.getElementById('preloader');
  function hidePreloader() {
    if (!preloader) return;
    preloader.classList.add('hide');
    setTimeout(() => preloader.remove(), 700);
  }
  if (preloader) {
    if (document.readyState === 'complete') {
      setTimeout(hidePreloader, 250);
    } else {
      window.addEventListener('load', () => setTimeout(hidePreloader, 250));
      setTimeout(hidePreloader, 2200); // safety fallback so it never gets stuck
    }
  }

  // ---- unified scroll handler ----
  // progress bar, nav shrink, orb parallax and back-to-top used to be 4
  // separate scroll listeners each reading/writing layout independently,
  // which meant up to 4 style recalculations per scroll event. They're
  // batched into a single rAF-throttled tick here instead.
  const progressBar = document.getElementById('scrollProgress');
  const navEl = document.querySelector('.nav');
  const orbsWrap = document.querySelector('.bg-orbs');
  const backTop = document.querySelector('.back-top');
  const docEl = document.documentElement;
  let scrollTicking = false;
  function applyScrollFx() {
    scrollTicking = false;
    const scrolled = docEl.scrollTop || document.body.scrollTop;
    const max = docEl.scrollHeight - docEl.clientHeight;
    if (progressBar) progressBar.style.width = (max > 0 ? (scrolled / max) * 100 : 0) + '%';
    if (navEl) navEl.classList.toggle('scrolled', scrolled > 40);
    if (orbsWrap && !reduceMotionEarly) orbsWrap.style.transform = `translateY(${scrolled * 0.12}px)`;
    if (backTop) backTop.classList.toggle('show', scrolled > 600);
  }
  function onScroll() {
    if (!scrollTicking) {
      scrollTicking = true;
      requestAnimationFrame(applyScrollFx);
    }
  }
  applyScrollFx();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  // ---- custom cursor (desktop / fine pointer only) ----
  if (pointerFine && !reduceMotionEarly) {
    const dot = document.getElementById('cursorDot');
    const ring = document.getElementById('cursorRing');
    if (dot && ring) {
      document.body.classList.add('has-cursor');
      let rx = window.innerWidth / 2, ry = window.innerHeight / 2, tx = rx, ty = ry;
      window.addEventListener('mousemove', (e) => {
        tx = e.clientX; ty = e.clientY;
        dot.style.left = tx + 'px'; dot.style.top = ty + 'px';
      }, { passive: true });
      (function trail() {
        rx += (tx - rx) * 0.18; ry += (ty - ry) * 0.18;
        ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
        requestAnimationFrame(trail);
      })();
      document.addEventListener('mousedown', () => document.body.classList.add('cursor-down'));
      document.addEventListener('mouseup', () => document.body.classList.remove('cursor-down'));
      const hoverables = 'a, button, .gallery-item, .team-card, input, textarea, summary, [data-copy]';
      document.addEventListener('mouseover', (e) => {
        if (e.target.closest(hoverables)) document.body.classList.add('cursor-hover');
      });
      document.addEventListener('mouseout', (e) => {
        if (e.target.closest(hoverables) && !e.relatedTarget?.closest?.(hoverables)) {
          document.body.classList.remove('cursor-hover');
        }
      });
    }
  }

  // ================= CONFIG =================
  const DISCORD_INVITE_CODE = 'uTuaEzFpr';
  // If Server Settings → Widget → Enable Server Widget is on, set the guild
  // id below to also pull real usernames for the "online now" list.
  const DISCORD_GUILD_ID = ''; // e.g. '123456789012345678'
  // ============================================

  // ---- lightweight synthesized UI sound effects (no audio files needed) ----
  const SoundFX = (() => {
    let ctx = null;
    let enabled = localStorage.getItem('pgc-sound') !== 'off';
    function ensureCtx() {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function tone({ freq = 600, dur = 0.08, type = 'sine', gain = 0.05, slideTo = null, delay = 0 }) {
      if (!enabled) return;
      try {
        const c = ensureCtx();
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, c.currentTime + delay);
        if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + delay + dur);
        g.gain.setValueAtTime(0, c.currentTime + delay);
        g.gain.linearRampToValueAtTime(gain, c.currentTime + delay + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + delay + dur);
        osc.connect(g).connect(c.destination);
        osc.start(c.currentTime + delay);
        osc.stop(c.currentTime + delay + dur + 0.02);
      } catch (e) { /* audio not available, fail silently */ }
    }
    return {
      click: () => tone({ freq: 720, slideTo: 520, dur: 0.07, type: 'square', gain: 0.045 }),
      tab: () => tone({ freq: 500, slideTo: 780, dur: 0.06, type: 'triangle', gain: 0.04 }),
      open: () => tone({ freq: 340, slideTo: 900, dur: 0.14, type: 'sine', gain: 0.05 }),
      close: () => tone({ freq: 700, slideTo: 260, dur: 0.12, type: 'sine', gain: 0.045 }),
      toggle(force) {
        enabled = force !== undefined ? force : !enabled;
        localStorage.setItem('pgc-sound', enabled ? 'on' : 'off');
        return enabled;
      },
      get enabled() { return enabled; }
    };
  })();

  // sound mute toggle button, added into the nav actions
  const navActions = document.querySelector('.nav-actions');
  if (navActions) {
    const soundBtn = document.createElement('button');
    soundBtn.className = 'sound-toggle';
    soundBtn.type = 'button';
    soundBtn.setAttribute('aria-label', 'Toggle UI sound effects');
    soundBtn.textContent = SoundFX.enabled ? '🔊' : '🔇';
    soundBtn.addEventListener('click', () => {
      const on = SoundFX.toggle();
      soundBtn.textContent = on ? '🔊' : '🔇';
      if (on) SoundFX.click();
    });
    navActions.insertBefore(soundBtn, navActions.firstChild);
  }

  // click blip on every button-like element
  document.querySelectorAll('.btn, .copy, .back-top').forEach(el => {
    el.addEventListener('click', () => SoundFX.click());
  });

  // ---- ripple feedback on buttons ----
  document.querySelectorAll('.btn, .copy, .filter-row button, .panel-tabs button').forEach(el => {
    el.addEventListener('click', (e) => {
      const r = el.getBoundingClientRect();
      const size = Math.max(r.width, r.height) * 1.4;
      const span = document.createElement('span');
      span.className = 'btn-ripple';
      span.style.width = span.style.height = size + 'px';
      span.style.left = (e.clientX - r.left - size / 2) + 'px';
      span.style.top = (e.clientY - r.top - size / 2) + 'px';
      el.appendChild(span);
      span.addEventListener('animationend', () => span.remove());
    });
  });

  // ---- animated dialog open/close helper (used by the modal + lightbox) ----
  function animateDialog(dialog, { onOpenSound, onCloseSound } = {}) {
    if (!dialog) return dialog;
    dialog.classList.add('anim-dialog');
    const realShow = dialog.showModal.bind(dialog);
    const realClose = dialog.close.bind(dialog);
    dialog.showModal = () => {
      realShow();
      dialog.classList.remove('is-closing');
      requestAnimationFrame(() => dialog.classList.add('is-open'));
      onOpenSound?.();
    };
    dialog.close = () => {
      if (dialog.classList.contains('is-closing')) return;
      onCloseSound?.();
      dialog.classList.remove('is-open');
      dialog.classList.add('is-closing');
      const done = () => {
        dialog.removeEventListener('animationend', done);
        dialog.classList.remove('is-closing');
        realClose();
      };
      dialog.addEventListener('animationend', done);
      setTimeout(() => { if (dialog.open) done(); }, 400); // safety fallback
    };
    return dialog;
  }

  // image fallback: broken/missing photo -> generated initials avatar
  const AVATAR_COLORS = ['#16FF87', '#59FFB9', '#0F6B45', '#12A362', '#3FA9E8', '#E8A23D'];
  function hashColor(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
    return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
  }
  function initials(name) {
    return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
  }
  document.querySelectorAll('img[data-name]').forEach(img => {
    img.addEventListener('error', () => {
      const name = img.dataset.name || '?';
      const wrap = document.createElement('div');
      wrap.className = 'avatar-fallback';
      wrap.style.background = hashColor(name);
      wrap.style.width = '100%';
      wrap.style.height = '100%';
      wrap.textContent = initials(name);
      img.replaceWith(wrap);
    }, { once: true });
  });

  // smooth fade-in once images actually load (gallery, team, hall of fame)
  document.querySelectorAll('.gallery-item img, .team-photo img, .champ-photo img').forEach(img => {
    if (img.complete && img.naturalWidth > 0) {
      img.classList.add('loaded');
    } else {
      img.addEventListener('load', () => img.classList.add('loaded'), { once: true });
    }
  });

  // gallery image preview (lightbox)
  const lightbox = animateDialog(document.querySelector('.lightbox'), { onOpenSound: () => SoundFX.open(), onCloseSound: () => SoundFX.close() });
  const lightboxImg = lightbox?.querySelector('.lightbox-img');
  const lightboxCaption = lightbox?.querySelector('.lightbox-caption');
  const lightboxClose = lightbox?.querySelector('.modal-close');
  document.querySelectorAll('.gallery-item').forEach(item => {
    item.addEventListener('click', () => {
      const img = item.querySelector('img');
      const title = item.querySelector('span')?.childNodes[0]?.textContent?.trim() || '';
      const sub = item.querySelector('span small')?.textContent?.trim() || '';
      if (!lightbox || !lightboxImg) return;
      if (img && img.style.display !== 'none') {
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt || title;
        lightboxImg.style.display = '';
      } else {
        lightboxImg.style.display = 'none';
      }
      if (lightboxCaption) lightboxCaption.textContent = [title, sub].filter(Boolean).join(' — ');
      lightbox.showModal();
    });
  });
  lightboxClose?.addEventListener('click', () => lightbox.close());
  lightbox?.addEventListener('click', (e) => { if (e.target === lightbox) lightbox.close(); });

  // cursor spotlight
  const spotlight = document.querySelector('.spotlight');
  if (spotlight && window.matchMedia('(pointer:fine)').matches) {
    window.addEventListener('mousemove', (e) => {
      spotlight.style.setProperty('--mx', e.clientX + 'px');
      spotlight.style.setProperty('--my', e.clientY + 'px');
    }, { passive: true });
  }

  // particle constellation background
  // perf-tuned: fewer nodes + squared-distance checks (no per-pair sqrt) on
  // the O(n^2) link pass, link-drawing skipped entirely on touch/low-core
  // devices, and the whole rAF loop is paused while the tab is hidden.
  const canvas = document.getElementById('particles');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lowPower = !window.matchMedia('(pointer:fine)').matches || (navigator.hardwareConcurrency || 8) <= 4;
  if (canvas && !reduceMotion) {
    const ctx = canvas.getContext('2d');
    let w, h, particles;
    let rafId = null;
    const COLORS = ['rgba(22,255,135,.8)', 'rgba(89,255,185,.7)', 'rgba(63,169,232,.5)'];
    const MAX_PARTICLES = lowPower ? 36 : 80;
    const LINK_DIST = lowPower ? 90 : 120;
    const LINK_DIST_SQ = LINK_DIST * LINK_DIST;
    const drawLinks = !lowPower;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = window.innerWidth;
      h = Math.max(window.innerHeight, document.body.scrollHeight * 0.4);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(MAX_PARTICLES, Math.floor((w * h) / 26000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.8 + 0.6,
        c: COLORS[Math.floor(Math.random() * COLORS.length)]
      }));
    }
    resize();
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 200);
    });

    function frame() {
      ctx.clearRect(0, 0, w, h);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.c;
        ctx.fill();
      });
      if (drawLinks) {
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const a = particles[i], b = particles[j];
            const dx = a.x - b.x, dy = a.y - b.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < LINK_DIST_SQ) {
              ctx.strokeStyle = `rgba(22,255,135,${(1 - Math.sqrt(distSq) / LINK_DIST) * 0.12})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }
      }
      rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
      } else if (!rafId) {
        rafId = requestAnimationFrame(frame);
      }
    });
  }

  // subtle parallax tilt on hero panel
  const heroPanel = document.querySelector('.hero-panel');
  if (heroPanel && !reduceMotion && window.matchMedia('(pointer:fine)').matches) {
    document.querySelector('.hero')?.addEventListener('mousemove', (e) => {
      const rect = heroPanel.getBoundingClientRect();
      const relX = (e.clientX - rect.left - rect.width / 2) / rect.width;
      const relY = (e.clientY - rect.top - rect.height / 2) / rect.height;
      heroPanel.style.transform = `rotateY(${relX * 4}deg) rotateX(${-relY * 4}deg)`;
    }, { passive: true });
    document.querySelector('.hero')?.addEventListener('mouseleave', () => {
      heroPanel.style.transform = 'none';
    });
    heroPanel.style.transformStyle = 'preserve-3d';
    heroPanel.style.transition = 'transform .3s ease';
  }

  // mobile nav
  const menuBtn = document.getElementById('menuBtn');
  const navlinks = document.getElementById('navlinks');
  menuBtn?.addEventListener('click', () => {
    const open = navlinks.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', open);
  });
  navlinks?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navlinks.classList.remove('open')));

  // scroll reveal (covers base + directional/scale/pop variants)
  const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale, .reveal-pop');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.15 });
  revealEls.forEach(el => io.observe(el));

  // ---- 3D tilt on team cards (premium hover) ----
  if (pointerFine && !reduceMotionEarly) {
    document.querySelectorAll('[data-tilt]').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;   // 0-1
        const py = (e.clientY - r.top) / r.height;   // 0-1
        const rotY = (px - 0.5) * 14;
        const rotX = (0.5 - py) * 14;
        card.style.transform = `translateY(-6px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
        card.style.setProperty('--mx', (px * 100) + '%');
        card.style.setProperty('--my', (py * 100) + '%');
      }, { passive: true });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });

    // ---- subtle tilt on gallery images ----
    document.querySelectorAll('[data-tilt-img]').forEach(item => {
      item.addEventListener('mousemove', (e) => {
        const r = item.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        const rotY = (px - 0.5) * 8;
        const rotX = (0.5 - py) * 8;
        item.style.transform = `translateY(-6px) scale(1.015) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
      }, { passive: true });
      item.addEventListener('mouseleave', () => { item.style.transform = ''; });
    });

    // ---- magnetic pull on primary CTAs ----
    document.querySelectorAll('.magnetic').forEach(btn => {
      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        const mx = (e.clientX - r.left - r.width / 2) * 0.28;
        const my = (e.clientY - r.top - r.height / 2) * 0.4;
        btn.style.transform = `translate(${mx}px, ${my - 2}px)`;
      }, { passive: true });
      btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
    });
  }

  // back to top (visibility handled by the unified scroll handler above)
  backTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  // toast
  const toastEl = document.querySelector('.toast');
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  // copy IP
  document.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', () => {
      const ip = document.querySelector('[data-ip]')?.textContent.trim();
      const port = document.querySelector('[data-port]')?.textContent.trim();
      navigator.clipboard?.writeText(ip).then(() => toast(`Copied ${ip} — port ${port}`));
    });
  });

  // edition tabs (with sliding glow indicator)
  const panelTabsWrap = document.querySelector('.panel-tabs');
  function moveTabIndicator(wrap, activeBtn) {
    let indicator = wrap.querySelector('.tab-indicator');
    if (!indicator) {
      indicator = document.createElement('span');
      indicator.className = 'tab-indicator';
      wrap.appendChild(indicator);
    }
    indicator.style.width = activeBtn.offsetWidth + 'px';
    indicator.style.transform = `translateX(${activeBtn.offsetLeft}px)`;
  }
  document.querySelectorAll('.panel-tabs button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.panel-tabs button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      moveTabIndicator(panelTabsWrap, btn);
      SoundFX.tab();
      const port = btn.dataset.edition === 'bedrock' ? '19132' : '25568';
      const portEl = document.querySelector('[data-port]');
      if (portEl) portEl.textContent = port;
    });
  });
  const activePanelTab = panelTabsWrap?.querySelector('button.active');
  if (panelTabsWrap && activePanelTab) requestAnimationFrame(() => moveTabIndicator(panelTabsWrap, activePanelTab));

  // faq accordion: fade the answer in smoothly instead of an instant native jump
  document.querySelectorAll('.faq details').forEach(d => {
    const p = d.querySelector('p');
    if (d.open && p) p.classList.add('show');
    d.addEventListener('toggle', () => {
      if (!p) return;
      if (d.open) {
        p.classList.remove('show');
        requestAnimationFrame(() => requestAnimationFrame(() => p.classList.add('show')));
        SoundFX.tab();
      } else {
        p.classList.remove('show');
      }
    });
  });

  // countdown to next Sunday noon
  function nextSundayNoon() {
    const now = new Date();
    const d = new Date(now);
    d.setHours(12, 0, 0, 0);
    const day = d.getDay();
    let add = (7 - day) % 7;
    if (add === 0 && d <= now) add = 7;
    d.setDate(d.getDate() + add);
    return d;
  }
  const target = nextSundayNoon();
  function tickCountdown() {
    const diff = Math.max(0, target - new Date());
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const set = (sel, val) => {
      const el = document.querySelector(sel);
      if (!el) return;
      const next = String(val).padStart(2, '0');
      if (el.textContent !== next) {
        el.textContent = next;
        el.classList.remove('bump');
        void el.offsetWidth;
        el.classList.add('bump');
      }
    };
    set('[data-days]', days);
    set('[data-hours]', hours);
    set('[data-minutes]', mins);
  }
  tickCountdown();
  setInterval(tickCountdown, 60000);

  // animated counters
  const counters = document.querySelectorAll('[data-counter]');
  const counterIO = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.counter, 10);
      const prefix = el.dataset.prefix || '';
      const dur = 1200;
      const start = performance.now();
      function step(now) {
        const p = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3); // ease-out-cubic: quick start, soft settle
        el.textContent = prefix + Math.floor(eased * target).toLocaleString();
        if (p < 1) { requestAnimationFrame(step); } else { el.textContent = prefix + target.toLocaleString(); el.dataset.animated = 'true'; }
      }
      requestAnimationFrame(step);
      counterIO.unobserve(el);
    });
  }, { threshold: 0.4 });
  counters.forEach(c => counterIO.observe(c));

  // gallery filter
  document.querySelectorAll('.filter-row button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-row button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      SoundFX.tab();
      const f = btn.dataset.filter;
      document.querySelectorAll('.gallery-item').forEach(item => {
        const show = f === 'all' || item.dataset.type === f;
        if (show) {
          item.style.display = '';
          item.classList.remove('filter-out');
          requestAnimationFrame(() => item.classList.add('filter-in'));
        } else {
          item.classList.remove('filter-in');
          item.classList.add('filter-out');
          setTimeout(() => { if (item.classList.contains('filter-out')) item.style.display = 'none'; }, 220);
        }
      });
    });
  });

  // modal
  const modal = animateDialog(document.querySelector('.modal'), { onOpenSound: () => SoundFX.open(), onCloseSound: () => SoundFX.close() });
  const modalBody = modal?.querySelector('.modal-body');
  const modalClose = modal?.querySelector('.modal-close');
  const modalContent = {
    event: { title: 'Register for Sunday\'s tournament', body: 'Drop your in-game name and Discord ID in the #tournament-signups channel on Discord to lock in your spot.' },
    rules: { title: 'Tournament rules', body: 'No cheating, exploiting or teaming in solo events. Respect the arena boundaries. Staff decisions are final.' },
    staff: { title: 'Apply for staff', body: 'Head to the #applications channel on Discord and fill out the staff application form. Reviewed weekly.' },
    developer: { title: 'Apply as developer', body: 'Share a bit about your Java / Skript experience in #applications on Discord. Include any past plugin work.' },
    creator: { title: 'Join the creator program', body: 'Send your channel or profile link in #applications on Discord and a team member will follow up.' }
  };
  document.querySelectorAll('[data-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const info = modalContent[btn.dataset.modal];
      if (!info || !modal || !modalBody) return;
      modalBody.innerHTML = `<h3>${info.title}</h3><p>${info.body}</p><a class="btn btn-green" style="margin-top:1rem" href="#discord">Go to Discord</a>`;
      modal.showModal();
    });
  });
  modalClose?.addEventListener('click', () => modal.close());
  modal?.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });

  // fake server status (swap for a real Minecraft server-query API/proxy when you have one)
  setTimeout(() => {
    document.querySelectorAll('[data-status-dot]').forEach(d => d.classList.add('online'));
    document.querySelectorAll('[data-status-text]').forEach(t => t.textContent = 'Online');
    document.querySelectorAll('[data-status-label]').forEach(t => t.textContent = 'Online');
    const count = document.querySelector('[data-server-count]');
    const ping = document.querySelector('[data-server-ping]');
    if (count) count.textContent = Math.floor(30 + Math.random() * 40);
    if (ping) ping.textContent = Math.floor(20 + Math.random() * 30) + 'ms';
  }, 900);

  // ============ LIVE DISCORD MEMBER COUNT (real API) ============
  const memberEl = document.getElementById('widgetMemberCount');
  const onlineEl = document.getElementById('widgetOnlineCount');
  const listEl = document.getElementById('onlineList');
  const liveDot = document.getElementById('discordLiveDot');
  const heroMemberEl = document.getElementById('heroMemberCount');
  const statMemberEl = document.getElementById('statDiscordMembers');
  const widgetEl = document.getElementById('discordWidget');

  function bump(el) {
    if (!el) return;
    el.classList.remove('bump');
    void el.offsetWidth; // restart animation
    el.classList.add('bump');
  }

  function setText(el, val) {
    if (!el) return;
    const next = String(val);
    if (el.textContent !== next) { el.textContent = next; bump(el); }
  }

  async function fetchDiscordInviteStats() {
    const url = `https://discord.com/api/v10/invites/${DISCORD_INVITE_CODE}?with_counts=true&with_expiration=true`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Discord API responded ${res.status}`);
    const data = await res.json();
    return {
      guildName: data.guild?.name || 'Pak Gamers Community',
      memberCount: data.approximate_member_count,
      onlineCount: data.approximate_presence_count
    };
  }

  async function fetchDiscordWidget() {
    if (!DISCORD_GUILD_ID) return null;
    const res = await fetch(`https://discord.com/api/guilds/${DISCORD_GUILD_ID}/widget.json`);
    if (!res.ok) throw new Error(`Widget API responded ${res.status}`);
    return res.json();
  }

  function renderMemberAvatar(m) {
    const status = ['online', 'idle', 'dnd'].includes(m.status) ? m.status : 'online';
    const name = m.username || 'Member';
    const inner = m.avatar_url
      ? `<img src="${m.avatar_url}" data-name="${name}" alt="" loading="lazy">`
      : `<span class="avatar-fallback" style="background:${hashColor(name)}">${initials(name)}</span>`;
    return `<span class="online-member status-${status}" style="animation-delay:${Math.min(m._i, 12) * 45}ms" title="${name}${m.game?.name ? ' — ' + m.game.name : ''}">
      <span class="member-avatar">${inner}</span>
      <span class="member-name">${name}</span>
    </span>`;
  }

  // fallback shown when Discord's per-member widget isn't configured (the
  // invite API only gives us a headcount, not names) — fills the row with
  // staggered gradient presence dots plus the real online count instead of
  // one sparse line of text sitting in an otherwise empty card
  function renderPresenceFallback(onlineCount) {
    const n = onlineCount ?? 0;
    if (!n) return `<span><i></i>Live stats unavailable right now</span>`;
    const shown = Math.min(n, 8);
    const dots = Array.from({ length: shown }, (_, i) =>
      `<span class="presence-dot" style="animation-delay:${i * 55}ms;background:${AVATAR_COLORS[i % AVATAR_COLORS.length]}"></span>`
    ).join('');
    return `<div class="presence-row"><span class="presence-dots">${dots}</span><span class="presence-count"><strong>${n.toLocaleString()}</strong> online now — join to say hey</span></div>`;
  }

  async function refreshDiscordStats() {
    try {
      const widget = await fetchDiscordWidget().catch(() => null);
      const invite = await fetchDiscordInviteStats();

      const memberCount = invite.memberCount;
      if (memberEl) setText(memberEl, (memberCount ?? '—').toLocaleString?.() ?? memberCount);
      const onlineCount = widget?.presence_count ?? invite.onlineCount;
      if (onlineEl) setText(onlineEl, (onlineCount ?? '—').toLocaleString?.() ?? onlineCount);
      if (heroMemberEl && memberCount) heroMemberEl.textContent = memberCount.toLocaleString() + '+';
      if (statMemberEl && memberCount) {
        statMemberEl.dataset.counter = String(memberCount);
        // if the stats counter already finished its scroll-in animation, update it directly
        if (statMemberEl.dataset.animated === 'true') statMemberEl.textContent = memberCount.toLocaleString();
      }
      liveDot?.classList.add('online');
      widgetEl?.classList.add('is-live');

      if (listEl) {
        if (widget?.members?.length) {
          const shown = widget.members.slice(0, 8);
          listEl.innerHTML = shown.map((m, i) => renderMemberAvatar({ ...m, _i: i })).join('')
            + (widget.members.length > 8 ? `<span class="online-more" style="animation-delay:${8 * 45}ms">+${widget.members.length - 8} more online</span>` : '');
          // wire the broken-image -> initials fallback for freshly injected avatars
          listEl.querySelectorAll('img[data-name]').forEach(img => {
            img.addEventListener('error', () => {
              const wrap = document.createElement('span');
              wrap.className = 'avatar-fallback';
              wrap.style.background = hashColor(img.dataset.name || '?');
              wrap.textContent = initials(img.dataset.name || '?');
              img.replaceWith(wrap);
            }, { once: true });
          });
        } else {
          listEl.innerHTML = renderPresenceFallback(onlineCount);
        }
      }
    } catch (err) {
      console.warn('Discord live stats unavailable:', err);
      if (memberEl) memberEl.textContent = '—';
      if (onlineEl) onlineEl.textContent = '—';
      if (heroMemberEl && heroMemberEl.textContent === '–') heroMemberEl.textContent = '900+';
      if (listEl) listEl.innerHTML = `<span><i style="background:var(--muted)"></i>Live stats unavailable right now</span>`;
    }
  }

  refreshDiscordStats();
  setInterval(refreshDiscordStats, 60000);

});
