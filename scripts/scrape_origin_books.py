"""Add notable works from writers' Wikipedia pages via Firecrawl.

Reads crawlwer_API from the project .env. Never prints the key.
Only titles that appear in the scraped page are kept.
"""

import json
import os
import re
import threading
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

CACHE_LOCK = threading.Lock()

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GEO = os.path.join(ROOT, "public", "data", "geo-books.json")
CACHE = "/tmp/beam-firecrawl-works.json"
COVER_CACHE = "/tmp/beam-ol-title-covers.json"
TARGET = 8


def load_key() -> str:
    path = os.path.join(ROOT, ".env")
    for line in open(path, encoding="utf-8"):
        if line.startswith("crawlwer_API="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("crawlwer_API is missing from .env")


def norm(value: str) -> str:
    return " ".join(re.sub(r"[^a-z0-9]+", " ", value.lower()).split())


def english_name(author: str) -> str:
    match = re.search(r"\(([^)]+)\)", author)
    return match.group(1).strip() if match else author.strip()


def usable_author(name: str) -> bool:
    lowered = name.lower()
    if len(name) < 4:
        return False
    blocked = ("various", "pupil", "school", "unknown", "editor", "edited")
    return not any(word in lowered for word in blocked)


def load_json(path: str) -> dict:
    if not os.path.exists(path):
        return {}
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def save_json(path: str, data: dict) -> None:
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(data, handle)


def scrape_markdown(name: str, key: str) -> str:
    slug = urllib.parse.quote(name.replace(" ", "_"), safe="()'!")
    url = f"https://en.wikipedia.org/wiki/{slug}"
    body = json.dumps(
        {
            "url": url,
            "formats": ["markdown"],
            "onlyMainContent": True,
            "timeout": 40000,
        }
    ).encode()
    request = urllib.request.Request(
        "https://api.firecrawl.dev/v2/scrape",
        data=body,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=70) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if not payload.get("success"):
        return ""
    return (payload.get("data") or {}).get("markdown") or ""


def titles_from_markdown(markdown: str) -> list[str]:
    match = re.search(r"Notable\s*works\s*\|([^\n]+)", markdown, re.I)
    if not match:
        return []
    found = []
    for title in re.findall(r"_\[([^\]]+)\]\(", match.group(1)):
        cleaned = re.sub(r"\s*\([^)]*\)\s*$", "", title).strip()
        if len(cleaned) >= 2 and cleaned not in found:
            found.append(cleaned)
    return found[:8]


def country_mentioned(markdown: str, country_name: str) -> bool:
    text = norm(markdown)
    name = norm(country_name)
    aliases = {
        "eq guinea": "equatorial guinea",
        "dem rep congo": "democratic republic of the congo",
        "s sudan": "south sudan",
        "bosnia and herz": "bosnia",
        "united states of america": "united states",
        "cote d ivoire": "ivory coast",
        "dominican rep": "dominican republic",
        "central african rep": "central african republic",
    }
    phrases = [name]
    if name in aliases:
        phrases.append(aliases[name])
    if any(phrase and phrase in text for phrase in phrases):
        return True
    stop = {
        "guinea", "republic", "united", "states", "island", "islands",
        "south", "north", "democratic", "central", "african", "and", "the",
    }
    words = [word for word in name.split() if len(word) > 4 and word not in stop]
    tokens = [token for token in text.split() if len(token) > 4]
    return any(
        token.startswith(word[:6]) or word.startswith(token)
        for word in words
        for token in tokens
    )


def fetch_author(name: str, country_name: str, key: str, cache: dict) -> list[str]:
    cache_key = norm(name)
    with CACHE_LOCK:
        cached = cache.get(cache_key)
    if isinstance(cached, dict) and "titles" in cached:
        if country_mentioned(cached.get("text") or "", country_name):
            return cached["titles"]
        return []
    markdown = ""
    for attempt in range(4):
        try:
            markdown = scrape_markdown(name, key)
            break
        except Exception as exc:  # noqa: BLE001
            message = str(exc)
            if hasattr(exc, "read"):
                message = exc.read().decode("utf-8", "replace")[:220]
            if "402" in message or "Payment" in message or "insufficient_credits" in message:
                raise
            if "Rate limit" in message or "429" in message:
                time.sleep(12 + attempt * 4)
                continue
            print(f"  miss {name}: {message[:120]}", flush=True)
            return []
    titles = titles_from_markdown(markdown) if norm(name.split()[-1]) in norm(markdown) else []
    with CACHE_LOCK:
        cache[cache_key] = {"titles": titles, "text": norm(markdown)[:12000]}
    if not country_mentioned(markdown, country_name):
        return []
    return titles


def cover_for(title: str, author: str, cache: dict) -> dict:
    key = f"{norm(title)}|{norm(author)}"
    if key in cache:
        return cache[key]
    params = urllib.parse.urlencode(
        {
            "title": title,
            "author": author,
            "limit": 1,
            "fields": "key,cover_i,edition_count",
        }
    )
    found = {"cover_id": 0, "key": "", "edition_count": 0}
    try:
        request = urllib.request.Request(
            f"https://openlibrary.org/search.json?{params}",
            headers={"User-Agent": "BeamShelf/1.0 (origin books)"},
        )
        with urllib.request.urlopen(request, timeout=25) as response:
            docs = json.loads(response.read().decode()).get("docs") or []
        if docs and docs[0].get("cover_i"):
            found = {
                "cover_id": int(docs[0]["cover_i"]),
                "key": docs[0].get("key") or "",
                "edition_count": int(docs[0].get("edition_count") or 1),
            }
    except Exception:
        pass
    cache[key] = found
    time.sleep(0.05)
    return found


def main() -> None:
    key = load_key()
    countries = json.load(open(GEO, encoding="utf-8"))
    cache = load_json(CACHE)
    jobs = []
    for country in countries:
        if len(country["books"]) >= 5:
            continue
        names = []
        for book in country["books"]:
            name = english_name(book["author"])
            if usable_author(name) and name not in names:
                names.append(name)
        for name in names[:2]:
            jobs.append((country["code"], name))

    print(f"scraping {len(jobs)} writer pages", flush=True)
    named_jobs = []
    by_code = {country["code"]: country["name"] for country in countries}
    for code, name in jobs:
        named_jobs.append((by_code[code], name))
    unique_pending = []
    seen = set()
    for country_name, name in named_jobs:
        if norm(name) in seen or isinstance(cache.get(norm(name)), dict):
            continue
        seen.add(norm(name))
        unique_pending.append((country_name, name))

    def pull_named(pair: tuple[str, str]) -> None:
        country_name, name = pair
        fetch_author(name, country_name, key, cache)
        time.sleep(6.5)

    try:
        with ThreadPoolExecutor(max_workers=1) as pool:
            futures = [pool.submit(pull_named, pair) for pair in unique_pending]
            done = 0
            for future in as_completed(futures):
                future.result()
                done += 1
                if done % 4 == 0:
                    save_json(CACHE, cache)
                    print(f"  {done}/{len(unique_pending)}", flush=True)
    finally:
        save_json(CACHE, cache)

    next_id = 40000
    added = 0
    new_books = []
    for country in countries:
        if len(country["books"]) >= 5:
            continue
        existing = {norm(book["title"]) for book in country["books"]}
        for book in list(country["books"]):
            for part in re.findall(r"\(([^)]+)\)", book["title"]):
                existing.add(norm(part))
        names = []
        for book in country["books"]:
            name = english_name(book["author"])
            if usable_author(name) and name not in names:
                names.append(name)
        for name in names[:2]:
            entry = cache.get(norm(name)) or {}
            if not isinstance(entry, dict):
                continue
            if not country_mentioned(entry.get("text") or "", country["name"]):
                continue
            for title in entry.get("titles") or []:
                if len(country["books"]) >= TARGET:
                    break
                folded = norm(title)
                if any(
                    folded == have or (len(folded) > 5 and len(have) > 5 and (folded.startswith(have[:6]) or have.startswith(folded[:6])))
                    for have in existing
                ):
                    continue
                record = {
                    "id": next_id,
                    "key": f"/works/{country['code']}_{next_id}",
                    "title": title,
                    "author": name,
                    "year": 0,
                    "rating": 0,
                    "genre": "Literature",
                    "genres": ["Fiction"],
                    "country": country["name"],
                    "countryCode": country["code"],
                    "countryId": country["id"],
                    "countryFlag": country["flag"],
                    "city": "",
                    "lat": country["lat"],
                    "lng": country["lng"],
                    "cover": "",
                    "cover_url": "",
                    "cover_id": 0,
                    "openlibrary_url": "",
                    "edition_count": 1,
                    "tagline": "",
                    "description": "",
                }
                country["books"].append(record)
                new_books.append(record)
                existing.add(norm(title))
                next_id += 1
                added += 1

    cover_cache = load_json(COVER_CACHE)
    print(f"looking up covers for {len(new_books)} new books", flush=True)
    for book in new_books:
        cover = cover_for(book["title"], book["author"], cover_cache)
        if cover.get("cover_id"):
            url = f"https://covers.openlibrary.org/b/id/{cover['cover_id']}-M.jpg"
            book["cover"] = book["cover_url"] = url
            book["cover_id"] = cover["cover_id"]
            if cover.get("key"):
                book["key"] = cover["key"]
                book["openlibrary_url"] = f"https://openlibrary.org{cover['key']}"
    save_json(COVER_CACHE, cover_cache)

    temporary = GEO + ".tmp"
    with open(temporary, "w", encoding="utf-8") as handle:
        json.dump(countries, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    os.replace(temporary, GEO)
    counts = [len(country["books"]) for country in countries]
    print(
        f"added {added}; under 5: {sum(count < 5 for count in counts)}; total {sum(counts)}",
        flush=True,
    )


if __name__ == "__main__":
    main()
