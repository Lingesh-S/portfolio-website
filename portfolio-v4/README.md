# Lingesh S · Portfolio v4

A single-page portfolio built around the work I do every day: tagging financial statements with XBRL concepts. The page is designed like an annual report on a dark ledger-green ground, with one red-ink accent, and every figure on it is shown as a tagged fact.

## What is on the page

- **Live statement (hero):** a sample statement of profit or loss, financial position or cash flows tags itself line by line with public IFRS concept names. Click a line to see its NER tokens, or type your own line ("Trade receivables 1,200") and a small in-browser keyword stand-in tags it.
- **The work, in figures:** systems in production, taxonomy pipelines shipped, roles, published papers.
- **XBRL auto-tagging engine:** one line ("Revenue 4,250") travels through the pipeline as you scroll: statements, pre-processing, LSTM + NER, one pipeline per taxonomy, FastAPI in Docker, tagged in the product.
- **RAG next-word prediction:** a working editor demo with ghost-text suggestions (Tab to accept).
- **Projects:** nine projects with working demos or pictures (Bedrock RAG, Codebase RAG, NoteNinja, LDA resume screening, multi-agent blog generator, MCQ LoRA, Tamil fine-tuning, LungAI, car sales analytics).
- **Experience, skills (as a taxonomy), research and education, contact.**

## Stack

Plain HTML, CSS and JavaScript modules, with no build step and no dependencies. The only external request is the Archivo typeface from Google Fonts.

```
portfolio-v4/
  index.html              all content (readable without JavaScript)
  assets/css/site.css     layout, type, colour, motion
  assets/css/demos.css    the project demos
  assets/js/site.js       bar, entrances, pipeline scene, project tabs
  assets/js/tagger.js     the live statement in the hero
  assets/js/demos.js      the project demos (loaded when first needed)
  assets/img/             pictures (WebP)
  Lingesh_Resume.pdf
```

## Run locally

```bash
python -m http.server 5540 --directory portfolio-v4
```

Then open http://localhost:5540.

## Deploy (Netlify)

No build command. Set the publish directory to `portfolio-v4` (in the root `netlify.toml`: `publish = "portfolio-v4"`).

## Picture credits

All from Wikimedia Commons:

- Ledger of the fur trader Dedo from Leipzig, 1876–1885 (page 3), public domain
- Palm-leaf manuscript of Tamil literature, U. V. Swaminatha Iyer Library (UVSL 589), photo by Ms Sarah Welch, CC BY-SA 4.0
- Normal posteroanterior (PA) chest radiograph, by Mikael Häggström, CC0
- Sathyabama Administration building, by Sathyabama University, CC BY-SA 3.0

## Sample content

The statements, figures and taxonomy concepts in the hero and the pipeline are samples using public taxonomy names; the production models and data are DataTracks' own. The car sales dashboard numbers, the MCQ example and the blog-agent topic are illustrative.
