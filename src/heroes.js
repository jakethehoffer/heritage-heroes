const Heroes = (function () {
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
      }
    },
    {
      id: "david",
      name: "King David",
      era: "Biblical",
      hp: 95,
      bio: "Shepherd boy who slew Goliath and became Israel's greatest king.",
      stageId: "elah",
      moves: {
        attack:  { name: "Shepherd's Sling", damage: 12, description: "A whirling stone strike." },
        defend:  { name: "Lion's Cloak",     description: "Halves the next incoming attack." },
        special: { name: "Sling Stone",      damage: 22, description: "Devastating ranged shot; +10 damage if opponent HP > 50." }
      }
    },
    {
      id: "esther",
      name: "Queen Esther",
      era: "Biblical",
      hp: 90,
      bio: "Saved her people from Haman's plot; her story is read every Purim.",
      stageId: "throne",
      moves: {
        attack:  { name: "Royal Decree",   damage: 10, description: "Authoritative strike." },
        defend:  { name: "Court Veil",     description: "Halves the next incoming attack." },
        special: { name: "Reversal",       description: "Next attack against her bounces back at 1.5x damage." }
      }
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
      }
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
      }
    },
    {
      id: "golda",
      name: "Golda Meir",
      era: "Modern",
      hp: 100,
      bio: "Israel's fourth Prime Minister; the 'Iron Lady of Israel.'",
      stageId: "knesset",
      moves: {
        attack:  { name: "Iron Word",          damage: 10, description: "A blunt verbal strike." },
        defend:  { name: "Diplomatic Shield",  counter: 5, description: "Halves the next incoming attack and counters for 5." },
        special: { name: "Resolve",            description: "Her next Basic Attack hits for double damage." }
      }
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
      }
    }
  ];

  const byId = (id) => list.find(h => h.id === id);

  return { list, byId };
})();

if (typeof module !== "undefined") module.exports = Heroes;
