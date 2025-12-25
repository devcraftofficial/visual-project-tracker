// ================================
// Load shared project data
// ================================
let projects = JSON.parse(localStorage.getItem('projects')) || [];

let projectSearchTerm = "";

// Helper
function saveProjects() {
  localStorage.setItem('projects', JSON.stringify(projects));
}

// ================================
// Init
// ================================
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('projectSearch');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      projectSearchTerm = e.target.value.toLowerCase();
      renderProjectsPage();
    });
  }

  renderProjectsPage();
});

// ================================
// Rendering
// ================================
function renderProjectsPage() {
  const ongoingContainer = document.getElementById('ongoingList');
  const completedContainer = document.getElementById('completedList');

  if (!ongoingContainer || !completedContainer) return;

  const filtered = projects.filter((p) => {
    if (!projectSearchTerm) return true;
    const text = (p.name + " " + (p.description || "")).toLowerCase();
    return text.includes(projectSearchTerm);
  });

  const ongoing = filtered.filter((p) => p.status === "ongoing");
  const completed = filtered.filter((p) => p.status === "completed");

  ongoingContainer.innerHTML = ongoing.length
    ? ongoing.map((p) => projectCardHTML(p)).join("")
    : `<p>No ongoing projects found.</p>`;

  completedContainer.innerHTML = completed.length
    ? completed.map((p) => projectCardHTML(p)).join("")
    : `<p>No completed projects yet.</p>`;

  updateProjectStats();
}

function projectCardHTML(project) {
  const start = project.startDate
    ? new Date(project.startDate).toLocaleDateString()
    : "Not set";
  const end = project.endDate
    ? new Date(project.endDate).toLocaleDateString()
    : "Not set";

  const statusChip =
    project.status === "completed"
      ? `<span class="chip chip-status-done">COMPLETED</span>`
      : `<span class="chip chip-status-open">ONGOING</span>`;

  const progress = project.progress || 0;

  return `
    <article class="project-card">
      <div class="project-card-header">
        <h3 class="project-title">${project.name}</h3>
        <button class="icon-btn" title="Delete project" onclick="deleteProjectFromProjectsPage('${project.id}'); event.stopPropagation();">
          ✕
        </button>
      </div>

      <div class="task-meta">
        ${statusChip}
        <span>Start: ${start}</span>
        <span>Due: ${end}</span>
      </div>

      ${
        project.description
          ? `<p class="project-desc">${project.description}</p>`
          : ""
      }

      <div class="progress-bar" style="margin-top:6px;">
        <div class="progress-fill" style="width:${progress}%;"></div>
      </div>
      <div class="progress-text" style="font-size:0.8rem;margin-top:4px;">
        ${progress}% Complete
      </div>

      <div class="project-footer">
        <button class="btn-pill" onclick="goToTasks('${project.id}')">
          View Tasks
        </button>
      </div>
    </article>
  `;
}

// ================================
// Stats at top
// ================================
function updateProjectStats() {
  const countOngoingEl = document.getElementById("countOngoing");
  const countCompletedEl = document.getElementById("countCompleted");
  const fillEl = document.getElementById("projectsProgressFill");
  const textEl = document.getElementById("projectsProgressText");

  const total = projects.length;

  // normalize status from progress (keep in sync with dashboard)
  projects.forEach(p => {
    const prog = parseInt(p.progress, 10) || 0;
    if (prog >= 100) {
      p.status = "completed";
    } else if (p.status === "completed" && prog < 100) {
      p.status = "ongoing";
    }
  });

  const ongoing = projects.filter(p => p.status === "ongoing").length;
  const completed = projects.filter(p => p.status === "completed").length;

  let avgProgress = 0;
  if (total > 0) {
    const sum = projects.reduce(
      (acc, p) => acc + (parseInt(p.progress, 10) || 0),
      0
    );
    avgProgress = Math.round(sum / total);
  }

  if (countOngoingEl) countOngoingEl.textContent = ongoing;
  if (countCompletedEl) countCompletedEl.textContent = completed;
  if (fillEl) fillEl.style.width = avgProgress + "%";
  if (textEl) textEl.textContent = avgProgress + "% Complete";

  saveProjects(); // keep status + progress synced
}

// ================================
// Navigation
// ================================
function goToTasks(projectId) {
  window.location.href = `tasks.html?projectId=${projectId}`;
}

// ================================
// Delete project (Projects page)
// ================================
function deleteProjectFromProjectsPage(projectId) {
  const project = projects.find(p => p.id === projectId);
  if (!project) return;

  const ok = confirm(`Delete project "${project.name}" and all its tasks?`);
  if (!ok) return;

  projects = projects.filter(p => p.id !== projectId);
  saveProjects();
  renderProjectsPage();
}
