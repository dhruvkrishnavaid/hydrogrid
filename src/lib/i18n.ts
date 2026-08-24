import { useState, useEffect } from "react";

export type Language = "en" | "hi";

export const translations = {
  en: {
    brand: "HydroGrid",
    brandSubtitle: "Water Intelligence & Industrial AI",
    heroTitle: "Turn Water Data Into Smarter Decisions.",
    heroSubtitle: "HydroGrid transforms real-time water telemetry into intelligent monitoring, automated actuator controls, and predictive purity analytics.",
    systemOnline: "System Online",
    telemetryActive: "Telemetry Active",
    
    // Login
    welcomeBack: "Welcome back",
    loginSubtitle: "Sign in to your HydroGrid control center",
    usernameLabel: "Username",
    usernamePlaceholder: "Enter your username",
    passwordLabel: "Password",
    passwordPlaceholder: "Enter your password",
    showPassword: "Show",
    hidePassword: "Hide",
    signInBtn: "Sign In",
    continueWithGoogle: "Continue with Google",
    forgotPassword: "Forgot password?",
    noAccount: "Don't have an account?",
    createAccount: "Create account",
    adminAccess: "System Administrator? Access Admin Portal →",
    
    // Signup
    signupTitle: "Build Your Water Intelligence.",
    signupDesc: "Create an authorized HydroGrid operator account",
    fullNameLabel: "Full Name",
    fullNamePlaceholder: "e.g. Jane Doe",
    emailLabel: "Email Address",
    emailPlaceholder: "operator@hydrogrid.com",
    confirmPasswordLabel: "Confirm Password",
    confirmPasswordPlaceholder: "Re-enter your password",
    termsAgree: "I agree to HydroGrid Terms of Service & Privacy Policy",
    termsRequired: "You must agree to the Terms of Service to create an account.",
    createAccountBtn: "Create HydroGrid Account",
    alreadyHaveAccount: "Already have an account?",
    signInLink: "Sign in",
    passWeak: "Weak Password",
    passFair: "Fair Password",
    passStrong: "Strong Password",
    passExcellent: "Excellent Password",
    passMismatch: "Passwords do not match.",
    invalidEmail: "Please enter a valid email address.",

    // Admin Login
    adminLoginTitle: "HydroGrid Admin Portal",
    adminLoginDesc: "Authorized personnel only.",
    adminUsernameLabel: "Admin Username",
    adminSignInBtn: "Admin Sign In",
    backToLogin: "← Back to User Login",

    // Header & Controls
    language: "Language",
    signOut: "Sign Out",
    desktop: "Desktop Dashboard",
    login: "Login",
    signup: "Signup",
    admin: "Admin",

    // Desktop Live Access
    liveAccess: "Live Access",
    usersOnline: "3 Users Online",
    recentActivity: "Recent Authentication & Telemetry Logs",
    operatorSession: "Operator Session",
    systemAdmin: "Infrastructure Admin",
    fieldSpecialist: "Field Telemetry Specialist",

    // Messages
    loggingIn: "Authenticating...",
    creatingAccount: "Creating Account...",
    googleConnecting: "Connecting to Google Auth...",
    loginSuccess: "Authentication successful! Redirecting to Control Center...",
    signupSuccess: "Account created successfully! Redirecting...",
    adminSuccess: "Admin security verified! Launching Master Controller...",
    authError: "Invalid username or password credentials.",
    adminAuthError: "Invalid administrator credentials.",
    networkError: "Connection error. Please try again.",
  },
  hi: {
    brand: "HydroGrid (हाइड्रोग्रिड)",
    brandSubtitle: "जल बुद्धिमत्ता एवं औद्योगिक एआई",
    heroTitle: "जल डेटा को स्मार्ट निर्णयों में बदलें।",
    heroSubtitle: "हाइड्रोग्रिड रीयल-टाइम जल टेलीमेट्री को बुद्धिमान निगरानी, स्वचालित वाल्व नियंत्रण और शुद्धता विश्लेषण में बदलता है।",
    systemOnline: "सिस्टम ऑनलाइन",
    telemetryActive: "टेलीमेट्री सक्रिय",
    
    // Login
    welcomeBack: "पुनः स्वागत है",
    loginSubtitle: "अपने हाइड्रोग्रिड नियंत्रण केंद्र में साइन इन करें",
    usernameLabel: "उपयोगकर्ता नाम",
    usernamePlaceholder: "अपना उपयोगकर्ता नाम दर्ज करें",
    passwordLabel: "पासवर्ड",
    passwordPlaceholder: "अपना पासवर्ड दर्ज करें",
    showPassword: "दिखाएं",
    hidePassword: "छिपाएं",
    signInBtn: "साइन इन करें",
    continueWithGoogle: "Google के साथ जारी रखें",
    forgotPassword: "पासवर्ड भूल गए?",
    noAccount: "खाता नहीं है?",
    createAccount: "खाता बनाएं",
    adminAccess: "सिस्टम प्रशासक? एडमिन पोर्टल एक्सेस करें →",
    
    // Signup
    signupTitle: "अपनी जल बुद्धिमत्ता का निर्माण करें।",
    signupDesc: "एक अधिकृत हाइड्रोग्रिड ऑपरेटर खाता बनाएं",
    fullNameLabel: "पूरा नाम",
    fullNamePlaceholder: "उदा. जेन डो",
    emailLabel: "ईमेल पता",
    emailPlaceholder: "operator@hydrogrid.com",
    confirmPasswordLabel: "पासवर्ड की पुष्टि करें",
    confirmPasswordPlaceholder: "पासवर्ड पुनः दर्ज करें",
    termsAgree: "मैं हाइड्रोग्रिड सेवा की शर्तों और गोपनीयता नीति से सहमत हूं",
    termsRequired: "खाता बनाने के लिए आपको सेवा की शर्तों से सहमत होना होगा।",
    createAccountBtn: "हाइड्रोग्रिड खाता बनाएं",
    alreadyHaveAccount: "पहले से ही खाता है?",
    signInLink: "साइन इन करें",
    passWeak: "कमजोर पासवर्ड",
    passFair: "सामान्य पासवर्ड",
    passStrong: "मजबूत पासवर्ड",
    passExcellent: "उत्कृष्ट पासवर्ड",
    passMismatch: "पासवर्ड मेल नहीं खाते।",
    invalidEmail: "कृपया एक मान्य ईमेल पता दर्ज करें।",

    // Admin Login
    adminLoginTitle: "हाइड्रोग्रिड एडमिन पोर्टल",
    adminLoginDesc: "केवल अधिकृत कर्मियों के लिए।",
    adminUsernameLabel: "एडमिन यूज़रनेम",
    adminSignInBtn: "एडमिन साइन इन",
    backToLogin: "← उपयोगकर्ता लॉगिन पर लौटें",

    // Header & Controls
    language: "भाषा",
    signOut: "साइन आउट",
    desktop: "डेस्कटॉप डैशबोर्ड",
    login: "लॉगिन",
    signup: "साइनअप",
    admin: "एडमिन",

    // Desktop Live Access
    liveAccess: "लाइव एक्सेस",
    usersOnline: "3 उपयोगकर्ता ऑनलाइन",
    recentActivity: "हालिया प्रमाणीकरण एवं टेलीमेट्री लॉग",
    operatorSession: "ऑपरेटर सत्र",
    systemAdmin: "अवसंरचना प्रशासक",
    fieldSpecialist: "फील्ड टेलीमेट्री विशेषज्ञ",

    // Messages
    loggingIn: "प्रमाणित किया जा रहा है...",
    creatingAccount: "खाता बनाया जा रहा है...",
    googleConnecting: "गूगल प्रमाणीकरण से कनेक्ट हो रहा है...",
    loginSuccess: "प्रमाणीकरण सफल! नियंत्रण केंद्र पर पुनर्निर्देशित किया जा रहा है...",
    signupSuccess: "खाता सफलतापूर्वक बना! पुनर्निर्देशित किया जा रहा है...",
    adminSuccess: "व्यवस्थापक सुरक्षा सत्यापित! मास्टर कंट्रोलर शुरू हो रहा है...",
    authError: "अमान्य उपयोगकर्ता नाम या पासवर्ड ক्रेडेंशियल।",
    adminAuthError: "अमान्य प्रशासक क्रेडेंशियल।",
    networkError: "कनेक्शन त्रुटि। कृपया पुनः प्रयास करें।",
  },
};

const LANG_KEY = "hydrogrid_lang";

export function getStoredLanguage(): Language {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem(LANG_KEY);
  return stored === "hi" ? "hi" : "en";
}

export function setStoredLanguage(lang: Language) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LANG_KEY, lang);
  window.dispatchEvent(new CustomEvent("hydrogrid_lang_change", { detail: lang }));
}

export function useI18n() {
  const [lang, setLangState] = useState<Language>(() => getStoredLanguage());

  useEffect(() => {
    const handleLangChange = (e: Event) => {
      const customEvent = e as CustomEvent<Language>;
      setLangState(customEvent.detail);
    };
    window.addEventListener("hydrogrid_lang_change", handleLangChange);
    return () => window.removeEventListener("hydrogrid_lang_change", handleLangChange);
  }, []);

  const setLang = (newLang: Language) => {
    setStoredLanguage(newLang);
    setLangState(newLang);
  };

  return {
    lang,
    setLang,
    t: translations[lang],
  };
}
