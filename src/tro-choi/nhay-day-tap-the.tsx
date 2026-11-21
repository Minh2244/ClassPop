// Trò chơi Tuổi Thơ Học Đường #3: 🪢 Nhảy Dây Tập Thể
// Bối cảnh: Sân bóng râm cây phượng vĩ đỏ giờ ra chơi (10:15) • 2 Bạn Sao Đỏ trung lập quay dây 2 đầu
// Dòng học sinh áo trắng quần đen khăn quàng đỏ chạy vòng số 8 nối đuôi liên tục (cân 1–1.000+ HS không chia đợt!)
// Tự động 100% thuần 1-Click • Dây đổi nhịp bất ngờ & vấp dây hài hước trong 12–28s (tối đa 30s)
import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { HocSinh } from '../dich-vu/quan-ly-danh-sach';
import { amThanh } from '../dich-vu/am-thanh';
import {
  BANG_TOC_CHIBI,
  BANG_NO_CHIBI,
  randomInt,
  randomRange,
  xaoTronCrypto,
  doanGioiTinhNu,
  veHocSinhChibi,
  veBangTenHocSinh,
  veBongBongThoai
} from './hoc-duong-chung';

interface NhayDayTapTheProps {
  danhSach: HocSinh[];
  dangChoi: boolean;
  mucTieuIndex: number | null;
  onBatDauChoi: () => void;
  onHoanThanh: (nguoiThang?: HocSinh) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

interface LoopRunner {
  slotId: number;
  hs: HocSinh;
  origIndex: number;
  isGirl: boolean;
  hairColor: string;
  ribbonColor: string;
  progress: number; // 0..1 vòng số 8 (0.14..0.52 là đường chạy qua dây từ trái sang phải!)
  speech: string;
  speechUntilMs: number;
  tripped: boolean;
  isWinnerSlot: boolean;
}

interface CanhPhuong {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vRot: number;
  size: number;
}

interface HatSao {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
  color: string;
}

const CANVAS_W = 1100;
const CANVAS_H = 580;
const ROPE_LEFT_X = 225;
const ROPE_RIGHT_X = 875;
const ROPE_MID_X = 550;
const ROPE_HAND_Y = 392;
const ROPE_GROUND_Y = 448;

const CAU_NHAY_THOAT = [
  '😎 Quá dễ!',
  '😅 Suýt vấp!',
  '🔥 Đỉnh quá!',
  '😆 Nhảy siêu chưa!',
  '💨 Hú hồn!'
];

/**
 * Chuyển đổi progress (0..1) thành tọa độ (x, y, scale, inRopeZone, facing) của vòng chạy số 8 nối đuôi liên tục!
 * - 0.14 -> 0.52: Chạy vào dây từ trái sang phải (tâm sân phía trước, to rõ nhất!)
 * - 0.52 -> 0.64: Vòng sang phải ra phía sau bạn Sao Đỏ phải
 * - 0.64 -> 0.90: Chạy vòng hàng sau quay về bên trái (nhỏ dần theo phối cảnh)
 * - 0.90 -> 1.00 & 0.00 -> 0.14: Xếp hàng tiến vào cửa dây bên trái
 */
function tinhViTriVongSo8(progress: number): {
  x: number;
  y: number;
  scale: number;
  inRopeZone: boolean;
  nearRopeZone: boolean;
  facing: 1 | -1;
  isFront: boolean;
} {
  const p = ((progress % 1) + 1) % 1;

  if (p >= 0.14 && p <= 0.52) {
    const u = (p - 0.14) / 0.38; // 0 -> 1 ngang qua dây
    const x = 285 + u * 530;
    const y = 415 + Math.sin(u * Math.PI) * 10;
    const inRope = x >= 355 && x <= 745;
    return {
      x,
      y,
      scale: 1.05,
      inRopeZone: inRope,
      nearRopeZone: true,
      facing: 1,
      isFront: true
    };
  }

  if (p > 0.52 && p < 0.65) {
    const u = (p - 0.52) / 0.13;
    const ang = -Math.PI / 2 + u * Math.PI;
    const x = 815 + Math.cos(ang) * 135;
    const y = 372 - Math.sin(ang) * 44;
    return {
      x,
      y,
      scale: 1.05 - u * 0.23,
      inRopeZone: false,
      nearRopeZone: u < 0.35,
      facing: u < 0.5 ? 1 : -1,
      isFront: u < 0.5
    };
  }

  if (p >= 0.65 && p <= 0.90) {
    const u = (p - 0.65) / 0.25;
    const x = 815 - u * 530;
    const y = 326 - Math.sin(u * Math.PI) * 14;
    return {
      x,
      y,
      scale: 0.8,
      inRopeZone: false,
      nearRopeZone: false,
      facing: -1,
      isFront: false
    };
  }

  // Đoạn uốn bên trái tiến vào dây (0.90 -> 1.00 -> 0.14)
  const rawU = p >= 0.90 ? (p - 0.90) / 0.24 : (p + 0.10) / 0.24;
  const ang = Math.PI / 2 + rawU * Math.PI;
  const x = 285 + Math.cos(ang) * 135;
  const y = 372 - Math.sin(ang) * 44;
  return {
    x,
    y,
    scale: 0.8 + rawU * 0.25,
    inRopeZone: false,
    nearRopeZone: rawU > 0.62,
    facing: rawU > 0.5 ? 1 : -1,
    isFront: rawU > 0.5
  };
}

export const NhayDayTapThe: React.FC<NhayDayTapTheProps> = ({
  danhSach,
  dangChoi,
  mucTieuIndex,
  onBatDauChoi,
  onHoanThanh,
  isFullscreen = false,
  onToggleFullscreen
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hudText, setHudText] = useState<string>('🪢 Sẵn sàng Nhảy Dây Tập Thể dưới bóng cây phượng!');

  const onHoanThanhRef = useRef(onHoanThanh);
  useEffect(() => {
    onHoanThanhRef.current = onHoanThanh;
  }, [onHoanThanh]);

  const mucTieuIndexRef = useRef(mucTieuIndex);
  useEffect(() => {
    mucTieuIndexRef.current = mucTieuIndex;
  }, [mucTieuIndex]);

  const stateRef = useRef<{
    runners: LoopRunner[];
    smallClassMode: boolean; // Lớp 1–3 HS đứng luôn trong dây nhảy liên tục
    shuffledOrder: number[];
    queueCursor: number;
    winnerOrigIdx: number;
    winnerHs: HocSinh | null;
    petals: CanhPhuong[];
    sparkles: HatSao[];
    ropePhase: number;
    prevRopeSin: number;
    ropeSpeedMult: number;
    tripTargetMs: number;
    fakeSlowStartMs: number;
    fakeSlowEndMs: number;
    winnerInjected: boolean;
    trippedAtMs: number;
    trippedRunnerIdx: number;
    camZoom: number;
    startTime: number;
    daKetThuc: boolean;
    lastHudMs: number;
    saoDoSpeech: string;
    animId: number;
  }>({
    runners: [],
    smallClassMode: false,
    shuffledOrder: [],
    queueCursor: 0,
    winnerOrigIdx: 0,
    winnerHs: null,
    petals: [],
    sparkles: [],
    ropePhase: 0,
    prevRopeSin: 0,
    ropeSpeedMult: 1,
    tripTargetMs: 18000,
    fakeSlowStartMs: 9000,
    fakeSlowEndMs: 11200,
    winnerInjected: false,
    trippedAtMs: 0,
    trippedRunnerIdx: -1,
    camZoom: 1,
    startTime: 0,
    daKetThuc: false,
    lastHudMs: 0,
    saoDoSpeech: '',
    animId: 0
  });

  const khoiTaoSanPhuong = useCallback((forGameStart: boolean) => {
    const st = stateRef.current;
    const n = danhSach.length;

    // Sinh cánh hoa phượng rơi nhẹ nếu chưa có
    if (st.petals.length === 0) {
      for (let i = 0; i < 24; i++) {
        st.petals.push({
          x: randomRange(0, CANVAS_W),
          y: randomRange(0, CANVAS_H),
          vx: randomRange(-24, -8),
          vy: randomRange(16, 36),
          rot: randomRange(0, Math.PI * 2),
          vRot: randomRange(-2.2, 2.2),
          size: randomRange(4, 7.5)
        });
      }
    }

    if (n === 0) {
      st.runners = [];
      st.winnerHs = null;
      setHudText('🪢 Hãy thêm học sinh để bắt đầu Nhảy Dây Tập Thể!');
      return;
    }

    const rawTarget =
      mucTieuIndexRef.current !== null && mucTieuIndexRef.current >= 0 && mucTieuIndexRef.current < n
        ? mucTieuIndexRef.current
        : randomInt(n);
    st.winnerOrigIdx = rawTarget;
    st.winnerHs = danhSach[rawTarget];

    const smallClassMode = n <= 3;
    st.smallClassMode = smallClassMode;

    // Trộn danh sách ngẫu nhiên bằng Crypto RNG để dòng số 8 luân chuyển công bằng qua cả lớp đông!
    const shuffledOrder = xaoTronCrypto(Array.from({ length: n }, (_, i) => i));
    st.shuffledOrder = shuffledOrder;

    const slotCount = smallClassMode ? n : Math.min(14, n);
    const runners: LoopRunner[] = [];
    for (let s = 0; s < slotCount; s++) {
      const origIdx = shuffledOrder[s % n];
      const hs = danhSach[origIdx];
      runners.push({
        slotId: s,
        hs,
        origIndex: origIdx,
        isGirl: doanGioiTinhNu(hs.ten, origIdx),
        hairColor: BANG_TOC_CHIBI[origIdx % BANG_TOC_CHIBI.length],
        ribbonColor: BANG_NO_CHIBI[origIdx % BANG_NO_CHIBI.length],
        progress: smallClassMode ? 0.33 : (s / slotCount + 0.08) % 1,
        speech: '',
        speechUntilMs: 0,
        tripped: false,
        isWinnerSlot: origIdx === rawTarget
      });
    }

    st.runners = runners;
    st.queueCursor = slotCount % n;
    st.ropePhase = 0.2;
    st.prevRopeSin = Math.sin(0.2);
    st.ropeSpeedMult = 1;
    st.winnerInjected = false;
    st.trippedAtMs = 0;
    st.trippedRunnerIdx = -1;
    st.camZoom = 1;
    st.sparkles = [];
    st.daKetThuc = false;
    st.lastHudMs = 0;
    st.saoDoSpeech = '';

    if (forGameStart) {
      // Tự động biến thiên ngẫu nhiên thời điểm vấp dây từ 12.5s đến 26.2s (tối đa 30s!)
      const tripTargetMs = randomRange(12500, 26000);
      st.tripTargetMs = tripTargetMs;
      // Pha giả vờ quay chậm đánh lừa nằm giữa ván!
      st.fakeSlowStartMs = Math.max(5200, tripTargetMs * 0.45);
      st.fakeSlowEndMs = st.fakeSlowStartMs + randomRange(2000, 2600);
      st.startTime = performance.now();
      setHudText(`🪢 BẮT ĐẦU QUAY DÂY! ${n} HS chạy vòng số 8 nối đuôi qua dây!`);
    } else {
      setHudText(`🪢 Sân cây phượng sẵn sàng • ${n} HS xếp vòng chờ nhảy dây tập thể!`);
    }
  }, [danhSach]);

  useEffect(() => {
    if (!dangChoi) {
      khoiTaoSanPhuong(false);
    }
  }, [danhSach, dangChoi, khoiTaoSanPhuong]);

  const prevDangChoiRef = useRef<boolean>(false);
  useEffect(() => {
    if (dangChoi && !prevDangChoiRef.current) {
      khoiTaoSanPhuong(true);
    } else if (!dangChoi && prevDangChoiRef.current) {
      stateRef.current.daKetThuc = false;
    }
    prevDangChoiRef.current = dangChoi;
  }, [dangChoi, khoiTaoSanPhuong]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    let lastTime = performance.now();

    const spawnTripConfetti = (cx: number, cy: number) => {
      const cols = ['#ef4444', '#facc15', '#22c55e', '#38bdf8', '#f472b6', '#ffffff'];
      for (let i = 0; i < 42; i++) {
        const ang = randomRange(0, Math.PI * 2);
        const spd = randomRange(80, 280);
        stateRef.current.sparkles.push({
          x: cx,
          y: cy - 18,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 125,
          r: randomRange(3, 6.5),
          alpha: 1,
          color: cols[i % cols.length]
        });
      }
    };

    const drawPhoenixCorridorScene = (t: number) => {
      // 1. Nền trời nắng trưa 10:15 dịu nhẹ sau hành lang
      const sky = ctx.createLinearGradient(0, 0, 0, 175);
      sky.addColorStop(0, '#38bdf8');
      sky.addColorStop(1, '#fef9c3');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, CANVAS_W, 180);

      // 2. Hành lang lớp học Việt Nam nhìn ngang (cột vàng kem, cửa gỗ xanh, lan can)
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(0, 96, CANVAS_W, 190);
      // Mái hiên ngói cam đỏ
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(0, 74, CANVAS_W, 24);
      ctx.fillStyle = '#c2410c';
      ctx.fillRect(0, 94, CANVAS_W, 7);

      // Các ô cửa lớp màu xanh lá nhạt dọc hành lang
      for (let i = 0; i < 5; i++) {
        const dx = 125 + i * 205;
        ctx.fillStyle = '#15803d';
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 3;
        ctx.fillRect(dx, 132, 68, 134);
        ctx.strokeRect(dx, 132, 68, 134);
        // Cửa sổ kế bên
        ctx.fillStyle = '#7dd3fc';
        ctx.fillRect(dx + 84, 144, 66, 62);
        ctx.strokeRect(dx + 84, 144, 66, 62);
      }

      // Cột hành lang + Lan can trắng thanh thoát
      ctx.fillStyle = '#fde68a';
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2;
      for (let cx = 60; cx <= CANVAS_W; cx += 245) {
        ctx.fillRect(cx - 10, 100, 20, 185);
        ctx.strokeRect(cx - 10, 100, 20, 185);
      }
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#94a3b8';
      ctx.fillRect(0, 242, CANVAS_W, 10);
      ctx.strokeRect(0, 242, CANVAS_W, 10);

      // 3. Sân gạch bông vàng sáng có bóng nắng loang dưới tán cây phượng!
      const groundGrad = ctx.createLinearGradient(0, 282, 0, CANVAS_H);
      groundGrad.addColorStop(0, '#fef9c3');
      groundGrad.addColorStop(1, '#fde68a');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, 282, CANVAS_W, CANVAS_H - 282);

      // Đường kẻ ô gạch sân ấm áp
      ctx.strokeStyle = 'rgba(217, 119, 6, 0.16)';
      ctx.lineWidth = 1.3;
      for (let gx = 0; gx <= CANVAS_W; gx += 75) {
        ctx.beginPath();
        ctx.moveTo(gx, 282);
        ctx.lineTo(gx, CANVAS_H);
        ctx.stroke();
      }
      for (let gy = 315; gy < CANVAS_H; gy += 46) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(CANVAS_W, gy);
        ctx.stroke();
      }

      // Bóng râm dịu của tán cây phượng 2 góc + vệt nắng lung linh ở giữa sân
      ctx.fillStyle = 'rgba(22, 101, 52, 0.12)';
      ctx.beginPath();
      ctx.ellipse(90, 395, 195, 95, 0, 0, Math.PI * 2);
      ctx.ellipse(CANVAS_W - 90, 395, 195, 95, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dấu vòng số 8 phấn trắng mờ dưới nền sân cho dễ hình dung dòng chạy!
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.lineWidth = 3.5;
      ctx.setLineDash([12, 10]);
      ctx.beginPath();
      ctx.roundRect(150, 316, 800, 128, 64);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Ghế đá ngồi hóng mát dưới gốc phượng
      [110, CANVAS_W - 110].forEach(bx => {
        ctx.fillStyle = '#e2e8f0';
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.fillRect(bx - 42, 272, 84, 14);
        ctx.strokeRect(bx - 42, 272, 84, 14);
        ctx.fillRect(bx - 32, 286, 10, 12);
        ctx.fillRect(bx + 22, 286, 10, 12);
      });

      // 4. Hai CÂY PHƯỢNG VĨ ĐỎ RỰC tỏa tán 2 bên góc trên (siêu đặc trưng tuổi học trò VN!)
      [
        { trunkX: 28, crownX: 75, dir: 1 },
        { trunkX: CANVAS_W - 28, crownX: CANVAS_W - 75, dir: -1 }
      ].forEach(tree => {
        // Thân cây phượng
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.moveTo(tree.trunkX - 18, 302);
        ctx.lineTo(tree.trunkX - 10, 105);
        ctx.lineTo(tree.trunkX + 16, 105);
        ctx.lineTo(tree.trunkX + 24, 302);
        ctx.closePath();
        ctx.fill();

        // Tán lá phượng xanh mượt liền khối
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(tree.crownX, 78, 86, 0, Math.PI * 2);
        ctx.arc(tree.crownX + tree.dir * 82, 58, 68, 0, Math.PI * 2);
        ctx.arc(tree.crownX + tree.dir * 145, 36, 52, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(tree.crownX + tree.dir * 26, 62, 56, 0, Math.PI * 2);
        ctx.arc(tree.crownX + tree.dir * 100, 48, 44, 0, Math.PI * 2);
        ctx.fill();

        // Chùm hoa phượng đỏ cam rực rỡ đung đưa nhẹ
        const sway = Math.sin(t * 2 + tree.dir) * 3;
        const clusters = [
          { dx: 10, dy: 82, r: 22 },
          { dx: 68, dy: 64, r: 24 },
          { dx: 122, dy: 44, r: 19 },
          { dx: 42, dy: 108, r: 16 }
        ];
        clusters.forEach((c, idx) => {
          ctx.fillStyle = idx % 2 === 0 ? '#ef4444' : '#f97316';
          ctx.beginPath();
          ctx.arc(tree.crownX + tree.dir * c.dx + sway, c.dy, c.r, 0, Math.PI * 2);
          ctx.fill();
        });
      });
    };

    const drawRope = (phase: number, speedMult: number, isTripped: boolean, trippedX: number) => {
      const sinP = Math.sin(phase);
      const midY = isTripped ? ROPE_GROUND_Y - 12 : 345 + sinP * 140;

      // Bóng dây đổ trên sân gạch
      ctx.save();
      const shadowAlpha = isTripped ? 0.35 : Math.max(0.08, (sinP + 1) * 0.2);
      ctx.strokeStyle = `rgba(15, 23, 42, ${shadowAlpha})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(ROPE_LEFT_X + 18, ROPE_GROUND_Y);
      ctx.quadraticCurveTo(ROPE_MID_X, ROPE_GROUND_Y + 12, ROPE_RIGHT_X - 18, ROPE_GROUND_Y);
      ctx.stroke();

      // Vệt mờ chuyển động khi dây quay siêu tốc!
      if (!isTripped && speedMult >= 1.45) {
        ctx.strokeStyle = 'rgba(251, 146, 60, 0.28)';
        ctx.lineWidth = 11;
        ctx.beginPath();
        ctx.moveTo(ROPE_LEFT_X + 18, ROPE_HAND_Y);
        ctx.quadraticCurveTo(ROPE_MID_X, 345 + Math.sin(phase - 0.25) * 140, ROPE_RIGHT_X - 18, ROPE_HAND_Y);
        ctx.stroke();
      }

      // Thân sợi dây sọc cam-vàng (chuyển đỏ khi vấp!)
      ctx.strokeStyle = '#7c2d12';
      ctx.lineWidth = 8.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ROPE_LEFT_X + 18, ROPE_HAND_Y);
      if (isTripped) {
        ctx.lineTo(trippedX, ROPE_GROUND_Y - 12);
        ctx.lineTo(ROPE_RIGHT_X - 18, ROPE_HAND_Y);
      } else {
        ctx.quadraticCurveTo(ROPE_MID_X, midY, ROPE_RIGHT_X - 18, ROPE_HAND_Y);
      }
      ctx.stroke();

      ctx.strokeStyle = isTripped ? '#ef4444' : '#f59e0b';
      ctx.lineWidth = 5.2;
      ctx.stroke();

      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2.6;
      ctx.setLineDash([12, 14]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    };

    const render = (now: number) => {
      if (!running) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      const t = now / 1000;
      const st = stateRef.current;

      // Cánh hoa phượng rơi nhẹ liên tục
      st.petals.forEach(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vRot * dt;
        if (p.y > CANVAS_H + 15) { p.y = -15; p.x = randomRange(40, CANVAS_W + 60); }
        if (p.x < -15) { p.x = CANVAS_W + 15; }
      });

      const isTripped = st.trippedAtMs > 0;

      // === CẬP NHẬT CHUYỂN ĐỘNG DÂY & DÒNG HỌC SINH CHẠY SỐ 8 ===
      if (dangChoi && st.runners.length > 0) {
        const elapsed = now - st.startTime;

        if (!isTripped) {
          // Tính hệ số tốc độ dây biến hóa lắt léo: x1.0 -> x1.55 -> giả chậm x0.78 -> vút x2.25!
          let targetMult = 1.05;
          if (elapsed < 4200) {
            targetMult = 1.05 + (elapsed / 4200) * 0.35;
            st.saoDoSpeech = '';
          } else if (elapsed >= st.fakeSlowStartMs && elapsed <= st.fakeSlowEndMs) {
            targetMult = 0.78;
            st.saoDoSpeech = '😜 Giả vờ chậm nha!';
          } else if (elapsed < st.fakeSlowStartMs) {
            targetMult = 1.52;
            st.saoDoSpeech = '⚡ Tăng tốc nè!';
          } else {
            const ramp = Math.min(1, (elapsed - st.fakeSlowEndMs) / 4500);
            targetMult = 1.65 + ramp * 0.65;
            st.saoDoSpeech = ramp > 0.55 ? '🔥 SIÊU TỐC ĐỘ!!' : '⚡ Quay nhanh lên!';
          }

          st.ropeSpeedMult += (targetMult - st.ropeSpeedMult) * Math.min(1, dt * 4.2);
          const angularVel = 4.6 * st.ropeSpeedMult;
          st.ropePhase += dt * angularVel;

          // Tiếng dây vút mỗi khi chạm điểm thấp nhất!
          const curSin = Math.sin(st.ropePhase);
          if (st.prevRopeSin < 0.9 && curSin >= 0.9) {
            amThanh.phatTiengQuayDay(st.ropeSpeedMult);
          }
          st.prevRopeSin = curSin;

          // Tiến dòng người chạy vòng số 8 (nếu lớp >= 4 HS)
          if (!st.smallClassMode) {
            const loopSpeed = 0.088 + st.ropeSpeedMult * 0.028;
            const approachTrip = elapsed >= st.tripTargetMs - 3400;

            st.runners.forEach(r => {
              const prevP = r.progress;
              r.progress = (r.progress + dt * loopSpeed) % 1;

              // Khi hoàn tất vòng sau tiến vào cửa dây bên trái -> nạp học sinh kế tiếp của lớp đông!
              // QUAN TRỌNG: Không bao giờ ghi đè slot của Winner khi đã gần đến nhịp chốt!
              if (prevP > 0.88 && r.progress <= 0.14 && danhSach.length > st.runners.length) {
                if (r.isWinnerSlot && approachTrip) {
                  // Giữ nguyên Winner để chắc chắn tiến vào giữa dây!
                } else if (approachTrip && !st.runners.some(o => o.isWinnerSlot) && st.winnerHs) {
                  // Đưa chắc chắn Winner vào cửa dây đúng nhịp chốt!
                  r.hs = st.winnerHs;
                  r.origIndex = st.winnerOrigIdx;
                  r.isGirl = doanGioiTinhNu(r.hs.ten, r.origIndex);
                  r.hairColor = BANG_TOC_CHIBI[r.origIndex % BANG_TOC_CHIBI.length];
                  r.ribbonColor = BANG_NO_CHIBI[r.origIndex % BANG_NO_CHIBI.length];
                  r.isWinnerSlot = true;
                  st.winnerInjected = true;
                } else {
                  let nextOrig = st.shuffledOrder[st.queueCursor % st.shuffledOrder.length];
                  st.queueCursor = (st.queueCursor + 1) % st.shuffledOrder.length;
                  // Không lấy trùng Winner nếu đã tồn tại trên đường chạy
                  if (nextOrig === st.winnerOrigIdx && st.runners.some(o => o.isWinnerSlot)) {
                    nextOrig = st.shuffledOrder[st.queueCursor % st.shuffledOrder.length];
                    st.queueCursor = (st.queueCursor + 1) % st.shuffledOrder.length;
                  }
                  const nextHs = danhSach[nextOrig];
                  r.hs = nextHs;
                  r.origIndex = nextOrig;
                  r.isGirl = doanGioiTinhNu(nextHs.ten, nextOrig);
                  r.hairColor = BANG_TOC_CHIBI[nextOrig % BANG_TOC_CHIBI.length];
                  r.ribbonColor = BANG_NO_CHIBI[nextOrig % BANG_NO_CHIBI.length];
                  r.isWinnerSlot = nextOrig === st.winnerOrigIdx;
                }
              }

              // Khi học sinh vừa nhảy thoát ra khỏi dây bên phải -> bật lời khen hài hước!
              if (prevP < 0.50 && r.progress >= 0.50 && randomInt(3) === 0 && !r.tripped) {
                r.speech = CAU_NHAY_THOAT[randomInt(CAU_NHAY_THOAT.length)];
                r.speechUntilMs = now + 1150;
              }
            });

            // Bảo đảm 100% có Winner trên đường chạy trước thời điểm chốt (không bao giờ bị lỡ!)
            let winnerRunnerIdx = st.runners.findIndex(r => r.isWinnerSlot);
            if (elapsed >= st.tripTargetMs - 1500 && winnerRunnerIdx === -1 && st.winnerHs) {
              // Chọn bạn đang chuẩn bị bước vào dây bên trái (progress gần 0.14 nhất) để nạp Winner mượt mà
              let bestSlot = 0;
              let bestDist = 999;
              st.runners.forEach((r, idx) => {
                const d = Math.abs(r.progress - 0.14);
                if (d < bestDist) {
                  bestDist = d;
                  bestSlot = idx;
                }
              });
              const r = st.runners[bestSlot];
              r.hs = st.winnerHs;
              r.origIndex = st.winnerOrigIdx;
              r.isGirl = doanGioiTinhNu(r.hs.ten, r.origIndex);
              r.hairColor = BANG_TOC_CHIBI[r.origIndex % BANG_TOC_CHIBI.length];
              r.ribbonColor = BANG_NO_CHIBI[r.origIndex % BANG_NO_CHIBI.length];
              r.isWinnerSlot = true;
              st.winnerInjected = true;
              winnerRunnerIdx = bestSlot;
            }

            // Chốt vấp dây ngay khi Winner đang nhảy ở vùng giữa dây (hoặc chốt bảo đảm trước 27.5s)
            if (elapsed >= st.tripTargetMs && winnerRunnerIdx >= 0) {
              const wr = st.runners[winnerRunnerIdx];
              const readyAtCenter = wr.progress >= 0.25 && wr.progress <= 0.44;
              const forceFallback = elapsed >= Math.min(27200, st.tripTargetMs + 2400);
              if ((readyAtCenter && curSin > 0.68) || forceFallback) {
                if (forceFallback && !readyAtCenter) wr.progress = 0.33;
                wr.tripped = true;
                wr.speech = '😱 Á vấp dây rồi!!';
                wr.speechUntilMs = now + 4000;
                st.trippedAtMs = now;
                st.trippedRunnerIdx = winnerRunnerIdx;
                st.saoDoSpeech = '🎉 Lên bảng tỏa sáng!';
                amThanh.phatTiengVapDay();
                const pos = tinhViTriVongSo8(wr.progress);
                spawnTripConfetti(pos.x, pos.y);
              }
            }
          } else {
            // Chế độ lớp siêu ít (1–3 HS đứng luôn trong dây nhảy liên tục)
            const winnerRunnerIdx = Math.max(0, st.runners.findIndex(r => r.isWinnerSlot));
            if (elapsed >= st.tripTargetMs && curSin > 0.72) {
              const wr = st.runners[winnerRunnerIdx];
              wr.tripped = true;
              wr.speech = '😱 Á vấp dây rồi!!';
              wr.speechUntilMs = now + 4000;
              st.trippedAtMs = now;
              st.trippedRunnerIdx = winnerRunnerIdx;
              st.saoDoSpeech = '🎉 Lên bảng tỏa sáng!';
              amThanh.phatTiengVapDay();
              const wx = st.runners.length === 1 ? ROPE_MID_X : 410 + winnerRunnerIdx * 140;
              spawnTripConfetti(wx, 415);
            }
          }

          if (now - st.lastHudMs > 240) {
            st.lastHudMs = now;
            setHudText(
              `🪢 Nhịp dây x${st.ropeSpeedMult.toFixed(1)} • ${danhSach.length} HS nối đuôi nhảy qua dây!`
            );
          }
        } else {
          // Đã vấp dây! Zoom nhẹ vào Winner & chúc mừng
          const wr = st.runners[st.trippedRunnerIdx];
          if (wr && now - st.lastHudMs > 200) {
            st.lastHudMs = now;
            setHudText(`🪢 Á vấp dây siêu đáng yêu! Mời ${wr.hs.ten} lên bảng tỏa sáng!`);
          }
          st.camZoom += (1.15 - st.camZoom) * Math.min(1, dt * 4.5);

          if (now - st.trippedAtMs >= 1900 && !st.daKetThuc && wr) {
            st.daKetThuc = true;
            amThanh.phatTiengChucMung();
            onHoanThanhRef.current(wr.hs);
          }
        }
      } else {
        // Trạng thái chờ: dây quay nhè nhẹ và học sinh đi vòng đều sinh động
        st.ropePhase += dt * 3.4;
        st.camZoom += (1 - st.camZoom) * Math.min(1, dt * 5);
        if (!st.smallClassMode) {
          st.runners.forEach(r => {
            r.progress = (r.progress + dt * 0.055) % 1;
          });
        }
      }

      // Pháo sao
      st.sparkles.forEach(s => {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vy += 310 * dt;
        s.alpha -= dt * 0.62;
      });
      st.sparkles = st.sparkles.filter(s => s.alpha > 0);

      // === VẼ KHUNG HÌNH ===
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      ctx.save();
      if (st.camZoom > 1.001) {
        const pivotX = ROPE_MID_X;
        const pivotY = 400;
        ctx.translate(pivotX, pivotY);
        ctx.scale(st.camZoom, st.camZoom);
        ctx.translate(-pivotX, -pivotY);
      }

      drawPhoenixCorridorScene(t);

      // Tính vị trí toàn bộ học sinh
      const positioned = st.runners.map((r, idx) => {
        if (st.smallClassMode) {
          const x =
            st.runners.length === 1
              ? ROPE_MID_X
              : st.runners.length === 2
              ? 465 + idx * 170
              : 410 + idx * 140;
          return {
            runner: r,
            x,
            y: 416,
            scale: 1.08,
            inRopeZone: true,
            nearRopeZone: true,
            facing: 1 as const,
            isFront: true
          };
        }
        const pos = tinhViTriVongSo8(r.progress);
        return { runner: r, ...pos };
      });

      const backRunners = positioned.filter(p => !p.isFront).sort((a, b) => a.y - b.y);
      const frontRunners = positioned.filter(p => p.isFront).sort((a, b) => a.y - b.y);

      const ropeInFront = isTripped || Math.cos(st.ropePhase) >= 0;
      const trippedItem = positioned.find(p => p.runner.tripped);
      const trippedX = trippedItem ? trippedItem.x : ROPE_MID_X;

      // 1. Vẽ hàng học sinh đang chạy vòng phía sau
      backRunners.forEach(item => {
        veHocSinhChibi(
          ctx,
          item.x,
          item.y,
          item.scale,
          {
            isGirl: item.runner.isGirl,
            hairColor: item.runner.hairColor,
            ribbonColor: item.runner.ribbonColor,
            facing: item.facing,
            walkCycle: t * 9 + item.runner.slotId
          },
          t
        );
      });

      // 2. Nếu dây đang ở phía SAU lưng người nhảy -> vẽ dây trước!
      if (!ropeInFront) {
        drawRope(st.ropePhase, st.ropeSpeedMult, isTripped, trippedX);
      }

      // 3. Vẽ 2 Bạn Sao Đỏ quay dây hai đầu (đồng phục áo trắng quần đen khăn quàng đỏ + Sao Đỏ!)
      const turnBob = Math.sin(st.ropePhase) * 3;
      veHocSinhChibi(
        ctx,
        ROPE_LEFT_X,
        ROPE_HAND_Y + 6 + turnBob,
        1.06,
        {
          isGirl: true,
          hairColor: '#2c1810',
          facing: 1,
          isSaoDo: true,
          expression: isTripped ? 'cheer' : 'normal',
          raiseArm: Math.sin(st.ropePhase) < -0.2
        },
        t
      );
      veHocSinhChibi(
        ctx,
        ROPE_RIGHT_X,
        ROPE_HAND_Y + 6 + turnBob,
        1.06,
        {
          isGirl: false,
          hairColor: '#18181b',
          facing: -1,
          isSaoDo: true,
          expression: isTripped ? 'cheer' : 'normal',
          raiseArm: Math.sin(st.ropePhase) < -0.2
        },
        t
      );
      veBangTenHocSinh(ctx, ROPE_LEFT_X, ROPE_HAND_Y - 56, 'Sao Đỏ quay dây', { fontSize: 11.5 });
      veBangTenHocSinh(ctx, ROPE_RIGHT_X, ROPE_HAND_Y - 56, 'Sao Đỏ quay dây', { fontSize: 11.5 });
      if (st.saoDoSpeech && dangChoi) {
        veBongBongThoai(ctx, ROPE_LEFT_X + 18, ROPE_HAND_Y - 74, st.saoDoSpeech, {
          bg: '#e0f2fe',
          border: '#0284c7',
          color: '#0c4a6e'
        });
      }

      // 4. Vẽ học sinh phía trước đang chạy qua dây & bật nhảy theo nhịp dây!
      const hopPhase = Math.max(0, Math.sin(st.ropePhase - 0.35));
      frontRunners.forEach(item => {
        const jumpLift =
          item.inRopeZone && !item.runner.tripped ? -hopPhase * (isTripped ? 0 : 62) : 0;
        const expr = item.runner.tripped
          ? 'shocked'
          : isTripped
          ? 'cheer'
          : item.inRopeZone && st.ropeSpeedMult > 1.55
          ? 'focus'
          : 'normal';
        veHocSinhChibi(
          ctx,
          item.x,
          item.y,
          item.runner.tripped ? 1.15 : item.scale,
          {
            isGirl: item.runner.isGirl,
            hairColor: item.runner.hairColor,
            ribbonColor: item.runner.ribbonColor,
            facing: item.facing,
            expression: expr,
            walkCycle: item.inRopeZone ? 0 : t * 11 + item.runner.slotId,
            jumpOffset: jumpLift,
            tripped: item.runner.tripped,
            highlight: item.runner.tripped
          },
          t
        );
      });

      // 5. Nếu dây đang ở phía TRƯỚC chân người nhảy -> vẽ dây đè lên trước!
      if (ropeInFront) {
        drawRope(st.ropePhase, st.ropeSpeedMult, isTripped, trippedX);
      }

      // 6. Bật bảng tên Spotlight siêu rõ chỉ cho tối đa 4 học sinh quanh giữa dây (while-loop chống đè tuyệt đối!)
      const labelList = frontRunners
        .filter(item => item.inRopeZone || item.runner.tripped)
        .sort((a, b) => (b.runner.tripped ? 1 : 0) - (a.runner.tripped ? 1 : 0) || Math.abs(a.x - ROPE_MID_X) - Math.abs(b.x - ROPE_MID_X))
        .slice(0, isTripped ? 1 : 4);

      const usedPos: { x: number; y: number }[] = [
        { x: ROPE_LEFT_X, y: ROPE_HAND_Y - 56 },
        { x: ROPE_RIGHT_X, y: ROPE_HAND_Y - 56 }
      ];
      labelList.forEach(item => {
        const jumpLift =
          item.inRopeZone && !item.runner.tripped ? -hopPhase * (isTripped ? 0 : 62) : 0;
        const lx = item.x;
        let ly = item.y + jumpLift - (item.runner.tripped ? 58 : 66);
        let guard = 0;
        while (
          guard < 8 &&
          usedPos.some(p => Math.abs(p.x - lx) < 152 && Math.abs(p.y - ly) < 30)
        ) {
          ly -= 30;
          guard++;
        }
        ly = Math.max(76, ly);
        usedPos.push({ x: lx, y: ly });
        veBangTenHocSinh(ctx, lx, ly, item.runner.hs.ten, {
          highlight: item.runner.tripped,
          prefix: item.runner.tripped ? '🌟 ' : ''
        });

        if (item.runner.speech && now < item.runner.speechUntilMs) {
          veBongBongThoai(ctx, lx, ly - 18, item.runner.speech, {
            bg: item.runner.tripped ? '#fee2e2' : '#fef08a',
            border: item.runner.tripped ? '#dc2626' : '#ca8a04',
            color: item.runner.tripped ? '#991b1b' : '#713f12'
          });
        }
      });

      // 7. Vẽ cánh hoa phượng rơi & pháo sao chúc mừng
      st.petals.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.52, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      st.sparkles.forEach(s => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, s.alpha);
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      ctx.restore();

      st.animId = requestAnimationFrame(render);
    };

    stateRef.current.animId = requestAnimationFrame(render);
    return () => {
      running = false;
      if (stateRef.current.animId) {
        cancelAnimationFrame(stateRef.current.animId);
      }
    };
  }, [dangChoi, danhSach]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        position: 'relative'
      }}
    >
      <div
        className={`game-stage-box ${isFullscreen ? 'stage-fullscreen' : ''}`}
        style={{
          position: 'relative',
          width: '100%',
          height: isFullscreen ? 'calc(100vh - 78px)' : '580px',
          borderRadius: '18px',
          overflow: 'hidden',
          boxShadow: '0 12px 35px rgba(0, 0, 0, 0.28)',
          border: '2px solid #ef4444',
          background: '#fef9c3'
        }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />

        {/* HUD TỐI GIẢN */}
        <div
          className="game-hud-bar"
          style={{
            position: 'absolute',
            top: '12px',
            left: '14px',
            right: '14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px',
            pointerEvents: 'none',
            zIndex: 10
          }}
        >
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.88)',
              border: '2px solid #facc15',
              borderRadius: '999px',
              padding: '6px 16px',
              fontSize: '0.84rem',
              fontWeight: 800,
              color: '#fef08a',
              maxWidth: '72%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {hudText}
          </div>

          <div style={{ pointerEvents: 'auto' }}>
            {onToggleFullscreen && (
              <button
                type="button"
                onClick={onToggleFullscreen}
                title={isFullscreen ? 'Thu nhỏ màn hình' : 'Phóng to toàn màn hình'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: '10px',
                  background: 'rgba(15, 23, 42, 0.88)',
                  border: '1px solid #cbd5e1',
                  padding: '7px 13px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#f8fafc',
                  cursor: 'pointer'
                }}
              >
                <span>{isFullscreen ? '🗗 Thu nhỏ' : '⛶ Toàn màn hình'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '10px' }}>
        <button
          type="button"
          className="game-action-btn"
          onClick={() => {
            if (!dangChoi) onBatDauChoi();
          }}
          disabled={dangChoi || danhSach.length === 0}
          style={{
            background: dangChoi
              ? '#475569'
              : 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
            color: '#ffffff',
            border: dangChoi ? 'none' : '2px solid #fed7aa',
            padding: '11px 38px',
            borderRadius: '30px',
            fontSize: '1.04rem',
            fontWeight: 900,
            cursor: dangChoi || danhSach.length === 0 ? 'not-allowed' : 'pointer',
            boxShadow: dangChoi ? 'none' : '0 6px 22px rgba(239, 68, 68, 0.42)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>{dangChoi ? '🪢 Cả lớp đang nhảy dây vòng số 8...' : '🪢 BẮT ĐẦU NHẢY DÂY TẬP THỂ'}</span>
        </button>
      </div>
    </div>
  );
};
