const express = require('express');
const router = express.Router();
const { Parser } = require('json2csv');
const path = require('path');
// In-memory data structure
// Each idea will look like:
// {
//   id: number,
//   title: string,
//   description: string,
//   scores: [
//     { userId: string, effort: number, value: number },
//     ...
//   ]
// }
let ideas = [
  {
    id: 1,
    title: 'Automate Build Process',
    description: 'Use CI/CD to streamline builds',
    scores: [
      { userId: 'alice', effort: 3, value: 7 },
      { userId: 'bob', effort: 4, value: 8 }
    ]
  },
  {
    id: 2,
    title: 'Add Chatbot Feature',
    description: 'Implement a chatbot for customer queries',
    scores: [
      { userId: 'alice', effort: 6, value: 9 },
      { userId: 'charlie', effort: 7, value: 8 }
    ]
  }
];

/**
 * Utility function to calculate average
 * Returns { avgEffort, avgValue }
 */
function calculateAverages(scores) {
  if (!scores || scores.length === 0) {
    return { avgEffort: 0, avgValue: 0 };
  }
  const totalEffort = scores.reduce((sum, s) => sum + s.effort, 0);
  const totalValue = scores.reduce((sum, s) => sum + s.value, 0);
  return {
    avgEffort: +(totalEffort / scores.length).toFixed(2), // keep 2 decimals
    avgValue: +(totalValue / scores.length).toFixed(2)
  };
}

// ---------------------------------------------------------------------------
// GET all ideas (include average scores in response)
// ---------------------------------------------------------------------------
router.get('/ideas', (req, res) => {
  const dataWithAverages = ideas.map((idea) => {
    const { avgEffort, avgValue } = calculateAverages(idea.scores);
    return {
      ...idea,
      avgEffort,
      avgValue
    };
  });
  res.json(dataWithAverages);
});

// ---------------------------------------------------------------------------
// GET a specific idea by ID, include average in the response
// ---------------------------------------------------------------------------
router.get('/ideas/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const idea = ideas.find((i) => i.id === id);

  if (!idea) {
    return res.status(404).json({ error: 'Idea not found' });
  }

  const { avgEffort, avgValue } = calculateAverages(idea.scores);
  res.json({
    ...idea,
    avgEffort,
    avgValue
  });
});

// ---------------------------------------------------------------------------
// CREATE a new idea
// ---------------------------------------------------------------------------
router.post('/ideas', (req, res) => {
  const { title, description } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Missing "title" field' });
  }

  const newIdea = {
    id: ideas.length > 0 ? ideas[ideas.length - 1].id + 1 : 1,
    title,
    description: description || '',
    scores: []
  };

  ideas.push(newIdea);
  res.status(201).json(newIdea);
});

// ---------------------------------------------------------------------------
// UPDATE an existing idea (title or description)
// ---------------------------------------------------------------------------
router.put('/ideas/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { title, description } = req.body;
  const ideaIndex = ideas.findIndex((i) => i.id === id);

  if (ideaIndex === -1) {
    return res.status(404).json({ error: 'Idea not found' });
  }

  if (typeof title !== 'undefined') {
    ideas[ideaIndex].title = title;
  }
  if (typeof description !== 'undefined') {
    ideas[ideaIndex].description = description;
  }

  res.json(ideas[ideaIndex]);
});

// ---------------------------------------------------------------------------
// DELETE an idea
// ---------------------------------------------------------------------------
router.delete('/ideas/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const ideaIndex = ideas.findIndex((i) => i.id === id);

  if (ideaIndex === -1) {
    return res.status(404).json({ error: 'Idea not found' });
  }

  ideas.splice(ideaIndex, 1);
  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// POST a user's score for an idea (effort/value) => either create or update
// ---------------------------------------------------------------------------
router.post('/ideas/:id/scores', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { userId, effort, value } = req.body;

  if (!userId || typeof effort !== 'number' || typeof value !== 'number') {
    return res.status(400).json({ error: 'Missing or invalid fields: "userId", "effort", "value"' });
  }

  const ideaIndex = ideas.findIndex((i) => i.id === id);
  if (ideaIndex === -1) {
    return res.status(404).json({ error: 'Idea not found' });
  }

  const existingScoreIndex = ideas[ideaIndex].scores.findIndex((s) => s.userId === userId);

  if (existingScoreIndex !== -1) {
    // Update existing score
    ideas[ideaIndex].scores[existingScoreIndex].effort = effort;
    ideas[ideaIndex].scores[existingScoreIndex].value = value;
  } else {
    // Add new score
    ideas[ideaIndex].scores.push({
      userId,
      effort,
      value
    });
  }

  res.json(ideas[ideaIndex]);
});

// ---------------------------------------------------------------------------
// EXPORT ideas as CSV, including average effort & value
// ---------------------------------------------------------------------------
router.get('/export', (req, res) => {
  try {
    // Flatten data for CSV
    // We'll export columns: id, title, description, avgEffort, avgValue
    const flattened = ideas.map((idea) => {
      const { avgEffort, avgValue } = calculateAverages(idea.scores);
      return {
        id: idea.id,
        title: idea.title,
        description: idea.description,
        avgEffort,
        avgValue
      };
    });

    const fields = ['id', 'title', 'description', 'avgEffort', 'avgValue'];
    const parser = new Parser({ fields });
    const csv = parser.parse(flattened);

    res.setHeader('Content-Disposition', 'attachment; filename=ideas.csv');
    res.type('text/csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// Serve the index.html file for the root route
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/index.html'));
});

module.exports = router;
