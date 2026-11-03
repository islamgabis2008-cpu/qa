import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'ar' | 'fr';

interface LanguageContextType {
  lang: Language;
  setLang: (l: Language) => void;
  dir: 'rtl' | 'ltr';
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  ar: {
    // Brand & General
    app_name: 'دزاد أوردر',
    app_tagline: 'من أفضل المطاعم الجزائرية مباشرة إلى باب منزلك',
    dzd: 'دج',
    cash_on_delivery: 'الدفع عند الاستلام (COD)',
    loading: 'جاري التحميل...',
    save: 'حفظ',
    cancel: 'إلغاء',
    confirm: 'تأكيد',
    delete: 'حذف',
    edit: 'تعديل',
    close: 'إغلاق',
    back: 'رجوع',
    search: 'ابحث عن مطعم أو وجبة...',
    all_cities: 'جميع المدن الجزائرية',
    select_city: 'اختر الولاية / المدينة',
    algeria: 'الجزائر',
    view_all: 'عرض الكل',
    details: 'التفاصيل',
    status: 'الحالة',
    actions: 'الإجراءات',
    required: 'مطلوب',

    // Nav
    nav_home: 'الرئيسية',
    nav_orders: 'طلباتي',
    nav_cart: 'السلة',
    nav_profile: 'حسابي',
    nav_owner_portal: 'إدارة مطعمي',
    nav_courier_portal: 'بوابة التوصيل',
    nav_admin: 'لوحة الإدارة',
    nav_api_docs: 'دليل الـ API',
    demo_switch: 'تبديل الدور التجريبي',

    // Roles
    role_customer: 'زبون',
    role_owner: 'صاحب مطعم',
    role_courier: 'مندوب توصيل',
    role_admin: 'مدير المنصة',

    // Auth
    login: 'تسجيل الدخول',
    register: 'إنشاء حساب جديد',
    logout: 'تسجيل الخروج',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    full_name: 'الاسم الكامل',
    phone: 'رقم الهاتف الجزائري',
    choose_role: 'اختر نوع الحساب',
    vehicle_type: 'نوع وسيلة التوصيل',
    moto: 'دراجة نارية',
    car: 'سيارة',
    bicycle: 'دراجة هوائية',
    license_plate: 'رقم لوحة الترقيم',
    commercial_reg: 'رقم السجل التجاري',

    // Customer Home
    welcome_msg: 'واش راك حاب تاكل اليوم؟ 🇩🇿',
    popular_categories: 'الأصناف الأكثر طلباً',
    featured_restaurants: 'مطاعم مختارة وموصى بها',
    popular_dishes: 'أطباق جزائرية شعبية لا تفوتك',
    min_order: 'الحد الأدنى للطلب',
    delivery_fee: 'رسوم التوصيل',
    delivery_time: 'وقت التوصيل التقريبي',
    rating: 'التقييم',
    reviews_count: 'تقييم',

    // Restaurant details
    menu: 'قائمة المأكولات',
    add_to_cart: 'إضافة للسلة',
    unavailable: 'نفد من المخزن',
    open_now: 'مفتوح الآن',
    closed: 'مغلق حالياً',
    not_delivering: 'لا يستقبل طلبات توصيل حالياً',
    special_notes: 'ملاحظات خاصة (مثال: بدون حار، صوص زيادة)',

    // Cart & Checkout
    cart_title: 'سلة المشتريات',
    cart_empty: 'سلتك فارغة حالياً',
    cart_conflict_title: 'طلب من مطعم آخر',
    cart_conflict_desc: 'سلتك تحتوي بالفعل على وجبات من مطعم آخر. يسمح بطلب وجبات من مطعم واحد في كل طلب.',
    clear_and_add: 'إفراغ السلة وبدء طلب جديد',
    subtotal: 'المجموع الفرعي',
    total: 'المبلغ الإجمالي للدفع',
    checkout: 'إتمام الطلب',
    delivery_address: 'عنوان التوصيل',
    select_saved_address: 'اختر من العناوين المحفوظة',
    add_new_address: 'إضافة عنوان جديد',
    address_title: 'تسمية العنوان (المنزل، العمل...)',
    city: 'المدينة / الولاية',
    district: 'الحي / البلدية',
    street: 'الشارع ورقم العمارة',
    delivery_notes_placeholder: 'تعليمات الوصول لمندوب التوصيل (مثال: الشقة رقم 4، بالقرب من المسجد)',
    place_order_btn: 'تأكيد الطلب والدفع عند الاستلام',

    // Order Tracking & Lifecycle
    order_number: 'رقم الطلب',
    order_placed: 'تم تأكيد طلبك بنجاح!',
    order_tracking: 'تتبع مسار الطلب المباشر',
    track_order: 'متابعة الطلب',
    status_pending: 'قيد انتظار موافقة المطعم',
    status_accepted: 'تم قبول الطلب من المطعم',
    status_preparing: 'قيد التحضير في المطبخ',
    status_ready: 'الطلب جاهز وبانتظار المندوب',
    status_courier_assigned: 'تم تعيين مندوب التوصيل',
    status_picked_up: 'استلم المندوب وجبتك من المطعم',
    status_on_the_way: 'المندوب في الطريق إليك',
    status_delivered: 'تم التوصيل بنجاح، بالصحة والعافية!',
    status_rejected: 'تم رفض الطلب من المطعم',
    status_cancelled: 'تم إلغاء الطلب',
    courier_details: 'معلومات الكابتن',
    call_courier: 'اتصال بالمندوب',
    call_restaurant: 'اتصال بالمطعم',
    rate_experience: 'قيم تجربتك مع المطعم',
    submit_review: 'إرسال التقييم',
    submit_complaint: 'تقديم شكوى أو استفسار',
    cancel_order: 'إلغاء الطلب',

    // Restaurant Owner Portal
    owner_dashboard: 'لوحة تحكم المطعم',
    pending_approval_notice: 'طلب اعتماد مطعمك قيد المراجعة من طرف إدارة DZ Order. سيتم تفعيل حسابك فور التحقق من المعلومات.',
    apply_restaurant_title: 'تسجيل مطعم جديد في المنصة',
    restaurant_name: 'اسم المطعم',
    restaurant_category: 'تصنيف المطعم',
    opening_hours: 'أوقات العمل اليومية',
    active_incoming_orders: 'الطلبات الواردة والنشطة',
    accept_order: 'قبول الطلب',
    reject_order: 'رفض الطلب',
    rejection_reason_prompt: 'سبب رفض الطلب',
    start_preparing: 'بدء التحضير',
    mark_ready: 'الطلب جاهز للتوصيل',
    manage_menu: 'إدارة قائمة الطعام',
    add_dish: 'إضافة طبق جديد',
    dish_name_ar: 'اسم الوجبة بالعربية',
    dish_name_fr: 'اسم الوجبة بالفرنسية',
    dish_price: 'السعر بالدينار الجزائري (دج)',
    dish_desc_ar: 'وصف الوجبة بالعربية',
    dish_desc_fr: 'وصف الوجبة بالفرنسية',
    toggle_availability: 'تبديل التوفر',
    restaurant_sales: 'إجمالي المبيعات المحققة',

    // Courier Portal
    courier_portal: 'بوابة مندوب التوصيل',
    courier_status_online: 'أنت متصل الآن (جاهز لتلقي المهام)',
    courier_status_offline: 'أنت غير متصل',
    go_online: 'بدء العمل (متصل)',
    go_offline: 'أخذ استراحة (غير متصل)',
    courier_pending_msg: 'طلبك كمندوب توصيل قيد المراجعة من الإدارة. يرجى الانتظار لحين اعتماد الوثائق.',
    available_tasks: 'المهام والطلبات المتاحة للتوصيل',
    no_tasks_available: 'لا توجد طلبات جاهزة حالياً. سيتم إشعارك فور توفر مهمة.',
    accept_task: 'قبول مهمة التوصيل',
    pickup_from: 'الاستلام من المطعم',
    deliver_to: 'التسليم للزبون',
    task_fee: 'عمولة التوصيل المكتسبة',
    active_mission: 'مهمتك الجارية حالياً',
    confirm_pickup: 'تم استلام الوجبة من المطعم',
    confirm_on_the_way: 'الانطلاق في الطريق للزبون',
    confirm_delivered: 'تم التسليم واستلام المبلغ نقدًا',
    total_earnings: 'إجمالي الأرباح المحققة',
    completed_deliveries: 'عدد التوصيلات الناجحة',

    // Admin Portal
    admin_title: 'لوحة التحكم المركزية - DZ Order Admin',
    kpi_total_customers: 'إجمالي الزبائن',
    kpi_total_restaurants: 'إجمالي المطاعم',
    kpi_pending_apps: 'طلبات مطاعم تنتظر الاعتماد',
    kpi_pending_couriers: 'طلبات مناديب تنتظر الاعتماد',
    kpi_total_orders: 'إجمالي الطلبات',
    kpi_active_deliveries: 'توصيلات نشطة الآن',
    kpi_total_revenue: 'إجمالي المبيعات المنفذة',
    tab_restaurant_apps: 'طلبات المطاعم',
    tab_courier_apps: 'طلبات المناديب',
    tab_users: 'المستخدمون',
    tab_orders: 'جميع الطلبات',
    tab_complaints: 'شكاوى الزبائن',
    tab_settings: 'إعدادات المنصة',
    tab_audit: 'سجل النشاطات',
    approve_btn: 'قبول واعتماد',
    reject_btn: 'رفض',
    suspend_user: 'إيقاف الحساب',
    reactivate_user: 'تفعيل الحساب',
    resolve_complaint: 'معالجة الشكوى',

    // PWA & Connectivity
    install_app: 'تثبيت التطبيق',
    installed: 'تم التثبيت',
    offline_msg: 'وضع عدم الاتصال: يتم استخدام البيانات المخزنة مؤقتاً',
  },
  fr: {
    // Brand & General
    app_name: 'DZ Order',
    app_tagline: 'Les meilleurs restaurants d\'Algérie livrés chez vous',
    dzd: 'DZD',
    cash_on_delivery: 'Paiement à la livraison (Cash on Delivery)',
    loading: 'Chargement en cours...',
    save: 'Enregistrer',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    delete: 'Supprimer',
    edit: 'Modifier',
    close: 'Fermer',
    back: 'Retour',
    search: 'Rechercher un restaurant ou un plat...',
    all_cities: 'Toutes les villes d\'Algérie',
    select_city: 'Sélectionner la wilaya / ville',
    algeria: 'Algérie',
    view_all: 'Voir tout',
    details: 'Détails',
    status: 'Statut',
    actions: 'Actions',
    required: 'Requis',

    // Nav
    nav_home: 'Accueil',
    nav_orders: 'Mes Commandes',
    nav_cart: 'Panier',
    nav_profile: 'Mon Compte',
    nav_owner_portal: 'Mon Restaurant',
    nav_courier_portal: 'Espace Livreur',
    nav_admin: 'Administration',
    nav_api_docs: 'Docs API',
    demo_switch: 'Changer de profil démo',

    // Roles
    role_customer: 'Client',
    role_owner: 'Restaurateur',
    role_courier: 'Coursier',
    role_admin: 'Administrateur',

    // Auth
    login: 'Connexion',
    register: 'Créer un compte',
    logout: 'Déconnexion',
    email: 'Adresse e-mail',
    password: 'Mot de passe',
    full_name: 'Nom complet',
    phone: 'Numéro de téléphone algérien',
    choose_role: 'Type de compte',
    vehicle_type: 'Véhicule de livraison',
    moto: 'Moto / Scooter',
    car: 'Voiture',
    bicycle: 'Vélo',
    license_plate: 'Numéro d\'immatriculation',
    commercial_reg: 'Numéro de registre du commerce (RC)',

    // Customer Home
    welcome_msg: 'Envie d\'un bon repas algérien aujourd\'hui ? 🇩🇿',
    popular_categories: 'Catégories Populaires',
    featured_restaurants: 'Restaurants Recommandés',
    popular_dishes: 'Spécialités Algériennes Incontournables',
    min_order: 'Commande min.',
    delivery_fee: 'Frais de livraison',
    delivery_time: 'Délai estimé',
    rating: 'Note',
    reviews_count: 'avis',

    // Restaurant details
    menu: 'Carte & Menu',
    add_to_cart: 'Ajouter au panier',
    unavailable: 'Rupture temporaire',
    open_now: 'Ouvert actuellement',
    closed: 'Fermé',
    not_delivering: 'Ne prend pas de livraisons pour le moment',
    special_notes: 'Instructions particulières (ex: sans harissa, sauce à part)',

    // Cart & Checkout
    cart_title: 'Votre Panier',
    cart_empty: 'Votre panier est actuellement vide',
    cart_conflict_title: 'Articles d\'un autre restaurant',
    cart_conflict_desc: 'Votre panier contient déjà des articles d\'un autre restaurant. Chaque commande doit provenir d\'un seul établissement.',
    clear_and_add: 'Vider le panier et démarrer une nouvelle commande',
    subtotal: 'Sous-total',
    total: 'Total à régler',
    checkout: 'Passer la commande',
    delivery_address: 'Adresse de livraison',
    select_saved_address: 'Choisir parmi mes adresses enregistrées',
    add_new_address: 'Ajouter une nouvelle adresse',
    address_title: 'Nom du lieu (Maison, Bureau...)',
    city: 'Ville / Wilaya',
    district: 'Quartier / Commune',
    street: 'Rue et numéro',
    delivery_notes_placeholder: 'Indications pour le livreur (ex: Bâtiment B, 3ème étage)',
    place_order_btn: 'Confirmer la commande (Paiement à la livraison)',

    // Order Tracking & Lifecycle
    order_number: 'N° de commande',
    order_placed: 'Votre commande a été transmise !',
    order_tracking: 'Suivi de commande en direct',
    track_order: 'Suivre la commande',
    status_pending: 'En attente de confirmation du restaurant',
    status_accepted: 'Acceptée par le restaurant',
    status_preparing: 'En cours de préparation en cuisine',
    status_ready: 'Prête, en attente d\'un coursier',
    status_courier_assigned: 'Coursier assigné à votre commande',
    status_picked_up: 'Le coursier a récupéré votre commande',
    status_on_the_way: 'Votre coursier est en route !',
    status_delivered: 'Commande livrée ! Bon appétit !',
    status_rejected: 'Commande refusée par le restaurant',
    status_cancelled: 'Commande annulée',
    courier_details: 'Informations du coursier',
    call_courier: 'Appeler le coursier',
    call_restaurant: 'Appeler le restaurant',
    rate_experience: 'Évaluez votre commande',
    submit_review: 'Envoyer mon avis',
    submit_complaint: 'Signaler un problème',
    cancel_order: 'Annuler la commande',

    // Restaurant Owner Portal
    owner_dashboard: 'Espace Restaurateur',
    pending_approval_notice: 'Votre dossier est en cours d\'examen par l\'équipe DZ Order. Votre restaurant sera activé dès validation.',
    apply_restaurant_title: 'Inscrire mon restaurant sur DZ Order',
    restaurant_name: 'Nom de l\'établissement',
    restaurant_category: 'Catégorie de cuisine',
    opening_hours: 'Horaires d\'ouverture',
    active_incoming_orders: 'Commandes en cours et à traiter',
    accept_order: 'Accepter la commande',
    reject_order: 'Refuser la commande',
    rejection_reason_prompt: 'Motif du refus',
    start_preparing: 'Lancer en cuisine',
    mark_ready: 'Marquer prête pour coursier',
    manage_menu: 'Gestion de la carte',
    add_dish: 'Ajouter un plat',
    dish_name_ar: 'Nom du plat (Arabe)',
    dish_name_fr: 'Nom du plat (Français)',
    dish_price: 'Prix en Dinars (DZD)',
    dish_desc_ar: 'Description (Arabe)',
    dish_desc_fr: 'Description (Français)',
    toggle_availability: 'Changer la disponibilité',
    restaurant_sales: 'Chiffre d\'affaires total',

    // Courier Portal
    courier_portal: 'Espace Coursier',
    courier_status_online: 'En ligne (Prêt pour des courses)',
    courier_status_offline: 'Hors ligne',
    go_online: 'Passer en ligne',
    go_offline: 'Prendre une pause',
    courier_pending_msg: 'Votre candidature de coursier est en cours de validation par nos services.',
    available_tasks: 'Courses de livraison disponibles',
    no_tasks_available: 'Aucune course prête pour le moment. Restez en ligne.',
    accept_task: 'Accepter la course',
    pickup_from: 'Ramassage au restaurant',
    deliver_to: 'Livraison au client',
    task_fee: 'Rémunération de la course',
    active_mission: 'Course en cours',
    confirm_pickup: 'Commande récupérée au restaurant',
    confirm_on_the_way: 'En route vers le client',
    confirm_delivered: 'Livré & Montant en espèces encaissé',
    total_earnings: 'Gains cumulés',
    completed_deliveries: 'Courses effectuées',

    // Admin Portal
    admin_title: 'Console d\'Administration - DZ Order',
    kpi_total_customers: 'Clients enregistrés',
    kpi_total_restaurants: 'Restaurants inscrits',
    kpi_pending_apps: 'Dossiers restaurants en attente',
    kpi_pending_couriers: 'Candidatures coursiers en attente',
    kpi_total_orders: 'Commandes totales',
    kpi_active_deliveries: 'Livraisons en cours',
    kpi_total_revenue: 'Volume total des ventes (DZD)',
    tab_restaurant_apps: 'Demandes Restaurants',
    tab_courier_apps: 'Candidatures Coursiers',
    tab_users: 'Utilisateurs',
    tab_orders: 'Toutes les Commandes',
    tab_complaints: 'Réclamations Clients',
    tab_settings: 'Paramètres Plateforme',
    tab_audit: 'Journal d\'Audit',
    approve_btn: 'Valider et Approuver',
    reject_btn: 'Refuser',
    suspend_user: 'Suspendre le compte',
    reactivate_user: 'Réactiver le compte',
    resolve_complaint: 'Résoudre la réclamation',

    // PWA & Connectivity
    install_app: 'Installer l\'application',
    installed: 'Installée',
    offline_msg: 'Mode hors-ligne : données en cache utilisées',
  }
};

const LanguageContext = createContext<LanguageContextType>({
  lang: 'ar',
  setLang: () => {},
  dir: 'rtl',
  t: (key: string) => key
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    return (localStorage.getItem('dz_lang') as Language) || 'ar';
  });

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    localStorage.setItem('dz_lang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
  };

  const t = (key: string): string => {
    return translations[lang]?.[key] || translations.ar[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, dir, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
