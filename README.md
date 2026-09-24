# IE104_DO_AN
Website tra cứu và khuyến nghị hội nghị khoa học theo chủ đề nghiên cứu

ConfGuide — Website Demo
Giao diện được xây dựng dựa trên ảnh tham chiếu người dùng cung cấp (1607×979 px).
Cấu trúc
`index.html` — giao diện chính
`css/style.css` — toàn bộ CSS, responsive + dark mode
`data/conference_data.json` — nguồn dữ liệu hội nghị dùng chung
`js/script.js` — tải JSON, tìm kiếm, lọc, modal chi tiết, dark mode cho trang chính
`js/app.js` — tải JSON, tìm kiếm, lọc ngày và sắp xếp cho trang tra cứu
`assets/logo.svg` — logo SVG
Chạy project
Cách đơn giản nhất:
Giải nén project.
Mở thư mục bằng VS Code.
Cài extension Live Server.
Chuột phải `index.html` → Open with Live Server.
Hoặc mở trực tiếp `index.html` bằng trình duyệt.
Các chức năng đã có
Thanh điều hướng
Hero section giống bố cục ảnh mẫu
Tìm kiếm hội nghị theo tên/từ khóa/lĩnh vực
Bộ lọc A*, A, B, Việt Nam, Quốc tế
Danh sách hội nghị dạng card
Xem chi tiết bằng modal
Nút từ khóa gợi ý
Responsive cho laptop/tablet/mobile
Dark mode và lưu trạng thái bằng LocalStorage
Lưu ý
Hai trang `index.html` và `search.html` đều đọc trực tiếp `data/conference_data.json`.
Các trường không có trong JSON sẽ không được hiển thị. Hãy chạy bằng Live Server để trình duyệt cho phép JavaScript đọc file JSON.