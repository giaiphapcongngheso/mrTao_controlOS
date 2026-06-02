import React, { useState } from 'react';
import { Lock, User, LogIn, AlertCircle, CheckCircle2, LockKeyhole } from 'lucide-react';
import Logo from '../Logo';
import type { UserSession } from '../../shared/auth';
import {
  authenticateWithInternalStaff,
  InternalAuthError,
} from '../../services/admin/internal-auth-service';

interface LoginViewProps {
  onLogin: (session: UserSession) => void;
}

function mapLoginError(error: unknown): string {
  if (!(error instanceof InternalAuthError)) {
    return 'Đăng nhập thất bại. Vui lòng thử lại.';
  }

  switch (error.code) {
    case 'INVALID_CREDENTIALS':
      return 'Tên đăng nhập hoặc mật khẩu không chính xác.';
    case 'ACCOUNT_INACTIVE':
      return 'Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản lý.';
    case 'SYSTEM_ERROR':
      return 'Không thể kết nối dữ liệu nhân sự. Vui lòng thử lại.';
    case 'DATA_ERROR':
      return 'Dữ liệu tài khoản không hợp lệ. Vui lòng liên hệ quản trị.';
    default:
      return 'Đăng nhập thất bại. Vui lòng thử lại.';
  }
}

export default function LoginView({ onLogin }: LoginViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError('Vui lòng nhập tên đăng nhập.');
      return;
    }

    if (!password) {
      setError('Vui lòng nhập mật khẩu.');
      return;
    }

    setIsLoading(true);

    try {
      const session = await authenticateWithInternalStaff({ username, password });
      setLoginSuccess(true);
      setTimeout(() => {
        onLogin(session);
      }, 600);
    } catch (submitError) {
      setError(mapLoginError(submitError));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden font-sans px-4 select-none py-4">
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-red-500/5 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-rose-500/5 blur-[100px] pointer-events-none"></div>

      <div className="mb-6 flex flex-col items-center text-center relative z-10 animate-fade-in select-none">
        <Logo size="md" variant="dark" />
        <p className="text-[9px] text-slate-500 font-sans font-bold tracking-wider uppercase mt-4.5 py-1 px-3 bg-slate-100 border border-slate-200/70 rounded-full select-none shadow-xs">
          RETAIL ERP &amp; STANDARD SOP MANAGER
        </p>
      </div>

      <div className="w-full max-w-[345px] bg-white border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-100 p-5 relative z-10 text-left">
        {loginSuccess ? (
          <div className="py-6 text-center space-y-3 flex flex-col items-center justify-center transition-all duration-300">
            <div className="h-12 w-12 bg-rose-500/10 rounded-full border border-rose-200 flex items-center justify-center text-[#C21A1A]">
              <CheckCircle2 className="w-7 h-7 animate-bounce" />
            </div>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Đăng nhập thành công</h2>
            <p className="text-[10px] text-slate-400 font-medium">Đang đồng bộ dữ liệu phiên ca trực...</p>
            <div className="flex justify-center mt-1">
              <div className="w-4 h-4 border-2 border-slate-205 border-t-[#C21A1A] rounded-full animate-spin"></div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <LockKeyhole className="w-3.5 h-3.5 text-[#C21A1A]" />
              <h2 className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">Xác thực nhân sự ca trực</h2>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-100 p-2.5 rounded-xl flex items-start gap-2 text-[10px] text-rose-700">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span className="font-semibold leading-relaxed">{error}</span>
              </div>
            )}

            <div className="space-y-1 text-left">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <User className="w-3 h-3 text-slate-400" />
                Tên đăng nhập
              </label>
              <input
                type="text"
                placeholder="Nhập username nhân sự"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-50/50 border border-slate-200 focus:border-[#C21A1A] focus:outline-none focus:ring-1 focus:ring-[#C21A1A] px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 placeholder-slate-400 transition-all"
              />
            </div>

            <div className="space-y-1 text-left">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400" />
                Mật khẩu vận hành
              </label>
              <input
                type="password"
                placeholder="Nhập mật khẩu"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50/50 border border-slate-200 focus:border-[#C21A1A] focus:outline-none focus:ring-1 focus:ring-[#C21A1A] px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 placeholder-slate-400 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-3 bg-[#C21A1A] hover:bg-[#A31616] disabled:bg-[#C21A1A]/60 md:active:scale-95 text-[10.5px] font-extrabold text-white rounded-lg shadow-md shadow-red-900/10 tracking-widest uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1"
            >
              {isLoading ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/60 border-t-transparent rounded-full animate-spin"></div>
                  <span>Đang tải...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Xác nhận Đăng nhập</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>

      <p className="mt-5 text-[8.5px] text-slate-400 font-semibold tracking-wider uppercase relative z-10 text-center">
        Quầy bán lẻ Mr. Táo • Hệ thống ERP lưu ký thông tin nội bộ
      </p>
    </div>
  );
}
