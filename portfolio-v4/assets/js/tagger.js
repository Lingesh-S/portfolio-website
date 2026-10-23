// The live statement in the hero: sample figures, public IFRS concept names,
// tagged the way the production LSTM + NER models tag a filing. The visitor's
// own lines go through a small keyword stand-in for those models.

const STATEMENTS = {
    pl: {
        title: 'Statement of profit or loss',
        rows: [
            ['Revenue', '4,250', 'Revenue', 0.99],
            ['Cost of sales', '(2,810)', 'CostOfSales', 0.98],
            ['Gross profit', '1,440', 'GrossProfit', 0.99, true],
            ['Administrative expenses', '(620)', 'AdministrativeExpense', 0.96],
            ['Finance costs', '(85)', 'FinanceCosts', 0.97],
            ['Profit before tax', '735', 'ProfitLossBeforeTax', 0.98, true],
            ['Income tax expense', '(154)', 'IncomeTaxExpenseContinuingOperations', 0.94],
            ['Profit for the year', '581', 'ProfitLoss', 0.99, true]
        ]
    },
    fp: {
        title: 'Statement of financial position',
        rows: [
            ['Property, plant and equipment', '3,120', 'PropertyPlantAndEquipment', 0.98],
            ['Intangible assets', '640', 'IntangibleAssetsOtherThanGoodwill', 0.93],
            ['Inventories', '910', 'Inventories', 0.99],
            ['Trade and other receivables', '1,280', 'TradeAndOtherCurrentReceivables', 0.95],
            ['Cash and cash equivalents', '760', 'CashAndCashEquivalents', 0.99],
            ['Total assets', '6,710', 'Assets', 0.98, true],
            ['Trade and other payables', '(1,150)', 'TradeAndOtherCurrentPayables', 0.95],
            ['Borrowings', '(1,900)', 'Borrowings', 0.96],
            ['Total equity', '3,660', 'Equity', 0.97, true]
        ]
    },
    cf: {
        title: 'Statement of cash flows',
        rows: [
            ['Profit for the year', '581', 'ProfitLoss', 0.99],
            ['Depreciation and amortisation', '410', 'AdjustmentsForDepreciationAndAmortisationExpense', 0.93],
            ['Increase in inventories', '(95)', 'AdjustmentsForDecreaseIncreaseInInventories', 0.91],
            ['Income taxes paid', '(148)', 'IncomeTaxesPaidRefundClassifiedAsOperatingActivities', 0.92],
            ['Net cash from operating activities', '748', 'CashFlowsFromUsedInOperatingActivities', 0.97, true],
            ['Purchase of property, plant and equipment', '(520)', 'PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities', 0.94],
            ['Repayment of borrowings', '(200)', 'RepaymentsOfBorrowingsClassifiedAsFinancingActivities', 0.93],
            ['Net increase in cash', '28', 'IncreaseDecreaseInCashAndCashEquivalents', 0.95, true]
        ]
    }
};

// Specific phrases come first, so "income taxes paid" wins over "income tax"
const CONCEPTS = [
    ['net cash (from|generated from|used in) operating|operating cash flow', 'CashFlowsFromUsedInOperatingActivities'],
    ['purchases? of property|capital expenditure|capex', 'PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities'],
    ['income tax(es)? paid|tax paid', 'IncomeTaxesPaidRefundClassifiedAsOperatingActivities'],
    ['dividends? paid', 'DividendsPaidClassifiedAsFinancingActivities'],
    ['repayments? of (borrowings|loans)', 'RepaymentsOfBorrowingsClassifiedAsFinancingActivities'],
    ['total assets', 'Assets'],
    ['total liabilities', 'Liabilities'],
    ['total equity|shareholders.? (funds|equity)|net assets|equity', 'Equity'],
    ['cost of (sales|goods sold|revenue)|cogs', 'CostOfSales'],
    ['gross profit', 'GrossProfit'],
    ['operating profit|profit from operations|operating income', 'ProfitLossFromOperatingActivities'],
    ['profit before tax(ation)?|pre-?tax profit', 'ProfitLossBeforeTax'],
    ['profit (for|after tax)|net profit|net income|profit or loss', 'ProfitLoss'],
    ['revenue|turnover|net sales|sales', 'Revenue'],
    ['administrative|admin expenses?|administration', 'AdministrativeExpense'],
    ['distribution costs?|selling expenses?|selling and distribution', 'DistributionCosts'],
    ['other (operating )?income', 'OtherIncome'],
    ['finance costs?|interest (expense|payable|paid)', 'FinanceCosts'],
    ['finance income|interest (income|receivable|received)', 'FinanceIncome'],
    ['income tax|tax(ation)? (expense|charge)|taxation', 'IncomeTaxExpenseContinuingOperations'],
    ['employee benefits?|staff costs?|wages|salaries|employee costs?', 'EmployeeBenefitsExpense'],
    ['depreciation|amortisation|amortization', 'DepreciationAndAmortisationExpense'],
    ['research and development|r ?& ?d', 'ResearchAndDevelopmentExpense'],
    ['earnings per share|eps', 'BasicEarningsLossPerShare'],
    ['property,? plant (and|&) equipment|ppe|fixed assets|tangible assets', 'PropertyPlantAndEquipment'],
    ['goodwill', 'Goodwill'],
    ['intangible', 'IntangibleAssetsOtherThanGoodwill'],
    ['right[- ]of[- ]use', 'RightofuseAssets'],
    ['inventor(y|ies)|stocks?', 'Inventories'],
    ['receivables?|debtors', 'TradeAndOtherCurrentReceivables'],
    ['cash', 'CashAndCashEquivalents'],
    ['payables?|creditors', 'TradeAndOtherCurrentPayables'],
    ['lease liabilit(y|ies)', 'LeaseLiabilities'],
    ['borrowings|loans?|overdraft', 'Borrowings'],
    ['provisions?', 'Provisions'],
    ['share capital|issued capital|ordinary shares', 'IssuedCapital'],
    ['retained (earnings|profits?)|accumulated (profits?|losses)', 'RetainedEarnings']
].map(([pattern, concept]) => [new RegExp(`\\b(${pattern})\\b`, 'i'), concept]);

const AMOUNT = /\s*(\(?[-–]?\s*[£$€₹]?\s*\d[\d,]*(?:\.\d+)?\s*(?:k|m|bn|cr)?\)?)\s*$/i;

export function classify(line) {
    const text = line.trim().replace(/\s+/g, ' ');
    const m = text.match(AMOUNT);
    const amount = m ? m[1].trim() : '–';
    const label = (m ? text.slice(0, m.index) : text).replace(/[:\-–.]+$/, '').trim() || text;
    for (const [re, concept] of CONCEPTS) {
        const hit = label.match(re);
        if (hit) {
            const cover = hit[0].length / Math.max(label.length, 1);
            return { label, amount, concept, conf: Math.min(0.99, 0.8 + 0.19 * cover) };
        }
    }
    return { label, amount, concept: null, conf: 0 };
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Line breaks may fall between the words of a CamelCase concept name
const breakable = (c) => esc(c).replace(/(?<=[a-z])(?=[A-Z])/g, '<wbr>');
const conceptHtml = (c) => (c ? `<i>ifrs-full:</i>${breakable(c)}` : 'No match among this demo’s concepts');

export function initTagger(root, { reduceMotion }) {
    if (!root) return;
    const title = root.querySelector('.tg-title');
    const count = root.querySelector('.tg-count');
    const tabs = [...root.querySelectorAll('[role="tab"]')];
    const list = root.querySelector('.tg-rows');
    const tokens = root.querySelector('.tg-tokens');
    const form = root.querySelector('.tg-form');
    const input = form.querySelector('input');
    const wait = (ms) => new Promise((r) => setTimeout(r, reduceMotion.matches ? 0 : ms));

    let key = 'pl';
    let rows = [];
    let run = 0;
    const custom = { pl: [], fp: [], cf: [] };

    const rowHtml = (r, tagged) => `
        <li><button type="button" class="tg-row${r.total ? ' is-total' : ''}${tagged ? ' is-tagged' : ''}${r.fresh ? ' is-new' : ''}">
            <span class="tg-label">${esc(r.label)}</span>
            <span class="tg-amt">${esc(r.amount)}</span>
            <span class="tg-concept">${conceptHtml(r.concept)}</span>
            <span class="tg-conf">${r.concept ? `${Math.round(r.conf * 100)}%` : ''}</span>
        </button></li>`;

    function setCount() {
        const done = list.querySelectorAll('.tg-row.is-tagged').length;
        count.textContent = `${done} of ${rows.length} tagged`;
    }

    function render(tagged) {
        const base = STATEMENTS[key].rows.map(([label, amount, concept, conf, total]) => ({ label, amount, concept, conf, total }));
        rows = [...base, ...custom[key]];
        title.textContent = STATEMENTS[key].title;
        list.innerHTML = rows.map((r) => rowHtml(r, tagged)).join('');
        list.setAttribute('aria-labelledby', tabs.find((t) => t.dataset.statement === key).id);
        rows.forEach((r) => { r.fresh = false; });
        setCount();
    }

    function showTokens(i) {
        const r = rows[i];
        const words = r.label.split(/\s+/);
        const toks = words.map((w, k) => `<span class="tg-tok" style="--i:${k}">${esc(w)}<small>${k === 0 ? 'B-ITEM' : 'I-ITEM'}</small></span>`);
        if (r.amount !== '–') toks.push(`<span class="tg-tok is-val" style="--i:${words.length}">${esc(r.amount)}<small>B-VAL</small></span>`);
        const tagged = list.children[i]?.firstElementChild.classList.contains('is-tagged');
        const arrow = !tagged
            ? '<span class="tg-arrow">waiting for the model</span>'
            : r.concept
                ? `<span class="tg-arrow">→ <b>ifrs-full:${breakable(r.concept)}</b> · ${r.conf.toFixed(2)}</span>`
                : '<span class="tg-arrow">→ no concept found, try “Trade receivables 1,200”</span>';
        tokens.innerHTML = `<div class="tg-toks">${toks.join('')}${arrow}</div>`;
        [...list.querySelectorAll('.tg-row')].forEach((b, k) => b.classList.toggle('is-selected', k === i));
    }

    async function tagAll() {
        const t = ++run;
        render(false);
        tokens.innerHTML = '<p class="tg-hint">Tagging line by line…</p>';
        const buttons = [...list.querySelectorAll('.tg-row')];
        for (const b of buttons) {
            b.classList.add('is-scanning');
            await wait(230);
            if (t !== run) return;
            b.classList.remove('is-scanning');
            b.classList.add('is-tagged');
            setCount();
        }
        showTokens(0);
    }

    list.addEventListener('click', (e) => {
        const b = e.target.closest('.tg-row');
        if (!b) return;
        showTokens([...list.querySelectorAll('.tg-row')].indexOf(b));
    });

    function selectTab(i, focus) {
        tabs.forEach((t, k) => {
            t.setAttribute('aria-selected', String(k === i));
            t.tabIndex = k === i ? 0 : -1;
        });
        if (focus) tabs[i].focus();
        key = tabs[i].dataset.statement;
        tagAll();
    }
    tabs.forEach((tab, i) => {
        tab.addEventListener('click', () => selectTab(i));
        tab.addEventListener('keydown', (e) => {
            const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
            if (!step) return;
            e.preventDefault();
            selectTab((i + step + tabs.length) % tabs.length, true);
        });
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const line = input.value.trim();
        if (!line) {
            input.focus();
            return;
        }
        run++;
        const r = classify(line);
        r.fresh = true;
        custom[key] = [...custom[key], r].slice(-3);
        render(true);
        showTokens(rows.length - 1);
        input.value = '';
    });

    // Starts untagged, then tags itself once it is on screen
    render(false);
    const io = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        setTimeout(tagAll, reduceMotion.matches ? 0 : 700);
    }, { threshold: 0.35 });
    io.observe(root);
}
