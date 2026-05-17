var Heroes = (function () {
  const list = [
    {
      id: "moses",
      name: "Moses",
      era: "Biblical",
      hp: 100,
      bio: "Led the Israelites out of Egypt; received the Ten Commandments at Mount Sinai.",
      stageId: "redsea",
      moves: {
        attack:  { name: "Staff Strike",   damage: 10, description: "A solid strike with the staff." },
        defend:  { name: "Pillar of Cloud", description: "Halves the next incoming attack." },
        special: { name: "Part the Sea",   damage: 25, description: "A sweeping wave deals heavy damage." }
      },
      trivia: [
        {
          question: "What were the Israelites freed from in the Exodus?",
          options: ["Slavery in Egypt", "Roman occupation", "Babylonian exile", "Persian rule"],
          correctIndex: 0,
          explanation: "Moses led the Israelites out of Egyptian slavery, leading to 40 years of wandering before reaching the Promised Land."
        },
        {
          question: "How many commandments did Moses receive on Mount Sinai?",
          options: ["Five", "Seven", "Ten", "Twelve"],
          correctIndex: 2,
          explanation: "The Ten Commandments were given on Mount Sinai and are central to Jewish, Christian, and Islamic tradition."
        },
        {
          question: "What body of water did Moses miraculously part?",
          options: ["The Jordan River", "The Sea of Galilee", "The Red Sea", "The Dead Sea"],
          correctIndex: 2,
          explanation: "Moses parted the Red Sea so the Israelites could escape Pharaoh’s army during the Exodus."
        },
        {
          question: "What did God appear to Moses through?",
          options: ["A burning bush", "A cloud", "A tablet of stone", "A voice from the sky"],
          correctIndex: 0,
          explanation: "God appeared to Moses through a bush that burned without being consumed and called him to lead the Israelites out of Egypt."
        },
        {
          question: "Who was Moses’s brother who spoke on his behalf?",
          options: ["Aaron", "Joshua", "Caleb", "Levi"],
          correctIndex: 0,
          explanation: "Aaron was Moses’s older brother and spoke for him before Pharaoh because Moses said he was ‘slow of speech.’"
        },
        {
          question: "How many years did the Israelites wander in the desert?",
          options: ["Seven", "Twenty", "Forty", "One hundred"],
          correctIndex: 2,
          explanation: "The Israelites wandered for 40 years before reaching the Promised Land. Moses himself did not enter."
        },
        {
          question: "How many plagues did God send upon Egypt?",
          options: ["Five", "Seven", "Ten", "Twelve"],
          correctIndex: 2,
          explanation: "Ten plagues struck Egypt, culminating in the death of the firstborn, which finally convinced Pharaoh to free the Israelites."
        },
        {
          question: "Where was Moses found as a baby?",
          options: ["In a basket on the Nile", "In a manger", "In a desert cave", "In a temple"],
          correctIndex: 0,
          explanation: "Moses’s mother hid him in a basket on the Nile to save him from Pharaoh’s decree. Pharaoh’s daughter found and raised him."
        },
        {
          question: "What was Moses’s profession before God called him to lead the Israelites?",
          options: ["Carpenter", "Shepherd", "Soldier", "Priest"],
          correctIndex: 1,
          explanation: "Moses fled Egypt to Midian, married Zipporah, and was tending his father-in-law Jethro’s flock when God called him at the burning bush."
        },
        {
          question: "What did Moses’s staff transform into to prove his divine mission?",
          options: ["A lion", "A flame", "A snake", "A tree"],
          correctIndex: 2,
          explanation: "At the burning bush, Moses’s staff turned into a snake. He later used it to perform miracles, including parting the Red Sea."
        },
        {
          question: "Who built the Golden Calf while Moses was on Mount Sinai?",
          options: ["Aaron", "Joshua", "Caleb", "Joseph"],
          correctIndex: 0,
          explanation: "Aaron made the Golden Calf when the impatient Israelites demanded a visible god. Moses shattered the first tablets in anger when he saw it."
        },
        {
          question: "What did the Israelites eat in the desert that fell from heaven?",
          options: ["Manna", "Quail", "Honey", "Bread"],
          correctIndex: 0,
          explanation: "Manna was a flake-like food that appeared with the morning dew each day. The Israelites ate it for the entire 40 years of wandering."
        },
        {
          question: "How old was Moses when he died, according to tradition?",
          options: ["70", "100", "120", "150"],
          correctIndex: 2,
          explanation: "Tradition holds Moses lived to 120 years — the source of the Jewish birthday blessing ‘until 120!’"
        },
        {
          question: "What was the final and most devastating plague of Egypt?",
          options: ["Hail", "Locusts", "Darkness", "Death of the firstborn"],
          correctIndex: 3,
          explanation: "The death of the Egyptian firstborn finally convinced Pharaoh to release the Israelites. The Israelites marked their doorposts with lamb’s blood to be ‘passed over.’"
        },
        {
          question: "Which Jewish holiday celebrates the Exodus from Egypt?",
          options: ["Hanukkah", "Passover", "Sukkot", "Shavuot"],
          correctIndex: 1,
          explanation: "Passover (Pesach) commemorates the Exodus. Jews retell the story each year at a Seder meal and abstain from leavened bread."
        },
        {
          question: "What flat unleavened bread is eaten on Passover to remember the rushed Exodus?",
          options: ["Pita", "Latkes", "Matzah", "Challah"],
          correctIndex: 2,
          explanation: "Matzah is eaten because the Israelites had no time for bread to rise as they fled Egypt. It’s also called the ‘bread of affliction.’"
        },
        {
          question: "What did Moses encounter in the burning bush narrative?",
          options: ["A talking serpent", "A bush burning without being consumed", "A pillar of fire", "A floating tablet"],
          correctIndex: 1,
          explanation: "Moses encountered a bush that burned without burning up, from which God spoke to him and assigned him to free the Israelites."
        },
        {
          question: "What request does Moses repeatedly make to Pharaoh?",
          options: ["Better food", "Let my people go", "More land", "Free trade"],
          correctIndex: 1,
          explanation: "Moses, speaking for God, demands ‘Let my people go!’ Pharaoh refuses ten times, triggering each plague in turn."
        },
        {
          question: "Who, besides Aaron, was a sibling of Moses?",
          options: ["Miriam", "Sarah", "Leah", "Esther"],
          correctIndex: 0,
          explanation: "Miriam was Moses’s older sister. She watched over baby Moses in the Nile basket and later led the women in song after crossing the Red Sea."
        },
        {
          question: "Where did Moses die, never having entered the Promised Land?",
          options: ["Mount Sinai", "Mount Nebo", "Mount Carmel", "Mount Zion"],
          correctIndex: 1,
          explanation: "Moses died on Mount Nebo (in modern-day Jordan), where God allowed him to see the Promised Land before he died."
        }
      ]
    },
    {
      id: "david",
      name: "King David",
      era: "Biblical",
      hp: 95,
      bio: "Shepherd boy who slew Goliath and became Israel’s greatest king.",
      stageId: "elah",
      moves: {
        attack:  { name: "Shepherd’s Sling", damage: 12, description: "A whirling stone strike." },
        defend:  { name: "Lion’s Cloak",     description: "Halves the next incoming attack." },
        special: { name: "Sling Stone",      damage: 22, description: "Devastating ranged shot; +10 damage if opponent HP > 50." }
      },
      trivia: [
        {
          question: "What weapon did David use to defeat Goliath?",
          options: ["A bow and arrow", "A sword", "A sling and stone", "A spear"],
          correctIndex: 2,
          explanation: "Young David refused armor and weapons, defeating the giant Goliath with just a sling and a single smooth stone."
        },
        {
          question: "Before becoming king, what was David’s profession?",
          options: ["Carpenter", "Shepherd", "Fisherman", "Blacksmith"],
          correctIndex: 1,
          explanation: "David was tending his father’s sheep when the prophet Samuel anointed him as the future king of Israel."
        },
        {
          question: "What musical instrument is David traditionally said to have played?",
          options: ["Flute", "Drum", "Trumpet", "Harp"],
          correctIndex: 3,
          explanation: "David was a skilled harpist; he played the harp to soothe King Saul, and the Book of Psalms is traditionally attributed to him."
        },
        {
          question: "What people did Goliath fight for?",
          options: ["Philistines", "Egyptians", "Romans", "Persians"],
          correctIndex: 0,
          explanation: "Goliath was a Philistine champion. David’s defeat of him broke the Philistine army."
        },
        {
          question: "Which of David’s sons became king after him?",
          options: ["Absalom", "Solomon", "Adonijah", "Jonathan"],
          correctIndex: 1,
          explanation: "Solomon succeeded David and built the First Temple in Jerusalem."
        },
        {
          question: "David made which city the capital of Israel?",
          options: ["Hebron", "Bethlehem", "Jerusalem", "Samaria"],
          correctIndex: 2,
          explanation: "After uniting the tribes, David captured Jerusalem and made it Israel’s political and religious capital."
        },
        {
          question: "David was anointed as a future king by which prophet?",
          options: ["Samuel", "Nathan", "Elijah", "Isaiah"],
          correctIndex: 0,
          explanation: "The prophet Samuel anointed the young shepherd David in his father Jesse’s house, foretelling he would replace King Saul."
        },
        {
          question: "What was the name of the king David replaced?",
          options: ["Solomon", "Saul", "Samuel", "Ahab"],
          correctIndex: 1,
          explanation: "King Saul, Israel’s first king, lost God’s favor. David served in his court before eventually succeeding him."
        },
        {
          question: "David’s closest friend, the previous king’s son, was named:",
          options: ["Jonathan", "Absalom", "Samuel", "Levi"],
          correctIndex: 0,
          explanation: "Jonathan was Saul’s son. He and David shared a deep friendship despite Saul’s hostility toward David."
        },
        {
          question: "In Jewish tradition, David is the ancestor of:",
          options: ["The High Priest", "Moses", "The future Messiah", "Abraham"],
          correctIndex: 2,
          explanation: "Jewish tradition holds that the Messiah will descend from the House of David — ‘Mashiach ben David.’"
        },
        {
          question: "David’s beloved wife and his great moral failure involved which woman?",
          options: ["Michal", "Abigail", "Bathsheba", "Ruth"],
          correctIndex: 2,
          explanation: "David committed adultery with Bathsheba and arranged the death of her husband Uriah — a defining moral lapse for which the prophet Nathan rebuked him."
        },
        {
          question: "Which prophet famously confronted King David about his sin?",
          options: ["Samuel", "Nathan", "Elijah", "Isaiah"],
          correctIndex: 1,
          explanation: "Nathan told David the parable of the rich man who stole the poor man’s lamb, then declared ‘You are the man,’ confronting him with his guilt."
        },
        {
          question: "Which of David’s sons led a rebellion against him?",
          options: ["Solomon", "Absalom", "Adonijah", "Amnon"],
          correctIndex: 1,
          explanation: "Absalom led a violent rebellion against his father David. He was killed when his long hair caught in an oak tree branch."
        },
        {
          question: "David’s father was named:",
          options: ["Jacob", "Jesse", "Aaron", "Samuel"],
          correctIndex: 1,
          explanation: "Jesse was David’s father, of the tribe of Judah. The prophecy of a messianic ‘shoot from the stump of Jesse’ (Isaiah 11) refers to this lineage."
        },
        {
          question: "David belonged to which of the Twelve Tribes of Israel?",
          options: ["Levi", "Judah", "Benjamin", "Reuben"],
          correctIndex: 1,
          explanation: "David was from the tribe of Judah. The Jewish people take their name from this tribe."
        },
        {
          question: "David reigned as king for approximately how many years?",
          options: ["10", "25", "40", "70"],
          correctIndex: 2,
          explanation: "David reigned 40 years total — first seven over Judah from Hebron, then 33 over all Israel from Jerusalem."
        },
        {
          question: "Goliath fought on behalf of which people?",
          options: ["Romans", "Philistines", "Egyptians", "Persians"],
          correctIndex: 1,
          explanation: "Goliath was a Philistine champion from Gath. The Philistines were a coastal people who repeatedly fought Israel during this era."
        },
        {
          question: "David’s wife who saved him from her father King Saul was:",
          options: ["Michal", "Abigail", "Bathsheba", "Sarah"],
          correctIndex: 0,
          explanation: "Michal, Saul’s daughter and David’s first wife, lowered David out a window to escape her father’s assassins."
        },
        {
          question: "David’s son who succeeded him and built the First Temple was:",
          options: ["Absalom", "Adonijah", "Solomon", "Jonathan"],
          correctIndex: 2,
          explanation: "Solomon became king after David and built the First Temple in Jerusalem, fulfilling David’s dream that had been forbidden to David himself."
        },
        {
          question: "In Jewish liturgy, David is credited with composing many of the:",
          options: ["Proverbs", "Psalms (Tehillim)", "Lamentations", "Daily prayers"],
          correctIndex: 1,
          explanation: "Tradition attributes most of the 150 Psalms (Tehillim) to David, including the famous ‘The Lord is my shepherd’ (Psalm 23)."
        }
      ]
    },
    {
      id: "esther",
      name: "Queen Esther",
      era: "Biblical",
      hp: 90,
      bio: "Saved her people from Haman’s plot; her story is read every Purim.",
      stageId: "throne",
      moves: {
        attack:  { name: "Royal Decree",   damage: 10, description: "Authoritative strike." },
        defend:  { name: "Court Veil",     description: "Halves the next incoming attack." },
        special: { name: "Reversal",       description: "Next attack against her bounces back at 1.5x damage." }
      },
      trivia: [
        {
          question: "Which Jewish holiday celebrates Queen Esther’s story?",
          options: ["Hanukkah", "Purim", "Passover", "Yom Kippur"],
          correctIndex: 1,
          explanation: "Purim celebrates Esther’s bravery in saving the Jewish people of Persia from Haman’s plot. The Book of Esther is read aloud at synagogue."
        },
        {
          question: "What was the name of the king Esther married?",
          options: ["Solomon", "Ahasuerus", "Cyrus", "Nebuchadnezzar"],
          correctIndex: 1,
          explanation: "Esther became queen of the Persian king Ahasuerus (also known as Xerxes), giving her the position to save her people."
        },
        {
          question: "Who was the villain that Esther helped defeat?",
          options: ["Pharaoh", "Goliath", "Haman", "Nebuchadnezzar"],
          correctIndex: 2,
          explanation: "Haman was the king’s advisor who plotted to destroy the Jewish people; Esther exposed his plan and saved her people."
        },
        {
          question: "Who raised Esther after her parents died?",
          options: ["Her uncle Mordecai", "Her brother Aaron", "Queen Vashti", "King Ahasuerus"],
          correctIndex: 0,
          explanation: "Mordecai, Esther’s older cousin (often called her uncle), raised her in Susa and guided her throughout the events of the Book of Esther."
        },
        {
          question: "What was Esther’s Hebrew name?",
          options: ["Sarah", "Rachel", "Hadassah", "Miriam"],
          correctIndex: 2,
          explanation: "Esther’s Hebrew name was Hadassah, meaning ‘myrtle.’ Esther is a Persian name."
        },
        {
          question: "In which Persian city does the story of Esther take place?",
          options: ["Babylon", "Persepolis", "Susa (Shushan)", "Damascus"],
          correctIndex: 2,
          explanation: "Susa (Shushan in Hebrew) was a winter capital of the Persian Empire. The Book of Esther is set entirely there."
        },
        {
          question: "What triangular pastries are traditionally eaten on Purim?",
          options: ["Hamantaschen", "Latkes", "Sufganiyot", "Rugelach"],
          correctIndex: 0,
          explanation: "Hamantaschen are three-cornered cookies named after Haman’s hat (or ears). They’re filled with poppy seed, fruit jams, or chocolate."
        },
        {
          question: "What is the special noisemaker used at Purim called?",
          options: ["Shofar", "Dreidel", "Grogger", "Tambourine"],
          correctIndex: 2,
          explanation: "A grogger (or ‘ra’ashan’ in Hebrew) is used to drown out Haman’s name when it is read from the Megillah at Purim."
        },
        {
          question: "What did Esther do for 3 days before approaching the king to plead for her people?",
          options: ["Fast and pray", "Travel", "Train with a sword", "Hide in the palace"],
          correctIndex: 0,
          explanation: "Esther asked all the Jews of Susa to fast for three days before she risked her life by approaching the king without being summoned."
        },
        {
          question: "Esther was queen of which empire?",
          options: ["Egyptian", "Persian", "Greek", "Roman"],
          correctIndex: 1,
          explanation: "Esther was queen of the Persian Empire under King Ahasuerus, who many scholars identify with the historical Xerxes I."
        },
        {
          question: "What command did Mordecai refuse to obey, enraging Haman?",
          options: ["To convert religion", "To bow down to Haman", "To pay extra tax", "To leave Susa"],
          correctIndex: 1,
          explanation: "Mordecai refused to bow down to Haman, and Haman's wounded pride led him to plot the destruction of all the Jews of Persia."
        },
        {
          question: "Mordecai saved the king's life by uncovering what plot?",
          options: ["A theft", "An assassination conspiracy", "A tax fraud", "A foreign invasion"],
          correctIndex: 1,
          explanation: "Mordecai overheard two of the king's eunuchs plotting to assassinate him, reported it, and was eventually rewarded — much to Haman's frustration."
        },
        {
          question: "Haman's plot decreed that all Jews would be killed on what date?",
          options: ["13th of Adar", "25th of Kislev", "10th of Tishrei", "14th of Nisan"],
          correctIndex: 0,
          explanation: "Haman cast lots ('purim') and chose the 13th of Adar for his planned massacre. The Jews instead defended themselves successfully on that day, and Purim is celebrated on the 14th."
        },
        {
          question: "What special scroll is read aloud at Purim?",
          options: ["The Torah", "The Megillah (Book of Esther)", "The Haggadah", "The Mishnah"],
          correctIndex: 1,
          explanation: "The Megillat Esther (Scroll of Esther) is read aloud twice — once at night and once in the morning — during Purim."
        },
        {
          question: "Esther approached the king with her plea by first inviting him to:",
          options: ["A military council", "A banquet", "A wedding", "A debate"],
          correctIndex: 1,
          explanation: "Esther invited the king and Haman to two banquets. At the second, she revealed her Jewish identity and exposed Haman's plot."
        },
        {
          question: "The Persian queen Esther replaced was named:",
          options: ["Vashti", "Sarah", "Bathsheba", "Jezebel"],
          correctIndex: 0,
          explanation: "Vashti refused to appear before the king's drunken party and was banished. A beauty contest to find her replacement made Esther queen."
        },
        {
          question: "Which Purim mitzvah involves helping those in need?",
          options: ["Lighting candles", "Building a sukkah", "Giving gifts to the poor (Matanot LaEvyonim)", "Blowing the shofar"],
          correctIndex: 2,
          explanation: "Purim has four mitzvot: hearing the Megillah, festive meal, gifts of food to friends (mishloach manot), and gifts to the poor (matanot la'evyonim)."
        },
        {
          question: "The Book of Esther is notable for not explicitly mentioning:",
          options: ["The king", "Persia", "God", "Jews"],
          correctIndex: 2,
          explanation: "The Book of Esther is one of only two books in the Hebrew Bible that do not contain God's name (the other is Song of Songs), yet God's hand is seen throughout the story."
        },
        {
          question: "What did Haman build that he himself was ultimately hanged on?",
          options: ["A gallows", "A throne", "A sword stand", "A tower"],
          correctIndex: 0,
          explanation: "Haman built a 50-cubit-tall gallows intending to hang Mordecai. After his plot was exposed, the king ordered Haman hanged on his own gallows."
        },
        {
          question: "In which modern country was the Persian Empire of Esther's time primarily located?",
          options: ["Iraq", "Iran", "Egypt", "Greece"],
          correctIndex: 1,
          explanation: "The Achaemenid Persian Empire was centered in modern-day Iran. Its capitals included Susa (Shushan), Persepolis, and Ecbatana."
        }
      ]
    },
    {
      id: "judah",
      name: "Judah Maccabee",
      era: "Maccabees",
      hp: 100,
      bio: "Led the revolt that reclaimed and rededicated the Temple; the hero of Hanukkah.",
      stageId: "temple",
      moves: {
        attack:  { name: "Spear Thrust",   damage: 11, description: "A swift spear jab." },
        defend:  { name: "Phalanx Shield", description: "Halves the next incoming attack." },
        special: { name: "Menorah Flame",  damage: 8, description: "8 damage now plus 8 per turn for 3 turns." }
      },
      trivia: [
        {
          question: "Judah Maccabee’s revolt and rededication of the Temple is celebrated as which holiday?",
          options: ["Passover", "Sukkot", "Hanukkah", "Rosh Hashanah"],
          correctIndex: 2,
          explanation: "Hanukkah commemorates the Maccabean victory and the miracle of the oil that burned for 8 days when it should have lasted only one."
        },
        {
          question: "How many nights does Hanukkah last?",
          options: ["Three", "Five", "Seven", "Eight"],
          correctIndex: 3,
          explanation: "Hanukkah lasts eight nights, commemorating the miracle of the temple oil that burned for eight days."
        },
        {
          question: "What is the special candelabrum lit during Hanukkah called?",
          options: ["Menorah", "Shofar", "Chanukiah", "Both menorah and chanukiah"],
          correctIndex: 3,
          explanation: "The nine-branched candelabrum lit during Hanukkah is called a chanukiah, though many people simply call it a Hanukkah menorah."
        },
        {
          question: "The Maccabees fought against which empire?",
          options: ["Roman", "Egyptian", "Seleucid Greek", "Persian"],
          correctIndex: 2,
          explanation: "Judah Maccabee led the revolt against the Seleucid Greek empire ruled by Antiochus IV, who had outlawed Jewish practice."
        },
        {
          question: "In approximately what year did the Maccabean revolt take place?",
          options: ["500 BCE", "165 BCE", "70 CE", "300 CE"],
          correctIndex: 1,
          explanation: "The Maccabean revolt began around 167 BCE and the Temple was rededicated in 165 BCE — the event Hanukkah commemorates."
        },
        {
          question: "What fried food is traditional at Hanukkah?",
          options: ["Latkes (potato pancakes)", "Matzah", "Challah", "Falafel"],
          correctIndex: 0,
          explanation: "Hanukkah foods are fried in oil to commemorate the oil miracle. Latkes in Ashkenazi tradition; sufganiyot (jelly donuts) in Israel."
        },
        {
          question: "The Maccabee family is also known as the:",
          options: ["Davidites", "Hasmoneans", "Cohens", "Levites"],
          correctIndex: 1,
          explanation: "The Maccabees founded the Hasmonean dynasty, which ruled an independent Jewish kingdom from 140 BCE until Rome’s takeover in 63 BCE."
        },
        {
          question: "What spinning toy is played with at Hanukkah?",
          options: ["Top", "Dreidel", "Yo-yo", "Pinwheel"],
          correctIndex: 1,
          explanation: "The dreidel (sevivon in Hebrew) has 4 Hebrew letters that stand for ‘a great miracle happened there’ (or ‘here’ in Israel)."
        },
        {
          question: "The Hebrew word ‘Hanukkah’ means:",
          options: ["Miracle", "Light", "Dedication", "Victory"],
          correctIndex: 2,
          explanation: "Hanukkah means ‘dedication’ — referring to the rededication of the Second Temple after it was reclaimed and purified by the Maccabees."
        },
        {
          question: "What miracle is Hanukkah primarily celebrating?",
          options: ["The parting of the sea", "Manna from heaven", "Oil burning for eight days", "Walls of Jericho falling"],
          correctIndex: 2,
          explanation: "When the Maccabees rededicated the Temple, only one day’s worth of pure oil was found, but it miraculously burned for eight days — long enough to prepare more."
        },
        {
          question: "Judah Maccabee’s father, who began the revolt, was named:",
          options: ["Mattathias", "Aaron", "Saul", "Eleazar"],
          correctIndex: 0,
          explanation: "Mattathias, an aged priest, killed a Jew who was about to sacrifice to a Greek god, sparking the revolt. His five sons, including Judah, carried it forward."
        },
        {
          question: "What does the Hebrew word ‘Maccabee’ likely mean?",
          options: ["Hammer", "Wisdom", "Light", "King"],
          correctIndex: 0,
          explanation: "Maccabee likely comes from ‘maqqaba’ meaning ‘hammer’ — describing Judah’s military style. Another theory: it’s an acronym for ‘Who is like You among the gods, O Lord?’"
        },
        {
          question: "What ruler banned Jewish practice and desecrated the Temple, sparking the revolt?",
          options: ["Pharaoh", "Antiochus IV Epiphanes", "Julius Caesar", "Cyrus the Great"],
          correctIndex: 1,
          explanation: "Antiochus IV Epiphanes outlawed Jewish religion, sacrificed pigs in the Temple, and demanded Jews worship Greek gods — triggering the Maccabean revolt."
        },
        {
          question: "How many candles are on a chanukiah (Hanukkah menorah)?",
          options: ["7", "8", "9", "12"],
          correctIndex: 2,
          explanation: "A chanukiah has 9 holders: 8 for the days of Hanukkah plus the shamash (‘helper’), used to light the others."
        },
        {
          question: "The ‘helper’ candle on the chanukiah is called the:",
          options: ["Shamash", "Kiddush", "Mezuzah", "Etrog"],
          correctIndex: 0,
          explanation: "The shamash sits higher or apart from the others. Its job is to kindle the eight Hanukkah lights — the Hanukkah lights themselves can’t be used for any other purpose."
        },
        {
          question: "What do the four Hebrew letters on a dreidel stand for?",
          options: ["The names of the prophets", "’A great miracle happened there’", "The kings of Israel", "The four matriarchs"],
          correctIndex: 1,
          explanation: "Nun-Gimel-Hei-Shin stands for ‘Nes Gadol Hayah Sham’ — A great miracle happened there. In Israel, the last letter is Pei for ‘Po’ (here)."
        },
        {
          question: "How many days are in the holiday of Hanukkah?",
          options: ["3", "5", "7", "8"],
          correctIndex: 3,
          explanation: "Hanukkah lasts 8 days and nights, commemorating the miracle that one day’s oil burned for 8."
        },
        {
          question: "The Maccabees rededicated which sacred building in Jerusalem?",
          options: ["The First Temple", "The Second Temple", "The Tabernacle", "A new synagogue"],
          correctIndex: 1,
          explanation: "The Maccabees recaptured and rededicated the Second Temple, which had been built by Jews returning from Babylonian exile and later defiled by Antiochus."
        },
        {
          question: "The Maccabees founded a dynasty that ruled Judea for about how long?",
          options: ["20 years", "100 years", "300 years", "500 years"],
          correctIndex: 1,
          explanation: "The Hasmonean dynasty, founded by the Maccabees, ruled an independent Jewish kingdom for roughly 100 years (140–63 BCE) until Roman conquest."
        },
        {
          question: "Which special prayer of thanksgiving is added on Hanukkah?",
          options: ["Sh’ma", "Al HaNissim", "Aleinu", "Kaddish"],
          correctIndex: 1,
          explanation: "Al HaNissim (‘For the miracles’) is added to the Amidah prayer and Birkat HaMazon (grace after meals) during Hanukkah and Purim."
        }
      ]
    },
    {
      id: "rambam",
      name: "Maimonides",
      era: "Medieval",
      hp: 85,
      bio: "Medieval philosopher and physician; wrote the Mishneh Torah.",
      stageId: "cordoba",
      moves: {
        attack:  { name: "Wisdom Bolt",         damage: 9, description: "A focused intellectual strike." },
        defend:  { name: "Philosophical Calm",  description: "Halves the next incoming attack." },
        special: { name: "Healing Touch",       heal: 20, description: "Restores 20 HP to self." }
      },
      trivia: [
        {
          question: "Besides being a philosopher, Maimonides (the Rambam) was famous as a:",
          options: ["Physician", "Sailor", "Architect", "Soldier"],
          correctIndex: 0,
          explanation: "Maimonides served as physician to the sultan of Egypt while writing the Mishneh Torah, one of the most influential codes of Jewish law."
        },
        {
          question: "What is the name of Maimonides’ famous code of Jewish law?",
          options: ["Talmud", "Mishneh Torah", "Zohar", "Shulchan Aruch"],
          correctIndex: 1,
          explanation: "The Mishneh Torah is a 14-volume code of Jewish religious law that Maimonides completed in 1180."
        },
        {
          question: "In which century did Maimonides live?",
          options: ["10th century", "12th century", "14th century", "16th century"],
          correctIndex: 1,
          explanation: "Maimonides lived 1138–1204, during the 12th century. He was born in Cordoba, Spain."
        },
        {
          question: "Maimonides was born in which city?",
          options: ["Cordoba, Spain", "Cairo, Egypt", "Jerusalem", "Baghdad"],
          correctIndex: 0,
          explanation: "Maimonides was born in Cordoba in 1138. His family fled Almohad persecution when he was a child."
        },
        {
          question: "Where did Maimonides spend the last decades of his life?",
          options: ["Spain", "Egypt", "Morocco", "Yemen"],
          correctIndex: 1,
          explanation: "Maimonides settled in Fustat, near Cairo, Egypt. He served as personal physician to Saladin’s vizier and led the local Jewish community."
        },
        {
          question: "What does ‘Rambam’ stand for?",
          options: ["Rabbi Moses ben Maimon", "Rabbi of all Mishnah", "A type of prayer", "An Egyptian city"],
          correctIndex: 0,
          explanation: "Rambam is the Hebrew acronym for Rabbeinu Moshe ben Maimon — ‘Our rabbi, Moses son of Maimon.’"
        },
        {
          question: "Maimonides articulated how many fundamental principles of Jewish faith?",
          options: ["Five", "Ten", "Thirteen", "Twenty"],
          correctIndex: 2,
          explanation: "Maimonides’s 13 Principles of Faith are recited in many synagogues and form the basis of the Yigdal hymn."
        },
        {
          question: "Maimonides’s major philosophical work is titled:",
          options: ["Guide for the Perplexed", "The Book of Doubt", "On Wisdom", "The Way of Light"],
          correctIndex: 0,
          explanation: "The Guide for the Perplexed reconciles Jewish theology with Aristotelian philosophy. It was written in Judeo-Arabic around 1190."
        },
        {
          question: "Maimonides served as personal physician at the court of:",
          options: ["The Pope", "Saladin’s vizier in Egypt", "Caesar", "King Louis of France"],
          correctIndex: 1,
          explanation: "Maimonides was court physician to al-Fadil, Saladin’s vizier in Egypt, and reportedly to Saladin himself."
        },
        {
          question: "In what language did Maimonides write most of his philosophical works?",
          options: ["Hebrew", "Aramaic", "Arabic", "Latin"],
          correctIndex: 2,
          explanation: "Maimonides wrote his philosophical works in Judeo-Arabic — Arabic written in Hebrew letters — the everyday language of educated Jews in Muslim lands."
        },
        {
          question: "Maimonides's family was forced to flee Spain due to persecution by the:",
          options: ["Romans", "Almohads", "Visigoths", "Crusaders"],
          correctIndex: 1,
          explanation: "The Almohad dynasty, fanatical Muslim Berbers, conquered Cordoba in 1148 and forced Jews and Christians to convert, flee, or die. Maimonides's family fled."
        },
        {
          question: "Maimonides is famously buried in:",
          options: ["Cairo", "Cordoba", "Tiberias", "Jerusalem"],
          correctIndex: 2,
          explanation: "Maimonides died in Egypt in 1204 but was buried in Tiberias, Israel. His grave remains a place of pilgrimage today."
        },
        {
          question: "The Mishneh Torah is organized into how many books?",
          options: ["5", "9", "14", "21"],
          correctIndex: 2,
          explanation: "The Mishneh Torah has 14 books — its name (Yad HaChazakah, 'The Mighty Hand') alludes to the numerical value of 14."
        },
        {
          question: "Maimonides articulated how many fundamental principles of Jewish faith?",
          options: ["7", "10", "13", "18"],
          correctIndex: 2,
          explanation: "Maimonides's 13 Principles include God's unity, prophecy, and resurrection. They appear in many siddurim and are sung as the hymn 'Yigdal.'"
        },
        {
          question: "The Hebrew title of 'Guide for the Perplexed' is:",
          options: ["Moreh Nevuchim", "Sefer HaMitzvot", "Zohar", "Talmud"],
          correctIndex: 0,
          explanation: "Moreh Nevuchim (or Moreh HaNevuchim) was originally written in Judeo-Arabic and later translated to Hebrew. It addresses educated Jews struggling to reconcile philosophy with faith."
        },
        {
          question: "Maimonides codified how many commandments (mitzvot) from the Torah?",
          options: ["100", "248", "365", "613"],
          correctIndex: 3,
          explanation: "Maimonides catalogued 613 commandments in his Sefer HaMitzvot: 248 positive (do this) and 365 negative (don't do that) — matching the days of the year and bones of the body."
        },
        {
          question: "Maimonides's brother David, a jewel trader, died:",
          options: ["In a famine", "In a shipwreck", "In battle", "Of old age"],
          correctIndex: 1,
          explanation: "David's death in a shipwreck devastated Moses (Maimonides), who fell ill from grief for a year. After David's death, Moses had to support the family through medicine."
        },
        {
          question: "Maimonides served as personal physician to the court of which Muslim leader?",
          options: ["Saladin", "Suleiman", "Akbar", "Mehmed the Conqueror"],
          correctIndex: 0,
          explanation: "Maimonides was physician to al-Fadil, vizier to Saladin (the Muslim leader who recaptured Jerusalem from the Crusaders). He may have treated Saladin himself."
        },
        {
          question: "Maimonides famously argued that descriptions of God in the Torah should not be understood:",
          options: ["Allegorically", "Literally / physically", "Philosophically", "Historically"],
          correctIndex: 1,
          explanation: "Maimonides rejected anthropomorphic descriptions of God. When the Torah speaks of God's 'hand' or 'face,' he insists these are metaphors — God has no physical form."
        },
        {
          question: "In which language did Maimonides write the Mishneh Torah?",
          options: ["Arabic", "Aramaic", "Hebrew", "Latin"],
          correctIndex: 2,
          explanation: "Maimonides wrote the Mishneh Torah in clear Mishnaic Hebrew so any educated Jew could understand it — unusual for his time, when scholarly works were often in Aramaic or Arabic."
        }
      ]
    },
    {
      id: "golda",
      name: "Golda Meir",
      era: "Modern",
      hp: 100,
      bio: "Israel’s fourth Prime Minister; the ‘Iron Lady of Israel.’",
      stageId: "knesset",
      moves: {
        attack:  { name: "Iron Word",          damage: 10, description: "A blunt verbal strike." },
        defend:  { name: "Diplomatic Shield",  counter: 5, description: "Halves the next incoming attack and counters for 5." },
        special: { name: "Resolve",            description: "Her next Basic Attack hits for double damage." }
      },
      trivia: [
        {
          question: "Golda Meir served as Prime Minister of which country?",
          options: ["United States", "France", "Israel", "Egypt"],
          correctIndex: 2,
          explanation: "Golda Meir was Israel’s fourth Prime Minister (1969–1974) and one of the first female heads of government in the modern world."
        },
        {
          question: "Golda Meir was Israel’s _____ Prime Minister.",
          options: ["First", "Second", "Third", "Fourth"],
          correctIndex: 3,
          explanation: "Golda Meir was Israel’s fourth Prime Minister, serving from 1969 to 1974."
        },
        {
          question: "Before becoming PM, Golda Meir was Israel’s foreign minister and:",
          options: ["Defense minister", "Labor minister", "Education minister", "Finance minister"],
          correctIndex: 1,
          explanation: "Golda Meir served as Israel’s first Minister of Labor (1949–1956) and later as Foreign Minister before becoming Prime Minister."
        },
        {
          question: "Golda Meir was born in what city?",
          options: ["Tel Aviv", "Kiev", "New York", "London"],
          correctIndex: 1,
          explanation: "Golda Meir (born Goldie Mabovitch) was born in Kiev in 1898, in what was then the Russian Empire."
        },
        {
          question: "Where did Golda Meir grow up after leaving Russia?",
          options: ["England", "South Africa", "Milwaukee, Wisconsin", "Argentina"],
          correctIndex: 2,
          explanation: "Her family emigrated to the United States and settled in Milwaukee, Wisconsin in 1906. Golda became a teacher there before moving to Palestine."
        },
        {
          question: "Which war broke out during Golda Meir’s term as Prime Minister?",
          options: ["Six-Day War", "Yom Kippur War", "First Lebanon War", "First Gulf War"],
          correctIndex: 1,
          explanation: "The Yom Kippur War began on October 6, 1973, when Egypt and Syria launched a surprise attack on the holiest day of the Jewish year."
        },
        {
          question: "Golda Meir was the first female to hold what position?",
          options: ["Israeli Prime Minister", "Member of the Knesset", "U.N. Secretary General", "Foreign Minister of any country"],
          correctIndex: 0,
          explanation: "Golda Meir was Israel’s first female Prime Minister and only the third woman in modern history to lead a country."
        },
        {
          question: "What was Golda Meir’s profession before politics?",
          options: ["Lawyer", "Teacher", "Doctor", "Journalist"],
          correctIndex: 1,
          explanation: "Before emigrating to Palestine in 1921, Golda Meir trained and worked as a schoolteacher in Milwaukee, Wisconsin."
        },
        {
          question: "Golda Meir served as Foreign Minister of Israel under which Prime Minister?",
          options: ["David Ben-Gurion", "Levi Eshkol", "Yitzhak Rabin", "Menachem Begin"],
          correctIndex: 0,
          explanation: "She served as Foreign Minister from 1956 to 1966 under Prime Minister David Ben-Gurion, who urged her to adopt the Hebrew name ‘Meir.’"
        },
        {
          question: "In what year did Golda Meir resign as Prime Minister?",
          options: ["1972", "1974", "1977", "1979"],
          correctIndex: 1,
          explanation: "Meir resigned in April 1974, taking responsibility for Israel’s lack of preparation for the Yom Kippur War."
        },
        {
          question: "Golda Meir’s birth surname was:",
          options: ["Meir", "Mabovitch", "Cohen", "Levin"],
          correctIndex: 1,
          explanation: "Born Goldie Mabovitch in Kiev, she later took her husband’s surname Meyerson — and Hebraicized it to Meir (‘illuminator’) in 1956 at Ben-Gurion’s request."
        },
        {
          question: "In what year did Golda Meir die?",
          options: ["1969", "1974", "1978", "1985"],
          correctIndex: 2,
          explanation: "Golda Meir died of lymphoma in December 1978 in Jerusalem, four years after stepping down as Prime Minister."
        },
        {
          question: "Golda Meir trained and worked as a teacher in:",
          options: ["Tel Aviv", "Kiev", "Milwaukee, Wisconsin", "Chicago, Illinois"],
          correctIndex: 2,
          explanation: "Golda trained at the Milwaukee Normal School and taught in Milwaukee public schools before emigrating to Palestine in 1921."
        },
        {
          question: "In what year did Golda Meir immigrate to Mandate Palestine?",
          options: ["1906", "1921", "1948", "1956"],
          correctIndex: 1,
          explanation: "Golda emigrated in 1921, joining a Zionist labor movement and eventually settling on Kibbutz Merhavia in northern Palestine."
        },
        {
          question: "What is a ‘kibbutz’ (such as Merhavia, where young Golda lived)?",
          options: ["A type of meal", "A collective farm", "A city", "A military base"],
          correctIndex: 1,
          explanation: "A kibbutz is a collective community in Israel, traditionally agricultural, where everything was shared. Many of Israel’s founding leaders lived on kibbutzim."
        },
        {
          question: "Golda Meir was one of the signers of which historic document?",
          options: ["The British Mandate", "Israel’s Declaration of Independence (1948)", "The Camp David Accords", "UN Resolution 181"],
          correctIndex: 1,
          explanation: "Golda Meir was one of 24 women and 13 men who signed Israel’s Declaration of Independence on May 14, 1948."
        },
        {
          question: "Her Hebrew surname ‘Meir’ means:",
          options: ["Illuminator (one who shines)", "Defender", "Builder", "Warrior"],
          correctIndex: 0,
          explanation: "Meir means ‘one who illuminates’ — a name fitting her trailblazing role as Israel’s first female head of government."
        },
        {
          question: "Golda Meir was Israel’s first ambassador to:",
          options: ["The United States", "The Soviet Union", "The United Kingdom", "Egypt"],
          correctIndex: 1,
          explanation: "She served as Israel’s first ambassador to Moscow in 1948–1949. Her visit to a Moscow synagogue on Rosh Hashanah drew 50,000 cheering Soviet Jews."
        },
        {
          question: "Golda Meir was succeeded as Prime Minister by:",
          options: ["Menachem Begin", "Yitzhak Rabin", "Shimon Peres", "Ariel Sharon"],
          correctIndex: 1,
          explanation: "Yitzhak Rabin (a former general and Israel’s first native-born PM) succeeded Golda in 1974 after her resignation."
        },
        {
          question: "Golda Meir often described herself with the famous self-deprecating quip that she was just a:",
          options: ["Tough old grandmother", "Schoolteacher from Milwaukee", "Stubborn farmer", "Politician’s wife"],
          correctIndex: 1,
          explanation: "Golda often described herself as ‘just a schoolteacher from Milwaukee’ — emphasizing her humble American roots over her political stature."
        }
      ]
    },
    {
      id: "einstein",
      name: "Albert Einstein",
      era: "Modern",
      hp: 80,
      bio: "Physicist whose theory of relativity changed how we understand the universe.",
      stageId: "princeton",
      moves: {
        attack:  { name: "Equation Spark",  damage: 8, description: "A small bolt of energy." },
        defend:  { name: "Theory Shield",   description: "Halves the next incoming attack." },
        special: { name: "E=mc²",      damage: 40, description: "Charges 2 turns (cannot act), then unleashes massive damage." }
      },
      trivia: [
        {
          question: "Einstein’s most famous equation expresses the relationship between:",
          options: ["Force and acceleration", "Mass and energy", "Voltage and current", "Pressure and volume"],
          correctIndex: 1,
          explanation: "E=mc² means energy (E) equals mass (m) times the speed of light squared. It’s the foundation of nuclear physics and changed how we understand the universe."
        },
        {
          question: "Einstein won the Nobel Prize in Physics in 1921 for his work on:",
          options: ["General relativity", "The atomic bomb", "The photoelectric effect", "Black holes"],
          correctIndex: 2,
          explanation: "Einstein won the Nobel Prize for explaining the photoelectric effect — not for relativity, which was considered too controversial at the time."
        },
        {
          question: "Where did Einstein spend the final decades of his life?",
          options: ["Cambridge, England", "Berlin, Germany", "Princeton, New Jersey", "Zurich, Switzerland"],
          correctIndex: 2,
          explanation: "Einstein fled Nazi Germany in 1933 and lived in Princeton, New Jersey until his death in 1955, working at the Institute for Advanced Study."
        },
        {
          question: "Einstein was born in which country?",
          options: ["Switzerland", "Germany", "Austria", "United States"],
          correctIndex: 1,
          explanation: "Einstein was born in Ulm, Germany in 1879. His family moved to Munich the next year."
        },
        {
          question: "Einstein published his theory of special relativity in:",
          options: ["1900", "1905", "1915", "1925"],
          correctIndex: 1,
          explanation: "1905 is called Einstein’s ‘miracle year’ — he published four groundbreaking papers, including special relativity, the photoelectric effect, Brownian motion, and E=mc²."
        },
        {
          question: "Einstein’s general relativity replaced whose classical theory of gravity?",
          options: ["Newton’s", "Kepler’s", "Galileo’s", "Aristotle’s"],
          correctIndex: 0,
          explanation: "General relativity, published in 1915, redefined gravity as the curvature of spacetime by mass — superseding Newton’s law of universal gravitation."
        },
        {
          question: "Einstein once turned down an offer to become president of:",
          options: ["The United States", "Switzerland", "Israel", "Germany"],
          correctIndex: 2,
          explanation: "In 1952, after Chaim Weizmann’s death, Israel offered Einstein its presidency. He declined, saying he lacked the ‘natural aptitude’ for human affairs."
        },
        {
          question: "Einstein’s first wife, a fellow physics student, was named:",
          options: ["Marie Curie", "Mileva Maric", "Lise Meitner", "Hedwig Born"],
          correctIndex: 1,
          explanation: "Mileva Maric, a Serbian physicist, married Einstein in 1903. Some historians debate her contributions to his early work."
        },
        {
          question: "Einstein’s letter to which U.S. president led to the Manhattan Project?",
          options: ["Wilson", "Roosevelt", "Truman", "Eisenhower"],
          correctIndex: 1,
          explanation: "In 1939, Einstein signed a letter to President Franklin D. Roosevelt warning of Germany’s potential to develop a nuclear weapon, prompting the U.S. atomic program."
        },
        {
          question: "In what year did Einstein win the Nobel Prize?",
          options: ["1905", "1915", "1921", "1933"],
          correctIndex: 2,
          explanation: "Einstein won the 1921 Nobel Prize in Physics for his explanation of the photoelectric effect — given in 1922 because the 1921 prize was initially withheld."
        },
        {
          question: "Einstein famously said 'God does not ___ with the universe.'",
          options: ["argue", "play dice", "hide", "draw"],
          correctIndex: 1,
          explanation: "Einstein resisted the randomness of quantum mechanics, writing 'God does not play dice with the universe.' Niels Bohr reportedly replied: 'Stop telling God what to do.'"
        },
        {
          question: "Einstein's 1905 'miracle year' produced how many groundbreaking papers?",
          options: ["1", "2", "4", "10"],
          correctIndex: 2,
          explanation: "In 1905 Einstein published four world-changing papers: on the photoelectric effect, Brownian motion, special relativity, and the mass-energy equivalence (E=mc²)."
        },
        {
          question: "Before he became a famous professor, Einstein worked at the Swiss:",
          options: ["Train station", "Patent Office", "Postal Service", "University library"],
          correctIndex: 1,
          explanation: "Einstein worked as a patent examiner in Bern (1902–1909), evaluating electrical inventions. He completed his miracle-year papers in his spare time."
        },
        {
          question: "Einstein left Germany permanently in which year and why?",
          options: ["1914 / WWI broke out", "1923 / Lost his job", "1933 / Hitler came to power", "1945 / End of WWII"],
          correctIndex: 2,
          explanation: "Einstein was visiting the U.S. when Hitler took power in 1933. As a Jew and pacifist, he renounced his German citizenship and never returned."
        },
        {
          question: "Einstein's iconic photograph captures him:",
          options: ["Smiling", "Sticking out his tongue", "Sleeping at a desk", "Writing equations"],
          correctIndex: 1,
          explanation: "On his 72nd birthday (March 14, 1951), tired of smiling for cameras, Einstein stuck out his tongue at photographer Arthur Sasse. The photo became one of the most famous of the 20th century."
        },
        {
          question: "After Einstein died, what was secretly preserved for scientific study?",
          options: ["His heart", "His brain", "His eyes", "His hands"],
          correctIndex: 1,
          explanation: "Pathologist Thomas Harvey removed Einstein's brain during autopsy in 1955 without family permission. Studies of it have shown unusual structural features."
        },
        {
          question: "Einstein played which musical instrument well into adulthood?",
          options: ["Piano", "Violin", "Cello", "Guitar"],
          correctIndex: 1,
          explanation: "Einstein played the violin (and piano) his entire life. He said if he hadn't been a physicist, he would have been a musician."
        },
        {
          question: "Einstein supported which of these causes?",
          options: ["Pacifism", "Civil rights", "Zionism", "All of the above"],
          correctIndex: 3,
          explanation: "Einstein was an outspoken pacifist (until WWII), a vocal supporter of civil rights for Black Americans, and a committed cultural Zionist who helped found Hebrew University."
        },
        {
          question: "Einstein was offered (and declined) the presidency of which country?",
          options: ["United States", "Israel", "Switzerland", "Germany"],
          correctIndex: 1,
          explanation: "After Chaim Weizmann's death in 1952, Israel offered Einstein the largely ceremonial presidency. He declined, saying he had no aptitude for human relations."
        },
        {
          question: "The fundamental physical theory that Einstein's work directly enabled is:",
          options: ["Genetics", "Plate tectonics", "Nuclear physics and quantum theory", "Evolution"],
          correctIndex: 2,
          explanation: "Einstein's E=mc² is the foundational equation of nuclear physics. His photoelectric-effect paper was a cornerstone of quantum theory, even though he was uneasy with quantum mechanics's interpretation."
        }
      ]
    }
  ];

  const byId = (id) => list.find(h => h.id === id);

  function pickTrivia(heroId, usedIndices, rng) {
    const hero = byId(heroId);
    if (!hero || !Array.isArray(hero.trivia) || hero.trivia.length === 0) return null;
    const rand = (typeof rng === "function") ? rng : Math.random;
    const total = hero.trivia.length;
    const used = Array.isArray(usedIndices) ? usedIndices : [];
    // If every index has been used, pick from all (cycle exhausted)
    const pool = (used.length >= total)
      ? Array.from({ length: total }, (_, i) => i)
      : Array.from({ length: total }, (_, i) => i).filter(i => !used.includes(i));
    const chosenPos = Math.floor(rand() * pool.length);
    const idx = pool[chosenPos];
    // exhausted = after adding this index the full set would be covered
    const exhausted = (used.length + 1 >= total);
    return { trivia: hero.trivia[idx], index: idx, exhausted };
  }

  return { list, byId, pickTrivia };
})();

if (typeof module !== "undefined") module.exports = Heroes;
