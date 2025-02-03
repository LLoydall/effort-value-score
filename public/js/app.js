// DOM references
import axios from 'axios';

const refreshIdeasBtn = document.getElementById('refreshIdeasBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const ideasTableBody = document.querySelector('#ideasTable tbody');

// Global user inputs
const globalUserIdInput = document.getElementById('globalUserId');
const ownerCheckbox = document.getElementById('ownerCheckbox');

// State
let isOwner = false;

// --------------------------------------------------
// Load from localStorage on page load
// --------------------------------------------------
function initLocalStorage() {
  const storedUserId = localStorage.getItem('globalUserId');
  const storedIsOwner = localStorage.getItem('isOwner');

  if (storedUserId) {
    globalUserIdInput.value = storedUserId;
  }
  if (storedIsOwner) {
    ownerCheckbox.checked = JSON.parse(storedIsOwner);
  }
  isOwner = ownerCheckbox.checked;
}

// --------------------------------------------------
// Save to localStorage when changes occur
// --------------------------------------------------
globalUserIdInput.addEventListener('input', () => {
  localStorage.setItem('globalUserId', globalUserIdInput.value);
});

ownerCheckbox.addEventListener('change', () => {
  localStorage.setItem('isOwner', ownerCheckbox.checked);
  isOwner = ownerCheckbox.checked;
  fetchIdeas();
});

// --------------------------------------------------
// Fetch and render ideas
// --------------------------------------------------
async function fetchIdeas() {
  try {
    const response = await axios.get('/ideas');
    const ideas = response.data;
    renderTable(ideas);
  } catch (error) {
    console.error('Error fetching ideas:', error);
  }
}

// --------------------------------------------------
// Render the table based on current isOwner
// --------------------------------------------------
function renderTable(ideas) {
  ideasTableBody.innerHTML = '';

  if (isOwner) {
    ideasTableBody.appendChild(createNewIdeaRow());
  }

  ideas
    .map((idea) => ({
      ...idea,
      avgEffort: idea.avgEffort ?? 0,
      avgValue: idea.avgValue ?? 0,
    }))
    .forEach((idea) => {
      ideasTableBody.appendChild(createIdeaRow(idea));
    });
}

// --------------------------------------------------
// Create the "New Idea" row
// --------------------------------------------------
function createNewIdeaRow() {
  const row = document.createElement('tr');
  row.innerHTML = `
    <td></td>
    <td colspan="6">
      <textarea id="description" type="text" class="form-control" placeholder="Description"></textarea>
    </td>
    <td>
      <button class="btn btn-primary btn-sm">Add Idea</button>
    </td>
  `;

  const addButton = row.querySelector('button');
  addButton.addEventListener('click', async () => {
    const descInput = row.cells[1].querySelector('#description');
    const description = descInput.value.trim();
    if (!description) {
      alert('Description is required to add a new idea.');
      return;
    }
    try {
      await axios.post('/ideas', { description });
      descInput.value = '';
      fetchIdeas();
    } catch (error) {
      console.error('Error adding idea:', error);
    }
  });
  return row;
}

// --------------------------------------------------
// Create a row for an existing idea
// --------------------------------------------------
function createIdeaRow(idea) {
  const { id, description, avgEffort, avgValue, score, scores } = idea;

  const row = document.createElement('tr');
  const descriptionCell = isOwner
    ? `<input id="description-in" type="text" class="form-control" value="${description}">`
    : `<span>${description}</span>`;

  row.innerHTML = `
    <td>${id}</td>
    <td>${descriptionCell}</td>
    <td>${avgEffort}</td>
    <td>${avgValue}</td>
    <td>${score}</td>
    <td>
      <input id="effort-in" type="number" class="form-control" placeholder="Effort">
    </td>
    <td>
      <input id="value-in" type="number" class="form-control" placeholder="Value">
    </td>
    <td>
      <button id="score-btn" class="btn btn-success btn-sm mb-1">Score</button>
      ${
        isOwner
          ? `
            <button id="update-btn" class="btn btn-warning btn-sm mb-1">Update</button>
            <button id="delete-btn" class="btn btn-danger btn-sm">Delete</button>
          `
          : ''
      }
    </td>
  `;

  const effortInput = row.querySelector('#effort-in');
  const valueInput = row.querySelector('#value-in');
  const scoreBtn = row.querySelector('#score-btn');
  let updateBtn, deleteBtn, descriptionInput;

  if (isOwner) {
    updateBtn = row.querySelector('#update-btn');
    deleteBtn = row.querySelector('#delete-btn');
    descriptionInput = row.querySelector('#description-in');
  }

  // --------------------------------------------------
  // Populate effort/value if user has existing scores
  // --------------------------------------------------
  const currentUserId = globalUserIdInput.value.trim();
  if (currentUserId && scores && Array.isArray(scores)) {
    const userScore = scores.find((s) => s.userId === currentUserId);
    if (userScore) {
      effortInput.value = userScore.effort ?? '';
      valueInput.value = userScore.value ?? '';
    }
  }

  // --------------------------------------------------
  // Score button
  // --------------------------------------------------
  scoreBtn.addEventListener('click', async () => {
    const userId = globalUserIdInput.value.trim();
    if (!userId) {
      alert('Please enter your User ID at the top before scoring.');
      return;
    }
    const effVal = parseInt(effortInput.value.trim(), 10) ?? 0;
    const valVal = parseInt(valueInput.value.trim(), 10) ?? 0;
    if (isNaN(effVal) || isNaN(valVal)) {
      alert('Effort and Value must be valid numbers.');
      return;
    }
    try {
      await axios.post(`/ideas/${id}/scores`, {
        userId,
        effort: effVal,
        value: valVal
      });
      effortInput.value = '';
      valueInput.value = '';
      fetchIdeas();
    } catch (error) {
      console.error('Error scoring idea:', error);
    }
  });

  // --------------------------------------------------
  // Update button (only if owner)
  // --------------------------------------------------
  if (isOwner && updateBtn) {
    updateBtn.addEventListener('click', async () => {
      if (!descriptionInput) return;
      const newDesc = descriptionInput.value.trim();
      if (!newDesc) {
        alert('Description cannot be empty when updating.');
        return;
      }
      try {
        await axios.put(`/ideas/${id}`, { description: newDesc });
        fetchIdeas();
      } catch (error) {
        console.error('Error updating idea:', error);
      }
    });
  }

  // --------------------------------------------------
  // Delete button (only if owner)
  // --------------------------------------------------
  if (isOwner && deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      try {
        await axios.delete(`/ideas/${id}`);
        fetchIdeas();
      } catch (error) {
        console.error('Error deleting idea:', error);
      }
    });
  }

  return row;
}

// --------------------------------------------------
// Export CSV
// --------------------------------------------------
function downloadCsv() {
  window.location.href = '/export';
}

// --------------------------------------------------
// Event listeners for refresh & CSV
// --------------------------------------------------
refreshIdeasBtn.addEventListener('click', fetchIdeas);
exportCsvBtn.addEventListener('click', downloadCsv);

// --------------------------------------------------
// On page load
// --------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initLocalStorage();
  fetchIdeas();
});
