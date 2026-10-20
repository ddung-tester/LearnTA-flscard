# Triển khai: Supabase (CSDL + audio) · Render (backend) · Vercel (frontend)

Thay cho `google-cloud-deploy.md` (Cloud SQL / Cloud Run đã bỏ từ 10/2026 do project GCP bị khoá thanh toán).

## 1. Supabase

1. Tạo project, vùng **Southeast Asia (Singapore)**. Ghi lại mật khẩu DB.
2. **Connect → Session pooler**: lấy chuỗi kết nối → `DATABASE_URL` (kèm `DB_SSL=true`).
3. **Project Settings → API**: lấy Project URL → `SUPABASE_URL`, secret key → `SUPABASE_SECRET_KEY` (chỉ để ở server).
4. **SQL Editor**: chạy toàn bộ `backend/database/schema.sql`.

## 2. Nạp dữ liệu (trên máy)

Nguồn: bản khôi phục MySQL `flashcard_full_20261019.sql` (chạy trên MySQL tạm, cổng 3399).

```powershell
cd backend
# backend/.env: DATABASE_URL, DB_SSL=true + MYSQL_HOST/PORT/USER/PASSWORD/DATABASE trỏ vào MySQL nguồn
npm run chuyen:mysql              # xem trước
npm run chuyen:mysql -- --apply   # chép, giữ id, so số dòng từng bảng
npm run tai:audio -- --apply      # 73 file mp3 → bucket private course-audio
```

## 3. Render (backend)

1. Render Dashboard → **New → Blueprint** → chọn repo; Render đọc `render.yaml` (gói free, Singapore, `rootDir: backend`).
2. Nhập các biến `sync: false`: `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GEMINI_API_KEY`, `CORS_ORIGIN`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`.
3. Kiểm tra `https://<service>.onrender.com/api/health` và `/api/db-test`.

Lưu ý gói free: service ngủ sau 15 phút không có truy cập (lần đầu chờ khoảng 1 phút); cổng SMTP bị chặn (app không còn gửi mail).

## 4. Vercel (frontend)

1. Đổi `VITE_API_BASE_URL` sang URL Render, redeploy.
2. Google Cloud Console → Credentials → "Flash Card Web Client": thêm domain mới vào Authorized JavaScript origins nếu đổi domain frontend.

## 5. Giữ Supabase không tạm dừng + sao lưu

- Supabase Free tạm dừng project sau 1 tuần không hoạt động. Tạo 1 job **Integrations → Cron** gọi HTTP `GET https://<service>.onrender.com/api/db-test` mỗi ngày (job này cũng đánh thức Render).
- Gói Free không có sao lưu tự động: định kỳ chạy `pg_dump "$DATABASE_URL" -Fc -f flashcard_<ngay>.dump` và lưu ngoài Supabase.

## 6. Google Cloud còn giữ gì

Chỉ giữ project `flash-card-499907` cho OAuth client (không cần billing). Không xoá project. Các dịch vụ khác (Cloud Run, Cloud SQL, Cloud Scheduler, Cloud Build trigger, Text-to-Speech) không còn dùng.

## Giữ thức và sao lưu

- Giữ thức: workflow `.github/workflows/giu-thuc.yml` gọi `/api/db-test` mỗi ngày để Supabase gói miễn phí không tự tạm dừng (dừng sau 7 ngày không truy cập). GitHub tự tắt lịch chạy nếu repo không có hoạt động trong 60 ngày; khi đó vào tab Actions bật lại.
- Sao lưu: tác vụ Windows `Flashcard - Sao luu Supabase` chạy 20:00 Chủ nhật, dùng `pg_dump` lưu vào `D:\My project\flashcard-backup` (giữ 8 bản, nhật ký ở `nhat-ky.txt`). Script nằm ngoài repo vì đọc `DATABASE_URL` từ `backend/.env`.
- Khôi phục: `pg_restore --clean --if-exists --no-owner -d "<DATABASE_URL>" <file .dump>`.

