# The Trindle Toolkit as a library

The Trindle Toolkit is its own Rust library crate, `trindle-toolkit`, in
its own repository, `trindle-toolkit`, which sits beside Trindle's and is
used by path (`../trindle-toolkit`). Trindle depends on it and calls it `toolkit`, so every
`crate::toolkit::` path in Trindle reads as before. Any other program can
depend on it by path or by git, for its windows, drawing, text, icons, style
sheet, screen reader link and input method. Licence: GPL-3.0-or-later, the
same as the repository.

The crate's own `README.md` is the guide for a stranger: the widget table,
the packages needed to build, units, app ids and the examples. The crate
builds outside Trindle's workspace: every dependency and lint setting in its
`Cargo.toml` is written out, and the style sheet and themes it builds in
live inside the crate (`share` in the toolkit repository). Trindle keeps
copies of them in its own `share/style.css` and `share/themes`, which its
packages install, and its tests fail if a copy differs from the toolkit's.

## What the toolkit took from the rest of Trindle

Before the move, the toolkit reached outside its old folder, `src/toolkit`, in these places.
Each was decided one of three ways: it **moves** into the library, it
becomes a **hook** the program supplies (the `Host` trait in `host.rs`,
with a plain answer for any other program), or it **stays** in Trindle.

| Trindle part | What the toolkit used it for | Decision |
|---|---|---|
| `common/said.rs` | Printing that never ends the program | Moves. Trindle's three programs bring it in from the library's folder. |
| `common/sheet.rs` | Reading the style sheet, the person's own sheet, themes and a theme on trial | Moves, whole. |
| `common/style.rs` | The highlight colour, light or dark, the own sheet's place, how long a link's label is | The look moves. Telling GTK, Flatpaks and dconf the look, moving people off old icon themes, the ring's own numbers and the palette of ten highlights stay in Trindle. |
| `common/files.rs` | The person's folders, opening a named file safely, whether a path is on this computer, `KEY=value` files, where the look's files are | Moves, all but Trindle's settings: the defaults of `trindle.conf` (`setting`, `default_setting`, `set_setting`), the desktop's own files and the session environment stay. |
| `common/run.rs` | Handing work done on a thread back to the window's loop, a most of threads at once, the pass a started program comes forward with | That part moves. Starting programs, pkexec and polkit stay. |
| `common/selection.rs` | Copying through the clipboard protocol when the compositor will not take a copy | Moves. Its clipboard watcher is told how to wait for an update by the program that runs it. |
| `common/shm.rs` | Shared memory for window pictures | Moves. |
| `common/own_press.rs` | The presses the compositor named as the person's own | Moves. |
| `common/eye.rs` | The rule of a password box's eye | Moves. The unlock screen brings it in from the library's folder. |
| `common/ui.rs` | "Click again to ...", "+3 lines" | Moves. |
| `common/tip.rs` | How long a label on pointing stays | The kinds move; which one the person chose is a hook (`Host::labels`). |
| `common/source.rs` | Tests that read code without its comments | Moves (tests only); Trindle's tests bring it in from the library's folder. |
| `common/person_only.rs` | Which windows and acts only a real press may reach | Stays (Trindle's policy, shared with its compositor). Hooks: `Host::asks_only_the_person`, `Host::act`. |
| `common/own_helpers.rs` | Whether the person switched the screen reader on themselves | Stays. Hook: `Host::reader_switched_on`. |
| `common/refused.rs` | Saying a thread draws, so polkit is never waited on there | Stays. Hook: `Host::drawing_thread`. |
| `common/themes.rs` | Ending a theme's trial when it is over | Stays. Hook: `Host::end_trial_if_over`. |
| `common/missing_icons.rs` | Noting programs drawn with a stand-in icon | Stays. Hook: `Host::missing_icon`. |
| `common/graphics.rs` | Whether things move, or appear, without a graphics chip | Stays. Hook: `Host::moving`. |
| `icons::CIRCLES` | The icon set looked in after the chosen one | Stays. Hook: `Host::own_icon_set`. |
| `common/x11_rooms.rs` | One drag and drop test with older (X11) programs | Stays, and that test moves to Trindle (`src/common/xdnd_test.rs`). |
| `compose/protocols/own_press.xml` | Trindle's own protocol, `trindle_own_press_v1` | Moves to `protocols` in the toolkit repository; the compositor builds its side from there. |
| The settings, ring and Folders modules | Nothing: the toolkit never used them | No change. |

Trindle sets its answers to the hooks before anything else runs, so its
programs and its tests behave exactly as before. A program that sets none
gets the plain answers: labels show briefly, things move, no window or act
is kept for the person's own press, no icon set beyond the chosen one and
hicolor, nothing is noted.

The look is read from Trindle's own settings folder on purpose: the theme,
light or dark, the highlight colour and the person's own style sheet, in
`~/.config/trindle`. So a program built on the toolkit matches Trindle when
it runs there, and uses the built-in sheet and yellow highlight anywhere
else, where that folder is not there.

Tests: the toolkit's own run with `cargo test` in its own repository. Trindle's
tests read some of the toolkit's test parts (the tables of what is drawn on
what, a window's words and parts, stand-in mice and keyboards, a private
bus); the toolkit's `testing` feature switches these on, and only Trindle's
tests ask for it. The tests that hold Trindle's own lists to the toolkit
(which acts only the person's own press may do, and drag and drop with
older programs) moved to Trindle (`src/common/host.rs`,
`src/common/xdnd_test.rs`). Trindle's tests that read code as text read the
toolkit's too, by the names they had before (`toolkit/ui.rs`), through
`common::source::trees`.

The style sheet and the themes live in the crate (`share` in the toolkit repository)
and are built in from there. Trindle's `share/style.css` and `share/themes`
are copies held to them by `common::from_the_toolkit`, where Trindle's
packages install them from.

## Trindle's own Wayland protocols are optional

Every protocol beyond the core, `xdg_wm_base` and `wl_shm` is looked for when
the toolkit connects, and left out when the compositor does not offer it:
Trindle's own `trindle_own_press_v1`, the layer shell (panels; Mutter has
none), fractional scaling, the viewporter, title bar decorations, cursor
shapes, text input, activation and the clipboard. A window opens on Mutter,
KWin, Sway or any compositor with the ordinary window protocol. The test
`a_window_opens_on_a_compositor_with_only_the_core_protocols` runs a
stand-in compositor that offers only `wl_compositor`, `wl_shm`,
`xdg_wm_base`, `wl_seat` and `wl_output`, opens a window on it and checks
that a picture arrives. `Display::connect_on` takes a connection made
elsewhere, which is how the test hands it the stand-in.

## Using it

```toml
[dependencies]
trindle-toolkit = { path = "../trindle-toolkit" }
```

Three examples are in `examples/` in the toolkit repository (`hello`, `notes`
and `names`); the README lists them and how to build them:

```sh
cargo run --example hello
```

## What a terminal still needs

What Fetch Terminal needs from the toolkit, and whether it is there now.

| Need | There now? | How, or what is missing |
|---|---|---|
| A surface for a monospace grid of cells, each with its own colours | Partly | `widget::drawing` paints anything with the window's fonts, look and scale (`Pen`), and `Style::family` picks a monospace font. Missing: a grid painter that keeps each glyph and repaints only the rows that changed; until then the program paints runs of one colour itself. |
| Raw keys | Done | `Node::on_keys` on the drawing, or `App::intercept`, hears every `Input::Key` (keysym, typed text, modifiers, repeat) and `KeyUp`. |
| Clipboard | Partly | `Window::copy` and `Window::paste` for text. Missing: the primary selection (paste with the middle button), a protocol of its own. |
| Mouse selection | Done | `Node::on_pointer` on the drawing hears down, move, up, middle and right; the program counts double and triple clicks. |
| Scroll | Done | `Input::Scroll` (wheel steps or touchpad points) reaches `App::intercept`. |
| Tabs | Partly | A row of choices (`widget::choice`) with a middle click (`on_middle`) and dropping on a tab (`on_drop`). Missing: a close button on each tab, and dragging tabs into another order. |
| Context menu | Done | `Node::menu` on the drawing gives rows for a right click, with Copy built in. |
| Input method composing | Done | `App::typing` tells the input method where the caret is; `Input::Composed` brings the word being made and the word typed. |
| The title following the program in the window | Added now | `Window::set_title`. |

Not built here, because none of them is small: the cell grid painter, the
primary selection, and tabs that close and move.

## Building a plugin

A program that is shipped as a Trindle plugin, with the toolkit for its windows,
follows the plugin format in `docs/plugin-format.md`: the archive layout,
`plugin.ini`, the permissions, what the box allows and what is not yet possible.
