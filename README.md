# LearnTA — Flashcard & Quiz App

Ứng dụng học từ vựng tiếng Anh bằng flashcard, quiz trắc nghiệm, tự luận và khoá học 48 buổi.

| Phần | Công nghệ | Chạy ở |
|---|---|---|
| Frontend | React 19 + Vite | **Vercel** — https://dungdinh.vercel.app |
| Backend | Node.js + Express 5 | **Render** free web service `flashcard-backend` — https://flashcard-backend-j62b.onrender.com |
| CSDL | PostgreSQL 17 | **Supabase** gói Free (Singapore) |
| Audio khoá học | — | **Supabase Storage**, bucket private `course-audio` |
| Đăng nhập Google | OAuth client "Flash Card Web Client" | Google Cloud project `flash-card-499907` (chỉ còn giữ phần này) |

Tài liệu vận hành (biến môi trường, deploy, migration, giữ thức, sao lưu, xử lý sự cố): [`docs/deploy-render-supabase.md`](docs/deploy-render-supabase.md).

Từ 19/10/2026 dự án đã rời Google Cloud (Cloud SQL, Cloud Run, Cloud Storage, Cloud Scheduler). Chức năng gửi email (chào mừng, nhắc học, khen) đã bỏ.

---

## Chạy local (FE + BE)

### Yêu cầu

| Công cụ | Lý do cần |
|---|---|
| Node.js ≥ 20 | Chạy FE + BE (Render dùng Node 22) |
| Chuỗi kết nối Supabase, hoặc PostgreSQL local | CSDL |

Lưu ý: nếu `backend/.env` trỏ vào Supabase thì máy dev đang dùng **DB production**. Bấm thử sẽ ghi dữ liệu thật.

### `backend/.env` — copy từ `backend/.env.example`

```env
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/postgres
DB_SSL=true
JWT_SECRET=<chuỗi ngẫu nhiên>
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=<client id>
GEMINI_API_KEY=<key>
CORS_ORIGIN=http://localhost:5173
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SECRET_KEY=<secret key, chỉ để ở server>
COURSE_AUDIO_BUCKET=course-audio
```

Postgres local: để trống `DATABASE_URL`, đặt `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`. Tạo bảng bằng `backend/database/schema.sql` (`psql` hoặc Supabase SQL Editor).

### `frontend/.env.local`

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_GOOGLE_CLIENT_ID=<client id>
```

Biến `VITE_*` là công khai (nhúng vào bundle). Không đặt khoá bí mật vào đây.

### Cài và chạy

```powershell
cd backend; npm install; npm run dev     # Server running on port 8080
cd frontend; npm install; npm run dev    # http://localhost:5173
```

Kiểm tra nhanh:

```txt
http://localhost:8080/api/health     → { "status": "ok", ... }
http://localhost:8080/api/db-test    → { "status": "ok", "database": "connected", ... }
```

### Test

| Lệnh | Ghi chú |
|---|---|
| `cd backend; npm test` | `node:test`, không cần DB |
| `cd frontend; npx vitest run` | Vitest |
| `cd frontend; npm run lint; npx vite build` | CI chặn khi có lỗi lint |

---

## Deploy

| Việc | Cách làm |
|---|---|
| Frontend | Push/merge vào `main` → Vercel tự build và deploy. |
| Backend | Push/merge vào `main` → Render tự build và deploy theo `render.yaml`. |
| Migration DB | **Không tự chạy.** Viết SQL Postgres, cập nhật `schema.sql`, chạy tay trên Supabase SQL Editor **trước** khi push code cần bảng/cột mới. |
| Biến môi trường production | Đặt trên Render (backend) và Vercel (frontend). Không đọc từ file `.env`. |

Gói free: Render ngủ sau 15 phút không có request (lần đầu chờ 30–60 giây); Supabase tự tạm dừng sau 7 ngày không truy cập (có workflow `.github/workflows/giu-thuc.yml` gọi `/api/db-test` mỗi ngày).

### Script dữ liệu (chạy trên máy, trong `backend/`)

| Lệnh | Việc |
|---|---|
| `npm run chuyen:mysql [-- --apply]` | Chép dữ liệu từ MySQL cũ (biến `MYSQL_*`) sang Postgres (`DATABASE_URL`), giữ id. Không `--apply` là xem trước. |
| `npm run tai:audio [-- --apply] [--bai=XX]` | Tải audio `private-content/khoa-hoc-48-ngay/bai-XX/audio` lên Supabase Storage. Không `--apply` là xem trước. |
| `npm run seed:roadmaps` | Nạp lộ trình từ `database/content/lo-trinh.json` (chạy lại an toàn). |
| `npm run nhap:khoa-hoc -- --email=<email> --apply` | Nạp khoá 48 buổi từ `private-content`. |
| `npm run sinh:luyen-them -- --bai=XX` | Gemini sinh bài luyện thêm vào `bai-XX/extra.json`. |
| `npm run sinh:giai-thich -- ...` | Soạn sẵn lời giải thích AI cho câu bài tập. |
| `npm run seed:examples`, `npm run seed:ai-examples` | Câu ví dụ / ví dụ 6 thì cho thẻ. |

---

## Cấu trúc project

```txt
LearnTA-flscard/
├── backend/
│   ├── database/
│   │   ├── schema.sql            # Schema Postgres (18 bảng)
│   │   ├── seed.sql              # Bộ từ mẫu
│   │   ├── content/              # lo-trinh.json
│   │   ├── mysql-legacy/         # Schema + migration MySQL cũ (chỉ tham khảo)
│   │   └── private-content/      # Nội dung khoá học riêng (.gitignore, không commit)
│   ├── scripts/                  # chuyen-du-lieu-mysql, tai-audio-supabase, nhap-khoa-hoc...
│   ├── src/
│   │   ├── config/               # env.js, db.js (wrapper pg kiểu mysql2)
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/               # *Routes.js — danh sách API đầy đủ
│   │   ├── services/             # aiService, audioStorage, chatContextService, luotGemini, streakService
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   ├── test/
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/ contexts/ hooks/ pages/ services/ utils/
│   │   ├── App.jsx
│   │   └── index.css
│   └── package.json
├── docs/                         # deploy-render-supabase.md, khoa-hoc-48-ngay.md, báo cáo theo ngày
├── .github/workflows/            # ci.yml, giu-thuc.yml
├── render.yaml                   # Blueprint Render (backend)
└── .gitignore
```

---

## API endpoints

Base `/api`. Mount trong `backend/src/app.js`, chi tiết trong `backend/src/routes/*.js`. "auth" = cần header `Authorization: Bearer <token>`; "tuỳ chọn" = có token thì trả thêm dữ liệu của người dùng.

| Nhóm | Endpoint | Quyền |
|---|---|---|
| Hệ thống | `GET /health`, `GET /db-test` | công khai |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/google` | công khai, có rate limit |
| Auth | `GET /auth/me` | auth |
| Bộ từ | `GET /decks`, `GET /decks/:deckId` | tuỳ chọn |
| Bộ từ | `POST /decks`, `PUT /decks/:deckId`, `DELETE /decks/:deckId` | auth |
| Thẻ | `GET /decks/:deckId/cards`, `POST /decks/:deckId/cards`, `POST /decks/:deckId/cards/import`, `PATCH /decks/:deckId/cards/reorder` | xem `cardRoutes.js` |
| Thẻ | `PUT /cards/:cardId`, `PATCH /cards/:cardId/favorite`, `DELETE /cards/:cardId` | auth |
| Thẻ + AI | `POST /cards/generate-examples`, `POST /cards/generate-words`, `POST /cards/check-sentence`, `POST /cards/:cardId/translate-example` | xem `cardRoutes.js` |
| Phiên học | `GET /study-sessions`, `GET /study-sessions/summary`, `POST /study-sessions`, `PATCH /study-sessions/:sessionId/finish`, `POST /study-sessions/:sessionId/answers` | xem `studyRoutes.js` |
| Quiz | `POST /quiz-results`, `GET /decks/:deckId/quiz-results/latest` | xem `studyRoutes.js` |
| Tiến độ | `GET /cards/:cardId/progress`, `PATCH /cards/:cardId/progress`, `GET /decks/:deckId/progress-summary` | xem `progressRoutes.js` |
| Từ sai | `GET /mistakes`, `POST /mistakes`, `POST /mistakes/bulk`, `PATCH /mistakes/:mistakeId`, `DELETE /mistakes/:mistakeId`, `DELETE /mistakes` | auth |
| Ôn tập SRS | `GET /reviews`, `GET /reviews/due`, `POST /reviews`, `POST /reviews/bulk`, `PATCH /reviews/by-card/:cardId/result`, `DELETE /reviews/by-card/:cardId` | auth |
| Người dùng | `GET /user/stats`, `GET /user/settings`, `PATCH /user/settings` | auth |
| Lộ trình | `GET /roadmaps`, `GET /roadmaps/:slug` | tuỳ chọn |
| Khoá học | `GET /courses`, `GET /courses/:courseId/lessons/:lessonNumber`, `GET /course-questions/due` | auth |
| Khoá học | `GET /course-questions/:questionId/audio` | auth, chỉ chủ khoá |
| Khoá học | `POST /course-questions/:questionId/answer`, `/prepare`, `/explain`, `/explanation-feedback` | auth |
| Chatbot | `POST /chat` | tuỳ chọn, rate limit |
| Lỗi client | `POST /client-errors` | công khai, rate limit |

Mô tả chi tiết từng endpoint (body, rate limit, quyền đọc/ghi deck): `PROJECT_CONTEXT.md` mục 6.

---

## Tính năng chính

- Đăng ký / đăng nhập bằng email hoặc Google OAuth
- Khoá học riêng 48 buổi: từ vựng, lý thuyết, bài tập có AI giải thích, bài nghe, ôn câu sai theo SRS
- Lộ trình từ vựng công khai
- Quản lý bộ từ và thẻ: tạo, sửa, xoá, yêu thích, sắp xếp, thêm nhanh (dán danh sách hoặc AI tạo từ)
- Luyện tập: Flashcard, Trắc nghiệm, Tự luận, Nghe viết, Ngữ cảnh, Nối từ, Hỗn hợp, Luyện câu
- Ôn tập theo lịch SRS, sổ từ sai, thống kê, streak
- Phát âm bằng Web Speech API của trình duyệt
- Chatbot AI (LearnBot)
- Video thưởng khi đạt mốc câu đúng
