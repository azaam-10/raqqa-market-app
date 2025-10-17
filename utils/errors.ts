export const getErrorMessage = (error: unknown): string => {
  let message: string;

  if (error instanceof Error) {
    message = error.message;
  } else if (error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
    message = (error as any).message;
  } else if (typeof error === 'string' && error.trim().length > 0) {
    message = error;
  } else {
    try {
      const stringified = JSON.stringify(error);
      if (stringified !== '{}') {
        message = stringified;
      } else {
        message = 'حدث خطأ غير معروف.';
      }
    } catch {
      message = 'حدث خطأ غير قابل للتفسير.';
    }
  }

  const lowerCaseMessage = message.toLowerCase();

  // Translate common database/API errors into user-friendly Arabic
  if (lowerCaseMessage.includes('exceeds the maximum allowed size')) {
      return 'حجم الملف كبير جداً. الرجاء رفع صورة بحجم أصغر.';
  }
  
  if (lowerCaseMessage.includes("could not find the table") || lowerCaseMessage.includes("relation") && lowerCaseMessage.includes("does not exist")) {
       if (lowerCaseMessage.includes("products")) {
           return "جدول المنتجات ('products') غير موجود في قاعدة البيانات. يرجى التأكد من إعداده بشكل صحيح في Supabase.";
       }
       if (lowerCaseMessage.includes("stores")) {
           return "جدول المتاجر ('stores') غير موجود في قاعدة البيانات. يرجى التأكد من إعداده بشكل صحيح في Supabase.";
       }
        if (lowerCaseMessage.includes("profiles")) {
           return "جدول المستخدمين ('profiles') غير موجود في قاعدة البيانات. يرجى التأكد من إعداده بشكل صحيح في Supabase.";
       }
       return "أحد الجداول المطلوبة غير موجود في قاعدة البيانات. يرجى مراجعة إعدادات Supabase.";
  }
  
  if (lowerCaseMessage.includes('violates row-level security policy')) {
      return "تم رفض الوصول. يرجى التحقق من صلاحيات الوصول (RLS policies) للجداول المطلوبة والسماح بعمليات القراءة/الكتابة للمستخدمين المسجلين.";
  }

  if (lowerCaseMessage.includes('pgrst116')) { // PostgREST code for "Not found"
      return "لم يتم العثور على العنصر المطلوب. قد يكون قد تم حذفه.";
  }
  
  if (lowerCaseMessage.includes('network request failed') || lowerCaseMessage.includes('failed to fetch')) {
      return "فشل الاتصال بالشبكة. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.";
  }
  
  if (lowerCaseMessage.includes('duplicate key value violates unique constraint')) {
      return "القيمة التي تحاول إدخالها موجودة بالفعل. يرجى استخدام قيمة فريدة.";
  }

  // Prevent showing "[object Object]" as the final message
  if (message.trim() === '[object Object]') {
    return 'حدث خطأ غير متوقع من الخادم.';
  }

  return message;
};

// Simple time ago function
export const timeAgo = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) {
    const years = Math.floor(interval);
    return `منذ ${years} ${years === 1 ? 'سنة' : 'سنوات'}`;
  }
  interval = seconds / 2592000;
  if (interval > 1) {
    const months = Math.floor(interval);
    return `منذ ${months} ${months === 1 ? 'شهر' : 'أشهر'}`;
  }
  interval = seconds / 86400;
  if (interval > 1) {
    const days = Math.floor(interval);
    return `منذ ${days} ${days === 1 ? 'يوم' : 'أيام'}`;
  }
  interval = seconds / 3600;
  if (interval > 1) {
    const hours = Math.floor(interval);
    return `منذ ${hours} ${hours === 1 ? 'ساعة' : 'ساعات'}`;
  }
  interval = seconds / 60;
  if (interval > 1) {
    const minutes = Math.floor(interval);
    return `منذ ${minutes} ${minutes === 1 ? 'دقيقة' : 'دقائق'}`;
  }
  return 'الآن';
};


// --- Interaction Feedback ---

let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.error("Web Audio API is not supported in this browser.");
      return null;
    }
  }
  return audioContext;
};

/**
 * Plays a short, pleasant "pop" sound for UI interactions like liking a post.
 * Uses the Web Audio API to avoid needing an audio file.
 */
export const playLikeSound = () => {
  const context = getAudioContext();
  if (!context) return;
  
  // On iOS, the audio context may be suspended until a user gesture.
  if (context.state === 'suspended') {
    context.resume();
  }

  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  // A high-pitched, short sine wave sounds like a "pop" or "blip"
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(800, context.currentTime); 
  oscillator.frequency.exponentialRampToValueAtTime(300, context.currentTime + 0.1);
  
  gainNode.gain.setValueAtTime(0.3, context.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.1);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.start(context.currentTime);
  oscillator.stop(context.currentTime + 0.15);
};


/**
 * Plays a short chime for new notifications.
 */
export const playNotificationSound = () => {
  const context = getAudioContext();
  if (!context) return;
  
  if (context.state === 'suspended') {
    context.resume();
  }

  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  // A two-tone chime sound
  oscillator.type = 'sine';
  gainNode.gain.setValueAtTime(0.2, context.currentTime);

  // First tone
  oscillator.frequency.setValueAtTime(1046.50, context.currentTime); // C6
  gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.1);
  
  // Second tone
  oscillator.frequency.setValueAtTime(1567.98, context.currentTime + 0.1); // G6
  gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.25);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.start(context.currentTime);
  oscillator.stop(context.currentTime + 0.3);
};


/**
 * Triggers a short haptic feedback vibration on supported devices.
 */
export const triggerHapticFeedback = () => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10); // A short, subtle 10ms vibration
  }
};