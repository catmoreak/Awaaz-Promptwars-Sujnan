import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type Language = 'en' | 'kn';

const LANGUAGE_KEY = 'awaaz.language';

const strings = {
  en: {
    signIn: 'Sign in',
    signingIn: 'Signing in',
    createAccount: 'Create account',
    creatingAccount: 'Creating account',
    haveAccount: 'Already have an account?',
    newHere: 'New to Awaaz?',
    signInTitle: 'Sign in to Awaaz',
    signInLead: 'Report a problem or track one you have sent.',
    registerTitle: 'Create your account',
    registerLead: 'You need an account to report and track problems.',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
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
    close: 'Close',
    headline: 'Report a civic problem in Moodbidri',
    lead: 'Say what is wrong , mark the place, and follow the work until it is resolved.',
    howItWorks: 'How it works',
    steps: [
      ['Describe the problem', 'Speak or type in Kannada or English. Add a photo if you have one.'],
      ['Mark the place', 'Use your location, or enter the spot yourself.'],
      ['Follow the progress', 'See each status change and the notes from the team.'],
    ],
    whatToReport: 'What you can report',
    otherCategory: 'Something else? Choose Other when you report it.',
    afterYouReport: 'After you report',
    afterPoints: [
      ['One problem, one case', 'Reports of the same problem in the same place are joined, so a crew only has to go once.'],
      ['Danger comes first', 'Fixed rules rank each case by safety risk, people affected and time waiting. Immediate danger to life always ranks high.'],
      ['Nothing closes silently', 'You see every status change. If a case is closed without action, the reason is shown to you.'],
    ],
    tagline: 'Civic problem reporting for Moodbidri, in Kannada and English.',
    onThisPage: 'On this page',
    yourAccount: 'Your account',
    emergency: 'In an emergency',
    emergencyCall: 'Call 112',
    emergencyNote: 'Awaaz is not monitored for emergencies.',
    notice: 'Independent prototype. Not an official municipal service.',
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
    haveAccount: 'ಈಗಾಗಲೇ ಖಾತೆ ಇದೆಯೇ?',
    newHere: 'ಆವಾಜ್‌ಗೆ ಹೊಸಬರೇ?',
    signInTitle: 'ಆವಾಜ್‌ಗೆ ಸೈನ್ ಇನ್ ಮಾಡಿ',
    signInLead: 'ಸಮಸ್ಯೆ ವರದಿ ಮಾಡಿ ಅಥವಾ ಕಳುಹಿಸಿದ ವರದಿಯನ್ನು ಗಮನಿಸಿ.',
    registerTitle: 'ನಿಮ್ಮ ಖಾತೆ ರಚಿಸಿ',
    registerLead: 'ಸಮಸ್ಯೆ ವರದಿ ಮಾಡಲು ಮತ್ತು ಗಮನಿಸಲು ಖಾತೆ ಬೇಕು.',
    showPassword: 'ಪಾಸ್‌ವರ್ಡ್ ತೋರಿಸಿ',
    hidePassword: 'ಪಾಸ್‌ವರ್ಡ್ ಮರೆಮಾಡಿ',
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
    close: 'ಮುಚ್ಚಿ',
    headline: 'ಮೂಡುಬಿದಿರೆಯ ನಾಗರಿಕ ಸಮಸ್ಯೆಯನ್ನು ವರದಿ ಮಾಡಿ',
    lead: 'ಕನ್ನಡ ಅಥವಾ ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಸಮಸ್ಯೆ ತಿಳಿಸಿ, ಸ್ಥಳ ಗುರುತಿಸಿ, ಪರಿಹಾರವಾಗುವವರೆಗೆ ಕೆಲಸದ ಪ್ರಗತಿ ನೋಡಿ.',
    howItWorks: 'ಇದು ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ',
    steps: [
      ['ಸಮಸ್ಯೆ ವಿವರಿಸಿ', 'ಕನ್ನಡ ಅಥವಾ ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಮಾತನಾಡಿ ಅಥವಾ ಬರೆಯಿರಿ. ಇದ್ದರೆ ಫೋಟೋ ಸೇರಿಸಿ.'],
      ['ಸ್ಥಳ ಗುರುತಿಸಿ', 'ನಿಮ್ಮ ಸ್ಥಳ ಬಳಸಿ, ಅಥವಾ ಸ್ಥಳವನ್ನು ನೀವೇ ನಮೂದಿಸಿ.'],
      ['ಪ್ರಗತಿ ಗಮನಿಸಿ', 'ಪ್ರತಿ ಸ್ಥಿತಿ ಬದಲಾವಣೆ ಮತ್ತು ತಂಡದ ಟಿಪ್ಪಣಿಗಳನ್ನು ನೋಡಿ.'],
    ],
    whatToReport: 'ನೀವು ಏನನ್ನು ವರದಿ ಮಾಡಬಹುದು',
    otherCategory: 'ಬೇರೆ ಸಮಸ್ಯೆಯೇ? ವರದಿ ಮಾಡುವಾಗ ಇತರೆ ಆಯ್ಕೆಮಾಡಿ.',
    afterYouReport: 'ವರದಿ ಮಾಡಿದ ನಂತರ',
    afterPoints: [
      ['ಒಂದು ಸಮಸ್ಯೆ, ಒಂದು ಪ್ರಕರಣ', 'ಒಂದೇ ಸ್ಥಳದ ಒಂದೇ ಸಮಸ್ಯೆಯ ವರದಿಗಳನ್ನು ಒಟ್ಟುಗೂಡಿಸಲಾಗುತ್ತದೆ, ಹೀಗಾಗಿ ತಂಡ ಒಮ್ಮೆ ಹೋದರೆ ಸಾಕು.'],
      ['ಅಪಾಯಕ್ಕೆ ಮೊದಲ ಆದ್ಯತೆ', 'ಸುರಕ್ಷತಾ ಅಪಾಯ, ಬಾಧಿತ ಜನರು ಮತ್ತು ಕಾಯುವ ಸಮಯದ ಆಧಾರದಲ್ಲಿ ನಿಗದಿತ ನಿಯಮಗಳು ಪ್ರತಿ ಪ್ರಕರಣಕ್ಕೆ ಆದ್ಯತೆ ನೀಡುತ್ತವೆ. ಜೀವಕ್ಕೆ ತಕ್ಷಣದ ಅಪಾಯ ಇದ್ದರೆ ಯಾವಾಗಲೂ ಹೆಚ್ಚಿನ ಆದ್ಯತೆ.'],
      ['ಯಾವುದೂ ಸದ್ದಿಲ್ಲದೆ ಮುಚ್ಚುವುದಿಲ್ಲ', 'ಪ್ರತಿ ಸ್ಥಿತಿ ಬದಲಾವಣೆಯನ್ನು ನೀವು ನೋಡಬಹುದು. ಕ್ರಮವಿಲ್ಲದೆ ಮುಚ್ಚಿದರೆ, ಕಾರಣವನ್ನು ನಿಮಗೆ ತೋರಿಸಲಾಗುತ್ತದೆ.'],
    ],
    tagline: 'ಮೂಡುಬಿದಿರೆಗಾಗಿ ಕನ್ನಡ ಮತ್ತು ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ನಾಗರಿಕ ಸಮಸ್ಯೆ ವರದಿ ಸೇವೆ.',
    onThisPage: 'ಈ ಪುಟದಲ್ಲಿ',
    yourAccount: 'ನಿಮ್ಮ ಖಾತೆ',
    emergency: 'ತುರ್ತು ಸಂದರ್ಭದಲ್ಲಿ',
    emergencyCall: '112 ಕರೆ ಮಾಡಿ',
    emergencyNote: 'ತುರ್ತು ಸಂದರ್ಭಗಳಿಗಾಗಿ ಆವಾಜ್ ಅನ್ನು ಗಮನಿಸಲಾಗುವುದಿಲ್ಲ.',
    notice: 'ಸ್ವತಂತ್ರ ಮಾದರಿ. ಅಧಿಕೃತ ಪುರಸಭೆ ಸೇವೆಯಲ್ಲ.',
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
