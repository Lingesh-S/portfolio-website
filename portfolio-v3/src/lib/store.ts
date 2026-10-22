import { create } from 'zustand';
import type { Category } from '../data/content';

export type SearchMode = 'semantic' | 'keyword';
export type ModelStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface Result {
    id: string;
    score: number;
}

export interface Query {
    text: string;
    mode: SearchMode;
    results: Result[];
    answer: string[];
    position: [number, number, number];
    ms: number;
}

interface State {
    selected: string | null;
    hovered: string | null;
    focus: Category | null;
    query: Query | null;
    modelStatus: ModelStatus;
    modelProgress: number;
    resetTick: number;
    select: (id: string | null) => void;
    hover: (id: string | null) => void;
    setFocus: (category: Category | null) => void;
    setQuery: (query: Query | null) => void;
    setModel: (status: ModelStatus, progress?: number) => void;
    reset: () => void;
}

export const useStore = create<State>((set) => ({
    selected: null,
    hovered: null,
    focus: null,
    query: null,
    modelStatus: 'idle',
    modelProgress: 0,
    resetTick: 0,
    select: (id) => set({ selected: id, focus: null }),
    hover: (id) => set({ hovered: id }),
    setFocus: (category) => set({ focus: category, selected: null, query: null }),
    setQuery: (query) => set({ query, selected: null, focus: null }),
    setModel: (status, progress) => set((s) => ({ modelStatus: status, modelProgress: progress ?? s.modelProgress })),
    reset: () => set((s) => ({ selected: null, focus: null, query: null, resetTick: s.resetTick + 1 }))
}));
