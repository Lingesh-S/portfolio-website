/* Portfolio v2: "Ask my portfolio".
   A tiny in-browser retrieval engine: every [data-kb] block on the page becomes
   a document, ranked against the question with TF-IDF and cosine similarity.
   The answer is extractive (best-matching sentences), so it never invents facts. */
(() => {
    'use strict';

    const dialog = document.getElementById('ask-dialog');
    if (!dialog) return;
    const form = dialog.querySelector('.ask-form');
    const input = dialog.querySelector('#ask-input');
    const results = dialog.querySelector('.ask-results');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    /* ---------- Text processing ---------- */
    const STOP = new Set(`a an the and or of to in on for with by at from as is are was were be been being it its this that
        these those i im me my he him his she her they them their you your we our us what which who whom whose how why when
        where does do did done has have had having can could would should will shall may might must about into over under than
        then so such not no yes also just using use used any some all each other more most very much many tell show give
        lingesh lingeshs s know knows worked work`.split(/\s+/));

    const undouble = (w) => (/([b-df-hj-np-rtv-z])\1$/.test(w) ? w.slice(0, -1) : w);
    function stem(word) {
        let w = word;
        if (w.length > 4 && w.endsWith('ies')) w = `${w.slice(0, -3)}y`;
        else if (w.length > 3 && w.endsWith('s') && !/(ss|us|is)$/.test(w)) w = w.slice(0, -1);
        if (w.length > 5 && w.endsWith('ing')) w = undouble(w.slice(0, -3));
        else if (w.length > 4 && w.endsWith('ed')) w = undouble(w.slice(0, -2));
        return w;
    }

    function tokenize(text) {
        const out = [];
        const raw = text.toLowerCase().replace(/[’']/g, '').split(/[^a-z0-9+#-]+/);
        for (let t of raw) {
            t = t.replace(/^-+|-+$/g, '');
            if (!t || STOP.has(t)) continue;
            out.push(stem(t));
            // "flan-t5" should also match "flan" and "t5"
            if (t.includes('-')) t.split('-').forEach((part) => { if (part && !STOP.has(part)) out.push(stem(part)); });
        }
        return out;
    }

    // Query expansion: recruiters rarely use the exact words on the page
    const SYNONYMS = {
        rag: ['retrieval', 'augmented', 'vector'],
        retrieval: ['rag'],
        llm: ['language', 'genai', 'transformer'],
        genai: ['llm', 'rag', 'generative'],
        generative: ['genai'],
        ai: ['ml', 'genai', 'llm'],
        ml: ['machine', 'learning', 'model'],
        cloud: ['aws', 'bedrock', 's3', 'ec2', 'sagemaker', 'lambda'],
        aws: ['bedrock', 'cloud', 's3', 'ec2'],
        job: ['experience', 'role'],
        role: ['experience'],
        experience: ['role', 'intern'],
        career: ['experience', 'role'],
        intern: ['internship', 'experience'],
        internship: ['intern'],
        current: ['present', 'currently', 'datatrack'],
        company: ['datatrack', 'experience'],
        degree: ['education', 'university', 'cgpa'],
        college: ['education', 'university'],
        university: ['education', 'degree'],
        study: ['education', 'university'],
        education: ['university', 'degree', 'cgpa'],
        gpa: ['cgpa'],
        paper: ['publish', 'research', 'icccai'],
        publication: ['publish', 'research', 'icccai', 'paper'],
        publish: ['research', 'icccai', 'paper'],
        research: ['publish', 'icccai'],
        deploy: ['production', 'docker', 'fastapi'],
        production: ['deploy', 'docker', 'monitor'],
        mlop: ['production', 'monitor', 'docker', 'grafana', 'prometheus', 'fastapi'],
        monitor: ['grafana', 'prometheus', 'observability'],
        contact: ['email', 'linkedin', 'phone'],
        email: ['contact', 'mail'],
        hire: ['contact', 'email'],
        reach: ['contact', 'email'],
        nlp: ['ner', 'lda', 'spacy', 'nltk', 'language', 'topic'],
        xbrl: ['tag', 'taxonomy'],
        certification: ['certificate', 'oracle', 'accenture'],
        certificate: ['certification'],
        certified: ['certification'],
        agent: ['langgraph', 'multi-agent'],
        finetune: ['fine-tuning', 'lora', 'peft'],
        fine: ['fine-tuning', 'lora'],
        vision: ['cnn', 'x-ray', 'image'],
        skill: ['technical', 'tool'],
        tool: ['skill'],
        stack: ['skill', 'tool'],
        project: ['built'],
        built: ['project']
    };

    /* ---------- Index (built lazily on first open) ---------- */
    let docs = null;
    let idf = null;

    // UI chrome that should never end up in an answer
    const SKIP = '.sr-only, .eyebrow, .chips, .pill, .project-num, .project-actions, .mini-links, .mini-link, .copy-email, [data-case], svg';
    const BLOCK = 'p, li, h1, h2, h3, h4, dt, dd, header';

    // Visible text with a line break between block elements, so bullet points
    // and headings become separate candidate sentences
    function readableText(el) {
        let out = '';
        let lastBlock = null;
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => (node.parentElement.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT)
        });
        while (walker.nextNode()) {
            const node = walker.currentNode;
            const block = node.parentElement.closest(BLOCK);
            out += (block !== lastBlock ? '\n' : ' ') + node.nodeValue;
            lastBlock = block;
        }
        return out
            .split('\n')
            .map((line) => line.replace(/\s+/g, ' ').replace(/\s+([,.;:!?)])/g, '$1').trim())
            .filter(Boolean)
            .join('\n');
    }

    // Split on line breaks and sentence ends, then glue short fragments ("B.E.",
    // "2020 – 2024") onto their neighbour so an answer is never just an abbreviation
    function splitSentences(text) {
        const parts = text.split('\n').flatMap((line) => line.split(/(?<=[.!?])\s+(?=[A-Z0-9“"(])/));
        const out = [];
        let carry = '';
        parts.forEach((part) => {
            const sentence = carry ? `${carry} ${part}` : part;
            if (sentence.length < 40) {
                carry = sentence;
            } else {
                out.push(sentence.trim());
                carry = '';
            }
        });
        if (carry) {
            if (out.length) out[out.length - 1] += ` ${carry}`;
            else out.push(carry);
        }
        return out.length ? out : [text];
    }

    function buildIndex() {
        docs = Array.from(document.querySelectorAll('[data-kb]')).map((el) => {
            const title = el.dataset.kbTitle || '';
            const text = readableText(el);
            // The title is counted twice so a matching heading outweighs a passing mention
            const tokens = tokenize(`${title} ${title} ${text}`);
            const tf = new Map();
            tokens.forEach((t) => tf.set(t, (tf.get(t) || 0) + 1));
            return { el, title, text, tf, sentences: splitSentences(text) };
        });
        const df = new Map();
        docs.forEach((d) => d.tf.forEach((_, t) => df.set(t, (df.get(t) || 0) + 1)));
        idf = new Map();
        df.forEach((n, t) => idf.set(t, Math.log((docs.length + 1) / (n + 1)) + 1));
        docs.forEach((d) => {
            d.vec = new Map();
            let norm = 0;
            d.tf.forEach((n, t) => {
                const w = (1 + Math.log(n)) * idf.get(t);
                d.vec.set(t, w);
                norm += w * w;
            });
            d.norm = Math.sqrt(norm) || 1;
        });
    }

    function queryVector(question) {
        const q = new Map();
        const base = tokenize(question);
        base.forEach((t) => q.set(t, (q.get(t) || 0) + 1));
        base.forEach((t) => (SYNONYMS[t] || []).forEach((syn) => {
            tokenize(syn).forEach((s) => { if (!q.has(s)) q.set(s, 0.5); });
        }));
        const vec = new Map();
        let norm = 0;
        q.forEach((weight, t) => {
            const w = weight * (idf.get(t) || 0);
            if (!w) return;
            vec.set(t, w);
            norm += w * w;
        });
        return { vec, norm: Math.sqrt(norm) || 1, terms: new Set(vec.keys()) };
    }

    function search(question) {
        if (!docs) buildIndex();
        const q = queryVector(question);
        const ranked = docs.map((d) => {
            let dot = 0;
            q.vec.forEach((w, t) => { if (d.vec.has(t)) dot += w * d.vec.get(t); });
            return { doc: d, score: dot / (q.norm * d.norm) };
        }).filter((r) => r.score > 0).sort((a, b) => b.score - a.score);
        return { q, ranked };
    }

    /* ---------- Answer extraction ---------- */
    function bestSentences(doc, q) {
        const scored = doc.sentences.map((s, i) => {
            let score = 0;
            new Set(tokenize(s)).forEach((t) => { if (q.vec.has(t)) score += q.vec.get(t); });
            return { s, i, score };
        });
        const top = scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 2).sort((a, b) => a.i - b.i);
        return (top.length ? top : scored.slice(0, 1)).map((x) => x.s);
    }

    function highlight(sentence, terms) {
        return sentence.split(/(\s+)/).map((word) => {
            const hit = tokenize(word).some((t) => terms.has(t));
            return hit ? `<mark>${esc(word)}</mark>` : esc(word);
        }).join('');
    }

    /* ---------- Rendering ---------- */
    let lastRanked = [];

    function answer(question) {
        const text = question.trim();
        if (!text) return;
        const t0 = performance.now();
        const { q, ranked } = search(text);
        const ms = performance.now() - t0;
        const top = ranked.slice(0, 3);
        lastRanked = top;

        if (!top.length || top[0].score < 0.06) {
            results.innerHTML = `
                <div class="ask-answer">
                    <p>I couldn't find that on this page. Try asking about RAG systems, production ML, AWS, publications or education, or <a href="mailto:lingeshsrinivasan1@gmail.com">email Lingesh directly</a>.</p>
                </div>
                <p class="ask-meta">Searched ${docs.length} passages in ${ms.toFixed(2)} ms</p>`;
            return;
        }

        const lead = top[0];
        // Short passages read best whole; long ones are trimmed to the best sentences
        const sentences = lead.doc.text.length <= 320 ? lead.doc.sentences : bestSentences(lead.doc, q);
        const paragraphs = sentences.map((s) => `<p>${highlight(s, q.terms)}</p>`).join('');
        results.innerHTML = `
            <div class="ask-answer">
                <div class="ask-label"><span>Answer · from “${esc(lead.doc.title)}”</span><span>${lead.score.toFixed(2)}</span></div>
                ${paragraphs}
            </div>
            <div>
                <div class="ask-label"><span>Sources · top-${top.length} by cosine similarity</span></div>
                <ul class="ask-sources">
                    ${top.map((r, i) => `
                        <li><button type="button" class="ask-src" data-rank="${i}" style="--i:${i}">
                            <span class="ask-src-title">${esc(r.doc.title)}</span>
                            <span class="ask-src-score">${r.score.toFixed(2)}</span>
                            <span class="ask-src-bar" aria-hidden="true"><span style="--s:${Math.min(1, r.score / top[0].score).toFixed(3)}"></span></span>
                        </button></li>`).join('')}
                </ul>
            </div>
            <p class="ask-meta">Retrieved from ${docs.length} passages in ${ms < 0.01 ? '<0.01' : ms.toFixed(2)} ms · select a source to jump to it</p>`;
    }

    function goTo(doc) {
        dialog.close();
        const showAll = document.querySelector('.filter[data-filter="all"]');
        if (doc.el.closest('[hidden]') && showAll) showAll.click();
        const target = doc.el.closest('.card') || doc.el;
        // Wait a frame so the dialog's scroll lock is gone before scrolling
        requestAnimationFrame(() => target.scrollIntoView({ behavior: motionQuery.matches ? 'auto' : 'smooth', block: 'center' }));
        target.classList.remove('flash');
        void target.offsetWidth;
        target.classList.add('flash');
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
    }

    /* ---------- Wiring ---------- */
    function open() {
        if (dialog.open || document.querySelector('dialog[open]')) return;
        if (!docs) buildIndex();
        dialog.showModal();
        input.focus();
        input.select();
    }

    document.querySelectorAll('.ask-open').forEach((btn) => btn.addEventListener('click', open));

    // Escape always closes, even when the browser would rather clear the field
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            dialog.close();
        }
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        answer(input.value);
    });

    dialog.querySelectorAll('.ask-suggest .chip-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            input.value = btn.textContent;
            answer(btn.textContent);
        });
    });

    results.addEventListener('click', (e) => {
        const src = e.target.closest('.ask-src');
        if (src) goTo(lastRanked[Number(src.dataset.rank)].doc);
    });

    dialog.addEventListener('click', (e) => {
        const rect = dialog.getBoundingClientRect();
        const outside = e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom;
        if ((e.target === dialog && outside) || e.target.closest('[data-close]')) dialog.close();
    });

    const isTyping = (el) => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            if (dialog.open) dialog.close(); else open();
        } else if (e.key === '/' && !isTyping(e.target) && !document.querySelector('dialog[open]')) {
            e.preventDefault();
            open();
        }
    });

    const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
    document.querySelectorAll('.kbd-shortcut').forEach((k) => { k.textContent = isMac ? '⌘K' : 'Ctrl K'; });
})();
