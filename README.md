# English Flashcard & Quiz App

Ứng dụng học từ vựng tiếng Anh bằng flashcard, quiz trắc nghiệm và reward effect khi người học trả lời đúng đủ số câu đã đặt.

Project hiện tập trung vào trải nghiệm frontend mock: tạo bộ từ, thêm từ, học flashcard, làm quiz, lưu tiến độ bằng `localStorage` và phát reward video ở hai bên màn hình khi đạt mốc đúng.

## Tính năng chính

- **Danh sách bộ từ**: xem các deck hiện có, mở chi tiết deck, thêm bộ mới và sửa thông tin bộ.
- **Chi tiết bộ từ**: xem danh sách từ trong deck, theo dõi tiến độ học gần nhất.
- **Flashcard**:
  - Lật thẻ bằng click hoặc phím `Space`.
  - Chuyển thẻ bằng nút trước/sau hoặc phím mũi tên.
  - Hỗ trợ 2 chiều học: English -> Vietnamese và Vietnamese -> English.
  - Đánh dấu “Nhớ rồi” hoặc “Chưa nhớ”.
- **Quiz trắc nghiệm**:
  - Tạo câu hỏi từ dữ liệu mock trong deck.
  - Mỗi câu có 4 đáp án, gồm 1 đáp án đúng và 3 đáp án nhiễu.
  - Tự chuyển câu sau khi chọn đáp án.
  - Có màn hình tổng kết cuối bài.
- **Progress bằng localStorage**:
  - Lưu kết quả flashcard gần nhất.
  - Lưu kết quả quiz gần nhất.
  - Hiển thị tiến độ gọn ở deck list và deck detail.
- **Reward khi đúng X câu**:
  - Có thể bật/tắt reward trong màn quiz.
  - Có thể chỉnh “Số câu đúng để có phần thưởng”.
  - Khi đạt mốc, app chọn ngẫu nhiên một video reward trong `public/rewards/` để phát ở hai bên màn hình.
- **Add/Edit Word**: thêm hoặc sửa từ trong deck ngay trên UI.
- **Add/Edit Deck**: thêm hoặc sửa bộ từ ngay trên UI.
- **Import words nhanh**:
  - Dán nhiều dòng từ vựng vào textarea.
  - Hỗ trợ các format: `word - meaning`, `word, meaning`, `word | meaning`.

## Công nghệ sử dụng

- React
- Vite
- React Router DOM
- Tailwind CSS
- JavaScript
- localStorage

Backend Node.js/Express/MySQL có trong định hướng project, nhưng luồng hiện tại đang chạy bằng mock data ở frontend.

## Cách chạy project

### 1. Cài dependencies

```bash
cd client
npm install
```

### 2. Chạy dev server

```bash
npm run dev
```

Mặc định Vite sẽ chạy ở:

```txt
http://localhost:5173
```

### 3. Build production

```bash
npm run build
```

### 4. Preview bản build nếu cần

```bash
npm run preview
```

## Demo / Screenshot

Có thể chụp các màn hình chính sau để đưa vào portfolio:

### Deck list

Trang danh sách bộ từ tại `/decks`.

Màn hình này hiển thị các bộ từ, số lượng từ, trạng thái học gần nhất và các hành động như “Thêm bộ”, “Sửa”, “Mở bộ”.

### Deck detail

Trang chi tiết một bộ từ tại `/decks/:deckId`.

Màn hình này hiển thị tiến độ học tập, danh sách từ, nút học flashcard, nút làm quiz, thêm/sửa từ và import nhanh nhiều từ.

### Flashcard

Trang học flashcard tại `/decks/:deckId/flashcard`.

Người học có thể chọn chiều học, lật thẻ, chuyển thẻ, đánh dấu “Nhớ rồi” hoặc “Chưa nhớ”, sau đó xem tổng kết phiên học.

### Quiz

Trang quiz tại `/decks/:deckId/quiz`.

Mỗi câu hỏi hiển thị một từ tiếng Anh và 4 nghĩa tiếng Việt để chọn. Sau khi chọn đáp án, app phản hồi đúng/sai và tự chuyển sang câu tiếp theo.

### Reward effect

Reward xuất hiện trong màn quiz khi người học trả lời đúng đủ số câu đã đặt.

Video được lấy từ:

```txt
client/public/rewards/
```

Danh sách video có thể cấu hình bằng:

```txt
client/public/rewards/videos.json
```

## Dữ liệu mock

Hiện tại app dùng dữ liệu mẫu trong frontend:

```txt
client/src/data/duLieuMau.js
```

Các thao tác thêm/sửa deck và thêm/sửa/import từ chỉ cập nhật state trên UI. Khi refresh trang, dữ liệu thêm/sửa sẽ mất.

Riêng tiến độ học tập được lưu bằng `localStorage`, nên có thể còn sau khi refresh nếu chưa xóa dữ liệu trình duyệt.

## Ghi chú phát triển

- Chưa kết nối backend trong luồng học hiện tại.
- Chưa có đăng nhập/đăng ký.
- Chưa có database cho dữ liệu người dùng.
- Reward chỉ là lớp hiệu ứng phụ, không ảnh hưởng logic quiz.
- UI ưu tiên phong cách học tập tập trung: nền giấy ấm, chữ ink-dark, accent teal và amber.

## Cấu trúc frontend chính

```txt
client/
  public/
    rewards/
  src/
    components/
      common/
      RewardTikTokEffect.jsx
      RewardTikTokEffect.css
    data/
      duLieuMau.js
    pages/
      TrangChu.jsx
      TrangDanhSachBo.jsx
      TrangChiTietBo.jsx
      TrangFlashcard.jsx
      TrangQuiz.jsx
      TrangThemTu.jsx
    utils/
      tienDoHocTap.js
    App.jsx
    main.jsx
    index.css
```

## Routes chính

```txt
/                       Trang chủ
/decks                  Danh sách bộ từ
/decks/:deckId          Chi tiết bộ từ
/decks/:deckId/flashcard Học bằng flashcard
/decks/:deckId/quiz     Làm quiz
```

## Trạng thái hiện tại

Project đang ở giai đoạn frontend mock. Các luồng học chính đã có thể dùng thử:

- Deck List -> Deck Detail
- Deck Detail -> Flashcard
- Deck Detail -> Quiz
- Flashcard/Quiz -> Summary -> quay lại hoặc học tiếp

Backend và database sẽ là bước phát triển tiếp theo nếu cần lưu dữ liệu thật.
