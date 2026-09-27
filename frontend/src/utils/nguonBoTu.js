// Nguồn của bộ từ (backend deckController): "user" | "sample" | "course" | "roadmap".
// Nguồn quyết định bộ hiện ở đâu, có sửa được không và nút quay lại dẫn về đâu.

/**
 * Buổi học / chặng lộ trình chứa bộ từ, để trang chi tiết bộ quay lại đúng chỗ.
 * @returns {{ to: string, nhan: string } | null} null nếu là bộ độc lập
 */
export function layNoiChuaBo(bo) {
  const cha = bo?.parent;
  if (!cha) return null;
  if (bo.source === "course") {
    return { to: `/khoa-hoc/${cha.course_id}/bai/${cha.lesson_number}`, nhan: `Buổi ${cha.lesson_number}` };
  }
  if (bo.source === "roadmap") {
    return { to: `/roadmap/${cha.slug}`, nhan: cha.title };
  }
  return null;
}

function thongTinNhom(bo) {
  const cha = bo.parent;
  if (bo.source === "course" && cha) return { khoa: `course-${cha.course_id}`, nhan: cha.course_title };
  if (bo.source === "roadmap" && cha) return { khoa: `roadmap-${cha.slug}`, nhan: `Lộ trình: ${cha.title}` };
  if (bo.source === "sample") return { khoa: "sample", nhan: "Bộ từ mẫu" };
  return { khoa: "user", nhan: "Bộ từ của tôi" };
}

/**
 * Nhóm bộ từ theo nguồn cho ô chọn ở trang Luyện tập, giữ thứ tự backend trả về.
 * @returns {{ khoa: string, nhan: string, danhSach: object[] }[]}
 */
export function nhomBoTuTheoNguon(danhSach) {
  const cacNhom = new Map();
  for (const bo of danhSach) {
    const { khoa, nhan } = thongTinNhom(bo);
    if (!cacNhom.has(khoa)) cacNhom.set(khoa, { khoa, nhan, danhSach: [] });
    cacNhom.get(khoa).danhSach.push(bo);
  }
  return [...cacNhom.values()];
}
