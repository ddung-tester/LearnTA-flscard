import { useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import "../../styles/cau-chuyen.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const MOC_ON = [
  { ngay: "1 ngày", x: 70 },
  { ngay: "3 ngày", x: 190 },
  { ngay: "7 ngày", x: 330 },
  { ngay: "14 ngày", x: 480 },
  { ngay: "30 ngày", x: 620 },
];

const CHE_DO = [
  { ten: "Flashcard", mo: "Lật thẻ, tự chấm nhớ hay chưa" },
  { ten: "Trắc nghiệm", mo: "Chọn nghĩa đúng trong bốn" },
  { ten: "Tự luận", mo: "Nhìn nghĩa, gõ lại từ" },
  { ten: "Nghe viết", mo: "Nghe phát âm, viết từ" },
  { ten: "Nối từ", mo: "Ghép từ với nghĩa" },
  { ten: "Ngữ cảnh", mo: "Điền từ vào câu" },
];

/**
 * CauChuyenCuon — phần kể chuyện theo cuộn dưới hero trang chủ (tải lười cùng gsap + lenis):
 * 1 thẻ lật dần khi cuộn · 2 đường cong trí nhớ tự vẽ, mốc ôn bật lên · 3 lưới 48 buổi đóng dấu dần
 * · 4 xấp thẻ chế độ học xoè ra · lời mời bắt đầu.
 * Máy tính (≥880px): các chương được ghim lại trong lúc cuộn. Điện thoại: không ghim, chỉ chạy theo cuộn.
 * Giảm chuyển động: không cuộn mượt, không animation — mọi thứ hiện sẵn ở trạng thái cuối.
 */
function CauChuyenCuon({ startPath, startState }) {
  const gocRef = useRef(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          may: "(min-width: 880px) and (prefers-reduced-motion: no-preference)",
          dt: "(max-width: 879px) and (prefers-reduced-motion: no-preference)",
        },
        (ctx) => {
          const { may } = ctx.conditions;

          // Cuộn mượt (chỉ khi có animation); ScrollTrigger đọc vị trí từ Lenis
          const lenis = new Lenis({ lerp: 0.12 });
          lenis.on("scroll", ScrollTrigger.update);
          const nhip = (t) => lenis.raf(t * 1000);
          gsap.ticker.add(nhip);
          gsap.ticker.lagSmoothing(0);

          const chuong = (chon, cauHinh = {}) =>
            gsap.timeline({
              defaults: { ease: "none" },
              scrollTrigger: {
                trigger: chon,
                start: may ? "top top" : "top 75%",
                end: may ? "+=120%" : "bottom 60%",
                scrub: 0.6,
                pin: may,
                ...cauHinh,
              },
            });

          // 1. Thẻ lật: mặt trước → mặt sau, từ được tô dạ quang, câu chữ bên cạnh đổi theo
          chuong(".cc-1")
            .from(".cc-1 .cc-the", { rotateX: 38, y: 60, scale: 0.9, opacity: 0.4, duration: 0.3 })
            .to(".cc-1 .cc-the__trong", { rotateY: 180, duration: 0.5 }, 0.3)
            .to(".cc-1 .cc-loi__buoc--1", { opacity: 0.25, duration: 0.2 }, 0.35)
            .from(".cc-1 .cc-loi__buoc--2", { opacity: 0, y: 20, duration: 0.2 }, 0.45)
            .fromTo(".cc-1 .cc-the__to", { backgroundSize: "0% 100%" }, { backgroundSize: "100% 100%", duration: 0.2 }, 0.8);

          // 2. Đường cong trí nhớ tự vẽ, mỗi lần ôn đẩy đường lên lại
          const duong = gocRef.current.querySelector(".cc-duong-nho");
          const dai = duong.getTotalLength();
          gsap.set(duong, { strokeDasharray: dai, strokeDashoffset: dai });
          const tl2 = chuong(".cc-2").to(duong, { strokeDashoffset: 0, duration: 1 });
          gsap.utils.toArray(".cc-2 .cc-moc").forEach((moc, i) => {
            tl2.from(moc, { scale: 0, opacity: 0, transformOrigin: "50% 100%", duration: 0.08, ease: "back.out(3)" }, 0.1 + i * 0.19);
          });

          // 3. 48 buổi: đóng dấu lần lượt
          chuong(".cc-3").from(".cc-3 .cc-o", {
            backgroundColor: "var(--mau-giay)",
            borderColor: "var(--mau-vien-manh)",
            color: "var(--mau-chu-phu)",
            scale: 0.8,
            stagger: { each: 0.02, from: "start" },
            duration: 0.1,
            ease: "back.out(2)",
          });

          // 4. Xấp thẻ chế độ học xoè ra thành hàng
          chuong(".cc-4").from(".cc-4 .cc-che-do", {
            x: (i) => (may ? (2.5 - i) * 190 : 0),
            y: (i) => (may ? 40 + i * 4 : 30),
            rotate: (i) => (may ? (i - 2.5) * 6 : 0),
            opacity: may ? 1 : 0,
            stagger: may ? 0 : 0.1,
            duration: 1,
            ease: "power2.out",
          });

          // Lời mời cuối: nổi lên
          gsap.from(".cc-cuoi > *", {
            y: 40,
            opacity: 0,
            stagger: 0.12,
            scrollTrigger: { trigger: ".cc-cuoi", start: "top 80%" },
          });

          return () => {
            gsap.ticker.remove(nhip);
            gsap.ticker.lagSmoothing(500, 33); // trả lại mặc định cho animation gsap ở trang khác
            lenis.destroy();
          };
        }
      );
    },
    { scope: gocRef }
  );

  return (
    <div ref={gocRef} className="cc">
      <section className="cc-chuong cc-1" aria-labelledby="cc-1-tieu-de">
        <div className="cc-loi">
          <p className="cc-loi__so">01</p>
          <h2 id="cc-1-tieu-de" className="cc-loi__tieu-de">Một thẻ, một từ.</h2>
          <p className="cc-loi__buoc cc-loi__buoc--1">Nhìn từ, tự nhớ nghĩa trước khi lật. Nhớ ra được mới là học.</p>
          <p className="cc-loi__buoc cc-loi__buoc--2">Lật lại để kiểm tra: nghĩa, câu ví dụ, và tiếng đọc chuẩn.</p>
        </div>
        <div className="cc-san-khau">
          <div className="cc-the">
            <div className="cc-the__trong">
              <div className="cc-the__mat">
                <span className="cc-the__tu">resilient</span>
                <span className="cc-the__goi-y">/rɪˈzɪl.i.ənt/</span>
              </div>
              <div className="cc-the__mat cc-the__mat--sau">
                <span className="cc-the__nghia">kiên cường, mau hồi phục</span>
                <span className="cc-the__vi-du" lang="en">
                  Children are often more <span className="cc-the__to">resilient</span> than adults.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cc-chuong cc-2" aria-labelledby="cc-2-tieu-de">
        <div className="cc-loi">
          <p className="cc-loi__so">02</p>
          <h2 id="cc-2-tieu-de" className="cc-loi__tieu-de">Ôn đúng lúc sắp quên.</h2>
          <p className="cc-loi__buoc">
            Trí nhớ phai dần theo thời gian. Mỗi lần ôn đúng lúc, từ ở lại lâu hơn — nên lịch ôn giãn dần: 1, 3, 7, 14, 30 ngày.
          </p>
        </div>
        <div className="cc-san-khau">
          <svg className="cc-bieu-do" viewBox="0 0 700 300" role="img" aria-label="Đường trí nhớ: tụt dần rồi được kéo lên sau mỗi lần ôn, mỗi lần tụt chậm hơn">
            <line x1="30" y1="260" x2="680" y2="260" className="cc-truc" />
            <line x1="30" y1="20" x2="30" y2="260" className="cc-truc" />
            <path
              className="cc-duong-nho"
              d="M30 40 Q50 200 70 215 L70 40 Q120 170 190 205 L190 40 Q260 140 330 190 L330 40 Q410 110 480 165 L480 40 Q560 80 620 120 L620 40 Q650 55 680 70"
            />
            {MOC_ON.map((moc) => (
              <g key={moc.ngay} className="cc-moc">
                <circle cx={moc.x} cy="40" r="9" />
                <text x={moc.x} y="286" textAnchor="middle">{moc.ngay}</text>
              </g>
            ))}
          </svg>
        </div>
      </section>

      <section className="cc-chuong cc-3" aria-labelledby="cc-3-tieu-de">
        <div className="cc-loi">
          <p className="cc-loi__so">03</p>
          <h2 id="cc-3-tieu-de" className="cc-loi__tieu-de">48 buổi, từng bước một.</h2>
          <p className="cc-loi__buoc">
            Mỗi buổi: từ vựng → lý thuyết → bài tập. Xong buổi nào, đóng dấu buổi đó. Không phải đoán hôm nay học gì.
          </p>
        </div>
        <div className="cc-san-khau">
          <div className="cc-luoi" aria-hidden="true">
            {Array.from({ length: 48 }, (_, i) => (
              <span key={i} className="cc-o">
                {i + 1}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="cc-chuong cc-4" aria-labelledby="cc-4-tieu-de">
        <div className="cc-loi">
          <p className="cc-loi__so">04</p>
          <h2 id="cc-4-tieu-de" className="cc-loi__tieu-de">Một từ, nhiều cách luyện.</h2>
          <p className="cc-loi__buoc">Nhận ra, nhớ lại, nghe, viết, dùng trong câu — mỗi cách khắc từ sâu thêm một chút.</p>
        </div>
        <div className="cc-san-khau">
          <ul className="cc-hang-che-do">
            {CHE_DO.map((cd) => (
              <li key={cd.ten} className="cc-che-do">
                <span className="cc-che-do__ten">{cd.ten}</span>
                <span className="cc-che-do__mo">{cd.mo}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="cc-cuoi" aria-labelledby="cc-cuoi-tieu-de">
        <h2 id="cc-cuoi-tieu-de" className="cc-cuoi__tieu-de">Thẻ đầu tiên đang chờ bạn.</h2>
        <p className="cc-cuoi__mo">Mười phút mỗi ngày. Sổ tay nhớ giúp phần còn lại.</p>
        {/* Bọc ngoài để gsap không đụng transition opacity/transform của .ui-button */}
        <div>
          <Link to={startPath} state={startState} className="ui-button ui-button--primary cc-cuoi__nut">
            Bắt đầu học ngay
          </Link>
        </div>
      </section>
    </div>
  );
}

export default CauChuyenCuon;
