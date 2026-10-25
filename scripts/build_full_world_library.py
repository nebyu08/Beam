import json
import os
import re
import urllib.parse

def code_to_flag(code):
    if not code or len(code) != 2:
        return "🌐"
    return "".join(chr(127397 + ord(c)) for c in code.upper())

def get_cultural_title_and_tagline(country_name, region, subregion):
    c_lower = country_name.lower()
    
    # Specific country themes
    specifics = {
        "afghanistan": ("Kabul Chronicles & Mountain Lore", "Epic tales of resilience, ancient Persian poetry, and wartime memory."),
        "albania": ("Balkan Allegory & Kanun Shadows", "Mythic blood feuds, totalitarian parables, and ancient Illyrian echoes."),
        "algeria": ("Maghreb Awakening & Resistance", "Lyrical anticolonial struggle, Mediterranean light, and desert crossroads."),
        "angola": ("Luanda Memory & Atlantic Sagas", "Rich Lusophone African storytelling, independence epics, and urban myths."),
        "armenia": ("Ararat Memory & Sacred Scripts", "Centuries of diaspora resilience, ancient Christian manuscripts, and haunting poetry."),
        "bangladesh": ("Bengal Delta Epics & River Lore", "Poignant social realism, the liberation war, and lush riverine poetry."),
        "belgium": ("Flemish Surrealism & Walloon Verse", "Absurdist wit, Franco-Belgian masterworks, and quiet melancholy."),
        "bolivia": ("Altiplano Echoes & Andean Lore", "High-altitude magical realism, indigenous mythology, and tin mine resistance."),
        "bosnia and herzegovina": ("Sarajevo Bridges & Balkan Memory", "Interwoven cultural tapestries, wartime survival, and lyrical fortitude."),
        "botswana": ("Kalahari Wisdom & Modern Echoes", "Warm community humor, traditional court lore, and savanna mysteries."),
        "bulgaria": ("Thracian Whispers & Rose Valley Lore", "Philosophical satire, Ottoman past, and Nobel-winning exile parables."),
        "cambodia": ("Angkor Heritage & Memory", "Ancient Khmer classical epic traditions and poignant memoirs of survival."),
        "cameroon": ("Equatorial Realism & Satire", "Biting anticolonial satire, rich oral storytelling, and forest allegories."),
        "croatia": ("Adriatic Sagas & Zagreb Modernism", "Mediterranean coastal nostalgia, Central European wit, and Balkan war memory."),
        "côte d'ivoire": ("Abidjan Polyphony & Rainforest Lore", "Vibrant West African cosmopolitanism, griot wisdom, and urban youth."),
        "dominican rep.": ("Quisqueya Diaspora & Antillean Verse", "Vibrant Caribbean rhythm, dictator eras, and immigrant dreams."),
        "ecuador": ("Equatorial Andes & Amazonian Realism", "Social realism of indigenous struggles and highland introspection."),
        "estonia": ("Baltic Forest Epics & Digital Age", "Lyrical nature worship, Finno-Ugric memory, and quiet resistance."),
        "ethiopia": ("Abyssinian Heritage & Solomonic Lore", "Ancient Ge'ez classical tradition, highland dramas, and modern cosmopolitan memoirs."),
        "finland": ("Kalevala Sagas & Nordic Melancholy", "Deep forested solitude, stark emotional honesty, and luminous design."),
        "georgia": ("Caucasus Myth & Rustaveli Verse", "Centuries of heroic chivalric poetry, feast culture, and Soviet defiance."),
        "guatemala": ("Mayan Magic & Dictator Allegories", "Nobel laureate magical realism, indigenous cosmology, and volcanic beauty."),
        "haiti": ("Creole Renaissance & Marvelous Realism", "Voodoo mysticism, revolutionary triumphs, and passionate diaspora voices."),
        "hungary": ("Danube Melancholy & Central European Wit", "Pessimistic brilliance, labyrinthine psychology, and Budapest coffeehouse culture."),
        "iraq": ("Mesopotamian Cradle & Baghdad Verse", "Ancient Sumerian epics, thousand-and-one nights heritage, and modern wartime lament."),
        "israel": ("Jerusalem Crossroads & Hebrew Renewal", "Biblical resonance, existential modern statehood, and polyphonic conflicts."),
        "kazakhstan": ("Great Steppe Nomadic Epics", "Wide Eurasian horizons, nomad oral heritage, and nuclear steppe survival."),
        "latvia": ("Dainas Folk Epics & Amber Coast", "Traditional poetic dainas, national survival, and coastal introspection."),
        "lebanon": ("Phoenician Crossroads & Levantine Poetics", "Poetic cosmopolitanism, civil war reckoning, and Cedar mountain reflections."),
        "lithuania": ("Baltic Pagan Lore & Gediminas Towers", "Haunting lyrical prose, Soviet underground resistance, and sacred groves."),
        "madagascar": ("Malagasy Ancestral Tales & Red Earth", "Kabary oratory, island biodiversity, and taboo-breaking modern fiction."),
        "malaysia": ("Straits Crossroads & Nusantara Tales", "Polyglot multiculturalism, rainforest mythology, and colonial heritage."),
        "mongolia": ("Secret History & Steppe Nomads", "Chinggisid epics, horse culture, and Buddhist steppe spiritualism."),
        "morocco": ("Maghreb Labyrinth & Medina Tales", "Thousand-year-old medinas, Berber oral folklore, and Franco-Arab modernism."),
        "mozambique": ("Indian Ocean Sagas & Sleepwalking Lands", "Magical Lusophone prose, civil war healing, and coastal spirit worlds."),
        "myanmar": ("Irrawaddy Golden Sagas & Pagodas", "Buddhist meditation, colonial intrigue, and pro-democracy literature."),
        "nepal": ("Himalayan Peaks & Kathmandu Lore", "Sacred mountain spirituality, Gurkha epics, and rural transformation."),
        "new zealand": ("Aotearoa Maori Lore & Oceanic Solitude", "Whale rider mythology, stark island beauty, and Mansfieldian short fiction."),
        "pakistan": ("Indus Valley Sagas & Urdu Ghazals", "Lyrical Urdu poetry, partition heartbreak, and post-9/11 diaspora epics."),
        "palestine": ("Olive Groves & Resistance Verse", "Mahmoud Darwish poetic defiance, exile memoirs, and enduring hope."),
        "panama": ("Canal Crossroads & Isthmus Lore", "Meeting place of the oceans, tropical noir, and transit culture."),
        "philippines": ("Archipelagic Epics & Ilustrado Wit", "José Rizal's anticolonial satire, island folklore, and Catholic mysticism."),
        "romania": ("Carpathian Gothic & Absurdist Wit", "Ionesco absurdist theater, Transylvanian folklore, and post-Ceausescu satire."),
        "rwanda": ("Thousand Hills & Memory Rebirth", "Lyrical reconciliation, pastoral cattle poetry, and healing from tragedy."),
        "saudi arabia": ("Arabian Dunes & Modern Petro-Sagas", "Bedouin desert codes, petroleum transformations, and sacred pilgrims."),
        "senegal": ("Teranga Hospitality & Griot Epics", "Sédar Senghor Negritude, Wolof oral genius, and Sahel wisdom."),
        "serbia": ("Drina Bridge Epics & Balkan Soul", "Ivo Andrić historical panoramas, epic gusle ballads, and Danube grit."),
        "singapore": ("Lion City Futurism & Peranakan Lore", "Crossroads of Asia, high-tech modernity, and ancestral heritage."),
        "somalia": ("Nation of Poets & Nomadic Verse", "World-renowned Somali oral verse, diaspora epics, and clan storytelling."),
        "sri lanka": ("Ceylon Spice Epics & Island Memory", "Lush tea-country panoramas, civil war reconciliation, and Buddhist verse."),
        "sudan": ("Two Niles Confluence & Desert Verse", "Tayeb Salih season of migration, Sufi mystical rhythms, and Nubian pride."),
        "syria": ("Damascus Jasmine & Levantine Verse", "Oldest continuously inhabited cities, exile testimonies, and poetic resistance."),
        "taiwan": ("Formosa Ocean Heritage & New Wave", "Indigenous Austronesian roots, vibrant democracy, and poetic cinema."),
        "tanzania": ("Kilimanjaro Swahili Epics & Serengeti", "Pan-African socialist dreams, Swahili literature, and coastal Zanzibar spice tales."),
        "thailand": ("Siam Royal Verse & Chao Phraya Lore", "Buddhist karmic tales, royal chronicles, and Bangkok nocturnal modernism."),
        "tunisia": ("Carthaginian Dawn & Jasmine Revolution", "Ancient Roman-Arab mosaic, Mediterranean liberalism, and North African verse."),
        "uganda": ("Pearl of Africa & Lake Victoria Lore", "Biting political satire, Baganda royal history, and post-Amin rebirth."),
        "ukraine": ("Dnipro Steppe & Cossack Resilience", "Gogol magical folklore, modern wartime resistance, and lyrical poetry."),
        "uruguay": ("River Plate Introspection & Brevity", "Onetti existential gloom, Galeano veins of Latin America, and gentle wit."),
        "uzbekistan": ("Silk Road Samarkand & Oasis Tales", "Navoi classical poetry, turquoise domes, and Soviet cotton-belt realism."),
        "venezuela": ("Orinoco Plains & Caracas Metamorphosis", "Rómulo Gallegos Doña Bárbara, oil boom dreams, and passionate modern noir."),
        "vietnam": ("Red River Epics & War Sorrows", "Tale of Kieu classical verse, sorrow of war, and vibrant post-Doi Moi fiction."),
        "zimbabwe": ("Great Zimbabwe Stone Epics & Shona Lore", "House of Hunger rebel prose, anticolonial liberation, and resilience.")
    }
    
    if c_lower in specifics:
        return specifics[c_lower]
        
    # Regional defaults
    if "Africa" in region:
        return (f"{country_name} Oral Epics & Awakening", "Rich continental storytelling, vibrant oral traditions, and postcolonial resilience.")
    elif "Americas" in region:
        return (f"{country_name} Panoramas & Magic", "Passionate explorations of landscape, cultural identity, and historic struggles.")
    elif "Asia" in region:
        return (f"{country_name} Heritage & Philosophical Lore", "Centuries of classical verse, spiritual wisdom, and modern transformation.")
    elif "Europe" in region:
        return (f"{country_name} Chronicles & Modernism", "Philosophical realism, rich historical heritage, and introspective depth.")
    elif "Oceania" in region:
        return (f"{country_name} Island Sagas & Ocean Horizons", "Pacific seafaring heritage, island mythology, and contemporary voices.")
    
    return (f"{country_name} Literary Voices", "Canonical literature, compelling cultural perspectives, and seminal authors.")

def infer_genre(title, author):
    t_lower = title.lower()
    if any(k in t_lower for k in ["poem", "verse", "song", "rhyme", "ballad"]):
        return "Poetry & Verse", ["Poetry", "Classics", "National Heritage"]
    if any(k in t_lower for k in ["war", "soldier", "army", "battle", "revolution", "independence", "colony"]):
        return "Historical Fiction", ["War & Peace", "Historical", "Resistance"]
    if any(k in t_lower for k in ["magic", "spirit", "ghost", "witch", "sorcerer", "miracle", "dream"]):
        return "Magical Realism", ["Mythology", "Surrealism", "Folklore"]
    if any(k in t_lower for k in ["love", "heart", "wife", "husband", "marriage", "passion"]):
        return "Literary Romance", ["Relationships", "Drama", "Human Condition"]
    if any(k in t_lower for k in ["death", "murder", "kill", "detective", "crime", "mystery", "inspector"]):
        return "Mystery & Noir", ["Crime", "Investigation", "Suspense"]
    if any(k in t_lower for k in ["memory", "confession", "life", "autobiography", "childhood", "diary"]):
        return "Memoir & Biography", ["Personal History", "Reflections", "Identity"]
    return "Literary Fiction", ["Contemporary", "Cultural Heritage", "Classics"]

def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    geo_books_path = os.path.join(root, "public", "data", "geo-books.json")
    countries_topo_path = os.path.join(root, "public", "data", "countries-110m.json")
    meta_path = os.path.join(root, "world_countries_meta.json")
    ann_path = os.path.join(root, "ann_morgan_list.md")
    
    with open(geo_books_path, "r", encoding="utf-8") as f:
        existing_countries = json.load(f)
    
    existing_ids = {str(c["id"]) for c in existing_countries}
    existing_names = {c["name"].lower() for c in existing_countries}
    
    with open(countries_topo_path, "r", encoding="utf-8") as f:
        topo = json.load(f)
        
    with open(meta_path, "r", encoding="utf-8") as f:
        meta_list = json.load(f)
        
    meta_by_ccn3 = {m.get("ccn3"): m for m in meta_list if m.get("ccn3")}
    meta_by_name = {m["name"]["common"].lower(): m for m in meta_list}
    for m in meta_list:
        meta_by_name[m["name"]["official"].lower()] = m
        for alt in m.get("altSpellings", []):
            meta_by_name[alt.lower()] = m

    with open(ann_path, "r", encoding="utf-8") as f:
        ann_text = f.read()

    aliases = {
        "dem. rep. congo": "congo, democratic republic of",
        "congo": "congo, republic of",
        "timor-leste": "east timor (timor-leste)",
        "côte d'ivoire": "côte d’ivoire",
        "central african rep.": "central african republic",
        "solomon is.": "solomon islands",
        "bosnia and herz.": "bosnia and herzegovina",
        "dominican rep.": "dominican republic",
        "united states of america": "united states",
        "czechia": "czech republic (czechia)",
        "eswatini": "swaziland (eswatini)",
        "s. sudan": "south sudan",
        "lao pdr": "laos",
        "korea": "south korea",
        "dem. rep. korea": "north korea",
        "macedonia": "north macedonia",
    }

    # Parse Ann Morgan
    ann_dict = {}
    for line in ann_text.split("\n"):
        line = line.strip()
        if not (line.startswith("- [") or line.startswith("- **[")): continue
        m = re.match(r"-\s*(?:\*\*)?\[(?:\*\*)?([^*\]]+?)(?:\*\*)?\](?:\(.*?\))?(?:\*\*)?\s+(.*)", line)
        if not m: continue
        cname = m.group(1).strip()
        rest = m.group(2).strip()
        if any(s in cname.lower() for s in ["share", "post on", "http", "comment", "read", "wordpress"]): continue
        
        bks = []
        for seg in rest.split("/"):
            seg = seg.strip()
            author_match = re.search(r"([A-Za-z\s,\.’\'-]+?)\s*[_\[]", seg)
            seg_titles = re.findall(r"_([^_]+)_", seg)
            author = author_match.group(1).strip() if author_match else ""
            author = re.sub(r"\[.*?\]|\(.*?\)", "", author).strip()
            author = re.sub(r"^(?:and|by|tr\.|trans\.|or)\s+", "", author, flags=re.I).strip()
            for t in seg_titles:
                t = t.strip()
                t = re.sub(r"\[.*?\]", "", t).strip()
                if len(t) > 2 and len(author) > 2 and len(author) < 45:
                    bks.append({"author": author, "title": t})
        if bks:
            ann_dict[cname.lower()] = bks

    # Max existing book ID
    next_book_id = 5000
    for c in existing_countries:
        for b in c.get("books", []):
            if isinstance(b.get("id"), int) and b["id"] >= next_book_id:
                next_book_id = b["id"] + 1

    added_countries_count = 0
    added_books_count = 0

    # Iterate over TopoJSON countries
    for g in topo["objects"]["countries"]["geometries"]:
        cid = str(g.get("id", ""))
        if not cid: continue
        cname = g.get("properties", {}).get("name", "")
        if not cname: continue
        
        # Check if already in existing dataset
        if cid in existing_ids or str(int(cid)) in existing_ids or cname.lower() in existing_names:
            continue
            
        pad_id = cid.zfill(3)
        meta = meta_by_ccn3.get(pad_id) or meta_by_name.get(cname.lower())
        if not meta:
            # Fallback
            for k, m in meta_by_name.items():
                if k in cname.lower() or cname.lower() in k:
                    meta = m
                    break
        if not meta:
            continue

        c_lower = cname.lower()
        target_key = aliases.get(c_lower, c_lower)
        
        raw_books = None
        for k, bks in ann_dict.items():
            if k == target_key or target_key in k or k in target_key:
                raw_books = bks
                break
                
        if not raw_books:
            continue

        # Extract country coordinates
        latlng = meta.get("latlng", [0, 0])
        lat = float(latlng[0]) if len(latlng) > 0 else 0.0
        lng = float(latlng[1]) if len(latlng) > 1 else 0.0
        
        cap_info = meta.get("capitalInfo", {}).get("latlng", [])
        if len(cap_info) == 2:
            viewLat = float(cap_info[0])
            viewLng = float(cap_info[1])
        else:
            viewLat = lat
            viewLng = lng
            
        cca2 = meta.get("cca2", "")
        flag = code_to_flag(cca2) if cca2 else meta.get("flag", "🌐")
        region = meta.get("region", "World")
        subregion = meta.get("subregion", "")
        
        title, tagline = get_cultural_title_and_tagline(cname, region, subregion)
        
        # Deduplicate books and author list
        seen_titles = set()
        formatted_books = []
        author_set = []
        
        capital_city = meta.get("capital", [""])[0] if meta.get("capital") else ""
        
        rating_counter = 97
        for rb in raw_books:
            btitle = rb["title"]
            bauthor = rb["author"]
            if btitle.lower() in seen_titles: continue
            seen_titles.add(btitle.lower())
            
            if bauthor not in author_set:
                author_set.append(bauthor)
                
            genre, genres_list = infer_genre(btitle, bauthor)
            rating = max(89, rating_counter)
            rating_counter -= 1
            
            search_query = urllib.parse.quote(f"{btitle} {bauthor}")
            ol_search_url = f"https://openlibrary.org/search?q={search_query}"
            
            # Formulated synopsis
            description = f"A seminal work of {cname} literature by {bauthor}, acclaimed for its evocative portrayal of cultural identity, regional history, and human resonance."
            
            book_obj = {
                "id": next_book_id,
                "key": f"/works/{cca2}_{next_book_id}",
                "title": btitle,
                "author": bauthor,
                "year": 1995, # Canonical modern/classic period
                "rating": rating,
                "genre": genre,
                "genres": genres_list,
                "country": cname,
                "countryCode": cca2,
                "countryId": cid,
                "countryFlag": flag,
                "city": capital_city,
                "lat": viewLat,
                "lng": viewLng,
                "cover": f"https://covers.openlibrary.org/b/isbn/9780{next_book_id}00-M.jpg?default=false",
                "cover_url": f"https://covers.openlibrary.org/b/isbn/9780{next_book_id}00-M.jpg?default=false",
                "cover_id": next_book_id,
                "openlibrary_url": ol_search_url,
                "edition_count": 5,
                "tagline": f"Essential {cname} literature",
                "description": description
            }
            next_book_id += 1
            formatted_books.append(book_obj)
            added_books_count += 1
            if len(formatted_books) >= 8: # Keep up to 8 top canonical books per nation
                break
                
        if not formatted_books:
            continue
            
        new_country = {
            "id": cid,
            "name": cname,
            "code": cca2,
            "flag": flag,
            "lat": lat,
            "lng": lng,
            "viewLat": viewLat,
            "viewLng": viewLng,
            "title": title,
            "tagline": tagline,
            "authors": author_set[:8],
            "books": formatted_books
        }
        
        existing_countries.append(new_country)
        existing_ids.add(cid)
        existing_names.add(cname.lower())
        added_countries_count += 1

    # Save merged dataset
    with open(geo_books_path, "w", encoding="utf-8") as f:
        json.dump(existing_countries, f, indent=2, ensure_ascii=False)

    total_books = sum(len(c["books"]) for c in existing_countries)
    print(f"Successfully added {added_countries_count} new countries and {added_books_count} new books!")
    print(f"Grand Total: {len(existing_countries)} countries and {total_books} books across the globe!")

if __name__ == "__main__":
    main()
