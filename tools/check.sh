#!/bin/sh
# Fail if any page has more than one html element, no single h1, or a repeated id.
cd "$(dirname "$0")/.." || exit 1
bad=0
for f in *.html */*.html; do
    [ "$(grep -o '<html' "$f" | wc -l)" -eq 1 ] || { echo "$f: not exactly one <html>"; bad=1; }
    [ "$(grep -o '<h1[ >]' "$f" | wc -l)" -eq 1 ] || { echo "$f: not exactly one <h1>"; bad=1; }
    d=$(grep -o ' id="[^"]*"' "$f" | sort | uniq -d | tr '\n' ' ')
    [ -z "$d" ] || { echo "$f: repeated ids:$d"; bad=1; }
done
[ "$bad" -eq 0 ] && echo "pages ok"
exit "$bad"
