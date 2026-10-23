# Lingesh S · Portfolio v4

A single-page portfolio in dark emerald, built in layers: each section is a sheet that rises over the last, cards catch the light and tilt under the pointer, and the hero holds a 3D deck of my technical skills.

## What is on the page

- **Hero:** name, one line, and a 3D deck of three skill groups (GenAI and LLMs, machine learning and NLP, MLOps and data), each skill marked with where it was used. The front card loads line by line; the tabs bring another group to the front.
- **Figures:** systems in production, taxonomy pipelines shipped, projects, published paper.
- **Production work:** the XBRL auto-tagging engine with an animated pipeline, and RAG next-word prediction with a working editor demo (Tab to accept).
- **Selected projects:** six project cards that stack as you scroll, each with a working demo or an app mock-up, plus three smaller projects.
- **Experience** (a timeline that draws as you scroll), **skills**, **research and education**, **contact**.

## Stack

Plain HTML, CSS and JavaScript modules, with no build step and no dependencies. The only external request is the Archivo typeface from Google Fonts. Motion uses transforms and opacity, pauses off screen, and switches off for visitors who prefer reduced motion.

```
portfolio-v4/
  index.html              all content (readable without JavaScript)
  assets/css/site.css     layout, type, colour, depth, motion
  assets/css/demos.css    the project demos
  assets/js/site.js       entrances, scroll effects, tilt, light, demos
  assets/js/deck.js       the 3D skills deck in the hero
  assets/js/demos.js      the project demos (loaded when first needed)
  assets/img/             photos (WebP)
  Lingesh_Resume.pdf
```

## Run locally

```bash
python -m http.server 5540 --directory portfolio-v4
```

Then open http://localhost:5540.

## Deploy (Netlify)

No build command. Set the publish directory to `portfolio-v4` (in the root `netlify.toml`: `publish = "portfolio-v4"`).

## Photo

The chest X-ray in the LungAI card is "Normal posteroanterior (PA) chest radiograph" by Mikael Häggström on Wikimedia Commons, released under CC0 (no credit required).

## Sample content

The figures in the XBRL pipeline are samples with public IFRS concept names; the production models and data are DataTracks' own. The blog-agent run and the MCQ example are illustrative.
