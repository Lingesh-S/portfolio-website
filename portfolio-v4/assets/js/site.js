// Lingesh S · portfolio v4
// Everything on the page reads without this script; it adds the 3D deck,
// the entrances, the stacking project cards, tilt, light and the demos.

import { initDeck } from './deck.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
let demosModule;
const loadDemos = () => (demosModule ||= import('./demos.js'));
const clamp = (v, a = 0, b = 1) => Math.min(Math.max(v, a), b);

/* ---------- The name, set to the full width of the page ---------- */
function splitName(el) {
    const text = el.textContent;
    el.closest('.name').setAttribute('aria-label', text);
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = [...text].map((c, i) => `<span class="ch" style="--i:${i}">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
}

function fitNames() {
    document.querySelectorAll('.fit').forEach((box) => {
        const text = box.querySelector('.fit-text');
        box.style.fontSize = '';
        const target = box.clientWidth;
        const current = parseFloat(getComputedStyle(box).fontSize);
        const natural = text.getBoundingClientRect().width;
        if (natural) box.style.fontSize = `${Math.min(current * (target / natural) * 0.995, 400)}px`;
    });
}

// Headings rise word by word
function splitWords(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map((w, i) => `<span class="w" aria-hidden="true"><span class="wi" style="--i:${i}">${w}</span></span>`).join(' ');
}

/* ---------- Bar: pill under the current section, hides while reading down ---------- */
function initBar() {
    const bar = document.querySelector('.bar');
    const nav = bar.querySelector('.bar-nav');
    const pill = nav.querySelector('.nav-pill');
    const links = [...nav.querySelectorAll('a')];
    const menuBtn = bar.querySelector('.bar-menu');
    const menu = document.getElementById('menu');

    const movePill = (a) => {
        if (!a) { pill.style.setProperty('--o', 0); return; }
        pill.style.setProperty('--x', `${a.offsetLeft}px`);
        pill.style.setProperty('--w', `${a.offsetWidth}px`);
        pill.style.setProperty('--o', 1);
    };
    const byId = new Map(links.map((a) => [a.hash.slice(1), a]));
    let current = null;
    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) current = byId.get(entry.target.id);
            else if (byId.get(entry.target.id) === current) current = null;
        });
        links.forEach((a) => a.classList.toggle('is-current', a === current));
        movePill(current);
    }, { rootMargin: '-40% 0px -55% 0px' });
    byId.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
    nav.addEventListener('pointerover', (e) => { const a = e.target.closest('a'); if (a) movePill(a); });
    nav.addEventListener('pointerleave', () => movePill(current));

    const setMenu = (open) => {
        menuBtn.setAttribute('aria-expanded', String(open));
        menuBtn.textContent = open ? 'Close' : 'Menu';
        menu.hidden = !open;
        document.body.style.overflow = open ? 'hidden' : '';
        bar.classList.toggle('is-scrolled', open || window.scrollY > 20);
    };
    menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); }
    });
    bar.addEventListener('focusin', () => bar.classList.remove('is-hidden'));
    window.matchMedia('(min-width: 900px)').addEventListener('change', () => setMenu(false));

    let lastY = window.scrollY;
    return (y) => {
        const open = menuBtn.getAttribute('aria-expanded') === 'true';
        bar.classList.toggle('is-scrolled', open || y > 20);
        if (!open) bar.classList.toggle('is-hidden', y > lastY + 2 && y > 600);
        if (y < lastY - 2) bar.classList.remove('is-hidden');
        lastY = y;
    };
}

/* ---------- Entrances ---------- */
function initReveals() {
    const items = [...document.querySelectorAll('[data-reveal], [data-split], .sheet')];
    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
        items.forEach((el) => el.classList.add('is-in', 'is-up'));
        return;
    }
    const io = new IntersectionObserver((entries) => {
        entries.filter((e) => e.isIntersecting).forEach((entry, i) => {
            const el = entry.target;
            if (el.classList.contains('sheet')) el.classList.add('is-up');
            else {
                el.style.setProperty('--d', `${i * 90}ms`);
                el.classList.add('is-in');
            }
            io.unobserve(el);
        });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    items.forEach((el) => io.observe(el));
}

/* ---------- Pointer: tilt, light and magnetic buttons ---------- */
function initPointer() {
    if (!finePointer.matches || reduceMotion.matches) return;

    document.querySelectorAll('.lit').forEach((el) => {
        el.addEventListener('pointermove', (e) => {
            const r = el.getBoundingClientRect();
            el.style.setProperty('--mx', `${e.clientX - r.left}px`);
            el.style.setProperty('--my', `${e.clientY - r.top}px`);
        });
    });

    document.querySelectorAll('[data-tilt]').forEach((el) => {
        let frame = 0;
        el.addEventListener('pointermove', (e) => {
            if (frame) return;
            frame = requestAnimationFrame(() => {
                frame = 0;
                const r = el.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width - 0.5;
                const py = (e.clientY - r.top) / r.height - 0.5;
                const max = r.width > 700 ? 2.5 : 6;
                el.classList.add('is-tilting');
                el.style.setProperty('--ry', `${(px * max).toFixed(2)}deg`);
                el.style.setProperty('--rx', `${(-py * max).toFixed(2)}deg`);
            });
        });
        el.addEventListener('pointerleave', () => {
            el.classList.remove('is-tilting');
            el.style.setProperty('--rx', '0deg');
            el.style.setProperty('--ry', '0deg');
        });
    });

    document.querySelectorAll('[data-magnetic]').forEach((el) => {
        el.addEventListener('pointermove', (e) => {
            const r = el.getBoundingClientRect();
            el.style.setProperty('--tx', `${((e.clientX - r.left) / r.width - 0.5) * 10}px`);
            el.style.setProperty('--ty', `${((e.clientY - r.top) / r.height - 0.5) * 8}px`);
        });
        el.addEventListener('pointerleave', () => {
            el.style.setProperty('--tx', '0px');
            el.style.setProperty('--ty', '0px');
        });
    });

    // The deck leans toward the pointer
    const hero = document.querySelector('.hero');
    const deck = hero.querySelector('.deck-cards');
    let frame = 0;
    hero.addEventListener('pointermove', (e) => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
            frame = 0;
            deck.style.setProperty('--tx', ((e.clientX / window.innerWidth - 0.5) * 10).toFixed(2));
            deck.style.setProperty('--ty', ((e.clientY / window.innerHeight - 0.5) * -8).toFixed(2));
        });
    });
    hero.addEventListener('pointerleave', () => {
        deck.style.setProperty('--tx', 0);
        deck.style.setProperty('--ty', 0);
    });
}

/* ---------- Scroll: hero parallax, progress, stacking cards, timeline ---------- */
function initScroll(onBar) {
    const root = document.documentElement;
    const hero = document.querySelector('.hero');
    const progress = document.querySelector('.progress');
    const cards = [...document.querySelectorAll('.pcard')];
    const timeline = document.querySelector('.timeline');
    const tlItems = [...timeline.querySelectorAll('.tl-item')];
    const stackQuery = window.matchMedia('(min-width: 900px) and (min-height: 700px)');
    let frame = 0;

    function update() {
        frame = 0;
        const y = window.scrollY;
        const vh = window.innerHeight;
        onBar(y);
        progress.style.setProperty('--sp', clamp(y / (root.scrollHeight - vh)).toFixed(4));

        if (!reduceMotion.matches) hero.style.setProperty('--hs', clamp(y / hero.offsetHeight).toFixed(4));

        // Each project card sinks back as the next one slides over it
        if (stackQuery.matches && !reduceMotion.matches) {
            for (let i = 0; i < cards.length - 1; i++) {
                const a = cards[i].getBoundingClientRect();
                const b = cards[i + 1].getBoundingClientRect();
                const p = clamp((a.bottom - b.top) / a.height);
                cards[i].style.setProperty('--p', p.toFixed(3));
            }
        }

        const t = timeline.getBoundingClientRect();
        const reach = vh * 0.62;
        const tl = clamp((reach - t.top) / t.height);
        timeline.style.setProperty('--tl', tl.toFixed(4));
        tlItems.forEach((item) => {
            item.classList.toggle('is-lit', item.getBoundingClientRect().top + 40 < reach);
        });
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    stackQuery.addEventListener('change', () => cards.forEach((c) => c.style.removeProperty('--p')));
    update();
}

/* ---------- Demos: mounted when first seen, played once ---------- */
const played = new WeakSet();
function initDemos() {
    const io = new IntersectionObserver((entries) => {
        entries.forEach(async (entry) => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            io.unobserve(el);
            const { mountPreview } = await loadDemos();
            const api = mountPreview(el, el.dataset.preview);
            if (api && !played.has(el)) {
                played.add(el);
                api.play();
            }
        });
    }, { rootMargin: '0px 0px -20% 0px', threshold: 0.25 });
    document.querySelectorAll('.pv[data-preview]').forEach((el) => io.observe(el));
}

/* ---------- Loops pause when they are off screen ---------- */
function initPausing() {
    const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => e.target.classList.toggle('is-paused', !e.isIntersecting));
    });
    document.querySelectorAll('.pipeline, .marquee, .floor, .hero .scroll-cue').forEach((el) => io.observe(el));
}

function initMarquee() {
    const row = document.querySelector('.marquee-row');
    if (!row || reduceMotion.matches) return;
    row.append(...[...row.children].map((n) => n.cloneNode(true)));
    row.classList.add('is-looping');
}

function initCopy() {
    const announce = document.getElementById('announce');
    document.querySelectorAll('[data-copy]').forEach((btn) => {
        const label = btn.querySelector('span');
        btn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(btn.dataset.copy);
                label.textContent = 'Copied';
                btn.classList.add('is-done');
                announce.textContent = 'Email address copied';
            } catch {
                window.location.href = `mailto:${btn.dataset.copy}`;
                return;
            }
            setTimeout(() => {
                label.textContent = 'Copy email';
                btn.classList.remove('is-done');
            }, 1800);
        });
    });
}

/* ---------- Start ---------- */
splitName(document.querySelector('.hero .fit-text'));
document.querySelectorAll('[data-split]').forEach(splitWords);
const onBar = initBar();
initDeck(document.getElementById('deck'), { reduceMotion });
initScroll(onBar);
initPointer();
initDemos();
initPausing();
initMarquee();
initCopy();

// Wait for the typeface before fitting the name, but never longer than 1.5 s
Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]).then(() => {
    fitNames();
    requestAnimationFrame(() => document.querySelector('.hero .name').classList.add('is-in'));
    initReveals();
});
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fitNames, 120);
});
