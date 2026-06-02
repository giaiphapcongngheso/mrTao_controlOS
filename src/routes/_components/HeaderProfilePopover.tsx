import React, { useState } from 'react';
import {
  Briefcase,
  Check,
  Hash,
  Lock,
  Mail,
  MapPin,
  Phone,
  Shield,
  User,
  UserCheck,
  X,
} from 'lucide-react';

interface SessionLike {
  username?: string;
  fullName?: string;
  role?: string;
  roleCode?: string;
  avatar?: string;
  id?: string;
  employeeCode?: string;
  phone?: string;
  email?: string;
  department?: string;
  position?: string;
  statusLabel?: string;
}

interface HeaderProfilePopoverProps {
  currentUser: SessionLike;
  enrichSession: (user: SessionLike) => SessionLike;
  onSaveProfile: (sessionData: Partial<SessionLike>) => void;
}

export default function HeaderProfilePopover({
  currentUser,
  enrichSession,
  onSaveProfile,
}: HeaderProfilePopoverProps) {
  const [userPopoverOpen, setUserPopoverOpen] = useState(false);
  const [popoverTab, setPopoverTab] = useState<'editable' | 'readonly'>('editable');
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editId, setEditId] = useState('');
  const [editMaNhanSu, setEditMaNhanSu] = useState('');
  const [editBoPhan, setEditBoPhan] = useState('');
  const [editViTri, setEditViTri] = useState('');
  const [editTrangThai, setEditTrangThai] = useState('');

  const handleOpenPopover = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const enriched = enrichSession(currentUser);
    setEditFullName(enriched.fullName || '');
    setEditRole(enriched.role || '');
    setEditAvatar(enriched.avatar || '');
    setEditPhone(enriched.phone || '');
    setEditEmail(enriched.email || '');
    setEditId(enriched.id || '');
    setEditMaNhanSu(enriched.employeeCode || '');
    setEditBoPhan(enriched.department || '');
    setEditViTri(enriched.position || '');
    setEditTrangThai(enriched.statusLabel || 'Đang hoạt động');
    setPopoverTab('editable');
    setUserPopoverOpen(!userPopoverOpen);
  };

  const handleSave = () => {
    if (editFullName.trim() === '') {
      return;
    }

    const updatedSession = {
      username: currentUser?.username || 'admin',
      fullName: editFullName.trim(),
      avatar: editAvatar || currentUser?.avatar,
      phone: editPhone.trim(),
      email: editEmail.trim(),
      id: currentUser?.id || editId,
      employeeCode: currentUser?.employeeCode || editMaNhanSu,
      role: currentUser?.role || editRole,
      roleCode: currentUser?.roleCode,
      department: currentUser?.department || editBoPhan,
      position: currentUser?.position || editViTri,
      statusLabel: currentUser?.statusLabel || editTrangThai,
    };

    onSaveProfile(updatedSession);
    setUserPopoverOpen(false);
  };

  return (
    <div className="relative">
      <div
        onClick={handleOpenPopover}
        className="flex items-center gap-3 pl-4 border-l border-slate-200 cursor-pointer group select-none"
        title="Cập nhật thông tin vận hành"
      >
        <div className="text-right leading-tight">
          <span className="text-[11.5px] font-black text-slate-800 group-hover:text-[#C21A1A] transition-colors block">{currentUser?.fullName}</span>
          <span className="text-[9.5px] font-bold text-slate-500 opacity-95 block leading-none mt-0.5">{currentUser?.role}</span>
        </div>

        {currentUser?.avatar ? (
          <img
            src={currentUser.avatar}
            alt="Avatar"
            className="w-10 h-10 rounded-xl border-2 border-slate-200 group-hover:border-[#C21A1A] transition-all object-cover shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-[#C21A1A] text-white flex items-center justify-center text-xs font-black shrink-0">
            {currentUser?.fullName?.charAt(0)}
          </div>
        )}
      </div>

      {userPopoverOpen && (
        <>
          <div
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setUserPopoverOpen(false)}
          />

          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 mt-3.5 w-84 bg-white border border-slate-250/90 rounded-2xl shadow-xl z-50 p-4 animate-in fade-in slide-in-from-top-2 duration-150 text-left space-y-3.5"
          >
            <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
              <div className="text-left">
                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wider">Cập Nhật Tài Khoản Ca</h4>
                <p className="text-[9.5px] text-slate-400 font-semibold mt-0.5">Thay đổi thông tin phiên vận hành chuẩn</p>
              </div>
              <button
                onClick={() => setUserPopoverOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-55 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex border-b border-slate-100 pb-0.5">
              <button
                onClick={() => setPopoverTab('editable')}
                className={`flex-1 pb-2 text-center text-[10px] font-black uppercase tracking-wider transition-colors border-b-2 cursor-pointer ${popoverTab === 'editable' ? 'border-[#C21A1A] text-[#C21A1A]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Thay đổi
              </button>
              <button
                onClick={() => setPopoverTab('readonly')}
                className={`flex-1 pb-2 text-center text-[10px] font-black uppercase tracking-wider transition-colors border-b-2 cursor-pointer ${popoverTab === 'readonly' ? 'border-[#C21A1A] text-[#C21A1A]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Hệ thống (Cố định)
              </button>
            </div>

            {popoverTab === 'editable' ? (
              <div className="space-y-3 text-xs max-h-[300px] overflow-y-auto pr-1">
                <div className="space-y-1">
                  <label className="text-[9.5px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>Họ và Tên</span>
                  </label>
                  <input
                    type="text"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    placeholder="Nhập họ và tên đầy đủ..."
                    className="w-full text-xs font-bold text-slate-750 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#C21A1A] focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9.5px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>Số điện thoại</span>
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="Nhập số điện thoại..."
                    className="w-full text-xs font-bold text-slate-750 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#C21A1A] focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9.5px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>Hộp thư Email</span>
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="Nhập email..."
                    className="w-full text-xs font-bold text-slate-750 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#C21A1A] focus:bg-white"
                  />
                </div>

                <div className="space-y-1 pt-1">
                  <label className="text-[9.5px] font-extrabold uppercase text-slate-400 tracking-wider block">Hình đại diện ca trực</label>

                  <div className="flex items-center gap-2 py-1">
                    {[
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
                      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
                      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
                      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80'
                    ].map((url, idx) => {
                      const isChosen = editAvatar === url;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setEditAvatar(url)}
                          className={`w-9 h-9 rounded-xl overflow-hidden border-2 transition-all p-0.5 cursor-pointer shrink-0 ${isChosen ? 'border-[#C21A1A] ring-2 ring-rose-200 scale-105' : 'border-slate-200 hover:border-[#C21A1A]/40'}`}
                        >
                          <img src={url} alt="preset" className="w-full h-full object-cover rounded-[10px]" referrerPolicy="no-referrer" />
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-0.5">
                    <input
                      type="text"
                      value={editAvatar}
                      onChange={(e) => setEditAvatar(e.target.value)}
                      placeholder="Hoặc dán URL hình đại diện khác..."
                      className="w-full text-[10px] font-semibold text-slate-550 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#C21A1A] focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-2 text-[9.5px] text-amber-700 font-semibold mb-1 flex items-start gap-1.5 leading-relaxed">
                  <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>Hệ thống khóa: Bạn không thể tự ý thay đổi vai trò, bộ phận, vị trí hoặc trạng thái của ca vận hành.</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                      <Hash className="w-3 h-3 text-slate-400" />
                      <span>ID Vận Hành</span>
                    </label>
                    <input
                      type="text"
                      disabled
                      value={editId}
                      className="w-full text-xs font-bold text-slate-400 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                      <UserCheck className="w-3 h-3 text-slate-400" />
                      <span>Mã Nhân Sự</span>
                    </label>
                    <input
                      type="text"
                      disabled
                      value={editMaNhanSu}
                      className="w-full text-xs font-bold text-slate-400 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                      <Briefcase className="w-3 h-3 text-slate-400" />
                      <span>Vai Trò / Chức danh</span>
                    </label>
                    <input
                      type="text"
                      disabled
                      value={editRole}
                      className="w-full text-xs font-bold text-slate-400 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                      <Shield className="w-3 h-3 text-emerald-500" />
                      <span>Trạng thái</span>
                    </label>
                    <div className="w-full text-xs font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-1.5 flex items-center gap-1.5 h-8 select-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>{editTrangThai}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                      <Briefcase className="w-3 h-3 text-slate-400" />
                      <span>Bộ Phận</span>
                    </label>
                    <input
                      type="text"
                      disabled
                      value={editBoPhan}
                      className="w-full text-xs font-bold text-slate-400 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>Vị Trí Trực Ca</span>
                    </label>
                    <input
                      type="text"
                      disabled
                      value={editViTri}
                      className="w-full text-xs font-bold text-slate-400 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setUserPopoverOpen(false)}
                className="px-2.5 py-1.5 border border-slate-250 hover:bg-slate-55 text-slate-500 rounded-lg font-bold cursor-pointer transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-3.5 py-1.5 bg-[#C21A1A] hover:bg-[#A31616] text-white rounded-lg font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Lưu cập nhật</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
