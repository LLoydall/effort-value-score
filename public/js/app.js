// DOM references
const refreshIdeasBtn = document.getElementById('refreshIdeasBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const ideasTableBody = document.querySelector('#ideasTable tbody');

// Global user inputs
const globalUserIdInput = document.getElementById('globalUserId');
const ownerCheckbox = document.getElementById('ownerCheckbox');

// State
let isOwner = false;

// ----------------------------------------------
// Fetch and render ideas
// ----------------------------------------------
async function fetchIdeas() {
  try {
    const response = await axios.get('/ideas'); // GET /ideas
    const ideas = response.data; // array of ideas
    renderTable(ideas);
  } catch (error) {
    console.error('Error fetching ideas:', error);
  }
}

// ----------------------------------------------
// Render the table based on current isOwner
// ----------------------------------------------
function renderTable(ideas) {
  ideasTableBody.innerHTML = '';

  // If user is an owner, add the "New Idea" row at the top
  if (isOwner) {
    ideasTableBody.appendChild(createNewIdeaRow());
  }

  // Create a row for each idea
  ideas.forEach((idea) => {
    ideasTableBody.appendChild(createIdeaRow(idea));
  });
}

// ----------------------------------------------
// Create the "New Idea" row (if isOwner)
// ----------------------------------------------
function createNewIdeaRow() {
  const row = document.createElement('tr');
  row.innerHTML = `
    <td></td> <!-- ID blank -->
    <td><input type="text" class="form-control" placeholder="Description"></td>
    <td></td> <!-- Avg Eff blank -->
    <td></td> <!-- Avg Val blank -->
    <td></td> <!-- Score Effort blank -->
    <td></td> <!-- Score Value blank -->
    <td>
      <button class="btn btn-primary btn-sm">Add Idea</button>
    </td>
  `;

  const addButton = row.querySelector('button');
  addButton.addEventListener('click', async () => {
    const descInput = row.cells[1].querySelector('input');
    const description = descInput.value.trim();

    if (!description) {
      alert('Description is required to add a new idea.');
      return;
    }

    try {
      // POST /ideas
      await axios.post('/ideas', { description });
      descInput.value = '';
      fetchIdeas();
    } catch (error) {
      console.error('Error adding idea:', error);
    }
  });

  return row;
}

// ----------------------------------------------
// Create a row for an existing idea
// ----------------------------------------------
function createIdeaRow(idea) {
  const { id, description, avgEffort, avgValue } = idea;

  const row = document.createElement('tr');

  // If isOwner, show an editable input for description
  // else show read-only text
  const descriptionCell = isOwner
    ? `<input type="text" class="form-control" value="${description}">`
    : `<span>${description}</span>`;

  // Actions column: Score always visible, Update/Delete only if owner
  // We'll fill the row first, then attach event listeners
  row.innerHTML = `
    <td>${id}</td>
    <td>${descriptionCell}</td>
    <td>${avgEffort}</td>
    <td>${avgValue}</td>
    <td><input type="number" class="form-control" placeholder="Effort"></td>
    <td><input type="number" class="form-control" placeholder="Value"></td>
    <td>
      <!-- Score always available -->
      <button class="btn btn-success btn-sm mb-1">Score</button>
      <!-- Update/Delete hidden if !isOwner -->
      ${
        isOwner
          ? `<button class="btn btn-warning btn-sm mb-1">Update</button>
             <button class="btn btn-danger btn-sm">Delete</button>`
          : ''
      }
    </td>
  `;

  // Grab references
  const effortInput = row.cells[4].querySelector('input');
  const valueInput = row.cells[5].querySelector('input');
  const scoreBtn = row.cells[6].querySelectorAll('button')[0];

  // If isOwner, we have updateBtn & deleteBtn
  let updateBtn, deleteBtn;
  if (isOwner) {
    updateBtn = row.cells[6].querySelectorAll('button')[1];
    deleteBtn = row.cells[6].querySelectorAll('button')[2];
  }

  // If isOwner, we have an input for description
  let descriptionInput;
  if (isOwner) {
    descriptionInput = row.cells[1].querySelector('input');
  }

  // 1) Score button
  scoreBtn.addEventListener('click', async () => {
    const userId = globalUserIdInput.value.trim();
    if (!userId) {
      alert('Please enter your User ID at the top before scoring.');
      return;
    }

    const effVal = parseInt(effortInput.value.trim(), 10);
    const valVal = parseInt(valueInput.value.trim(), 10);

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
      // Clear inputs
      effortInput.value = '';
      valueInput.value = '';
      // Refresh
      fetchIdeas();
    } catch (error) {
      console.error('Error scoring idea:', error);
    }
  });

  // 2) Update button (only if owner)
  if (isOwner && updateBtn) {
    updateBtn.addEventListener('click', async () => {
      if (!descriptionInput) return;
      const newDesc = descriptionInput.value.trim();
      if (!newDesc) {
        alert('Description cannot be empty when updating.');
        return;
      }

      try {
        // PUT /ideas/:id
        await axios.put(`/ideas/${id}`, {
          description: newDesc
        });
        fetchIdeas();
      } catch (error) {
        console.error('Error updating idea:', error);
      }
    });
  }

  // 3) Delete button (only if owner)
  if (isOwner && deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      try {
        // DELETE /ideas/:id
        await axios.delete(`/ideas/${id}`);
        fetchIdeas();
      } catch (error) {
        console.error('Error deleting idea:', error);
      }
    });
  }

  return row;
}

// ----------------------------------------------
// Export CSV
// ----------------------------------------------
function downloadCsv() {
  window.location.href = '/export';
}

// ----------------------------------------------
// Event Listeners
// ----------------------------------------------
refreshIdeasBtn.addEventListener('click', fetchIdeas);
exportCsvBtn.addEventListener('click', downloadCsv);

// When user toggles owner checkbox, update state & re-render
ownerCheckbox.addEventListener('change', () => {
  isOwner = ownerCheckbox.checked;
  fetchIdeas();
});

// On page load, init isOwner and fetch data
document.addEventListener('DOMContentLoaded', () => {
  isOwner = ownerCheckbox.checked;
  fetchIdeas();
});
