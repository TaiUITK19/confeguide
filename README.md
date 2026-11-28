# ConfGuide

> *Find the Right Place for Your Research*

**ConfGuide** là nền tảng tra cứu, khuyến nghị và theo dõi hạn nộp bài của các hội nghị khoa học Công nghệ thông tin, trong nước lẫn quốc tế. Đây là đồ án môn **Internet và Công nghệ Web (IE104)** tại Trường Đại học Công nghệ Thông tin – ĐHQG TP.HCM (UIT).

Dự án được xây dựng theo chuẩn web thuần phía client (**HTML5, CSS3, JavaScript ES6+**) không dùng framework hay bundler, kết hợp thêm một **backend nhỏ (Node.js + Express)** để xác thực Google Sign-In, tra cứu hồ sơ nghiên cứu công khai (SerpApi Google Scholar / ORCID / Semantic Scholar), ánh xạ và đồng bộ lĩnh vực nghiên cứu theo email (vẫn giữ cơ chế fallback `localStorage` để chạy tĩnh độc lập).

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
- **Chi tiết hội nghị:** Timeline trượt ngang toàn bộ mốc thời hạn tự động quy đổi `AoE → UTC+7` căn giữa mốc đang chọn, đồng hồ đếm ngược, thông tin học thuật, xuất lịch sang Google Calendar hoặc tệp `.ics`.
- **Theo dõi & so sánh:** Lưu hội nghị theo tài khoản, xem hạn nộp gần nhất; so sánh cạnh nhau tối đa 3 hội nghị.
- **Hồ sơ cá nhân & lịch:** Chọn lĩnh vực nghiên cứu, cập nhật ảnh đại diện, lịch tháng hiển thị hạn nộp và ngày diễn ra hội nghị đã lưu.
- **Trợ lý AI (chatbox):** Hỏi đáp về hội nghị và cách dùng website, tự lọc danh sách theo yêu cầu, gợi ý hội nghị phù hợp từ abstract bài báo (Google Gemini). Xem mục [Trợ lý AI (Chatbox)](#trợ-lý-ai-chatbox).
- **Tài khoản:** Đăng ký / đăng nhập (băm mật khẩu SHA-256 bằng Web Crypto API), gợi ý hội nghị cá nhân hóa theo lĩnh vực.
- **Trải nghiệm:** Light / Dark Mode, bố cục responsive (desktop, tablet, mobile), hiệu ứng chuyển trang mượt bằng View Transitions.

## Công nghệ & ràng buộc

- **Công nghệ Frontend:** HTML5 ngữ nghĩa, CSS3 (Custom Properties, OKLCH, Flexbox, Grid), JavaScript ES6+ (Fetch, Web Crypto, Web Animations, LocalStorage / SessionStorage, Canvas 2D), không dùng framework hay thư viện UI ngoài.
- **Công nghệ Backend & Triển khai:** Node.js (`24.x`), Express (`express`, `cors`, `dotenv`, `google-auth-library`), hàm serverless Vercel (`api/index.js`); trợ lý AI gọi Google Gemini qua API tương thích OpenAI bằng `fetch` có sẵn của Node.js (không thêm thư viện).
- **Chất lượng:** Đã kiểm chứng Lighthouse Accessibility, Best Practices và SEO đạt `100` ở đợt đo trên hệ thống trang gốc (trước khi tinh gọn `404.html`); mã nguồn giữ Console sạch `0` lỗi và cảnh báo.

## Cấu trúc thư mục

```text
confeguide/
├── frontend/
│   ├── *.html                  # 10 trang: index, search, detail, tracker, profile,
│   │                           # about, contact, login, register, 404
│   ├── assets/
│   │   ├── css/
│   │   │   ├── base/           # Design tokens, layout dùng chung, chuyển trang
│   │   │   ├── components/     # Lịch, so sánh hội nghị
│   │   │   └── pages/          # Stylesheet riêng của từng trang
│   │   ├── js/
│   │   │   ├── core/           # Header/Footer, theme, phiên đăng nhập, chuyển trang
│   │   │   ├── components/     # Lõi tìm kiếm, so sánh, lịch
│   │   │   ├── services/       # google-auth.js (kết nối Google Identity Services & backend)
│   │   │   └── pages/          # Logic riêng của từng trang
│   │   └── images/             # logo.svg, ben-cang-nha-rong.jpg
│   └── data/                   # conference_data.json, users.json, about.json
├── api/
│   └── index.js                # Entrypoint Vercel Serverless chuyển tiếp vào backend/server.js
├── backend/
│   ├── server.js               # Khởi tạo Express app, CORS, rate limit, routes, static & listen
│   ├── config/                 # env.js (đọc và kiểm tra biến môi trường một lần)
│   ├── routes/                 # auth.js, fields.js, scholar.js, chat.js, recommend.js (nhận request, validate input)
│   ├── services/               # scholar.js, orcid.js, semanticScholar.js, fieldMap.js, fieldsStore.js,
│   │                           # aiClient.js, conferenceCatalog.js, chatAssistant.js, conferenceRecommender.js (trợ lý AI)
│   ├── utils/                  # cache.js, http.js, jsonStore.js, rateLimit.js, errorHandler.js
│   ├── data/                   # Dữ liệu runtime (fields.json, serpapi-usage.json - nằm trong .gitignore)
│   └── .env.example            # Mẫu biến môi trường cho backend
├── package.json                # Dependencies và script start / dev tại thư mục gốc
├── vercel.json                 # Cấu hình outputDirectory frontend, rewrite route API, chặn thư mục nội bộ, maxDuration 60s
└── AGENT.md                    # Quy ước kỹ thuật chi tiết của dự án (tài liệu cục bộ)
```

- **Quy ước:** Frontend dùng chữ thường `kebab-case` (ngoại lệ `conference_data.json`), bộ ba `frontend/<trang>.html` ↔ `frontend/assets/css/pages/<trang>.css` ↔ `frontend/assets/js/pages/<trang>.js` (`contact.html`, `404.html` không tạo tệp rỗng; `login.html` và `register.html` dùng chung `auth.*`); CSS theo BEM; Backend dùng `camelCase` cho module dịch vụ/tiện ích (`fieldMap.js`, `fieldsStore.js`, `semanticScholar.js`, `jsonStore.js`, `rateLimit.js`, `errorHandler.js`); comment mã nguồn bằng tiếng Việt. Chi tiết xem tại [AGENT.md](AGENT.md).

## Cài đặt và chạy

```bash
git clone https://github.com/TaiUITK19/confeguide.git
cd confeguide
```

### Cách 1: Chạy đầy đủ Frontend + Backend (Khuyến nghị, yêu cầu Node.js 24.x)

```bash
npm install
```

Tạo tệp `backend/.env` từ [`backend/.env.example`](backend/.env.example) (điền `PORT`, `FRONTEND_ORIGIN`, `GOOGLE_CLIENT_ID`, và tùy chọn `SERPAPI_API_KEY`, `SEMANTIC_SCHOLAR_API_KEY`, `GEMINI_API_KEY` cho trợ lý AI), sau đó khởi chạy từ thư mục gốc:

```bash
# Chạy ổn định
npm start

# Hoặc chạy chế độ phát triển tự khởi động lại khi sửa code
npm run dev
```

Mở trình duyệt tại `http://localhost:3000/`.

### Cách 2: Chạy giao diện tĩnh (không bật backend, tự fallback `localStorage`)

- **VS Code Live Server:** Chuột phải [`frontend/index.html`](frontend/index.html) → **Open with Live Server** (khuyến nghị mở workspace ở `frontend/` để URL ở gốc `/`).
- **Python:**

```bash
python -m http.server 8000 --directory frontend
```

Sau đó mở `http://localhost:8000/`.

- **Triển khai:** Hỗ trợ Vercel (tự nhận `package.json`, `vercel.json` với `outputDirectory: "frontend"` và `api/index.js`) hoặc GitHub Pages / Netlify ở chế độ tĩnh (`Publish directory = frontend`). Ở chế độ tĩnh không có backend nên trợ lý AI không hoạt động, chatbox chỉ còn bộ lọc theo từ khóa.

## Trợ lý AI (Chatbox)

Chatbox nổi ở góc phải trang **Tra cứu** ([`frontend/search.html`](frontend/search.html)). Mọi câu hỏi được gửi tới backend, backend gọi mô hình ngôn ngữ kèm toàn bộ dữ liệu trong [`frontend/data/conference_data.json`](frontend/data/conference_data.json), nên AI chỉ trả lời và gợi ý dựa trên các hội nghị có trong ConfGuide.

### Chatbox làm được gì

| Người dùng nhập | Trợ lý phản hồi |
|---|---|
| Câu hỏi về hội nghị (hạn nộp, phân hạng, địa điểm, lệ phí, so sánh...) | Câu trả lời kèm liên kết tới trang chi tiết các hội nghị được nhắc tới |
| Yêu cầu tìm hội nghị (VD: *"hội nghị bảo mật quốc tế rank A trở lên"*) | Câu trả lời và **tự áp bộ lọc** lĩnh vực / phân hạng / phạm vi / hình thức lên danh sách bên trái |
| Câu hỏi cách dùng website (lưu, theo dõi, so sánh, xuất lịch...) | Hướng dẫn theo các trang thực tế của ConfGuide |
| Abstract bài báo (văn bản từ 180 ký tự hoặc 25 từ trở lên) | Tối đa 5 hội nghị phù hợp nhất kèm % phù hợp, lý do và từ khóa của bài |
| Câu hỏi ngoài phạm vi (không liên quan nghiên cứu / hội nghị / website) | Từ chối lịch sự |

- Trợ lý nhớ 10 tin nhắn gần nhất nên có thể hỏi nối tiếp (VD: *"trong số đó cái nào rank cao nhất?"*).
- Lịch sử trò chuyện lưu trong `sessionStorage` (giữ khi tải lại trang, mất khi đóng tab); nút 🗑 trên đầu khung chat để xóa.
- Khi AI không khả dụng (backend chưa chạy, thiếu khóa, hết lượt miễn phí), chatbox tự chuyển về bộ lọc theo từ khóa ([`frontend/assets/js/components/intent-parser.js`](frontend/assets/js/components/intent-parser.js)).
- Câu trả lời do AI tạo nên vẫn có thể sai sót; người dùng nên kiểm tra lại trên trang chi tiết hội nghị.

### Cấu hình khóa AI

1. Lấy khóa Google Gemini miễn phí tại https://aistudio.google.com/apikey.
2. Điền vào `backend/.env` (tệp này nằm trong `.gitignore`, **không commit và không dán khóa vào mã nguồn, README hay tin nhắn**):

```env
GEMINI_API_KEY=your-gemini-api-key
```

3. Khởi động lại backend (`npm start`). Nếu thiếu khóa, terminal in cảnh báo `[Cảnh báo cấu hình] ... chatbox AI sẽ không hoạt động`.

| Biến môi trường | Bắt buộc | Mặc định | Ý nghĩa |
|---|---|---|---|
| `GEMINI_API_KEY` | Có (để dùng AI) | (trống) | Khóa Google Gemini |
| `GEMINI_MODEL` | Không | `gemini-3.5-flash,gemini-3.5-flash-lite` | Các model Gemini, thử lần lượt khi model trước quá tải hoặc trả sai định dạng |

- Muốn trả lời nhanh hơn (khoảng 3-5 giây thay vì 10-30 giây) có thể đặt `GEMINI_MODEL=gemini-3.5-flash-lite,gemini-3.5-flash`, đổi lại câu trả lời dài và kém chọn lọc hơn.
- **Triển khai Vercel:** thêm `GEMINI_API_KEY` tại *Project → Settings → Environment Variables* (chọn Production và Preview) rồi **Redeploy**. [`vercel.json`](vercel.json) đã đặt `maxDuration: 60` cho hàm API; backend tự dừng mọi lần gọi AI trong 55 giây.

### API backend

| Endpoint | Body gửi lên | Kết quả trả về | Giới hạn |
|---|---|---|---|
| `POST /api/chat` | `{ "messages": [{ "role": "user" \| "assistant", "content": "..." }] }` (tin cuối là của người dùng) | `{ ok, model, reply, conferences: [{ name }], filters: { topics, ranks, scopes, modes } \| null }` | 10 lượt/phút/IP; tối đa 10 tin, mỗi tin 5.000 ký tự |
| `POST /api/recommend` | `{ "abstract": "..." }` (80 - 5.000 ký tự) | `{ ok, model, researchArea, keywords, recommendations: [{ name, fullName, rank, score, reason }] }` | 5 lượt/phút/IP |

Thử nhanh bằng `curl` khi backend đang chạy:

```bash
curl -X POST http://localhost:3000/api/chat -H "Content-Type: application/json" -d "{\"messages\":[{\"role\":\"user\",\"content\":\"Hội nghị nào sắp hết hạn nộp bài?\"}]}"
```

Mã lỗi thường gặp: `AI_NOT_CONFIGURED` (503, thiếu hoặc sai khóa), `AI_RATE_LIMITED` (429, hết lượt miễn phí), `AI_TIMEOUT` (504), `AI_BAD_RESPONSE` / `AI_UPSTREAM_ERROR` (502), `INVALID_MESSAGES`, `ABSTRACT_TOO_SHORT`, `ABSTRACT_TOO_LONG` (400).

### Cách hoạt động

```text
search.js (chatbox) ──► POST /api/chat hoặc /api/recommend
                          │  routes/chat.js, routes/recommend.js: kiểm tra input, rate limit
                          ▼
        services/chatAssistant.js / conferenceRecommender.js: dựng prompt
        (hướng dẫn website + danh mục hội nghị đánh số từ services/conferenceCatalog.js)
                          ▼
        services/aiClient.js ──► Google Gemini (JSON mode, giảm "thinking", tự dự phòng model)
                          ▼
        Kiểm tra JSON: chỉ giữ số thứ tự hội nghị có thật và giá trị bộ lọc hợp lệ
                          ▼
search.js: hiển thị câu trả lời (dựng DOM bằng textContent, không dùng innerHTML), liên kết chi tiết, áp bộ lọc
```

- Khóa API chỉ nằm ở backend, trình duyệt không bao giờ nhận được khóa.
- AI chỉ được chọn hội nghị theo số thứ tự trong danh mục; backend loại bỏ số không tồn tại nên AI không thể bịa thêm hội nghị ngoài dữ liệu.
- Mỗi lần gọi gửi kèm danh mục khoảng 20.000 token. Khi cập nhật `frontend/data/conference_data.json`, trợ lý tự dùng dữ liệu mới sau khi khởi động lại backend (hoặc deploy lại).

### Khắc phục sự cố

| Thông báo trong chatbox | Nguyên nhân & cách xử lý |
|---|---|
| *Không kết nối được tới máy chủ ConfGuide* | Backend chưa chạy. Mở terminal riêng và chạy `npm start`; nếu dùng Live Server (cổng 5500) thì backend vẫn phải chạy ở cổng 3000. |
| *Máy chủ chưa cấu hình GEMINI_API_KEY...* / *GEMINI_API_KEY không hợp lệ* | Chưa điền hoặc điền sai `GEMINI_API_KEY` trong `backend/.env` (hoặc trên Vercel), sau đó khởi động lại / Redeploy. |
| *Gemini đang quá tải hoặc đã hết lượt miễn phí* | Đã chạm hạn mức gói miễn phí; đợi vài phút hoặc sang ngày hôm sau. |
| *Mô hình AI trả kết quả không đúng định dạng* | Model trả lời lỗi ở mọi lần thử; gửi lại câu hỏi. |
| *Bạn hỏi hơi nhanh rồi...* | Vượt giới hạn 10 câu hỏi/phút (hoặc 5 abstract/phút) của backend. |

## Định hướng phát triển

- Giao diện Liquid Glass (phong cách iOS 26).
- Mở rộng chatbox AI ra toàn bộ các trang và cá nhân hóa theo lĩnh vực nghiên cứu đã lưu.
- Đồng bộ hạn nộp sang Google / Outlook Calendar và gửi thông báo đẩy.

## Lời cảm ơn và nguồn dữ liệu

Nhóm xin cảm ơn **ThS. Võ Tấn Khoa** đã hướng dẫn và góp ý xuyên suốt đồ án. Dữ liệu học thuật tham khảo từ **CORE**, **DBLP**, **WikiCFP**, **Scopus** và website chính thức của từng hội nghị.
