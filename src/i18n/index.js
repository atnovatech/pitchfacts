import en from './translations/en';
import bn from './translations/bn';
import es from './translations/es';
import fr from './translations/fr';
import pt from './translations/pt';
import ar from './translations/ar';

const translations = { en, bn, es, fr, pt, ar };

export const t = (language, key) => {
  return translations[language]?.[key] || translations.en[key] || key;
};

export const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'bn', name: 'বাংলা', flag: '🇧🇩' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
];

export default translations;