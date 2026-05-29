import { ProfileInfoContent } from './profile-info/profile-info';
import { SecuritySettingContent } from './security-setting/security-setting';
import { PermissionSettingContent } from './permission-setting/permission-setting';
import type { TabType } from './setting-sidebar';
import { ScrollArea } from '@shared/ui';

interface SettingContentProps {
  activeTab: TabType;
}

export function SettingContent({ activeTab }: SettingContentProps) {
  const renderContent = () => {
    switch (activeTab) {
      case 'profileInfo':
        return <ProfileInfoContent />;
      case 'security':
        return <SecuritySettingContent />;
      case 'permissions':
        return <PermissionSettingContent />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full lg:flex-1 h-full min-h-0">
      <div className="h-full rounded-xl bg-background">
        <ScrollArea className="h-full p-5">{renderContent()}</ScrollArea>
      </div>
    </div>
  );
}
