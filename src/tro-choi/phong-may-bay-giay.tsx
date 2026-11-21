// Trò chơi Tuổi Thơ Học Đường #2: ✈️ Phóng Máy Bay Giấy Lên Bục Giảng (Góc Nhìn Chiều Dọc + Quỹ Đạo 1+3)
// - Kết hợp Phóng nối tiếp lướt êm + Hiệu ứng độ cao 2.5D (phóng to khi bay cao, bóng đổ tách xa, nhỏ dần lên Bục Giảng)
// - Mũi máy bay Origami thuần 3D (kẻ ô ly vở học sinh) LUÔN hướng thẳng lên trên (nghiêng nhẹ tối đa ±18°, không bay xéo ngang!)
// - Máy bay trượt hạ cánh nằm lại ngay trên sàn lớp học (KHÔNG biến mất) + 1–2 pha suýt đáp trúng mép Bàn Cô!
// - Tự động 100% thuần 1-Click (biến thiên ngẫu nhiên 14–27s, tối đa 30s) • Cô Giáo mặc áo dài vàng đứng bục giảng
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
  veCoGiaoAoDaiVang,
  veBangTenHocSinh,
  veBongBongThoai
} from './hoc-duong-chung';

interface PhongMayBayGiayProps {
  danhSach: HocSinh[];
  dangChoi: boolean;
  mucTieuIndex: number | null;
  onBatDauChoi: () => void;
  onHoanThanh: (nguoiThang?: HocSinh) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

interface PlanePalette {
  leftWing: string;
  rightWing: string;
  spine: string;
}

interface OrigamiPlane {
  id: number;
  hs: HocSinh;
  isWinner: boolean;
  isCloseCall: boolean; // Pha suýt đáp trúng mép Bàn Giáo Viên cực hồi hộp!
  palette: PlanePalette;
  launchMs: number;     // Thời điểm cất cánh nối tiếp
  flightDurMs: number;  // Thời gian bay lượn 2.5D (2.5s – 3.4s)
  sx: number;
  sy: number;
  ctrlX: number;
  ctrlY: number;
  ex: number;
  ey: number;
  peakAlt: number;
  x: number;
  y: number;
  tilt: number;
  scale: number;
  altitude: number;
  status: 'waiting' | 'flying' | 'landed';
  playedLaunchSfx: boolean;
  playedCloseSfx: boolean;
  trail: { x: number; y: number }[];
}

interface DeskStudent {
  isGirl: boolean;
  hairColor: string;
  ribbonColor: string;
  x: number;
  y: number;
  row: number;
  colIdx: number;
  throwUntilMs: number;
}

interface BreezeRibbon {
  x: number;
  y: number;
  vx: number;
  len: number;
  alpha: number;
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
const DESK_TARGET_X = 550;
const DESK_TARGET_Y = 208;

// 3 cột bàn x 2 hàng bàn (tạo 2 lối đi dọc chuẩn lớp học Việt Nam)
const DESK_COLS = [210, 550, 890];
const DESK_ROWS_Y = [374, 490];

// Bảng màu giấy vở Origami pastel tươi sáng (có cánh trái sáng / cánh phải bóng nhẹ 3D)
const PAPER_PALETTES: PlanePalette[] = [
  { leftWing: '#ffffff', rightWing: '#e2e8f0', spine: '#94a3b8' },
  { leftWing: '#e0f2fe', rightWing: '#bae6fd', spine: '#38bdf8' },
  { leftWing: '#fce7f3', rightWing: '#fbcfe8', spine: '#f472b6' },
  { leftWing: '#dcfce7', rightWing: '#bbf7d0', spine: '#4ade80' },
  { leftWing: '#ede9fe', rightWing: '#ddd6fe', spine: '#a78bfa' },
  { leftWing: '#ffedd5', rightWing: '#fed7aa', spine: '#fb923c' }
];

const WINNER_PALETTE: PlanePalette = {
  leftWing: '#fef9c3',
  rightWing: '#fde047',
  spine: '#eab308'
};

export const PhongMayBayGiay: React.FC<PhongMayBayGiayProps> = ({
  danhSach,
  dangChoi,
  mucTieuIndex,
  onBatDauChoi,
  onHoanThanh,
  isFullscreen = false,
  onToggleFullscreen
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hudText, setHudText] = useState<string>('✈️ Cả lớp đã gấp xong máy bay giấy hướng lên Bàn Giáo Viên!');

  const onHoanThanhRef = useRef(onHoanThanh);
  useEffect(() => {
    onHoanThanhRef.current = onHoanThanh;
  }, [onHoanThanh]);

  const mucTieuIndexRef = useRef(mucTieuIndex);
  useEffect(() => {
    mucTieuIndexRef.current = mucTieuIndex;
  }, [mucTieuIndex]);

  const stateRef = useRef<{
    planes: OrigamiPlane[];
    deskStudents: DeskStudent[];
    breezes: BreezeRibbon[];
    sparkles: HatSao[];
    winnerPlaneIdx: number;
    camZoom: number;
    startTime: number;
    landedAtMs: number;
    closeCallText: string;
    closeCallUntilMs: number;
    daKetThuc: boolean;
    lastHudMs: number;
    animId: number;
  }>({
    planes: [],
    deskStudents: [],
    breezes: [],
    sparkles: [],
    winnerPlaneIdx: 0,
    camZoom: 1,
    startTime: 0,
    landedAtMs: 0,
    closeCallText: '',
    closeCallUntilMs: 0,
    daKetThuc: false,
    lastHudMs: 0,
    animId: 0
  });

  const khoiTaoLopHoc = useCallback((forGameStart: boolean) => {
    const st = stateRef.current;
    const n = danhSach.length;
    if (n === 0) {
      st.planes = [];
      st.deskStudents = [];
      setHudText('✈️ Hãy thêm học sinh để cả lớp phóng máy bay giấy nhé!');
      return;
    }

    const rawTarget =
      mucTieuIndexRef.current !== null && mucTieuIndexRef.current >= 0 && mucTieuIndexRef.current < n
        ? mucTieuIndexRef.current
        : randomInt(n);
    const winnerHs = danhSach[rawTarget];

    // 12 học sinh Chibi mặc áo trắng quần đen khăn quàng đỏ ngồi ngay ngắn sau 6 dãy bàn
    const deskStudents: DeskStudent[] = [];
    let sCounter = 0;
    DESK_ROWS_Y.forEach((ry, rowIdx) => {
      DESK_COLS.forEach((cx, colIdx) => {
        [-44, 44].forEach(dx => {
          const refIdx = sCounter % n;
          sCounter++;
          const hs = danhSach[refIdx];
          deskStudents.push({
            isGirl: doanGioiTinhNu(hs.ten, refIdx),
            hairColor: BANG_TOC_CHIBI[refIdx % BANG_TOC_CHIBI.length],
            ribbonColor: BANG_NO_CHIBI[refIdx % BANG_NO_CHIBI.length],
            x: cx + dx,
            y: ry + 26,
            row: rowIdx,
            colIdx,
            throwUntilMs: 0
          });
        });
      });
    });

    // Chuỗi phóng nối tiếp nhẹ nhàng: luôn có 4–6 chiếc trên không cùng lúc, chốt bất ngờ từ 14–27s (tối đa 30s)!
    // Tổng số chiếc phóng trước Winner: ngẫu nhiên 16–30 chiếc (khoảng cách cất cánh ~0.58–0.74s -> 4–6 chiếc cùng bay!)
    const totalDecoys = n === 1 ? 6 : 16 + randomInt(15);
    const othersPool = xaoTronCrypto(
      Array.from({ length: n }, (_, i) => i).filter(i => i !== rawTarget)
    );

    // Chọn 1–2 vị trí làm pha "Suýt đáp trúng mép Bàn Giáo Viên!" cực kịch tính
    const closeCallSlots = new Set<number>();
    if (totalDecoys >= 6) {
      closeCallSlots.add(Math.floor(totalDecoys * 0.55));
      if (totalDecoys >= 14) {
        closeCallSlots.add(totalDecoys - 2);
      }
    }

    const planes: OrigamiPlane[] = [];
    let launchCursorMs = 200;

    for (let i = 0; i < totalDecoys; i++) {
      const hs =
        othersPool.length > 0
          ? danhSach[othersPool[i % othersPool.length]]
          : winnerHs;
      const isClose = closeCallSlots.has(i);
      const colIdx = (i + randomInt(3)) % DESK_COLS.length;
      const rowIdx = i % 2;
      const sx = DESK_COLS[colIdx] + randomRange(-58, 58);
      const sy = DESK_ROWS_Y[rowIdx] - 8;

      let ex: number;
      let ey: number;
      let ctrlX: number;
      let ctrlY: number;

      if (isClose) {
        // Bay sát sạt mép trái hoặc phải Bàn Giáo Viên rồi lướt trượt xuống bậc bục giảng!
        const side = i % 2 === 0 ? -1 : 1;
        ex = DESK_TARGET_X + side * randomRange(132, 168);
        ey = randomRange(258, 286);
        ctrlX = DESK_TARGET_X + side * randomRange(52, 86);
        ctrlY = (sy + ey) * 0.5 - 48;
      } else {
        // Bay thẳng lên nhẹ nhàng và hạ cánh nằm lại tự nhiên khắp sàn lớp / hai bên lối đi (né đè mặt Bàn GV!)
        const laneChoice = i % 5;
        if (laneChoice === 0) {
          ex = randomRange(105, 365);
          ey = randomRange(266, 342);
        } else if (laneChoice === 1) {
          ex = randomRange(735, 995);
          ey = randomRange(266, 342);
        } else if (laneChoice === 2) {
          ex = randomRange(345, 425); // Lối đi dọc bên trái
          ey = randomRange(270, 440);
        } else if (laneChoice === 3) {
          ex = randomRange(675, 755); // Lối đi dọc bên phải
          ey = randomRange(270, 440);
        } else {
          ex = randomRange(140, 960);
          ey = randomRange(272, 336);
        }
        // Điểm uốn Bezier giữ góc nghiêng nhẹ nhàng (±18°), tuyệt đối không bẻ ngang!
        ctrlX = (sx + ex) * 0.5 + randomRange(-48, 48);
        ctrlY = (sy + ey) * 0.5 - randomRange(24, 52);
      }

      const flightDurMs = isClose ? randomRange(3000, 3400) : randomRange(2550, 3250);
      planes.push({
        id: i,
        hs,
        isWinner: false,
        isCloseCall: isClose,
        palette: PAPER_PALETTES[i % PAPER_PALETTES.length],
        launchMs: launchCursorMs,
        flightDurMs,
        sx,
        sy,
        ctrlX,
        ctrlY,
        ex,
        ey,
        peakAlt: isClose ? randomRange(96, 114) : randomRange(68, 98),
        x: sx,
        y: sy,
        tilt: 0,
        scale: 1,
        altitude: 0,
        status: 'waiting',
        playedLaunchSfx: false,
        playedCloseSfx: false,
        trail: []
      });

      // Nhịp cất cánh đều êm (0.58s–0.74s) -> luôn duy trì 4–6 máy bay lướt nối tiếp trên không!
      launchCursorMs += isClose ? randomRange(920, 1150) : randomRange(560, 740);
      if (launchCursorMs > 22400) break; // Khóa chắc chắn tổng ván không bao giờ vượt quá 28s!
    }

    // Chiếc máy bay WINNER cất cánh nhẹ nhàng ở cuối chuỗi, lượn vòng cung 2.5D đẹp mắt đáp gọn chính tâm Bàn Giáo Viên!
    const winLaunchMs = Math.min(23000, launchCursorMs + 420);
    const winCol = randomInt(DESK_COLS.length);
    const winSx = DESK_COLS[winCol] + randomRange(-45, 45);
    const winSy = DESK_ROWS_Y[1] - 8;
    const winCtrlX = (winSx + DESK_TARGET_X) * 0.5 + (winSx <= DESK_TARGET_X ? -40 : 40);
    const winCtrlY = (winSy + DESK_TARGET_Y) * 0.5 - 55;

    planes.push({
      id: planes.length,
      hs: winnerHs,
      isWinner: true,
      isCloseCall: false,
      palette: WINNER_PALETTE,
      launchMs: winLaunchMs,
      flightDurMs: 3250,
      sx: winSx,
      sy: winSy,
      ctrlX: winCtrlX,
      ctrlY: winCtrlY,
      ex: DESK_TARGET_X,
      ey: DESK_TARGET_Y - 5,
      peakAlt: 112,
      x: winSx,
      y: winSy,
      tilt: 0,
      scale: 1,
      altitude: 0,
      status: 'waiting',
      playedLaunchSfx: false,
      playedCloseSfx: false,
      trail: []
    });

    st.planes = planes;
    st.deskStudents = deskStudents;
    st.winnerPlaneIdx = planes.length - 1;
    st.camZoom = 1;
    st.breezes = [];
    st.sparkles = [];
    st.landedAtMs = 0;
    st.closeCallText = '';
    st.closeCallUntilMs = 0;
    st.daKetThuc = false;
    st.lastHudMs = 0;

    if (forGameStart) {
      st.startTime = performance.now();
      amThanh.phatTiengGioQuat();
      setHudText(`✈️ PHÓNG!! Từng làn máy bay giấy (${n} HS) lượn nhẹ từ bàn học lên Bàn Cô!`);
    } else {
      setHudText(`✈️ Phòng học sẵn sàng • ${n} HS đã gấp máy bay giấy chờ phóng lên Bàn Cô!`);
    }
  }, [danhSach]);

  useEffect(() => {
    if (!dangChoi) {
      khoiTaoLopHoc(false);
    }
  }, [danhSach, dangChoi, khoiTaoLopHoc]);

  const prevDangChoiRef = useRef<boolean>(false);
  useEffect(() => {
    if (dangChoi && !prevDangChoiRef.current) {
      khoiTaoLopHoc(true);
    } else if (!dangChoi && prevDangChoiRef.current) {
      stateRef.current.daKetThuc = false;
    }
    prevDangChoiRef.current = dangChoi;
  }, [dangChoi, khoiTaoLopHoc]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    let lastTime = performance.now();

    const spawnLandStars = (cx: number, cy: number) => {
      const cols = ['#facc15', '#ef4444', '#38bdf8', '#22c55e', '#f472b6', '#ffffff'];
      for (let i = 0; i < 44; i++) {
        const ang = randomRange(0, Math.PI * 2);
        const spd = randomRange(70, 240);
        stateRef.current.sparkles.push({
          x: cx,
          y: cy - 8,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 95,
          r: randomRange(3, 6),
          alpha: 1,
          color: cols[i % cols.length]
        });
      }
    };

    const drawVerticalClassroom = (
      t: number,
      now: number,
      teacherState: 'writing' | 'surprised' | 'smile',
      teacherSpeech: string
    ) => {
      // 1. TƯỜNG PHÍA TRƯỚC LỚP HỌC (vàng kem sáng ấm)
      ctx.fillStyle = '#fefce8';
      ctx.fillRect(0, 0, CANVAS_W, 204);
      ctx.fillStyle = '#dcfce7';
      ctx.fillRect(0, 162, CANVAS_W, 42);
      ctx.fillStyle = '#86efac';
      ctx.fillRect(0, 160, CANVAS_W, 4);

      // Cửa sổ nắng sáng 2 bên
      [52, CANVAS_W - 196].forEach(wx => {
        const wGrad = ctx.createLinearGradient(wx, 54, wx, 152);
        wGrad.addColorStop(0, '#38bdf8');
        wGrad.addColorStop(1, '#e0f2fe');
        ctx.fillStyle = wGrad;
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 4;
        ctx.fillRect(wx, 54, 144, 96);
        ctx.strokeRect(wx, 54, 144, 96);
        ctx.strokeStyle = '#fef3c7';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(wx + 72, 54); ctx.lineTo(wx + 72, 150);
        ctx.moveTo(wx, 102); ctx.lineTo(wx + 144, 102);
        ctx.stroke();
      });

      // 2. BẢNG XANH LỚN CHÍNH GIỮA PHÍA TRÊN (gọn dưới thanh HUD)
      ctx.fillStyle = '#15803d';
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 8;
      ctx.fillRect(256, 56, 588, 128);
      ctx.strokeRect(256, 56, 588, 128);

      // Khẩu hiệu "TIÊN HỌC LỄ - HẬU HỌC VĂN"
      ctx.fillStyle = '#dc2626';
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(CANVAS_W / 2 - 122, 42, 244, 22, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fef08a';
      ctx.font = '900 11.5px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('TIÊN HỌC LỄ - HẬU HỌC VĂN', CANVAS_W / 2, 53.5);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
      ctx.font = '900 24px "Segoe UI", system-ui, sans-serif';
      ctx.fillText('KIỂM TRA BÀI CŨ', CANVAS_W / 2, 98);
      ctx.fillStyle = '#fef08a';
      ctx.font = '700 15px "Segoe UI", system-ui, sans-serif';
      ctx.fillText('✈️ Máy bay đáp trúng Bàn Cô = Lên bảng tỏa sáng!', CANVAS_W / 2, 134);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(282, 164); ctx.lineTo(334, 164); ctx.lineTo(308, 122); ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(800, 144, 18, 0, Math.PI * 2);
      ctx.stroke();

      // 3. SÀN GẠCH PHÒNG HỌC PHỐI CẢNH CHIỀU DỌC
      const floorGrad = ctx.createLinearGradient(0, 204, 0, CANVAS_H);
      floorGrad.addColorStop(0, '#f1f5f9');
      floorGrad.addColorStop(1, '#e2e8f0');
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, 204, CANVAS_W, CANVAS_H - 204);

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.32)';
      ctx.lineWidth = 1.4;
      for (let i = -6; i <= 6; i++) {
        ctx.beginPath();
        ctx.moveTo(CANVAS_W / 2 + i * 74, 244);
        ctx.lineTo(CANVAS_W / 2 + i * 116, CANVAS_H);
        ctx.stroke();
      }
      for (let gy = 278; gy < CANVAS_H; gy += 54) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(CANVAS_W, gy);
        ctx.stroke();
      }

      // Vệt nắng dịu từ 2 cửa sổ
      ctx.fillStyle = 'rgba(254, 240, 138, 0.14)';
      ctx.beginPath();
      ctx.moveTo(52, 204); ctx.lineTo(196, 204); ctx.lineTo(310, 580); ctx.lineTo(90, 580);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(CANVAS_W - 196, 204); ctx.lineTo(CANVAS_W - 52, 204); ctx.lineTo(CANVAS_W - 90, 580); ctx.lineTo(CANVAS_W - 310, 580);
      ctx.closePath();
      ctx.fill();

      // 4. BỤC GIẢNG GỖ + BÀN GIÁO VIÊN + CÔ GIÁO MẶC ÁO DÀI VÀNG!
      ctx.fillStyle = '#d97706';
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2.6;
      ctx.fillRect(195, 198, 710, 52);
      ctx.strokeRect(195, 198, 710, 52);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(195, 244, 710, 14);
      ctx.strokeRect(195, 244, 710, 14);

      const dX = DESK_TARGET_X - 118;
      const dY = DESK_TARGET_Y - 12;
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.roundRect(dX - 8, dY - 6, 252, 26, 7);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#b45309';
      ctx.fillRect(dX, dY + 18, 236, 44);
      ctx.strokeRect(dX, dY + 18, 236, 44);

      // Lọ hoa cúc trên bàn Cô
      ctx.fillStyle = '#38bdf8';
      ctx.strokeStyle = '#0369a1';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(dX + 10, dY - 22, 18, 19, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#facc15';
      [dX + 14, dX + 24, dX + 19].forEach((fx, i) => {
        ctx.beginPath();
        ctx.arc(fx, dY - 27 - (i === 2 ? 4 : 0), 4.6, 0, Math.PI * 2);
        ctx.fill();
      });

      // Vòng mục tiêu sáng trên mặt Bàn Giáo Viên
      const pulse = 0.65 + Math.sin(t * 5) * 0.35;
      ctx.fillStyle = `rgba(254, 240, 138, ${0.5 + pulse * 0.35})`;
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(DESK_TARGET_X, DESK_TARGET_Y - 3, 68, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fef08a';
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(DESK_TARGET_X - 90, dY + 26, 180, 28, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#78350f';
      ctx.font = '900 14px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🎯 BÀN GIÁO VIÊN', DESK_TARGET_X, dY + 40.5);

      // Cô Giáo mặc áo dài vàng truyền thống đứng cạnh Bàn Giáo Viên
      veCoGiaoAoDaiVang(
        ctx,
        754,
        192,
        1.14,
        {
          expression: teacherState,
          holdingPlane: teacherState === 'smile',
          planeColor: '#fef08a'
        },
        t
      );
      veBangTenHocSinh(ctx, 754, 120, 'Cô Giáo', {
        highlight: teacherState === 'smile',
        prefix: '👩‍🏫 ',
        fontSize: 12.5
      });
      if (teacherSpeech) {
        veBongBongThoai(ctx, 845, 102, teacherSpeech, {
          bg: '#fef9c3',
          border: '#ca8a04',
          color: '#713f12'
        });
      }

      // 5. Bóng quạt trần quay nhẹ tạo luồng gió mát
      const fanRot = t * 4.6;
      [340, 760].forEach((fx, fi) => {
        ctx.save();
        ctx.translate(fx, 315);
        ctx.rotate(fanRot + fi);
        ctx.fillStyle = 'rgba(14, 165, 233, 0.065)';
        for (let b = 0; b < 3; b++) {
          ctx.rotate((Math.PI * 2) / 3);
          ctx.beginPath();
          ctx.ellipse(38, 0, 38, 9, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // 6. CÁC DÃY BÀN HỌC SINH + HỌC SINH ÁO TRẮNG QUẦN ĐEN KHĂN QUÀNG ĐỎ!
      const st = stateRef.current;
      DESK_ROWS_Y.forEach((ry, rowIdx) => {
        DESK_COLS.forEach(cx => {
          ctx.fillStyle = '#fbbf24';
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.roundRect(cx - 105, ry - 18, 210, 26, 6);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#d97706';
          ctx.fillRect(cx - 98, ry + 8, 196, 22);
          ctx.strokeRect(cx - 98, ry + 8, 196, 22);

          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1.4;
          ctx.fillRect(cx - 66, ry - 13, 34, 15);
          ctx.strokeRect(cx - 66, ry - 13, 34, 15);
          ctx.fillRect(cx + 32, ry - 13, 34, 15);
          ctx.strokeRect(cx + 32, ry - 13, 34, 15);
        });

        st.deskStudents
          .filter(ds => ds.row === rowIdx)
          .forEach((ds, i) => {
            const throwing = now < ds.throwUntilMs;
            veHocSinhChibi(
              ctx,
              ds.x,
              ds.y,
              0.92,
              {
                isGirl: ds.isGirl,
                hairColor: ds.hairColor,
                ribbonColor: ds.ribbonColor,
                facing: ds.x < CANVAS_W / 2 ? 1 : -1,
                expression: st.landedAtMs > 0 ? 'cheer' : throwing ? 'cheer' : 'normal',
                raiseArm: throwing || st.landedAtMs > 0
              },
              t + i * 0.35
            );
          });
      });
    };

    /**
     * Vẽ máy bay giấy gấp Origami 3D thuần chuẩn vở ô ly (mũi luôn hướng LÊN TRÊN, chỉ nghiêng nhẹ ±18°!)
     * Kèm bóng đổ tách xa dưới sàn theo độ cao altitude (hiệu ứng 2.5D siêu chân thực!)
     */
    const drawOrigamiPlane = (pl: OrigamiPlane, isWinnerLanded: boolean) => {
      const isGrounded = pl.status === 'landed' && !pl.isWinner;

      // Vệt gió lượn mềm mại khi đang bay
      if (pl.status === 'flying' && pl.trail.length > 2) {
        ctx.save();
        ctx.strokeStyle = pl.isWinner
          ? 'rgba(245, 158, 11, 0.55)'
          : pl.isCloseCall
          ? 'rgba(244, 63, 94, 0.42)'
          : 'rgba(14, 165, 233, 0.28)';
        ctx.lineWidth = pl.isWinner ? 3.2 : 2;
        ctx.setLineDash([5, 6]);
        ctx.beginPath();
        pl.trail.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
        ctx.restore();
      }

      // Bóng đổ trên sàn lớp (khi bay cao bóng tách xuống dưới & mờ dần; khi nằm yên trên sàn bóng áp sát!)
      const shadowOffY = isGrounded || isWinnerLanded ? 5 : 14 + pl.altitude * 0.68;
      const shadowOffX = isGrounded || isWinnerLanded ? 3 : 6 + pl.altitude * 0.18;
      const shadowAlpha = isGrounded ? 0.16 : Math.max(0.06, 0.22 - pl.altitude * 0.0014);
      ctx.save();
      ctx.fillStyle = `rgba(15, 23, 42, ${shadowAlpha})`;
      ctx.beginPath();
      ctx.ellipse(
        pl.x + shadowOffX,
        pl.y + shadowOffY,
        18 * pl.scale,
        6 * pl.scale,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(pl.x, pl.y);
      ctx.scale(pl.scale, pl.scale);
      ctx.rotate(pl.tilt); // 0 rad = mũi hướng THẲNG LÊN BÀN GIÁO VIÊN!

      if (isGrounded) {
        ctx.globalAlpha = 0.88; // Nằm lại tự nhiên dưới sàn, nhường độ nổi cho máy bay đang bay!
      }
      if (isWinnerLanded) {
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 22;
      }

      // Cánh trái sáng
      ctx.fillStyle = pl.palette.leftWing;
      ctx.strokeStyle = isWinnerLanded ? '#dc2626' : '#0f172a';
      ctx.lineWidth = isWinnerLanded ? 2.5 : 1.85;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -31);
      ctx.lineTo(-22, 22);
      ctx.lineTo(0, 11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cánh phải đổ bóng nhẹ 3D
      ctx.fillStyle = pl.palette.rightWing;
      ctx.beginPath();
      ctx.moveTo(0, -31);
      ctx.lineTo(22, 22);
      ctx.lineTo(0, 11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Đường kẻ vở ô ly học sinh nhạt tinh tế trên 2 cánh
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.34)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-4, -10); ctx.lineTo(-14, 12);
      ctx.moveTo(4, -10); ctx.lineTo(14, 12);
      ctx.moveTo(-9, 3); ctx.lineTo(-17, 17);
      ctx.moveTo(9, 3); ctx.lineTo(17, 17);
      ctx.stroke();

      // Nếp gấp sống lưng giữa tạo khối 3D Origami sắc nét
      ctx.fillStyle = pl.palette.spine;
      ctx.beginPath();
      ctx.moveTo(0, -31);
      ctx.lineTo(-5.5, 16);
      ctx.lineTo(0, 11);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = isWinnerLanded ? '#dc2626' : '#334155';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -31);
      ctx.lineTo(0, 11);
      ctx.stroke();

      ctx.restore();
    };

    const render = (now: number) => {
      if (!running) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      const t = now / 1000;
      const st = stateRef.current;

      let teacherState: 'writing' | 'surprised' | 'smile' = 'writing';
      let teacherSpeech = '✍️ Hôm nay kiểm tra bài cũ nhé!';

      if (dangChoi && st.planes.length > 0) {
        const elapsed = Math.max(0, now - st.startTime);
        const winnerPlane = st.planes[st.winnerPlaneIdx];
        const isWinnerLanded = winnerPlane.status === 'landed';

        // Thỉnh thoảng sinh vệt gió nhẹ ngang lớp
        if (!isWinnerLanded && randomInt(70) === 0 && st.breezes.length < 6) {
          const dir = randomInt(2) === 0 ? 1 : -1;
          st.breezes.push({
            x: dir === 1 ? -120 : CANVAS_W + 120,
            y: randomRange(245, 420),
            vx: dir * randomRange(220, 340),
            len: randomRange(75, 135),
            alpha: randomRange(0.3, 0.55)
          });
        }

        // Cập nhật từng chiếc máy bay giấy trong chuỗi phóng nối tiếp 1 + 3!
        st.planes.forEach(pl => {
          if (elapsed < pl.launchMs) {
            pl.status = 'waiting';
            return;
          }

          const flyElapsed = elapsed - pl.launchMs;
          const u = Math.max(0, Math.min(1, flyElapsed / pl.flightDurMs));

          if (!pl.playedLaunchSfx) {
            pl.playedLaunchSfx = true;
            // Làm các bạn học sinh gần cột bàn phóng giơ tay tung máy bay!
            st.deskStudents.forEach(ds => {
              if (Math.abs(ds.x - pl.sx) < 95 && Math.abs(ds.y - pl.sy) < 75) {
                ds.throwUntilMs = now + 700;
              }
            });
            if (pl.isWinner || pl.isCloseCall || pl.id % 4 === 0) {
              amThanh.phatTiengGioQuat();
            }
          }

          if (u < 1) {
            pl.status = 'flying';
            // Đường cong Bezier bậc 2 siêu mượt + độ cao 2.5D hình parabol!
            const ease = 1 - Math.pow(1 - u, 1.32);
            const inv = 1 - ease;
            const bx = inv * inv * pl.sx + 2 * inv * ease * pl.ctrlX + ease * ease * pl.ex;
            const by = inv * inv * pl.sy + 2 * inv * ease * pl.ctrlY + ease * ease * pl.ey;

            // Độ cao vồng lên giữa đường -> PHÓNG TO khi bay cao qua đầu, rồi thu nhỏ dần khi tiến sâu lên Bục Giảng!
            const alt = Math.sin(ease * Math.PI) * pl.peakAlt;
            const depthScale = (1.12 - ease * 0.28) + Math.sin(ease * Math.PI) * 0.28;

            // Đạo hàm ngang Bezier -> mũi LUÔN hướng thẳng lên trên, chỉ nghiêng nhẹ tối đa ±18° (±0.31 rad)!
            const dxdt = 2 * inv * (pl.ctrlX - pl.sx) + 2 * ease * (pl.ex - pl.ctrlX);
            const gentleSway = Math.sin(u * Math.PI * 2 + pl.id) * 0.04;
            const targetTilt = Math.max(-0.31, Math.min(0.31, dxdt / 760 + gentleSway));

            pl.x = bx;
            pl.y = by;
            pl.altitude = alt;
            pl.scale = depthScale;
            pl.tilt += (targetTilt - pl.tilt) * Math.min(1, dt * 8);

            pl.trail.push({ x: pl.x, y: pl.y });
            if (pl.trail.length > 16) pl.trail.shift();

            // Kích hoạt phản ứng "Suýt đáp trúng mép Bàn Cô!" ở 80% đường bay
            if (pl.isCloseCall && ease > 0.78 && !pl.playedCloseSfx) {
              pl.playedCloseSfx = true;
              st.closeCallText = `😱 SUÝT TRÚNG! Máy bay của ${pl.hs.ten} lướt sát mép Bàn Cô rồi trượt xuống bục!`;
              st.closeCallUntilMs = now + 2600;
            }
          } else if (pl.status !== 'landed') {
            pl.status = 'landed';
            pl.x = pl.ex;
            pl.y = pl.ey;
            pl.altitude = 0;
            pl.scale = pl.isWinner ? 1.06 : 0.78;
            pl.tilt = pl.isWinner ? 0.08 : Math.max(-0.28, Math.min(0.28, pl.tilt));
            pl.trail = [];

            if (pl.isWinner) {
              st.landedAtMs = now;
              amThanh.phatTiengMayBayDap();
              spawnLandStars(DESK_TARGET_X, DESK_TARGET_Y - 6);
            }
          }
        });

        // Phản ứng của Cô Giáo áo dài vàng!
        if (isWinnerLanded) {
          teacherState = 'smile';
          teacherSpeech = `😊 Mời ${winnerPlane.hs.ten} lên bảng nhé!`;
        } else if (now < st.closeCallUntilMs) {
          teacherState = 'surprised';
          teacherSpeech = '😮 Suýt nữa đáp trúng bàn cô rồi!!';
        } else if (elapsed > 1400) {
          teacherState = 'surprised';
          teacherSpeech = '😮 Ôi máy bay giấy bay lên bảng kìa!';
        }

        // Cập nhật HUD nhịp diễn biến (không lộ giây kết thúc!)
        if (now - st.lastHudMs > 220) {
          st.lastHudMs = now;
          const flyingCount = st.planes.filter(p => p.status === 'flying').length;
          const landedCount = st.planes.filter(p => p.status === 'landed' && !p.isWinner).length;
          if (isWinnerLanded) {
            setHudText(`✈️ ĐÁP CHUẨN BÀN GIÁO VIÊN! Mời ${winnerPlane.hs.ten} lên bảng tỏa sáng!`);
          } else if (now < st.closeCallUntilMs && st.closeCallText) {
            setHudText(st.closeCallText);
          } else {
            setHudText(
              `✈️ ${flyingCount} máy bay đang lượn lên bục • ${landedCount} chiếc đã đáp xuống sàn (${danhSach.length} HS)`
            );
          }
        }

        if (isWinnerLanded && st.landedAtMs > 0) {
          st.camZoom += (1.14 - st.camZoom) * Math.min(1, dt * 3.8);
          if (now - st.landedAtMs >= 1950 && !st.daKetThuc) {
            st.daKetThuc = true;
            amThanh.phatTiengChucMung();
            onHoanThanhRef.current(winnerPlane.hs);
          }
        }
      } else {
        st.camZoom += (1 - st.camZoom) * Math.min(1, dt * 5);
      }

      // Cập nhật vệt gió & pháo sao
      st.breezes.forEach(b => {
        b.x += b.vx * dt;
        b.alpha -= dt * 0.42;
      });
      st.breezes = st.breezes.filter(b => b.alpha > 0);

      st.sparkles.forEach(s => {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vy += 260 * dt;
        s.alpha -= dt * 0.58;
      });
      st.sparkles = st.sparkles.filter(s => s.alpha > 0);

      // === VẼ KHUNG HÌNH ===
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      ctx.save();
      if (st.camZoom > 1.001) {
        const pivotX = DESK_TARGET_X + 60;
        const pivotY = 195;
        ctx.translate(pivotX, pivotY);
        ctx.scale(st.camZoom, st.camZoom);
        ctx.translate(-pivotX, -pivotY);
      }

      drawVerticalClassroom(t, now, teacherState, teacherSpeech);

      // Vẽ vệt gió nhẹ ngang phòng
      st.breezes.forEach(b => {
        ctx.save();
        ctx.strokeStyle = `rgba(186, 230, 253, ${b.alpha})`;
        ctx.lineWidth = 2.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.quadraticCurveTo(b.x + b.len * 0.5, b.y - 9, b.x + b.len, b.y + 3);
        ctx.stroke();
        ctx.restore();
      });

      if (!dangChoi && st.landedAtMs === 0) {
        // Trạng thái chờ: 6 chiếc máy bay giấy Origami mẫu hướng thẳng lên Bàn Giáo Viên đặt ngay trên 6 bàn!
        let pIdx = 0;
        DESK_ROWS_Y.forEach(ry => {
          DESK_COLS.forEach(cx => {
            const preview: OrigamiPlane = {
              id: pIdx,
              hs: danhSach[pIdx % Math.max(1, danhSach.length)] ?? { id: 'p', ten: '', daDuocChon: false },
              isWinner: false,
              isCloseCall: false,
              palette: PAPER_PALETTES[pIdx % PAPER_PALETTES.length],
              launchMs: 0,
              flightDurMs: 1,
              sx: cx,
              sy: ry - 10,
              ctrlX: cx,
              ctrlY: ry - 10,
              ex: cx,
              ey: ry - 10,
              peakAlt: 0,
              x: cx,
              y: ry - 12 + Math.sin(t * 2.5 + pIdx) * 2,
              tilt: Math.sin(t * 1.8 + pIdx) * 0.06,
              scale: 0.9,
              altitude: 6,
              status: 'flying',
              playedLaunchSfx: false,
              playedCloseSfx: false,
              trail: []
            };
            drawOrigamiPlane(preview, false);
            pIdx++;
          });
        });
      } else {
        // LỚP 1: Vẽ toàn bộ các máy bay rơi đã nằm lại dưới sàn (KHÔNG biến mất, nằm gọn phía dưới máy bay đang bay!)
        st.planes
          .filter(pl => pl.status === 'landed' && !pl.isWinner)
          .forEach(pl => drawOrigamiPlane(pl, false));

        // LỚP 2: Vẽ các máy bay ĐANG BAY trên không (và chiếc Winner đáp Bàn GV) nổi bật phía trên!
        const activePlanes = st.planes
          .filter(pl => pl.status === 'flying' || (pl.status === 'landed' && pl.isWinner))
          .sort((a, b) => a.altitude - b.altitude || (a.isWinner ? 1 : 0) - (b.isWinner ? 1 : 0));

        activePlanes.forEach(pl => drawOrigamiPlane(pl, pl.isWinner && pl.status === 'landed'));

        // LỚP 3: Chỉ hiện bảng tên rõ nét cho những chiếc ĐANG BAY (tối đa 6 chiếc) hoặc chiếc Winner đã đáp Bàn Cô!
        const labelTargets =
          st.landedAtMs > 0
            ? [st.planes[st.winnerPlaneIdx]]
            : activePlanes
                .filter(pl => pl.status === 'flying')
                .sort((a, b) => a.y - b.y)
                .slice(0, 6);

        const usedLabels: { x: number; y: number }[] = [];
        labelTargets.forEach(pl => {
          const winDone = pl.isWinner && pl.status === 'landed';
          const lx = Math.max(92, Math.min(CANVAS_W - 92, pl.x));
          // Đặt bảng tên gọn ngay phía trên (khi đáp) hoặc ngay dưới đuôi cánh (khi đang bay) để không che mũi máy bay!
          let ly = winDone ? pl.y - 42 : pl.y + 34 * pl.scale;
          let guard = 0;
          while (
            guard < 8 &&
            usedLabels.some(p => Math.abs(p.x - lx) < 154 && Math.abs(p.y - ly) < 30)
          ) {
            ly += winDone ? -30 : 30;
            guard++;
          }
          ly = Math.max(66, Math.min(CANVAS_H - 22, ly));
          usedLabels.push({ x: lx, y: ly });
          veBangTenHocSinh(ctx, lx, ly, pl.hs.ten, {
            highlight: winDone || pl.isCloseCall,
            prefix: winDone ? '👑 ' : '✈️ '
          });
        });
      }

      // Pháo sao rực rỡ khi đáp trúng Bàn Giáo Viên
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
          border: '2px solid #f59e0b',
          background: '#fefce8'
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
              : 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)',
            color: '#ffffff',
            border: dangChoi ? 'none' : '2px solid #bae6fd',
            padding: '11px 38px',
            borderRadius: '30px',
            fontSize: '1.04rem',
            fontWeight: 900,
            cursor: dangChoi || danhSach.length === 0 ? 'not-allowed' : 'pointer',
            boxShadow: dangChoi ? 'none' : '0 6px 22px rgba(37, 99, 235, 0.42)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>{dangChoi ? '✈️ Máy bay đang lượn nối tiếp lên Bàn Cô...' : '✈️ PHÓNG MÁY BAY GIẤY LÊN BỤC GIẢNG'}</span>
        </button>
      </div>
    </div>
  );
};
