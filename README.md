# Axiom

axiom is a local-first desktop graphing calculator with a dark interface and offline graph storage.

it is inspired by desmos, but it is meant to have its own identity.

## current direction

main goals:

- desktop-first app
- linux first
- windows later
- macos after that
- real offline use
- no account required
- local graph saving
- portable json graph files
- dark gray interface
- polished graphing experience
- functionality on par with or beyond desmos

## current features

### app foundation

- tauri desktop app
- react + typescript frontend
- dark interface
- graph canvas renderer

### graph viewport

- mouse/touchpad zoom
- drag to pan
- square graph units
- double-click to reset viewport
- floating zoom in, zoom out, and reset view controls
- improved graph grid spacing
- axes render consistently above the grid
- collapsible sidebar / graph-only mode

### expressions

- editable function plotting
- multiple expressions
- pressing enter in an expression creates a new expression
- deletable final expression
- turn graph lines on and off
- change each line color
- generated unique colors after the first preset colors run out

### math engine

- normal math evaluation for non-graph expressions
- basic sliders for numeric variable expressions
- custom slider min, max, and step values with syntax like `a = 3 [0, 10, 0.5]`
- slider accent colors match their graph line colors

### points

- point plotting with expressions like `(1, 2)`
- variable-based point plotting, like `(a, b)`
- point coordinate labels on hover and click

### points and intersections

- basic intersection detection between visible explicit curves
- show dots where supported curves intersect
- click or hover supported intersection dots to show coordinates

### tables

- text-based table point plotting
- connected text-based table point plotting with `table lines:`

### advanced graphing

- basic inequality graphing for expressions like `y > x` and `y <= x^2`
- basic vertical inequality graphing for expressions like `x > 2` and `x <= a`
- basic equation support, like `y = x`, `x = 2`, `x = a`, and `x = y`
- basic implicit equation graphing, like `x^2 + y^2 = 25`
- sideways equation graphing, like `x = y^2`

### saving and library

- clean startup graph
- local graph library
- saved graphs remain available in the local library
- local current graph saving
- import and export json graph files

### export and sharing

- png export of the current graph canvas

### keyboard shortcuts

- ctrl+s to save
- ctrl+r to reset
- ctrl+w to delete the currently focused expression
- escape closes the settings popup

### settings

- settings popup opens as an overlay while the graph remains visible
- show/hide axis labels setting
- settings are saved locally and persist between app restarts
- settings saved status appears next to the settings title
- settings popup uses a darker github-like style

### interface

- scrollable sidebar for many expressions and library items
- cleaner github-dark inspired sidebar styling
- subtle svg sidebar collapse and reopen controls
- cleaner expression row layout
- cleaner color picker square styling
- cleaner plus button
- svg icons for graph actions
- confusing `new` button removed from the library section for now

## future ideas

### desmos-parity priorities

- real table ui
- table row and column editing
- table point style controls, including points, connected lines, and both
- better implicit equation support
- implicit equation intersections
- lists like `[1, 2, 3]` and ranges like `[1...10]`
- parametric curves like `(cos(t), sin(t))`
- graph settings for axes, grid, labels, and label format
- editable slider value directly in the slider control
- editable slider min, max, and step controls from the slider ui
- expression actions like duplicate, hide, delete, color, and style
- reset view button should appear only after the graph has been moved or zoomed
- desmos-like shift-drag behavior for stretching/scaling an axis or selected line
- smoother adaptive grid and label density while zooming

### graph controls

- better linux touchpad pinch zoom support
- add desmos-like shift-drag behavior for stretching/scaling a selected line
- reset view button should appear only after graph movement or zoom
- axis/grid/label rendering should continue moving toward desmos-like behavior

### math and expression input

- on-screen math keyboard
- more keyboard shortcuts
- better calculator/math evaluation
- support more complete desmos-like expression behavior
- support lists
- support parametric curves

### sliders

- editable slider value directly in the slider control, similar to desmos
- slider ui controls for min, max, and step values instead of only text syntax
- optional settings/popup control for slider movement amount
- animated sliders

### points and intersections

- more complete intersection detection
- intersection detection involving implicit equations
- desmos-style point hover / selection behavior
- setting for coordinate label format: decimal by default, optional symbolic constants like `π` when detected

### tables

- real editable table ui for point data
- add/remove table rows
- copy/paste table data from spreadsheets
- optional connected table points
- table ui should have a toggle/button for connected lines vs points only
- text-based table syntax is temporary and should be replaced with a user-friendly table interface
- table connected-lines mode should later support both straight segments and optional smooth curve interpolation

future table controls idea:

```txt
table expression
[x] show points
[ ] connect lines

### advanced graphing

- more complete equation support
- more complete inequality support
- compound inequalities
- inequalities with x on either side
- implicit inequalities
- smoother implicit equation rendering
- equations with variables on either side, like `x = y`
- inequalities with variables on either side, like `x <= y`
- fix any valid desmos-style syntax that does not graph correctly

### design and settings

- themes
- settings panel
- toggleable light/dark theme in settings after the dark design is more stable
- settings should stay as a desmos-like popup/overlay so the graph remains visible while settings are changed
- restyled color picker that matches axiom's theme
- redesign the interface so it feels hand-made and polished
- move the entire ui closer to github’s clean, structured dark design language
- make the entire ui match the darker github-like settings popup style
- keep graph line colors independent from the github-style interface palette
- make plus, utility buttons, topbar actions, and section controls consistently match the github-dark aesthetic
- add custom svg icons for major ui categories and sections
- use cleaner capitalization in settings and future ui sections
- use custom fonts consistently across the ui after choosing them
- add tasteful animations/interactions later across buttons, toggles, popups, sidebar transitions, graph interactions, and status changes
- keep expanding toward desmos-parity and eventually beyond-desmos features

### future file/workspace behavior

- keep the `new graph` action removed for now because save + reset covers the early workflow
- bring back `new graph` later as a proper file/workspace action
- later support `file → new graph` or a clear topbar/menu action
- later add unsaved-change handling before starting a new graph

### performance

- reduce bundle size / split heavy math engine code
- investigate mathjs bundle size
- maybe replace full mathjs import with smaller scoped imports if needed

## development

install dependencies:

```fish
npm install
```

run the development app:

```fish
npm run tauri dev
```

## build

for a production desktop build:

```fish
npm run tauri build
```

## known issues

- linux webkit/tauri pinch gesture may trigger native webview zoom; current workaround forces page zoom back to normal
- vite may warn that some chunks are larger than 500 kb after minification, probably because mathjs is large

## status

early development