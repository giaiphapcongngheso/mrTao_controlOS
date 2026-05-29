import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingSidebar, type TabType } from './_components/setting-sidebar';
import { SettingContent } from './_components/setting-content';
import { useAuthStore } from '../../auth';
import { Alert, AlertDescription, AlertTitle } from '../../ui';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export interface AccountSettingProps {
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
}

export function AccountSetting({
  activeTab: externalTab,
  onTabChange: externalOnTabChange,
}: AccountSettingProps) {
  const { t } = useTranslation('accountSetting');
  const [internalTab, setInternalTab] = useState<TabType>('profileInfo');

  const activeTab = externalTab ?? internalTab;

  const { user } = useAuthStore();
  const isFirstLogin = user?.isFirstLogin ?? false;

  useEffect(() => {
    if (isFirstLogin && activeTab === 'password') {
      toast.warning(t('firstLogin.warning.title'), {
        description: t('firstLogin.warning.description'),
      });
    }
  }, [isFirstLogin, activeTab, t]);

  const menuItems: { key: TabType; label: string }[] = [
    { key: 'profileInfo', label: t('menu.profileInfo') },
    // { key: 'security', label: t('menu.security') },
    { key: 'permissions', label: t('menu.permissions') },
  ];

  const handleTabChange = (tab: TabType) => {
    if (isFirstLogin && tab !== 'password') {
      return;
    }

    if (externalOnTabChange) {
      externalOnTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="shrink-0">
        <h3 className="text-2xl font-bold w-max">{t('title')}</h3>
      </div>

      {isFirstLogin && (
        <Alert
          variant="destructive"
          className="border-orange-500 bg-orange-50 dark:bg-orange-950/20"
        >
          <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          <AlertTitle className="text-orange-800 dark:text-orange-200">
            {t('firstLogin.warning.title')}
          </AlertTitle>
          <AlertDescription className="text-orange-700 dark:text-orange-300">
            {t('firstLogin.warning.description')}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 flex-1 min-h-0">
        <SettingSidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          menuItems={menuItems}
          isFirstLogin={isFirstLogin}
        />
        <SettingContent activeTab={activeTab} />
      </div>
    </div>
  );
}
