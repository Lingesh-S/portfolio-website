# Lingesh S · Portfolio v2

The redesigned portfolio, live at https://lingesh-dev.netlify.app. It lives in its own folder; the original site (`../index.html`) is kept in the repo root but is no longer published.

Plain HTML, CSS and vanilla JavaScript: no framework, no build step, no dependencies beyond Google Fonts.

## Run locally

```bash
python -m http.server 5500 --directory portfolio-v2
```

Then open http://localhost:5500. Opening `index.html` directly from disk also works.

## Deploy

`netlify.toml` in the repo root sets the publish directory to `portfolio-v2`, so every push to `main` deploys this folder. To put the old site back, change `publish` to `"."`.

## Structure

```
portfolio-v2/
├── index.html            All content (semantic HTML, works without JS)
├── Lingesh_Resume.pdf    Copy of the resume, so the folder deploys on its own
└── assets/
    ├── favicon.svg
    ├── css/styles.css    Design tokens, dark/light themes, layout, previews
    └── js/
        ├── main.js       Theme, nav, scroll effects, hero canvas, filters, case studies, skill explorer
        ├── previews.js   The six interactive project previews
        └── ask.js        "Ask my portfolio": in-browser TF-IDF retrieval over the page
```

## Editing content

- **Text, roles, dates, projects:** edit `index.html`. Everything visible is in the HTML.
- **Case-study dialogs:** the `CASES` object near the middle of `assets/js/main.js`.
- **Preview sample data:** the constants at the top of each preview in `assets/js/previews.js` (`BEDROCK_QA`, `CODEBASE_QA`, `XBRL_ROWS`, `NW_CORPUS`, `LDA_ROLES`, `NN_QA`).
- **Skill explorer:** driven by the `data-skills` attribute on each experience item and project. Add a skill name there (matching the chip's `data-skill`) and it shows up automatically.
- **Ask my portfolio:** indexes every element with `data-kb`; `data-kb-title` is the label shown as a source.
- **Resume:** replace `Lingesh_Resume.pdf` in this folder. This is the copy the live site serves; the root copy belongs to the old site.

## Features

- Dark and light themes (remembered per visitor), respects `prefers-reduced-motion`
- Interactive, illustrative project previews: RAG chat with retrieval steps and citations, codebase Q&A with real snippets, XBRL tagging with NER token view, a working next-word editor (Tab to accept), an LDA screening dashboard, and a notes chatbot
- Project filters, case-study dialogs with architecture flows, a skill explorer that links each skill to where it was used
- "Ask my portfolio" (Ctrl/⌘ K): extractive answers with ranked sources, all computed in the browser
- Accessible: skip link, landmarks, keyboard support throughout, focus management in dialogs and the mobile menu, live regions, WCAG AA contrast
