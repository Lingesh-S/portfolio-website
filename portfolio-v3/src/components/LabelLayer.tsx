import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { CATEGORIES } from '../data/content';
import { useStore } from '../lib/store';
import { AXES, POINTS, labelRegistry, labelState, pointOf, relatedIds } from './Scene';

// Which points get a label right now, and how important each one is
function useLabels() {
    const selected = useStore((s) => s.selected);
    const hovered = useStore((s) => s.hovered);
    const focus = useStore((s) => s.focus);
    const query = useStore((s) => s.query);

    return useMemo(() => {
        const labels = new Map<string, number>();
        const add = (id: string, priority: number) => labels.set(id, Math.max(labels.get(id) ?? 0, priority));
        if (!selected && !query && !focus) {
            POINTS.forEach((p) => {
                if (p.item.kind === 'role') add(p.id, 30);
                else if (p.item.featured) add(p.id, 25);
            });
        }
        if (focus) POINTS.forEach((p) => { if (p.item.category === focus) add(p.id, p.item.kind === 'skill' ? 10 : 20); });
        if (query && !selected) query.results.forEach((r, i) => add(r.id, 60 - i));
        if (selected) {
            add(selected, 90);
            relatedIds(selected).forEach((id) => {
                const kind = pointOf(id).item.kind;
                add(id, kind === 'project' || kind === 'role' ? 15 : 8);
            });
        }
        if (hovered) add(hovered, 100);
        return labels;
    }, [selected, hovered, focus, query]);
}

export default function LabelLayer() {
    const labels = useLabels();
    const selected = useStore((s) => s.selected);
    const hovered = useStore((s) => s.hovered);
    const query = useStore((s) => s.query);
    const select = useStore((s) => s.select);
    const [ready, setReady] = useState(false);

    // Labels wait for the intro animation, when the points have settled
    useEffect(() => {
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const t = setTimeout(() => setReady(true), reduced ? 0 : 1600);
        return () => clearTimeout(t);
    }, []);

    // Every add / remove bumps the version so the scene re-projects labels
    const register = (id: string, pos: [number, number, number], priority: number) => (el: HTMLElement | null) => {
        labelState.version += 1;
        if (!el) {
            labelRegistry.delete(id);
            return;
        }
        labelRegistry.set(id, { el, pos, priority, width: el.offsetWidth, height: el.offsetHeight });
    };

    if (!ready) return null;
    const showQuery = query && query.results.length && !selected;

    return (
        <div className="labels" aria-hidden="true">
            {AXES.map((a) => (
                <span key={a.id} ref={register(a.id, a.end, 1)} className="label label-axis">{a.text}</span>
            ))}
            {[...labels].map(([id, priority]) => {
                const p = pointOf(id);
                const active = id === selected || id === hovered;
                return (
                    <button
                        key={id}
                        ref={register(id, p.pos, priority)}
                        type="button"
                        tabIndex={-1}
                        className={`label label-${p.item.kind}${active ? ' is-active' : ''}`}
                        style={{ '--c': CATEGORIES[p.item.category].color } as CSSProperties}
                        onClick={() => select(id)}
                        onPointerEnter={() => useStore.getState().hover(id)}
                        onPointerLeave={() => useStore.getState().hover(null)}
                    >
                        {p.item.title}
                    </button>
                );
            })}
            {showQuery && (
                <span key={`query-${query.text}`} ref={register('__query', query.position, 95)} className="label label-query">
                    “{query.text}”
                </span>
            )}
        </div>
    );
}
