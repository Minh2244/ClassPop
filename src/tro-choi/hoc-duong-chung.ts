// Thư viện vẽ nhân vật Chibi học sinh Việt Nam chuẩn (áo trắng, quần/váy đen, khăn quàng đỏ),
// Cô Giáo mặc áo dài vàng, HUD bảng tên máy chiếu & hàm ngẫu nhiên Crypto dùng chung cho bộ 4 trò "Tuổi Thơ Học Đường".

export const BANG_TOC_CHIBI = ['#18181b', '#2c1810', '#3f2314', '#1e1b4b', '#451a03', '#27272a'];
export const BANG_NO_CHIBI = ['#ef4444', '#f472b6', '#facc15', '#38bdf8', '#fb7185', '#a855f7'];

export function randomInt(max: number): number {
  if (max <= 1) return 0;
  if (window.crypto && window.crypto.getRandomValues) {
    const buf = new Uint32Array(1);
    window.crypto.getRandomValues(buf);
    return buf[0] % max;
  }
  return Math.floor(Math.random() * max);
}

export function randomFloat(): number {
  if (window.crypto && window.crypto.getRandomValues) {
    const buf = new Uint32Array(1);
    window.crypto.getRandomValues(buf);
    return buf[0] / 0xffffffff;
  }
  return Math.random();
}

export function randomRange(min: number, max: number): number {
  return min + randomFloat() * (max - min);
}

export function xaoTronCrypto<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function doanGioiTinhNu(ten: string, idx: number): boolean {
  const lower = ten.toLowerCase();
  const tuKhoaNu = [
    'thị', 'ngọc', 'linh', 'anh', 'vy', 'lan', 'thảo', 'hân', 'trâm', 'my',
    'nhi', 'châu', 'thư', 'ý', 'hà', 'mai', 'hương', 'trang', 'nhung', 'yến',
    'ngân', 'phương', 'quỳnh', 'tiên', 'trinh', 'tuyết', 'uyên', 'chi', 'diễm', 'huyền'
  ];
  const tuKhoaNam = [
    'văn', 'minh', 'đức', 'quân', 'huy', 'nam', 'tuấn', 'kiệt', 'bách', 'trọng',
    'khôi', 'đăng', 'bảo', 'toàn', 'hoàng', 'long', 'phúc', 'dũng', 'hùng', 'khoa',
    'khang', 'lâm', 'mạnh', 'nghĩa', 'nhật', 'phong', 'quang', 'sơn', 'thành', 'trí'
  ];
  for (const k of tuKhoaNu) if (lower.includes(k)) return true;
  for (const k of tuKhoaNam) if (lower.includes(k)) return false;
  return idx % 2 === 1;
}

export function catTenNgan(ten: string, maxLen: number = 18): string {
  if (ten.length <= maxLen) return ten;
  return `${ten.slice(0, maxLen - 1)}…`;
}

export type BieuCamChibi = 'normal' | 'focus' | 'shocked' | 'cheer';

export interface TuyChonVeHocSinh {
  isGirl: boolean;
  hairColor: string;
  ribbonColor?: string;
  facing?: 1 | -1;
  expression?: BieuCamChibi;
  isSaoDo?: boolean;
  blindfold?: boolean;
  reachDir?: -1 | 0 | 1;
  walkCycle?: number;
  jumpOffset?: number;
  kickPhase?: number; // 0..1: đá chân lên (Đá Cầu)
  tripped?: boolean; // Ngồi phịch vấp dây (Nhảy Dây)
  raiseArm?: boolean; // Giơ tay phóng máy bay / cổ vũ
  highlight?: boolean;
}

/**
 * Vẽ học sinh Chibi Việt Nam chuẩn đồng phục:
 * - Áo sơ mi trắng tinh + cổ áo + cúc
 * - Khăn quàng đỏ thắt nút với 2 dải đuôi bay nhẹ
 * - Quần dài đen (nam) / Váy xếp ly đen (nữ) kèm đường sáng tinh tế
 * - Giày thể thao trắng
 */
export function veHocSinhChibi(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  opts: TuyChonVeHocSinh,
  t: number
): void {
  const {
    isGirl,
    hairColor,
    ribbonColor = '#ef4444',
    facing = 1,
    expression = 'normal',
    isSaoDo = false,
    blindfold = false,
    reachDir = 0,
    walkCycle = 0,
    jumpOffset = 0,
    kickPhase = 0,
    tripped = false,
    raiseArm = false,
    highlight = false
  } = opts;

  ctx.save();

  const cheerHop = expression === 'cheer' ? -Math.abs(Math.sin(t * 9.5)) * 10 : 0;
  const totalLift = jumpOffset + cheerHop;

  // Bóng đổ trên mặt sân (cố định ở mặt đất y + 29*scale)
  ctx.save();
  ctx.translate(x, y + 29 * scale);
  const shadowShrink = Math.max(0.45, 1 - Math.abs(totalLift) / 140);
  ctx.fillStyle = highlight ? 'rgba(250, 204, 21, 0.55)' : 'rgba(15, 23, 42, 0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 17 * scale * shadowShrink, 5.2 * scale * shadowShrink, 0, 0, Math.PI * 2);
  ctx.fill();
  if (highlight) {
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.ellipse(0, 0, 22 * scale, 7.5 * scale, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  ctx.translate(x, y + totalLift + (tripped ? 9 * scale : 0));
  ctx.scale(scale, scale);

  const outline = '#0f172a';
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2.1;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Tóc dài phía sau cho bạn nữ
  if (isGirl) {
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.ellipse(0, -17, 19.5, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  const leftSwing = Math.sin(walkCycle) * 5;
  const rightSwing = -leftSwing;

  // === CHÂN + QUẦN ĐEN / VÁY ĐEN + GIÀY TRẮNG ===
  if (tripped) {
    // Dáng ngồi phịch vấp dây siêu hài hước
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.roundRect(-16, 10, 13, 10, 4);
    ctx.roundRect(3, 10, 13, 10, 4);
    ctx.fill();
    ctx.stroke();

    // Giày trắng chĩa ra hai bên
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-18, 17, 6.2, 3.8, -0.35, 0, Math.PI * 2);
    ctx.ellipse(18, 17, 6.2, 3.8, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (isGirl) {
    // Chân nữ + tất trắng + giày trắng
    const kickLiftY = kickPhase > 0 ? -Math.sin(kickPhase * Math.PI) * 10 : 0;
    const kickOutX = kickPhase > 0 ? facing * Math.sin(kickPhase * Math.PI) * 12 : 0;

    ctx.fillStyle = '#fed7aa';
    ctx.fillRect(-7.5, 14 + leftSwing * 0.3, 5, 10);
    ctx.strokeRect(-7.5, 14 + leftSwing * 0.3, 5, 10);

    ctx.save();
    ctx.translate(kickOutX, kickLiftY);
    ctx.fillRect(2.5, 14 + rightSwing * 0.3, 5, 10);
    ctx.strokeRect(2.5, 14 + rightSwing * 0.3, 5, 10);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(5, 25.5 + rightSwing * 0.3, 5.8, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-5, 25.5 + leftSwing * 0.3, 5.8, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Váy xếp ly màu ĐEN (#18181b) với nếp gấp xám sáng rõ nét
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.moveTo(-10.5, 7);
    ctx.lineTo(10.5, 7);
    ctx.lineTo(16, 19);
    ctx.lineTo(-16, 19);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Nếp xếp ly váy đen
    ctx.strokeStyle = '#52525b';
    ctx.lineWidth = 1.25;
    [-6, 0, 6].forEach(px => {
      ctx.beginPath();
      ctx.moveTo(px * 0.72, 8.5);
      ctx.lineTo(px * 1.15, 18);
      ctx.stroke();
    });
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.1;
  } else {
    // Quần dài màu ĐEN chuẩn học sinh nam Việt Nam (#18181b)
    const kickLiftY = kickPhase > 0 ? -Math.sin(kickPhase * Math.PI) * 11 : 0;
    const kickOutX = kickPhase > 0 ? facing * Math.sin(kickPhase * Math.PI) * 13 : 0;

    // Ống quần trái
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.roundRect(-9.5, 7, 8.5, 17 + leftSwing * 0.35, 3);
    ctx.fill();
    ctx.stroke();
    // Điểm sáng ống quần trái
    ctx.strokeStyle = '#52525b';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-6, 10);
    ctx.lineTo(-6, 21 + leftSwing * 0.3);
    ctx.stroke();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.1;

    // Giày trắng trái
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-5.2, 25.5 + leftSwing * 0.35, 6, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Ống quần phải (hỗ trợ đá chân khi Đá Cầu)
    ctx.save();
    ctx.translate(kickOutX, kickLiftY);
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.roundRect(1, 7, 8.5, 17 + rightSwing * 0.35, 3);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#52525b';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(4.5, 10);
    ctx.lineTo(4.5, 21 + rightSwing * 0.3);
    ctx.stroke();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.1;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(5.2, 25.5 + rightSwing * 0.35, 6, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Cạp quần đen liền mạch
    ctx.fillStyle = '#18181b';
    ctx.fillRect(-9.5, 6.5, 19, 4.5);
  }

  // === ÁO SƠ MI TRẮNG TINH + KHĂN QUÀNG ĐỎ ===
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(-11.8, -9.5, 23.6, 18.2, 5);
  ctx.fill();
  ctx.stroke();

  // Hàng cúc áo sơ mi trắng tinh tế
  ctx.fillStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.arc(0, 3.5, 1.1, 0, Math.PI * 2);
  ctx.arc(0, 6.8, 1.1, 0, Math.PI * 2);
  ctx.fill();

  // Cổ áo sơ mi trắng
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-6, -9);
  ctx.lineTo(0, -5);
  ctx.lineTo(6, -9);
  ctx.stroke();

  // Khăn quàng đỏ thắt nút + 2 dải đuôi bay nhẹ!
  const scarfWave = Math.sin(t * 6.5 + x * 0.03) * 1.8;
  ctx.strokeStyle = '#991b1b';
  ctx.lineWidth = 1.1;
  ctx.fillStyle = '#ef4444';
  // Vai khăn đỏ vòng cổ
  ctx.beginPath();
  ctx.moveTo(-8.5, -9);
  ctx.lineTo(8.5, -9);
  ctx.lineTo(5.2, -4);
  ctx.lineTo(-5.2, -4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 2 dải đuôi khăn quàng đỏ thõng xuống ngực
  ctx.beginPath();
  ctx.moveTo(-1.2, -5.2);
  ctx.lineTo(-4.8 + scarfWave * 0.6, 3.8);
  ctx.lineTo(-0.8 + scarfWave * 0.4, 2.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(1.2, -5.2);
  ctx.lineTo(4.8 + scarfWave, 4.6);
  ctx.lineTo(0.8 + scarfWave * 0.5, 2.6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Nút thắt khăn quàng đỏ ở giữa cổ
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.roundRect(-2.4, -7.2, 4.8, 3.8, 1.4);
  ctx.fill();
  ctx.stroke();

  // === HAI CÁNH TAY ÁO TRẮNG (Hỗ trợ Sao Đỏ, Bịt Mắt mò mẫm, Giơ tay) ===
  ([-1, 1] as const).forEach(dir => {
    let hx = dir * 16.5;
    let hy = 4.5 + (dir === -1 ? rightSwing : leftSwing) * 0.45;

    if (blindfold) {
      hx = reachDir !== 0 ? reachDir * 24 + dir * 2.5 : dir * 21;
      hy = -3.5 + Math.sin(t * 7.5 + dir) * 3.5;
    } else if (expression === 'cheer' || expression === 'shocked' || tripped) {
      hx = dir * 18;
      hy = -15 + Math.sin(t * 10 + dir) * 2.2;
    } else if (raiseArm && dir === facing) {
      hx = dir * 18;
      hy = -16;
    }

    // Viền tay áo trắng
    ctx.strokeStyle = outline;
    ctx.lineWidth = 7.4;
    ctx.beginPath();
    ctx.moveTo(dir * 10.5, -3.5);
    ctx.lineTo(hx, hy);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(dir * 10.5, -3.5);
    ctx.lineTo(hx, hy);
    ctx.stroke();

    // Băng tay Sao Đỏ có sao vàng (chỉ vẽ ở tay trái của Sao Đỏ)
    if (isSaoDo && dir === -1) {
      const mx = (dir * 10.5 + hx) * 0.48;
      const my = (-3.5 + hy) * 0.48;
      ctx.fillStyle = '#dc2626';
      ctx.strokeStyle = '#7f1d1d';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(mx - 3.6, my - 2.6, 7.2, 5.2, 1.6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(mx, my, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bàn tay
    ctx.fillStyle = '#fed7aa';
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.arc(hx, hy, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  // === ĐẦU & KHUÔN MẶT ===
  ctx.fillStyle = '#ffedd5';
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2.1;
  ctx.beginPath();
  ctx.arc(0, -23.5, 16.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Má hồng dễ thương
  ctx.fillStyle = expression === 'shocked' ? 'rgba(244, 63, 94, 0.36)' : 'rgba(251, 113, 133, 0.28)';
  ctx.beginPath();
  ctx.ellipse(-9.5, -18.5, 3.4, 2.0, 0, 0, Math.PI * 2);
  ctx.ellipse(9.5, -18.5, 3.4, 2.0, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tóc mái
  ctx.fillStyle = hairColor;
  ctx.beginPath();
  ctx.arc(0, -25.5, 16.8, Math.PI * 1.03, Math.PI * 1.97);
  ctx.lineTo(14.5, -22.5);
  ctx.lineTo(6.5, -28);
  ctx.lineTo(0, -23.5);
  ctx.lineTo(-6.5, -28);
  ctx.lineTo(-14.5, -22.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Nơ cài tóc cho bạn nữ (không chồng với mũ Sao Đỏ)
  if (isGirl && !isSaoDo) {
    ctx.fillStyle = ribbonColor;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(11, -35.5, 4.2, 2.6, -0.4, 0, Math.PI * 2);
    ctx.ellipse(15.5, -33, 4.2, 2.6, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(13.2, -34.2, 2.0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mũ ca-lô Sao Đỏ (nếu là NPC Sao Đỏ)
  if (isSaoDo) {
    ctx.fillStyle = '#dc2626';
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-13, -36.5);
    ctx.lineTo(-7, -45.5);
    ctx.lineTo(7, -45.5);
    ctx.lineTo(13, -36.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Ngôi sao vàng nhỏ trên mũ Sao Đỏ
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(0, -40.8, 2.7, 0, Math.PI * 2);
    ctx.fill();
  }

  // === MẮT & MIỆNG / KHĂN BỊT MẮT ===
  if (blindfold) {
    // Dải khăn đỏ bịt mắt + 2 đuôi nơ bay phía sau
    ctx.fillStyle = '#ef4444';
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 1.9;
    const tieSide = reachDir >= 0 ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(tieSide * 15, -22.5);
    ctx.lineTo(tieSide * 24, -26.5 + Math.sin(t * 8) * 2);
    ctx.lineTo(tieSide * 22, -18 + Math.sin(t * 8) * 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.roundRect(-16.6, -27, 33.2, 9.5, 4);
    ctx.fill();
    ctx.stroke();

    // Miệng cười tinh nghịch khi đang mò mẫm
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.arc(0, -15.5, 3.2, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  } else if (expression === 'shocked') {
    [-5.6, 5.6].forEach(ex => {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(ex, -22.5, 3.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(ex, -22.5, 1.4, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = '#f43f5e';
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -14.5, 3.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Sao quay chóng mặt nếu vấp dây
    if (tripped) {
      for (let s = 0; s < 3; s++) {
        const ang = t * 5 + (s * Math.PI * 2) / 3;
        const sx = Math.cos(ang) * 14;
        const sy = -45 + Math.sin(ang) * 4;
        ctx.fillStyle = '#facc15';
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.arc(sx, sy, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
  } else if (expression === 'cheer') {
    // Mắt cười ^ ^ siêu rạng rỡ
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.1;
    [-5.8, 5.8].forEach(ex => {
      ctx.beginPath();
      ctx.arc(ex, -21.5, 3.2, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    });
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(0, -15.5, 3.6, 0, Math.PI);
    ctx.fill();
    ctx.stroke();
  } else {
    // Bình thường / Tập trung (focus)
    [-5.6, 5.6].forEach(ex => {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(ex + facing * 0.7, -22.5, 2.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex + facing * 0.7 - 0.8, -23.5, 0.95, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.7;
    if (expression === 'focus') {
      ctx.beginPath();
      ctx.moveTo(-3.2, -15.5);
      ctx.lineTo(3.2, -15.5);
      ctx.stroke();
      // Giọt mồ hôi hồi hộp
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(12.5, -29);
      ctx.quadraticCurveTo(15.5, -24.5, 12.5, -23.5);
      ctx.quadraticCurveTo(9.5, -24.5, 12.5, -29);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, -16.2, 3.2, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }
  }

  ctx.restore();
}

export interface TuyChonVeCoGiao {
  expression: 'writing' | 'surprised' | 'smile';
  holdingPlane?: boolean;
  planeColor?: string;
}

/**
 * Vẽ Chibi Cô Giáo Việt Nam mặc Áo Dài Vàng truyền thống + quần lụa trắng kem
 * (đứng bục giảng cạnh bảng xanh trong trò Phóng Máy Bay Giấy)
 */
export function veCoGiaoAoDaiVang(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  opts: TuyChonVeCoGiao,
  t: number
): void {
  const { expression, holdingPlane = false, planeColor = '#fef08a' } = opts;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  const outline = '#1e293b';
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2.1;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Bóng chân
  ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 46, 20, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tóc dài đen thướt tha phía sau
  ctx.fillStyle = '#18181b';
  ctx.beginPath();
  ctx.moveTo(-18, -28);
  ctx.quadraticCurveTo(-24, -4, -19, 14);
  ctx.quadraticCurveTo(0, 18, 19, 14);
  ctx.quadraticCurveTo(24, -4, 18, -28);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Giày búp bê kem/vàng nhạt
  ctx.fillStyle = '#fde68a';
  ctx.beginPath();
  ctx.ellipse(-6.5, 43, 6.2, 3.2, 0, 0, Math.PI * 2);
  ctx.ellipse(6.5, 43, 6.2, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Quần lụa trắng kem thướt tha bên trong tà áo dài
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.moveTo(-12, 16);
  ctx.lineTo(12, 16);
  ctx.lineTo(15, 42);
  ctx.lineTo(-15, 42);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Tà sau áo dài vàng nhạt hơn một chút để tạo chiều sâu
  const sway = Math.sin(t * 2.2) * 2.5;
  ctx.fillStyle = '#eab308';
  ctx.beginPath();
  ctx.moveTo(-11, 14);
  ctx.lineTo(11, 14);
  ctx.lineTo(16.5 + sway, 38);
  ctx.lineTo(-16.5 + sway, 38);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Thân áo dài vàng rực rỡ + tà trước mềm mại
  const aoGrad = ctx.createLinearGradient(0, -12, 0, 38);
  aoGrad.addColorStop(0, '#fde047');
  aoGrad.addColorStop(0.55, '#facc15');
  aoGrad.addColorStop(1, '#eab308');
  ctx.fillStyle = aoGrad;

  // Phần thân trên ôm gọn
  ctx.beginPath();
  ctx.moveTo(-12, -10);
  ctx.lineTo(12, -10);
  ctx.quadraticCurveTo(13, 3, 10, 12);
  ctx.lineTo(13.5 + sway * 0.7, 36);
  ctx.quadraticCurveTo(0, 39, -13.5 + sway * 0.7, 36);
  ctx.lineTo(-10, 12);
  ctx.quadraticCurveTo(-13, 3, -12, -10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Cổ trụ áo dài truyền thống + đường viền hoa mai nhỏ
  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.roundRect(-6.5, -13.5, 13, 5.2, 2);
  ctx.fill();
  ctx.stroke();

  // Đường tà xéo duyên dáng
  ctx.strokeStyle = '#ca8a04';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(4, -9);
  ctx.quadraticCurveTo(7.5, 0, 8.5, 11);
  ctx.stroke();

  // Hoa mai trang trí tinh tế trên tà áo dài vàng
  ctx.fillStyle = '#fffbeb';
  ctx.beginPath();
  ctx.arc(-4.5, 22, 2.2, 0, Math.PI * 2);
  ctx.arc(-1.2, 25.5, 1.8, 0, Math.PI * 2);
  ctx.arc(-6.2, 26.5, 1.6, 0, Math.PI * 2);
  ctx.fill();

  // === HAI TAY ÁO DÀI VÀNG ===
  // Tay phải (về bên phải bảng, cầm phấn hoặc thước gỗ)
  const rightHandX = expression === 'writing' ? 21 : 17;
  const rightHandY = expression === 'writing' ? -12 + Math.sin(t * 7) * 3 : 5;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 7.6;
  ctx.beginPath();
  ctx.moveTo(11, -5);
  ctx.lineTo(rightHandX, rightHandY);
  ctx.stroke();
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 4.4;
  ctx.beginPath();
  ctx.moveTo(11, -5);
  ctx.lineTo(rightHandX, rightHandY);
  ctx.stroke();
  ctx.fillStyle = '#fed7aa';
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  ctx.arc(rightHandX, rightHandY, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Viên phấn trắng khi đang viết bảng
  if (expression === 'writing') {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(rightHandX + 1, rightHandY - 1);
    ctx.lineTo(rightHandX + 7, rightHandY - 5);
    ctx.stroke();
  }

  // Tay trái (giơ lên bất ngờ hoặc nâng máy bay giấy Winner!)
  const leftHandX = holdingPlane ? -21 : expression === 'surprised' ? -19 : -16;
  const leftHandY = holdingPlane ? -12 : expression === 'surprised' ? -11 : 6;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 7.6;
  ctx.beginPath();
  ctx.moveTo(-11, -5);
  ctx.lineTo(leftHandX, leftHandY);
  ctx.stroke();
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 4.4;
  ctx.beginPath();
  ctx.moveTo(-11, -5);
  ctx.lineTo(leftHandX, leftHandY);
  ctx.stroke();
  ctx.fillStyle = '#fed7aa';
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  ctx.arc(leftHandX, leftHandY, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Nếu cô đang nhặt & giơ máy bay giấy Winner lên đọc tên!
  if (holdingPlane) {
    ctx.save();
    ctx.translate(leftHandX - 5, leftHandY - 8);
    ctx.rotate(-0.35);
    ctx.fillStyle = planeColor;
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(-12, -8);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-12, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // === ĐẦU & KHUÔN MẶT DỊU DÀNG ===
  ctx.fillStyle = '#ffedd5';
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2.1;
  ctx.beginPath();
  ctx.arc(0, -28.5, 16.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Má hồng
  ctx.fillStyle = 'rgba(251, 113, 133, 0.28)';
  ctx.beginPath();
  ctx.ellipse(-9.5, -23.5, 3.4, 2.0, 0, 0, Math.PI * 2);
  ctx.ellipse(9.5, -23.5, 3.4, 2.0, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tóc mái dịu dàng + kẹp nơ vàng nhỏ
  ctx.fillStyle = '#18181b';
  ctx.beginPath();
  ctx.arc(0, -30.5, 17, Math.PI * 1.02, Math.PI * 1.98);
  ctx.quadraticCurveTo(12, -25, 2, -31.5);
  ctx.quadraticCurveTo(-8, -26, -15.5, -27.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Kẹp tóc hình bông hoa vàng
  ctx.fillStyle = '#facc15';
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(-11.5, -35.5, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Mắt kính tròn thanh lịch của Cô Giáo
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(-5.8, -27.5, 4.6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(5.8, -27.5, 4.6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-1.2, -27.5);
  ctx.lineTo(1.2, -27.5);
  ctx.stroke();

  // Biểu cảm mắt & miệng
  if (expression === 'surprised') {
    [-5.8, 5.8].forEach(ex => {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(ex - 0.8, -27.5, 2.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex - 1.5, -28.3, 0.8, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = '#f43f5e';
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, -19.5, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (expression === 'smile') {
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2;
    [-5.8, 5.8].forEach(ex => {
      ctx.beginPath();
      ctx.arc(ex, -26.8, 2.8, Math.PI * 1.12, Math.PI * 1.88);
      ctx.stroke();
    });
    ctx.strokeStyle = '#e11d48';
    ctx.lineWidth = 1.9;
    ctx.beginPath();
    ctx.arc(0, -21, 3.8, 0.12 * Math.PI, 0.88 * Math.PI);
    ctx.stroke();
  } else {
    [-5.8, 5.8].forEach(ex => {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(ex + 1, -27.5, 2.2, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.strokeStyle = '#e11d48';
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.arc(0, -21, 3.1, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Vẽ bảng tên học sinh chuẩn máy chiếu (chữ đậm 800, nền viên thuốc nổi bật, không đè nhau)
 */
export function veBangTenHocSinh(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ten: string,
  opts?: { highlight?: boolean; prefix?: string; maxLen?: number; fontSize?: number }
): void {
  const highlight = opts?.highlight ?? false;
  const maxLen = opts?.maxLen ?? 18;
  const fontSize = opts?.fontSize ?? (highlight ? 15 : 13.5);
  const label = `${opts?.prefix ?? ''}${catTenNgan(ten, maxLen)}`;

  ctx.save();
  ctx.font = `800 ${fontSize}px "Segoe UI", system-ui, -apple-system, sans-serif`;
  const tw = ctx.measureText(label).width + 20;
  const th = highlight ? 28 : 25;

  if (highlight) {
    ctx.shadowColor = 'rgba(250, 204, 21, 0.75)';
    ctx.shadowBlur = 14;
  }

  ctx.fillStyle = highlight ? '#fef08a' : 'rgba(255, 255, 255, 0.96)';
  ctx.strokeStyle = highlight ? '#dc2626' : '#0f172a';
  ctx.lineWidth = highlight ? 2.8 : 1.9;
  ctx.beginPath();
  ctx.roundRect(x - tw / 2, y - th / 2, tw, th, 10);
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = highlight ? '#7f1d1d' : '#0f172a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y + 0.5);
  ctx.restore();
}

/**
 * Vẽ bong bóng thoại vui nhộn phía trên nhân vật
 */
export function veBongBongThoai(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  opts?: { bg?: string; border?: string; color?: string }
): void {
  const bg = opts?.bg ?? '#fef08a';
  const border = opts?.border ?? '#ca8a04';
  const color = opts?.color ?? '#713f12';

  ctx.save();
  ctx.font = '800 12.5px "Segoe UI", system-ui, sans-serif';
  const tw = ctx.measureText(text).width + 20;
  const th = 25;

  ctx.fillStyle = bg;
  ctx.strokeStyle = border;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x - tw / 2, y - th, tw, th, 11);
  ctx.fill();
  ctx.stroke();

  // Mũi nhọn bong bóng
  ctx.beginPath();
  ctx.moveTo(x - 5, y - 1);
  ctx.lineTo(x + 5, y - 1);
  ctx.lineTo(x, y + 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y - th / 2 + 0.5);
  ctx.restore();
}

/**
 * Vẽ Mini-Radar gọn góc phải dưới cho các trò có sân trường mở rộng (>= 15 HS)
 */
export function veMiniRadar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  dots: { xNorm: number; yNorm: number; color: string; r?: number }[],
  camLeftNorm: number,
  camRightNorm: number
): void {
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.84)';
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.7)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 11);
  ctx.fill();
  ctx.stroke();

  ctx.font = '800 10px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#e2e8f0';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(title, x + 9, y + 6);

  const padX = 8;
  const innerX = x + padX;
  const innerY = y + 21;
  const innerW = w - padX * 2;
  const innerH = h - 27;

  // Khung viewport camera
  const vx = innerX + Math.max(0, Math.min(1, camLeftNorm)) * innerW;
  const vx2 = innerX + Math.max(0, Math.min(1, camRightNorm)) * innerW;
  ctx.fillStyle = 'rgba(250, 204, 21, 0.16)';
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(vx, innerY, Math.max(10, vx2 - vx), innerH);
  ctx.fillRect(vx, innerY, Math.max(10, vx2 - vx), innerH);

  // Các chấm học sinh / tâm điểm
  dots.forEach(d => {
    const dx = innerX + Math.max(0, Math.min(1, d.xNorm)) * innerW;
    const dy = innerY + Math.max(0, Math.min(1, d.yNorm)) * innerH;
    ctx.fillStyle = d.color;
    ctx.beginPath();
    ctx.arc(dx, dy, d.r ?? 2.3, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}
