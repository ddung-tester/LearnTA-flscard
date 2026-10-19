# LearnTA — Flashcard & Quiz App

Ứng dụng học từ vựng tiếng Anh bằng flashcard, quiz trắc nghiệm và tự luận.

- **Frontend**: React + Vite → deploy trên **Vercel**
- **Backend**: Node.js + Express → deploy trên **Render** (free web service)
- **Database**: PostgreSQL → **Supabase** (gói Free); audio khoá học ở **Supabase Storage** (bucket private)

> Từ 10/2026 dự án đã rời Google Cloud (Cloud SQL, Cloud Run, Cloud Storage, Cloud Scheduler).
> Chỉ còn giữ OAuth client "Flash Card Web Client" trong project GCP `flash-card-499907` để đăng nhập Google.
> Hướng dẫn triển khai: [`docs/deploy-render-supabase.md`](docs/deploy-render-supabase.md).
> Chức năng gửi email (chào mừng, nhắc học, khen) đã bỏ.

---

## Chạy local để phát triển (FE + BE)

### Yêu cầu (cài 1 lần)

| Công cụ | Lý do cần |
|---|---|
| Node.js ≥ 20 | Chạy FE + BE |
| PostgreSQL (local) hoặc chuỗi kết nối Supabase | CSDL |

### Cấu hình lần đầu

#### `backend/.env` — copy từ `backend/.env.example`

```env
# Cách 1: Supabase (hoặc Postgres bất kỳ) qua chuỗi kết nối
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/postgres
DB_SSL=true

# Cách 2: Postgres local (bỏ DATABASE_URL)
# DB_HOST=127.0.0.1
# DB_PORT=5432
# DB_USER=postgres
# DB_PASSWORD=<password>
# DB_NAME=flashcard_db

JWT_SECRET=<secret>
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=<your-google-client-id>
GEMINI_API_KEY=<key>
CORS_ORIGIN=http://localhost:5173

# Audio khoá học (Supabase Storage)
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SECRET_KEY=<secret key, chỉ để ở server>
```

Tạo bảng: chạy `backend/database/schema.sql` trên DB (SQL Editor của Supabase hoặc `psql`).

#### `frontend/.env.local`

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_GOOGLE_CLIENT_ID=<your-google-client-id>
```

#### Cài dependencies và chạy

```powershell
cd backend; npm install; npm run dev     # Server running on port 8080
cd frontend; npm install; npm run dev    # Mở http://localhost:5173
```

Kiểm tra nhanh:

```
http://localhost:8080/api/health     → { "status": "ok" }
http://localhost:8080/api/db-test    → { "database": "connected" }
```

Chạy test backend: `cd backend; npm test`.

---

## Quy trình push / deploy

- **Frontend**: push `main` → Vercel tự build và deploy.
- **Backend**: push `main` → Render tự build và deploy (cấu hình trong `render.yaml`).
- **Migration DB không tự chạy**: chạy tay trên Supabase (SQL Editor) TRƯỚC khi push code cần bảng/cột mới.
- Biến môi trường production đặt trong Render (backend) và Vercel (frontend), không đọc từ file `.env`.

### Script dữ liệu (chạy trên máy, trong `backend/`)

| Lệnh | Việc |
|---|---|
| `npm run chuyen:mysql -- --apply` | Chép dữ liệu từ MySQL cũ (biến `MYSQL_*`) sang Postgres (`DATABASE_URL`), giữ id |
| `npm run tai:audio -- --apply` | Tải audio `private-content/khoa-hoc-48-ngay/bai-XX/audio` lên Supabase Storage |
| `npm run seed:roadmaps` | Nạp lộ trình học từ `database/content/lo-trinh.json` |
| `npm run nhap:khoa-hoc -- --email=<email> --apply` | Nạp khoá 48 buổi từ `private-content` |

---

## Cấu trúc project

```
LearnTA-flscard/
├── backend/
│   ├── database/
│   │   ├── schema.sql            # Schema Postgres (Supabase)
│   │   ├── seed.sql              # Dữ liệu mẫu
│   │   ├── content/              # lo-trinh.json
│   │   └── mysql-legacy/         # Schema + migration MySQL cũ (tham khảo)
│   ├── src/
│   │   ├── config/               # env.js, db.js
│   │   ├── controllers/          # authController, deckController...
│   │   ├── middleware/           # authMiddleware
│   │   ├── routes/               # authRoutes, deckRoutes...
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   └── rewards/              # Video reward
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/             # AuthContext, PageTransitionContext
│   │   ├── pages/                # TrangDangNhap, TrangDangKy, TrangDanhSachBo...
│   │   ├── services/             # api.js, authApi.js, deckApi.js...
│   │   ├── App.jsx
│   │   └── index.css
│   └── package.json
│
├── render.yaml                   # Cấu hình Render (backend)
└── .gitignore
```

---

## API endpoints

```
GET    /api/health
GET    /api/db-test

POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/google           # Đăng nhập bằng Google OAuth
GET    /api/auth/me

GET    /api/decks
POST   /api/decks
GET    /api/decks/:id
PUT    /api/decks/:id
DELETE /api/decks/:id

GET    /api/decks/:id/cards
POST   /api/decks/:id/cards
POST   /api/decks/:id/cards/import
PUT    /api/cards/:id
PATCH  /api/cards/:id/favorite
DELETE /api/cards/:id

POST   /api/study-sessions
PATCH  /api/study-sessions/:id/finish
POST   /api/study-sessions/:id/answers
POST   /api/quiz-results
GET    /api/decks/:id/quiz-results/latest

GET    /api/cards/:id/progress
PATCH  /api/cards/:id/progress
GET    /api/decks/:id/progress-summary
```

Các endpoint cần auth phải gửi header:
```
Authorization: Bearer <token>
```

---

## Tính năng chính

- Đăng ký / đăng nhập bằng email hoặc Google OAuth
- Quản lý bộ từ (deck): tạo, sửa, xóa
- Quản lý từ vựng: thêm, sửa, xóa, yêu thích, import nhiều từ
- Học flashcard (lật thẻ, đánh dấu nhớ/chưa nhớ)
- Quiz trắc nghiệm 4 đáp án
- Luyện tự luận
- Theo dõi tiến độ học tập
- Reward video khi đạt mốc câu đúng
