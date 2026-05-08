# Axiom

Axiom is a local-first desktop graphing calculator with a dark interface and offline graph storage.

## Current direction

Axiom is being built as a Desmos-inspired graphing calculator, but with its own identity.

Main goals:

- desktop-first app
- Linux first
- Windows later
- macOS after that
- real offline use
- no account required
- local graph saving
- portable JSON graph files
- dark gray interface
- polished graphing experience

## Current features

- Tauri desktop app
- React + TypeScript frontend
- dark interface
- graph canvas renderer
- editable function plotting
- mouse/touchpad zoom
- drag to pan
- square graph units
- double-click to reset viewport
- multiple expressions
- turn graph lines on and off
- change each line color
- local current graph saving
- import and export JSON graph files
- local graph library
- clean startup graph
- saved graphs remain available in the local library
- deletable final expression
- scrollable sidebar for many expressions and library items
- normal math evaluation for non-graph expressions
- Ctrl+S to save
- Ctrl+R to reset

## Future ideas

- zoom in and zoom out buttons
- reset view button
- normal calculator/math evaluation like Desmos
- on-screen math keyboard
- sliders for variable expressions
- custom slider min, max, and step values
- animated sliders
- points
- tables
- inequalities
- implicit equations
- PNG export
- themes
- keyboard shortcuts
- collapsible sidebar / graph-only mode
- intersection points between graphs
- show a dot where curves intersect
- display the intersection coordinates
- Desmos-like point hover / selection behavior
- pressing Enter in an expression creates a new expression

- long-term goal: functionality on par with or beyond Desmos

## Development

Run:

npm install

Then:

npm run tauri dev

## Status

Early development.

## Build

For a production desktop build:

```bash
npm run tauri build