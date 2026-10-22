// Builds the latent space from src/data/content.ts:
//   1. embeds every item with all-MiniLM-L6-v2 (the same model the site runs in the browser)
//   2. projects the 384-d embeddings to 3D with UMAP
//   3. stores positions + nearest neighbours (src/data/space.json) and the raw
//      vectors for in-browser semantic search (public/vectors.json)
// Run with `npm run space` after editing content. The output is committed, so
// production builds never need the model.

import { writeFileSync } from 'node:fs';
import { pipeline } from '@huggingface/transformers';
import { UMAP } from 'umap-js';
import { ITEMS, itemText } from '../src/data/content.ts';

const MODEL = 'Xenova/all-MiniLM-L6-v2';
const DTYPE = 'q8';
const RADIUS = 11;

// Deterministic layout between runs
function mulberry32(seed) {
    return () => {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
const round = (v, digits) => Number(v.toFixed(digits));

console.log(`Embedding ${ITEMS.length} items with ${MODEL} (${DTYPE})…`);
const extractor = await pipeline('feature-extraction', MODEL, { dtype: DTYPE });
const texts = ITEMS.map(itemText);
const output = await extractor(texts, { pooling: 'mean', normalize: true });
const vectors = output.tolist();

console.log('Projecting to 3D with UMAP…');
const umap = new UMAP({
    nComponents: 3,
    nNeighbors: 8,
    minDist: 0.45,
    spread: 1.4,
    random: mulberry32(42)
});
const raw = umap.fit(vectors);

// Centre the cloud and scale it to a fixed radius
const centre = [0, 1, 2].map((k) => raw.reduce((s, p) => s + p[k], 0) / raw.length);
const centred = raw.map((p) => p.map((v, k) => v - centre[k]));
const maxR = Math.max(...centred.map((p) => Math.hypot(...p)));
const positions = centred.map((p) => p.map((v) => round((v / maxR) * RADIUS, 3)));

// Cosine similarity (vectors are normalised, so a dot product)
const sims = vectors.map((a) => vectors.map((b) => dot(a, b)));
const neighbours = sims.map((row, i) => row
    .map((s, j) => [j, s])
    .filter(([j]) => j !== i)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6));

// Sparse k-NN graph for the faint background edges
const edgeSet = new Map();
neighbours.forEach((list, i) => list.slice(0, 2).forEach(([j, s]) => {
    const key = i < j ? `${i}-${j}` : `${j}-${i}`;
    if (!edgeSet.has(key)) edgeSet.set(key, [Math.min(i, j), Math.max(i, j), round(s, 3)]);
}));

const space = {
    model: MODEL,
    dtype: DTYPE,
    dims: vectors[0].length,
    items: ITEMS.map((item, i) => ({
        id: item.id,
        pos: positions[i],
        neighbours: neighbours[i].map(([j, s]) => [ITEMS[j].id, round(s, 3)])
    })),
    edges: [...edgeSet.values()]
};

writeFileSync(new URL('../src/data/space.json', import.meta.url), JSON.stringify(space));
writeFileSync(
    new URL('../public/vectors.json', import.meta.url),
    JSON.stringify({ model: MODEL, dtype: DTYPE, ids: ITEMS.map((i) => i.id), vectors: vectors.map((v) => v.map((x) => round(x, 4))) })
);
console.log(`Wrote ${space.items.length} points and ${space.edges.length} edges.`);
