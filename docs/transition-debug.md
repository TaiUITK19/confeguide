# Báo cáo Chẩn đoán Lỗi Nav Mờ & Chuyển trang (`docs/transition-debug.md`)

Thực hiện trên nhánh `fix/nav-transition` trước khi chỉnh sửa mã nguồn chuyển trang.

---

## 1. Xác định Cơ chế Phát hiện & Thực thi Hiện tại (Mục 2a)

- **Trình duyệt kiểm thử:** Chrome Headless `157.0.0.0` (Windows x64), kết hợp giả lập Firefox (`CSSViewTransitionRule = undefined`) và kiểm tra trực tiếp giao thức `file:///`.
- **Cơ chế đang chạy trên Chrome:** Cross-Document View Transitions thông qua `@view-transition { navigation: auto; }` khai báo toàn cục cho tất cả 11 trang trong [`css/base/transition.css`](../css/base/transition.css#L13-L15) và [`js/core/page-transition.js`](../js/core/page-transition.js#L40-L44).
- **Lỗi trong cách phát hiện hỗ trợ hiện tại:**
  - `page-transition.js` (dòng 34–44) dùng `typeof document.startViewTransition === 'function'` làm điều kiện tiền đề cho `hasCrossDocViewTransition`.
  - Theo bảng tương thích MDN/CanIUse, `document.startViewTransition` là API cho **Same-Document (SPA)** View Transitions (đã hỗ trợ rộng cả Firefox mới hơn), **không đồng nghĩa** với **Cross-Document (MPA)** `@view-transition` + `PageRevealEvent` (Chrome/Edge 126+, Safari 18.2+; Firefox hiện chưa bật mặc định).
  - Kiểm tra thực tế trong Chrome 157: `'PageRevealEvent' in window === true`, `'PageSwapEvent' in window === true`, `CSS.supports('at-rule(@view-transition)') === true`, `CSS.supports('selector(:active-view-transition-type(foo))') === true`. Cần đổi điều kiện phát hiện sang `'PageRevealEvent' in window || CSS.supports('at-rule(@view-transition)')` (kèm `'onpageswap' in window && 'onpagereveal' in window`), bỏ phụ thuộc `document.startViewTransition`.

---

## 2. Cấu trúc Cây `::view-transition` Khi Tạm Dừng Chuyển Trang (Mục 2b)

Kiểm thử bằng Chrome DevTools Protocol `Animation.setPlaybackRate(0.02)` khi bấm điều hướng `index.html → about.html`:

- Cây pseudo-element đang tạo ra:
  - `::view-transition-group(root)` (`z-index: 1`, `animation: none`)
  - `::view-transition-group(page-main)` (`z-index: 10`, animation `-ua-view-transition-group-anim-page-main`)
  - `::view-transition-group(site-footer)` (`z-index: 15`, `animation: none`)
  - `::view-transition-group(site-nav)` (`z-index: 20`, `animation: none`) — có cả hai pseudo `::view-transition-old(site-nav)` (`opacity: 0; display: block`) và `::view-transition-new(site-nav)` (`opacity: 1; display: block`), nằm trong `::view-transition-image-pair(site-nav)` với `isolation` mặc định (`isolate`).
  - `::view-transition-group(search-bar)` (`z-index: 30` khi có `.search-box`).

---

## 3. Đối chiếu 8 Nguyên nhân Thường gặp (Mục 2c) & Bằng chứng

| STT | Giả thuyết | Kết quả | Bằng chứng đo trực tiếp |
|---|---|---|---|
| 1 | `view-transition-name` / kích thước nav khác trang | **Đúng một phần (với trang Auth)** | `transition.css` dòng 28–31 gán `view-transition-name: site-nav` cho cả `.site-header` (`72px`) lẫn `.auth-header` (`76px` trên `login.html`/`register.html` vốn không có nav chính). |
| 2 | `site-nav` còn cặp `old/new` & thiếu `isolation: auto` | **Đúng** | `::view-transition-old(site-nav)` mới chỉ đặt `opacity: 0` (chưa `display: none`), và chưa khai báo `::view-transition-image-pair(site-nav) { isolation: auto; }`. |
| 3 | Tổ tiên của nav có `opacity`/`filter`/`will-change`/`transform` | **Không (ở nhánh cũ)** | Tổ tiên của `.site-header` không có `transform`/`opacity`/`filter`. Chỉ `<main>` nhận animation. |
| 4 | Keyframes dùng `filter: blur()` hoặc fade vùng chứa nav | **Không (nhưng có lỗi footer & `page-main`)** | Keyframes không dùng `filter: blur()`. Tuy nhiên `::view-transition-group(site-footer)` bị cố định ở `z-index: 15` (`> 10` của `page-main`): khi đi từ trang dài sang trang ngắn (`index.html → tracker.html`), footer mới **nổi ngang giữa màn hình chém đôi `page-main` cũ** (`mid_index_to_tracker.png`). |
| 5 | **Snapshot tĩnh làm mất `backdrop-filter` trên nav kính mờ** | **ĐÚNG — NGUYÊN NHÂN CHÍNH** | `.site-header` dùng nền bán trong suốt `--glass-header-bg` (`85%`) + `backdrop-filter: blur(14px)`. Khi bình thường cuộn trang (`y=0` vs `y=320` trên `search.html`), `91,564 px` (`99.35%`) trong vùng nav đổi theo nền được làm mờ. Khi chuyển trang với `view-transition-name: site-nav`, Chrome tách `.site-header` thành bitmap tĩnh `::view-transition-new(site-nav)`: `backdrop-filter: blur(14px)` không nhìn thấy `::view-transition-old(page-main)` bên dưới nên **mất làm mờ kính**. Đo `y=0..72` giữa lúc chuyển trang (khi trang cũ đang cuộn `scrollY=260..300`) so với bình thường: sai khác **`73,986 px` (`80.28%`, `maxDelta = 9`) ở Light Mode** và **`74,200 px` (`80.51%`, `maxDelta = 19`) ở Dark Mode** — chữ/khung trang cũ xuyên thẳng qua nền 85% mà không được làm mờ. |
| 6 | Active state / kích thước nav nhảy | **Chỉ ở Auth (`72px ↔ 76px`)** | 9 trang chính cùng markup/chiều cao `72px` từ `js/core/layout.js`; riêng `.auth-header` cao `76px`. |
| 7 | Sai `z-index` / thứ tự lớp / lỗi JS khác gây nhấp nháy | **Đúng ở 3 điểm bổ sung** | (a) `page-transition.js` dòng 189 & 246 dùng `setTimeout(520/550)` xóa class `.vt-forward` **trước khi transition kết thúc** ở máy chậm (xác nhận `rootClassNow: ""` trong lúc `activeAnims` đang chạy, làm nhảy animation sang `vtFadeSlideIn`); (b) Trong HTML, `<script src="js/core/layout.js" defer>` làm ở khung sơn đầu tiên trên nhánh fallback (`t=190ms`), `#site-header` bị rỗng (`hdr: false`); (c) Nhánh fallback `html.is-leaving main` dùng `--vt-ease-out` nên opacity tụt về `0.35` chỉ sau `30ms` và mất hẳn trước `120ms`. |
| 8 | Bị kẹt `is-leaving` khi Back/Forward (bfcache) | **Đã có `pageshow` nhưng chưa đồng bộ WAAPI & `prerendering`** | Nhánh fallback cần hủy `Animation` WAAPI nếu bfcache khôi phục và chờ `prerenderingchange` nếu trang được `prerender`. |

### Ảnh Chẩn đoán Lưu tham chiếu (tại thư mục scratch `vt_diag_before/`)
- `normal_about_top_light.png` vs `mid_vt_about_light.png`: minh họa rõ chữ & khung Hero của `index.html` bị lộ xuyên unblurred phía sau nav trong lúc chuyển.
- `mid_index_to_tracker.png`: minh họa `::view-transition-group(site-footer)` (`z-index: 15`) nổi đè giữa `page-main`.

---

## 4. Đo Hiệu năng Trước Khi Sửa (Performance Panel — CPU Throttle 4×)

Kịch bản đo: đang đứng tại `index.html` đã tải xong → bật CPU 4× → bấm link điều hướng sang `search.html`:

| Chỉ số (`index.html → search.html`, CPU 4×) | Giá trị Trước sửa |
|---|---:|
| Thời gian từ lúc bấm tới khi trang mới ổn định | `1,225 ms` |
| Số Long Task (> 50ms) | `0` (`max = 0 ms`) |
| Số lần Layout / Tổng thời gian Layout | `12` lần / `79 ms` |
| Số lần Paint / Tổng thời gian Paint | `30` lần / `91 ms` |
| Số khung DrawFrame ghi nhận | `74` |

---

## 5. Kết luận Phương án Sửa (Chọn Phương án B + Giữ A cho cặp Tìm kiếm)

Do **Nguyên nhân 5 đã được chứng minh bằng pixel (`80.28%–80.51%` vùng nav bị mất blur khi có nội dung cuộn phía sau `site-nav` snapshot)** nên Phương án A thuần túy vẫn khiến nav mất `backdrop-filter` sống khi cuộn trang. Do đó áp dụng **Phương án B (Mục 3B)**:

1. **Chỉ `index.html` và `search.html`** khai báo `@view-transition { navigation: auto; types: search-morph; }` (nên Cross-Document View Transitions và morph `.search-box` chỉ chạy đúng cho cặp `index.html ↔ search.html`), kèm toàn bộ quy tắc Phương án A (`display: none` cho `old(site-nav)`, `isolation: auto`, `animation: none` cho `site-nav`) và bỏ `site-footer` khỏi snapshot tách rời.
2. **Tất cả các cặp điều hướng khác** (và trên Firefox/`file:///`) hoàn toàn không đưa nav vào snapshot: `.site-header` luôn là DOM sống với `backdrop-filter: blur(14px)` nguyên vẹn 100%, chỉ `main` chạy exit ngắn bằng **Web Animations API (`130ms`, ease-in, `translate3d` + `opacity`)** và enter bằng **CSS `@keyframes` (`270ms`, `cubic-bezier(0.22, 1, 0.36, 1)`)**.
3. Khắc phục đồng bộ các điểm ở Mục 3C: chuyển `<script src="js/core/layout.js" defer blocking="render"></script>` lên `<head>` (sau `page-transition.js`) để `#site-header`/`#site-footer` luôn có mặt trước `pagereveal`/lần sơn đầu tiên (`hdrReady: true` 12/12); dùng **Speculation Rules runtime** trong `page-transition.js` (`prerender` mức `moderate` cho `.main-nav a[href]`, `prefetch` mức `conservative` cho liên kết nội bộ an toàn, không dùng `<link rel="prefetch">` tĩnh để tránh nghẽn băng thông 4G ban đầu) kèm hỗ trợ `document.prerendering` / `prerenderingchange`; tạm dừng CSS animation vô hạn trong lúc chuyển trang; dọn class chuyển hướng theo `event.viewTransition.finished` (thay cho `setTimeout` cố định) và bắt `AbortError` sạch sẽ; xử lý `pageshow` (`bfcache`) / `pagehide`.

## 6. Đối chiếu Sau Sửa (Trên commit cuối cùng của nhánh `fix/nav-transition`)

- **Pixel thanh điều hướng (`verify_nav_fix.mjs`)**:
  - Trước sửa (`y=260/300` cuộn xuống → `about.html`): Light Mode lệch `73.986 px` (`80,28%`, `maxDelta = 9`), Dark Mode lệch `74.200 px` (`80,51%`, `maxDelta = 19`).
  - Sau sửa: **`0 px` sai lệch** trên toàn bộ `12/12` cặp điều hướng (`index`, `search`, `tracker`, `about` hai chiều, `hdrReady = true` 12/12) và **`0 px` sai lệch** trên cặp có cuộn `index.html → search.html` (VT-SearchMorph) ở cả Light Mode lẫn Dark Mode; trên nhánh WAAPI, `.site-header` giữ nguyên `opacity: 1` và `backdropFilter: blur(14px)` sống.
- **Hiệu năng chuyển trang (CPU 4x throttling)**:
  - `index.html → search.html` (VT-SearchMorph): tổng thời gian đo `1.014 ms` (giảm `211 ms` so với `1.225 ms` trước sửa), `0` long tasks, `20` layout (`54 ms`, giảm `31,6%` so với `79 ms`), `56` paints (`122 ms`), `70` draw frames.
  - `index.html → about.html` (WAAPI): tổng thời gian `1.040 ms`, `0` long tasks, `4` layout (`46 ms`).
- **Kiểm tra hồi quy & tương thích**:
  - `prefers-reduced-motion: reduce`, Firefox fallback mô phỏng (`cap=false`, giữ `?q=SOICT` và focus `#searchInput`), giao thức `file:///`, Back/Forward (`bfcache`), double-click nhanh đều vượt qua với `0` lỗi console / `0` warning / `0` ngoại lệ / `0` 404.
  - `baseline_cdp.mjs` / `compare_cdp.mjs`: `0` sai lệch computed style trên cả 11 trang, `0` sai lệch overflow, `55/66` ảnh PNG khớp tuyệt đối từng byte.
  - Toàn bộ file trong `data/` giữ nguyên SHA-256 từng byte.
