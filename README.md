# English Flashcard & Quiz App

Ung dung hoc tu vung tieng Anh bang flashcard, quiz trac nghiem, luyen tu luan va hieu ung reward khi nguoi hoc dat moc cau dung.

Project hien gom hai phan chinh:

- `frontend`: React/Vite, giao dien hoc tap va goi API.
- `backend`: Node.js/Express, MySQL, JWT auth va cac API quan ly du lieu hoc tap.

## Tinh nang chinh

- **Dang ky / dang nhap**: xac thuc nguoi dung bang JWT.
- **Danh sach bo tu**: xem cac deck hien co, mo chi tiet deck, them, sua va xoa deck.
- **Chi tiet bo tu**: xem danh sach tu trong deck, theo doi tien do hoc gan nhat.
- **Quan ly tu vung**: them, sua, xoa tu, danh dau yeu thich va import nhanh nhieu tu.
- **Flashcard**:
  - Lat the bang click hoac phim `Space`.
  - Chuyen the bang nut truoc/sau hoac phim mui ten.
  - Ho tro 2 chieu hoc: English -> Vietnamese va Vietnamese -> English.
  - Danh dau "Nho roi" hoac "Chua nho".
- **Quiz trac nghiem**:
  - Tao cau hoi tu danh sach card trong deck.
  - Moi cau co 4 dap an, gom 1 dap an dung va 3 dap an nhieu.
  - Tu chuyen cau sau khi chon dap an.
  - Co man hinh tong ket cuoi bai.
- **Tu luan**: luyen go dap an theo tung tu/cum tu.
- **Tien do hoc tap**:
  - Luu study session, ket qua quiz va tien do card qua backend.
  - Mot so tuy chon/phu tro van co the dung `localStorage` tren frontend.
- **Reward khi dung X cau**:
  - Co the bat/tat reward trong man quiz.
  - Co the chinh so cau dung de kich hoat phan thuong.
  - Khi dat moc, app chon ngau nhien mot video reward trong `frontend/public/rewards/`.

## Cong nghe su dung

### Frontend

- React
- Vite
- React Router DOM
- Axios
- Tailwind CSS
- JavaScript
- GSAP / Motion / Rive / Lottie cho hieu ung va animation

### Backend

- Node.js
- Express
- MySQL
- JWT
- bcrypt
- Zod
- dotenv

## Cau truc project

```txt
.
  backend/
    database/
      schema.sql
      seed.sql
      migrations/
    src/
      config/
      controllers/
      middleware/
      routes/
      utils/
      app.js
      server.js
    package.json

  frontend/
    public/
      animation/
      background/
      rewards/
    src/
      components/
      contexts/
      data/
      hooks/
      pages/
      services/
      utils/
      App.jsx
      main.jsx
      index.css
    package.json
```

## Yeu cau moi truong

- Node.js
- npm
- MySQL

## Cau hinh database

Chay script tao database/schema:

```txt
backend/database/schema.sql
```

Sau do co the nap du lieu mau:

```txt
backend/database/seed.sql
```

Luu y: can dam bao ten database trong `schema.sql`, `seed.sql` va bien `DB_NAME` trong `.env` thong nhat voi nhau.

## Cau hinh backend

Tao file `.env` trong thu muc `backend/`:

```env
INSTANCE_CONNECTION_NAME=project-id:region:instance-name
DB_USER=root
DB_PASSWORD=
DB_NAME=learn_ta_flashcard
JWT_SECRET=your-secret
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
```

Giai thich nhanh:

- `PORT`: cong backend Express.
- `INSTANCE_CONNECTION_NAME`: ten ket noi Cloud SQL khi deploy Cloud Run, dang `project-id:region:instance-name`.
- `DB_*`: thong tin ket noi MySQL. Khi co `INSTANCE_CONNECTION_NAME`, backend ket noi qua Cloud SQL socket va khong dung `DB_HOST`.
- `JWT_SECRET`: khoa ky token dang nhap.
- `CORS_ORIGIN`: frontend origin duoc phep goi API.

## Cau hinh frontend

Neu can chi dinh API backend, tao file `.env` trong thu muc `frontend/`:

```env
VITE_API_BASE_URL=http://localhost:3000
```

Neu khong cau hinh, frontend o che do dev se mac dinh goi `http://localhost:3000`.

## Cach chay project

### 1. Cai dependencies backend

```bash
cd backend
npm install
```

### 2. Chay backend

```bash
npm run dev
```

Backend mac dinh chay tai:

```txt
http://localhost:3000
```

Kiem tra nhanh:

```txt
http://localhost:3000/api/health
http://localhost:3000/api/db-test
```

### 3. Cai dependencies frontend

Mo terminal khac:

```bash
cd frontend
npm install
```

### 4. Chay frontend

```bash
npm run dev
```

Frontend mac dinh chay tai:

```txt
http://localhost:5173
```

### 5. Build production frontend

```bash
cd frontend
npm run build
```

### 6. Preview ban build frontend

```bash
npm run preview
```

## Scripts

### Backend

```bash
npm run dev
npm start
```

## Deploy Google Cloud

Backend da duoc chuan bi de deploy len Cloud Run va ket noi Cloud SQL for MySQL. Xem checklist va lenh deploy tai:

```txt
docs/google-cloud-deploy.md
```

### Frontend

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## Routes frontend chinh

```txt
/                         Trang chu
/login                    Dang nhap
/register                 Dang ky
/decks                    Danh sach bo tu
/decks/:deckId            Chi tiet bo tu
/decks/:deckId/add-word   Them tu
/decks/:deckId/flashcard  Hoc bang flashcard
/decks/:deckId/quiz       Lam quiz trac nghiem
/decks/:deckId/tu-luan    Luyen tu luan
```

## API backend chinh

Backend expose API duoi prefix `/api`.

```txt
GET    /api/health
GET    /api/db-test

POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET    /api/decks
GET    /api/decks/:deckId
POST   /api/decks
PUT    /api/decks/:deckId
DELETE /api/decks/:deckId

GET    /api/decks/:deckId/cards
POST   /api/decks/:deckId/cards
POST   /api/decks/:deckId/cards/import
PUT    /api/cards/:cardId
PATCH  /api/cards/:cardId/favorite
DELETE /api/cards/:cardId

POST   /api/study-sessions
PATCH  /api/study-sessions/:sessionId/finish
POST   /api/study-sessions/:sessionId/answers
POST   /api/quiz-results
GET    /api/decks/:deckId/quiz-results/latest

GET    /api/cards/:cardId/progress
PATCH  /api/cards/:cardId/progress
GET    /api/decks/:deckId/progress-summary
```

Mot so endpoint ghi du lieu yeu cau token dang nhap trong header:

```txt
Authorization: Bearer <token>
```

## Du lieu va luu tru

- Du lieu chinh duoc luu trong MySQL.
- Backend quan ly users, decks, cards, study sessions, study answers, card progress, quiz results, streak logs va user settings.
- Frontend luu auth token trong `localStorage` voi key `hocTA.authToken`.
- File `frontend/src/data/duLieuMau.js` van ton tai cho du lieu/phu tro mau cua frontend, nhung luong chinh hien goi API backend.

## Reward video

Video reward nam trong:

```txt
frontend/public/rewards/
```

Danh sach video co the cau hinh bang:

```txt
frontend/public/rewards/videos.json
```

## Trang thai hien tai

Project da co frontend, backend, database schema va luong dang nhap/dang ky. Cac luong hoc chinh co the dung:

- Dang ky / dang nhap
- Deck List -> Deck Detail
- Deck Detail -> Flashcard
- Deck Detail -> Quiz
- Deck Detail -> Tu luan
- Them/sua/xoa deck va card theo quyen dang nhap
- Luu ket qua hoc va tien do qua backend

## Ghi chu phat trien

- Can thong nhat ten database giua `schema.sql`, `seed.sql` va `.env`.
- Nen tao file `.env.example` cho backend va frontend de nguoi khac setup nhanh hon.
- Nen bo sung anh demo/screenshot cho cac man hinh chinh neu dung project trong portfolio.
