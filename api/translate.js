const fs = require('fs');
const path = require('path');

module.exports = function (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { key, type, lang = 'de' } = req.query;

  if (!key || !type) {
    return res.status(400).json({ error: 'Missing key or type' });
  }

  const filePath = path.join(__dirname, `../data/${lang}/${type}.json`);

  let translations;
  try {
    translations = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    return res.status(404).json({ error: `Translations not found for lang=${lang}, type=${type}` });
  }

  const translation = translations[key] || null;
  res.status(200).json({ key, translation });
};
