#!/usr/bin/env python3
"""Build data/ai-datacenters.json from Epoch AI's 'AI data centers' dataset (CC BY 4.0), a curated manual layer
(data/ai-dc-manual.json) and geocodes (OpenStreetMap Nominatim, cached in data/geocode-cache.json).
Never invents values: anything missing is emitted as null and shown as 'not disclosed'.
If any required download fails, exits non-zero and leaves the previous file untouched."""
import csv, io, json, re, sys, time, html, datetime as dt, urllib.request, urllib.parse, os
BASE = "https://epoch.ai/data/data_centers/"
PAGE = "https://epoch.ai/data/data-centers"
UA = {"User-Agent": "LoadlineBot/0.2 (+https://casblu.github.io/loadline-site/; data-center tracker; contact via GitHub casblu/loadline-site)"}
NOW = dt.datetime.now(dt.timezone.utc)
TODAY = NOW.date().isoformat()
FETCHED = NOW.isoformat(timespec="seconds")
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

def get(url, tries=3):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                return r.read().decode("utf-8", "replace"), r.headers
        except Exception as ex:
            if i == tries - 1: raise
            time.sleep(3)
def rows(name): return list(csv.DictReader(io.StringIO(get(BASE + name + ".csv")[0])))
def num(x):
    try: return float(x)
    except Exception: return None
def clean_tag(s):
    if not s: return None
    return [{"name": re.sub(r"\s*#\w+$", "", p).strip(), "confidence": (re.search(r"#(\w+)$", p.strip()) or [None, None])[1]}
            for p in s.split(",") if p.strip()] or None

try:
    dcs = rows("data_centers"); tl = rows("data_center_timelines"); chips = rows("data_centers_chip_quantities")
    page, hdr = get(PAGE)
except Exception as ex:
    print("fetch failed:", ex, file=sys.stderr); sys.exit(1)
if len(dcs) < 50: print("suspiciously few rows", len(dcs), file=sys.stderr); sys.exit(1)
dataset_modified = None
try:
    h = urllib.request.urlopen(urllib.request.Request(BASE + "data_centers.csv", headers=UA, method="HEAD"), timeout=30).headers
    dataset_modified = h.get("last-modified")
except Exception: pass
m = re.search(r"Updated (\w+\.? \d+, \d{4})", page)
epoch_updated = m.group(1) if m else None

# city/state/country from the page's embedded data (same CC BY dataset)
pg = html.unescape(page)
loc = {}
for mm in re.finditer(r'"id":\[0,"([^"]+)"\],"img".{0,1500}?"country":\[0,"([^"]*)"\](?:,"city":\[0,"([^"]*)"\])?(?:,"state":\[0,"([^"]*)"\])?', pg):
    loc.setdefault(mm.group(1), {"country": mm.group(2), "city": mm.group(3), "state": mm.group(4)})

# geocoding (cached; Nominatim usage policy: <=1 req/s, identify app, cache)
GC = "data/geocode-cache.json"
gcache = json.load(open(GC)) if os.path.exists(GC) else {}
last_req = [0.0]
def nominatim(q):
    if q in gcache: return gcache[q]
    wait = 1.2 - (time.time() - last_req[0])
    if wait > 0: time.sleep(wait)
    url = "https://nominatim.openstreetmap.org/search?" + urllib.parse.urlencode({"q": q, "format": "jsonv2", "limit": 1, "addressdetails": 0})
    try:
        res = json.loads(get(url)[0]); last_req[0] = time.time()
    except Exception as ex:
        print("geocode failed (not cached):", q, ex, file=sys.stderr); return None
    r = res[0] if res else None
    gcache[q] = ({"lat": float(r["lat"]), "lon": float(r["lon"]), "class": r.get("category"), "type": r.get("type"),
                  "addresstype": r.get("addresstype"), "display": r.get("display_name"), "geocoded_on": TODAY} if r else {"none": True})
    return gcache[q]
HOUSE = {"house", "building", "residential", "commercial", "industrial", "yes", "retail", "warehouse", "data_center", "office", "apartments"}
def geolocate(name, address, L):
    city = ((L or {}).get("city") or "").strip() or None; st = (L or {}).get("state"); ctry = (L or {}).get("country")
    tail = ", ".join(x for x in [city, st, ctry] if x)
    tries = []
    if address and address.strip():
        a = address.strip().replace("\n", " ")
        tries.append((a, "address"))
        if tail and (city or "") not in a: tries.append((a + ", " + tail, "address"))
    if address:
        mm = re.search(r",\s*([A-Za-z .'-]+),\s*([A-Z]{2})\b", address.replace("\n", " "))
        if mm: tries.append((mm.group(1).strip() + ", " + mm.group(2) + ", United States", "town"))
    if tail: tries.append((tail, "town"))
    if name in GEO_OVERRIDE: tries = [(GEO_OVERRIDE[name], "town")] + tries
    for q, kind in tries:
        r = nominatim(q)
        if r and not r.get("none") and "," in r["display"]:
            if kind == "address":
                if r["type"] in HOUSE or r["addresstype"] in HOUSE: prec = "exact"
                elif r["class"] == "highway" or r["addresstype"] == "road": prec = "street"
                else: prec = "town"
            else: prec = "town"
            return {"lat": r["lat"], "lon": r["lon"], "precision": prec, "query": q, "matched": r["display"], "geocoded_on": r["geocoded_on"]}
    return None

GEO_OVERRIDE = json.load(open('data/ai-dc-manual.json')).get('geocode_overrides', {}) if os.path.exists('data/ai-dc-manual.json') else {}
by_dc = {}
for r in tl: by_dc.setdefault(r["Data center"], []).append(r)
chips_by = {}
for r in chips: chips_by.setdefault(r["Data center"], []).append(r)
manual = json.load(open("data/ai-dc-manual.json")) if os.path.exists("data/ai-dc-manual.json") else {"sites": {}}
SRC_DATA = BASE + "data_centers.csv"; SRC_TL = BASE + "data_center_timelines.csv"
LIC = "Epoch AI, CC BY 4.0"

def F(value, url, as_of, basis, note=None, **kw):
    d = {"value": value, "source_url": url, "as_of": as_of, "fetched_at": FETCHED, "basis": basis}
    if note: d["note"] = note
    d.update(kw); return d
ND = lambda url, why: F(None, url, None, "not_disclosed", why)

sites = []
for d in dcs:
    name = d["Name"]
    tr = sorted(by_dc.get(name, []), key=lambda r: r["Date"])
    past = [r for r in tr if r["Date"] <= TODAY]
    cur = past[-1] if past else None
    maxpow = max([num(r["IT power (MW)"]) or 0 for r in tr] or [0])
    maxop = max([num(r["Buildings operational"]) or 0 for r in tr] or [0])
    L = loc.get(name)
    ov = manual.get("sites", {}).get(name, {})
    # status
    if "status_override" in ov:
        o = ov["status_override"]; status = F(o["value"], o["source_url"], o["as_of"], "manual", o.get("note"))
    elif cur is None:
        status = F("announced", SRC_TL, None, "derived", "No observation dated on/before today in Epoch's timeline.")
    else:
        op = num(cur["Buildings operational"]) or 0; itp = num(cur["IT power (MW)"]) or 0
        if op == 0 and itp == 0: s = "under construction"
        elif maxpow and itp < maxpow * 0.999: s = "partially operating"
        else: s = "operating"
        status = F(s, SRC_TL, cur["Date"], "derived", "Derived by Loadline from Epoch AI's timeline (satellite imagery, permits, company statements): latest dated row on/before today. 'Partially operating' = some buildings operating and Epoch's timeline shows more planned. Epoch's own text for that row: " + (cur["Construction status"] or "")[:600].replace("\n", " "))
    cap = F(num(d["Current power (MW)"]), SRC_DATA, cur["Date"] if cur else None, "estimate",
            "IT power in MW, ESTIMATED by Epoch AI (not a company-reported figure). Epoch says 80% of estimates are within 1.4x.") if cur else ND(SRC_DATA, "no dated observation")
    planned = F(maxpow or None, SRC_TL, tr[-1]["Date"] if tr else None, "projection",
                "Highest IT power in Epoch's timeline, including its projected future rows (through %s). A projection, not a reported figure." % (tr[-1]["Date"] if tr else "n/a")) if maxpow else ND(SRC_TL, "no projection")
    h100 = num(d["Current H100 equivalents"])
    quants = [c for c in chips_by.get(name, []) if c["Number of Units source"] == "Company disclosure" and c["Date"] <= TODAY]
    chip_rep = None
    if quants:
        q = sorted(quants, key=lambda c: c["Date"])[-1]
        chip_rep = F({"chip": q["Chip type"], "units": num(q["Number of Units"])}, BASE + "data_centers_chip_quantities.csv", q["Date"], "reported",
                     "Marked 'Company disclosure' in Epoch's chip-quantity table. " + (q["Notes"] or "")[:400].replace("\n", " "))
    chip_types = d["Current chip types"].strip() or None
    chip_est = F({"chip_types": chip_types, "h100_equivalents": round(h100) if h100 else None}, SRC_DATA, cur["Date"] if cur else None, "estimate",
                 "Chip types/H100-equivalents are Epoch estimates unless a company disclosure is shown separately. Epoch: compute 80% within 1.5x.") if (chip_types or h100) else ND(SRC_DATA, "no chip info")
    ec = d["Energy companies"].strip()
    power = F(ec, SRC_DATA, None, "epoch_listed", "Energy/utility companies Epoch lists for the site (supplier or on-site energy partner). Not a statement of the share of power supplied.") if ec else ND(SRC_DATA, "Epoch lists no energy company")
    wl = [r for r in past if r["Water use (MGD)"] not in ("", None)]
    water = F(num(wl[-1]["Water use (MGD)"]), SRC_TL, wl[-1]["Date"], "estimate", "Million gallons per day, ESTIMATED by Epoch AI (not company-reported). Unclear whether withdrawal or consumption.") if wl else ND(SRC_TL, "no water figure in Epoch's data")
    owner = clean_tag(d["Owner"]); users = clean_tag(d["Users"])
    geo = geolocate(name, d["Address"], L)
    srcs = re.findall(r"\[([^\]]+)\]\((https?://[^)\s]+)\)", d["Selected Sources"] or "")
    site = {
        "id": re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-"), "name": name, "country": d["Country"],
        "city": (L or {}).get("city"), "state": (L or {}).get("state"),
        "operator": F(owner, SRC_DATA, None, "epoch_listed", "Owner per Epoch (confidence tag as given by Epoch)") if owner else ND(SRC_DATA, "Epoch lists no owner"),
        "users": F(users, SRC_DATA, None, "epoch_listed", "Users per Epoch; 'likely'/'speculative' tags are Epoch's own") if users else ND(SRC_DATA, "Epoch lists no users"),
        "address": F(d["Address"].strip() or None, SRC_DATA, None, "epoch_listed") if d["Address"].strip() else ND(SRC_DATA, "no street address given"),
        "location": ({"lat": round(geo["lat"], 5), "lon": round(geo["lon"], 5), "precision": geo["precision"], "geocode_query": geo["query"], "geocode_match": geo["matched"],
                      "source_url": "https://nominatim.openstreetmap.org/ (OpenStreetMap contributors, ODbL)", "as_of": geo["geocoded_on"], "fetched_at": FETCHED,
                      "basis": "geocoded", "note": "Coordinates derived by geocoding Epoch's address text. precision: exact = matched a building/house; street = matched a road; town = matched only the town/city (or Epoch gave no address)."} if geo else None),
        "status": status, "capacity_it_mw_estimate": cap, "capacity_it_mw_projected_max": planned,
        "chips_estimate": chip_est, "chips_reported": chip_rep, "power_source": power, "water_mgd_estimate": water,
        "sources": [{"title": t, "url": u} for t, u in srcs],
        "reported": ov.get("reported", []),
    }
    sites.append(site)
sites.sort(key=lambda s: -(s["capacity_it_mw_estimate"]["value"] or 0))
out = {
    "meta": {"schema": "ai-datacenters/0.1", "generated_utc": FETCHED, "last_checked_utc": FETCHED,
             "site_count": len(sites), "with_coordinates": sum(1 for s in sites if s["location"]),
             "primary_source": {"name": "Epoch AI, Frontier Data Centers hub", "url": PAGE, "csv": SRC_DATA,
                                "license": "CC BY 4.0 (page states: 'free to use, distribute, and reproduce provided the source and authors are credited')",
                                "csv_last_modified": dataset_modified},
             "honesty": "Power, compute, water and most status values here are ESTIMATES by Epoch AI from satellite imagery, permits and statements. Company-reported facts are listed separately under 'reported' with their own source and date. Status is only as live as these sources.",
             "fields_note": "Every field carries source_url, as_of (date of the underlying observation/report) and fetched_at (when this file was last rebuilt)."},
    "sites": sites,
}
if len(sites) >= 50:
    json.dump(out, open("data/ai-datacenters.json", "w"), indent=1, ensure_ascii=False)
    json.dump(gcache, open(GC, "w"), indent=1, ensure_ascii=False)
print("sites", len(sites), "coords", out["meta"]["with_coordinates"], "precision", {p: sum(1 for s in sites if s["location"] and s["location"]["precision"] == p) for p in ("exact", "street", "town")})
