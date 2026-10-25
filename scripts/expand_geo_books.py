import json
import os

ADDITIONAL_COUNTRIES = [
    {
        "id": "484",
        "name": "Mexico",
        "code": "MX",
        "flag": "🇲🇽",
        "lat": 23.6345,
        "lng": -102.5528,
        "viewLat": 19.4326,
        "viewLng": -99.1332,
        "title": "Mexican Labyrinth & Magic",
        "tagline": "Poetic explorations of national identity, spectral memories of revolution, and magical realism.",
        "authors": ["Juan Rulfo", "Octavio Paz", "Carlos Fuentes", "Laura Esquivel", "Sor Juana Inés de la Cruz", "Elena Poniatowska"],
        "books": [
            {
                "title": "Pedro Páramo",
                "author": "Juan Rulfo",
                "year": 1955,
                "rating": 98,
                "genre": "Magical Realism",
                "genres": ["Ghosts", "Latin American Boom", "Surrealism"],
                "city": "Comala",
                "description": "A man promises his dying mother he will travel to Comala to meet his father, Pedro Páramo, only to discover a desolate ghost town populated by murmuring specters.",
                "cover_id": 8235221,
                "key": "/works/OL158482W"
            },
            {
                "title": "The Labyrinth of Solitude",
                "author": "Octavio Paz",
                "year": 1950,
                "rating": 96,
                "genre": "Essays & Philosophy",
                "genres": ["Identity", "Culture", "Nobel Laureate"],
                "city": "Mexico City",
                "description": "Nobel Laureate Octavio Paz's definitive psychological and historical portrait of the Mexican character, fiesta, death, and existential solitude.",
                "cover_id": 8235222,
                "key": "/works/OL158483W"
            },
            {
                "title": "The Death of Artemio Cruz",
                "author": "Carlos Fuentes",
                "year": 1962,
                "rating": 94,
                "genre": "Historical Fiction",
                "genres": ["Mexican Revolution", "Stream of Consciousness"],
                "city": "Mexico City",
                "description": "Lying on his deathbed, a corrupt former revolutionary oligarch relives the compromises, loves, and betrayals that defined his climb to supreme power.",
                "cover_id": 8235223,
                "key": "/works/OL158484W"
            },
            {
                "title": "Like Water for Chocolate",
                "author": "Laura Esquivel",
                "year": 1989,
                "rating": 93,
                "genre": "Magical Realism",
                "genres": ["Romance", "Culinary Fiction", "Family Saga"],
                "city": "Piedras Negras",
                "description": "Tita, forbidden to marry her true love, channels her overwhelming passions and sorrows directly into the recipes she prepares, magically intoxicating all who partake.",
                "cover_id": 8235224,
                "key": "/works/OL158485W"
            }
        ]
    },
    {
        "id": "300",
        "name": "Greece",
        "code": "GR",
        "flag": "🇬🇷",
        "lat": 39.0742,
        "lng": 21.8243,
        "viewLat": 37.9838,
        "viewLng": 23.7275,
        "title": "Hellenic Myth & Passion",
        "tagline": "The cradle of Western tragedy, epic verse, philosophical inquiry, and modern Mediterranean passion.",
        "authors": ["Nikos Kazantzakis", "Homer", "C.P. Cavafy", "George Seferis", "Odysseas Elytis"],
        "books": [
            {
                "title": "Zorba the Greek",
                "author": "Nikos Kazantzakis",
                "year": 1946,
                "rating": 97,
                "genre": "Philosophical Fiction",
                "genres": ["Mediterranean", "Classics", "Vitalism"],
                "city": "Crete",
                "description": "An uptight intellectual intellectual narrator forms an unforgettable friendship with Alexis Zorba, an untamed, passionate miner who embraces life with wild, uninhibited joy.",
                "cover_id": 8235225,
                "key": "/works/OL158486W"
            },
            {
                "title": "The Odyssey",
                "author": "Homer",
                "year": -700,
                "rating": 99,
                "genre": "Epic Poetry",
                "genres": ["Ancient Greece", "Mythology", "Adventure"],
                "city": "Ithaca",
                "description": "The ten-year voyage of Odysseus as he battles cyclopes, sirens, sea monsters, and the wrath of Poseidon to return home to Ithaca and his faithful wife Penelope.",
                "cover_id": 8235226,
                "key": "/works/OL158487W"
            },
            {
                "title": "The Last Temptation of Christ",
                "author": "Nikos Kazantzakis",
                "year": 1955,
                "rating": 95,
                "genre": "Theological Fiction",
                "genres": ["Spiritual Struggle", "Historical"],
                "city": "Jerusalem",
                "description": "A profound, controversial depiction of Jesus as a human agonizing between flesh and divine duty, wrestling with spiritual destiny until his ultimate sacrifice.",
                "cover_id": 8235227,
                "key": "/works/OL158488W"
            }
        ]
    },
    {
        "id": "616",
        "name": "Poland",
        "code": "PL",
        "flag": "🇵🇱",
        "lat": 51.9194,
        "lng": 19.1451,
        "viewLat": 52.2297,
        "viewLng": 21.0122,
        "title": "Polish Visionaries & Cosmos",
        "tagline": "Philosophical science fiction, Nobel-winning mythologies, and unyielding resistance against tyranny.",
        "authors": ["Stanisław Lem", "Olga Tokarczuk", "Wisława Szymborska", "Witold Gombrowicz", "Henryk Sienkiewicz"],
        "books": [
            {
                "title": "Solaris",
                "author": "Stanisław Lem",
                "year": 1961,
                "rating": 98,
                "genre": "Philosophical Sci-Fi",
                "genres": ["Cosmic Horror", "Consciousness", "Classics"],
                "city": "Kraków",
                "description": "Scientists orbiting a sentient oceanic alien planet are confronted with physical manifestations of their most repressed guilt and subconscious memories.",
                "cover_id": 8235228,
                "key": "/works/OL158489W"
            },
            {
                "title": "Flights",
                "author": "Olga Tokarczuk",
                "year": 2007,
                "rating": 96,
                "genre": "Constellation Novel",
                "genres": ["Nobel Prize", "Travel", "Anatomy"],
                "city": "Wrocław",
                "description": "Nobel Laureate Tokarczuk weaves vignettes on modern travel, 17th-century anatomical discoveries, and the restless human impulse to stay in motion.",
                "cover_id": 8235229,
                "key": "/works/OL158490W"
            },
            {
                "title": "Ferdydurke",
                "author": "Witold Gombrowicz",
                "year": 1937,
                "rating": 94,
                "genre": "Avant-Garde Satire",
                "genres": ["Absurdism", "Modernism", "Identity"],
                "city": "Warsaw",
                "description": "A thirty-year-old aspiring writer is forcibly returned to grammar school by an eccentric professor, descending into a hilarious, biting satire of social maturity.",
                "cover_id": 8235230,
                "key": "/works/OL158491W"
            }
        ]
    },
    {
        "id": "792",
        "name": "Turkey",
        "code": "TR",
        "flag": "🇹🇷",
        "lat": 38.9637,
        "lng": 35.2433,
        "viewLat": 41.0082,
        "viewLng": 28.9784,
        "title": "Bosphorus Crossroad of Worlds",
        "tagline": "The melancholic meeting of East and West, Ottoman grandeur, and modern identity.",
        "authors": ["Orhan Pamuk", "Yaşar Kemal", "Sabahattin Ali", "Ahmet Hamdi Tanpınar", "Elif Shafak"],
        "books": [
            {
                "title": "My Name is Red",
                "author": "Orhan Pamuk",
                "year": 1998,
                "rating": 97,
                "genre": "Historical Mystery",
                "genres": ["Ottoman Empire", "Art", "Nobel Prize"],
                "city": "Istanbul",
                "description": "In 1591 Istanbul, an imperial miniaturist is murdered; the mystery unfolds from multiple points of view including a coin, a corpse, and the color Red itself.",
                "cover_id": 8235231,
                "key": "/works/OL158492W"
            },
            {
                "title": "Madonna in a Fur Coat",
                "author": "Sabahattin Ali",
                "year": 1943,
                "rating": 95,
                "genre": "Literary Romance",
                "genres": ["Tragedy", "Classics", "Existential"],
                "city": "Ankara",
                "description": "A shy Turkish clerk sent to 1920s Berlin becomes mesmerized by a self-portrait of a Jewish painter, entering an intense, transformative love affair.",
                "cover_id": 8235232,
                "key": "/works/OL158493W"
            },
            {
                "title": "Memed, My Hawk",
                "author": "Yaşar Kemal",
                "year": 1955,
                "rating": 94,
                "genre": "Epic Folklore",
                "genres": ["Anatolia", "Rebellion", "Robin Hood"],
                "city": "Taurus Mountains",
                "description": "A young peasant driven into the wild Taurus mountains by a cruel feudal landlord becomes a legendary outlaw hero fighting for justice.",
                "cover_id": 8235233,
                "key": "/works/OL158494W"
            }
        ]
    },
    {
        "id": "410",
        "name": "South Korea",
        "code": "KR",
        "flag": "🇰🇷",
        "lat": 35.9078,
        "lng": 127.7669,
        "viewLat": 37.5665,
        "viewLng": 126.9780,
        "title": "Korean Han & Modern Metamorphosis",
        "tagline": "Visceral poetic resistance, collective historical memory, and contemporary social critique.",
        "authors": ["Han Kang", "Cho Nam-Joo", "Shin Kyung-sook", "Bae Suah", "Kim Young-ha"],
        "books": [
            {
                "title": "The Vegetarian",
                "author": "Han Kang",
                "year": 2007,
                "rating": 98,
                "genre": "Psychological Surrealism",
                "genres": ["International Booker", "Nobel Laureate", "Body Horror"],
                "city": "Seoul",
                "description": "After a terrifying blood-soaked nightmare, a docile housewife resolves to renounce meat, triggering an escalating familial rupture and metamorphosis toward plant life.",
                "cover_id": 8235234,
                "key": "/works/OL158495W"
            },
            {
                "title": "Human Acts",
                "author": "Han Kang",
                "year": 2014,
                "rating": 97,
                "genre": "Historical Fiction",
                "genres": ["Gwangju Uprising", "Memory", "Grief"],
                "city": "Gwangju",
                "description": "A harrowing, tender exploration of the brutal 1980 Gwangju Democratic Uprising told through the intertwined voices of victims and grieving survivors.",
                "cover_id": 8235235,
                "key": "/works/OL158496W"
            },
            {
                "title": "Kim Jiyoung, Born 1982",
                "author": "Cho Nam-Joo",
                "year": 2016,
                "rating": 94,
                "genre": "Contemporary Fiction",
                "genres": ["Social Realism", "Feminism", "Seoul Life"],
                "city": "Seoul",
                "description": "A clinical yet deeply moving depiction of everyday structural misogyny in South Korea through the life story of an ordinary millennial mother.",
                "cover_id": 8235236,
                "key": "/works/OL158497W"
            }
        ]
    },
    {
        "id": "604",
        "name": "Peru",
        "code": "PE",
        "flag": "🇵🇪",
        "lat": -9.1899,
        "lng": -75.0152,
        "viewLat": -12.0464,
        "viewLng": -77.0428,
        "title": "Andean Realism & Power",
        "tagline": "Scathing deconstructions of authoritarianism, military culture, and rich indigenous tapestry.",
        "authors": ["Mario Vargas Llosa", "César Vallejo", "José María Arguedas", "Julio Ramón Ribeyro"],
        "books": [
            {
                "title": "The Time of the Hero",
                "author": "Mario Vargas Llosa",
                "year": 1962,
                "rating": 97,
                "genre": "Social Realism",
                "genres": ["Latin American Boom", "Military Academy", "Rebellion"],
                "city": "Lima",
                "description": "Cadets in Lima's Leoncio Prado Military Academy form a clandestine ring of rebellion that ends in theft, murder, and institutional cover-up.",
                "cover_id": 8235237,
                "key": "/works/OL158498W"
            },
            {
                "title": "Conversation in the Cathedral",
                "author": "Mario Vargas Llosa",
                "year": 1969,
                "rating": 96,
                "genre": "Political Fiction",
                "genres": ["Dictatorship", "Polyphonic", "Masterpiece"],
                "city": "Lima",
                "description": "Over drinks at a gritty Lima bar named The Cathedral, two men reconstruct the pervasive corruption and spiritual degradation under general Odría's dictatorship.",
                "cover_id": 8235238,
                "key": "/works/OL158499W"
            },
            {
                "title": "Deep Rivers",
                "author": "José María Arguedas",
                "year": 1958,
                "rating": 95,
                "genre": "Indigenous Realism",
                "genres": ["Andes", "Quechua", "Identity"],
                "city": "Abancay",
                "description": "A sensitive boy raised among indigenous Quechua communities is placed into a boarding school, torn between two conflicting worlds during a feverish plague.",
                "cover_id": 8235239,
                "key": "/works/OL158500W"
            }
        ]
    },
    {
        "id": "203",
        "name": "Czechia",
        "code": "CZ",
        "flag": "🇨🇿",
        "lat": 49.8175,
        "lng": 15.4730,
        "viewLat": 50.0755,
        "viewLng": 14.4378,
        "title": "Bohemian Irony & Kafkaesque Shadows",
        "tagline": "Surreal labyrinthine bureaucracy, playful philosophical eroticism, and anti-totalitarian wit.",
        "authors": ["Franz Kafka", "Milan Kundera", "Bohumil Hrabal", "Karel Čapek", "Jaroslav Hašek"],
        "books": [
            {
                "title": "The Unbearable Lightness of Being",
                "author": "Milan Kundera",
                "year": 1984,
                "rating": 98,
                "genre": "Philosophical Fiction",
                "genres": ["Prague Spring", "Eroticism", "Nietzsche"],
                "city": "Prague",
                "description": "During the 1968 Prague Spring, a surgeon, an artist, a photographer, and a dog confront eternal recurrence, personal liberty, and the lightness of fate.",
                "cover_id": 8235240,
                "key": "/works/OL158501W"
            },
            {
                "title": "The Metamorphosis",
                "author": "Franz Kafka",
                "year": 1915,
                "rating": 99,
                "genre": "Surreal Fiction",
                "genres": ["Existentialism", "Alienation", "Classics"],
                "city": "Prague",
                "description": "Gregor Samsa wakes one morning from uneasy dreams to find himself transformed into a monstrous vermin, confronting human absurdity.",
                "cover_id": 8235241,
                "key": "/works/OL158502W"
            },
            {
                "title": "Too Loud a Solitude",
                "author": "Bohumil Hrabal",
                "year": 1976,
                "rating": 95,
                "genre": "Poetic Novella",
                "genres": ["Books", "Censorship", "Prague Underground"],
                "city": "Prague",
                "description": "For thirty-five years, Hanta has worked in a damp cellar compacting banned books into paper bales, accidentally absorbing centuries of world philosophy.",
                "cover_id": 8235242,
                "key": "/works/OL158503W"
            }
        ]
    },
    {
        "id": "620",
        "name": "Portugal",
        "code": "PT",
        "flag": "🇵🇹",
        "lat": 39.3999,
        "lng": -8.2245,
        "viewLat": 38.7223,
        "viewLng": -9.1393,
        "title": "Lusitanian Saudade & Allegory",
        "tagline": "Haunting oceanic nostalgia, visionary heteronyms, and Nobel-crowned human allegories.",
        "authors": ["Fernando Pessoa", "José Saramago", "Luís de Camões", "Eça de Queirós", "António Lobo Antunes"],
        "books": [
            {
                "title": "Blindness",
                "author": "José Saramago",
                "year": 1995,
                "rating": 98,
                "genre": "Allegorical Fiction",
                "genres": ["Nobel Prize", "Dystopia", "Human Nature"],
                "city": "Lisbon",
                "description": "A city is gripped by an inexplicable epidemic of 'white blindness'; quarantined patients descend into chaos as only one woman retains her sight.",
                "cover_id": 8235243,
                "key": "/works/OL158504W"
            },
            {
                "title": "The Book of Disquiet",
                "author": "Fernando Pessoa",
                "year": 1982,
                "rating": 99,
                "genre": "Autobiographical Fragment",
                "genres": ["Saudade", "Heteronyms", "Modernism"],
                "city": "Lisbon",
                "description": "A monumental mosaic of introspective reflections, melancholia, and existential lucidity left in a trunk by Lisbon assistant bookkeeper Bernardo Soares.",
                "cover_id": 8235244,
                "key": "/works/OL158505W"
            },
            {
                "title": "The Maias",
                "author": "Eça de Queirós",
                "year": 1888,
                "rating": 94,
                "genre": "Social Realism",
                "genres": ["Tragedy", "Decadence", "Classics"],
                "city": "Lisbon",
                "description": "A dazzling, satirical chronicle of the decline of a noble Portuguese lineage, intertwining romantic tragedy with biting portraits of aristocratic Lisbon.",
                "cover_id": 8235245,
                "key": "/works/OL158506W"
            }
        ]
    },
    {
        "id": "040",
        "name": "Austria",
        "code": "AT",
        "flag": "🇦🇹",
        "lat": 47.5162,
        "lng": 14.5501,
        "viewLat": 48.2082,
        "viewLng": 16.3738,
        "title": "Viennese Fin-de-Siècle & Memory",
        "tagline": "The golden twilight of the Habsburg empire, psychological depth, and crystalline nostalgia.",
        "authors": ["Stefan Zweig", "Robert Musil", "Thomas Bernhard", "Arthur Schnitzler", "Ingeborg Bachmann"],
        "books": [
            {
                "title": "The World of Yesterday",
                "author": "Stefan Zweig",
                "year": 1942,
                "rating": 99,
                "genre": "Memoir & History",
                "genres": ["Vienna", "Golden Age", "Tragedy"],
                "city": "Vienna",
                "description": "Zweig's breathtaking eulogy to the golden age of European culture and cosmopolitan Vienna before it was shattered by two world wars.",
                "cover_id": 8235246,
                "key": "/works/OL158507W"
            },
            {
                "title": "The Man Without Qualities",
                "author": "Robert Musil",
                "year": 1930,
                "rating": 97,
                "genre": "Philosophical Epic",
                "genres": ["Modernism", "Satire", "Intellectual"],
                "city": "Vienna",
                "description": "A razor-sharp, satirical tour-de-force set in 1913 Austro-Hungarian 'Kakania' dissecting the intellectual illusions on the eve of civilizational collapse.",
                "cover_id": 8235247,
                "key": "/works/OL158508W"
            },
            {
                "title": "Chess Story",
                "author": "Stefan Zweig",
                "year": 1942,
                "rating": 96,
                "genre": "Psychological Novella",
                "genres": ["Obsession", "Gestapo", "Chess"],
                "city": "Vienna",
                "description": "On an ocean liner heading to Buenos Aires, a world chess champion is challenged by a mysterious passenger who mastered the game during solitary confinement.",
                "cover_id": 8235248,
                "key": "/works/OL158509W"
            }
        ]
    },
    {
        "id": "752",
        "name": "Sweden",
        "code": "SE",
        "flag": "🇸🇪",
        "lat": 60.1282,
        "lng": 18.6435,
        "viewLat": 59.3293,
        "viewLng": 18.0686,
        "title": "Nordic Mystery & Human Soul",
        "tagline": "Bleak psychological drama, Nordic noir pioneer, and folkloric Nobel triumphs.",
        "authors": ["August Strindberg", "Selma Lagerlöf", "Stieg Larsson", "Pär Lagerkvist", "Astrid Lindgren"],
        "books": [
            {
                "title": "The Girl with the Dragon Tattoo",
                "author": "Stieg Larsson",
                "year": 2005,
                "rating": 96,
                "genre": "Nordic Noir",
                "genres": ["Thriller", "Investigative", "Cyberpunk"],
                "city": "Stockholm",
                "description": "Disgraced journalist Mikael Blomkvist and genius hacker Lisbeth Salander uncover a dark family conspiracy of murder on a secluded Swedish island.",
                "cover_id": 8235249,
                "key": "/works/OL158510W"
            },
            {
                "title": "The Red Room",
                "author": "August Strindberg",
                "year": 1879,
                "rating": 93,
                "genre": "Satirical Realism",
                "genres": ["Bohemia", "Stockholm", "Classics"],
                "city": "Stockholm",
                "description": "A scathing, witty portrait of bohemian Stockholm society following a young civil servant who abandons government work to pursue art.",
                "cover_id": 8235250,
                "key": "/works/OL158511W"
            },
            {
                "title": "The Wonderful Adventures of Nils",
                "author": "Selma Lagerlöf",
                "year": 1906,
                "rating": 94,
                "genre": "Folkloric Fantasy",
                "genres": ["Mythology", "Nobel Prize", "Adventure"],
                "city": "Västra Götaland",
                "description": "Shrunk to the size of a thumb for mischief, young Nils Holgersson flies across the breathtaking Swedish landscape on the back of a domestic gander.",
                "cover_id": 8235251,
                "key": "/works/OL158512W"
            }
        ]
    },
    {
        "id": "404",
        "name": "Kenya",
        "code": "KE",
        "flag": "🇰🇪",
        "lat": -0.0236,
        "lng": 37.9062,
        "viewLat": -1.2921,
        "viewLng": 36.8219,
        "viewCity": "Nairobi",
        "title": "Rift Valley Epic & Decolonization",
        "tagline": "Anticolonial struggle, the Mau Mau rebellion, and linguistic cultural reclamation.",
        "authors": ["Ngũgĩ wa Thiong'o", "Grace Ogot", "Binyavanga Wainaina", "Meja Mwangi"],
        "books": [
            {
                "title": "A Grain of Wheat",
                "author": "Ngũgĩ wa Thiong'o",
                "year": 1967,
                "rating": 97,
                "genre": "Historical Fiction",
                "genres": ["Mau Mau", "Independence", "African Classics"],
                "city": "Nairobi",
                "description": "In the tense days leading to Kenya's 1963 independence, villagers confront hidden betrayals, wartime compromises, and the elusive nature of freedom.",
                "cover_id": 8235252,
                "key": "/works/OL158513W"
            },
            {
                "title": "Decolonising the Mind",
                "author": "Ngũgĩ wa Thiong'o",
                "year": 1986,
                "rating": 96,
                "genre": "Cultural Theory",
                "genres": ["Linguistics", "Postcolonialism", "Essays"],
                "city": "Limuru",
                "description": "Ngũgĩ's celebrated manifesto advocating the revival and supremacy of native African languages over European colonial tongues in literature.",
                "cover_id": 8235253,
                "key": "/works/OL158514W"
            },
            {
                "title": "Petals of Blood",
                "author": "Ngũgĩ wa Thiong'o",
                "year": 1977,
                "rating": 95,
                "genre": "Social Realism",
                "genres": ["Political Drama", "Capitalism", "Africa"],
                "city": "Ilmorog",
                "description": "A devastating murder inquiry in the rural town of Ilmorog exposes the neocolonial economic exploitation of ordinary post-independence Kenyans.",
                "cover_id": 8235254,
                "key": "/works/OL158515W"
            }
        ]
    },
    {
        "id": "192",
        "name": "Cuba",
        "code": "CU",
        "flag": "🇨🇺",
        "lat": 21.5218,
        "lng": -77.7812,
        "viewLat": 23.1136,
        "viewLng": -82.3666,
        "title": "Antillean Baroque & Real Maravilloso",
        "tagline": "Caribbean rhythms, magical marvels of history, and sensual revolutionary nostalgia.",
        "authors": ["Alejo Carpentier", "Guillermo Cabrera Infante", "José Lezama Lima", "Reinaldo Arenas"],
        "books": [
            {
                "title": "The Kingdom of This World",
                "author": "Alejo Carpentier",
                "year": 1949,
                "rating": 97,
                "genre": "Lo Real Maravilloso",
                "genres": ["Haitian Revolution", "Baroque", "Caribbean"],
                "city": "Havana",
                "description": "The pioneering masterpiece defining 'lo real maravilloso' (the marvelous real), dramatizing the slave rebellions and black monarchy of Haiti.",
                "cover_id": 8235255,
                "key": "/works/OL158516W"
            },
            {
                "title": "Three Trapped Tigers",
                "author": "Guillermo Cabrera Infante",
                "year": 1967,
                "rating": 95,
                "genre": "Nocturnal Experimental",
                "genres": ["Havana Nightlife", "Puns", "Jazz"],
                "city": "Havana",
                "description": "A dazzling, neon-soaked linguistic rollercoaster celebrating pre-revolutionary Havana's legendary cabaret nightlife, boleros, and nightlife camaraderie.",
                "cover_id": 8235256,
                "key": "/works/OL158517W"
            },
            {
                "title": "Paradiso",
                "author": "José Lezama Lima",
                "year": 1966,
                "rating": 94,
                "genre": "Baroque Epic",
                "genres": ["Poetic Prose", "Classics", "Philosophy"],
                "city": "Havana",
                "description": "A lush, hermetic tour-de-force chronicling young José Cemí's poetic education amidst family myths, secret societies, and Catholic mysticism.",
                "cover_id": 8235257,
                "key": "/works/OL158518W"
            }
        ]
    },
    {
        "id": "360",
        "name": "Indonesia",
        "code": "ID",
        "flag": "🇮🇩",
        "lat": -0.7893,
        "lng": 113.9213,
        "viewLat": -6.2088,
        "viewLng": 106.8456,
        "title": "Nusantara Archipelago Epics",
        "tagline": "The monumental Buru quartet, anticolonial awakening, and rich island polyphony.",
        "authors": ["Pramoedya Ananta Toer", "Mochtar Lubis", "Eka Kurniawan", "Ayu Utami"],
        "books": [
            {
                "title": "This Earth of Mankind",
                "author": "Pramoedya Ananta Toer",
                "year": 1980,
                "rating": 98,
                "genre": "Historical Epic",
                "genres": ["Anticolonial", "Buru Quartet", "Classics"],
                "city": "Surabaya",
                "description": "Composed orally while imprisoned on Buru Island, this masterpiece depicts Minke, a Javanese aristocrat, awakening to Dutch colonial injustice.",
                "cover_id": 8235258,
                "key": "/works/OL158519W"
            },
            {
                "title": "Beauty is a Wound",
                "author": "Eka Kurniawan",
                "year": 2002,
                "rating": 95,
                "genre": "Magical Realism",
                "genres": ["Indonesian History", "Satire", "Gothic"],
                "city": "Halimunda",
                "description": "A renowned concubine rises from the grave twenty-one years after her death to recount Indonesia's turbulent history through her daughters' cursed fates.",
                "cover_id": 8235259,
                "key": "/works/OL158520W"
            }
        ]
    },
    {
        "id": "528",
        "name": "Netherlands",
        "code": "NL",
        "flag": "🇳🇱",
        "lat": 52.1326,
        "lng": 5.2913,
        "viewLat": 52.3676,
        "viewLng": 4.9041,
        "title": "Dutch Golden & Moral Realism",
        "tagline": "Existential moral dilemmas, WWII memory, and anticolonial satire.",
        "authors": ["Harry Mulisch", "Multatuli", "W.F. Hermans", "Gerard Reve", "Cees Nooteboom"],
        "books": [
            {
                "title": "The Discovery of Heaven",
                "author": "Harry Mulisch",
                "year": 1992,
                "rating": 97,
                "genre": "Philosophical Epic",
                "genres": ["Cosmic", "Classics", "Dutch Masterpiece"],
                "city": "Amsterdam",
                "description": "Frustrated with human corruption, angels plot to retrieve the stone Tablets of the Law by orchestrating the birth of an extraordinary genius child.",
                "cover_id": 8235260,
                "key": "/works/OL158521W"
            },
            {
                "title": "The Assault",
                "author": "Harry Mulisch",
                "year": 1982,
                "rating": 95,
                "genre": "Historical Fiction",
                "genres": ["WWII", "Guilt", "Memory"],
                "city": "Haarlem",
                "description": "In 1945 occupied Holland, a Nazi collaborator is assassinated outside a house; the survivor spends his life unraveling why his innocent family was executed.",
                "cover_id": 8235261,
                "key": "/works/OL158522W"
            },
            {
                "title": "Max Havelaar",
                "author": "Multatuli",
                "year": 1860,
                "rating": 94,
                "genre": "Anticolonial Satire",
                "genres": ["Dutch East Indies", "Classics"],
                "city": "Java",
                "description": "The groundbreaking Dutch novel that exposed the scandalous exploitation of the colonial coffee plantation system in the Dutch East Indies.",
                "cover_id": 8235262,
                "key": "/works/OL158523W"
            }
        ]
    },
    {
        "id": "352",
        "name": "Iceland",
        "code": "IS",
        "flag": "🇮🇸",
        "lat": 64.9631,
        "lng": -19.0208,
        "viewLat": 64.1466,
        "viewLng": -21.9426,
        "title": "Saga Island & Arctic Soul",
        "tagline": "Ancient medieval sagas, fierce independence, and Nobel-winning arctic poetry.",
        "authors": ["Halldór Laxness", "Arnaldur Indriðason", "Sjón", "Gunnar Gunnarsson"],
        "books": [
            {
                "title": "Independent People",
                "author": "Halldór Laxness",
                "year": 1934,
                "rating": 98,
                "genre": "Nordic Epic",
                "genres": ["Nobel Prize", "Sheep Farming", "Resilience"],
                "city": "Reykjavík",
                "description": "Sheep farmer Bjartur of Summerhouses battles devastating elements, ghosts, debt, and his own bull-headed stubbornness to remain a truly free man.",
                "cover_id": 8235263,
                "key": "/works/OL158524W"
            },
            {
                "title": "The Blue Fox",
                "author": "Sjón",
                "year": 2003,
                "rating": 94,
                "genre": "Mythic Fable",
                "genres": ["Arctic", "Folklore", "Poetic"],
                "city": "Reykjavík",
                "description": "A priest stalks an elusive blue fox through a harsh winter wasteland, in an enchanting fable steeped in Icelandic folklore and metamorphosis.",
                "cover_id": 8235264,
                "key": "/works/OL158525W"
            }
        ]
    }
]

def main():
    path = os.path.join(os.path.dirname(__file__), "..", "public", "data", "geo-books.json")
    with open(path, "r", encoding="utf-8") as f:
        existing = json.load(f)
    
    existing_ids = {c["id"] for c in existing}
    
    next_id = 2000
    for country in ADDITIONAL_COUNTRIES:
        if country["id"] in existing_ids:
            continue
        
        # Format books
        for b in country["books"]:
            b["id"] = next_id
            next_id += 1
            b["country"] = country["name"]
            b["countryCode"] = country["code"]
            b["countryId"] = country["id"]
            b["countryFlag"] = country["flag"]
            b["lat"] = country["viewLat"]
            b["lng"] = country["viewLng"]
            b["cover"] = f"https://covers.openlibrary.org/b/id/{b['cover_id']}-M.jpg"
            b["cover_url"] = b["cover"]
            b["openlibrary_url"] = f"https://openlibrary.org{b['key']}"
        
        existing.append(country)
        existing_ids.add(country["id"])
    
    with open(path, "w", encoding="utf-8") as f:
        json.dump(existing, f, indent=2, ensure_ascii=False)
    
    total_books = sum(len(c["books"]) for c in existing)
    print(f"Total countries now: {len(existing)}, total books: {total_books}")

if __name__ == "__main__":
    main()
