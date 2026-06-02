import React, { useState } from 'react';
import { 
  Megaphone, 
  Sparkles, 
  Plus, 
  TrendingUp, 
  DollarSign, 
  Eye, 
  MousePointerClick, 
  CheckCircle, 
  Copy, 
  Check, 
  Calendar, 
  Share2, 
  ExternalLink,
  ChevronRight,
  Filter,
  Trash2,
  AlertCircle
} from 'lucide-react';

interface MarketingCampaign {
  id: string;
  name: string;
  channel: 'Facebook' | 'TikTok' | 'Zalo' | 'Google Maps' | 'KOL/KOC';
  budget: number;
  spent: number;
  reach: number;
  clicks: number;
  conversions: number;
  status: 'active' | 'scheduled' | 'paused' | 'ended';
  startDate: string;
  endDate: string;
}

const INITIAL_CAMPAIGNS: MarketingCampaign[] = [
  {
    id: 'camp-1',
    name: 'Đại tiệc iPhone 11 - Giá hủy diệt học sinh sinh viên',
    channel: 'Facebook',
    budget: 8000000,
    spent: 4500000,
    reach: 52000,
    clicks: 3400,
    conversions: 45,
    status: 'active',
    startDate: '2026-05-20',
    endDate: '2026-06-05'
  },
  {
    id: 'camp-2',
    name: 'Thu cũ đổi mới 18 bước tiêu chuẩn - Lên đời iPhone 15 Pro Max',
    channel: 'TikTok',
    budget: 15000000,
    spent: 12000000,
    reach: 185000,
    clicks: 14200,
    conversions: 88,
    status: 'active',
    startDate: '2026-05-15',
    endDate: '2026-05-31'
  },
  {
    id: 'camp-3',
    name: 'Khai trương quầy phụ kiện VIP - Tặng dán cường lực trọn đời',
    channel: 'Google Maps',
    budget: 3000000,
    spent: 1500000,
    reach: 22000,
    clicks: 1800,
    conversions: 120,
    status: 'active',
    startDate: '2026-05-25',
    endDate: '2026-06-10'
  },
  {
    id: 'camp-4',
    name: 'Chiến dịch Livestream TikTok Shop - Xả kho iPad Air 5 cũ',
    channel: 'KOL/KOC',
    budget: 12000000,
    spent: 0,
    reach: 0,
    clicks: 0,
    conversions: 0,
    status: 'scheduled',
    startDate: '2026-06-02',
    endDate: '2026-06-04'
  },
  {
    id: 'camp-5',
    name: 'Gửi tin nhắn Chăm sóc khách hàng cũ - Tri ân bảo hành 0đ',
    channel: 'Zalo',
    budget: 2000000,
    spent: 2000000,
    reach: 8500,
    clicks: 1540,
    conversions: 55,
    status: 'ended',
    startDate: '2026-05-01',
    endDate: '2026-05-10'
  }
];

const PRESET_COPYWRITING = {
  iphone15: {
    title: '🔥 SIÊU PHẨM TRÌNH LÀNG - MR. TÁO SẴN HÀNG 🍎',
    features: [
      '🚀 Thiết kế titanium bền bỉ, sang trọng bậc nhất vũ trụ công nghệ.',
      '📸 Camera 48MP siêu sắc nét - Zoom quang học 5x cực đỉnh không góc chết.',
      '🔋 Pin trâu vượt mong đợi, cân mọi tác vụ nặng nhất từ sáng đến đêm.'
    ],
    offer: '🎁 ĐẶC QUYỀN CHỈ CÓ TẠI MR. TÁO:\n- Thu cũ đổi mới trợ giá lên tới 2 TRIỆU ĐỒNG.\n- Tặng gói bảo hành VIP Nguồn & Màn hình 12 tháng.\n- Dán cường lực Free trọn đời máy.'
  },
  iphone11: {
    title: '🎓 HỌC SINH SINH VIÊN - CHỐT LIỀN IPHONE 11 GIÁ HUỶ DIỆT 🍎',
    features: [
      '✨ Hiệu năng mượt mà, pin khỏe, thiết kế nhiều màu sắc cực trend.',
      '📸 Camera kép chụp đêm siêu nét, cân trọn mọi hoạt động học tập, giải trí.',
      '🛡️ Máy chuẩn Zin 100% qua kiểm định thẩm định 18 bước ngặt nghèo.'
    ],
    offer: '🎁 GIÁ SỐC ĐẦU HÈ:\n- Chỉ từ 5.x TRIỆU ĐỒNG - Hỗ trợ trả góp 0% lãi suất.\n- Tặng ngay cáp sạc nhanh 20W chuẩn hãng.\n- Giảm thêm 200k khi trình thẻ Học sinh / Sinh viên.'
  },
  accessory: {
    title: '🔋 QUẦY PHỤ KIỆN CHẤT - GIÁ RẺ NHẤT PHÂN KHÚC 🍎',
    features: [
      '🛡️ Ốp lưng chống sốc xịn sò bảo vệ máy tuyệt đối.',
      '⚡ Sạc nhanh 20W - Đạt chuẩn MFi an toàn cho thiết bị.',
      '🎧 Tai nghe AirPods Rep 1:1 bass cực căng, kết nối cực nhạy.'
    ],
    offer: '🎁 KHUYẾN MÃI BÙNG NỔ:\n- Mua combo cáp sạc giảm ngay 35%.\n- Miễn phí dán màn hình cường lực trọn đời cho gói dịch vụ VIP.\n- Bảo hành 1 đổi 1 trong vòng 6 tháng lỗi nhà sản xuất.'
  }
};

export default function MarketingView() {
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>(INITIAL_CAMPAIGNS);
  const [filterChannel, setFilterChannel] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');

  // New Campaign Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCampaign, setNewCampaign] = useState<Omit<MarketingCampaign, 'id' | 'spent' | 'reach' | 'clicks' | 'conversions'>>({
    name: '',
    channel: 'Facebook',
    budget: 5000000,
    status: 'scheduled',
    startDate: '',
    endDate: ''
  });

  // AI Assistant Generator State
  const [aiProduct, setAiProduct] = useState<'iphone15' | 'iphone11' | 'accessory'>('iphone15');
  const [aiAngle, setAiAngle] = useState<'price' | 'vip' | 'tradein'>('vip');
  const [aiTone, setAiTone] = useState<'hype' | 'professional' | 'humorous'>('hype');
  const [generatedText, setGeneratedText] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Stats calculation
  const totalBudget = campaigns.reduce((sum, c) => sum + c.budget, 0);
  const totalSpent = campaigns.reduce((sum, c) => sum + c.spent, 0);
  const totalReach = campaigns.reduce((sum, c) => sum + c.reach, 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0);
  const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0);
  const avgCpc = totalClicks > 0 ? (totalSpent / totalClicks) : 0;
  const avgCpa = totalConversions > 0 ? (totalSpent / totalConversions) : 0;

  const handleAddCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaign.name.trim()) return;

    const created: MarketingCampaign = {
      ...newCampaign,
      id: `camp-${Date.now()}`,
      spent: 0,
      reach: 0,
      clicks: 0,
      conversions: 0
    };

    setCampaigns([created, ...campaigns]);
    setShowAddForm(false);
    // Reset form
    setNewCampaign({
      name: '',
      channel: 'Facebook',
      budget: 5000000,
      status: 'scheduled',
      startDate: '',
      endDate: ''
    });
  };

  const handleDeleteCampaign = (id: string) => {
    setCampaigns(campaigns.filter(c => c.id !== id));
  };

  const handleToggleStatus = (id: string) => {
    setCampaigns(campaigns.map(c => {
      if (c.id === id) {
        const statuses: MarketingCampaign['status'][] = ['active', 'scheduled', 'paused', 'ended'];
        const currentIdx = statuses.indexOf(c.status);
        const nextIdx = (currentIdx + 1) % statuses.length;
        return { ...c, status: statuses[nextIdx] };
      }
      return c;
    }));
  };

  const handleSimulateStats = (id: string) => {
    // Randomly increase reach, clicks and conversions to simulate real-time ad serving
    setCampaigns(campaigns.map(c => {
      if (c.id === id && c.status === 'active') {
        const adSpend = Math.floor(Math.random() * 500000) + 100000;
        const extraReach = Math.floor(adSpend * 0.05);
        const extraClicks = Math.floor(extraReach * 0.08);
        const extraConversions = Math.floor(extraClicks * 0.02);

        return {
          ...c,
          spent: Math.min(c.budget, c.spent + adSpend),
          reach: c.reach + extraReach,
          clicks: c.clicks + extraClicks,
          conversions: c.conversions + extraConversions
        };
      }
      return c;
    }));
  };

  // Sleek copywriting maker logic
  const handleGenerateCopywriting = () => {
    setGenerating(true);
    setTimeout(() => {
      const preset = PRESET_COPYWRITING[aiProduct];
      let intro = preset.title;
      let bodyLines = [...preset.features];
      let specialOffer = preset.offer;

      if (aiAngle === 'price') {
        intro = `🤑 GIÁ SHOCK TOÀN CHI NHÁNH - SĂN SALE CÙNG MR. TÁO 🍏`;
        specialOffer = specialOffer.replace('VẬP', 'GIẢM NGAY 1,000,000Đ THẲNG VÀO GIÁ MÁY');
      } else if (aiAngle === 'tradein') {
        intro = `♻️ THU CŨ ĐỔI MỚI - LÊN ĐỜI KHÔNG BÙ TIỀN TẠI MR. TÁO 🍏`;
        bodyLines.push('👉 Cam kết thu mua máy cũ giá cao nhất thị trường, thủ tục chớp nhoáng 10 phút.');
      }

      let toneText = '';
      if (aiTone === 'humorous') {
        toneText = '\n😜 Chỉ cần ghé Mr. Táo, sắm quả Táo chất là được "nựng" như hoàng thượng! Đừng tiếc tiền cho một chiếc dế sang xịn mịn làm bạn bè lác mắt!';
      } else if (aiTone === 'professional') {
        toneText = '\n🤝 Mr. Táo cam kết sản phẩm chính hãng, kiểm định nghiêm ngặt 18 bước tiêu chuẩn trước khi bàn giao, đem lại sự an tâm tuyệt đối.';
      } else {
        toneText = '\n⚡ SỐ LƯỢNG HẠN CHẾ ! LIÊN HỆ ĐẶT HÀNG NGAY HÔM NAY ĐỂ KHÔNG BỎ LỠ COU_PON GIẢM GIÁ 💸';
      }

      const copyOutput = `${intro}\n\n${bodyLines.join('\n')}\n\n${specialOffer}${toneText}\n\n📍 Địa chỉ: 120 Showroom Mr. Táo, Hà Nội & TP. HCM\n☎️ Hotline chốt đơn: 1900 8888\n#MrTaoStore #AppleGuanrantee #iPhoneZin #SOP_Control`;
      
      setGeneratedText(copyOutput);
      setGenerating(false);
      setCopied(false);
    }, 800);
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount).replace('₫', 'đ');
  };

  // Filter campaigns
  const filteredCampaigns = campaigns.filter(c => {
    const matchChannel = filterChannel === 'All' || c.channel === filterChannel;
    const matchStatus = filterStatus === 'All' || c.status === filterStatus;
    return matchChannel && matchStatus;
  });

  return (
    <div className="space-y-6 text-left">
      
      {/* 1. MARKETING HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200">
        <div>
          <span className="text-[10px] font-extrabold tracking-widest text-[#C21A1A] uppercase">PHÂN HỆ VẬN HÀNH</span>
          <h1 className="text-xl font-black font-display text-slate-900 mt-1 flex items-center gap-2">
            <Megaphone className="w-5.5 h-5.5 text-[#C21A1A]" />
            Quản trị &amp; Sáng tạo Marketing
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Đo lường hiệu suất quảng cáo, lên kế hoạch truyền thông và viết content quảng cáo iPhone cùng Trợ lý AI Mr. Táo.
          </p>
        </div>

        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-[#C21A1A] hover:bg-red-700 active:scale-97 text-white text-xs font-black rounded-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          TẠO CHIẾN DỊCH MỚI
        </button>
      </div>

      {/* 2. OVERALL AD PERFORMANCE STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-black uppercase tracking-wider">Ngân sách tổng</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2.5">
            <div className="text-sm font-black text-slate-800">{formatCurrency(totalBudget)}</div>
            <div className="text-[10px] text-slate-400 font-semibold mt-1">
              Thực chi: <span className="text-red-600 font-black">{formatCurrency(totalSpent)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-black uppercase tracking-wider font-sans">Lượt Tiếp Cận</span>
            <Eye className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2.5">
            <div className="text-sm font-black text-slate-800">{totalReach.toLocaleString('vi-VN')}</div>
            <div className="text-[10px] text-slate-400 font-semibold mt-1">
              Tỷ lệ nhấp CTR: <span className="text-indigo-600 font-black">{totalReach > 0 ? ((totalClicks / totalReach) * 100).toFixed(1) : 0}%</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-black uppercase tracking-wider">Lượt nhấp Click</span>
            <MousePointerClick className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2.5">
            <div className="text-sm font-black text-slate-800">{totalClicks.toLocaleString('vi-VN')}</div>
            <div className="text-[10px] text-slate-400 font-semibold mt-1">
              Giá click CPC: <span className="text-amber-600 font-bold">{formatCurrency(Math.round(avgCpc))}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-black uppercase tracking-wider">Đơn chốt / Leads</span>
            <TrendingUp className="w-4 h-4 text-[#C21A1A]" />
          </div>
          <div className="mt-2.5">
            <div className="text-sm font-black text-slate-900">{totalConversions} Khách</div>
            <div className="text-[10px] text-slate-400 font-semibold mt-1">
              Chi phí / Khách CPA: <span className="text-[#C21A1A] font-black">{formatCurrency(Math.round(avgCpa))}</span>
            </div>
          </div>
        </div>

      </div>

      {/* CREATE NEW CAMPAIGN DRAWER FORM */}
      {showAddForm && (
        <form onSubmit={handleAddCampaign} className="bg-rose-50/50 p-5 rounded-xl border border-rose-100 shadow-xs space-y-4 animate-in slide-in-from-top duration-200">
          <h3 className="font-extrabold text-xs text-[#C21A1A] uppercase tracking-wider">NHẬP THÔNG TIN CHIẾN DỊCH KHUYẾN MÃI MỚI</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-semibold text-slate-700">
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label>Tên chiến dịch quảng cáo *</label>
              <input 
                type="text" 
                required 
                placeholder="Ví dụ: Đại tiệc xả kho iPhone 12 Pro Max chào hè"
                value={newCampaign.name}
                onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                className="p-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-[#C21A1A]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label>Kênh truyền thông chính</label>
              <select 
                value={newCampaign.channel}
                onChange={(e) => setNewCampaign({ ...newCampaign, channel: e.target.value as any })}
                className="p-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-[#C21A1A]"
              >
                <option value="Facebook">Facebook Ads</option>
                <option value="TikTok">TikTok Feed / Live</option>
                <option value="Zalo">Zalo OA Broadcast</option>
                <option value="Google Maps">Google Maps Địa điểm</option>
                <option value="KOL/KOC">Hợp tác KOL/KOC</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label>Ngân sách đề xuất (VNĐ)</label>
              <input 
                type="number" 
                required 
                min="50000"
                value={newCampaign.budget}
                onChange={(e) => setNewCampaign({ ...newCampaign, budget: parseInt(e.target.value) || 0 })}
                className="p-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-[#C21A1A]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label>Ngày bắt đầu chạy</label>
              <input 
                type="date" 
                required
                value={newCampaign.startDate}
                onChange={(e) => setNewCampaign({ ...newCampaign, startDate: e.target.value })}
                className="p-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-[#C21A1A]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label>Ngày dự kiến kết thúc</label>
              <input 
                type="date" 
                required
                value={newCampaign.endDate}
                onChange={(e) => setNewCampaign({ ...newCampaign, endDate: e.target.value })}
                className="p-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-[#C21A1A]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button 
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-black rounded-lg cursor-pointer"
            >
              HỦY BỎ
            </button>
            <button 
              type="submit"
              className="px-4 py-2 bg-[#C21A1A] hover:bg-red-700 text-white text-[11px] font-black rounded-lg cursor-pointer"
            >
              DUYỆT &amp; KHỞI TẠO
            </button>
          </div>
        </form>
      )}

      {/* 3. DOUBLE SECTIONS: MARKETING CAMPAIGNS LIST & REAL-TIME AI COPYWRITING */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* LEFT COMPONENT COLUMN (8 COLS ON DESKTOP) : CAMPAIGN MONITOR */}
        <div className="xl:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-150 pb-3">
            <div>
              <span className="text-[10px] font-black uppercase text-[#C21A1A] tracking-widest block">DANH SÁCH KHUYẾN MÃI</span>
              <h2 className="text-sm font-extrabold text-slate-800 mt-0.5">Tiến độ chạy của các Chiến dịch</h2>
            </div>

            {/* Visual Filters */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select 
                value={filterChannel} 
                onChange={(e) => setFilterChannel(e.target.value)}
                className="bg-slate-50 border border-slate-200 p-1.5 rounded-lg text-[10px] font-bold text-slate-600 outline-none cursor-pointer"
              >
                <option value="All">Tất cả kênh</option>
                <option value="Facebook">Facebook</option>
                <option value="TikTok">TikTok</option>
                <option value="Zalo">Zalo</option>
                <option value="Google Maps">Google Maps</option>
                <option value="KOL/KOC">KOL/KOC</option>
              </select>

              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 p-1.5 rounded-lg text-[10px] font-bold text-slate-600 outline-none cursor-pointer"
              >
                <option value="All">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="scheduled">Đã lên lịch</option>
                <option value="paused">Tạm ngưng</option>
                <option value="ended">Đã kết thúc</option>
              </select>
            </div>
          </div>

          {filteredCampaigns.length === 0 ? (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2.5">
              <AlertCircle className="w-8 h-8 text-slate-300" />
              <p className="text-xs font-semibold">Không tìm thấy chiến dịch nào khớp bộ lọc!</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {filteredCampaigns.map((camp) => {
                const ratio = camp.budget > 0 ? (camp.spent / camp.budget) * 100 : 0;
                
                return (
                  <div key={camp.id} className="p-4 rounded-xl border border-slate-150 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 transition-all space-y-3">
                    
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase text-white ${
                            camp.channel === 'Facebook' ? 'bg-blue-600' :
                            camp.channel === 'TikTok' ? 'bg-black' :
                            camp.channel === 'Zalo' ? 'bg-sky-500' :
                            camp.channel === 'Google Maps' ? 'bg-emerald-600' : 'bg-rose-500'
                          }`}>
                            {camp.channel}
                          </span>
                          
                          <button
                            onClick={() => handleToggleStatus(camp.id)}
                            title="Nhấp để đổi trạng thái"
                            className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase transition-all cursor-pointer ${
                              camp.status === 'active' ? 'bg-emerald-100 text-emerald-800 border border-emerald-400/30' :
                              camp.status === 'scheduled' ? 'bg-amber-100 text-amber-800 border border-amber-300/30' :
                              camp.status === 'paused' ? 'bg-slate-200 text-slate-700' : 'bg-red-100 text-red-800'
                            }`}
                          >
                            ● {camp.status === 'active' ? 'HOẠT ĐỘNG' :
                               camp.status === 'scheduled' ? 'LÊN LỊCH' :
                               camp.status === 'paused' ? 'TẠM DỪNG' : 'ĐÃ CHỐT'}
                          </button>
                        </div>
                        <h4 className="text-xs font-black text-slate-800 mt-1.5 leading-snug">{camp.name}</h4>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Thời hạn: {camp.startDate} ~ {camp.endDate}</p>
                      </div>

                      <div className="flex items-center gap-1">
                        {camp.status === 'active' && (
                          <button 
                            onClick={() => handleSimulateStats(camp.id)}
                            className="px-2.5 py-1.5 bg-[#C21A1A]/10 text-[#C21A1A] hover:bg-[#C21A1A]/20 active:scale-95 text-[10px] font-black rounded-lg transition-all cursor-pointer mr-1"
                            title="Mô phỏng tăng tiếp cận và cú nhấp"
                          >
                            ⚡ LÊN MATRIX
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeleteCampaign(camp.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 active:scale-95 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Progress ratio tracker bar */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-500 mb-1">
                        <span>Đã chi: {formatCurrency(camp.spent)} / {formatCurrency(camp.budget)}</span>
                        <span>{Math.round(ratio)}% ngân sách</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${ratio > 90 ? 'bg-red-500' : 'bg-[#C21A1A]'}`}
                          style={{ width: `${Math.min(100, ratio)}%` }}
                        />
                      </div>
                    </div>

                    {/* Detailed reach counters under campaign */}
                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-150/50">
                      <div className="text-center">
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">TIẾP CẬN</div>
                        <div className="text-xs font-extrabold text-slate-700 mt-0.5">{camp.reach.toLocaleString('vi-VN')}</div>
                      </div>
                      <div className="text-center border-x border-slate-200/60">
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">CÚ NHẤP (CTR)</div>
                        <div className="text-xs font-extrabold text-slate-700 mt-0.5">
                          {camp.clicks.toLocaleString('vi-VN')} 
                          <span className="text-[10px] text-slate-400 font-medium ml-1">
                            ({camp.reach > 0 ? ((camp.clicks / camp.reach) * 100).toFixed(1) : 0}%)
                          </span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">CHUYỂN ĐỔI</div>
                        <div className="text-xs font-extrabold text-slate-900 mt-0.5">
                          {camp.conversions} Khách
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* RIGHT COLUMN COMPONENT (5 COLS ON DESKTOP) : AI COPYWRITING COPY WRITER */}
        <div className="xl:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          
          <div className="border-b border-slate-150 pb-3 flex items-center gap-2">
            <span className="h-7 w-7 rounded-lg bg-rose-50 flex items-center justify-center text-[#C21A1A]">
              <Sparkles className="w-4 h-4 text-[#C21A1A] animate-pulse" />
            </span>
            <div>
              <span className="text-[10px] font-black uppercase text-[#C21A1A] tracking-widest block">SIÊU TRỢ LÝ SÁNG TẠO</span>
              <h2 className="text-sm font-extrabold text-slate-800 mt-0.5">Mr. Táo Smart Copywriter AI</h2>
            </div>
          </div>

          <div className="space-y-3.5 text-xs font-semibold text-slate-600">
            <div className="flex flex-col gap-1.5">
              <label>Sản phẩm chủ lực quảng bá</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setAiProduct('iphone15')}
                  className={`py-2 px-1 rounded-lg border text-center transition-all cursor-pointer font-extrabold ${aiProduct === 'iphone15' ? 'bg-[#C21A1A]/10 border-[#C21A1A] text-[#C21A1A]' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-500'}`}
                >
                  iPhone 15 Pro
                </button>
                <button
                  type="button"
                  onClick={() => setAiProduct('iphone11')}
                  className={`py-2 px-1 rounded-lg border text-center transition-all cursor-pointer font-extrabold ${aiProduct === 'iphone11' ? 'bg-[#C21A1A]/10 border-[#C21A1A] text-[#C21A1A]' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-500'}`}
                >
                  iPhone 11 Zin
                </button>
                <button
                  type="button"
                  onClick={() => setAiProduct('accessory')}
                  className={`py-2 px-1 rounded-lg border text-center transition-all cursor-pointer font-extrabold ${aiProduct === 'accessory' ? 'bg-[#C21A1A]/10 border-[#C21A1A] text-[#C21A1A]' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-500'}`}
                >
                  Phụ kiện VIP
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label>Góc độ tiếp cận / Ưu đãi chính</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setAiAngle('vip')}
                  className={`py-2 px-1 rounded-lg border text-center transition-all cursor-pointer ${aiAngle === 'vip' ? 'bg-[#C21A1A]/10 border-[#C21A1A] text-[#C21A1A]' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-500'}`}
                >
                  Combo Quà VIP
                </button>
                <button
                  type="button"
                  onClick={() => setAiAngle('price')}
                  className={`py-2 px-1 rounded-lg border text-center transition-all cursor-pointer ${aiAngle === 'price' ? 'bg-[#C21A1A]/10 border-[#C21A1A] text-[#C21A1A]' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-500'}`}
                >
                  Cực Sốc Lộc Vàng
                </button>
                <button
                  type="button"
                  onClick={() => setAiAngle('tradein')}
                  className={`py-2 px-1 rounded-lg border text-center transition-all cursor-pointer ${aiAngle === 'tradein' ? 'bg-[#C21A1A]/10 border-[#C21A1A] text-[#C21A1A]' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-500'}`}
                >
                  Thu Cũ Lên Đời
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label>Giọng điệu truyền tải (Tone)</label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setAiTone('hype')}
                  className={`py-2 px-1 rounded-lg border text-center transition-all cursor-pointer ${aiTone === 'hype' ? 'bg-[#C21A1A]/10 border-[#C21A1A] text-[#C21A1A]' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-500'}`}
                >
                  Khuyến mãi bùng nổ
                </button>
                <button
                  type="button"
                  onClick={() => setAiTone('professional')}
                  className={`py-2 px-1 rounded-lg border text-center transition-all cursor-pointer ${aiTone === 'professional' ? 'bg-[#C21A1A]/10 border-[#C21A1A] text-[#C21A1A]' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-500'}`}
                >
                  Chuyên nghiệp, uy tín
                </button>
                <button
                  type="button"
                  onClick={() => setAiTone('humorous')}
                  className={`py-2 px-1 rounded-lg border text-center transition-all cursor-pointer ${aiTone === 'humorous' ? 'bg-[#C21A1A]/10 border-[#C21A1A] text-[#C21A1A]' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-500'}`}
                >
                  Vui vẻ hóm hỉnh
                </button>
              </div>
            </div>

            <button
              onClick={handleGenerateCopywriting}
              disabled={generating}
              className="w-full py-2.5 bg-[#C21A1A] hover:bg-red-700 active:scale-98 disabled:bg-red-300 text-white font-black uppercase text-[11px] tracking-wider rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-2 shrink-0"
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              {generating ? 'ĐANG TẠO NỘI DUNG...' : 'TẠO BÀI ĐĂNG CỦA MR. TÁO'}
            </button>
          </div>

          {/* GENERATE OUTPUT WINDOW AREA */}
          <div className="relative bg-slate-50 rounded-xl border border-slate-150 p-4 min-h-[140px] flex flex-col justify-between">
            {generatedText ? (
              <>
                <div className="text-xs font-mono font-medium text-slate-700 whitespace-pre-wrap text-left break-all select-all pr-1">
                  {generatedText}
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleCopyText}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 active:scale-95 text-slate-600 hover:text-slate-800 text-[10px] font-black rounded-lg shadow-xs cursor-pointer transition-all"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ĐÃ SAO CHÉP!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        SAO CHÉP BÀI VIẾT
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2 p-4 text-center">
                <Sparkles className="w-6 h-6 text-slate-300 animate-pulse" />
                <p className="text-[11px] font-bold leading-normal">
                  Chưa có văn bản bài viết.<br />Bấm "Tạo bài đăng" ở trên để sinh thông điệp bán hàng tối ưu.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* 4. WEEKLY SOCIAL MEDIA CALENDAR SCHEDULE */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div>
          <span className="text-[10px] font-black uppercase text-[#C21A1A] tracking-widest block">LỊCH TRUYỀN THÔNG TUẦN</span>
          <h2 className="text-sm font-extrabold text-slate-800 mt-0.5">Nhiệm vụ Đăng bài &amp; Sáng tạo nội dung chi nhánh</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3.5 font-sans">
          
          <div className="p-3 bg-red-50/40 border border-slate-150 rounded-xl space-y-2 text-left">
            <div className="flex items-center justify-between text-[10px] font-black tracking-wider uppercase text-slate-400">
              <span>THỨ HAI</span>
              <span className="text-emerald-500">ĐÃ HOÀN THÀNH</span>
            </div>
            <h5 className="text-[11px] font-black text-slate-800 leading-tight">Bài viết phản hồi (CSAT) tháng trước</h5>
            <p className="text-[10px] text-slate-500 font-semibold leading-normal">Đăng ảnh feedback của 10 quý khách mua iPhone 15 Pro Max tại chi nhánh kèm lời tri ân sâu sắc.</p>
          </div>

          <div className="p-3 bg-red-50/40 border border-slate-150 rounded-xl space-y-2 text-left">
            <div className="flex items-center justify-between text-[10px] font-black tracking-wider uppercase text-slate-400">
              <span>THỨ TƯ</span>
              <span className="text-[#C21A1A]">HÔM NAY</span>
            </div>
            <h5 className="text-[11px] font-black text-slate-800 leading-tight">Video ngắn unboxing lô iPhone 11 Zin Két</h5>
            <p className="text-[10px] text-slate-500 font-semibold leading-normal">Quay video test 18 bước ngặt nghèo ngay tại showroom, chứng minh máy chất, pin trâu giá hạt dẻ.</p>
          </div>

          <div className="p-3 border border-slate-150 rounded-xl space-y-2 text-left">
            <div className="flex items-center justify-between text-[10px] font-black tracking-wider uppercase text-slate-400">
              <span>THỨ SÁU</span>
              <span className="text-slate-400">DỰ KIẾN</span>
            </div>
            <h5 className="text-[11px] font-black text-slate-800 leading-tight">Khuyễn mại sốc phụ kiện cuối tuần</h5>
            <p className="text-[10px] text-slate-500 font-semibold leading-normal">Mở bán gói dán cường lực VIP miễn phí, xả kho lẻ cáp sạc tai nghe đồng giá 99k.</p>
          </div>

          <div className="p-3 border border-slate-150 rounded-xl space-y-2 text-left">
            <div className="flex items-center justify-between text-[10px] font-black tracking-wider uppercase text-slate-400">
              <span>THỨ BẢY</span>
              <span className="text-slate-400">DỰ KIẾN</span>
            </div>
            <h5 className="text-[11px] font-black text-slate-800 leading-tight">Livestream Tiktok chốt giá lẻ giảm sâu</h5>
            <p className="text-[10px] text-slate-500 font-semibold leading-normal">Chạy minigame đập hộp Táo khuyết trúng voucher 500k. Đẩy số lượt chốt đơn ca chiều.</p>
          </div>

          <div className="p-3 border border-slate-150 rounded-xl space-y-2 text-left">
            <div className="flex items-center justify-between text-[10px] font-black tracking-wider uppercase text-slate-400">
              <span>CHỦ NHẬT</span>
              <span className="text-slate-400">DỰ KIẾN</span>
            </div>
            <h5 className="text-[11px] font-black text-slate-800 leading-tight">Báo cáo hiệu quả CPA các nhóm chiến dịch</h5>
            <p className="text-[10px] text-slate-500 font-semibold leading-normal">Báo cáo tổng kết chi phí chạy Ads trên Facebook &amp; TikTok và các cú nhấp gửi lên group quản trị.</p>
          </div>

        </div>
      </div>

    </div>
  );
}
