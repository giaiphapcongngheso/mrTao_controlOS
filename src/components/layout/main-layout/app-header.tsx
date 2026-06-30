import { LanguageSwitcher } from '@shared/components/common/language-switcher';
import { ZoomControl } from '@shared/zoom';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@shared/ui';
import { SidebarTrigger } from '@shared/ui/sidebar';
import { EUploadType } from '@/enums/upload-type.enum';
import { useFile } from '@/hooks/use-file';
import { translate } from '@/lib/translation-utils';
import { logout, fetchEmployeesAndSelect } from '@/services/auth/auth-service';
import { useAuthStore } from '@/stores/auth-store';
import { useGlobalStore } from '@/stores/global-store';
import { useIsFetching } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { LogOut, Settings, User, ArrowLeftRight } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NotificationBell } from './notification-bell';
import { ModeToggle } from '@/components/mode-toggle';
export function AppHeader() {
  const navigate = useNavigate();
  const { user, employeeInfo, organization } = useAuthStore();
  const { setLoading } = useGlobalStore();
  // const { logoutMutation } = useAuth();
  const { t, i18n } = useTranslation(['common', 'auth', 'appHeader']);
  const { getFileUrl } = useFile();
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [organizationName, setOrganizationName] = useState<string>('');
  const isFetching = useIsFetching() > 0;

  // Dịch organization name tự động dựa trên ngôn ngữ hiện tại
  useEffect(() => {
    const translateOrgName = async () => {
      if (!organization?.name) {
        setOrganizationName('');
        return;
      }
      const translated = await translate(organization.name as string, i18n.language);
      setOrganizationName(translated);
    };

    void translateOrgName();
  }, [organization?.name, i18n.language]);
  // Load avatar image URL
  useEffect(() => {
    const loadAvatar = async () => {
      if (!user?.avatarUrl) {
        setAvatarUrl(undefined);
        return;
      }

      // If already a data URL or blob URL, use it directly
      if (user.avatarUrl.startsWith('data:') || user.avatarUrl.startsWith('blob:')) {
        setAvatarUrl(user.avatarUrl);
        return;
      }

      // Otherwise, get file URL from service
      try {
        const blobUrl = await getFileUrl({
          filePath: user.avatarUrl,
          uploadType: EUploadType.Sftp,
        });
        setAvatarUrl(blobUrl || undefined);
      } catch (error) {
        console.error('Error loading avatar:', error);
        setAvatarUrl(undefined);
      }
    };

    loadAvatar();
  }, [user?.avatarUrl, getFileUrl]);

  // Lấy chữ cái đầu và cuối của tên để làm fallback avatar
  const getInitials = (name: string) => {
    if (!name) return '';
    const words = name
      .trim()
      .split(' ')
      .filter((word) => word.length > 0);
    if (words.length === 0) return '';
    if (words.length === 1) return words[0][0].toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  };

  const handleSwitchEmployee = async () => {
    useAuthStore.getState().setSelectedEmployeeId(null);
    useAuthStore.getState().setEmployeeInfo(null);
    useAuthStore.getState().setProfileFromApi({ permissions: null });
    await fetchEmployeesAndSelect();
  };

  const handleLogout = async () => {
    try {
      logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className="relative flex justify-between gap-2 px-2 md:px-4 lg:px-6 py-4 shrink-0">
      {isFetching && (
        <div
          className={`absolute top-[120%] h-[3px] z-20 bg-gradient-to-r from-[#103378] via-[#c82b56] via-[#103378] to-[#c82b56] ${
            isFetching ? 'animate-shimmer' : ''
          }`}
        />
      )}
      <div className="flex items-center gap-3">
        <SidebarTrigger className="cursor-pointer" />
        {/* <div className="flex flex-col">
          <h3 className="text-base text-primary font-bold">{t('appHeader:title')}</h3>
        </div> */}
      </div>
      <div className="flex items-center gap-3">
        <Fragment>
          <ZoomControl className="hidden md:flex" />
          <LanguageSwitcher className="hidden lg:flex" />
          <NotificationBell />
          <ModeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-3 cursor-pointer outline-none">
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium">
                  {employeeInfo?.fullName ?? user?.fullName} ({user?.username})
                </span>
                <span className="text-xs text-muted-foreground hidden lg:inline">
                  {organizationName}
                </span>
              </div>
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={avatarUrl}
                  alt={user?.fullName}
                  className="object-cover object-center"
                />
                <AvatarFallback>{getInitials(user?.fullName || '')}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">
                    {employeeInfo?.fullName ?? user?.fullName} ({user?.username})
                  </p>
                  <p className="text-xs text-muted-foreground">{organizationName}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate({ to: '/dashboard' })}>
                <User className="h-4 w-4" />
                <span>{t('appHeader:profile')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate({ to: '/dashboard' })}>
                <Settings className="h-4 w-4" />
                <span>{t('appHeader:settings')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSwitchEmployee}>
                <ArrowLeftRight className="h-4 w-4" />
                <span>Đổi nhân viên</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                <span>{t('common:logout')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Fragment>
      </div>
    </header>
  );
}
