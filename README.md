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

### App foundation

- Tauri desktop app
- React + TypeScript frontend
- dark interface
- graph canvas renderer

### Graph viewport

- mouse/touchpad zoom
- drag to pan
- square graph units
- double-click to reset viewport
- floating zoom in, zoom out, and reset view controls

### Expressions

- editable function plotting
- multiple expressions
- pressing Enter in an expression creates a new expression
- deletable final expression
- turn graph lines on and off
- change each line color

### Math engine

- normal math evaluation for non-graph expressions
- basic sliders for numeric variable expressions

### Export and sharing
- PNG export of the current graph canvas

### Points

- point plotting with expressions like `(1, 2)`
- variable-based point plotting, like `(a, b)`
- point coordinate labels on hover and click

### Saving and library

- clean startup graph
- local graph library
- saved graphs remain available in the local library
- local current graph saving
- import and export JSON graph files

### Keyboard shortcuts

- Ctrl+S to save
- Ctrl+R to reset

### Interface

- scrollable sidebar for many expressions and library items

## Future ideas

### Graph controls

- collapsible sidebar / graph-only mode

### Math and expression input

- normal calculator/math evaluation like Desmos
- on-screen math keyboard
- keyboard shortcuts
- Ctrl+W deletes the currently focused expression

### Sliders

- sliders for variable expressions
- slider accent colors should match their graph line colors
- custom slider min, max, and step values
- animated sliders

### Tables

- real editable table UI for point data
- add/remove table rows
- copy/paste table data from spreadsheets
- optional connected table points
- table UI should have a toggle/button for connected lines vs points only
- text-based table syntax is temporary and should be replaced with a user-friendly table interface
- table connected-lines mode should later support both straight segments and optional smooth curve interpolation

Table expression
[x] show points
[ ] connect lines

### Points and intersections

- Desmos-style point coordinate labels on hover/click
- intersection points between graphs
- show a dot where curves intersect
- display the intersection coordinates
- Desmos-like point hover / selection behavior

### Advanced graphing

- inequalities
- implicit equations

### Export and sharing

### Design and settings

- themes
- settings panel
- toggleable light/dark theme in settings
- restyled color picker that matches Axiom’s theme
- replace topbar text buttons like Save, Reset, Import, and Export with clean icon/symbol buttons

### Long-term goal

- functionality on par with or beyond Desmos
## Development

Run:

npm install

Then:

npm run tauri dev

## Status

Early development.

## Build

For a production desktop build:

```bash```
```npm run tauri build```

## Known Issues

- Linux WebKit/Tauri pinch gesture may trigger native webview zoom; current workaround forces page zoom back to normal

