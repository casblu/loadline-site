#!/usr/bin/env python3
"""Fetch ERCOT's public dashboard JSON (no key) and write data/ercot-latest.json.
Writes nothing and exits non-zero if the fetch fails, so stale-but-real data is never replaced by fake data."""
import json, sys, datetime, urllib.request
BASE = "https://www.ercot.com/api/1/services/read/dashboards/"
UA = {"User-Agent": "Mozilla/5.0 (compatible; LoadlineBot/0.1; +https://casblu.github.io/loadline-site/)", "Accept": "application/json"}
def get(name):
    req = urllib.request.Request(BASE + name, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)
try:
    sd = get("supply-demand.json"); prc = get("daily-prc.json")
    actual = [e for e in sd["data"] if e.get("forecast") == 0 and e.get("demand") is not None]
    last = actual[-1]; cc = prc["current_condition"]
except Exception as ex:
    print("fetch failed:", ex, file=sys.stderr); sys.exit(1)
out = {
  "fetched_at": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
  "source": "ERCOT public dashboards (supply-demand.json, daily-prc.json)",
  "source_url": "https://www.ercot.com/gridmktinfo/dashboards",
  "source_updated_at": sd.get("lastUpdated"),
  "demand_mw": last["demand"], "capacity_mw": last["capacity"], "interval_timestamp": last["timestamp"],
  "prc_mw": cc.get("prc_value"), "condition_title": cc.get("title"), "condition_note": cc.get("condition_note"), "eea_level": cc.get("eea_level"),
  "prc_updated_at": prc.get("lastUpdated"),
  "note": "System-wide grid figures only. Data-center load is not metered separately in this feed."
}
json.dump(out, open("data/ercot-latest.json", "w"), indent=1)
print(json.dumps(out))
