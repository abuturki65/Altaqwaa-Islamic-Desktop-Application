export const TYPE_META = {
    khutbahs: { label: 'خطبة', badge: 'badge-khutbah', icon: 'scroll' },
    fatwa: { label: 'فتوى', badge: 'badge-fatwa', icon: 'gavel' },
    history: { label: 'حدث تاريخي', badge: 'badge-history', icon: 'landmark' },
    quiz: { label: 'سؤال', badge: 'badge-quiz', icon: 'brain' },
};

export const TYPE_KEYS = ['khutbah', 'fatwa', 'history', 'quiz'];

export const readingTime = (minutes) => {
    if (!minutes || minutes < 1) return 'أقل من دقيقة';
    if (minutes < 60) return `~${minutes} دقيقة`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `~${h} ساعة و${m} دقيقة` : `~${h} ساعة`;
};

export const fmtDate = (iso) => {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        if (isNaN(d)) return '';
        return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (_) {
        return String(iso).slice(0, 10);
    }
};

export const stripHtml = (s) => String(s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

export const LET_LABELS = ['أ', 'ب', 'ج', 'د'];
