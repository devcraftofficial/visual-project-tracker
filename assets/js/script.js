// =====================================
// Global data + LocalStorage
// =====================================
let projects = JSON.parse(localStorage.getItem('projects')) || [];
let editingId = null;
let currentFilter = 'all';

// DOM elements used on dashboard (may be null on other pages)
const projectsGrid = document.getElementById('projectsGrid');
const projectForm = document.getElementById('projectForm');
const progressSlider = document.getElementById('projectProgress');
const progressValue = document.getElementById('progressValue');

// =====================================
// Helpers
// =====================================
function saveProjects() {
  localStorage.setItem('projects', JSON.stringify(projects));
}

function getCurrentProjectId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('projectId');
}

// =====================================
// INIT
// =====================================
document.addEventListener('DOMContentLoaded', () => {
  // Dashboard page present?
  if (projectsGrid && projectForm && progressSlider && progressValue) {
    updateStats();
    renderProjects();
    setupDashboardEvents();
  }

  // Tasks page present?
  if (document.getElementById('tasksList')) {
    initTasksPage();
  }

  setupGlobalModalClose();
});

// =====================================
// DASHBOARD (index.html)
// =====================================

// Attach dashboard‑only listeners
function setupDashboardEvents() {
  // Update progress value display
  progressSlider.addEventListener('input', (e) => {
    progressValue.textContent = e.target.value + '%';
  });

  // Form submission
  projectForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const project = {
      id: editingId || Date.now().toString(),
      name: document.getElementById('projectName').value,
      description: document.getElementById('projectDesc').value,
      startDate: document.getElementById('startDate').value,
      endDate: document.getElementById('endDate').value,
      status: document.getElementById('projectStatus').value,
      progress: parseInt(document.getElementById('projectProgress').value) || 0,
      tasks: editingId
        ? (projects.find((p) => p.id === editingId)?.tasks || [])
        : [] // new project starts with empty tasks
    };

    if (editingId) {
      const index = projects.findIndex((p) => p.id === editingId);
      projects[index] = project;
    } else {
      projects.push(project);
    }

    saveProjects();
    closeModal('addModal');
    renderProjects();
    updateStats(); // This now calls updateAllCharts
    resetForm();
  });
}

// Render projects on dashboard
function renderProjects(filter = currentFilter) {
  const filteredProjects = projects.filter(
    (p) => filter === 'all' || p.status === filter
  );

  if (!projectsGrid) return;

  projectsGrid.innerHTML = filteredProjects
    .map(
      (project) => `
      <div class="project-card ${project.status}" onclick="openProjectTasks('${project.id}')">
        <h3 class="project-title">${project.name}</h3>
        <p class="project-desc">${project.description || 'No description'}</p>
        <span class="status-badge status-${project.status}">
          ${project.status.charAt(0).toUpperCase() + project.status.slice(1)}
        </span>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${project.progress || 0}%"></div>
        </div>
        <div class="progress-text">${project.progress || 0}% Complete</div>
        ${
          project.startDate || project.endDate
            ? `
            <div class="timeline">
              ${project.startDate ? `📅 Started: ${new Date(project.startDate).toLocaleDateString()}` : ''}
              ${project.endDate ? ` | Due: ${new Date(project.endDate).toLocaleDateString()}` : ''}
            </div>
          `
            : ''
        }
      </div>
    `
    )
    .join('');
}

// Click → go to per‑project tasks page
function openProjectTasks(id) {
  window.location.href = `tasks.html?projectId=${id}`;
}

function updateStats() {
  // normalize status from progress [memory:13]
  projects.forEach((p) => {
    const prog = parseInt(p.progress, 10) || 0;
    if (prog >= 100) {
      p.status = 'completed';
    } else if (p.status === 'completed' && prog < 100) {
      p.status = 'ongoing';
    }
  });

  const ongoing = projects.filter((p) => p.status === 'ongoing').length;
  const completed = projects.filter((p) => p.status === 'completed').length;
  const upcoming = projects.filter((p) => p.status === 'upcoming').length;

  // Update stat cards
  const ongoingEl = document.getElementById('ongoingCount');
  const completedEl = document.getElementById('completedCount');
  const upcomingEl = document.getElementById('upcomingCount');

  if (ongoingEl) ongoingEl.textContent = ongoing;
  if (completedEl) completedEl.textContent = completed;
  if (upcomingEl) upcomingEl.textContent = upcoming;

  // NEW: Update all visual analytics charts with real data
  if (typeof updateAllCharts === 'function') {
    const avgProgress = projects.length ? 
      Math.round(projects.reduce((sum, p) => sum + (p.progress || 0), 0) / projects.length) : 0;
    updateAllCharts(ongoing, completed, upcoming, avgProgress, projects);
  }

  saveProjects();
}

// Filter buttons
function filterProjects(status) {
  currentFilter = status;
  document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.status === status);
  });
  renderProjects(status);
}

// Modal: add / edit project
function openAddModal(editId = null) {
  editingId = editId;
  document.getElementById('addModal').style.display = 'block';

  if (editId) {
    const project = projects.find((p) => p.id === editId);
    document.getElementById('projectName').value = project.name;
    document.getElementById('projectDesc').value = project.description;
    document.getElementById('startDate').value = project.startDate || '';
    document.getElementById('endDate').value = project.endDate || '';
    document.getElementById('projectStatus').value = project.status;
    document.getElementById('projectProgress').value = project.progress || 0;
    progressValue.textContent = (project.progress || 0) + '%';
    document.querySelector('.modal-header h2').textContent = 'Edit Project';
  } else {
    resetForm();
    document.querySelector('.modal-header h2').textContent = 'Add New Project';
  }
}

function closeModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.style.display = 'none';
  if (modalId === 'addModal') resetForm();
}

function resetForm() {
  editingId = null;
  if (!projectForm) return;
  projectForm.reset();
  if (progressValue) progressValue.textContent = '0%';
  if (progressSlider) progressSlider.value = 0;
}

// Details modal (optional)
function openDetails(id) {
  const project = projects.find((p) => p.id === id);
  if (!project) return;

  document.getElementById('detailTitle').textContent = project.name;

  document.getElementById('detailContent').innerHTML = `
    <p style="margin-bottom: 20px; line-height: 1.6;">${
      project.description || 'No description'
    }</p>
    <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
        <span style="font-weight: 600;">Status:</span>
        <span class="status-badge status-${project.status}">${project.status.toUpperCase()}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span style="font-weight: 600;">Progress:</span>
        <span>${project.progress || 0}%</span>
      </div>
    </div>
    ${
      project.startDate || project.endDate
        ? `
        <div style="background: #f1f5f9; padding: 16px; border-radius: 12px;">
          <div style="font-weight: 600; margin-bottom: 8px;">Timeline</div>
          ${
            project.startDate
              ? `<div>📅 Started: ${new Date(project.startDate).toLocaleDateString()}</div>`
              : ''
          }
          ${
            project.endDate
              ? `<div>📅 Due: ${new Date(project.endDate).toLocaleDateString()}</div>`
              : ''
          }
        </div>
      `
        : ''
    }
  `;

  document.getElementById('detailsModal').style.display = 'block';
}

function editProject() {
  const title = document.getElementById('detailTitle').textContent;
  const projectId = projects.find((p) => p.name === title)?.id;
  closeModal('detailsModal');
  if (projectId) openAddModal(projectId);
}

function deleteProject() {
  if (!confirm('Are you sure you want to delete this project?')) return;
  const projectName = document.getElementById('detailTitle').textContent;
  projects = projects.filter((p) => p.name !== projectName);
  saveProjects();
  renderProjects();
  updateStats();
  closeModal('detailsModal');
}

// =====================================
// Tasks page (tasks.html)
// =====================================

function initTasksPage() {
  const projectId = getCurrentProjectId();
  const project = projects.find((p) => p.id === projectId);

  if (!project) {
    alert('Project not found');
    window.location.href = 'index.html';
    return;
  }

  // Ensure tasks array exists
  if (!Array.isArray(project.tasks)) project.tasks = [];

  // Title
  const titleEl = document.getElementById('projectTitle');
  if (titleEl) titleEl.textContent = project.name;

  setupTaskForm(project);
  renderProjectTasks(project);
}

// Render all tasks for current project + update graphical progress
function renderProjectTasks(project) {
  const list = document.getElementById('tasksList');
  if (!list) return;

  project.tasks = project.tasks || [];

  list.innerHTML = project.tasks
    .map(
      (task, index) => `
      <div class="project-card" style="cursor:default;">
        <h3 class="project-title" style="display:flex; gap:8px; align-items:center;">
          <input type="checkbox" ${task.done ? 'checked' : ''} 
                 onchange="toggleTaskDone('${project.id}', ${index})">
          ${task.title}
        </h3>
        <p class="project-desc">${task.notes || ''}</p>
      </div>
    `
    )
    .join('');

  const total = project.tasks.length;
  const completed = project.tasks.filter((t) => t.done).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  const taskTotalEl = document.getElementById('taskTotal');
  const taskCompletedEl = document.getElementById('taskCompleted');
  const fillEl = document.getElementById('tasksProgressFill');
  const textEl = document.getElementById('tasksProgressText');

  if (taskTotalEl) taskTotalEl.textContent = total;
  if (taskCompletedEl) taskCompletedEl.textContent = completed;
  if (fillEl) fillEl.style.width = percent + '%';
  if (textEl) textEl.textContent = percent + '% Complete';

  // Push task progress back into main project object so dashboard charts update live
  project.progress = percent;
  saveProjects();
  
  // Update dashboard stats if we're on dashboard
  if (typeof updateStats === 'function') {
    updateStats();
  }
}

// Setup add‑task form on tasks.html
function setupTaskForm(project) {
  const taskForm = document.getElementById('taskForm');
  if (!taskForm) return;

  taskForm.onsubmit = (e) => {
    e.preventDefault();

    const title = document.getElementById('taskTitle').value.trim();
    const notes = document.getElementById('taskNotes').value.trim();
    const done = document.getElementById('taskDone').checked;

    if (!title) return;

    project.tasks.push({
      id: Date.now().toString(),
      title,
      notes,
      done
    });

    saveProjects();
    renderProjectTasks(project);
    closeModal('taskModal');
    taskForm.reset();
  };
}

function openTaskModal() {
  const modal = document.getElementById('taskModal');
  if (modal) modal.style.display = 'block';
}

// Toggle single task done/undone
function toggleTaskDone(projectId, index) {
  const project = projects.find((p) => p.id === projectId);
  if (!project) return;

  project.tasks[index].done = !project.tasks[index].done;
  saveProjects();
  renderProjectTasks(project);
}

// =====================================
// Global: close modals when clicking outside
// =====================================
function setupGlobalModalClose() {
  window.onclick = (event) => {
    const modals = document.querySelectorAll('.modal');
    modals.forEach((modal) => {
      if (event.target === modal) {
        closeModal(modal.id);
      }
    });
  };
}
