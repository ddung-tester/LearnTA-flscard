require("dotenv").config();
const pool = require("./config/db");
const { sendDailyReminders } = require("./services/reminderService");

async function run() {
  console.log("=== BẮT ĐẦU CHẠY THỬ NGHIỆM NHẮC NHỞ HỌC TẬP ===");
  const targetEmail = "ddung.tester@gmail.com";

  try {
    // 1. Kiểm tra xem user có tồn tại trong database không
    const [users] = await pool.query("SELECT id, fullname, email, last_study_date FROM users WHERE email = ?", [targetEmail]);
    
    if (users.length === 0) {
      console.log(`❌ Không tìm thấy user nào có email là: ${targetEmail} trong DB hiện tại.`);
      console.log("Các email đang có sẵn trong DB:");
      const [allUsers] = await pool.query("SELECT email FROM users LIMIT 10");
      console.log(allUsers.map(u => u.email));
      process.exit(1);
    }

    const user = users[0];
    console.log(`Found user: ${user.fullname} (${user.email})`);
    console.log(`Trạng thái học hiện tại (last_study_date): ${user.last_study_date}`);

    // 2. Cập nhật last_study_date về ngày hôm qua (ví dụ: 2026-06-29) để tính là chưa học hôm nay
    // Đồng thời đảm bảo user_settings đã bật email_reminders = TRUE
    console.log("Đang cấu hình DB để tài khoản được nhận email nhắc nhở...");
    
    await pool.query("UPDATE users SET last_study_date = '2026-06-29' WHERE id = ?", [user.id]);
    
    // Đảm bảo có bản ghi user_settings bật email_reminders
    const [settings] = await pool.query("SELECT * FROM user_settings WHERE user_id = ?", [user.id]);
    if (settings.length === 0) {
      await pool.query("INSERT INTO user_settings (user_id, email_reminders) VALUES (?, TRUE)", [user.id]);
    } else {
      await pool.query("UPDATE user_settings SET email_reminders = TRUE WHERE user_id = ?", [user.id]);
    }
    
    console.log("✅ Đã cập nhật database thành công!");

    // 3. Kích hoạt gửi email nhắc nhở
    console.log("Đang kích hoạt gửi email nhắc nhở học tập...");
    const result = await sendDailyReminders();
    console.log("Kết quả gửi email:", result);

  } catch (error) {
    console.error("Lỗi trong quá trình chạy test:", error);
  } finally {
    process.exit(0);
  }
}

run();
