import { cn } from '../../../lib/utils';
import { AlertTriangle } from 'lucide-react';
import { toastWarning } from '../deps';
import { useTranslation } from 'react-i18next';

export type TabType = 'profileInfo' | 'password' | 'security' | 'permissions';

interface SettingSidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  menuItems: { key: TabType; label: string }[];
  isFirstLogin?: boolean;
}

export function SettingSidebar({
  activeTab,
  onTabChange,
  menuItems,
  isFirstLogin = false,
}: SettingSidebarProps) {
  const { t } = useTranslation('accountSetting');

  const handleTabClick = (tab: TabType) => {
    if (isFirstLogin && tab !== 'password') {
      toastWarning(t('firstLogin.tabDisabled.title'), t('firstLogin.tabDisabled.message'));
      return;
    }
    onTabChange(tab);
  };

  return (
    <>
      <div className="lg:hidden w-full mb-4">
        <nav className="flex w-full items-center justify-between">
          {menuItems.map((item) => {
            const isActive = activeTab === item.key;
            const isDisabled = isFirstLogin && item.key !== 'password';
            return (
              <button
                key={item.key}
                onClick={() => handleTabClick(item.key)}
                disabled={isDisabled}
                className={cn(
                  'h-8 px-2 rounded-md transition-colors whitespace-nowrap text-sm relative hover:cursor-pointer flex items-center gap-1',
                  isDisabled && 'opacity-50 cursor-not-allowed',
                  isActive
                    ? 'text-primary font-medium bg-primary/5'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                )}
                title={isDisabled ? t('firstLogin.tabDisabled.tooltip') : undefined}
              >
                {isActive && <div className="absolute left-0 right-0 bottom-0 h-0.5 bg-primary" />}
                {item.label}
                {isDisabled && <AlertTriangle className="h-3 w-3 text-orange-500" />}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="hidden lg:block w-64 flex-shrink-0">
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = activeTab === item.key;
            const isDisabled = isFirstLogin && item.key !== 'password';
            return (
              <button
                key={item.key}
                onClick={() => handleTabClick(item.key)}
                disabled={isDisabled}
                className={cn(
                  'w-full h-8 text-left px-2 rounded-md transition-colors relative hover:cursor-pointer flex items-center text-sm gap-2',
                  isDisabled && 'opacity-50 cursor-not-allowed',
                  isActive
                    ? 'text-primary font-medium bg-primary/5'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                )}
                title={isDisabled ? t('firstLogin.tabDisabled.tooltip') : undefined}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                )}
                <span className={cn(isActive && 'ml-2')}>{item.label}</span>
                {isDisabled && <AlertTriangle className="h-3 w-3 text-orange-500 ml-auto" />}
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}
