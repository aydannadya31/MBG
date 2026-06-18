import { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutGrid, Clock, ChevronRight, Sparkles, Languages, ChevronDown, X, Download, Terminal, Copy, Check, ZoomIn, ZoomOut, RotateCcw, RotateCw, Move, ThumbsUp, ThumbsDown, Diamond, Trash2, Edit3, Shield, User, Trash, MessageSquare, Send, MessageCircle, Camera } from 'lucide-react';
import { query, collection, where, orderBy, onSnapshot, limit, updateDoc, doc, increment, deleteDoc, addDoc } from 'firebase/firestore';
import { getActiveDb, OperationType, handleFirestoreError, markCurrentDbExhausted, auth, googleProvider, signInWithPopup } from './services/firebase';
import { generateNewPiece } from './services/gemini';
import { sendMessage, translateToTurkish, Message } from './services/chatService';
import { ContentEntry } from './types';
import { getFallbackEntries } from './data/fallbackData';

type View = 'home' | 'galleries' | 'technical' | 'legal' | 'press' | 'vision' | 'comments';

const LANGUAGES = [
  { code: 'TR', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'EN', name: 'English', flag: '🇺🇸' },
  { code: 'FR', name: 'Français', flag: '🇫🇷' },
  { code: 'IT', name: 'Italiano', flag: '🇮🇹' },
  { code: 'ES', name: 'Español', flag: '🇪🇸' },
  { code: 'DE', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'RU', name: 'Русский', flag: '🇷🇺' },
  { code: 'JP', name: '日本語', flag: '🇯🇵' },
  { code: 'CN', name: '中文', flag: '🇨🇳' },
  { code: 'KR', name: '한국어', flag: '🇰🇷' },
];

const TRANSLATIONS: Record<string, any> = {
  TR: {
    dailyCaptures: "Günün Çekimleri",
    pastGalleries: "Geçmiş Galeriler",
    galleries: "Galeriler",
    daily: "GÜNLÜK",
    images: "Resimler",
    hourlyEditorial: "Saatlik AI Editoryal",
    syncActive: "Senkronize veri akışı aktif",
    genExample: "Örnek Resim Oluştur (Test)",
    systemOff: "SİSTEM KAPALI",
    stopped: "DURDURULDU",
    next: "ÜRETİM SAATİ",
    archives: "Geçmiş Galeriler",
    viewArchive: "Galeriyi Görüntüle",
    archiveDesc: "Yapay zeka tarafından oluşturulan güzelliğin tarihsel deposu.",
    archiveUpdateSoon: "Gece yarısından sonra arşivler güncellenecektir.",
    capturesStored: "Çekim Saklanıyor",
    systemActive: "Sistem Aktif",
    systemDisabled: "Sistem Devre Dışı",
    shutdownSystem: "Sistemi Kapat",
    startupSystem: "Sistemi Başlat",
    generateNow: "Hemen Görsel Üret",
    enterPassword: "Şifre Giriniz",
    passwordPlaceholder: "Sistem Anahtarı",
    confirm: "Onayla",
    cancel: "İptal",
    wrongPassword: "Hatalı Şifre",
    aiArchive: "Yapay Zeka Arşivi",
    location: "Mekan",
    time: "Saat",
    editorialShot: "Editoryal Çekim",
    genPrompt: "Oluşturma İstemi (Prompt)",
    originalPrompt: "Orijinal sistem istemi kullanıldı.",
    model: "AI Modeli",
    generated: "Üretim Zamanı",
    downloadHighRes: "Yüksek Çözünürlük İndir",
    resolution: "Çözünürlük",
    navigation: "Navigasyon",
    home: "Anasayfa",
    archive: "Arşiv",
    technical: "Teknik",
    legal: "Yasal",
    press: "Basın",
    vision: "Vizyon",
    isExample: "Bu bir deneme/örnek resimdir",
    trendSync: "Trendyol Giyim Referansı Aktif",
    quotaReached: "Kota Sınırına Ulaşıldı",
    quotaLimit: "Kota Sınırı",
    reset: "Sıfırlanma",
    loading: "4K Ortam Hazırlanıyor...",
    loginChoice: "Galeri Girişi",
    visitor: "Ziyaretçi",
    admin: "Yönetici",
    visitorAccess: "Ziyaretçi Olarak Devam Et",
    adminAccess: "Yönetici Girişi (Şifre)",
    delete: "Sil",
    edit: "Düzenle",
    save: "Kaydet",
    bulkDelete: "Toplu Sil",
    selectItems: "Seçim Modu",
    confirmDelete: "Silmek istediğinize emin misiniz?",
    bulkDeleteConfirm: "seçili öğeyi kalıcı olarak silmek istediğinize emin misiniz?",
    exitSelection: "Seçimi Kapat",
    exploreDrag: "Sürükleyerek İncele",
    feedback: "GERİ BİLDİRİM",
    like: "BEĞEN",
    improve: "GELİŞTİRİLMELİ",
    adminActions: "YÖNETİCİ EYLEMLERİ",
    deleteFromArchive: "BU GÖRSELİ ARŞİVDEN SİL",
    lastEditorial: "Son Editoryal Çekim",
    inspect: "İncele",
    currentEditorial: "GÜNCEL EDİTÖRLEME",
    seeStory: "HİKAYEYİ GÖR",
    todaysFeed: "Bugünün Akışı",
    noStreamToday: "Bugün henüz veri akışı başlatılmadı",
    visitArchiveDesc: "Geçmiş çekimleri görmek için arşivi ziyaret edin",
    historicalJourney: "Tarihsel Yolculuk",
    selectAccess: "Galeriyi görüntülemeden önce lütfen erişim tipinizi seçiniz.",
    adminSuccess: "Yönetici moduna başarıyla girildi.",
    logout: "ÇIKIŞ YAP",
    gridView: "4x Grid Görünümü",
    dateSelection: "Tarih Seçimi",
    all: "Hepsi",
    generating: "Üretiliyor",
    online: "Çevrimiçi",
    assistant: "ASİSTAN",
    askAssistant: "Bir soru sorun...",
    assistantGreeting: "Merhabalar! AG Moda Burada Galerisi asistanıyım. Arşivimiz, teknik detaylar veya yüksek moda içeriklerimiz hakkında her şeyi sorabilirsiniz.",
    assistantOnlyFashion: "SADECE AG MODA İÇERİKLERİ HAKKINDA BİLGİ VERİR",
    comments: "Yorumlar",
    commentLogin: "Yorum Sistemi Girişi",
    visitorLogin: "Ziyaretçi Girişi (Sadece Oku)",
    userLogin: "Kullanıcı Girişi (Yorum Yap)",
    adminLogin: "Yönetici Girişi",
    hide: "Gizle",
    show: "Göster",
    reply: "Cevap Ver",
    writeComment: "Yorumunuzu buraya yazın...",
    send: "Gönder",
    noComments: "Henüz yorum yapılmamış.",
    commentUsername: "Kullanıcı Adı",
    commentPassword: "Şifre",
    deleteConfirmAction: "EVET, SİL",
    deleteEntryAction: "BU GÖRSELİ ARŞİVDEN SİL",
    googleLogin: "Google ile Giriş Yap",
    wrongAdminPassword: "Hatalı yönetici şifresi.",
    logoutAction: "OTURUMU KAPAT",
    rotate: "Döndür",
    metadata: "Meta Veriler",
    camera: "Kamera",
    aperture: "Diyafram",
    iso: "ISO",
    exposure: "Pozlama",
    aiModel: "Yapay Zeka Modeli",
    showTranslation: "Türkçe'ye Çevir",
    showOriginal: "Orijinal Metni Göster",
    translating: "Çevriliyor...",
    editComment: "Yorumu Düzenle",
    replying: "Cevap Veriliyor...",
    writeAComment: "Bir Yorum Yazın",
    update: "GÜNCELLE",
    commentHidden: "BU YORUM GİZLENDİ",
    clickToConfirm: "Onaylamak için tekrar tıklayın",
    deletePermanently: "Kalıcı Olarak Sil",
    areYouSure: "EMİN MİSİNİZ?",
    navItems: ['Anasayfa', 'Arşiv', 'Teknik', 'Yasal', 'Basın', 'Vizyon', 'Yorumlar']
  },
  EN: {
    dailyCaptures: "Daily Captures",
    pastGalleries: "Past Galleries",
    galleries: "Galleries",
    daily: "DAILY",
    images: "Images",
    hourlyEditorial: "Hourly AI Editorial",
    syncActive: "Synchronized data stream active",
    genExample: "Generate Example Image (Test)",
    systemOff: "SYSTEM OFF",
    stopped: "STOPPED",
    next: "NEXT",
    archives: "Archives",
    viewArchive: "View Archive",
    archiveDesc: "Historical repository of AI-generated beauty.",
    archiveUpdateSoon: "Archives will be updated after midnight.",
    capturesStored: "Captures Stored",
    systemActive: "System Active",
    systemDisabled: "System Disabled",
    shutdownSystem: "Shutdown System",
    startupSystem: "Startup System",
    generateNow: "Generate Now",
    enterPassword: "Enter Password",
    passwordPlaceholder: "System Key",
    confirm: "Confirm",
    cancel: "Cancel",
    wrongPassword: "Wrong Password",
    aiArchive: "AI Archive",
    location: "Location",
    time: "Time",
    editorialShot: "Editorial Shot",
    genPrompt: "Generation Prompt",
    originalPrompt: "Original system prompt used.",
    model: "AI Model",
    generated: "Generated At",
    downloadHighRes: "Download High Resolution",
    resolution: "Resolution",
    navigation: "Navigation",
    home: "Home",
    archive: "Archive",
    technical: "Technical",
    legal: "Legal",
    press: "Press",
    vision: "Vision",
    isExample: "This is a trial/example image",
    trendSync: "Trendyol Fashion Reference Active",
    quotaReached: "Quota Limit Reached",
    quotaLimit: "Quota Limit",
    reset: "Reset",
    loading: "Preparing 4K Environment...",
    loginChoice: "Gallery Access",
    visitor: "Visitor",
    admin: "Admin",
    visitorAccess: "Continue as Visitor",
    adminAccess: "Admin Access (Password)",
    delete: "Delete",
    edit: "Edit",
    save: "Save",
    bulkDelete: "Bulk Delete",
    selectItems: "Selection Mode",
    confirmDelete: "Are you sure you want to delete?",
    bulkDeleteConfirm: "selected items will be permanently deleted. Are you sure?",
    exitSelection: "Exit Selection",
    exploreDrag: "Drag to Explore",
    feedback: "FEEDBACK",
    like: "LIKE",
    improve: "SHOULD BE IMPROVED",
    adminActions: "ADMIN ACTIONS",
    deleteFromArchive: "DELETE THIS IMAGE FROM ARCHIVE",
    lastEditorial: "Last Editorial Capture",
    inspect: "Inspect",
    currentEditorial: "CURRENT EDITORIAL",
    seeStory: "SEE THE STORY",
    todaysFeed: "Today's Feed",
    noStreamToday: "No data stream started today yet",
    visitArchiveDesc: "Visit the archive to see past shoots",
    historicalJourney: "Historical Journey",
    selectAccess: "Please select your access type before viewing the gallery.",
    adminSuccess: "Successfully entered admin mode.",
    logout: "LOGOUT",
    gridView: "4x Grid View",
    dateSelection: "Date Selection",
    all: "All",
    generating: "Generating",
    online: "Online",
    assistant: "ASSISTANT",
    askAssistant: "Ask a question...",
    assistantGreeting: "Hello! I am the AG Moda Burada Galerisi assistant. You can ask anything about our archive, technical details, or high fashion content.",
    assistantOnlyFashion: "ONLY PROVIDES INFO ABOUT AG MODA CONTENT",
    comments: "Comments",
    commentLogin: "Comment System Login",
    visitorLogin: "Visitor Login (Read Only)",
    userLogin: "User Login (Comment)",
    adminLogin: "Admin Login",
    hide: "Hide",
    show: "Show",
    reply: "Reply",
    writeComment: "Write your comment here...",
    send: "Send",
    noComments: "No comments yet.",
    commentUsername: "Username",
    commentPassword: "Password",
    deleteConfirmAction: "YES, DELETE",
    deleteEntryAction: "DELETE THIS IMAGE FROM ARCHIVE",
    googleLogin: "Login with Google",
    wrongAdminPassword: "Incorrect admin password.",
    logoutAction: "LOGOUT",
    rotate: "Rotate",
    metadata: "Metadata",
    camera: "Camera",
    aperture: "Aperture",
    iso: "ISO",
    exposure: "Exposure",
    aiModel: "AI Model",
    showTranslation: "Translate to TR",
    showOriginal: "Show Original",
    translating: "Translating...",
    editComment: "Edit Comment",
    replying: "Replying...",
    writeAComment: "Write a Comment",
    update: "UPDATE",
    commentHidden: "THIS COMMENT IS HIDDEN",
    clickToConfirm: "Click again to confirm",
    deletePermanently: "Delete Permanently",
    areYouSure: "ARE YOU SURE?",
    navItems: ['Home', 'Archive', 'Technical', 'Legal', 'Press', 'Vision', 'Comments']
  },
  FR: {
    dailyCaptures: "Captures du Jour",
    pastGalleries: "Galeries Passées",
    galleries: "Galeries",
    daily: "QUOTIDIEN",
    images: "Images",
    hourlyEditorial: "Éditorial IA Horaire",
    syncActive: "Flux de données synchrone actif",
    genExample: "Générer une Image d'Exemple (Test)",
    systemOff: "SYSTÈME ARRÊTÉ",
    stopped: "ARRÊTÉ",
    next: "SUIVANT",
    archives: "Archives",
    archiveDesc: "Répertoire historique de la beauté générée par l'IA.",
    archiveUpdateSoon: "Les archives seront mises à jour après minuit.",
    capturesStored: "Captures Stockées",
    systemActive: "Système Actif",
    systemDisabled: "Système Désactivé",
    shutdownSystem: "Éteindre le Système",
    startupSystem: "Démarrer le Système",
    aiArchive: "Archive IA",
    location: "Lieu",
    time: "Heure",
    editorialShot: "Cliché Éditorial",
    genPrompt: "Prompt de Génération",
    originalPrompt: "Prompt système original utilisé.",
    model: "Modèle IA",
    generated: "Généré à",
    downloadHighRes: "Télécharger en Haute Résolution",
    resolution: "Résolution",
    navigation: "Navigation",
    home: "Accueil",
    archive: "Archives",
    technical: "Technique",
    legal: "Légal",
    press: "Presse",
    vision: "Vision",
    isExample: "Ceci est une image d'essai/exemple",
    quotaReached: "Limite de Quota Atteinte",
    quotaLimit: "Limite de Quota",
    reset: "Réinitialisation",
    loading: "Préparation de l'environnement 4K...",
    footerDesc: "Archives de mode haute fréquence organisées par intelligence artificielle.",
    navItems: ['Accueil', 'Archives', 'Technique', 'Légal', 'Presse', 'Vision']
  },
  DE: {
    dailyCaptures: "Tagesaufnahmen",
    pastGalleries: "Vergangene Galerien",
    galleries: "Galerien",
    daily: "TÄGLICH",
    images: "Bilder",
    hourlyEditorial: "Stündliches KI-Editorial",
    syncActive: "Synchroner Datenstrom aktiv",
    genExample: "Beispielbild generieren (Test)",
    systemOff: "SYSTEM AUS",
    stopped: "GESTOPPT",
    next: "NÄCHSTES",
    archives: "Archive",
    archiveDesc: "Historisches Repository für KI-generierte Schönheit.",
    archiveUpdateSoon: "Die Archive werden nach Mitternacht aktualisiert.",
    capturesStored: "Aufnahmen Gespeichert",
    systemActive: "System Aktiv",
    systemDisabled: "System Deaktiviert",
    shutdownSystem: "System Herunterfahren",
    startupSystem: "System Starten",
    aiArchive: "KI-Archiv",
    location: "Ort",
    time: "Zeit",
    editorialShot: "Editorial-Aufnahme",
    genPrompt: "Generierungs-Prompt",
    originalPrompt: "Original-System-Prompt verwendet.",
    model: "KI-Modell",
    generated: "Generiert am",
    downloadHighRes: "Hochauflösend herunterladen",
    resolution: "Auflösung",
    navigation: "Navigation",
    home: "Startseite",
    archive: "Archiv",
    technical: "Technik",
    legal: "Rechtliches",
    press: "Presse",
    vision: "Vision",
    isExample: "Dies ist ein Test-/Beispielbild",
    quotaReached: "Quotenlimit erreicht",
    quotaLimit: "Quotenlimit",
    reset: "Zurücksetzung",
    loading: "Vorbereitung der 4K-Umgebung...",
    footerDesc: "Hochfrequente Mode-Archive, kuratiert von künstlicher Intelligenz.",
    navItems: ['Startseite', 'Archiv', 'Technik', 'Rechtliches', 'Presse', 'Vision']
  },
  ES: {
    dailyCaptures: "Capturas Diarias",
    pastGalleries: "Galerías Pasadas",
    galleries: "Galerías",
    daily: "DIARIO",
    images: "Imágenes",
    hourlyEditorial: "Editorial de IA por hora",
    syncActive: "Flujo de datos síncrono activo",
    genExample: "Generar imagen de ejemplo (Prueba)",
    systemOff: "SISTEMA APAGADO",
    stopped: "DETENIDO",
    next: "SIGUIENTE",
    archives: "Archivos",
    archiveDesc: "Repositorio histórico de belleza generada por IA.",
    archiveUpdateSoon: "Los archivos se actualizarán después de la medianoche.",
    capturesStored: "Capturas Almacenadas",
    systemActive: "Sistema Activo",
    systemDisabled: "Sistema Desactivado",
    shutdownSystem: "Apagar el Sistema",
    startupSystem: "Iniciar el Sistema",
    aiArchive: "Archivo de IA",
    location: "Ubicación",
    time: "Hora",
    editorialShot: "Captura Editorial",
    genPrompt: "Prompt de Generación",
    originalPrompt: "Se utilizó el prompt original del sistema.",
    model: "Modelo de IA",
    generated: "Generado el",
    downloadHighRes: "Descargar en Alta Resolución",
    resolution: "Resolución",
    navigation: "Navegación",
    home: "Inicio",
    archive: "Archivo",
    technical: "Técnico",
    legal: "Legal",
    press: "Prensa",
    vision: "Visión",
    isExample: "Esta es una imagen de prueba/ejemplo",
    quotaReached: "Límite de Cuota Alcanzado",
    quotaLimit: "Límite de Cuota",
    reset: "Restablecimiento",
    loading: "Preparando entorno 4K...",
    footerDesc: "Archivos de moda de alta frecuencia seleccionados por inteligencia artificial.",
    navItems: ['Inicio', 'Archivo', 'Técnico', 'Legal', 'Prensa', 'Visión']
  },
  IT: {
    dailyCaptures: "Catture Giornaliere",
    pastGalleries: "Gallerie Passate",
    galleries: "Gallerie",
    daily: "QUOTIDIANO",
    images: "Immagini",
    hourlyEditorial: "Editoriale IA orario",
    syncActive: "Flusso dati sincrono attivo",
    genExample: "Genera immagine di esempio (Test)",
    systemOff: "SISTEMA SPENTO",
    stopped: "FERMATO",
    next: "PROSSIMO",
    archives: "Archivi",
    archiveDesc: "Repertorio storico di bellezza generata dall'IA.",
    archiveUpdateSoon: "Gli archivi saranno aggiornati dopo mezzanotte.",
    capturesStored: "Catture Memorizzate",
    systemActive: "Sistema Attivo",
    systemDisabled: "Sistema Disabilitato",
    shutdownSystem: "Spegni il Sistema",
    startupSystem: "Avvia il Sistema",
    aiArchive: "Archivio IA",
    location: "Posizione",
    time: "Ora",
    editorialShot: "Scatto Editoriale",
    genPrompt: "Prompt di Generazione",
    originalPrompt: "Usato prompt originale del sistema.",
    model: "Modello IA",
    generated: "Generato il",
    downloadHighRes: "Scarica Alta Risoluzione",
    resolution: "Risoluzione",
    navigation: "Navigazione",
    home: "Home",
    archive: "Archivio",
    technical: "Tecnico",
    legal: "Legale",
    press: "Stampa",
    vision: "Visione",
    isExample: "Questa è un'immagine di prova/esempio",
    quotaReached: "Limite Quota Raggiunto",
    quotaLimit: "Limite Quota",
    reset: "Ripristino",
    loading: "Preparazione ambiente 4K...",
    footerDesc: "Archivi di moda ad alta frequenza curati dall'intelligenza artificiale.",
    navItems: ['Home', 'Archivio', 'Tecnico', 'Legale', 'Stampa', 'Visione']
  },
  JP: {
    dailyCaptures: "今日のキャプチャ",
    pastGalleries: "過去のギャラリー",
    galleries: "ギャラリー",
    daily: "日常",
    images: "画像",
    hourlyEditorial: "毎時のAIエディトリアル",
    syncActive: "同期データ送信中",
    genExample: "サンプル画像を生成（テスト）",
    systemOff: "システムオフ",
    stopped: "停止中",
    next: "次まで",
    archives: "アーカイブ",
    archiveDesc: "AIが生成した美の歴史的リポジトリ。",
    archiveUpdateSoon: "アーカイブは深夜以降に更新されます。",
    capturesStored: "保存済みキャプチャ",
    systemActive: "システム稼働中",
    systemDisabled: "システム停止中",
    shutdownSystem: "システムを停止",
    startupSystem: "システムを起動",
    aiArchive: "AIアーカイブ",
    location: "場所",
    time: "時刻",
    editorialShot: "エディトリアルショット",
    genPrompt: "生成プロンプト",
    originalPrompt: "オリジナルのシステムプロンプトを使用。",
    model: "AIモデル",
    generated: "生成日時",
    downloadHighRes: "高解像度でダウンロード",
    resolution: "解像度",
    navigation: "ナビゲーション",
    home: "ホーム",
    archive: "アーカイブ",
    technical: "技術",
    legal: "法務",
    press: "プレス",
    vision: "ビジョン",
    isExample: "これは試作/サンプル画像です",
    quotaReached: "割り当て制限に達しました",
    quotaLimit: "割り当て制限",
    reset: "リセット",
    loading: "4K環境を準備中...",
    footerDesc: "人工知能によってキュレーションされた高頻度のファッションアーカイブ。",
    navItems: ['ホーム', 'アーカイブ', '技術', '法務', 'プレス', 'ビジョン']
  },
  KR: {
    dailyCaptures: "오늘의 캡처",
    pastGalleries: "지난 갤러리",
    galleries: "갤러리",
    daily: "매일",
    images: "이미지",
    hourlyEditorial: "시간별 AI 에디토리얼",
    syncActive: "동기화된 데이터 스트림 활성",
    genExample: "예시 이미지 생성 (테스트)",
    systemOff: "시스템 꺼짐",
    stopped: "중지됨",
    next: "다음",
    archives: "아카이브",
    archiveDesc: "AI가 생성한 아름다움의 역사적 저장소.",
    archiveUpdateSoon: "자정 이후에 아카이브가 업데이트됩니다.",
    capturesStored: "저장된 캡처",
    systemActive: "시스템 활성",
    systemDisabled: "시스템 비활성",
    shutdownSystem: "시스템 종료",
    startupSystem: "시스템 시작",
    aiArchive: "AI 아카이브",
    location: "장소",
    time: "시간",
    editorialShot: "에디토리얼 샷",
    genPrompt: "생성 프롬프트",
    originalPrompt: "원본 시스템 프롬프트가 사용되었습니다.",
    model: "AI 모델",
    generated: "생성 시각",
    downloadHighRes: "고해상도 다운로드",
    resolution: "해상도",
    navigation: "네비게이션",
    home: "홈",
    archive: "아카이브",
    technical: "기술",
    legal: "법률",
    press: "언론",
    vision: "비전",
    isExample: "이것은 평가판/예시 이미지입니다",
    quotaReached: "할당량 제한 도달",
    quotaLimit: "할당량 제한",
    reset: "초기화",
    loading: "4K 환경 준비 중...",
    footerDesc: "인공지능이 큐레이팅한 고주파 패션 아카이브.",
    navItems: ['홈', '아카이브', '기술', '법률', '언론', '비전']
  }
};

// Simple strategy: use EN as fallback for others for now
LANGUAGES.forEach(lang => {
  if (!TRANSLATIONS[lang.code]) {
    TRANSLATIONS[lang.code] = TRANSLATIONS.EN;
  }
});

const ImageWithSkeleton = ({ src, alt, className, loading = "lazy", ...props }: { src: string; alt: string; className?: string; loading?: "lazy" | "eager"; [key: string]: any }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div className="relative w-full h-full overflow-hidden flex items-center justify-center bg-zinc-100">
      {!isLoaded && !hasError && (
        <motion.div 
          initial={{ opacity: 1 }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-zinc-200"
        />
      )}
      {hasError ? (
        <div className="flex flex-col items-center justify-center text-zinc-400 gap-2 p-6 text-center">
          <Camera size={24} className="stroke-[1.5] text-zinc-400" />
          <span className="text-[8px] font-bold tracking-widest text-zinc-400 uppercase">GÖRSEL_YÜKLENEMEDİ</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className={`${className} transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          loading={loading}
          decoding="async"
          {...props}
        />
      )}
    </div>
  );
};

const getTRDateKey = (timestamp?: Date | number): string => {
  const d = timestamp ? new Date(timestamp) : new Date();
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(d);
  } catch (e) {
    const trDate = new Date(d.getTime() + 3 * 60 * 60 * 1000);
    return trDate.toISOString().split('T')[0];
  }
};

export default function App() {
  const [entries, setEntries] = useState<ContentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(3600);
  const [view, setView] = useState<View>('home');
  const [currentDateKey, setCurrentDateKey] = useState(getTRDateKey());
  const [selectedArchiveYear, setSelectedArchiveYear] = useState<string>('all');
  const [selectedArchiveMonth, setSelectedArchiveMonth] = useState<string>('all');
  const [selectedArchiveDay, setSelectedArchiveDay] = useState<string>('all');
  const [quotaReached, setQuotaReached] = useState(false);
  const [systemEnabled, setSystemEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('mbg_system_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  const [cooldownUntil, setCooldownUntil] = useState<number | null>(() => {
    const saved = localStorage.getItem('mbg_cooldown');
    return saved ? parseInt(saved) : null;
  });

  const [notification, setNotification] = useState<string | null>(null);
  const [dbVersion, setDbVersion] = useState(0);

  const toggleSystem = () => {
    if (systemEnabled) {
      setShowPasswordModal(true);
      setPasswordInput('');
      setPasswordError(false);
    } else {
      const newState = !systemEnabled;
      setSystemEnabled(newState);
      localStorage.setItem('mbg_system_enabled', newState.toString());
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'ag1453ag') {
      const newState = false;
      setSystemEnabled(newState);
      localStorage.setItem('mbg_system_enabled', newState.toString());
      setShowPasswordModal(false);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  // Check if cooldown has expired
  useEffect(() => {
    if (cooldownUntil && Date.now() >= cooldownUntil) {
      setCooldownUntil(null);
      setQuotaReached(false);
      localStorage.removeItem('mbg_cooldown');
    }
  }, [cooldownUntil]);

  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  useEffect(() => {
    const handler = () => setDbVersion(v => v + 1);
    window.addEventListener('firestore-db-switched', handler);
    return () => window.removeEventListener('firestore-db-switched', handler);
  }, []);

  const [showLangMenu, setShowLangMenu] = useState(false);
  const [currentLang, setCurrentLang] = useState(LANGUAGES[0]);
  const t = TRANSLATIONS[currentLang.code];
  const [selectedEntry, setSelectedEntry] = useState<ContentEntry | null>(null);
  const [isMarqueePaused, setIsMarqueePaused] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'visitor' | 'admin' | null>('visitor');
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [adminAuthInput, setAdminAuthInput] = useState('');
  const [adminAuthError, setAdminAuthError] = useState(false);
  const [adminLoginActive, setAdminLoginActive] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [editPromptValue, setEditPromptValue] = useState('');
  const [isGeneratingState, setIsGeneratingState] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  
  // Chatbot State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const visibleEntries = useMemo(() => {
    // Admin sees everything, visitor sees only published items (timestamp <= now)
    if (userRole === 'admin') return entries;
    const now = Date.now();
    const visible = entries.filter(e => e.timestamp <= now);
    
    // If we have NO visible entries but there ARE entries in the DB, 
    // it probably means everything is future-scheduled.
    // For a visitor, we might want to show at least the Absolute Latest One if nothing else is available
    // OR just wait for the timer. But if the user says "nothing is here", 
    // maybe we should ensure even visitors see SOMETHING if the stream just started.
    // However, sticking to the "saati gelince yayınla" rule:
    return visible;
  }, [entries, countdown, userRole]);

  const visibleHistory = useMemo(() => {
    const grouped: Record<string, ContentEntry[]> = {};
    visibleEntries.forEach(item => {
      if (!grouped[item.dateKey]) grouped[item.dateKey] = [];
      grouped[item.dateKey].push(item);
    });
    return grouped;
  }, [visibleEntries]);

  const allDates = Object.keys(visibleHistory).sort().reverse();

  const filteredDates = useMemo(() => {
    return allDates.filter(dateStr => {
      const parts = dateStr.split('-');
      if (parts.length < 3) return false;
      const [year, month, day] = parts;
      if (selectedArchiveYear !== 'all' && year !== selectedArchiveYear) return false;
      if (selectedArchiveMonth !== 'all' && month !== selectedArchiveMonth) return false;
      if (selectedArchiveDay !== 'all' && day !== selectedArchiveDay) return false;
      return true;
    });
  }, [allDates, selectedArchiveYear, selectedArchiveMonth, selectedArchiveDay]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    allDates.forEach(dateStr => {
      const parts = dateStr.split('-');
      if (parts[0]) years.add(parts[0]);
    });
    return Array.from(years).sort().reverse();
  }, [allDates]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    allDates.forEach(dateStr => {
      const parts = dateStr.split('-');
      if (parts.length >= 2) {
        const [y, m] = parts;
        if (selectedArchiveYear === 'all' || y === selectedArchiveYear) {
          months.add(m);
        }
      }
    });
    return Array.from(months).sort();
  }, [allDates, selectedArchiveYear]);

  const availableDays = useMemo(() => {
    const days = new Set<string>();
    allDates.forEach(dateStr => {
      const parts = dateStr.split('-');
      if (parts.length >= 3) {
        const [y, m, d] = parts;
        const matchesYear = (selectedArchiveYear === 'all' || y === selectedArchiveYear);
        const matchesMonth = (selectedArchiveMonth === 'all' || m === selectedArchiveMonth);
        if (matchesYear && matchesMonth) {
          days.add(d);
        }
      }
    });
    return Array.from(days).sort();
  }, [allDates, selectedArchiveYear, selectedArchiveMonth]);

  const handleYearChange = (year: string) => {
    setSelectedArchiveYear(year);
    setSelectedArchiveMonth('all');
    setSelectedArchiveDay('all');
  };

  const handleMonthChange = (month: string) => {
    setSelectedArchiveMonth(month);
    setSelectedArchiveDay('all');
  };

  const handleDayChange = (day: string) => {
    setSelectedArchiveDay(day);
  };

  const getMonthName = (monthStr: string, langCode: string) => {
    try {
      const date = new Date(2026, parseInt(monthStr, 10) - 1, 15);
      const formatted = date.toLocaleDateString(langCode === 'TR' ? 'tr-TR' : 'en-US', { month: 'long' });
      return formatted.toUpperCase();
    } catch (e) {
      const trNames: Record<string, string> = {
        '01': 'OCAK', '02': 'ŞUBAT', '03': 'MART', '04': 'NİSAN',
        '05': 'MAYIS', '06': 'HAZİRAN', '07': 'TEMMUZ', '08': 'AĞUSTOS',
        '09': 'EYLÜL', '10': 'EKİM', '11': 'KASIM', '12': 'ARALIK'
      };
      return trNames[monthStr] || monthStr;
    }
  };

  const getDayLabel = (dayStr: string) => {
    return parseInt(dayStr, 10).toString();
  };

  const todayEntries = useMemo(() => {
    const trToday = getTRDateKey();
    const forToday = visibleEntries.filter(e => e.dateKey === trToday);
    
    // If we have strictly visible items but none for "today", fallback to latest visible overall
    if (forToday.length > 0) {
      if (forToday.length < 4) {
        const others = visibleEntries.filter(e => e.dateKey !== trToday).slice(0, 8);
        const combined = [...forToday];
        others.forEach(o => {
          if (!combined.find(c => c.id === o.id)) combined.push(o);
        });
        return combined.sort((a, b) => b.timestamp - a.timestamp).slice(0, 12);
      }
      return forToday;
    }
    
    return visibleEntries.slice(0, 12);
  }, [visibleEntries, userRole]);

  // Comments State
  const [comments, setComments] = useState<any[]>([]);
  const [commentUserRole, setCommentUserRole] = useState<'admin' | 'user' | 'visitor' | null>(null);
  const [commentAuthInput, setCommentAuthInput] = useState({ username: '', password: '' });
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<any | null>(null);
  const [commentDeletingId, setCommentDeletingId] = useState<string | null>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isChatOpen]);

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    const newMessages: Message[] = [...chatMessages, { role: 'user', content: userMsg }];
    setChatMessages(newMessages);
    setIsChatLoading(true);

    try {
      const response = await sendMessage(chatMessages, userMsg, currentLang.code);
      setChatMessages([...newMessages, { role: 'model', content: response }]);
    } catch (error) {
      console.error("Chat Error:", error);
      setChatMessages([...newMessages, { role: 'model', content: "Üzgünüm, şu an yanıt veremiyorum. Lütfen daha sonra tekrar deneyin." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  useEffect(() => {
    const q = query(collection(getActiveDb(), 'comments'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setComments(docs);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'comments');
    });
    return () => unsubscribe();
  }, [dbVersion]);

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      setCommentUserRole('user');
      setCommentAuthInput({ username: user.displayName || 'Google Kullanıcısı', password: 'google-oauth' });
    } catch (error) {
      console.error("Google Login Error:", error);
      alert("Google ile giriş yapılırken bir hata oluştu.");
    }
  };

  const handlePostComment = async (parentId: string | null = null) => {
    if (!commentText.trim() || !commentUserRole || commentUserRole === 'visitor') return;

    try {
      if (editingComment) {
        await updateDoc(doc(getActiveDb(), 'comments', editingComment.id), {
          content: commentText,
          updatedAt: Date.now()
        });
        setEditingComment(null);
      } else {
        await addDoc(collection(getActiveDb(), 'comments'), {
          authorName: commentUserRole === 'admin' ? 'Yönetici' : (commentAuthInput.username || 'Kullanıcı'),
          authorRole: commentUserRole,
          content: commentText,
          timestamp: Date.now(),
          isHidden: false,
          parentId: parentId
        });
      }
      setCommentText('');
      setReplyingTo(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'comments');
    }
  };

  const handleToggleHideComment = async (id: string, currentHidden: boolean, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      await updateDoc(doc(getActiveDb(), 'comments', id), { isHidden: !currentHidden });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `comments/${id}`);
    }
  };

  const adminDeleteComment = async (commentId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!commentId) return;

    try {
      console.log("Başlatılıyor: Silme İşlemi", commentId);
      const docRef = doc(getActiveDb(), 'comments', commentId);
      await deleteDoc(docRef);
      console.log("Başarılı: Silme İşlemi", commentId);
      setCommentDeletingId(null);
    } catch (err: any) {
      console.error("Hata: Silme İşlemi", err);
      alert("Silme hatası occurred: " + err.message);
    }
  };

  const isGeneratingRef = useRef(false);

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setDeletingId(id);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    const id = deletingId;
    
    try {
      console.log("Proceeding with deletion of:", id);
      const docRef = doc(getActiveDb(), 'entries', id);
      await deleteDoc(docRef);
      
      console.log("Deletion successful for:", id);
      if (selectedEntry?.id === id) {
        setSelectedEntry(null);
      }
      setDeletingId(null);
    } catch (err: any) {
      console.error("Detailed delete error:", err);
      const errorMessage = err.message || "Bilinmeyen bir hata oluştu";
      alert(`Silme işlemi başarısız oldu: ${errorMessage}`);
      handleFirestoreError(err, OperationType.DELETE, `entries/${id}`);
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);
  };

  const confirmBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    const idsToDelete = Array.from(selectedIds);
    
    try {
      console.log("Starting bulk delete for IDs:", idsToDelete);
      const batch = idsToDelete.map(id => deleteDoc(doc(getActiveDb(), 'entries', id)));
      await Promise.all(batch);
      
      console.log("Bulk delete successful");
      setSelectedIds(new Set());
      setIsSelectionMode(false);
      setIsBulkDeleting(false);
    } catch (err: any) {
      console.error("Bulk delete error:", err);
      alert(`Toplu silme başarısız: ${err.message || "Hata oluştu"}`);
      handleFirestoreError(err, OperationType.DELETE, "bulk");
      setIsBulkDeleting(false);
    }
  };

  const toggleSelection = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleUpdatePrompt = async (id: string) => {
    try {
      await updateDoc(doc(getActiveDb(), 'entries', id), { prompt: editPromptValue });
      setEditingPromptId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `entries/${id}`);
    }
  };

  // Zoom and Pan state for Detail View
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };
  const [isPanning, setIsPanning] = useState(false);

  useEffect(() => {
    if (selectedEntry) {
      setRotation(0);
      setTranslatedPrompt(null);
      setShowTranslated(false);
    }
  }, [selectedEntry?.id]);

  const panStartRef = useRef({ x: 0, y: 0 });
  const [userFeedback, setUserFeedback] = useState<Record<string, 'like' | 'dislike'>>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedPrompt, setTranslatedPrompt] = useState<string | null>(null);
  const [showTranslated, setShowTranslated] = useState(false);

  const handleFeedback = async (entryId: string, type: 'like' | 'dislike') => {
    if (userFeedback[entryId]) return;

    try {
      const entryRef = doc(getActiveDb(), "entries", entryId);
      await updateDoc(entryRef, {
        [type === 'like' ? 'likes' : 'dislikes']: increment(1)
      });
      setUserFeedback(prev => ({ ...prev, [entryId]: type }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `entries/${entryId}`);
    }
  };

  const handleToggleTranslation = async () => {
    if (!selectedEntry) return;

    if (showTranslated) {
      setShowTranslated(false);
      return;
    }

    if (translatedPrompt) {
      setShowTranslated(true);
      return;
    }

    setIsTranslating(true);
    try {
      const translation = await translateToTurkish(selectedEntry.prompt || '');
      setTranslatedPrompt(translation);
      setShowTranslated(true);
    } catch (error) {
      console.error("Translation error:", error);
    } finally {
      setIsTranslating(false);
    }
  };

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [selectedEntry]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.5, 4));
  const handleZoomOut = () => {
    setZoom(prev => {
      const newZoom = Math.max(prev - 0.5, 1);
      if (newZoom === 1) setPan({ x: 0, y: 0 });
      return newZoom;
    });
  };
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsPanning(true);
    panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || zoom <= 1) return;
    setPan({
      x: e.clientX - panStartRef.current.x,
      y: e.clientY - panStartRef.current.y
    });
  };

  const handleMouseUp = () => setIsPanning(false);

  // Touch handlers for mobile pan
  const handleTouchStart = (e: React.TouchEvent) => {
    if (zoom <= 1) return;
    setIsPanning(true);
    const touch = e.touches[0];
    panStartRef.current = { x: touch.clientX - pan.x, y: touch.clientY - pan.y };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPanning || zoom <= 1) return;
    const touch = e.touches[0];
    setPan({
      x: touch.clientX - panStartRef.current.x,
      y: touch.clientY - panStartRef.current.y
    });
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedPrompt(text);
      setTimeout(() => setCopiedPrompt(null), 2000);
    });
  };

  // Real-time listener for entries
  useEffect(() => {
    // We use a simpler query to avoid composite index requirements
    const q = query(
      collection(getActiveDb(), 'entries'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allItems = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          // Handle both Firestore Timestamps and numbers for backwards compatibility
          timestamp: data.timestamp?.toMillis ? data.timestamp.toMillis() : (data.timestamp || Date.now())
        } as ContentEntry;
      });
      
      // If the Firestore db is empty, populate state with beautifully curated fallback images
      if (allItems.length === 0) {
        setEntries(getFallbackEntries());
      } else {
        setEntries(allItems);
      }
      
      setLoading(false);
    }, (error) => {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
        markCurrentDbExhausted();
      }
      console.warn("Firestore collection load failed or empty. Sourcing curated archive assets locally.", error);
      setEntries(getFallbackEntries());
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentDateKey, dbVersion]);

  // Logic for autonomous generation and timing synchronization
  const checkAndGenerate = async (force = false) => {
    if (isGeneratingRef.current) return;
    
    // Safety check for system enabled
    if (!systemEnabled && !force) return;
    
    // Safety check for cooldown - force (manual click) bypasses cooldown
    if (cooldownUntil && Date.now() < cooldownUntil && !force) {
      setQuotaReached(true);
      setNotification(`Kota limiti nedeniyle ${new Date(cooldownUntil).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}'e kadar bekleniyor.`);
      return;
    }

    // Check last item timestamp to prevent redundant generations from multiple users
    const lastItem = entries[0];
    const now = Date.now();
    const timeSinceLast = lastItem ? now - lastItem.timestamp : Infinity;

    // Add a small random jitter to prevent multiple clients firing at the exact same time
    const jitter = Math.random() * 8000; 

    // Trigger if over 58 mins passed since last success (pre-generate early)
    // 3480000 ms = 58 mins. Using this + jitter to coordinate.
    const isOverdue = timeSinceLast >= (3480000 + jitter);

    if (force || isOverdue) { 
      try {
        isGeneratingRef.current = true;
        setIsGeneratingState(true);
        setQuotaReached(false);
        console.log("Triggering generation...");
        
        // If forced (manual click), publish NOW. Otherwise schedule for the next hour.
        const nextHourTimestamp = force
          ? now
          : (lastItem 
              ? Math.floor(lastItem.timestamp / 3600000) * 3600000 + 3600000
              : Math.floor(now / 3600000) * 3600000);

        await generateNewPiece(currentLang.code, nextHourTimestamp);
        // The onSnapshot will update entries and the sync useEffect will handle the countdown
      } catch (error: any) {
        console.error("Critical Generation Error:", error);
        if (error?.message?.includes("RESOURCE_EXHAUSTED") || JSON.stringify(error).includes("429")) {
          setQuotaReached(true);
          const resumeTime = Date.now() + 24 * 60 * 60 * 1000;
          setCooldownUntil(resumeTime);
          localStorage.setItem('mbg_cooldown', resumeTime.toString());
        }
      } finally {
        isGeneratingRef.current = false;
        setIsGeneratingState(false);
      }
    } else {
      // Sync local countdown with actual time since last DB entry
      const remainingSeconds = Math.max(1, Math.floor((3600000 - timeSinceLast) / 1000));
      setCountdown(remainingSeconds);
    }
  };

  // Synchronize countdown with actual Firestore data and handle initial state
  useEffect(() => {
    if (loading) return;

    if (entries.length === 0) {
      if (systemEnabled && !isGeneratingRef.current && !quotaReached) {
        checkAndGenerate(true);
      }
      return;
    }

    const lastItem = entries[0];
    const now = Date.now();
    const timeSinceLast = now - lastItem.timestamp;

    if (timeSinceLast >= 3600000) {
      // Overdue! System should catch up immediately if viewed
      if (systemEnabled && !isGeneratingRef.current && !quotaReached) {
        checkAndGenerate();
      }
    } else {
      // Not overdue, sync the countdown faithfully to the DB state
      const remainingSeconds = Math.max(1, Math.floor((3600000 - timeSinceLast) / 1000));
      setCountdown(remainingSeconds);
    }
  }, [entries, loading, systemEnabled, quotaReached]);

  // Main countdown timer (local UI decrement)
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Time's up! Attempt generation if system is enabled
          if (systemEnabled) {
            checkAndGenerate();
          }
          return 3600;
        }
        return prev - 1;
      });
      
      // Daily Reset Check
      const today = getTRDateKey();
      if (today !== currentDateKey) {
        setCurrentDateKey(today);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [systemEnabled, currentDateKey]); // Simplified dependencies to avoid unnecessary interval restarts

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Keyboard navigation for detailed view
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedEntry) return;

      let visibleList: ContentEntry[] = [];
      if (view === 'home') {
        visibleList = visibleEntries;
      } else if (view === 'galleries') {
        visibleList = filteredDates.flatMap(date => visibleHistory[date] || []);
      }

      if (visibleList.length <= 1) return;

      const currentIndex = visibleList.findIndex(item => item.id === selectedEntry.id);
      if (currentIndex === -1) return;

      if (e.key === 'ArrowRight') {
        const nextIndex = (currentIndex + 1) % visibleList.length;
        setSelectedEntry(visibleList[nextIndex]);
      } else if (e.key === 'ArrowLeft') {
        const prevIndex = (currentIndex - 1 + visibleList.length) % visibleList.length;
        setSelectedEntry(visibleList[prevIndex]);
      } else if (e.key === 'Escape') {
        setSelectedEntry(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEntry, view, visibleEntries, visibleHistory, filteredDates]);

  const handleDownload = (res: string) => {
    if (!selectedEntry) return;
    setDownloading(res);
    
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Define target widths
      const targets: Record<string, number> = {
        '1K': 1280,
        '2K': 2560,
        '4K': 3840,
        '8K': 7680
      };

      const targetWidth = targets[res] || img.width;
      const aspectRatio = img.height / img.width;
      const targetHeight = targetWidth * aspectRatio;

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Draw and upscale/downscale
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // Trigger download
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `MBG-${res}-${selectedEntry.id.split('-')[0]}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setDownloading(null);
      }, 'image/png', 1.0);
    };

    img.onerror = () => {
      console.error("Image load failed for download");
      setDownloading(null);
    };

    img.src = selectedEntry.imageUrl;
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white">
      {/* Admin Login Elevation Modal */}
      <AnimatePresence>
        {showAdminLoginModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-zinc-900/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-white rounded-[2.5rem] p-10 shadow-3xl overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 p-8">
                <button onClick={() => setShowAdminLoginModal(false)} className="text-zinc-400 hover:text-zinc-900 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex flex-col items-center text-center gap-6">
                <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400">
                  <Shield size={24} className="text-amber-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-bold uppercase tracking-[0.3em] text-zinc-900">{t.adminAccess}</h3>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em]">COLLECTION MANAGEMENT</p>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  const val = adminAuthInput.trim().toLowerCase();
                  if (val === 'ag1453ag' || val === 'ag2026') {
                    setUserRole('admin');
                    setView('galleries');
                    setShowAdminLoginModal(false);
                    setAdminAuthInput('');
                    setAdminAuthError(false);
                  } else {
                    setAdminAuthError(true);
                  }
                }} className="w-full space-y-4">
                  <div className="relative">
                    <input 
                      autoFocus
                      type="password"
                      value={adminAuthInput}
                      onChange={(e) => {
                        setAdminAuthInput(e.target.value);
                        if (adminAuthError) setAdminAuthError(false);
                      }}
                      placeholder={t.passwordPlaceholder}
                      className={`w-full bg-zinc-50 border-2 rounded-2xl px-6 py-4 text-center text-sm font-mono tracking-[0.5em] focus:outline-none transition-all ${adminAuthError ? 'border-red-500 text-red-500' : 'border-transparent focus:border-zinc-900/10 text-zinc-900'}`}
                    />
                    {adminAuthError && (
                      <motion.p 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-3"
                      >
                        {t.wrongPassword}
                      </motion.p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-4">
                    <button 
                      type="button"
                      onClick={() => setShowAdminLoginModal(false)}
                      className="px-6 py-4 bg-zinc-100 text-zinc-400 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-200 transition-all"
                    >
                      {t.cancel}
                    </button>
                    <button 
                      type="submit"
                      className="px-6 py-4 bg-zinc-900 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all"
                    >
                      {t.confirm}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Password Protection Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-white/80 backdrop-blur-xl"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-zinc-900 text-white rounded-[2.5rem] p-10 shadow-3xl overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 p-8">
                <button onClick={() => setShowPasswordModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex flex-col items-center text-center gap-6">
                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400">
                  <Terminal size={24} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-bold uppercase tracking-[0.3em]">{t.enterPassword}</h3>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em]">{t.shutdownSystem}</p>
                </div>

                <form onSubmit={handlePasswordSubmit} className="w-full space-y-4">
                  <div className="relative">
                    <input 
                      autoFocus
                      type="password"
                      value={passwordInput}
                      onChange={(e) => {
                        setPasswordInput(e.target.value);
                        if (passwordError) setPasswordError(false);
                      }}
                      placeholder={t.passwordPlaceholder}
                      className={`w-full bg-zinc-800 border-2 rounded-2xl px-6 py-4 text-center text-sm font-mono tracking-[0.5em] focus:outline-none transition-all ${passwordError ? 'border-red-500 text-red-500' : 'border-transparent focus:border-zinc-700 text-white'}`}
                    />
                    {passwordError && (
                      <motion.p 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[10px] font-bold text-red-500 uppercase tracking-widest mt-3"
                      >
                        {t.wrongPassword}
                      </motion.p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-4">
                    <button 
                      type="button"
                      onClick={() => setShowPasswordModal(false)}
                      className="px-6 py-4 bg-zinc-800 text-zinc-400 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-700 transition-all"
                    >
                      {t.cancel}
                    </button>
                    <button 
                      type="submit"
                      className="px-6 py-4 bg-white text-zinc-900 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-200 transition-all"
                    >
                      {t.confirm}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      {/* Delete Confirmation Modals */}
      <AnimatePresence>
        {(deletingId || isBulkDeleting) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => { setDeletingId(null); setIsBulkDeleting(false); }} />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full relative z-10 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-red-600" />
              <div className="flex flex-col items-center text-center gap-6">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-600">
                  <Trash size={28} />
                </div>
                <div className="space-y-4">
                  <h3 className="text-xl font-black uppercase tracking-tighter text-zinc-900">
                    {isBulkDeleting ? t.bulkDelete : t.confirmDelete}
                  </h3>
                  <p className="text-zinc-500 text-sm leading-relaxed">
                    {isBulkDeleting ? `${selectedIds.size} ${t.bulkDeleteConfirm}` : t.confirmDelete}
                  </p>
                </div>
                <div className="flex flex-col w-full gap-3">
                  <button 
                    onClick={isBulkDeleting ? confirmBulkDelete : confirmDelete}
                    className="w-full py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl active:scale-95"
                  >
                    {t.deleteConfirmAction}
                  </button>
                  <button 
                    onClick={() => { setDeletingId(null); setIsBulkDeleting(false); }}
                    className="w-full py-4 bg-zinc-100 text-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all"
                  >
                    {t.cancel}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedEntry && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-12 overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEntry(null)}
              className="absolute inset-0 bg-black/80 md:bg-white/95 backdrop-blur-xl"
            />
            
            <motion.div 
              layoutId={`img-${selectedEntry.id}`}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full h-full md:max-h-[90vh] md:max-w-7xl bg-white md:border md:border-zinc-200 md:shadow-[0_0_100px_rgba(0,0,0,0.1)] md:rounded-3xl overflow-hidden flex flex-col lg:flex-row"
            >
              <button 
                onClick={() => setSelectedEntry(null)}
                className="absolute top-6 right-6 z-30 p-3 bg-black/40 hover:bg-black/60 text-white rounded-full border border-white/10 backdrop-blur-md transition-all lg:bg-zinc-100 lg:text-zinc-600 lg:hover:bg-zinc-200 lg:border-transparent"
              >
                <X size={20} />
              </button>

              {/* Modal Image Area */}
              <div 
                className={`absolute inset-0 lg:relative lg:w-2/3 h-full lg:h-full bg-zinc-950 lg:bg-zinc-50 group overflow-hidden ${zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
                onWheel={handleWheel}
              >
                <div 
                   className="w-full h-full transition-transform duration-200"
                  style={{ 
                    transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px) rotate(${rotation}deg)`,
                    transformOrigin: 'center'
                  }}
                >
                  <ImageWithSkeleton 
                    src={selectedEntry.imageUrl} 
                    alt={selectedEntry.location} 
                    className="w-full h-full object-cover lg:object-contain p-0 lg:p-16 pointer-events-none"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Zoom Controls */}
                <div className={`absolute top-6 left-6 z-20 flex items-center gap-1.5 px-3 py-1.5 bg-black/40 hover:bg-black/60 text-white backdrop-blur-md rounded-full border border-white/10 shadow-xl transition-all duration-300 lg:top-auto lg:left-1/2 lg:-translate-x-1/2 lg:bottom-8 lg:bg-white/90 lg:text-zinc-600 lg:border-zinc-200 lg:px-6 lg:py-3 ${zoom > 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0'}`}>
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
                    className="p-2 hover:bg-white/10 lg:hover:bg-zinc-100 rounded-full text-white lg:text-zinc-600 transition-colors"
                    title="Zoom Out"
                  >
                    <ZoomOut size={18} />
                  </button>
                  <div className="w-[1px] h-4 bg-white/20 lg:bg-zinc-200 mx-2" />
                  <span className="text-[10px] font-mono font-bold w-12 text-center text-white lg:text-zinc-900">
                    {Math.round(zoom * 100)}%
                  </span>
                  <div className="w-[1px] h-4 bg-white/20 lg:bg-zinc-200 mx-2 text-white/30" />
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
                    className="p-2 hover:bg-white/10 lg:hover:bg-zinc-100 rounded-full text-white lg:text-zinc-600 transition-colors"
                    title="Zoom In"
                  >
                    <ZoomIn size={18} />
                  </button>
                  <div className="w-[1px] h-4 bg-white/20 lg:bg-zinc-200 mx-2" />
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleRotate(); }}
                    className="p-2 hover:bg-white/10 lg:hover:bg-zinc-100 rounded-full text-white lg:text-zinc-600 transition-colors"
                    title={t.rotate}
                  >
                    <RotateCw size={18} />
                  </button>
                  {zoom > 1 && (
                    <>
                      <div className="w-[1px] h-4 bg-white/20 lg:bg-zinc-200 mx-2" />
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleResetZoom(); }}
                        className="p-2 hover:bg-white/10 lg:hover:bg-zinc-100 rounded-full text-red-400 lg:text-red-500 hover:text-red-500 lg:hover:text-red-600 transition-all"
                        title="Reset Zoom"
                      >
                        <RotateCcw size={16} />
                      </button>
                    </>
                  )}
                </div>

                {zoom > 1 && (
                    <div className="absolute top-20 left-6 z-20 flex items-center gap-3 bg-black/40 border border-white/10 backdrop-blur-md px-4 py-2 rounded-full text-[10px] uppercase tracking-widest font-bold text-zinc-300 lg:top-8 lg:left-8 lg:bg-zinc-900/10 lg:text-zinc-500 lg:border-none">
                      <Move size={12} />
                      {t.exploreDrag}
                    </div>
                )}

                {/* Feedback Floating Action Buttons */}
                <div className="absolute bottom-[52dvh] right-6 z-20 flex flex-row lg:flex-col gap-3 group/feedback lg:bottom-10 lg:right-10">
                    <button
                      onClick={() => handleFeedback(selectedEntry.id, 'like')}
                      disabled={!!userFeedback[selectedEntry.id]}
                      title={t.like}
                      className={`w-12 h-12 flex items-center justify-center rounded-full backdrop-blur-xl transition-all shadow-2xl border ${
                        userFeedback[selectedEntry.id] === 'like'
                          ? 'bg-zinc-900 border-zinc-900 text-white'
                          : userFeedback[selectedEntry.id]
                            ? 'bg-white/40 border-white/20 text-zinc-300 opacity-50'
                            : 'bg-black/40 border-white/10 hover:bg-black/60 text-white hover:scale-110 lg:bg-white/80 lg:border-white/20 lg:hover:bg-white lg:text-zinc-900'
                      }`}
                    >
                      <ThumbsUp size={18} />
                      {userRole === 'admin' && (selectedEntry.likes ?? 0) > 0 && (
                        <span className="absolute -top-2 -right-2 bg-black text-white text-[8px] px-2 py-0.5 rounded-full font-black">
                            {selectedEntry.likes}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => handleFeedback(selectedEntry.id, 'dislike')}
                      disabled={!!userFeedback[selectedEntry.id]}
                      title={t.improve}
                      className={`w-12 h-12 flex items-center justify-center rounded-full backdrop-blur-xl transition-all shadow-2xl border ${
                        userFeedback[selectedEntry.id] === 'dislike'
                          ? 'bg-zinc-900 border-zinc-900 text-white'
                          : userFeedback[selectedEntry.id]
                            ? 'bg-white/40 border-white/20 text-zinc-300 opacity-50'
                            : 'bg-black/40 border-white/10 hover:bg-black/60 text-white hover:scale-110 lg:bg-white/80 lg:border-white/20 lg:hover:bg-white lg:text-zinc-900'
                      }`}
                    >
                      <ThumbsDown size={18} />
                      {userRole === 'admin' && (selectedEntry.dislikes ?? 0) > 0 && (
                        <span className="absolute -top-2 -right-2 bg-black text-white text-[8px] px-2 py-0.5 rounded-full font-black">
                            {selectedEntry.dislikes}
                        </span>
                      )}
                    </button>
                </div>
              </div>

              {/* Modal Info Area */}
              <div className="absolute bottom-0 left-0 right-0 z-10 max-h-[50dvh] overflow-y-auto bg-black/80 backdrop-blur-2xl border-t border-white/10 p-6 sm:p-8 rounded-t-[2.5rem] text-white lg:relative lg:bottom-auto lg:left-auto lg:right-auto lg:z-auto lg:max-h-none lg:overflow-y-auto lg:p-12 lg:bg-white lg:backdrop-blur-none lg:text-zinc-900 lg:border-t-0 lg:border-l lg:border-zinc-100 lg:rounded-none lg:w-1/3 lg:h-full lg:flex-1 lg:min-h-0 lg:flex lg:flex-col">
                <div className="mb-12">
                  <div className="flex items-center gap-3 mb-6">
                    <Sparkles size={16} className="text-zinc-400" />
                    <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-zinc-400">{t.aiArchive}</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black uppercase tracking-tighter mb-4 text-white lg:text-zinc-900">{selectedEntry.location}</h3>
                  <div className="flex gap-4">
                    <span className="text-[10px] uppercase tracking-widest bg-white/10 lg:bg-zinc-100 px-3 py-1 rounded-full text-zinc-300 lg:text-zinc-500">{currentDateKey}</span>
                    <span className="text-[10px] uppercase tracking-widest bg-zinc-800 lg:bg-zinc-900 px-3 py-1 rounded-full text-white">4K EDITORIAL</span>
                  </div>
                </div>

                <div className="mb-12 space-y-6">
                  {selectedEntry.description && (
                    <div className="mb-8 p-6 border-l-2 border-white/20 lg:border-zinc-200">
                      <p className="text-sm font-serif italic text-zinc-200 lg:text-zinc-600 leading-relaxed">
                        {selectedEntry.description}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Terminal size={14} className="text-zinc-400" />
                      <h4 className="text-[11px] uppercase tracking-[0.3em] font-bold">{t.genPrompt}</h4>
                    </div>
                    {userRole === 'admin' && (
                      <button 
                        onClick={() => {
                          setEditingPromptId(selectedEntry.id);
                          setEditPromptValue(selectedEntry.prompt || '');
                        }}
                        className="text-[9px] uppercase tracking-widest font-black text-zinc-400 hover:text-white lg:hover:text-zinc-900 flex items-center gap-2"
                      >
                         <Edit3 size={12} />
                         {t.edit}
                      </button>
                    )}
                  </div>
                  
                  {editingPromptId === selectedEntry.id ? (
                    <div className="space-y-4">
                      <textarea 
                        value={editPromptValue}
                        onChange={(e) => setEditPromptValue(e.target.value)}
                        className="w-full h-80 p-6 bg-white/5 border border-white/10 lg:bg-zinc-50 lg:border-zinc-100 rounded-3xl text-xs font-mono text-white lg:text-zinc-600 focus:outline-none focus:border-zinc-500 lg:focus:border-zinc-950 transition-colors"
                      />
                      <div className="flex justify-end gap-3">
                        <button 
                          onClick={() => setEditingPromptId(null)}
                          className="px-6 py-3 border border-white/20 lg:border-zinc-200 rounded-full text-[10px] uppercase tracking-widest font-black text-white lg:text-zinc-900 hover:bg-white/10 lg:hover:bg-zinc-100 transition-colors"
                        >
                          {t.cancel}
                        </button>
                        <button 
                          onClick={() => handleUpdatePrompt(selectedEntry.id)}
                          className="px-6 py-3 bg-white text-black lg:bg-black lg:text-white rounded-full text-[10px] uppercase tracking-widest font-black transition-colors"
                        >
                          {t.save}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 bg-white/5 border border-white/10 lg:bg-zinc-50 lg:border-zinc-100 rounded-2xl relative group/prompt overflow-hidden">
                      <p className="text-[10px] text-zinc-300 lg:text-zinc-500 leading-relaxed font-mono pr-8 transition-opacity duration-300 whitespace-pre-wrap">
                        {showTranslated ? translatedPrompt : (selectedEntry.prompt || t.originalPrompt)}
                      </p>
                      <button 
                        onClick={() => copyToClipboard(showTranslated ? (translatedPrompt || '') : (selectedEntry.prompt || t.originalPrompt))}
                        className="absolute top-4 right-4 p-2 bg-black/40 border border-white/10 rounded-lg text-zinc-300 hover:text-white transition-all opacity-0 group-hover/prompt:opacity-100 lg:bg-white lg:border-zinc-100 lg:text-zinc-400 lg:hover:text-zinc-900"
                      >
                        {copiedPrompt === (showTranslated ? translatedPrompt : (selectedEntry.prompt || t.originalPrompt)) ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                      </button>

                      <button
                        onClick={handleToggleTranslation}
                        disabled={isTranslating}
                        className="mt-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-200 lg:hover:text-zinc-900 transition-all disabled:opacity-50"
                      >
                        <div className={`flex items-center justify-center transition-transform duration-500 ${isTranslating ? 'animate-spin' : ''}`}>
                          <Languages size={12} />
                        </div>
                        {isTranslating ? t.translating : showTranslated ? t.showOriginal : t.showTranslation}
                        <div className={`w-1 h-1 rounded-full ${showTranslated ? 'bg-white lg:bg-zinc-900' : 'bg-zinc-700 lg:bg-zinc-200'} transition-colors`} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Swapped: Download Section now here */}
                <div className="mb-12 pt-8 border-t border-white/10 lg:border-t lg:border-zinc-100">
                  <div className="flex items-center gap-3 mb-6 text-white lg:text-zinc-900">
                    <Download size={16} />
                    <span className="text-[11px] uppercase tracking-[0.4em] font-bold">{t.downloadHighRes}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {['1K', '2K', '4K', '8K'].map((res) => (
                      <button
                        key={res}
                        disabled={downloading !== null}
                        onClick={() => handleDownload(res)}
                        className={`py-4 border rounded-2xl flex flex-col items-center justify-center gap-2 transition-all relative overflow-hidden group ${
                          downloading === res 
                            ? 'bg-zinc-900 text-white lg:bg-zinc-900 lg:text-white' 
                            : 'bg-white/5 border-white/10 hover:border-white/35 text-white lg:bg-white lg:border-zinc-200 lg:hover:border-zinc-900 lg:text-zinc-900'
                        }`}
                      >
                        <span className="text-sm font-bold">{res}</span>
                        <span className="text-[8px] uppercase tracking-tighter text-zinc-400 group-hover:text-zinc-300 lg:group-hover:text-zinc-600">
                          {res === '1K' ? '1280px' : res === '2K' ? '2560px' : res === '4K' ? '3840px' : '7680px'}
                        </span>
                        {downloading === res && (
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 2, ease: "easeInOut" }}
                            className="h-[2px] w-full bg-[#18eedc] absolute bottom-0"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-12">
                  <div className="p-4 bg-white/5 border border-white/10 lg:bg-zinc-50 lg:border-zinc-100 rounded-2xl flex flex-col gap-1">
                    <span className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold">{t.model}</span>
                    <span className="text-[11px] font-mono font-medium text-zinc-200 lg:text-zinc-900">Gemini 1.5 Pro</span>
                  </div>
                  <div className="p-4 bg-white/5 border border-white/10 lg:bg-zinc-50 lg:border-zinc-100 rounded-2xl flex flex-col gap-1">
                    <span className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold">{t.generated}</span>
                    <span className="text-[11px] font-mono font-medium text-zinc-200 lg:text-zinc-900">
                      {new Date(selectedEntry.timestamp).toLocaleTimeString(currentLang.code === 'TR' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Europe/Istanbul' })}
                    </span>
                  </div>
                </div>

                <div className="mb-12">
                    <div className="flex items-center gap-3 mb-6">
                        <Camera size={14} className="text-zinc-400" />
                        <h4 className="text-[11px] uppercase tracking-[0.3em] font-bold text-white lg:text-zinc-900">{t.metadata}</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="px-4 py-3 bg-white/5 rounded-xl border border-white/10 italic lg:bg-zinc-50 lg:border-zinc-100">
                            <span className="text-[8px] uppercase tracking-widest text-zinc-400 block mb-1">85mm</span>
                            <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-tighter lg:text-zinc-600">F/1.2 LENS</span>
                        </div>
                        <div className="px-4 py-3 bg-white/5 rounded-xl border border-white/10 italic lg:bg-zinc-50 lg:border-zinc-100">
                            <span className="text-[8px] uppercase tracking-widest text-zinc-400 block mb-1">ISO 100</span>
                            <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-tighter lg:text-zinc-600">1/250s EXP</span>
                        </div>
                        <div className="px-4 py-3 bg-white/5 rounded-xl border border-white/10 italic lg:bg-zinc-50 lg:border-zinc-100">
                            <span className="text-[8px] uppercase tracking-widest text-zinc-400 block mb-1">SENSOR</span>
                            <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-tighter lg:text-zinc-600">Full Frame 3:2</span>
                        </div>
                        <div className="px-4 py-3 bg-white/5 rounded-xl border border-white/10 italic lg:bg-zinc-50 lg:border-zinc-100">
                            <span className="text-[8px] uppercase tracking-widest text-zinc-400 block mb-1">DYNAMICS</span>
                            <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-tighter lg:text-zinc-600">14-Bit RAW</span>
                        </div>
                        <div className="px-4 py-3 bg-white/5 rounded-xl border border-white/10 italic lg:bg-zinc-50 lg:border-zinc-100">
                            <span className="text-[8px] uppercase tracking-widest text-zinc-400 block mb-1">FOCUS</span>
                            <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-tighter lg:text-zinc-600">Eye-AF Phase</span>
                        </div>
                        <div className="px-4 py-3 bg-white/5 rounded-xl border border-white/10 italic lg:bg-zinc-50 lg:border-zinc-100">
                            <span className="text-[8px] uppercase tracking-widest text-zinc-400 block mb-1">COLORSPACE</span>
                            <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-tighter lg:text-zinc-600">BT.2020 WCG</span>
                        </div>
                        <div className="px-4 py-3 bg-white/5 rounded-xl border border-white/10 italic lg:bg-zinc-50 lg:border-zinc-100">
                            <span className="text-[8px] uppercase tracking-widest text-zinc-400 block mb-1">SHARPNESS</span>
                            <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-tighter lg:text-zinc-600">Ultra-HD AI</span>
                        </div>
                        <div className="px-4 py-3 bg-white/5 rounded-xl border border-white/10 italic lg:bg-zinc-50 lg:border-zinc-100">
                            <span className="text-[8px] uppercase tracking-widest text-zinc-400 block mb-1">BIT DEPTH</span>
                            <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-tighter lg:text-zinc-600">32-Bit Float</span>
                        </div>
                        {selectedEntry.model && (
                            <div className="col-span-2 px-4 py-3 bg-white/10 text-white rounded-xl border border-white/10 italic flex items-center justify-between lg:bg-zinc-900 lg:border-zinc-800">
                                <div>
                                    <span className="text-[8px] uppercase tracking-widest text-zinc-400 block mb-1">{t.aiModel}</span>
                                    <span className="text-[10px] font-bold uppercase tracking-tighter">{selectedEntry.model}</span>
                                </div>
                                <Sparkles size={12} className="text-amber-400" />
                            </div>
                        )}
                    </div>
                </div>

                {userRole === 'admin' && (
                  <div className="mt-12 pt-8 border-t border-white/10 flex flex-col gap-4 lg:border-zinc-100">
                     <div className="flex items-center gap-3 mb-2 text-red-400 lg:text-red-500">
                        <Trash size={16} />
                        <span className="text-[11px] uppercase tracking-[0.4em] font-bold">{t.adminActions}</span>
                     </div>
                     <button 
                       onClick={(e) => handleDelete(selectedEntry.id, e)}
                       className="w-full py-4 bg-red-950/20 text-red-400 border border-red-900/40 rounded-2xl text-[10px] uppercase tracking-widest font-black hover:bg-red-500 hover:text-white transition-all shadow-sm lg:bg-red-50 lg:text-red-600 lg:border-red-100"
                     >
                       {t.deleteEntryAction}
                     </button>
                  </div>
                )}
                
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Editorial Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-zinc-200">
        <div className="max-w-[1800px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8 lg:gap-16">
            <button onClick={() => setView('home')} className="group flex items-center gap-5 transition-all">
              <div className="relative w-12 h-12 flex items-center justify-center">
                {/* Background Glow */}
                <div className="absolute inset-0 bg-[#df17e6]/5 blur-xl rounded-full group-hover:bg-[#df17e6]/10 transition-colors" />
                
                {/* Outer Frame */}
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border-[1px] border-zinc-100 rounded-full"
                />
                
                {/* Diamond Core */}
                <div className="relative w-8 h-8 bg-zinc-900 rotate-45 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
                  <div className="absolute inset-[2px] border border-white/20" />
                  <div className="relative -rotate-45">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Diamond size={16} className="text-[#18eedc] stroke-[2.5]" />
                    </motion.div>
                  </div>
                </div>
                
                {/* Orbital dots */}
                {[0, 90, 180, 270].map((angle) => (
                  <motion.div 
                    key={angle}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0"
                    style={{ transform: `rotate(${angle}deg)` }}
                  >
                    <motion.div 
                      animate={{ 
                        backgroundColor: ["#ff0000", "#00ff00", "#0000ff", "#ff0000"],
                        boxShadow: [
                          "0 0 4px #ff0000",
                          "0 0 4px #00ff00",
                          "0 0 4px #0000ff",
                          "0 0 4px #ff0000"
                        ]
                      }}
                      transition={{ 
                        duration: 4, 
                        repeat: Infinity, 
                        ease: "linear" 
                      }}
                      className="absolute top-0 left-1/2 -ml-[2px] w-1 h-1 rounded-full" 
                    />
                  </motion.div>
                ))}
              </div>
              
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black tracking-tighter uppercase text-zinc-900">AG</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#FF00FF] animate-pulse" />
                </div>
                <span className="text-[9px] tracking-[0.5em] font-black text-zinc-400 -mt-1 uppercase">
                  <span className="text-[#FF00FF]">M</span>oda <span className="text-[#FF00FF]">B</span>urada <span className="text-[#FF00FF]">G</span>alerisi
                </span>
              </div>
            </button>

            <nav className="hidden xl:flex items-center gap-8 text-[11px] uppercase tracking-[0.25em] font-medium text-zinc-500">
              <button 
                onClick={() => setView('home')} 
                className={`hover:text-zinc-900 transition-all duration-300 ${view === 'home' ? 'text-zinc-900 underline underline-offset-8 decoration-zinc-900' : ''}`}
              >
                {t.dailyCaptures}
              </button>
              <button 
                onClick={() => setView(view === 'galleries' ? 'home' : 'galleries')} 
                className={`hover:text-zinc-900 transition-all duration-300 ${view === 'galleries' ? 'text-zinc-900 underline underline-offset-8 decoration-zinc-900' : ''}`}
              >
                {t.pastGalleries}
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setView(view === 'galleries' ? 'home' : 'galleries')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-medium uppercase tracking-widest transition-all ${view === 'galleries' ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-200'}`}
            >
              <LayoutGrid size={14} />
              <span className="hidden sm:inline">{t.galleries}</span>
            </button>

            {/* Language Switcher */}
            <div className="relative">
              <button 
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-3 px-4 py-2 hover:bg-zinc-50 border border-zinc-200 rounded-full shadow-sm transition-all text-xs font-bold uppercase tracking-widest bg-[#ff0000]"
              >
                <span className="text-base leading-none text-[#ffffff]">{currentLang.flag}</span>
                <span className="text-[#ffffff]">{currentLang.code}</span>
                <ChevronDown size={14} className={`transition-transform duration-300 bg-[#fff502] text-[#0000ff] ${showLangMenu ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showLangMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowLangMenu(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-3 w-48 bg-white border border-zinc-200 shadow-2xl rounded-2xl overflow-hidden z-20 overflow-y-auto max-h-96"
                    >
                      {LANGUAGES.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            setCurrentLang(lang);
                            setShowLangMenu(false);
                          }}
                          className={`w-full px-6 py-4 text-left text-xs uppercase tracking-widest hover:bg-zinc-50 transition-colors flex items-center justify-between ${currentLang.code === lang.code ? 'bg-zinc-100 font-bold' : ''}`}
                        >
                          <span className="flex items-center gap-3">
                            <span className="text-lg">{lang.flag}</span>
                            <span>{lang.name}</span>
                          </span>
                          <span className="text-[10px] text-zinc-400">{lang.code}</span>
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {quotaReached && (
              <div className="hidden lg:flex items-center gap-2 text-red-600 animate-pulse bg-red-50 px-4 py-2 rounded-full border border-red-200">
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  {cooldownUntil 
                    ? `${t.quotaLimit} (${t.reset}: ${new Date(cooldownUntil).toLocaleTimeString(currentLang.code === 'TR' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' })})` 
                    : t.quotaReached}
                </span>
              </div>
            )}
            
            <div className={`hidden md:flex items-center gap-6 px-8 py-3 rounded-full border transition-all duration-500 min-w-[300px] lg:min-w-[450px] ${!systemEnabled ? 'bg-zinc-100 border-zinc-200 opacity-60' : (quotaReached ? 'bg-red-50 border-red-100' : 'bg-white border-zinc-200 shadow-sm')}`}>
              <div className="flex items-center gap-3 shrink-0">
                <Clock size={12} className={!systemEnabled ? 'text-zinc-300' : (quotaReached ? 'text-red-300' : 'text-zinc-400')} />
                <span className={`font-mono text-[10px] font-black uppercase tracking-widest ${!systemEnabled ? 'text-zinc-400' : (quotaReached ? 'text-red-600' : 'text-zinc-900')}`}>
                  {quotaReached ? t.quotaReached : (systemEnabled ? formatCountdown(countdown) : t.stopped)}
                </span>
              </div>
              
              <div className="flex-grow h-[4px] bg-zinc-100 rounded-full overflow-hidden relative">
                <motion.div 
                  initial={false}
                  animate={{ 
                    width: !systemEnabled || quotaReached ? "0%" : `${((3600 - countdown) / 3600) * 100}%` 
                  }}
                  transition={{ duration: 1, ease: "linear" }}
                  className={`absolute inset-y-0 left-0 transition-colors duration-500 ${quotaReached ? 'bg-red-500' : 'bg-zinc-900'}`}
                />
              </div>

              {systemEnabled && !quotaReached && (
                <div className="flex items-center gap-4 shrink-0 border-l border-zinc-100 pl-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${isGeneratingState ? 'bg-amber-500 scale-150 animate-ping' : 'bg-blue-500 animate-pulse'}`} />
                    <span className="text-[9px] font-black tracking-widest text-zinc-400 uppercase">
                      {isGeneratingState ? 'GENERATING_NOW' : 'TREND_SYNC'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-black text-zinc-900">
                    {Math.round(((3600 - countdown) / 3600) * 100)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-6 pt-10 pb-16 relative min-h-[60vh]">
        {view === 'home' ? (
          <div className="animate-in fade-in duration-1000">
            {/* Header Section */}
            <div className="mb-12 border-l-4 border-zinc-900 pl-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
              <div>
                <h1 className="text-lg md:text-xl font-bold tracking-tighter uppercase leading-[0.8] mb-8">
                  {t.daily} <span className="italic font-serif font-light text-zinc-400 text-[0.7em] tracking-normal normal-case align-middle ml-2">{t.images}</span>
                </h1>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-12">
                  <p className="text-zinc-400 uppercase tracking-[0.4em] text-[11px] font-medium">
                    {t.hourlyEditorial} · {new Date().toLocaleDateString(currentLang.code === 'TR' ? 'tr-TR' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Europe/Istanbul' })}
                  </p>
                  <div className="h-[1px] w-24 bg-zinc-200 hidden sm:block" />
                  <p className="text-zinc-400 uppercase tracking-[0.2em] text-[10px]">
                    {t.syncActive}
                  </p>
                </div>
              </div>
            </div>

            {loading && entries.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-64 gap-16"
              >
                <div className="relative">
                  {/* Decorative rotating frame */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="w-48 h-48 border border-zinc-100 rounded-full flex items-center justify-center"
                  >
                    <div className="w-full h-[1px] bg-zinc-100 absolute" />
                    <div className="w-[1px] h-full bg-zinc-100 absolute" />
                  </motion.div>
                  
                  {/* Inner circles */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      animate={{ 
                        scale: [1, 1.1, 1],
                        opacity: [0.3, 0.7, 0.3]
                      }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      className="w-32 h-32 border-2 border-zinc-900 rounded-full flex items-center justify-center"
                    >
                      <Sparkles size={32} className="text-zinc-900" />
                    </motion.div>
                  </div>

                  {/* Pulsing rings */}
                  {[...Array(2)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 2, opacity: 0 }}
                      transition={{ 
                        duration: 4, 
                        repeat: Infinity, 
                        delay: i * 2,
                        ease: "easeOut" 
                      }}
                      className="absolute inset-0 border border-zinc-200 rounded-full"
                    />
                  ))}
                </div>

                <div className="text-center space-y-10 w-full max-w-sm px-12">
                  <div className="space-y-4">
                    <h3 className="text-[11px] font-black uppercase tracking-[1em] text-zinc-900 ml-[1em] whitespace-nowrap">DATALINK_IN_PROGRESS</h3>
                    <p className="text-[9px] uppercase tracking-[0.4em] text-zinc-400 font-bold">{t.loading}</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="relative h-[2px] w-full bg-zinc-50 overflow-hidden rounded-full">
                      <motion.div 
                        className="absolute inset-y-0 left-0 bg-zinc-900"
                        initial={{ width: "0%", left: "0%" }}
                        animate={{ 
                          width: ["10%", "30%", "20%", "60%", "100%"],
                          left: ["0%", "0%", "0%", "0%", "0%"]
                        }}
                        transition={{ 
                          duration: 8, 
                          ease: "easeInOut",
                          repeat: Infinity,
                        }}
                      />
                    </div>
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[7px] font-mono text-zinc-300 uppercase tracking-tighter">fetching_encrypted_assets</span>
                      <motion.span 
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="text-[7px] font-mono text-zinc-400"
                      >
                        SYNC_STATE_ACTIVE
                      </motion.span>
                    </div>
                  </div>

                  <div className="flex justify-center gap-12">
                     <div className="flex flex-col items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-zinc-200" />
                        <span className="text-[6px] font-mono text-zinc-200 uppercase">Buffer</span>
                     </div>
                     <div className="flex flex-col items-center gap-2">
                        <motion.div 
                          animate={{ scale: [1, 1.5, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="w-1 h-1 rounded-full bg-zinc-400" 
                        />
                        <span className="text-[6px] font-mono text-zinc-400 uppercase">Stream</span>
                     </div>
                     <div className="flex flex-col items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-zinc-200" />
                        <span className="text-[6px] font-mono text-zinc-200 uppercase">Render</span>
                     </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="space-y-20">
                {todayEntries.length > 0 ? (
                  <>
                    {/* Hero Feature: Latest Capture */}
                    <section>
                      <div className="flex items-center gap-4 mb-12 animate-in slide-in-from-top duration-1000">
                        <div className="h-[1px] flex-grow bg-zinc-100" />
                        <span className="text-[10px] uppercase tracking-[0.6em] text-zinc-300 font-black">{t.lastEditorial}</span>
                        <div className="h-[1px] flex-grow bg-zinc-100" />
                      </div>
                      
                      <div className="flex flex-col lg:flex-row gap-16 lg:gap-24 xl:gap-32 items-center justify-center max-w-[1500px] mx-auto">
                        <motion.div 
                          layoutId={`img-${todayEntries[0].id}`}
                          onClick={() => setSelectedEntry(todayEntries[0])}
                          className="relative aspect-[3/4] w-full max-w-[420px] bg-zinc-100 rounded-[3.5rem] overflow-hidden cursor-zoom-in group shadow-[0_40px_80px_-15px_rgba(0,0,0,0.15)] transition-all duration-700 hover:shadow-[0_50px_100px_-20px_rgba(0,0,0,0.25)] flex-shrink-0"
                        >
                          <ImageWithSkeleton 
                            src={todayEntries[0].imageUrl} 
                            alt={todayEntries[0].location} 
                            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                            referrerPolicy="no-referrer"
                            loading="eager"
                          />
                          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                          
                          <div className="absolute top-10 right-10 flex flex-col items-end gap-2">
                             <div className="bg-black/80 backdrop-blur-xl px-8 py-4 rounded-3xl border border-white/10 text-white text-[12px] uppercase tracking-[0.2em] font-mono shadow-2xl">
                               {new Date(todayEntries[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' })}
                             </div>
                          </div>
                          <div className="absolute bottom-10 right-10 flex items-center gap-6 animate-in fade-in slide-in-from-right duration-1000 delay-500 opacity-0 group-hover:opacity-100 lg:opacity-100 transition-opacity">
                             <button 
                               onClick={(e) => {
                                 e.stopPropagation();
                                 setSelectedEntry(todayEntries[0]);
                               }}
                               className="px-10 py-5 bg-white/90 backdrop-blur-xl text-black rounded-2xl text-[11px] uppercase font-bold tracking-[0.3em] hover:bg-white transition-all active:scale-95 shadow-2xl"
                             >
                               {t.inspect}
                             </button>
                             <div className="flex flex-col border-l border-white/20 pl-6 text-left">
                               <span className="text-[8px] uppercase tracking-[0.2em] text-white/50 font-bold mb-0.5">Arşiv Kodu</span>
                               <span className="text-[10px] font-mono text-white font-medium">#{todayEntries[0].id.slice(-8).toUpperCase()}</span>
                             </div>
                          </div>
                        </motion.div>
                        
                        <div className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-8 md:space-y-12 animate-in slide-in-from-bottom lg:slide-in-from-right duration-1000 delay-300 max-w-xl flex-grow">
                          <div className="space-y-8 w-full">
                            <div className="flex items-center justify-center lg:justify-start gap-4">
                               <div className="w-1.5 h-1.5 rounded-full bg-zinc-900 animate-pulse" />
                               <span className="text-[11px] uppercase tracking-[0.6em] font-black text-zinc-400">01 — {t.currentEditorial}</span>
                            </div>
                            <h2 className="text-[0.9rem] md:text-[1.4rem] font-black uppercase tracking-tighter leading-[0.9] text-zinc-900 selection:bg-zinc-900 selection:text-white transition-all duration-700">
                              {todayEntries[0].location}
                            </h2>
                            <div className="flex flex-nowrap overflow-x-auto scrollbar-hide gap-3 justify-center lg:justify-start pt-2">
                               <span className="px-4 py-2 bg-zinc-100 rounded-full text-[9px] uppercase tracking-widest font-black text-zinc-400">8K Editorial</span>
                               <span className="px-4 py-2 bg-zinc-100 rounded-full text-[9px] uppercase tracking-widest font-black text-zinc-400">Minimalist</span>
                               <span className="px-4 py-2 bg-zinc-100 rounded-full text-[9px] uppercase tracking-widest font-black text-zinc-400">High Fashion</span>
                            </div>
                          </div>
                          
                          <div className="relative border-l-[3px] border-zinc-100 px-10 py-6 lg:max-w-md">
                            <p className="text-zinc-500 leading-[1.8] text-[11px] md:text-[13px] font-serif italic relative">
                              <span className="absolute -left-6 -top-6 text-[1.5rem] text-zinc-100 font-serif leading-none opacity-50 select-none">"</span>
                              "{todayEntries[0].prompt || t.originalPrompt}"
                            </p>
                          </div>
  
                          <div className="flex items-center gap-6 pt-4">
                             <button 
                               onClick={() => setSelectedEntry(todayEntries[0])}
                               className="group flex items-center gap-4 text-xs font-black uppercase tracking-[0.4em] text-zinc-900 hover:gap-6 transition-all"
                             >
                               {t.seeStory} {currentLang.code === 'TR' ? <ChevronRight size={14} /> : <ChevronRight size={14} />}
                             </button>
                          </div>
                        </div>
                      </div>
                    </section>
  
                    {/* Today's Other Images Grid */}
                    {todayEntries.length > 1 && (
                      <section className="overflow-hidden">
                        <div className="flex items-center gap-4 mb-16">
                          <span className="text-[10px] uppercase tracking-[0.5em] text-zinc-300 font-bold whitespace-nowrap">{t.todaysFeed}</span>
                          <div className="h-[1px] flex-grow bg-zinc-100" />
                        </div>
                        
                        <div 
                          className="relative flex items-center"
                          onMouseEnter={() => setIsMarqueePaused(true)}
                          onMouseLeave={() => setIsMarqueePaused(false)}
                        >
                          <motion.div
                            animate={{ 
                               x: (isMarqueePaused || selectedEntry) ? undefined : ["0%", "-50%"] 
                            }}
                            transition={{ 
                              duration: Math.max(10, todayEntries.slice(1).length * 5), 
                              repeat: Infinity, 
                              ease: "linear" 
                            }}
                            className="flex gap-8 px-4"
                          >
                            {/* Duplicate entries for infinite scroll */}
                            {[...todayEntries.slice(1), ...todayEntries.slice(1)].map((entry, index) => {
                              const isSecondHalf = index >= todayEntries.slice(1).length;
                              return (
                                <motion.div
                                  key={`${entry.id}-${isSecondHalf ? 'second' : 'first'}`}
                                  layoutId={!isSecondHalf ? `img-${entry.id}` : undefined}
                                  className="group cursor-pointer flex-shrink-0 w-[180px] sm:w-[225px]"
                                  onClick={() => setSelectedEntry(entry)}
                                >
                                  <div className="aspect-[3/4] overflow-hidden bg-zinc-100 relative border border-zinc-200 group-hover:border-zinc-400 transition-all duration-700 rounded-2xl">
                                    <ImageWithSkeleton 
                                      src={entry.imageUrl} 
                                      alt={entry.location}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-[1200ms]"
                                    />
                                    
                                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                    
                                    <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end opacity-0 group-hover:opacity-100 transition-all duration-700 translate-y-4 group-hover:translate-y-0">
                                      <div className="flex flex-col gap-1">
                                        <span className="text-[9px] uppercase tracking-[0.3em] text-zinc-200">{t.location}</span>
                                        <span className="text-xs uppercase tracking-widest font-bold text-white">{entry.location}</span>
                                      </div>
                                      <div className="text-right">
                                         <span className="text-[9px] uppercase tracking-[0.3em] text-zinc-300 block mb-1">{t.time}</span>
                                         <span className="text-[10px] font-mono font-medium text-white">{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' })}</span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="mt-4 px-1">
                                    <span className="text-[10px] tracking-[0.4em] uppercase text-zinc-400 font-medium">{t.editorialShot}</span>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </motion.div>
                        </div>
                      </section>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-32 text-center space-y-6">
                    <div className="w-16 h-16 border border-zinc-100 rounded-full flex items-center justify-center mb-4">
                      <Clock size={24} className="text-zinc-200" />
                    </div>
                    <p className="text-zinc-400 uppercase tracking-[0.4em] text-[10px] font-black">{t.noStreamToday}</p>
                    <p className="text-zinc-300 text-[9px] uppercase tracking-[0.2em] font-bold">{t.visitArchiveDesc}</p>
                  </div>
                )}

                {/* Navigation to Archives */}
                <div className="pt-40 border-t border-zinc-100 px-6">
                   <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12">
                     <div className="text-center lg:text-left space-y-4">
                       <div className="flex items-center justify-center lg:justify-start gap-4">
                         <div className="w-8 h-[1px] bg-zinc-200" />
                         <p className="text-[11px] tracking-[0.8em] font-black text-zinc-400">{t.historicalJourney}</p>
                       </div>
                       <h3 className="text-3xl md:text-6xl font-black tracking-tighter text-zinc-900 leading-none">
                         {t.archives}
                       </h3>
                     </div>
                     <button 
                      onClick={() => {
                        setView('galleries');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="group flex-shrink-0 flex items-center gap-10 px-14 py-7 bg-zinc-900 text-white rounded-full transition-all shadow-2xl hover:scale-105 active:scale-95"
                     >
                       <span className="text-[11px] font-black tracking-[0.4em]">{t.viewArchive}</span>
                       <ChevronRight size={24} className="group-hover:translate-x-2 transition-transform text-zinc-400" />
                     </button>
                   </div>
                </div>
              </div>
            )}
          </div>
        ) : view === 'galleries' ? (
          <section className="animate-in fade-in duration-1000 relative">
            <div className="mb-24 flex flex-col md:flex-row md:items-end justify-between border-b border-zinc-200 pb-12 gap-8">
              <div>
                <div className="flex items-center gap-4 mb-4">
                   <span className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest ${userRole === 'admin' ? 'bg-[#df17e6]/10 text-[#df17e6]' : 'bg-zinc-100 text-zinc-400'}`}>
                     {userRole === 'admin' ? t.admin : t.visitor}
                   </span>
                   <button 
                    onClick={() => {
                      setUserRole('visitor');
                      setIsSelectionMode(false);
                      setSelectedIds(new Set());
                    }} 
                    className="text-[9px] uppercase tracking-widest text-zinc-300 hover:text-zinc-600 font-bold transition-colors"
                   >
                     {t.logout}
                   </button>
                </div>
                <h2 className="text-6xl md:text-8xl font-bold tracking-tighter uppercase leading-none mb-6">{t.archives}</h2>
                <div className="flex items-center gap-3 text-zinc-400">
                   <LayoutGrid size={14} />
                   <span className="text-[10px] uppercase tracking-[0.3em] font-bold">{t.gridView}</span>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-6">
                <p className="text-zinc-400 uppercase tracking-[0.4em] text-xs max-w-sm font-medium leading-relaxed text-right">
                  {t.archiveDesc}
                </p>
                
                {userRole === 'admin' && (
                  <div className="flex items-center gap-3">
                    {isSelectionMode ? (
                      <>
                        <button 
                          onClick={handleBulkDelete}
                          disabled={selectedIds.size === 0}
                          className={`flex items-center gap-3 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${selectedIds.size > 0 ? 'bg-red-500 text-white shadow-xl hover:bg-red-600' : 'bg-zinc-100 text-zinc-300 cursor-not-allowed'}`}
                        >
                          <Trash size={14} />
                          {t.bulkDelete} ({selectedIds.size})
                        </button>
                        <button 
                          onClick={() => {
                            setIsSelectionMode(false);
                            setSelectedIds(new Set());
                          }}
                          className="px-6 py-3 border border-zinc-200 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-zinc-50 transition-all"
                        >
                          {t.exitSelection}
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={() => setIsSelectionMode(true)}
                        className="flex items-center gap-3 px-6 py-3 bg-zinc-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-xl"
                      >
                        <LayoutGrid size={14} />
                        {t.selectItems}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Date Picker / Dropdowns (Year -> Month -> Day) */}
            {!isSelectionMode && allDates.length > 0 && (
              <div className="mb-16 bg-zinc-50/50 border border-zinc-100 p-6 md:p-8 rounded-3xl">
                <div className="flex items-center gap-4 mb-6">
                  <Clock size={14} className="text-zinc-400" />
                  <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-zinc-400">
                    {currentLang.code === 'TR' ? 'FİLTRELEMELİ TARİH SEÇİMİ' : 'FILTERED DATE SELECTION'}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                  {/* Year Select */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] uppercase tracking-[0.2em] font-bold text-zinc-400 pl-1">
                      {currentLang.code === 'TR' ? 'YIL SEÇİNİZ' : 'SELECT YEAR'}
                    </label>
                    <div className="relative">
                      <select
                        value={selectedArchiveYear}
                        onChange={(e) => handleYearChange(e.target.value)}
                        className="w-full bg-white border border-zinc-200 text-zinc-800 text-xs px-4 py-3.5 rounded-xl focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 focus:outline-none transition-all uppercase tracking-wider font-semibold hover:border-zinc-300 cursor-pointer appearance-none pr-10"
                      >
                        <option value="all">{currentLang.code === 'TR' ? 'TÜM YILLAR' : 'ALL YEARS'}</option>
                        {availableYears.map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Month Select */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] uppercase tracking-[0.2em] font-bold text-zinc-400 pl-1">
                      {currentLang.code === 'TR' ? 'AY SEÇİNİZ' : 'SELECT MONTH'}
                    </label>
                    <div className="relative">
                      <select
                        value={selectedArchiveMonth}
                        disabled={selectedArchiveYear === 'all'}
                        onChange={(e) => handleMonthChange(e.target.value)}
                        className="w-full bg-white border border-zinc-200 text-zinc-800 text-xs px-4 py-3.5 rounded-xl focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 focus:outline-none transition-all uppercase tracking-wider font-semibold hover:border-zinc-300 disabled:opacity-50 disabled:bg-zinc-100 disabled:cursor-not-allowed cursor-pointer appearance-none pr-10"
                      >
                        <option value="all">{currentLang.code === 'TR' ? 'TÜM AYLAR' : 'ALL MONTHS'}</option>
                        {availableMonths.map(month => (
                          <option key={month} value={month}>
                            {getMonthName(month, currentLang.code)}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Day Select */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] uppercase tracking-[0.2em] font-bold text-zinc-400 pl-1">
                      {currentLang.code === 'TR' ? 'GÜN SEÇİNİZ' : 'SELECT DAY'}
                    </label>
                    <div className="relative">
                      <select
                        value={selectedArchiveDay}
                        disabled={selectedArchiveMonth === 'all' || selectedArchiveYear === 'all'}
                        onChange={(e) => handleDayChange(e.target.value)}
                        className="w-full bg-white border border-zinc-200 text-zinc-800 text-xs px-4 py-3.5 rounded-xl focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 focus:outline-none transition-all uppercase tracking-wider font-semibold hover:border-zinc-300 disabled:opacity-50 disabled:bg-zinc-100 disabled:cursor-not-allowed cursor-pointer appearance-none pr-10"
                      >
                        <option value="all">{currentLang.code === 'TR' ? 'TÜM GÜNLER' : 'ALL DAYS'}</option>
                        {availableDays.map(day => (
                          <option key={day} value={day}>
                            {getDayLabel(day)}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Reset Button */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        setSelectedArchiveYear('all');
                        setSelectedArchiveMonth('all');
                        setSelectedArchiveDay('all');
                      }}
                      className="w-full h-[46px] bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold transition-all text-center flex items-center justify-center gap-2 shadow-sm"
                    >
                      <RotateCcw size={12} />
                      {currentLang.code === 'TR' ? 'TEMİZLE' : 'RESET'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {allDates.length === 0 ? (
                <div className="py-40 text-center border border-dashed border-zinc-200 opacity-50">
                  <LayoutGrid size={40} className="mx-auto mb-6 text-zinc-300" />
                  <p className="text-zinc-400 uppercase tracking-[0.4em] text-xs font-medium">{t.archiveUpdateSoon}</p>
                </div>
            ) : filteredDates.length === 0 ? (
                <div className="py-40 text-center border border-dashed border-zinc-200 opacity-50 rounded-3xl">
                  <LayoutGrid size={40} className="mx-auto mb-6 text-zinc-300" />
                  <p className="text-zinc-400 uppercase tracking-[0.4em] text-xs font-medium animate-pulse">
                    {currentLang.code === 'TR' ? 'SEÇİLEN TARİHTE HERHANGİ BİR ÇEKİM BULUNAMADI' : 'NO CAPTURES FOUND FOR THE SELECTED DATE'}
                  </p>
                </div>
            ) : (
                <div className="space-y-48">
                  {filteredDates.map(date => (
                    <div key={date} className="group/date">
                      <div className="flex flex-col md:flex-row md:items-center gap-6 mb-16 border-l-4 border-zinc-100 pl-8">
                        <div className="flex items-center gap-4">
                          <div className="w-2 h-2 rounded-full bg-zinc-900" />
                          <h3 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-zinc-900 ornament-text">
                            {new Date(date).toLocaleDateString(currentLang.code === 'TR' ? 'tr-TR' : 'en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' })}
                          </h3>
                        </div>
                        <div className="h-px flex-grow bg-zinc-100 hidden md:block" />
                        <span className="text-[11px] uppercase tracking-[0.4em] text-zinc-400 font-mono">
                           {visibleHistory[date].length} {t.capturesStored}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 pb-12">
                        {visibleHistory[date].map((entry, idx) => (
                          <motion.div 
                            key={entry.id}
                            layoutId={`img-${entry.id}`}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: (idx % 4) * 0.1 }}
                            onClick={() => isSelectionMode ? toggleSelection(entry.id) : setSelectedEntry(entry)}
                            className={`group cursor-pointer relative w-full ${isSelectionMode && selectedIds.has(entry.id) ? 'scale-[0.98]' : ''}`}
                          >
                            {isSelectionMode && (
                              <div className="absolute top-4 left-4 z-20">
                                <div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all ${selectedIds.has(entry.id) ? 'bg-[#df17e6] border-[#df17e6] shadow-lg scale-110' : 'bg-white/40 backdrop-blur-md border-white/60'}`}>
                                  {selectedIds.has(entry.id) && <Check size={16} className="text-white stroke-[4]" />}
                                </div>
                              </div>
                            )}
                            
                            {userRole === 'admin' && !isSelectionMode && (
                              <button 
                                onClick={(e) => handleDelete(entry.id, e)}
                                className="absolute top-4 left-4 z-20 w-10 h-10 bg-black/30 hover:bg-red-600 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all duration-300 shadow-xl"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}

                            <div className={`relative aspect-[3/4] bg-zinc-50 rounded-2xl overflow-hidden mb-4 grayscale hover:grayscale-0 transition-all duration-700 group-hover:shadow-xl border ${isSelectionMode && selectedIds.has(entry.id) ? 'border-[#df17e6] border-4' : 'border-zinc-100 group-hover:border-zinc-900/10'}`}>
                              <ImageWithSkeleton 
                                src={entry.imageUrl} 
                                alt="" 
                                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                                referrerPolicy="no-referrer" 
                                loading="lazy"
                              />
                              <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-white text-[9px] font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                                 {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' })}
                              </div>
                            </div>
                            <div className="flex justify-between items-center px-1">
                              <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-800">{entry.location}</span>
                              <span className="text-[8px] text-zinc-300 font-mono italic">#{entry.id.substring(0, 4)}</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
            )}
          </section>
        ) : view === 'comments' ? (
          <section className="animate-in fade-in duration-1000 max-w-5xl mx-auto py-24 px-6 md:px-0">
            {!commentUserRole ? (
              <div className="flex flex-col items-center justify-center text-center py-20">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-12 shadow-2xl border border-zinc-100">
                  <MessageCircle size={40} className="text-[#FF00FF]" />
                </div>
                <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4">{t.commentLogin}</h2>
                <p className="text-zinc-400 uppercase tracking-[0.4em] text-[10px] mb-16 max-w-sm leading-relaxed">
                  Topluluğa katılın ve bu anıtsal arşive kendi yorumunuzu ekleyin.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                  {/* Visitor Login */}
                  <div className="p-8 bg-zinc-50 rounded-3xl border border-zinc-100 hover:border-zinc-200 transition-all flex flex-col justify-between gap-8 h-full">
                    <div className="space-y-4">
                       <User size={24} className="text-zinc-400" />
                       <h3 className="text-xs font-black uppercase tracking-widest">{t.visitor}</h3>
                       <p className="text-zinc-400 text-[10px] uppercase tracking-widest leading-relaxed">Sadece yorumları okuyabilirsiniz.</p>
                    </div>
                    <button 
                      onClick={() => setCommentUserRole('visitor')}
                      className="w-full py-4 bg-white border border-zinc-200 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-zinc-900 transition-all shadow-sm"
                    >
                      {t.visitorAccess}
                    </button>
                  </div>

                  {/* User Login */}
                  <div className="p-8 bg-white rounded-3xl border border-zinc-100 shadow-xl flex flex-col gap-6 h-full">
                    <div className="space-y-4">
                       <MessageSquare size={24} className="text-[#FF00FF]" />
                       <h3 className="text-xs font-black uppercase tracking-widest">Üye Girişi</h3>
                    </div>
                    <div className="space-y-4 flex-grow">
                       <input 
                        type="text" 
                        placeholder={t.commentUsername}
                        value={commentAuthInput.username}
                        onChange={(e) => setCommentAuthInput({...commentAuthInput, username: e.target.value})}
                        className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs focus:outline-none focus:border-[#FF00FF] transition-all"
                       />
                       <input 
                        type="password" 
                        placeholder={t.commentPassword}
                        value={commentAuthInput.password}
                        onChange={(e) => setCommentAuthInput({...commentAuthInput, password: e.target.value})}
                        className="w-full px-5 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs focus:outline-none focus:border-[#FF00FF] transition-all"
                       />
                    </div>
                    <button 
                      onClick={() => {
                        if (commentAuthInput.username && commentAuthInput.password) {
                          setCommentUserRole('user');
                        } else {
                          alert("Lütfen tüm alanları doldurun.");
                        }
                      }}
                      className="w-full py-4 bg-[#FF00FF] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg active:scale-95 transition-all"
                    >
                      {t.userLogin}
                    </button>
                    
                    <div className="flex items-center gap-4 py-2">
                      <div className="h-px flex-grow bg-zinc-100" />
                      <span className="text-[8px] font-black text-zinc-300 uppercase tracking-widest">veya</span>
                      <div className="h-px flex-grow bg-zinc-100" />
                    </div>

                    <button 
                      onClick={handleGoogleLogin}
                      className="w-full py-4 bg-white border border-zinc-200 text-zinc-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-50 transition-all flex items-center justify-center gap-3 shadow-sm"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.07-3.71 1.07-2.85 0-5.27-1.92-6.13-4.51H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.87 14.13c-.22-.67-.35-1.39-.35-2.13s.13-1.46.35-2.13V7.03H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.97l3.69-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.03l3.69 2.84c.86-2.59 3.28-4.51 6.13-4.51z" fill="#EA4335"/>
                      </svg>
                      {t.googleLogin}
                    </button>
                  </div>

                  {/* Admin Login */}
                  <div className="p-8 bg-zinc-900 rounded-3xl border border-zinc-800 shadow-2xl flex flex-col gap-6 h-full">
                    <div className="space-y-4">
                       <Shield size={24} className="text-[#18eedc]" />
                       <h3 className="text-xs font-black uppercase tracking-widest text-white">{t.admin}</h3>
                    </div>
                    <div className="space-y-4 flex-grow">
                       <input 
                        type="password" 
                        placeholder={t.passwordPlaceholder}
                        value={commentAuthInput.password}
                        onChange={(e) => setCommentAuthInput({...commentAuthInput, password: e.target.value})}
                        className="w-full px-5 py-4 bg-zinc-800 border border-zinc-700 rounded-2xl text-xs text-white focus:outline-none focus:border-[#18eedc] transition-all"
                       />
                    </div>
                    <button 
                      onClick={() => {
                        const val = commentAuthInput.password.trim().toLowerCase();
                        if (val === 'ag1453ag' || val === 'ag2026') {
                          setCommentUserRole('admin');
                        } else {
                          alert(t.wrongAdminPassword);
                        }
                      }}
                      className="w-full py-4 bg-[#18eedc] text-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg active:scale-95 transition-all"
                    >
                      {t.adminLogin}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-16">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-12">
                   <div>
                     <h2 className="text-6xl font-black uppercase tracking-tighter mb-4">{t.comments}</h2>
                     <div className="flex items-center gap-4">
                        <span className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest ${commentUserRole === 'admin' ? 'bg-[#18eedc]/10 text-[#18eedc]' : commentUserRole === 'user' ? 'bg-[#FF00FF]/10 text-[#FF00FF]' : 'bg-zinc-100 text-zinc-400'}`}>
                          {commentUserRole === 'admin' ? t.admin : commentUserRole === 'user' ? commentAuthInput.username : t.visitor}
                        </span>
                        <button 
                          onClick={() => {
                            setCommentUserRole(null);
                            setCommentAuthInput({ username: '', password: '' });
                          }}
                          className="text-[9px] uppercase tracking-widest text-zinc-300 hover:text-zinc-600 font-bold transition-colors"
                        >
                          {t.logoutAction}
                        </button>
                     </div>
                   </div>
                   <button 
                    onClick={() => {
                      setView('home');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-12 h-12 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400 hover:bg-zinc-900 hover:text-white transition-all shadow-sm"
                   >
                     <X size={20} />
                   </button>
                </div>

                {/* Comment Input */}
                {commentUserRole !== 'visitor' && (
                  <div className="bg-white border-2 border-zinc-100 p-8 rounded-[2.5rem] shadow-xl space-y-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${commentUserRole === 'admin' ? 'bg-[#18eedc]' : 'bg-[#FF00FF]'} text-zinc-900`}>
                        {commentUserRole === 'admin' ? <Shield size={14} /> : <User size={14} />}
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest">
                        {editingComment ? t.editComment : replyingTo ? t.replying : t.writeAComment}
                      </span>
                    </div>
                    <textarea 
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder={t.writeComment}
                      className="w-full h-32 p-6 bg-zinc-50 border border-zinc-100 rounded-[2rem] text-sm focus:outline-none focus:border-zinc-900 transition-all resize-none"
                    />
                    <div className="flex justify-end gap-4">
                      {(replyingTo || editingComment) && (
                        <button 
                          onClick={() => { setCommentText(''); setReplyingTo(null); setEditingComment(null); }}
                          className="px-8 py-4 bg-zinc-100 text-zinc-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all"
                        >
                          {t.cancel}
                        </button>
                      )}
                      <button 
                        onClick={() => handlePostComment(replyingTo)}
                        disabled={!commentText.trim()}
                        className="px-12 py-4 bg-zinc-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 disabled:opacity-50 transition-all shadow-xl"
                      >
                        {editingComment ? t.update : t.send}
                      </button>
                    </div>
                  </div>
                )}

                {/* Comments List */}
                <div className="space-y-12 pb-40">
                  {comments.filter(c => commentUserRole === 'admin' ? true : !c.isHidden).filter(c => !c.parentId).length === 0 ? (
                    <div className="py-20 text-center border-2 border-dashed border-zinc-100 rounded-[3rem] opacity-40">
                       <MessageCircle size={40} className="mx-auto mb-6 text-zinc-200" />
                       <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-zinc-400">{t.noComments}</p>
                    </div>
                  ) : (
                    comments
                      .filter(c => commentUserRole === 'admin' ? true : !c.isHidden)
                      .filter(c => !c.parentId)
                      .map((comment) => {
                        const childComments = comments.filter(c => c.parentId === comment.id && (commentUserRole === 'admin' ? true : !c.isHidden));
                        
                        return (
                          <div key={comment.id} className="space-y-6">
                            <motion.div 
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className={`p-10 rounded-[2.5rem] border ${comment.isHidden ? 'bg-zinc-50 border-dashed border-zinc-200 opacity-60' : 'bg-white border-zinc-100 shadow-sm'} relative overflow-hidden group`}
                            >
                              {comment.isHidden && (
                                <div className="absolute top-4 right-8 text-[8px] font-black uppercase tracking-widest text-zinc-400">
                                  {t.commentHidden}
                                </div>
                              )}
                              
                              <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black ${comment.authorRole === 'admin' ? 'bg-[#18eedc] text-zinc-900' : 'bg-zinc-100 text-zinc-400'}`}>
                                    {comment.authorName?.[0]}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-3">
                                      <h4 className="text-xs font-black uppercase tracking-widest text-zinc-900">{comment.authorName}</h4>
                                      {comment.authorRole === 'admin' && <Shield size={10} className="text-[#18eedc]" />}
                                    </div>
                                    <span className="text-[9px] font-mono font-bold text-zinc-300 uppercase tracking-widest">
                                      {new Date(comment.timestamp).toLocaleDateString(currentLang.code === 'TR' ? 'tr-TR' : 'en-US', { timeZone: 'Europe/Istanbul' })} • {new Date(comment.timestamp).toLocaleTimeString(currentLang.code === 'TR' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' })}
                                    </span>
                                  </div>
                                </div>

                                {commentUserRole === 'admin' && (
                                  <div className="flex items-center gap-2">
                                    <button 
                                      onClick={(e) => handleToggleHideComment(comment.id, comment.isHidden, e)}
                                      className="p-2 bg-zinc-50 hover:bg-zinc-100 rounded-xl text-zinc-400 hover:text-zinc-900 transition-all shadow-sm"
                                      title={comment.isHidden ? t.show : t.hide}
                                    >
                                      {comment.isHidden ? <Clock size={16} /> : <X size={16} />}
                                    </button>
                                    <button 
                                      onClick={() => {
                                        setEditingComment(comment);
                                        setCommentText(comment.content);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                      }}
                                      className="p-2 bg-zinc-50 hover:bg-zinc-100 rounded-xl text-zinc-400 hover:text-zinc-900 transition-all shadow-sm"
                                    >
                                      <Edit3 size={16} />
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (commentDeletingId === comment.id) {
                                          adminDeleteComment(comment.id, e);
                                        } else {
                                          setCommentDeletingId(comment.id);
                                          setTimeout(() => setCommentDeletingId(null), 3000);
                                        }
                                      }}
                                      className={`p-3 rounded-xl text-white transition-all shadow-lg flex items-center justify-center gap-2 ${commentDeletingId === comment.id ? 'bg-orange-600 animate-pulse' : 'bg-red-500 hover:bg-red-600'}`}
                                      title={commentDeletingId === comment.id ? t.clickToConfirm : t.deletePermanently}
                                    >
                                      <Trash size={16} />
                                      <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">
                                        {commentDeletingId === comment.id ? t.areYouSure : t.delete}
                                      </span>
                                    </button>
                                  </div>
                                )}
                              </div>

                              <p className="text-zinc-600 text-sm leading-relaxed mb-8">
                                {comment.content}
                              </p>

                              <div className="flex items-center gap-4">
                                {commentUserRole !== 'visitor' && (
                                  <button 
                                    onClick={() => {
                                      setReplyingTo(comment.id);
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="px-6 py-3 bg-zinc-50 border border-zinc-100 rounded-xl text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 hover:border-zinc-900 transition-all shadow-sm"
                                  >
                                    {t.reply}
                                  </button>
                                )}
                                <div className="h-px flex-grow bg-zinc-50" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-200">ID: {comment.id.slice(0, 8)}</span>
                              </div>
                            </motion.div>

                            {/* Child Comments (Replies) */}
                            {childComments.length > 0 && (
                              <div className="pl-8 md:pl-20 space-y-6 border-l-2 border-zinc-100">
                                {childComments.map(reply => (
                                  <motion.div 
                                    key={reply.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`p-8 rounded-[2rem] border ${reply.isHidden ? 'bg-zinc-50 border-dashed border-zinc-200 opacity-60' : 'bg-white border-zinc-100 shadow-sm'} relative`}
                                  >
                                    <div className="flex justify-between items-start mb-4">
                                      <div className="flex items-center gap-4">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black ${reply.authorRole === 'admin' ? 'bg-[#18eedc] text-zinc-900' : 'bg-zinc-100 text-zinc-400'}`}>
                                          {reply.authorName?.[0]}
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <h4 className="text-[11px] font-black uppercase tracking-widest text-zinc-900">{reply.authorName}</h4>
                                            {reply.authorRole === 'admin' && <Shield size={8} className="text-[#18eedc]" />}
                                          </div>
                                          <span className="text-[8px] font-mono font-bold text-zinc-300 uppercase tracking-widest">
                                            {new Date(reply.timestamp).toLocaleTimeString(currentLang.code === 'TR' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' })}
                                          </span>
                                        </div>
                                      </div>
                                      {commentUserRole === 'admin' && (
                                        <div className="flex items-center gap-2">
                                          <button 
                                            onClick={(e) => handleToggleHideComment(reply.id, reply.isHidden, e)}
                                            className="p-1.5 bg-zinc-50 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-900 transition-all"
                                          >
                                            {reply.isHidden ? <Clock size={12} /> : <X size={12} />}
                                          </button>
                                          <button 
                                            onClick={() => {
                                              setEditingComment(reply);
                                              setCommentText(reply.content);
                                              window.scrollTo({ top: 0, behavior: 'smooth' });
                                            }}
                                            className="p-1.5 bg-zinc-50 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-900 transition-all"
                                          >
                                            <Edit3 size={12} />
                                          </button>
                                          <button 
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              if (commentDeletingId === reply.id) {
                                                adminDeleteComment(reply.id, e);
                                              } else {
                                                setCommentDeletingId(reply.id);
                                                setTimeout(() => setCommentDeletingId(null), 3000);
                                              }
                                            }}
                                            className={`p-2 rounded-lg text-white transition-all shadow-md flex items-center justify-center gap-2 ${commentDeletingId === reply.id ? 'bg-orange-600' : 'bg-red-500 hover:bg-red-600'}`}
                                            title={t.delete}
                                          >
                                            <Trash size={12} />
                                            <span className="text-[8px] font-black uppercase tracking-widest hidden sm:inline">
                                              {commentDeletingId === reply.id ? t.areYouSure : t.delete}
                                            </span>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                    <p className="text-zinc-500 text-sm leading-relaxed">
                                      {reply.content}
                                    </p>
                                  </motion.div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            )}
          </section>
        ) : (
          <section className="animate-in fade-in slide-in-from-bottom-8 duration-1000 py-20">
            <div className="max-w-4xl">
              <h2 className="text-6xl font-black uppercase tracking-tighter mb-12">{view}</h2>
              <div className="space-y-12">
                <div className="p-12 bg-zinc-50 border border-zinc-100 rounded-[3rem]">
                  <p className="text-2xl text-zinc-400 font-light leading-relaxed mb-8">
                    {t.archiveDesc}
                  </p>
                  <p className="text-zinc-500 leading-loose">
                    {t.footerDesc}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="p-8 border border-zinc-100 rounded-3xl">
                    <h4 className="text-[10px] uppercase tracking-[0.4em] font-bold mb-4">{t.vision}</h4>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      AI driven fashion photography exploring the boundaries of digital aesthetics and historical archives.
                    </p>
                  </div>
                  <div className="p-8 border border-zinc-100 rounded-3xl">
                    <h4 className="text-[10px] uppercase tracking-[0.4em] font-bold mb-4">{t.technical}</h4>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      Native 4K rendering powered by Gemini Vision models with custom-tuned editoryal prompts. System is synchronized with current fashion trends and real-time retailer references {t.trendSync && `(${t.trendSync})`}.
                    </p>
                  </div>
                </div>

                <div className="pt-12">
                   <button 
                     onClick={() => setView('home')}
                     className="text-[10px] uppercase tracking-widest font-bold border-b border-zinc-900 pb-2 hover:opacity-50 transition-all"
                   >
                     {t.home}
                   </button>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Floating Chatbot Button */}
      <div className="fixed bottom-8 right-8 z-[120]">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 ${isChatOpen ? 'bg-zinc-900 text-white rotate-90' : 'bg-[#FF00FF] text-white shadow-[#FF00FF]/30'}`}
        >
          {isChatOpen ? <X size={24} /> : <MessageSquare size={24} />}
          {!isChatOpen && chatMessages.length === 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#18eedc] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-[#18eedc]"></span>
            </span>
          )}
        </motion.button>

        {/* Chat Panel */}
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 50, x: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50, x: 20 }}
              className="absolute bottom-20 right-0 w-[90vw] sm:w-[400px] h-[550px] bg-white border border-zinc-200 rounded-[2.5rem] shadow-[-20px_20px_60px_rgba(0,0,0,0.1)] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 bg-zinc-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-[#18eedc]">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest">{t.assistant}</h3>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{t.online}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Messages Area */}
              <div className="flex-grow p-6 overflow-y-auto bg-zinc-50 flex flex-col gap-4">
                {chatMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8 gap-4">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-zinc-300 shadow-sm border border-zinc-100">
                      <MessageSquare size={24} />
                    </div>
                    <p className="text-xs text-zinc-400 uppercase tracking-widest leading-relaxed">
                      {t.assistantGreeting}
                    </p>
                  </div>
                )}
                {chatMessages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] p-4 rounded-3xl text-sm leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-zinc-900 text-white rounded-tr-none' 
                        : 'bg-white border border-zinc-100 text-zinc-600 shadow-sm rounded-tl-none'
                    }`}>
                      {msg.content}
                    </div>
                  </motion.div>
                ))}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-zinc-100 p-4 rounded-3xl rounded-tl-none shadow-sm">
                      <div className="flex gap-1.5">
                        {[0, 1, 2].map(i => (
                          <motion.div
                            key={i}
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                            className="w-1.5 h-1.5 bg-zinc-300 rounded-full"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-6 bg-white border-t border-zinc-100">
                <form onSubmit={handleSendChat} className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={t.askAssistant}
                    className="flex-grow bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:border-zinc-900 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || isChatLoading}
                    className="w-12 h-12 bg-zinc-900 text-white rounded-2xl flex items-center justify-center hover:bg-zinc-800 disabled:opacity-50 disabled:hover:bg-zinc-900 transition-all flex-shrink-0"
                  >
                    <Send size={18} />
                  </button>
                </form>
                <p className="text-[8px] text-zinc-400 mt-4 uppercase tracking-widest text-center">
                  {t.assistantOnlyFashion}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="border-t border-zinc-100 py-24 px-6 mt-40">
        <div className="max-w-[1800px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-16 items-start">
          <div className="flex flex-col gap-6">
             <div className="w-12 h-12 flex items-center justify-center font-black text-xl italic rotate-3 bg-[#bd0fc3] text-[#05ff00]">M</div>
             <p className="text-zinc-400 text-xs uppercase tracking-widest leading-loose max-w-xs">
               {t.footerDesc}
             </p>
             <button 
               onClick={() => {
                 setView('comments');
                 window.scrollTo({ top: 0, behavior: 'smooth' });
               }}
               className="flex items-center gap-3 px-6 py-4 bg-zinc-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#FF00FF] transition-all w-fit group shadow-xl"
             >
               <MessageCircle size={16} className="group-hover:scale-110 transition-transform" />
               {t.comments}
             </button>

             {userRole !== 'admin' && (
               <button 
                 onClick={() => setShowAdminLoginModal(true)}
                 className="flex items-center gap-3 px-6 py-4 bg-white border border-zinc-200 text-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-50 transition-all w-fit group shadow-md mt-2"
               >
                 <Shield size={16} className="text-zinc-400 group-hover:text-amber-500 transition-colors" />
                 {t.adminLogin}
               </button>
             )}
          </div>

          <div className="flex flex-col gap-8">
            {/* Navigation section removed as requested */}
          </div>

          <div className="flex flex-col gap-8 text-right md:items-end">
            {/* Resolution info removed as requested */}
            
            <div className="flex flex-col md:items-end gap-4 pt-12">
              <div className="flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full animate-pulse ${systemEnabled ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className={`text-[9px] uppercase tracking-widest font-mono ${systemEnabled ? 'text-zinc-400' : 'text-red-400'}`}>
                  {systemEnabled ? t.systemActive : t.systemDisabled}
                </span>
              </div>
              
              <button 
                onClick={toggleSystem}
                className={`px-4 py-2 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all bg-[#ad0000] text-[#bbff1b] ${
                  systemEnabled 
                    ? 'border-zinc-200 hover:border-red-200 hover:text-red-500' 
                    : 'border-green-200 bg-green-50 hover:bg-green-100'
                }`}
              >
                {systemEnabled ? t.shutdownSystem : t.startupSystem}
              </button>

              {notification && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[10px] font-medium text-red-700 uppercase tracking-wider animate-in slide-in-from-bottom duration-300">
                  {notification}
                </div>
              )}
              <button 
                onClick={() => checkAndGenerate(true)}
                disabled={isGeneratingState}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all ${
                  isGeneratingState 
                    ? 'bg-zinc-100 border-zinc-200 text-zinc-400 cursor-not-allowed'
                    : 'bg-[#00e676] text-zinc-950 border-[#00e676] hover:bg-[#00c853] hover:border-[#00c853]'
                }`}
              >
                <Sparkles size={12} className={isGeneratingState ? 'animate-spin' : ''} />
                {isGeneratingState ? t.generating : t.generateNow}
              </button>
            </div>
          </div>
        </div>
        
        <div className="max-w-[1800px] mx-auto mt-24 pt-12 border-t border-zinc-100 flex justify-between items-center">
           <span className="text-zinc-400 text-[9px] uppercase tracking-[0.4em] font-medium">© 2026 <span className="text-[#FF00FF]">M</span><span className="text-[#FF00FF]">B</span><span className="text-[#FF00FF]">G</span> - <span className="text-[#FF00FF]">M</span>oda <span className="text-[#FF00FF]">B</span>urada <span className="text-[#FF00FF]">G</span>alerisi </span>
           <span className="text-zinc-200 text-[8px] uppercase tracking-[0.5em]">Powered by DeepMind Antigravity</span>
        </div>
      </footer>
    </div>
  );
}
