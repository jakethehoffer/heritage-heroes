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
        }
      ]
    }
  ];

  const byId = (id) => list.find(h => h.id === id);

  function pickTrivia(heroId, rng) {
    const hero = byId(heroId);
    if (!hero || !Array.isArray(hero.trivia) || hero.trivia.length === 0) return null;
    const rand = (typeof rng === "function") ? rng : Math.random;
    const idx = Math.floor(rand() * hero.trivia.length);
    return hero.trivia[idx];
  }

  return { list, byId, pickTrivia };
})();

if (typeof module !== "undefined") module.exports = Heroes;
