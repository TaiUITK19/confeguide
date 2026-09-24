const DATA_URL = "data/conference_data.json";
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

let conferences = [];
let currentResults = [];
let saved = JSON.parse(localStorage.getItem("savedConferences") || "[]");

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[character]));
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatConferenceDate(value) {
  if (!value) return "";
  const dates = value.split(" to ");
  return dates.length === 2 ? `${formatDate(dates[0])} - ${formatDate(dates[1])}` : value;
}

function nearestDeadline(deadlines) {
  if (!Array.isArray(deadlines)) return null;
  return deadlines
    .filter(deadline => deadline && deadline.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0] || null;
}

function render(list) {
  const container = $("#conferenceList");
  $("#resultCount").textContent = list.length;
  $("#emptyState").classList.toggle("hidden", list.length !== 0);

  container.innerHTML = list.map(conference => {
    const deadline = nearestDeadline(conference.deadlines);
    const savedConference = saved.includes(conference.name);
    const meta = [
      conference.location && `<span><i class="fa-solid fa-location-dot"></i>${escapeHTML(conference.location)}</span>`,
      conference.date_happen && `<span><i class="fa-regular fa-calendar"></i>${escapeHTML(formatConferenceDate(conference.date_happen))}</span>`
    ].filter(Boolean).join("");
    const description = conference.summarization || conference.full_name;
    const deadlineHTML = deadline
      ? `<div class="deadline"><div><i class="fa-regular fa-calendar"></i> ${escapeHTML(deadline.name)}</div><strong>${escapeHTML(formatDate(deadline.date))}</strong></div>`
      : "";

    return `<article class="conference-card">
      <div class="conf-main">
        <h2 class="conf-title">${escapeHTML(conference.name)}</h2>
        ${conference.full_name && conference.full_name !== conference.name ? `<p class="conf-subtitle">${escapeHTML(conference.full_name)}</p>` : ""}
        ${meta ? `<div class="meta">${meta}</div>` : ""}
        ${description ? `<p class="description">${escapeHTML(description)}</p>` : ""}
      </div>
      <div class="conf-side">
        ${conference.year ? `<span class="rank">${escapeHTML(conference.year)}</span>` : ""}
        ${deadlineHTML}
        <button class="save-btn ${savedConference ? "saved" : ""}" data-save="${escapeHTML(conference.name)}">
          <i class="fa-regular fa-bookmark"></i>${savedConference ? "Đã lưu" : "Lưu"}
        </button>
      </div>
    </article>`;
  }).join("");

  $$("[data-save]").forEach(button => {
    button.addEventListener("click", () => toggleSave(button.dataset.save));
  });
}

function matchesSearch(conference, query) {
  if (!query) return true;
  const deadlines = Array.isArray(conference.deadlines)
    ? conference.deadlines.flatMap(deadline => [deadline.name, deadline.date])
    : [];
  return [conference.name, conference.year, conference.website_url, conference.deadline_url,
    conference.full_name, conference.summarization, conference.location, conference.date_happen,
    ...deadlines].filter(Boolean).join(" ").toLowerCase().includes(query.toLowerCase());
}

function applyFilters() {
  const query = $("#searchInput").value.trim();
  const from = $("#fromDate").value;
  const to = $("#toDate").value;
  currentResults = conferences.filter(conference => {
    const deadlines = Array.isArray(conference.deadlines) ? conference.deadlines : [];
    const deadlineDates = deadlines.map(deadline => deadline.date).filter(Boolean);
    const fromOK = !from || deadlineDates.some(date => date >= from);
    const toOK = !to || deadlineDates.some(date => date <= to);
    return matchesSearch(conference, query) && (from || to ? fromOK && toOK : true);
  });
  sortResults();
}

function sortResults() {
  const type = $("#sortSelect").value;
  const sorted = [...currentResults].sort((a, b) => {
    if (type === "name") return a.name.localeCompare(b.name);
    if (type === "date") return (a.date_happen || "").localeCompare(b.date_happen || "");
    if (type === "deadline") {
      return (nearestDeadline(a.deadlines)?.date || "9999").localeCompare(nearestDeadline(b.deadlines)?.date || "9999");
    }
    return 0;
  });
  render(sorted);
}

function toggleSave(name) {
  saved = saved.includes(name) ? saved.filter(item => item !== name) : [...saved, name];
  localStorage.setItem("savedConferences", JSON.stringify(saved));
  render(currentResults);
  showToast(saved.includes(name) ? "Đã lưu hội nghị vào hồ sơ." : "Đã bỏ lưu hội nghị.");
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

async function loadConferences() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Dữ liệu không phải là một mảng.");
    conferences = data.filter(conference => conference && conference.name);
    currentResults = [...conferences];
    sortResults();
  } catch (error) {
    console.error("Không thể tải conference_data.json:", error);
    $("#conferenceList").innerHTML = '<p class="data-error">Không thể tải dữ liệu hội nghị.</p>';
  }
}

$("#searchForm").addEventListener("submit", event => {
  event.preventDefault();
  applyFilters();
});

$$(".keyword").forEach(button => {
  button.addEventListener("click", () => {
    $("#searchInput").value = button.dataset.keyword;
    applyFilters();
  });
});

$("#applyFilters").addEventListener("click", applyFilters);
$("#sortSelect").addEventListener("change", sortResults);
$("#resetFilters").addEventListener("click", () => {
  $("#searchInput").value = "";
  $("#fromDate").value = "";
  $("#toDate").value = "";
  $("#sortSelect").value = "relevance";
  applyFilters();
});
$("#themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("darkMode", document.body.classList.contains("dark"));
});
if (localStorage.getItem("darkMode") === "true") document.body.classList.add("dark");

loadConferences();
