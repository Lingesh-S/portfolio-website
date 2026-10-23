// Lingesh S · portfolio v4
// Everything on the page reads without this script; it adds the live
// statement, the pipeline scene, the project tabs and the entrances.

import { initTagger } from './tagger.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const wide = window.matchMedia('(min-width: 900px)');
let demosModule;
const loadDemos = () => (demosModule ||= import('./demos.js'));

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
        text.style.fontSize = '';
        box.style.fontSize = '';
        const target = box.clientWidth;
        const current = parseFloat(getComputedStyle(box).fontSize);
        const natural = text.getBoundingClientRect().width;
        if (!natural) return;
        box.style.fontSize = `${Math.min(current * (target / natural) * 0.995, 420)}px`;
    });
}

/* ---------- Bar: hides while reading down, returns on the way up ---------- */
function initBar() {
    const bar = document.querySelector('.bar');
    const menuBtn = bar.querySelector('.bar-menu');
    const menu = document.getElementById('menu');
    let lastY = window.scrollY;
    let ticking = false;

    window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            const y = window.scrollY;
            const open = menuBtn.getAttribute('aria-expanded') === 'true';
            if (!open) bar.classList.toggle('is-hidden', y > lastY && y > 480);
            lastY = y;
            ticking = false;
        });
    }, { passive: true });
    bar.addEventListener('focusin', () => bar.classList.remove('is-hidden'));

    const setMenu = (open) => {
        menuBtn.setAttribute('aria-expanded', String(open));
        menuBtn.textContent = open ? 'Close' : 'Menu';
        menu.hidden = !open;
        document.body.style.overflow = open ? 'hidden' : '';
    };
    menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !menu.hidden) {
            setMenu(false);
            menuBtn.focus();
        }
    });
    wide.addEventListener('change', () => setMenu(false));

    // The link for the section in view
    const links = [...bar.querySelectorAll('.bar-nav a')];
    const byId = new Map(links.map((a) => [a.hash.slice(1), a]));
    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            links.forEach((a) => a.classList.remove('is-current'));
            byId.get(entry.target.id)?.classList.add('is-current');
        });
    }, { rootMargin: '-45% 0px -50% 0px' });
    byId.forEach((_, id) => {
        const section = document.getElementById(id);
        if (section) io.observe(section);
    });
}

/* ---------- Entrances: heading, then text, then picture ---------- */
function initReveals() {
    const items = [...document.querySelectorAll('[data-reveal]')];
    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
        items.forEach((el) => el.classList.add('is-in'));
        return;
    }
    const io = new IntersectionObserver((entries) => {
        const entering = entries.filter((e) => e.isIntersecting).map((e) => e.target);
        entering.forEach((el, i) => {
            el.style.setProperty('--d', `${i * 80}ms`);
            el.classList.add('is-in');
            io.unobserve(el);
        });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    items.forEach((el) => io.observe(el));
}

/* ---------- The pipeline: one line, six stages, pinned while scrolling ---------- */
function initScene() {
    const scene = document.getElementById('pipeline');
    if (!scene) return;
    const stages = [...scene.querySelectorAll('.stage')];
    const progress = scene.querySelector('.scene-progress');
    const ledger = scene.querySelector('.ledger');
    const n = stages.length;

    progress.innerHTML = stages.map((s, i) => `<li><button type="button" data-go="${i}">${s.querySelector('h3').textContent}</button></li>`).join('');
    const steps = [...progress.children];

    const range = () => {
        const top = scene.getBoundingClientRect().top + window.scrollY;
        return { top, length: scene.offsetHeight - window.innerHeight };
    };
    progress.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-go]');
        if (!btn) return;
        const { top, length } = range();
        window.scrollTo({ top: top + ((Number(btn.dataset.go) + 0.35) / n) * length, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    });

    let active = -1;
    let pinned = false;
    let frame = 0;

    function setActive(i) {
        if (i === active) return;
        active = i;
        stages.forEach((s, k) => s.classList.toggle('is-active', k === i));
        steps.forEach((li, k) => {
            li.classList.toggle('is-active', k === i);
            li.classList.toggle('is-done', k < i);
        });
    }

    function update() {
        frame = 0;
        if (!pinned) return;
        const { top, length } = range();
        const p = Math.min(Math.max((window.scrollY - top) / length, 0), 0.9999);
        const i = Math.floor(p * n);
        setActive(i);
        // The ledger eases out of a close-up while its figures are found
        const local = Math.min(p * n, 1);
        ledger.style.setProperty('--zoom', (1.14 - 0.14 * Math.min(local * 1.6, 1)).toFixed(4));
        ledger.classList.toggle('is-found', local > 0.18);
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };

    function setMode() {
        const shouldPin = wide.matches && !reduceMotion.matches && window.innerHeight >= 620;
        if (shouldPin === pinned) return;
        pinned = shouldPin;
        scene.classList.toggle('is-pinned', pinned);
        if (pinned) {
            active = -1;
            update();
        } else {
            stages.forEach((s) => s.classList.remove('is-active'));
            ledger.style.removeProperty('--zoom');
        }
    }

    // Unpinned (phones, reduced motion): the ledger's figures light up as it scrolls in
    const ledgerIo = new IntersectionObserver(([entry]) => {
        if (!pinned && entry.isIntersecting) ledger.classList.add('is-found');
    }, { threshold: 0.4 });
    ledgerIo.observe(ledger);

    setMode();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => { setMode(); onScroll(); });
    reduceMotion.addEventListener('change', setMode);
}

/* ---------- Demos: mounted when first seen, played once ---------- */
const mounted = new WeakMap();
const played = new WeakSet();
async function mountDemo(el, play = true) {
    if (!el) return null;
    if (!mounted.has(el)) {
        const { mountPreview } = await loadDemos();
        if (!mounted.has(el)) mounted.set(el, mountPreview(el, el.dataset.preview));
    }
    const api = mounted.get(el);
    if (play && api && !played.has(el)) {
        played.add(el);
        api.play();
    }
    return api;
}

function initDemosOnView() {
    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            // Inside the tabbed list, only the visible panel plays
            if (el.closest('.px.is-tabs') && el.closest('.px-panel')?.hidden) return;
            mountDemo(el);
            io.unobserve(el);
        });
    }, { rootMargin: '0px 0px -15% 0px', threshold: 0.2 });
    document.querySelectorAll('.pv[data-preview]').forEach((el) => io.observe(el));
    return io;
}

/* ---------- Projects: tabs on wide screens, one long list on phones ---------- */
function initProjects() {
    const box = document.querySelector('.px');
    const tabs = [...box.querySelectorAll('[role="tab"]')];
    const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
    let current = 0;

    function select(i, { focus = false, play = true } = {}) {
        current = i;
        tabs.forEach((t, k) => {
            t.setAttribute('aria-selected', String(k === i));
            t.tabIndex = k === i ? 0 : -1;
        });
        if (focus) tabs[i].focus();
        if (!box.classList.contains('is-tabs')) return;
        panels.forEach((p, k) => { p.hidden = k !== i; });
        const demo = panels[i].querySelector('.pv[data-preview]');
        if (demo) mountDemo(demo, play);
    }

    tabs.forEach((tab, i) => {
        tab.addEventListener('click', () => select(i));
        tab.addEventListener('keydown', (e) => {
            const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
            if (step) {
                e.preventDefault();
                select((i + step + tabs.length) % tabs.length, { focus: true });
            } else if (e.key === 'Home' || e.key === 'End') {
                e.preventDefault();
                select(e.key === 'Home' ? 0 : tabs.length - 1, { focus: true });
            }
        });
    });

    function setMode() {
        const tabbed = wide.matches;
        box.classList.toggle('is-tabs', tabbed);
        if (tabbed) select(current, { play: false });
        else panels.forEach((p) => { p.hidden = false; });
    }
    setMode();
    wide.addEventListener('change', setMode);

    // "See the dashboard" in the research section opens that project
    document.querySelectorAll('[data-open-project]').forEach((link) => {
        link.addEventListener('click', () => {
            const i = tabs.findIndex((t) => t.id === `tab-${link.dataset.openProject}`);
            if (i >= 0 && box.classList.contains('is-tabs')) select(i);
        });
    });
}

/* ---------- Start ---------- */
const heroName = document.querySelector('.hero .fit-text');
splitName(heroName);
initBar();
initTagger(document.getElementById('tagger'), { reduceMotion });
initScene();
initProjects();
initDemosOnView();

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
