# PROJECT_CONTEXT.md

## 1. Tên dự án

**English Flashcard & Quiz App**

Ứng dụng web học từ vựng tiếng Anh theo kiểu flashcard giống Quizlet ở mức cơ bản. Người dùng có thể nhập bộ từ vựng tiếng Anh - tiếng Việt, học bằng lật thẻ và làm bài trắc nghiệm tự động sinh từ danh sách từ đã nhập.

Dự án được xây dựng để luyện React, JavaScript, Node.js, Express và MySQL. Ưu tiên code dễ hiểu, dễ mở rộng, không over-engineering.

---

## 2. Mục tiêu dự án

### Mục tiêu MVP

Làm được một ứng dụng web có các chức năng chính:

1. Tạo bộ từ vựng.
2. Thêm từ vựng gồm:
   - Từ tiếng Anh.
   - Nghĩa tiếng Việt.
   - Ví dụ tiếng Anh nếu có.
   - Ghi chú nếu có.
3. Xem danh sách từ vựng trong từng bộ.
4. Học bằng flashcard:
   - Mặt trước hiển thị tiếng Anh.
   - Bấm để lật sang nghĩa tiếng Việt.
   - Có nút "Đã nhớ" và "Chưa nhớ".
5. Tạo bài quiz trắc nghiệm từ bộ từ vựng:
   - Hiển thị câu hỏi tiếng Anh.
   - Chọn nghĩa tiếng Việt đúng.
   - Có 4 đáp án.
   - Tính điểm cuối bài.
6. Lưu dữ liệu vào MySQL thông qua backend Node.js + Express.

### Mục tiêu sau MVP

Sau khi bản cơ bản chạy ổn, có thể mở rộng:

1. Đăng ký, đăng nhập người dùng.
2. Mỗi người dùng có bộ từ riêng.
3. Lưu lịch sử học.
4. Lưu kết quả quiz.
5. Thống kê từ nào hay sai.
6. Import từ vựng bằng textarea hoặc file CSV.
7. Public/share bộ từ vựng.
8. Responsive tốt trên mobile.
9. Thêm AI hỗ trợ sinh ví dụ, giải thích nghĩa, tạo quiz nâng cao.

---

## 3. Tech stack

### Frontend

- React
- JavaScript
- Vite
- React Router DOM
- Tailwind CSS
- Axios
- Framer Motion, dùng sau nếu cần animation lật thẻ đẹp hơn

### Backend

- Node.js
- Express.js
- MySQL
- mysql2 (query MySQL trực tiếp, không dùng ORM)
- CORS
- dotenv

### Công cụ hỗ trợ

- VS Code
- MySQL Workbench hoặc DBeaver
- Postman hoặc Thunder Client
- Git + GitHub
- Codex / Cursor / Antigraviti để hỗ trợ code

---

## 4. Nguyên tắc phát triển

1. Ưu tiên code dễ đọc, dễ hiểu.
2. Không viết quá phức tạp khi chưa cần.
3. Mỗi component chỉ nên làm một nhiệm vụ chính.
4. Logic xử lý quiz nên tách khỏi UI.
5. API backend cần rõ ràng, đặt tên dễ hiểu.
6. Không hard-code dữ liệu lâu dài trong frontend.
7. Không đưa mật khẩu database lên GitHub.
8. Không commit thư mục `node_modules`.
9. Không commit file `.env`.
10. Khi dùng AI sửa code, AI phải đọc file này trước.

---

## 5. Cấu trúc thư mục đề xuất

```txt
english-flashcard-quiz-app/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── deck/
│   │   │   ├── flashcard/
│   │   │   └── quiz/
│   │   ├── pages/
│   │   │   ├── HomePage.jsx
│   │   │   ├── DeckListPage.jsx
│   │   │   ├── DeckDetailPage.jsx
│   │   │   ├── FlashcardPage.jsx
│   │   │   └── QuizPage.jsx
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   ├── deckApi.js
│   │   │   └── cardApi.js
│   │   ├── utils/
│   │   │   └── quizGenerator.js
│   │   ├── hooks/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
│
├── server/
│   ├── database/
│   │   ├── schema.sql
│   │   └── seed.sql
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js
│   │   ├── controllers/
│   │   │   ├── deckController.js
│   │   │   └── cardController.js
│   │   ├── routes/
│   │   │   ├── deckRoutes.js
│   │   │   └── cardRoutes.js
│   │   ├── services/
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
│
├── docs/
│   ├── API.md
│   ├── DATABASE.md
│   └── TODO.md
│
├── PROJECT_CONTEXT.md
├── README.md
└── .gitignore
```

---

## 6. Luồng hoạt động chính

### 6.1. Luồng tạo bộ từ vựng

1. Người dùng vào trang danh sách bộ từ.
2. Bấm "Tạo bộ từ mới".
3. Nhập tên bộ từ và mô tả.
4. Frontend gọi API tạo deck.
5. Backend lưu vào bảng `decks`.
6. Frontend điều hướng sang trang chi tiết bộ từ.

### 6.2. Luồng thêm từ vựng

1. Người dùng mở một deck.
2. Nhập từ tiếng Anh và nghĩa tiếng Việt.
3. Bấm thêm từ.
4. Frontend gọi API tạo card.
5. Backend lưu vào bảng `cards`.
6. Frontend refresh danh sách cards.

### 6.3. Luồng học flashcard

1. Người dùng chọn một deck.
2. Bấm "Học flashcard".
3. Frontend lấy danh sách cards của deck.
4. Hiển thị từng card.
5. Ban đầu hiện `term_en`.
6. Khi bấm lật, hiện `meaning_vi`.
7. Người dùng chọn "Đã nhớ" hoặc "Chưa nhớ".
8. Chuyển sang card tiếp theo.

### 6.4. Luồng làm quiz

1. Người dùng chọn một deck.
2. Bấm "Làm quiz".
3. Frontend lấy danh sách cards.
4. Từ mỗi card, tạo câu hỏi:
   - Câu hỏi: từ tiếng Anh.
   - Đáp án đúng: nghĩa tiếng Việt của card đó.
   - Đáp án sai: lấy nghĩa tiếng Việt từ các card khác.
5. Người dùng chọn đáp án.
6. Hệ thống kiểm tra đúng/sai.
7. Cuối bài hiển thị điểm.

---

## 7. Database schema đề xuất

### Giai đoạn MVP chưa cần đăng nhập

Ban đầu chỉ cần 2 bảng:

```sql
CREATE TABLE decks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE cards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  deck_id INT NOT NULL,
  term_en VARCHAR(255) NOT NULL,
  meaning_vi VARCHAR(255) NOT NULL,
  example_sentence TEXT,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
);
```

### Giai đoạn có đăng nhập

Sau MVP, thêm bảng `users`:

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

Sau đó thêm `user_id` vào bảng `decks`:

```sql
ALTER TABLE decks
ADD COLUMN user_id INT,
ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
```

### Bảng mở rộng sau này

```sql
CREATE TABLE quiz_results (
  id INT AUTO_INCREMENT PRIMARY KEY,
  deck_id INT NOT NULL,
  score INT NOT NULL,
  total_questions INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
);

CREATE TABLE card_progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  card_id INT NOT NULL,
  correct_count INT DEFAULT 0,
  wrong_count INT DEFAULT 0,
  last_reviewed_at TIMESTAMP NULL,
  mastery_level INT DEFAULT 0,
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
);
```

---

## 8. SQL Schema

SQL schema nằm trong `server/database/schema.sql`. Chạy file này trong MySQL Workbench để tạo database và bảng.

Backend query MySQL trực tiếp bằng `mysql2/promise`, không dùng ORM.

---

## 9. API cần có trong MVP

### Deck API

```txt
GET    /api/decks
GET    /api/decks/:deckId
POST   /api/decks
PUT    /api/decks/:deckId
DELETE /api/decks/:deckId
```

### Card API

```txt
GET    /api/decks/:deckId/cards
POST   /api/decks/:deckId/cards
PUT    /api/cards/:cardId
DELETE /api/cards/:cardId
```

### API mở rộng sau này

```txt
POST   /api/auth/register
POST   /api/auth/login
GET    /api/me

POST   /api/quiz-results
GET    /api/decks/:deckId/quiz-results

POST   /api/cards/:cardId/progress
GET    /api/decks/:deckId/progress
```

---

## 10. Component frontend đề xuất

### Common components

```txt
Button.jsx
Input.jsx
Textarea.jsx
Modal.jsx
Loading.jsx
EmptyState.jsx
ConfirmDialog.jsx
```

### Deck components

```txt
DeckCard.jsx
DeckForm.jsx
DeckList.jsx
DeckHeader.jsx
```

### Card components

```txt
CardForm.jsx
CardList.jsx
CardItem.jsx
```

### Flashcard components

```txt
FlashcardViewer.jsx
FlashcardControls.jsx
FlashcardProgress.jsx
```

### Quiz components

```txt
QuizQuestion.jsx
QuizOption.jsx
QuizProgress.jsx
QuizResult.jsx
```

---

## 11. Pages frontend đề xuất

### HomePage.jsx

Trang giới thiệu ngắn:

- Tên app.
- Nút vào danh sách bộ từ.
- Mô tả chức năng chính.

### DeckListPage.jsx

Trang danh sách deck:

- Hiển thị toàn bộ bộ từ.
- Nút tạo deck.
- Nút sửa/xóa deck.
- Nút vào chi tiết deck.

### DeckDetailPage.jsx

Trang chi tiết deck:

- Hiển thị tên deck.
- Form thêm từ.
- Danh sách từ.
- Nút học flashcard.
- Nút làm quiz.

### FlashcardPage.jsx

Trang học flashcard:

- Hiển thị một card tại một thời điểm.
- Bấm để lật thẻ.
- Nút card trước/card sau.
- Nút đã nhớ/chưa nhớ.

### QuizPage.jsx

Trang làm quiz:

- Hiển thị câu hỏi.
- Hiển thị 4 đáp án.
- Kiểm tra đúng/sai.
- Hiển thị kết quả cuối bài.

---

## 12. Logic tạo quiz

File nên đặt tại:

```txt
client/src/utils/quizGenerator.js
```

Ý tưởng:

1. Nhận vào danh sách cards.
2. Với mỗi card:
   - Lấy `term_en` làm câu hỏi.
   - Lấy `meaning_vi` làm đáp án đúng.
   - Lấy 3 nghĩa tiếng Việt khác làm đáp án sai.
3. Trộn thứ tự đáp án.
4. Trả về danh sách câu hỏi.

Pseudo logic:

```js
function generateQuizQuestions(cards) {
  if (!cards || cards.length < 4) {
    return [];
  }

  return cards.map((card) => {
    const correctAnswer = card.meaning_vi;

    const wrongAnswers = cards
      .filter((item) => item.id !== card.id)
      .map((item) => item.meaning_vi)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const options = [correctAnswer, ...wrongAnswers]
      .sort(() => Math.random() - 0.5);

    return {
      question: card.term_en,
      correctAnswer,
      options,
      cardId: card.id,
    };
  });
}
```

Lưu ý:

- Nếu deck có dưới 4 từ, không nên cho làm quiz 4 đáp án.
- Có thể hiển thị thông báo: "Cần ít nhất 4 từ để tạo quiz".

---

## 13. Lộ trình làm dự án

### Phase 0: Setup project

- [ ] Tạo repo GitHub.
- [ ] Tạo thư mục `client`.
- [ ] Tạo React app bằng Vite.
- [ ] Cài Tailwind CSS.
- [ ] Tạo thư mục `server`.
- [ ] Setup Express server.
- [ ] Setup MySQL database.
- [ ] Tạo SQL schema trong `server/database/schema.sql`.
- [ ] Tạo `.gitignore`.
- [ ] Tạo `.env.example`.

### Phase 1: Frontend mock data

- [ ] Tạo layout cơ bản.
- [ ] Tạo route bằng React Router.
- [ ] Tạo trang danh sách deck bằng mock data.
- [ ] Tạo trang chi tiết deck bằng mock data.
- [ ] Tạo form thêm từ vựng.
- [ ] Tạo màn hình flashcard.
- [ ] Tạo màn hình quiz.
- [ ] Tạo logic generate quiz ở frontend.

### Phase 2: Backend API

- [ ] Tạo Express app.
- [ ] Tạo route `/api/decks`.
- [ ] Tạo route `/api/decks/:deckId`.
- [ ] Tạo route `/api/decks/:deckId/cards`.
- [ ] Tạo route `/api/cards/:cardId`.
- [ ] Tạo controller cho deck.
- [ ] Tạo controller cho card.
- [ ] Test API bằng Postman hoặc Thunder Client.

### Phase 3: Database

- [ ] Tạo database MySQL.
- [ ] Chạy `schema.sql` trong MySQL Workbench.
- [ ] Kết nối controller với mysql2 pool.
- [ ] Test tạo deck thật.
- [ ] Test thêm card thật.
- [ ] Test xóa deck thì cards bị xóa theo.

### Phase 4: Kết nối frontend với backend

- [ ] Tạo file `client/src/services/api.js`.
- [ ] Tạo `deckApi.js`.
- [ ] Tạo `cardApi.js`.
- [ ] Gọi API lấy danh sách deck.
- [ ] Gọi API tạo deck.
- [ ] Gọi API lấy cards trong deck.
- [ ] Gọi API thêm card.
- [ ] Gọi API sửa/xóa card.
- [ ] Xử lý loading/error.

### Phase 5: Hoàn thiện UX

- [ ] Thêm thông báo khi tạo/xóa thành công.
- [ ] Thêm confirm khi xóa.
- [ ] Thêm empty state khi chưa có deck/card.
- [ ] Thêm validate form.
- [ ] Thêm responsive mobile.
- [ ] Làm flashcard đẹp hơn.
- [ ] Làm quiz result rõ ràng hơn.

### Phase 6: Auth sau MVP

- [ ] Tạo bảng users.
- [ ] Làm register.
- [ ] Làm login.
- [ ] Hash password bằng bcrypt.
- [ ] Dùng JWT hoặc session.
- [ ] Deck thuộc về user.
- [ ] Chỉ user tạo deck mới được sửa/xóa deck đó.

---

## 14. Gợi ý giao diện

### Màu sắc

Có thể chọn style đơn giản:

```txt
Nền chính: #F8FAFC
Màu chính: #2563EB
Màu phụ: #10B981
Text chính: #0F172A
Text phụ: #64748B
Viền: #E2E8F0
```

### Phong cách UI

- Sạch.
- Dễ nhìn.
- Nhiều khoảng trắng.
- Card bo góc.
- Button rõ trạng thái.
- Form đơn giản.
- Không dùng quá nhiều hiệu ứng ở bản đầu.

---

## 15. Quy tắc đặt tên

### Database

Dùng snake_case:

```txt
term_en
meaning_vi
created_at
updated_at
deck_id
```

### JavaScript

Dùng camelCase:

```txt
termEn
meaningVi
createdAt
updatedAt
deckId
```

### Component React

Dùng PascalCase:

```txt
DeckCard.jsx
FlashcardViewer.jsx
QuizQuestion.jsx
```

### File thường

Có thể dùng camelCase:

```txt
deckApi.js
cardApi.js
quizGenerator.js
```

---

## 16. Các lỗi cần tránh

1. Không làm đăng nhập ngay từ đầu nếu MVP chưa xong.
2. Không làm UI quá cầu kỳ trước khi logic chạy được.
3. Không để quiz logic nằm lẫn trong component quá dài.
4. Không gọi API lung tung trong nhiều component nếu có thể gom vào service.
5. Không lưu dữ liệu thật trong localStorage khi đã có backend.
6. Gom SQL query vào controller/service, không rải rác nhiều nơi.
7. Không để `.env` lên GitHub.
8. Không dùng quá nhiều thư viện khi chưa cần.
9. Không để component dài quá 300 dòng.
10. Không sửa nhiều tính năng cùng lúc.

---

## 17. Prompt cho AI code assistant

Khi dùng Codex, Cursor hoặc Antigraviti, hãy yêu cầu AI đọc file này trước.

Prompt mẫu:

```txt
Read PROJECT_CONTEXT.md first.

You are helping me build an English Flashcard & Quiz App using React JavaScript, Node.js Express, and MySQL (mysql2, no ORM).

Follow the project structure and development rules in PROJECT_CONTEXT.md.

Do not over-engineer.
Do not change unrelated files.
Keep the code beginner-friendly and easy to understand.
Before editing, explain briefly what files you will touch.
After editing, summarize what changed and how to test it.
```

Prompt sửa bug:

```txt
Read PROJECT_CONTEXT.md first.

I have a bug in this project. Please inspect the relevant files only, find the root cause, and fix it with minimal changes.

Requirements:
- Keep the current architecture.
- Do not rewrite the whole project.
- Do not change unrelated logic.
- Explain the bug cause briefly.
- Provide test steps after fixing.
```

Prompt thêm tính năng:

```txt
Read PROJECT_CONTEXT.md first.

I want to add the following feature: [describe feature here].

Please implement it according to the existing project structure.

Requirements:
- Keep code simple.
- Reuse existing components/services when possible.
- Do not break current features.
- Add clear test steps.
```

---

## 18. README ngắn cho dự án

Nội dung README nên có:

```txt
# English Flashcard & Quiz App

A web app for learning English vocabulary with flashcards and quizzes.

## Tech Stack

- React
- JavaScript
- Vite
- Tailwind CSS
- Node.js
- Express
- MySQL
- mysql2

## Main Features

- Create vocabulary decks
- Add English/Vietnamese vocabulary cards
- Learn with flashcards
- Generate quiz questions from vocabulary cards
- Store data in MySQL

## Project Structure

- client: React frontend
- server: Node.js Express backend
- docs: project documents

## How to run

Instructions will be added during development.
```

---

## 19. Tiêu chí hoàn thành MVP

Dự án được coi là hoàn thành MVP khi:

- [ ] Tạo được deck mới.
- [ ] Hiển thị danh sách deck.
- [ ] Xem được chi tiết deck.
- [ ] Thêm được từ vựng vào deck.
- [ ] Sửa/xóa được từ vựng.
- [ ] Học được bằng flashcard.
- [ ] Làm được quiz từ danh sách từ.
- [ ] Có tính điểm quiz.
- [ ] Dữ liệu được lưu trong MySQL.
- [ ] Refresh trang không mất dữ liệu.
- [ ] Có README hướng dẫn chạy project.

---

## 20. Trạng thái hiện tại

```txt
Status: Planning
Current phase: Phase 0 - Setup project
Next task: Create project folder, initialize React client and Express server
```

---

## 21. Ghi chú cho AI

Khi AI hỗ trợ dự án này:

1. Luôn ưu tiên làm từng bước nhỏ.
2. Không tự ý đổi stack.
3. Không chuyển sang TypeScript nếu chưa được yêu cầu.
4. Không chuyển sang Next.js nếu chưa được yêu cầu.
5. Không thay MySQL bằng MongoDB/PostgreSQL nếu chưa được yêu cầu.
6. Không thêm auth trước khi MVP ổn định.
7. Không thêm AI feature trước khi flashcard và quiz chạy ổn.
8. Khi thêm file mới, phải đúng cấu trúc thư mục.
9. Khi sửa code, phải giữ nguyên style hiện có.
10. Khi hướng dẫn, ưu tiên giải thích cho người mới học React/Node/MySQL.
