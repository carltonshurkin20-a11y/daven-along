const https = require('https');
const fs = require('fs');

// All 54 parshiyos organized by sefer
const PARSHIYOS = {
  Bereishis: ['Bereishit','Noach','Lech-Lecha','Vayera','Chayei-Sara','Toldot','Vayetzei','Vayishlach','Vayeshev','Miketz','Vayigash','Vayechi'],
  Shemos:    ['Shemot','Vaera','Bo','Beshalach','Yitro','Mishpatim','Terumah','Tetzaveh','Ki-Tisa','Vayakhel','Pekudei'],
  Vayikra:   ['Vayikra','Tzav','Shmini','Tazria','Metzora','Achrei-Mot','Kedoshim','Emor','Behar','Bechukotai'],
  Bamidbar:  ['Bamidbar','Nasso','Beha\'alotcha','Shlach','Korach','Chukat','Balak','Pinchas','Matot','Masei'],
  Devarim:   ['Devarim','Vaetchanan','Eikev','Reeh','Shoftim','Ki-Teitzei','Ki-Tavo','Nitzavim','Vayeilech','Haazinu','Vezot-Habracha'],
};

function fetchParsha(name) {
  return new Promise((resolve, reject) => {
    const url = `https://www.sefaria.org/api/texts/${name}?lang=he&pad=0`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch(e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function buildParshaJSON(name, sefaria) {
  const he = sefaria.he || [];
  const sections = [];
  
  he.forEach((perek, perekIdx) => {
    if (!Array.isArray(perek)) return;
    perek.forEach((pasuk, pasukIdx) => {
      if (!pasuk) return;
      // Strip HTML tags
      const clean = pasuk.replace(/<[^>]+>/g, '').trim();
      // Split into words
      const words = clean.split(/\s+/).filter(w => w.length > 0).map(text => ({
        text,
        start: 0,
        end: 0
      }));
      if (words.length === 0) return;
      sections.push({
        id: `${name}-${perekIdx+1}-${pasukIdx+1}`,
        title: `פרק ${perekIdx+1} פסוק ${pasukIdx+1}`,
        titleEn: `Chapter ${perekIdx+1} Verse ${pasukIdx+1}`,
        translation: '',
        lines: [{ words, translation: '' }]
      });
    });
  });

  return {
    id: name,
    slug: name.toLowerCase(),
    nameHeb: sefaria.heTitle || name,
    nameEn: name,
    nusach: 'torah',
    timeOfDay: 'any',
    totalDuration: 0,
    audioUrl: '',
    sections
  };
}

async function fetchAll() {
  if (!fs.existsSync('./data/torah')) fs.mkdirSync('./data/torah');

  for (const [sefer, parshiyos] of Object.entries(PARSHIYOS)) {
    console.log(`\n📖 Fetching ${sefer}...`);
    for (const parsha of parshiyos) {
      try {
        console.log(`  → ${parsha}`);
        const data = await fetchParsha(parsha);
        const json = buildParshaJSON(parsha, data);
        fs.writeFileSync(`./data/torah/${parsha}.json`, JSON.stringify(json, null, 2));
        console.log(`  ✅ ${json.sections.length} pesukim`);
        // Small delay to be respectful to Sefaria's API
        await new Promise(r => setTimeout(r, 300));
      } catch(e) {
        console.log(`  ❌ Error: ${e.message}`);
      }
    }
  }
  console.log('\n✅ Done! All Torah data saved to data/torah/');
}

fetchAll();