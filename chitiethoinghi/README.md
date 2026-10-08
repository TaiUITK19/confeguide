# ConfGuide – Trang Chi Tiết Hội Nghị Độc Lập (CVPR 2026)

Trang web giới thiệu chi tiết hội nghị khoa học quốc tế **CVPR 2026** (IEEE/CVF Conference on Computer Vision and Pattern Recognition), chạy hoàn toàn độc lập, tách riêng rõ ràng các file HTML, CSS, JavaScript và dữ liệu JSON.

---

## 🚀 Cách chạy ứng dụng

- **Cách 1 (Khuyên dùng):** Mở thư mục này trong VS Code và nhấn **Go Live** (Live Server). Trang `index.html` hoặc `chitiethoinghi.html` sẽ tự động mở trên trình duyệt.
- **Cách 2:** Nhấp đúp chuột trực tiếp vào file `index.html` hoặc `chitiethoinghi.html` trong File Explorer để xem trực tiếp (`file://`) mà không bị lỗi CORS.
- **Không cần cài đặt npm hay build step.**

---

## 📁 Cấu trúc thư mục tách biệt

```text
├── index.html                  # Trang chi tiết hội nghị chính (chạy trực tiếp)
├── chitiethoinghi.html         # Bản sao đồng bộ (đường dẫn thay thế)
├── css/
│   ├── shared.css              # Tokens, reset, layout, header/footer, dark/light theme, toast, mouse glow
│   └── chitiethoinghi.css      # CSS chuyên biệt cho trang chi tiết: hero, tabs, reviews, related conferences
├── js/
│   ├── theme.js                # Quản lý chế độ Sáng / Tối (Dark / Light mode) và đồng bộ localStorage
│   ├── ui.js                   # Hiệu ứng tương tác: drawer mobile, mouse glow, card glow, toast notification
│   ├── nav.js                  # Render Header & Footer riêng biệt cho trang chi tiết hội nghị
│   ├── data.js                 # Dữ liệu hội nghị CVPR 2026, 12 hội nghị liên quan và 128 đánh giá cộng đồng
│   └── chitiethoinghi.js       # Logic điều khiển: chuyển tab, lưu bookmark, chấm điểm 5 sao, like/dislike
├── data/
│   └── conference-detail.json  # Dữ liệu chi tiết hội nghị định dạng JSON
└── README.md                   # Hướng dẫn sử dụng
```

---

## ✨ Tính năng nổi bật

1. **Thông tin chi tiết hội nghị (CVPR 2026):**
   - Banner Hero full-width hiệu ứng chuột phát sáng (mouse pointer radial glow) và background Bến Cảng Nhà Rồng.
   - Thẻ đếm ngược hạn nộp bài (Deadline Countdown widget: 45 ngày).
   - Bảng thông tin nhanh: Địa điểm, Hình thức, Ngày tổ chức, Nhà xuất bản, Lĩnh vực, Xếp hạng (Rank A).
   - Nút liên kết trực tiếp website chính thức: `https://cvpr.thecvf.com/`.

2. **Chuyển đổi Tab nội bộ mượt mà:**
   - **Thông tin chi tiết**: Mô tả đầy đủ và bảng thông số.
   - **Đánh giá cộng đồng (128)**: Điểm trung bình 4.2 sao, biểu đồ thanh phân bố 5 mức sao, danh sách 128 nhận xét với nút Thích / Không thích có bộ đếm và Toast thông báo.
   - **Hội nghị liên quan (12)**: 12 thẻ hội nghị cùng chủ đề AI/Computer Vision với hiệu ứng gradient thumbnail, thẻ số ngày còn lại và nút lưu bookmark.

3. **Tương tác lưu hội nghị & chấm điểm:**
   - Nút **Lưu hội nghị này** với hiệu ứng chuyển màu vàng, lưu trạng thái vào `localStorage` và Toast phản hồi.
   - Widget **Chấm điểm của bạn** (1 đến 5 sao) phản hồi hover, lưu điểm vào `localStorage`.

4. **Chế độ Sáng / Tối (Light / Dark Mode):**
   - Chuyển đổi linh hoạt qua nút toggle trên Topbar và Mobile Drawer, tự động ghi nhớ tùy chọn vào `localStorage['confguide-theme']`.

5. **Hoàn toàn tự hành & không có liên kết gãy:**
   - Header, Mobile Drawer và Footer được tinh chỉnh riêng biệt cho trang chi tiết, mọi nút bấm đều hoạt động hoàn hảo.
