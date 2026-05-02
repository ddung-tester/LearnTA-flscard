# English Flashcard & Quiz App

Ứng dụng web học từ vựng tiếng Anh theo kiểu flashcard. Tạo bộ từ vựng, thêm thẻ Anh–Việt, học bằng lật thẻ, và làm quiz trắc nghiệm tự động.

## Tech Stack

**Frontend:** React, JavaScript, Vite, React Router DOM, Tailwind CSS, Axios

**Backend:** Node.js, Express.js, MySQL, mysql2

## Cấu trúc thư mục

```
├── client/          # React frontend (Vite)
├── server/          # Node.js Express backend
│   ├── database/    # SQL schema và seed data
│   └── src/         # Source code
├── docs/            # Tài liệu dự án
├── PROJECT_CONTEXT.md
├── PRODUCT.md
└── README.md
```

## Chạy Frontend

```bash
cd client
npm install
npm run dev
```

Frontend chạy tại: http://localhost:5173

## Chạy Backend

### 1. Cài MySQL Server

Nếu chưa có, cài MySQL Server và MySQL Workbench.

### 2. Tạo file `.env`

```bash
cd server
cp .env.example .env
```

Mở file `server/.env` và sửa thông tin kết nối MySQL:

```
PORT=5000
CLIENT_URL="http://localhost:5173"

DB_HOST="localhost"
DB_PORT=3306
DB_USER="root"
DB_PASSWORD="mật_khẩu_mysql_của_bạn"
DB_NAME="english_flashcard_quiz_app"
```

### 3. Tạo database và bảng

Mở MySQL Workbench, mở file `server/database/schema.sql` và chạy toàn bộ nội dung.

File này sẽ tạo database `english_flashcard_quiz_app` cùng 2 bảng `decks` và `cards`.

### 4. Thêm dữ liệu mẫu (tuỳ chọn)

Mở file `server/database/seed.sql` trong MySQL Workbench và chạy để có dữ liệu test.

### 5. Cài dependencies và chạy server

```bash
cd server
npm install
npm run dev
```

Backend chạy tại: http://localhost:5000

### 6. Kiểm tra

- Health check: http://localhost:5000/api/health
- Test database: http://localhost:5000/api/db-test

## Trạng thái

```
Phase: 0 - Setup project ✅
Next: Phase 1 - Frontend mock data
```
"# LearnTA-flscard" 
"# LearnTA-flscard" 
