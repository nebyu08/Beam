"""Top up each country shelf with real books from known writers.

Open Library is queried by author. Titles that are already on the shelf,
or that look like criticism, guides, and anthologies, are skipped.
Nothing is invented: if Open Library has no matching edition, it is not added.
"""

import json
import os
import re
import threading
import time
import unicodedata
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GEO_PATH = os.path.join(ROOT, "public", "data", "geo-books.json")
CACHE_PATH = "/tmp/beam-ol-author-cache.json"
UA = "BeamShelf/1.0 (country literature shelf; local catalog build)"
CACHE_LOCK = threading.Lock()

# Twelve books for the largest reading shelves, eight everywhere else.
MAJOR = {
    "US", "GB", "FR", "RU", "JP", "DE", "IN", "CN", "IT", "ES",
    "BR", "NG", "MX", "AR", "EG", "TR", "PL", "SE", "NO", "IE",
}

# Writers to search, most-read first. Nationality here is the shelf they belong on.
AUTHORS = {
    "AF": ["Khaled Hosseini", "Atiq Rahimi"],
    "AL": ["Ismail Kadare"],
    "AM": ["William Saroyan"],
    "AR": ["Jorge Luis Borges", "Julio Cortazar", "Adolfo Bioy Casares"],
    "AT": ["Stefan Zweig", "Robert Musil", "Thomas Bernhard", "Arthur Schnitzler"],
    "AU": ["Patrick White", "Tim Winton", "Peter Carey", "Richard Flanagan"],
    "AZ": ["Kurban Said"],
    "BA": ["Mesa Selimovic", "Aleksandar Hemon", "Ivo Andric"],
    "BD": ["Tahmima Anam", "Humayun Ahmed"],
    "BE": ["Georges Simenon", "Amelie Nothomb", "Hugo Claus"],
    "BF": ["Monique Ilboudo"],
    "BJ": ["Jean Pliya"],
    "BO": ["Edmundo Paz Soldan"],
    "BR": ["Machado de Assis", "Clarice Lispector", "Jorge Amado", "Paulo Coelho"],
    "BT": ["Kunzang Choden"],
    "BW": ["Bessie Head", "Unity Dow"],
    "BZ": ["Zee Edgell"],
    "CA": ["Margaret Atwood", "Alice Munro", "Michael Ondaatje", "Robertson Davies"],
    "CD": ["Fiston Mwanza Mujila"],
    "CF": ["Adrienne Yabouza"],
    "CG": ["Sony Labou Tansi", "Alain Mabanckou"],
    "CI": ["Ahmadou Kourouma", "Veronique Tadjo"],
    "CL": ["Pablo Neruda", "Isabel Allende", "Roberto Bolano", "Jose Donoso"],
    "CM": ["Mongo Beti", "Ferdinand Oyono"],
    "CN": ["Mo Yan", "Lu Xun", "Yu Hua", "Liu Cixin", "Lao She"],
    "CO": ["Gabriel Garcia Marquez", "Laura Restrepo"],
    "CR": ["Carlos Luis Fallas"],
    "CU": ["Alejo Carpentier", "Reinaldo Arenas", "Leonardo Padura"],
    "CY": ["Christy Lefteri"],
    "CZ": ["Milan Kundera", "Bohumil Hrabal", "Karel Capek", "Jaroslav Hasek"],
    "DE": ["Thomas Mann", "Hermann Hesse", "Gunther Grass", "Heinrich Boll", "Johann Wolfgang von Goethe", "Erich Maria Remarque"],
    "DJ": ["Abdourahman Waberi"],
    "DK": ["Hans Christian Andersen", "Karen Blixen", "Peter Hoeg"],
    "DO": ["Julia Alvarez", "Junot Diaz", "Juan Bosch"],
    "DZ": ["Albert Camus", "Assia Djebar", "Kamel Daoud"],
    "EE": ["Jaan Kross", "Andrus Kivirahk"],
    "EG": ["Naguib Mahfouz", "Nawal El Saadawi", "Alaa Al Aswany"],
    "ER": ["Sulaiman Addonia"],
    "ES": ["Miguel de Cervantes", "Federico Garcia Lorca", "Carlos Ruiz Zafon", "Camilo Jose Cela"],
    "ET": ["Dinaw Mengestu", "Maaza Mengiste"],
    "FI": ["Tove Jansson", "Mika Waltari", "Frans Emil Sillanpaa"],
    "FJ": ["Epeli Hau'ofa"],
    "FR": ["Victor Hugo", "Gustave Flaubert", "Marcel Proust", "Albert Camus", "Simone de Beauvoir", "Marguerite Duras"],
    "GB": ["Jane Austen", "Charles Dickens", "Virginia Woolf", "George Orwell", "Zadie Smith", "Kazuo Ishiguro"],
    "GE": ["Mikheil Javakhishvili"],
    "GH": ["Ayi Kwei Armah", "Ama Ata Aidoo", "Yaa Gyasi"],
    "GN": ["Camara Laye", "Tierno Monenembo"],
    "GR": ["Nikos Kazantzakis", "Homer"],
    "GT": ["Miguel Angel Asturias", "Rodrigo Rey Rosa"],
    "GY": ["Wilson Harris", "Edgar Mittelholzer"],
    "HN": ["Roberto Quesada"],
    "HR": ["Miroslav Krleza", "Dubravka Ugresic", "Slavenka Drakulic"],
    "HT": ["Jacques Roumain", "Edwidge Danticat", "Marie Vieux-Chauvet"],
    "HU": ["Magda Szabo", "Imre Kertesz", "Sandor Marai"],
    "ID": ["Pramoedya Ananta Toer", "Eka Kurniawan"],
    "IE": ["James Joyce", "Oscar Wilde", "Samuel Beckett", "Sally Rooney", "John Banville"],
    "IL": ["Amos Oz", "David Grossman", "Etgar Keret"],
    "IN": ["R. K. Narayan", "Arundhati Roy", "Rabindranath Tagore", "Salman Rushdie", "Vikram Seth", "Jhumpa Lahiri"],
    "IQ": ["Hassan Blasim", "Ahmed Saadawi"],
    "IR": ["Sadegh Hedayat", "Marjane Satrapi", "Shahrnush Parsipur"],
    "IS": ["Halldor Laxness", "Sjon", "Arnaldur Indridason"],
    "IT": ["Italo Calvino", "Umberto Eco", "Primo Levi", "Elena Ferrante", "Elsa Morante"],
    "JM": ["Marlon James", "Claude McKay"],
    "JO": ["Ibrahim Nasrallah", "Abdelrahman Munif"],
    "JP": ["Haruki Murakami", "Yukio Mishima", "Yasunari Kawabata", "Natsume Soseki", "Kobo Abe", "Osamu Dazai"],
    "KE": ["Ngugi wa Thiong'o", "Grace Ogot", "Binyavanga Wainaina"],
    "KG": ["Chinghiz Aitmatov"],
    "KH": ["Vaddey Ratner"],
    "KP": ["Bandi"],
    "KR": ["Han Kang", "Shin Kyung-sook", "Cho Nam-joo"],
    "KW": ["Saud Alsanousi"],
    "KZ": ["Mukhtar Auezov"],
    "LB": ["Hanan al-Shaykh", "Elias Khoury", "Amin Maalouf"],
    "LK": ["Michael Ondaatje", "Shyam Selvadurai"],
    "LR": ["Wayetu Moore"],
    "LS": ["Thomas Mofolo"],
    "LT": ["Ricardas Gavelis"],
    "LU": ["Anise Koltz"],
    "LV": ["Nora Ikstena"],
    "LY": ["Hisham Matar", "Ibrahim al-Koni"],
    "MA": ["Tahar Ben Jelloun", "Driss Chraibi", "Leila Slimani"],
    "MD": ["Ion Druta"],
    "ME": ["Andrej Nikolaidis"],
    "MG": ["Jean-Joseph Rabearivelo", "Naivo"],
    "MK": ["Goce Smilevski"],
    "ML": ["Amadou Hampate Ba", "Yambo Ouloguem"],
    "MM": ["Nu Nu Yi", "Pascal Khoo Thwe"],
    "MN": ["Galsan Tschinag"],
    "MR": ["Mohamedou Ould Slahi"],
    "MW": ["Jack Mapanje", "Legson Kayira"],
    "MX": ["Juan Rulfo", "Carlos Fuentes", "Laura Esquivel", "Octavio Paz", "Rosario Castellanos"],
    "MY": ["Tash Aw", "Tan Twan Eng"],
    "MZ": ["Mia Couto", "Paulina Chiziane"],
    "NA": ["Neshani Andreas"],
    "NE": ["Abdoulaye Mamani"],
    "NG": ["Chinua Achebe", "Wole Soyinka", "Chimamanda Ngozi Adichie", "Ben Okri", "Buchi Emecheta"],
    "NI": ["Sergio Ramirez", "Gioconda Belli", "Ruben Dario"],
    "NL": ["Harry Mulisch", "Multatuli", "Cees Nooteboom"],
    "NO": ["Henrik Ibsen", "Knut Hamsun", "Sigrid Undset", "Jon Fosse", "Karl Ove Knausgard"],
    "NP": ["Samrat Upadhyay", "Manjushree Thapa"],
    "NZ": ["Katherine Mansfield", "Keri Hulme", "Janet Frame"],
    "OM": ["Jokha Alharthi"],
    "PA": ["Rogelio Sinan"],
    "PE": ["Mario Vargas Llosa", "Jose Maria Arguedas"],
    "PG": ["Vincent Eri"],
    "PH": ["Jose Rizal", "Nick Joaquin", "Jessica Hagedorn"],
    "PK": ["Mohsin Hamid", "Kamila Shamsie", "Bapsi Sidhwa"],
    "PL": ["Olga Tokarczuk", "Witold Gombrowicz", "Bruno Schulz", "Stanislaw Lem", "Czeslaw Milosz"],
    "PS": ["Mahmoud Darwish", "Ghassan Kanafani", "Susan Abulhawa"],
    "PT": ["Jose Saramago", "Fernando Pessoa", "Eca de Queiros"],
    "PY": ["Augusto Roa Bastos"],
    "RO": ["Mircea Cartarescu", "Herta Muller", "Mihail Sadoveanu"],
    "RS": ["Ivo Andric", "Danilo Kis", "Milorad Pavic"],
    "RU": ["Fyodor Dostoevsky", "Leo Tolstoy", "Mikhail Bulgakov", "Anton Chekhov", "Nikolai Gogol", "Ivan Turgenev"],
    "RW": ["Scholastique Mukasonga"],
    "SA": ["Abdul Rahman Munif", "Rajaa Alsanea"],
    "SD": ["Tayeb Salih", "Leila Aboulela"],
    "SE": ["Selma Lagerlof", "August Strindberg", "Stieg Larsson", "Astrid Lindgren"],
    "SI": ["Drago Jancar", "Ivan Cankar"],
    "SK": ["Dominik Tatarka"],
    "SN": ["Mariama Ba", "Ousmane Sembene", "Leopold Sedar Senghor"],
    "SO": ["Nuruddin Farah", "Nadifa Mohamed"],
    "SR": ["Cynthia McLeod", "Astrid Roemer"],
    "SV": ["Horacio Castellanos Moya", "Manlio Argueta"],
    "SY": ["Khaled Khalifa", "Zakaria Tamer", "Nihad Sirees"],
    "TD": ["Joseph Brahim Seid"],
    "TG": ["Tete-Michel Kpomassie"],
    "TH": ["Kukrit Pramoj", "S.P. Somtow", "Chart Korbjitti"],
    "TJ": ["Sadriddin Aini"],
    "TM": ["Ak Welsapar"],
    "TN": ["Albert Memmi"],
    "TR": ["Orhan Pamuk", "Elif Shafak", "Yasar Kemal", "Ahmet Hamdi Tanpinar"],
    "TT": ["V. S. Naipaul", "Earl Lovelace"],
    "TW": ["Wu Ming-Yi", "Pai Hsien-yung"],
    "TZ": ["Abdulrazak Gurnah"],
    "UA": ["Andrey Kurkov", "Oksana Zabuzhko", "Serhiy Zhadan"],
    "UG": ["Jennifer Nansubuga Makumbi", "Moses Isegawa"],
    "US": ["Toni Morrison", "William Faulkner", "Harper Lee", "F. Scott Fitzgerald", "James Baldwin", "Octavia E. Butler"],
    "UY": ["Juan Carlos Onetti", "Mario Benedetti", "Eduardo Galeano", "Horacio Quiroga"],
    "UZ": ["Hamid Ismailov"],
    "VE": ["Romulo Gallegos", "Teresa de la Parra"],
    "VN": ["Bao Ninh", "Duong Thu Huong"],
    "YE": ["Zayd Mutee Dammaj"],
    "ZA": ["J. M. Coetzee", "Nadine Gordimer", "Alan Paton", "Zakes Mda"],
    "ZM": ["Namwali Serpell"],
    "ZW": ["Tsitsi Dangarembga", "NoViolet Bulawayo", "Dambudzo Marechera", "Petina Gappah"],
}

BLOCK_TITLE = (
    "anthology",
    "companion",
    "a study",
    "studies in",
    "history of",
    "introduction to",
    "selected works",
    "collected works",
    "collected poems",
    "interviews",
    "reader's guide",
    "readers guide",
    "cliff",
    "sparknotes",
    "analysis of",
    "critical essays",
    "biography",
    "letters of",
    "correspondence",
    "notebooks",
    "diaries of",
    "complete works",
    "omnibus",
    "box set",
    "summary",
    "workbook",
)


def fold(value: str) -> str:
    stripped = "".join(
        char for char in unicodedata.normalize("NFKD", value) if not unicodedata.combining(char)
    )
    return stripped.casefold()


def norm(value: str) -> str:
    return " ".join(re.sub(r"[^a-z0-9]+", " ", fold(value)).split())


def title_keys(title: str) -> set[str]:
    keys = {norm(title)}
    for part in re.findall(r"\(([^)]+)\)", title):
        cleaned = norm(part)
        if cleaned:
            keys.add(cleaned)
    return {key for key in keys if len(key) > 2}


def last_name(author: str) -> str:
    parts = [part for part in re.split(r"\s+", author.strip()) if part]
    for part in reversed(parts):
        token = re.sub(r"[^A-Za-z'-]", "", part)
        if len(token) > 2 and token.casefold() not in {"von", "van", "de", "da", "del", "la"}:
            return token
    return parts[-1] if parts else author


def http_json(url: str) -> dict:
    request = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    last_error = None
    for attempt in range(4):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.loads(response.read().decode("utf-8"))
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            time.sleep(0.6 + attempt)
    raise RuntimeError(last_error)


def load_cache() -> dict:
    if not os.path.exists(CACHE_PATH):
        return {}
    with open(CACHE_PATH, encoding="utf-8") as handle:
        return json.load(handle)


def save_cache(cache: dict) -> None:
    with CACHE_LOCK:
        snapshot = dict(cache)
    with open(CACHE_PATH, "w", encoding="utf-8") as handle:
        json.dump(snapshot, handle)


def search_author(author: str, cache: dict) -> list[dict]:
    key = fold(author)
    with CACHE_LOCK:
        if key in cache:
            return cache[key]
    params = urllib.parse.urlencode(
        {
            "q": f'author:"{author}"',
            "sort": "editions",
            "limit": 8,
            "fields": "title,author_name,cover_i,first_publish_year,key,edition_count",
        }
    )
    try:
        data = http_json(f"https://openlibrary.org/search.json?{params}")
        docs = data.get("docs") or []
    except Exception as exc:  # noqa: BLE001
        print(f"  miss {author}: {exc}", flush=True)
        docs = []
    with CACHE_LOCK:
        cache[key] = docs
    return docs


def name_tokens(name: str) -> list[str]:
    tokens = []
    for token in re.split(r"\s+", name.strip()):
        cleaned = re.sub(r"[^a-z0-9]+", "", fold(token))
        if cleaned:
            tokens.append(cleaned)
    return tokens


def significant_last(tokens: list[str]) -> str:
    skip = {"von", "van", "de", "da", "del", "la", "al", "bin", "bint", "ibn"}
    suffixes = {"saavedra", "jr", "junior", "fils", "filho", "neto", "sr"}
    usable = [token for token in tokens if token not in skip] or tokens
    if len(usable) >= 2 and usable[-1] in suffixes:
        return usable[-2]
    return usable[-1]


def author_matches(query: str, found: str) -> bool:
    query_tokens = name_tokens(query)
    found_tokens = name_tokens(found)
    if not query_tokens or not found_tokens:
        return False
    query_last = significant_last(query_tokens)
    found_last = significant_last(found_tokens)
    if query_last != found_last:
        return False
    # Long surnames can match on the surname alone. Short ones (Yan, Hua, Abe)
    # have to match the whole name, so "Yu Hua" does not accept "Wang Yu Hua".
    if len(query_last) >= 4:
        return True
    return set(query_tokens) == set(found_tokens)


def acceptable(author: str, doc: dict) -> bool:
    title = (doc.get("title") or "").strip()
    if len(title) < 2:
        return False
    folded = fold(title)
    if any(phrase in folded for phrase in BLOCK_TITLE):
        return False
    names = doc.get("author_name") or []
    if not names:
        return False
    if not author_matches(author, names[0]):
        return False
    editions = int(doc.get("edition_count") or 0)
    if editions < 2 and not doc.get("cover_i"):
        return False
    return True


def main() -> None:
    with open(GEO_PATH, encoding="utf-8") as handle:
        countries = json.load(handle)
    by_code = {country["code"]: country for country in countries}

    needed_authors = []
    for code, authors in AUTHORS.items():
        country = by_code.get(code)
        if not country:
            continue
        target = 12 if code in MAJOR else 8
        if len(country["books"]) >= target:
            continue
        needed_authors.extend(authors)

    cache = load_cache()
    unique_authors = list(dict.fromkeys(needed_authors))
    missing = [author for author in unique_authors if fold(author) not in cache]
    print(f"looking up {len(missing)} authors ({len(unique_authors) - len(missing)} cached)", flush=True)

    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = [pool.submit(search_author, author, cache) for author in missing]
        done = 0
        for future in as_completed(futures):
            future.result()
            done += 1
            if done % 20 == 0:
                save_cache(cache)
                print(f"  {done}/{len(missing)}", flush=True)
    save_cache(cache)

    next_id = 20000
    added = 0
    for code, authors in AUTHORS.items():
        country = by_code.get(code)
        if not country:
            continue
        target = 12 if code in MAJOR else 8
        existing: set[str] = set()
        for book in country["books"]:
            existing |= title_keys(book.get("title") or "")
        author_names = list(country.get("authors") or [])
        for author in authors:
            if len(country["books"]) >= target:
                break
            kept = 0
            for doc in search_author(author, cache):
                if len(country["books"]) >= target or kept >= 3:
                    break
                if not acceptable(author, doc):
                    continue
                title = doc["title"].strip()
                keys = title_keys(title)
                if keys & existing:
                    continue
                if any(
                    len(prev) > 8 and (key.startswith(prev) or prev.startswith(key))
                    for key in keys
                    for prev in existing
                ):
                    continue
                cover_id = int(doc.get("cover_i") or 0)
                cover_url = (
                    f"https://covers.openlibrary.org/b/id/{cover_id}-M.jpg" if cover_id else ""
                )
                work_key = doc.get("key") or f"/works/{code}_{next_id}"
                year = int(doc.get("first_publish_year") or 0)
                country["books"].append(
                    {
                        "id": next_id,
                        "key": work_key,
                        "title": title,
                        "author": (doc.get("author_name") or [author])[0],
                        "year": year,
                        "rating": 0,
                        "genre": "Novel",
                        "genres": ["Fiction"],
                        "country": country["name"],
                        "countryCode": country["code"],
                        "countryId": country["id"],
                        "countryFlag": country["flag"],
                        "city": "",
                        "lat": country["lat"],
                        "lng": country["lng"],
                        "cover": cover_url,
                        "cover_url": cover_url,
                        "cover_id": cover_id,
                        "openlibrary_url": f"https://openlibrary.org{work_key}" if doc.get("key") else "",
                        "edition_count": int(doc.get("edition_count") or 1),
                        "tagline": "",
                        "description": "",
                    }
                )
                existing |= keys
                if author not in author_names:
                    author_names.append(author)
                next_id += 1
                added += 1
                kept += 1
        country["authors"] = author_names[:16]

    temporary = GEO_PATH + ".tmp"
    with open(temporary, "w", encoding="utf-8") as handle:
        json.dump(countries, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    os.replace(temporary, GEO_PATH)

    counts = [len(country["books"]) for country in countries]
    print(
        f"added {added}; min {min(counts)}; median {sorted(counts)[len(counts)//2]}; "
        f"under 8: {sum(count < 8 for count in counts)}; total {sum(counts)}",
        flush=True,
    )


if __name__ == "__main__":
    main()
