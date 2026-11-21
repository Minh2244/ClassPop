// Dịch vụ âm thanh sử dụng Web Audio API (hoạt động offline, không cần tải tệp ngoài)

class TrinhQuanLyAmThanh {
  private ctx: AudioContext | null = null;
  private daBat: boolean = true;

  constructor() {
    // Khởi tạo AudioContext khi có tương tác người dùng
  }

  private layContext(): AudioContext | null {
    if (!this.daBat) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public datTrangThaiAmThanh(bat: boolean) {
    this.daBat = bat;
  }

  public dangBat(): boolean {
    return this.daBat;
  }

  // Tiếng kim gõ nhẹ khi vòng quay qua từng ô hoặc chuyển hộp
  public phatTiengTick() {
    const ctx = this.layContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      // Bỏ qua lỗi audio nếu trình duyệt hạn chế
    }
  }

  // Tiếng mở hộp bí ẩn thần bí
  public phatTiengMoHop() {
    const ctx = this.layContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const nots = [330, 392, 494, 587, 659, 784];
      nots.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0, now + idx * 0.06);
        gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.06 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.3);
      });
    } catch {
      // Audio fallback
    }
  }

  // Tiếng nhạc chiến thắng / chúc mừng khi kết quả xuất hiện
  public phatTiengChucMung() {
    const ctx = this.layContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Hợp âm chiến thắng rực rỡ C major -> G -> C (octave cao)
      const giaiDieu = [
        { f: 523.25, t: 0.0, d: 0.15 }, // C5
        { f: 659.25, t: 0.12, d: 0.15 }, // E5
        { f: 783.99, t: 0.24, d: 0.2 },  // G5
        { f: 1046.50, t: 0.40, d: 0.6 }, // C6 kéo dài
      ];

      giaiDieu.forEach(note => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note.f, now + note.t);

        gain.gain.setValueAtTime(0, now + note.t);
        gain.gain.linearRampToValueAtTime(0.3, now + note.t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + note.d);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + note.t);
        osc.stop(now + note.t + note.d);
      });
    } catch {
      // Audio fallback
    }
  }

  // Tiếng nảy bi Plinko / mồi câu
  public plinkoNay() {
    this.phatTiengTick();
  }

  // Tiếng động vật bật nhảy qua rào
  public dongVatNhay() {
    const ctx = this.layContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(280, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(560, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Fallback
    }
  }

  // Tiếng vịt kêu "Cạp! Cạp!" vui nhộn cho trò Đua Vịt
  public phatTiengVitKeu() {
    const ctx = this.layContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      const baseFreq = 310 + Math.random() * 65;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.linearRampToValueAtTime(baseFreq * 1.42, now + 0.045);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.78, now + 0.14);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(950, now);
      filter.Q.setValueAtTime(3.2, now);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.22, now + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.008, now + 0.14);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // Fallback
    }
  }

  // Tiếng mô-tơ càng gắp thú bông
  public phatTiengCangGap() {
    const ctx = this.layContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.linearRampToValueAtTime(420, now + 0.14);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.008, now + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    } catch {
      // Fallback
    }
  }

  // Tiếng tuột càng rơi thú bông ("Ối!")
  public phatTiengTuotCang() {
    const ctx = this.layContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.28);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.008, now + 0.30);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.30);
    } catch {
      // Fallback
    }
  }

  // Tiếng đập nứt vỏ trứng rồng & sấm sét
  public phatTiengNutTrung() {
    const ctx = this.layContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.18);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.008, now + 0.20);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.20);
    } catch {
      // Fallback
    }
  }

  // Tiếng tích tắc đồng hồ bom hẹn giờ (tăng cao độ khi sắp nổ)
  public phatTiengBomTick(khanCap: boolean = false) {
    const ctx = this.layContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      const freq = khanCap ? 980 : 680;
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + 0.05);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.008, now + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } catch {
      // Fallback
    }
  }

  // Tiếng nổ "BÙM!" vui nhộn khi bom hẹn giờ hết giờ
  public phatTiengBomNo() {
    const ctx = this.layContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.45);
      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.008, now + 0.48);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.48);
    } catch {
      // Fallback
    }
  }

  // Tiếng chùm tia UFO quét & hút lên (sci-fi warble)
  public phatTiengUfoHut() {
    const ctx = this.layContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(760, now + 0.45);

      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(16, now);
      lfoGain.gain.setValueAtTime(45, now);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.008, now + 0.48);

      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      osc.connect(gain);
      gain.connect(ctx.destination);

      lfo.start(now);
      osc.start(now);
      lfo.stop(now + 0.5);
      osc.stop(now + 0.5);
    } catch {
      // Fallback
    }
  }

  // Tiếng UFO thả rơi hụt (trượt xuống hài hước)
  public phatTiengUfoThaRoi() {
    const ctx = this.layContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.36);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.008, now + 0.38);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch {
      // Fallback
    }
  }

  // Tiếng tia điện / đóng công tắc chia nhánh (Dòng Điện Xuyên Hầm)
  public phatTiengTiaSet(caoTrao: boolean = false) {
    const ctx = this.layContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      const startF = caoTrao ? 1200 : 820;
      const endF = caoTrao ? 280 : 210;
      const dur = caoTrao ? 0.32 : 0.16;

      osc.frequency.setValueAtTime(startF, now);
      osc.frequency.exponentialRampToValueAtTime(endF, now + dur);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(caoTrao ? 1500 : 1050, now);
      filter.Q.setValueAtTime(2.5, now);

      gain.gain.setValueAtTime(caoTrao ? 0.24 : 0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.008, now + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + dur + 0.02);
    } catch {
      // Fallback
    }
  }

  // Tiếng vồ hụt (whoosh trượt xuống vui nhộn — Bịt Mắt Bắt Dê)
  public phatTiengVoHut() {
    const ctx = this.layContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(460, now);
      osc.frequency.exponentialRampToValueAtTime(175, now + 0.22);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.008, now + 0.23);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.24);
    } catch {
      // Fallback
    }
  }

  // Tiếng bắt dính (boing-pop bật nảy — Bịt Mắt Bắt Dê)
  public phatTiengBatDinh() {
    const ctx = this.layContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.16);
      gain.gain.setValueAtTime(0.26, now);
      gain.gain.exponentialRampToValueAtTime(0.008, now + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch {
      // Fallback
    }
  }

  // Tiếng gió quạt trần thổi xoáy (white-noise bandpass — Phóng Máy Bay Giấy)
  public phatTiengGioQuat() {
    const ctx = this.layContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const dur = 0.38;
      const sampleCount = Math.floor(ctx.sampleRate * dur);
      const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < sampleCount; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(360, now);
      filter.frequency.exponentialRampToValueAtTime(920, now + 0.18);
      filter.frequency.exponentialRampToValueAtTime(380, now + dur);
      filter.Q.setValueAtTime(2.0, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.16, now + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.008, now + dur);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + dur + 0.02);
    } catch {
      // Fallback
    }
  }

  // Tiếng máy bay đáp gọn lên Bàn Giáo Viên (chime sáng nhẹ)
  public phatTiengMayBayDap() {
    const ctx = this.layContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [660, 990].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);
        gain.gain.setValueAtTime(0.22, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.008, now + idx * 0.05 + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.24);
      });
    } catch {
      // Fallback
    }
  }

  // Tiếng dây nhảy vút qua không khí (cao độ tăng theo tốc độ — Nhảy Dây Tập Thể)
  public phatTiengQuayDay(tocDo: number = 1) {
    const ctx = this.layContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const dur = 0.09;
      const sampleCount = Math.floor(ctx.sampleRate * dur);
      const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < sampleCount; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      const clampedSpeed = Math.max(0.7, Math.min(2.6, tocDo));
      filter.frequency.setValueAtTime(340 * clampedSpeed, now);
      filter.Q.setValueAtTime(2.6, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.11 + clampedSpeed * 0.025, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.006, now + dur);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + dur + 0.01);
    } catch {
      // Fallback
    }
  }

  // Tiếng vấp dây hoạt hình hài hước (boing-bonk — Nhảy Dây Tập Thể)
  public phatTiengVapDay() {
    const ctx = this.layContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(245, now);
      osc.frequency.exponentialRampToValueAtTime(92, now + 0.26);
      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.008, now + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.29);
    } catch {
      // Fallback
    }
  }

  // Tiếng đá cầu "pốc!" đặc trưng đế cầu cao su (nếu xoay=true thêm tiếng rít cao — Đá Cầu Ra Chơi)
  public phatTiengDaCau(xoay: boolean = false) {
    const ctx = this.layContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(xoay ? 260 : 210, now);
      osc.frequency.exponentialRampToValueAtTime(88, now + 0.075);
      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.008, now + 0.085);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);

      if (xoay) {
        const whistle = ctx.createOscillator();
        const wGain = ctx.createGain();
        whistle.type = 'triangle';
        whistle.frequency.setValueAtTime(760, now + 0.03);
        whistle.frequency.exponentialRampToValueAtTime(1280, now + 0.24);
        wGain.gain.setValueAtTime(0.12, now + 0.03);
        wGain.gain.exponentialRampToValueAtTime(0.006, now + 0.26);
        whistle.connect(wGain);
        wGain.connect(ctx.destination);
        whistle.start(now + 0.03);
        whistle.stop(now + 0.28);
      }
    } catch {
      // Fallback
    }
  }

  // Tiếng quả cầu rơi chạm sân (tụt-tụt nhẹ — Đá Cầu Ra Chơi)
  public phatTiengCauRoi() {
    const ctx = this.layContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(135, now + 0.28);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.008, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.31);
    } catch {
      // Fallback
    }
  }

  // Alias âm thanh chiến thắng
  public chienThang() {
    this.phatTiengChucMung();
  }
}

export const amThanh = new TrinhQuanLyAmThanh();
