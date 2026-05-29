import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import i18n from '@/i18n';
import { cn } from '../../lib/utils';
import { useEffect, useState } from 'react';
type Props = {
  className?: string;
};
export function LanguageSwitcher({ className }: Props) {
  const [currentLang, setCurrentLang] = useState(i18n.language);

  useEffect(() => {
    const handler = (lang: string) => setCurrentLang(lang);
    i18n.on('languageChanged', handler);
    return () => i18n.off('languageChanged', handler);
  }, []);

  const changeLang = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('lang', lang);
  };

  return (
    <Select value={currentLang} onValueChange={changeLang}>
      <SelectTrigger className={cn('w-min', className || '')}>
        <SelectValue placeholder="Language" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="vi">🇻🇳</SelectItem>
        <SelectItem value="en">🇺🇸</SelectItem>
      </SelectContent>
    </Select>
  );
}
