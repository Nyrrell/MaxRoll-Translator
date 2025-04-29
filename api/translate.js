import board from '../data/board.json';
import glyphs from '../data/glyphs.json';
import aspects from '../data/aspects.json';

const sources = {
  board,
  glyphs,
  aspects
};

export default function handler(req, res) {
  const { key, type } = req.query;

  if (!key || !type || !sources[type]) {
    return res.status(400).json({ error: 'Missing key or type' });
  }

  const translation = sources[type][key] || null;
  res.status(200).json({ key, translation });
}