let phienKho = { chuSoHuu: "guest" };

export function chonKhoHocTap(userId) {
  const chuSoHuu = userId == null ? "guest" : `user-${userId}`;
  if (phienKho.chuSoHuu !== chuSoHuu) phienKho = { chuSoHuu };
  return phienKho;
}

export function layPhienKhoHocTap() {
  return phienKho;
}

export function laPhienKhoHienTai(phien) {
  return phien === phienKho;
}

// Kho cũ không có chủ sở hữu: giữ nguyên, không tự nhập vào tài khoản mới.
export function khoaKhoHocTap(khoa, phien = phienKho) {
  return `${khoa}:${phien.chuSoHuu}`;
}
