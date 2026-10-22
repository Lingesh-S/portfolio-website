// Two retrievers over the same items:
//  - keyword: TF-IDF + cosine similarity, instant, always available
//  - semantic: all-MiniLM-L6-v2 running in the browser via transformers.js,
//    compared against the item vectors precomputed by scripts/build-space.mjs
import { ITEMS, ITEM_BY_ID, itemText } from '../data/content';
import space from '../data/space.json';
import type { Query, Result } from './store';

const POS: Record<string, [number, number, number]> = Object.fromEntries(
    space.items.map((p) => [p.id, p.pos as [number, number, number]])
);

/* ---------- Text processing ---------- */
const STOP = new Set(`a an the and or of to in on for with by at from as is are was were be been being it its this that
    these those i im me my he him his she her they them their you your we our us what which who whom whose how why when
    where does do did done has have had having can could would should will shall may might must about into over under than
    then so such not no yes also just using use used any some all each other more most very much many tell show give
    lingesh lingeshs s know knows`.split(/\s+/));

const undouble = (w: string) => (/([b-df-hj-np-rtv-z])\1$/.test(w) ? w.slice(0, -1) : w);
function stem(word: string): string {
    let w = word;
    if (w.length > 4 && w.endsWith('ies')) w = `${w.slice(0, -3)}y`;
    else if (w.length > 3 && w.endsWith('s') && !/(ss|us|is)$/.test(w)) w = w.slice(0, -1);
    if (w.length > 5 && w.endsWith('ing')) w = undouble(w.slice(0, -3));
    else if (w.length > 4 && w.endsWith('ed')) w = undouble(w.slice(0, -2));
    return w;
}

export function tokenize(text: string): string[] {
    const out: string[] = [];
    for (let t of text.toLowerCase().replace(/[’']/g, '').split(/[^a-z0-9+#-]+/)) {
        t = t.replace(/^-+|-+$/g, '');
        if (!t || STOP.has(t)) continue;
        out.push(stem(t));
        if (t.includes('-')) t.split('-').forEach((part) => { if (part && !STOP.has(part)) out.push(stem(part)); });
    }
    return out;
}

const SYNONYMS: Record<string, string[]> = {
    rag: ['retrieval', 'augmented', 'vector'],
    retrieval: ['rag'],
    llm: ['language', 'genai', 'transformer'],
    genai: ['llm', 'rag', 'generative'],
    ai: ['ml', 'genai', 'llm'],
    ml: ['machine', 'learning', 'model'],
    cloud: ['aws', 'bedrock', 's3', 'ec2', 'sagemaker'],
    job: ['experience', 'role'],
    experience: ['role', 'intern'],
    current: ['present', 'datatrack'],
    degree: ['education', 'university', 'cgpa'],
    college: ['education', 'university'],
    study: ['education', 'university'],
    paper: ['publish', 'research', 'icccai'],
    publication: ['publish', 'research', 'icccai'],
    deploy: ['production', 'docker', 'fastapi'],
    production: ['deploy', 'docker', 'monitor'],
    mlop: ['production', 'monitor', 'docker', 'grafana', 'prometheus', 'fastapi'],
    monitor: ['grafana', 'prometheus', 'observability'],
    nlp: ['ner', 'lda', 'spacy', 'nltk', 'topic'],
    xbrl: ['tag', 'taxonomy'],
    certification: ['certificate', 'oracle', 'accenture'],
    agent: ['langgraph', 'multi-agent'],
    finetune: ['fine-tuning', 'lora', 'peft']
};

/* ---------- Keyword index ---------- */
interface Doc {
    id: string;
    vec: Map<string, number>;
    norm: number;
}

let docs: Doc[] | null = null;
let idf: Map<string, number> = new Map();

function buildIndex(): Doc[] {
    const tfs = ITEMS.map((item) => {
        const tf = new Map<string, number>();
        tokenize(`${item.title} ${item.title} ${itemText(item)}`).forEach((t) => tf.set(t, (tf.get(t) || 0) + 1));
        return { id: item.id, tf };
    });
    const df = new Map<string, number>();
    tfs.forEach((d) => d.tf.forEach((_, t) => df.set(t, (df.get(t) || 0) + 1)));
    idf = new Map();
    df.forEach((n, t) => idf.set(t, Math.log((tfs.length + 1) / (n + 1)) + 1));
    return tfs.map(({ id, tf }) => {
        const vec = new Map<string, number>();
        let norm = 0;
        tf.forEach((n, t) => {
            const w = (1 + Math.log(n)) * (idf.get(t) || 0);
            vec.set(t, w);
            norm += w * w;
        });
        return { id, vec, norm: Math.sqrt(norm) || 1 };
    });
}

function queryTerms(text: string): Map<string, number> {
    const q = new Map<string, number>();
    const base = tokenize(text);
    base.forEach((t) => q.set(t, (q.get(t) || 0) + 1));
    base.forEach((t) => (SYNONYMS[t] || []).forEach((syn) => tokenize(syn).forEach((s) => { if (!q.has(s)) q.set(s, 0.5); })));
    return q;
}

function keywordRank(text: string): Result[] {
    if (!docs) docs = buildIndex();
    const q = queryTerms(text);
    const vec = new Map<string, number>();
    let norm = 0;
    q.forEach((weight, t) => {
        const w = weight * (idf.get(t) || 0);
        if (!w) return;
        vec.set(t, w);
        norm += w * w;
    });
    norm = Math.sqrt(norm) || 1;
    return docs
        .map((d) => {
            let dotp = 0;
            vec.forEach((w, t) => { if (d.vec.has(t)) dotp += w * (d.vec.get(t) as number); });
            return { id: d.id, score: dotp / (norm * d.norm) };
        })
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score);
}

/* ---------- Semantic search ---------- */
type Extractor = (text: string, options: Record<string, unknown>) => Promise<{ data: Float32Array }>;
let extractorPromise: Promise<Extractor> | null = null;
let vectorsPromise: Promise<{ ids: string[]; vectors: number[][] }> | null = null;

export function loadModel(onProgress?: (fraction: number) => void): Promise<Extractor> {
    if (!extractorPromise) {
        extractorPromise = (async () => {
            const { pipeline, env } = await import('@huggingface/transformers');
            env.allowLocalModels = false;
            const files = new Map<string, { loaded: number; total: number }>();
            const extractor = await pipeline('feature-extraction', space.model, {
                dtype: space.dtype as 'q8',
                progress_callback: (event: { status: string; file?: string; loaded?: number; total?: number }) => {
                    if (event.status !== 'progress' || !event.file || !event.total) return;
                    files.set(event.file, { loaded: event.loaded || 0, total: event.total });
                    let loaded = 0;
                    let total = 0;
                    files.forEach((f) => { loaded += f.loaded; total += f.total; });
                    onProgress?.(total ? loaded / total : 0);
                }
            });
            return extractor as unknown as Extractor;
        })();
        extractorPromise.catch(() => { extractorPromise = null; });
    }
    return extractorPromise;
}

function loadVectors() {
    if (!vectorsPromise) {
        vectorsPromise = fetch('/vectors.json').then((r) => {
            if (!r.ok) throw new Error(`vectors.json ${r.status}`);
            return r.json();
        });
        vectorsPromise.catch(() => { vectorsPromise = null; });
    }
    return vectorsPromise;
}

async function semanticRank(text: string): Promise<Result[]> {
    const [extractor, { ids, vectors }] = await Promise.all([loadModel(), loadVectors()]);
    const out = await extractor(text, { pooling: 'mean', normalize: true });
    const q = out.data;
    return ids
        .map((id, i) => {
            const v = vectors[i];
            let s = 0;
            for (let k = 0; k < v.length; k++) s += v[k] * q[k];
            return { id, score: s };
        })
        .sort((a, b) => b.score - a.score);
}

/* ---------- Shared: answer + placement ---------- */
function answerFor(id: string, text: string): string[] {
    const item = ITEM_BY_ID[id];
    const sentences = [item.summary, ...(item.points || [])];
    const terms = new Set(queryTerms(text).keys());
    const scored = sentences.map((s, i) => {
        let score = 0;
        new Set(tokenize(s)).forEach((t) => { if (terms.has(t)) score += idf.get(t) || 1; });
        return { s, i, score };
    });
    const best = scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 2).sort((a, b) => a.i - b.i);
    return (best.length ? best : scored.slice(0, 1)).map((x) => x.s);
}

// The query is drawn among its nearest neighbours: a similarity-weighted
// average of the top matches' positions, nudged outward so it stays visible.
function placeQuery(results: Result[]): [number, number, number] {
    const top = results.slice(0, 4);
    if (!top.length) return [0, 0, 0];
    const weights = top.map((r) => Math.exp(r.score * 12));
    const sum = weights.reduce((a, b) => a + b, 0);
    const p = [0, 0, 0];
    top.forEach((r, i) => POS[r.id].forEach((v, k) => { p[k] += (v * weights[i]) / sum; }));
    const len = Math.hypot(p[0], p[1], p[2]) || 1;
    return p.map((v) => v + (v / len) * 1.2) as [number, number, number];
}

export async function search(text: string, mode: 'semantic' | 'keyword'): Promise<Query | null> {
    if (!docs) docs = buildIndex();
    // Time the search itself, not the one-off model download
    if (mode === 'semantic') await Promise.all([loadModel(), loadVectors()]);
    const t0 = performance.now();
    const ranked = mode === 'semantic' ? await semanticRank(text) : keywordRank(text);
    const ms = performance.now() - t0;
    const threshold = mode === 'semantic' ? 0.2 : 0.06;
    const results = ranked.filter((r) => r.score >= threshold).slice(0, 6);
    if (!results.length) {
        return { text, mode, results: [], answer: [], position: [0, 0, 0], ms };
    }
    return { text, mode, results, answer: answerFor(results[0].id, text), position: placeQuery(results), ms };
}
