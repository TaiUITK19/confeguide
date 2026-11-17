# Báo cáo Tối ưu Mã nguồn ConfGuide (`docs/optimize-report.md`)

Nhánh thực hiện: `chore/optimize-code` (từ baseline commit `1fca950` đến HEAD sau tối ưu).
Tài liệu nền trước tối ưu: [`docs/optimize-baseline.md`](../docs/optimize-baseline.md).

---

## 1. Tóm tắt Trước / Sau Tối ưu

### 1.1. Tổng quan Chỉ số Kỹ thuật

| Hạng mục | Trước tối ưu (`1fca950`) | Sau tối ưu (`56fe38f`) | Thay đổi |
|---|---|---|---|
| **CSS (11 tệp, chuẩn LF)** | `256,972 B` | `255,309 B` | **`-1,663 B`** (`-0.65%`) |
| **CSS trên đĩa working tree** | `264,609 B` | `262,875 B` | **`-1,734 B`** |
| **JS (12 tệp, chuẩn LF)** | `537,375 B` | `538,940 B` | `+1,565 B` *(thêm Promise cache `fetchJsonCached` + `bfcache` cleanup; `about.js -583 B`, `index.js -359 B`, `profile.js -322 B`, `calendar.js -231 B`)* |
| **Tổng CSS + JS (chuẩn LF)** | `794,347 B` | `794,249 B` | **`-98 B`** *(đồng thời giảm số request trùng)* |
| **Fetch `data/conferences.json` khi bật So sánh** | `2` request/trang *(page script + `compare.js`)* | **`1` request/trang** *(dùng chung `fetchJsonCached`)* | **`-50%` request JSON** trên `index`, `search`, `detail`, `tracker`, `profile` |
| **Khai báo `!important` không cần thiết trong CSS** | `7` chỗ (`base.css`, `about.css`, `tracker.css`) | **`0` chỗ** *(giữ nguyên `!important` cho `[hidden]`, `.is-hidden`, `prefers-reduced-motion`)* | **Loại bỏ 7/7** |
| **Lệnh `var` trong JS** | `0` | `0` | Sạch `ES6+` |
| **Lệnh `console.*` trong JS** | `2` (`console.info` ở `about.js`, `console.warn` ở `auth.js`) | **`0`** | **Loại bỏ 2/2** |
| **Heading Accessibility `tracker.html`** | `A11y = 98` (`jump_1_to_3`) | **`A11y = 100`** (`0` lỗi heading ở 11/11 trang) | **+2 điểm A11y** |
| **Dữ liệu `data/` (4 tệp)** | Nguyên gốc | **Khớp 100% SHA-256** | **0 byte thay đổi** |

> Ghi chú kỹ thuật về thống kê baseline: Trong `docs/optimize-baseline.md`, tổng JS từng ghi chú `527,048 B` trong tiêu đề nhưng tổng thực tế của 12 dòng trong bảng là `549,308 B` (do working tree Git có tệp dùng CRLF, tệp dùng LF). Bảng trên đối chiếu bằng chuẩn Git blob `LF` để phản ánh chính xác kích thước mã thực tế (`-1,663 B` CSS, `+1,565 B` JS, tổng ròng `-98 B`).

---

### 1.2. Bảng So sánh Dung lượng Chi tiết từng Tệp (chuẩn LF từ Git)

#### CSS (11 tệp)
| Tệp | Trước (`1fca950`) | Sau (`fc88b26`) | Chênh lệch | Ghi chú thay đổi |
|---|---:|---:|---:|---|
| [`css/base/base.css`](../css/base/base.css) | 52,057 B | 51,514 B | **-543 B** | Bỏ 4 `!important` thừa ở `.btn-header-login*`/`.btn-header-register`; xóa `.visually-hidden` (trùng `.sr-only`) và `.footer-chat-*` chết |
| [`css/base/transition.css`](../css/base/transition.css) | 9,033 B | 9,033 B | 0 B | Giữ nguyên hiệu ứng View Transitions |
| [`css/components/calendar.css`](../css/components/calendar.css) | 18,547 B | 18,547 B | 0 B | Không có rule chết chắc chắn |
| [`css/components/compare.css`](../css/components/compare.css) | 19,837 B | 19,837 B | 0 B | Không có rule chết chắc chắn |
| [`css/pages/about.css`](../css/pages/about.css) | 19,539 B | 19,517 B | **-22 B** | Bỏ 2 `!important` thừa ở `.btn-github`, `.btn-propose` |
| [`css/pages/auth.css`](../css/pages/auth.css) | 11,266 B | 11,266 B | 0 B | Giữ nguyên (suspect liệt kê ở Mục 3) |
| [`css/pages/detail.css`](../css/pages/detail.css) | 30,285 B | 30,285 B | 0 B | Đang dùng toàn bộ |
| [`css/pages/index.css`](../css/pages/index.css) | 22,627 B | 22,627 B | 0 B | Giữ nguyên `.hero-slider__dot::before` (xem Mục 3) |
| [`css/pages/profile.css`](../css/pages/profile.css) | 15,979 B | 15,979 B | 0 B | Giữ nguyên suspect liệt kê ở Mục 3 |
| [`css/pages/search.css`](../css/pages/search.css) | 48,499 B | 48,196 B | **-303 B** | Xóa các selector alias chết (`.search-combobox__item-main`, `.accordion-head__selected`, `.active-chips-bar*`, `.accordion-panel*`) |
| [`css/pages/tracker.css`](../css/pages/tracker.css) | 9,303 B | 8,508 B | **-795 B** | Thay `!important` bằng `.tracker-table td.tracker-empty { padding: 35px; }`; xóa `.logo-badge*`, `.tracker-modal-form*`, `.form-actions` chết |

#### JavaScript (12 tệp)
| Tệp | Trước (`1fca950`) | Sau (`56fe38f`) | Chênh lệch | Ghi chú thay đổi |
|---|---:|---:|---:|---|
| [`js/components/calendar.js`](../js/components/calendar.js) | 46,390 B | 46,159 B | **-231 B** | Thu gọn wrapper `escapeHtml` tái sử dụng `ConfGuideUtils` |
| [`js/components/compare.js`](../js/components/compare.js) | 41,647 B | 41,718 B | +71 B | Tái sử dụng `ConfGuideUtils.fetchJsonCached('data/conferences.json')` |
| [`js/components/search-core.js`](../js/components/search-core.js) | 27,982 B | 28,225 B | +243 B | `escapeHtml` ưu tiên dùng `ConfGuideUtils.escapeHtml` |
| [`js/core/layout.js`](../js/core/layout.js) | 93,989 B | 95,743 B | +1,754 B | Thêm `fetchJsonCached(url)` (Map Promise cache có tự xóa khi lỗi) và `getSavedStorageKey()` |
| [`js/core/page-transition.js`](../js/core/page-transition.js) | 16,073 B | 16,073 B | 0 B | Giữ nguyên đồng bộ ở `<head>` cho `@view-transition` (`pagereveal`) |
| [`js/pages/about.js`](../js/pages/about.js) | 32,846 B | 32,263 B | **-583 B** | Bỏ `console.info`, dùng `fetchJsonCached('data/about.json')`, thu gọn helper |
| [`js/pages/auth.js`](../js/pages/auth.js) | 31,288 B | 31,301 B | +13 B | Bỏ `console.warn` ở fallback hash |
| [`js/pages/detail.js`](../js/pages/detail.js) | 50,697 B | 51,195 B | +498 B | Dùng `fetchJsonCached`, `getSavedStorageKey`, thêm cleanup `pagehide`/`pageshow` cho `countdownTimer` |
| [`js/pages/index.js`](../js/pages/index.js) | 43,389 B | 43,030 B | **-359 B** | Dùng `fetchJsonCached`, `getSavedStorageKey`, `utils.slugify`, thu gọn storage wrapper |
| [`js/pages/profile.js`](../js/pages/profile.js) | 39,215 B | 38,893 B | **-322 B** | Dùng `fetchJsonCached`, event delegation `#savedConferencesList`, thu gọn helper |
| [`js/pages/search.js`](../js/pages/search.js) | 105,920 B | 105,969 B | +49 B | Dùng `fetchJsonCached`, `getSavedStorageKey`, `<template>` batch DOM parse trong `renderConferenceList()`, `{ passive: true }` cho `window.resize` |
| [`js/pages/tracker.js`](../js/pages/tracker.js) | 7,939 B | 8,371 B | +432 B | Dùng `fetchJsonCached`, `getSavedStorageKey`, chuyển listener `[data-remove]` sang event delegation trên `#conferenceBody` |

---

### 1.3. Bảng So sánh Lighthouse (11 trang × Mobile & Desktop)

> Đo bằng **Lighthouse v13.6.0** trên HTTP server tĩnh cục bộ trước tối ưu (`1fca950`) và sau commit mã nguồn cuối cùng (`56fe38f`). Riêng `profile.html` có Auth Guard chuyển hướng sang `login.html` trong phiên không đăng nhập; DOM/Requests/Screenshots/Computed Style và luồng tương tác của `profile.html` được kiểm chứng trực tiếp qua CDP với phiên `user1`.

| Trang | Mobile (Perf/A11y/BP/SEO) Trước → Sau | Mobile (LCP / CLS / TBT) Trước → Sau | Desktop (Perf/A11y/BP/SEO) Trước → Sau | Desktop (LCP / CLS / TBT) Trước → Sau |
|---|---|---|---|---|
| `index.html` | 90/100/100/100 → **90/100/100/100** | 2859ms / 0.0119 / 0ms → 2913ms / 0.0119 / 0ms | 79/100/100/100 → **79/100/100/100** | 606ms / 0.477 / 0ms → 585ms / 0.477 / 0ms |
| `search.html` | 78/100/100/100 → **85/100/100/100** | 4187ms / 0 / 19ms → **3358ms** / 0 / **11ms** | 99/100/100/100 → **100/100/100/100** | 706ms / 0.0002 / 0ms → **665ms** / 0.0002 / 0ms |
| `detail.html?id=enase-2027` | 63/100/100/100 → **74/100/100/100** | 3381ms / 0.6829 / 0ms → **2123ms** / 0.6829 / 8ms | 86/100/100/100 → **86/100/100/100** | 706ms / 0.2698 / 0ms → 704ms / 0.2698 / 0ms |
| `tracker.html` | 93/98/100/100 → **99/100/100/100** | 2557ms / 0.0147 / 0ms → **1655ms** / 0.0241 / 0ms | 100/98/100/100 → **100/100/100/100** | 527ms / 0.0139 / 0ms → 623ms / 0.0182 / 0ms |
| `profile.html` | 77/100/100/100 → **81/100/100/100** | 4662ms / 0 / 15ms → 4667ms / 0 / 26ms | 98/100/100/100 → **98/100/100/100** | 937ms / 0 / 0ms → 981ms / 0 / 0ms |
| `about.html` | 72/100/100/100 → **70/100/100/100** *(nhiễu ±2đ)* | 2405ms / 0.633 / 0ms → 2601ms / 0.6823 / 0ms | 86/100/100/100 → **86/100/100/100** | 526ms / 0.2768 / 0ms → 551ms / 0.2768 / 0ms |
| `contact.html` | 98/100/100/100 → **98/100/100/100** | 1953ms / 0 / 0ms → **1844ms** / 0 / 0ms | 100/100/100/100 → **100/100/100/100** | 445ms / 0 / 0ms → 456ms / 0 / 0ms |
| `login.html` | 96/100/100/100 → **100/100/100/100** | 2256ms / 0 / 0ms → **1507ms** / 0 / 0ms | 100/100/100/100 → **100/100/100/100** | 483ms / 0 / 0ms → **391ms** / 0 / 0ms |
| `register.html` | 96/100/100/100 → **98/100/100/100** | 2254ms / 0 / 0ms → 2255ms / 0 / 41ms | 100/100/100/100 → **100/100/100/100** | 483ms / 0 / 0ms → **387ms** / 0 / 0ms |
| `terms.html` | 98/100/100/100 → **97/100/100/100** | 1956ms / 0 / 0ms → 2055ms / 0 / 0ms | 100/100/100/100 → **100/100/100/100** | 405ms / 0 / 0ms → 468ms / 0 / 0ms |
| `privacy.html` | 98/100/100/100 → **97/100/100/100** | 1960ms / 0 / 0ms → 2053ms / 0 / 0ms | 100/100/100/100 → **100/100/100/100** | 448ms / 0 / 0ms → 459ms / 0 / 0ms |

---

## 2. Danh sách Mọi Thay đổi Đã thực hiện (theo Từng nhóm Commit)

### Nhóm A — CSS (`fc88b26`: `refactor(css): remove dead rules and unnecessary !important declarations`)
1. Xóa rule trùng/chết chắc chắn 100% (0 xuất hiện trong toàn bộ HTML, JS và `data/`):
   - `.visually-hidden` trong `css/base/base.css` (trùng hoàn toàn `.sr-only`).
   - `.footer-chat-link`, `.footer-chat-status`, `.footer-chat-status--error` trong `css/base/base.css`.
   - `.logo-badge`, `.logo-badge.red`, `.logo-badge.yellow`, `.tracker-modal-form*`, `.form-actions` trong `css/pages/tracker.css`.
   - `.search-combobox__item-main`, `.accordion-head__selected`, `.active-chips-bar*`, `.accordion-panel`, `.accordion-panel__inner` trong `css/pages/search.css`.
2. Gỡ 7 `!important` không cần thiết bằng độ đặc hiệu (specificity) chuẩn, giữ nguyên 100% giá trị hiển thị:
   - `.btn-header-login`, `.btn-header-login:hover`, `.btn-header-login.active`, `.btn-header-register` (`css/base/base.css`).
   - `.btn-github`, `.btn-propose` (`css/pages/about.css`).
   - `.tracker-table td.tracker-empty { padding: 35px; }` giữ nguyên chỉ override `padding` như lúc trước (`css/pages/tracker.css`).

### Nhóm B — JavaScript (`f4d13a7` & `56fe38f`)
1. **Cache Promise `fetchJsonCached(url)`** trong `js/core/layout.js` (`window.ConfGuideUtils`): chia sẻ 1 request mạng duy nhất khi nhiều module cùng đọc `data/conferences.json` (`compare.js` + `index.js` / `search.js` / `detail.js` / `tracker.js` / `profile.js`) và `data/about.json` (`about.js`), kèm tự xóa cache khi lỗi để thao tác thử lại vẫn hoạt động bình thường.
2. **Event Delegation & dọn vòng đời timer**:
   - `js/pages/tracker.js`: chuyển sự kiện click `[data-remove]` từ gắn lại từng hàng trong `render()` sang 1 listener ủy quyền trên `#conferenceBody` trong `initTracker()`.
   - `js/pages/profile.js`: chuyển `.js-remove-saved-btn` sang 1 listener ủy quyền trên `#savedConferencesList`.
   - `js/pages/detail.js`: dọn `countdownTimer` trên sự kiện `pagehide` và khôi phục lại qua `pageshow` (`event.persisted`) khi duyệt bfcache.
3. **Tối ưu phân tích DOM & Passive Listener**:
   - `js/pages/search.js`: trong `renderConferenceList()`, thay vòng lặp tạo N `document.createElement('div')` + N `.innerHTML` bằng 1 `<template>` gộp theo batch kết hợp `DocumentFragment`.
   - `js/pages/search.js`: gắn `{ passive: true }` cho `window.addEventListener('resize', ...)`.
4. **Hợp nhất helper & dọn Console**:
   - Xóa `console.info` (`js/pages/about.js`) và `console.warn` (`js/pages/auth.js`) → `0` `console.*` trong toàn bộ JS.
   - Đưa `getSavedStorageKey()` và `getCurrentUser()` lên `ConfGuideUtils`; thu gọn các wrapper lặp lại `escapeHtml`, `readStorage`, `writeStorage`, `fallbackSlugify` trong `about.js`, `profile.js`, `index.js`, `search.js`, `calendar.js`, `search-core.js`.

### Nhóm C — HTML (`fc92e96`: `perf(html): fix tracker heading hierarchy and defer page scripts`)
1. `tracker.html`: thêm `<h2 class="sr-only">Danh sách hội nghị đang theo dõi</h2>` trong `<section class="content-card">`, xử lý triệt để lỗi nhảy cấp heading `<h1> -> <h3>` (`headingIssues: ["jump_1_to_3"] -> []`), đưa điểm Accessibility từ `98` lên **`100`**.
2. Cả 11 tệp `.html`: thêm thuộc tính `defer` vào toàn bộ `<script>` cuối `<body>` (`layout.js`, `compare.js`, `search-core.js`, `calendar.js`, và các `[page].js`) giúp trình duyệt tải song song sớm hơn (giúp Mobile LCP của `search.html`, `detail.html`, `tracker.html`, `login.html` giảm `750ms–1250ms`), trong khi giữ nguyên `<script src="js/core/page-transition.js"></script>` đồng bộ ở `<head>` để bảo toàn View Transitions.

### Nhóm D — Hình ảnh & Tài nguyên tĩnh
- `images/logo.svg` (`575 B`): đã gọn nhẹ chuẩn vector SVG, giữ nguyên.
- Kiểm tra toàn bộ 11 HTML (0 thẻ `<img>` tĩnh thiếu `alt`) và toàn bộ HTML chuỗi trong JS (`js/core/layout.js:1043,1046`, `js/pages/profile.js:174,183`): tất cả thẻ `<img>` avatar động đều đã khai báo đầy đủ `alt`, `width`, `height`.

---

## 3. Danh sách Rule/Code "Nghi ngờ thừa" chưa xóa (Báo cáo để Cân nhắc) & Phát hiện Sẵn có

1. **CSS nghi ngờ chưa sử dụng (giữ nguyên do có khả năng gắn động hoặc di sản giao diện cũ):**
   - `css/pages/profile.css`: `.stat-icon-blue`, `.stat-icon-navy`, `.section-card-header-actions`, `.saved-search-toolbar`, `.saved-search-input-wrap`, `.saved-search-icon`, `.saved-search-input`, `.saved-list-wrapper`, `.status-draft`, `.status-review`, `.status-accepted`.
   - `css/pages/index.css`: `.conf-toolbar`, `.results-status`, `.results-status strong`; rule `.hero-slider__dot::before` (animation `width: 9px -> 28px` được giữ nguyên vì đổi sang `transform: scaleX()` sẽ làm méo bo tròn viên thuốc ở 2 đầu).
   - `css/pages/auth.css`: `.auth-header*`, `.signup-link`, `.requirements-title`, `.terms-field*`.
   - `css/base/base.css`: `.contact-field__control--textarea` (`contact.html` hiện dùng `<textarea class="contact-field__control" rows="5">`).
2. **Code JS legacy không còn DOM mục tiêu trên `profile.html` hiện tại (giữ nguyên có kiểm tra bảo vệ `if (el)`):**
   - `js/pages/profile.js`: `initSavedSection()` / `renderSavedConferences()` (`#savedConferencesList`) và `renderTrackerPreview()` (`#trackerPreviewContainer`) — trang `profile.html` hiện đã thay thế bằng `#profileCalendarRoot`.
3. **Phát hiện sẵn có (không sửa để bảo toàn 100% pixel baseline):**
   - Header khi **chưa đăng nhập** trên Mobile hẹp `375px` & `430px`: `.header-actions` đạt `446px` (đã ghi nhận từ baseline; không thay đổi CSS header để bảo toàn pixel).
   - `CLS` cao trên `index.html` Desktop (`0.477`), `detail.html` (`0.6829` Mobile / `0.2698` Desktop) và `about.html` (`0.6823` Mobile / `0.2768` Desktop): phát sinh do dữ liệu JSON bất đồng bộ lấp vào DOM và ẩn banner loading; không can thiệp `min-height` cố định vì có thể làm lệch pixel giữa các viewport.

---

## 4. Kết quả Kiểm chứng Sau Commit Cuối (`56fe38f`)

- **Kiểm tra dữ liệu `data/` (SHA-256 không đổi từng byte):**
  - `data/about.json` (`7,973 B`): `580b99aa8e7b2142f0d51e15d91996153571af7a4496b7f752a9137c6aec39d4`
  - `data/conferences.json` (`65,129 B`): `7525871562c0d49c4f0e78b5a5c15932ceae46a29b659e9910ab1fccf524f935`
  - `data/scrape-conferences.py` (`14,234 B`): `db728e42be96c74f4eafebfa18f1b0bc58b6ca97ed1d830ca5167d9d3fd30c96`
  - `data/users.json` (`5,418 B`): `1ad847d87b57a8f2cbc0237627392ff80728ad2cb86cf25fc77ab48a57359125`
- **Kiểm tra cú pháp & W3C / CSSOM:**
  - `node --check` trên 12/12 tệp JS: pass 100%.
  - Trình phân tích HTML5 cục bộ (`StrictHTMLChecker` Python `html.parser`) trên 11/11 tệp HTML: `OK` 11/11, `0` lỗi trùng ID, `0` CSS inline, `0` event inline, `0` lỗi cấp độ heading.
  - Chrome CSSOM trên cả 11 trang (bao gồm `profile.html` đã đăng nhập): toàn bộ 11 tệp CSS nạp đủ CSS rules, `0` console error/warning/404. *(Lưu ý: dịch vụ W3C validator trực tuyến `validator.w3.org/nu/` và `jigsaw.w3.org` trả `HTTP 403` Cloudflare trong môi trường CLI nên được kiểm tra thay thế bằng Chrome CSSOM + HTMLParser cục bộ).*
- **Đối chiếu 66 ảnh chụp màn hình (`11` trang × `3` kích thước × `Sáng/Tối`) & Computed Styles:**
  - `Computed style diffs: 0` (toàn bộ token OKLCH, màu nền, chữ, kích thước, bán kính bo góc, bóng đổ khớp 100%).
  - `Viewport overflow/size diffs: 0` tại `1280×860`, `768×1024`, `390×844` (trạng thái `user1`).
  - `59 / 66` ảnh PNG trùng khít từng pixel ngoài thanh cuộn; `7` ảnh còn lại chỉ khác tại đồng hồ đếm ngược thời gian thực ở `detail.html` (`1595–1602px`, `y=550..729`) và 1 khung `49×49px` ở `search.html__tablet__dark.png` (đã xuất hiện từ lúc chạy trước khi tối ưu).
- **Kiểm tra luồng tương tác & View Transitions:**
  - `verify_flows.mjs`: xác nhận `data/conferences.json` chỉ gọi **1 lần/trang** ngay cả khi bật So sánh; nút So sánh & đóng hộp thoại bằng `Escape`; lọc `?q=AI` (`25` kết quả), xóa lọc về `41`, tìm chuỗi không tồn tại hiện Empty State; chi tiết hội nghị chạy đếm ngược; xóa mục trên `tracker.html` bằng event delegation (`2 -> 1`); lịch `profile.html` & modal chỉnh sửa; modal đề xuất trên `about.html`; `0` console errors, `0` console warnings, `0` request lỗi.
  - `verify_transitions.mjs`: xác nhận `@view-transition`, `site-nav` & `site-footer` giữ cố định, trượt hướng nav, thanh tìm kiếm biến hình `index.html <-> search.html`, `prefers-reduced-motion` tắt chuyển động an toàn, chế độ fallback Firefox & `file:///` hoạt động trơn tru, `0` console error / page exception.

---

## 5. Khuyến nghị Nhỏ cho Bước Tiếp theo (Nếu Chủ dự án muốn Mở rộng Sau)

1. Xem xét thu gọn `.header-actions` trên màn hình Mobile `< 440px` khi chưa đăng nhập (hiện bị tràn ngang `446px`) nếu được phép điều chỉnh bố cục header.
2. Cân nhắc dành chiều cao khung giữ chỗ (`min-height`) cho phần tải động ở `detail.html` và `about.html` nếu muốn tối ưu điểm `CLS` lên > `95` (sẽ làm thay đổi chiều cao khung khi chưa tải xong nên không thực hiện trong đợt tối ưu bất biến giao diện này).
3. Rà soát và quyết định xóa hẳn các rule/hàm legacy đã liệt kê ở Mục 3 nếu xác nhận không cần tái sử dụng.
