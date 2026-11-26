/**
 * ConfGuide - Trang chi tiết hội nghị.
 * JavaScript thuần; sử dụng các ID/CSS class sẵn có trong detail.html.
 * Dữ liệu dự phòng nằm riêng tại js/detail-fallback.js (tạo bằng công cụ cài đặt).
 */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const DAY = 86_400_000;
  const STAR_PATH = 'M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z';
  const FORMAT_LABELS = {
    'in-person': 'Trực tiếp (In-person)',
    online: 'Trực tuyến (Online)',
    hybrid: 'Kết hợp (Hybrid)'
  };
  const MILESTONES = [
    { key: 'abstract', name: 'Tóm tắt (Abstract)', shortName: 'Nộp Abstract' },
    { key: 'fullPaper', name: 'Bài hoàn chỉnh (Full paper)', shortName: 'Nộp Full Paper' },
    { key: 'notification', name: 'Thông báo kết quả (Notification)', shortName: 'Thông báo' },
    { key: 'cameraReady', name: 'Bản in hoàn thiện (Camera-ready)', shortName: 'Camera-Ready' }
  ];

  let conferences = [];
  let conference = null;
  let clockTimer = null; // Một timer cập nhật toàn bộ đồng hồ, tránh nhiều setInterval.

  // ---------- Trợ giúp: dữ liệu và DOM ----------
  function text(id, value) {
    const element = $(id);
    if (element) element.textContent = value == null ? '' : String(value);
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
  }

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) {
      return false;
    }
  }

  function formatDate(value) {
    if (!value) return 'Chưa công bố';
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value);
  }

  function formatRange(start, end) {
    if (!start) return 'Chưa công bố';
    return end && end !== start ? `${formatDate(start)} – ${formatDate(end)}` : formatDate(start);
  }

  function slug(value) {
    return String(value || '').toLowerCase().trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  // Ngày AoE kết thúc lúc 23:59:59 ở UTC-12 (tức 11:59:59 UTC ngày kế tiếp).
  function aoeDeadline(date) {
    const day = String(date || '').match(/^\d{4}-\d{2}-\d{2}/)?.[0];
    if (!day) return null;
    const timestamp = Date.parse(`${day}T23:59:59-12:00`);
    return Number.isNaN(timestamp) ? null : timestamp;
  }

  function timeLeft(date) {
    const deadline = aoeDeadline(date);
    if (deadline === null) return null;
    const remaining = Math.max(0, deadline - Date.now());
    return {
      passed: deadline < Date.now(),
      days: Math.floor(remaining / DAY),
      hours: Math.floor(remaining % DAY / 3_600_000),
      minutes: Math.floor(remaining % 3_600_000 / 60_000),
      seconds: Math.floor(remaining % 60_000 / 1000),
      daysLeft: Math.ceil((deadline - Date.now()) / DAY)
    };
  }

  // Hỗ trợ cả dữ liệu chuẩn (deadlines dạng object) và dữ liệu crawl (dạng array).
  function normalizeDeadlines(deadlines) {
    if (Array.isArray(deadlines)) {
      return deadlines.filter(item => item?.name && item?.date)
        .map((item, index) => ({
          key: `entry-${index}`, name: item.name, shortName: item.name, date: item.date
        }));
    }
    return MILESTONES.filter(item => deadlines?.[item.key]).map(item => ({
      ...item, date: deadlines[item.key]
    }));
  }

  function normalizeConference(item) {
    const deadlines = normalizeDeadlines(item.deadlines);
    return {
      ...item,
      id: item.id || slug(item.name),
      fullName: item.fullName || item.full_name || item.name,
      website: item.website || item.website_url || '',
      startDate: item.startDate || item.start_date || '',
      endDate: item.endDate || item.end_date || '',
      fields: Array.isArray(item.fields) ? item.fields : (Array.isArray(item.tags) ? item.tags : []),
      indexing: item.indexing || [],
      milestones: deadlines
    };
  }

  function getNextDeadline(item) {
    const events = [...item.milestones].sort((a, b) => a.date.localeCompare(b.date));
    return events.find(event => !timeLeft(event.date)?.passed) || events.at(-1) || null;
  }

  // ---------- Xuất lịch Google Calendar và iCalendar ----------
  function calendarEvent(item, milestone) {
    return {
      title: `[ConfGuide] ${item.name} - Hạn ${milestone.shortName}`,
      description: `Hạn ${milestone.name} của hội nghị ${item.fullName} (AoE UTC-12).\nWebsite: ${item.website}`,
      location: item.location || '',
      date: milestone.date
    };
  }

  function googleCalendarUrl(event) {
    const start = aoeDeadline(event.date);
    if (start === null) return '#';
    const iso = value => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      details: event.description,
      location: event.location,
      dates: `${iso(start)}/${iso(start + 60_000)}`
    });
    return `https://calendar.google.com/calendar/render?${params}`;
  }

  function openCalendar(item, milestone) {
    const url = googleCalendarUrl(calendarEvent(item, milestone));
    if (url !== '#') window.open(url, '_blank', 'noopener,noreferrer');
  }

  function escapeIcs(value) {
    return String(value ?? '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n')
      .replace(/,/g, '\\,').replace(/;/g, '\\;');
  }

  function createIcs(events) {
    const iso = timestamp => new Date(timestamp).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ConfGuide//Conference Deadlines//VI', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
    events.forEach((event, index) => {
      const start = aoeDeadline(event.date);
      if (start === null) return;
      lines.push(
        'BEGIN:VEVENT',
        `UID:${start}-${index}@confguide.local`,
        `DTSTAMP:${iso(Date.now())}`,
        `DTSTART:${iso(start)}`,
        `DTEND:${iso(start + 60_000)}`,
        `SUMMARY:${escapeIcs(event.title)}`,
        `DESCRIPTION:${escapeIcs(event.description)}`,
        `LOCATION:${escapeIcs(event.location)}`,
        'END:VEVENT'
      );
    });
    lines.push('END:VCALENDAR');
    return lines.join('\r\n') + '\r\n';
  }

  function downloadIcs(filename, events) {
    if (!events.length) {
      alert('Hội nghị này chưa có mốc thời gian cụ thể để xuất lịch.');
      return;
    }
    const blob = new Blob([createIcs(events)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Trì hoãn để trình duyệt có thời gian tiếp nhận thao tác tải xuống.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ---------- Kết xuất hội nghị ----------
  function renderOverview(item) {
    document.title = `${item.name} - ConfGuide`;
    const next = getNextDeadline(item);
    const passed = next ? timeLeft(next.date)?.passed : true;
    const end = item.endDate ? Date.parse(`${item.endDate}T23:59:59`) : NaN;
    let status = { label: 'Đang mở nộp bài', className: 'status-open' };
    if (!Number.isNaN(end) && Date.now() > end) status = { label: 'Đã diễn ra', className: 'status-ended' };
    else if (!next || passed) status = { label: 'Đã đóng nhận bài', className: 'status-closed' };
    else if (timeLeft(next.date).daysLeft <= 7) status = { label: 'Sắp hết hạn', className: 'status-urgent' };

    const badge = $('detailStatusBadge');
    if (badge) { badge.textContent = status.label; badge.className = `status-badge ${status.className}`; }
    const fmt = FORMAT_LABELS[item.format] || item.mode || 'Trực tiếp';
    const dateRange = formatRange(item.startDate, item.endDate);
    const description = item.summarization || 'Hội nghị khoa học uy tín dành cho cộng đồng nghiên cứu.';
    const values = {
      detailRankBadge: `Rank ${item.rank || 'A*'}`,
      detailRegionPill: item.region || 'Quốc tế', detailTitle: item.name,
      detailFullName: item.fullName, detailDesc: description,
      detailLocation: item.location || 'Chưa cập nhật', detailDate: dateRange,
      detailFormat: fmt, detailFee: item.fee || 'Đang cập nhật',
      infoLocation: item.location || 'Chưa cập nhật', infoFormat: fmt,
      infoRegion: item.region || 'Quốc tế', infoDate: dateRange,
      infoPublisher: item.publisher || 'Chưa cập nhật',
      infoIndexing: Array.isArray(item.indexing) ? item.indexing.join(', ') : item.indexing,
      infoFee: item.fee || 'Chưa cập nhật', infoFields: item.fields.join(', '),
      infoRank: item.rank || 'A*', infoVerified: formatDate(item.lastVerified),
      avgScore: item.rating ? Number(item.rating).toFixed(1) : '—',
      reviewsCountText: item.rating_count ? `Số liệu tham khảo trong dữ liệu (${item.rating_count})` : 'Chưa có dữ liệu tổng hợp'
    };
    Object.entries(values).forEach(([id, value]) => text(id, value));

    const tags = $('detailTags');
    if (tags) {
      tags.replaceChildren(...(item.fields.length ? item.fields : ['Khoa học máy tính']).map(value => {
        const span = document.createElement('span');
        span.className = 'tag'; span.textContent = value;
        return span;
      }));
    }

    const overview = $('detailOverviewText');
    if (overview) overview.innerHTML = `<p>${escapeHtml(description)}</p>
      <p>Hội nghị được tổ chức tại <strong>${escapeHtml(item.location || 'địa điểm cập nhật')}</strong>, quy tụ các nhà khoa học, giảng viên và sinh viên nghiên cứu hàng đầu. Diễn đàn thảo luận về các công trình nghiên cứu tiên tiến, tạo cơ hội hợp tác và công bố quốc tế.</p>`;

    const deadlineInfo = $('infoDeadlines');
    if (deadlineInfo) deadlineInfo.innerHTML = item.milestones.length
      ? item.milestones.map(m => `<div class="detail-deadline-line"><strong>${escapeHtml(m.name)}:</strong> ${formatDate(m.date)} (AoE)</div>`).join('')
      : 'Chưa công bố';

    const website = $('webBtn');
    if (website) {
      const validUrl = /^https?:\/\//i.test(item.website);
      website.href = validUrl ? item.website : '#';
      website.classList.toggle('is-disabled', !validUrl);
      website.setAttribute('aria-disabled', String(!validUrl));
    }
    renderStars('headerStars', item.rating, 18);
    renderCountdown(item);
    renderTimeline(item);
  }

  function renderCountdown(item) {
    const next = getNextDeadline(item);
    const remaining = next && timeLeft(next.date);
    const google = $('btnCalGoogle');
    const ics = $('btnCalIcs');
    const available = Boolean(remaining && !remaining.passed);
    if (google) google.hidden = !available;
    if (ics) ics.hidden = !available;
    if (!next) {
      text('detailNextMilestoneName', 'Đang cập nhật mốc');
      text('detailCountdownDays', 'Chưa công bố');
      text('detailDeadlineExact', 'Ban tổ chức chưa công bố ngày cụ thể');
      text('heroLiveTickerText', 'Chưa có mốc thời gian');
    } else if (!available) {
      text('detailNextMilestoneName', 'Đã hết hạn nộp bài');
      text('detailCountdownDays', 'Đã đóng đợt nộp');
      text('detailDeadlineExact', 'Hội nghị đã hoàn thành nhận bài');
      text('heroLiveTickerText', 'Đã kết thúc nhận bài');
    } else {
      text('detailNextMilestoneName', next.name);
      text('detailDeadlineExact', `${formatDate(next.date)} (AoE 23:59)`);
    }
    if (google) google.onclick = available ? () => openCalendar(item, next) : null;
    if (ics) ics.onclick = available ? () => downloadIcs(`${item.id}-${next.key}.ics`, [calendarEvent(item, next)]) : null;
    const all = $('btnExportAllIcs');
    if (all) all.onclick = () => downloadIcs(`${item.id}-all-deadlines.ics`, item.milestones.map(m => calendarEvent(item, m)));
    updateClocks();
  }

  function renderTimeline(item) {
    const track = $('timelineTrack');
    if (!track) return;
    const next = getNextDeadline(item);
    const activeKey = next && !timeLeft(next.date)?.passed ? next.key : null;
    track.innerHTML = item.milestones.length ? item.milestones.map((event, index) => {
      const remaining = timeLeft(event.date);
      const passed = remaining?.passed;
      const active = event.key === activeKey;
      const className = passed ? 'step-passed' : active ? 'step-active' : 'step-upcoming';
      const status = passed ? `Đã qua (${formatDate(event.date)})` : `Còn ${remaining?.daysLeft ?? 0} ngày`;
      return `<div class="timeline-step ${className}">
        <div class="step-badge-num">${passed ? '✓' : index + 1}</div>
        <div class="step-name">${escapeHtml(event.name)}</div>
        <div class="step-date">${formatDate(event.date)} (AoE)</div>
        <div class="step-status-tag">${escapeHtml(status)}</div>
        ${active ? `<div class="live-clock" id="liveClock-${escapeHtml(event.key)}"></div>` : ''}
        ${!passed ? `<button type="button" class="step-cal-mini-btn" data-mkey="${escapeHtml(event.key)}" title="Thêm mốc này vào Google Calendar">+ Thêm vào lịch</button>` : ''}
      </div>`;
    }).join('') : '<p>Chưa có thông tin các mốc thời gian.</p>';

    // Event delegation: chỉ một listener cho toàn bộ nút trong timeline.
    track.onclick = event => {
      const button = event.target.closest('.step-cal-mini-btn');
      if (!button) return;
      const milestone = item.milestones.find(m => m.key === button.dataset.mkey);
      if (milestone) openCalendar(item, milestone);
    };
    updateClocks();
  }

  function updateClocks() {
    if (!conference) return;
    const next = getNextDeadline(conference);
    const remain = next && timeLeft(next.date);
    if (!remain || remain.passed) return;
    text('detailCountdownDays', `Còn ${Math.max(0, remain.daysLeft)} ngày`);
    text('heroLiveTickerText', `${remain.days} ngày ${remain.hours}h ${remain.minutes}m ${remain.seconds}s`);
    text(`liveClock-${next.key}`, `Đếm ngược: ${remain.days}d ${remain.hours}h ${remain.minutes}m ${remain.seconds}s`);
  }

  // ---------- Lưu hội nghị và đánh giá sao ----------
  function bookmarkKey() {
    const user = readJson('confguide_current_user', null);
    return user?.id ? `confguide_saved_${user.id}` : 'confguide_saved_guest';
  }

  function setupBookmark(item) {
    const button = $('saveBtn');
    if (!button) return;
    const key = bookmarkKey();
    const saved = () => {
      const value = readJson(key, []);
      return Array.isArray(value) ? value : [];
    };
    const paint = () => {
      const active = saved().includes(item.id);
      button.classList.toggle('on', active);
      button.setAttribute('aria-pressed', String(active));
      text('saveText', active ? 'Đã lưu hội nghị' : 'Lưu hội nghị này');
      button.querySelector('svg')?.setAttribute('fill', active ? 'var(--gold)' : 'none');
    };
    button.onclick = () => {
      const values = saved();
      const next = values.includes(item.id) ? values.filter(id => id !== item.id) : [...values, item.id];
      if (writeJson(key, next)) paint();
      else alert('Không thể lưu hội nghị. Vui lòng kiểm tra bộ nhớ trình duyệt.');
    };
    paint();
  }

  function starSvg(size, active = true) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${active ? 'var(--gold)' : 'none'}" stroke="var(--gold)" stroke-width="1.5" aria-hidden="true"><path d="${STAR_PATH}"/></svg>`;
  }

  function renderStars(id, rating, size) {
    const box = $(id);
    if (!box) return;
    box.innerHTML = rating ? Array.from({ length: 5 }, (_, i) => starSvg(size, i < Math.round(rating))).join('') : '';
  }

  function setupUserRating(item) {
    const box = $('stars');
    if (!box) return;
    const key = `confguide_rating_${item.id}`;
    let rating = Number(readJson(key, 0)) || 0;
    const paint = value => [...box.children].forEach((button, i) => button.classList.toggle('lit', i < value));
    box.replaceChildren();
    for (let i = 1; i <= 5; i++) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'star-btn';
      button.setAttribute('aria-label', `${i} sao`);
      button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${STAR_PATH}"/></svg><span>${i}</span>`;
      button.addEventListener('mouseenter', () => paint(i));
      button.addEventListener('focus', () => paint(i));
      button.addEventListener('click', () => {
        rating = rating === i ? 0 : i;
        writeJson(key, rating);
        paint(rating);
        text('rateMsg', rating ? `Bạn đã chấm ${rating}/5 sao. Cảm ơn bạn!` : '');
      });
      box.appendChild(button);
    }
    box.addEventListener('mouseleave', () => paint(rating));
    box.addEventListener('focusout', event => { if (!box.contains(event.relatedTarget)) paint(rating); });
    paint(rating);
    if (rating) text('rateMsg', `Bạn đã chấm ${rating}/5 sao.`);
  }

  // ---------- Hội nghị liên quan ----------
  function renderRelated(item) {
    const grid = $('relGrid');
    if (!grid) return;
    const currentFields = new Set(item.fields);
    const related = conferences.filter(conf => conf.id !== item.id)
      .sort((a, b) => b.fields.filter(field => currentFields.has(field)).length
        - a.fields.filter(field => currentFields.has(field)).length).slice(0, 3);
    grid.innerHTML = related.map(conf => {
      const next = getNextDeadline(conf);
      const remaining = next && timeLeft(next.date);
      const closed = remaining?.passed;
      const daysLabel = !remaining ? 'Sắp tới' : closed ? 'Đã đóng' : `Còn ${Math.max(0, remaining.daysLeft)}d`;
      const name = escapeHtml(conf.name);
      const url = `detail.html?id=${encodeURIComponent(conf.id)}`;
      return `<article class="rc" data-id="${escapeHtml(conf.id)}" tabindex="0" role="link" aria-label="Xem chi tiết hội nghị ${name}">
        <div class="thumb"><b>${name.replace(/ /, '<br>')}</b></div>
        <div class="body"><div class="rc-top"><h5 title="${name}">${name}</h5>
          <span class="days ${closed ? 'closed' : ''}">${daysLabel}</span></div>
          <div class="full" title="${escapeHtml(conf.fullName)}">${escapeHtml(conf.fullName)}</div>
          <div class="tg">${conf.fields.slice(0, 2).map(field => `<span title="${escapeHtml(field)}">${escapeHtml(field)}</span>`).join('')}</div>
          <div class="bottom"><a href="${url}" class="save-sm">Xem chi tiết &rarr;</a><span class="rank">${escapeHtml(conf.rank || 'A*')}</span></div>
        </div>
      </article>`;
    }).join('');
    grid.onclick = event => {
      if (event.target.closest('a')) return;
      const card = event.target.closest('.rc');
      if (card) location.href = `detail.html?id=${encodeURIComponent(card.dataset.id)}`;
    };
    grid.onkeydown = event => {
      const card = event.target.closest('.rc');
      if (card && event.target === card && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        location.href = `detail.html?id=${encodeURIComponent(card.dataset.id)}`;
      }
    };
  }

  // ---------- Trang nhận xét: điều hướng bằng #danh-gia ----------
  function reviewKey(item) { return `confguide_reviews_${item.id}`; }

  function renderReviews(item) {
    const list = $('rvList');
    if (!list) return;
    const saved = readJson(reviewKey(item), []);
    const reviews = Array.isArray(saved) ? saved : [];
    renderStars('rvStars', 5, 22);
    text('rvAvg', item.rating ? Number(item.rating).toFixed(1) : '—');
    text('rvTotal', `${reviews.length} nhận xét trên trình duyệt này`);
    text('rvBars', 'Điểm tham khảo từ dữ liệu hội nghị; nhận xét bên dưới chỉ lưu cục bộ.');
    list.innerHTML = reviews.length ? reviews.map(review => {
      const date = review.createdAt ? new Date(review.createdAt) : null;
      const created = date && !Number.isNaN(date.valueOf()) ? date.toLocaleString('vi-VN') : '';
      return `<article class="card rv-card">
        <strong>${escapeHtml(review.author || 'Người dùng ConfGuide')}</strong>
        <small>${escapeHtml(created)}</small><p>${escapeHtml(review.text)}</p>
      </article>`;
    }).join('') : '<p class="card rv-card">Chưa có nhận xét nào được lưu trên trình duyệt này. Bạn có thể gửi nhận xét đầu tiên.</p>';
  }

  function setupReviews(item) {
    const detail = $('viewDetail');
    const reviews = $('viewReviews');
    const back = $('backBtn');
    const open = $('openReviews');
    if (!detail || !reviews || !back || !open) return;
    const route = () => {
      const isReview = location.hash === '#danh-gia';
      detail.hidden = isReview;
      reviews.hidden = !isReview;
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', route);
    route(); // Hỗ trợ truy cập trực tiếp detail.html?id=...#danh-gia.

    const openReviews = () => { location.hash = '#danh-gia'; };
    open.addEventListener('click', openReviews);
    open.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault(); openReviews();
      }
    });
    $('backToDetailBtn')?.addEventListener('click', () => { location.hash = ''; });
    back.addEventListener('click', () => {
      if (location.hash === '#danh-gia') location.hash = '';
      else if (history.length > 1 && (document.referrer || history.state !== null)) history.back();
      else location.assign('search.html');
    });
    text('rvPageTitle', `Nhận xét hội nghị · ${item.name}`);
    renderReviews(item);

    $('reviewForm')?.addEventListener('submit', event => {
      event.preventDefault();
      const textarea = $('reviewText');
      const value = textarea?.value.trim();
      if (!value) { textarea?.focus(); return; }
      const user = window.ConfGuideLayout?.getCurrentUser?.() || readJson('confguide_current_user', null);
      const previous = readJson(reviewKey(item), []);
      const saved = Array.isArray(previous) ? previous : [];
      saved.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        author: user?.name || user?.fullName || user?.username || 'Người dùng ConfGuide',
        text: value, createdAt: new Date().toISOString()
      });
      if (writeJson(reviewKey(item), saved)) {
        textarea.value = '';
        text('reviewFormMessage', 'Đã lưu nhận xét trên trình duyệt này.');
        renderReviews(item);
      } else {
        text('reviewFormMessage', 'Không thể lưu nhận xét. Vui lòng kiểm tra bộ nhớ trình duyệt.');
      }
    });
  }

  // ---------- Khởi tạo ----------
  async function init() {
    const requestedId = (new URLSearchParams(location.search).get('id') || 'cvpr-2026').trim();
    const fallback = window.ConfGuideFallbackConferences || [];
    let data = fallback;
    try {
      const response = await fetch('data/conference_data.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const parsed = await response.json();
      if (Array.isArray(parsed) && parsed.length) data = parsed;
    } catch (_) {
      // file:// thường chặn fetch JSON, nên giữ dữ liệu dự phòng có sẵn.
      console.info('Không tải được conference_data.json; sử dụng dữ liệu dự phòng.');
    }
    conferences = data.filter(item => item && item.name).map(normalizeConference);
    conference = conferences.find(item => item.id === requestedId)
      || conferences.find(item => item.id.toLowerCase() === requestedId.toLowerCase())
      || conferences.find(item => slug(item.name) === slug(requestedId))
      || conferences[0];
    if (!conference) {
      text('detailDesc', 'Không có dữ liệu hội nghị. Hãy tải trang bằng máy chủ web hoặc kiểm tra file dữ liệu.');
      return;
    }
    renderOverview(conference);
    renderRelated(conference);
    setupBookmark(conference);
    setupUserRating(conference);
    setupReviews(conference);
    clockTimer = setInterval(updateClocks, 1000);
    window.addEventListener('pagehide', () => clearInterval(clockTimer), { once: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
