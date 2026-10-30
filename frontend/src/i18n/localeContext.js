import { createContext, useContext } from 'react';

export const LocaleContext = createContext({ language: 'en', locale: 'en-US', t: value => value });
export const useLocale = () => useContext(LocaleContext);
