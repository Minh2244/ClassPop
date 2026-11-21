// Trò chơi thứ 10: Đĩa Bay UFO Hút Người (Sáng tươi vui mắt, kéo 1–3 người cùng lúc cực hài, ngẫu nhiên thắng ngay lượt 1/2/3/4 không cần chờ hết giờ, cân 100–1000+ HS)
import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { HocSinh } from '../dich-vu/quan-ly-danh-sach';
import { amThanh } from '../dich-vu/am-thanh';

interface UfoHutNguoiProps {
  danhSach: HocSinh[];
  dangChoi: boolean;
  mucTieuIndex: number | null;
  onBatDauChoi: () => void;
  onHoanThanh: (nguoiThang?: HocSinh) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

interface HocSinhDongCo {
  hs: HocSinh;
  index: number;
  isGirl: boolean;
  hairColor: string;
  shirtColor: string;
  bagColor: string;
  ribbonColor: string;
  worldX: number;
  baseY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  walkPhase: number;
  state: 'ground' | 'lifted' | 'falling' | 'abducted';
  beamSlotOffset: number; // Vị trí lệch ngang khi bị kéo 2–3 người cùng lúc
}

interface LuotHut {
  targetIndices: number[]; // Kéo 1, 2 hoặc 3 bạn cùng lúc!
  winnerInsideIdx: number | null; // Nếu lượt này là lượt WIN -> index của người trúng
  isWin: boolean;
  seekStartMs: number;
  beamStartMs: number;
  midDropMs: number; // Thời điểm thả rơi bớt người phụ giữa chừng (khi kéo nhiều người ở lượt thắng!)
  liftEndMs: number;
  phaseEndMs: number;
  maxLiftHeight: number;
  playedBeamSound: boolean;
  playedMidDropSound: boolean;
  playedDropSound: boolean;
}

interface HatSang {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
  color: string;
}

const BANG_TOC = ['#1e1b4b', '#3f2314', '#27272a', '#5c2d16', '#451a03', '#2c1810'];
const BANG_AO = ['#ffffff', '#fef9c3', '#e0f2fe', '#fce7f3', '#dcfce7', '#ffedd5'];
const BANG_BALO = ['#ef4444', '#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#a855f7'];
const BANG_NO = ['#f472b6', '#facc15', '#38bdf8', '#fb7185', '#c084fc'];
const MAX_UFO_MS = 25000;

function randomInt(max: number): number {
  if (max <= 1) return 0;
  if (window.crypto && window.crypto.getRandomValues) {
    const buf = new Uint32Array(1);
    window.crypto.getRandomValues(buf);
    return buf[0] % max;
  }
  return Math.floor(Math.random() * max);
}

function doanGioiTinhNu(ten: string, idx: number): boolean {
  const lower = ten.toLowerCase();
  const tuKhoaNu = ['thị', 'ngọc', 'linh', 'anh', 'vy', 'lan', 'thảo', 'hân', 'trâm', 'my', 'nhi', 'châu', 'thư', 'ý', 'hà', 'mai', 'hương', 'trang', 'nhung', 'yến'];
  const tuKhoaNam = ['văn', 'minh', 'đức', 'quân', 'huy', 'nam', 'tuấn', 'kiệt', 'bách', 'trọng', 'khôi', 'đăng', 'bảo', 'toàn', 'hoàng', 'long', 'phúc', 'dũng'];
  for (const k of tuKhoaNu) if (lower.includes(k)) return true;
  for (const k of tuKhoaNam) if (lower.includes(k)) return false;
  return idx % 2 === 1;
}

export const UfoHutNguoi: React.FC<UfoHutNguoiProps> = ({
  danhSach,
  dangChoi,
  onBatDauChoi,
  onHoanThanh,
  isFullscreen = false,
  onToggleFullscreen
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [trangThaiText, setTrangThaiText] = useState<string>('🛸 UFO đã sẵn sàng trên đồng cỏ!');
  const [dongHoText, setDongHoText] = useState<string>('00:25');

  const onHoanThanhRef = useRef(onHoanThanh);
  useEffect(() => {
    onHoanThanhRef.current = onHoanThanh;
  }, [onHoanThanh]);

  const stateRef = useRef<{
    students: HocSinhDongCo[];
    sparkles: HatSang[];
    worldWidth: number;
    camX: number;
    ufoX: number;
    ufoY: number;
    ufoTilt: number;
    beamIntensity: number;
    beamWidthScale: number;
    beamColorMode: 'scan' | 'abduct' | 'glitch' | 'gold';
    attempts: LuotHut[];
    startTime: number;
    daKetThuc: boolean;
    winHoldFrames: number;
    winnerIdx: number;
    activeTargetSet: Set<number>;
    lastHudMs: number;
    animationFrameId: number;
  }>({
    students: [],
    sparkles: [],
    worldWidth: 1100,
    camX: 0,
    ufoX: 550,
    ufoY: 128,
    ufoTilt: 0,
    beamIntensity: 0.35,
    beamWidthScale: 1,
    beamColorMode: 'scan',
    attempts: [],
    startTime: 0,
    daKetThuc: false,
    winHoldFrames: 0,
    winnerIdx: 0,
    activeTargetSet: new Set<number>(),
    lastHudMs: 0,
    animationFrameId: 0
  });

  // Khởi tạo đồng cỏ & kịch bản UFO ngẫu nhiên thật sự (có thể trúng ngay lượt 1, 2, 3 hoặc 4 + có thể kéo nhiều người cùng lúc!)
  const khoiTaoDongCo = useCallback((xaoTron: boolean = true) => {
    const ds = [...danhSach];
    if (xaoTron && ds.length > 1) {
      for (let i = ds.length - 1; i > 0; i--) {
        const j = randomInt(i + 1);
        [ds[i], ds[j]] = [ds[j], ds[i]];
      }
    }

    const total = ds.length;
    const worldWidth = total <= 16 ? 1100 : Math.min(26000, Math.max(1500, total * 72 + 280));
    const padX = 95;
    const usableW = Math.max(200, worldWidth - padX * 2);

    const students: HocSinhDongCo[] = ds.map((hs, idx) => {
      const ratio = total <= 1 ? 0.5 : idx / (total - 1);
      const jitterX = total > 1 ? (Math.random() - 0.5) * Math.min(34, (usableW / total) * 0.45) : 0;
      const wx = Math.max(70, Math.min(worldWidth - 70, padX + ratio * usableW + jitterX));
      const depthBand = idx % 3;
      const baseY = 374 + depthBand * 46 + (Math.random() - 0.5) * 16;

      return {
        hs,
        index: idx,
        isGirl: doanGioiTinhNu(hs.ten, idx),
        hairColor: BANG_TOC[idx % BANG_TOC.length],
        shirtColor: BANG_AO[idx % BANG_AO.length],
        bagColor: BANG_BALO[idx % BANG_BALO.length],
        ribbonColor: BANG_NO[idx % BANG_NO.length],
        worldX: wx,
        baseY,
        x: wx,
        y: baseY,
        vx: (Math.random() > 0.5 ? 1 : -1) * (0.35 + Math.random() * 0.45),
        vy: 0,
        walkPhase: Math.random() * Math.PI * 2,
        state: 'ground',
        beamSlotOffset: 0
      };
    });

    // 100% True Random người thắng bằng crypto
    const winnerIdx = total > 0 ? randomInt(total) : 0;
    const attempts: LuotHut[] = [];

    // Lấy nhóm bạn đứng gần 1 mục tiêu trung tâm để có thể kéo nhiều người (2–3 bạn) cùng lúc!
    const layNhomKeo = (centerIdx: number, count: number, excludeSet?: Set<number>): number[] => {
      const centerX = students[centerIdx]?.worldX ?? 550;
      const candidates = students
        .map(s => ({ idx: s.index, dist: Math.abs(s.worldX - centerX) }))
        .filter(c => c.idx !== centerIdx && (!excludeSet || !excludeSet.has(c.idx)))
        .sort((a, b) => a.dist - b.dist);

      const picked = [centerIdx];
      for (let i = 0; i < candidates.length && picked.length < count; i++) {
        picked.push(candidates[i].idx);
      }
      return picked;
    };

    if (total === 1) {
      attempts.push({
        targetIndices: [0],
        winnerInsideIdx: 0,
        isWin: true,
        seekStartMs: 1400,
        beamStartMs: 2600,
        midDropMs: 4200,
        liftEndMs: 5200,
        phaseEndMs: 6400,
        maxLiftHeight: 165,
        playedBeamSound: false,
        playedMidDropSound: false,
        playedDropSound: false
      });
    } else if (total >= 2) {
      // Random thật sự số lượt hút từ 1 đến 4 lượt (KHÔNG cố định chờ gần hết giờ!)
      // - 22% trúng ngay lượt 1!
      // - 30% trúng ở lượt 2!
      // - 28% trúng ở lượt 3!
      // - 20% trúng ở lượt 4!
      const roll = randomInt(100);
      const maxAtt = total === 2 ? 2 : total === 3 ? 3 : 4;
      let numAttempts = roll < 22 ? 1 : roll < 52 ? 2 : roll < 80 ? 3 : 4;
      numAttempts = Math.min(numAttempts, maxAtt);

      let cursorMs = 2000 + randomInt(1200); // Quét mở màn ngẫu nhiên 2.0s - 3.2s
      const usedCenters = new Set<number>([winnerIdx]);

      for (let a = 0; a < numAttempts; a++) {
        const isWin = a === numAttempts - 1;
        const seekDur = 1250 + randomInt(450);

        if (!isWin) {
          // Lượt hút hụt: chọn ngẫu nhiên 1 bạn trung tâm (khác người thắng), có 65% cơ hội kéo luôn 2–3 bạn cạnh nhau!
          let centerIdx = randomInt(total);
          let guard = 0;
          while (usedCenters.has(centerIdx) && guard < 40) {
            centerIdx = randomInt(total);
            guard++;
          }
          usedCenters.add(centerIdx);

          const multiPull = total >= 4 && randomInt(100) < 65 ? (randomInt(100) < 55 ? 2 : 3) : 1;
          const group = layNhomKeo(centerIdx, multiPull, new Set<number>([winnerIdx]));
          const liftDur = 1850 + randomInt(650);
          const dropDur = 1150;

          attempts.push({
            targetIndices: group,
            winnerInsideIdx: null,
            isWin: false,
            seekStartMs: cursorMs,
            beamStartMs: cursorMs + seekDur,
            midDropMs: cursorMs + seekDur + liftDur,
            liftEndMs: cursorMs + seekDur + liftDur,
            phaseEndMs: cursorMs + seekDur + liftDur + dropDur,
            maxLiftHeight: 98 + randomInt(48),
            playedBeamSound: false,
            playedMidDropSound: false,
            playedDropSound: false
          });
          cursorMs += seekDur + liftDur + dropDur;
        } else {
          // Lượt WIN (có thể xảy ra ngay lượt 1, lượt 2, lượt 3 hoặc lượt 4!):
          // 60% cơ hội kéo 2–3 người lên chung rồi thả rơi người phụ giữa chừng để chốt 1 người thắng siêu hồi hộp!
          const multiWin = total >= 3 && randomInt(100) < 60 ? (total >= 4 && randomInt(100) < 50 ? 3 : 2) : 1;
          const group = layNhomKeo(winnerIdx, multiWin);
          const liftDur = multiWin > 1 ? 2900 : 2300;
          const midDropOffset = Math.round(liftDur * 0.56);
          const holdDur = 1100;

          attempts.push({
            targetIndices: group,
            winnerInsideIdx: winnerIdx,
            isWin: true,
            seekStartMs: cursorMs,
            beamStartMs: cursorMs + seekDur,
            midDropMs: cursorMs + seekDur + midDropOffset,
            liftEndMs: cursorMs + seekDur + liftDur,
            phaseEndMs: cursorMs + seekDur + liftDur + holdDur,
            maxLiftHeight: 166,
            playedBeamSound: false,
            playedMidDropSound: false,
            playedDropSound: false
          });
          cursorMs += seekDur + liftDur + holdDur;
        }
      }
    }

    const startUfoX = worldWidth / 2;
    const st = stateRef.current;
    st.students = students;
    st.sparkles = [];
    st.worldWidth = worldWidth;
    st.camX = Math.max(0, Math.min(worldWidth - 1100, startUfoX - 550));
    st.ufoX = startUfoX;
    st.ufoY = 128;
    st.ufoTilt = 0;
    st.beamIntensity = 0.35;
    st.beamWidthScale = 1;
    st.beamColorMode = 'scan';
    st.attempts = attempts;
    st.startTime = performance.now();
    st.daKetThuc = false;
    st.winHoldFrames = 0;
    st.winnerIdx = winnerIdx;
    st.activeTargetSet = new Set<number>();
    st.lastHudMs = 0;

    setTrangThaiText('🛸 UFO bay trên sân trường — có thể hút trúng bất cứ lúc nào!');
    setDongHoText('00:25');
  }, [danhSach]);

  const prevDangChoiRef = useRef<boolean>(false);
  useEffect(() => {
    if (dangChoi && !prevDangChoiRef.current) {
      khoiTaoDongCo(true);
      stateRef.current.startTime = performance.now();
      amThanh.phatTiengUfoHut();
      setTrangThaiText('🛸 UFO đang rà quét sân trường...');
    } else if (!dangChoi) {
      khoiTaoDongCo(false);
    }
    prevDangChoiRef.current = dangChoi;
  }, [dangChoi, danhSach, khoiTaoDongCo]);

  // VÒNG LẶP ĐỒ HỌA CANVAS 2D TƯƠI SÁNG (60FPS)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const veHocSinhChibi = (st: HocSinhDongCo, showLabel: boolean, isHighlighted: boolean, timeSec: number) => {
      ctx.save();
      ctx.translate(st.x, st.y);

      const isLifted = st.state === 'lifted' || st.state === 'abducted';
      const isFalling = st.state === 'falling';
      const walkBob = st.state === 'ground' ? Math.abs(Math.sin(st.walkPhase)) * 3.5 : 0;

      const heightOffGround = Math.max(0, st.baseY - st.y);
      const shadowScale = Math.max(0.28, 1 - heightOffGround / 230);
      ctx.fillStyle = isHighlighted ? 'rgba(254, 240, 138, 0.5)' : 'rgba(20, 83, 45, 0.32)';
      ctx.beginPath();
      ctx.ellipse(0, 26 + heightOffGround, 17 * shadowScale, 5.2 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(0, -walkBob);
      if (isLifted) {
        ctx.rotate(Math.sin(timeSec * 12 + st.index) * 0.22);
      } else if (isFalling) {
        ctx.rotate(Math.sin(timeSec * 22) * 0.35);
      }

      const outline = '#1e293b';
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1.9;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      ctx.fillStyle = st.bagColor;
      ctx.beginPath();
      ctx.roundRect(-13, -1, 26, 17, 6);
      ctx.fill();
      ctx.stroke();

      if (st.isGirl) {
        ctx.fillStyle = st.hairColor;
        ctx.beginPath();
        ctx.ellipse(0, -18, 17, 15.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(-14, -10, 5.5, 9.5, 0.22, 0, Math.PI * 2);
        ctx.ellipse(14, -10, 5.5, 9.5, -0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      const legSwing = isLifted ? Math.sin(timeSec * 20) * 6 : Math.sin(st.walkPhase) * 3.5;
      ctx.fillStyle = '#fed7aa';
      ctx.fillRect(-7.5, 14, 5, 10 + legSwing * 0.3);
      ctx.strokeRect(-7.5, 14, 5, 10 + legSwing * 0.3);
      ctx.fillRect(2.5, 14, 5, 10 - legSwing * 0.3);
      ctx.strokeRect(2.5, 14, 5, 10 - legSwing * 0.3);

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(-5, 25 + legSwing * 0.3, 5.2, 3.2, 0, 0, Math.PI * 2);
      ctx.ellipse(5, 25 - legSwing * 0.3, 5.2, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#2563eb';
      if (st.isGirl) {
        ctx.beginPath();
        ctx.moveTo(-10, 9);
        ctx.lineTo(10, 9);
        ctx.lineTo(14, 18);
        ctx.lineTo(-14, 18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.roundRect(-9.5, 9, 8.5, 10, 2.5);
        ctx.roundRect(1, 9, 8.5, 10, 2.5);
        ctx.fill();
        ctx.stroke();
      }

      ctx.fillStyle = st.shirtColor;
      ctx.beginPath();
      ctx.roundRect(-10.5, -7, 21, 17.5, 4.5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(-4.5, -6.5);
      ctx.lineTo(4.5, -6.5);
      ctx.lineTo(0, 3);
      ctx.closePath();
      ctx.fill();

      const panicFlail = isLifted || isFalling ? Math.sin(timeSec * 24) * 5 : 0;
      [-1, 1].forEach(dir => {
        ctx.strokeStyle = st.shirtColor;
        ctx.lineWidth = 5.5;
        ctx.beginPath();
        ctx.moveTo(dir * 9.5, -3);
        const hx = dir * (isLifted || isFalling ? 19 : 14);
        const hy = isLifted || isFalling ? -14 + panicFlail * dir : 4 + Math.sin(st.walkPhase + dir) * 2;
        ctx.lineTo(hx, hy);
        ctx.stroke();

        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.6;
        ctx.fillStyle = '#fed7aa';
        ctx.beginPath();
        ctx.arc(hx, hy, 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      ctx.fillStyle = '#ffedd5';
      ctx.strokeStyle = outline;
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.arc(0, -21, 14.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = st.hairColor;
      ctx.beginPath();
      if (st.isGirl) {
        ctx.arc(0, -22.5, 15.2, Math.PI * 1.03, Math.PI * 1.97);
        ctx.quadraticCurveTo(6, -19, 1, -24);
        ctx.quadraticCurveTo(-5, -18, -15, -22);
      } else {
        ctx.arc(0, -23, 15.4, Math.PI * 1.02, Math.PI * 1.98);
        ctx.lineTo(13, -21);
        ctx.lineTo(6, -25);
        ctx.lineTo(1, -20);
        ctx.lineTo(-5, -25);
        ctx.lineTo(-14, -21);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (st.isGirl) {
        ctx.fillStyle = st.ribbonColor;
        ctx.beginPath();
        ctx.arc(11, -30, 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(244, 63, 94, 0.36)';
      ctx.beginPath();
      ctx.ellipse(-7.5, -16.5, 3.2, 1.8, 0, 0, Math.PI * 2);
      ctx.ellipse(7.5, -16.5, 3.2, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();

      if (isLifted || isFalling) {
        [-5, 5].forEach(ex => {
          ctx.fillStyle = '#ffffff';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(ex, -20, 3.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(ex, -20, 1.3, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.ellipse(0, -13.5, 3.4, 4.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        [-5, 5].forEach(ex => {
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(ex, -20, 2.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ex - 0.8, -20.8, 0.9, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, -15.5, 2.8, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
      }

      ctx.restore();

      if (showLabel) {
        ctx.font = '800 12px "Segoe UI", system-ui, sans-serif';
        const label = st.hs.ten.length > 18 ? `${st.hs.ten.slice(0, 17)}…` : st.hs.ten;
        const tw = ctx.measureText(label).width;
        const pillW = tw + 18;
        const pillH = 22;
        const py = -58 - walkBob;

        ctx.fillStyle = isHighlighted ? '#fef08a' : 'rgba(255, 255, 255, 0.95)';
        ctx.strokeStyle = isHighlighted ? '#ea580c' : '#0f172a';
        ctx.lineWidth = isHighlighted ? 2.5 : 1.8;
        ctx.beginPath();
        ctx.roundRect(-pillW / 2, py, pillW, pillH, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, 0, py + pillH / 2 + 0.5);
      }

      ctx.restore();
    };

    const veDiaBayUfo = (
      ux: number,
      uy: number,
      tilt: number,
      beamInt: number,
      beamWScale: number,
      beamMode: 'scan' | 'abduct' | 'glitch' | 'gold',
      timeSec: number
    ) => {
      ctx.save();
      ctx.translate(ux, uy);

      // 1. CHÙM TIA SÁNG RỰC RỠ (tự mở rộng khi kéo 2–3 người!)
      if (beamInt > 0.02) {
        ctx.save();
        const beamH = 405;
        const topHalfW = 28 * Math.min(1.25, beamWScale);
        const botHalfW = (beamMode === 'gold' ? 128 : 112) * beamWScale;
        const grad = ctx.createLinearGradient(0, 18, 0, beamH);

        if (beamMode === 'gold') {
          grad.addColorStop(0, `rgba(254, 240, 138, ${0.82 * beamInt})`);
          grad.addColorStop(0.55, `rgba(250, 204, 21, ${0.46 * beamInt})`);
          grad.addColorStop(1, 'rgba(250, 204, 21, 0.08)');
        } else if (beamMode === 'glitch') {
          const flicker = Math.sin(timeSec * 55) > 0 ? 0.8 : 0.2;
          grad.addColorStop(0, `rgba(251, 113, 133, ${0.72 * beamInt * flicker})`);
          grad.addColorStop(0.6, `rgba(253, 224, 71, ${0.35 * beamInt * flicker})`);
          grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        } else {
          grad.addColorStop(0, `rgba(103, 232, 249, ${0.72 * beamInt})`);
          grad.addColorStop(0.55, `rgba(134, 239, 172, ${0.42 * beamInt})`);
          grad.addColorStop(1, 'rgba(134, 239, 172, 0.05)');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(-topHalfW, 16);
        ctx.lineTo(topHalfW, 16);
        ctx.lineTo(botHalfW, beamH);
        ctx.lineTo(-botHalfW, beamH);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle =
          beamMode === 'gold'
            ? `rgba(254, 240, 138, ${0.42 * beamInt})`
            : beamMode === 'glitch'
            ? `rgba(251, 113, 133, ${0.28 * beamInt})`
            : `rgba(186, 230, 253, ${0.35 * beamInt})`;
        ctx.beginPath();
        ctx.ellipse(0, beamH - 16, botHalfW * 0.85, 22, 0, 0, Math.PI * 2);
        ctx.fill();

        if (beamMode === 'abduct' || beamMode === 'gold') {
          ctx.strokeStyle = beamMode === 'gold' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(224, 242, 254, 0.78)';
          ctx.lineWidth = 2.4;
          for (let r = 0; r < 4; r++) {
            const prog = (timeSec * 1.45 + r * 0.25) % 1;
            const ry = beamH - 30 - prog * (beamH - 60);
            const rw = topHalfW + (1 - prog) * (botHalfW - topHalfW) * 0.8;
            ctx.globalAlpha = Math.sin(prog * Math.PI) * beamInt;
            ctx.beginPath();
            ctx.ellipse(0, ry, rw, 8, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        ctx.restore();
      }

      // 2. THÂN ĐĨA BAY UFO SÁNG BÓNG TƯƠI TẮN
      ctx.rotate(tilt);
      const hoverY = Math.sin(timeSec * 4.5) * 4.5;
      ctx.translate(0, hoverY);

      const domeGrad = ctx.createRadialGradient(-10, -24, 4, 0, -14, 44);
      domeGrad.addColorStop(0, '#ffffff');
      domeGrad.addColorStop(0.45, '#7dd3fc');
      domeGrad.addColorStop(1, '#0284c7');
      ctx.fillStyle = domeGrad;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, -10, 38, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Người ngoài hành tinh xanh tươi đáng yêu
      ctx.fillStyle = '#4ade80';
      ctx.strokeStyle = '#14532d';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, -22, 11.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(-4.5, -22, 3, 4, -0.2, 0, Math.PI * 2);
      ctx.ellipse(4.5, -22, 3, 4, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.beginPath();
      ctx.ellipse(-14, -27, 10, 5, -0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fef08a';
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 18, 34, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      const bodyGrad = ctx.createLinearGradient(-84, 0, 84, 0);
      bodyGrad.addColorStop(0, '#7c3aed');
      bodyGrad.addColorStop(0.25, '#a855f7');
      bodyGrad.addColorStop(0.5, '#c084fc');
      bodyGrad.addColorStop(0.75, '#a855f7');
      bodyGrad.addColorStop(1, '#6d28d9');
      ctx.fillStyle = bodyGrad;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.ellipse(0, 2, 84, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(0, 2, 68, 12, 0, 0, Math.PI * 2);
      ctx.stroke();

      const ledColors = ['#fef08a', '#4ade80', '#f472b6', '#38bdf8'];
      for (let i = -3; i <= 3; i++) {
        const lx = i * 21;
        const ly = 5 + Math.cos((i / 3) * (Math.PI / 2)) * 5;
        const colIdx = (Math.floor(timeSec * 8) + i + 10) % ledColors.length;
        ctx.fillStyle = ledColors[colIdx];
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(lx, ly, 4.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    };

    const render = (now: number) => {
      if (!running) return;
      const st = stateRef.current;
      const w = canvas.width;
      const h = canvas.height;
      const timeSec = now / 1000;

      // 1. CẬP NHẬT CHUYỂN ĐỘNG UFO & KÉO 1–3 NGƯỜI CÙNG LÚC
      if (st.students.length > 0) {
        if (dangChoi && !st.daKetThuc) {
          const elapsed = now - st.startTime;
          const remainSec = Math.max(0, Math.ceil((MAX_UFO_MS - elapsed) / 1000));
          if (now - st.lastHudMs > 120) {
            st.lastHudMs = now;
            setDongHoText(`00:${String(remainSec).padStart(2, '0')}`);
          }

          st.students.forEach(s => {
            if (s.state === 'ground') {
              s.walkPhase += 0.14;
              const distUfo = s.x - st.ufoX;
              if (Math.abs(distUfo) < 150 && !st.activeTargetSet.has(s.index)) {
                s.vx += Math.sign(distUfo || 1) * 0.08;
              }
              s.vx = Math.max(-1.6, Math.min(1.6, s.vx * 0.985 + (Math.random() - 0.5) * 0.05));
              s.x = Math.max(55, Math.min(st.worldWidth - 55, s.x + s.vx));
              s.y += (s.baseY - s.y) * 0.18;
            } else if (s.state === 'falling') {
              s.vy += 0.65;
              s.y += s.vy;
              if (s.y >= s.baseY) {
                s.y = s.baseY;
                s.vy = 0;
                s.state = 'ground';
              }
            }
          });

          const firstSeekMs = st.attempts[0]?.seekStartMs ?? 2400;
          if (elapsed < firstSeekMs) {
            const sweepRatio = 0.5 + 0.36 * Math.sin(elapsed * 0.0024);
            const desiredX = 140 + sweepRatio * Math.max(200, st.worldWidth - 280);
            const prevX = st.ufoX;
            st.ufoX += (desiredX - st.ufoX) * 0.065;
            st.ufoTilt = Math.max(-0.18, Math.min(0.18, (st.ufoX - prevX) * 0.025));
            st.beamIntensity = 0.5 + Math.sin(timeSec * 8) * 0.12;
            st.beamWidthScale += (1 - st.beamWidthScale) * 0.12;
            st.beamColorMode = 'scan';
            st.activeTargetSet.clear();
          } else {
            const curAtt =
              st.attempts.find(a => elapsed >= a.seekStartMs && elapsed < a.phaseEndMs) ||
              st.attempts[st.attempts.length - 1];

            if (curAtt) {
              const targets = curAtt.targetIndices
                .map(i => st.students[i])
                .filter((s): s is HocSinhDongCo => Boolean(s));

              if (targets.length > 0) {
                const centerTarget = targets[0];
                st.activeTargetSet = new Set(curAtt.targetIndices);
                const desiredWScale = targets.length >= 3 ? 1.45 : targets.length === 2 ? 1.24 : 1.0;
                st.beamWidthScale += (desiredWScale - st.beamWidthScale) * 0.14;

                // Gán độ lệch ngang gọn gàng khi kéo 2–3 người cùng lúc để tên không đè nhau!
                targets.forEach((t, slotIdx) => {
                  if (targets.length === 1) t.beamSlotOffset = 0;
                  else if (targets.length === 2) t.beamSlotOffset = slotIdx === 0 ? -44 : 44;
                  else t.beamSlotOffset = (slotIdx - 1) * 58;
                });

                if (elapsed < curAtt.beamStartMs) {
                  const prevX = st.ufoX;
                  st.ufoX += (centerTarget.x - st.ufoX) * 0.12;
                  st.ufoTilt = Math.max(-0.22, Math.min(0.22, (st.ufoX - prevX) * 0.028));
                  st.beamIntensity = 0.48;
                  st.beamColorMode = 'scan';
                  setTrangThaiText('🛸 UFO phát hiện nhóm mục tiêu và đang áp sát...');
                } else if (elapsed < curAtt.liftEndMs) {
                  if (!curAtt.playedBeamSound) {
                    curAtt.playedBeamSound = true;
                    amThanh.phatTiengUfoHut();
                    const namesStr = targets.map(t => t.hs.ten).join(', ');
                    setTrangThaiText(
                      targets.length > 1
                        ? `🛸 Tia rộng kéo cùng lúc ${targets.length} bạn (${namesStr})!`
                        : `🛸 Tia sáng đang hút "${centerTarget.hs.ten}" bay lên...`
                    );
                  }

                  const liftRatio = Math.min(1, (elapsed - curAtt.beamStartMs) / (curAtt.liftEndMs - curAtt.beamStartMs));
                  st.ufoX += (centerTarget.worldX - st.ufoX) * 0.08;
                  st.ufoTilt *= 0.85;
                  st.beamIntensity = 1.0;

                  // Nếu lượt WIN có kéo nhiều người -> tới midDropMs thả rơi các bạn phụ, giữ đúng người thắng!
                  const passedMidDrop = curAtt.isWin && targets.length > 1 && elapsed >= curAtt.midDropMs;
                  if (passedMidDrop && !curAtt.playedMidDropSound) {
                    curAtt.playedMidDropSound = true;
                    amThanh.phatTiengUfoThaRoi();
                    targets.forEach(t => {
                      if (t.index !== curAtt.winnerInsideIdx) {
                        t.state = 'falling';
                        t.vy = 1.6;
                      }
                    });
                    const winObj = st.students[curAtt.winnerInsideIdx ?? 0];
                    if (winObj) {
                      setTrangThaiText(`✨ Giữ chặt "${winObj.hs.ten}" — sắp lên tới đĩa bay rồi!`);
                    }
                  }

                  const isAboutToDropAll = !curAtt.isWin && liftRatio > 0.78;
                  st.beamColorMode =
                    curAtt.isWin && (passedMidDrop || targets.length === 1)
                      ? 'gold'
                      : isAboutToDropAll
                      ? 'glitch'
                      : 'abduct';

                  targets.forEach(t => {
                    if (passedMidDrop && t.index !== curAtt.winnerInsideIdx) return;
                    t.state = 'lifted';
                    const slotTargetX =
                      passedMidDrop && t.index === curAtt.winnerInsideIdx
                        ? st.ufoX
                        : st.ufoX + t.beamSlotOffset;
                    t.x += (slotTargetX - t.x) * 0.16;
                    const targetLiftY = t.baseY - liftRatio * curAtt.maxLiftHeight;
                    t.y += (targetLiftY - t.y) * 0.22;

                    if (Math.random() < 0.35) {
                      st.sparkles.push({
                        x: t.x + (Math.random() - 0.5) * 34,
                        y: t.y + (Math.random() - 0.5) * 26,
                        vx: (Math.random() - 0.5) * 1.4,
                        vy: -1.6 - Math.random() * 1.4,
                        r: 2.2 + Math.random() * 2.4,
                        alpha: 1,
                        color: st.beamColorMode === 'gold' ? '#fef08a' : '#e0f2fe'
                      });
                    }
                  });
                } else {
                  if (!curAtt.isWin) {
                    if (!curAtt.playedDropSound) {
                      curAtt.playedDropSound = true;
                      targets.forEach(t => {
                        t.state = 'falling';
                        t.vy = 1.5;
                      });
                      amThanh.phatTiengUfoThaRoi();
                      setTrangThaiText(
                        targets.length > 1
                          ? `😂 Hú vía! Cả ${targets.length} bạn tụt khỏi tia rơi lại sân trường rồi!`
                          : `😂 Hú vía! "${centerTarget.hs.ten}" tụt khỏi tia rơi lại rồi!`
                      );
                    }
                    st.beamIntensity = Math.max(0.18, st.beamIntensity - 0.06);
                    st.beamColorMode = 'glitch';
                  } else {
                    const winObj = st.students[curAtt.winnerInsideIdx ?? 0];
                    if (winObj) {
                      winObj.state = 'abducted';
                      winObj.x += (st.ufoX - winObj.x) * 0.22;
                      winObj.y += (winObj.baseY - curAtt.maxLiftHeight - winObj.y) * 0.22;
                      st.beamWidthScale += (1.0 - st.beamWidthScale) * 0.15;
                      st.beamIntensity = 1;
                      st.beamColorMode = 'gold';
                      setTrangThaiText(`🎉 UFO đã chốt mục tiêu: ${winObj.hs.ten}!`);
                    }

                    if (elapsed >= curAtt.phaseEndMs - 150 && !st.daKetThuc) {
                      st.daKetThuc = true;
                      st.winHoldFrames = 34;
                      amThanh.chienThang();
                    }
                  }
                }
              }
            }
          }
        } else if (dangChoi && st.daKetThuc) {
          st.winHoldFrames--;
          if (st.winHoldFrames <= 0) {
            const winStudent = st.students[st.winnerIdx]?.hs;
            st.daKetThuc = false;
            if (winStudent) {
              onHoanThanhRef.current(winStudent);
            }
          }
        } else {
          st.ufoX = st.worldWidth / 2 + Math.sin(timeSec * 0.7) * Math.min(240, st.worldWidth * 0.24);
          st.ufoTilt = Math.cos(timeSec * 0.7) * 0.06;
          st.beamIntensity = 0.36 + Math.sin(timeSec * 3) * 0.08;
          st.beamWidthScale = 1;
          st.beamColorMode = 'scan';
          st.students.forEach(s => {
            s.walkPhase += 0.06;
          });
        }

        const targetCamX = Math.max(0, Math.min(st.worldWidth - w, st.ufoX - w / 2));
        st.camX += (targetCamX - st.camX) * 0.095;
      }

      for (let i = st.sparkles.length - 1; i >= 0; i--) {
        const sp = st.sparkles[i];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.alpha -= 0.028;
        if (sp.alpha <= 0) st.sparkles.splice(i, 1);
      }

      // ============================================================================
      // 2. VẼ BỐI CẢNH SÂN TRƯỜNG HỌC VIỆT NAM TƯƠI SÁNG (DÃY PHÒNG HỌC, CỘT CỜ, CÂY PHƯỢNG ĐỎ, GHẾ ĐÁ!)
      // ============================================================================
      ctx.clearRect(0, 0, w, h);

      // Bầu trời xanh sáng trong có mây trắng bồng bềnh
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 290);
      skyGrad.addColorStop(0, '#0284c7');
      skyGrad.addColorStop(0.55, '#38bdf8');
      skyGrad.addColorStop(1, '#e0f2fe');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Mặt trời nhẹ tỏa nắng góc trái trên
      ctx.save();
      const sunGrad = ctx.createRadialGradient(115, 72, 8, 115, 72, 68);
      sunGrad.addColorStop(0, '#fef9c3');
      sunGrad.addColorStop(0.45, 'rgba(253, 224, 71, 0.65)');
      sunGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(115, 72, 68, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const drawCloud = (cx: number, cy: number, sc: number) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(sc, sc);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, Math.PI * 2);
        ctx.arc(24, -8, 28, 0, Math.PI * 2);
        ctx.arc(50, 0, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };
      drawCloud((((210 - st.camX * 0.12) % (w + 220)) + w + 220) % (w + 220) - 80, 82, 0.9);
      drawCloud((((620 - st.camX * 0.10) % (w + 220)) + w + 220) % (w + 220) - 80, 64, 0.78);
      drawCloud((((950 - st.camX * 0.14) % (w + 220)) + w + 220) % (w + 220) - 80, 96, 1.0);

      // Tường rào trường học phía xa
      const camX = st.camX;
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, 290, w, 45);

      // Mặt sân trường lát gạch sáng sạch đẹp + bồn cỏ xanh ven sân
      const yardGrad = ctx.createLinearGradient(0, 326, 0, h);
      yardGrad.addColorStop(0, '#f1f5f9');
      yardGrad.addColorStop(0.5, '#e2e8f0');
      yardGrad.addColorStop(1, '#cbd5e1');
      ctx.fillStyle = yardGrad;
      ctx.fillRect(0, 326, w, h - 326);

      // Dải bồn cỏ xanh chạy sát chân dãy phòng học
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(0, 324, w, 24);
      ctx.fillStyle = '#15803d';
      ctx.fillRect(0, 344, w, 4);

      // Đường kẻ gạch sân trường phối cảnh trượt theo Camera
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.lineWidth = 1.4;
      for (let rowY = 368; rowY < h; rowY += 38) {
        ctx.beginPath();
        ctx.moveTo(0, rowY);
        ctx.lineTo(w, rowY);
        ctx.stroke();
      }
      const tileOff = camX % 76;
      for (let tx = -tileOff; tx < w + 76; tx += 76) {
        ctx.beginPath();
        ctx.moveTo(tx, 348);
        ctx.lineTo(tx, h);
        ctx.stroke();
      }

      // KHÔNG GIAN THẾ GIỚI SÂN TRƯỜNG THEO CAMERA
      ctx.save();
      ctx.translate(-camX, 0);

      // Vẽ lặp các khối Trường Học Việt Nam (Dãy lớp 2 tầng mái ngói đỏ, Cột cờ, Cây Phượng Đỏ, Cây Bàng, Ghế Đá!)
      const blockSpacing = 560;
      const firstBlock = Math.floor((camX - 240) / blockSpacing);
      const lastBlock = Math.ceil((camX + w + 240) / blockSpacing);

      for (let bi = firstBlock; bi <= lastBlock; bi++) {
        const bx = bi * blockSpacing + 40;

        // 1. DÃY PHÒNG HỌC 2 TẦNG TƯỜNG VÀNG KEM & MÁI NGÓI ĐỎ
        const bldgX = bx + 20;
        const bldgY = 178;
        const bldgW = 340;
        const bldgH = 148;

        // Tường chính vàng kem trường học
        ctx.fillStyle = '#fef3c7';
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 2.2;
        ctx.fillRect(bldgX, bldgY, bldgW, bldgH);
        ctx.strokeRect(bldgX, bldgY, bldgW, bldgH);

        // Đường hành lang tầng 2 & lan can trắng
        ctx.fillStyle = '#fde68a';
        ctx.fillRect(bldgX, bldgY + 68, bldgW, 12);
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.strokeRect(bldgX + 4, bldgY + 52, bldgW - 8, 16);

        // Mái ngói đỏ đặc trưng
        ctx.fillStyle = '#dc2626';
        ctx.strokeStyle = '#7f1d1d';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(bldgX - 16, bldgY + 4);
        ctx.lineTo(bldgX + 18, bldgY - 34);
        ctx.lineTo(bldgX + bldgW - 18, bldgY - 34);
        ctx.lineTo(bldgX + bldgW + 16, bldgY + 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Bảng tên trường nổi bật ở mặt tiền
        ctx.fillStyle = '#b91c1c';
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(bldgX + 86, bldgY - 12, 168, 22, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fef08a';
        ctx.font = '900 10.5px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🏫 TRƯỜNG HỌC VUI VẺ', bldgX + 170, bldgY - 0.5);

        // Cửa sổ lớp học tầng 1 & tầng 2
        for (let floor = 0; floor < 2; floor++) {
          const wy = bldgY + 20 + floor * 72;
          for (let col = 0; col < 5; col++) {
            const wx = bldgX + 24 + col * 62;
            // Tầng 1 ở giữa vẽ cửa chính lớp học
            if (floor === 1 && col === 2) {
              ctx.fillStyle = '#92400e';
              ctx.strokeStyle = '#451a03';
              ctx.lineWidth = 1.8;
              ctx.fillRect(wx + 2, wy - 4, 38, 56);
              ctx.strokeRect(wx + 2, wy - 4, 38, 56);
              ctx.fillStyle = '#fef08a';
              ctx.beginPath();
              ctx.arc(wx + 32, wy + 24, 2.5, 0, Math.PI * 2);
              ctx.fill();
            } else {
              ctx.fillStyle = '#38bdf8';
              ctx.strokeStyle = '#1e3a8a';
              ctx.lineWidth = 1.8;
              ctx.fillRect(wx, wy, 40, 30);
              ctx.strokeRect(wx, wy, 40, 30);
              // Chấn song cửa sổ trắng
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 1.4;
              ctx.beginPath();
              ctx.moveTo(wx + 20, wy);
              ctx.lineTo(wx + 20, wy + 30);
              ctx.moveTo(wx, wy + 15);
              ctx.lineTo(wx + 40, wy + 15);
              ctx.stroke();
            }
          }
        }

        // 2. CỘT CỜ GIỮA SÂN TRƯỜNG CÓ LÁ CỜ ĐỎ SAO VÀNG BAY PHẤP PHỚI
        const flagX = bx + 415;
        ctx.fillStyle = '#cbd5e1';
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.8;
        ctx.fillRect(flagX - 18, 314, 36, 16);
        ctx.strokeRect(flagX - 18, 314, 36, 16);
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(flagX - 3, 148, 6, 166);
        ctx.strokeRect(flagX - 3, 148, 6, 166);

        const wave = Math.sin(timeSec * 4.5 + bi) * 5;
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(flagX + 3, 152);
        ctx.quadraticCurveTo(flagX + 26, 148 + wave, flagX + 48, 154 - wave * 0.5);
        ctx.lineTo(flagX + 48, 182 - wave * 0.5);
        ctx.quadraticCurveTo(flagX + 26, 178 + wave, flagX + 3, 182);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(flagX + 24, 167 + wave * 0.35, 5.2, 0, Math.PI * 2);
        ctx.fill();

        // 3. CÂY PHƯỢNG VĨ ĐỎ RỰC / CÂY BÀNG XANH SÂN TRƯỜNG (vẽ tán lá mượt, KHÔNG bị vạch đen đè trong tán!)
        const treeX = bx + 498;
        ctx.fillStyle = '#78350f';
        ctx.fillRect(treeX - 8, 266, 16, 66);
        ctx.beginPath();
        ctx.moveTo(treeX - 4, 286);
        ctx.lineTo(treeX - 24, 258);
        ctx.moveTo(treeX + 4, 286);
        ctx.lineTo(treeX + 24, 258);
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 6;
        ctx.stroke();

        // Tán lá xanh mượt (vẽ riêng từng vòng tròn để không bị khuyết góc!)
        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.arc(treeX, 240, 38, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(treeX - 28, 254, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(treeX + 28, 254, 26, 0, Math.PI * 2);
        ctx.fill();

        // Điểm chùm hoa phượng đỏ rực rỡ (luân phiên cây phượng đỏ & cây bàng xanh lá sáng)
        if (bi % 2 === 0) {
          const blooms: [number, number, number][] = [
            [-20, 238, 10],
            [6, 224, 12],
            [24, 244, 10],
            [-6, 252, 9],
            [-32, 256, 8]
          ];
          blooms.forEach(([ox, oy, or]) => {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(treeX + ox, oy, or, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fb923c';
            ctx.beginPath();
            ctx.arc(treeX + ox - 2, oy - 2, or * 0.45, 0, Math.PI * 2);
            ctx.fill();
          });
        } else {
          ctx.fillStyle = '#4ade80';
          ctx.beginPath();
          ctx.arc(treeX - 10, 232, 18, 0, Math.PI * 2);
          ctx.arc(treeX + 16, 242, 16, 0, Math.PI * 2);
          ctx.fill();
        }

        // 4. GHẾ ĐÁ SÂN TRƯỜNG DƯỚI GỐC CÂY
        const benchX = treeX - 28;
        const benchY = 328;
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(benchX + 6, benchY + 6, 7, 14);
        ctx.fillRect(benchX + 43, benchY + 6, 7, 14);
        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.roundRect(benchX, benchY - 6, 56, 8, 3);
        ctx.roundRect(benchX, benchY + 3, 56, 7, 3);
        ctx.fill();
        ctx.stroke();
      }

      // Lọc hiển thị học sinh trong tầm nhìn Camera
      const visible = st.students.filter(s => s.x >= camX - 95 && s.x <= camX + w + 95);
      const labelSet = new Set<number>();
      if (st.students.length <= 16) {
        visible.forEach(s => labelSet.add(s.index));
      } else {
        const byDistToUfo = [...visible].sort((a, b) => Math.abs(a.x - st.ufoX) - Math.abs(b.x - st.ufoX));
        byDistToUfo.slice(0, 7).forEach(s => labelSet.add(s.index));
        st.activeTargetSet.forEach(idx => labelSet.add(idx));
      }

      veDiaBayUfo(st.ufoX, st.ufoY, st.ufoTilt, st.beamIntensity, st.beamWidthScale, st.beamColorMode, timeSec);

      const sortedVisible = [...visible].sort((a, b) => a.baseY - b.baseY);
      sortedVisible.forEach(s => {
        const isHi = s.state === 'lifted' || s.state === 'abducted';
        veHocSinhChibi(s, labelSet.has(s.index), isHi, timeSec);
      });

      st.sparkles.forEach(sp => {
        ctx.save();
        ctx.globalAlpha = sp.alpha;
        ctx.fillStyle = sp.color;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      ctx.restore(); // Kết thúc Camera

      // MINI-MAP TOÀN LỚP KHI LỚP ĐÔNG
      if (st.students.length > 12) {
        const mapW = 240;
        const mapH = 54;
        const mapX = w - mapW - 18;
        const mapY = h - mapH - 16;

        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(mapX, mapY, mapW, mapH, 12);
        ctx.fill();
        ctx.stroke();

        const step = Math.max(1, Math.floor(st.students.length / 180));
        for (let i = 0; i < st.students.length; i += step) {
          const s = st.students[i];
          const dx = mapX + 12 + (s.x / st.worldWidth) * (mapW - 24);
          const dy = mapY + 18 + ((s.baseY - 350) / 160) * (mapH - 28);
          const isTarget = st.activeTargetSet.has(i);
          ctx.fillStyle = isTarget ? '#facc15' : '#4ade80';
          ctx.beginPath();
          ctx.arc(dx, dy, isTarget ? 3.2 : 1.8, 0, Math.PI * 2);
          ctx.fill();
        }

        const viewX = mapX + 12 + (camX / st.worldWidth) * (mapW - 24);
        const viewW = Math.max(16, (w / st.worldWidth) * (mapW - 24));
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1.8;
        ctx.strokeRect(viewX, mapY + 13, viewW, mapH - 19);

        ctx.fillStyle = '#f8fafc';
        ctx.font = '800 9.5px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`RADAR TOÀN LỚP (${st.students.length} HS)`, mapX + 10, mapY + 10);
        ctx.restore();
      }

      st.animationFrameId = requestAnimationFrame(render);
    };

    stateRef.current.animationFrameId = requestAnimationFrame(render);
    return () => {
      running = false;
      if (stateRef.current.animationFrameId) {
        cancelAnimationFrame(stateRef.current.animationFrameId);
      }
    };
  }, [dangChoi]);

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
          boxShadow: '0 12px 35px rgba(0, 0, 0, 0.35)',
          border: '2px solid #38bdf8',
          background: '#0ea5e9'
        }}
      >
        <canvas
          ref={canvasRef}
          width={1100}
          height={580}
          style={{
            width: '100%',
            height: '100%',
            display: 'block'
          }}
        />

        {/* THANH HUD TRÊN CÙNG */}
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
          <div style={{ pointerEvents: 'auto' }}>
            {!dangChoi ? (
              <button
                type="button"
                onClick={() => {
                  amThanh.phatTiengTick();
                  khoiTaoDongCo(true);
                }}
                style={{
                  background: 'rgba(15, 23, 42, 0.88)',
                  color: '#fef08a',
                  border: '2px solid #facc15',
                  padding: '7px 14px',
                  borderRadius: '999px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                🔀 Đảo vị trí sân trường
              </button>
            ) : (
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.88)',
                  border: '2px solid #4ade80',
                  borderRadius: '999px',
                  padding: '6px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  color: '#fef08a'
                }}
              >
                {trangThaiText}
              </div>
            )}
          </div>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.94)',
              border: '2.5px solid #0f172a',
              borderRadius: '12px',
              padding: '4px 16px',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: '1.15rem',
              fontWeight: 900,
              color: '#0f172a',
              letterSpacing: '0.06em'
            }}
          >
            {dongHoText}
          </div>

          <div style={{ pointerEvents: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
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
            if (!dangChoi) {
              onBatDauChoi();
            }
          }}
          disabled={dangChoi || danhSach.length === 0}
          style={{
            background: dangChoi
              ? '#475569'
              : 'linear-gradient(135deg, #22d3ee 0%, #10b981 100%)',
            color: dangChoi ? '#e2e8f0' : '#042f2e',
            border: 'none',
            padding: '11px 38px',
            borderRadius: '30px',
            fontSize: '1.04rem',
            fontWeight: 900,
            cursor: dangChoi || danhSach.length === 0 ? 'not-allowed' : 'pointer',
            boxShadow: dangChoi ? 'none' : '0 6px 22px rgba(34, 211, 238, 0.45)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>{dangChoi ? '🛸 Đĩa bay đang săn tìm mục tiêu...' : '🛸 BẮT ĐẦU SĂN UFO'}</span>
        </button>
      </div>
    </div>
  );
};
