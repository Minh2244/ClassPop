// Trò chơi Tuổi Thơ Học Đường #4: 🏸 Đá Cầu Ra Chơi
// Bối cảnh: Sân thể dục chiều nắng vàng (16:00) mở rộng panoramic • Quả cầu lông Việt Nam 3 màu đỏ-vàng-xanh
// Camera lướt bám mượt theo đường bay quả cầu • Pha cứu cầu quay chậm (Slow-Mo) & Cú cầu xoáy chốt bất ngờ (12–28s, tối đa 30s)
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

interface DaCauRaChoiProps {
  danhSach: HocSinh[];
  dangChoi: boolean;
  mucTieuIndex: number | null;
  onBatDauChoi: () => void;
  onHoanThanh: (nguoiThang?: HocSinh) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

interface PlayerActor {
  hs: HocSinh;
  origIndex: number;
  isGirl: boolean;
  hairColor: string;
  ribbonColor: string;
  x: number;
  y: number;
  facing: 1 | -1;
  kickTimer: number; // 0..1 hoạt ảnh giơ chân đá cầu
  speech: string;
  speechUntilMs: number;
  missed: boolean;
}

interface PassStep {
  fromIdx: number;
  toIdx: number;
  arcHeight: number;
  durationSec: number;
  isLongLob: boolean;   // Cú đá chuyền cao dài xuyên sân lên tận mây!
  isLowSave: boolean;   // Pha cứu cầu sát đất quay chậm Slow-Motion!
  isSpinFinal: boolean; // Cú cầu xoáy siêu khó chốt hạ!
}

interface HatBui {
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
const COURT_TOP_Y = 278;
const COURT_BOT_Y = 508;
const MAX_VISIBLE_PLAYERS = 72;

const CAU_CUU_CAU = [
  '🔥 Cứu cầu đỉnh chưa!',
  '⚡ Xém chạm đất luôn!',
  '😎 Đỡ gọn gàng!'
];

const CAU_CHUYEN_CAU = [
  '🏸 Đỡ nè!',
  '✨ Bắt lấy!',
  '😆 Cú này bổng nha!'
];

const CAU_CHUYEN_DAI = [
  '🚀 Chuyền dài xuyên sân nè!!',
  '🌈 Cú bổng siêu cao luôn!!',
  '⚡ Đón cầu từ xa nha!!'
];

export const DaCauRaChoi: React.FC<DaCauRaChoiProps> = ({
  danhSach,
  dangChoi,
  mucTieuIndex,
  onBatDauChoi,
  onHoanThanh,
  isFullscreen = false,
  onToggleFullscreen
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hudText, setHudText] = useState<string>('🏸 Cả lớp đã xếp vòng Đá Cầu trên sân thể dục chiều nắng!');

  const onHoanThanhRef = useRef(onHoanThanh);
  useEffect(() => {
    onHoanThanhRef.current = onHoanThanh;
  }, [onHoanThanh]);

  const mucTieuIndexRef = useRef(mucTieuIndex);
  useEffect(() => {
    mucTieuIndexRef.current = mucTieuIndex;
  }, [mucTieuIndex]);

  const stateRef = useRef<{
    players: PlayerActor[];
    winnerPlayerIdx: number;
    worldWidth: number;
    passes: PassStep[];
    currentPassIdx: number;
    passU: number; // 0..1 tiến độ cú chuyền hiện tại
    comboCount: number;
    shuttleX: number;
    shuttleY: number;
    shuttleRot: number;
    shuttleTrail: { x: number; y: number }[];
    camX: number;
    camZoom: number;
    inSlowMo: boolean;
    droppedAtMs: number;
    daKetThuc: boolean;
    particles: HatBui[];
    lastHudMs: number;
    animId: number;
  }>({
    players: [],
    winnerPlayerIdx: 0,
    worldWidth: 1600,
    passes: [],
    currentPassIdx: 0,
    passU: 0,
    comboCount: 0,
    shuttleX: 800,
    shuttleY: 320,
    shuttleRot: 0,
    shuttleTrail: [],
    camX: 250,
    camZoom: 1,
    inSlowMo: false,
    droppedAtMs: 0,
    daKetThuc: false,
    particles: [],
    lastHudMs: 0,
    animId: 0
  });

  const khoiTaoSanTheDuc = useCallback((forGameStart: boolean) => {
    const st = stateRef.current;
    const n = danhSach.length;
    if (n === 0) {
      st.players = [];
      st.passes = [];
      setHudText('🏸 Hãy thêm học sinh để bắt đầu Đá Cầu Ra Chơi!');
      return;
    }

    const rawTarget =
      mucTieuIndexRef.current !== null && mucTieuIndexRef.current >= 0 && mucTieuIndexRef.current < n
        ? mucTieuIndexRef.current
        : randomInt(n);

    // Chọn danh sách cầu thủ hiển thị (<= 72: giữ 100% lớp; > 72: Winner + 71 bạn ngẫu nhiên giữ 60fps)
    let pickedIndices: number[];
    if (n <= MAX_VISIBLE_PLAYERS) {
      pickedIndices = xaoTronCrypto(Array.from({ length: n }, (_, i) => i));
    } else {
      const others = xaoTronCrypto(
        Array.from({ length: n }, (_, i) => i).filter(i => i !== rawTarget)
      ).slice(0, MAX_VISIBLE_PLAYERS - 1);
      pickedIndices = xaoTronCrypto([rawTarget, ...others]);
    }

    const pCount = pickedIndices.length;
    const worldWidth = Math.max(1380, Math.min(3400, 1200 + pCount * 32));
    st.worldWidth = worldWidth;

    // Xếp thành các cụm/vòng đá cầu thoáng đẹp dọc sân thể dục
    const players: PlayerActor[] = pickedIndices.map((origIdx, slot) => {
      const hs = danhSach[origIdx];
      const frac = pCount === 1 ? 0.5 : (slot + 0.5) / pCount;
      const px = 140 + frac * (worldWidth - 280) + randomRange(-24, 24);
      const rowWave = Math.sin(slot * 1.45) * 78;
      const py = Math.max(COURT_TOP_Y + 34, Math.min(COURT_BOT_Y - 26, 396 + rowWave));
      return {
        hs,
        origIndex: origIdx,
        isGirl: doanGioiTinhNu(hs.ten, origIdx),
        hairColor: BANG_TOC_CHIBI[origIdx % BANG_TOC_CHIBI.length],
        ribbonColor: BANG_NO_CHIBI[origIdx % BANG_NO_CHIBI.length],
        x: px,
        y: py,
        facing: 1,
        kickTimer: 0,
        speech: '',
        speechUntilMs: 0,
        missed: false
      };
    });

    const winnerPlayerIdx = Math.max(0, players.findIndex(p => p.origIndex === rawTarget));
    st.players = players;
    st.winnerPlayerIdx = winnerPlayerIdx;
    st.particles = [];
    st.shuttleTrail = [];
    st.droppedAtMs = 0;
    st.daKetThuc = false;
    st.inSlowMo = false;
    st.camZoom = 1;
    st.comboCount = 0;
    st.lastHudMs = 0;

    if (!forGameStart) {
      st.passes = [];
      const centerP = players[Math.floor(pCount / 2)];
      st.shuttleX = centerP.x;
      st.shuttleY = centerP.y - 80;
      st.camX = Math.max(0, Math.min(worldWidth - CANVAS_W, centerP.x - CANVAS_W / 2));
      setHudText(`🏸 Sân thể dục chiều nắng sẵn sàng • ${n} HS chờ đá cầu!`);
      return;
    }

    // Tự động sinh chuỗi 7–13 cú chuyền cầu (xen kẽ 2–3 cú chuyền CAO DÀI XUYÊN SÂN + 1–2 pha Slow-Mo cứu cầu) -> tổng 13–28s!
    const passCount = 7 + randomInt(7); // 7..13 cú chuyền!
    const passes: PassStep[] = [];
    const slowMoIndex1 = Math.max(2, Math.floor(passCount * 0.45));
    const slowMoIndex2 = passCount >= 10 ? Math.max(slowMoIndex1 + 2, passCount - 3) : -1;

    // Chọn ngẫu nhiên 2–3 lượt tung cú đá CHUYỀN CAO DÀI XUYÊN SÂN!
    const longLobIndices = new Set<number>();
    if (pCount >= 4) {
      longLobIndices.add(1 + randomInt(2)); // 1 cú cao dài sớm (lượt 1 hoặc 2)
      longLobIndices.add(Math.max(3, Math.floor(passCount * 0.65))); // 1 cú cao dài giữa-cuối
      if (passCount >= 9) {
        longLobIndices.add(passCount - 2); // 1 cú chuyền dài ngay trước cú chốt!
      }
    }

    let currentIdx = randomInt(pCount);
    // Nếu có >= 2 người, chọn người phát mở màn khác Winner cho tự nhiên
    if (pCount >= 2 && currentIdx === winnerPlayerIdx) {
      currentIdx = (winnerPlayerIdx + 1) % pCount;
    }

    for (let i = 0; i < passCount; i++) {
      const isFinal = i === passCount - 1;
      const isLongLob = !isFinal && longLobIndices.has(i) && pCount >= 4;
      let nextIdx: number;

      if (pCount === 1) {
        nextIdx = 0;
      } else if (isFinal) {
        nextIdx = winnerPlayerIdx;
      } else {
        const candidates = players
          .map((p, idx) => ({ idx, dist: Math.abs(p.x - players[currentIdx].x) }))
          .filter(c => {
            if (c.idx === currentIdx) return false;
            if (i === passCount - 2 && c.idx === winnerPlayerIdx && pCount >= 3) return false;
            return true;
          });

        if (isLongLob) {
          // Ưu tiên chọn người ở RẤT XA bên kia sân (>= 620px, hoặc top 30% xa nhất!) để tung cú chuyền cao dài cực đã mắt!
          const sortedFar = [...candidates].sort((a, b) => b.dist - a.dist);
          const farPool = sortedFar.filter(c => c.dist >= 620);
          const pool = farPool.length > 0 ? farPool.slice(0, Math.max(3, Math.ceil(farPool.length * 0.6))) : sortedFar.slice(0, Math.max(2, Math.ceil(sortedFar.length * 0.35)));
          nextIdx = pool[randomInt(pool.length)].idx;
        } else {
          const midRange = candidates.filter(c => c.dist >= 160 && c.dist <= 580);
          const pool = midRange.length > 0 ? midRange : candidates;
          nextIdx = pool[randomInt(pool.length)].idx;
        }
      }

      const isLowSave = !isFinal && !isLongLob && (i === slowMoIndex1 || i === slowMoIndex2);
      const distActual = Math.abs(players[nextIdx].x - players[currentIdx].x);
      passes.push({
        fromIdx: currentIdx,
        toIdx: nextIdx,
        arcHeight: isLongLob
          ? randomRange(295, 338)
          : isFinal
          ? 235
          : isLowSave
          ? 205
          : randomRange(155, 215),
        durationSec: isLongLob
          ? Math.min(2.45, Math.max(1.9, 1.45 + distActual / 1150))
          : isFinal
          ? 1.75
          : isLowSave
          ? 1.65
          : randomRange(1.3, 1.6),
        isLongLob,
        isLowSave,
        isSpinFinal: isFinal
      });

      currentIdx = nextIdx;
    }

    st.passes = passes;
    st.currentPassIdx = 0;
    st.passU = 0;
    const starter = players[passes[0].fromIdx];
    starter.kickTimer = 1;
    starter.speech = '🏸 Phát cầu nè!!';
    starter.speechUntilMs = performance.now() + 1100;
    st.shuttleX = starter.x;
    st.shuttleY = starter.y + 8;
    st.camX = Math.max(0, Math.min(worldWidth - CANVAS_W, starter.x - CANVAS_W / 2));
    amThanh.phatTiengDaCau(false);
    setHudText(`🏸 BẮT ĐẦU ĐÁ CẦU! Chuỗi tâng cầu của ${n} HS khởi động!`);
  }, [danhSach]);

  useEffect(() => {
    if (!dangChoi) {
      khoiTaoSanTheDuc(false);
    }
  }, [danhSach, dangChoi, khoiTaoSanTheDuc]);

  const prevDangChoiRef = useRef<boolean>(false);
  useEffect(() => {
    if (dangChoi && !prevDangChoiRef.current) {
      khoiTaoSanTheDuc(true);
    } else if (!dangChoi && prevDangChoiRef.current) {
      stateRef.current.daKetThuc = false;
    }
    prevDangChoiRef.current = dangChoi;
  }, [dangChoi, khoiTaoSanTheDuc]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    let lastTime = performance.now();

    const spawnDustAndStars = (cx: number, cy: number, isDrop: boolean) => {
      const cols = isDrop
        ? ['#ffffff', '#fef08a', '#ef4444', '#22c55e', '#38bdf8']
        : ['#fef08a', '#38bdf8', '#f472b6', '#ffffff'];
      const count = isDrop ? 38 : 14;
      for (let i = 0; i < count; i++) {
        const ang = randomRange(-Math.PI, 0);
        const spd = randomRange(isDrop ? 75 : 45, isDrop ? 250 : 140);
        stateRef.current.particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - (isDrop ? 85 : 30),
          r: randomRange(2.5, isDrop ? 6 : 4),
          alpha: 1,
          color: cols[i % cols.length]
        });
      }
    };

    const drawAfternoonSportsCourt = (worldW: number, camX: number, t: number) => {
      // 1. Bầu trời chiều nắng vàng cam 16:00 rực rỡ!
      const sky = ctx.createLinearGradient(0, 0, 0, 235);
      sky.addColorStop(0, '#f97316');
      sky.addColorStop(0.48, '#fb923c');
      sky.addColorStop(1, '#fef08a');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, CANVAS_W, 240);

      // Mặt trời hoàng hôn rực ấm góc phải trên
      const sunX = CANVAS_W - 145 - camX * 0.03;
      const sunY = 82;
      const sunGlow = ctx.createRadialGradient(sunX, sunY, 16, sunX, sunY, 96);
      sunGlow.addColorStop(0, 'rgba(255, 251, 235, 0.96)');
      sunGlow.addColorStop(0.45, 'rgba(253, 224, 71, 0.45)');
      sunGlow.addColorStop(1, 'rgba(251, 146, 60, 0)');
      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 96, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fffbeb';
      ctx.beginPath();
      ctx.arc(sunX, sunY, 30, 0, Math.PI * 2);
      ctx.fill();

      // Mây vàng cam chiều muộn
      ctx.fillStyle = 'rgba(255, 247, 237, 0.78)';
      for (let i = 0; i < 6; i++) {
        const cx = ((i * 280 + t * 10 - camX * 0.14) % (CANVAS_W + 260) + (CANVAS_W + 260)) % (CANVAS_W + 260) - 130;
        const cy = 54 + (i % 3) * 24;
        ctx.beginPath();
        ctx.arc(cx, cy, 20, 0, Math.PI * 2);
        ctx.arc(cx + 24, cy - 6, 25, 0, Math.PI * 2);
        ctx.arc(cx + 48, cy, 18, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.save();
      ctx.translate(-camX, 0);

      // 2. Hàng rào lưới sân thể dục & băng ghế khán đài phía sau
      ctx.fillStyle = '#047857';
      ctx.fillRect(0, 212, worldW, 48);

      // Lưới mắt cáo hàng rào thể dục
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1.2;
      for (let fx = Math.floor(camX / 24) * 24; fx < camX + CANVAS_W + 30; fx += 24) {
        ctx.beginPath();
        ctx.moveTo(fx, 152);
        ctx.lineTo(fx, 246);
        ctx.stroke();
      }
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 152);
      ctx.lineTo(worldW, 152);
      ctx.stroke();

      // Băng ghế gỗ thể dục dọc rào
      for (let bx = 180; bx < worldW - 100; bx += 420) {
        if (bx < camX - 150 || bx > camX + CANVAS_W + 150) continue;
        ctx.fillStyle = '#b45309';
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 2;
        ctx.fillRect(bx - 55, 232, 110, 14);
        ctx.strokeRect(bx - 55, 232, 110, 14);
        ctx.fillRect(bx - 44, 246, 8, 12);
        ctx.fillRect(bx + 36, 246, 8, 12);
      }

      // 3. Mặt sân thể dục màu xanh ngọc mint cực sáng + vạch kẻ trắng chuẩn!
      const courtGrad = ctx.createLinearGradient(0, 256, 0, CANVAS_H);
      courtGrad.addColorStop(0, '#10b981');
      courtGrad.addColorStop(0.55, '#34d399');
      courtGrad.addColorStop(1, '#059669');
      ctx.fillStyle = courtGrad;
      ctx.fillRect(0, 256, worldW, CANVAS_H - 256);

      // Viền đường biên sân đá cầu màu trắng sắc nét
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 4;
      ctx.strokeRect(52, 274, worldW - 104, 260);
      // Đường giữa sân & vòng tròn trung tâm
      ctx.beginPath();
      ctx.moveTo(52, 404);
      ctx.lineTo(worldW - 52, 404);
      ctx.stroke();

      for (let cx = 420; cx < worldW - 220; cx += 620) {
        if (cx < camX - 200 || cx > camX + CANVAS_W + 200) continue;
        ctx.beginPath();
        ctx.ellipse(cx, 404, 92, 42, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    };

    const drawShuttlecock = (x: number, y: number, rot: number, isSpinning: boolean, isSlowMo: boolean, isDropped: boolean, t: number) => {
      ctx.save();
      ctx.translate(x, y);

      // Vòng sáng hiệu ứng cú cầu xoáy hoặc Slow-Mo
      if (isSpinning && !isDropped) {
        ctx.strokeStyle = 'rgba(192, 132, 252, 0.85)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, -6, 22 + Math.sin(t * 24) * 3, 0, Math.PI * 2);
        ctx.stroke();
      } else if (isSlowMo) {
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.9)';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(0, -6, 26, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.rotate(rot);

      // 3 cánh cầu lông Việt Nam đỏ - vàng - xanh lá kinh điển!
      const feathers = [
        { color: '#ef4444', dx: -9, ang: -0.32 },
        { color: '#facc15', dx: 0, ang: 0 },
        { color: '#22c55e', dx: 9, ang: 0.32 }
      ];
      feathers.forEach(f => {
        ctx.save();
        ctx.translate(f.dx, -16);
        ctx.rotate(f.ang);
        ctx.fillStyle = f.color;
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.ellipse(0, 0, 6.2, 15.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });

      // Ống giữ lông cầu trắng
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.6;
      ctx.fillRect(-3.5, -5, 7, 7);
      ctx.strokeRect(-3.5, -5, 7, 7);

      // Đế cầu cao su tròn đen có khoen đỏ
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(0, 4, 12, 5.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.ellipse(0, 2.2, 8.5, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    const render = (now: number) => {
      if (!running) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      const t = now / 1000;
      const st = stateRef.current;

      // Giảm hoạt ảnh đá chân của tất cả người chơi
      st.players.forEach(p => {
        if (p.kickTimer > 0) p.kickTimer = Math.max(0, p.kickTimer - dt * 3.4);
      });

      let activeStep: PassStep | null = null;
      const isDropped = st.droppedAtMs > 0;

      if (dangChoi && st.players.length > 0 && st.passes.length > 0) {
        activeStep = st.passes[Math.min(st.currentPassIdx, st.passes.length - 1)];
        const fromP = st.players[activeStep.fromIdx];
        const toP = st.players[activeStep.toIdx];

        if (!isDropped) {
          // Kiểm tra pha CỨU CẦU QUAY CHẬM (Slow-Motion) sát đất!
          const inSlowMoWindow = activeStep.isLowSave && st.passU >= 0.74 && st.passU <= 0.96;
          st.inSlowMo = inSlowMoWindow;
          const timeScale = inSlowMoWindow ? 0.34 : 1;

          st.passU += (dt * timeScale) / activeStep.durationSec;

          // Hướng mặt 2 cầu thủ về phía nhau
          fromP.facing = toP.x >= fromP.x ? 1 : -1;
          toP.facing = fromP.x >= toP.x ? 1 : -1;

          if (st.passU >= 1) {
            if (activeStep.isSpinFinal) {
              // CÚ CẦU XOÁY CHỐT HẠ -> WINNER ĐÁ HỤT CẦU RƠI CHẠM ĐẤT!
              st.droppedAtMs = now;
              st.inSlowMo = false;
              toP.kickTimer = 1;
              toP.missed = true;
              toP.speech = '😱 Ối cầu xoáy quá trượt rồi!';
              toP.speechUntilMs = now + 4500;
              st.shuttleX = toP.x + (toP.facing === 1 ? 28 : -28);
              st.shuttleY = toP.y + 24;
              st.shuttleRot = 1.25;
              amThanh.phatTiengCauRoi();
              spawnDustAndStars(st.shuttleX, st.shuttleY, true);
              setHudText(`🏸 TRƯỢT CÚ CẦU XOÁY RỒI! Mời ${toP.hs.ten} lên bảng trả bài!`);
            } else {
              // ĐỠ CẦU THÀNH CÔNG -> CHUYỂN SANG CÚ TIẾP THEO!
              st.comboCount += 1;
              toP.kickTimer = 1;
              if (activeStep.isLowSave) {
                toP.speech = CAU_CUU_CAU[randomInt(CAU_CUU_CAU.length)];
                toP.speechUntilMs = now + 1350;
                spawnDustAndStars(toP.x, toP.y + 18, false);
              } else if (randomInt(3) === 0) {
                toP.speech = CAU_CHUYEN_CAU[randomInt(CAU_CHUYEN_CAU.length)];
                toP.speechUntilMs = now + 1000;
              }

              st.currentPassIdx += 1;
              st.passU = 0;
              const nextStep = st.passes[st.currentPassIdx];
              if (nextStep) {
                if (nextStep.isLongLob) {
                  toP.speech = CAU_CHUYEN_DAI[randomInt(CAU_CHUYEN_DAI.length)];
                  toP.speechUntilMs = now + 1500;
                  spawnDustAndStars(toP.x, toP.y + 14, false);
                }
                amThanh.phatTiengDaCau(nextStep.isSpinFinal || nextStep.isLongLob);
              }
            }
          } else {
            // Tính tọa độ quả cầu lông bay hình parabol
            const u = st.passU;
            const targetEndX = activeStep.isSpinFinal
              ? toP.x + (toP.facing === 1 ? 28 : -28)
              : toP.x;
            const targetEndY = activeStep.isSpinFinal ? toP.y + 22 : toP.y + 6;
            const startX = fromP.x;
            const startY = fromP.y + 6;

            // Cú cầu xoáy có độ lắc lượn chữ S nhẹ trong không trung
            const spinDrift = activeStep.isSpinFinal ? Math.sin(u * Math.PI * 5) * 18 * (1 - u * 0.4) : 0;
            // Pha cứu cầu sát đất rơi thấp xuống sát mặt đất trước khi được móc ngược lên!
            const lowDip = activeStep.isLowSave && u > 0.72 ? Math.sin(((u - 0.72) / 0.28) * Math.PI) * 18 : 0;

            st.shuttleX = startX + (targetEndX - startX) * u + spinDrift;
            st.shuttleY = startY + (targetEndY - startY) * u - Math.sin(u * Math.PI) * activeStep.arcHeight + lowDip;
            st.shuttleRot = activeStep.isSpinFinal
              ? u * Math.PI * 10
              : Math.sin(u * Math.PI * 2) * 0.5;

            st.shuttleTrail.push({ x: st.shuttleX, y: st.shuttleY });
            const maxTrailLen = activeStep.isLongLob ? 34 : 22;
            while (st.shuttleTrail.length > maxTrailLen) st.shuttleTrail.shift();

            // Hạt sao lấp lánh nhẹ dọc đường cầu bổng cao dài xuyên sân!
            if (activeStep.isLongLob && randomInt(3) === 0) {
              st.particles.push({
                x: st.shuttleX + randomRange(-6, 6),
                y: st.shuttleY + randomRange(-6, 6),
                vx: randomRange(-18, 18),
                vy: randomRange(-10, 22),
                r: randomRange(2, 4.2),
                alpha: 0.9,
                color: '#fef08a'
              });
            }

            if (now - st.lastHudMs > 220) {
              st.lastHudMs = now;
              if (inSlowMoWindow) {
                setHudText(`⏱️ QUAY CHẬM! ${toP.hs.ten} lao ra cứu cầu sát mặt đất!!`);
              } else if (activeStep.isSpinFinal) {
                setHudText(`🌪️ CÚ CẦU XOÁY SIÊU KHÓ đang bay về phía ${toP.hs.ten}...`);
              } else if (activeStep.isLongLob) {
                setHudText(`🚀 CÚ CHUYỀN CAO DÀI XUYÊN SÂN! ${fromP.hs.ten} ➔ ${toP.hs.ten}`);
              } else {
                setHudText(`🏸 Chuỗi ${st.comboCount + 1} cú tâng cầu • ${fromP.hs.ten} ➔ ${toP.hs.ten}`);
              }
            }
          }
        } else {
          // Đã rơi cầu -> Zoom nhẹ vào Winner & chốt!
          st.camZoom += (1.16 - st.camZoom) * Math.min(1, dt * 4.5);
          if (now - st.droppedAtMs >= 1900 && !st.daKetThuc) {
            st.daKetThuc = true;
            amThanh.phatTiengChucMung();
            onHoanThanhRef.current(toP.hs);
          }
        }
      } else if (st.players.length > 0) {
        // Trạng thái chờ: quả cầu tâng nhịp nhàng giữa sân
        const midX = st.worldWidth / 2;
        st.shuttleX = midX + Math.sin(t * 1.4) * 190;
        st.shuttleY = 345 - Math.abs(Math.sin(t * 2.8)) * 145;
        st.shuttleRot = Math.sin(t * 5) * 0.35;
        st.camZoom += (1 - st.camZoom) * Math.min(1, dt * 5);
      }

      // Camera lướt mượt bám theo quả cầu lông!
      const targetCam = Math.max(0, Math.min(st.worldWidth - CANVAS_W, st.shuttleX - CANVAS_W * 0.5));
      st.camX += (targetCam - st.camX) * Math.min(1, dt * 5.2);

      // Cập nhật bụi phấn & pháo sao
      st.particles.forEach(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 310 * dt;
        p.alpha -= dt * 0.68;
      });
      st.particles = st.particles.filter(p => p.alpha > 0);

      // === VẼ KHUNG HÌNH ===
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      ctx.save();
      if (st.camZoom > 1.001) {
        const pivotX = st.shuttleX - st.camX;
        const pivotY = st.shuttleY - 30;
        ctx.translate(pivotX, pivotY);
        ctx.scale(st.camZoom, st.camZoom);
        ctx.translate(-pivotX, -pivotY);
      }

      drawAfternoonSportsCourt(st.worldWidth, st.camX, t);

      // Vòng mục tiêu sáng dưới chân người sắp đón cầu
      if (dangChoi && activeStep && !isDropped) {
        const receiver = st.players[activeStep.toIdx];
        if (receiver) {
          const rx = receiver.x - st.camX;
          const ry = receiver.y + 28;
          ctx.save();
          ctx.strokeStyle = activeStep.isSpinFinal ? '#a855f7' : '#fef08a';
          ctx.fillStyle = activeStep.isSpinFinal
            ? 'rgba(168, 85, 247, 0.24)'
            : 'rgba(254, 240, 138, 0.28)';
          ctx.lineWidth = 3;
          const rad = 24 + Math.sin(t * 10) * 4;
          ctx.beginPath();
          ctx.ellipse(rx, ry, rad, rad * 0.36, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      }

      // Vẽ bóng đổ của quả cầu lông xuống mặt sân
      const groundYForShadow = isDropped ? st.shuttleY + 4 : 422;
      const heightRatio = Math.max(0.35, 1 - Math.max(0, groundYForShadow - st.shuttleY) / 320);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.24)';
      ctx.beginPath();
      ctx.ellipse(st.shuttleX - st.camX, groundYForShadow, 14 * heightRatio, 4.5 * heightRatio, 0, 0, Math.PI * 2);
      ctx.fill();

      // Vẽ học sinh theo thứ tự chiều sâu Y (culling ngoài khung nhìn)
      const visiblePlayers = st.players
        .map((p, idx) => ({ p, idx, sx: p.x - st.camX }))
        .filter(item => item.sx >= -90 && item.sx <= CANVAS_W + 90)
        .sort((a, b) => a.p.y - b.p.y);

      visiblePlayers.forEach(({ p, idx }) => {
        const isReceiver = dangChoi && activeStep !== null && idx === activeStep.toIdx && !isDropped;
        const expr = p.missed
          ? 'shocked'
          : isDropped
          ? 'cheer'
          : isReceiver
          ? 'focus'
          : 'normal';

        veHocSinhChibi(
          ctx,
          p.x - st.camX,
          p.y,
          p.missed ? 1.13 : isReceiver ? 1.04 : 0.96,
          {
            isGirl: p.isGirl,
            hairColor: p.hairColor,
            ribbonColor: p.ribbonColor,
            facing: p.facing,
            expression: expr,
            kickPhase: p.kickTimer,
            highlight: p.missed || isReceiver
          },
          t + idx * 0.25
        );
      });

      // Vệt quỹ đạo cầu vồng rực rỡ của quả cầu lông!
      if (st.shuttleTrail.length > 2 && !isDropped) {
        const rainbow = ['#ef4444', '#facc15', '#22c55e', '#38bdf8', '#c084fc'];
        for (let i = 1; i < st.shuttleTrail.length; i++) {
          const prev = st.shuttleTrail[i - 1];
          const curr = st.shuttleTrail[i];
          ctx.save();
          ctx.strokeStyle = activeStep?.isSpinFinal
            ? '#c084fc'
            : rainbow[i % rainbow.length];
          ctx.globalAlpha = (i / st.shuttleTrail.length) * 0.72;
          ctx.lineWidth = (i / st.shuttleTrail.length) * 6;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(prev.x - st.camX, prev.y);
          ctx.lineTo(curr.x - st.camX, curr.y);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Vẽ Quả Cầu Lông Việt Nam 3 màu (phóng nhẹ 1.24x khi bay cao lên tận mây ở cú chuyền cao dài!)
      ctx.save();
      const lobScale =
        activeStep?.isLongLob && !isDropped ? 1 + Math.sin(st.passU * Math.PI) * 0.26 : 1;
      const sxDraw = st.shuttleX - st.camX;
      const syDraw = st.shuttleY;
      ctx.translate(sxDraw, syDraw);
      ctx.scale(lobScale, lobScale);
      drawShuttlecock(
        0,
        0,
        st.shuttleRot,
        Boolean(activeStep?.isSpinFinal),
        st.inSlowMo,
        isDropped,
        t
      );
      ctx.restore();

      // Spotlight bảng tên cho tối đa 6 bạn gần quả cầu nhất (luôn ưu tiên người phát, người đón & người trượt!)
      const focusIdxSet = new Set<number>();
      if (activeStep) {
        focusIdxSet.add(activeStep.fromIdx);
        focusIdxSet.add(activeStep.toIdx);
      }
      const labelCandidates = visiblePlayers
        .filter(item => item.sx >= 50 && item.sx <= CANVAS_W - 50)
        .map(item => ({
          ...item,
          priority: item.p.missed ? 3 : focusIdxSet.has(item.idx) ? 2 : 1,
          dist: Math.abs(item.p.x - st.shuttleX)
        }))
        .sort((a, b) => b.priority - a.priority || a.dist - b.dist)
        .slice(0, isDropped ? 1 : 6);

      const usedLabels: { x: number; y: number }[] = [];
      // Vẽ theo thứ tự ngược để nhãn ưu tiên (receiver/winner) luôn nằm trên cùng sắc nét!
      const positionedLabels = labelCandidates.map(item => {
        const lx = item.sx;
        let ly = item.p.y - (item.p.missed ? 68 : 58);
        let guard = 0;
        while (
          guard < 8 &&
          usedLabels.some(u => Math.abs(u.x - lx) < 150 && Math.abs(u.y - ly) < 30)
        ) {
          ly -= 30;
          guard++;
        }
        ly = Math.max(76, ly);
        usedLabels.push({ x: lx, y: ly });
        return { item, lx, ly };
      });

      [...positionedLabels].reverse().forEach(({ item, lx, ly }) => {
        veBangTenHocSinh(ctx, lx, ly, item.p.hs.ten, {
          highlight: item.p.missed || (dangChoi && activeStep?.toIdx === item.idx),
          prefix: item.p.missed ? '🌟 ' : ''
        });

        if (item.p.speech && now < item.p.speechUntilMs) {
          veBongBongThoai(ctx, lx, ly - 18, item.p.speech, {
            bg: item.p.missed ? '#fee2e2' : '#fef08a',
            border: item.p.missed ? '#dc2626' : '#ca8a04',
            color: item.p.missed ? '#991b1b' : '#713f12'
          });
        }
      });

      // Hạt bụi phấn & sao chúc mừng
      st.particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x - st.camX, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Hiệu ứng viền vàng điện ảnh khi Slow-Motion Cứu Cầu!
      if (st.inSlowMo) {
        ctx.save();
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.72)';
        ctx.lineWidth = 10;
        ctx.strokeRect(5, 5, CANVAS_W - 10, CANVAS_H - 10);
        ctx.restore();
      }

      ctx.restore();

      // Mini-Radar sân thể dục khi lớp >= 15 HS
      if (danhSach.length >= 15) {
        const dots = st.players.map(p => ({
          xNorm: p.x / st.worldWidth,
          yNorm: (p.y - COURT_TOP_Y) / (COURT_BOT_Y - COURT_TOP_Y),
          color: p.missed ? '#facc15' : '#4ade80',
          r: p.missed ? 3.8 : 2.1
        }));
        dots.push({
          xNorm: st.shuttleX / st.worldWidth,
          yNorm: 0.5,
          color: '#ef4444',
          r: 4.3
        });
        veMiniRadar(
          ctx,
          CANVAS_W - 220,
          CANVAS_H - 76,
          204,
          62,
          `RADAR SÂN THỂ DỤC (${danhSach.length} HS)`,
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
          border: '2px solid #10b981',
          background: '#fb923c'
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
              : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#ffffff',
            border: dangChoi ? 'none' : '2px solid #a7f3d0',
            padding: '11px 38px',
            borderRadius: '30px',
            fontSize: '1.04rem',
            fontWeight: 900,
            cursor: dangChoi || danhSach.length === 0 ? 'not-allowed' : 'pointer',
            boxShadow: dangChoi ? 'none' : '0 6px 22px rgba(16, 185, 129, 0.42)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>{dangChoi ? '🏸 Quả cầu lông đang bay khắp sân...' : '🏸 BẮT ĐẦU ĐÁ CẦU RA CHƠI'}</span>
        </button>
      </div>
    </div>
  );
};
