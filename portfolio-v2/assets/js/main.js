/* Portfolio v2: site-wide interactions. Vanilla JS, no dependencies. */
(() => {
    'use strict';

    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
    const root = document.documentElement;
    root.classList.add('js-ready');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reduceMotion = () => motionQuery.matches;
    const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    /* ---------- Theme ---------- */
    const themeBtn = $('.theme-toggle');
    const themeMeta = $('meta[name="theme-color"]');

    function applyTheme(theme) {
        root.dataset.theme = theme;
        themeBtn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
        themeMeta.setAttribute('content', theme === 'dark' ? '#07080d' : '#f7f8fc');
        document.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
    }

    applyTheme(root.dataset.theme === 'light' ? 'light' : 'dark');
    themeBtn.addEventListener('click', () => {
        const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        try { localStorage.setItem('theme', next); } catch (e) { /* storage blocked: theme just won't persist */ }
    });

    /* ---------- Toast ---------- */
    const toastEl = $('.toast');
    let toastTimer;
    function toast(message) {
        toastEl.textContent = message;
        toastEl.classList.add('is-visible');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 2400);
    }

    /* ---------- Scroll-driven UI (one rAF-throttled handler) ---------- */
    const header = $('#navbar');
    const progressBar = $('.scroll-progress span');
    const fab = $('.ask-fab');
    const timeline = $('.timeline');
    let scrollQueued = false;

    function onScroll() {
        scrollQueued = false;
        const y = window.scrollY;
        const max = root.scrollHeight - window.innerHeight;
        header.classList.toggle('is-scrolled', y > 12);
        progressBar.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;
        fab.classList.toggle('is-visible', y > window.innerHeight * 0.6);
        if (timeline) {
            const rect = timeline.getBoundingClientRect();
            const p = (window.innerHeight * 0.6 - rect.top) / rect.height;
            timeline.style.setProperty('--progress', Math.max(0, Math.min(1, p)).toFixed(3));
        }
    }
    const queueScroll = () => {
        if (!scrollQueued) {
            scrollQueued = true;
            requestAnimationFrame(onScroll);
        }
    };
    window.addEventListener('scroll', queueScroll, { passive: true });
    window.addEventListener('resize', queueScroll);
    onScroll();

    /* ---------- Mobile menu ---------- */
    const menuBtn = $('.menu-toggle');
    const menu = $('#nav-menu');
    const main = $('#main');
    const footer = $('.site-footer');

    function setMenu(open, returnFocus = false) {
        menu.classList.toggle('is-open', open);
        menuBtn.setAttribute('aria-expanded', String(open));
        menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        // Keep keyboard and screen-reader focus inside the open menu
        main.inert = open;
        footer.inert = open;
        if (open) $('a', menu).focus();
        else if (returnFocus) menuBtn.focus();
    }

    menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
    menu.addEventListener('click', (e) => {
        if (e.target.closest('a') && menu.classList.contains('is-open')) setMenu(false);
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && menu.classList.contains('is-open')) setMenu(false, true);
    });
    document.addEventListener('click', (e) => {
        if (menu.classList.contains('is-open') && !e.target.closest('#nav-menu, .menu-toggle')) setMenu(false);
    });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => {
        if (e.matches && menu.classList.contains('is-open')) setMenu(false);
    });

    /* ---------- Scrollspy ---------- */
    const navLinks = $$('.nav-links a');
    const linkById = new Map(navLinks.map((a) => [a.getAttribute('href').slice(1), a]));
    const spy = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            navLinks.forEach((a) => a.removeAttribute('aria-current'));
            const link = linkById.get(entry.target.id);
            if (link) link.setAttribute('aria-current', 'true');
        });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach((section) => spy.observe(section));

    /* ---------- Reveal on scroll ---------- */
    const reveal = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            reveal.unobserve(entry.target);
        });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    $$('[data-reveal]').forEach((el) => reveal.observe(el));

    /* ---------- Count-up numbers ---------- */
    function countUp(el) {
        const target = parseFloat(el.dataset.count);
        const decimals = parseInt(el.dataset.decimals || '0', 10);
        if (reduceMotion()) {
            el.textContent = target.toFixed(decimals);
            return;
        }
        const duration = 1400;
        const start = performance.now();
        const step = (now) => {
            const t = Math.min((now - start) / duration, 1);
            el.textContent = (target * (1 - Math.pow(1 - t, 3))).toFixed(decimals);
            if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }
    const counter = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            countUp(entry.target);
            counter.unobserve(entry.target);
        });
    }, { threshold: 0.6 });
    $$('[data-count]').forEach((el) => counter.observe(el));

    /* ---------- Rotating role line ---------- */
    const typed = $('.typed');
    const roles = ['Data Scientist', 'building RAG systems', 'shipping NLP to production', 'LLM-powered enterprise features'];
    if (typed && !reduceMotion()) {
        let roleIndex = 0;
        let length = roles[0].length;
        let deleting = true;
        const tick = () => {
            const word = roles[roleIndex];
            if (deleting) {
                length -= 1;
                typed.textContent = word.slice(0, length);
                if (length === 0) {
                    deleting = false;
                    roleIndex = (roleIndex + 1) % roles.length;
                    setTimeout(tick, 380);
                } else {
                    setTimeout(tick, 32);
                }
                return;
            }
            const next = roles[roleIndex];
            length += 1;
            typed.textContent = next.slice(0, length);
            if (length === next.length) {
                deleting = true;
                setTimeout(tick, 2400);
            } else {
                setTimeout(tick, 62);
            }
        };
        setTimeout(tick, 3000);
    }

    /* ---------- Hero neural-network canvas ---------- */
    (function heroCanvas() {
        const canvas = $('.hero-canvas');
        const hero = $('#home');
        if (!canvas || !canvas.getContext) return;
        const ctx = canvas.getContext('2d');
        const LINK = 140;
        const pointer = { x: -9999, y: -9999 };
        let w = 0;
        let h = 0;
        let nodes = [];
        let rgb = '';
        let rgb2 = '';
        let running = false;
        let inView = true;
        let raf = 0;

        const readColors = () => {
            const cs = getComputedStyle(root);
            rgb = cs.getPropertyValue('--node-rgb').trim();
            rgb2 = cs.getPropertyValue('--node-rgb-2').trim();
        };

        function resize() {
            const rect = canvas.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const widthChanged = Math.abs(rect.width - w) > 1;
            w = rect.width;
            h = rect.height;
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            // Mobile browsers fire resize when the URL bar slides; only rebuild on real width changes
            if (widthChanged || !nodes.length) {
                const count = Math.round(Math.min(90, Math.max(26, (w * h) / 15000)));
                nodes = Array.from({ length: count }, (_, k) => ({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    vx: (Math.random() - 0.5) * 0.28,
                    vy: (Math.random() - 0.5) * 0.28,
                    r: Math.random() * 1.5 + 0.7,
                    alt: k % 4 === 0
                }));
            }
            if (!running) draw();
        }

        function draw() {
            ctx.clearRect(0, 0, w, h);
            ctx.lineWidth = 1;
            for (let i = 0; i < nodes.length; i++) {
                const a = nodes[i];
                for (let j = i + 1; j < nodes.length; j++) {
                    const b = nodes[j];
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < LINK * LINK) {
                        ctx.strokeStyle = `rgba(${rgb}, ${(1 - Math.sqrt(d2) / LINK) * 0.22})`;
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);
                        ctx.stroke();
                    }
                }
                const pd = Math.hypot(a.x - pointer.x, a.y - pointer.y);
                if (pd < 180) {
                    ctx.strokeStyle = `rgba(${rgb2}, ${(1 - pd / 180) * 0.5})`;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(pointer.x, pointer.y);
                    ctx.stroke();
                }
            }
            for (const n of nodes) {
                ctx.fillStyle = `rgba(${n.alt ? rgb2 : rgb}, .85)`;
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        function loop() {
            for (const n of nodes) {
                n.x += n.vx;
                n.y += n.vy;
                if (n.x < 0 || n.x > w) n.vx *= -1;
                if (n.y < 0 || n.y > h) n.vy *= -1;
            }
            draw();
            raf = requestAnimationFrame(loop);
        }
        function start() {
            if (running || reduceMotion() || !inView || document.hidden) return;
            running = true;
            raf = requestAnimationFrame(loop);
        }
        function stop() {
            running = false;
            cancelAnimationFrame(raf);
        }

        readColors();
        resize();
        start();

        new IntersectionObserver(([entry]) => {
            inView = entry.isIntersecting;
            if (inView) start(); else stop();
        }).observe(hero);
        document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
        document.addEventListener('themechange', () => {
            readColors();
            if (!running) draw();
        });
        motionQuery.addEventListener('change', () => (reduceMotion() ? stop() : start()));
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(resize, 150);
        });
        hero.addEventListener('pointermove', (e) => {
            const rect = canvas.getBoundingClientRect();
            pointer.x = e.clientX - rect.left;
            pointer.y = e.clientY - rect.top;
        });
        hero.addEventListener('pointerleave', () => {
            pointer.x = -9999;
            pointer.y = -9999;
        });
    })();

    /* ---------- Marquee pause ---------- */
    const marquee = $('.marquee');
    const marqueeBtn = $('.marquee-toggle');
    if (marquee && marqueeBtn) {
        marqueeBtn.addEventListener('click', () => {
            const paused = marquee.classList.toggle('is-paused');
            marqueeBtn.setAttribute('aria-label', paused ? 'Play tech stack animation' : 'Pause tech stack animation');
        });
    }

    /* ---------- Project filters ---------- */
    const filterBtns = $$('.filter');
    const projectItems = $$('.project, .project-mini');
    const filterStatus = $('#filter-status');
    const moreBlock = $('.more');

    const counts = { all: projectItems.length };
    projectItems.forEach((item) => {
        item.dataset.category.split(' ').forEach((c) => { counts[c] = (counts[c] || 0) + 1; });
    });
    $$('[data-count-for]').forEach((el) => { el.textContent = counts[el.dataset.countFor] || 0; });

    // Alternate the preview side for whichever featured projects are visible
    function layoutProjects() {
        let k = 0;
        $$('.project').forEach((p) => {
            if (p.hidden) return;
            p.classList.toggle('is-flipped', k % 2 === 1);
            k += 1;
        });
    }

    function applyFilter(filter) {
        let shown = 0;
        filterBtns.forEach((b) => {
            const on = b.dataset.filter === filter;
            b.classList.toggle('is-active', on);
            b.setAttribute('aria-pressed', String(on));
        });
        projectItems.forEach((item) => {
            const match = filter === 'all' || item.dataset.category.split(' ').includes(filter);
            const wasHidden = item.hidden;
            item.hidden = !match;
            if (match) {
                shown += 1;
                if (wasHidden) {
                    item.classList.remove('is-entering');
                    void item.offsetWidth; // restart the entrance animation
                    item.classList.add('is-entering');
                }
            }
        });
        moreBlock.hidden = !$$('.project-mini').some((m) => !m.hidden);
        layoutProjects();
        const label = filterBtns.find((b) => b.dataset.filter === filter).firstChild.textContent.trim();
        filterStatus.textContent = `${filter === 'all' ? 'All' : label}: ${shown} ${shown === 1 ? 'project' : 'projects'} shown`;
    }

    filterBtns.forEach((b) => b.addEventListener('click', () => applyFilter(b.dataset.filter)));
    layoutProjects();

    /* ---------- Case study dialog ---------- */
    const CASES = {
        bedrock: {
            eyebrow: 'GenAI · RAG · Personal project',
            title: 'AWS Bedrock RAG-Based Knowledge Assistant',
            summary: 'Context-aware question answering over custom knowledge sources, built on AWS Bedrock and LangChain.',
            problem: "General-purpose LLMs don't know your internal documents, and when they guess, they hallucinate. The goal: answers that come only from your own knowledge sources, with retrieval doing the heavy lifting and sources you can check.",
            built: [
                'Designed a Retrieval-Augmented Generation (RAG) system using <strong>AWS Bedrock (Titan LLM)</strong> and <strong>LangChain</strong>, enabling context-aware question answering over custom knowledge sources.',
                'Built a data pipeline to ingest, chunk, and embed documents using <strong>Amazon Titan Embeddings</strong>, storing vectors in <strong>ChromaDB</strong> for efficient semantic search and retrieval.',
                'Integrated the retrieval + generation workflow to provide accurate, grounded responses, <strong>significantly reducing hallucinations</strong> in LLM-based applications.',
                'Developed a real-time interface using <strong>Streamlit</strong>, and currently extending the system with <strong>AWS S3</strong> for scalable data storage and <strong>EC2</strong>-based deployment to make it production-ready.'
            ],
            flow: ['Documents', 'Chunking', 'Titan Embeddings', 'ChromaDB', 'LangChain retriever', 'Titan LLM on Bedrock', 'Streamlit UI'],
            stack: ['AWS Bedrock', 'Titan LLM', 'Titan Embeddings', 'LangChain', 'ChromaDB', 'Streamlit', 'Python', 'AWS S3', 'EC2'],
            links: [{ label: 'Source code', href: 'https://github.com/Lingesh-S/aws-bedrock-rag-knowledge-assistant' }]
        },
        codebase: {
            eyebrow: 'GenAI · RAG · Personal project',
            title: 'Codebase RAG Assistant',
            summary: 'Natural-language Q&A over a codebase: semantic search over code chunks plus Mistral-7B for explanations.',
            problem: 'Getting up to speed on an unfamiliar codebase means hours of grepping and reading. This assistant lets developers ask "where" and "how" questions in plain English and get answers grounded in the actual source files.',
            built: [
                'Designed a Retrieval-Augmented Generation (RAG) system that answers questions about code using <strong>Mistral-7B</strong> built on PyTorch, combining transformer-based generation with semantic search from a vector store.',
                'Built a pipeline to load and chunk <strong>.py, .md and .json</strong> files, then embed them with <strong>SentenceTransformers</strong> and store them in a <strong>Chroma/FAISS</strong> vector database for high-precision code retrieval.',
                'Integrated <strong>LangChain, Mistral-7B, ChromaDB and Streamlit</strong> to deliver real-time code understanding, explanation, and developer support via a modular assistant.'
            ],
            flow: ['.py · .md · .json files', 'Loaders & chunker', 'SentenceTransformers', 'Chroma / FAISS', 'LangChain retriever (k = 3)', 'Mistral-7B', 'Streamlit'],
            stack: ['Python', 'Mistral-7B', 'PyTorch', 'LangChain', 'SentenceTransformers', 'ChromaDB', 'FAISS', 'Streamlit'],
            links: [],
            note: 'The repository is private. Source available on request.'
        },
        xbrl: {
            eyebrow: 'Production · DataTracks',
            title: 'XBRL Auto-Tagging Engine',
            summary: 'LSTM + NER models that tag financial statements with the right XBRL taxonomy concepts, across multiple region-specific taxonomies.',
            problem: 'Regulatory filings must tag every reported figure with the correct concept from an XBRL taxonomy. Doing it by hand is slow and error-prone, and each region publishes its own taxonomy with its own rules, so one model does not fit all.',
            built: [
                'Built and maintained <strong>LSTM + NER-based XBRL auto-tagging models</strong> for multiple region-specific taxonomies across core compliance products.',
                'Designed <strong>independent ML pipelines per taxonomy</strong>, and trained &amp; deployed <strong>two new taxonomy pipelines end-to-end</strong> (data prep → training → production integration).',
                'Deployed and managed ML services in production (on-premise infrastructure) using <strong>Docker, FastAPI and REST APIs</strong>, ensuring scalable model serving, low-latency inference and reliable system performance.',
                'Implemented <strong>production monitoring and observability</strong> for ML services using Grafana and Prometheus.'
            ],
            flow: ['Financial statements', 'Pre-processing', 'LSTM + NER model', 'Per-taxonomy pipeline', 'FastAPI service (Docker)', 'Compliance products'],
            stack: ['Python', 'LSTM', 'NER', 'XBRL', 'Docker', 'FastAPI', 'REST APIs', 'Grafana', 'Prometheus'],
            links: [],
            note: 'Proprietary work. The preview uses public IFRS concept names on sample figures.'
        },
        nextword: {
            eyebrow: 'Production · DataTracks',
            title: 'RAG-Powered Next-Word Prediction',
            summary: 'Real-time writing suggestions inside a Word-like editor in a flagship product.',
            problem: 'Writers in a document editor expect suggestions that are fast and relevant to their domain. Suggestions need to be grounded in domain content and arrive within the rhythm of typing, or they just get in the way.',
            built: [
                'Developed a <strong>RAG-based next-word prediction system</strong> for a Word-like editor in a flagship product using <strong>Haystack, FastAPI and RabbitMQ</strong>.',
                'Designed for <strong>low-latency inference</strong> in a real-time, user-facing application.',
                'Implemented <strong>production monitoring and observability</strong> using <strong>Grafana and Prometheus</strong>.',
                'Deployed with <strong>Docker</strong> on on-premise infrastructure alongside the other ML services.'
            ],
            flow: ['Editor context', 'FastAPI + RabbitMQ', 'Haystack retrieval', 'Next-word prediction', 'Inline suggestion', 'Grafana · Prometheus'],
            stack: ['Haystack', 'FastAPI', 'RabbitMQ', 'Grafana', 'Prometheus', 'Docker', 'Python'],
            links: [],
            note: 'Proprietary work. The preview is a tiny in-browser stand-in over sample annual-report sentences.'
        },
        lda: {
            eyebrow: 'NLP · Research · ICCCAI-2024',
            title: 'LDA-Powered Resume Screening Dashboard',
            summary: "Presented at ICCCAI-2024 (Taylor's University, Malaysia).",
            problem: 'Recruiters screen large volumes of resumes by hand. This research explores how topic modeling can surface what a resume is really about, match it to a role, and then help the recruiter prepare for the interview.',
            built: [
                'Developed an interactive <strong>Streamlit</strong> dashboard using <strong>LDA (Latent Dirichlet Allocation)</strong>, implemented with Scikit-learn, for extracting dominant topics and keywords from resumes.',
                'Designed a custom <strong>NLP-based job matching algorithm with token indexing</strong>, achieving <strong>&gt;80% accuracy</strong> in simulated resume screenings.',
                'Integrated the <strong>OpenAI API</strong> to auto-generate personalized interview questions, enhancing recruiter productivity through AI-powered automation.',
                'Published and presented as <em>"LDA-Powered Resume Screening Dashboard with Token Indexing &amp; Streamlit"</em> at <strong>ICCCAI-2024</strong>.'
            ],
            flow: ['Resumes', 'Pre-processing & token indexing', 'LDA topic model', 'Job-matching score', 'OpenAI question generation', 'Streamlit dashboard'],
            stack: ['Python', 'NLP', 'LDA', 'Scikit-learn', 'Topic Modeling', 'OpenAI API', 'Streamlit'],
            links: [{ label: 'Source code', href: 'https://github.com/Lingesh-S/lda-resume-screening-dashboard' }]
        },
        noteninja: {
            eyebrow: 'GenAI · EdTech',
            title: 'NoteNinja AI: Personalized Learning Chatbot',
            summary: 'A personalized learning assistant that lets students interact with their lecture notes, PDFs and quizzes in conversation.',
            problem: "Students learn best when answers come from their own course material, not the open web. NoteNinja answers questions grounded in each student's notes, like a private tutor.",
            built: [
                'Developed and deployed a <strong>personalized learning chatbot</strong> for students using <strong>LangChain</strong> and <strong>Flan-T5</strong>, enabling real-time, context-aware Q&amp;A from academic notes.',
                '<strong>LangChain</strong> orchestrates document loaders, retrievers and the LLM; <strong>Hugging Face Flan-T5</strong> handles natural language understanding.',
                'PDF and text parsing for academic notes and quizzes, with an interactive <strong>Streamlit</strong> front end. Prototyped in Google Colab.'
            ],
            flow: ['Notes & PDFs', 'Document loaders', 'LangChain retriever', 'Flan-T5', 'Streamlit chat'],
            stack: ['LangChain', 'Flan-T5', 'Hugging Face Transformers', 'Streamlit', 'Python', 'Google Colab'],
            links: [{ label: 'Repository', href: 'https://github.com/Lingesh-S/NoteNinja-AI' }],
            note: 'The public repository is being rebuilt, so some source files are temporarily unavailable.'
        }
    };

    const caseDialog = $('#case-dialog');
    let caseTrigger = null;

    function openCase(id, trigger) {
        const c = CASES[id];
        if (!c || !caseDialog) return;
        caseTrigger = trigger;
        $$('dialog[open]').forEach((d) => d.close());
        $('.case-eyebrow', caseDialog).textContent = c.eyebrow;
        $('.case-title', caseDialog).textContent = c.title;
        $('.case-summary', caseDialog).textContent = c.summary;
        $('.case-problem', caseDialog).textContent = c.problem;
        $('.case-built', caseDialog).innerHTML = c.built.map((b) => `<li>${b}</li>`).join('');
        $('.case-flow', caseDialog).innerHTML = c.flow.map((f, i) => `<li style="--i:${i}">${escapeHtml(f)}</li>`).join('');
        $('.case-stack', caseDialog).innerHTML = c.stack.map((s) => `<li class="chip">${escapeHtml(s)}</li>`).join('');

        const actions = c.links.map((l) => `<a class="btn btn-sm btn-primary" href="${l.href}" target="_blank" rel="noopener noreferrer"><svg class="icon icon-sm" aria-hidden="true"><use href="#i-github"/></svg> ${escapeHtml(l.label)}<span class="sr-only"> (opens in new tab)</span></a>`);
        actions.push(`<button class="btn btn-sm btn-ghost" type="button" data-goto="proj-${id}"><svg class="icon icon-sm" aria-hidden="true"><use href="#i-play"/></svg> Try the live preview</button>`);
        if (c.note) actions.push(`<span class="case-note"><svg class="icon icon-sm" aria-hidden="true"><use href="#i-lock"/></svg> ${escapeHtml(c.note)}</span>`);
        $('.case-actions', caseDialog).innerHTML = actions.join('');

        caseDialog.showModal();
        caseDialog.scrollTop = 0;
    }

    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('[data-case]');
        if (trigger) openCase(trigger.dataset.case, trigger);
    });

    if (caseDialog) {
        caseDialog.addEventListener('click', (e) => {
            const rect = caseDialog.getBoundingClientRect();
            const outside = e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom;
            if ((e.target === caseDialog && outside) || e.target.closest('[data-close]')) {
                caseDialog.close();
                return;
            }
            const goto = e.target.closest('[data-goto]');
            if (goto) {
                const target = document.getElementById(goto.dataset.goto);
                caseTrigger = null;
                caseDialog.close();
                if (target) {
                    if (target.hidden) $('.filter[data-filter="all"]').click();
                    const heading = $('.project-title', target);
                    heading.setAttribute('tabindex', '-1');
                    heading.focus({ preventScroll: true });
                    // Wait a frame so the dialog's scroll lock is gone before scrolling
                    requestAnimationFrame(() => target.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' }));
                }
            }
        });
        caseDialog.addEventListener('close', () => {
            if (caseTrigger) caseTrigger.focus();
        });
    }

    /* ---------- Skill explorer ---------- */
    const explorer = $('#skill-explorer');
    const evidence = $$('[data-skills]').map((el) => ({
        el,
        title: el.dataset.title,
        skills: el.dataset.skills.split('|'),
        kind: el.classList.contains('tl-item') ? 'Experience' : 'Project'
    }));
    let activeSkill = null;

    // A floating copy of the panel for when the in-grid one is scrolled off-screen
    const sheet = document.createElement('div');
    sheet.className = 'card skill-sheet';
    sheet.hidden = true;
    sheet.innerHTML = '<div class="se-content"></div><button class="btn btn-sm btn-ghost se-close" type="button">Close</button>';
    document.body.append(sheet);
    const sheetContent = $('.se-content', sheet);

    function renderSkill(skillLabel, hits) {
        const count = hits.length ? `Used in ${hits.length} ${hits.length === 1 ? 'place' : 'places'}` : 'Toolkit';
        const desc = hits.length
            ? 'Applied in the work and projects below:'
            : 'Part of my working toolkit and listed on my resume. Happy to go deeper in a conversation.';
        const items = hits.map((hit, i) => `
            <li><a class="se-item" href="#${hit.el.id}" style="--i:${i}">
                <svg class="icon" aria-hidden="true"><use href="#i-${hit.kind === 'Experience' ? 'briefcase' : 'code'}"/></svg>
                <span><b>${escapeHtml(hit.title)}</b><small>${hit.kind}</small></span>
            </a></li>`).join('');
        return `<h3 class="se-title">${escapeHtml(skillLabel)}<span class="se-count">${count}</span></h3>
            <p class="se-desc">${desc}</p>
            <ul class="se-list">${items}</ul>`;
    }

    const explorerDefault = $('.se-live', explorer).innerHTML;

    function explorerVisible() {
        const rect = explorer.getBoundingClientRect();
        return rect.top < window.innerHeight - 120 && rect.bottom > 140;
    }

    function selectSkill(btn) {
        const skill = btn.dataset.skill;
        $$('.skill[aria-pressed="true"]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
        if (activeSkill === skill) {
            activeSkill = null;
            $('.se-live', explorer).innerHTML = explorerDefault;
            sheet.hidden = true;
            return;
        }
        activeSkill = skill;
        btn.setAttribute('aria-pressed', 'true');
        const hits = evidence.filter((e) => e.skills.includes(skill));
        const html = renderSkill(btn.textContent.trim(), hits);
        $('.se-live', explorer).innerHTML = html;
        sheetContent.innerHTML = html;
        sheet.hidden = explorerVisible();
    }

    $$('.skill').forEach((btn) => {
        btn.setAttribute('aria-pressed', 'false');
        btn.setAttribute('aria-controls', 'skill-explorer');
        btn.addEventListener('click', () => selectSkill(btn));
    });
    $('.se-close', sheet).addEventListener('click', () => { sheet.hidden = true; });
    sheet.addEventListener('click', (e) => { if (e.target.closest('.se-item')) sheet.hidden = true; });
    document.addEventListener('click', (e) => {
        if (!sheet.hidden && !e.target.closest('.skill-sheet, .skill')) sheet.hidden = true;
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') sheet.hidden = true; });
    new IntersectionObserver(([entry]) => { if (entry.isIntersecting) sheet.hidden = true; }, { threshold: 0.5 }).observe(explorer);

    /* ---------- Copy email ---------- */
    const copyBtn = $('.copy-email');
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            const text = copyBtn.dataset.copy;
            let ok = false;
            try {
                await navigator.clipboard.writeText(text);
                ok = true;
            } catch (err) {
                // Clipboard API needs a secure context; fall back to a hidden textarea
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.setAttribute('readonly', '');
                ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
                document.body.append(ta);
                ta.select();
                try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
                ta.remove();
            }
            toast(ok ? 'Email copied to clipboard' : `Couldn't copy. Email: ${text}`);
            if (!ok) return;
            const label = $('.copy-label', copyBtn);
            copyBtn.classList.add('is-copied');
            label.textContent = 'Copied!';
            setTimeout(() => {
                copyBtn.classList.remove('is-copied');
                label.textContent = 'Copy email';
            }, 2000);
        });
    }

    /* ---------- Card spotlight ---------- */
    if (window.matchMedia('(hover: hover)').matches) {
        document.addEventListener('pointermove', (e) => {
            const card = e.target.closest('.card');
            if (!card) return;
            const rect = card.getBoundingClientRect();
            card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
            card.style.setProperty('--my', `${e.clientY - rect.top}px`);
        }, { passive: true });
    }

    /* ---------- Footer year ---------- */
    const year = $('#year');
    if (year) year.textContent = new Date().getFullYear();
})();
