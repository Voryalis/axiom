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

### expressions

- editable function plotting
- multiple expressions
- pressing enter in an expression creates a new expression
- deletable final expression
- turn graph lines on and off
- change each line color

### math engine

- normal math evaluation for non-graph expressions
- basic sliders for numeric variable expressions

### points

- point plotting with expressions like `(1, 2)`
- variable-based point plotting, like `(a, b)`
- point coordinate labels on hover and click

### tables

- text-based table point plotting
- connected text-based table point plotting with `table lines:`

### advanced graphing

- basic inequality graphing for expressions like `y > x` and `y <= x^2`
- basic vertical inequality graphing for expressions like `x > 2` and `x <= a`

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

### interface

- scrollable sidebar for many expressions and library items

## future ideas

### graph controls

- collapsible sidebar / graph-only mode
- better linux touchpad pinch zoom support
- add desmos-like shift-drag behavior for stretching/scaling a selected line

### math and expression input

- on-screen math keyboard
- more keyboard shortcuts
- ctrl+w deletes the currently focused expression

### sliders

- slider accent colors should match their graph line colors
- custom slider min, max, and step values
- animated sliders

### tables

- real editable table ui for point data
- add/remove table rows
- copy/paste table data from spreadsheets
- optional connected table points
- table ui should have a toggle/button for connected lines vs points only
- text-based table syntax is temporary and should be replaced with a user-friendly table interface
- table connected-lines mode should later support both straight segments and optional smooth curve interpolation

future table controls idea:

`txt`
`table expression`
`[x] show points`
`[ ] connect lines`

### points and intersections

- desmos-style point coordinate labels on hover/click
- intersection points between graphs
- show a dot where curves intersect
- display the intersection coordinates
- desmos-like point hover / selection behavior

### advanced graphing

- more complete inequality support
- compound inequalities
- inequalities with x on either side
- implicit inequalities
- implicit equations
- equations with variables on either side, like x = y
- inequalities with variables on either side, like x<=y


### design and settings 

- themes
- settings panel 
- toggleable light/dark theme in settings
- restyled color picker that matches axiom's theme
- replace topbar text buttons like save, reset, import, and export with clean icon/symbol buttons
- redesign the interface so it feels hand-made and polished.
- move the general ui style closer to github’s clean, structured design language
- keep graph line colors independent from the github-style interface palette
- keep expanding toward desmos-parity and eventually beyond-desmos features

## development

install dependencies:

`npm install`

run the development app:

`npm run tauri dev`

## build

for a production desktop build:

`npm run tauri build`

## known issues

- liux webkit/tauri pinch gesture may trigger native webview zoom; current workaround forces page zoom back to normal 
- `y = x` works, but `x = y` does not yet

## status 

early development



