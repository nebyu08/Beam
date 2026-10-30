#!/usr/bin/env python3
"""Add books to countries that have fewer than a target shelf.

Titles come from each country's Wikipedia literature article, fetched with
Firecrawl. Covers and years are filled from Open Library. Pages are cached
under scripts/cache/firecrawl so a rerun does not scrape them again.
"""

from __future__ import annotations

import argparse
import json
import re
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "public" / "data" / "geo-books.json"
CACHE = ROOT / "scripts" / "cache" / "firecrawl"
ENV = ROOT / ".env"
TARGET = 100
SKIP_TITLES = {
    "literature",
    "novel",
    "poetry",
    "fiction",
    "edit",
    "citation needed",
    "isbn",
    "see also",
    "references",
    "external links",
    "further reading",
    "citation needed",
    "verification needed",
}


def load_key() -> str:
    for line in ENV.read_text().splitlines():
        if line.startswith("crawlwer_API="):
            value = line.split("=", 1)[1].strip().strip('"').strip("'")
            if value:
                return value
    raise SystemExit("crawlwer_API is missing from .env")


def fold(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.lower()
    text = re.sub(r"\([^)]*\)", " ", text)
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def fetch_json(url: str) -> dict | None:
    for attempt in range(6):
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "BeamCatalog/1.0 (literary globe research; contact local)"},
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            if error.code == 429 and attempt < 5:
                time.sleep(3 * (attempt + 1))
                continue
            return None
        except Exception:
            if attempt < 5:
                time.sleep(2)
                continue
            return None
    return None


def wiki_title(name: str) -> str | None:
    query = urllib.parse.urlencode(
        {
            "action": "query",
            "list": "search",
            "srsearch": f"{name} literature",
            "srlimit": "5",
            "format": "json",
        }
    )
    url = f"https://en.wikipedia.org/w/api.php?{query}"
    payload = fetch_json(url)
    if not payload:
        return None
    hits = payload.get("query", {}).get("search", [])
    for hit in hits:
        title = hit.get("title") or ""
        if "literature" in title.lower() or "novel" in title.lower():
            return title
    if hits:
        return hits[0].get("title")
    return None


def scrape_markdown(key: str, page_title: str) -> str:
    CACHE.mkdir(parents=True, exist_ok=True)
    slug = re.sub(r"[^a-z0-9]+", "-", page_title.lower()).strip("-")
    path = CACHE / f"{slug}.md"
    if path.exists() and path.stat().st_size > 200:
        return path.read_text()

    page_url = "https://en.wikipedia.org/wiki/" + urllib.parse.quote(page_title.replace(" ", "_"))
    body = json.dumps(
        {
            "url": page_url,
            "formats": ["markdown"],
            "onlyMainContent": True,
        }
    ).encode()
    req = urllib.request.Request(
        "https://api.firecrawl.dev/v2/scrape",
        data=body,
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "User-Agent": "beam-catalog/1.0",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as response:
            payload = json.load(response)
    except urllib.error.HTTPError as error:
        detail = error.read().decode()[:300]
        if error.code in (401, 402, 429):
            raise SystemExit(f"Firecrawl stopped the run ({error.code}). {detail}")
        print(f"  scrape failed {error.code} for {page_title}")
        return ""
    markdown = ""
    data = payload.get("data") if isinstance(payload, dict) else None
    if isinstance(data, dict):
        markdown = data.get("markdown") or ""
    elif isinstance(payload, dict):
        markdown = payload.get("markdown") or ""
    if markdown:
        path.write_text(markdown)
    return markdown


WORK_LINK = re.compile(
    r"_\[([^\]]{2,90})\]\(https://en\.wikipedia\.org/wiki/(?!File:|Special:|Help:|Wikipedia:|Template:)[^)\s\"]+(?: \"([^\"]+)\")?\)_"
)
AUTHOR_LINK = re.compile(
    r"\[([^\]]{2,70})\]\(https://en\.wikipedia\.org/wiki/(?!File:|Special:|Help:|Wikipedia:)[^)\s\"]+"
)


def extract_works(markdown: str, country_name: str) -> list[tuple[str, str]]:
    cut = len(markdown)
    for marker in ("\n## See also", "\n## References", "\n## External links", "\n## Notes", "Wikisource has original"):
        index = markdown.find(marker)
        if index != -1:
            cut = min(cut, index)
    body = markdown[:cut]
    found: list[tuple[str, str]] = []
    seen: set[str] = set()
    country_fold = fold(country_name)

    for line in body.splitlines():
        if "|" in line:
            continue
        list_item = line.lstrip().startswith("-")
        works = list(WORK_LINK.finditer(line))
        if not works:
            continue
        authors = [match.group(1).strip() for match in AUTHOR_LINK.finditer(line)]
        for match in works:
            title = (match.group(2) or match.group(1)).strip()
            title = re.sub(r"\s+", " ", title).strip(" .")
            window = line[match.end(): match.end() + 36]
            has_year = re.search(r"\b(?:c\.\s*)?\d{3,4}\b", window) is not None
            author = ""
            authored = False
            for author_match in AUTHOR_LINK.finditer(line):
                if author_match.end() <= match.start() and match.start() - author_match.end() < 60:
                    candidate = author_match.group(1).strip()
                    if fold(candidate) != fold(title):
                        author = candidate
                        authored = True
            if not (has_year or authored or (list_item and author)):
                continue
            key = fold(title)
            if not key or key in seen or key in SKIP_TITLES or key == country_fold:
                continue
            if "literature" in key or len(key) < 3:
                continue
            seen.add(key)
            found.append((title, author))
            if len(found) >= 40:
                return found
    return found


def clean_title(title: str) -> str:
    title = re.sub(r"\s*\((?:hardcover|paperback|kindle|audio|audible|ebook|mass market)[^)]*\)", "", title, flags=re.I)
    title = re.sub(r"\s*\([^)]*#\d+\)", "", title)
    return re.sub(r"\s+", " ", title).strip(" .-")


def extract_goodreads(markdown: str) -> list[tuple[str, str]]:
    found: list[tuple[str, str]] = []
    seen: set[str] = set()
    pattern = re.compile(r"\[([^\]]{2,140})\]\(https://www\.goodreads\.com/book/show/\d+[^)]*\)")
    for match in pattern.finditer(markdown):
        title = clean_title(match.group(1))
        key = fold(title)
        if not key or key in seen or len(key) < 3:
            continue
        if key in SKIP_TITLES or "want to read" in key:
            continue
        seen.add(key)
        found.append((title, ""))
        if len(found) >= 120:
            break
    return found


def search_markdown(key: str, country_name: str) -> str:
    CACHE.mkdir(parents=True, exist_ok=True)
    slug = re.sub(r"[^a-z0-9]+", "-", country_name.lower()).strip("-")
    path = CACHE / f"search-{slug}.md"
    if path.exists() and path.stat().st_size > 200:
        return path.read_text()
    body = json.dumps(
        {
            "query": f"best novels from {country_name}",
            "limit": 5,
            "scrapeOptions": {"formats": ["markdown"], "onlyMainContent": True},
        }
    ).encode()
    req = urllib.request.Request(
        "https://api.firecrawl.dev/v2/search",
        data=body,
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "User-Agent": "BeamCatalog/1.0",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            payload = json.load(response)
    except urllib.error.HTTPError as error:
        detail = error.read().decode()[:240]
        if error.code in (401, 402, 429):
            raise SystemExit(f"Firecrawl search stopped the run ({error.code}). {detail}")
        print(f"  search failed {error.code} for {country_name}")
        return ""
    parts = []
    for item in (payload.get("data") or {}).get("web") or []:
        markdown = item.get("markdown") or ""
        if markdown:
            parts.append(markdown)
    text = "\n\n".join(parts)
    if text:
        path.write_text(text)
    return text


def scrape_url(key: str, url: str, cache_name: str) -> str:
    path = CACHE / cache_name
    if path.exists() and path.stat().st_size > 200:
        return path.read_text()
    body = json.dumps(
        {"url": url, "formats": ["markdown"], "onlyMainContent": True}
    ).encode()
    req = urllib.request.Request(
        "https://api.firecrawl.dev/v2/scrape",
        data=body,
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "User-Agent": "BeamCatalog/1.0",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as response:
            payload = json.load(response)
    except urllib.error.HTTPError as error:
        detail = error.read().decode()[:240]
        if error.code in (401, 402, 429):
            raise SystemExit(f"Firecrawl scrape stopped the run ({error.code}). {detail}")
        return ""
    markdown = ""
    data = payload.get("data") if isinstance(payload, dict) else None
    if isinstance(data, dict):
        markdown = data.get("markdown") or ""
    if markdown:
        path.write_text(markdown)
    return markdown


def shelf_pages(key: str, country_name: str, markdown: str) -> str:
    shelves = []
    for match in re.finditer(r"https://www\.goodreads\.com/shelf/show/[a-z0-9\-]+", markdown):
        url = match.group(0)
        if url not in shelves:
            shelves.append(url)
    parts = []
    slug = re.sub(r"[^a-z0-9]+", "-", country_name.lower()).strip("-")
    for shelf in shelves[:1]:
        for page in (2, 3, 4):
            parts.append(scrape_url(key, f"{shelf}?page={page}", f"shelf-{slug}-{page}.md"))
    return "\n\n".join(part for part in parts if part)


def titles_match(scraped: str, found: str) -> bool:
    left, right = fold(scraped), fold(found)
    if not left or not right:
        return False
    if left == right:
        return True
    short, long = (left, right) if len(left) <= len(right) else (right, left)
    if short not in long:
        return False
    return len(long.split()) - len(short.split()) <= 1


def openlibrary(title: str, author: str) -> dict | None:
    query = title if not author else f"{title} {author}"
    url = "https://openlibrary.org/search.json?" + urllib.parse.urlencode(
        {"q": query, "limit": "5", "fields": "key,title,author_name,first_publish_year,cover_i,edition_count"}
    )
    payload = fetch_json(url)
    if not payload:
        return None
    docs = payload.get("docs") or []
    doc = next((item for item in docs if titles_match(title, item.get("title") or "")), None)
    if not doc:
        return None
    cover_id = doc.get("cover_i") or 0
    cover = f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg" if cover_id else ""
    authors = doc.get("author_name") or []
    work = doc.get("key") or ""
    return {
        "title": doc.get("title") or title,
        "author": authors[0] if authors else author,
        "year": doc.get("first_publish_year") or 0,
        "cover": cover,
        "cover_id": cover_id or 0,
        "key": work,
        "edition_count": doc.get("edition_count") or 0,
        "openlibrary_url": f"https://openlibrary.org{work}" if work else "",
    }


def next_id(countries: list[dict]) -> int:
    highest = 50000
    for country in countries:
        for book in country.get("books", []):
            highest = max(highest, int(book.get("id") or 0))
    return highest + 1


def already(country: dict) -> set[str]:
    return {fold(book.get("title") or "") for book in country.get("books", [])}


def add_books(country: dict, works: list[tuple[str, str]], start_id: int) -> int:
    known = already(country)
    added = 0
    book_id = start_id
    for title, author in works:
        if len(country["books"]) >= TARGET:
            break
        if fold(title) in known:
            continue
        time.sleep(0.15)
        meta = openlibrary(title, author)
        if not meta:
            continue
        if fold(meta["title"]) in known:
            continue
        if not titles_match(title, meta["title"]):
            continue
        record = {
            "id": book_id,
            "key": meta["key"],
            "title": meta["title"],
            "author": meta["author"] or "Unknown",
            "year": int(meta["year"] or 0),
            "rating": 0,
            "genre": "Literature",
            "genres": ["Literature"],
            "country": country["name"],
            "countryCode": country["code"],
            "countryId": country["id"],
            "countryFlag": country["flag"],
            "city": "",
            "lat": country.get("lat") or 0,
            "lng": country.get("lng") or 0,
            "cover": meta["cover"],
            "cover_url": meta["cover"],
            "cover_id": meta["cover_id"],
            "openlibrary_url": meta["openlibrary_url"],
            "edition_count": meta["edition_count"],
            "description": "",
        }
        country["books"].append(record)
        known.add(fold(record["title"]))
        book_id += 1
        added += 1
    return added


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0, help="Stop after this many countries")
    parser.add_argument("--country", default="", help="Only this country name")
    args = parser.parse_args()

    key = load_key()
    countries = json.loads(DATA.read_text())
    book_id = next_id(countries)
    touched = 0
    added_total = 0

    for country in countries:
        if args.country and country["name"] != args.country:
            continue
        if len(country.get("books", [])) >= TARGET:
            continue
        if args.limit and touched >= args.limit:
            break
        touched += 1
        pieces = []
        page = wiki_title(country["name"])
        if page:
            wiki = scrape_markdown(key, page)
            if wiki:
                pieces.append(wiki)
        before = len(country["books"])
        works = []
        for piece in pieces:
            works.extend(extract_works(piece, country["name"]))
        gained = add_books(country, works, book_id)
        book_id += gained
        extra = ""
        if len(country["books"]) < TARGET:
            extra = search_markdown(key, country["name"])
            more = extract_goodreads(extra) + extract_works(extra, country["name"])
            extra_added = add_books(country, more, book_id)
            book_id += extra_added
            gained += extra_added
            works.extend(more)
        if len(country["books"]) < TARGET and extra:
            deeper = shelf_pages(key, country["name"], extra)
            deeper_works = extract_goodreads(deeper)
            deeper_added = add_books(country, deeper_works, book_id)
            book_id += deeper_added
            gained += deeper_added
        added_total += gained
        print(f"{country['name']}: {before} -> {len(country['books'])} ({len(works)} mentions)")
        DATA.write_text(json.dumps(countries, ensure_ascii=False, indent=2) + "\n")
        time.sleep(1.2)

    print(f"done. countries visited {touched}, books added {added_total}")


if __name__ == "__main__":
    main()
