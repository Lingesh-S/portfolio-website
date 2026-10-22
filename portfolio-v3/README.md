# Lingesh S · Portfolio v3

A single-page portfolio with a dark graphite and lime design. The hero is an immersive 3D embedding space of my work: every project, role and skill is a point, positioned by real sentence embeddings (all-MiniLM-L6-v2) projected to 3D with UMAP, so related work sits together. Visitors can rotate it, click a point to jump to that part of the page, or search: the same model runs in the browser, embeds the question and highlights its nearest neighbours.

## Stack

- **Astro 5**: the whole page is static HTML (fast, indexable, readable without WebGL or JavaScript)
- **React Three Fiber + drei + three.js**: the 3D scene (custom point shader, k-NN graph, camera fly-to)
- **transformers.js**: in-browser semantic search with `Xenova/all-MiniLM-L6-v2` (loaded only when someone searches)
- **zustand**: shared state between the scene, labels and figure controls

## Run locally

```bash
cd portfolio-v3
npm install
npm run dev
```

Open http://localhost:4321. `npm run build` writes the static site to `dist/`.

## Editing content

All content lives in `src/data/content.ts` (projects, roles, skills, education, links). After changing any text there, rebuild the embedding space:

```bash
npm run space
```

This re-embeds every item, recomputes the 3D layout and nearest neighbours (`src/data/space.json`) and the vectors used for search (`public/vectors.json`). Commit both files; production builds don't need the model.

## Structure

```
src/
  data/content.ts         every item on the site
  data/space.json         generated: 3D positions, neighbours, k-NN edges
  pages/index.astro       the page: hero, about, experience, work, skills, research, contact
  components/HeroStage    3D scene behind the hero, legend, zoom, info card
  components/HeroSearch   semantic search in the hero (shares state with the scene)
  components/Scene.tsx    three.js scene and camera
  components/LabelLayer   point labels (DOM, collision-avoided)
  previews/previews.js    interactive project demos inside the case studies
  lib/search.ts           keyword (TF-IDF) + semantic search
scripts/build-space.mjs   embeddings → UMAP → space.json
```

## Deploy (Netlify)

Base directory `portfolio-v3`, build command `npm run build`, publish directory `dist`. Node version comes from `.nvmrc`.
