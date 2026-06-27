/**
 * emailService.js — Gửi email qua Resend API
 *
 * Biến môi trường cần thiết:
 *   RESEND_API_KEY  — API key từ resend.com
 *   EMAIL_FROM      — Địa chỉ gửi, ví dụ: "LearnTA <no-reply@yourdomain.com>"
 *                     (domain phải được verify trên Resend)
 *
 * Nếu RESEND_API_KEY không được set → email bị bỏ qua (log warning).
 */

const { Resend } = require("resend");

let resendClient = null;

function getResend() {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return null;
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

const EMAIL_FROM =
  process.env.EMAIL_FROM || "LearnTA <no-reply@learnta.app>";

// ─── Template ────────────────────────────────────────────────────────────────

function buildWelcomeEmail(displayName) {
  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Chào mừng bạn đồng hành mới của LearnTA!</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(76,29,149,0.06);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4c1d95,#2563eb);padding:50px 40px 40px;text-align:center;">
              <div style="font-size:44px;margin-bottom:12px;animation: pulse 2s infinite;">✨🎓✨</div>
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">LearnTA</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:15px;font-style:italic;">Hành trình vạn dặm bắt đầu từ một từ vựng</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h2 style="margin:0 0 16px;color:#1e1b4b;font-size:22px;font-weight:700;">
                Chào mừng ${displayName} thân mến,
              </h2>
              
              <p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.7;">
                Chào mừng bạn đã chính thức đặt chân vào ngôi nhà chung của những người yêu thích và chinh phục Tiếng Anh — **LearnTA**! Chúng tôi vô cùng hạnh phúc khi được trở thành một phần nhỏ trên con đường phát triển bản thân của bạn.
              </p>

              <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.7;">
                Học một ngôn ngữ mới chưa bao giờ là việc dễ dàng. Sẽ có những ngày bạn tràn đầy hứng khởi, nhưng cũng sẽ có những lúc bạn cảm thấy mệt mỏi. Đừng lo lắng! LearnTA được xây dựng để đồng hành cùng bạn từng bước nhỏ mỗi ngày, biến những giờ phút học tập khô khan trở nên sinh động, trực quan và tràn ngập niềm vui.
              </p>

              <!-- Inspiring Quote / Message -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-left:4px solid #8b5cf6;padding:8px 0 8px 18px;margin:24px 0;">
                <tr>
                  <td>
                    <p style="margin:0;color:#4c1d95;font-size:15px;font-style:italic;line-height:1.6;font-weight:500;">
                      "Mỗi từ vựng bạn nhớ ngày hôm nay chính là một viên gạch vững chắc xây dựng nên tương lai tự tin giao tiếp và mở rộng cánh cửa bước ra thế giới của ngày mai."
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Features Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(180deg,#fcfaff,#f5f0ff);border-radius:14px;padding:24px;margin-bottom:30px;border:1px solid #ede9fe;">
                <tr>
                  <td>
                    <p style="margin:0 0 16px;color:#4c1d95;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;text-align:center;">Những trải nghiệm đang chờ đón bạn</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;color:#374151;font-size:14.5px;line-height:1.5;">
                          <strong>📚 Bộ từ cá nhân hóa:</strong> Tự thiết kế và quản lý các nhóm từ vựng của riêng bạn hoặc học theo kho từ mẫu.
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#374151;font-size:14.5px;line-height:1.5;">
                          <strong>🃏 Flashcard thông minh:</strong> Học qua phương pháp ghi nhớ chủ động (Active Recall) chỉ bằng những cú lật thẻ nhẹ nhàng.
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#374151;font-size:14.5px;line-height:1.5;">
                          <strong>🧠 Thử thách Quiz & Tự luận:</strong> Luyện tập đa dạng hình thức để khắc sâu phản xạ từ vựng vào trí nhớ dài hạn.
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#374151;font-size:14.5px;line-height:1.5;">
                          <strong>🎉 Cột mốc & Phần thưởng:</strong> Tích lũy chuỗi câu trả lời đúng và mở khóa những video phần thưởng đầy thú vị tiếp thêm động lực!
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;color:#4b5563;font-size:15px;line-height:1.7;">
                Bây giờ, hãy gác lại những âu lo, click vào nút bên dưới và bắt đầu tích lũy những từ vựng đầu tiên cùng chúng tôi nhé. Hãy nhớ rằng, chỉ cần tốt hơn 1% mỗi ngày là bạn đã đi được một quãng đường rất xa rồi!
              </p>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <td align="center">
                    <a href="https://dungdinh-vocab.vercel.app/decks"
                       style="display:inline-block;background:linear-gradient(135deg,#4c1d95,#2563eb);color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:16px 40px;border-radius:12px;box-shadow:0 4px 15px rgba(76,29,149,0.22);letter-spacing:0.01em;transition: all 0.3s ease;">
                      Khám phá thế giới từ vựng ngay →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 6px;color:#6b7280;font-size:13px;font-weight:600;">Đội ngũ sáng lập LearnTA</p>
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;">
                Bạn nhận được thư này vì bạn đã đăng nhập thành công thông qua tài khoản Google trên LearnTA.<br/>
                Nếu bạn không thực hiện hành động này, xin vui lòng bỏ qua email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Chào mừng ${displayName} đến với thế giới từ vựng LearnTA!\n\nHành trình vạn dặm bắt đầu từ một từ vựng. Cảm ơn bạn đã lựa chọn LearnTA làm người bạn đồng hành.\n\nBắt đầu học ngay tại đây: https://dungdinh-vocab.vercel.app/decks`;

  return { html, text };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Gửi email chào mừng khi user đăng ký lần đầu qua Google.
 * Không throw — lỗi email không được ảnh hưởng luồng đăng nhập.
 */
async function sendWelcomeEmail({ to, displayName }) {
  const resend = getResend();

  if (!resend) {
    console.warn("[emailService] RESEND_API_KEY chưa được cấu hình — bỏ qua gửi email.");
    return;
  }

  try {
    const { html, text } = buildWelcomeEmail(displayName);
    await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: `Chào mừng ${displayName} đến với LearnTA! 🎉`,
      html,
      text,
    });
    console.info(`[emailService] Welcome email sent to ${to}`);
  } catch (err) {
    // Lỗi email không block luồng đăng nhập
    console.error("[emailService] Failed to send welcome email:", err?.message ?? err);
  }
}

module.exports = { sendWelcomeEmail };
