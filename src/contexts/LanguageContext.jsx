import React, { createContext, useContext, useState, useCallback } from 'react';
import { translations, languageNames, getCurrentLanguage, setLanguage as saveLanguage } from '../utils/translations';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(getCurrentLanguage);

  const setLanguage = useCallback((lang) => {
    setLanguageState(lang);
    saveLanguage(lang);
  }, []);

  // Translation function
  const t = useCallback((key) => {
    return translations[language]?.[key] || translations.en[key] || key;
  }, [language]);

  // Get all available languages
  const availableLanguages = Object.keys(languageNames).map(code => ({
    code,
    name: languageNames[code]
  }));

  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage, 
      t,
      availableLanguages,
      languageNames
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageContext;
