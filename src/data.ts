import type { ChecklistCategory, ChecklistItem } from './types/checklist.types';
import type { SOPIssue } from './types/issues.types';
import type { StaffRank } from './types/kpi.types';
import type { DailyReport } from './types/reports.types';
import type { RolePermissionRow, StaffMember } from './types/staff.types';
import type { Store } from './types/store.types';
import type { KPIStats, TimelineEvent } from './types/today.types';

export const DEFAULT_STORE_ID = 'store-mr-tao-q1';

export const INITIAL_STORES: Store[] = [
  {
    id: DEFAULT_STORE_ID,
    code: 'MRTAO-Q1',
    name: 'Mr. Táo Q1 Flagship',
    status: 'active',
    address: 'Quận 1, TP.HCM',
  },
];

export const INITIAL_KPI_STATS: KPIStats = {
  storeId: DEFAULT_STORE_ID,
  todayRevenue: 25800000,
  checklistCompletion: 85,
  delayedTasksCount: 3,
  sopErrorsCount: 1,
  customerComplaintsCount: 0,
  lateStaffCount: 1,
};


export const TIMELINE_EVENTS: TimelineEvent[] = [
  { time: '08:00', title: 'Mở cửa', description: 'Bàn giao ca sáng, vệ sinh showroom, bật hệ thống ánh sáng & điều hòa, kiểm đếm quỹ đầu ca.', status: 'done' },
  { time: '08:15', title: 'Bán hàng', description: 'Đón đợt khách đầu tiên, triển khai ưu đãi đặc quyền, hỗ trợ kiểm tra máy.', status: 'done' },
  { time: '12:00', title: 'Kiểm tra giữa ngày', description: 'Đối soát quỹ trung gian, xếp lại kệ phụ kiện, cập nhật báo cáo tiến độ doanh số ca sáng.', status: 'done' },
  { time: '18:00', title: 'Báo cáo', description: 'Giao ca chiều, kiểm đếm hàng trưng bày, ghi nhận phản hồi của khách hàng trong ngày.', status: 'current' },
  { time: '20:30', title: 'Chốt ca', description: 'Khóa két tiền, xuất file đối soát POS, tắt điện, niêm phong khóa cửa hàng truyền báo cáo tổng kết.', status: 'pending' },
].map((event): TimelineEvent => ({ storeId: DEFAULT_STORE_ID, ...event } as TimelineEvent));

export const INITIAL_CHECKLIST_CATEGORIES: ChecklistCategory[] = [
  { id: 'opening', title: 'Mở cửa cửa hàng', countDone: 5, countTotal: 5, isCompleted: true },
  { id: 'cleaning', title: 'Vệ sinh cửa hàng', countDone: 3, countTotal: 4, isCompleted: false },
  { id: 'inventory', title: 'Kiểm tra hàng hóa', countDone: 4, countTotal: 5, isCompleted: false },
  { id: 'sales', title: 'Bán hàng - Bàn giao', countDone: 6, countTotal: 7, isCompleted: false },
  { id: 'closing', title: 'Chốt ca - Cuối ngày', countDone: 0, countTotal: 4, isCompleted: false },
].map((category): ChecklistCategory => ({ storeId: DEFAULT_STORE_ID, ...category }));

export const INITIAL_CHECKLIST_ITEMS: ChecklistItem[] = [
  // Opening
  { id: 'op1', categoryId: 'opening', title: 'Mở khóa cửa chính, kéo rèm che bụi, bật điện tổng', isCompleted: true },
  { id: 'op2', categoryId: 'opening', title: 'Khởi động máy POS, máy in hóa đơn & kiểm tra kết nối mạng', isCompleted: true },
  { id: 'op3', categoryId: 'opening', title: 'Kiểm đếm và đối soát số dư két tiền mặt ban đầu (3,000,000đ)', isCompleted: true },
  { id: 'op4', categoryId: 'opening', title: 'Bật nhạc nền nhẹ nhàng tại showroom, kiểm tra mùi hương tinh dầu', isCompleted: true },
  { id: 'op5', categoryId: 'opening', title: 'Họp giao ban nhanh (5 phút) phân công mục tiêu doanh số ca hôm nay', isCompleted: true },

  // Cleaning
  { id: 'cl1', categoryId: 'cleaning', title: 'Lau sạch bụi bẩn trên tủ kính trưng bày iPhone, iPad', isCompleted: true },
  { id: 'cl2', categoryId: 'cleaning', title: 'Quét và lau sàn nhà showroom bằng nước thơm văn phòng', isCompleted: true },
  { id: 'cl3', categoryId: 'cleaning', title: 'Vệ sinh sạch sẽ bàn ghế tư vấn khách hàng, vứt rác ca trước', isCompleted: true },
  { id: 'cl4', categoryId: 'cleaning', title: 'Lắp túi rác mới và lau cửa kính phía trước mặt tiền', isCompleted: false },

  // Inventory
  { id: 'iv1', categoryId: 'inventory', title: 'Kiểm đếm số lượng iPhone mới nguyên seal trong két phụ', isCompleted: true },
  { id: 'iv2', categoryId: 'inventory', title: 'Kiểm tra khay phụ kiện (Cáp sạc, AirPods, ốp lưng, kính cường lực)', isCompleted: true },
  { id: 'iv3', categoryId: 'inventory', title: 'Đối soát số IMEI của máy lock/Active sẵn trưng bày trên bàn', isCompleted: true },
  { id: 'iv4', categoryId: 'inventory', title: 'Dán tem bảo hành và tem phụ tiếng Việt cho lô sạc cáp mới nhập', isCompleted: true },
  { id: 'iv5', categoryId: 'inventory', title: 'Cập nhật số kho chênh lệch của các máy bảo hành trả cho khách', isCompleted: false },

  // Sales
  { id: 'sl1', categoryId: 'sales', title: 'Đeo thẻ tên, mặc đúng đồng phục vest lửng chỉnh tề trước khi đón khách', isCompleted: true },
  { id: 'sl2', categoryId: 'sales', title: 'Kiểm tra kỹ ứng dụng kiểm kho POS, đồng bộ giá khuyến mãi iPhone 11', isCompleted: true },
  { id: 'sl3', categoryId: 'sales', title: 'Tư vấn kỹ chính sách bảo hành 1 đổi 1 trong 30 ngày cho tất cả khách hàng mua máy', isCompleted: true },
  { id: 'sl4', categoryId: 'sales', title: 'Gửi nước uống đóng chai đóng logo Mr. Táo cho khách ngồi chờ cài đặt', isCompleted: true },
  { id: 'sl5', categoryId: 'sales', title: 'Viết đầy đủ hóa đơn đỏ điện tử cho khách, ghi rõ số IMEI của thiết bị bán ra', isCompleted: true },
  { id: 'sl6', categoryId: 'sales', title: 'Hỗ trợ khách dán kính cường lực miễn phí trọn đời (đối với gói VIP)', isCompleted: true },
  { id: 'sl7', categoryId: 'sales', title: 'Chụp hình lưu niệm cùng khách khi nhận máy bàn giao, xin CSAT 5 sao', isCompleted: false },

  // Closing
  { id: 'cs1', categoryId: 'closing', title: 'Thực hiện kiểm đếm và kết chuyển toàn bộ tiền mặt sang két an toàn', isCompleted: false },
  { id: 'cs2', categoryId: 'closing', title: 'Chụp ảnh gửi báo cáo dòng tiền, báo cáo doanh thu cuối ngày lên nhóm', isCompleted: false },
  { id: 'cs3', categoryId: 'closing', title: 'Kiểm tra khóa an toàn tủ cường lực bày hàng, kéo rèm an ninh showroom', isCompleted: false },
  { id: 'cs4', categoryId: 'closing', title: 'Ngắt tất cả thiết bị điện trừ camera giám sát và biển hiệu, dập Aptomat', isCompleted: false },
].map((item): ChecklistItem => ({ storeId: DEFAULT_STORE_ID, ...item }));

export const INITIAL_STAFF_RANKS: StaffRank[] = [
  { name: 'Nguyễn Trường Giang', role: 'Sales', score: 92, classification: 'good', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100' },
  { name: 'Trần Thanh Hoài', role: 'Kỹ thuật', score: 86, classification: 'pass', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100' },
  { name: 'Đặng Hùng An', role: 'Kho', score: 72, classification: 'needs_improvement', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100' },
].map((rank): StaffRank => ({ storeId: DEFAULT_STORE_ID, ...rank } as StaffRank));

export const INITIAL_SOP_ISSUES: SOPIssue[] = [
  {
    id: 'issue-1',
    title: 'Sai quy trình bàn giao máy',
    severity: 'High',
    status: 'Xử lý ngay',
    category: 'sop_error',
    date: '2026-05-27',
    actor: 'Sales ca sáng',
    process: 'Bán hàng – Bàn giao',
    occurrence: 2,
    assignee: 'Nguyễn Văn A',
    description: 'Khách chưa ký xác nhận – thiếu kiểm tra IMEI sau khi xuất máy.'
  },
  {
    id: 'issue-2',
    title: 'Nhầm cấu hình kho chứa',
    severity: 'Medium',
    status: 'Xử lý ngay',
    category: 'sop_error',
    date: '2026-05-26',
    actor: 'Kho trưng bày',
    process: 'Quản lý kho – Vận hành',
    occurrence: 1,
    assignee: 'Nguyễn Văn A',
    description: 'Nhầm lẫn mã vạch tủ giữa phiên bản lock và quốc tế tại két phụ. Đã phân loại lại.'
  },
  {
    id: 'issue-3',
    title: 'Thiếu biển cảnh báo trơn trượt ca mưa',
    severity: 'Low',
    status: 'Đã xử lý',
    category: 'sop_error',
    date: '2026-05-24',
    actor: 'Hành chính doanh nghiệp',
    process: 'Cơ sở – An toàn',
    occurrence: 3,
    assignee: 'Nguyễn Văn A',
    description: 'Quên đặt biển báo trơn trượt tại lối ra vào showroom khi trời mưa lớn ca sáng.'
  },
  {
    id: 'issue-4',
    title: 'Xin xuất máy trước khi đủ cọc',
    severity: 'Medium',
    status: 'Chờ duyệt',
    category: 'exception',
    date: '2026-05-27',
    actor: 'Sales ca chiều',
    process: 'Bán hàng – Xuất máy',
    occurrence: 1,
    assignee: 'Trần Thị B',
    description: 'Khách hàng có yêu cầu xuất máy trước khi đủ cọc, cần duyệt theo chính sách.'
  },
  {
    id: 'issue-5',
    title: 'Khách VIP nợ chứng minh thư thư tín',
    severity: 'Low',
    status: 'Chờ duyệt',
    category: 'exception',
    date: '2026-05-26',
    actor: 'Sales ca tối',
    process: 'Hành chính – Thủ tục',
    occurrence: 1,
    assignee: 'Trần Thị B',
    description: 'Khách hàng thân thiết nợ giấy tờ cá nhân do gấp gáp, nhân viên đề xuất cho tạm nợ đối soát.'
  },
  {
    id: 'issue-6',
    title: 'Rò rỉ dữ liệu mật két phụ',
    severity: 'High',
    status: 'Xử lý ngay',
    category: 'risk',
    date: '2026-05-27',
    actor: 'Kỹ thuật ca tối',
    process: 'Cơ sở – An ninh',
    occurrence: 1,
    assignee: 'Đặng Hùng An',
    description: 'Hệ thống camera ghi nhận két sắt phụ chứa máy trưng bày qua đêm chưa đóng đúng nấc khóa số xoay.'
  },
  {
    id: 'issue-7',
    title: 'Bổ sung bước xin review sau bán',
    severity: 'Low',
    status: 'Đang triển khai',
    category: 'improvement',
    date: '2026-05-27',
    actor: 'Marketing',
    process: 'Bán hàng – Bàn giao',
    occurrence: 1,
    assignee: 'Lê Minh C',
    description: 'Thêm bước xin review sau bán và tự động nhắc nhở sau 7 ngày.'
  },
  {
    id: 'issue-8',
    title: 'Tự động hóa đối chiếu cuối ngày',
    severity: 'Medium',
    status: 'Đang triển khai',
    category: 'improvement',
    date: '2026-05-26',
    actor: 'Quỹ & Quản lý',
    process: 'Tài chính – Kế toán',
    occurrence: 1,
    assignee: 'Lê Minh C',
    description: 'Áp dụng script tự động đối soát tiền mặt gửi ngân hàng so với bảng kê hóa đơn POS trực tuyến.'
  },
  {
    id: 'issue-9',
    title: 'Quy chuẩn hóa bàn ca trực giao ca',
    severity: 'Medium',
    status: 'Đang triển khai',
    category: 'improvement',
    date: '2026-05-25',
    actor: 'Tất cả bộ phận',
    process: 'Vận hành – Nhân sự',
    occurrence: 1,
    assignee: 'Nguyễn Trường Giang',
    description: 'Xây dựng biểu mẫu bàn giao công việc ca sáng - ca chiều trực tiếp trên cổng thông tin chung.'
  },
  {
    id: 'issue-10',
    title: 'Tối ưu hóa quy trình dán decal bảo vệ',
    severity: 'Low',
    status: 'Đã xử lý',
    category: 'improvement',
    date: '2026-05-24',
    actor: 'Kỹ thuật viên',
    process: 'Dịch vụ – Sửa chữa',
    occurrence: 2,
    assignee: 'Nguyễn Trường Giang',
    description: 'Thiết kế bộ kit công cụ định vị dán kính cường lực nhanh và chuẩn xác hơn.'
  }
].map((issue): SOPIssue => ({ storeId: DEFAULT_STORE_ID, ...issue } as SOPIssue));

export const DAILY_REPORT_DATA: DailyReport = {
  storeId: DEFAULT_STORE_ID,
  revenue: 25800000,
  billCount: 38,
  estimatedProfit: 6450000,
  newCustomers: 12,
  returningCustomers: 8,
  bestseller: 'iPhone 11',
  bestsellerCount: 6,
};

// Sổ tay hệ thống tài liệu
export const HANDBOOK_DOCS = [
  {
    id: 'doc-1',
    title: 'Sứ mệnh - Tầm nhìn - Giá trị cốt lõi',
    category: 'Văn hóa doanh nghiệp',
    summary: 'Định hướng phát triển hệ thống showroom ủy quyền Mr. Táo toàn quốc.',
    content: `### SỨ MỆNH - TẦM NHÌN - GIÁ TRỊ CỐT LÕI

#### 🍎 1. Sứ mệnh của Mr. Táo
Đưa công nghệ cao cấp nhất, đặc biệt là các thiết bị Apple, tiếp cận với mọi người Việt Nam bằng một mức giá trung thực, chất lượng chuẩn mực, đi kèm chính sách dịch vụ bảo hành chu đáo nhất. "Bán sự an tâm vượt trội chứ không chỉ bán máy".

#### 🌟 2. Tầm nhìn 2030
Trở thành hệ thống vận hành và bán lẻ thiết bị Apple cũ & mới được yêu thích nhất cả nước nhờ chất lượng dịch vụ CSAT đạt trên 9.5 điểm tuyệt đối, mở rộng 50 chi nhánh độc quyền.

#### 🤝 3. 5 Giá trị Cốt Lõi (T-A-O)
1. **TRUNG THỰC**: Không lấp liếm lỗi máy, báo chuẩn tình trạng 100% cho khách, kiểm đếm két tiền minh bạch tuyệt đối.
2. **AN TÂM**: Luôn đồng hành với khách hàng trước - trong và sau khi mua hàng. Có trách nhiệm đến cùng với máy bán ra.
3. **CHUYÊN NGHIỆP**: Thực hiện xuất sắc checklist SOP hàng ngày. Trực quan hóa quy trình bằng dashboard điều khiển số.
4. **CẢI TIẾN**: Học hỏi từ lỗi lầm (SOP Errors), hoàn thiện bộ quy định vận hành mỗi tuần để tối ưu chi phí.
5. **ĐỒNG ĐỘI**: Mỗi cá nhân là một mảnh ghép hỗ trợ trọn vẹn ca làm việc, không đùn đẩy trách nhiệm kiểm kho hay dọn rửa.`
  },
  {
    id: 'doc-2',
    title: 'Nội quy công ty',
    category: 'Văn bản hành chính',
    summary: 'Quy định giờ giấc, đồng phục, bảo mật thông tin và tác phong làm việc.',
    content: `### NỘI QUY CÔNG TY MR. TÁO

#### ⏰ 1. Thời gian làm việc chính thức
- **Ca Sáng**: 08:00 - 14:30
- **Ca Chiều**: 14:30 - 21:00
- **Yêu cầu**: Có mặt trước giờ ca 15 phút để họp bàn giao (Checklist mở cửa). Đi muộn quá 10 phút sẽ tính là đi muộn không lý do.

#### 👔 2. Quy chuẩn đồng phục
- Áo thun trắng có thêu logo Mr. Táo phẳng phiu, quần tối màu hoặc chân váy công sở.
- Giày da hoặc sneaker màu sáng sạch sẽ. Đeo bảng tên ngay ngắn ở ngực trái.
- Đầu tóc gọn gàng, móng tay cắt ngắn (không sơn màu quá sặc sỡ với vị trí CSKH/Sales).

#### 🛡️ 3. Quy định về bảo mật thông tin
- Tuyệt đối không chụp ảnh màn hình POS chứa doanh số, thông tin cá nhân khách hàng chia sẻ lên các nhóm công khai ngoài hệ thống.
- Nghiêm cấm chia sẻ mật khẩu két tiền, mật khẩu wifi nội bộ "MrTao_Staff" của chi nhánh cho người lạ.`
  },
  {
    id: 'doc-3',
    title: 'Quy chế làm việc',
    category: 'Văn bản hành chính',
    summary: 'Phương thức tính lương, thưởng KPI, phạt lỗi vận hành SOP.',
    content: `### QUY CHẾ LÀM VIỆC & THƯỞNG PHẠT

#### 💵 1. Cơ cấu thu nhập của nhân sự
- **Thu nhập = Lương cứng + Thưởng KPI doanh số + Thưởng CSAT (Thư khen) - Khấu trừ lỗi SOP**.
- Lương cứng được tính công theo ca làm việc đã đăng ký trên hệ thống bảng tính Google Sheets của bộ phận Nhân sự.

#### 🎯 2. Chỉ tiêu KPI và thưởng
- Cửa hàng đạt trên 100% chỉ tiêu doanh thu tuần: Toàn bộ nhân viên ca làm việc được nhận thưởng nóng 500k/người.
- Nhân viên bán hàng đạt CSAT tiêu chuẩn 5 sao trên 95% tổng số hóa đơn: Nhận thêm 10k/hóa đơn thưởng trực tiếp.

#### ⚠️ 3. Chế tài kỷ luật lỗi SOP
- Đi trễ ca làm việc: Phạt 50,000 đ/lần từ phút thứ 15.
- Vi phạm quy trình SOP Nghiêm trọng (không ghi imei, lệch tiền quỹ không khai báo): Đình chỉ phân ca 3 ngày, viết bản kiểm điểm gửi Giám đốc vận hành.`
  },
  {
    id: 'doc-4',
    title: 'Sơ đồ tổ chức',
    category: 'Văn hóa doanh nghiệp',
    summary: 'Cơ cấu phòng ban, quản lý vùng và chức danh phân quyền.',
    content: `### SƠ ĐỒ TỔ CHỨC HỆ THỐNG MR. TÁO

- **BAN GIÁM ĐỐC (CEO & CƠ CẤU ADMIN)**
  - Quản trị chiến lược toàn diện, phê duyệt ngân sách, kiểm duyệt hệ thống Google Sheet tổng.
  
- **GIÁM ĐỐC VẬN HÀNH (COO)**
  - Quản lý các Chỉ số KPI vùng, phê duyệt báo cáo tháng, xử lý ngoại lệ và cải tiến SOP lỗi.

- **QUẢN LÝ CỬA HÀNG (Store Manager)**
  - Chịu trách nhiệm trực tiếp tại Showroom.
  - Phân bổ checklist ca sáng / ca chiều, điều phối giao việc nội bộ, kiểm soát Trạng thái Cửa hàng.

- **NHÂN VIÊN SHOWROOM**
  - **Bộ phận tư vấn Sales**: Tiếp đón khách, chốt đơn, thu thập đánh giá CSAT.
  - **Bộ phận Kỹ thuật & Bảo hành**: Test máy thu cũ đổi mới, hỗ trợ ép kính, thay pin, kiểm tra chất lượng phần cứng.
  - **Bộ phận Thủ kho**: Kiểm kê iPhone tồn kho thực tế, dán tem phụ, đóng gói kiện hàng chuyển miền.`
  },
  {
    id: 'doc-5',
    title: 'Mô tả công việc',
    category: 'Văn hóa doanh nghiệp',
    summary: 'Chi tiết trách nhiệm của Nhân viên Bán hàng, Nhân viên Kỹ thuật, Thủ kho.',
    content: `### MÔ TẢ CÔNG VIỆC CÁC VỊ TRÍ CHI NHÁNH

#### 🤝 1. Nhân viên tư vấn Bán hàng (Sales Specialist)
- Đón chào khách nhiệt tình với khẩu hiệu: "Mr. Táo xin chào ạ!".
- Tư vấn chi tiết tính năng của iPhone, tư vấn kỹ chính sách bảo hành 1 đổi 1.
- Hỗ trợ dán cường lực, nâng cấp gói VIP bảo hành nguồn và màn hình cho khách.
- Thu két tiền, hoàn thành các checklist doanh thu trên hệ thống POS.

#### 🛠️ 2. Kỹ thuật viên Sửa chữa & Kiểm định (Technical Specialist)
- Tiếp nhận máy sửa chữa bảo hành từ khách, lập phiếu ghi nhận đúng lỗi thực tế.
- Khắc phục lỗi nhanh (ép kính, thay pin, thay màn hình) tại chỗ cho khách quan sát trực tiếp.
- Chịu trách nhiệm kiểm offline 18 bước các máy cũ thu mua của khách.

#### 📦 3. Thủ kho (Warehouse Keeper)
- Nhận kiện hàng kho tổng, nhập liệu chính xác mã IMEI, dung lượng, màu sắc, tình trạng pin lên hệ thống Excel.
- Sắp xếp kho ngăn nắp theo cấu trúc bento khoa học dễ rút hàng.
- Kiểm kho định kỳ mỗi 3 ngày một lần để đảm bảo khớp tồn kho vật lý 100%.`
  },
  {
    id: 'doc-6',
    title: 'Quy trình vận hành SOP',
    category: 'Quy trình nội bộ',
    summary: '18 bước nghiệm thu máy cũ, quy trình bán hàng khép kín và chốt két ca trực.',
    content: `### QUY TRÌNH SOP VẬN HÀNH CHUẨN

#### 🔎 Quy trình 18 Bước Thẩm định Máy Thu Cũ
1. **Kiểm tra ngoại quan**: Xem vỏ máy xước dăm hay móp méo nặng, camera có vỡ kính hay không.
2. **Kiểm tra Màn hình**: Phát hiện phản quang, bụi sọc, ám ố hay cảm ứng có điểm chết bằng app chuyên dụng.
3. **Kiểm tra FaceID / TouchID**: Quét vân tay/nhận diện khuôn mặt xem phản hồi nhanh hay gián đoạn.
4. **Kiểm tra Camera**: Test zoom 1x, 2x, 5x, khả năng chống rung quang học OIS và quay video thu âm.
5. **Kiểm tra Loa & Mic**: Nghe thử loa trong, loa ngoài có bị rè do dính nước hay bám bụi bẩn.
6. **Kiểm tra Pin**: Sử dụng phần mềm 3uTools kiểm tra số lần sạc và độ chai pin thực tế.
*(Chi tiết 12 bước còn lại xem tại bảng vận hành tại quầy Kỹ thuật)*

#### 💰 Quy trình Đối soát Tiền két ca Chốt
- Đếm tiền mặt và ghi nhận vào biểu mẫu chốt ca.
- Tên người kiểm đếm, số lượng các mệnh giá tiền mặt từ 500k xuống 1k.
- So sánh số liệu tổng tiền mặt với báo cáo doanh thu bán hàng hiển thị trên POS. Nếu lệch quá 10,000 đ phải tìm ra nguyên nhân ghi nhận ngay.`
  },
  {
    id: 'doc-7',
    title: 'Biểu mẫu - Tài liệu',
    category: 'Quy trình nội bộ',
    summary: 'Phiếu thu cũ đổi mới, biên bản bàn giao bàn và biên bản kiểm imei lỗi.',
    content: `### BIỂU MẪU & TÀI LIỆU SỬ DỤNG TẠI CỬA HÀNG

1. **Phiếu Thu Cũ Đổi Mới [FORM-01]**: Ghi nhận thông tin iCloud của khách đã thoát hoàn toàn, tình trạng pin, kính và giá thu mua thống nhất.
2. **Biên bản bàn giao ca [FORM-02]**: Chữ ký xác nhận của Trưởng ca sáng và Trưởng ca chiều về số lượng máy nguyên seal trưng bày trong két an toàn. Cùng số tiền mặt két sắt.
3. **Biên bản ghi nhận Sự cố SOP [FORM-03]**: Sử dụng ghi nhận lỗi sai sót nghiệp vụ, có chữ ký của người vi phạm và quản lý giám sát làm cơ sở đưa vào họp rút kinh nghiệm tuần.`
  },
  {
    id: 'doc-8',
    title: 'Đào tạo - Hướng dẫn',
    category: 'Quy trình nội bộ',
    summary: 'Lộ trình huấn luyện kỹ năng xử lý khách hàng phàn nàn và chốt sale máy cũ.',
    content: `### ĐÀO TẠO & HƯỚNG DẪN NGHIỆP VỤ

#### 🗯️ Quy trình 4 Bước xử lý khiếu nại khách hàng gấp
1. **LẮNG NGHE CHỦ ĐỘNG**: Để khách giải tỏa hết bực dọc, tuyệt đối không ngắt lời hay tranh cãi đúng sai với khách.
2. **ĐỒNG CẢM SÂU SẮC**: "Chúng em vô cùng xin lỗi anh/chị vì trải nghiệm không thoải mái này ạ. Em hiểu cảm giác của chị lúc này."
3. **ĐƯA PHƯƠNG ÁN XỬ LÝ NGAY**: Đổi ngay một máy mới nguyên seal cùng loại cho khách nếu máy mua trong 30 ngày bị lỗi phần cứng đầu ca.
4. **CHĂM SÓC SAU SỰ CỐ**: Gọi điện hỏi thăm tình trạng máy sau 3 ngày hoàn thành đổi trả, tặng kèm voucher giảm giá 200k phụ kiện lần sau.`
  },
  {
    id: 'doc-9',
    title: 'Link tài liệu Google Drive',
    category: 'Link hệ thống',
    summary: 'Các liên kết văn bản tổng cho quản lý và đào tạo nhân viên.',
    content: `### LIÊN KẾT GOOGLE DRIVE TỔNG HỢP HỆ THỐNG mr. TÁO

Bạn có thể truy cập bằng email ủy quyền công ty để tải và chỉnh sửa trực tuyến các biểu mẫu sau:

- 📂 [Thư mục Drive Đào tạo Kỹ thuật: Quy trình tháo máy iPhone/iPad](https://drive.google.com/drive/folders/mrt_tech_training_fake)
- 📊 [Bảng tính Google Sheet Quản lý kho tổng & Serial máy](https://docs.google.com/spreadsheets/d/mrt_inventory_sheet_fake/edit)
- 🛒 [Form khảo sát Khách hàng phản hồi về dịch vụ CSAT hàng tuần](https://docs.google.com/forms/d/mrt_csat_survey_fake/viewform)
- 📝 [Thư mục Biên bản Bàn giao & Sổ sách Kế toán Showroom](https://drive.google.com/drive/folders/mrt_finance_forms_fake)`
  }
];

// Dành cho màn hình "Hôm nay" Desktop view (>900px)
export const SYSTEM_GOALS = [
  { id: 'goal-1', title: 'Target Doanh thu Tháng 5', value: 65, goalVal: '256Mđ', currentVal: '212Mđ', color: 'bg-primary' },
  { id: 'goal-2', title: 'Tỷ lệ Checklist Hoàn thành tuần', value: 85, goalVal: '95%', currentVal: '85%', color: 'bg-amber-500' },
  { id: 'goal-3', title: 'Chỉ số CSAT Khách hàng hài lòng', value: 92, goalVal: '9.5', currentVal: '9.2', color: 'bg-emerald-500' },
];

export const DAILY_OPERATING_CYCLE = [
  { step: '1', title: '08:00 - Setup Đầu ngày', desc: 'Lau dọn quầy kệ, kiểm đếm 3M tiền két, thắp hương và bật nhạc phong thủy.' },
  { step: '2', title: '12:00 - Kiểm toán Giữa ca', desc: 'Đối soát các bill chuyển khoản ngân hàng trên ứng dụng ngân hàng, kiểm tra nhân sự dọn dẹp showroom.' },
  { step: '3', title: '14:30 - Bàn giao Ca làm', desc: 'Ký biên bản bàn giao thiết bị trưng bày lẻ ca sáng qua ca chiều, chốt sổ quỹ tạm.' },
  { step: '4', title: '20:30 - Thu hoạch Chốt sổ', desc: 'Nhập báo cáo doanh thu tài chính lên group Zalo, niêm phong két sắt và ngắt các cầu dao điện cao tải.' },
];

export const PRINCIPLES_5_NO = [
  { term: '1', keyword: 'KHÔNG lệch IMEI', desc: 'Cấm xuất kho hay bàn giao thiết bị khi số máy và imei không trùng khớp 100% với phiếu nhập xuất trên máy tính.' },
  { term: '2', keyword: 'KHÔNG thái độ', desc: 'Nghiêm cấm tỏ thái độ mệt mỏi, khó chịu hay phớt lờ khách hàng kể cả khi khách vào xem máy nhưng không mua.' },
  { term: '3', keyword: 'KHÔNG bỏ bước SOP', desc: 'Quy trình thẩm định kiểm máy cũ 18 bước phải thực hiện đầy đủ không bỏ sót bất kỳ hạng mục test FaceID hay IC nào.' },
  { term: '4', keyword: 'KHÔNG lệch quỹ', desc: 'Tiền mặt thu chi phải viết phiếu và ghi POS ngay tại chỗ, không giữ tiền lẻ bên ngoài túi quần hay ngăn kéo cá nhân.' },
  { term: '5', keyword: 'KHÔNG trễ giờ', desc: 'Báo đi muộn trước ít nhất 2 tiếng, không tự ý bỏ ca hay đi làm trễ gây ảnh hưởng tới tiến độ bàn giao két quỹ.' },
];

export const SHEET_DATABASE_STRUCTURE = [
  {
    sheetName: '📊 1. Doanh thu (Sales)',
    columns: 'Mã Bill | Ngày | Nhân viên | Khách hàng | SĐT | Tên máy | Số IMEI | Giá bán | Giá gốc | Hình thức (Chuyển khoản/Tiền mặt)'
  },
  {
    sheetName: '📦 2. Kho hàng (Inventory)',
    columns: 'IMEI | Model máy | Dung lượng (GB) | Màu sắc | Tình trạng pin | Nguồn nhập | Giá nhập | Trạng thái (Sẵn sàng/Đã bán /Đang bảo hành)'
  },
  {
    sheetName: '⚠️ 3. Nhật ký SOP & Lỗi',
    columns: 'Mã số | Ngày | Người vi phạm | Lỗi vi phạm | Mức độ nguy hiểm | Biện pháp khắc phục | Trạng thái xử lý (Chưa/Đang/Đã xong)'
  },
  {
    sheetName: '👥 4. Chấm công & KPI',
    columns: 'Tháng | Mã NV | Tên | Ca đăng ký | Số phút đi muộn | Điểm KPI vận hành | Điểm đánh giá CSAT của khách | Thưởng nóng | Kỷ luật'
  }
];

export const ROLE_PERMISSIONS = [
  { role: '👑 Admin / CEO', desc: 'Xem toàn bộ báo cáo tài chính gộp, chỉnh sửa database Google Sheet gốc, thêm bớt tài khoản nhân sự chi nhánh.' },
  { role: '👔 Quản lý cửa hàng', desc: 'Duyệt báo cáo ca ngày, phê duyệt các đề xuất mua máy thu cũ giá cao, ghi nhận lỗi SOP, giao việc phụ thuộc.' },
  { role: '🤝 Nhân viên showroom (Sales/Tech)', desc: 'Thực hiện checklist hàng ngày, báo cáo giao dịch bán hàng, nhận việc giao từ Quản lý, báo cáo lỗi SOP tự giác.' },
];

export const AUTOMATION_SYSTEM_FLOW = [
  { trigger: '1. Khách điền CSAT < 4 sao', action: 'Telegram bot lập tức ping ngay cho Quản lý vùng để liên hệ trực tiếp xin lỗi xử lý.' },
  { trigger: '2. Nhập IMEI iPhone đã bán lên POS', action: 'Google Sheet tự chuyển trạng thái của IMEI đó sang Đã bán và trích 5% doanh số cho NV Sales.' },
  { trigger: '3. Kiểm checklist cuối ca trễ quá 21:00', action: 'Màn hình dashboard sáng đỏ gửi cảnh báo trực diện lên Admin báo cáo ca đóng cửa trễ chưa lý do.' },
];

export const INITIAL_PERMISSION_ROWS: RolePermissionRow[] = [
  { id: 'PQ-001', roleCode: 'CHU_CUA_HANG', module: 'HOM_NAY', canView: true, canCreate: true, canUpdate: true, canDelete: true, canApprove: true },
  { id: 'PQ-002', roleCode: 'CHU_CUA_HANG', module: 'KPI', canView: true, canCreate: true, canUpdate: true, canDelete: true, canApprove: true },
  { id: 'PQ-003', roleCode: 'QUAN_LY', module: 'GIAO_VIEC', canView: true, canCreate: true, canUpdate: true, canDelete: true, canApprove: true },
  { id: 'PQ-004', roleCode: 'SALES', module: 'CHECKLIST', canView: true, canCreate: false, canUpdate: true, canDelete: false, canApprove: false },
  { id: 'PQ-005', roleCode: 'KHO', module: 'GIAO_VIEC', canView: true, canCreate: false, canUpdate: true, canDelete: false, canApprove: false },
  { id: 'PQ-006', roleCode: 'CSKH', module: 'LOI_SOP', canView: true, canCreate: true, canUpdate: true, canDelete: false, canApprove: false }
].map((permission): RolePermissionRow => ({ storeId: DEFAULT_STORE_ID, ...permission }));

export const INITIAL_STAFF_MEMBERS: StaffMember[] = [
  { id: 'NV-001', fullName: 'Nguyễn Minh Đức', role: 'CHU_CUA_HANG', username: 'admin', phone: '0912345678', status: 'active', joinedDate: '2024-01-15' },
  { id: 'NV-002', fullName: 'Nguyễn Văn A', role: 'SALES', username: 'sales', phone: '0987654321', status: 'active', joinedDate: '2024-03-10' },
  { id: 'NV-003', fullName: 'Trần Thị B', role: 'KHO', username: 'tech', phone: '0901238899', status: 'active', joinedDate: '2024-05-18' },
  { id: 'NV-004', fullName: 'Lê Hoàng C', role: 'CSKH', username: 'cskh', phone: '0933445566', status: 'active', joinedDate: '2025-02-22' },
  { id: 'NV-005', fullName: 'Phạm Quang D', role: 'QUAN_LY', username: 'manager', phone: '0944556677', status: 'active', joinedDate: '2024-11-01' },
].map((staff): StaffMember => ({ storeId: DEFAULT_STORE_ID, ...staff } as StaffMember));

