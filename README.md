# LearnTA — Flashcard & Quiz App

Ứng dụng học từ vựng tiếng Anh bằng flashcard, quiz trắc nghiệm và tự luận.

- **Frontend**: React + Vite → deploy trên **Vercel**
- **Backend**: Node.js + Express → deploy trên **Google Cloud Run**
- **Database**: MySQL → **Google Cloud SQL**

---

## Chạy local để phát triển (FE + BE)

### Yêu cầu (cài 1 lần)

| Công cụ | Lý do cần |
|---|---|
| Node.js ≥ 20 | Chạy FE + BE |
| Google Cloud SDK (`gcloud`) | Auth với GCP |
| Cloud SQL Auth Proxy | Kết nối DB từ local |

#### Cài Google Cloud SDK

Tải và cài tại: https://cloud.google.com/sdk/docs/install

Sau khi cài, mở terminal **mới** và đăng nhập:

```powershell
gcloud auth application-default login
```

#### Tải Cloud SQL Auth Proxy

```powershell
# Windows — đặt vào thư mục gốc project (đã có trong .gitignore)
Invoke-WebRequest -Uri "https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.22.1/cloud-sql-proxy.x86.exe" -OutFile "cloud-sql-proxy.x86.exe"
```

---

### Cấu hình lần đầu

#### `backend/.env` — copy từ mẫu dưới

```env
# Chạy LOCAL — dùng Cloud SQL Auth Proxy
# INSTANCE_CONNECTION_NAME=flash-card-499907:asia-southeast1:flashcard-mysql  ← bỏ comment khi deploy Cloud Run
DB_HOST=127.0.0.1
DB_PORT=3307
DB_USER=app_user
DB_PASSWORD=<password>
DB_NAME=flashcard_db

JWT_SECRET=<secret>
JWT_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=<your-google-client-id>

# CORS
CORS_ORIGIN=http://localhost:5173,https://dungdinh-vocab.vercel.app
NODE_ENV=development
```

#### `frontend/.env.local` — copy từ mẫu dưới

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_GOOGLE_CLIENT_ID=<your-google-client-id>
```

#### Cài dependencies (1 lần)

```powershell
cd backend && npm install
cd ../frontend && npm install
```

---

### Chạy hàng ngày (3 terminal)

> **Thứ tự quan trọng**: Proxy → Backend → Frontend

**Terminal 1 — Cloud SQL Proxy** (giữ mở suốt)

```powershell
.\cloud-sql-proxy.x86.exe flash-card-499907:asia-southeast1:flashcard-mysql --port=3307
# Thành công khi thấy: Listening on 127.0.0.1:3307
```

**Terminal 2 — Backend**

```powershell
cd backend
npm run dev
# Thành công khi thấy: Server running on port 8080
```

**Terminal 3 — Frontend**

```powershell
cd frontend
npm run dev
# Mở http://localhost:5173
```

#### Kiểm tra nhanh

```
http://localhost:8080/api/health     → { "status": "ok" }
http://localhost:8080/api/db-test    → { "database": "connected" }
```

---

## Quy trình push / deploy khi xong một tính năng

### Frontend — Vercel tự deploy

```powershell
git add .
git commit -m "feat: mô tả tính năng"
git push origin main
```

Vercel tự động build và deploy sau vài giây. Không cần làm gì thêm.

### Backend — Deploy thủ công lên Cloud Run

File `backend/.env` **không bao giờ được đưa vào Docker image** (nhờ `.dockerignore`).
Cloud Run đọc env vars từ service config riêng → **không cần sửa `.env` trước khi deploy**.

```powershell
cd backend
gcloud run deploy <tên-service> --source . --region asia-southeast1
```

> **Env vars trên Cloud Run** phải được set riêng (1 lần, trừ khi thêm biến mới):
> ```powershell
> gcloud run services update <tên-service> --region asia-southeast1 \
>   --set-env-vars "INSTANCE_CONNECTION_NAME=flash-card-499907:asia-southeast1:flashcard-mysql,GOOGLE_CLIENT_ID=<id>"
> ```

---

## Cấu trúc project

```
LearnTA-flscard/
├── backend/
│   ├── database/
│   │   ├── schema.sql            # Schema DB
│   │   ├── seed.sql              # Dữ liệu mẫu
│   │   └── add_google_auth.sql   # Migration: thêm cột google_id
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
├── cloud-sql-proxy.x86.exe       # Local only — gitignored
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
