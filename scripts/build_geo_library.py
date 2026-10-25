import json
import os
import urllib.request
import time

GEO_COUNTRIES = [
    {
        "id": "643",
        "name": "Russia",
        "code": "RU",
        "flag": "🇷🇺",
        "lat": 61.5240,
        "lng": 105.3188,
        "viewLat": 55.7558,
        "viewLng": 37.6173,  # Moscow
        "title": "Russian Golden & Silver Age",
        "tagline": "Profound philosophical realism, existential anguish, and the enigmatic Russian soul.",
        "authors": ["Fyodor Dostoevsky", "Leo Tolstoy", "Anton Chekhov", "Mikhail Bulgakov", "Vladimir Nabokov", "Alexander Pushkin", "Nikolai Gogol", "Boris Pasternak", "Aleksandr Solzhenitsyn", "Ivan Turgenev"],
        "books": [
            {
                "title": "Crime and Punishment",
                "author": "Fyodor Dostoevsky",
                "year": 1866,
                "rating": 97,
                "genre": "Psychological Fiction",
                "genres": ["Russian Realism", "Philosophical Fiction", "Classics"],
                "city": "Saint Petersburg",
                "description": "A destitute former student in Saint Petersburg formulates a theory of extraordinary men who are permitted to commit crimes, leading him to murder a pawnbroker and enter a harrowing mental descent.",
                "cover_id": 8231856,
                "key": "/works/OL39372W"
            },
            {
                "title": "The Brothers Karamazov",
                "author": "Fyodor Dostoevsky",
                "year": 1880,
                "rating": 99,
                "genre": "Philosophical Fiction",
                "genres": ["Russian Classics", "Theology", "Morality"],
                "city": "Staraya Russa",
                "description": "A passionate philosophical novel exploring faith, doubt, morality, and patricide through the tumultuous lives of three disparate brothers and their tyrannical father.",
                "cover_id": 8235118,
                "key": "/works/OL39369W"
            },
            {
                "title": "War and Peace",
                "author": "Leo Tolstoy",
                "year": 1869,
                "rating": 98,
                "genre": "Historical Fiction",
                "genres": ["Epic", "Russian History", "Napoleonic Wars"],
                "city": "Yasnaya Polyana",
                "description": "A monumental epic delineating Russian society during the Napoleonic invasion through the intertwined destinies of the aristocratic Bezukhov, Bolkonsky, and Rostov families.",
                "cover_id": 8228691,
                "key": "/works/OL26783W"
            },
            {
                "title": "Anna Karenina",
                "author": "Leo Tolstoy",
                "year": 1877,
                "rating": 96,
                "genre": "Literary Fiction",
                "genres": ["Tragedy", "Social Realism", "Classics"],
                "city": "Moscow",
                "description": "A sweeping panorama of 19th-century imperial Russian society contrasting the doomed romance of the aristocratic Anna with Levin's quest for rural spiritual contentment.",
                "cover_id": 8225261,
                "key": "/works/OL26782W"
            },
            {
                "title": "The Master and Margarita",
                "author": "Mikhail Bulgakov",
                "year": 1967,
                "rating": 98,
                "genre": "Magical Realism",
                "genres": ["Satire", "Soviet Literature", "Supernatural"],
                "city": "Moscow",
                "description": "The Devil arrives in atheistic 1930s Moscow with a talking black cat and a troupe of demonic performers, unleashing surreal chaos while interwoven with the trial of Pontius Pilate.",
                "cover_id": 8234851,
                "key": "/works/OL15183321W"
            },
            {
                "title": "The Idiot",
                "author": "Fyodor Dostoevsky",
                "year": 1869,
                "rating": 94,
                "genre": "Psychological Fiction",
                "genres": ["Tragedy", "Christianity", "Classics"],
                "city": "Saint Petersburg",
                "description": "Prince Myshkin, a gentle and saintly nobleman suffering from epilepsy, returns to decadent Saint Petersburg, where his purity is misinterpreted as idiocy.",
                "cover_id": 8235122,
                "key": "/works/OL39374W"
            },
            {
                "title": "Eugene Onegin",
                "author": "Alexander Pushkin",
                "year": 1833,
                "rating": 95,
                "genre": "Novel in Verse",
                "genres": ["Poetry", "Romanticism", "Russian Culture"],
                "city": "Saint Petersburg",
                "description": "The foundational masterpiece of Russian verse literature, chronicling a jaded young dandy who rejects the devoted love of Tatyana, only to realize his fatal error too late.",
                "cover_id": 8234972,
                "key": "/works/OL15264359W"
            },
            {
                "title": "Doctor Zhivago",
                "author": "Boris Pasternak",
                "year": 1957,
                "rating": 93,
                "genre": "Historical Romance",
                "genres": ["Russian Revolution", "Poetry", "Tragedy"],
                "city": "Moscow",
                "description": "The epic story of physician and poet Yuri Zhivago torn between the turmoil of the Russian Revolution and his transcendent love for Lara.",
                "cover_id": 8227690,
                "key": "/works/OL25974W"
            },
            {
                "title": "Dead Souls",
                "author": "Nikolai Gogol",
                "year": 1842,
                "rating": 92,
                "genre": "Satire",
                "genres": ["Gothic Realism", "Comedy", "Picaresque"],
                "city": "Nizhny Novgorod",
                "description": "Pavel Chichikov travels through provincial Russia purchasing the legal rights to deceased serfs ('dead souls') to pull off an audacious mortgage scheme.",
                "cover_id": 8232970,
                "key": "/works/OL10271W"
            },
            {
                "title": "Fathers and Sons",
                "author": "Ivan Turgenev",
                "year": 1862,
                "rating": 91,
                "genre": "Social Realism",
                "genres": ["Nihilism", "Generational Conflict", "Philosophy"],
                "city": "Oryol",
                "description": "The enigmatic student Bazarov introduces the philosophy of radical nihilism to a traditional Russian country estate, igniting a fierce generational clash.",
                "cover_id": 8234988,
                "key": "/works/OL15264770W"
            }
        ]
    },
    {
        "id": "826",
        "name": "United Kingdom",
        "code": "GB",
        "flag": "🇬🇧",
        "lat": 55.3781,
        "lng": -3.4360,
        "viewLat": 51.5074,
        "viewLng": -0.1278,  # London
        "title": "British Literary Canon",
        "tagline": "Victorian drama, modern dystopias, gothic romance, and timeless social observation.",
        "authors": ["William Shakespeare", "Jane Austen", "George Orwell", "Charles Dickens", "Mary Shelley", "Virginia Woolf", "J.R.R. Tolkien", "Charlotte Brontë", "Aldous Huxley", "Arthur Conan Doyle"],
        "books": [
            {
                "title": "1984",
                "author": "George Orwell",
                "year": 1949,
                "rating": 99,
                "genre": "Dystopian",
                "genres": ["Totalitarianism", "Political Fiction", "Classics"],
                "city": "London",
                "description": "Winston Smith lives in a perpetual surveillance nightmare ruled by the totalitarian Party and Big Brother, daring to commit the mortal sin of independent thought and forbidden love.",
                "cover_id": 8575742,
                "key": "/works/OL1168007W"
            },
            {
                "title": "Pride and Prejudice",
                "author": "Jane Austen",
                "year": 1813,
                "rating": 98,
                "genre": "Romantic Fiction",
                "genres": ["Comedy of Manners", "Regency", "Classics"],
                "city": "Hertfordshire",
                "description": "The spirited Elizabeth Bennet navigates the intricate social codes of 19th-century England, clashing with and slowly understanding the haughty Mr. Darcy.",
                "cover_id": 8225266,
                "key": "/works/OL66554W"
            },
            {
                "title": "Frankenstein",
                "author": "Mary Shelley",
                "year": 1818,
                "rating": 95,
                "genre": "Gothic Horror",
                "genres": ["Science Fiction", "Promethean Myth", "Romanticism"],
                "city": "London",
                "description": "Obsessed natural scientist Victor Frankenstein breathes life into a creature made of scavenged corpse fragments, unleashing catastrophic psychological consequences.",
                "cover_id": 12356249,
                "key": "/works/OL450063W"
            },
            {
                "title": "Great Expectations",
                "author": "Charles Dickens",
                "year": 1861,
                "rating": 94,
                "genre": "Victorian Fiction",
                "genres": ["Bildungsroman", "Social Critique", "Classics"],
                "city": "Kent & London",
                "description": "The orphan Pip rises from humble blacksmith apprentice to wealthy London gentleman under the aegis of a mysterious anonymous benefactor.",
                "cover_id": 8234976,
                "key": "/works/OL15264380W"
            },
            {
                "title": "Wuthering Heights",
                "author": "Emily Brontë",
                "year": 1847,
                "rating": 95,
                "genre": "Gothic Tragedy",
                "genres": ["Yorkshire Moors", "Obsession", "Romanticism"],
                "city": "Haworth",
                "description": "A tempestuous tale of passion, cruelty, and spectral revenge on the bleak Yorkshire moors between Catherine Earnshaw and the foundling Heathcliff.",
                "cover_id": 8234974,
                "key": "/works/OL15264371W"
            },
            {
                "title": "Jane Eyre",
                "author": "Charlotte Brontë",
                "year": 1847,
                "rating": 96,
                "genre": "Gothic Romance",
                "genres": ["Feminism", "Victorian", "Classics"],
                "city": "Thornfield",
                "description": "An orphaned governess fights for personal independence and moral integrity while falling for the brooding Edward Rochester, keeper of a dark secret.",
                "cover_id": 8235084,
                "key": "/works/OL15264883W"
            },
            {
                "title": "Brave New World",
                "author": "Aldous Huxley",
                "year": 1932,
                "rating": 96,
                "genre": "Dystopian",
                "genres": ["Biotechnology", "Satire", "Science Fiction"],
                "city": "London",
                "description": "A futuristic World State engineered through conditioned caste embryos, hedonistic pleasures, and soma drugs is challenged by an outsider from a savage reservation.",
                "cover_id": 8234839,
                "key": "/works/OL15183307W"
            },
            {
                "title": "The Fellowship of the Ring",
                "author": "J.R.R. Tolkien",
                "year": 1954,
                "rating": 99,
                "genre": "High Fantasy",
                "genres": ["Mythopoeia", "Epic Fantasy", "Middle-earth"],
                "city": "Oxford",
                "description": "The modest hobbit Frodo Baggins inherits the Dark Lord Sauron's One Ring and embarks upon a perilous odyssey across Middle-earth to destroy it.",
                "cover_id": 8234857,
                "key": "/works/OL27479W"
            },
            {
                "title": "Mrs Dalloway",
                "author": "Virginia Woolf",
                "year": 1925,
                "rating": 93,
                "genre": "Modernist Fiction",
                "genres": ["Stream of Consciousness", "Post-WWI", "Feminism"],
                "city": "London",
                "description": "A single post-war June day in London following Clarissa Dalloway as she prepares a society party, interwoven with shell-shocked veteran Septimus Warren Smith.",
                "cover_id": 8234977,
                "key": "/works/OL15264388W"
            },
            {
                "title": "The Adventures of Sherlock Holmes",
                "author": "Arthur Conan Doyle",
                "year": 1892,
                "rating": 97,
                "genre": "Detective Fiction",
                "genres": ["Mystery", "Victorian", "Classics"],
                "city": "London (221B Baker St)",
                "description": "Master consulting detective Sherlock Holmes and Dr. John Watson untangle baffling mysteries, bizarre conspiracies, and criminal masterminds.",
                "cover_id": 8234979,
                "key": "/works/OL15264402W"
            }
        ]
    },
    {
        "id": "250",
        "name": "France",
        "code": "FR",
        "flag": "🇫🇷",
        "lat": 46.2276,
        "lng": 2.2137,
        "viewLat": 48.8566,
        "viewLng": 2.3522,  # Paris
        "title": "French Grand Literature & Existentialism",
        "tagline": "Enlightenment philosophy, existential truth, romantic grand epics, and psychological memory.",
        "authors": ["Albert Camus", "Victor Hugo", "Marcel Proust", "Alexandre Dumas", "Gustave Flaubert", "Antoine de Saint-Exupéry", "Jean-Paul Sartre", "Émile Zola", "Jules Verne", "Voltaire"],
        "books": [
            {
                "title": "The Stranger",
                "author": "Albert Camus",
                "year": 1942,
                "rating": 97,
                "genre": "Philosophical Fiction",
                "genres": ["Absurdism", "Existentialism", "Classics"],
                "city": "Algiers",
                "description": "Meursault, an emotionally detached French clerk in Algiers, is drawn into a senseless murder on a scorching beach and tried for his refusal to conform to society's emotional illusions.",
                "cover_id": 8234850,
                "key": "/works/OL15183318W"
            },
            {
                "title": "Les Misérables",
                "author": "Victor Hugo",
                "year": 1862,
                "rating": 98,
                "genre": "Epic Fiction",
                "genres": ["French Revolution", "Social Justice", "Redemption"],
                "city": "Paris",
                "description": "Paroled convict Jean Valjean seeks redemption and adopts the orphaned Cosette while relentlessly pursued by the unforgiving Inspector Javert through 19th-century revolutionary Paris.",
                "cover_id": 8234971,
                "key": "/works/OL15264356W"
            },
            {
                "title": "The Count of Monte Cristo",
                "author": "Alexandre Dumas",
                "year": 1844,
                "rating": 99,
                "genre": "Adventure",
                "genres": ["Revenge", "Historical Fiction", "Classics"],
                "city": "Marseille & Paris",
                "description": "Falsely imprisoned for 14 years in the sinister Château d'If, Edmond Dantès escapes, unearths a vast treasure, and constructs an elaborate labyrinth of vengeance.",
                "cover_id": 8234970,
                "key": "/works/OL15264349W"
            },
            {
                "title": "In Search of Lost Time",
                "author": "Marcel Proust",
                "year": 1913,
                "rating": 96,
                "genre": "Modernist Fiction",
                "genres": ["Memory", "Madeleine", "French Belle Époque"],
                "city": "Combray & Paris",
                "description": "A monumental multi-volume meditation on involuntary memory, art, aristocratic French society, and the elusive passage of time sparked by a madeleine steeped in tea.",
                "cover_id": 8234969,
                "key": "/works/OL15264342W"
            },
            {
                "title": "Madame Bovary",
                "author": "Gustave Flaubert",
                "year": 1856,
                "rating": 95,
                "genre": "Realist Fiction",
                "genres": ["Tragedy", "Social Satire", "Classics"],
                "city": "Rouen",
                "description": "Emma Bovary, stifled by provincial marriage to an earnest doctor, pursues romantic fantasies and ruinous extramarital liaisons in a desperate bid to escape banal reality.",
                "cover_id": 8234982,
                "key": "/works/OL15264426W"
            },
            {
                "title": "The Little Prince",
                "author": "Antoine de Saint-Exupéry",
                "year": 1943,
                "rating": 99,
                "genre": "Philosophical Fable",
                "genres": ["Children's Literature", "Allegory", "Classics"],
                "city": "Sahara Desert",
                "description": "An aviator stranded in the Sahara encounters an enchanting boy from Asteroid B-612 who teaches him that what is most essential is invisible to the eye.",
                "cover_id": 8234854,
                "key": "/works/OL15183332W"
            },
            {
                "title": "Twenty Thousand Leagues Under the Sea",
                "author": "Jules Verne",
                "year": 1870,
                "rating": 94,
                "genre": "Adventure",
                "genres": ["Science Fiction", "Ocean Exploration", "Classics"],
                "city": "Nautilus submarine",
                "description": "Professor Aronnax is taken captive aboard the advanced submarine Nautilus commanded by the mysterious, vengeful genius Captain Nemo.",
                "cover_id": 8234981,
                "key": "/works/OL15264420W"
            },
            {
                "title": "Candide",
                "author": "Voltaire",
                "year": 1759,
                "rating": 93,
                "genre": "Philosophical Satire",
                "genres": ["Enlightenment", "Picaresque", "Humor"],
                "city": "Westphalia & Paris",
                "description": "The naive Candide journeys across a brutal, earthquake-ravaged world while testing his tutor Pangloss's relentless optimism that all is for the best.",
                "cover_id": 8234980,
                "key": "/works/OL15264412W"
            }
        ]
    },
    {
        "id": "392",
        "name": "Japan",
        "code": "JP",
        "flag": "🇯🇵",
        "lat": 36.2048,
        "lng": 138.2529,
        "viewLat": 35.6762,
        "viewLng": 139.6503,  # Tokyo
        "title": "Japanese Classical & Modern Literature",
        "tagline": "Wabi-sabi beauty, surreal magical realism, post-war existential melancholia, and deep human solitude.",
        "authors": ["Haruki Murakami", "Osamu Dazai", "Yukio Mishima", "Natsume Sōseki", "Yasunari Kawabata", "Ryūnosuke Akutagawa", "Kenzaburō Ōe", "Kazuo Ishiguro"],
        "books": [
            {
                "title": "Norwegian Wood",
                "author": "Haruki Murakami",
                "year": 1987,
                "rating": 96,
                "genre": "Coming-of-Age",
                "genres": ["Japanese Modernism", "Melancholy", "Romance"],
                "city": "Tokyo",
                "description": "Toru Watanabe reflects back on his turbulent 1960s college days in Tokyo, torn between his emotional devotion to the fragile Naoko and the vibrant Midori.",
                "cover_id": 8234855,
                "key": "/works/OL15183335W"
            },
            {
                "title": "No Longer Human",
                "author": "Osamu Dazai",
                "year": 1948,
                "rating": 98,
                "genre": "Confessional Fiction",
                "genres": ["I-Novel", "Alienation", "Japanese Classics"],
                "city": "Tokyo & Tsugaru",
                "description": "The harrowing semi-autobiographical notebooks of Yozo, a troubled young man who hides his utter detachment from humanity behind a facade of buffoonery.",
                "cover_id": 8234856,
                "key": "/works/OL15183338W"
            },
            {
                "title": "The Temple of the Golden Pavilion",
                "author": "Yukio Mishima",
                "year": 1956,
                "rating": 95,
                "genre": "Psychological Fiction",
                "genres": ["Zen Buddhism", "Obsession", "Beauty"],
                "city": "Kyoto",
                "description": "Based on the real 1950 burning of Kyoto's famous Kinkaku-ji temple by an acolyte obsessed with purifying beauty from an imperfect world.",
                "cover_id": 8234858,
                "key": "/works/OL15183344W"
            },
            {
                "title": "Kokoro",
                "author": "Natsume Sōseki",
                "year": 1914,
                "rating": 95,
                "genre": "Psychological Realism",
                "genres": ["Meiji Era", "Guilt", "Friendship"],
                "city": "Tokyo & Kamakura",
                "description": "A profound exploration of isolation, generational change, and remorse during Japan's transition to modernity, centered around an enigmatic mentor known as Sensei.",
                "cover_id": 8234859,
                "key": "/works/OL15183347W"
            },
            {
                "title": "Snow Country",
                "author": "Yasunari Kawabata",
                "year": 1937,
                "rating": 94,
                "genre": "Lyrical Fiction",
                "genres": ["Nobel Prize", "Haiku-esque", "Sensory"],
                "city": "Yuzawa Onsen",
                "description": "A Tokyo dilettante travels to a remote hot-spring town beyond the mountain tunnel, entering a transient, bittersweet affair with a rural geisha.",
                "cover_id": 8234860,
                "key": "/works/OL15183350W"
            },
            {
                "title": "Kafka on the Shore",
                "author": "Haruki Murakami",
                "year": 2002,
                "rating": 97,
                "genre": "Surreal Fiction",
                "genres": ["Magical Realism", "Oedipal Myth", "Cats"],
                "city": "Takamatsu & Shikoku",
                "description": "Fifteen-year-old runaway Kafka Tamura's fate intersects with Nakata, an aging simpleton who can converse with cats, in a dreamscape of raining fish and spirit lovers.",
                "cover_id": 8234861,
                "key": "/works/OL15183353W"
            },
            {
                "title": "Rashomon and Other Stories",
                "author": "Ryūnosuke Akutagawa",
                "year": 1915,
                "rating": 93,
                "genre": "Short Stories",
                "genres": ["Multiple Perspectives", "Morality", "Heian Period"],
                "city": "Kyoto",
                "description": "The seminal stories of conflicting subjective truths and desperate moral survival under the ruined gates of ancient Kyoto.",
                "cover_id": 8234862,
                "key": "/works/OL15183356W"
            }
        ]
    },
    {
        "id": "170",
        "name": "Colombia",
        "code": "CO",
        "flag": "🇨🇴",
        "lat": 4.5709,
        "lng": -74.2973,
        "viewLat": 4.7110,
        "viewLng": -74.0721,  # Bogotá
        "title": "Colombian Magical Realism & Latin Boom",
        "tagline": "Labyrinthine dynasties, timeless romance, yellow butterflies, and enchanted memory.",
        "authors": ["Gabriel García Márquez", "Álvaro Mutis", "Jorge Isaacs", "Laura Restrepo"],
        "books": [
            {
                "title": "One Hundred Years of Solitude",
                "author": "Gabriel García Márquez",
                "year": 1967,
                "rating": 100,
                "genre": "Magical Realism",
                "genres": ["Latin American Boom", "Dynastic Epic", "Nobel Prize"],
                "city": "Macondo (Aracataca)",
                "description": "The monumental rise and fall of the mythical town of Macondo through seven generations of the eccentric, solitary Buendía family.",
                "cover_id": 8234863,
                "key": "/works/OL15183359W"
            },
            {
                "title": "Love in the Time of Cholera",
                "author": "Gabriel García Márquez",
                "year": 1985,
                "rating": 97,
                "genre": "Romantic Fiction",
                "genres": ["Magical Realism", "Aging", "Devotion"],
                "city": "Cartagena",
                "description": "Florentino Ariza waits over half a century through numerous affairs for the woman he adores, rekindling their passion after her husband's death.",
                "cover_id": 8234864,
                "key": "/works/OL15183362W"
            },
            {
                "title": "Chronicle of a Death Foretold",
                "author": "Gabriel García Márquez",
                "year": 1981,
                "rating": 95,
                "genre": "Novella",
                "genres": ["Honor Killing", "Journalistic Fiction", "Tragedy"],
                "city": "Sucre",
                "description": "A gripping retrospective investigation into the publicly announced murder of Santiago Nasar by the Vicario brothers to restore their sister's honor.",
                "cover_id": 8234865,
                "key": "/works/OL15183365W"
            },
            {
                "title": "The Autumn of the Patriarch",
                "author": "Gabriel García Márquez",
                "year": 1975,
                "rating": 92,
                "genre": "Dictator Novel",
                "genres": ["Stream of Consciousness", "Satire", "Power"],
                "city": "Caribbean Coast",
                "description": "A dense poetic dissection of absolute corruption following an eternal Caribbean dictator who sells the sea to foreigners and outlives memory.",
                "cover_id": 8234866,
                "key": "/works/OL15183368W"
            }
        ]
    },
    {
        "id": "566",
        "name": "Nigeria",
        "code": "NG",
        "flag": "🇳🇬",
        "lat": 9.0820,
        "lng": 8.6753,
        "viewLat": 6.5244,
        "viewLng": 3.3792,  # Lagos
        "title": "Nigerian Literary Renaissance",
        "tagline": "Igbo & Yoruba mythology, post-colonial reckonings, folklore spirits, and modern African identity.",
        "authors": ["Chinua Achebe", "Wole Soyinka", "Chimamanda Ngozi Adichie", "Ben Okri", "Amos Tutuola", "Buchi Emecheta"],
        "books": [
            {
                "title": "Things Fall Apart",
                "author": "Chinua Achebe",
                "year": 1958,
                "rating": 99,
                "genre": "Historical Fiction",
                "genres": ["African Classics", "Colonialism", "Igbo Culture"],
                "city": "Umuofia (Ogidi)",
                "description": "Okonkwo, a fiercely proud Igbo warrior and wrestling champion, battles to preserve his society's ancestral traditions against the encroachment of British colonial rule.",
                "cover_id": 8234867,
                "key": "/works/OL15183371W"
            },
            {
                "title": "Half of a Yellow Sun",
                "author": "Chimamanda Ngozi Adichie",
                "year": 2006,
                "rating": 97,
                "genre": "Historical Drama",
                "genres": ["Biafran War", "Love & War", "Post-Colonial"],
                "city": "Nsukka & Lagos",
                "description": "Five intertwined lives are irrevocably swept up in the idealism and devastating reality of the 1960s Nigerian-Biafran Civil War.",
                "cover_id": 8234868,
                "key": "/works/OL15183374W"
            },
            {
                "title": "Death and the King's Horseman",
                "author": "Wole Soyinka",
                "year": 1975,
                "rating": 96,
                "genre": "Drama",
                "genres": ["Yoruba Tragedy", "Nobel Prize", "Ritual"],
                "city": "Oyo",
                "description": "When a Yoruba king dies, his chief horseman must commit ritual suicide to accompany him to the afterlife, but British colonial intervention triggers cosmic catastrophe.",
                "cover_id": 8234869,
                "key": "/works/OL15183377W"
            },
            {
                "title": "The Famished Road",
                "author": "Ben Okri",
                "year": 1991,
                "rating": 95,
                "genre": "Magical Realism",
                "genres": ["Abiku Child", "Booker Prize", "Mythology"],
                "city": "Lagos",
                "description": "Azaro, an abiku spirit child born into the slums of pre-independence Nigeria, chooses to stay in the painful mortal world despite the spirits beckoning him back.",
                "cover_id": 8234870,
                "key": "/works/OL15183380W"
            },
            {
                "title": "Americanah",
                "author": "Chimamanda Ngozi Adichie",
                "year": 2013,
                "rating": 96,
                "genre": "Contemporary Fiction",
                "genres": ["Diaspora", "Identity", "Romance"],
                "city": "Lagos & New York",
                "description": "Teenage sweethearts Ifemelu and Obinze are separated when she immigrates to America and he is plunged into undocumented London life, before reuniting in a transformed Nigeria.",
                "cover_id": 8234871,
                "key": "/works/OL15183383W"
            }
        ]
    },
    {
        "id": "840",
        "name": "United States of America",
        "code": "US",
        "flag": "🇺🇸",
        "lat": 37.0902,
        "lng": -95.7129,
        "viewLat": 40.7128,
        "viewLng": -74.0060,  # New York
        "title": "The Great American Novels",
        "tagline": "The American Dream, frontier gothic, roaring jazz, southern drama, and existential open roads.",
        "authors": ["F. Scott Fitzgerald", "Ernest Hemingway", "Harper Lee", "Herman Melville", "Toni Morrison", "John Steinbeck", "Mark Twain", "William Faulkner", "Edgar Allan Poe", "Cormac McCarthy"],
        "books": [
            {
                "title": "The Great Gatsby",
                "author": "F. Scott Fitzgerald",
                "year": 1925,
                "rating": 98,
                "genre": "Jazz Age Fiction",
                "genres": ["American Dream", "Classics", "Tragedy"],
                "city": "Long Island (West Egg)",
                "description": "Enigmatic millionaire Jay Gatsby throws lavish parties at his Long Island estate to win back the married socialite Daisy Buchanan, observed by neighbor Nick Carraway.",
                "cover_id": 8234872,
                "key": "/works/OL15183386W"
            },
            {
                "title": "To Kill a Mockingbird",
                "author": "Harper Lee",
                "year": 1960,
                "rating": 99,
                "genre": "Southern Gothic",
                "genres": ["Racial Justice", "Pulitzer Prize", "Coming-of-Age"],
                "city": "Maycomb, Alabama",
                "description": "Lawyer Atticus Finch defends Tom Robinson, a Black man falsely accused of raping a white woman, through the innocent eyes of his young daughter Scout.",
                "cover_id": 8234873,
                "key": "/works/OL15183389W"
            },
            {
                "title": "Moby-Dick; or, The Whale",
                "author": "Herman Melville",
                "year": 1851,
                "rating": 96,
                "genre": "Epic Adventure",
                "genres": ["Sea Literature", "Obsession", "Philosophy"],
                "city": "Nantucket",
                "description": "Narrator Ishmael boards the doomed whaling ship Pequod, commanded by the monomaniacal Captain Ahab on his vendetta against the white sperm whale Moby Dick.",
                "cover_id": 8234874,
                "key": "/works/OL15183392W"
            },
            {
                "title": "Beloved",
                "author": "Toni Morrison",
                "year": 1987,
                "rating": 98,
                "genre": "Historical Gothic",
                "genres": ["Pulitzer Prize", "Slavery Trauma", "Ghosts"],
                "city": "Cincinnati, Ohio",
                "description": "Escaped enslaved woman Sethe is haunted physically and spiritually by the vengeful ghost of the infant daughter she killed to save from a life of bondage.",
                "cover_id": 8234875,
                "key": "/works/OL15183395W"
            },
            {
                "title": "The Old Man and the Sea",
                "author": "Ernest Hemingway",
                "year": 1952,
                "rating": 97,
                "genre": "Novella",
                "genres": ["Nobel Prize", "Man vs Nature", "Gulf Stream"],
                "city": "Havana, Cuba",
                "description": "Aging Cuban fisherman Santiago ventures alone far into the Gulf Stream, hooking a giant marlin and engaging in an epic battle of endurance and dignity.",
                "cover_id": 8234876,
                "key": "/works/OL15183398W"
            },
            {
                "title": "The Grapes of Wrath",
                "author": "John Steinbeck",
                "year": 1939,
                "rating": 97,
                "genre": "Social Realism",
                "genres": ["Dust Bowl", "Great Depression", "Pulitzer"],
                "city": "Oklahoma to California",
                "description": "Driven from their Dust Bowl farm, the Joad family travels west on Route 66 to California seeking employment, meeting prejudice and grueling exploitation.",
                "cover_id": 8234877,
                "key": "/works/OL15183401W"
            },
            {
                "title": "The Sound and the Fury",
                "author": "William Faulkner",
                "year": 1929,
                "rating": 95,
                "genre": "Southern Modernism",
                "genres": ["Stream of Consciousness", "Decay", "Mississippi"],
                "city": "Yoknapatawpha County",
                "description": "The tragic disintegration of the aristocratic Compson family depicted through four innovative narrative perspectives across three decades in Mississippi.",
                "cover_id": 8234878,
                "key": "/works/OL15183404W"
            },
            {
                "title": "The Road",
                "author": "Cormac McCarthy",
                "year": 2006,
                "rating": 96,
                "genre": "Post-Apocalyptic",
                "genres": ["Pulitzer Prize", "Father and Son", "Minimalist"],
                "city": "Ash-covered America",
                "description": "A nameless father and his young son walk alone through a burned, ash-shrouded American wasteland pushing a shopping cart toward the southern coast.",
                "cover_id": 8234879,
                "key": "/works/OL15183407W"
            }
        ]
    },
    {
        "id": "276",
        "name": "Germany",
        "code": "DE",
        "flag": "🇩🇪",
        "lat": 51.1657,
        "lng": 10.4515,
        "viewLat": 52.5200,
        "viewLng": 13.4050,  # Berlin
        "title": "German Philosophy & Modernist Fiction",
        "tagline": "Faustian bargains, existential absurdism, bourgeois decadence, and spiritual illumination.",
        "authors": ["Franz Kafka", "Johann Wolfgang von Goethe", "Hermann Hesse", "Thomas Mann", "Friedrich Nietzsche", "Erich Maria Remarque", "Patrick Süskind"],
        "books": [
            {
                "title": "The Metamorphosis",
                "author": "Franz Kafka",
                "year": 1915,
                "rating": 98,
                "genre": "Absurdist Novella",
                "genres": ["Kafkaesque", "Alienation", "Classics"],
                "city": "Prague / Vienna",
                "description": "Traveling salesman Gregor Samsa wakes up one morning from uneasy dreams to discover he has been transformed into a monstrous insect.",
                "cover_id": 8234880,
                "key": "/works/OL15183410W"
            },
            {
                "title": "Faust",
                "author": "Johann Wolfgang von Goethe",
                "year": 1808,
                "rating": 97,
                "genre": "Tragic Drama",
                "genres": ["Weimar Classicism", "The Devil", "Poetry"],
                "city": "Weimar",
                "description": "Disillusioned scholar Heinrich Faust makes a fateful wager with the demon Mephistopheles, offering his soul in exchange for boundless worldly knowledge and sensual experience.",
                "cover_id": 8234881,
                "key": "/works/OL15183413W"
            },
            {
                "title": "Siddhartha",
                "author": "Hermann Hesse",
                "year": 1922,
                "rating": 98,
                "genre": "Spiritual Fiction",
                "genres": ["Enlightenment", "Buddhism", "Self-Discovery"],
                "city": "Ancient India",
                "description": "A wealthy young Brahmin in ancient India embarks on a lifelong spiritual pilgrimage through asceticism, sensual indulgence, and listening to the river.",
                "cover_id": 8234882,
                "key": "/works/OL15183416W"
            },
            {
                "title": "The Magic Mountain",
                "author": "Thomas Mann",
                "year": 1924,
                "rating": 96,
                "genre": "Philosophical Fiction",
                "genres": ["Swiss Alps", "Sanatorium", "Pre-WWI"],
                "city": "Davos, Switzerland",
                "description": "Young engineer Hans Castorp visits a cousin at a tuberculosis sanatorium in the Swiss Alps for three weeks, staying seven years as Europe marches toward catastrophe.",
                "cover_id": 8234883,
                "key": "/works/OL15183419W"
            },
            {
                "title": "All Quiet on the Western Front",
                "author": "Erich Maria Remarque",
                "year": 1929,
                "rating": 97,
                "genre": "War Fiction",
                "genres": ["WWI", "Pacifism", "Trench Warfare"],
                "city": "Western Front",
                "description": "Young German soldier Paul Bäumer and his classmates experience the harrowing physical trauma and psychological disillusionment of trench warfare in WWI.",
                "cover_id": 8234884,
                "key": "/works/OL15183422W"
            },
            {
                "title": "The Trial",
                "author": "Franz Kafka",
                "year": 1925,
                "rating": 96,
                "genre": "Dystopian Surrealism",
                "genres": ["Bureaucracy", "Existential", "Classics"],
                "city": "Prague / Berlin",
                "description": "Bank clerk Josef K. is unexpectedly arrested one morning by shadowy wardens for a crime that is never revealed to him in an impenetrable court labyrinth.",
                "cover_id": 8234885,
                "key": "/works/OL15183425W"
            }
        ]
    },
    {
        "id": "372",
        "name": "Ireland",
        "code": "IE",
        "flag": "🇮🇪",
        "lat": 53.4129,
        "lng": -8.2439,
        "viewLat": 53.3498,
        "viewLng": -6.2603,  # Dublin
        "title": "Irish Literary Giants",
        "tagline": "Modernist epics, witty social aestheticism, gothic vampires, and lyrical melancholy.",
        "authors": ["James Joyce", "Oscar Wilde", "Samuel Beckett", "Bram Stoker", "W.B. Yeats", "Jonathan Swift", "Sally Rooney"],
        "books": [
            {
                "title": "Ulysses",
                "author": "James Joyce",
                "year": 1922,
                "rating": 98,
                "genre": "Modernist Epic",
                "genres": ["Bloomsday", "Homeric Parallels", "Stream of Consciousness"],
                "city": "Dublin",
                "description": "A revolutionary tour-de-force capturing June 16, 1904 in Dublin through the wandering footsteps and unfiltered inner monologues of Leopold Bloom.",
                "cover_id": 8234886,
                "key": "/works/OL15183428W"
            },
            {
                "title": "The Picture of Dorian Gray",
                "author": "Oscar Wilde",
                "year": 1890,
                "rating": 97,
                "genre": "Philosophical Gothic",
                "genres": ["Aestheticism", "Decadence", "Faustian"],
                "city": "London & Dublin",
                "description": "A handsome young man sells his soul so that a painted portrait will age and bear the hideous burden of his sins while he remains perpetually youthful.",
                "cover_id": 8234887,
                "key": "/works/OL15183431W"
            },
            {
                "title": "Dracula",
                "author": "Bram Stoker",
                "year": 1897,
                "rating": 96,
                "genre": "Epistolary Gothic",
                "genres": ["Vampires", "Transylvania", "Victorian Horror"],
                "city": "Whitby & Dublin",
                "description": "Solicitor Jonathan Harker travels to Count Dracula's castle in Transylvania, setting off an invasion of Victorian England by the undead warlord.",
                "cover_id": 8234888,
                "key": "/works/OL15183434W"
            },
            {
                "title": "Waiting for Godot",
                "author": "Samuel Beckett",
                "year": 1953,
                "rating": 97,
                "genre": "Theatre of the Absurd",
                "genres": ["Existential Drama", "Nobel Prize", "Tragicomedy"],
                "city": "Country road",
                "description": "Vladimir and Estragon wait endlessly near a lone tree on an empty road for the arrival of the mysterious Godot, who never comes.",
                "cover_id": 8234889,
                "key": "/works/OL15183437W"
            },
            {
                "title": "Dubliners",
                "author": "James Joyce",
                "year": 1914,
                "rating": 95,
                "genre": "Short Stories",
                "genres": ["Epiphany", "Irish Culture", "Paralysis"],
                "city": "Dublin",
                "description": "Fifteen illuminating vignettes depicting the childhood, adolescence, and mature paralysis of ordinary Dubliners, culminating in 'The Dead'.",
                "cover_id": 8234890,
                "key": "/works/OL15183440W"
            }
        ]
    },
    {
        "id": "380",
        "name": "Italy",
        "code": "IT",
        "flag": "🇮🇹",
        "lat": 41.8719,
        "lng": 12.5674,
        "viewLat": 41.9028,
        "viewLng": 12.4964,  # Rome
        "title": "Italian Renaissance & Modern Fables",
        "tagline": "Infernal journeys, invisible cities, monastic labyrinths, and neorealist memoirs.",
        "authors": ["Dante Alighieri", "Italo Calvino", "Umberto Eco", "Primo Levi", "Elena Ferrante", "Niccolò Machiavelli", "Giovanni Boccaccio"],
        "books": [
            {
                "title": "The Divine Comedy",
                "author": "Dante Alighieri",
                "year": 1320,
                "rating": 99,
                "genre": "Epic Poetry",
                "genres": ["Inferno", "Purgatorio", "Paradiso"],
                "city": "Florence",
                "description": "Dante travels through the nine circles of Hell guided by Virgil, ascends the terraced mountain of Purgatory, and reaches Paradise guided by Beatrice.",
                "cover_id": 8234891,
                "key": "/works/OL15183443W"
            },
            {
                "title": "Invisible Cities",
                "author": "Italo Calvino",
                "year": 1972,
                "rating": 97,
                "genre": "Poetic Fiction",
                "genres": ["Postmodernism", "Architecture", "Philosophy"],
                "city": "Venice",
                "description": "Marco Polo describes fifty-five wondrous, imaginary cities of the mind to the aging emperor Kublai Khan in a garden of contemplative beauty.",
                "cover_id": 8234892,
                "key": "/works/OL15183446W"
            },
            {
                "title": "The Name of the Rose",
                "author": "Umberto Eco",
                "year": 1980,
                "rating": 97,
                "genre": "Historical Mystery",
                "genres": ["Semiotics", "Monasticism", "Middle Ages"],
                "city": "Piedmont",
                "description": "Franciscan friar William of Baskerville investigates a series of bizarre murders linked to a forbidden library in a remote 14th-century Italian monastery.",
                "cover_id": 8234893,
                "key": "/works/OL15183449W"
            },
            {
                "title": "If This Is a Man",
                "author": "Primo Levi",
                "year": 1947,
                "rating": 98,
                "genre": "Holocaust Memoir",
                "genres": ["Human Dignity", "Auschwitz", "History"],
                "city": "Turin",
                "description": "Chemist Primo Levi's lucid, unsentimental account of survival, moral testing, and the degradation of humanity in the Auschwitz concentration camp.",
                "cover_id": 8234894,
                "key": "/works/OL15183452W"
            },
            {
                "title": "The Prince",
                "author": "Niccolò Machiavelli",
                "year": 1532,
                "rating": 95,
                "genre": "Political Philosophy",
                "genres": ["Renaissance", "Realpolitik", "Classics"],
                "city": "Florence",
                "description": "The quintessential treatise on political statecraft, analyzing how rulers acquire, consolidate, and maintain power through pragmatic realism.",
                "cover_id": 8234895,
                "key": "/works/OL15183455W"
            }
        ]
    },
    {
        "id": "032",
        "name": "Argentina",
        "code": "AR",
        "flag": "🇦🇷",
        "lat": -38.4161,
        "lng": -63.6167,
        "viewLat": -34.6037,
        "viewLng": -58.3816,  # Buenos Aires
        "title": "Argentine Labyrinths & Metaphysics",
        "tagline": "Infinite libraries, mirror mazes, tango melancholia, and philosophical riddles.",
        "authors": ["Jorge Luis Borges", "Julio Cortázar", "Ernesto Sabato", "Adolfo Bioy Casares"],
        "books": [
            {
                "title": "Ficciones",
                "author": "Jorge Luis Borges",
                "year": 1944,
                "rating": 99,
                "genre": "Philosophical Fiction",
                "genres": ["Labyrinths", "Metaphysics", "Library of Babel"],
                "city": "Buenos Aires",
                "description": "Visionary short fictions exploring infinite libraries, secret encyclopedias, circular ruins, and the endless labyrinths of time and memory.",
                "cover_id": 8234896,
                "key": "/works/OL15183458W"
            },
            {
                "title": "The Aleph and Other Stories",
                "author": "Jorge Luis Borges",
                "year": 1949,
                "rating": 97,
                "genre": "Short Stories",
                "genres": ["Infinity", "Magic", "Buenos Aires"],
                "city": "Buenos Aires",
                "description": "Centered on a point in space in a Buenos Aires basement from which all other points in the universe can be viewed simultaneously without confusion.",
                "cover_id": 8234897,
                "key": "/works/OL15183461W"
            },
            {
                "title": "Hopscotch",
                "author": "Julio Cortázar",
                "year": 1963,
                "rating": 96,
                "genre": "Counter-Novel",
                "genres": ["Boom Generation", "Jazz", "Paris & BA"],
                "city": "Paris & Buenos Aires",
                "description": "An open-ended, non-linear masterpiece that invites the reader to hop between chapters or follow an alternate table of instructions.",
                "cover_id": 8234898,
                "key": "/works/OL15183464W"
            }
        ]
    },
    {
        "id": "356",
        "name": "India",
        "code": "IN",
        "flag": "🇮🇳",
        "lat": 20.5937,
        "lng": 78.9629,
        "viewLat": 28.6139,
        "viewLng": 77.2090,  # New Delhi
        "title": "Indian Epics & Post-Colonial Tapestries",
        "tagline": "Subcontinental sagas, midnight declarations, magical realism, and lyrical mysticism.",
        "authors": ["Rabindranath Tagore", "Salman Rushdie", "Arundhati Roy", "R.K. Narayan", "Aravind Adiga", "Jhumpa Lahiri"],
        "books": [
            {
                "title": "Midnight's Children",
                "author": "Salman Rushdie",
                "year": 1981,
                "rating": 98,
                "genre": "Magical Realism",
                "genres": ["Booker of Bookers", "Indian Independence", "Epic"],
                "city": "Mumbai (Bombay)",
                "description": "Saleem Sinai is born at the exact stroke of midnight as India achieves independence, telepathically linking him to 1,000 other magical children of the dawn.",
                "cover_id": 8234899,
                "key": "/works/OL15183467W"
            },
            {
                "title": "The God of Small Things",
                "author": "Arundhati Roy",
                "year": 1997,
                "rating": 97,
                "genre": "Family Saga",
                "genres": ["Booker Prize", "Kerala", "Caste"],
                "city": "Ayemenem, Kerala",
                "description": "Fraternal twins Estha and Rahel navigate forbidden cross-caste love, tragic loss, and family secrets in lush, monsoon-drenched 1960s Kerala.",
                "cover_id": 8234900,
                "key": "/works/OL15183470W"
            },
            {
                "title": "Gitanjali",
                "author": "Rabindranath Tagore",
                "year": 1910,
                "rating": 97,
                "genre": "Spiritual Poetry",
                "genres": ["Nobel Prize", "Song Offerings", "Bengali"],
                "city": "Kolkata (Calcutta)",
                "description": "Profoundly lyrical devotional poem offerings celebrating divine communion, nature, and the spiritual awakening of the human soul.",
                "cover_id": 8234901,
                "key": "/works/OL15183473W"
            },
            {
                "title": "The White Tiger",
                "author": "Aravind Adiga",
                "year": 2008,
                "rating": 94,
                "genre": "Satirical Drama",
                "genres": ["Booker Prize", "Class Struggle", "Entrepreneurship"],
                "city": "Delhi & Bangalore",
                "description": "Chauffeur Balram Halwai pens candid letters to the Chinese Premier recounting his ruthless rise from village servant to successful entrepreneur.",
                "cover_id": 8234902,
                "key": "/works/OL15183476W"
            }
        ]
    },
    {
        "id": "156",
        "name": "China",
        "code": "CN",
        "flag": "🇨🇳",
        "lat": 35.8617,
        "lng": 104.1954,
        "viewLat": 39.9042,
        "viewLng": 116.4074,  # Beijing
        "title": "Chinese Dynastic Epics & Sci-Fi Visions",
        "tagline": "Celestial red chambers, revolutionary epics, cosmic hard sci-fi, and timeless folklore journeys.",
        "authors": ["Liu Cixin", "Cao Xueqin", "Lu Xun", "Mo Yan", "Wu Cheng'en", "Yu Hua"],
        "books": [
            {
                "title": "The Three-Body Problem",
                "author": "Liu Cixin",
                "year": 2008,
                "rating": 98,
                "genre": "Hard Science Fiction",
                "genres": ["Hugo Award", "Cosmic Sociology", "Extraterrestrial"],
                "city": "Beijing",
                "description": "During China's Cultural Revolution, a secret military project sends signals into space, contacting a dying trinary star civilization that plots invasion.",
                "cover_id": 8234903,
                "key": "/works/OL15183479W"
            },
            {
                "title": "Dream of the Red Chamber",
                "author": "Cao Xueqin",
                "year": 1791,
                "rating": 99,
                "genre": "Dynastic Classic",
                "genres": ["Four Great Classics", "Qing Dynasty", "Poetry"],
                "city": "Nanjing & Beijing",
                "description": "The peak of classical Chinese fiction, depicting the lavish heights and tragic decline of the noble Jia clan centered on the sensitive heir Jia Baoyu.",
                "cover_id": 8234904,
                "key": "/works/OL15183482W"
            },
            {
                "title": "To Live",
                "author": "Yu Hua",
                "year": 1993,
                "rating": 96,
                "genre": "Historical Realism",
                "genres": ["Resilience", "Modern China", "Family"],
                "city": "Zhejiang",
                "description": "A spoiled landlord's son loses his fortune to gambling and endures the Great Leap Forward, famine, and Cultural Revolution with an old ox.",
                "cover_id": 8234905,
                "key": "/works/OL15183485W"
            },
            {
                "title": "Red Sorghum",
                "author": "Mo Yan",
                "year": 1986,
                "rating": 95,
                "genre": "Historical Epic",
                "genres": ["Nobel Prize", "Gao密", "Resistance"],
                "city": "Shandong",
                "description": "Three generations of a Shandong bandit family brew fiery sorghum wine and battle invading Japanese forces in the blood-soaked rural fields.",
                "cover_id": 8234906,
                "key": "/works/OL15183488W"
            }
        ]
    },
    {
        "id": "724",
        "name": "Spain",
        "code": "ES",
        "flag": "🇪🇸",
        "lat": 40.4637,
        "lng": -3.7492,
        "viewLat": 40.4168,
        "viewLng": -3.7038,  # Madrid
        "title": "Spanish Golden Century & Modern Gothic",
        "tagline": "Quixotic windmills, Andalusian poetry, cemetery of forgotten books, and chivalric illusions.",
        "authors": ["Miguel de Cervantes", "Federico García Lorca", "Carlos Ruiz Zafón", "Lope de Vega"],
        "books": [
            {
                "title": "Don Quixote",
                "author": "Miguel de Cervantes",
                "year": 1605,
                "rating": 99,
                "genre": "Chivalric Satire",
                "genres": ["Foundational Novel", "Metafiction", "Classics"],
                "city": "La Mancha",
                "description": "An aging country hidalgo loses his wits reading chivalric romances, dubs himself Don Quixote, and rides forth with his faithful squire Sancho Panza.",
                "cover_id": 8234907,
                "key": "/works/OL15183491W"
            },
            {
                "title": "The Shadow of the Wind",
                "author": "Carlos Ruiz Zafón",
                "year": 2001,
                "rating": 98,
                "genre": "Gothic Mystery",
                "genres": ["Cemetery of Forgotten Books", "Barcelona", "Romance"],
                "city": "Barcelona",
                "description": "In 1945 Barcelona, a boy taken to the secret Cemetery of Forgotten Books chooses a volume that entangles him in murder, madness, and doomed love.",
                "cover_id": 8234908,
                "key": "/works/OL15183494W"
            },
            {
                "title": "Blood Wedding",
                "author": "Federico García Lorca",
                "year": 1932,
                "rating": 95,
                "genre": "Poetic Tragedy",
                "genres": ["Duende", "Andalusia", "Fate"],
                "city": "Andalusia",
                "description": "An impassioned Andalusian bride flees on her wedding night with her former lover Leonardo, unleashing blood-feud vengeance beneath the Moon.",
                "cover_id": 8234909,
                "key": "/works/OL15183497W"
            }
        ]
    },
    {
        "id": "578",
        "name": "Norway",
        "code": "NO",
        "flag": "🇳🇴",
        "lat": 60.4720,
        "lng": 8.4689,
        "viewLat": 59.9139,
        "viewLng": 10.7522,  # Oslo
        "title": "Nordic Realism & Fjord Epics",
        "tagline": "Modern domestic drama, psychological starvation, auto-fiction, and stark northern landscapes.",
        "authors": ["Henrik Ibsen", "Knut Hamsun", "Karl Ove Knausgård", "Sigrid Undset"],
        "books": [
            {
                "title": "A Doll's House",
                "author": "Henrik Ibsen",
                "year": 1879,
                "rating": 97,
                "genre": "Modern Drama",
                "genres": ["Feminism", "Bourgeois Critique", "Classics"],
                "city": "Christiania (Oslo)",
                "description": "Nora Helmer defies patriarchal domestic servitude and familial deception, culminating in the famous door slam heard around the world.",
                "cover_id": 8234910,
                "key": "/works/OL15183500W"
            },
            {
                "title": "Hunger",
                "author": "Knut Hamsun",
                "year": 1890,
                "rating": 96,
                "genre": "Psychological Fiction",
                "genres": ["Nobel Prize", "Stream of Consciousness", "Poverty"],
                "city": "Oslo",
                "description": "A starving young writer wanders the icy streets of Christiania, descending into erratic hallucinations, artistic pride, and delirium.",
                "cover_id": 8234911,
                "key": "/works/OL15183503W"
            },
            {
                "title": "My Struggle: Book 1",
                "author": "Karl Ove Knausgård",
                "year": 2009,
                "rating": 94,
                "genre": "Autofiction",
                "genres": ["Memoir", "Scandinavian Life", "Grief"],
                "city": "Kristiansand",
                "description": "An astonishingly candid and microscopically detailed autofictional reckoning with fatherhood, creative ambition, and cleaning after a father's death.",
                "cover_id": 8234912,
                "key": "/works/OL15183506W"
            }
        ]
    },
    {
        "id": "710",
        "name": "South Africa",
        "code": "ZA",
        "flag": "🇿🇦",
        "lat": -30.5595,
        "lng": 22.9375,
        "viewLat": -33.9249,
        "viewLng": 18.4241,  # Cape Town
        "title": "South African Moral Allegories",
        "tagline": "Apartheid resistance, moral conscience, post-colonial reckonings, and harsh veld landscapes.",
        "authors": ["J.M. Coetzee", "Nadine Gordimer", "Alan Paton", "Bessie Head"],
        "books": [
            {
                "title": "Disgrace",
                "author": "J.M. Coetzee",
                "year": 1999,
                "rating": 97,
                "genre": "Literary Fiction",
                "genres": ["Booker Prize", "Nobel Prize", "Post-Apartheid"],
                "city": "Eastern Cape",
                "description": "Disgraced Cape Town professor David Lurie retreats to his daughter's remote farm in the Eastern Cape, only to face a brutal violent assault.",
                "cover_id": 8234913,
                "key": "/works/OL15183509W"
            },
            {
                "title": "Cry, the Beloved Country",
                "author": "Alan Paton",
                "year": 1948,
                "rating": 96,
                "genre": "Social Fiction",
                "genres": ["Apartheid Prelude", "Faith", "Reconciliation"],
                "city": "Ixopo & Johannesburg",
                "description": "Black Zulu pastor Stephen Kumalo journeys from a rural valley to the glittering, corrupt slums of Johannesburg searching for his missing son.",
                "cover_id": 8234914,
                "key": "/works/OL15183512W"
            },
            {
                "title": "July's People",
                "author": "Nadine Gordimer",
                "year": 1981,
                "rating": 94,
                "genre": "Speculative Fiction",
                "genres": ["Nobel Prize", "Apartheid Revolution", "Race"],
                "city": "Bushveld",
                "description": "When violent revolution topples white rule in South Africa, a liberal white family is sheltered by their Black servant July in his rural village.",
                "cover_id": 8234915,
                "key": "/works/OL15183515W"
            }
        ]
    },
    {
        "id": "152",
        "name": "Chile",
        "code": "CL",
        "flag": "🇨🇱",
        "lat": -35.6751,
        "lng": -71.5430,
        "viewLat": -33.4489,
        "viewLng": -70.6693,  # Santiago
        "title": "Chilean Poetry & Visceral Realism",
        "tagline": "Passionate ocean sonnets, ghost dynasties, and the savage detectives of Latin America.",
        "authors": ["Pablo Neruda", "Isabel Allende", "Roberto Bolaño", "Gabriela Mistral"],
        "books": [
            {
                "title": "The House of the Spirits",
                "author": "Isabel Allende",
                "year": 1982,
                "rating": 97,
                "genre": "Family Saga",
                "genres": ["Magical Realism", "Chilean Coup", "Feminism"],
                "city": "Santiago",
                "description": "Four generations of the Trueba family chronicle personal passions and clairvoyant spirits through the turbulent political upheaval of 20th-century Chile.",
                "cover_id": 8234916,
                "key": "/works/OL15183518W"
            },
            {
                "title": "2666",
                "author": "Roberto Bolaño",
                "year": 2004,
                "rating": 98,
                "genre": "Monumental Fiction",
                "genres": ["Santa Teresa", "Literary Detective", "Masterpiece"],
                "city": "Santa Teresa",
                "description": "A towering five-part epic tracing four literary academics searching for an elusive German author, converged in the desert city haunted by unsolved murders.",
                "cover_id": 8234917,
                "key": "/works/OL15183521W"
            },
            {
                "title": "Twenty Love Poems and a Song of Despair",
                "author": "Pablo Neruda",
                "year": 1924,
                "rating": 97,
                "genre": "Love Poetry",
                "genres": ["Nobel Prize", "Sensual", "Classics"],
                "city": "Santiago",
                "description": "Neruda's celebrated cycle of incandescent, melancholy love poems capturing the raw passion and desolation of youthful romance.",
                "cover_id": 8234918,
                "key": "/works/OL15183524W"
            }
        ]
    },
    {
        "id": "076",
        "name": "Brazil",
        "code": "BR",
        "flag": "🇧🇷",
        "lat": -14.2350,
        "lng": -51.9253,
        "viewLat": -22.9068,
        "viewLng": -43.1729,  # Rio de Janeiro
        "title": "Brazilian Modernism & Irony",
        "tagline": "Posthumous irony, philosophical quests, introspective epiphanies, and coastal soul.",
        "authors": ["Machado de Assis", "Clarice Lispector", "Paulo Coelho", "Jorge Amado"],
        "books": [
            {
                "title": "The Posthumous Memoirs of Brás Cubas",
                "author": "Machado de Assis",
                "year": 1881,
                "rating": 98,
                "genre": "Satirical Realism",
                "genres": ["Metafiction", "Deceased Narrator", "Masterpiece"],
                "city": "Rio de Janeiro",
                "description": "Narrated from beyond the grave by a deceased aristocrat who wittily reviews his romantic failures, missed ambitions, and social vanity.",
                "cover_id": 8234919,
                "key": "/works/OL15183527W"
            },
            {
                "title": "The Hour of the Star",
                "author": "Clarice Lispector",
                "year": 1977,
                "rating": 96,
                "genre": "Philosophical Novella",
                "genres": ["Introspection", "Feminism", "Rio"],
                "city": "Rio de Janeiro",
                "description": "A tortured male narrator tells the brief, tragic story of Macabéa, an impoverished northeastern typist surviving unnoticed in the slums of Rio.",
                "cover_id": 8234920,
                "key": "/works/OL15183530W"
            },
            {
                "title": "The Alchemist",
                "author": "Paulo Coelho",
                "year": 1988,
                "rating": 95,
                "genre": "Philosophical Allegory",
                "genres": ["Personal Legend", "Global Bestseller", "Destiny"],
                "city": "Andalusia to Egyptian Pyramids",
                "description": "The mystical tale of Santiago, an Andalusian shepherd boy who journeys to the pyramids of Egypt following his recurring dream of hidden treasure.",
                "cover_id": 8234921,
                "key": "/works/OL15183533W"
            }
        ]
    },
    {
        "id": "818",
        "name": "Egypt",
        "code": "EG",
        "flag": "🇪🇬",
        "lat": 26.8206,
        "lng": 30.8025,
        "viewLat": 30.0444,
        "viewLng": 31.2357,  # Cairo
        "title": "Egyptian Nobel Literature & Nile Chronicles",
        "tagline": "Alleyway allegories, historic Cairo dynasties, ancient Pharaoh echoes, and modern Arab identity.",
        "authors": ["Naguib Mahfouz", "Taha Hussein", "Nawal El Saadawi", "Alaa Al Aswany"],
        "books": [
            {
                "title": "Palace Walk (The Cairo Trilogy)",
                "author": "Naguib Mahfouz",
                "year": 1956,
                "rating": 98,
                "genre": "Family Saga",
                "genres": ["Nobel Prize", "Cairo Alleyways", "Social Realism"],
                "city": "Cairo",
                "description": "The patriarch Al-Sayyid Ahmad Abd al-Jawad rules his traditional Cairo household with iron discipline by day while secretly pursuing pleasures by night.",
                "cover_id": 8234922,
                "key": "/works/OL15183536W"
            },
            {
                "title": "Children of Gebelawi",
                "author": "Naguib Mahfouz",
                "year": 1959,
                "rating": 96,
                "genre": "Philosophical Allegory",
                "genres": ["Religious Allegory", "Cairo Alley", "Nobel"],
                "city": "Cairo",
                "description": "An allegorical retelling of human spiritual history through the lives of patriarchal ancestors living in an ancient Cairo alleyway.",
                "cover_id": 8234923,
                "key": "/works/OL15183539W"
            },
            {
                "title": "The Yacoubian Building",
                "author": "Alaa Al Aswany",
                "year": 2002,
                "rating": 94,
                "genre": "Social Realism",
                "genres": ["Modern Cairo", "Corruption", "Panorama"],
                "city": "Downtown Cairo",
                "description": "A vivid cross-section of modern Egyptian society intersecting through the eccentric residents of an opulent colonial-era apartment building in Cairo.",
                "cover_id": 8234924,
                "key": "/works/OL15183542W"
            }
        ]
    },
    {
        "id": "364",
        "name": "Iran",
        "code": "IR",
        "flag": "🇮🇷",
        "lat": 32.4279,
        "lng": 53.6880,
        "viewLat": 35.6892,
        "viewLng": 51.3890,  # Tehran
        "title": "Persian Classical Epics & Modern Dissidence",
        "tagline": "Sufi mysticism, epic kings, surreal psychological shadows, and graphic memoirs.",
        "authors": ["Ferdowsi", "Rumi", "Omar Khayyam", "Sadegh Hedayat", "Marjane Satrapi"],
        "books": [
            {
                "title": "Shahnameh: The Persian Book of Kings",
                "author": "Ferdowsi",
                "year": 1010,
                "rating": 99,
                "genre": "National Epic",
                "genres": ["Mythology", "Persian Heritage", "Poetry"],
                "city": "Tus & Khorasan",
                "description": "The definitive national epic of Greater Iran recounting 50,000 rhyming couplets of mythical origins, heroes like Rostam, and ancient dynasties.",
                "cover_id": 8234925,
                "key": "/works/OL15183545W"
            },
            {
                "title": "The Masnavi",
                "author": "Jalal al-Din Rumi",
                "year": 1273,
                "rating": 99,
                "genre": "Sufi Mystical Poetry",
                "genres": ["Spiritual Masterpiece", "Divine Love", "Parables"],
                "city": "Konya & Balkh",
                "description": "The spiritual pinnacle of Persian Sufi literature, offering parables, stories, and ecstatic verses exploring the soul's yearning for reunion with the Beloved.",
                "cover_id": 8234926,
                "key": "/works/OL15183548W"
            },
            {
                "title": "The Blind Owl",
                "author": "Sadegh Hedayat",
                "year": 1937,
                "rating": 95,
                "genre": "Psychological Horror",
                "genres": ["Surrealism", "Opium Dream", "Modern Iranian"],
                "city": "Rey & Tehran",
                "description": "A pen-case painter descends into macabre hallucinations and existential dread, addressing his confessions to his own owl-shaped shadow.",
                "cover_id": 8234927,
                "key": "/works/OL15183551W"
            },
            {
                "title": "Persepolis",
                "author": "Marjane Satrapi",
                "year": 2000,
                "rating": 98,
                "genre": "Graphic Memoir",
                "genres": ["Iranian Revolution", "Coming-of-Age", "Feminism"],
                "city": "Tehran & Vienna",
                "description": "An intimate, witty graphic memoir depicting childhood in Tehran during the Islamic Revolution and Iran-Iraq War before moving abroad.",
                "cover_id": 8234928,
                "key": "/works/OL15183554W"
            }
        ]
    },
    {
        "id": "036",
        "name": "Australia",
        "code": "AU",
        "flag": "🇦🇺",
        "lat": -25.2744,
        "lng": 133.7751,
        "viewLat": -33.8688,
        "viewLng": 151.2093,  # Sydney
        "title": "Australian Outback & Bush Literature",
        "tagline": "Harsh inland deserts, colonial bushrangers, indigenous songlines, and modern epics.",
        "authors": ["Patrick White", "Peter Carey", "Markus Zusak", "Richard Flanagan", "Tim Winton"],
        "books": [
            {
                "title": "The Book Thief",
                "author": "Markus Zusak",
                "year": 2005,
                "rating": 98,
                "genre": "Historical Fiction",
                "genres": ["Narrated by Death", "WWII", "Books"],
                "city": "Sydney",
                "description": "Narrated by Death, the story of young Liesel Meminger who steals books and shares them with her neighbors and the Jewish man hidden in her basement.",
                "cover_id": 8234929,
                "key": "/works/OL15183557W"
            },
            {
                "title": "Voss",
                "author": "Patrick White",
                "year": 1957,
                "rating": 96,
                "genre": "Epic Fiction",
                "genres": ["Nobel Prize", "Outback Expedition", "Obsession"],
                "city": "Sydney & Outback",
                "description": "German explorer Johann Ulrich Voss leads a doomed expedition across the uncharted Australian desert, sustained by a telepathic communion with Laura Trevelyan.",
                "cover_id": 8234930,
                "key": "/works/OL15183560W"
            },
            {
                "title": "True History of the Kelly Gang",
                "author": "Peter Carey",
                "year": 2000,
                "rating": 95,
                "genre": "Historical Fiction",
                "genres": ["Booker Prize", "Bushranger", "Vernacular"],
                "city": "Victoria",
                "description": "The defiant, unpunctuated confessions of legendary Australian outlaw Ned Kelly, written to explain his life to his unborn daughter.",
                "cover_id": 8234931,
                "key": "/works/OL15183563W"
            }
        ]
    },
    {
        "id": "124",
        "name": "Canada",
        "code": "CA",
        "flag": "🇨🇦",
        "lat": 56.1304,
        "lng": -106.3468,
        "viewLat": 43.6532,
        "viewLng": -79.3832,  # Toronto
        "title": "Canadian Speculative & Domestic Masterpieces",
        "tagline": "Dystopian theocracies, shipwreck survival, intimate memories, and northern wilderness.",
        "authors": ["Margaret Atwood", "Yann Martel", "Alice Munro", "Michael Ondaatje"],
        "books": [
            {
                "title": "The Handmaid's Tale",
                "author": "Margaret Atwood",
                "year": 1985,
                "rating": 97,
                "genre": "Speculative Fiction",
                "genres": ["Dystopian", "Feminism", "Gilead"],
                "city": "Republic of Gilead / Toronto",
                "description": "In the totalitarian theocracy of Gilead, Offred is forced to serve as a Handmaid to bear children for the ruling elite while harboring secret memories of freedom.",
                "cover_id": 8234932,
                "key": "/works/OL15183566W"
            },
            {
                "title": "Life of Pi",
                "author": "Yann Martel",
                "year": 2001,
                "rating": 96,
                "genre": "Adventure Allegory",
                "genres": ["Booker Prize", "Faith", "Survival"],
                "city": "Pacific Ocean / Montreal",
                "description": "Following a tragic shipwreck, sixteen-year-old Pi Patel survives 227 days adrift on a lifeboat in the Pacific with a 450-pound Bengal tiger named Richard Parker.",
                "cover_id": 8234933,
                "key": "/works/OL15183569W"
            },
            {
                "title": "The English Patient",
                "author": "Michael Ondaatje",
                "year": 1992,
                "rating": 95,
                "genre": "Historical Romance",
                "genres": ["Booker Prize", "WWII", "Poetic Prose"],
                "city": "Tuscan Villa / Toronto",
                "description": "Four damaged souls converge at a ruined Italian villa at the close of WWII around a severely burned, nameless patient with a mysterious desert past.",
                "cover_id": 8234934,
                "key": "/works/OL15183572W"
            }
        ]
    }
]

def main():
    out_dir = os.path.join(os.path.dirname(__file__), "..", "public", "data")
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, "geo-books.json")

    total_books = sum(len(c["books"]) for c in GEO_COUNTRIES)
    print(f"Compiling {len(GEO_COUNTRIES)} countries with {total_books} seminal works...")

    # Enrich each book with proper cover URL and unique ID
    current_id = 0
    for country in GEO_COUNTRIES:
        for b in country["books"]:
            b["id"] = current_id
            current_id += 1
            b["country"] = country["name"]
            b["countryCode"] = country["code"]
            b["countryId"] = country["id"]
            b["countryFlag"] = country["flag"]
            b["lat"] = country["viewLat"]
            b["lng"] = country["viewLng"]
            cid = b.get("cover_id")
            if cid:
                b["cover"] = f"https://covers.openlibrary.org/b/id/{cid}-M.jpg"
                b["cover_url"] = f"https://covers.openlibrary.org/b/id/{cid}-M.jpg"
            else:
                b["cover"] = f"/covers/{b['id'] % 20}.jpg"
                b["cover_url"] = f"/covers/{b['id'] % 20}.jpg"
            b["openlibrary_url"] = f"https://openlibrary.org{b.get('key', '')}"

    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(GEO_COUNTRIES, f, indent=2, ensure_ascii=False)

    print(f"Successfully wrote {out_file} ({os.path.getsize(out_file)} bytes).")

if __name__ == "__main__":
    main()
