#!/usr/bin/env python3
"""Check that source URLs in data/ai-datacenters.json load. Writes data/link-check.json (status per URL + checked_at).
A non-200 does not mean the claim is wrong: paywalls, X/Twitter and Google Drive often block bots. Informational only."""
import json, os, re, sys, datetime as dt, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
d = json.load(open("data/ai-datacenters.json"))
urls = set()
for s in d["sites"]:
    for x in s["sources"]: urls.add(x["url"])
    for r in s.get("reported", []): urls.add(r["source_url"])
urls |= {d["meta"]["primary_source"]["url"], d["meta"]["primary_source"]["csv"], "https://www.ercot.com/gridmktinfo/dashboards"}
UA = {"User-Agent": "Mozilla/5.0 (compatible; LoadlineBot/0.2; +https://casblu.github.io/loadline-site/)"}
def chk(u):
    for m in ("HEAD", "GET"):
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers=UA, method=m), timeout=25) as r:
                return u, r.status
        except urllib.error.HTTPError as e:
            code = e.code
            if m == "GET" or code in (401, 403, 404, 410): 
                if m == "GET": return u, code
        except Exception as e:
            if m == "GET": return u, "error: " + type(e).__name__
    return u, None
with ThreadPoolExecutor(12) as ex: res = dict(ex.map(chk, sorted(urls)))
out = {"checked_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"), "total": len(res),
       "ok": sum(1 for v in res.values() if v == 200), "results": res}
json.dump(out, open("data/link-check.json", "w"), indent=1)
print(out["total"], "urls;", out["ok"], "returned 200")
