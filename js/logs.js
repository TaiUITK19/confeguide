const STORAGE_KEY = "confguides";

const defaultConferences = [
  {
    id: 1,
    name: "ACM Symposium on Applied Computing (ATC 2026)",
    logo: "ACM<br>ATC",
    fields: ["computer systems", "distributed computing"],
    deadline: "2026-09-16"
  },
  {
    id: 2,
    name: "Conference on Neural Information Processing Systems",
    logo: "NeurIPS<br>2026",
    fields: ["machine learning", "deep learning"],
    deadline: "2026-05-13"
  },
  {
    id: 3,
    name: "International Conference on Learning Representations",
    logo: "ICLR<br>2026",
    fields: ["machine learning", "representation learning"],
    deadline: "2025-10-22"
  },
  {
    id: 4,
    name: "The International Symposium on Information and Communication ...",
    logo: "SOICT<br>2026",
    fields: ["information systems", "computer science"],
    deadline: "2026-09-16"
  },
  {
    id: 5,
    name: "International Conference on Machine Learning and Pattern ...",
    logo: "MAPR<br>2026",
    fields: ["machine learning", "pattern recognition"],
    deadline: "2026-05-15"
  }
];

let conferences = JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultConferences;

const body = document.getElementById("conferenceBody");
const totalCount = document.getElementById("totalCount");
const modal = document.getElementById("conferenceModal");
const form = document.getElementById("conferenceForm");

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conferences));
}

function formatDate(date) {
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).replace("thg ", "Tháng ");
}

function logoClass(logo) {
  if (logo.toLowerCase().includes("soict")) return "red";
  if (logo.toLowerCase().includes("mapr")) return "yellow";
  return "";
}

function render() {
  totalCount.textContent = conferences.length;

  if (conferences.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center;padding:35px;color:#6d87a9">
          Chưa có hội nghị nào được lưu.
        </td>
      </tr>`;
    return;
  }

  body.innerHTML = conferences.map(c => `
    <tr>
      <td>
        <div class="conference-name">
          <div class="logo-placeholder ${logoClass(c.logo)}">${c.logo}</div>
          <div class="name-text">${escapeHtml(c.name)}</div>
        </div>
      </td>
      <td>
        <div class="tags">
          ${c.fields.map(f => `<span class="tag">${escapeHtml(f)}</span>`).join("")}
        </div>
      </td>
      <td>
        <div class="deadline">
          <span class="calendar">▣</span>
          <span>${formatDate(c.deadline)}</span>
        </div>
      </td>
      <td>
        <div class="actions">
          <button class="action-btn" onclick="editConference(${c.id})">✎ &nbsp; Sửa</button>
          <button class="action-btn delete" onclick="deleteConference(${c.id})">♙ &nbsp; Xóa</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function openAddModal() {
  document.getElementById("modalTitle").textContent = "Thêm hội nghị";
  form.reset();
  document.getElementById("editId").value = "";
  modal.classList.add("show");
  document.getElementById("name").focus();
}

function editConference(id) {
  const c = conferences.find(item => item.id === id);
  if (!c) return;

  document.getElementById("modalTitle").textContent = "Chỉnh sửa hội nghị";
  document.getElementById("editId").value = c.id;
  document.getElementById("name").value = c.name;
  document.getElementById("logo").value = c.logo.replaceAll("<br>", " ");
  document.getElementById("fields").value = c.fields.join(", ");
  document.getElementById("deadline").value = c.deadline;

  modal.classList.add("show");
}

function deleteConference(id) {
  const c = conferences.find(item => item.id === id);
  if (!c) return;

  if (confirm(`Bạn có chắc muốn xóa "${c.name}" không?`)) {
    conferences = conferences.filter(item => item.id !== id);
    save();
    render();
  }
}

form.addEventListener("submit", event => {
  event.preventDefault();

  const id = document.getElementById("editId").value;
  const name = document.getElementById("name").value.trim();
  const logo = document.getElementById("logo").value.trim().replace(/\s+/g, " ");
  const fields = document.getElementById("fields").value
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);
  const deadline = document.getElementById("deadline").value;

  if (id) {
    const index = conferences.findIndex(c => c.id === Number(id));
    conferences[index] = {
      ...conferences[index],
      name,
      logo: logo.replace(" ", "<br>"),
      fields,
      deadline
    };
  } else {
    conferences.push({
      id: Date.now(),
      name,
      logo: logo.replace(" ", "<br>"),
      fields,
      deadline
    });
  }

  save();
  render();
  modal.classList.remove("show");
});

document.getElementById("addBtn").addEventListener("click", openAddModal);
document.getElementById("closeModal").addEventListener("click", () => modal.classList.remove("show"));
document.getElementById("cancelBtn").addEventListener("click", () => modal.classList.remove("show"));

modal.addEventListener("click", event => {
  if (event.target === modal) modal.classList.remove("show");
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") modal.classList.remove("show");
});

document.getElementById("themeBtn").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("darkMode", document.body.classList.contains("dark"));
});

if (localStorage.getItem("darkMode") === "true") {
  document.body.classList.add("dark");
}

render();
