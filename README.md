# ConfGuide — Nền Tảng Tra Cứu & Khuyến Nghị Hội Nghị Khoa Học

> **Đồ án môn học IE104 — Thiết kế Giao diện Người dùng**  
> Trường Đại học Công nghệ Thông tin, Đại học Quốc gia TP. Hồ Chí Minh (UIT)

---

## 1. Giới thiệu Dự án
**ConfGuide** là website hỗ trợ sinh viên, giảng viên và các nhóm nghiên cứu tra cứu, đánh giá mức độ uy tín (CORE Ranking A*/A/B/C, Scopus, IEEE, ACM, Springer) và theo dõi chính xác các mốc thời hạn nộp bài (Call for Papers) của các hội nghị khoa học trong nước và quốc tế.

Giao diện được thiết kế theo tư duy **Mobile-First**, áp dụng triệt để quy tắc phân bổ màu **60:30:10**, tuân thủ tiêu chuẩn tiếp cận **WCAG AA** và tối ưu trải nghiệm tương tác với hệ thống Design Tokens nhất quán.

---

## 2. Sơ Đồ Cấu Trúc Thư Mục (Project Tree)

Thư mục dự án được tổ chức theo mô hình **Flat HTML Root**, phân tách rõ ràng giữa các trang giao diện (HTML), kiểu dáng (CSS), kịch bản tương tác (JS), hình ảnh vector (Images) và cơ sở dữ liệu (Data):

```text
confeguide/
│
├── index.html               # Trang chủ & Cổng điều hướng tìm kiếm (Search Gateway, 6 hội nghị sắp tới)
├── search.html              # Tra cứu nâng cao (Bộ lọc accordion, đồng bộ URL, chip tags xóa nhanh)
├── detail.html              # Chi tiết hội nghị theo ?id=<slug> (Specs, mốc deadline, đánh giá 5 sao)
├── chitiet.html             # Chuyển hướng tương thích ngược (Redirect sang detail.html)
├── tracker.html             # Theo dõi nộp bài (Quản lý tiến độ nộp bài báo cá nhân)
├── profile.html             # Hồ sơ nhà nghiên cứu (Hội nghị đã lưu theo tài khoản, đếm thống kê)
├── about.html               # Giới thiệu đề tài IE104, mục tiêu và đơn vị phát triển UIT
├── contact.html             # Liên hệ đóng góp thông tin hội nghị mới
├── login.html               # Đăng nhập tài khoản (hỗ trợ ?redirect=<url>)
├── register.html            # Đăng ký thành viên mới
├── AGENT.md                 # Tài liệu kiến trúc kỹ thuật dành cho AI Agents & Developers
├── README.md                # Hướng dẫn tổng quan và khởi chạy dự án
│
├── css/                     # Thư mục stylesheets
│   ├── base.css             # Design tokens 60:30:10, dark mode tokens, shared header (4 mục nav, toggle 40x40) & footer
│   ├── home.css             # Styles Landing page, hero, cards hội nghị
│   ├── search.css           # Styles trang tra cứu, accordion collapsible filters, active chips bar, toast
│   ├── detail.css           # Styles trang chi tiết hội nghị, back button, reviews subpage
│   ├── tracker.css          # Styles trang theo dõi nộp bài (bảng quản lý, modal thêm/sửa)
│   └── auth.css             # Styles trang đăng nhập & đăng ký
│
├── js/                      # Thư mục logic JavaScript thuần (Zero build step)
│   ├── layout.js            # Shared Layout: render header/footer động, đồng bộ dark theme, auth guard
│   ├── script.js            # Trang chủ: gateway search redirect, render max 6 hội nghị tiêu biểu
│   ├── app.js               # Trang tra cứu: lọc đa chiều, sync URL replaceState, active chips, bookmark
│   ├── detail.js            # Trang chi tiết: nạp dữ liệu theo ?id=slug, back thông minh, lưu hội nghị
│   ├── tracker.js           # Quản lý CRUD danh sách theo dõi nộp bài qua confguides
│   └── auth.js              # Xác thực mật khẩu SHA-256, nạp seed 20 tài khoản không trùng lặp
│
├── data/                    # Thư mục dữ liệu
│   ├── conference_data.json # Cơ sở dữ liệu 49 hội nghị khoa học chuẩn hóa với ID slug
│   └── users.json           # Danh sách 20 tài khoản thử nghiệm (Mã hóa SHA-256, schema chuẩn)
│
└── images/                  # Tài nguyên đồ họa SVG
    ├── logo.svg             # Logo thương hiệu ConfGuide
    ├── hero-bg.svg          # Nền minh họa skyline
    ├── cvpr.svg             # Icon biểu trưng CVPR
    ├── neurips.svg          # Icon biểu trưng NeurIPS
    ├── iclr.svg             # Icon biểu trưng ICLR
    └── acl.svg              # Icon biểu trưng ACL
```

---

## 3. Các Điểm Nâng Cấp Cốt Lõi

1. **Header & Footer Dùng Chung (`js/layout.js`, `css/base.css`)**:
   - Render động bằng template string không dùng `fetch()`, hoạt động trơn tru ngay cả khi mở bằng `file:///`.
   - Đúng **4 mục điều hướng** chuẩn: **Trang chủ** (`index.html`), **Tra cứu** (`search.html`), **Theo dõi nộp bài** (`tracker.html`), **Hồ sơ** (`profile.html`).
   - Nút đổi giao diện Sáng/Tối đồng bộ kích thước 40x40px, icon SVG và cùng vị trí trên mọi trang.
   - Quản lý trạng thái phiên đăng nhập: hiển thị avatar chữ cái đầu khi đã đăng nhập, hiển thị nút "Đăng nhập" khi chưa đăng nhập.
   - Cơ chế Auth Guard: tự động chuyển hướng sang `login.html?redirect=<trang>` khi truy cập `profile.html` hoặc `tracker.html` khi chưa đăng nhập.
2. **Cổng Điều Hướng Trang Chủ (Gateway Home)**:
   - Thanh tìm kiếm và các từ khóa gợi ý tại Hero chuyển hướng trực tiếp sang `search.html?q=<từ khóa>`.
   - Đã loại bỏ hoàn toàn section Pricing và view chi tiết trùng lặp inline.
   - Section danh mục sắp diễn ra chỉ hiển thị tối đa **6 hội nghị tương lai**, kèm nút chuyển sang `search.html` để xem toàn bộ.
3. **Trang Tra Cứu Nâng Cao (`search.html`)**:
   - Bộ lọc sidebar dạng Accordion có thể thu gọn/mở rộng: Rank (A*, A, B, C), Khu vực (Việt Nam, Quốc tế), Hình thức (Trực tiếp, Online, Hybrid), Lĩnh vực (động từ dữ liệu), Nhà xuất bản & Chỉ mục (IEEE, ACM, Springer, Scopus, DBLP), Trạng thái, Khoảng thời gian deadline.
   - Checkbox "Hiện cả hội nghị đã diễn ra" (mặc định tắt - ẩn các hội nghị trong quá khứ).
   - Đồng bộ 2 chiều với URL Query Parameters (`history.replaceState`) giúp copy/chia sẻ link tìm kiếm dễ dàng.
   - Thanh Active Filter Chips cho phép xóa từng điều kiện lọc hoặc xóa tất cả.
4. **Trang Chi Tiết Hội Nghị Chuẩn Hóa (`detail.html`)**:
   - Đọc dữ liệu động duy nhất từ `data/conference_data.json?id=<slug>`.
   - Tích hợp redirect tương thích ngược từ `chitiet.html`.
   - Nút quay lại thông minh (`history.back()` nếu đến từ trang nội bộ, ngược lại về `search.html`).
   - Lưu hội nghị vào danh sách quan tâm theo user cụ thể: `confguide_saved_${userId}`.
5. **Đổi Tên Nhật Ký → Theo Dõi Nộp Bài (`tracker.html`)**:
   - Đổi tên file chuẩn hóa: `tracker.html`, `css/tracker.css`, `js/tracker.js`.
   - Giữ nguyên khóa lưu trữ `confguides` để đảm bảo dữ liệu cũ không bị mất.

---

## 4. Hướng Dẫn Khởi Chạy

Dự án hoàn toàn tĩnh, không cần cài đặt Node.js hay build-step:

### Cách 1: Sử dụng Live Server trên Visual Studio Code (Khuyên dùng)
1. Mở thư mục `confeguide` bằng **Visual Studio Code**.
2. Nhấp chuột phải vào file `index.html` chọn **Open with Live Server**.
3. Trình duyệt mở tại `http://127.0.0.1:5500/index.html`.

### Cách 2: Mở trực tiếp trên Trình duyệt (file:///)
- Nhấp đúp chuột vào bất kỳ file `.html` nào (ví dụ: `index.html`).
- Mã nguồn đã tích hợp sẵn tập dữ liệu dự phòng `FALLBACK_CONFERENCES` và `SEED_USERS` để đảm bảo mọi chức năng hoạt động hoàn hảo ngay cả khi trình duyệt áp dụng chính sách hạn chế `file:///`.

---

## 5. Quản Lý Tài Khoản & 20 Tài Khoản Thử Nghiệm

- **Cơ chế băm mật khẩu**: Thuật toán **SHA-256** native (*Web Crypto API*), lưu trong `data/users.json` và `localStorage.confguide_users`.
- **Chống trùng lặp**: Seed không tạo trùng lặp hoặc ghi đè tài khoản.
- **Quyền mặc định**: Mọi tài khoản thử nghiệm có quyền `role: "user"`.

### Bảng Tra Cứu Tài Khoản Thử Nghiệm:

| Username | Email | Mật khẩu chính | Mật khẩu phụ | Quyền |
| :--- | :--- | :--- | :--- | :---: |
| `user1` | `user1@gmail.com` | `User1@2026` | `user1@` | `user` |
| `user2` | `user2@gmail.com` | `User2@2026` | `user2@` | `user` |
| `user3` | `user3@gmail.com` | `User3@2026` | `user3@` | `user` |
| ... | ... | ... | ... | ... |
| `user20` | `user20@gmail.com` | `User20@2026` | `user20@` | `user` |