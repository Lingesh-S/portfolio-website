// The 3D embedding space behind the hero, with its legend, zoom controls and
// the card for a selected point. Search lives in HeroSearch; both islands
// share state through the zustand store.
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Scene, { cameraApi, pointOf } from './Scene';
import LabelLayer from './LabelLayer';
import { CATEGORIES, ITEM_BY_ID, type Category } from '../data/content';
import { useStore } from '../lib/store';
import { KIND_LABEL, colour, reveal } from '../lib/ui';

function hasWebGL() {
    try {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    } catch {
        return false;
    }
}

function Legend() {
    const focus = useStore((s) => s.focus);
    const setFocus = useStore((s) => s.setFocus);
    return (
        <div className="fig-legend" role="group" aria-label="Clusters" data-label-block>
            {(Object.keys(CATEGORIES) as Category[]).map((c) => (
                <button
                    key={c}
                    type="button"
                    className="legend-item"
                    aria-pressed={focus === c}
                    style={{ '--c': CATEGORIES[c].color } as CSSProperties}
                    onClick={() => setFocus(focus === c ? null : c)}
                >
                    <span className="dot" aria-hidden="true" />
                    {CATEGORIES[c].label}
                </button>
            ))}
        </div>
    );
}

function Controls() {
    const reset = useStore((s) => s.reset);
    return (
        <div className="fig-controls" data-label-block>
            <button type="button" className="fig-btn" aria-label="Zoom in" onClick={() => cameraApi.zoom(4)}>+</button>
            <button type="button" className="fig-btn" aria-label="Zoom out" onClick={() => cameraApi.zoom(-4)}>−</button>
            <button type="button" className="fig-btn" aria-label="Reset view" onClick={reset}>
                <svg className="icon icon-sm" aria-hidden="true"><use href="#i-refresh" /></svg>
            </button>
        </div>
    );
}

function InfoCard() {
    const selected = useStore((s) => s.selected);
    const select = useStore((s) => s.select);
    if (!selected) return null;
    const item = ITEM_BY_ID[selected];
    const near = pointOf(selected).neighbours.slice(0, 3);

    return (
        <div className="info-card" key={selected} role="dialog" aria-label={item.title} data-label-block>
            <p className="tag" style={colour(item)}>
                <span className="dot" aria-hidden="true" />
                {CATEGORIES[item.category].label} · {KIND_LABEL[item.kind]}
            </p>
            <h3>{item.title}</h3>
            {(item.subtitle || item.dates) && <p className="info-sub">{[item.subtitle, item.dates].filter(Boolean).join(' · ')}</p>}
            <p className="info-summary">{item.summary}</p>
            <div className="info-near" aria-label="Closest in the space">
                {near.map(([id, score]) => (
                    <button key={id} type="button" className="chip-btn" style={colour(ITEM_BY_ID[id])} onClick={() => select(id)} title={`Cosine similarity ${score.toFixed(2)}`}>
                        <span className="dot" aria-hidden="true" />
                        {ITEM_BY_ID[id].title}
                    </button>
                ))}
            </div>
            <div className="info-actions">
                <button type="button" className="btn btn-primary btn-sm" onClick={() => reveal(item.id)}>
                    Read more <span className="arrow" aria-hidden="true">↓</span>
                </button>
            </div>
            <button type="button" className="info-close" aria-label="Close" onClick={() => select(null)}>
                <svg className="icon icon-sm" aria-hidden="true"><use href="#i-close" /></svg>
            </button>
        </div>
    );
}

export default function HeroStage() {
    const [webgl] = useState(hasWebGL);
    const [onScreen, setOnScreen] = useState(true);
    const stage = useRef<HTMLDivElement>(null);

    // Stop rendering once the hero is scrolled out of view
    useEffect(() => {
        const el = stage.current;
        if (!el) return;
        const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { rootMargin: '80px' });
        observer.observe(el);
        return () => observer.disconnect();
    }, [webgl]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            const s = useStore.getState();
            if (s.selected) s.select(null);
            else if (s.focus) s.setFocus(null);
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, []);

    if (!webgl) return null;
    return (
        <div className="stage-app">
            <div className="fig-stage" ref={stage}>
                <Scene paused={!onScreen} />
                <LabelLayer />
                <Legend />
                <Controls />
                <InfoCard />
                <p className="fig-hint">Drag to rotate · click a point</p>
            </div>
        </div>
    );
}
