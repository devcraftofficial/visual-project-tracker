// =====================================
// Shared data for tasks page
// =====================================
let projects = JSON.parse(localStorage.getItem('projects')) || [];

// UI state (status + search + assignee filters live in getTaskFilterState)
let editingTaskIndex = null;

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
// Init
// =====================================
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('tasksList')) {
    initTasksPage();
  }
  setupGlobalModalClose();
});

// =====================================
// Tasks page
// =====================================
function initTasksPage() {
  const projectId = getCurrentProjectId();
  const project = projects.find(p => p.id === projectId);

  if (!project) {
    alert('Project not found');
    window.location.href = 'index.html';
    return;
  }

  if (!Array.isArray(project.tasks)) project.tasks = [];

  // Set title + breadcrumb
  const titleEl = document.getElementById('projectTitle');
  const bcEl = document.getElementById('projectBreadcrumb');
  if (titleEl) titleEl.textContent = project.name || 'Project Tasks';
  if (bcEl) bcEl.textContent = project.name || 'Details';

  setupTaskForm(project);
  renderProjectTasks(project);
}

// =====================================
// Render + filters
// =====================================
function getFilters() {
  if (typeof window.getTaskFilterState === 'function') {
    return window.getTaskFilterState();
  }
  return {
    status: 'all',
    assignee: 'all',
    search: '',
    currentUserEmail: ''
  };
}

// Render task cards + update stats/progress
function renderProjectTasks(project) {
  const list = document.getElementById('tasksList');
  if (!list) return;

  project.tasks = project.tasks || [];

  const { status, assignee, search, currentUserEmail } = getFilters();
  const q = search.trim();

  const filtered = project.tasks.filter(task => {
    // status filter
    const matchesStatus =
      status === 'all' ||
      (status === 'open' && !task.done) ||
      (status === 'done' && task.done);

    // search filter
    const matchesSearch =
      !q ||
      task.title.toLowerCase().includes(q) ||
      (task.notes || '').toLowerCase().includes(q) ||
      (task.assignee || '').toLowerCase().includes(q) ||
      (task.assigneeEmail || '').toLowerCase().includes(q);

    // assignee filter
    const matchesAssignee =
      assignee === 'all'
        ? true
        : (task.assigneeEmail || '').toLowerCase() ===
          (currentUserEmail || '').toLowerCase();

    return matchesStatus && matchesSearch && matchesAssignee;
  });

  list.innerHTML = filtered
    .map(task => {
      const index = project.tasks.indexOf(task); // real index
      const due = task.dueDate ? new Date(task.dueDate) : null;

      let priorityClass = 'chip-priority-medium';
      if (task.priority === 'high') priorityClass = 'chip-priority-high';
      if (task.priority === 'low') priorityClass = 'chip-priority-low';

      const statusChip = task.done ? 'chip-status-done' : 'chip-status-open';

      const hasAssignee = task.assignee || task.assigneeEmail;

      return `
        <article class="project-card">
          <div class="task-title-row">
            <input type="checkbox" ${task.done ? 'checked' : ''}
                   onchange="toggleTaskDone('${project.id}', ${index})">
            <span>${task.title}</span>
          </div>

          <div class="task-meta">
            <span class="chip ${priorityClass}">
              ${(task.priority || 'medium').toUpperCase()}
            </span>
            <span class="chip ${statusChip}">
              ${task.done ? 'DONE' : 'OPEN'}
            </span>
            ${
              due
                ? `<span>Due: ${due.toLocaleDateString()}</span>`
                : '<span>No due date</span>'
            }
            ${
              hasAssignee
                ? `<span class="chip chip-assignee">
                     ${task.assignee ? task.assignee : 'Unassigned'}
                     ${
                       task.assigneeEmail
                         ? ` · ${task.assigneeEmail}`
                         : ''
                     }
                   </span>`
                : ''
            }
          </div>

          ${
            task.notes
              ? `<p class="project-desc">${task.notes}</p>`
              : ''
          }

          <div class="task-actions">
            <button class="link-ghost" onclick="startEditTask('${project.id}', ${index})">
              ✏️ Edit
            </button>
            <button class="link-ghost" onclick="deleteTask('${project.id}', ${index})">
              🗑 Delete
            </button>
          </div>
        </article>
      `;
    })
    .join('');

  // Stats + progress
  const total = project.tasks.length;
  const completed = project.tasks.filter(t => t.done).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  const totalEl = document.getElementById('taskTotal');
  const doneEl = document.getElementById('taskCompleted');
  const fillEl = document.getElementById('tasksProgressFill');
  const textEl = document.getElementById('tasksProgressText');

  if (totalEl) totalEl.textContent = total;
  if (doneEl) doneEl.textContent = completed;
  if (fillEl) fillEl.style.width = percent + '%';
  if (textEl) textEl.textContent = percent + '% Complete';

  // Sync project progress for dashboard
  project.progress = percent;
  saveProjects();
}

// Expose for filters in tasks.html
window.applyTaskFilters = function () {
  const projectId = getCurrentProjectId();
  const project = projects.find(p => p.id === projectId);
  if (project) renderProjectTasks(project);
};

// =====================================
// Add / edit tasks
// =====================================
function setupTaskForm(project) {
  const taskForm = document.getElementById('taskForm');
  if (!taskForm) return;

  taskForm.onsubmit = e => {
    e.preventDefault();

    const title = document.getElementById('taskTitle').value.trim();
    const notes = document.getElementById('taskNotes').value.trim();
    const assignee = document.getElementById('taskAssignee').value.trim();
    const assigneeEmail = document
      .getElementById('taskAssigneeEmail')
      .value.trim();
    const done = document.getElementById('taskDone').checked;
    const priority =
      document.getElementById('taskPriority')?.value || 'medium';
    const dueDate = document.getElementById('taskDue')?.value || '';

    if (!title) return;

    const payload = {
      id:
        editingTaskIndex !== null
          ? project.tasks[editingTaskIndex].id
          : Date.now().toString(),
      title,
      notes,
      assignee,
      assigneeEmail,
      done,
      priority,
      dueDate
    };

    if (editingTaskIndex !== null) {
      project.tasks[editingTaskIndex] = payload;
    } else {
      project.tasks.push(payload);
    }

    saveProjects();
    renderProjectTasks(project);
    closeModal('taskModal');
    taskForm.reset();
    document.getElementById('taskDone').checked = false;
    editingTaskIndex = null;
    const heading = document.querySelector('#taskModal h2');
    if (heading) heading.textContent = 'Add Task';
  };
}

// Toggle task completion
function toggleTaskDone(projectId, index) {
  const project = projects.find(p => p.id === projectId);
  if (!project) return;

  project.tasks[index].done = !project.tasks[index].done;
  saveProjects();
  renderProjectTasks(project);
}

// Start editing a task
function startEditTask(projectId, index) {
  const project = projects.find(p => p.id === projectId);
  if (!project) return;

  const task = project.tasks[index];
  editingTaskIndex = index;

  document.getElementById('taskTitle').value = task.title;
  document.getElementById('taskNotes').value = task.notes || '';
  document.getElementById('taskAssignee').value = task.assignee || '';
  document.getElementById('taskAssigneeEmail').value =
    task.assigneeEmail || '';
  document.getElementById('taskDone').checked = !!task.done;

  const priorityEl = document.getElementById('taskPriority');
  if (priorityEl) priorityEl.value = task.priority || 'medium';

  const dueEl = document.getElementById('taskDue');
  if (dueEl) dueEl.value = task.dueDate || '';

  const heading = document.querySelector('#taskModal h2');
  if (heading) heading.textContent = 'Edit Task';

  openTaskModal();
}

// Delete a task
function deleteTask(projectId, index) {
  const project = projects.find(p => p.id === projectId);
  if (!project) return;

  if (!confirm('Delete this task?')) return;

  project.tasks.splice(index, 1);
  saveProjects();
  renderProjectTasks(project);
}

// =====================================
// Modal helpers
// =====================================
function openTaskModal() {
  const modal = document.getElementById('taskModal');
  if (modal) modal.style.display = 'block';
}

function closeModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.style.display = 'none';
}

function setupGlobalModalClose() {
  window.onclick = event => {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      if (event.target === modal) {
        closeModal(modal.id);
      }
    });
  };
}
