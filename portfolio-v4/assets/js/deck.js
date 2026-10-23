// The hero deck: three sample statements stacked in 3D. The front one tags
// itself line by line with public IFRS concept names; the tabs bring another
// statement to the front.

const STATEMENTS = {
    pl: {
        title: 'Statement of profit or loss',
        rows: [
            ['Revenue', '4,250', 'Revenue', 0.99],
            ['Cost of sales', '(2,810)', 'CostOfSales', 0.98],
            ['Gross profit', '1,440', 'GrossProfit', 0.99, true],
            ['Administrative expenses', '(705)', 'AdministrativeExpense', 0.96],
            ['Profit before tax', '735', 'ProfitLossBeforeTax', 0.98, true],
            ['Income tax expense', '(154)', 'IncomeTaxExpenseContinuingOperations', 0.94],
            ['Profit for the year', '581', 'ProfitLoss', 0.99, true]
        ]
    },
    fp: {
        title: 'Statement of financial position',
        rows: [
            ['Property, plant and equipment', '3,120', 'PropertyPlantAndEquipment', 0.98],
            ['Trade receivables', '1,280', 'TradeAndOtherCurrentReceivables', 0.95],
            ['Cash and cash equivalents', '760', 'CashAndCashEquivalents', 0.99],
            ['Total assets', '5,160', 'Assets', 0.98, true],
            ['Trade payables', '(1,150)', 'TradeAndOtherCurrentPayables', 0.95],
            ['Borrowings', '(1,900)', 'Borrowings', 0.96],
            ['Total equity', '2,110', 'Equity', 0.97, true]
        ]
    },
    cf: {
        title: 'Statement of cash flows',
        rows: [
            ['Profit for the year', '581', 'ProfitLoss', 0.99],
            ['Depreciation', '410', 'DepreciationAndAmortisationExpense', 0.93],
            ['Income taxes paid', '(148)', 'IncomeTaxesPaidRefundClassifiedAsOperatingActivities', 0.92],
            ['Cash from operations', '843', 'CashFlowsFromUsedInOperatingActivities', 0.97, true],
            ['Purchase of equipment', '(520)', 'PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities', 0.94],
            ['Repayment of borrowings', '(200)', 'RepaymentsOfBorrowingsClassifiedAsFinancingActivities', 0.93],
            ['Net increase in cash', '123', 'IncreaseDecreaseInCashAndCashEquivalents', 0.95, true]
        ]
    }
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function cardHtml(key, tagged) {
    const s = STATEMENTS[key];
    const rows = s.rows.map(([label, amt, concept, conf, total]) => `
        <li><button type="button" class="dc-row${total ? ' is-total' : ''}${tagged ? ' is-tagged' : ''}" title="ifrs-full:${concept} · ${conf.toFixed(2)}" data-concept="${concept}" data-conf="${conf}">
            <span class="dc-label">${esc(label)}</span>
            <span class="dc-amt">${esc(amt)}</span>
            <span class="dc-concept"><i>ifrs-full:</i>${esc(concept)}</span>
        </button></li>`).join('');
    return `
        <div class="dc-head">
            <p class="dc-title">${s.title}</p>
            <p class="dc-count"><b>${tagged ? s.rows.length : 0}</b> of ${s.rows.length} tagged</p>
        </div>
        <ul class="dc-rows">${rows}</ul>`;
}

export function initDeck(root, { reduceMotion }) {
    if (!root) return;
    const holder = root.querySelector('.deck-cards');
    const tabs = [...root.querySelectorAll('[role="tab"]')];
    const order = ['pl', 'fp', 'cf'];
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
        card.innerHTML = cardHtml(key, key !== 'pl');
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

    async function tag(key) {
        const t = ++run;
        const card = cards[key];
        const rows = [...card.querySelectorAll('.dc-row')];
        const count = card.querySelector('.dc-count b');
        rows.forEach((r) => r.classList.remove('is-tagged', 'is-selected'));
        count.textContent = '0';
        await wait(reduceMotion.matches ? 0 : 450);
        for (let i = 0; i < rows.length; i++) {
            if (t !== run) return;
            rows[i].classList.add('is-scanning');
            await wait(200);
            if (t !== run) return;
            rows[i].classList.remove('is-scanning');
            rows[i].classList.add('is-tagged');
            count.textContent = String(i + 1);
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
        tag(key);
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

    // A click on a line selects it and reads its concept out
    const announce = document.getElementById('announce');
    holder.addEventListener('click', (e) => {
        const row = e.target.closest('.dc-row');
        if (!row) return;
        row.closest('.dc-rows').querySelectorAll('.dc-row').forEach((r) => r.classList.toggle('is-selected', r === row));
        if (announce) announce.textContent = `${row.querySelector('.dc-label').textContent}: ifrs-full:${row.dataset.concept}, confidence ${row.dataset.conf}`;
    });

    // The front statement tags itself once the deck is on screen
    const io = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        setTimeout(() => tag(stackOrder[0]), reduceMotion.matches ? 0 : 500);
    }, { threshold: 0.3 });
    io.observe(root);
}
