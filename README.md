# ConfGuide

> *Find the Right Place for Your Research*

**ConfGuide** là nền tảng tra cứu, khuyến nghị và theo dõi hạn nộp bài của các hội nghị khoa học Công nghệ thông tin, trong nước lẫn quốc tế. Đây là đồ án môn **Internet và Công nghệ Web (IE104)** tại Trường Đại học Công nghệ Thông tin – ĐHQG TP.HCM (UIT).

Dự án là ứng dụng web phía client thuần HTML5, CSS3, JavaScript ES6+: không backend, không framework, không công cụ build. Dữ liệu hội nghị và tài khoản mẫu lưu trong các tệp JSON tĩnh, được cập nhật định kỳ mỗi tuần.

## Thông tin đồ án

- **Đề tài:** Xây dựng website tra cứu hội nghị khoa học Công nghệ thông tin tại Việt Nam
- **Giảng viên hướng dẫn:** ThS. Võ Tấn Khoa (Khoa Khoa học và Kỹ thuật Thông tin)
- **Nhóm:** Nhóm 8

| STT | Họ và tên | MSSV |
|---:|---|---|
| 1 | Nguyễn Tài | `24521549` |
| 2 | Lê Hữu Thắng | `24521602` |
| 3 | Dương Nhất Tâm | `24521566` |
| 4 | Nguyễn Chí Nhân | `24521232` |
| 5 | Nguyễn Nhã Quân | `24521445` |

## Liên kết

| Hạng mục | Liên kết |
|---|---|
| GitHub Repository | https://github.com/TaiUITK19/confeguide |
| Thiết kế WireFrame (Figma) | https://www.figma.com/design/a2ZLyVXPvP5sXTakX8wpsz/PH%C3%81C-TH%E1%BA%A2O-WEBSITE--WIREFRAME-?node-id=0-1&p=f&t=dSkuelfiHBfnbRG9-0 |
| Thiết kế Mockup (Figma) | https://www.figma.com/design/xlKRpfoX2h1dAG6VTCYkUG/CHI-TI%E1%BA%BET-WEBSITE--MOCKUP-?node-id=0-1&p=f&t=bGOGpP2EWcuceVl5-0 |

## Bài toán

Người nghiên cứu tại Việt Nam thường gặp ba khó khăn khi tìm nơi công bố công trình:

- **Thông tin phân tán:** Call for Papers của các hội nghị trong nước và quốc tế nằm rải rác trên nhiều website, diễn đàn khác nhau.
- **Khó đối chiếu phân hạng:** CORE (`A*`, `A`, `B`, `C`) và Scopus chưa được tổng hợp thống nhất.
- **Lệch múi giờ hạn nộp:** Hạn nộp thường theo AoE (`UTC-12`) hoặc múi giờ địa phương, dễ nhầm khi quy sang giờ Việt Nam (`UTC+7`).

ConfGuide tập hợp thông tin các hội nghị khoa học CNTT trong nước lẫn quốc tế vào một nơi, hướng tới sinh viên, học viên cao học, nghiên cứu sinh, giảng viên và các nhóm nghiên cứu CNTT.

## Tính năng chính

- **Tìm kiếm & lọc nâng cao:** Tìm tức thì, gợi ý sửa chính tả (Damerau-Levenshtein), 7 nhóm bộ lọc (hạn nộp, lĩnh vực, phạm vi Việt Nam / Quốc tế, địa điểm, thời gian, hình thức, phân hạng), 10 kiểu sắp xếp, phân trang và đồng bộ bộ lọc với URL.
- **Chi tiết hội nghị:** Timeline các mốc thời hạn tự động quy đổi `AoE → UTC+7`, đồng hồ đếm ngược, thông tin học thuật, xuất lịch sang Google Calendar hoặc tệp `.ics`.
- **Theo dõi & so sánh:** Lưu hội nghị theo tài khoản, xem hạn nộp gần nhất; so sánh cạnh nhau tối đa 3 hội nghị.
- **Hồ sơ cá nhân & lịch:** Chọn lĩnh vực nghiên cứu, cập nhật ảnh đại diện, lịch tháng hiển thị hạn nộp và ngày diễn ra hội nghị đã lưu.
- **Tài khoản:** Đăng ký / đăng nhập (băm mật khẩu SHA-256 bằng Web Crypto API), gợi ý hội nghị cá nhân hóa theo lĩnh vực.
- **Trải nghiệm:** Light / Dark Mode, bố cục responsive (desktop, tablet, mobile), hiệu ứng chuyển trang mượt bằng View Transitions.

## Công nghệ & ràng buộc

- **Công nghệ:** HTML5 ngữ nghĩa, CSS3 (Custom Properties, OKLCH, Flexbox, Grid), JavaScript ES6+ (Fetch, Web Crypto, Web Animations, LocalStorage / SessionStorage, Canvas 2D).
- **Ràng buộc:** Không dùng thư viện hay framework ngoài (Bootstrap, Tailwind, React, jQuery, GSAP...), không template dựng sẵn, không bước build.
- **Chất lượng:** Đã kiểm chứng Lighthouse Accessibility, Best Practices và SEO đạt `100` ở đợt đo trên hệ thống trang gốc (trước khi tinh gọn `404.html`); mã nguồn giữ Console sạch `0` lỗi và cảnh báo.

## Cấu trúc thư mục

```text
confeguide/
├── *.html              # 10 trang: index, search, detail, tracker, profile,
│                       # about, contact, login, register, 404
├── css/
│   ├── base/           # Design tokens, layout dùng chung, chuyển trang
│   ├── components/     # Lịch, so sánh hội nghị
│   └── pages/          # Stylesheet riêng của từng trang
├── js/
│   ├── core/           # Header/Footer, theme, phiên đăng nhập, chuyển trang
│   ├── components/     # Lõi tìm kiếm, so sánh, lịch
│   └── pages/          # Logic riêng của từng trang
├── data/               # conference_data.json, users.json, about.json
├── images/             # logo.svg, ảnh nền trang đăng nhập / đăng ký
└── AGENT.md            # Quy ước kỹ thuật chi tiết của dự án (tài liệu cục bộ)
```

- **Quy ước:** Tên tệp chữ thường `kebab-case` (ngoại lệ `conference_data.json`); mỗi trang theo mẫu `<trang>.html` ↔ `css/pages/<trang>.css` ↔ `js/pages/<trang>.js` (trang không có CSS/JS riêng như `contact.html`, `404.html` không tạo tệp rỗng; `login.html` và `register.html` dùng chung `auth.*`); CSS đặt tên theo BEM; comment mã nguồn bằng tiếng Việt. Chi tiết xem tại `AGENT.md`.

## Cài đặt và chạy

```bash
git clone https://github.com/TaiUITK19/confeguide.git
cd confeguide
```

Khuyến nghị chạy qua máy chủ HTTP tĩnh để `fetch()` nạp trực tiếp dữ liệu JSON (mở qua `file:///` vẫn chạy được nhờ dữ liệu dự phòng tĩnh nhúng sẵn):

- **VS Code Live Server:** Chuột phải [`index.html`](index.html) → **Open with Live Server**.
- **Python:**

```bash
python -m http.server 8000
```

Sau đó mở `http://localhost:8000/`.

- **Triển khai:** GitHub Pages (`Settings → Pages → Deploy from a branch → main / / (root)`) hoặc Netlify (`Publish directory = .`), không cần build command.

## Định hướng phát triển

- Giao diện Liquid Glass (phong cách iOS 26).
- Khuyến nghị hội nghị bằng AI dựa trên Abstract bài báo.
- Đồng bộ hạn nộp sang Google / Outlook Calendar và gửi thông báo đẩy.

## Lời cảm ơn và nguồn dữ liệu

Nhóm xin cảm ơn **ThS. Võ Tấn Khoa** đã hướng dẫn và góp ý xuyên suốt đồ án. Dữ liệu học thuật tham khảo từ **CORE**, **DBLP**, **WikiCFP**, **Scopus** và website chính thức của từng hội nghị.
