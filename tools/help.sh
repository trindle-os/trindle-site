#!/bin/sh
# Rebuild help.html, Trindle's help guide, from help-notes.md in the Trindle repository beside this one.
#
#     sh tools/help.sh           write help.html
#     sh tools/help.sh --check   say whether help.html is up to date
#
# Each note line is "- 15 Oct 2026 [Part] What it does. Why: the reason." and
# the page shows it under its part, with the reason beside it. The page's
# head, menu and foot are taken from tour.html, so the guide always
# looks like the rest of the site. The script stops, writing nothing, if a
# note names another desktop, company or product, or has no part or no
# reason.
set -eu

here=$(cd "$(dirname "$0")/.." && pwd)
notes=$here/../trindle/spec/help-notes.md
tour=$here/tour.html
out=$here/help.html

[ -s "$notes" ] || { echo "help.sh: ../trindle/spec/help-notes.md is needed and is kept outside the public repository; help.html as published is the current guide" >&2; exit 1; }

banned='Steam|keyd|Java|GNOME|KDE|Windows|Microsoft|Apple|Google|Canonical|Ubuntu|Fedora|macOS|other desktop'
lines=$(grep '^- ' "$notes")

if printf '%s\n' "$lines" | grep -Eq "$banned"; then
    echo "help.sh: a note names another desktop, company or product:" >&2
    printf '%s\n' "$lines" | grep -E "$banned" | cut -c1-100 >&2
    exit 1
fi
if printf '%s\n' "$lines" | grep -q '—'; then
    echo "help.sh: a note has an em dash" >&2
    exit 1
fi
if printf '%s\n' "$lines" | grep -Ev '^- [0-9]+ [A-Z][a-z]+ [0-9]{4} \[[^]]+\] .+ Why: .+' | grep -q .; then
    echo "help.sh: a note is missing its date, [Part] or Why:" >&2
    printf '%s\n' "$lines" | grep -Ev '^- [0-9]+ [A-Z][a-z]+ [0-9]{4} \[[^]]+\] .+ Why: .+' | cut -c1-100 >&2
    exit 1
fi

tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT

# The head and the menu, made for this page.
sed -n '1,/<main id="main">/p' "$tour" | sed \
    -e 's|<title>[^<]*</title>|<title>Using Trindle, and why it works that way</title>|' \
    -e 's|\(name="description" content="\)[^"]*|\1How to use each part of Trindle, and the reason behind each choice, in plain words.|' \
    -e 's|\(property="og:description" content="\)[^"]*|\1How to use each part of Trindle, and the reason behind each choice, in plain words.|' \
    -e 's|\(property="og:title" content="\)[^"]*|\1Using Trindle, and why it works that way|' \
    -e 's| aria-current="page"||g' \
    -e 's|https://trindle.org/tour.html|https://trindle.org/help.html|g' \
    -e 's|<a href="tour.html">The desktop</a>|<a href="tour.html">The desktop</a><a href="help.html" aria-current="page">Help</a>|g' \
    > "$tmp"

# The guide itself.
printf '%s\n' "$lines" | awk '
function esc(s) {
    gsub(/&/, "\\&amp;", s); gsub(/</, "\\&lt;", s); gsub(/>/, "\\&gt;", s)
    while (match(s, /`[^`]+`/)) s = substr(s, 1, RSTART - 1) "<code>" substr(s, RSTART + 1, RLENGTH - 2) "</code>" substr(s, RSTART + RLENGTH)
    return s
}
function slug(s) { s = tolower(s); gsub(/[^a-z0-9]+/, "-", s); gsub(/^-|-$/, "", s); return s }
{
    line = substr($0, 3)
    if (!match(line, /^[0-9]+ [A-Za-z]+ [0-9]{4} \[/)) next
    date = substr(line, 1, RLENGTH - 2)
    rest = substr(line, RLENGTH + 1)
    close_at = index(rest, "] ")
    part = substr(rest, 1, close_at - 1)
    body = substr(rest, close_at + 2)
    w = index(body, " Why: ")
    what = substr(body, 1, w - 1)
    why = substr(body, w + 6)
    if (!(part in seen)) { seen[part] = ++n; order[n] = part }
    count[part]++
    item[part, count[part]] = "<p style=\"margin-bottom:.2rem\"><strong>" esc(what) "</strong></p><p style=\"margin-top:0;padding-bottom:.65rem;border-bottom:1px solid var(--border)\">Why: " esc(why) " <small>(" esc(date) ")</small></p>"
}
END {
    print "<section class=\"hero\" style=\"padding:3rem 0 2rem\">"
    print "  <div class=\"hero-wash\"></div>"
    print "  <div class=\"wrap\">"
    print "    <h1>Using Trindle, and why it works that way</h1>"
    print "    <p class=\"lead\" style=\"max-width:60ch\">What each part does and how to use it, with the reason it was made that way. Nothing here needs the terminal unless it says so.</p>"
    print "    <div class=\"panel\" style=\"margin-top:1.5rem\">"
    print "      <h2 style=\"font-size:1.0625rem;letter-spacing:0\">On this page</h2>"
    printf "      <ul style=\"margin:0\">"
    for (i = 1; i <= n; i++) printf "<li><a href=\"#%s\">%s</a></li>", slug(order[i]), esc(order[i])
    print "</ul>"
    print "    </div>"
    print "  </div>"
    print "</section>"
    for (i = 1; i <= n; i++) {
        p = order[i]
        print ""
        print "<section id=\"" slug(p) "\" style=\"padding-top:.5rem\">"
        print "  <div class=\"wrap\">"
        print "    <div class=\"panel reveal\">"
        print "      <h2>" esc(p) "</h2>"
                for (j = 1; j <= count[p]; j++) print "        " item[p, j]
                print "    </div>"
        print "  </div>"
        print "</section>"
    }
}' >> "$tmp"

echo >> "$tmp"
sed -n '/<\/main>/,$p' "$tour" >> "$tmp"

if [ "${1:-}" = "--check" ]; then
    if cmp -s "$tmp" "$out"; then echo "help.html is up to date"; else echo "help.html is out of date: run sh tools/help.sh" >&2; exit 1; fi
else
    cp "$tmp" "$out"
    echo "wrote help.html ($(grep -c '^- ' "$notes") notes)"
fi
