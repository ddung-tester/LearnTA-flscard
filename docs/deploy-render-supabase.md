# Vận hành: Supabase · Render · Vercel

Tài liệu vận hành chính của LearnTA Flashcard từ 19–20/10/2026. Thay cho `google-cloud-deploy.md` (đã xoá).

Lý do chuyển: ngày 09/10/2026 tài khoản thanh toán Google Cloud bị đóng, Cloud SQL bị khoá, app ngừng chạy.

## 1. Kiến trúc

```txt
Trình duyệt ──► Vercel (frontend React/Vite)          https://dungdinh.vercel.app
     │
     └──────► Render (backend Express, free)           https://flashcard-backend-j62b.onrender.com
                 ├──► Supabase Postgres 17 (Session pooler, SSL)
                 ├──► Supabase Storage, bucket private course-audio (audio bài nghe)
                 ├──► Gemini API (AI giải thích, chatbot, tạo từ)
                 └──► Google OAuth (xác minh ID token đăng nhập Google)

GitHub Actions ─► /api/db-test mỗi ngày (giữ thức)
Máy Windows    ─► pg_dump mỗi Chủ nhật (sao lưu)
```

| Thành phần | Dịch vụ | Chi tiết |
|---|---|---|
| CSDL | Supabase, gói Free, vùng Singapore | PostgreSQL 17. Kết nối qua **Session pooler** (`DATABASE_URL` + `DB_SSL=true`). |
| Audio khoá 48 ngày | Supabase Storage | Bucket **private** `course-audio`. Object: `khoa-hoc-48-ngay/bai-XX/audio/<file>`. |
| Backend | Render, free web service `flashcard-backend` | Blueprint `render.yaml`: region `singapore`, `rootDir: backend`, nhánh `main`, `healthCheckPath: /api/health`, Node 22. |
| Frontend | Vercel | Deploy từ `main`. `VITE_API_BASE_URL` = URL Render. |
| Đăng nhập Google | Google Cloud, project `flash-card-499907` | Chỉ còn OAuth client "Flash Card Web Client". **Không xoá project.** |
| Giữ thức | GitHub Actions | `.github/workflows/giu-thuc.yml`. |
| Sao lưu | Tác vụ Windows trên máy người dùng | Script ngoài repo, xem mục 7. |

### Giới hạn gói miễn phí

| Dịch vụ | Giới hạn | Ảnh hưởng |
|---|---|---|
| Supabase Free | 500 MB DB, 1 GB storage | Theo dõi dung lượng ở Supabase Dashboard. |
| Supabase Free | Tự tạm dừng sau 7 ngày không truy cập | Có workflow giữ thức (mục 6). |
| Supabase Free | Không tự sao lưu | Có sao lưu hằng tuần (mục 7). |
| Render Free | Ngủ sau 15 phút không có request | Request đầu tiên chờ 30–60 giây. |
| Render Free | Chặn cổng SMTP | Đã bỏ toàn bộ chức năng gửi email. |

### Bảo mật CSDL

- RLS đã bật trên mọi bảng trong schema `public`. Không có policy nên Data API (PostgREST) không đọc/ghi được gì.
- App **không dùng** Data API. Backend kết nối bằng role `postgres` (bỏ qua RLS) nên không bị ảnh hưởng.
- Khi tạo bảng mới: bật RLS cho bảng đó (`ALTER TABLE <bảng> ENABLE ROW LEVEL SECURITY;`).

### Đã bỏ khi chuyển nhà

| Thứ đã bỏ | Thay bằng |
|---|---|
| Cloud SQL (MySQL 8) | Supabase Postgres. Cloud SQL để nguyên, đang bị khoá, không đọc được. |
| Cloud Run + trigger Cloud Build | Render (deploy tự động khi push `main`). |
| Cloud Storage (bucket audio) | Supabase Storage. |
| Cloud Scheduler + `/api/cron/*`, `node-cron`, `reminderService` | Không còn tác vụ định kỳ trong backend. |
| Email chào mừng / nhắc học / khen (`nodemailer`, Gmail SMTP) | Không có. Mục "Nhắc nhở qua email" ở trang Cài đặt đã gỡ. |
| Text-to-Speech phía server | Frontend đọc bằng Web Speech API của trình duyệt. |

Cột `user_settings.email_reminders` vẫn còn trong DB và API nhưng không dùng.

## 2. Biến môi trường

### Backend (Render → Environment; máy dev: `backend/.env`, mẫu ở `backend/.env.example`)

| Biến | Bắt buộc | Giá trị / ghi chú |
|---|---|---|
| `DATABASE_URL` | Có (production) | Supabase → Connect → **Session pooler**. Máy dev có thể bỏ trống và dùng `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/`DB_NAME` (Postgres local). |
| `DB_SSL` | Có với Supabase | `true`. |
| `JWT_SECRET` | Có | Chuỗi ngẫu nhiên dài. Đổi giá trị = mọi người dùng phải đăng nhập lại. |
| `JWT_EXPIRES_IN` | Không | Mặc định `7d`. |
| `GOOGLE_CLIENT_ID` | Có | Client ID của "Flash Card Web Client". |
| `GEMINI_API_KEY` | Có (cho AI) | Thiếu thì các tính năng AI lỗi. |
| `CORS_ORIGIN` | Có | Danh sách cách nhau bằng dấu phẩy. Production phải có `https://dungdinh.vercel.app`. Mặc định `http://localhost:5173`. |
| `SUPABASE_URL` | Có (cho audio) | `https://<project-ref>.supabase.co`. |
| `SUPABASE_SECRET_KEY` | Có (cho audio) | Secret key của project (`sb_secret_...` hoặc khoá `service_role` cũ). Chỉ để ở server. |
| `COURSE_AUDIO_BUCKET` | Không | Mặc định `course-audio`. |
| `PORT` | Không | Render tự đặt. Local mặc định `8080`. |
| `NODE_ENV` | Không | Code backend không đọc trực tiếp. `render.yaml` không đặt biến này. |
| `NODE_VERSION` | Render | `22`, đặt sẵn trong `render.yaml`. |

`render.yaml` đặt sẵn `DB_SSL`, `JWT_EXPIRES_IN`, `COURSE_AUDIO_BUCKET`, `NODE_VERSION`. Các biến `sync: false` phải nhập tay trên Render.

Chỉ dùng cho script chuyển dữ liệu: `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`.

### Frontend (Vercel → Settings → Environment Variables; máy dev: `frontend/.env.local`)

| Biến | Giá trị |
|---|---|
| `VITE_API_BASE_URL` | `https://flashcard-backend-j62b.onrender.com`. `buildApiUrl` chấp nhận có hoặc không có hậu tố `/api`. Dev: `http://localhost:8080`. |
| `VITE_GOOGLE_CLIENT_ID` | Client ID của "Flash Card Web Client" (dùng cho nút đăng nhập Google). |

Biến `VITE_*` được nhúng vào bundle JS, ai cũng đọc được. **Không bao giờ đặt khoá bí mật** (Supabase secret, Gemini, JWT) vào biến `VITE_*`.

## 3. Dựng lại từ đầu

Chỉ cần khi tạo lại project. Hệ thống hiện tại đã dựng xong.

### 3.1 Supabase

1. Tạo project, vùng **Southeast Asia (Singapore)**. Lưu mật khẩu DB ở nơi an toàn.
2. **Connect → Session pooler**: lấy chuỗi kết nối → `DATABASE_URL`, kèm `DB_SSL=true`.
3. **Project Settings → API Keys**: lấy Project URL → `SUPABASE_URL`, secret key → `SUPABASE_SECRET_KEY`.
4. **SQL Editor**: chạy toàn bộ `backend/database/schema.sql` (18 bảng). Bật RLS cho mọi bảng `public`.
5. **Storage**: tạo bucket `course-audio`, để **private** (không bật Public).

### 3.2 Nạp dữ liệu (trên máy, trong `backend/`)

| Lệnh | Việc |
|---|---|
| `npm run chuyen:mysql` | Xem trước chép dữ liệu từ MySQL nguồn (`MYSQL_*`) sang Postgres (`DATABASE_URL`). |
| `npm run chuyen:mysql -- --apply` | Chép thật, giữ id, so số dòng từng bảng. |
| `npm run tai:audio` | Xem trước danh sách file audio sẽ tải lên. |
| `npm run tai:audio -- --apply` | Tải `private-content/khoa-hoc-48-ngay/bai-XX/audio/*` lên bucket. Thêm `--bai=XX` để chỉ một bài. Chạy lại an toàn. |
| `npm run seed:roadmaps` | Nạp lại lộ trình từ `database/content/lo-trinh.json`. |
| `npm run nhap:khoa-hoc -- --email=<email> --apply` | Nạp khoá 48 buổi từ `private-content`. |

### 3.3 Render

1. Render Dashboard → **New → Blueprint** → chọn repo. Render đọc `render.yaml`.
2. Nhập các biến `sync: false`: `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GEMINI_API_KEY`, `CORS_ORIGIN`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`.
3. Kiểm tra `/api/health` và `/api/db-test` trên URL mới.
4. Nếu URL Render đổi: sửa `VITE_API_BASE_URL` trên Vercel và URL trong `.github/workflows/giu-thuc.yml`.

### 3.4 Vercel

1. Đặt `VITE_API_BASE_URL`, `VITE_GOOGLE_CLIENT_ID`, rồi redeploy (biến `VITE_*` chỉ có hiệu lực sau khi build lại).
2. Nếu đổi domain frontend: Google Cloud Console → APIs & Services → Credentials → "Flash Card Web Client" → thêm domain vào **Authorized JavaScript origins**; thêm domain vào `CORS_ORIGIN` trên Render.

## 4. Deploy hằng ngày

| Việc | Cách làm |
|---|---|
| Frontend | Push/merge vào `main` → Vercel tự build và deploy. |
| Backend | Push/merge vào `main` → Render tự build (`npm ci`) và chạy `npm start`. |
| Kiểm tra backend | `GET https://flashcard-backend-j62b.onrender.com/api/health` → `{"status":"ok",...}`; `/api/db-test` → `"database":"connected"`. |
| Xem log backend | Render Dashboard → `flashcard-backend` → Logs. Lỗi phía trình duyệt ghi log `client_error`; request chậm ≥ 800 ms ghi `slow_request`. |
| Đổi biến môi trường | Render → Environment → lưu rồi deploy lại nếu Render chưa tự chạy. Vercel → đổi biến rồi Redeploy. |
| Kiểm tra trước khi push | `cd backend; npm test`; `cd frontend; npx vitest run`, `npm run lint`, `npx vite build`. CI GitHub Actions (`ci.yml`) chạy lại các bước này. |

## 5. Migration CSDL

Migration **không tự chạy** khi deploy.

1. Viết SQL **Postgres** (không phải MySQL). Ví dụ: `GENERATED ... AS IDENTITY` hoặc `SERIAL`, `TIMESTAMPTZ`, `ON CONFLICT` thay cho `ON DUPLICATE KEY UPDATE`.
2. Cập nhật `backend/database/schema.sql` cho khớp.
3. Bảng mới: thêm `ALTER TABLE <bảng> ENABLE ROW LEVEL SECURITY;`.
4. Chạy tay trên **Supabase → SQL Editor** **trước khi** push code cần bảng/cột mới.
5. Nên sao lưu (mục 7) trước migration lớn.

Driver là `pg`, qua wrapper `backend/src/config/db.js` để code cũ viết kiểu `mysql2` vẫn chạy:

| Wrapper làm gì | Ghi chú |
|---|---|
| Đổi placeholder `?` → `$1, $2...` | Viết query bằng `?` như trước. |
| Trả `[rows]` giống `mysql2` | `const [rows] = await pool.query(...)`. |
| `insertId` | Lấy qua `RETURNING id`. |
| Mã lỗi `23505` → `ER_DUP_ENTRY` | Error handler trả 409. |

Schema và migration MySQL cũ (001–016) nằm ở `backend/database/mysql-legacy/`, chỉ để tham khảo. Không chạy lên Supabase.

## 6. Giữ thức

- Workflow `.github/workflows/giu-thuc.yml` gọi `GET /api/db-test` mỗi ngày lúc **08:17 giờ Việt Nam** (cron `17 1 * * *` UTC). Một request vừa đánh thức Render, vừa chạy 1 truy vấn vào Supabase.
- Chạy tay: GitHub → Actions → "Giu thuc Supabase" → Run workflow.
- GitHub tự tắt lịch chạy nếu repo không có hoạt động trong 60 ngày. Khi đó vào tab **Actions** bật lại workflow.
- Lịch chạy chỉ có hiệu lực khi file workflow nằm trên nhánh mặc định (`main`).

## 7. Sao lưu và khôi phục

| Mục | Giá trị |
|---|---|
| Tác vụ | Windows Task Scheduler: "Flashcard - Sao luu Supabase" |
| Lịch | 20:00 Chủ nhật hằng tuần (máy phải bật) |
| Script | `D:\My project\flashcard-backup\sao-luu.ps1` (ngoài repo, đọc `DATABASE_URL` từ `backend/.env`) |
| Công cụ | `pg_dump` 18, định dạng custom (`-Fc`) |
| Lưu ở | `D:\My project\flashcard-backup`, giữ 8 bản gần nhất, nhật ký `nhat-ky.txt` |

Khôi phục (ghi đè dữ liệu hiện có, cân nhắc kỹ):

```powershell
pg_restore --clean --if-exists --no-owner -d "<DATABASE_URL>" <file>.dump
```

Audio trong Supabase Storage **không** nằm trong bản dump. Bản gốc ở `backend/database/private-content/khoa-hoc-48-ngay/bai-XX/audio/` trên máy; tải lại bằng `npm run tai:audio -- --apply`.

### Cứu dữ liệu ngày 19/10/2026

Cloud SQL không đọc được. Dữ liệu dựng lại từ:

| Nguồn | Nội dung |
|---|---|
| `backend/database.sql` | Dump Railway ngày 25/06/2026 |
| `work/db-backups` | Bản sao lưu thẻ ngày 08/10/2026. Cần xác nhận vị trí: không thấy thư mục này trong repo. |
| `private-content` khoá 48 ngày | Nội dung khoá học |
| `backend/database/content/lo-trinh.json` | Lộ trình |

Đã mất: tài khoản và tiến độ học từ 25/06 đến 08/10/2026; lời giải thích AI cũ (sinh lại dần khi học); tên và chủ gốc của 4 bộ thẻ #6, #7, #8, #10 (đang để tên "Bộ từ khôi phục #N").

Hồ sơ cứu dữ liệu nằm ngoài repo: `D:\My project\flashcard-rescue-20261019` (`BAO_CAO.md`, `flashcard_full_20261019.sql`).

## 8. Xử lý sự cố thường gặp

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| Lần mở đầu tiên rất chậm (30–60 giây), sau đó bình thường | Render free đang ngủ | Bình thường với gói free. Chờ, hoặc mở trước `/api/health`. |
| Frontend báo lỗi mạng; log Render có `CORS origin not allowed: https://...` | Origin của frontend không có trong `CORS_ORIGIN` | Render → Environment → thêm đúng origin (không cần `/` cuối), cách nhau bằng dấu phẩy, lưu và chờ deploy lại. Production cần `https://dungdinh.vercel.app`. Muốn dùng domain preview của Vercel thì cũng phải thêm. |
| `/api/db-test` lỗi, `/api/health` vẫn `ok`; log có lỗi kết nối DB | Supabase bị tạm dừng (quá 7 ngày không truy cập) hoặc sai `DATABASE_URL` | Supabase Dashboard → project → **Restore project**, chờ vài phút. Kiểm tra workflow giữ thức còn bật. Nếu không bị tạm dừng: so lại `DATABASE_URL` (Session pooler) và `DB_SSL=true`. |
| Phát audio bài nghe trả 500; log có `Thieu SUPABASE_URL hoac SUPABASE_SECRET_KEY` hoặc `Supabase Storage trả 401/403` | Thiếu hoặc sai `SUPABASE_URL` / `SUPABASE_SECRET_KEY`, hoặc dùng nhầm publishable key | Đặt lại 2 biến trên Render bằng secret key của đúng project. |
| Audio trả 404 | Object chưa có trong bucket hoặc sai tên bucket | Kiểm tra object `khoa-hoc-48-ngay/bai-XX/audio/<file>` trong bucket `course-audio`; chạy `npm run tai:audio -- --bai=XX --apply`. Kiểm tra `COURSE_AUDIO_BUCKET`. |
| Đăng nhập Google báo lỗi origin | Domain frontend chưa có trong Authorized JavaScript origins | Google Cloud Console → Credentials → "Flash Card Web Client" → thêm domain. |
| Đổi biến `VITE_*` mà frontend không đổi | Biến `VITE_*` được nhúng lúc build | Vercel → Deployments → Redeploy. |
| Backend không khởi động: `Missing required environment variable: ...` | Thiếu biến bắt buộc (`JWT_SECRET`, `GOOGLE_CLIENT_ID`, hoặc bộ `DB_*` khi không có `DATABASE_URL`) | Thêm biến trên Render. |
| Workflow giữ thức không chạy nữa | GitHub tắt lịch sau 60 ngày repo không hoạt động | Tab Actions → bật lại workflow. |

## 9. Google Cloud còn lại

- Chỉ giữ project `flash-card-499907` cho OAuth client "Flash Card Web Client". **Không xoá project**: xoá là mất client ID, đăng nhập Google ngừng hoạt động.
- Cloud Run, trigger Cloud Build, Cloud Scheduler: đã tắt/xoá. Cloud SQL để nguyên (đang bị khoá).
- Khoản nợ Google Cloud còn lại do người dùng tự xử lý.
