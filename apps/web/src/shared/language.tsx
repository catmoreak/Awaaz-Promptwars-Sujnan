import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type Language = 'en' | 'kn';

const LANGUAGE_KEY = 'awaaz.language';

const strings = {
  en: {
    signIn: 'Sign in',
    signingIn: 'Signing in',
    createAccount: 'Create account',
    creatingAccount: 'Creating account',
    haveAccount: 'I have an account',
    identifier: 'Mobile number or email',
    fullName: 'Full name',
    mobile: 'Mobile number',
    password: 'Password',
    passwordHint: 'At least 8 characters',
    homeAddress: 'Home address',
    addressLine: 'House and street',
    area: 'Area',
    pincode: 'PIN code',
    signOut: 'Sign out',
    report: 'Report a problem',
    track: 'Track a report',
    lines: ['Moodbidri,', 'speak up.'],
    lead: 'Report a civic problem. Watch it get fixed.',
    steps: [
      ['Speak', 'Kannada or English'],
      ['Pin it', 'Exactly where it is'],
      ['See it fixed', 'Every step, live'],
    ],
    notice: 'Independent prototype. Not an official municipal service. In an emergency, call 112.',
    caption: 'Thousand Pillar Temple, Moodbidri. Artistic 3D recreation.',
    hello: (name: string) => `Hello, ${name}`,
    myReports: 'My reports',
    noReports: 'No reports yet.',
    whatHappened: 'What happened?',
    speak: 'Speak',
    stop: 'Stop',
    transcribing: 'Listening',
    micDenied: 'Allow microphone access, or type instead.',
    voiceFailed: 'Voice is unavailable. Type instead.',
    photo: 'Photo',
    choosePhoto: 'Add photo',
    removePhoto: 'Remove photo',
    type: 'Type',
    where: 'Where?',
    useMyLocation: 'Use my location',
    locating: 'Finding you',
    locationDenied: 'Allow location access, or enter it below.',
    latitude: 'Latitude',
    longitude: 'Longitude',
    landmark: 'Nearby landmark',
    send: 'Send report',
    sending: 'Sending',
    textRequired: 'Describe the problem first.',
    locationRequired: 'Add a location first.',
    checking: 'Checking your report',
    progress: 'Progress',
    summary: 'Summary',
    priority: 'Priority',
    reportedBy: (count: number) => `Reported by ${count} people`,
    updates: 'Updates',
    yourReport: 'Your report',
    team: 'Team',
    back: 'My reports',
    retry: 'Try again',
  },
  kn: {
    signIn: 'ಸೈನ್ ಇನ್',
    signingIn: 'ಸೈನ್ ಇನ್ ಆಗುತ್ತಿದೆ',
    createAccount: 'ಖಾತೆ ರಚಿಸಿ',
    creatingAccount: 'ಖಾತೆ ರಚಿಸಲಾಗುತ್ತಿದೆ',
    haveAccount: 'ನನಗೆ ಖಾತೆ ಇದೆ',
    identifier: 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಅಥವಾ ಇಮೇಲ್',
    fullName: 'ಪೂರ್ಣ ಹೆಸರು',
    mobile: 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ',
    password: 'ಪಾಸ್‌ವರ್ಡ್',
    passwordHint: 'ಕನಿಷ್ಠ 8 ಅಕ್ಷರಗಳು',
    homeAddress: 'ಮನೆ ವಿಳಾಸ',
    addressLine: 'ಮನೆ ಮತ್ತು ಬೀದಿ',
    area: 'ಪ್ರದೇಶ',
    pincode: 'ಪಿನ್ ಕೋಡ್',
    signOut: 'ಸೈನ್ ಔಟ್',
    report: 'ಸಮಸ್ಯೆ ವರದಿ ಮಾಡಿ',
    track: 'ವರದಿ ಗಮನಿಸಿ',
    lines: ['ಮೂಡುಬಿದಿರೆ,', 'ಧ್ವನಿ ಎತ್ತಿ.'],
    lead: 'ಸಮಸ್ಯೆ ವರದಿ ಮಾಡಿ. ಪರಿಹಾರ ನೋಡಿ.',
    steps: [
      ['ಮಾತನಾಡಿ', 'ಕನ್ನಡ ಅಥವಾ ಇಂಗ್ಲಿಷ್'],
      ['ಸ್ಥಳ ಗುರುತಿಸಿ', 'ಅದು ಇರುವಲ್ಲೇ'],
      ['ಪರಿಹಾರ ನೋಡಿ', 'ಪ್ರತಿ ಹಂತವೂ'],
    ],
    notice: 'ಸ್ವತಂತ್ರ ಮಾದರಿ. ಅಧಿಕೃತ ಪುರಸಭೆ ಸೇವೆಯಲ್ಲ. ತುರ್ತು ಸಂದರ್ಭದಲ್ಲಿ 112 ಕರೆ ಮಾಡಿ.',
    caption: 'ಸಾವಿರ ಕಂಬದ ಬಸದಿ, ಮೂಡುಬಿದಿರೆ. ಕಲಾತ್ಮಕ 3D ರಚನೆ.',
    hello: (name: string) => `ನಮಸ್ಕಾರ, ${name}`,
    myReports: 'ನನ್ನ ವರದಿಗಳು',
    noReports: 'ಇನ್ನೂ ವರದಿಗಳಿಲ್ಲ.',
    whatHappened: 'ಏನಾಯಿತು?',
    speak: 'ಮಾತನಾಡಿ',
    stop: 'ನಿಲ್ಲಿಸಿ',
    transcribing: 'ಕೇಳಲಾಗುತ್ತಿದೆ',
    micDenied: 'ಮೈಕ್ರೋಫೋನ್ ಅನುಮತಿ ನೀಡಿ, ಅಥವಾ ಬರೆಯಿರಿ.',
    voiceFailed: 'ಧ್ವನಿ ಲಭ್ಯವಿಲ್ಲ. ಬರೆಯಿರಿ.',
    photo: 'ಫೋಟೋ',
    choosePhoto: 'ಫೋಟೋ ಸೇರಿಸಿ',
    removePhoto: 'ಫೋಟೋ ತೆಗೆಯಿರಿ',
    type: 'ವಿಧ',
    where: 'ಎಲ್ಲಿ?',
    useMyLocation: 'ನನ್ನ ಸ್ಥಳ ಬಳಸಿ',
    locating: 'ಹುಡುಕಲಾಗುತ್ತಿದೆ',
    locationDenied: 'ಸ್ಥಳದ ಅನುಮತಿ ನೀಡಿ, ಅಥವಾ ಕೆಳಗೆ ನಮೂದಿಸಿ.',
    latitude: 'ಅಕ್ಷಾಂಶ',
    longitude: 'ರೇಖಾಂಶ',
    landmark: 'ಹತ್ತಿರದ ಗುರುತು',
    send: 'ವರದಿ ಕಳುಹಿಸಿ',
    sending: 'ಕಳುಹಿಸಲಾಗುತ್ತಿದೆ',
    textRequired: 'ಮೊದಲು ಸಮಸ್ಯೆ ವಿವರಿಸಿ.',
    locationRequired: 'ಮೊದಲು ಸ್ಥಳ ಸೇರಿಸಿ.',
    checking: 'ವರದಿ ಪರಿಶೀಲನೆಯಲ್ಲಿದೆ',
    progress: 'ಪ್ರಗತಿ',
    summary: 'ಸಾರಾಂಶ',
    priority: 'ಆದ್ಯತೆ',
    reportedBy: (count: number) => `${count} ಜನರು ವರದಿ ಮಾಡಿದ್ದಾರೆ`,
    updates: 'ಮಾಹಿತಿ',
    yourReport: 'ನಿಮ್ಮ ವರದಿ',
    team: 'ತಂಡ',
    back: 'ನನ್ನ ವರದಿಗಳು',
    retry: 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ',
  },
};

export type Strings = (typeof strings)['en'];

interface LanguageValue {
  language: Language;
  t: Strings;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageValue | null>(null);

function savedLanguage(): Language {
  try {
    return localStorage.getItem(LANGUAGE_KEY) === 'kn' ? 'kn' : 'en';
  } catch {
    return 'en';
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(savedLanguage);

  const toggleLanguage = useCallback(() => {
    setLanguage((current) => {
      const next = current === 'en' ? 'kn' : 'en';
      try {
        localStorage.setItem(LANGUAGE_KEY, next);
      } catch {
        // The choice still applies until the page reloads.
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ language, t: strings[language] as Strings, toggleLanguage }), [language, toggleLanguage]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('useLanguage must be used inside LanguageProvider');
  return value;
}
