/* Interactive project previews (ported from v2).
   Each preview is an illustrative recreation of the real app's UI, driven by
   sample data. mountPreview() renders one into an element and returns
   { play } to start its demo. */

const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const reduced = () => motionQuery.matches;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, reduced() ? 0 : ms));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (id, cls = 'icon') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const html = (markup) => {
    const tpl = document.createElement('template');
    tpl.innerHTML = markup.trim();
    return tpl.content.firstElementChild;
};
const chrome = (url) => `
    <div class="pv-chrome" aria-hidden="true">
        <span class="dots"><i></i><i></i><i></i></span>
        <span class="pv-url">${esc(url)}</span>
        <span class="pv-tag">Illustrative</span>
    </div>`;
const toBottom = (el) => { el.scrollTop = el.scrollHeight; };

// Starting a new run invalidates the previous one, so a click mid-animation
// never interleaves two answers.
function runner() {
    let token = 0;
    return { start: () => ++token, live: (t) => t === token };
}

async function streamText(node, text, run, t, { speed = 18, onTick } = {}) {
    if (reduced()) {
        node.textContent = text;
        if (onTick) onTick();
        return run.live(t);
    }
    node.textContent = '';
    node.classList.add('pv-typing');
    const parts = text.split(/(\s+)/);
    for (const part of parts) {
        if (!run.live(t)) return false;
        node.textContent += part;
        if (part.trim()) {
            if (onTick) onTick();
            await wait(speed + Math.random() * speed);
        }
    }
    node.classList.remove('pv-typing');
    return run.live(t);
}

// "[1]" becomes a citation badge and `code` becomes inline code
const richText = (s) => esc(s)
    .replace(/\[(\d)\]/g, '<span class="pv-cite">$1</span>')
    .replace(/`([^`]+)`/g, '<code class="pv-inline-code">$1</code>');

const PY_TOKENS = /(#[^\n]*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|\b(def|class|return|for|in|if|else|import|from|as|with|None|True|False|and|or|not|lambda)\b|\b(self)\b|\b(\d+(?:\.\d+)?)\b|\b([A-Za-z_]\w*)(?=\()/g;
function highlightPython(code) {
    let out = '';
    let last = 0;
    code.replace(PY_TOKENS, (match, comment, str, kw, self, num, fn, offset) => {
        out += esc(code.slice(last, offset));
        const cls = comment ? 'tk-cm' : str ? 'tk-str' : kw ? 'tk-kw' : self ? 'tk-self' : num ? 'tk-num' : 'tk-fn';
        out += `<span class="${cls}">${esc(match)}</span>`;
        last = offset + match.length;
        return match;
    });
    return out + esc(code.slice(last));
}

/* ======================================================================
   01 · AWS Bedrock knowledge assistant
   ====================================================================== */
const BEDROCK_QA = [
    {
        q: 'How are documents prepared for search?',
        ms: [38, 21, 640],
        sources: [['architecture.md', 'Ingestion pipeline', 0.89], ['README.md', 'How it works', 0.81], ['roadmap.md', 'Storage', 0.58]],
        a: 'Documents are ingested, split into chunks and embedded with Amazon Titan Embeddings [1]. The vectors are stored in ChromaDB, so every question is answered by semantic search over those chunks rather than keyword matching [2].'
    },
    {
        q: 'How does it reduce hallucinations?',
        ms: [41, 19, 702],
        sources: [['README.md', 'Why RAG', 0.91], ['architecture.md', 'Prompting', 0.84], ['faq.md', 'Limitations', 0.66]],
        a: 'The model answers only from the chunks retrieved for each question, and every answer points back to its sources [1]. Grounding generation in retrieved context keeps responses accurate and easy to verify [2].'
    },
    {
        q: "What's next on the roadmap?",
        ms: [36, 18, 588],
        sources: [['roadmap.md', 'Next steps', 0.93], ['architecture.md', 'Deployment', 0.77], ['README.md', 'Setup', 0.61]],
        a: 'The next iteration moves document storage to Amazon S3 for scalable ingestion [1] and deploys the app on EC2 to make the assistant production-ready [2].'
    }
];

function bedrock(el) {
    const stages = [['Embed query', 'Titan Embeddings'], ['Search vectors', 'ChromaDB · top-k 3'], ['Generate', 'Titan LLM']];
    el.innerHTML = `${chrome('localhost:8501 · Knowledge Assistant')}
        <div class="pv-body st">
            <div class="st-head">
                <h4>${icon('book')} Knowledge Assistant</h4>
                <span class="st-badge">Bedrock · Titan · ChromaDB</span>
            </div>
            <div class="pv-chips" role="group" aria-label="Sample questions">
                ${BEDROCK_QA.map((x, i) => `<button type="button" class="pv-btn" data-i="${i}" aria-pressed="false">${esc(x.q)}</button>`).join('')}
            </div>
            <div class="st-chat pv-scroll"></div>
            <p class="sr-only" aria-live="polite"></p>
        </div>`;
    const chat = el.querySelector('.st-chat');
    const live = el.querySelector('[aria-live]');
    const buttons = [...el.querySelectorAll('.pv-btn')];
    const run = runner();

    async function ask(i) {
        const t = run.start();
        const qa = BEDROCK_QA[i];
        buttons.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
        chat.innerHTML = '';
        chat.append(html(`<div class="pv-msg st-user"><span class="pv-avatar" aria-hidden="true">You</span><div class="pv-bubble">${esc(qa.q)}</div></div>`));
        await wait(250);
        if (!run.live(t)) return;

        const pipe = html(`<div class="pipe">${stages.map(([b, s]) => `<div class="step"><span class="step-ico" aria-hidden="true"></span><b>${b}</b><small>${s}</small></div>`).join('')}</div>`);
        chat.append(pipe);
        const steps = [...pipe.children];
        for (let k = 0; k < stages.length; k++) {
            steps[k].classList.add('is-active');
            await wait(k === 2 ? 800 : 520);
            if (!run.live(t)) return;
            steps[k].classList.remove('is-active');
            steps[k].classList.add('is-done');
            steps[k].querySelector('small').textContent = `${qa.ms[k]} ms`;
            if (k === 1) {
                chat.append(html(`<div class="srcs">${qa.sources.map(([file, section, score], n) => `
                    <div class="src" style="--i:${n}">
                        <span class="src-n">[${n + 1}]</span>
                        <span class="src-name">${esc(file)} <small>· ${esc(section)}</small></span>
                        <span class="src-bar" aria-hidden="true"><span style="--s:${score}"></span></span>
                        <span class="src-score">${score.toFixed(2)}</span>
                    </div>`).join('')}</div>`));
                toBottom(chat);
            }
        }

        const msg = html(`<div class="pv-msg st-bot"><span class="pv-avatar" aria-hidden="true">${icon('bot')}</span><div class="pv-bubble"><p></p></div></div>`);
        chat.append(msg);
        const p = msg.querySelector('p');
        if (await streamText(p, qa.a, run, t, { speed: 20, onTick: () => toBottom(chat) })) {
            p.innerHTML = richText(qa.a);
            live.textContent = `Answer: ${qa.a.replace(/\s*\[\d\]/g, '')}`;
            toBottom(chat);
        }
    }

    buttons.forEach((b, i) => b.addEventListener('click', () => ask(i)));
    return { play: () => ask(0) };
}

/* ======================================================================
   02 · Codebase RAG assistant (snippets condensed from the real repo)
   ====================================================================== */
const CODEBASE_TREE = [
    ['loaders', ['code_loader.py']],
    ['utils', ['chunker.py']],
    ['embeddings', ['embedder.py']],
    ['vectorstore', ['vector_store.py']],
    ['retriever', ['code_retriever.py']],
    ['rag_pipeline', ['generator.py', 'main.py']],
    ['streamlit', ['app.py']],
    [null, ['README.md', 'requirements.txt']]
];
const CODEBASE_QA = [
    {
        q: 'Which file types get indexed?',
        file: 'loaders/code_loader.py',
        lines: 'L5–17',
        score: 0.86,
        code: 'def load_codebase(directory_path):\n    py = DirectoryLoader(directory_path, glob="**/*.py",\n                         loader_cls=PythonLoader)\n    md = DirectoryLoader(directory_path, glob="**/*.md",\n                         loader_cls=TextLoader)\n    js = DirectoryLoader(directory_path, glob="**/*.json",\n                         loader_cls=JSONLoader)\n    return py.load() + md.load() + js.load()',
        a: '`load_codebase()` in loaders/code_loader.py runs a LangChain DirectoryLoader once each for .py, .md and .json files and concatenates the results into a single document list.'
    },
    {
        q: 'How is code split into chunks?',
        file: 'utils/chunker.py',
        lines: 'L5–14',
        score: 0.82,
        code: 'class CodebaseChunker:\n    def __init__(self, codebase_dir, chunk_size=500,\n                 chunk_overlap=50):\n        self.splitter = RecursiveCharacterTextSplitter(\n            chunk_size=chunk_size,\n            chunk_overlap=chunk_overlap,\n            separators=["\\n\\n", "\\n", " ", ""],\n        )',
        a: '`CodebaseChunker` wraps a RecursiveCharacterTextSplitter with 500-character chunks and a 50-character overlap. It splits on blank lines first, then newlines and spaces, so functions tend to stay intact.'
    },
    {
        q: 'How many chunks are retrieved?',
        file: 'retriever/code_retriever.py',
        lines: 'L6–15',
        score: 0.79,
        code: 'def load_retriever(persist_directory="chroma_db",\n                   embedding_function=None):\n    # Reload the persisted Chroma DB\n    vectordb = Chroma(persist_directory=persist_directory,\n                      embedding_function=embedding_function)\n    # return top 3 chunks\n    return vectordb.as_retriever(search_kwargs={"k": 3})',
        a: 'Three. `load_retriever()` reloads the persisted Chroma vector store and exposes it as a retriever with k = 3, so each answer is generated from the three most similar code chunks.'
    }
];

function codebase(el) {
    const tree = CODEBASE_TREE.map(([dir, files]) => {
        const fileItems = files.map((f) => {
            const path = dir ? `${dir}/${f}` : f;
            return `<li class="${dir ? 'cb-file' : 'cb-file cb-root'}" data-path="${path}" data-ext="${f.split('.').pop()}">${f}</li>`;
        }).join('');
        return dir ? `<li class="cb-dir">${dir}/</li>${fileItems}` : fileItems;
    }).join('');

    el.innerHTML = `${chrome('codebase-rag-assistant · Streamlit')}
        <div class="pv-body cb">
            <aside class="cb-tree" aria-label="Repository files">
                <span class="pv-label">Explorer</span>
                <ul>${tree}</ul>
            </aside>
            <div class="cb-main">
                <div class="cb-head">
                    <h4>Ask the codebase</h4>
                    <span class="cb-badge">Mistral-7B · Chroma</span>
                </div>
                <div class="pv-chips" role="group" aria-label="Sample questions">
                    ${CODEBASE_QA.map((x, i) => `<button type="button" class="pv-btn" data-i="${i}" aria-pressed="false">${esc(x.q)}</button>`).join('')}
                </div>
                <div class="cb-chat pv-scroll"></div>
                <p class="sr-only" aria-live="polite"></p>
            </div>
        </div>`;
    const chat = el.querySelector('.cb-chat');
    const live = el.querySelector('[aria-live]');
    const buttons = [...el.querySelectorAll('.pv-btn')];
    const files = [...el.querySelectorAll('.cb-file')];
    const run = runner();

    async function ask(i) {
        const t = run.start();
        const qa = CODEBASE_QA[i];
        buttons.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
        files.forEach((f) => f.classList.remove('is-hit'));
        chat.innerHTML = '';
        chat.append(html(`<div class="pv-msg cb-user"><span class="pv-avatar" aria-hidden="true">${icon('terminal')}</span><div class="pv-bubble">${esc(qa.q)}</div></div>`));

        const status = html(`<div class="cb-status"><span class="pv-spinner" aria-hidden="true"></span>Embedding query · searching Chroma (k = 3)…</div>`);
        chat.append(status);
        await wait(750);
        if (!run.live(t)) return;
        status.innerHTML = `${icon('check', 'icon icon-xs')} Retrieved 3 chunks · top match ${qa.score.toFixed(2)}`;
        const hit = files.find((f) => f.dataset.path === qa.file);
        if (hit) hit.classList.add('is-hit');

        chat.append(html(`
            <div class="cb-snippet">
                <div class="cb-snippet-head"><b>${esc(qa.file)}</b><span>${qa.lines}</span></div>
                <pre tabindex="0" aria-label="Retrieved code from ${esc(qa.file)}"><code>${highlightPython(qa.code)}</code></pre>
            </div>`));
        toBottom(chat);
        await wait(450);
        if (!run.live(t)) return;

        const msg = html(`<div class="pv-msg cb-bot"><span class="pv-avatar" aria-hidden="true">${icon('sparkles')}</span><div class="pv-bubble"><p></p></div></div>`);
        chat.append(msg);
        const p = msg.querySelector('p');
        if (await streamText(p, qa.a.replace(/`/g, ''), run, t, { speed: 20, onTick: () => toBottom(chat) })) {
            p.innerHTML = richText(qa.a);
            live.textContent = `Answer: ${qa.a.replace(/`/g, '')}`;
            toBottom(chat);
        }
    }

    buttons.forEach((b, i) => b.addEventListener('click', () => ask(i)));
    return { play: () => ask(0) };
}

/* ======================================================================
   03 · XBRL auto-tagging (public IFRS concept names, sample figures)
   ====================================================================== */
const XBRL_ROWS = [
    { label: 'Revenue', amount: '4,250', concept: 'ifrs-full:Revenue', conf: 0.99 },
    { label: 'Cost of sales', amount: '(2,810)', concept: 'ifrs-full:CostOfSales', conf: 0.98 },
    { label: 'Gross profit', amount: '1,440', concept: 'ifrs-full:GrossProfit', conf: 0.99, total: true },
    { label: 'Administrative expenses', amount: '(620)', concept: 'ifrs-full:AdministrativeExpense', conf: 0.96 },
    { label: 'Finance costs', amount: '(85)', concept: 'ifrs-full:FinanceCosts', conf: 0.97 },
    { label: 'Profit before tax', amount: '735', concept: 'ifrs-full:ProfitLossBeforeTax', conf: 0.98, total: true },
    { label: 'Income tax expense', amount: '(154)', concept: 'ifrs-full:IncomeTaxExpenseContinuingOperations', conf: 0.94 },
    { label: 'Profit for the year', amount: '581', concept: 'ifrs-full:ProfitLoss', conf: 0.99, total: true }
];

function xbrl(el) {
    el.innerHTML = `${chrome('auto-tagger · Statement of profit or loss')}
        <div class="pv-body xb">
            <div class="xb-toolbar">
                <h4>Statement of profit or loss</h4>
                <span class="xb-units">Sample · £000</span>
                <div class="xb-actions">
                    <span class="xb-progress">0 / ${XBRL_ROWS.length} tagged</span>
                    <button type="button" class="pv-btn pv-btn-solid xb-run">${icon('zap')} Auto-tag</button>
                </div>
            </div>
            <div class="xb-table pv-scroll" style="position:relative">
                <div class="xb-thead" aria-hidden="true"><span>Line item</span><span>Amount</span><span>XBRL concept</span><span>Conf.</span></div>
                <ul class="xb-rows">
                    ${XBRL_ROWS.map((r, i) => `
                        <li><button type="button" class="xb-row${r.total ? ' is-total' : ''}" data-i="${i}" aria-pressed="false">
                            <span class="xb-label">${esc(r.label)}</span>
                            <span class="xb-amt">${esc(r.amount)}</span>
                            <span class="xb-concept"></span>
                            <span class="xb-conf"></span>
                        </button></li>`).join('')}
                </ul>
            </div>
            <div class="xb-tokens">
                <span class="pv-label">Token view · NER tags</span>
                <div class="xb-toklist"><span class="xb-arrow">Select a line item to inspect its tokens.</span></div>
            </div>
            <p class="sr-only" aria-live="polite"></p>
        </div>`;
    const runBtn = el.querySelector('.xb-run');
    const progress = el.querySelector('.xb-progress');
    const table = el.querySelector('.xb-table');
    const rows = [...el.querySelectorAll('.xb-row')];
    const tokList = el.querySelector('.xb-toklist');
    const live = el.querySelector('[aria-live]');
    const tagged = new Set();
    const run = runner();

    function setTagged(i, on) {
        const row = rows[i];
        const r = XBRL_ROWS[i];
        row.classList.toggle('is-tagged', on);
        row.querySelector('.xb-concept').textContent = on ? r.concept : '';
        row.querySelector('.xb-conf').textContent = on ? `${Math.round(r.conf * 100)}%` : '';
        if (on) tagged.add(i); else tagged.delete(i);
        progress.textContent = `${tagged.size} / ${XBRL_ROWS.length} tagged`;
    }

    function select(i) {
        rows.forEach((row, k) => {
            row.classList.toggle('is-selected', k === i);
            row.setAttribute('aria-pressed', String(k === i));
        });
        const r = XBRL_ROWS[i];
        const words = r.label.split(' ');
        const toks = words.map((w, k) => `<span class="tok ${k === 0 ? 'tok-b' : 'tok-i'}" style="--i:${k}">${esc(w)}<small>${k === 0 ? 'B-ITEM' : 'I-ITEM'}</small></span>`);
        toks.push(`<span class="tok tok-v" style="--i:${words.length}">${esc(r.amount)}<small>B-VAL</small></span>`);
        const mapped = tagged.has(i)
            ? `<span class="xb-arrow">→ <b>${esc(r.concept)}</b> · ${r.conf.toFixed(2)}</span>`
            : '<span class="xb-arrow">→ run auto-tag to map a concept</span>';
        tokList.innerHTML = toks.join('') + mapped;
    }

    // Scroll inside the table only (scrollIntoView would also move the page)
    function centerRow(i) {
        const row = rows[i];
        table.scrollTop = row.offsetTop - table.clientHeight / 2 + row.offsetHeight / 2;
    }

    async function autotag() {
        const t = run.start();
        runBtn.disabled = true;
        rows.forEach((_, i) => setTagged(i, false));
        for (let i = 0; i < rows.length; i++) {
            rows[i].classList.add('is-scanning');
            centerRow(i);
            await wait(240);
            rows[i].classList.remove('is-scanning');
            if (!run.live(t)) return;
            setTagged(i, true);
        }
        runBtn.disabled = false;
        runBtn.innerHTML = `${icon('refresh')} Run again`;
        live.textContent = `${XBRL_ROWS.length} of ${XBRL_ROWS.length} line items tagged with IFRS concepts.`;
        select(6);
        if (rows[6].offsetTop + rows[6].offsetHeight > table.scrollTop + table.clientHeight) centerRow(6);
        else table.scrollTop = 0;
    }

    runBtn.addEventListener('click', autotag);
    rows.forEach((row, i) => row.addEventListener('click', () => select(i)));
    return { play: autotag };
}

/* ======================================================================
   04 · Next-word prediction: a tiny retriever over sample sentences
   ====================================================================== */
const NW_CORPUS = [
    'The directors are responsible for preparing the annual report and the financial statements in accordance with applicable law and regulations.',
    'The directors have a reasonable expectation that the Group has adequate resources to continue in operational existence for the foreseeable future.',
    'The financial statements have been prepared on a going concern basis.',
    'The directors consider that the annual report and accounts, taken as a whole, is fair, balanced and understandable.',
    "The Board has reviewed the effectiveness of the Group's system of internal control and risk management.",
    'Revenue is recognised when control of the goods or services is transferred to the customer.',
    "The Group's principal risks and uncertainties are set out in the strategic report.",
    'Property, plant and equipment is stated at cost less accumulated depreciation and any impairment losses.',
    'Deferred tax is recognised on temporary differences between the carrying amounts of assets and liabilities.',
    'Trade receivables are measured at amortised cost using the effective interest method.',
    'Cash and cash equivalents comprise cash at bank and short-term deposits with an original maturity of three months or less.',
    'Operating profit increased compared with the prior year, driven by higher revenue and improved margins.',
    'Inventories are stated at the lower of cost and net realisable value.',
    'Key management personnel are those persons having authority and responsibility for planning, directing and controlling the activities of the Group.',
    'The Company has taken advantage of the exemption from preparing a cash flow statement.',
    'The auditor has expressed an unqualified opinion on the financial statements for the year.'
];
const normWord = (w) => w.toLowerCase().replace(/[^a-z0-9']/g, '');
const NW_INDEX = NW_CORPUS.map((s) => {
    const words = s.split(/\s+/);
    return { words, norm: words.map(normWord) };
});

// Back-off retrieval: match the last 3 typed words, then 2, then 1, then the
// partial word alone, and continue with the words that follow in the corpus.
function predict(text) {
    if (!/\S/.test(text)) return null;
    const endsWithSpace = /\s$/.test(text);
    const ctx = text.trim().split(/\s+/).map(normWord);
    const partial = endsWithSpace ? '' : ctx.pop();
    if (!endsWithSpace && !partial) return null;
    const minN = partial.length >= 2 ? 0 : 1;
    for (let n = Math.min(3, ctx.length); n >= minN; n--) {
        const key = ctx.slice(ctx.length - n);
        for (const doc of NW_INDEX) {
            for (let i = n; i < doc.norm.length; i++) {
                let ok = true;
                for (let k = 0; k < n; k++) {
                    if (doc.norm[i - n + k] !== key[k]) { ok = false; break; }
                }
                if (!ok || (partial && !doc.norm[i].startsWith(partial))) continue;
                let completion = partial ? doc.words[i].slice(partial.length) : doc.words[i];
                let j = i;
                while (!/[.;]$/.test(doc.words[j]) && j + 1 < doc.words.length && j - i < 3) {
                    j += 1;
                    completion += ` ${doc.words[j]}`;
                }
                if (!completion.trim()) continue;
                return { completion, doc, start: i - n, n, end: j };
            }
        }
    }
    return null;
}

function nextword(el) {
    el.innerHTML = `${chrome('Annual Report 2025.docx · Editor')}
        <div class="pv-body nw">
            <div class="nw-ribbon" aria-hidden="true">
                <span class="nw-rb">B</span><span class="nw-rb nw-rb-i">I</span><span class="nw-rb nw-rb-u">U</span>
                <span class="nw-font">Calibri · 11</span>
                <span class="nw-ai"><span class="nw-ai-dot"></span>AI suggestions on</span>
            </div>
            <div class="nw-canvas">
                <div class="nw-page">
                    <p class="nw-doc-title">Directors' report</p>
                    <p class="nw-doc-sub">Draft · sample document</p>
                    <div class="nw-editor">
                        <div class="nw-ghost" aria-hidden="true"><span class="nw-mirror"></span><span class="nw-suggest"></span></div>
                        <textarea class="nw-input" spellcheck="false" maxlength="600"
                            aria-label="Sample editor with next-word suggestions. Type a sentence from an annual report. Press Tab to accept a suggestion or Escape to dismiss it."
                            placeholder="Start typing, e.g. “The directors are”"></textarea>
                    </div>
                </div>
            </div>
            <div class="nw-status">
                <span class="nw-ctx">Retrieves matching phrases from sample annual-report sentences</span>
                <span class="nw-lat" title="Retrieval time, measured in your browser">– ms</span>
                <span class="nw-hint">Tab ↹ accept · Esc dismiss</span>
                <button type="button" class="nw-accept" hidden>Accept suggestion</button>
            </div>
            <p class="sr-only" aria-live="polite"></p>
        </div>`;
    const input = el.querySelector('.nw-input');
    const ghost = el.querySelector('.nw-ghost');
    const mirror = el.querySelector('.nw-mirror');
    const suggestEl = el.querySelector('.nw-suggest');
    const ctxEl = el.querySelector('.nw-ctx');
    const latEl = el.querySelector('.nw-lat');
    const acceptBtn = el.querySelector('.nw-accept');
    const live = el.querySelector('[aria-live]');
    const run = runner();
    let current = null;
    let dismissed = false;
    let liveTimer;

    function render() {
        const atEnd = input.selectionStart === input.value.length && input.selectionEnd === input.value.length;
        const show = current && !dismissed && (atEnd || document.activeElement !== input);
        // A trailing newline needs a character after it to take up space in the mirror
        mirror.textContent = input.value + (input.value.endsWith('\n') ? ' ' : '');
        suggestEl.textContent = show ? current.completion : '';
        acceptBtn.hidden = !show;
        ghost.scrollTop = input.scrollTop;
    }

    function update() {
        const t0 = performance.now();
        current = predict(input.value);
        const dt = performance.now() - t0;
        dismissed = false;
        latEl.textContent = `${dt < 0.01 ? '<0.01' : dt.toFixed(2)} ms`;
        if (current) {
            const { doc, start, n, end } = current;
            const pre = doc.words.slice(Math.max(0, start - 3), start).join(' ');
            const matched = doc.words.slice(start, start + n).join(' ');
            const after = doc.words.slice(start + n, end + 1).join(' ');
            const parts = [start > 3 ? '…' : '', esc(pre), matched ? `<mark>${esc(matched)}</mark>` : '', esc(after)].filter(Boolean);
            ctxEl.innerHTML = `<b>Retrieved:</b> “${parts.join(' ')} …”`;
            clearTimeout(liveTimer);
            liveTimer = setTimeout(() => { live.textContent = `Suggestion: ${current ? current.completion.trim() : ''}`; }, 600);
        } else {
            ctxEl.textContent = input.value.trim() ? 'No matching phrase in the sample corpus' : 'Retrieves matching phrases from sample annual-report sentences';
        }
        render();
    }

    function accept() {
        if (!current) return;
        input.value = `${input.value}${current.completion} `;
        input.selectionStart = input.selectionEnd = input.value.length;
        update();
    }

    input.addEventListener('input', update);
    input.addEventListener('scroll', render);
    ['click', 'keyup', 'select'].forEach((type) => input.addEventListener(type, render));
    input.addEventListener('keydown', (e) => {
        const showing = !acceptBtn.hidden;
        if (e.key === 'Tab' && !e.shiftKey && showing) {
            e.preventDefault();
            accept();
        } else if (e.key === 'Escape' && showing) {
            e.preventDefault();
            e.stopPropagation();
            dismissed = true;
            render();
        }
    });
    acceptBtn.addEventListener('click', () => {
        accept();
        input.focus();
    });
    // The user taking over cancels the auto-play demo
    input.addEventListener('pointerdown', () => run.start());
    input.addEventListener('focus', () => run.start());

    async function demo() {
        const t = run.start();
        const text = 'The directors have a reasonable';
        input.value = '';
        update();
        for (const ch of text) {
            if (!run.live(t)) return;
            input.value += ch;
            update();
            await wait(48);
        }
        await wait(1200);
        if (run.live(t)) accept();
    }

    return { play: demo };
}

/* ======================================================================
   05 · LDA resume screening dashboard
   ====================================================================== */
const LDA_TOPICS = [
    ['ML & modelling', 'python · model · regression · sklearn · training', 0.46],
    ['Data engineering', 'sql · pipeline · etl · spark · warehouse', 0.31],
    ['Reporting & BI', 'dashboard · tableau · kpi · excel · stakeholder', 0.23]
];
const LDA_ROLES = [
    {
        role: 'Data Scientist',
        score: 84,
        verdict: 'Strong match',
        kws: [['python', 1], ['machine learning', 1], ['statistics', 1], ['sql', 1], ['deep learning', 0], ['nlp', 0]],
        qs: [
            'Which metrics did you use to validate your regression models, and why?',
            'How would you handle class imbalance in a classification problem?',
            'Walk me through turning an exploratory analysis into a production model.'
        ]
    },
    {
        role: 'ML Engineer',
        score: 63,
        verdict: 'Partial match',
        kws: [['python', 1], ['pipelines', 1], ['scikit-learn', 1], ['docker', 0], ['model serving', 0], ['pytorch', 0]],
        qs: [
            'How would you package a scikit-learn model for low-latency serving?',
            'What would you monitor once a model is in production?',
            'How do you version data and models across pipeline runs?'
        ]
    },
    {
        role: 'Data Analyst',
        score: 91,
        verdict: 'Excellent match',
        kws: [['sql', 1], ['dashboards', 1], ['excel', 1], ['tableau', 1], ['stakeholders', 1], ['python', 1]],
        qs: [
            'How do you decide which KPIs belong on an executive dashboard?',
            'Describe a SQL query you optimised and how you measured the gain.',
            'How do you present an unexpected finding to stakeholders?'
        ]
    }
];

function lda(el) {
    el.innerHTML = `${chrome('localhost:8501 · Resume Screening Dashboard')}
        <div class="pv-body ld">
            <aside class="ld-side">
                <div>
                    <p class="ld-h" id="ld-role-label">Target role</p>
                    <div class="ld-roles" role="radiogroup" aria-labelledby="ld-role-label">
                        ${LDA_ROLES.map((r, i) => `<button type="button" class="ld-role" role="radio" aria-checked="false" tabindex="-1" data-i="${i}">${r.role}</button>`).join('')}
                    </div>
                </div>
                <div>
                    <p class="ld-h">Resume</p>
                    <div class="ld-file">${icon('file')} candidate_017.pdf</div>
                </div>
                <p class="ld-meta">LDA · k = 3 topics<br>token index · v2</p>
            </aside>
            <div class="ld-main pv-scroll">
                <div class="ld-top">
                    <div class="ld-ring" aria-hidden="true">
                        <svg viewBox="0 0 64 64"><circle class="ld-track" cx="32" cy="32" r="28"/><circle class="ld-val" cx="32" cy="32" r="28" pathLength="100"/></svg>
                        <b class="ld-score">0%</b>
                    </div>
                    <div class="ld-verdict"><b>Scoring…</b><small>Job-match score · token index</small></div>
                </div>
                <section class="ld-sec">
                    <p class="ld-h">Dominant topics <small>LDA</small></p>
                    ${LDA_TOPICS.map(([name, kw, w]) => `
                        <div class="ld-topic">
                            <div class="ld-topic-top"><b>${name}</b><span>${Math.round(w * 100)}%</span></div>
                            <div class="ld-topic-kw">${kw}</div>
                            <div class="ld-bar"><span data-w="${w}"></span></div>
                        </div>`).join('')}
                </section>
                <section class="ld-sec">
                    <p class="ld-h">Keyword match</p>
                    <ul class="ld-kws"></ul>
                </section>
                <section class="ld-sec ld-qs">
                    <p class="ld-h">Interview questions <small>via OpenAI API</small></p>
                    <ol></ol>
                </section>
                <p class="sr-only" aria-live="polite"></p>
            </div>
        </div>`;
    const radios = [...el.querySelectorAll('.ld-role')];
    const ring = el.querySelector('.ld-val');
    const scoreEl = el.querySelector('.ld-score');
    const verdict = el.querySelector('.ld-verdict b');
    const kwList = el.querySelector('.ld-kws');
    const qList = el.querySelector('.ld-qs ol');
    const bars = [...el.querySelectorAll('.ld-bar span')];
    const live = el.querySelector('[aria-live]');
    const run = runner();
    let shown = 0;

    function countTo(target, t) {
        const from = shown;
        const start = performance.now();
        const duration = reduced() ? 0 : 900;
        const step = (now) => {
            if (!run.live(t)) return;
            const k = duration ? Math.min((now - start) / duration, 1) : 1;
            shown = Math.round(from + (target - from) * (1 - Math.pow(1 - k, 3)));
            scoreEl.textContent = `${shown}%`;
            if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }

    async function choose(i, focus = false) {
        const t = run.start();
        const r = LDA_ROLES[i];
        radios.forEach((b, k) => {
            b.setAttribute('aria-checked', String(k === i));
            b.tabIndex = k === i ? 0 : -1;
        });
        if (focus) radios[i].focus();
        bars.forEach((b) => { b.style.width = `${b.dataset.w * 100}%`; });
        ring.style.strokeDashoffset = String(100 - r.score);
        ring.style.stroke = r.score >= 80 ? '#2f9e44' : r.score >= 70 ? '#f59f00' : '#e03131';
        countTo(r.score, t);
        verdict.textContent = r.verdict;
        kwList.innerHTML = r.kws.map(([k, hit], n) => `<li class="ld-kw ${hit ? 'is-hit' : 'is-miss'}" style="--i:${n}"><span class="sr-only">${hit ? 'Matched: ' : 'Missing: '}</span>${hit ? '✓' : '✕'} ${esc(k)}</li>`).join('');
        qList.innerHTML = '';
        live.textContent = `${r.role}: ${r.score}% match, ${r.verdict.toLowerCase()}.`;
        await wait(500);
        for (const q of r.qs) {
            if (!run.live(t)) return;
            const li = document.createElement('li');
            qList.append(li);
            if (!(await streamText(li, q, run, t, { speed: 14 }))) return;
        }
    }

    radios.forEach((b, i) => {
        b.addEventListener('click', () => choose(i));
        b.addEventListener('keydown', (e) => {
            const dir = ['ArrowDown', 'ArrowRight'].includes(e.key) ? 1 : ['ArrowUp', 'ArrowLeft'].includes(e.key) ? -1 : 0;
            if (!dir) return;
            e.preventDefault();
            choose((i + dir + radios.length) % radios.length, true);
        });
    });
    radios[0].tabIndex = 0;
    return { play: () => choose(0) };
}

/* ======================================================================
   06 · NoteNinja learning chatbot
   ====================================================================== */
const NN_NOTES = ['DBMS · Unit 3 · Normalization.pdf', 'OS · Unit 4 · Deadlocks.pdf', 'CN · Unit 2 · Transport layer.pdf'];
const NN_QA = [
    {
        q: 'Explain 3NF in simple terms',
        note: 0,
        src: 'DBMS · Unit 3, p. 4',
        a: "A table is in Third Normal Form when it's already in 2NF and no non-key column depends on another non-key column. In your notes' example, moving DeptName into its own Department table removes that transitive dependency."
    },
    {
        q: 'What are the 4 conditions for deadlock?',
        note: 1,
        src: 'OS · Unit 4, p. 2',
        a: 'Mutual exclusion, hold and wait, no preemption, and circular wait. Your notes point out that breaking any one of these conditions is enough to prevent deadlock.'
    },
    {
        q: 'TCP vs UDP?',
        note: 2,
        src: 'CN · Unit 2, p. 7',
        a: 'TCP is connection-oriented and guarantees ordered, reliable delivery. UDP is connectionless: faster, but with no delivery guarantees. Your notes list video streaming and DNS as typical UDP uses.'
    }
];

function noteninja(el) {
    el.innerHTML = `${chrome('noteninja · Streamlit')}
        <div class="pv-body nn">
            <aside class="nn-side">
                <div class="nn-brand"><span class="nn-logo" aria-hidden="true">N</span>NoteNinja AI</div>
                <span class="pv-label">My notes</span>
                <ul class="nn-notes">
                    ${NN_NOTES.map((n) => `<li class="nn-note">${icon('file')}<span>${esc(n)}</span></li>`).join('')}
                </ul>
            </aside>
            <div class="nn-main">
                <div class="nn-head"><h4>Ask your notes</h4><span class="nn-badge">Flan-T5 · LangChain</span></div>
                <div class="nn-chat pv-scroll"></div>
                <div class="nn-input">
                    <div class="pv-chips" role="group" aria-label="Sample questions">
                        ${NN_QA.map((x, i) => `<button type="button" class="pv-btn" data-i="${i}" aria-pressed="false">${esc(x.q)}</button>`).join('')}
                    </div>
                    <div class="nn-field" aria-hidden="true">Ask anything about your notes…</div>
                </div>
                <p class="sr-only" aria-live="polite"></p>
            </div>
        </div>`;
    const chat = el.querySelector('.nn-chat');
    const notes = [...el.querySelectorAll('.nn-note')];
    const buttons = [...el.querySelectorAll('.pv-btn')];
    const live = el.querySelector('[aria-live]');
    const run = runner();

    async function ask(i) {
        const t = run.start();
        const qa = NN_QA[i];
        buttons.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
        notes.forEach((n) => n.classList.remove('is-hit'));
        chat.innerHTML = '';
        chat.append(html(`<div class="pv-msg pv-msg-user nn-user"><span class="pv-avatar" aria-hidden="true">You</span><div class="pv-bubble">${esc(qa.q)}</div></div>`));
        const status = html(`<div class="cb-status"><span class="pv-spinner" aria-hidden="true"></span>Searching your notes…</div>`);
        chat.append(status);
        await wait(650);
        if (!run.live(t)) return;
        status.remove();
        notes[qa.note].classList.add('is-hit');

        const msg = html(`<div class="pv-msg nn-bot"><span class="pv-avatar" aria-hidden="true">${icon('bot')}</span><div class="pv-bubble"><p></p></div></div>`);
        chat.append(msg);
        const p = msg.querySelector('p');
        if (await streamText(p, qa.a, run, t, { speed: 18, onTick: () => toBottom(chat) })) {
            msg.querySelector('.pv-bubble').append(html(`<span class="nn-src">${icon('file')} ${esc(qa.src)}</span>`));
            live.textContent = `Answer: ${qa.a}`;
            toBottom(chat);
        }
    }

    buttons.forEach((b, i) => b.addEventListener('click', () => ask(i)));
    return { play: () => ask(0) };
}

const PREVIEWS = { bedrock, codebase, xbrl, nextword, lda, noteninja };

export function mountPreview(el, name) {
    const factory = PREVIEWS[name];
    return factory ? factory(el) : null;
}
