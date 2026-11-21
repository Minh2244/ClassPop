// Trò chơi thứ 12: Dòng Điện Xuyên Hầm Chia Nhánh (Camera bám mượt theo quả cầu tia sét chạy xuyên từng đường hầm kính & cửa hầm chia đôi tới Hầm Chung Kết chứa các buồng học sinh chibi, cân 100–1000+ HS!)
import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { HocSinh } from '../dich-vu/quan-ly-danh-sach';
import { amThanh } from '../dich-vu/am-thanh';

interface DongDienChiaNhanhProps {
  danhSach: HocSinh[];
  dangChoi: boolean;
  mucTieuIndex: number | null;
  onBatDauChoi: () => void;
  onHoanThanh: (nguoiThang?: HocSinh) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

interface ThiSinhBuong {
  hs: HocSinh;
  isGirl: boolean;
  hair: string;
  ribbon: string;
  bag: string;
}

interface ChangHam {
  index: number;
  junctionX: number;     // Tọa độ X của ngã ba chia hầm
  gateX: number;         // Tọa độ X của 2 cửa hầm (Trên / Dưới)
  exitX: number;         // Tọa độ X cuối đường hầm nối sang hầm sau
  chosenBranch: 0 | 1;   // 0 = Hầm Trên (A), 1 = Hầm Dưới (B)
  topCount: number;
  bottomCount: number;
  topPreview: string;    // Tên mẫu hiển thị trên bảng LED cửa hầm trên
  bottomPreview: string; // Tên mẫu hiển thị trên bảng LED cửa hầm dưới
  aliveAfter: number;
  decided: boolean;
  passed: boolean;
}

interface TiaLua {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
  color: string;
}

const BANG_TOC = ['#2c1810', '#1e1b4b', '#451a03', '#27272a', '#3f2314', '#18181b'];
const BANG_NO = ['#f472b6', '#38bdf8', '#facc15', '#34d399', '#fb7185', '#c084fc'];
const BANG_BALO = ['#ec4899', '#3b82f6', '#f59e0b', '#10b981', '#a855f7', '#0ea5e9'];

const LANE_MID_Y = 292;
const LANE_TOP_Y = 174;
const LANE_BOT_Y = 410;
const CHAMBER_SPACING = 940;

function randomInt(max: number): number {
  if (max <= 1) return 0;
  if (window.crypto && window.crypto.getRandomValues) {
    const buf = new Uint32Array(1);
    window.crypto.getRandomValues(buf);
    return buf[0] % max;
  }
  return Math.floor(Math.random() * max);
}

function xaoTronCrypto<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function doanGioiTinhNu(ten: string, idx: number): boolean {
  const lower = ten.toLowerCase();
  const tuKhoaNu = ['thị', 'ngọc', 'linh', 'anh', 'vy', 'lan', 'thảo', 'hân', 'trâm', 'my', 'nhi', 'châu', 'thư', 'ý', 'hà', 'mai', 'hương', 'trang', 'nhung', 'yến'];
  const tuKhoaNam = ['văn', 'minh', 'đức', 'quân', 'huy', 'nam', 'tuấn', 'kiệt', 'bách', 'trọng', 'khôi', 'đăng', 'bảo', 'toàn', 'hoàng', 'long', 'phúc', 'dũng'];
  for (const k of tuKhoaNu) if (lower.includes(k)) return true;
  for (const k of tuKhoaNam) if (lower.includes(k)) return false;
  return idx % 2 === 1;
}

function taoTenMauLed(pool: HocSinh[]): string {
  if (pool.length === 0) return '';
  if (pool.length === 1) return pool[0].ten;
  const first = pool[0].ten.length > 12 ? `${pool[0].ten.slice(0, 11)}…` : pool[0].ten;
  return `${first} +${pool.length - 1}`;
}

export const DongDienChiaNhanh: React.FC<DongDienChiaNhanhProps> = ({
  danhSach,
  dangChoi,
  onBatDauChoi,
  onHoanThanh,
  isFullscreen = false,
  onToggleFullscreen
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [aliveCount, setAliveCount] = useState<number>(danhSach.length);
  const [statusText, setStatusText] = useState<string>('⚡ Sẵn sàng phóng dòng điện xuyên hầm!');

  const onHoanThanhRef = useRef(onHoanThanh);
  useEffect(() => {
    onHoanThanhRef.current = onHoanThanh;
  }, [onHoanThanh]);

  const stateRef = useRef<{
    chambers: ChangHam[];
    finalHallX: number;
    worldWidth: number;
    finalists: ThiSinhBuong[];
    crowdPreview: ThiSinhBuong[];
    winnerPodIdx: number;
    boltX: number;
    boltY: number;
    boltTrail: { x: number; y: number }[];
    camX: number;
    phase: 'idle' | 'traveling' | 'roulette' | 'winner';
    curChamberIdx: number;
    subPhase: 'to_junction' | 'deciding' | 'through_tunnel';
    subPhaseStartMs: number;
    rouletteStartMs: number;
    rouletteEndMs: number;
    roulettePodIdx: number;
    lastRouletteStepMs: number;
    winHoldFrames: number;
    sparks: TiaLua[];
    animationFrameId: number;
  }>({
    chambers: [],
    finalHallX: 1600,
    worldWidth: 2200,
    finalists: [],
    crowdPreview: [],
    winnerPodIdx: 0,
    boltX: 185,
    boltY: LANE_MID_Y,
    boltTrail: [],
    camX: 0,
    phase: 'idle',
    curChamberIdx: 0,
    subPhase: 'to_junction',
    subPhaseStartMs: 0,
    rouletteStartMs: 0,
    rouletteEndMs: 0,
    roulettePodIdx: 0,
    lastRouletteStepMs: 0,
    winHoldFrames: 0,
    sparks: [],
    animationFrameId: 0
  });

  // Khởi tạo hệ thống Đường Hầm Chia Nhánh (cân mượt 1 -> 1000+ HS, random 100% bằng crypto!)
  const khoiTaoHanhTrinhHam = useCallback(() => {
    const total = danhSach.length;
    if (total === 0) {
      stateRef.current.chambers = [];
      stateRef.current.finalists = [];
      stateRef.current.crowdPreview = [];
      setAliveCount(0);
      setStatusText('Chưa có học sinh trong lớp');
      return;
    }

    const shuffledAll = xaoTronCrypto(danhSach);
    const numPods = Math.min(4, total);

    // Chia danh sách thật qua tối đa 4 hầm chia nhánh (cân mọi quy mô tới 1000+ HS mà tổng thời gian ~16–20 giây!)
    const chambers: ChangHam[] = [];
    let currentPool = [...shuffledAll];
    let curX = 480;
    const maxChambers = total <= numPods ? 0 : total <= 12 ? 2 : total <= 40 ? 3 : 4;

    for (let c = 0; c < maxChambers && currentPool.length > numPods; c++) {
      const remainingStages = maxChambers - c;
      // Nếu là chặng hầm cuối cùng trước Hầm Chung Kết -> cắt đúng về numPods
      const keepCount =
        remainingStages === 1
          ? numPods
          : Math.max(numPods, Math.min(currentPool.length - 1, Math.ceil(currentPool.length / 2)));

      const survivors = currentPool.slice(0, keepCount);
      const dropped = currentPool.slice(keepCount);
      const chosenBranch: 0 | 1 = randomInt(2) === 0 ? 0 : 1;

      const topGroup = chosenBranch === 0 ? survivors : dropped;
      const botGroup = chosenBranch === 1 ? survivors : dropped;

      chambers.push({
        index: c,
        junctionX: curX,
        gateX: curX + 260,
        exitX: curX + CHAMBER_SPACING - 120,
        chosenBranch,
        topCount: topGroup.length,
        bottomCount: botGroup.length,
        topPreview: taoTenMauLed(topGroup),
        bottomPreview: taoTenMauLed(botGroup),
        aliveAfter: survivors.length,
        decided: false,
        passed: false
      });

      currentPool = survivors;
      curX += CHAMBER_SPACING;
    }

    // Các bạn cuối cùng lọt vào Hầm Chung Kết (tất cả đều công bằng 1/N từ xaoTronCrypto!)
    const finalPool = xaoTronCrypto(currentPool.slice(0, numPods));
    const winnerPodIdx = randomInt(finalPool.length);

    const toChibi = (hs: HocSinh, idx: number): ThiSinhBuong => ({
      hs,
      isGirl: doanGioiTinhNu(hs.ten, idx),
      hair: BANG_TOC[idx % BANG_TOC.length],
      ribbon: BANG_NO[idx % BANG_NO.length],
      bag: BANG_BALO[idx % BANG_BALO.length]
    });

    const finalists = finalPool.map(toChibi);
    const crowdPreview = shuffledAll.slice(0, Math.min(5, total)).map(toChibi);

    const finalHallX = chambers.length > 0 ? curX + 260 : 880;
    const worldWidth = finalHallX + 740;

    const st = stateRef.current;
    st.chambers = chambers;
    st.finalHallX = finalHallX;
    st.worldWidth = worldWidth;
    st.finalists = finalists;
    st.crowdPreview = crowdPreview;
    st.winnerPodIdx = winnerPodIdx;
    st.boltX = 185;
    st.boltY = LANE_MID_Y;
    st.boltTrail = [];
    st.camX = 0;
    st.phase = 'idle';
    st.curChamberIdx = 0;
    st.subPhase = 'to_junction';
    st.subPhaseStartMs = performance.now();
    st.rouletteStartMs = 0;
    st.rouletteEndMs = 0;
    st.roulettePodIdx = randomInt(Math.max(1, finalists.length));
    st.lastRouletteStepMs = 0;
    st.winHoldFrames = 0;
    st.sparks = [];

    setAliveCount(total);
    setStatusText(
      chambers.length > 0
        ? `⚡ Trạm Phát Tổng (${total} HS) → ${chambers.length} Hầm Chia Nhánh → Hầm Chung Kết`
        : `⚡ Sẵn sàng phóng dòng điện vào ${finalists.length} buồng học sinh!`
    );
  }, [danhSach]);

  const prevDangChoiRef = useRef<boolean>(false);
  useEffect(() => {
    if (dangChoi && !prevDangChoiRef.current) {
      khoiTaoHanhTrinhHam();
      const st = stateRef.current;
      st.phase = 'traveling';
      st.curChamberIdx = 0;
      st.subPhase = 'to_junction';
      st.subPhaseStartMs = performance.now();
      amThanh.phatTiengTiaSet(false);
      setStatusText('⚡ Khởi động lõi Plasma! Đang lao vào đường hầm...');
    } else if (!dangChoi) {
      khoiTaoHanhTrinhHam();
    }
    prevDangChoiRef.current = dangChoi;
  }, [dangChoi, danhSach, khoiTaoHanhTrinhHam]);

  // VÒNG LẶP ĐỒ HỌA CAMERA BÁM THEO DÒNG ĐIỆN XUYÊN HẦM (60FPS)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const spawnSparks = (x: number, y: number, color: string, count: number) => {
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 1.8 + Math.random() * 4.6;
        stateRef.current.sparks.push({
          x,
          y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 0.8,
          r: 2 + Math.random() * 2.6,
          alpha: 1,
          color
        });
      }
    };

    // Vẽ đoạn đường hầm kính hiện đại sáng đẹp (có vòm đỡ kim loại, dải đèn LED mũi tên chạy bên trong!)
    const drawGlassTunnel = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      status: 'active' | 'idle' | 'off',
      timeSec: number
    ) => {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Khung vỏ hầm thép bạc bên ngoài
      ctx.strokeStyle = status === 'active' ? '#0284c7' : status === 'off' ? '#475569' : '#334155';
      ctx.lineWidth = 46;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Lòng đường hầm kính trong suốt
      ctx.strokeStyle = status === 'active' ? '#bae6fd' : status === 'off' ? '#1e293b' : '#64748b';
      ctx.lineWidth = 34;
      ctx.stroke();

      // Vệt sáng trên mặt kính vòm hầm
      ctx.strokeStyle = status === 'active' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x1, y1 - 10);
      ctx.lineTo(x2, y2 - 10);
      ctx.stroke();

      // Đường ray năng lượng chạy giữa lòng hầm
      if (status === 'active') {
        ctx.save();
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 14;
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 6;
        ctx.setLineDash([18, 14]);
        ctx.lineDashOffset = -timeSec * 120;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      } else if (status === 'idle') {
        ctx.strokeStyle = 'rgba(224, 242, 254, 0.55)';
        ctx.lineWidth = 3;
        ctx.setLineDash([12, 14]);
        ctx.lineDashOffset = -timeSec * 40;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Khung vòm giằng thép dọc theo thân đường hầm
      const dx = x2 - x1;
      const dy = y2 - y1;
      const dist = Math.hypot(dx, dy);
      const rings = Math.floor(dist / 95);
      for (let r = 1; r < rings; r++) {
        const t = r / rings;
        const rx = x1 + dx * t;
        const ry = y1 + dy * t;
        const ang = Math.atan2(dy, dx) + Math.PI / 2;
        ctx.strokeStyle = status === 'active' ? '#0369a1' : '#334155';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(rx - Math.cos(ang) * 23, ry - Math.sin(ang) * 23);
        ctx.lineTo(rx + Math.cos(ang) * 23, ry + Math.sin(ang) * 23);
        ctx.stroke();
      }

      ctx.restore();
    };

    // Vẽ Cửa Hầm có bảng LED sĩ số + tên học sinh mẫu + cửa thép đỏ OFF khi bị loại!
    const drawTunnelGate = (
      x: number,
      y: number,
      gateLabel: string,
      count: number,
      sampleText: string,
      gateState: 'idle' | 'flicker' | 'open' | 'closed',
      timeSec: number
    ) => {
      ctx.save();
      ctx.translate(x, y);

      const isFlickerOn = gateState === 'flicker' && Math.floor(timeSec * 16) % 2 === 0;
      const glowActive = gateState === 'open' || isFlickerOn;

      // Khung cổng hầm kiên cố
      ctx.fillStyle = gateState === 'closed' ? '#450a0a' : glowActive ? '#0369a1' : '#1e293b';
      ctx.strokeStyle = gateState === 'closed' ? '#ef4444' : glowActive ? '#fef08a' : '#7dd3fc';
      ctx.lineWidth = glowActive ? 3.5 : 2.2;
      ctx.beginPath();
      ctx.roundRect(-24, -46, 48, 92, 12);
      ctx.fill();
      ctx.stroke();

      // Cửa sập thép nếu nhánh bị loại (OFF)
      if (gateState === 'closed') {
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(-17, -34, 34, 68);
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 3;
        for (let sy = -24; sy <= 24; sy += 16) {
          ctx.beginPath();
          ctx.moveTo(-15, sy - 6);
          ctx.lineTo(15, sy + 6);
          ctx.stroke();
        }
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 11px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('OFF', 0, 0);
      } else {
        // Cánh cổng sáng mở cho dòng điện lao qua
        ctx.fillStyle = glowActive ? '#fde047' : '#38bdf8';
        ctx.font = '900 18px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(glowActive ? '⚡' : '»', 0, 0);
      }

      // Bảng LED thông tin phía trên / dưới cổng hầm
      const signY = y < LANE_MID_Y ? -76 : 56;
      const boxW = 190;
      const boxH = 44;
      ctx.fillStyle = gateState === 'closed' ? 'rgba(69, 10, 10, 0.9)' : 'rgba(255, 255, 255, 0.96)';
      ctx.strokeStyle = gateState === 'closed' ? '#ef4444' : glowActive ? '#f59e0b' : '#0f172a';
      ctx.lineWidth = glowActive ? 2.6 : 2;
      ctx.beginPath();
      ctx.roundRect(-boxW / 2, signY - boxH / 2, boxW, boxH, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = gateState === 'closed' ? '#fca5a5' : '#0f172a';
      ctx.font = '900 12.5px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        gateState === 'closed' ? `${gateLabel} • NGẮT ĐIỆN` : `${gateLabel}: ${count} HS`,
        0,
        signY - 8
      );

      ctx.fillStyle = gateState === 'closed' ? '#f87171' : '#0284c7';
      ctx.font = '700 11px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(sampleText, 0, signY + 9);

      ctx.restore();
    };

    const drawChibiStudent = (
      x: number,
      y: number,
      student: ThiSinhBuong,
      scale: number,
      isWinner: boolean,
      isTense: boolean,
      timeSec: number
    ) => {
      ctx.save();
      const bounce = isWinner
        ? -Math.abs(Math.sin(timeSec * 8.5)) * 12
        : isTense
        ? Math.sin(timeSec * 14 + x) * 2.4
        : Math.sin(timeSec * 3.2 + x) * 1.8;
      ctx.translate(x, y + bounce);
      ctx.scale(scale, scale);

      const outline = '#1e293b';
      ctx.strokeStyle = outline;
      ctx.lineWidth = 2.1;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      ctx.fillStyle = isWinner ? 'rgba(250, 204, 21, 0.55)' : 'rgba(15, 23, 42, 0.32)';
      ctx.beginPath();
      ctx.ellipse(0, 39 - bounce * 0.4, 21, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = student.bag;
      ctx.beginPath();
      ctx.roundRect(-18, -3, 36, 22, 8);
      ctx.fill();
      ctx.stroke();

      if (student.isGirl) {
        ctx.fillStyle = student.hair;
        ctx.beginPath();
        ctx.ellipse(0, -24, 23, 21, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(-20, -13, 8, 13, 0.25, 0, Math.PI * 2);
        ctx.ellipse(20, -13, 8, 13, -0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.fillStyle = '#fed7aa';
      ctx.fillRect(-10, 18, 6.5, 16);
      ctx.strokeRect(-10, 18, 6.5, 16);
      ctx.fillRect(3.5, 18, 6.5, 16);
      ctx.strokeRect(3.5, 18, 6.5, 16);

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(-7, 35, 7, 4, 0, 0, Math.PI * 2);
      ctx.ellipse(7, 35, 7, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#2563eb';
      if (student.isGirl) {
        ctx.beginPath();
        ctx.moveTo(-14, 11);
        ctx.lineTo(14, 11);
        ctx.lineTo(19, 24);
        ctx.lineTo(-19, 24);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.roundRect(-13, 11, 11, 13, 3);
        ctx.roundRect(2, 11, 11, 13, 3);
        ctx.fill();
        ctx.stroke();
      }

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(-14, -10, 28, 23, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(-6, -9);
      ctx.lineTo(6, -9);
      ctx.lineTo(3, 2);
      ctx.lineTo(0, 6);
      ctx.lineTo(-3, 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      const armWave = isWinner ? Math.sin(timeSec * 14) * 5 : 0;
      [-1, 1].forEach(dir => {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 7.5;
        ctx.beginPath();
        ctx.moveTo(dir * 13, -4);
        ctx.lineTo(dir * (isWinner ? 25 : 20), isWinner ? -22 + armWave * dir : 6);
        ctx.stroke();
        ctx.strokeStyle = outline;
        ctx.lineWidth = 2;
        ctx.fillStyle = '#fed7aa';
        ctx.beginPath();
        ctx.arc(dir * (isWinner ? 25 : 20), isWinner ? -22 + armWave * dir : 6, 4.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      ctx.fillStyle = '#ffedd5';
      ctx.strokeStyle = outline;
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.arc(0, -28, 19.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = student.hair;
      ctx.beginPath();
      if (student.isGirl) {
        ctx.arc(0, -30, 20.2, Math.PI * 1.03, Math.PI * 1.97);
        ctx.quadraticCurveTo(10, -25, 3, -32);
        ctx.quadraticCurveTo(-5, -24, -20, -29);
      } else {
        ctx.arc(0, -30.5, 20.5, Math.PI * 1.02, Math.PI * 1.98);
        ctx.lineTo(18, -28);
        ctx.lineTo(9, -33);
        ctx.lineTo(3, -26);
        ctx.lineTo(-5, -33);
        ctx.lineTo(-12, -27);
        ctx.lineTo(-20, -29);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (student.isGirl) {
        ctx.fillStyle = student.ribbon;
        ctx.beginPath();
        ctx.arc(15, -39, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(244, 63, 94, 0.36)';
      ctx.beginPath();
      ctx.ellipse(-10.5, -22, 4.2, 2.4, 0, 0, Math.PI * 2);
      ctx.ellipse(10.5, -22, 4.2, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();

      if (isWinner) {
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.arc(-7, -26, 4.5, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(7, -26, 4.5, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();

        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(0, -20.5, 5.2, 0, Math.PI);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.save();
        ctx.translate(0, -53);
        ctx.fillStyle = '#facc15';
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-11, 4);
        ctx.lineTo(-13, -7);
        ctx.lineTo(-5, -1);
        ctx.lineTo(0, -10);
        ctx.lineTo(5, -1);
        ctx.lineTo(13, -7);
        ctx.lineTo(11, 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else {
        [-7, 7].forEach(ex => {
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(ex, -26, 3.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ex - 1.1, -27.2, 1.3, 0, Math.PI * 2);
          ctx.fill();
        });
        if (isTense) {
          ctx.fillStyle = '#fb7185';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.ellipse(0, -18.5, 3, 3.8, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(0, -21, 3.5, 0.15 * Math.PI, 0.85 * Math.PI);
          ctx.stroke();
        }
      }

      ctx.restore();
    };

    const drawFinalPod = (
      x: number,
      y: number,
      student: ThiSinhBuong,
      mode: 'active' | 'scan' | 'winner',
      timeSec: number
    ) => {
      const isHi = mode === 'scan' || mode === 'winner';
      const podW = 136;
      const podH = 158;

      ctx.save();
      ctx.translate(x, y);

      // Hào quang phát sáng
      const glow = ctx.createRadialGradient(0, -10, 12, 0, -10, isHi ? 120 : 84);
      glow.addColorStop(0, isHi ? 'rgba(254, 240, 138, 0.7)' : 'rgba(224, 242, 254, 0.36)');
      glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, -10, isHi ? 120 : 84, 0, Math.PI * 2);
      ctx.fill();

      // Khung buồng kính
      const g = ctx.createLinearGradient(0, -podH / 2, 0, podH / 2);
      if (isHi) {
        g.addColorStop(0, 'rgba(254, 249, 195, 0.78)');
        g.addColorStop(0.55, 'rgba(253, 224, 71, 0.35)');
        g.addColorStop(1, 'rgba(250, 204, 21, 0.62)');
      } else {
        g.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
        g.addColorStop(0.55, 'rgba(186, 230, 253, 0.22)');
        g.addColorStop(1, 'rgba(125, 211, 252, 0.48)');
      }
      ctx.fillStyle = g;
      ctx.strokeStyle = isHi ? '#fef08a' : '#ffffff';
      ctx.lineWidth = isHi ? 3.5 : 2.2;
      ctx.beginPath();
      ctx.roundRect(-podW / 2, -podH / 2, podW, podH, [24, 24, 14, 14]);
      ctx.fill();
      ctx.stroke();

      // Nắp đầu nối ống điện
      ctx.fillStyle = isHi ? '#eab308' : '#0284c7';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-26, -podH / 2 - 10, 52, 15, 5);
      ctx.fill();
      ctx.stroke();

      drawChibiStudent(0, 6, student, 0.96, mode === 'winner', mode === 'scan', timeSec);

      // Nhãn tên dưới chân buồng
      const label = student.hs.ten.length > 16 ? `${student.hs.ten.slice(0, 15)}…` : student.hs.ten;
      ctx.font = '800 13.5px "Segoe UI", system-ui, sans-serif';
      const tw = ctx.measureText(label).width;
      const tagW = Math.max(110, tw + 22);
      ctx.fillStyle = isHi ? '#fef08a' : '#ffffff';
      ctx.strokeStyle = isHi ? '#ea580c' : '#0f172a';
      ctx.lineWidth = isHi ? 2.6 : 1.9;
      ctx.beginPath();
      ctx.roundRect(-tagW / 2, podH / 2 - 10, tagW, 28, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 0, podH / 2 + 4.5);

      ctx.restore();
    };

    const render = (now: number) => {
      if (!running) return;
      const st = stateRef.current;
      const w = canvas.width;
      const h = canvas.height;
      const timeSec = now / 1000;

      // ============================================================================
      // 1. CẬP NHẬT CHUYỂN ĐỘNG QUẢ CẦU ĐIỆN PLASMA & CAMERA XUYÊN TỪNG HẦM!
      // ============================================================================
      if (dangChoi && st.finalists.length > 0) {
        if (st.phase === 'traveling') {
          if (st.curChamberIdx >= st.chambers.length) {
            // Đã xuyên hết các hầm chia nhánh -> lao thẳng vào lõi trần Hầm Chung Kết!
            const targetX = st.finalHallX + 240;
            st.boltX += (targetX - st.boltX) * 0.09 + 5.5;
            st.boltY += (170 - st.boltY) * 0.12;

            if (st.boltX >= targetX - 18) {
              st.boltX = targetX;
              st.boltY = 170;
              st.phase = 'roulette';
              st.rouletteStartMs = now;
              st.rouletteEndMs = now + (st.finalists.length === 1 ? 1100 : 2600 + randomInt(1800));
              setAliveCount(st.finalists.length);
              setStatusText(`⚡ VÀO HẦM CHUNG KẾT! Tia sét đang rà ${st.finalists.length} buồng học sinh!`);
              amThanh.phatTiengTiaSet(false);
              spawnSparks(targetX, 170, '#fef08a', 26);
            }
          } else {
            const ch = st.chambers[st.curChamberIdx];
            const branchY = ch.chosenBranch === 0 ? LANE_TOP_Y : LANE_BOT_Y;

            if (st.subPhase === 'to_junction') {
              const dist = ch.junctionX - st.boltX;
              st.boltX += Math.max(5.5, Math.min(13, dist * 0.085));
              st.boltY += (LANE_MID_Y - st.boltY) * 0.14;
              if (st.boltX >= ch.junctionX - 6) {
                st.boltX = ch.junctionX;
                st.boltY = LANE_MID_Y;
                st.subPhase = 'deciding';
                st.subPhaseStartMs = now;
                amThanh.phatTiengTick();
                setStatusText(`⚡ Ngã ba Hầm ${ch.index + 1}: Đang chọn nhánh Trên hay Dưới...`);
              }
            } else if (st.subPhase === 'deciding') {
              // Rung hồi hộp 1.15s tại ngã ba công tắc trước khi gạt cửa hầm!
              st.boltX = ch.junctionX + Math.sin(timeSec * 45) * 3;
              st.boltY = LANE_MID_Y + Math.cos(timeSec * 40) * 5;
              if (now - st.subPhaseStartMs >= 1150) {
                ch.decided = true;
                st.subPhase = 'through_tunnel';
                st.subPhaseStartMs = now;
                setAliveCount(ch.aliveAfter);
                setStatusText(
                  `⚡ Hầm ${ch.index + 1} mở cửa ${ch.chosenBranch === 0 ? 'TRÊN' : 'DƯỚI'}! Còn ${ch.aliveAfter} HS đi tiếp!`
                );
                amThanh.phatTiengTiaSet(false);
                spawnSparks(ch.junctionX, LANE_MID_Y, '#fef08a', 24);
                spawnSparks(ch.gateX, branchY, '#7dd3fc', 16);
              }
            } else if (st.subPhase === 'through_tunnel') {
              // Phóng xuyên qua cánh cửa hầm được chọn rồi nhập trục chính vào hầm tiếp theo!
              const speed = 10.5;
              st.boltX += speed;
              if (st.boltX < ch.exitX - 110) {
                st.boltY += (branchY - st.boltY) * 0.16;
              } else {
                st.boltY += (LANE_MID_Y - st.boltY) * 0.14;
              }

              if (Math.random() < 0.5) {
                spawnSparks(st.boltX - 10, st.boltY, '#fef08a', 1);
              }

              if (st.boltX >= ch.exitX) {
                ch.passed = true;
                st.curChamberIdx++;
                st.subPhase = 'to_junction';
                st.subPhaseStartMs = now;
              }
            }
          }

          // Ghi vệt tia sét đuôi dài sau quả cầu điện
          st.boltTrail.push({ x: st.boltX, y: st.boltY });
          if (st.boltTrail.length > 26) st.boltTrail.shift();
        } else if (st.phase === 'roulette') {
          const progress = Math.min(1, (now - st.rouletteStartMs) / Math.max(1, st.rouletteEndMs - st.rouletteStartMs));
          const stepMs = 85 + Math.pow(progress, 2.2) * 310;
          if (progress < 1 && now - st.lastRouletteStepMs >= stepMs) {
            st.lastRouletteStepMs = now;
            if (st.finalists.length > 1) {
              st.roulettePodIdx = (st.roulettePodIdx + 1) % st.finalists.length;
              amThanh.phatTiengTick();
            }
          }
          if (progress >= 1) {
            st.roulettePodIdx = st.winnerPodIdx;
            st.phase = 'winner';
            st.winHoldFrames = 64;
            setAliveCount(1);
            setStatusText(`👑 CHỐT NGƯỜI CHIẾN THẮNG: ${st.finalists[st.winnerPodIdx].hs.ten}!`);
            amThanh.phatTiengTiaSet(true);
            amThanh.chienThang();
            const nPods = st.finalists.length;
            const winPodX = st.finalHallX + 240 - ((nPods - 1) * 168) / 2 + st.winnerPodIdx * 168;
            spawnSparks(winPodX, 310, '#fef08a', 36);
          }
        } else if (st.phase === 'winner') {
          st.winHoldFrames--;
          if (st.winHoldFrames <= 0) {
            const winHs = st.finalists[st.winnerPodIdx]?.hs;
            st.phase = 'idle';
            if (winHs) {
              onHoanThanhRef.current(winHs);
            }
          }
        }
      }

      // CAMERA BÁM MƯỢT THEO QUẢ CẦU ĐIỆN XUYÊN QUA TỪNG HẦM!
      const targetCamX =
        st.phase === 'idle'
          ? 0
          : st.phase === 'roulette' || st.phase === 'winner'
          ? Math.max(0, st.finalHallX - 310)
          : Math.max(0, Math.min(st.worldWidth - w, st.boltX - w * 0.36));
      st.camX += (targetCamX - st.camX) * 0.11;

      for (let i = st.sparks.length - 1; i >= 0; i--) {
        const s = st.sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.12;
        s.alpha -= 0.028;
        if (s.alpha <= 0) st.sparks.splice(i, 1);
      }

      // ============================================================================
      // 2. VẼ THẾ GIỚI ĐƯỜNG HẦM NĂNG LƯỢNG SÁNG RỰC RỠ THEO CAMERA
      // ============================================================================
      ctx.clearRect(0, 0, w, h);

      // Nền xanh điện quang tươi sáng
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#0284c7');
      bgGrad.addColorStop(0.5, '#0ea5e9');
      bgGrad.addColorStop(1, '#1d4ed8');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Lưới tường kỹ thuật trượt Parallax theo Camera
      const gridStep = 44;
      const gxOff = (st.camX * 0.4) % gridStep;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      for (let gx = -gxOff; gx < w + gridStep; gx += gridStep) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }
      for (let gy = 0; gy < h; gy += gridStep) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }

      ctx.save();
      ctx.translate(-st.camX, 0);

      // A. TRẠM PHÁT TỔNG (HẦM 0 — XUẤT PHÁT BÊN TRÁI)
      const hallCenterX = st.finalHallX + 240;
      if (st.chambers.length > 0) {
        drawGlassTunnel(185, LANE_MID_Y, st.chambers[0].junctionX, LANE_MID_Y, dangChoi ? 'active' : 'idle', timeSec);
      } else {
        drawGlassTunnel(185, LANE_MID_Y, hallCenterX - 180, 170, dangChoi ? 'active' : 'idle', timeSec);
        drawGlassTunnel(hallCenterX - 180, 170, hallCenterX, 170, dangChoi ? 'active' : 'idle', timeSec);
      }

      // Đế máy phát tổng & nhóm học sinh chibi đứng cổ vũ ở cửa trạm xuất phát!
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(45, 115, 260, 355, 24);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fef08a';
      ctx.font = '900 15px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ TRẠM PHÁT NĂNG LƯỢNG', 175, 148);

      // Lõi Plasma tổng ở trạm xuất phát
      ctx.save();
      ctx.translate(185, LANE_MID_Y);
      ctx.shadowColor = '#fef08a';
      ctx.shadowBlur = 22;
      ctx.fillStyle = '#0369a1';
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 44, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 18px "Segoe UI", system-ui, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${danhSach.length} HS`, 0, 1);
      ctx.restore();

      // Vẽ vài bạn chibi nhỏ đứng cổ vũ ở đáy Trạm Phát Tổng
      st.crowdPreview.forEach((student, idx) => {
        const cx = 86 + idx * 45;
        drawChibiStudent(cx, 415, student, 0.58, false, dangChoi, timeSec);
      });
      ctx.restore();

      // B. CÁC HẦM CHIA NHÁNH NỐI TIẾP NHAU (CHỈ VẼ HẦM TRONG TẦM CAMERA)
      st.chambers.forEach((ch, idx) => {
        if (ch.exitX < st.camX - 250 || ch.junctionX > st.camX + w + 250) return;

        const isCurrent = st.curChamberIdx === idx && st.phase === 'traveling';
        const topStatus: 'active' | 'idle' | 'off' = !ch.decided
          ? 'idle'
          : ch.chosenBranch === 0
          ? 'active'
          : 'off';
        const botStatus: 'active' | 'idle' | 'off' = !ch.decided
          ? 'idle'
          : ch.chosenBranch === 1
          ? 'active'
          : 'off';

        // Ống rẽ lên Hầm Trên
        drawGlassTunnel(ch.junctionX, LANE_MID_Y, ch.junctionX + 120, LANE_TOP_Y, topStatus, timeSec);
        drawGlassTunnel(ch.junctionX + 120, LANE_TOP_Y, ch.exitX - 120, LANE_TOP_Y, topStatus, timeSec);
        drawGlassTunnel(ch.exitX - 120, LANE_TOP_Y, ch.exitX, LANE_MID_Y, topStatus, timeSec);

        // Ống rẽ xuống Hầm Dưới
        drawGlassTunnel(ch.junctionX, LANE_MID_Y, ch.junctionX + 120, LANE_BOT_Y, botStatus, timeSec);
        drawGlassTunnel(ch.junctionX + 120, LANE_BOT_Y, ch.exitX - 120, LANE_BOT_Y, botStatus, timeSec);
        drawGlassTunnel(ch.exitX - 120, LANE_BOT_Y, ch.exitX, LANE_MID_Y, botStatus, timeSec);

        // Ống nối sang Hầm tiếp theo hoặc uốn mượt lên lõi trần Hầm Chung Kết
        if (idx < st.chambers.length - 1) {
          drawGlassTunnel(ch.exitX, LANE_MID_Y, st.chambers[idx + 1].junctionX, LANE_MID_Y, ch.passed ? 'active' : 'idle', timeSec);
        } else {
          drawGlassTunnel(ch.exitX, LANE_MID_Y, hallCenterX - 180, 170, ch.passed ? 'active' : 'idle', timeSec);
          drawGlassTunnel(hallCenterX - 180, 170, hallCenterX, 170, ch.passed ? 'active' : 'idle', timeSec);
        }

        // Nút công tắc ngã ba chia hầm
        ctx.save();
        ctx.translate(ch.junctionX, LANE_MID_Y);
        ctx.fillStyle = ch.decided ? '#eab308' : '#0369a1';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(0, 0, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 13px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`HẦM ${idx + 1}`, 0, 1);
        ctx.restore();

        // 2 Cửa Hầm Trên & Dưới
        const topGateState = !ch.decided
          ? isCurrent && st.subPhase === 'deciding'
            ? 'flicker'
            : 'idle'
          : ch.chosenBranch === 0
          ? 'open'
          : 'closed';
        const botGateState = !ch.decided
          ? isCurrent && st.subPhase === 'deciding'
            ? 'flicker'
            : 'idle'
          : ch.chosenBranch === 1
          ? 'open'
          : 'closed';

        drawTunnelGate(ch.gateX, LANE_TOP_Y, `Hầm ${idx + 1}A`, ch.topCount, ch.topPreview, topGateState, timeSec);
        drawTunnelGate(ch.gateX, LANE_BOT_Y, `Hầm ${idx + 1}B`, ch.bottomCount, ch.bottomPreview, botGateState, timeSec);
      });

      // C. HẦM LÕI CHUNG KẾT (PHÒNG CÁC BUỒNG KÍNH HỌC SINH CHIBI!)
      if (hallCenterX > st.camX - 500) {
        const numPods = st.finalists.length;
        const podSpan = numPods <= 1 ? 0 : (numPods - 1) * 168;
        const firstPodX = hallCenterX - podSpan / 2;
        const podY = 390;

        // Vòm Đại Sảnh Hầm Chung Kết sáng rực
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(hallCenterX - 360, 78, 720, 444, 28);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fef08a';
        ctx.font = '900 18px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ HẦM CHUNG KẾT — KHÓA MỤC TIÊU ⚡', hallCenterX, 114);
        ctx.restore();

        // Đường ống điện phân phối từ lõi trần xuống từng buồng học sinh chibi
        const hubY = 170;
        st.finalists.forEach((_, idx) => {
          const px = firstPodX + idx * 168;
          const isLit =
            (st.phase === 'roulette' && idx === st.roulettePodIdx) ||
            (st.phase === 'winner' && idx === st.winnerPodIdx);

          ctx.save();
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = isLit ? '#eab308' : '#334155';
          ctx.lineWidth = 14;
          ctx.beginPath();
          ctx.moveTo(hallCenterX, hubY);
          ctx.lineTo(px, hubY);
          ctx.lineTo(px, podY - 86);
          ctx.stroke();

          if (isLit) {
            ctx.shadowColor = '#facc15';
            ctx.shadowBlur = 18;
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 5;
            ctx.stroke();
          }
          ctx.restore();
        });

        // Trục lõi chia điện trên trần hầm chung kết
        ctx.save();
        ctx.translate(hallCenterX, hubY);
        ctx.fillStyle = st.phase === 'winner' ? '#eab308' : '#0284c7';
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(0, 0, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 14px "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${numPods} HS`, 0, 1);
        ctx.restore();

        // Vẽ 1–4 buồng kính học sinh chibi
        st.finalists.forEach((student, idx) => {
          const px = firstPodX + idx * 168;
          const mode: 'active' | 'scan' | 'winner' =
            st.phase === 'winner' && idx === st.winnerPodIdx
              ? 'winner'
              : st.phase === 'roulette' && idx === st.roulettePodIdx
              ? 'scan'
              : 'active';
          drawFinalPod(px, podY, student, mode, timeSec);
        });
      }

      // D. VẼ QUẢ CẦU TIA SÉT PLASMA ĐẦU TÀU & VỆT SÉT ĐUÔI (KHI ĐANG XUYÊN HẦM!)
      if (st.phase === 'traveling') {
        if (st.boltTrail.length > 1) {
          ctx.save();
          ctx.shadowColor = '#facc15';
          ctx.shadowBlur = 18;
          ctx.strokeStyle = '#fef08a';
          ctx.lineWidth = 6;
          ctx.lineCap = 'round';
          ctx.beginPath();
          st.boltTrail.forEach((pt, i) => {
            const jx = pt.x;
            const jy = pt.y + (i > 0 && i < st.boltTrail.length - 1 ? Math.sin(timeSec * 45 + i * 3) * 5 : 0);
            if (i === 0) ctx.moveTo(jx, jy);
            else ctx.lineTo(jx, jy);
          });
          ctx.stroke();
          ctx.restore();
        }

        // Quả cầu sét đầu tàu rực chói
        ctx.save();
        ctx.translate(st.boltX, st.boltY);
        ctx.shadowColor = '#fde047';
        ctx.shadowBlur = 28;
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(0, 0, 18 + Math.sin(timeSec * 30) * 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // E. VẼ HẠT TIA LỬA ĐIỆN
      st.sparks.forEach(s => {
        ctx.save();
        ctx.globalAlpha = s.alpha;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      ctx.restore(); // Kết thúc Camera

      // F. BẢN ĐỒ HÀNH TRÌNH XUYÊN HẦM GÓC DƯỚI PHẢI
      const totalStops = st.chambers.length + 2; // Trạm phát + N hầm + Hầm chung kết
      const mapW = 240;
      const mapH = 44;
      const mapX = w - mapW - 18;
      const mapY = h - mapH - 14;
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.84)';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(mapX, mapY, mapW, mapH, 12);
      ctx.fill();
      ctx.stroke();

      const lineY = mapY + 26;
      const startLx = mapX + 24;
      const endLx = mapX + mapW - 24;
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(startLx, lineY);
      ctx.lineTo(endLx, lineY);
      ctx.stroke();

      const progRatio =
        st.phase === 'idle'
          ? 0
          : st.phase === 'roulette' || st.phase === 'winner'
          ? 1
          : Math.min(1, Math.max(0, (st.boltX - 185) / Math.max(1, hallCenterX - 185)));

      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(startLx, lineY);
      ctx.lineTo(startLx + (endLx - startLx) * progRatio, lineY);
      ctx.stroke();

      for (let i = 0; i < totalStops; i++) {
        const dx = startLx + ((endLx - startLx) * i) / Math.max(1, totalStops - 1);
        const reached = progRatio >= i / Math.max(1, totalStops - 1) - 0.02;
        ctx.fillStyle = i === totalStops - 1 ? '#facc15' : reached ? '#38bdf8' : '#64748b';
        ctx.beginPath();
        ctx.arc(dx, lineY, i === totalStops - 1 ? 5.5 : 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#e2e8f0';
      ctx.font = '800 9.5px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('BẢN ĐỒ XUYÊN HẦM', mapX + 12, mapY + 11);
      ctx.restore();

      st.animationFrameId = requestAnimationFrame(render);
    };

    stateRef.current.animationFrameId = requestAnimationFrame(render);
    return () => {
      running = false;
      if (stateRef.current.animationFrameId) {
        cancelAnimationFrame(stateRef.current.animationFrameId);
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
          boxShadow: '0 12px 35px rgba(0, 0, 0, 0.35)',
          border: '2px solid #7dd3fc',
          background: '#0284c7'
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
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.94)',
              border: '2px solid #0f172a',
              borderRadius: '999px',
              padding: '5px 16px',
              fontSize: '0.82rem',
              fontWeight: 900,
              color: '#0f172a'
            }}
          >
            ⚡ Còn sống: <span style={{ color: '#0284c7' }}>{aliveCount}</span> / {danhSach.length} HS
          </div>

          <div
            style={{
              background: 'rgba(15, 23, 42, 0.88)',
              border: '2px solid #facc15',
              borderRadius: '999px',
              padding: '5px 16px',
              fontSize: '0.82rem',
              fontWeight: 800,
              color: '#fef08a'
            }}
          >
            {statusText}
          </div>

          <div style={{ pointerEvents: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
            {!dangChoi && (
              <button
                type="button"
                onClick={() => {
                  amThanh.phatTiengTick();
                  khoiTaoHanhTrinhHam();
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.94)',
                  color: '#0f172a',
                  border: '2px solid #0284c7',
                  padding: '6px 12px',
                  borderRadius: '10px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                🔀 Trộn nhánh hầm
              </button>
            )}
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
              : 'linear-gradient(135deg, #fde047 0%, #f59e0b 55%, #ea580c 100%)',
            color: dangChoi ? '#e2e8f0' : '#0f172a',
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
          <span>{dangChoi ? '⚡ Camera đang bám dòng điện xuyên hầm...' : '⚡ PHÓNG DÒNG ĐIỆN XUYÊN HẦM'}</span>
        </button>
      </div>
    </div>
  );
};
