// The hero deck: three skill groups stacked in 3D. The front card loads its
// skills line by line; the tabs bring another group to the front.

const LEVELS = {
    prod: ['Production', 'lv-prod'],
    research: ['Research', 'lv-research'],
    intern: ['Internship', 'lv-other'],
    proj: ['Projects', 'lv-other']
};

const GROUPS = {
    genai: {
        title: 'GenAI and LLMs',
        rows: [
            ['RAG systems', 'prod', 'Haystack · LangChain'],
            ['Large language models', 'proj', 'Mistral-7B · Flan-T5 · Titan'],
            ['Fine-tuning', 'proj', 'LoRA · PEFT · Hugging Face'],
            ['Multi-agent systems', 'proj', 'LangGraph'],
            ['Vector search', 'proj', 'ChromaDB · FAISS'],
            ['Prompt engineering', 'intern', 'LLM evaluation'],
            ['Cloud GenAI', 'proj', 'AWS Bedrock']
        ]
    },
    ml: {
        title: 'Machine learning and NLP',
        rows: [
            ['Sequence models', 'prod', 'LSTM'],
            ['Entity extraction', 'prod', 'NER'],
            ['Financial tagging', 'prod', 'XBRL taxonomies'],
            ['Deep learning', 'proj', 'PyTorch · TensorFlow · Keras'],
            ['Transformers', 'proj', 'Hugging Face · SentenceTransformers'],
            ['Classical ML', 'intern', 'Scikit-learn · NLTK · spaCy'],
            ['Topic modeling', 'research', 'LDA · Gensim · TF-IDF']
        ]
    },
    ops: {
        title: 'MLOps and data',
        rows: [
            ['Model serving', 'prod', 'FastAPI · REST APIs'],
            ['Containers', 'prod', 'Docker'],
            ['Messaging', 'prod', 'RabbitMQ'],
            ['Monitoring', 'prod', 'Grafana · Prometheus'],
            ['Cloud', 'proj', 'AWS S3 · EC2 · SageMaker'],
            ['Data processing', 'proj', 'Python · SQL · Pandas · PySpark'],
            ['Dashboards', 'proj', 'Streamlit · Power BI']
        ]
    }
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const countHtml = (done, total) => (done === total ? `<b>${total}</b> skills` : `<b>${done}</b> of ${total}`);

function cardHtml(key, loaded) {
    const g = GROUPS[key];
    const rows = g.rows.map(([skill, level, tools]) => {
        const [levelText, levelClass] = LEVELS[level];
        return `
        <li><button type="button" class="dc-row${loaded ? ' is-loaded' : ''}" data-level="${levelText}">
            <span class="dc-label">${esc(skill)}</span>
            <span class="dc-level ${levelClass}">${levelText}</span>
            <span class="dc-tools">${esc(tools)}</span>
        </button></li>`;
    }).join('');
    return `
        <div class="dc-head">
            <p class="dc-title">${g.title}</p>
            <p class="dc-count">${countHtml(loaded ? g.rows.length : 0, g.rows.length)}</p>
        </div>
        <ul class="dc-rows">${rows}</ul>`;
}

export function initDeck(root, { reduceMotion }) {
    if (!root) return;
    const holder = root.querySelector('.deck-cards');
    const tabs = [...root.querySelectorAll('[role="tab"]')];
    const order = ['genai', 'ml', 'ops'];
    const wait = (ms) => new Promise((r) => setTimeout(r, reduceMotion.matches ? 0 : ms));
    let run = 0;

    // Back cards first in the DOM, so the front card paints on top in every browser
    const cards = {};
    order.slice().reverse().forEach((key) => {
        const card = document.createElement('div');
        card.className = 'dcard';
        card.id = `deck-${key}`;
        card.setAttribute('role', 'tabpanel');
        card.setAttribute('aria-labelledby', `deck-tab-${key}`);
        card.innerHTML = cardHtml(key, key !== order[0]);
        holder.append(card);
        cards[key] = card;
    });

    let stackOrder = [...order];
    function place() {
        stackOrder.forEach((key, pos) => {
            const card = cards[key];
            card.dataset.pos = String(pos);
            card.inert = pos !== 0;
            card.setAttribute('aria-hidden', String(pos !== 0));
        });
    }
    place();

    async function load(key) {
        const t = ++run;
        const card = cards[key];
        const rows = [...card.querySelectorAll('.dc-row')];
        const count = card.querySelector('.dc-count');
        rows.forEach((r) => r.classList.remove('is-loaded', 'is-selected'));
        count.innerHTML = countHtml(0, rows.length);
        await wait(450);
        for (let i = 0; i < rows.length; i++) {
            if (t !== run) return;
            rows[i].classList.add('is-scanning');
            await wait(180);
            if (t !== run) return;
            rows[i].classList.remove('is-scanning');
            rows[i].classList.add('is-loaded');
            count.innerHTML = countHtml(i + 1, rows.length);
        }
    }

    function bringToFront(key, focus) {
        tabs.forEach((tab) => {
            const on = tab.dataset.card === key;
            tab.setAttribute('aria-selected', String(on));
            tab.tabIndex = on ? 0 : -1;
            if (on && focus) tab.focus();
        });
        if (stackOrder[0] === key) return;
        stackOrder = [key, ...stackOrder.filter((k) => k !== key)];
        place();
        load(key);
    }

    tabs.forEach((tab, i) => {
        tab.addEventListener('click', () => bringToFront(tab.dataset.card));
        tab.addEventListener('keydown', (e) => {
            const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
            if (!step) return;
            e.preventDefault();
            bringToFront(tabs[(i + step + tabs.length) % tabs.length].dataset.card, true);
        });
    });

    // A click on a line selects it and reads it out
    const announce = document.getElementById('announce');
    holder.addEventListener('click', (e) => {
        const row = e.target.closest('.dc-row');
        if (!row) return;
        row.closest('.dc-rows').querySelectorAll('.dc-row').forEach((r) => r.classList.toggle('is-selected', r === row));
        if (announce) announce.textContent = `${row.querySelector('.dc-label').textContent}: ${row.querySelector('.dc-tools').textContent}. ${row.dataset.level}.`;
    });

    // The front group loads once the deck is on screen
    const io = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        setTimeout(() => load(stackOrder[0]), reduceMotion.matches ? 0 : 500);
    }, { threshold: 0.3 });
    io.observe(root);
}
