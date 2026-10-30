import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { storage } from './storage';

export type Language = 'en' | 'kn';

const LANGUAGE_KEY = 'awaaz.language';

const strings = {
  en: {
    tagline: 'Report a problem in Moodbidri and follow what happens next.',
    signIn: 'Sign in',
    signingIn: 'Signing in',
    register: 'Create account',
    registering: 'Creating account',
    haveAccount: 'Already registered? Sign in',
    needAccount: 'New to Awaaz? Create an account',
    fullName: 'Full name',
    phone: 'Mobile number',
    password: 'Password',
    passwordHint: 'Use at least 8 characters.',
    homeAddress: 'Home address',
    addressLine: 'House and street',
    locality: 'Area',
    pincode: 'PIN code',
    addressHint: 'Officers use this only if they need to contact you about a report.',
    signOut: 'Sign out',
    reportProblem: 'Report a problem',
    myReports: 'My reports',
    loading: 'Loading your reports',
    noReports: 'You have no reports yet. Tell us what needs fixing near you.',
    describe: 'What is the problem?',
    describeHint: 'Say what happened and where. Speak or type in Kannada or English.',
    voiceLanguage: 'Language you will speak',
    speak: 'Speak',
    stop: 'Stop',
    transcribing: 'Writing down what you said',
    voiceReview: 'Check the words below and correct anything that is wrong.',
    voiceOff: 'Voice input is not available right now. Type your report instead.',
    micDenied: 'Allow microphone access to speak your report, or type it instead.',
    photo: 'Add a photo',
    photoOptional: 'Optional, but it helps the team find the problem.',
    takePhoto: 'Take photo',
    choosePhoto: 'Choose photo',
    removePhoto: 'Remove photo',
    category: 'Which type fits best?',
    location: 'Where is it?',
    locationHint: 'Tap the map to place the pin, or use your location.',
    useMyLocation: 'Use my location',
    locating: 'Finding your location',
    locationDenied: 'Allow location access, or tap the map to place the pin.',
    landmark: 'Nearby landmark (optional)',
    submit: 'Send report',
    submitting: 'Sending',
    textRequired: 'Describe the problem in at least 5 characters.',
    locationRequired: 'Choose a location on the map.',
    checking: 'Awaaz is checking your report',
    checkingHint: 'This usually takes a few seconds. Your report is already saved.',
    whatHappens: 'Progress',
    updates: 'Updates',
    yourReport: 'Your report',
    aiRead: 'How Awaaz understood it',
    category2: 'Type',
    summary: 'Summary',
    duplicate: 'Duplicate check',
    alreadyReported: (count: number) => `${count} people have reported this. Your report was added to the same issue, so it counts as support.`,
    priority: 'Priority',
    rulesNote: 'Checked by keyword rules, not an AI model. An officer will review it.',
    team: 'Assigned team',
    backHome: 'Back to my reports',
    retry: 'Try again',
    loadFailed: 'Your reports could not be loaded.',
    mapOff: 'The street map is not available in this build. Use your location, or enter coordinates.',
    latitude: 'Latitude',
    longitude: 'Longitude',
  },
  kn: {
    tagline: 'ಮೂಡುಬಿದಿರೆಯ ಸಮಸ್ಯೆಯನ್ನು ವರದಿ ಮಾಡಿ, ಮುಂದೇನಾಯಿತು ಎಂದು ತಿಳಿಯಿರಿ.',
    signIn: 'ಸೈನ್ ಇನ್',
    signingIn: 'ಸೈನ್ ಇನ್ ಆಗುತ್ತಿದೆ',
    register: 'ಖಾತೆ ರಚಿಸಿ',
    registering: 'ಖಾತೆ ರಚಿಸಲಾಗುತ್ತಿದೆ',
    haveAccount: 'ಈಗಾಗಲೇ ನೋಂದಾಯಿಸಿದ್ದೀರಾ? ಸೈನ್ ಇನ್ ಮಾಡಿ',
    needAccount: 'ಆವಾಜ್‌ಗೆ ಹೊಸಬರೇ? ಖಾತೆ ರಚಿಸಿ',
    fullName: 'ಪೂರ್ಣ ಹೆಸರು',
    phone: 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ',
    password: 'ಪಾಸ್‌ವರ್ಡ್',
    passwordHint: 'ಕನಿಷ್ಠ 8 ಅಕ್ಷರಗಳನ್ನು ಬಳಸಿ.',
    homeAddress: 'ಮನೆ ವಿಳಾಸ',
    addressLine: 'ಮನೆ ಮತ್ತು ಬೀದಿ',
    locality: 'ಪ್ರದೇಶ',
    pincode: 'ಪಿನ್ ಕೋಡ್',
    addressHint: 'ವರದಿಯ ಬಗ್ಗೆ ಸಂಪರ್ಕಿಸಬೇಕಾದರೆ ಮಾತ್ರ ಅಧಿಕಾರಿಗಳು ಇದನ್ನು ಬಳಸುತ್ತಾರೆ.',
    signOut: 'ಸೈನ್ ಔಟ್',
    reportProblem: 'ಸಮಸ್ಯೆ ವರದಿ ಮಾಡಿ',
    myReports: 'ನನ್ನ ವರದಿಗಳು',
    loading: 'ನಿಮ್ಮ ವರದಿಗಳನ್ನು ತೆರೆಯಲಾಗುತ್ತಿದೆ',
    noReports: 'ನಿಮ್ಮ ಯಾವುದೇ ವರದಿ ಇಲ್ಲ. ನಿಮ್ಮ ಹತ್ತಿರ ಏನು ಸರಿಪಡಿಸಬೇಕು ಎಂದು ತಿಳಿಸಿ.',
    describe: 'ಸಮಸ್ಯೆ ಏನು?',
    describeHint: 'ಏನಾಯಿತು, ಎಲ್ಲಿ ಎಂದು ತಿಳಿಸಿ. ಕನ್ನಡ ಅಥವಾ ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಮಾತನಾಡಿ ಅಥವಾ ಬರೆಯಿರಿ.',
    voiceLanguage: 'ನೀವು ಮಾತನಾಡುವ ಭಾಷೆ',
    speak: 'ಮಾತನಾಡಿ',
    stop: 'ನಿಲ್ಲಿಸಿ',
    transcribing: 'ನೀವು ಹೇಳಿದ್ದನ್ನು ಬರೆಯಲಾಗುತ್ತಿದೆ',
    voiceReview: 'ಕೆಳಗಿನ ಪದಗಳನ್ನು ಪರಿಶೀಲಿಸಿ, ತಪ್ಪಿದ್ದರೆ ಸರಿಪಡಿಸಿ.',
    voiceOff: 'ಧ್ವನಿ ಸೌಲಭ್ಯ ಈಗ ಲಭ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ಬರೆದು ತಿಳಿಸಿ.',
    micDenied: 'ಮಾತನಾಡಲು ಮೈಕ್ರೋಫೋನ್ ಅನುಮತಿ ನೀಡಿ, ಅಥವಾ ಬರೆದು ತಿಳಿಸಿ.',
    photo: 'ಫೋಟೋ ಸೇರಿಸಿ',
    photoOptional: 'ಐಚ್ಛಿಕ, ಆದರೆ ತಂಡಕ್ಕೆ ಸಮಸ್ಯೆ ಹುಡುಕಲು ಸಹಾಯವಾಗುತ್ತದೆ.',
    takePhoto: 'ಫೋಟೋ ತೆಗೆಯಿರಿ',
    choosePhoto: 'ಫೋಟೋ ಆಯ್ಕೆಮಾಡಿ',
    removePhoto: 'ಫೋಟೋ ತೆಗೆದುಹಾಕಿ',
    category: 'ಯಾವ ವಿಧ ಸರಿಹೊಂದುತ್ತದೆ?',
    location: 'ಇದು ಎಲ್ಲಿದೆ?',
    locationHint: 'ನಕ್ಷೆಯಲ್ಲಿ ಒತ್ತಿ ಪಿನ್ ಇರಿಸಿ, ಅಥವಾ ನಿಮ್ಮ ಸ್ಥಳ ಬಳಸಿ.',
    useMyLocation: 'ನನ್ನ ಸ್ಥಳ ಬಳಸಿ',
    locating: 'ನಿಮ್ಮ ಸ್ಥಳ ಹುಡುಕಲಾಗುತ್ತಿದೆ',
    locationDenied: 'ಸ್ಥಳದ ಅನುಮತಿ ನೀಡಿ, ಅಥವಾ ನಕ್ಷೆಯಲ್ಲಿ ಪಿನ್ ಇರಿಸಿ.',
    landmark: 'ಹತ್ತಿರದ ಗುರುತು (ಐಚ್ಛಿಕ)',
    submit: 'ವರದಿ ಕಳುಹಿಸಿ',
    submitting: 'ಕಳುಹಿಸಲಾಗುತ್ತಿದೆ',
    textRequired: 'ಸಮಸ್ಯೆಯನ್ನು ಕನಿಷ್ಠ 5 ಅಕ್ಷರಗಳಲ್ಲಿ ವಿವರಿಸಿ.',
    locationRequired: 'ನಕ್ಷೆಯಲ್ಲಿ ಸ್ಥಳ ಆಯ್ಕೆಮಾಡಿ.',
    checking: 'ಆವಾಜ್ ನಿಮ್ಮ ವರದಿಯನ್ನು ಪರಿಶೀಲಿಸುತ್ತಿದೆ',
    checkingHint: 'ಸಾಮಾನ್ಯವಾಗಿ ಕೆಲವು ಸೆಕೆಂಡುಗಳು ಬೇಕಾಗುತ್ತದೆ. ನಿಮ್ಮ ವರದಿ ಈಗಾಗಲೇ ಉಳಿಸಲಾಗಿದೆ.',
    whatHappens: 'ಪ್ರಗತಿ',
    updates: 'ಮಾಹಿತಿ',
    yourReport: 'ನಿಮ್ಮ ವರದಿ',
    aiRead: 'ಆವಾಜ್ ಇದನ್ನು ಹೇಗೆ ಅರ್ಥಮಾಡಿಕೊಂಡಿತು',
    category2: 'ವಿಧ',
    summary: 'ಸಾರಾಂಶ',
    duplicate: 'ನಕಲು ಪರಿಶೀಲನೆ',
    alreadyReported: (count: number) => `${count} ಜನರು ಇದನ್ನು ವರದಿ ಮಾಡಿದ್ದಾರೆ. ನಿಮ್ಮ ವರದಿಯನ್ನು ಅದೇ ಸಮಸ್ಯೆಗೆ ಸೇರಿಸಲಾಗಿದೆ.`,
    priority: 'ಆದ್ಯತೆ',
    rulesNote: 'ಇದನ್ನು AI ಮಾದರಿ ಅಲ್ಲ, ಕೀವರ್ಡ್ ನಿಯಮಗಳು ಪರಿಶೀಲಿಸಿವೆ. ಅಧಿಕಾರಿ ಪರಿಶೀಲಿಸುತ್ತಾರೆ.',
    team: 'ನಿಯೋಜಿತ ತಂಡ',
    backHome: 'ನನ್ನ ವರದಿಗಳಿಗೆ ಹಿಂತಿರುಗಿ',
    retry: 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ',
    loadFailed: 'ನಿಮ್ಮ ವರದಿಗಳನ್ನು ತೆರೆಯಲು ಆಗಲಿಲ್ಲ.',
    mapOff: 'ಈ ಆವೃತ್ತಿಯಲ್ಲಿ ಬೀದಿ ನಕ್ಷೆ ಲಭ್ಯವಿಲ್ಲ. ನಿಮ್ಮ ಸ್ಥಳ ಬಳಸಿ, ಅಥವಾ ನಿರ್ದೇಶಾಂಕಗಳನ್ನು ನಮೂದಿಸಿ.',
    latitude: 'ಅಕ್ಷಾಂಶ',
    longitude: 'ರೇಖಾಂಶ',
  },
} satisfies Record<Language, Record<string, unknown>>;

export type Strings = (typeof strings)['en'];

interface LanguageContextValue {
  language: Language;
  t: Strings;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    void storage.get(LANGUAGE_KEY).then((saved) => {
      if (saved === 'en' || saved === 'kn') setLanguage(saved);
    });
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage((current) => {
      const next = current === 'en' ? 'kn' : 'en';
      void storage.set(LANGUAGE_KEY, next);
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
