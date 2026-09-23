# PROJECT_CONTEXT.md

> Cap nhat: 2026-09-23. File nay mo ta trang thai THAT cua code tren `main`.
> Khi code thay doi lon (route, bang DB, luong auth), cap nhat lai file nay.

## 1. Ten du an

**LearnTA / Streak Drop** — ung dung web hoc tu vung tieng Anh cho nguoi Viet.

Nguoi dung tao bo tu (deck), them cap tu Anh - Viet, hoc bang flashcard, quiz trac nghiem, tu luan, on tap theo lich SRS, xem so tu sai, thong ke, streak, va hoi chatbot AI (LearnBot).

- Frontend: https://dungdinh-vocab.vercel.app (Vercel)
- Backend: Google Cloud Run
- Database: Google Cloud SQL (MySQL 8)

---

## 2. Trang thai hien tai

```txt
Status: Dang chay production (single user la chu du an)
Frontend: React/Vite, goi API that qua services/*; con mock data lam fallback khi API loi
Backend: Express 5 + MySQL, day du CRUD, auth JWT + Google, SRS, mistakes, stats, email, chatbot
Tests: node:test (backend) + vitest (frontend), chay tren GitHub Actions
```

### Viec con ton dong

- `TrangTuLuan.jsx` (~1800 dong), `TrangChiTietBo.jsx` (~1800), `TrangQuiz.jsx` (~1400) qua lon; Quiz va Tu luan lap nhieu logic (combo, reward, luu tien do). Nen tach dan, moi lan 1 trang.
- Frontend lint co 17 loi san (chu yeu `react-hooks/set-state-in-effect`, tap trung o `RewardTikTokEffect.jsx`). CI dang de lint `continue-on-error`.
- Dependency `resend` trong `backend/package.json` khong duoc dung (email gui qua Nodemailer/Gmail).
- Video reward (~70 MB) nam trong `frontend/public/media/milestones/` va lich su git.

---

## 3. Tech stack

### Frontend (`frontend/`)

- React 19, Vite 8, JavaScript, React Router DOM 7
- Tailwind CSS 4 + design tokens trong `index.css` (xem `DESIGN.md`)
- Animation: GSAP, `motion`, Lottie, Rive
- Axios (`services/api.js`, tu gan Bearer token)
- Vitest cho unit test

### Backend (`backend/`)

- Node.js >= 20, Express 5, `mysql2/promise`
- Auth: `jsonwebtoken` (HS256), `bcrypt`, `google-auth-library` (Google Sign-In)
- `zod` (validate body chat), `express-rate-limit`
- `@google/generative-ai` (Gemini): chatbot + sinh cau vi du theo thi
- `nodemailer` (Gmail SMTP) cho email nhac hoc; `node-cron` (chi dung khi `ENABLE_INTERNAL_CRON=true`)
- `node:test` cho unit test

---

## 4. Cau truc repo

```txt
LearnTA-flscard/
  .github/workflows/ci.yml     CI: test + build FE/BE, lint FE (khong chan)
  frontend/
    public/
      animation/ background/ sound/
      media/milestones/        video reward + videos.json (manifest)
    src/
      App.jsx                  routes + ChatbotWidget
      main.jsx                 providers: PageTransition > Toast > Auth > Chatbot
      config/api.js            API base URL
      components/
        auth/ProtectedRoute.jsx
        common/                BoCuc (layout), EmptyState, Skeleton, StudyResult, ...
        ChatbotWidget.jsx      LearnBot
        RewardTikTokEffect.jsx reward video overlay
      contexts/                AuthContext, ToastContext, PageTransitionContext, ChatbotContext
      data/                    duLieuMau.js (mock fallback), tenseExamples.js
      hooks/                   useCombo, useTTS, useSoundEffect
      pages/                   Trang*.jsx (xem muc 5)
      services/                api.js + authApi, deckApi, cardApi, studyApi, reviewApi, ...
      utils/                   srsReview, mistakeNotebook, tienDoHocTap, caiDatHocTap, ...
  backend/
    src/
      server.js                khoi dong, check DB, bat cron noi bo neu co flag
      app.js                   CORS, trust proxy, mount routes, error handler
      config/                  db.js, env.js
      middleware/authMiddleware.js   requireAuth / optionalAuth
      controllers/             auth, deck, card, study, progress, mistake, review, user
      routes/                  *Routes.js
      services/                aiService, chatContextService, emailService, reminderService, streakService, cronService
      utils/                   asyncHandler, http, cardProgress
    database/
      schema.sql               schema day du
      seed.sql                 bo tu mau (user_id NULL)
      migrations/001..006      migration theo thu tu
    scripts/                   seed-examples, seed-ai-examples, migration runners
    test/                      *.test.js (node:test)
  docs/google-cloud-deploy.md  huong dan deploy Cloud Run + Cloud SQL
  CLAUDE.md AGENTS.md PRODUCT.md DESIGN.md README.md PROJECT_CONTEXT.md
```

---

## 5. Routes frontend

```txt
/                         TrangChu            public
/login, /register         TrangDangNhap/DangKy public
/decks                    TrangDanhSachBo     public
/decks/:deckId            TrangChiTietBo      public
/decks/:deckId/flashcard  TrangFlashcard      public
/decks/:deckId/quiz       TrangQuiz           public
/decks/:deckId/tu-luan    TrangTuLuan         public
/dashboard                TrangDashboard      can dang nhap
/tu-sai                   TrangTuSai          can dang nhap (so tu sai)
/review                   TrangOnTapHomNay    can dang nhap (on tap SRS)
/stats                    TrangThongKe        can dang nhap
/decks/:deckId/add-word   TrangThemTu         can dang nhap
/cai-dat                  TrangCaiDat         can dang nhap
```

`/`, `/login`, `/register` dung video background "immersive" va khong hien ChatbotWidget. Cac trang con lai dung nen phang + ChatbotWidget.

---

## 6. API backend

Base: `/api`. "auth" = can `Authorization: Bearer <jwt>`.

```txt
GET    /health, /db-test

POST   /auth/register | /auth/login | /auth/google     rate limit 10 req/15 phut/IP
GET    /auth/me                                         auth

GET    /decks | /decks/:deckId                          optional auth
POST   /decks, PUT|DELETE /decks/:deckId                auth, chi chu deck

GET    /decks/:deckId/cards
POST   /decks/:deckId/cards | /decks/:deckId/cards/import
PATCH  /decks/:deckId/cards/reorder
PUT|DELETE /cards/:cardId, PATCH /cards/:cardId/favorite
POST   /cards/generate-examples                         Gemini sinh cau vi du theo thi

GET|PATCH /cards/:cardId/progress, GET /decks/:deckId/progress-summary
GET|POST  /study-sessions, GET /study-sessions/summary
PATCH     /study-sessions/:id/finish, POST /study-sessions/:id/answers
POST      /quiz-results, GET /decks/:deckId/quiz-results/latest

GET|POST|DELETE /mistakes, POST /mistakes/bulk, PATCH|DELETE /mistakes/:id
GET /reviews, /reviews/due; POST /reviews, /reviews/bulk
PATCH /reviews/:id/result, /reviews/by-card/:cardId/result; DELETE tuong ung

GET /user/stats, GET|PATCH /user/settings               auth

POST /chat                                              optional auth, rate limit 20 req/phut
POST /cron/daily-reminders | /cron/praise               header X-Cron-Secret
```

### Quyen doc/ghi deck (theo code `deckController.canReadDeck` / `canWriteDeck`)

- Doc: deck mau (`user_id IS NULL`), deck `is_public = TRUE`, hoac deck cua chinh user.
- Anonymous: `GET /decks` tra deck mau + deck public.
- Da dang nhap: `GET /decks` tra deck cua minh + deck mau + deck public.
- Ghi (sua/xoa deck, card): chi chu deck (`user_id` = user trong token). Deck mau khong ai sua duoc qua API.

### Chatbot `/api/chat`

- Body: `{ messages: [{ role: "user"|"model", parts: [{ text }] }], context?: { deckId?, cardId? } }`.
- Validate bang zod: toi da 200 tin, moi tin <= 2000 ky tu, tin cuoi phai la `user`. Server chi giu 20 tin gan nhat va bo cac tin `model` o dau (Gemini bat buoc history bat dau bang `user`).
- `chatContextService` doc tu DB theo id (co check `canReadDeck`): the dang hoc, toi da 30 tu trong deck, toi da 10 tu sai nhieu nhat (neu dang nhap), roi noi vao system prompt. Khong tin noi dung client gui.
- Frontend: cac trang hoc dat `<ChatbotTheDangHoc the={...} />` de bao the dang hien thi; widget lay `deckId` tu URL.

---

## 7. Database

Schema day du: `backend/database/schema.sql`. Bang:

| Bang | Vai tro |
|---|---|
| `users` | tai khoan (`password_hash` bcrypt hoac `google_id`), `current_streak`, `longest_streak`, `last_study_date` |
| `decks` | bo tu; `user_id NULL` = deck mau; `is_public`, `streak`, `mastered_count` |
| `cards` | tu; `term_en`, `meaning_vi`, `example_sentence`, `note`, `pronunciation`, `part_of_speech`, `is_favorite`, `sort_order` (+ `tense_examples` JSON, xem luu y duoi) |
| `study_sessions`, `study_answers` | phien hoc va tung cau tra loi |
| `card_progress` | mastery 0-5 theo user/card, `next_review_at` |
| `mistake_words` | so tu sai, dem `mistake_count` |
| `card_reviews` | hang doi on tap SRS dong bo voi client |
| `quiz_results` | ket qua quiz |
| `streak_logs` | log hoc theo ngay (gio VN, UTC+7) |
| `user_settings` | cai dat hoc (+ `email_reminders`, xem luu y duoi) |

Luu y: `schema.sql` CHUA co 2 cot duoc them bang script rieng:

- `cards.tense_examples` — `npm run migrate:tense-examples`
- `user_settings.email_reminders` — `backend/database/add_email_reminders.sql` (hoac `node scripts/run-migration.js`)

Dung DB moi tu `schema.sql` thi phai chay them 2 buoc nay.

Migration moi: them file `backend/database/migrations/00N_*.sql`, cap nhat `schema.sql` cho khop.

---

## 8. Du lieu phia client (localStorage)

| Key | File | Noi dung |
|---|---|---|
| `hocTA.authToken` | `services/api.js` | JWT |
| `hocTA.cardFavorites` | `data/duLieuMau.js` | favorite cua mock data |
| `hoc_tu_vung_progress` | `utils/tienDoHocTap.js` | tien do flashcard/quiz gan nhat theo deck |
| `learnta_user_study_settings` | `utils/caiDatHocTap.js` | cai dat hoc theo mode |
| `streak_drop_srs_v1` | `utils/srsReview.js` | hang doi SRS; dong bo 2 chieu voi `/reviews` |
| `streak_drop_mistake_notebook_v1` | `utils/mistakeNotebook.js` | so tu sai; dong bo voi `/mistakes` |
| `streak_drop_study_sessions_v1` | `utils/studySessionHistory.js` | lich su phien hoc |

SRS client (`srsReview.js`): ease `again` -1 level (on lai sau 4 gio), `hard` giu level (+1 ngay), `good` +1 (+3 ngay), `easy` +2 (+7 ngay); level 5 = mastered. Khi merge voi backend giu level/reviewCount lon hon.

Backend `cardProgress`: dung +1 / sai -1 mastery (0-5); on lai sau 1 ngay (level 0-1), 3 ngay (2-3), 7 ngay (4), 14 ngay (5).

---

## 9. Tinh nang chinh

- **Deck/card**: CRUD, import nhieu dong (`word - meaning`, `word, meaning`, `word | meaning`), sap xep keo tha, yeu thich, loc Tat ca/Yeu thich/Moi them.
- **Flashcard**: 2 chieu, Space lat the, mui ten chuyen the, TTS, cau vi du theo 6 thi (`TenseExamplesCard`).
- **Quiz trac nghiem**: can >= 4 tu, 1 dung + 3 nhieu chon theo do dai gan nhau; combo, am thanh, reward.
- **Tu luan**: go dap an, chuan hoa trim/lowercase/khoang trang, bo qua de xem dap an.
- **Reward**: video tu `media/milestones/videos.json`, kich hoat khi du so cau dung (mac dinh 10); ton trong `prefers-reduced-motion`.
- **On tap hom nay** (`/review`) va **So tu sai** (`/tu-sai`): SRS client + dong bo backend.
- **Dashboard / Thong ke / Streak**: `GET /user/stats`, streak tinh theo ngay VN.
- **Email**: 18:00 VN khen user da hoc, 23:00 VN nhac user chua hoc. Production goi qua Cloud Scheduler -> `/api/cron/*`.
- **LearnBot**: xem muc 6. Render markdown sau khi escape HTML.

---

## 10. Bien moi truong

### Backend (`backend/.env`, tren Cloud Run dat trong service config)

```txt
# DB: local dung DB_HOST/DB_PORT qua Cloud SQL Auth Proxy; Cloud Run dung INSTANCE_CONNECTION_NAME
DB_HOST DB_PORT DB_USER DB_PASSWORD DB_NAME
INSTANCE_CONNECTION_NAME DB_SOCKET_PATH
JWT_SECRET JWT_EXPIRES_IN
GOOGLE_CLIENT_ID
CORS_ORIGIN                 danh sach cach nhau boi dau phay
GEMINI_API_KEY
GMAIL_USER GMAIL_APP_PASS
CRON_SECRET
ENABLE_INTERNAL_CRON        "true" de chay node-cron noi bo (mac dinh tat)
PORT                        mac dinh 8080
```

### Frontend (`frontend/.env.local`)

```txt
VITE_API_BASE_URL           mac dinh dev: http://localhost:8080
VITE_GOOGLE_CLIENT_ID
```

---

## 11. Chay, test, deploy

```bash
# Backend (can Cloud SQL Auth Proxy hoac MySQL local, xem README.md)
cd backend && npm install && npm run dev      # http://localhost:8080
npm test                                      # node --test, khong can DB

# Frontend
cd frontend && npm install && npm run dev     # http://localhost:5173
npm test                                      # vitest
npm run build
npm run lint
```

Scripts du lieu (chay tu `backend/`): `npm run seed:examples`, `npm run seed:ai-examples`, `npm run migrate:tense-examples`, `node scripts/run-migration.js`.

Deploy:

- Frontend: Vercel tu deploy khi `main` thay doi (`frontend/vercel.json` rewrite SPA).
- Backend: Cloud Run, xem `docs/google-cloud-deploy.md`.

---

## 12. Nguyen tac khi sua code

1. Doc `CLAUDE.md` va chay `git status --short` truoc khi sua.
2. Giu phong cach dat ten tieng Viet (`TrangXxx`, `layXxx`, `luuXxx`) va copy UI tieng Viet co dau.
3. Moi goi API qua `frontend/src/services/*`, khong goi axios truc tiep trong page.
4. Route backend moi: validate input (`utils/http.js` hoac zod), boc `asyncHandler`, check quyen bang `canReadDeck`/`canWriteDeck`.
5. Khong tin du lieu client cho noi dung se dua vao prompt AI hoac DB; chi nhan id roi doc lai tu DB.
6. Them test cho logic thuan (utils/services) khi sua; CI phai xanh.
7. Reward/animation la lop phu, khong duoc lam hong luong hoc; test ca desktop va mobile.
8. Khong commit `node_modules`, `.env`, file media ban quyen.
9. Khong them tai khoan demo seed tru khi duoc yeu cau; test auth bang cach dang ky user moi.

---

## 13. Ghi chu encode

File nay viet tieng Viet khong dau de tranh loi encoding tren terminal Windows. Source UI van dung tieng Viet co dau.
