// Danh mục 6 trò chơi bốc thăm học sinh theo thiết kế nâng cấp Lucky Class

export interface ThongTinTroChoi {
  id: string;
  ten: string;
  icon: string;
  thoiLuong: string;
  moTa: string;
  sanSang: boolean;
}

export const DANH_SACH_6_TRO_CHOI: ThongTinTroChoi[] = [
  {
    id: 'vong-quay-may-man',
    ten: 'Vòng Quay May Mắn',
    icon: '🎯',
    thoiLuong: '15 giây',
    moTa: 'Vòng quay nhiều màu sắc, kim chỉ hồi hộp với hiệu ứng giảm tốc mượt mà.',
    sanSang: true
  },
  {
    id: 'bi-lien-hoan',
    ten: 'Bi Liên Hoàn',
    icon: '🌀',
    thoiLuong: '45 giây',
    moTa: 'Máng trượt bi ve liên hoàn: Dốc zíc zắc, quạt gió, rừng đinh Plinko, bánh xe quay và phễu dồn về đích!',
    sanSang: true
  },
  {
    id: 'dua-dong-vat',
    ten: 'Đua Động Vật',
    icon: '🏃🐾',
    thoiLuong: '45 giây',
    moTa: 'Các nhân vật thú cưng siêu đáng yêu (mèo, chó, thỏ, sư tử, cáo...) nhún nhảy chạy đua và vượt rào cản.',
    sanSang: true
  },
  {
    id: 'hop-bi-an',
    ten: 'Hộp Quà May Mắn',
    icon: '🎁',
    thoiLuong: 'Tự do bấm chọn',
    moTa: 'Học sinh ẩn giấu trong các hộp quà bí ẩn. Thầy cô hoặc học sinh tự bấm chọn hộp mình thích để mở!',
    sanSang: true
  },
  {
    id: 'cau-ca-tim-ten',
    ten: 'Câu Cá Tìm Tên',
    icon: '🎣🐟',
    thoiLuong: '40 giây',
    moTa: 'Thả mồi câu xuống mặt hồ gợn sóng, cá bơi lội tò mò vờn mồi trước khi chú cá may mắn cắn câu giật lên.',
    sanSang: true
  },
  {
    id: 'phong-ten-lua',
    ten: 'Phóng Tên Lửa',
    icon: '🚀',
    thoiLuong: '25 giây',
    moTa: 'Đếm ngược 3-2-1 cất cánh xuyên qua tầng mây lên vũ trụ, vượt thiên thạch và cắm cờ chiến thắng trên Mặt Trăng!',
    sanSang: true
  },
  {
    id: 'dua-vit',
    ten: 'Đua Vịt Qua Sông',
    icon: '🦆🏁',
    thoiLuong: '30 giây',
    moTa: 'Đàn vịt cao su đủ màu sắc có số đeo trên cánh bơi đua rượt đuổi dọc bờ sông và chạm mỏ qua vạch đích ca-rô nghiêng!',
    sanSang: true
  },
  {
    id: 'may-gap-thu',
    ten: 'Máy Gắp Thú Bông',
    icon: '🕹️🧸',
    thoiLuong: 'Tối đa 25 giây',
    moTa: 'Tủ máy gắp thú bông Kawaii Hồng-Xanh Neon: Sau 5 giây càng gắp bắt đầu gắp ngẫu nhiên hên xui (có thể trúng sớm hoặc tuột càng gắp lại trong tối đa 25 giây)!',
    sanSang: true
  },
  {
    id: 'chuyen-bom',
    ten: 'Bom Hẹn Giờ',
    icon: '💣⏱️',
    thoiLuong: '30 giây',
    moTa: 'Vòng tròn học sinh nhìn từ trên cao truyền tay nhau quả bom hẹn giờ theo chiều kim đồng hồ cực kỳ hồi hộp!',
    sanSang: true
  },
  {
    id: 'ufo-hut-nguoi',
    ten: 'Đĩa Bay UFO Hút Người',
    icon: '🛸',
    thoiLuong: 'Tối đa 25 giây',
    moTa: 'Đĩa bay UFO lượn qua sân trường học rực nắng, kéo 1–3 bạn cùng lúc cực hài và có thể trúng bất ngờ ngay lượt 1, 2, 3 hoặc 4!',
    sanSang: true
  },
  {
    id: 'dong-dien-chia-nhanh',
    ten: 'Dòng Điện Xuyên Hầm',
    icon: '⚡',
    thoiLuong: '18 giây',
    moTa: 'Camera bám sát quả cầu tia sét chạy xuyên từng đường hầm kính chia nhánh (cân 100–1000+ HS) tiến vào Hầm Chung Kết chốt người thắng!',
    sanSang: true
  },
  {
    id: 'bit-mat-bat-de',
    ten: 'Bịt Mắt Bắt Dê',
    icon: '🙈',
    thoiLuong: 'Tối đa 30 giây',
    moTa: 'Sân cờ nắng sớm: Bạn Sao Đỏ bịt khăn đỏ xoay vòng rượt bắt & tung cú ngoắt 180° tóm bất ngờ 1 học sinh lên bảng tỏa sáng!',
    sanSang: true
  },
  {
    id: 'phong-may-bay-giay',
    ten: 'Phóng Máy Bay Giấy',
    icon: '✈️',
    thoiLuong: 'Tối đa 30 giây',
    moTa: 'Phòng học bảng xanh với Cô Giáo mặc áo dài vàng: Cả lớp phóng mưa máy bay giấy xuyên qua 3 quạt trần thổi gió xoáy về phía Bàn Giáo Viên!',
    sanSang: true
  },
  {
    id: 'nhay-day-tap-the',
    ten: 'Nhảy Dây Tập Thể',
    icon: '🪢',
    thoiLuong: 'Tối đa 30 giây',
    moTa: 'Dưới tán cây phượng vĩ đỏ: Cả lớp nối đuôi chạy vòng số 8 qua dây quay đổi nhịp lắt léo, ai bất ngờ vấp dây sẽ bước lên bảng tỏa sáng!',
    sanSang: true
  },
  {
    id: 'da-cau-ra-choi',
    ten: 'Đá Cầu Ra Chơi',
    icon: '🏸',
    thoiLuong: 'Tối đa 30 giây',
    moTa: 'Sân thể dục chiều nắng vàng: Camera lướt theo quả cầu lông 3 màu với pha cứu cầu quay chậm (Slow-Mo) & cú cầu xoáy bất ngờ!',
    sanSang: true
  }
];

export const DANH_SACH_9_TRO_CHOI = DANH_SACH_6_TRO_CHOI;
export const DANH_SACH_TRO_CHOI = DANH_SACH_6_TRO_CHOI;
