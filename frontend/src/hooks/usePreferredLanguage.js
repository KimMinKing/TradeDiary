import { useLocale } from '../i18n/localeContext';

export default function usePreferredLanguage() {
  return useLocale().language;
}
