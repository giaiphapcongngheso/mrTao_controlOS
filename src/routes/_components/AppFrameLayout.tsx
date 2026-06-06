import React, { useCallback } from 'react';
import { Bell, ChevronRight, Layers, Menu } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { TabType } from '../../types/app.types';
import { ScrollArea } from '../../shared/components/scroll-area';
import Logo from '../Logo';

export interface AppFrameLayoutLink {
  key: TabType;
  label: string;
  icon: LucideIcon;
}

interface AppFrameLayoutUser {
  fullName: string;
  role: string;
  avatar?: string;
}

interface AppFrameLayoutProps {
  activeTab: TabType;
  visibleSidebarLinks: AppFrameLayoutLink[];
  currentUser: AppFrameLayoutUser;
  mobileMenuOpen: boolean;
  canViewNotifications: boolean;
  desktopTitle: string;
  headerRight: React.ReactNode;
  children: React.ReactNode;
  onSelectTab: (tab: TabType) => void;
  onLogout: () => void;
  onOpenNotifications: () => void;
  onToggleMobileMenu: () => void;
  onCloseMobileMenu: () => void;
  onPrefetchTab?: (tab: TabType) => void;
}

function AppFrameLayout({
  activeTab,
  visibleSidebarLinks,
  currentUser,
  mobileMenuOpen,
  canViewNotifications,
  desktopTitle,
  headerRight,
  children,
  onSelectTab,
  onLogout,
  onOpenNotifications,
  onToggleMobileMenu,
  onCloseMobileMenu,
  onPrefetchTab,
}: AppFrameLayoutProps) {
  const handleSelectTab = useCallback((tab: TabType) => {
    onSelectTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [onSelectTab]);

  return (
    <div className="min-h-screen bg-surface-bg flex justify-center w-full antialiased p-0">
      <div className="w-full flex flex-col md:flex-row p-0 gap-0 min-w-0">
        <aside className="hidden md:flex flex-col w-[240px] bg-white border-r border-slate-200 shrink-0 sticky top-0 h-screen shadow-xs text-slate-700 py-5 px-4">
          <div className="px-2 pb-4 mb-4 border-b border-slate-100 flex items-center justify-start">
            <Logo size="sm" variant="dark" />
          </div>

          <ScrollArea className="flex-1 pr-1 my-2">
            <nav className="space-y-1">
              {visibleSidebarLinks.map((link) => {
                const IconComp = link.icon;
                const isSelected = activeTab === link.key;
                return (
                  <button
                    key={link.key}
                    onClick={() => handleSelectTab(link.key)}
                    onMouseEnter={() => onPrefetchTab?.(link.key)}
                    className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-left text-sm font-semibold transition-all group cursor-pointer ${isSelected
                      ? 'bg-[#C21A1A] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-rose-50 hover:text-[#C21A1A] border border-transparent'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <IconComp className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-500 group-hover:text-[#C21A1A]'}`} />
                      <span>{link.label}</span>
                    </div>
                    {!isSelected && <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-[#C21A1A] transition-opacity translate-x-[-2px] group-hover:translate-x-0" />}
                  </button>
                );
              })}
            </nav>
          </ScrollArea>

          <div className="pt-3 pb-1 border-t border-slate-100 flex flex-col items-center justify-center select-none text-center shrink-0">
            <span className="text-[10.5px] font-bold text-slate-500 tracking-wide">Powered by NguyenTD</span>
            <span className="text-[9.5px] text-slate-400 font-sans font-semibold mt-0.5">v{__APP_VERSION__}</span>
          </div>
        </aside>

        <header className="md:hidden sticky top-0 bg-[#C21A1A] border-b border-rose-800 h-16 w-full px-4 flex items-center justify-between z-40 shadow-md">
          <Logo size="xs" variant="light" />

          <div className="flex items-center gap-2">
            {canViewNotifications && (
              <button
                onClick={onOpenNotifications}
                className={`p-1.5 text-white hover:bg-white/10 rounded-lg cursor-pointer relative ${activeTab === 'Notifications' ? 'bg-white/20' : ''}`}
                title="Thông báo"
              >
                <Bell className="w-4.5 h-4.5" />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"></span>
              </button>
            )}
            <button
              onClick={onToggleMobileMenu}
              className="p-1.5 text-white hover:bg-white/10 rounded-lg cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </header>

        {mobileMenuOpen && (
          <div className="md:hidden">
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-45"
              onClick={onCloseMobileMenu}
            />

            <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-[0_-8px_32px_rgba(0,0,0,0.12)] z-50 p-5 pb-8 animate-in slide-in-from-bottom duration-250 flex flex-col border-t border-slate-200">
              <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-4 shrink-0" />

              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-3.5 shrink-0">
                <div className="flex items-center gap-3">
                  {currentUser?.avatar ? (
                    <img src={currentUser.avatar} alt="Avatar" className="w-9 h-9 rounded-full border border-slate-200 object-cover" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs uppercase font-extrabold">
                      {currentUser?.fullName.charAt(0)}
                    </div>
                  )}
                  <div className="text-left font-sans">
                    <span className="text-sm font-black text-slate-800 block leading-tight">{currentUser?.fullName}</span>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 leading-none">{currentUser?.role}</p>
                  </div>
                </div>

                <button
                  onClick={onLogout}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-500 font-extrabold text-[10px] rounded-xl border border-rose-150 uppercase tracking-wider cursor-pointer transition-all"
                >
                  Đăng xuất
                </button>
              </div>

              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 select-none text-left shrink-0">HỆ THỐNG PHÂN HỆ VẬN HÀNH</p>

              <div className="grid grid-cols-2 gap-2.5 pb-5 overflow-y-auto max-h-[35vh]">
                {visibleSidebarLinks.map((link) => {
                  const IconComp = link.icon;
                  const isSelected = activeTab === link.key;
                  return (
                    <button
                      key={link.key}
                      onClick={() => {
                        onSelectTab(link.key);
                        onCloseMobileMenu();
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`flex items-center gap-3 p-3 rounded-xl text-left text-sm font-black transition-all cursor-pointer ${isSelected
                        ? 'bg-[#C21A1A] text-white shadow-xs'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-150/50'
                        }`}
                    >
                      <IconComp className={`w-4 h-4 shrink-0 col-span-1 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                      <span className="truncate">{link.label}</span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={onCloseMobileMenu}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 active:scale-99 text-slate-700 font-black text-xs uppercase tracking-wider rounded-xl border border-slate-250 cursor-pointer transition-all shrink-0 text-center"
              >
                Đóng menu
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 flex flex-col gap-0 min-h-0 min-w-0">
          <header className="hidden md:flex items-center justify-between h-14 px-6 bg-white/90 backdrop-blur-md border-b border-slate-100 sticky top-0 z-30 shadow-[0_1px_2px_rgba(0,0,0,0.01)]">
            <div className="flex items-center gap-2.5 select-none">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">MR.TÁO OS</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-350 stroke-[2.5]" />
              <span className="text-sm font-bold text-slate-800 tracking-tight">{desktopTitle}</span>
            </div>
            <div className="flex items-center gap-5">{headerRight}</div>
          </header>

          <div className="p-5 md:p-5 pb-20 md:pb-4 w-full space-y-3.5 font-sans text-sm text-slate-650 min-w-0 flex-1 min-h-0 overflow-y-auto">
            {children}
          </div>
        </main>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 h-16 px-2 flex justify-around items-center z-45 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] rounded-t-2xl pb-safe">
          {visibleSidebarLinks
            .filter((link) => link.key === 'Today' || link.key === 'Checklist' || link.key === 'Tasks' || link.key === 'KPI')
            .map((link) => {
              const IconComp = link.icon;
              const isSelected = activeTab === link.key;
              return (
                <button
                  key={link.key}
                  onClick={() => handleSelectTab(link.key)}
                  className={`flex flex-col items-center justify-center flex-1 h-full font-bold relative cursor-pointer ${isSelected ? 'text-[#C21A1A]' : 'text-slate-400'
                    }`}
                >
                  <IconComp className="w-4.5 h-4.5 mb-1" />
                  <span className="text-[10px]">{link.label}</span>
                  {isSelected && <span className="absolute bottom-1 w-4 h-0.5 bg-[#C21A1A] rounded-full"></span>}
                </button>
              );
            })}

          <button
            onClick={onToggleMobileMenu}
            className={`flex flex-col items-center justify-center flex-1 h-full font-bold relative cursor-pointer ${mobileMenuOpen ? 'text-[#C21A1A]' : 'text-slate-400'}`}
          >
            <Layers className="w-4.5 h-4.5 mb-1" />
            <span className="text-[10px]">Menu</span>
          </button>
        </nav>
      </div>
    </div>
  );
}

export default React.memo(AppFrameLayout);
