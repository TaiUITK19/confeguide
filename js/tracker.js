(function () {
  'use strict';

  const tbody = document.getElementById('conferenceBody');
  const count = document.getElementById('totalCount');
  if (!tbody) return;

  function read(key, fallback) {
    try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; }
    catch (_) { return fallback; }
  }
  function currentUser() { return read('confguide_current_user', null); }
  function savedKey() {
    const user = currentUser();
    return user && (user.id || user.email) ? `confguide_saved_${user.id || user.email}` : 'confguide_saved_guest';
  }
  function getSaved() {
    const scoped = read(savedKey(), null);
    if (Array.isArray(scoped)) return scoped;
    const legacy = read('confguide_saved', null);
    if (Array.isArray(legacy)) return legacy;
    const old = read('savedConferences', []);
    return Array.isArray(old) ? old : [];
  }
  function setSaved(ids) {
    try {
      localStorage.setItem(savedKey(), JSON.stringify(ids));
    } catch (_) {
      window.alert('Không thể cập nhật danh sách trong bộ nhớ trình duyệt.');
    }
  }
  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function allConferences() {
    return window.ConfGuideTrackerConferences || (window.ConfGuideUtils && window.ConfGuideUtils.FALLBACK_CONFERENCES) || [];
  }
  function deadline(conf) {
    const utils = window.ConfGuideUtils;
    const next = utils && utils.getNextDeadline ? utils.getNextDeadline(conf) : null;
    if (!next) return { date: 'Chưa cập nhật', remaining: '' };
    const date = utils.formatDateVi ? utils.formatDateVi(next.date) : new Date(`${next.date}T00:00:00`).toLocaleDateString('vi-VN');
    const daysLeft = next.daysLeft === null || next.daysLeft === undefined ? NaN : Number(next.daysLeft);
    const remaining = Number.isFinite(daysLeft)
      ? daysLeft >= 0 ? `Còn ${daysLeft} ngày` : `Đã quá hạn ${Math.abs(daysLeft)} ngày`
      : '';
    return { date, remaining };
  }
  function render() {
    const ids = getSaved();
    const conferences = allConferences();
    const rows = ids.map(id => conferences.find(c => String(c.id) === String(id) || c.name === id) || { id, name: String(id) });
    if (count) count.textContent = rows.length;
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="tracker-empty">Bạn chưa lưu hội nghị nào. Hãy tìm hội nghị phù hợp và nhấn “Lưu” để theo dõi tại đây.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(conf => {
      const id = String(conf.id);
      const fields = (conf.fields || []).slice(0, 3).map(f => `<span class="tag">${esc(f)}</span>`).join('');
      const label = esc(conf.acronym || conf.short_name || conf.name || 'CG');
      const nearest = deadline(conf);
      return `<tr>
        <td><div class="conference-name"><div class="logo-placeholder">${label}</div><div class="name-text"><a href="detail.html?id=${encodeURIComponent(id)}">${esc(conf.name || id)}</a></div></div></td>
        <td><div class="tags">${fields || '<span class="tag">Chưa phân loại</span>'}</div></td>
        <td><div class="deadline-cell"><div class="deadline">${esc(nearest.date)}</div>${nearest.remaining ? `<div class="deadline-remaining">${esc(nearest.remaining)}</div>` : ''}</div></td>
        <td><div class="actions"><button class="action-btn delete" type="button" data-remove="${esc(id)}">Xóa</button></div></td>
      </tr>`;
    }).join('');
    tbody.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', () => {
      const id = button.dataset.remove;
      setSaved(getSaved().filter(item => String(item) !== id));
      render();
    }));
  }

  render();
  // Online deployments can enrich the offline fallback with the full dataset.
  fetch('data/conference_data.json').then(response => response.ok ? response.json() : null).then(data => {
    if (Array.isArray(data) && data.length) {
      window.ConfGuideTrackerConferences = data;
      render();
    }
  }).catch(() => {});
  // Refresh when a same-origin tab updates the saved list.
  window.addEventListener('storage', event => {
    if (event.key === savedKey()) render();
  });
})();
