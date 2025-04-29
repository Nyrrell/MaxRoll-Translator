const board = require('../data/board.json');
const glyphs = require('../data/glyphs.json');
const aspects = require('../data/aspects.json');

const sources = {
  board,
  glyphs,
  aspects,
};

module.exports = function (req, res) {
  const { key, type } = req.query;

  if (!key || !type || !sources[type]) {
    return res.status(400).json({ error: 'Missing key or invalid type' });
  }

  const translation = sources[type][key] || null;
  res.status(200).json({ key, translation });
};