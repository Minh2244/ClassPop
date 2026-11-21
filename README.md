# 🎲 ClassPop — LUCKY PICK ✨

Ứng dụng web bốc thăm học sinh tương tác trực quan dành cho giáo viên và lớp học, giúp mỗi lượt gọi tên lên bảng, kiểm tra bài cũ hay chia nhóm trở nên sinh động, kịch tính và đầy hứng khởi.

---

## ✨ Tính năng nổi bật

- **15 trò chơi bốc thăm trực quan** với đồ họa sinh động, hiệu ứng vật lý, hoạt ảnh mượt mà và âm thanh vui nhộn.
- **Quản lý nhiều lớp học**: Tạo nhiều lớp, đổi tên, chuyển đổi nhanh giữa các lớp, tìm kiếm học sinh, thêm/xóa học sinh lẻ và tự động cảnh báo khi có tên trùng lặp.
- **4 cách nạp danh sách học sinh tiện lợi**:
  - 🔢 **Theo số lượng**: Khởi tạo nhanh danh sách theo sĩ số lớp.
  - 📝 **Dán văn bản**: Dán danh sách tên học sinh (mỗi học sinh một dòng).
  - 📊 **Nhập từ Excel (`.xlsx`, `.xls`)**: Hỗ trợ chọn Sheet, xem trước bảng dữ liệu, tự động nhận diện dòng tiêu đề và cột `Họ và tên` hoặc ghép 2 cột `Họ` + `Tên`.
  - 💾 **Sao lưu & khôi phục (JSON / Excel)**: Xuất/nhập toàn bộ dữ liệu lớp học & lịch sử qua tệp `.json`, xuất danh sách lớp hoặc lịch sử bốc thăm ra tệp `.xlsx`.
- **Công bằng & ngẫu nhiên chuẩn mật mã**: Sử dụng `window.crypto.getRandomValues` kết hợp thuật toán xáo trộn Fisher-Yates độc lập với hoạt ảnh trò chơi.
- **Tối ưu cho trình chiếu lớp học (máy chiếu / TV / bảng tương tác)**:
  - Chế độ **Toàn màn hình (Fullscreen)** cho sân chơi (nhấn `ESC` để thoát).
  - Thanh điều chỉnh **Thu phóng giao diện** linh hoạt (`70%` – `150%`).
  - Nút **Bóng đèn 💡** chuyển đổi nhanh giữa giao diện Tối và giao diện Sáng.
  - **Âm thanh tổng hợp bằng Web Audio API** (chạy hoàn toàn offline, không phụ thuộc tệp âm thanh ngoài, bật/tắt tùy ý).
  - **Hiệu ứng pháo hoa giấy (`canvas-confetti`)** và lời chúc khích lệ khi công bố kết quả.
- **Lưu trữ an toàn trên trình duyệt**: Toàn bộ danh sách lớp, lịch sử bốc thăm và cài đặt được lưu cục bộ bằng **IndexedDB** (`LopHocMayManDB`), không cần backend hay đăng nhập.

---

## 🎮 Danh sách 15 trò chơi bốc thăm

| # | Trò chơi | Thời lượng | Mô tả |
| :-: | :--- | :--- | :--- |
| 1 | 🎯 **Vòng Quay May Mắn** | ~15 giây | Vòng quay nhiều màu sắc, kim chỉ hồi hộp với hiệu ứng giảm tốc mượt mà. |
| 2 | 🌀 **Bi Liên Hoàn** | ~45 giây | Máng trượt bi ve vật lý: dốc zíc zắc, quạt gió, rừng đinh Plinko, bánh xe quay và phễu dồn về đích. |
| 3 | 🏃🐾 **Đua Động Vật** | ~45 giây | Các nhân vật thú cưng đáng yêu (mèo, chó, thỏ, sư tử, cáo...) nhún nhảy chạy đua và vượt rào cản. |
| 4 | 🎁 **Hộp Quà May Mắn** | Tự do chọn | Học sinh ẩn giấu trong các hộp quà bí ẩn để thầy cô hoặc học sinh tự bấm mở. |
| 5 | 🎣🐟 **Câu Cá Tìm Tên** | ~40 giây | Thả mồi câu xuống mặt hồ gợn sóng, cá bơi lội vờn mồi trước khi chú cá may mắn cắn câu. |
| 6 | 🚀 **Phóng Tên Lửa** | ~25 giây | Đếm ngược 3-2-1 cất cánh xuyên tầng mây lên vũ trụ, vượt thiên thạch và cắm cờ trên Mặt Trăng. |
| 7 | 🦆🏁 **Đua Vịt Qua Sông** | ~30 giây | Đàn vịt cao su nhiều màu đeo số cánh bơi đua rượt đuổi dọc bờ sông qua vạch đích ca-rô. |
| 8 | 🕹️🧸 **Máy Gắp Thú Bông** | Tối đa 25 giây | Tủ máy gắp thú bông Kawaii neon với cơ chế gắp ngẫu nhiên đầy kịch tính. |
| 9 | 💣⏱️ **Bom Hẹn Giờ** | ~30 giây | Vòng tròn học sinh nhìn từ trên cao truyền tay nhau quả bom hẹn giờ theo chiều kim đồng hồ. |
| 10 | 🛸 **Đĩa Bay UFO Hút Người** | Tối đa 25 giây | Đĩa bay UFO lượn qua sân trường nắng, kéo 1–3 bạn cùng lúc đầy hài hước và bất ngờ. |
| 11 | ⚡ **Dòng Điện Xuyên Hầm** | ~18 giây | Camera bám sát quả cầu tia sét chạy xuyên các đường hầm kính chia nhánh (hỗ trợ tới 100–1000+ HS). |
| 12 | 🙈 **Bịt Mắt Bắt Dê** | Tối đa 30 giây | Sân cờ nắng sớm: bạn Sao Đỏ bịt khăn đỏ xoay vòng rượt bắt và tung cú ngoắt 180° bất ngờ. |
| 13 | ✈️ **Phóng Máy Bay Giấy** | Tối đa 30 giây | Phòng học bảng xanh: cả lớp phóng mưa máy bay giấy xuyên 3 quạt trần về phía Bàn Giáo Viên. |
| 14 | 🪢 **Nhảy Dây Tập Thể** | Tối đa 30 giây | Dưới tán phượng vĩ đỏ: cả lớp nối đuôi chạy vòng số 8 qua dây quay đổi nhịp lắt léo. |
| 15 | 🏸 **Đá Cầu Ra Chơi** | Tối đa 30 giây | Sân thể dục chiều nắng vàng: camera bám quả cầu lông 3 màu với pha cứu cầu Slow-Mo và cú cầu xoáy. |

---

## 🛠️ Công nghệ sử dụng

- **Framework & Build**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite 8](https://vite.dev/)
- **Đồ họa & Hoạt ảnh**: [PixiJS 8](https://pixijs.com/), [Matter.js](https://brm.io/matter-js/), [GSAP](https://gsap.com/), [canvas-confetti](https://github.com/catdad/canvas-confetti)
- **Xử lý Excel**: [SheetJS (`xlsx`)](https://sheetjs.com/)
- **Âm thanh & Lưu trữ**: Web Audio API & IndexedDB

---

## 📁 Cấu trúc thư mục

```text
ClassPop/
├── public/                     # Tài nguyên tĩnh (favicon, icons)
├── src/
│   ├── components/             # Các hộp thoại (Quản lý lớp, Lịch sử, Xem trước Excel, Chúc mừng)
│   ├── dich-vu/                # Dịch vụ cốt lõi (ngẫu nhiên, lưu trữ IndexedDB, Excel, JSON, âm thanh, pháo hoa)
│   ├── tro-choi/               # Mã nguồn 15 trò chơi bốc thăm & tiện ích dùng chung
│   ├── App.tsx                 # Giao diện chính và điều phối ứng dụng
│   ├── App.css                 # Kiểu dáng bố cục chính
│   └── main.tsx                # Điểm khởi chạy React
├── index.html                  # Trang HTML gốc
├── vercel.json                 # Cấu hình triển khai SPA lên Vercel
├── vite.config.ts              # Cấu hình Vite
└── package.json                # Khai báo thư viện và scripts
```

---

## 🚀 Cài đặt & Chạy cục bộ

### Yêu cầu môi trường
- [Node.js](https://nodejs.org/) phiên bản 20 trở lên (khuyến nghị Node.js 24 LTS)
- `npm`

### Các bước thực hiện

```bash
# 1. Cài đặt thư viện (dự án đã bật legacy-peer-deps=true trong .npmrc)
npm install

# 2. Chạy máy chủ phát triển (mặc định tại http://localhost:5173)
npm run dev
```

### Các lệnh hữu ích khác

```bash
# Kiểm tra TypeScript và đóng gói bản production vào thư mục dist/
npm run build

# Xem trước bản build production cục bộ
npm run preview

# Kiểm tra chất lượng mã nguồn với ESLint
npm run lint
```

---

## ☁️ Triển khai lên Vercel

Dự án là ứng dụng web tĩnh (SPA) thuần frontend, không cần máy chủ backend nên có thể triển khai trực tiếp lên **Vercel** để hoạt động liên tục 24/7. Tệp `vercel.json` đã được cấu hình sẵn:

- **Framework Preset**: `Vite`
- **Install Command**: `npm install --legacy-peer-deps`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

Bạn chỉ cần kết nối repository GitHub với Vercel hoặc chạy `vercel --prod` để xuất bản ứng dụng.
