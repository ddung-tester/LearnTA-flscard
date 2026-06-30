require("dotenv").config();
const { sendWelcomeEmail } = require("./services/emailService");

async function test() {
  console.log("=== BẮT ĐẦU TEST GỬI EMAIL ===");
  console.log("Gmail gửi:", process.env.GMAIL_USER);
  console.log("Gmail nhận:", process.env.GMAIL_USER);

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASS) {
    console.error("Lỗi: Thiếu cấu hình GMAIL_USER hoặc GMAIL_APP_PASS trong file .env!");
    process.exit(1);
  }

  await sendWelcomeEmail({
    to: process.env.GMAIL_USER, // Gửi thử cho chính mình
    displayName: "Thành Tester"
  });

  console.log("=== ĐÃ CHẠY XONG LỆNH GỬI ===");
  console.log("Vui lòng check hộp thư Gmail (bao gồm cả Hòm thư rác/Spam nếu không thấy ở Hòm thư chính).");
  process.exit(0);
}

test();
