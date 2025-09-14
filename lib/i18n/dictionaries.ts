/**
 * Internationalization dictionaries for Orion CMS
 * Supports English (default), Arabic, and Hebrew
 */

export interface Dictionary {
  common: {
    loading: string;
    error: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    view: string;
    create: string;
    update: string;
    back: string;
    next: string;
    previous: string;
    finish: string;
    skip: string;
    retry: string;
    refresh: string;
    close: string;
    yes: string;
    no: string;
  };
  auth: {
    signIn: string;
    signOut: string;
    email: string;
    password: string;
    welcomeBack: string;
    authRequired: string;
    pleaseSignIn: string;
    needToBeAuthenticated: string;
  };
  onboarding: {
    title: string;
    subtitle: string;
    progress: string;
    step: string;
    of: string;
    completed: string;
    wordpress: {
      title: string;
      description: string;
      connect: string;
      connecting: string;
      connected: string;
      failed: string;
      baseUrl: string;
      username: string;
      appPassword: string;
    };
    gsc: {
      title: string;
      description: string;
      connect: string;
      connecting: string;
      connected: string;
      failed: string;
    };
    ga4: {
      title: string;
      description: string;
      connect: string;
      connecting: string;
      connected: string;
      failed: string;
    };
    completion: {
      title: string;
      description: string;
      congratulations: string;
      allSet: string;
      goToDashboard: string;
    };
  };
  dashboard: {
    title: string;
    quickStats: string;
    sites: string;
    manageSites: string;
    weeks: string;
    viewWeeks: string;
    jobRuns: string;
    monitorJobs: string;
    activeSites: string;
    pendingWeeks: string;
    totalTopics: string;
    throughput: string;
    qaPassRate: string;
    avgLatency: string;
    costPerMonth: string;
    noDataAvailable: string;
    loadingMetrics: string;
    errorLoadingData: string;
  };
  credentials: {
    title: string;
    description: string;
    encryptionKey: string;
    addNew: string;
    addNewDescription: string;
    name: string;
    type: string;
    data: string;
    noCredentials: string;
    addFirstCredential: string;
    states: {
      connected: string;
      actionRequired: string;
      error: string;
      unknown: string;
    };
  };
  topics: {
    title: string;
    workflow: {
      draft: string;
      rulebookQa: string;
      approval: string;
      published: string;
    };
    actions: {
      submit: string;
      approve: string;
      reject: string;
      publish: string;
    };
  };
  setup: {
    title: string;
    subtitle: string;
    siteSetup: string;
    connectors: string;
    githubSecrets: string;
    createFirstSite: string;
    siteKey: string;
    siteName: string;
    timezone: string;
    publisher: string;
    createSite: string;
  };
  errors: {
    generic: string;
    network: string;
    notFound: string;
    unauthorized: string;
    forbidden: string;
    serverError: string;
    tryAgainLater: string;
  };
  accessibility: {
    skipToMain: string;
    openMenu: string;
    closeMenu: string;
    toggleLanguage: string;
    loadingContent: string;
    errorContent: string;
    emptyContent: string;
  };
}

export const dictionaries: Record<string, Dictionary> = {
  en: {
    common: {
      loading: "Loading...",
      error: "Error",
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      view: "View",
      create: "Create",
      update: "Update",
      back: "Back",
      next: "Next",
      previous: "Previous",
      finish: "Finish",
      skip: "Skip",
      retry: "Retry",
      refresh: "Refresh",
      close: "Close",
      yes: "Yes",
      no: "No",
    },
    auth: {
      signIn: "Sign In",
      signOut: "Sign Out",
      email: "Email",
      password: "Password",
      welcomeBack: "Welcome back",
      authRequired: "Authentication Required",
      pleaseSignIn: "Please sign in to access Orion CMS",
      needToBeAuthenticated:
        "You need to be authenticated to access the content management system.",
    },
    onboarding: {
      title: "Welcome to Orion CMS",
      subtitle: "Let's get your integrations set up",
      progress: "Setup Progress",
      step: "Step",
      of: "of",
      completed: "completed",
      wordpress: {
        title: "WordPress Connection",
        description: "Connect your WordPress site for content publishing",
        connect: "Connect WordPress",
        connecting: "Connecting to WordPress...",
        connected: "WordPress Connected",
        failed: "Connection Failed",
        baseUrl: "WordPress Base URL",
        username: "Username",
        appPassword: "App Password",
      },
      gsc: {
        title: "Google Search Console",
        description: "Connect GSC for SEO performance tracking",
        connect: "Connect GSC",
        connecting: "Connecting to Google Search Console...",
        connected: "GSC Connected",
        failed: "Connection Failed",
      },
      ga4: {
        title: "Google Analytics 4",
        description: "Connect GA4 for detailed analytics insights",
        connect: "Connect GA4",
        connecting: "Connecting to Google Analytics...",
        connected: "GA4 Connected",
        failed: "Connection Failed",
      },
      completion: {
        title: "All Set!",
        description: "Your onboarding is complete",
        congratulations: "Congratulations!",
        allSet: "All your integrations are now set up and ready to go.",
        goToDashboard: "Go to Dashboard",
      },
    },
    dashboard: {
      title: "Orion CMS Console",
      quickStats: "Quick Stats",
      sites: "Sites",
      manageSites: "Manage content sites and configurations",
      weeks: "Weeks",
      viewWeeks: "Review and approve weekly content",
      jobRuns: "Job Runs",
      monitorJobs: "Monitor system jobs and processes",
      activeSites: "Active Sites",
      pendingWeeks: "Pending Weeks",
      totalTopics: "Total Topics",
      throughput: "Throughput",
      qaPassRate: "QA Pass Rate",
      avgLatency: "Avg Latency",
      costPerMonth: "Cost/Month",
      noDataAvailable: "No data available",
      loadingMetrics: "Loading metrics...",
      errorLoadingData: "Error loading dashboard data",
    },
    credentials: {
      title: "Credentials Management",
      description:
        "Securely store and manage your API keys and credentials using AES-GCM encryption.",
      encryptionKey: "Encryption Key",
      addNew: "Add New Credential",
      addNewDescription:
        "Store a new encrypted credential in your browser's local storage.",
      name: "Name",
      type: "Type",
      data: "Credential Data",
      noCredentials: "No credentials stored yet.",
      addFirstCredential: "Add your first credential above.",
      states: {
        connected: "Connected",
        actionRequired: "Action Required",
        error: "Error",
        unknown: "Unknown",
      },
    },
    topics: {
      title: "Content Topics",
      workflow: {
        draft: "Draft",
        rulebookQa: "Rulebook QA",
        approval: "Approval",
        published: "Published",
      },
      actions: {
        submit: "Submit for Review",
        approve: "Approve",
        reject: "Reject",
        publish: "Publish",
      },
    },
    setup: {
      title: "Setup Wizard",
      subtitle: "Configure your Orion Content system",
      siteSetup: "Site Setup",
      connectors: "Connectors",
      githubSecrets: "GitHub Secrets",
      createFirstSite: "Create Your First Site",
      siteKey: "Site Key",
      siteName: "Site Name",
      timezone: "Timezone",
      publisher: "Publisher",
      createSite: "Create Site",
    },
    errors: {
      generic: "Something went wrong. Please try again.",
      network: "Network error. Please check your connection.",
      notFound: "The requested resource was not found.",
      unauthorized: "You are not authorized to access this resource.",
      forbidden: "Access to this resource is forbidden.",
      serverError: "Server error. Please try again later.",
      tryAgainLater: "Please try again later.",
    },
    accessibility: {
      skipToMain: "Skip to main content",
      openMenu: "Open navigation menu",
      closeMenu: "Close navigation menu",
      toggleLanguage: "Toggle language selector",
      loadingContent: "Loading content, please wait",
      errorContent: "Error loading content",
      emptyContent: "No content available",
    },
  },
  ar: {
    common: {
      loading: "جاري التحميل...",
      error: "خطأ",
      save: "حفظ",
      cancel: "إلغاء",
      delete: "حذف",
      edit: "تعديل",
      view: "عرض",
      create: "إنشاء",
      update: "تحديث",
      back: "رجوع",
      next: "التالي",
      previous: "السابق",
      finish: "إنهاء",
      skip: "تخطي",
      retry: "إعادة المحاولة",
      refresh: "تحديث",
      close: "إغلاق",
      yes: "نعم",
      no: "لا",
    },
    auth: {
      signIn: "تسجيل الدخول",
      signOut: "تسجيل الخروج",
      email: "البريد الإلكتروني",
      password: "كلمة المرور",
      welcomeBack: "مرحباً بعودتك",
      authRequired: "مطلوب تسجيل الدخول",
      pleaseSignIn: "يرجى تسجيل الدخول للوصول إلى Orion CMS",
      needToBeAuthenticated:
        "تحتاج إلى تسجيل الدخول للوصول إلى نظام إدارة المحتوى.",
    },
    onboarding: {
      title: "مرحباً بك في Orion CMS",
      subtitle: "دعنا نقوم بإعداد التكاملات الخاصة بك",
      progress: "تقدم الإعداد",
      step: "خطوة",
      of: "من",
      completed: "مكتمل",
      wordpress: {
        title: "اتصال WordPress",
        description: "اربط موقع WordPress الخاص بك لنشر المحتوى",
        connect: "ربط WordPress",
        connecting: "جاري الاتصال بـ WordPress...",
        connected: "تم ربط WordPress",
        failed: "فشل الاتصال",
        baseUrl: "رابط WordPress الأساسي",
        username: "اسم المستخدم",
        appPassword: "كلمة مرور التطبيق",
      },
      gsc: {
        title: "Google Search Console",
        description: "اربط GSC لتتبع أداء SEO",
        connect: "ربط GSC",
        connecting: "جاري الاتصال بـ Google Search Console...",
        connected: "تم ربط GSC",
        failed: "فشل الاتصال",
      },
      ga4: {
        title: "Google Analytics 4",
        description: "اربط GA4 للحصول على تحليلات مفصلة",
        connect: "ربط GA4",
        connecting: "جاري الاتصال بـ Google Analytics...",
        connected: "تم ربط GA4",
        failed: "فشل الاتصال",
      },
      completion: {
        title: "تم الإعداد!",
        description: "تم إكمال عملية الإعداد",
        congratulations: "تهانينا!",
        allSet: "تم إعداد جميع التكاملات الخاصة بك وهي جاهزة للاستخدام.",
        goToDashboard: "الذهاب إلى لوحة التحكم",
      },
    },
    dashboard: {
      title: "وحدة تحكم Orion CMS",
      quickStats: "إحصائيات سريعة",
      sites: "المواقع",
      manageSites: "إدارة مواقع المحتوى والتكوينات",
      weeks: "الأسابيع",
      viewWeeks: "مراجعة وموافقة المحتوى الأسبوعي",
      jobRuns: "تشغيل المهام",
      monitorJobs: "مراقبة مهام النظام والعمليات",
      activeSites: "المواقع النشطة",
      pendingWeeks: "الأسابيع المعلقة",
      totalTopics: "إجمالي المواضيع",
      throughput: "الإنتاجية",
      qaPassRate: "معدل نجاح ضمان الجودة",
      avgLatency: "متوسط زمن الاستجابة",
      costPerMonth: "التكلفة/الشهر",
      noDataAvailable: "لا توجد بيانات متاحة",
      loadingMetrics: "جاري تحميل المقاييس...",
      errorLoadingData: "خطأ في تحميل بيانات لوحة التحكم",
    },
    credentials: {
      title: "إدارة أوراق الاعتماد",
      description:
        "قم بتخزين وإدارة مفاتيح API وأوراق الاعتماد بأمان باستخدام تشفير AES-GCM.",
      encryptionKey: "مفتاح التشفير",
      addNew: "إضافة بيانات اعتماد جديدة",
      addNewDescription:
        "تخزين بيانات اعتماد مشفرة جديدة في التخزين المحلي للمتصفح.",
      name: "الاسم",
      type: "النوع",
      data: "بيانات الاعتماد",
      noCredentials: "لم يتم تخزين أوراق اعتماد بعد.",
      addFirstCredential: "أضف أول بيانات اعتماد أعلاه.",
      states: {
        connected: "متصل",
        actionRequired: "مطلوب إجراء",
        error: "خطأ",
        unknown: "غير معروف",
      },
    },
    topics: {
      title: "مواضيع المحتوى",
      workflow: {
        draft: "مسودة",
        rulebookQa: "ضمان جودة كتاب القواعد",
        approval: "الموافقة",
        published: "منشور",
      },
      actions: {
        submit: "إرسال للمراجعة",
        approve: "موافقة",
        reject: "رفض",
        publish: "نشر",
      },
    },
    setup: {
      title: "معالج الإعداد",
      subtitle: "قم بتكوين نظام Orion Content الخاص بك",
      siteSetup: "إعداد الموقع",
      connectors: "الموصلات",
      githubSecrets: "أسرار GitHub",
      createFirstSite: "إنشاء موقعك الأول",
      siteKey: "مفتاح الموقع",
      siteName: "اسم الموقع",
      timezone: "المنطقة الزمنية",
      publisher: "الناشر",
      createSite: "إنشاء موقع",
    },
    errors: {
      generic: "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
      network: "خطأ في الشبكة. يرجى التحقق من اتصالك.",
      notFound: "المورد المطلوب غير موجود.",
      unauthorized: "غير مخول لك الوصول إلى هذا المورد.",
      forbidden: "الوصول إلى هذا المورد محظور.",
      serverError: "خطأ في الخادم. يرجى المحاولة مرة أخرى لاحقاً.",
      tryAgainLater: "يرجى المحاولة مرة أخرى لاحقاً.",
    },
    accessibility: {
      skipToMain: "الانتقال إلى المحتوى الرئيسي",
      openMenu: "فتح قائمة التنقل",
      closeMenu: "إغلاق قائمة التنقل",
      toggleLanguage: "تبديل محدد اللغة",
      loadingContent: "جاري تحميل المحتوى، يرجى الانتظار",
      errorContent: "خطأ في تحميل المحتوى",
      emptyContent: "لا يوجد محتوى متاح",
    },
  },
  he: {
    common: {
      loading: "טוען...",
      error: "שגיאה",
      save: "שמור",
      cancel: "בטל",
      delete: "מחק",
      edit: "ערוך",
      view: "צפה",
      create: "צור",
      update: "עדכן",
      back: "חזור",
      next: "הבא",
      previous: "קודם",
      finish: "סיים",
      skip: "דלג",
      retry: "נסה שוב",
      refresh: "רענן",
      close: "סגור",
      yes: "כן",
      no: "לא",
    },
    auth: {
      signIn: "התחבר",
      signOut: "התנתק",
      email: "אימייל",
      password: "סיסמה",
      welcomeBack: "שלום שוב",
      authRequired: "נדרש אימות",
      pleaseSignIn: "אנא התחבר כדי לגשת ל-Orion CMS",
      needToBeAuthenticated: "עליך להיות מאומת כדי לגשת למערכת ניהול התוכן.",
    },
    onboarding: {
      title: "ברוכים הבאים ל-Orion CMS",
      subtitle: "בואו נגדיר את האינטגרציות שלכם",
      progress: "התקדמות הגדרה",
      step: "שלב",
      of: "מתוך",
      completed: "הושלם",
      wordpress: {
        title: "חיבור WordPress",
        description: "חבר את אתר ה-WordPress שלך לפרסום תוכן",
        connect: "חבר WordPress",
        connecting: "מתחבר ל-WordPress...",
        connected: "WordPress מחובר",
        failed: "החיבור נכשל",
        baseUrl: "כתובת בסיס WordPress",
        username: "שם משתמש",
        appPassword: "סיסמת אפליקציה",
      },
      gsc: {
        title: "Google Search Console",
        description: "חבר GSC למעקב ביצועי SEO",
        connect: "חבר GSC",
        connecting: "מתחבר ל-Google Search Console...",
        connected: "GSC מחובר",
        failed: "החיבור נכשל",
      },
      ga4: {
        title: "Google Analytics 4",
        description: "חבר GA4 לתובנות אנליטיקה מפורטות",
        connect: "חבר GA4",
        connecting: "מתחבר ל-Google Analytics...",
        connected: "GA4 מחובר",
        failed: "החיבור נכשל",
      },
      completion: {
        title: "הכל מוכן!",
        description: "ההגדרה שלך הושלמה",
        congratulations: "מזל טוב!",
        allSet: "כל האינטגרציות שלך מוגדרות ומוכנות לשימוש.",
        goToDashboard: "עבור ללוח הבקרה",
      },
    },
    dashboard: {
      title: "קונסולת Orion CMS",
      quickStats: "סטטיסטיקות מהירות",
      sites: "אתרים",
      manageSites: "נהל אתרי תוכן והגדרות",
      weeks: "שבועות",
      viewWeeks: "סקור ואשר תוכן שבועי",
      jobRuns: "הפעלות משימות",
      monitorJobs: "מעקב אחר משימות מערכת ותהליכים",
      activeSites: "אתרים פעילים",
      pendingWeeks: "שבועות ממתינים",
      totalTopics: "סך הנושאים",
      throughput: "תפוקה",
      qaPassRate: "שיעור עבירת QA",
      avgLatency: "זמן תגובה ממוצע",
      costPerMonth: "עלות/חודש",
      noDataAvailable: "אין נתונים זמינים",
      loadingMetrics: "טוען מדדים...",
      errorLoadingData: "שגיאה בטעינת נתוני לוח הבקרה",
    },
    credentials: {
      title: "ניהול אישורים",
      description:
        "אחסן ונהל במאובטח את מפתחות ה-API והאישורים שלך באמצעות הצפנת AES-GCM.",
      encryptionKey: "מפתח הצפנה",
      addNew: "הוסף אישור חדש",
      addNewDescription: "אחסן אישור מוצפן חדש באחסון המקומי של הדפדפן שלך.",
      name: "שם",
      type: "סוג",
      data: "נתוני אישור",
      noCredentials: "עדיין לא נשמרו אישורים.",
      addFirstCredential: "הוסף את האישור הראשון שלך למעלה.",
      states: {
        connected: "מחובר",
        actionRequired: "נדרשת פעולה",
        error: "שגיאה",
        unknown: "לא ידוע",
      },
    },
    topics: {
      title: "נושאי תוכן",
      workflow: {
        draft: "טיוטה",
        rulebookQa: "QA ספר חוקים",
        approval: "אישור",
        published: "פורסם",
      },
      actions: {
        submit: "שלח לבדיקה",
        approve: "אשר",
        reject: "דחה",
        publish: "פרסם",
      },
    },
    setup: {
      title: "אשף הגדרה",
      subtitle: "הגדר את מערכת Orion Content שלך",
      siteSetup: "הגדרת אתר",
      connectors: "מחברים",
      githubSecrets: "סודות GitHub",
      createFirstSite: "צור את האתר הראשון שלך",
      siteKey: "מפתח אתר",
      siteName: "שם האתר",
      timezone: "אזור זמן",
      publisher: "מפרסם",
      createSite: "צור אתר",
    },
    errors: {
      generic: "משהו השתבש. אנא נסה שוב.",
      network: "שגיאת רשת. אנא בדוק את החיבור שלך.",
      notFound: "המשאב המבוקש לא נמצא.",
      unauthorized: "אינך מורשה לגשת למשאב זה.",
      forbidden: "הגישה למשאב זה אסורה.",
      serverError: "שגיאת שרת. אנא נסה שוב מאוחר יותר.",
      tryAgainLater: "אנא נסה שוב מאוחר יותר.",
    },
    accessibility: {
      skipToMain: "דלג לתוכן הראשי",
      openMenu: "פתח תפריט ניווט",
      closeMenu: "סגור תפריט ניווט",
      toggleLanguage: "החלף בחירת שפה",
      loadingContent: "טוען תוכן, אנא המתן",
      errorContent: "שגיאה בטעינת תוכן",
      emptyContent: "אין תוכן זמין",
    },
  },
};

export function getDictionary(locale: string): Dictionary {
  return dictionaries[locale] || dictionaries.en;
}

export const supportedLocales = ["en", "ar", "he"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];
