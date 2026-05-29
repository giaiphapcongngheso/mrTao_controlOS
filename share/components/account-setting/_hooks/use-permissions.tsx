import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { permissionService } from '../deps';
import { useEffect, useState } from 'react';

const DEFAULT_STALE_TIME = 5 * 60 * 1000; // 5 minutes
const queryKeyMyPermissions = 'my-permissions';

export function usePermissions() {
  const { i18n } = useTranslation();
  // Get current language from i18n
  const [language, setLanguage] = useState(
    () => i18n.language || localStorage.getItem('lang') || 'vi',
  );

  // Listen for language changes from i18n
  useEffect(() => {
    const handleLanguageChange = (lang: string) => {
      setLanguage(lang);
    };

    // Listen to i18n languageChanged event
    i18n.on('languageChanged', handleLanguageChange);

    // Also listen to storage events (for cross-tab synchronization)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'lang' && e.newValue) {
        setLanguage(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const getMyPermissionsQuery = useQuery({
    queryKey: [queryKeyMyPermissions, language],
    queryFn: async () => {
      return await permissionService.getMyPermissions();
    },
    staleTime: DEFAULT_STALE_TIME,
  });

  return {
    getMyPermissionsQuery,
  };
}
