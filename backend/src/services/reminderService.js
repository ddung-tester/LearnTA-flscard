/**
 * reminderService.js — Gửi email nhắc học hàng ngày qua Gmail SMTP (Nodemailer).
 *
 * Chỉ gửi cho users:
 *   1. Có email
 *   2. Chưa học hôm nay (last_study_date < today hoặc NULL)
 *   3. Đã bật email_reminders = true trong user_settings
 */

const nodemailer = require("nodemailer");
const pool = require("../config/db");
const { getTodayVN } = require("./streakService");

let transporter = null;

function getTransporter() {
  if (!transporter) {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASS;
    if (!user || !pass) return null;

    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }
  return transporter;
}

const GMAIL_USER = () => process.env.GMAIL_USER || "";
const APP_URL = "https://dungdinh-vocab.vercel.app/decks";

// ─── 15 Template Messages ──────────────────────────────────────────────────────

const REMINDER_TEMPLATES = [
  {
    subject: "🔥 Đừng để streak của bạn tắt hôm nay!",
    headline: "Ngọn lửa đang leo lét...",
    body: `Ôi không! Hôm nay bạn vẫn chưa học gì cả. Streak của bạn đang rất cần bạn ghé thăm để tiếp tục cháy mãi! 🔥<br/><br/>
Chỉ cần <strong>5 phút thôi</strong> — học vài từ vựng nhanh, và hôm nay sẽ lại được tính vào chuỗi ngày học liên tục của bạn. Đừng để bao nhiêu công sức trước đây trôi xuống sông xuống bể nhé!`,
  },
  {
    subject: "📚 Hôm nay chưa ghé LearnTA — từ vựng đang nhớ bạn!",
    headline: "Những từ vựng đang chờ đợi...",
    body: `Xin chào! Hôm nay đã gần qua đi mà chưa thấy bóng dáng bạn trên LearnTA. Những bộ từ vựng của bạn đang cô đơn lắm đấy! 🥺<br/><br/>
<strong>"Mỗi ngày học một từ, mười năm sau bạn có cả một thế giới."</strong><br/><br/>
Hãy dành chút thời gian nhỏ bé để ghi thêm vào ký ức những từ hay ho trước khi ngủ nhé!`,
  },
  {
    subject: "⏰ Còn chút thời gian — đừng bỏ lỡ ngày học hôm nay!",
    headline: "Thời gian trong ngày sắp hết!",
    body: `Ngày hôm nay sắp khép lại rồi! Bạn có biết không — chỉ cần học <strong>1 flashcard</strong> thôi cũng đã đủ để ngày hôm nay được tính là một ngày học nghiêm túc. 🌙<br/><br/>
Não bộ của chúng ta ghi nhớ tốt nhất vào buổi tối, trước khi ngủ. Đây chính là thời điểm vàng — đừng bỏ lỡ!`,
  },
  {
    subject: "🧠 Não bạn đang khát kiến thức đấy!",
    headline: "Thói quen học tạo nên sự khác biệt",
    body: `Theo nghiên cứu tâm lý học, <strong>nhất quán và đều đặn</strong> quan trọng hơn cường độ học. Người học 10 phút mỗi ngày sẽ nhớ tốt hơn người học 2 tiếng mỗi tuần. 📊<br/><br/>
Hôm nay bạn chưa có streak. Hãy để LearnTA giúp bạn xây dựng thói quen đó — từng ngày, từng ngày một. Bắt đầu ngay bây giờ nhé!`,
  },
  {
    subject: "💪 Sếp ơi! Streak đang cần bạn!",
    headline: "Một ngày không học là một ngày lãng phí?",
    body: `Không hẳn vậy — nhưng nếu bạn học thêm vài từ vựng hôm nay, ngày mai bạn sẽ tự hào lắm đó! 😄<br/><br/>
Streak của bạn là bằng chứng cho sự kiên trì. Mỗi ngày được đánh dấu là một ngày bạn đã vượt qua chính mình. Đừng để chuỗi ngày đẹp đẽ đó bị gián đoạn — chỉ cần một click nhỏ thôi!`,
  },
  {
    subject: "🌟 Cơ hội để toả sáng hôm nay vẫn còn đó!",
    headline: "Mỗi từ học được là một bước tiến",
    body: `Học ngoại ngữ là một cuộc đua không có đích đến cuối cùng, mà chỉ có những cột mốc. Hôm nay bạn có thể đặt thêm một cột mốc nhỏ cho chính mình không? 🏁<br/><br/>
Hãy mở LearnTA, chọn bộ từ bạn yêu thích, và lật vài thẻ flashcard. Đơn giản vậy thôi — nhưng ý nghĩa thì lớn lắm!`,
  },
  {
    subject: "🎯 Mission hôm nay: Học ít nhất 5 từ vựng!",
    headline: "Thử thách nhỏ, chiến thắng lớn",
    body: `Nhiệm vụ đặc biệt dành cho bạn hôm nay: <strong>Học ít nhất 5 từ vựng trước khi đi ngủ!</strong> 🎮<br/><br/>
Nghe có vẻ đơn giản, phải không? Nhưng đây chính là "bí kíp" của những người thành công trong việc học ngoại ngữ — nhất quán và có mục tiêu rõ ràng, dù nhỏ đến đâu. Bạn làm được không?`,
  },
  {
    subject: "🌙 Kết thúc ngày với điều gì đó có ý nghĩa nhé!",
    headline: "Buổi tối là thời điểm vàng để học",
    body: `Khi cơ thể và tâm trí đang thư giãn, đó cũng là lúc não bộ tốt nhất trong việc tiếp nhận và lưu trữ thông tin mới. 🌟<br/><br/>
Trước khi đặt điện thoại xuống và đi ngủ, hãy dành 5-10 phút cho LearnTA. Sáng mai thức dậy, bạn sẽ thấy những từ vựng đó đã được ghi vào trí nhớ dài hạn một cách kỳ diệu!`,
  },
  {
    subject: "🚀 Chỉ 1% tốt hơn mỗi ngày — bắt đầu từ hôm nay!",
    headline: "Sức mạnh của sự cải thiện từng ngày nhỏ bé",
    body: `James Clear trong "Atomic Habits" đã nói: <em>"Bạn không vươn tới đỉnh cao nhờ mục tiêu, bạn vươn tới đỉnh cao nhờ hệ thống."</em><br/><br/>
Hệ thống của bạn là LearnTA. Mỗi ngày học một chút chính là hệ thống đó đang hoạt động. Hôm nay, hãy thêm một ngày nữa vào hệ thống của bạn! 🔥`,
  },
  {
    subject: "😊 Nhớ đến bạn và muốn nhắc một điều nhỏ thôi!",
    headline: "Một lời nhắc nhỏ từ LearnTA",
    body: `Chào bạn! Hôm nay LearnTA nhớ bạn lắm — vì hôm nay chưa thấy bạn ghé học. 🥰<br/><br/>
Không có áp lực nào hết. Nếu bạn bận, cứ học 2-3 từ thôi cũng đủ. Nếu bạn có thời gian, hãy thử thách bản thân với một vòng Quiz hoặc Tự luận. Dù ít hay nhiều — mỗi bước tiến đều đáng trân trọng!`,
  },
  {
    subject: "🏆 Những người thành công làm gì mỗi ngày?",
    headline: "Bí quyết của những người giỏi ngoại ngữ",
    body: `Họ không nhất thiết học nhiều hơn bạn. Họ chỉ học <strong>đều đặn hơn</strong>. 📅<br/><br/>
10 phút mỗi ngày, 7 ngày mỗi tuần = 70 phút học tập chất lượng cao. Đó là lý do streak lại quan trọng đến vậy! Hôm nay bạn đã có 70 phút đó chưa?`,
  },
  {
    subject: "✨ Đừng để hôm nay trở thành ngày đứt streak!",
    headline: "Bạn đã đi được một đoạn đường dài...",
    body: `Nghĩ lại xem — bạn đã bỏ bao nhiêu công sức và thời gian để xây dựng thói quen học tập đó. Mỗi ngày trong streak là một ngày bạn đã chọn bản thân mình, chọn sự phát triển. 💪<br/><br/>
Hôm nay, hãy tiếp tục lựa chọn đó. Chỉ một lần nhỏ thôi — đủ để chuỗi ngày đẹp đẽ được kéo dài thêm!`,
  },
  {
    subject: "🌏 Tiếng Anh mở ra cả thế giới — học thêm một chút đi!",
    headline: "Ngôn ngữ là chiếc chìa khoá của cơ hội",
    body: `Mỗi từ vựng bạn học được là một chiếc chìa khoá nhỏ. Gom đủ nhiều chìa khoá, một ngày nào đó bạn sẽ mở được những cánh cửa mà người khác chưa từng chạm tới — cơ hội công việc, bạn bè quốc tế, những cuốn sách hay, những bộ phim không cần phụ đề... 🌐<br/><br/>
Hôm nay, hãy thêm một vài chiếc chìa khoá nữa vào tay bạn nhé!`,
  },
  {
    subject: "⚡ Năng lượng học tập — bạn có còn không?",
    headline: "Đôi khi chỉ cần bắt đầu thôi!",
    body: `Thường thì không phải thiếu động lực mà khiến chúng ta không học. Đó là <strong>sự trì hoãn</strong>. Bạn chỉ cần mở app ra và bắt đầu — năng lượng và hứng khởi sẽ tự đến sau! ⚡<br/><br/>
Quy tắc 2 phút: Nếu một việc mất dưới 2 phút để bắt đầu, hãy làm ngay. Mở LearnTA mất bao lâu? Đúng rồi — ít hơn 2 giây!`,
  },
  {
    subject: "🎉 Hôm nay học một chút, mai tự hào một nhiều!",
    headline: "Phần thưởng của sự kiên trì",
    body: `Tưởng tượng cảm giác này: Sáng mai thức dậy, nhìn vào streak của mình và thấy nó vẫn còn nguyên vẹn. Thậm chí còn tăng lên một ngày nữa. Cảm giác đó có phải tuyệt vời không? 😍<br/><br/>
Bạn hoàn toàn có thể có cảm giác đó ngay ngày mai — chỉ cần dành chút thời gian học tối nay. LearnTA đang chờ bạn!`,
  },
];

// ─── HTML email builder ────────────────────────────────────────────────────────

function buildReminderEmail({ displayName, subject, headline, body, streak }) {
  const streakSection =
    streak > 0
      ? `<div style="text-align:center;margin:20px 0;">
          <div style="display:inline-block;background:linear-gradient(135deg,#f97316,#dc2626);padding:10px 24px;border-radius:999px;color:#fff;font-weight:700;font-size:15px;">
            🔥 Streak hiện tại: ${streak} ngày
          </div>
         </div>`
      : "";

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.07);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#92400e,#f97316);padding:32px 40px;text-align:center;">
              <div style="font-size:40px;margin-bottom:8px;">🔥</div>
              <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">${headline}</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#1e1b4b;">
                Chào ${displayName}! 👋
              </p>
              <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.75;">
                ${body}
              </p>

              ${streakSection}

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                <tr>
                  <td align="center">
                    <a href="${APP_URL}"
                       style="display:inline-block;background:linear-gradient(135deg,#f97316,#dc2626);color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:12px;box-shadow:0 4px 14px rgba(249,115,22,0.3);">
                      Học ngay hôm nay 🚀
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
                Bạn nhận email này vì đã bật nhắc nhở học tập từ LearnTA.<br/>
                Để tắt nhắc nhở, vào <strong>Cài đặt → Nhắc nhở email</strong> trong ứng dụng.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Chào ${displayName}!\n\n${headline}\n\n${body.replace(/<[^>]*>/g, "")}\n\nHọc ngay: ${APP_URL}`;

  return { html, text, subject };
}

// ─── Core: send reminders to all eligible users ───────────────────────────────

async function sendDailyReminders() {
  const transport = getTransporter();
  if (!transport) {
    console.warn("[reminderService] GMAIL_USER / GMAIL_APP_PASS chưa cấu hình → bỏ qua.");
    return { sent: 0, skipped: 0 };
  }

  const today = getTodayVN();

  // Lấy tất cả users chưa học hôm nay + có email + bật email_reminders
  const [users] = await pool.query(
    `SELECT u.id, u.fullname, u.email, u.current_streak
     FROM users u
     LEFT JOIN user_settings us ON us.user_id = u.id
     WHERE u.email IS NOT NULL
       AND (u.last_study_date IS NULL OR u.last_study_date < ?)
       AND (us.email_reminders IS NULL OR us.email_reminders = TRUE)`,
    [today]
  );

  let sent = 0;
  let skipped = 0;

  for (const user of users) {
    try {
      const template = REMINDER_TEMPLATES[Math.floor(Math.random() * REMINDER_TEMPLATES.length)];
      const { html, text, subject } = buildReminderEmail({
        displayName: user.fullname || "bạn",
        subject: template.subject,
        headline: template.headline,
        body: template.body,
        streak: user.current_streak || 0,
      });

      await transport.sendMail({
        from: `"LearnTA" <${GMAIL_USER()}>`,
        to: user.email,
        subject,
        html,
        text,
      });

      sent++;
      console.info(`[reminderService] Sent reminder to ${user.email}`);
    } catch (err) {
      skipped++;
      console.error(`[reminderService] Failed to send to ${user.email}:`, err?.message);
    }
  }

  console.info(`[reminderService] Done: ${sent} sent, ${skipped} failed, ${users.length} total.`);
  return { sent, skipped, total: users.length };
}

module.exports = { sendDailyReminders };
