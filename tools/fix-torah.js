 const https = require('https');
const fs = require('fs');

const fixes = {
  'Haazinu': 'Haazinu',
};

const delay = ms => new Promise(r => setTimeout(r, ms));

async function run() {
  for (const [slug, name] of Object.entries(fixes)) {
    const url = `https://www.sefaria.org/api/texts/${encodeURIComponent(name)}?lang=he&pad=0`;
    await new Promise((resolve) => {
      https.get(url, (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
          try {
            const json = JSON.parse(d);
            const he = json.he || [];
            const sections = [];

            // Handle both flat arrays and nested arrays
            const isFlat = he.length > 0 && typeof he[0] === 'string';

            if (isFlat) {
              // Flat array — each item is a pasuk
              he.forEach((pasuk, vi) => {
                if (!pasuk) return;
                const clean = pasuk.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
                const words = clean.split(/\s+/).filter(w => w.length > 0).map(t => ({ text: t, start: 0, end: 0 }));
                if (words.length === 0) return;
                sections.push({
                  id: `${slug}-1-${vi+1}`,
                  title: `פסוק ${vi+1}`,
                  titleEn: `Verse ${vi+1}`,
                  translation: '',
                  lines: [{ words, translation: '' }]
                });
              });
            } else {
              // Nested array — each item is a perek
              he.forEach((perek, pi) => {
                if (!Array.isArray(perek)) return;
                perek.forEach((pasuk, vi) => {
                  if (!pasuk) return;
                  const clean = pasuk.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
                  const words = clean.split(/\s+/).filter(w => w.length > 0).map(t => ({ text: t, start: 0, end: 0 }));
                  if (words.length === 0) return;
                  sections.push({
                    id: `${slug}-${pi+1}-${vi+1}`,
                    title: `פרק ${pi+1} פסוק ${vi+1}`,
                    titleEn: `Chapter ${pi+1} Verse ${vi+1}`,
                    translation: '',
                    lines: [{ words, translation: '' }]
                  });
                });
              });
            }

            const out = { id: slug, slug: slug.toLowerCase(), nameHeb: json.heTitle || name, nameEn: name, nusach: 'torah', timeOfDay: 'any', totalDuration: 0, audioUrl: '', sections };
            fs.writeFileSync(`./data/torah/${slug}.json`, JSON.stringify(out, null, 2));
            console.log(`✅ ${name}: ${sections.length} pesukim`);
          } catch(e) { console.log(`❌ ${name}: ${e.message}`); }
          resolve();
        });
      }).on('error', () => { console.log(`❌ ${name}`); resolve(); });
    });
    await delay(400);
  }
  console.log('Done!');
}

run();