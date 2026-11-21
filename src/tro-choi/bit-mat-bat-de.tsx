// Trò chơi Tuổi Thơ Học Đường #1: 🙈 Bịt Mắt Bắt Dê
// Bối cảnh: Sân cờ nắng sớm (07:15) mở rộng panoramic • Bạn Sao Đỏ bịt khăn đỏ trung lập (100% HS công bằng 1/N)
// Tự động 100% thuần 1-Click (biến thiên ngẫu nhiên 12–28s, tối đa 30s) • Camera bám sát + Zoom chốt + Mini-Radar
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
  veBongBongThoai,
  veMiniRadar
} from './hoc-duong-chung';

interface BitMatBatDeProps {
  danhSach: HocSinh[];
  dangChoi: boolean;
  mucTieuIndex: number | null;
  onBatDauChoi: () => void;
  onHoanThanh: (nguoiThang?: HocSinh) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

interface RunnerActor {
  hs: HocSinh;
  origIndex: number;
  isGirl: boolean;
  hairColor: string;
  ribbonColor: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  walkCycle: number;
  speech: string;
  speechUntilMs: number;
  dodgingUntilMs: number;
  caught: boolean;
}

interface LungeWave {
  targetActorIdx: number;
  fakeTargetActorIdx: number | null; // Dùng cho cú ngoắt 180° ở pha chốt!
  isFinalCatch: boolean;
  isTurnaroundTwist: boolean;
  seekStartMs: number;
  twistFlipMs: number; // Thời điểm quay ngoắt 180° (nếu có)
  lungeStartMs: number;
  lungeEndMs: number;
  waveEndMs: number;
  playedLungeSfx: boolean;
  playedReactSfx: boolean;
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
const YARD_TOP_Y = 268;
const YARD_BOT_Y = 515;
const MAX_VISIBLE_ACTORS = 72;

const CAU_TREU = [
  '😜 Bắt tui nè!',
  '👏 Bắt tui nè, ở đây nè!',
  '👋 Bắt tui nè bạn ơi!',
  '😝 Đố bắt được tui!',
  '🤣 Bắt tui nè lêu lêu!'
];

const CAU_VO_HUT = [
  '😜 Hụt rồi lêu lêu!',
  '💨 Sát sạt luôn!',
  '😂 Bắt nhầm gió rồi!',
  '🏃 Thoát ngoạn mục!'
];

export const BitMatBatDe: React.FC<BitMatBatDeProps> = ({
  danhSach,
  dangChoi,
  mucTieuIndex,
  onBatDauChoi,
  onHoanThanh,
  isFullscreen = false,
  onToggleFullscreen
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hudText, setHudText] = useState<string>('🙈 Sẵn sàng chơi Bịt Mắt Bắt Dê trên sân cờ!');

  const onHoanThanhRef = useRef(onHoanThanh);
  useEffect(() => {
    onHoanThanhRef.current = onHoanThanh;
  }, [onHoanThanh]);

  const mucTieuIndexRef = useRef(mucTieuIndex);
  useEffect(() => {
    mucTieuIndexRef.current = mucTieuIndex;
  }, [mucTieuIndex]);

  const stateRef = useRef<{
    actors: RunnerActor[];
    winnerActorIdx: number;
    winnerHs: HocSinh | null;
    worldWidth: number;
    seekerX: number;
    seekerY: number;
    seekerFacing: 1 | -1;
    seekerWalk: number;
    seekerSpeech: string;
    seekerSpinAngle: number;
    camX: number;
    camZoom: number;
    waves: LungeWave[];
    sparkles: HatSao[];
    startTime: number;
    caughtAtMs: number;
    daKetThuc: boolean;
    lastHudMs: number;
    animId: number;
  }>({
    actors: [],
    winnerActorIdx: 0,
    winnerHs: null,
    worldWidth: 1600,
    seekerX: 800,
    seekerY: 392,
    seekerFacing: 1,
    seekerWalk: 0,
    seekerSpeech: '',
    seekerSpinAngle: 0,
    camX: 250,
    camZoom: 1,
    waves: [],
    sparkles: [],
    startTime: 0,
    caughtAtMs: 0,
    daKetThuc: false,
    lastHudMs: 0,
    animId: 0
  });

  const khoiTaoSan = useCallback((forGameStart: boolean) => {
    const st = stateRef.current;
    const n = danhSach.length;
    if (n === 0) {
      st.actors = [];
      st.winnerHs = null;
      st.waves = [];
      setHudText('🙈 Hãy thêm học sinh để bắt đầu chơi nhé!');
      return;
    }

    // Xác định người thắng công bằng 100% (ưu tiên mucTieuIndex do App bốc bằng crypto RNG)
    const rawTarget =
      mucTieuIndexRef.current !== null && mucTieuIndexRef.current >= 0 && mucTieuIndexRef.current < n
        ? mucTieuIndexRef.current
        : randomInt(n);
    const winnerHs = danhSach[rawTarget];
    st.winnerHs = winnerHs;

    // Chọn danh sách diễn viên trên sân (<= 72: giữ 100% lớp; > 72: đảm bảo có Winner + 71 bạn ngẫu nhiên giữ 60fps)
    let pickedIndices: number[];
    if (n <= MAX_VISIBLE_ACTORS) {
      pickedIndices = xaoTronCrypto(Array.from({ length: n }, (_, i) => i));
    } else {
      const others = xaoTronCrypto(
        Array.from({ length: n }, (_, i) => i).filter(i => i !== rawTarget)
      ).slice(0, MAX_VISIBLE_ACTORS - 1);
      pickedIndices = xaoTronCrypto([rawTarget, ...others]);
    }

    const actorCount = pickedIndices.length;
    const worldWidth = Math.max(1360, Math.min(3400, 1220 + actorCount * 32));
    st.worldWidth = worldWidth;

    const centerX = worldWidth / 2;
    const centerY = 395;

    const actors: RunnerActor[] = pickedIndices.map((origIdx, slot) => {
      const hs = danhSach[origIdx];
      const isGirl = doanGioiTinhNu(hs.ten, origIdx);
      // Phân bổ tự nhiên đều quanh sân cờ, chừa khoảng trống giữa cho Sao Đỏ
      const tPos = (slot + 0.5) / Math.max(1, actorCount);
      let ax = 130 + tPos * (worldWidth - 260) + randomRange(-28, 28);
      let ay = YARD_TOP_Y + 26 + ((slot * 73) % 100) / 100 * (YARD_BOT_Y - YARD_TOP_Y - 52);
      if (Math.hypot(ax - centerX, ay - centerY) < 125) {
        ax += ax >= centerX ? 135 : -135;
      }
      ax = Math.max(100, Math.min(worldWidth - 100, ax));
      ay = Math.max(YARD_TOP_Y + 22, Math.min(YARD_BOT_Y - 24, ay));

      const ang = randomRange(0, Math.PI * 2);
      const speed = randomRange(42, 68);
      return {
        hs,
        origIndex: origIdx,
        isGirl,
        hairColor: BANG_TOC_CHIBI[origIdx % BANG_TOC_CHIBI.length],
        ribbonColor: BANG_NO_CHIBI[origIdx % BANG_NO_CHIBI.length],
        x: ax,
        y: ay,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed * 0.55,
        facing: Math.cos(ang) >= 0 ? 1 : -1,
        walkCycle: randomRange(0, Math.PI * 2),
        speech: '',
        speechUntilMs: 0,
        dodgingUntilMs: 0,
        caught: false
      };
    });

    const winnerActorIdx = Math.max(0, actors.findIndex(a => a.origIndex === rawTarget));
    st.actors = actors;
    st.winnerActorIdx = winnerActorIdx;

    st.seekerX = centerX;
    st.seekerY = centerY;
    st.seekerFacing = 1;
    st.seekerWalk = 0;
    st.seekerSpeech = '';
    st.seekerSpinAngle = 0;
    st.camX = Math.max(0, Math.min(worldWidth - CANVAS_W, centerX - CANVAS_W / 2));
    st.camZoom = 1;
    st.sparkles = [];
    st.daKetThuc = false;
    st.caughtAtMs = 0;
    st.lastHudMs = 0;

    if (!forGameStart) {
      st.waves = [];
      setHudText(`🙈 Sân cờ sẵn sàng • ${n} học sinh đang chờ Sao Đỏ bịt mắt!`);
      return;
    }

    // Tự động sinh chuỗi 2–5 pha vồ ngẫu nhiên -> tổng thời lượng tự biến thiên 12–28s (tối đa 30s)
    const totalWaves = actorCount === 1 ? 2 : 2 + randomInt(4); // 2, 3, 4 hoặc 5 pha!
    const waves: LungeWave[] = [];
    let cursorMs = 2300; // 2.3s xoay 3 vòng định hướng mở màn

    const decoyPool = actors
      .map((_, idx) => idx)
      .filter(idx => idx !== winnerActorIdx);

    for (let w = 0; w < totalWaves; w++) {
      const isFinal = w === totalWaves - 1;
      const seekDur = isFinal ? randomRange(2800, 3500) : randomRange(2400, 3200);
      const lungeDur = 900;
      const reactDur = isFinal ? 1900 : 1150;

      let targetActorIdx = winnerActorIdx;
      let fakeTargetActorIdx: number | null = null;
      let isTurnaroundTwist = false;

      if (!isFinal) {
        if (decoyPool.length > 0) {
          targetActorIdx = decoyPool[randomInt(decoyPool.length)];
        } else {
          targetActorIdx = winnerActorIdx;
        }
      } else if (decoyPool.length > 0 && randomInt(100) < 48) {
        // Cú ngoắt 180° siêu bất ngờ ở pha chốt!
        isTurnaroundTwist = true;
        fakeTargetActorIdx = decoyPool[randomInt(decoyPool.length)];
      }

      const seekStartMs = cursorMs;
      const twistFlipMs = seekStartMs + seekDur * 0.56;
      const lungeStartMs = seekStartMs + seekDur;
      const lungeEndMs = lungeStartMs + lungeDur;
      const waveEndMs = lungeEndMs + reactDur;

      waves.push({
        targetActorIdx,
        fakeTargetActorIdx,
        isFinalCatch: isFinal,
        isTurnaroundTwist,
        seekStartMs,
        twistFlipMs,
        lungeStartMs,
        lungeEndMs,
        waveEndMs,
        playedLungeSfx: false,
        playedReactSfx: false
      });

      cursorMs = waveEndMs;
    }

    st.waves = waves;
    st.startTime = performance.now();
    setHudText(`🌀 Sao Đỏ đang xoay 3 vòng định hướng • ${n} HS`);
  }, [danhSach]);

  // Đồng bộ khi danh sách thay đổi lúc đang chờ
  useEffect(() => {
    if (!dangChoi) {
      khoiTaoSan(false);
    }
  }, [danhSach, dangChoi, khoiTaoSan]);

  // Đồng bộ cạnh lên dangChoi (hỗ trợ cả nút Bắt Đầu lẫn nút "🎯 Chọn người tiếp theo")
  const prevDangChoiRef = useRef<boolean>(false);
  useEffect(() => {
    if (dangChoi && !prevDangChoiRef.current) {
      khoiTaoSan(true);
    } else if (!dangChoi && prevDangChoiRef.current) {
      stateRef.current.daKetThuc = false;
    }
    prevDangChoiRef.current = dangChoi;
  }, [dangChoi, khoiTaoSan]);

  // Vòng lặp Canvas 60 FPS
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    let lastTime = performance.now();

    const spawnCelebrationStars = (cx: number, cy: number) => {
      const cols = ['#facc15', '#ef4444', '#38bdf8', '#22c55e', '#f472b6', '#ffffff'];
      for (let i = 0; i < 48; i++) {
        const ang = randomRange(0, Math.PI * 2);
        const spd = randomRange(90, 310);
        stateRef.current.sparkles.push({
          x: cx,
          y: cy - 20,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 120,
          r: randomRange(3, 6.5),
          alpha: 1,
          color: cols[i % cols.length]
        });
      }
    };

    const drawMorningFlagYard = (worldW: number, camX: number, t: number) => {
      // 1. Trời xanh nắng sớm 07:15
      const sky = ctx.createLinearGradient(0, 0, 0, 245);
      sky.addColorStop(0, '#0284c7');
      sky.addColorStop(0.55, '#38bdf8');
      sky.addColorStop(1, '#e0f2fe');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, CANVAS_W, 250);

      // Ông mặt trời nắng sớm góc trái trên (parallax nhẹ)
      const sunX = 115 - camX * 0.04;
      const sunY = 74;
      const sunGlow = ctx.createRadialGradient(sunX, sunY, 12, sunX, sunY, 76);
      sunGlow.addColorStop(0, 'rgba(254, 240, 138, 0.98)');
      sunGlow.addColorStop(0.45, 'rgba(253, 224, 71, 0.4)');
      sunGlow.addColorStop(1, 'rgba(253, 224, 71, 0)');
      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 76, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(sunX, sunY, 26, 0, Math.PI * 2);
      ctx.fill();

      // Mây trắng trôi chậm
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      for (let i = 0; i < 7; i++) {
        const cx = ((i * 290 + t * 14 - camX * 0.16) % (CANVAS_W + 260) + (CANVAS_W + 260)) % (CANVAS_W + 260) - 130;
        const cy = 48 + (i % 3) * 26;
        ctx.beginPath();
        ctx.arc(cx, cy, 22, 0, Math.PI * 2);
        ctx.arc(cx + 22, cy - 8, 26, 0, Math.PI * 2);
        ctx.arc(cx + 46, cy, 20, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Dãy phòng học 2 tầng vàng kem mái ngói đỏ chạy dọc theo thế giới
      ctx.save();
      ctx.translate(-camX, 0);

      const bldgStart = 70;
      const bldgWidth = worldW - 140;
      // Tường vàng kem 2 tầng
      ctx.fillStyle = '#fef3c7';
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 2.4;
      ctx.fillRect(bldgStart, 108, bldgWidth, 136);
      ctx.strokeRect(bldgStart, 108, bldgWidth, 136);

      // Lan can tầng 2
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(bldgStart, 166, bldgWidth, 14);
      ctx.strokeRect(bldgStart, 166, bldgWidth, 14);

      // Mái ngói đỏ Việt Nam
      ctx.fillStyle = '#dc2626';
      ctx.strokeStyle = '#991b1b';
      ctx.beginPath();
      ctx.moveTo(bldgStart - 26, 112);
      ctx.lineTo(bldgStart + 18, 66);
      ctx.lineTo(bldgStart + bldgWidth - 18, 66);
      ctx.lineTo(bldgStart + bldgWidth + 26, 112);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Sọc ngói đỏ
      ctx.strokeStyle = 'rgba(127, 29, 29, 0.28)';
      ctx.lineWidth = 1.6;
      for (let gx = bldgStart + 24; gx < bldgStart + bldgWidth - 20; gx += 46) {
        if (gx < camX - 80 || gx > camX + CANVAS_W + 80) continue;
        ctx.beginPath();
        ctx.moveTo(gx, 68);
        ctx.lineTo(gx - 8, 110);
        ctx.stroke();
      }

      // Cửa sổ 2 tầng sáng xanh (culling theo viewport)
      for (let wx = bldgStart + 42; wx < bldgStart + bldgWidth - 70; wx += 98) {
        if (wx < camX - 110 || wx > camX + CANVAS_W + 110) continue;
        [122, 190].forEach(wy => {
          ctx.fillStyle = '#7dd3fc';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.2;
          ctx.fillRect(wx, wy, 52, 34);
          ctx.strokeRect(wx, wy, 52, 34);
          ctx.beginPath();
          ctx.moveTo(wx + 26, wy);
          ctx.lineTo(wx + 26, wy + 34);
          ctx.stroke();
        });
      }

      // Biển tên trường chính giữa dãy nhà
      const midX = worldW / 2;
      ctx.fillStyle = '#b91c1c';
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.roundRect(midX - 148, 80, 296, 30, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fef08a';
      ctx.font = '900 13.5px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🏫 TRƯỜNG HỌC VUI VẺ', midX, 95.5);

      // 3. Bồn cỏ & hàng hoa 10 giờ + Ghế đá + Cây xanh
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(0, 240, worldW, 24);
      ctx.fillStyle = '#15803d';
      ctx.fillRect(0, 260, worldW, 6);

      // Sân gạch lát sáng rực máy chiếu
      const yardGrad = ctx.createLinearGradient(0, 266, 0, CANVAS_H);
      yardGrad.addColorStop(0, '#f8fafc');
      yardGrad.addColorStop(1, '#e2e8f0');
      ctx.fillStyle = yardGrad;
      ctx.fillRect(0, 266, worldW, CANVAS_H - 266);

      // Lưới ô gạch sân cờ nhạt tinh tế
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
      ctx.lineWidth = 1.2;
      for (let gx = Math.floor(camX / 70) * 70; gx < camX + CANVAS_W + 70; gx += 70) {
        ctx.beginPath();
        ctx.moveTo(gx, 266);
        ctx.lineTo(gx, CANVAS_H);
        ctx.stroke();
      }
      for (let gy = 305; gy < CANVAS_H; gy += 48) {
        ctx.beginPath();
        ctx.moveTo(camX - 20, gy);
        ctx.lineTo(camX + CANVAS_W + 20, gy);
        ctx.stroke();
      }

      // Cây xanh & ghế đá dọc mép sân (mỗi vòng tròn tán lá vẽ riêng để tròn mướt không khuyết!)
      for (let tx = 140; tx < worldW - 80; tx += 390) {
        if (tx < camX - 140 || tx > camX + CANVAS_W + 140) continue;
        // Thân cây
        ctx.fillStyle = '#78350f';
        ctx.fillRect(tx - 9, 188, 18, 60);
        // Tán lá mượt
        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.arc(tx, 166, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(tx - 26, 178, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(tx + 26, 178, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.arc(tx - 10, 154, 18, 0, Math.PI * 2);
        ctx.fill();

        // Ghế đá sân trường
        const bx = tx + 115;
        ctx.fillStyle = '#cbd5e1';
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.8;
        ctx.fillRect(bx - 30, 246, 60, 12);
        ctx.strokeRect(bx - 30, 246, 60, 12);
        ctx.fillRect(bx - 24, 258, 9, 10);
        ctx.fillRect(bx + 15, 258, 9, 10);
      }

      // Cột cờ Tổ quốc đặt lệch gọn bên phải biển tên trường để KHÔNG che chữ!
      const flagX = midX + 215;
      // Bệ cột cờ 2 bậc
      ctx.fillStyle = '#cbd5e1';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.fillRect(flagX - 30, 252, 60, 14);
      ctx.strokeRect(flagX - 30, 252, 60, 14);
      ctx.fillRect(flagX - 18, 240, 36, 12);
      ctx.strokeRect(flagX - 18, 240, 36, 12);
      // Thân cột inox sáng
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 5.5;
      ctx.beginPath();
      ctx.moveTo(flagX, 240);
      ctx.lineTo(flagX, 52);
      ctx.stroke();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      // Lá cờ đỏ sao vàng tung bay theo gió sáng
      const wave1 = Math.sin(t * 5.2) * 5;
      const wave2 = Math.cos(t * 5.2) * 4;
      ctx.fillStyle = '#dc2626';
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(flagX + 3, 56);
      ctx.quadraticCurveTo(flagX + 34, 52 + wave1, flagX + 64, 58 + wave2);
      ctx.lineTo(flagX + 64, 94 + wave2);
      ctx.quadraticCurveTo(flagX + 34, 88 + wave1, flagX + 3, 94);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Sao vàng giữa lá cờ
      const sx = flagX + 33;
      const sy = 75 + wave1 * 0.45;
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      for (let p = 0; p < 10; p++) {
        const rr = p % 2 === 0 ? 10 : 4.2;
        const a = -Math.PI / 2 + (p * Math.PI) / 5;
        if (p === 0) ctx.moveTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr);
        else ctx.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();

      // Hoa 10 giờ rực rỡ dọc viền cỏ
      const flowerCols = ['#ec4899', '#facc15', '#fb923c', '#ffffff'];
      for (let fx = 36; fx < worldW - 20; fx += 44) {
        if (fx < camX - 30 || fx > camX + CANVAS_W + 30) continue;
        ctx.fillStyle = flowerCols[Math.floor(fx / 44) % flowerCols.length];
        ctx.beginPath();
        ctx.arc(fx, 250 + (fx % 7), 3.6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    };

    const render = (now: number) => {
      if (!running) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      const t = now / 1000;
      const st = stateRef.current;

      // === CẬP NHẬT CHUYỂN ĐỘNG LOGIC ===
      if (dangChoi && st.actors.length > 0 && st.waves.length > 0) {
        const elapsed = now - st.startTime;
        const activeWaveIdx = st.waves.findIndex(w => elapsed <= w.waveEndMs);
        const activeWave = activeWaveIdx >= 0 ? st.waves[activeWaveIdx] : st.waves[st.waves.length - 1];

        if (elapsed < 2300) {
          // Chặng 1: Sao Đỏ xoay 3 vòng định hướng tại chỗ!
          const p = elapsed / 2300;
          st.seekerSpinAngle = p * Math.PI * 6;
          st.seekerFacing = Math.cos(st.seekerSpinAngle) >= 0 ? 1 : -1;
          st.seekerWalk += dt * 11;
          st.seekerSpeech = '🌀 1... 2... 3 vòng!';
          // Học sinh chạy tản nhẹ
          st.actors.forEach(a => {
            a.x += a.vx * dt;
            a.y += a.vy * dt;
            if (a.x < 95 || a.x > st.worldWidth - 95) a.vx *= -1;
            if (a.y < YARD_TOP_Y + 22 || a.y > YARD_BOT_Y - 22) a.vy *= -1;
            a.facing = a.vx >= 0 ? 1 : -1;
            a.walkCycle += dt * 7;
          });
        } else if (!st.daKetThuc && activeWave) {
          const isFinalCaught = activeWave.isFinalCatch && elapsed >= activeWave.lungeEndMs;

          // Xác định mục tiêu hiện tại của Sao Đỏ
          const chasingFake =
            activeWave.isTurnaroundTwist &&
            activeWave.fakeTargetActorIdx !== null &&
            elapsed < activeWave.twistFlipMs;
          const focusIdx = chasingFake ? activeWave.fakeTargetActorIdx! : activeWave.targetActorIdx;
          const focusActor = st.actors[focusIdx];

          // Cập nhật HUD nhịp diễn biến (không đếm ngược lộ giây chốt!)
          if (now - st.lastHudMs > 240) {
            st.lastHudMs = now;
            if (isFinalCaught) {
              setHudText(`🌟 Tóm dính rồi! Mời ${focusActor.hs.ten} lên bảng tỏa sáng!`);
            } else if (activeWave.isTurnaroundTwist && elapsed >= activeWave.twistFlipMs && elapsed < activeWave.lungeEndMs) {
              setHudText(`⚡ CÚ NGOẮT 180° BẤT NGỜ! Sao Đỏ quay ngược lại!`);
            } else if (elapsed >= activeWave.lungeStartMs && elapsed < activeWave.lungeEndMs) {
              setHudText(`🔥 Lượt vồ ${activeWaveIdx + 1} • Coi chừng bị tóm!!`);
            } else {
              setHudText(`🙈 Lượt dò tìm ${activeWaveIdx + 1} • ${danhSach.length} HS đang chạy né`);
            }
          }

          if (!isFinalCaught && focusActor) {
            const inLunge = elapsed >= activeWave.lungeStartMs && elapsed < activeWave.lungeEndMs;
            const inReact = elapsed >= activeWave.lungeEndMs;

            if (inLunge && !activeWave.playedLungeSfx) {
              activeWave.playedLungeSfx = true;
              if (activeWave.isFinalCatch) {
                st.seekerSpeech = '🎯 ĐỨNG LẠI NÀO!';
              } else {
                st.seekerSpeech = '👐 VỒ NÈ!!';
              }
            }

            if (inReact && !activeWave.playedReactSfx) {
              activeWave.playedReactSfx = true;
              if (!activeWave.isFinalCatch) {
                amThanh.phatTiengVoHut();
                st.seekerSpeech = '💨 Ôi vồ hụt rồi!';
                focusActor.speech = CAU_VO_HUT[randomInt(CAU_VO_HUT.length)];
                focusActor.speechUntilMs = now + 1350;
                focusActor.dodgingUntilMs = now + 1100;
              }
            }

            // Di chuyển Sao Đỏ theo từng pha
            const dx = focusActor.x - st.seekerX;
            const dy = focusActor.y - st.seekerY;
            const dist = Math.hypot(dx, dy) || 1;
            st.seekerFacing = dx >= 0 ? 1 : -1;

            if (elapsed < activeWave.lungeStartMs) {
              // Pha dò dẫm tiếp cận mục tiêu
              const moveSpeed = chasingFake ? 175 : activeWave.isTurnaroundTwist ? 255 : 195;
              const desiredGap = activeWave.isFinalCatch ? 78 : 96;
              if (dist > desiredGap) {
                st.seekerX += (dx / dist) * moveSpeed * dt;
                st.seekerY += (dy / dist) * moveSpeed * 0.72 * dt;
              }
              st.seekerWalk += dt * 7.5;
              if (activeWave.isTurnaroundTwist && elapsed >= activeWave.twistFlipMs) {
                st.seekerSpeech = '⚡ Ai vừa kêu "Bắt tui nè" phía sau?!';
                if (now > focusActor.speechUntilMs) {
                  focusActor.speech = '😜 Bắt tui nè!';
                  focusActor.speechUntilMs = now + 1150;
                }
              } else {
                st.seekerSpeech = '👂 Nghe tiếng "Bắt tui nè"...';
              }
            } else if (inLunge) {
              // Pha lao vồ nhanh!
              const lungeSpeed = activeWave.isFinalCatch ? 360 : 310;
              if (activeWave.isFinalCatch) {
                // Lao thẳng tới ôm sát Winner
                const stopGap = 44;
                if (dist > stopGap) {
                  st.seekerX += (dx / dist) * Math.min(dist - stopGap, lungeSpeed * dt);
                  st.seekerY += (dy / dist) * Math.min(dist - stopGap, lungeSpeed * dt);
                }
              } else {
                // Vồ sát sạt rồi trượt qua tạo kịch tính
                if (dist > 54) {
                  st.seekerX += (dx / dist) * lungeSpeed * dt;
                  st.seekerY += (dy / dist) * lungeSpeed * dt;
                }
              }
              st.seekerWalk += dt * 14;
            } else {
              // Pha đứng gãi đầu sau vồ hụt
              st.seekerWalk += dt * 2;
            }

            // Học sinh chạy né tự nhiên quanh sân
            st.actors.forEach((a, idx) => {
              const distToSeeker = Math.hypot(a.x - st.seekerX, a.y - st.seekerY);
              if (idx === focusIdx && activeWave.isFinalCatch && inLunge) {
                // Pha chốt: Winner hơi giật mình chậm chân để Sao Đỏ tóm gọn đẹp mắt
                a.vx *= 0.92;
                a.vy *= 0.92;
                a.x += a.vx * dt;
                a.y += a.vy * dt;
                a.facing = st.seekerX >= a.x ? 1 : -1;
                a.walkCycle += dt * 5;
              } else if (idx === focusIdx && !activeWave.isFinalCatch && inReact) {
                // Bứt tốc lách né sau khi Sao Đỏ vồ hụt!
                const awayX = a.x >= st.seekerX ? 1 : -1;
                a.vx = awayX * 185;
                a.vy = (a.y > 390 ? -1 : 1) * 75;
                a.x += a.vx * dt;
                a.y += a.vy * dt;
                a.facing = awayX;
                a.walkCycle += dt * 13;
              } else {
                // Chạy lách bình thường, tự né xa nếu quá sát Sao Đỏ
                if (distToSeeker < 105 && !(idx === focusIdx && activeWave.isFinalCatch)) {
                  const nx = (a.x - st.seekerX) / (distToSeeker || 1);
                  const ny = (a.y - st.seekerY) / (distToSeeker || 1);
                  a.vx = nx * 130;
                  a.vy = ny * 75;
                }
                a.x += a.vx * dt;
                a.y += a.vy * dt;
                if (a.x < 92) { a.x = 92; a.vx = Math.abs(a.vx); }
                if (a.x > st.worldWidth - 92) { a.x = st.worldWidth - 92; a.vx = -Math.abs(a.vx); }
                if (a.y < YARD_TOP_Y + 22) { a.y = YARD_TOP_Y + 22; a.vy = Math.abs(a.vy); }
                if (a.y > YARD_BOT_Y - 22) { a.y = YARD_BOT_Y - 22; a.vy = -Math.abs(a.vy); }
                a.facing = a.vx >= 0 ? 1 : -1;
                a.walkCycle += dt * 7.5;

                // Các bạn học sinh chạy quanh vỗ tay kêu "Bắt tui nè!" (giữ tối đa 2 bạn kêu cùng lúc để cực thoáng!)
                const activeSpeakers = st.actors.reduce((acc, x) => acc + (now < x.speechUntilMs ? 1 : 0), 0);
                if (
                  activeSpeakers < 2 &&
                  distToSeeker > 115 &&
                  distToSeeker < 320 &&
                  now > a.speechUntilMs &&
                  randomInt(85) === 0
                ) {
                  a.speech = CAU_TREU[randomInt(CAU_TREU.length)];
                  a.speechUntilMs = now + 1450;
                }
              }
            });
          } else if (isFinalCaught && focusActor) {
            // KHOẢNH KHẮC BẮT DÍNH WINNER!
            if (st.caughtAtMs === 0) {
              st.caughtAtMs = now;
              focusActor.caught = true;
              focusActor.speech = '😱 Á bị tóm rồi!!';
              focusActor.speechUntilMs = now + 4000;
              st.seekerSpeech = '🎯 TÓM DÍNH RỒI!';
              // Đặt vị trí Sao Đỏ ôm sát ngay cạnh Winner cho khung hình đẹp
              st.seekerX = focusActor.x + (st.seekerX < focusActor.x ? -46 : 46);
              st.seekerY = focusActor.y;
              st.seekerFacing = focusActor.x >= st.seekerX ? 1 : -1;
              amThanh.phatTiengBatDinh();
              spawnCelebrationStars(focusActor.x, focusActor.y);
            }

            // Zoom-in nhẹ 1.18x vào cặp đôi
            st.camZoom += (1.18 - st.camZoom) * Math.min(1, dt * 4.5);

            if (now - st.caughtAtMs >= 1850 && !st.daKetThuc) {
              st.daKetThuc = true;
              amThanh.phatTiengChucMung();
              onHoanThanhRef.current(focusActor.hs);
            }
          }
        }
      } else {
        // Trạng thái chờ: cả lớp đi dạo vui tươi quanh sân cờ
        st.seekerX = st.worldWidth / 2 + Math.sin(t * 0.9) * 85;
        st.seekerY = 396 + Math.cos(t * 0.6) * 14;
        st.seekerFacing = Math.cos(t * 0.9) >= 0 ? 1 : -1;
        st.seekerWalk += dt * 4.5;
        st.camZoom += (1 - st.camZoom) * Math.min(1, dt * 5);

        st.actors.forEach(a => {
          a.x += a.vx * dt * 0.45;
          a.y += a.vy * dt * 0.45;
          if (a.x < 95) { a.x = 95; a.vx = Math.abs(a.vx); }
          if (a.x > st.worldWidth - 95) { a.x = st.worldWidth - 95; a.vx = -Math.abs(a.vx); }
          if (a.y < YARD_TOP_Y + 24) { a.y = YARD_TOP_Y + 24; a.vy = Math.abs(a.vy); }
          if (a.y > YARD_BOT_Y - 24) { a.y = YARD_BOT_Y - 24; a.vy = -Math.abs(a.vy); }
          a.facing = a.vx >= 0 ? 1 : -1;
          a.walkCycle += dt * 4.2;
        });
      }

      // Camera bám sát mượt theo Sao Đỏ
      const targetCamX = Math.max(0, Math.min(st.worldWidth - CANVAS_W, st.seekerX - CANVAS_W * 0.5));
      st.camX += (targetCamX - st.camX) * Math.min(1, dt * 5.2);

      // Cập nhật hạt pháo sao
      st.sparkles.forEach(s => {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vy += 320 * dt;
        s.alpha -= dt * 0.65;
      });
      st.sparkles = st.sparkles.filter(s => s.alpha > 0);

      // === VẼ KHUNG HÌNH ===
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      ctx.save();
      if (st.camZoom > 1.001) {
        const pivotX = st.seekerX - st.camX;
        const pivotY = st.seekerY - 15;
        ctx.translate(pivotX, pivotY);
        ctx.scale(st.camZoom, st.camZoom);
        ctx.translate(-pivotX, -pivotY);
      }

      drawMorningFlagYard(st.worldWidth, st.camX, t);

      // Vòng spotlight cảm âm mờ quanh Sao Đỏ
      ctx.save();
      const sScreenX = st.seekerX - st.camX;
      const radGrad = ctx.createRadialGradient(sScreenX, st.seekerY + 12, 24, sScreenX, st.seekerY + 12, 265);
      radGrad.addColorStop(0, 'rgba(250, 204, 21, 0.22)');
      radGrad.addColorStop(1, 'rgba(250, 204, 21, 0)');
      ctx.fillStyle = radGrad;
      ctx.beginPath();
      ctx.ellipse(sScreenX, st.seekerY + 12, 265, 118, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Sắp xếp toàn bộ nhân vật (HS + Sao Đỏ) theo chiều sâu Y để vẽ chồng tự nhiên
      type DrawItem =
        | { kind: 'student'; y: number; actor: RunnerActor; idx: number }
        | { kind: 'seeker'; y: number };

      const drawList: DrawItem[] = [{ kind: 'seeker', y: st.seekerY }];
      st.actors.forEach((actor, idx) => {
        // Viewport culling giữ 60fps
        const sx = actor.x - st.camX;
        if (sx < -95 || sx > CANVAS_W + 95) return;
        drawList.push({ kind: 'student', y: actor.y, actor, idx });
      });
      drawList.sort((a, b) => a.y - b.y);

      // Chọn tối đa 8 học sinh gần Sao Đỏ nhất để bật bảng tên Spotlight (triệt tiêu đè chữ!)
      const spotlightIndices = new Set<number>();
      const nearCandidates = st.actors
        .map((actor, idx) => ({
          idx,
          dist: Math.hypot(actor.x - st.seekerX, actor.y - st.seekerY),
          sx: actor.x - st.camX
        }))
        .filter(c => c.sx >= 45 && c.sx <= CANVAS_W - 45 && (c.dist <= 320 || st.actors[c.idx].caught || now < st.actors[c.idx].speechUntilMs))
        .sort((a, b) => {
          const aa = st.actors[a.idx];
          const bb = st.actors[b.idx];
          const pa = aa.caught ? 2 : now < aa.speechUntilMs ? 1 : 0;
          const pb = bb.caught ? 2 : now < bb.speechUntilMs ? 1 : 0;
          return pb - pa || a.dist - b.dist;
        });

      nearCandidates.slice(0, 8).forEach(c => spotlightIndices.add(c.idx));

      // Vẽ tất cả nhân vật trước
      drawList.forEach(item => {
        if (item.kind === 'seeker') {
          veHocSinhChibi(
            ctx,
            st.seekerX - st.camX,
            st.seekerY,
            1.14,
            {
              isGirl: false,
              hairColor: '#18181b',
              facing: st.seekerFacing,
              isSaoDo: true,
              blindfold: true,
              reachDir: st.seekerFacing,
              walkCycle: st.seekerWalk,
              highlight: st.caughtAtMs > 0
            },
            t
          );
        } else {
          const a = item.actor;
          const dist = Math.hypot(a.x - st.seekerX, a.y - st.seekerY);
          const isShouting = Boolean(a.speech) && now < a.speechUntilMs && !a.caught;
          const expr = a.caught
            ? 'shocked'
            : dangChoi && dist < 135
            ? 'focus'
            : 'normal';

          // Vòng sóng âm nhẹ tỏa ra khi học sinh vẫy tay kêu "Bắt tui nè!"
          if (isShouting) {
            ctx.save();
            const rippleP = ((t * 2.4 + item.idx * 0.3) % 1);
            ctx.strokeStyle = `rgba(245, 158, 11, ${(1 - rippleP) * 0.65})`;
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.arc(a.x - st.camX, a.y - 16, 18 + rippleP * 28, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }

          veHocSinhChibi(
            ctx,
            a.x - st.camX,
            a.y,
            a.caught ? 1.12 : 0.96,
            {
              isGirl: a.isGirl,
              hairColor: a.hairColor,
              ribbonColor: a.ribbonColor,
              facing: a.facing,
              expression: expr,
              walkCycle: a.walkCycle,
              raiseArm: isShouting,
              highlight: a.caught
            },
            t
          );
        }
      });

      // Vẽ lớp nhãn tên Spotlight + chống đè nhãn tuyệt đối!
      // Khi đã bắt dính Winner -> chỉ hiện nổi bật cặp đôi Sao Đỏ & Winner cho khung hình chốt cực thoáng đẹp!
      const isWinFreeze = st.caughtAtMs > 0;
      const maxLabels = isWinFreeze ? 1 : 5;
      const placedLabels: { x: number; y: number }[] = [];

      // Đặt sẵn vùng nhãn của Sao Đỏ để nhãn học sinh tránh chồng lên
      const seekerScreenX = st.seekerX - st.camX;
      const seekerLabelY = st.seekerY - 68;
      if (!isWinFreeze) {
        placedLabels.push({ x: seekerScreenX, y: seekerLabelY });
      }

      nearCandidates.slice(0, maxLabels).forEach(c => {
        const a = st.actors[c.idx];
        const lx = a.x - st.camX;
        let ly = a.y - (a.caught ? 72 : 56);
        let guard = 0;
        while (
          guard < 8 &&
          placedLabels.some(p => Math.abs(p.x - lx) < 146 && Math.abs(p.y - ly) < 30)
        ) {
          ly -= 30;
          guard++;
        }
        ly = Math.max(76, ly);
        placedLabels.push({ x: lx, y: ly });
        veBangTenHocSinh(ctx, lx, ly, a.hs.ten, {
          highlight: a.caught,
          prefix: a.caught ? '🌟 ' : ''
        });

        if (a.speech && now < a.speechUntilMs) {
          veBongBongThoai(ctx, lx, ly - 18, a.speech, {
            bg: a.caught ? '#fee2e2' : '#fef08a',
            border: a.caught ? '#dc2626' : '#ca8a04',
            color: a.caught ? '#991b1b' : '#713f12'
          });
        }
      });

      // Nhãn & bong bóng của Bạn Sao Đỏ bịt mắt (khi bắt dính tách rộng sang phía đối diện Winner để không che tên!)
      const winActor = isWinFreeze ? st.actors.find(a => a.caught) : null;
      const seekerLabelX =
        winActor && Math.abs(winActor.x - st.seekerX) < 110
          ? seekerScreenX + (st.seekerX <= winActor.x ? -88 : 88)
          : seekerScreenX;

      if (!isWinFreeze) {
        veBangTenHocSinh(ctx, seekerLabelX, seekerLabelY, 'Sao Đỏ bịt mắt', {
          highlight: false,
          prefix: '🙈 ',
          fontSize: 12.5
        });
      }
      if (st.seekerSpeech && dangChoi) {
        veBongBongThoai(
          ctx,
          seekerLabelX,
          isWinFreeze ? st.seekerY - 62 : seekerLabelY - 18,
          st.seekerSpeech,
          {
            bg: isWinFreeze ? '#dcfce7' : '#e0f2fe',
            border: isWinFreeze ? '#16a34a' : '#0284c7',
            color: isWinFreeze ? '#14532d' : '#0c4a6e'
          }
        );
      }

      // Vẽ pháo sao chúc mừng
      st.sparkles.forEach(s => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, s.alpha);
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x - st.camX, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      ctx.restore(); // Kết thúc zoom camera

      // Mini-Radar góc phải dưới khi lớp >= 15 HS
      if (danhSach.length >= 15) {
        const dots = st.actors.map(a => ({
          xNorm: a.x / st.worldWidth,
          yNorm: (a.y - YARD_TOP_Y) / (YARD_BOT_Y - YARD_TOP_Y),
          color: a.caught ? '#facc15' : '#38bdf8',
          r: a.caught ? 3.8 : 2.1
        }));
        dots.push({
          xNorm: st.seekerX / st.worldWidth,
          yNorm: (st.seekerY - YARD_TOP_Y) / (YARD_BOT_Y - YARD_TOP_Y),
          color: '#ef4444',
          r: 4.2
        });
        veMiniRadar(
          ctx,
          CANVAS_W - 214,
          CANVAS_H - 76,
          198,
          62,
          `RADAR SÂN CỜ (${danhSach.length} HS)`,
          dots,
          st.camX / st.worldWidth,
          (st.camX + CANVAS_W) / st.worldWidth
        );
      }

      st.animId = requestAnimationFrame(render);
    };

    stateRef.current.animId = requestAnimationFrame(render);
    return () => {
      running = false;
      if (stateRef.current.animId) {
        cancelAnimationFrame(stateRef.current.animId);
      }
    };
  }, [dangChoi, danhSach.length]);

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
          border: '2px solid #38bdf8',
          background: '#0ea5e9'
        }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />

        {/* HUD TỐI GIẢN: Chỉ nhịp diễn biến bên trái + Toàn màn hình bên phải */}
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

      {/* NÚT BẮT ĐẦU THUẦN 1-CLICK DUY NHẤT */}
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
              : 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
            color: '#ffffff',
            border: dangChoi ? 'none' : '2px solid #fef08a',
            padding: '11px 38px',
            borderRadius: '30px',
            fontSize: '1.04rem',
            fontWeight: 900,
            cursor: dangChoi || danhSach.length === 0 ? 'not-allowed' : 'pointer',
            boxShadow: dangChoi ? 'none' : '0 6px 22px rgba(245, 158, 11, 0.45)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>{dangChoi ? '🙈 Sao Đỏ đang dò tìm trên sân cờ...' : '🙈 BẮT ĐẦU BỊT MẮT BẮT DÊ'}</span>
        </button>
      </div>
    </div>
  );
};
