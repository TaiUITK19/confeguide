# ConfeGuide – Website tra cứu hội nghị khoa học

> Đồ án môn Internet và công nghệ web (IE104)  
> Trường Đại học Công nghệ Thông tin – ĐHQG TP.HCM (UIT)

## 1. Giới thiệu

**ConfeGuide** là dự án **xây dựng website tra cứu hội nghị khoa học trong nước thuộc lĩnh vực Công nghệ thông tin**.

Website hướng đến việc hỗ trợ sinh viên, giảng viên, nghiên cứu viên và những người quan tâm tìm kiếm, xem thông tin và theo dõi các hội nghị phù hợp với nhu cầu học tập, nghiên cứu.

## 2. Mục tiêu

- Tập trung thông tin về các hội nghị khoa học trong nước thuộc lĩnh vực Công nghệ thông tin.
- Giúp người dùng thuận tiện tra cứu và xem thông tin chi tiết hội nghị.
- Xây dựng giao diện rõ ràng, dễ sử dụng.
- Vận dụng kiến thức HTML, CSS và JavaScript vào phát triển website.
- Thực hành tổ chức mã nguồn, dữ liệu và tài nguyên của dự án web.

## 3. Các trang của website

Các trang được liệt kê theo cấu trúc mã nguồn; chức năng cụ thể phụ thuộc vào phần triển khai.

| Trang | Tệp | Mục đích |
| --- | --- | --- |
| Trang chủ | `index.html` | Giới thiệu và truy cập các nội dung chính |
| Tìm kiếm | `search.html` | Tra cứu thông tin hội nghị |
| Chi tiết hội nghị | `detail.html`, `chitiet.html` | Hiển thị thông tin chi tiết hội nghị |
| Theo dõi hội nghị | `tracker.html` | Theo dõi các hội nghị quan tâm |
| Đăng nhập | `login.html` | Giao diện đăng nhập |
| Đăng ký | `register.html` | Giao diện đăng ký tài khoản |
| Hồ sơ cá nhân | `profile.html` | Giao diện thông tin người dùng |
| Giới thiệu | `about.html` | Giới thiệu dự án |
| Liên hệ | `contact.html` | Thông tin liên hệ |
| Chính sách riêng tư | `privacy.html` | Nội dung về quyền riêng tư |
| Điều khoản sử dụng | `terms.html` | Các điều khoản sử dụng website |

## 4. Công nghệ sử dụng

| Công nghệ | Vai trò |
| --- | --- |
| HTML | Xây dựng cấu trúc và nội dung các trang |
| CSS | Định dạng giao diện và bố cục |
| JavaScript | Xử lý tương tác trên trình duyệt |
| JSON | Tổ chức dữ liệu của dự án |
| SVG | Lưu trữ logo và hình ảnh |

Dự án có thêm script `data/main.py`. Vai trò và cách chạy script cần được xác định từ nội dung mã nguồn.

## 5. Cấu trúc thư mục

```text
confeguide/
├── css/
│   ├── about.css
│   ├── auth.css
│   ├── base.css
│   ├── detail.css
│   ├── home.css
│   ├── profile.css
│   ├── search.css
│   └── tracker.css
├── data/
│   ├── about.json
│   ├── conference_data.json
│   ├── main.py
│   └── users.json
├── images/
│   ├── acl.svg
│   ├── cvpr.svg
│   ├── hero-bg.svg
│   ├── iclr.svg
│   ├── kdd.svg
│   ├── logo.svg
│   ├── neurips.svg
│   └── security.svg
├── js/
│   ├── about.js
│   ├── app.js
│   ├── auth.js
│   ├── detail.js
│   ├── layout.js
│   ├── script.js
│   └── tracker.js
├── .gitignore
├── about.html
├── AGENT.md
├── chitiet.html
├── contact.html
├── detail.html
├── index.html
├── login.html
├── privacy.html
├── profile.html
├── README.md
├── register.html
├── search.html
├── terms.html
└── tracker.html
```

### Vai trò các thư mục

- **`css/`**: chứa các tệp định dạng giao diện.
- **`data/`**: chứa các tệp dữ liệu JSON và script Python.
- **`images/`**: chứa hình ảnh, logo và tài nguyên đồ họa.
- **`js/`**: chứa mã JavaScript xử lý tương tác.
- **Các tệp HTML**: xây dựng các trang của website.

## 6. Hướng dẫn chạy giao diện

### Cách 1: Sử dụng Live Server

1. Tải mã nguồn dự án về máy.
2. Mở thư mục `confeguide` bằng Visual Studio Code.
3. Cài đặt tiện ích **Live Server**.
4. Nhấp chuột phải vào tệp `index.html`.
5. Chọn **Open with Live Server**.

Website sẽ được mở trên trình duyệt tại địa chỉ do Live Server cung cấp.

### Cách 2: Sử dụng Python

Máy tính cần cài đặt Python 3.

Mở terminal tại thư mục gốc của dự án, nơi chứa `index.html`, và chạy:

```bash
python -m http.server 8000
```

Nếu hệ thống sử dụng lệnh `python3`:

```bash
python3 -m http.server 8000
```

Truy cập:

```text
http://localhost:8000
```

Nhấn `Ctrl + C` trong terminal để dừng máy chủ.

> Máy chủ HTTP trên chỉ phục vụ các tệp tĩnh, không thực thi `data/main.py` hoặc cung cấp chức năng xử lý tài khoản phía máy chủ. Nên chạy website qua HTTP để tránh các hạn chế khi JavaScript tải JSON bằng `fetch()` qua đường dẫn `file://`.

## 7. Dữ liệu dự án

| Tệp | Nội dung theo cách đặt tên |
| --- | --- |
| `conference_data.json` | Dữ liệu hội nghị |
| `about.json` | Dữ liệu giới thiệu |
| `users.json` | Dữ liệu liên quan đến người dùng |

Khi cập nhật dữ liệu:

- Giữ đúng cấu trúc dữ liệu mà mã JavaScript đang sử dụng.
- Bảo đảm cú pháp JSON hợp lệ.
- Đối chiếu thông tin hội nghị với nguồn công bố chính thức.
- Rà soát dữ liệu để bảo đảm phù hợp với phạm vi hội nghị trong nước.
- Không lưu mật khẩu thật hoặc thông tin cá nhân nhạy cảm trong các tệp JSON công khai.

## 8. Hướng phát triển

- Bổ sung bộ lọc theo chủ đề, thời gian và địa điểm.
- Hoàn thiện chức năng lưu và theo dõi hội nghị yêu thích.
- Hỗ trợ nhắc hạn nộp bài và các mốc thời gian quan trọng.
- Tích hợp API và cơ sở dữ liệu để quản lý thông tin tập trung.
- Hoàn thiện xác thực tài khoản và bảo vệ thông tin người dùng.
- Tối ưu giao diện trên thiết bị di động.

---

Dự án được thực hiện phục vụ học tập trong môn **Internet và công nghệ web (IE104)** tại **Trường Đại học Công nghệ Thông tin – ĐHQG TP.HCM**.