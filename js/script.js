const DATA_URL = "data/conference_data.json";
const grid = document.getElementById("conferenceGrid");
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const resultsCount = document.getElementById("resultsCount");
const clearSearch = document.getElementById("clearSearch");
const emptyState = document.getElementById("emptyState");
const modal = document.getElementById("detailModal");
const modalContent = document.getElementById("modalContent");
let allConferences = [];
let activeFilter = "all";
let query = "";

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[character]));
}

function escapeAttribute(value) {
  return escapeHTML(value);
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
  return deadlines.filter(item => item && item.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0] || null;
}

function matches(item) {
  const haystack = [
    item.name, item.year, item.website_url, item.deadline_url, item.full_name,
    item.summarization, item.location, item.date_happen,
    ...(Array.isArray(item.deadlines) ? item.deadlines.flatMap(deadline => [deadline.name, deadline.date]) : [])
  ].filter(Boolean).join(" ").toLowerCase();
  const location = (item.location || "").toLowerCase().replace(/\s+/g, " ");
  const locationMatch = activeFilter === "all"
    || (activeFilter === "Việt Nam" && (location.includes("vietnam") || location.includes("viet nam")))
    || (activeFilter === "Quốc tế" && !location.includes("vietnam") && !location.includes("viet nam"));
  return locationMatch && (!query || haystack.includes(query.toLowerCase()));
}

function renderCard(item) {
  const deadline = nearestDeadline(item.deadlines);
  const meta = [
    item.date_happen && `<span>▣ ${escapeHTML(formatConferenceDate(item.date_happen))}</span>`,
    item.location && `<span>⌖ ${escapeHTML(item.location)}</span>`
  ].filter(Boolean).join("");
  const description = item.summarization || item.full_name;
  return `<article class="conference-card">
    <div class="card-top">
      <div class="conference-logo">${escapeHTML(item.name.slice(0, 4).toUpperCase())}</div>
      <div class="card-title-wrap">
        <h3 class="card-title">${escapeHTML(item.name)}</h3>
        ${meta ? `<div class="meta">${meta}</div>` : ""}
      </div>
    </div>
    ${item.year ? `<span class="rank">${escapeHTML(item.year)}</span>` : ""}
    ${description ? `<p class="card-description">${escapeHTML(description)}</p>` : ""}
    <div class="card-bottom">
      <button class="detail-btn" data-index="${allConferences.indexOf(item)}" type="button">Xem chi tiết →</button>
      ${deadline ? `<div class="deadline">${escapeHTML(deadline.name)}<strong>${escapeHTML(formatDate(deadline.date))}</strong></div>` : ""}
    </div>
  </article>`;
}

function render() {
  const filtered = allConferences.filter(matches);
  grid.innerHTML = filtered.map(renderCard).join("");
  resultsCount.textContent = `Hiển thị ${filtered.length}/${allConferences.length} hội nghị`;
  emptyState.hidden = filtered.length !== 0;
  clearSearch.hidden = !query;
  grid.querySelectorAll(".detail-btn").forEach(button => {
    button.addEventListener("click", () => openDetail(Number(button.dataset.index)));
  });
}

function openDetail(index) {
  const item = allConferences[index];
  if (!item) return;
  const deadlineHTML = Array.isArray(item.deadlines) && item.deadlines.length
    ? `<div class="modal-list">${item.deadlines.map(deadline => `<div><strong>${escapeHTML(deadline.name)}</strong><span>${escapeHTML(formatDate(deadline.date))}</span></div>`).join("")}</div>`
    : "";
  const fields = [
    item.date_happen && `<div><strong>THỜI GIAN</strong><span>${escapeHTML(formatConferenceDate(item.date_happen))}</span></div>`,
    item.location && `<div><strong>ĐỊA ĐIỂM</strong><span>${escapeHTML(item.location)}</span></div>`
  ].filter(Boolean).join("");
  const links = [
    item.website_url && `<a href="${escapeAttribute(item.website_url)}" target="_blank" rel="noopener noreferrer">Trang hội nghị →</a>`,
    item.deadline_url && `<a href="${escapeAttribute(item.deadline_url)}" target="_blank" rel="noopener noreferrer">Xem deadline →</a>`
  ].filter(Boolean).join("");
  modalContent.innerHTML = `${item.year ? `<span class="modal-rank">${escapeHTML(item.year)}</span>` : ""}
    <h2>${escapeHTML(item.name)}</h2>
    ${item.full_name && item.full_name !== item.name ? `<p style="color:#657791">${escapeHTML(item.full_name)}</p>` : ""}
    ${item.summarization ? `<p>${escapeHTML(item.summarization)}</p>` : ""}
    ${fields || deadlineHTML ? `<div class="modal-list">${fields}</div>${deadlineHTML}` : ""}
    ${links ? `<div style="margin-top:20px;display:flex;gap:12px;flex-wrap:wrap">${links}</div>` : ""}`;
  modal.showModal();
}

async function loadConferences() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Dữ liệu không phải là một mảng.");
    allConferences = data.filter(item => item && item.name);
    render();
  } catch (error) {
    console.error("Không thể tải conference_data.json:", error);
    resultsCount.textContent = "Không thể tải dữ liệu hội nghị.";
  }
}

searchForm.addEventListener("submit", event => {
  event.preventDefault();
  query = searchInput.value.trim().toLowerCase();
  render();
});
searchInput.addEventListener("input", () => {
  query = searchInput.value.trim().toLowerCase();
  render();
});
clearSearch.addEventListener("click", () => {
  searchInput.value = "";
  query = "";
  render();
});
document.querySelectorAll(".keyword-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    searchInput.value = chip.textContent;
    query = chip.textContent.trim().toLowerCase();
    render();
  });
});
document.querySelectorAll(".filter").forEach(button => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll(".filter").forEach(item => item.classList.toggle("active", item === button));
    render();
  });
});
document.getElementById("viewAllBtn").addEventListener("click", () => {
  activeFilter = "all";
  query = "";
  searchInput.value = "";
  document.querySelectorAll(".filter").forEach(item => item.classList.toggle("active", item.dataset.filter === "all"));
  render();
});
document.getElementById("modalClose").addEventListener("click", () => modal.close());
modal.addEventListener("click", event => {
  if (event.target === modal) modal.close();
});
document.getElementById("themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("darkMode", document.body.classList.contains("dark"));
});
if (localStorage.getItem("darkMode") === "true") document.body.classList.add("dark");

loadConferences();
