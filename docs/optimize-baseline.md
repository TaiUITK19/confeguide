# Đường cơ sở Tối ưu Mã nguồn ConfGuide (`docs/optimize-baseline.md`)

Tài liệu ghi nhận đầy đủ các chỉ số trước khi tối ưu trên nhánh `chore/optimize-code` (chưa chỉnh sửa bất kỳ mã nguồn nào).

---

## 1. Bảng chỉ số Lighthouse & Tài nguyên theo từng trang (11 trang)

> Ghi chú phương pháp đo:
> - **Lighthouse CLI (v13.6.0)** chạy trên server HTTP tĩnh cục bộ ở 2 cấu hình: **Mobile** (mặc định mô phỏng 4G chậm + CPU ×4) và **Desktop** (`--preset=desktop`). Riêng `profile.html` trong Lighthouse không có phiên `confguide_current_user` nên trình duyệt thực thi Auth Guard chuyển hướng sang `login.html` khi đo Lighthouse; số DOM/Requests/Screenshots/Computed Style của `profile.html` được thu thập qua CDP sau khi nạp sẵn phiên người dùng mẫu `user1`.
> - **W3C Validator trực tuyến** (`validator.w3.org/nu/`, `jigsaw.w3.org`): đều trả về `HTTP 403` do cổng chặn Cloudflare trong môi trường CLI; sử dụng bộ kiểm tra cục bộ HTML5 (`HTMLParser` + DOM audit trên Chrome 157) và Chrome CSSOM thay thế bổ trợ.

| Trang | Mobile (Perf / A11y / BP / SEO) | Mobile LCP / CLS / TBT | Desktop (Perf / A11y / BP / SEO) | Desktop LCP / CLS / TBT | DOM Nodes | Requests | Console Err/Warn | Lưu ý DOM / Heading |
|---|---|---|---|---|---|---|---|---|
| `index.html` | 90 / 100 / 100 / 100 | 2859ms / 0.0119 / 0ms | 79 / 100 / 100 / 100 | 606ms / 0.477 / 0ms | 698 | 10 | 0 / 0 | CLS desktop cao (0.477) |
| `search.html` | 78 / 100 / 100 / 100 | 4187ms / 0 / 19ms | 99 / 100 / 100 / 100 | 706ms / 0.0002 / 0ms | 1030 | 11 | 0 / 0 | LCP mobile chậm (4.19s) |
| `detail.html?id=enase-2027` | 63 / 100 / 100 / 100 | 3381ms / 0.6829 / 0ms | 86 / 100 / 100 / 100 | 706ms / 0.2698 / 0ms | 702 | 10 | 0 / 0 | `<h2 id="errorStateTitle">` ẩn đứng trước `<h1>` trong DOM; CLS cao |
| `tracker.html` | 93 / 98 / 100 / 100 | 2557ms / 0.0147 / 0ms | 100 / 98 / 100 / 100 | 527ms / 0.0139 / 0ms | 343 | 10 | 0 / 0 | `heading-order`: nhảy từ `<h1>` xuống footer `<h3>` |
| `profile.html` *(auth)* | 77 / 100 / 100 / 100 | 4662ms / 0 / 15ms | 98 / 100 / 100 / 100 | 937ms / 0 / 0ms | 448 | 12 | 0 / 0 | Đo CDP với phiên `user1`; LH đo qua redirect guard |
| `about.html` | 72 / 100 / 100 / 100 | 2405ms / 0.633 / 0ms | 86 / 100 / 100 / 100 | 526ms / 0.2768 / 0ms | 580 | 8 | 0 / 0 | CLS cao (0.633 mobile / 0.2768 desktop) |
| `contact.html` | 98 / 100 / 100 / 100 | 1953ms / 0 / 0ms | 100 / 100 / 100 / 100 | 445ms / 0 / 0ms | 326 | 5 | 0 / 0 | Sạch |
| `login.html` | 96 / 100 / 100 / 100 | 2256ms / 0 / 0ms | 100 / 100 / 100 / 100 | 483ms / 0 / 0ms | 237 | 8 | 0 / 0 | Sạch |
| `register.html` | 96 / 100 / 100 / 100 | 2254ms / 0 / 0ms | 100 / 100 / 100 / 100 | 483ms / 0 / 0ms | 261 | 8 | 0 / 0 | Sạch |
| `terms.html` | 98 / 100 / 100 / 100 | 1956ms / 0 / 0ms | 100 / 100 / 100 / 100 | 405ms / 0 / 0ms | 311 | 5 | 0 / 0 | Sạch |
| `privacy.html` | 98 / 100 / 100 / 100 | 1960ms / 0 / 0ms | 100 / 100 / 100 / 100 | 448ms / 0 / 0ms | 319 | 5 | 0 / 0 | Sạch |

- **Kiểm tra tràn ngang (`scrollWidth > clientWidth`) tại 1280×860, 768×1024, 390×844 (Sáng & Tối):** `0` lỗi ở cả 66 ảnh chụp (`opt_shots_before/`).
- **Computed Styles & Ảnh Baseline:** Toàn bộ 66 ảnh chụp PNG và file JSON đối chiếu computed style đã được lưu trong thư mục scratch `opt_shots_before/` và `opt_cdp_before.json`.
- **Lỗi inline style / inline event / `id` trùng / `<img>` thiếu `alt`:** `0` trên toàn bộ 11 trang HTML.

---

## 2. Dung lượng Tệp CSS & JS trước khi Tối ưu

### CSS (Tổng: `264,609` bytes — 11 tệp)
| Tệp | Dung lượng (bytes) |
|---|---|
| `css/base/base.css` | 54,340 |
| `css/base/transition.css` | 9,033 |
| `css/components/calendar.css` | 19,421 |
| `css/components/compare.css` | 20,722 |
| `css/pages/about.css` | 20,508 |
| `css/pages/auth.css` | 11,438 |
| `css/pages/detail.css` | 30,285 |
| `css/pages/index.css` | 23,772 |
| `css/pages/profile.css` | 16,788 |
| `css/pages/search.css` | 48,499 |
| `css/pages/tracker.css` | 9,802 |

### JavaScript (Tổng: `527,048` bytes — 12 tệp)
| Tệp | Dung lượng (bytes) |
|---|---|
| `js/components/calendar.js` | 47,541 |
| `js/components/compare.js` | 42,791 |
| `js/components/search-core.js` | 28,725 |
| `js/core/layout.js` | 96,139 |
| `js/core/page-transition.js` | 16,073 |
| `js/pages/about.js` | 33,605 |
| `js/pages/auth.js` | 31,987 |
| `js/pages/detail.js` | 50,697 |
| `js/pages/index.js` | 44,489 |
| `js/pages/profile.js` | 40,258 |
| `js/pages/search.js` | 108,859 |
| `js/pages/tracker.js` | 8,144 |

---

## 3. Checksum Dữ liệu `data/` trước khi Tối ưu (SHA-256)

| Tệp | Dung lượng | SHA-256 |
|---|---|---|
| `data/about.json` | 7,973 B | `580b99aa8e7b2142f0d51e15d91996153571af7a4496b7f752a9137c6aec39d4` |
| `data/conferences.json` | 65,129 B | `7525871562c0d49c4f0e78b5a5c15932ceae46a29b659e9910ab1fccf524f935` |
| `data/scrape-conferences.py` | 14,234 B | `db728e42be96c74f4eafebfa18f1b0bc58b6ca97ed1d830ca5167d9d3fd30c96` |
| `data/users.json` | 5,418 B | `1ad847d87b57a8f2cbc0237627392ff80728ad2cb86cf25fc77ab48a57359125` |
