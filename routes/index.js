const express = require('express');
const router = express.Router();
const { Parser } = require('json2csv');
const fs = require('fs');
const path = require('path');

// Directory where we'll persist data
const DATA_DIR = '/scores-data'; 
// JSON file storing all ideas
const DATA_FILE = path.join(DATA_DIR, 'scores.json');

// Ensure the directory exists
fs.mkdirSync(DATA_DIR, { recursive: true });

// Load or initialize data
let ideas = [];
try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    ideas = JSON.parse(raw);
    console.log(`Loaded ${ideas.length} ideas from disk.`);
  } else {
    console.log('No existing data file found, starting fresh.');
    ideas = [];
  }
} catch (err) {
  console.error('Error reading data file. Starting fresh.', err);
  ideas = [];
}

// Helper to save current `ideas` array back to file
function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(ideas, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing data file:', err);
  }
}

// Helper to compute average
function calculateAverages(scores) {
  if (!scores || scores.length === 0) {
    return { avgEffort: 0, avgValue: 0 };
  }
  const totalEffort = scores.reduce((sum, s) => sum + s.effort, 0);
  const totalValue = scores.reduce((sum, s) => sum + s.value, 0);
  return {
    avgEffort: +(totalEffort / scores.length).toFixed(2),
    avgValue: +(totalValue / scores.length).toFixed(2)
  };
}

// GET all ideas with avg
router.get('/ideas', (req, res) => {
  const dataWithAverages = ideas.map((idea) => {
    const { avgEffort, avgValue } = calculateAverages(idea.scores);
    return { ...idea, avgEffort, avgValue };
  });
  res.json(dataWithAverages);
});

// GET a specific idea with avg
router.get('/ideas/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idea = ideas.find((i) => i.id === id);
  if (!idea) {
    return res.status(404).json({ error: 'Idea not found' });
  }
  const { avgEffort, avgValue } = calculateAverages(idea.scores);
  res.json({ ...idea, avgEffort, avgValue });
});

// CREATE a new idea (no "title" in this scenario—just description)
router.post('/ideas', (req, res) => {
  const { description } = req.body;
  if (!description) {
    return res.status(400).json({ error: 'Missing "description" field' });
  }

  const newIdea = {
    id: ideas.length > 0 ? ideas[ideas.length - 1].id + 1 : 1,
    description,
    scores: []
  };

  ideas.push(newIdea);
  saveData(); // persist to disk
  res.status(201).json(newIdea);
});

// UPDATE idea's description
router.put('/ideas/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { description } = req.body;
  const ideaIndex = ideas.findIndex((i) => i.id === id);

  if (ideaIndex === -1) {
    return res.status(404).json({ error: 'Idea not found' });
  }
  if (typeof description !== 'undefined') {
    ideas[ideaIndex].description = description;
  }

  saveData(); // persist
  res.json(ideas[ideaIndex]);
});

// DELETE an idea
router.delete('/ideas/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const ideaIndex = ideas.findIndex((i) => i.id === id);

  if (ideaIndex === -1) {
    return res.status(404).json({ error: 'Idea not found' });
  }

  ideas.splice(ideaIndex, 1);
  saveData(); // persist
  res.json({ success: true });
});

// POST a user's score for an idea => create or update
router.post('/ideas/:id/scores', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { userId, effort, value } = req.body;

  if (!userId || typeof effort !== 'number' || typeof value !== 'number') {
    return res.status(400).json({ error: 'Missing or invalid: "userId", "effort", "value"' });
  }

  const ideaIndex = ideas.findIndex((i) => i.id === id);
  if (ideaIndex === -1) {
    return res.status(404).json({ error: 'Idea not found' });
  }

  const existingScoreIndex = ideas[ideaIndex].scores.findIndex((s) => s.userId === userId);

  if (existingScoreIndex !== -1) {
    // Update existing
    ideas[ideaIndex].scores[existingScoreIndex].effort = effort;
    ideas[ideaIndex].scores[existingScoreIndex].value = value;
  } else {
    // Add new
    ideas[ideaIndex].scores.push({ userId, effort, value });
  }

  saveData(); // persist
  res.json(ideas[ideaIndex]);
});

// EXPORT CSV (ideas + average scores + 'score' = avgEffort / avgValue)
router.get('/export', (req, res) => {
  try {
    const flattened = ideas.map((idea) => {
      const { avgEffort, avgValue } = calculateAverages(idea.scores);
      // Avoid division by zero
      const score = (avgValue === 0) ? 0 : parseFloat((avgEffort / avgValue).toFixed(2));

      return {
        id: idea.id,
        description: idea.description,
        avgEffort,
        avgValue,
        score
      };
    });

    // Now 'score' is included as a column
    const fields = ['id', 'description', 'avgEffort', 'avgValue', 'score'];
    const parser = new Parser({ fields });
    const csv = parser.parse(flattened);

    res.setHeader('Content-Disposition', 'attachment; filename=ideas.csv');
    res.type('text/csv');
    res.send(csv);
  } catch (error) {
    console.error('Failed to export CSV:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// Serve the index.html file for the root route
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/index.html'));
});

module.exports = router;
