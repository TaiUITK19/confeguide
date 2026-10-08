# ConfGuide: Standalone Conference Detail Guide

## Project
Static Vietnamese conference detail standalone page using HTML, CSS, and vanilla JavaScript. No build step, package manager, backend, or real authentication needed.

## Structure
- `index.html` & `chitiethoinghi.html`: semantic HTML structure without inline styles or scripts.
- `css/shared.css`: global tokens, typography, layout, header/footer, dark/light theme, toast, mouse glow.
- `css/chitiethoinghi.css`: conference detail specific styling: hero banner, floating deadline widget, tabs, review cards, rating distribution bars, related conferences grid.
- `js/theme.js`: light/dark theme switcher, persisted as `localStorage['confguide-theme']`.
- `js/ui.js`: hamburger drawer, mouse pointer glow, card hover glow, toast notifications.
- `js/nav.js`: header & footer rendered specifically for the standalone conference detail page.
- `js/data.js`: structured conference details, 12 related conferences, and 128 community reviews generator.
- `js/chitiethoinghi.js`: tab switcher, bookmark save toggle, 5-star rating widget, reviews voting, and hero glow.
- `data/conference-detail.json`: JSON format for conference detail data.

## Run
Open `index.html` or `chitiethoinghi.html` with VS Code Live Server or directly via `file://`.
