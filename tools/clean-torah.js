const fs = require('fs');
const path = require('path');

const torahDir = './data/torah';
const files = fs.readdirSync(torahDir).filter(f => f.endsWith('.json'));

files.forEach(file => {
  const filePath = path.join(torahDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  // Fix each section
  data.sections = data.sections.map((sec, si) => {
    // Extract chapter and verse from id (e.g. "Bereishit-1-3")
    const parts = sec.id.split('-');
    const chapter = parts[parts.length - 2];
    const verse = parts[parts.length - 1];
    
    return {
      ...sec,
      title: `${chapter}:${verse}`,      // e.g. "1:3"
      titleEn: `${chapter}:${verse}`,    // same
      translation: '',                    // remove all English
      lines: sec.lines.map(line => ({
        ...line,
        translation: '',                  // remove English from lines too
        words: line.words.map(word => ({
          ...word,
          // Strip any non-Hebrew characters that snuck in
          text: word.text.replace(/[a-zA-Z]/g, '').trim()
        })).filter(w => w.text.length > 0)
      })).filter(l => l.words.length > 0)
    };
  });

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
});

console.log(`✅ Cleaned ${files.length} parsha files`);