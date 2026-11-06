#!/usr/bin/env python3
"""Stamp each page's last-updated date and JSON-LD, and rebuild sitemap.xml and llms.txt.
    python3 tools/seo.py           write
    python3 tools/seo.py --check   say whether everything is up to date
A page's date is that of the last commit that changed more than the style.css version or this stamp."""
import datetime, html, json, re, subprocess, sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
site = "https://trindle.org"
org = "https://github.com/trindle-os"
pages = sorted(p for p in subprocess.check_output(["git", "ls-files", "*.html"], cwd=root, text=True).split())
SKIP = re.compile(r"style\.css\?v=|foot-updated|id=\"ld\"")

def real_change(diff):
    return any(l[:1] in "+-" and l[:3] not in ("+++", "---") and not SKIP.search(l) for l in diff.splitlines())

def git(*a):
    return subprocess.check_output(["git", *a], cwd=root, text=True)

def date_of(f):
    if real_change(git("diff", "HEAD", "-U0", "--", f)):
        return datetime.date.today()
    for h in git("log", "--format=%H", "--", f).split():
        if real_change(git("show", "--format=", "-U0", h, "--", f)):
            return datetime.date.fromisoformat(git("show", "-s", "--format=%cs", h).strip())
    return datetime.date.today()

def words(d):
    return f"{d.day} {d.strftime('%B %Y')}"

def meta(s, name):
    m = re.search(r'<meta name="%s" content="([^"]*)"' % name, s)
    return html.unescape(m.group(1)) if m else ""

def text(x):
    return html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", x)).strip())

def ld_for(f, s, d):
    canon = re.search(r'<link rel="canonical" href="([^"]*)"', s)
    url = canon.group(1) if canon else site + "/" + f
    title = text(re.search(r"<title>(.*?)</title>", s, re.S).group(1))
    page = {"@type": "WebPage", "@id": url + "#page", "url": url, "name": title, "description": meta(s, "description"),
            "inLanguage": "en-GB", "dateModified": d.isoformat(), "isPartOf": {"@id": site + "/#site"}}
    graph = [page]
    if f == "index.html":
        graph = [{"@type": "Organization", "@id": site + "/#org", "name": "Trindle", "url": site + "/",
                  "logo": site + "/img/trindle.svg", "email": "distro@trindle.org", "sameAs": [org]},
                 {"@type": "WebSite", "@id": site + "/#site", "url": site + "/", "name": "Trindle",
                  "inLanguage": "en-GB", "publisher": {"@id": site + "/#org"}}, page]
    if f == "about.html":
        sec = re.search(r'<section id="questions">(.*?)</section>', s, re.S).group(1)
        qa = re.findall(r"<h3>(.*?)</h3><p>(.*?)</p>", sec, re.S)
        graph.append({"@type": "FAQPage", "@id": url + "#faq", "mainEntity": [
            {"@type": "Question", "name": text(q), "acceptedAnswer": {"@type": "Answer", "text": text(a)}} for q, a in qa]})
    return '<script type="application/ld+json" id="ld">' + json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False, separators=(",", ":")) + "</script>"

out = {}
sitemap, llms = [], []
for f in pages:
    s = (root / f).read_text(encoding="utf8")
    d = date_of(f)
    line = f'<p class="foot-small foot-updated">Page last updated <time datetime="{d.isoformat()}">{words(d)}</time></p>'
    if "foot-updated" in s:
        s = re.sub(r'<p class="foot-small foot-updated">.*?</p>', line, s)
    else:
        s = s.replace("\n  </div>\n</footer>", "\n    " + line + "\n  </div>\n</footer>", 1)
    if f != "404.html":
        block = ld_for(f, s, d)
        if 'id="ld"' in s:
            s = re.sub(r'<script type="application/ld\+json" id="ld">.*?</script>', lambda m: block, s, flags=re.S)
        else:
            s = s.replace("</head>", block + "\n</head>", 1)
        url = re.search(r'<link rel="canonical" href="([^"]*)"', s).group(1)
        sitemap.append((url, d))
        llms.append((text(re.search(r"<title>(.*?)</title>", s, re.S).group(1)), url, meta(s, "description")))
    out[f] = s

sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "".join(
    f"  <url><loc>{u}</loc><lastmod>{d.isoformat()}</lastmod></url>\n" for u, d in sitemap) + "</urlset>\n"
home = "".join(f"- [{t}]({u}): {x}\n" for t, u, x in llms)
lt = ("# Trindle\n\n> Trindle is a whole operating system built on Debian stable, with a desktop that lives in one ring and a "
      "Wayland compositor of its own. It is written in Rust, licensed GPL-3.0-or-later, and in beta.\n\n## Pages\n\n" + home)
out["sitemap.xml"], out["llms.txt"] = sm, lt

if "--check" in sys.argv:
    bad = [f for f, v in out.items() if (root / f).read_text(encoding="utf8") != v]
    print("seo: up to date" if not bad else "seo: out of date: " + " ".join(bad) + " (run python3 tools/seo.py)")
    sys.exit(1 if bad else 0)
for f, v in out.items():
    (root / f).write_text(v, encoding="utf8")
print("seo: wrote", len(out), "files")
