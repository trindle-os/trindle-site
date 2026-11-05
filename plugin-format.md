# The Trindle plugin format (interface 1)

For people who build a plugin outside the Trindle repository: Trindle Scan,
Snippets, the screen reader, Flow and any other. It says what Trindle does
today, as read from the Trindle specification (the sections "Plugins" and "The plugin
catalogue", kept outside this repository) and from the code (`src/plugins/`, `src/store/boxed/`,
`src/common/access.rs`, `src/common/seccomp.rs`). Where the spec and the code
disagree it says so, and what Trindle cannot do yet is in the last section.
Nothing here is promised that the code does not do.

The working example is Flow's packaging script,
`packaging/build-trindle-plugin.sh` in the Flow plugin's own repository.

Read these three facts first:

1. **A plugin is untrusted.** Trindle is installed on strangers' computers and
   anyone may submit a plugin. Everything a plugin writes is treated as hostile
   text, and its program runs in a box with nothing it was not allowed.
2. **Nobody installs a plugin themselves.** A plugin is submitted, tried by
   Trindle's people, added to Trindle's signed catalogue, and installed from
   there by Install in Apps. There is no install command, no "add a folder" and
   no setting that points Trindle at another catalogue.
3. **The desktop never adapts to a plugin.** Nothing in Trindle names a plugin.
   What a plugin shows in Trindle (a ring icon, a settings card, shortcuts,
   notifications) comes only from the fields of its `plugin.ini` and the few
   files it writes in its own home.

## 1. The archive

### Layout

A plugin is a folder. It is shipped as an archive of that folder: `.tar.zst`
(what Flow uses), `.tar.gz`, `.tgz`, `.tar.xz` or plain `.tar`.

```
org.example.Weather/            the one folder at the top (or none: see below)
  plugin.ini                    required, at the top of the folder
  bin/weather                   programs the plugin runs (executable files)
  icons/weather-ring.svg        the ring icon (SVG or PNG)
  LICENSE                       anything else you need
  lib/ ... share/ ...           your own libraries and data, any names
```

- `plugin.ini` must be at the top of the archive or inside the one folder that
  is the whole of the archive's top. Anything else is refused ("The archive has
  no plugin.ini at its top, or in the one folder at its top").
- **No folder name is special to Trindle** except the ones `plugin.ini` points
  at. `bin/`, `icons/`, `lib/` and `share/` are only conventions. Installed, the
  whole folder is copied to `~/.local/share/trindle/plugins/<Id>/app` and the
  program sees it read only at `/app`.
- Every program named by a `Run=` line must be a regular file with an execute
  bit, inside the folder. The path in `Run=` is relative to the folder
  (`Run=bin/weather --show`); an absolute path or one with `..` is refused.
- **Links.** A symbolic link must be relative and stay inside the folder.
  Any link that leads outside is refused, whatever it points to.
- **Libraries.** Trindle sets no library path. The box shows the system's `/usr`
  read only, so a program that needs only libc and what Debian 13 always has
  can run as it is (Flow's script checks exactly that). Anything else must be
  carried in the folder and found by the program itself (an rpath such as
  `$ORIGIN/../lib`, or a small wrapper script).
- **Size.** An archive over 500 MB is refused by Apps. The catalogue's own index
  is limited to 1 MB.
- **Never in the archive:** `ring.json`, `settings.ini`, `notify.jsonl` and the
  choices files. These are written by the plugin at run time in its home (see
  below). Anything of those names that an archive carries is not read.

### Names

- **The Id** is letters, digits, dots and dashes, 1 to 100 characters, not
  starting with a dot or a dash and without `..`. Trindle's own plugins are
  written `org.trindle.Name` (`org.trindle.Flow`), and a maker uses a name of
  their own in the same shape (`org.example.Weather`). The code does not
  require the `org.trindle.` prefix. It is the name of the plugin's folder, of
  its box and of its permission record, so it never changes between versions.
- **The archive's file name** is anything made of plain characters (no `/`,
  `\`, no leading dot) that ends in one of the archive endings above. The
  catalogue names it for each plugin. Flow's script writes
  `<Id>.tar.zst`, `<Id>.svg` (the picture for Apps) and
  `<Id>.description.txt` beside the folder `<Id>/`.
- **Picture and description for Apps.** The catalogue's picture is an SVG or
  PNG beside the archive, named after the Id or the archive (else the ring
  icon is copied out). The one-line text on the card is `[Plugin] Summary`, or
  when that is empty the first sentence of `<Id>.description.txt` (cut to 160
  characters).

### Plain words

Every word a plugin writes for people to read is checked when it is installed
and drawn only as plain words. "Plain" means one line, no control characters,
no text-direction characters, no doubled spaces, no space at either end. Sizes
below are in characters.

## 2. `plugin.ini`

The file is a key file: `[Group]` lines and `key=value` lines. A list is items
ended by `;`, with `\;` for a `;` inside one. A plugin that does not conform is
not installed, and the validator (`plugins::check`) says each fault in plain
words.

Complete example (from the spec, all keys of the common case):

```ini
[Plugin]
Interface=1
Id=org.example.Weather
Name=Weather
Version=1.0
Summary=The weather where you are, in the ring.
Permissions=network;notifications;background
Shortcuts=refresh

[Shortcut refresh]
Label=Refresh now
Keys=Ctrl+Alt+W
Run=bin/weather --refresh

[Ring]
Icon=icons/weather.svg
Label=Weather
Run=bin/weather --show
Menu=refresh

[Menu refresh]
Label=Refresh now
Run=bin/weather --refresh

[Settings]
Fields=town;units

[Field town]
Kind=text
Label=Town

[Field units]
Kind=choice
Label=Units
Choices=Celsius;Fahrenheit
Default=Celsius

[Background]
Run=bin/weather-watch
```

A plugin must hook into something: at least one of `[Ring]`, `[Settings]` (with
fields), `[Background]`, a shortcut, or the `notifications` permission. Else it
is refused ("The plugin hooks into nothing").

### `[Plugin]` (required)

| Key | Meaning | Allowed values | Example |
|---|---|---|---|
| `Interface` | The version of this format | The number `1`. Any other is refused. Interface 1 has grown without changing its number: a newer permission or key is optional, and an older Trindle refuses a plugin that asks for a permission it does not know. | `1` |
| `Id` | The plugin's name for the machine | See Names above | `org.example.Weather` |
| `Name` | The name people see | Required, plain, at most 48 | `Weather` |
| `Version` | Its version | Required, plain, at most 32. Updates compare it part by part with numbers as numbers (1.10 is newer than 1.9). | `1.2` |
| `Summary` | One line of what it does, on its card in Apps | Optional, plain, at most 200 | `The weather where you are, in the ring.` |
| `Permissions` | What it asks for | A list from the permissions in section 3. Anything else is refused, as is a name given twice and `network` together with `home-network`. Asking grants nothing. | `network;notifications` |
| `Shortcuts` | Ids of its keyboard shortcuts | Optional list, at most 4. Each id is letters, digits, dashes and underscores, none twice, and has a `[Shortcut id]` part. | `switch;other` |

### `[Ring]` (optional): the plugin as an app, or a status icon in the ring's centre

| Key | Meaning | Allowed values |
|---|---|---|
| `Icon` | The picture | Required. A path inside the folder ending `.svg` or `.png`; the file must exist and be inside the folder. |
| `Label` | Said when the pointer rests on it | Required, plain, at most 48 |
| `Run` | What a click starts | Required. A program inside the folder and its arguments, split into words as a shell would split them (quotes and backslashes read) but never run by a shell. |
| `Menu` | Ids of extra lines in the icon's right-click menu | Optional list, at most 8. Id: letters, digits, dashes and underscores, none twice, each with a `[Menu id]` part. |

A plugin with `[Ring]` and no `Menu` is a regular app: it is listed with the other apps, with the usual right-click. With `Menu` it is a status icon in the ring's centre instead. Trindle always adds the last lines, **Close** (closes the plugin's windows) and **Settings**, to that menu. A plugin cannot
hide or rename it.

### `[Menu id]`

| Key | Meaning | Allowed values |
|---|---|---|
| `Label` | The line's words | Required, plain, at most 32. Write sentence case ("Connect to desktop"). |
| `Run` | What choosing it starts | Required. Same rules as `[Ring] Run`. |

Choosing a line closes the menu and leaves the ring open.

### `ring.json`: the menu as it is today (written by the plugin, not shipped)

The plugin writes `~/ring.json` (that is, `ring.json` at the top of its home).
The ring reads it afresh each time the menu opens. It must be a plain file of
at most 4096 bytes holding a JSON object; a link, a pipe, a folder, a file over
4 KB or anything that is not an object means "every item, no headline". A part
of the wrong kind is left out on its own.

| Key | Meaning | Limits |
|---|---|---|
| `headline` | A greyed first line of the menu that cannot be chosen | Text; made plain (no markup, control or direction characters) and cut to 60 characters with an ellipsis |
| `hidden` | Ids from `[Ring] Menu` to leave out for now | A list of text; at most 32 read |
| `items` | Extra lines made now, after the `[Menu]` lines and before Settings | A list of at most 8 objects, below |

Each item in `items`:

| Key | Meaning | Limits |
|---|---|---|
| `label` | The line's words | Text, made plain, cut to 32. An item with no label left is dropped. |
| `args` | Arguments for the `[Ring] Run` program | A list of at most 4 texts, each 1 to 64 characters, no control characters. Choosing the item runs the same program as `[Ring] Run` in the same box, with exactly these arguments in place of its own. One bad argument and the whole item is dropped. |
| `unlock` | A computer's id, for the PIN box | Letters, digits, dots, dashes or underscores, 1 to 64, not starting with a dot or dash. An item with `unlock` has no `args`. Only offered to a plugin that has `[PinUnlock]` (below). |

### `[Shortcut id]`

| Key | Meaning | Allowed values |
|---|---|---|
| `Keys` | The key combination | Words joined by `+`, any case: Ctrl, Alt, Shift, Super, then one key (a letter or digit, F1 to F24, or Tab, Return, space, Escape, BackSpace, Delete, Insert, Home, End, Page_Up, Page_Down, the arrows, Print, Pause, minus, equal, comma, period, slash, semicolon, apostrophe, grave, bracketleft, bracketright, backslash; Enter, Esc, PgUp, PgDn also work). It needs Ctrl, Alt or Super: Shift alone only makes a capital. |
| `Label` | Said beside the keys in Settings | Optional, plain, at most 32. The id is used if there is none. |
| `Run` | What the keys start | Required. Same rules as `[Ring] Run`. Runs in the plugin's box. |

The validator refuses keys that Trindle keeps for itself (the standard window
keys and everything in Trindle's own `shortcuts.xml`), a combination that is
not valid, and keys two of the plugin's own shortcuts share. If another
installed plugin has the same keys, the first plugin by Id keeps them and the
second is left out with a reason in Settings, Keyboard and mouse. The person's
own shortcuts win over a plugin's. The person can retype a plugin's keys in
Settings, Keyboard and mouse (kept apart from the plugin, so an update does not
undo it). A made-up key from a plugin allowed `control` cannot set off a plugin
shortcut.

### `[Settings]` and `[Field name]`: the plugin's card in Settings, Your plugins

`[Settings]` has `Fields=a;b;c`, a list of field names (required if the part is
there; a field name is letters, digits, dashes and underscores). Each name has
a `[Field name]` part. Values are kept in `settings.ini` in the plugin's home,
under `[Settings]`, where the plugin reads them. The card re-reads that file
each second.

| Key | Meaning | Allowed values |
|---|---|---|
| `Kind` | What sort of field | `switch`, `text`, `choice` or `note`. Anything else is refused. |
| `Label` | The field's name on the card | Required, plain, at most 48 (optional for a `note`) |
| `Default` | The value until one is kept | `switch`: `true` or `false`. `choice`: one of `Choices`. `text`: any. A `note` has none. |
| `Choices` | For `choice`: the options | A list, at most 32, each plain and at most 48. Two or more unless `ChoicesFrom` is given. |
| `ChoicesFrom` | For `choice`: options the plugin keeps in a file of its home | A plain file name: letters, digits, dots, dashes and underscores, at most 64 characters, not starting with a dot, no folder. The file has one option a line, `value` or `value\|Label`; at most 32 lines read, each part cut to 48, repeats and empty lines left out, a file over 8 KB or a link not read. It is read as the page opens and each second after. A choice with fewer than two options to offer is left off the card. |
| `TextFrom` | For `note`: a file holding the line to show | Same file-name rule and same reading rules as `ChoicesFrom`. Shows the first line with something on it, made plain and cut to 120 characters. A note holds no setting, so it has no `Default` and no other field's `ShowWhen` may name it. |
| `ShowWhen` | Show this field only while another has a value | `other=value`: at most 128 characters; the other field is named in `Fields`, comes earlier, has no `ShowWhen` of its own, and is a switch (`true` or `false`), a choice (one of its `Choices` unless it uses `ChoicesFrom`) or a text. The match is exact. A hidden field keeps its saved value. |

Example (from the spec):

```ini
[Settings]
Fields=role;side

[Field role]
Kind=choice
Label=This computer
Choices=controls;controlled
Default=controls

[Field side]
Kind=choice
Label=Where the other computer is
Choices=left;right
ShowWhen=role=controls
```

A plugin with no fields shows "has no settings of its own".

### `[Background]` (optional)

`Run=` a program inside the folder. Needs the `background` permission, else
refused. Once the person allows `background`, Trindle starts it at login and
keeps one copy running (a `background.lock`). Its output is written, by
Trindle outside the box, to `~/.local/state/trindle/plugins/<Id>.log` (256 KB,
with the one before kept once as `.log.1`). After an update Trindle stops the
old part before the swap and starts the new one after, and says if it did not
start.

### `[Network]` (optional)

`Listen=tcp:24810;udp:24811`. See section 4 under Network: it needs both the
`network` and `listen` permissions, and `listen` needs a `Listen` line.

### `[PinUnlock]` (optional, Flow only)

```ini
[PinUnlock]
Run=bin/flow unlock
```

A command that is handed a four-digit PIN on its standard input, with a
computer's id as its last argument, to unlock another computer. **The validator
refuses this part in any plugin whose Id is not `org.trindle.Flow` or which does
not ask for `control`**, and Trindle uses the command only while the plugin is
Flow that came from Trindle's own signed catalogue (the catalogue's mark
beside it), still conforming and allowed `control`. A plugin by anyone else
cannot use it. The item that starts it is a `ring.json` item with `unlock`.

## 3. Permissions

A plugin names what it wants in `[Plugin] Permissions`. Asking grants nothing:
every permission is off until the person allows it in the permission window
(shown after Install, and again from the Allow button) or in Settings,
Permissions. A change takes effect at once (a background part is stopped and
started again in a box that matches). An update that newly asks for something
waits to be allowed. An update that asks for fewer permissions takes the
allowance for the others away.

These are the only thirteen names. The words are what the permission window shows
(`src/common/access.rs`). The line "Off:" is what the Permissions page says when
the switch is off.

| Name | Words in the window | Off: |
|---|---|---|
| `network` | the internet | It will not be able to reach the internet or other computers nearby. |
| `sound` | play sound | It will make no sound. |
| `microphone` | your microphone | It will not be able to hear you. |
| `files` | your Documents, Downloads, Pictures, Music, Videos and Desktop folders | It will not be able to open your files or save into your folders. |
| `notifications` | show notifications | It will not be able to tell you when something happens. |
| `background` | start by itself when you log in | It will only run while you have it open. |
| `control` | control your keyboard, mouse and clipboard | It will not be able to move the pointer, type or share what you copy. |
| `capture` | share your mouse and keyboard with another computer | The pointer will not be able to cross to another computer. |
| `listen` | let other computers on your home network reach it | Other computers on your home network will not be able to find it or connect to it. |
| `copied` | read the files you copy | It will not be able to read the files you copy, so it cannot carry them to another computer. |
| `summon` | open the ring over a full-screen window, as if you pressed the key | Its keys and clicks will open the ring on the desktop only, never over a full-screen window. |
| `home-network` | reach devices on your home network only | It will not be able to find or talk to printers, scanners or other devices at home. |
| `usb-devices` | use scanners and USB devices | It will not be able to use a scanner that is plugged into this computer. |

Six carry a warning that is always shown with them:

- `control`: "It can type, click and read what you copy as if it were you. Only allow this for a plugin you trust."
- `capture`: "While the pointer is on the other computer, everything you type and click goes to this plugin. Only allow this for a plugin you trust."
- `copied`: "It can read exactly the files you copy while it is allowed, and nothing else. Only allow this for a plugin you trust."
- `summon`: "It can put the ring, which takes everything you type, over a game or a film without you touching a key. Only allow this for a plugin you trust."
- `home-network`: "It can talk to every device on your home network, your router included, but not to the internet. Only allow this for a plugin you trust."
- `usb-devices`: "It can use the scanners and image devices that are plugged in when it starts, and no other USB device. Only allow this for a plugin you trust."

`listen` also shows the exact ports under it ("Ports TCP 24810 and UDP 24811").

Not permissions for a plugin, although Apps' other kinds of program have them:
`devices`, `bluetooth`, `screen`, `x11`, `home` and `computer`. A plugin that
asks for one is refused ("Permission X is not one there is").

What `network`, `files`, `sound`, `microphone`, `notifications` and
`background` do is in section 4. What the rest do:

- **`control`** gives the box a second Wayland socket (named
  `org.trindle.boxed.control`) on which the compositor also offers the
  made-up mouse (wlr virtual pointer), the made-up keyboard (virtual keyboard)
  and the clipboard (wlr data control). Nothing more: no screenshots, no other
  windows. Nothing from it passes while the screen is locked, or while a
  question only the person may answer is showing.
- **`capture`** adds Trindle's own protocol `trindle_input_capture_v1`
  (`src/compose/protocols/input_capture.xml`) to the box's socket, to take the
  mouse and keyboard while the pointer is over on another computer. An orange
  dot shows on every screen while it holds them, Ctrl+Alt+Shift held for one
  second takes them back, and a take is honoured only within five seconds of
  the person running the plugin's ring icon, menu line or shortcut.
- **`listen`** opens the firewall for exactly the ports in `[Network] Listen=`
  from home-network addresses only (see Network below).
- **`copied`** puts one socket in the box (`$TRINDLE_COPIED_SOCKET`) from which
  the plugin may ask for the files just copied. Protocol: one packet each way,
  a 4-byte big-endian length then UTF-8 text; the request is `LIST`; the reply
  is `FILES` messages (up to 250 `F` or `D` lines each, with one pipe
  descriptor for each `F` line) then `DONE` or `ERR`. The full rules are in the
  spec ("Copied files").
- **`summon`** changes nothing about the box. The compositor reads the
  person's record of it at each made-up key. It does nothing without `control`.
- **`home-network`** gives the box a network that leads to the home network
  and nowhere else (section 4, "Home network"). Do not ask for it and `network`
  together: the validator refuses that, because `network` already reaches the
  home network.
- **`usb-devices`** lets in the scanners and image devices that are plugged in
  when the box starts, and no other USB device (section 4, "Devices").

## 4. The box

A plugin's program runs under bubblewrap with a seccomp filter
(`store::boxed::walls`; the same box a boxed .deb gets). Every start builds the
box afresh. What follows is read from the arguments, so it is what is enforced.

**Always, whatever is allowed:**

- All namespaces unshared (`--unshare-all`): its own processes, IPC, host name,
  and (unless `network` or `home-network` is allowed) network. `--new-session`,
  `--die-with-parent`, no user namespaces (`--disable-userns`).
- Seccomp: the short list of kernel calls Flatpak refuses is refused; sockets
  may be of the Unix, IPv4, IPv6 and netlink families only (a raw packet or
  vsock socket gets `EAFNOSUPPORT`).
- `/usr` and `/etc` are the system's, read only. `/bin`, `/sbin`, `/lib` and
  `/lib64` are links into `/usr`.
- Its own folder at `/app`, read only.
- `/proc`, a minimal `/dev`, and `/dev/dri` (the graphics card) with the few
  parts of `/sys` graphics need and the processors' folder. No other device.
- The person's fonts folder (`~/.local/share/fonts`) read only, if it exists.
- A new empty `/tmp` and `/run`, in memory, lost when the box ends. The only
  things in the runtime folder (`$XDG_RUNTIME_DIR`) are the sockets listed
  below.
- A private home (see Files).
- Its own Wayland socket, made by Trindle outside the box, so the compositor
  knows the program is in a box and gives it none of what lets a program watch
  or steer the desktop (no screenshots, no window list, no made-up input).
- `DBUS_SESSION_BUS_ADDRESS`, `SSH_AUTH_SOCK`, `GNOME_KEYRING_CONTROL`,
  `GPG_AGENT_INFO` and `PULSE_SERVER` are unset, and no bus socket is in the
  box. **There is no session bus, so a plugin cannot reach any D-Bus service**
  (no desktop portals, no accessibility bus, no notifications over D-Bus).
- No X display (`DISPLAY` unset). A plugin may not ask for `x11`.

### Files

- **Its own private home.** `$HOME` inside the box has the same path as the
  person's real home, but it is the folder
  `~/.local/share/trindle/plugins/<Id>/home/`, kept between runs and removed
  when the plugin is. It holds what the plugin saves, and the files Trindle
  reads from it (`ring.json`, `settings.ini`, the choices and note files,
  `notify.jsonl`). The plugin may make anything there, links included, so
  Trindle opens each such file without following a link and refuses anything
  that is not a plain file.
- **Beside it, outside the box,** are `app` (the program, read only), `allowed`
  (what the person allowed), `asked`, `listening` and `catalogue`. A plugin
  cannot write them, and a file of those names in its home is not read.
- **`files`** adds exactly six of the person's folders, each at its real path,
  read and write: Documents, Pictures, Music, Videos, Downloads and Desktop.
  Each is named with `--bind-try`, so a missing one is left out and one made
  later appears at the next start. The plugin never gets the real home itself
  or its hidden folders, and cannot widen the list by what it asks.
- **There is no way for a plugin to be given one chosen folder or file.** The
  file chooser portal needs the session bus, which the box does not have.
  The only other ways files reach a plugin are the six folders above and the
  `copied` stream.

### Network

- **`network` is all or nothing.** Allowed, the box shares this computer's
  network (`--share-net`): the internet, the home network, and this computer's
  own `localhost`. Not allowed (and not `home-network`), it has a network of
  its own with nothing in it: it reaches nothing outside the box.
- **`home-network` is a third choice** (20 October 2026): a network that
  leads to the person's home network and nowhere else. See "Home network"
  below. There is still no list of hosts a plugin may reach. (The
  list-of-hosts proxy that exists, `store/fence_net.rs`, belongs to the fence
  for AI programs and is not used for plugins.)
- Because a box allowed `network` shares the network namespace, anything that
  is reachable on this computer's loopback is reachable from the plugin
  (inference from `--share-net`, not separately tested). A box allowed only
  `home-network` has a loopback of its own with nothing of this computer's on
  it.
- **`listen`** (with `network` also allowed) lets other computers on the home
  network reach the plugin. `[Network] Listen=tcp:24810;udp:24811` is a list of
  `protocol:port`: at most 4, protocol `tcp` or `udp` in lower case, port 1024
  to 65535 written as plain digits, none twice, none of the ports Trindle's own
  firewall rules or common services use (`RESERVED_PORTS` in
  `src/common/firewall.rs`). The validator refuses `Listen` without both
  `network` and `listen`, and `listen` without `Listen`. The firewall opens
  exactly those ports, only from the home network's own addresses
  (10/8, 172.16/12, 192.168/16, 169.254/16, fe80::/10, fc00::/7; Tailscale is
  let in anyway). The first opening asks for the administrator's password
  (`trindle-admin firewall-plugin ID`). At most 16 plugin ports are open in all
  and a port another plugin holds is refused. An update that names other ports
  takes the allowance away until the person allows it again.

### Home network

`home-network` ("Reach devices on your home network only") is for a plugin that
talks to printers, scanners and other things in the house and must never
reach the internet or this computer's own services. It is enforced outside the
box, in a network room Trindle makes for it before it starts
(`src/store/home_net.rs`; the spec's "Home network"):

1. The room is a user namespace and a network namespace of their own, held by a
   small program of Trindle's, the keeper, which is root inside them and
   nowhere else.
2. `pasta` (the package passt), started as the person and joined to the room
   from outside, carries the room's traffic over ordinary sockets. It is told
   to forward no port either way, to keep the room's gateway from meaning this
   computer, and to bind every outgoing connection to the one interface that
   carries the default route, so an address this computer has on another
   interface (a Docker bridge, a virtual machine) cannot be reached.
3. The keeper loads one nftables table into the room before the box starts:
   output and input are dropped except to and from the home ranges below, and
   no name server is asked (ports 53 and 853 are dropped even inside the
   ranges).
4. The box is the keeper's child, in a user namespace of its own nested in the
   room's, with every capability dropped and no further user namespace
   allowed. The room belongs to the namespace above the box, so nothing in the
   box can change a rule, an address, a route or an interface.

The home ranges: 10/8, 172.16/12, 192.168/16, 169.254/16, the local multicast
block 224.0.0.0/24 (multicast DNS is 224.0.0.251) with 239.255.255.250 (WS-
Discovery and SSDP), the broadcast address, and for IPv6 fc00::/7, fe80::/10
and ff02::/16. An IPv4 address written as IPv6 is not in them.

What a plugin can and cannot do with it:

- It can open TCP and UDP connections to any address in those ranges on any
  port except 53 and 853. **That includes the router and every computer,
  phone and printer in the house, and any service on any of them: the
  router's admin page, a file share, another computer's remote desktop.**
  The permission window says so ("your router included"). It is the home
  network, not "scanners only". A router that takes UPnP or NAT-PMP can be
  asked, by a plugin that can reach it, to open a port from the internet to a
  computer in the house.
- It cannot reach the internet, `localhost` or any service on this computer's
  own addresses, nor another interface's network. A home that uses another
  range (a company network on public addresses, only global IPv6 addresses)
  gets no reach to it.
- **Names.** Nothing is looked up at a name server. A literal address works. A
  `.local` name works only by multicast DNS, which a program sends itself.
- **Finding devices by multicast.** The rules let the local multicast
  groups through, and Trindle carries the answers back, because `pasta` does
  not (an answer comes from the device, not from the group the question was
  sent to). Two small helpers do it (`src/store/home_net/relay.rs`), one in the
  room and one outside, and they pass nothing else. A question is carried only
  if it is put to multicast DNS (224.0.0.251, port 5353) or WS-Discovery
  (239.255.255.250, port 3702), is at most 1472 bytes, and is within 50 a
  second. An answer is given only if it comes from one home address (not a
  group, not the internet, not this computer), to the port that asked. The
  program sees it as the device's own packet, from the device's address and
  port. For IPv4 only. **A program that asks from a port of its own, as
  scanner searches do, hears the answers. One that binds port 5353, joins the
  group and waits for answers sent to the group (a full multicast DNS
  stack) does not: nothing carries an answer addressed to the group.**
- Where the room cannot be made (pasta or unshare is not installed, the
  rules would not load, the system call filter is missing) the box starts
  with no network at all and the person is told why, in a notice. With no
  default route (no network at all) it has none and nothing is said.
- Only the interface carrying the default route is used. A scanner on a second
  network card's network is not reached.

### Devices

`usb-devices` ("Use scanners and USB devices") lets in the scanners and image
devices that are plugged in when the box starts, and nothing else. Without it
the box sees no USB device and no part of `/sys` or `/dev/bus/usb` that lists
one. The box has otherwise a minimal `/dev` and the graphics card only.
`microphone` and `sound` are the only other hardware a plugin can reach. There
is no permission for a camera, a serial port or Bluetooth.

What is let in is worked out outside the box, as it starts
(`src/store/usb_devices.rs`; the spec's "USB devices"), from what the kernel
says each device is, not from anything a plugin says:

- A device qualifies when one of its interfaces, or the device, is of the
  imaging class (06), or the system's udev database marks it as a scanner that
  SANE knows (most scanners have a vendor-specific class and are found this
  way).
- A device is never let in if its own class is not "per interface", imaging,
  miscellaneous or vendor specific, or if any interface is anything but
  imaging, a printer or vendor specific. So a memory stick, keyboard, mouse,
  web camera, microphone, hub, Bluetooth radio, network card or card reader is
  never let in, even inside a scanner's box. A scanner with a printer in the
  same box (a multifunction machine) is.
- At most 8 devices. For each: its own device node under `/dev/bus/usb`
  (read and write), its own folder in `/sys` (read only) with the link USB
  libraries look for it by, and its own two records in udev's database (read
  only). Nothing around them.
- A scanner plugged in after the box started is not there until the plugin is
  started again.
- A device is judged by what it says it is. Something plugged in that has a
  scanner's descriptors and more in its behaviour is let in, so plug in only
  what you trust to a computer that has a plugin allowed this.

### The display

Every box draws through its own Wayland socket and no other. A plugin can open
ordinary windows through it. It cannot read the screen, other windows or the
desktop's state. The socket is named by what was allowed
(`org.trindle.boxed`, `.control`, `.capture`, `.control.capture`) and only the
program outside the box can give a socket that name.

### The clipboard

A plain box has the ordinary Wayland clipboard that any window has: it is told
what is on the clipboard only while one of its windows has the keyboard. Reading
or setting the clipboard at any other time needs `control`, which adds the wlr
data-control protocol. Copied *files* come only with `copied`. A clipboard marked
as a password is never given.

### Sound

- `sound` (not `microphone`): the box gets a guard socket at the audio server's
  place, which lets it play sound and not record.
- `microphone`: the box is bound to the real PipeWire and Pulse sockets. It can
  record, and it also gets everything else those sockets give; `sound` is not
  needed with it.
- Neither: no audio socket.

### The temp folder

`/tmp` is a new empty memory file system on every start. Nothing in it is
shared with any other program or kept. Use the home for anything that must stay.

### Notifications and background

- `notifications`: the plugin appends one line of JSON to `notify.jsonl` in its
  home: `{"summary": "...", "body": "..."}`. The ring shows each new line under
  the plugin's name once the permission is allowed. The file is read only if it
  is a plain file, and one over 1 MB is taken away.
- `background`: see `[Background]`.

## 5. Build, check, test and publish

**Build the archive.** Make the folder as in section 1 and pack it:

```sh
tar --zstd -cf org.example.Weather.tar.zst -C out org.example.Weather
```

Flow's `packaging/build-trindle-plugin.sh` does the whole of it: builds the
release program, checks that it needs only libc and libgcc_s (otherwise it
stops and says to carry libraries), installs the folder, writes `plugin.ini`,
and writes `<Id>.tar.zst`, `<Id>.svg` and `<Id>.description.txt`.

**Check it.** The validator is `plugins::check`. Today it runs in only two
places: where the catalogue is built (`trindle-plugin catalogue FOLDER`, which
checks every archive in FOLDER and writes the index) and on each computer as a
plugin is installed from the catalogue. **A plugin maker has no command of
their own to run it on a folder or an archive.** The spec removed that command
on purpose on 14 October 2026, with the "add a folder" route (see Not yet
possible, item 3). `trindle-plugin catalogue` is built only into a publisher's
build (`--features publisher`), not into the release.

**Install it for testing.** There is no developer install in the release.
The spec describes one test route: a build made with
`--features test-catalogue` (never shipped) has its own test key and reads its
catalogue from `https://localhost:8443/catalogue.ini`, "a catalogue Trindle's
people signed with the test key", so a submission can be tried by Install in
Apps. Any install, test or real, fetches the archive, checks its SHA-256 against
the signed one, runs the validator, copies the folder to
`~/.local/share/trindle/plugins/<Id>/app` and opens the permission window. The
spec does not describe a way for an outside maker to run that route.

**Other `trindle-plugin` commands** (all of them in the release):
`list`, `remove ID`, `restart ID`, `shortcuts`, `run ID ring|background|menu ITEM|shortcut ITEM`,
`ask ID [again]`, `firewall ID` and `close ID`. None installs a plugin.

**Get it into the signed catalogue.** Submit the archive to Trindle's people.
They test it and add it to `catalogue.ini`, whose entry for it is:

```ini
[Plugin org.example.Weather]
Interface=1
Name=Weather
Version=1.2
Summary=The weather where you are, in the ring.
Permissions=network;notifications;
Icon=org.example.Weather.svg
IconSHA256=<64 lower-case hex digits>
Archive=org.example.Weather-1.2.tar.zst
SHA256=<64 lower-case hex digits>
```

The index is signed (Ed25519, `catalogue.ini.sig` beside it) with Trindle's key,
carries a `Serial` that only rises, and is published with the archives as one
release. The release script is kept by the maintainers and is not in this
repository; the steps are the commands above.

`tools/deb/build.sh` is not for plugins: it builds Trindle's own Debian package.

## 6. Rules a plugin must follow

1. **Untrusted by design.** Nothing a plugin writes is believed. The words it
   gives are plain text only; `ring.json`, the choices and note files and
   `notify.jsonl` are read as hostile input. Do not rely on markup, long
   text, links in your home, or Trindle reading anything you did not name.
2. **Nothing installs system-wide.** A plugin carries its own libraries and data
   in its own folder and is installed only into the person's own plugins
   folder. It cannot write outside its home, its allowed folders and `/tmp`.
3. **Only what is allowed.** Everything beyond a private home and a window is a
   permission, off until the person allows it. A plugin must work (or say plainly
   that it cannot) when a permission is refused or taken away, and must not
   treat a hidden field's value as unset.
4. **Ask for as little as possible.** An update that asks for more waits to be
   allowed; one that asks for less loses the old allowance. Putting `control`,
   `capture`, `copied` or `summon` on a plugin that does not need them is the
   quickest way to not be accepted.
5. **No GTK and no Qt.** Trindle itself uses neither (decided 2 October 2026).
   A plugin that draws windows should use the Trindle Toolkit, which is a
   library of its own that any program can use (`docs/toolkit-library.md`).
   The spec states this as Trindle's rule for Trindle's own programs. It does
   not say the validator refuses a plugin that carries GTK or Qt; the
   validator does not look inside the programs.
6. **Words in language files.** Trindle writes every word a person reads once,
   in a Fluent `.ftl` file asked for by key, so another language needs no
   change to the program (spec, "Languages"). A plugin's program should do the
   same. What `plugin.ini` can say is one language only (Name, Summary,
   labels); see Not yet possible, item 5.
7. **Sentence case, UK English** for any label or word (Trindle's house rule).
   The validator checks length and plainness, not case.
8. **A plugin cannot say who it is.** Trindle takes its Id from the socket its
   box was made with, never from anything the plugin says, so do not expect a
   special part of Trindle to treat it as another plugin.

## 7. Where the spec and the code differ

- **The checker.** The spec ("How a plugin is made") says the validator "is no
  command and no assistant's tool" and runs where the catalogue is built and on
  installation. The code agrees. The gap is not in the code but in the need: an
  outside maker has no way to run it (see item 3 below).
- **The box.** The spec describes the box as the plugin's folder read only at
  `/app`, `/usr` read only, a private home "and nothing else until allowed".
  The code also binds `/etc` read only, `/dev/dri` and some of `/sys`, the
  person's fonts folder read only, and an empty `/tmp` and `/run`. The spec does
  not list these.
- **`devices`, `x11`, `screen` and `computer`.** `store::boxed::ALLOWED` and the
  access words list them, but `plugins::PERMISSIONS` does not, so a plugin
  cannot ask for them. The spec's list for plugins matches the code.
- **Plugin Ids.** The brief for this guide said `org.trindle.Name`. The code and
  the spec only require letters, digits, dots and dashes; the prefix is a
  convention of Trindle's own plugins.
- **`[PinUnlock]`.** Spec and code agree that only Flow may use it.

## 8. Not yet possible

Each with the smallest fix. Items 1 and 6 are built in part and say what is
left; the others are not built. Each needs the spec changed first (and
the maintainer's decision where noted).

1. **"Local network only" for a plugin.** Now there (20 October 2026, task
   450): the `home-network` permission (section 4, "Home network"). What it is
   not, and what could still be done: it is the whole home range, router
   included, not a list of devices (the smallest fix is an optional
   `[Network] Devices=` list of addresses, shown in the permission window and
   added to the room's rules); it uses the one interface that carries the
   default route; IPv6 reaches only unique-local and link-local addresses, not
   a home's global ones; it needs the `passt` package (pasta); it cannot hear
   multicast answers sent to the group itself (a full multicast DNS stack);
   and a computer with no default route gives the box no network.
2. **A list of hosts a plugin may reach.** Not there. Smallest fix: an optional
   `[Network] Hosts=` list of names, shown in the permission window, with the
   box given no network of its own and only a proxy socket that allows
   `CONNECT host:443` for those names. `src/store/fence_net.rs` already does
   this for the AI fence and could be reused.
3. **A checker a maker can run.** No command checks a folder or archive a maker
   holds, and none installs one for testing. Smallest fix: a read only command
   of `trindle-plugin` that takes a folder or archive, unpacks it to a private
   folder, runs `plugins::check` and prints each fault, installing nothing. This reverses the
   spec's note of 14 October 2026 that no command checks a maker's folder, so it
   needs the maintainer's yes.
4. **One chosen folder or file.** Not there. A plugin gets all six folders
   (`files`), read and write, or none, and there is no file chooser (no bus).
   Smallest fix: a `[Files] Folders=` line that lists a subset of the six, with
   a `ReadOnly` choice; and, for a folder anywhere, a row in Settings,
   Permissions, "Add a folder", that the person picks and Trindle binds at the
   same path.
5. **Words of a plugin in other languages.** `plugin.ini` has one language.
   Smallest fix: an optional `lang/<tag>/plugin.ini` in the folder that
   gives translated `Name`, `Summary` and labels, read with the same plain-words
   checks. (Not confirmed: whether a plugin's own program finds `.ftl` files
   inside `/app`; the toolkit looks in the person's `~/.config/trindle/lang/`
   and the data folders.)
6. **A camera, scanner, USB or Bluetooth device.** The scanner part is now
   there (20 October 2026): `usb-devices` lets in the USB scanners
   and image devices plugged in when the box starts and no other USB device
   (section 4, "Devices"). It was tried against made-up trees only, never a
   real device; a scanner plugged in later is not seen until the plugin starts
   again. Still not there: a camera (a web camera is a video device, not
   imaging), a serial port, Bluetooth, any other USB device, and a scanner
   that is not USB or network. The smallest fix for each is one permission of
   its own that binds only the named nodes, with its own warning.
7. **D-Bus and the accessibility bus.** A plugin has no session bus, so a screen
   reader cannot reach AT-SPI and nothing can speak to any D-Bus service.
   Smallest fix: none that is small. The honest options are a filtered bus proxy
   for named services only (as Flatpak's xdg-dbus-proxy does), or a Trindle
   protocol on the box's socket for the one thing needed. Needs a decision.
8. **`[PinUnlock]` for any plugin other than Flow.** By design not possible.
9. **Release script for the catalogue.** The release script is kept by the
   maintainers and is not published. Smallest fix: publish it and update
   section 5.
