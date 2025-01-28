const refreshIdeasBtn = document.getElementById('refreshIdeasBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const ideasTable = document.getElementById('ideasTable');
const ideasTableBody = ideasTable.querySelector('tbody');

// ----------------------------------------------
// 1) Fetch and render all ideas
// ----------------------------------------------
async function fetchIdeas() {
  try {
    const response = await axios.get('/ideas');
    const ideas = response.data; // array of ideas with avgEffort, avgValue
    renderTable(ideas);
  } catch (error) {
    console.error('Error fetching ideas:', error);
  }
}

// ----------------------------------------------
// 2) Render the table (clear and rebuild)
// ----------------------------------------------
function renderTable(ideas) {
  ideasTableBody.innerHTML = ''; // Clear old rows

  // Add "New Idea" row at the top
  ideasTableBody.appendChild(createNewIdeaRow());

  // Add a row for each existing idea
  ideas.forEach((idea) => {
    ideasTableBody.appendChild(createIdeaRow(idea));
  });
}

// ----------------------------------------------
// Helper: Create the "New Idea" row
// ----------------------------------------------
function createNewIdeaRow() {
  const row = document.createElement('tr');

  // We'll display empty cells for ID, Effort, etc., but let user fill Title/Description
  row.innerHTML = `
    <td></td> <!-- ID blank -->
    <td><input type="text" class="form-control" placeholder="Title"></td>
    <td><input type="text" class="form-control" placeholder="Description"></td>
    <td></td> <!-- Avg Eff blank -->
    <td></td> <!-- Avg Val blank -->
    <td></td> <!-- userId blank -->
    <td></td> <!-- effort blank -->
    <td></td> <!-- value blank -->
    <td>
      <button class="btn btn-primary">Add</button>
    </td>
  `;

  // Attach "Add" button listener
  const addButton = row.querySelector('button');
  addButton.addEventListener('click', async () => {
    const titleInput = row.cells[1].querySelector('input');
    const descInput = row.cells[2].querySelector('input');

    const title = titleInput.value.trim();
    const description = descInput.value.trim();

    if (!title) {
      alert('Title is required to add a new idea.');
      return;
    }

    try {
      // POST /ideas
      await axios.post('/ideas', { title, description });
      // Clear inputs
      titleInput.value = '';
      descInput.value = '';
      // Refresh table
      fetchIdeas();
    } catch (error) {
      console.error('Error adding idea:', error);
    }
  });

  return row;
}

// ----------------------------------------------
// Helper: Create a row for an existing idea
// ----------------------------------------------
function createIdeaRow(idea) {
  const {
    id,
    title,
    description,
    avgEffort,
    avgValue
  } = idea;

  const row = document.createElement('tr');

  // We'll store placeholders for title/description so user can inline-edit
  row.innerHTML = `
    <td>${id}</td>
    <td><input type="text" class="form-control" value="${title}"></td>
    <td><input type="text" class="form-control" value="${description}"></td>
    <td>${avgEffort}</td>
    <td>${avgValue}</td>
    <td><input type="text" class="form-control" placeholder="User ID"></td>
    <td><input type="number" class="form-control" placeholder="Effort"></td>
    <td><input type="number" class="form-control" placeholder="Value"></td>
    <td>
      <button class="btn btn-sm btn-success mb-1">Score</button>
      <button class="btn btn-sm btn-warning mb-1">Update</button>
      <button class="btn btn-sm btn-danger">Delete</button>
    </td>
  `;

  // DOM references to important inputs
  const titleInput = row.cells[1].querySelector('input');
  const descInput = row.cells[2].querySelector('input');
  const userIdInput = row.cells[5].querySelector('input');
  const effortInput = row.cells[6].querySelector('input');
  const valueInput = row.cells[7].querySelector('input');

  // Buttons
  const scoreBtn = row.cells[8].querySelectorAll('button')[0];
  const updateBtn = row.cells[8].querySelectorAll('button')[1];
  const deleteBtn = row.cells[8].querySelectorAll('button')[2];

  // 1) Score button
  scoreBtn.addEventListener('click', async () => {
    const userId = userIdInput.value.trim();
    const effort = parseInt(effortInput.value.trim(), 10);
    const val = parseInt(valueInput.value.trim(), 10);

    if (!userId) {
      alert('User ID is required to submit a score.');
      return;
    }
    if (isNaN(effort) || isNaN(val)) {
      alert('Effort and Value must be numbers.');
      return;
    }

    try {
      await axios.post(`/ideas/${id}/scores`, { userId, effort, value: val });
      // Clear user inputs
      userIdInput.value = '';
      effortInput.value = '';
      valueInput.value = '';
      // Refresh table to show updated average
      fetchIdeas();
    } catch (error) {
      console.error('Error submitting score:', error);
    }
  });

  // 2) Update (title/description) button
  updateBtn.addEventListener('click', async () => {
    const newTitle = titleInput.value.trim();
    const newDesc = descInput.value.trim();

    if (!newTitle) {
      alert('Title cannot be empty when updating.');
      return;
    }

    try {
      await axios.put(`/ideas/${id}`, {
        title: newTitle,
        description: newDesc
      });
      fetchIdeas();
    } catch (error) {
      console.error('Error updating idea:', error);
    }
  });

  // 3) Delete button
  deleteBtn.addEventListener('click', async () => {
    try {
      await axios.delete(`/ideas/${id}`);
      fetchIdeas();
    } catch (error) {
      console.error('Error deleting idea:', error);
    }
  });

  return row;
}

// ----------------------------------------------
// 4) CSV download
// ----------------------------------------------
function downloadCsv() {
  window.location.href = '/export';
}

// ----------------------------------------------
// 5) Event listeners
// ----------------------------------------------
refreshIdeasBtn.addEventListener('click', fetchIdeas);
exportCsvBtn.addEventListener('click', downloadCsv);

// ----------------------------------------------
// Initial load
// ----------------------------------------------
document.addEventListener('DOMContentLoaded', fetchIdeas);
