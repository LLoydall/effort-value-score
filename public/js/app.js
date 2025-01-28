// Get references to DOM elements
const refreshIdeasBtn = document.getElementById('refreshIdeasBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const ideasTableBody = document.querySelector('#ideasTable tbody');

const newIdeaForm = document.getElementById('newIdeaForm');
const ideaTitleInput = document.getElementById('ideaTitle');
const ideaDescInput = document.getElementById('ideaDesc');

const newScoreForm = document.getElementById('newScoreForm');
const scoreIdeaIdInput = document.getElementById('scoreIdeaId');
const scoreUserIdInput = document.getElementById('scoreUserId');
const scoreEffortInput = document.getElementById('scoreEffort');
const scoreValueInput = document.getElementById('scoreValue');

// ----------------------------------------------
// Fetch & Render Ideas
// ----------------------------------------------
async function fetchIdeas() {
  try {
    const response = await axios.get('/ideas');
    const ideas = response.data; // array of ideas with avgEffort, avgValue
    renderIdeas(ideas);
  } catch (error) {
    console.error('Error fetching ideas:', error);
  }
}

function renderIdeas(ideas) {
  ideasTableBody.innerHTML = ''; // clear current rows

  ideas.forEach((idea) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${idea.id}</td>
      <td>${idea.title}</td>
      <td>${idea.description}</td>
      <td>${idea.avgEffort}</td>
      <td>${idea.avgValue}</td>
    `;
    ideasTableBody.appendChild(row);
  });
}

// ----------------------------------------------
// Add New Idea
// ----------------------------------------------
async function addNewIdea(event) {
  event.preventDefault();
  const title = ideaTitleInput.value.trim();
  const description = ideaDescInput.value.trim();

  if (!title) {
    alert('Title is required!');
    return;
  }

  try {
    // POST /ideas
    await axios.post('/ideas', { title, description });
    newIdeaForm.reset();
    fetchIdeas(); // refresh list
  } catch (error) {
    console.error('Error adding idea:', error);
  }
}

// ----------------------------------------------
// Submit or Update a Score
// ----------------------------------------------
async function submitScore(event) {
  event.preventDefault();

  const ideaId = parseInt(scoreIdeaIdInput.value.trim(), 10);
  const userId = scoreUserIdInput.value.trim();
  const effort = parseInt(scoreEffortInput.value.trim(), 10);
  const value = parseInt(scoreValueInput.value.trim(), 10);

  if (!ideaId || !userId) {
    alert('Please provide an Idea ID and User ID');
    return;
  }

  try {
    // POST /ideas/:id/scores
    await axios.post(`/ideas/${ideaId}/scores`, { userId, effort, value });
    newScoreForm.reset();
    fetchIdeas(); // refresh to see updated averages
  } catch (error) {
    console.error('Error submitting score:', error);
  }
}

// ----------------------------------------------
// Download CSV
// ------------
