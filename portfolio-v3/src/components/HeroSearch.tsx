// Semantic search over the portfolio, shown in the hero. Results light up in
// the 3D space through the shared store.
import { useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { ITEM_BY_ID } from '../data/content';
import { loadModel, search } from '../lib/search';
import { useStore } from '../lib/store';
import { KIND_LABEL, colour } from '../lib/ui';

const SUGGESTIONS = ['production RAG systems', 'XBRL auto-tagging', 'fine-tuning LLMs', 'deploying ML services'];

function startModel() {
    const { modelStatus, setModel } = useStore.getState();
    if (modelStatus === 'loading' || modelStatus === 'ready') return;
    setModel('loading', 0);
    loadModel((p) => useStore.getState().setModel('loading', p))
        .then(() => useStore.getState().setModel('ready', 1))
        .catch(() => useStore.getState().setModel('error'));
}

export default function HeroSearch() {
    const [text, setText] = useState('');
    const latest = useRef('');
    const modelStatus = useStore((s) => s.modelStatus);
    const progress = useStore((s) => s.modelProgress);
    const query = useStore((s) => s.query);
    const select = useStore((s) => s.select);
    const reset = useStore((s) => s.reset);

    async function run(raw: string) {
        const q = raw.trim();
        if (!q) return;
        latest.current = q;
        startModel();
        const { modelStatus: status, setQuery } = useStore.getState();
        if (status !== 'ready') {
            // Answer straight away with keywords, then upgrade once the model is ready
            const quick = await search(q, 'keyword');
            if (latest.current === q && quick) setQuery(quick);
        }
        try {
            const semantic = await search(q, 'semantic');
            if (latest.current !== q || !semantic) return;
            const s = useStore.getState();
            if (status === 'ready' || !s.query) setQuery(semantic);
            else if (s.query.text === q) useStore.setState({ query: semantic });
        } catch {
            useStore.getState().setModel('error');
        }
    }

    const onSubmit = (e: FormEvent) => {
        e.preventDefault();
        run(text);
    };

    const status = {
        idle: 'Semantic search · all-MiniLM-L6-v2 runs in your browser',
        loading: `Loading the embedding model · ${Math.round(progress * 100)}%`,
        ready: 'all-MiniLM-L6-v2 ready · your question never leaves your device',
        error: 'Embedding model unavailable · using keyword search'
    }[modelStatus];

    return (
        <div className="hero-search">
            <form className="search-form" role="search" onSubmit={onSubmit}>
                <svg className="icon" aria-hidden="true"><use href="#i-sparkles" /></svg>
                <label className="sr-only" htmlFor="hero-search-input">Search my work</label>
                <input
                    id="hero-search-input"
                    className="search-input"
                    type="text"
                    enterKeyHint="search"
                    autoComplete="off"
                    maxLength={160}
                    placeholder="Search my work, e.g. production RAG systems"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onFocus={() => {
                        const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
                        if (!saveData && window.innerWidth >= 900) startModel();
                    }}
                />
                <button type="submit" className="btn btn-primary btn-sm">
                    Search <span className="arrow" aria-hidden="true">→</span>
                </button>
            </form>

            {!query && (
                <div className="search-suggest" role="group" aria-label="Example searches">
                    {SUGGESTIONS.map((s) => (
                        <button key={s} type="button" className="chip-btn" onClick={() => { setText(s); run(s); }}>{s}</button>
                    ))}
                </div>
            )}

            <p className={`search-status is-${modelStatus}`} aria-live="polite">
                {modelStatus === 'loading' && <span className="model-bar" aria-hidden="true"><span style={{ width: `${Math.round(progress * 100)}%` }} /></span>}
                {status}
            </p>

            {query && (
                <div className="results" key={query.text + query.mode} aria-live="polite">
                    <div className="results-head">
                        <span className="q">“{query.text}”</span>
                        <p>
                            {query.mode === 'semantic' ? 'semantic' : 'keyword'} · {query.ms < 1 ? '<1' : Math.round(query.ms)} ms ·{' '}
                            <button type="button" className="text-link" onClick={() => { setText(''); reset(); }}>clear</button>
                        </p>
                    </div>
                    {query.results.length ? (
                        query.results.slice(0, 4).map((r, i) => {
                            const item = ITEM_BY_ID[r.id];
                            return (
                                <button key={r.id} type="button" className="result" style={{ ...colour(item), '--i': i } as CSSProperties} onClick={() => select(r.id)}>
                                    <span className="dot" aria-hidden="true" />
                                    <span className="result-text">
                                        <b>{item.title}</b>
                                        <small>{KIND_LABEL[item.kind]}{item.subtitle ? ` · ${item.subtitle}` : ''}</small>
                                    </span>
                                    <span className="result-score">
                                        <span className="result-bar" aria-hidden="true"><span style={{ width: `${Math.max(0, Math.min(1, r.score)) * 100}%` }} /></span>
                                        {r.score.toFixed(2)}
                                    </span>
                                </button>
                            );
                        })
                    ) : (
                        <p className="results-empty">Nothing in my work is close to that. Try RAG, production ML, fine-tuning or cloud.</p>
                    )}
                </div>
            )}
        </div>
    );
}
