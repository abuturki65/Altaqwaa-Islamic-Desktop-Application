/* Calendar service: Gregorian + Hijri dates in Arabic. */

import moment from 'moment-hijri';

const HI_MONTHS = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];
const WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export function today() {
    const now = new Date();
    const m = moment();
    return {
        gregorian: `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`,
        weekday: WEEKDAYS[now.getDay()],
        hijri: `${m.iDate()} ${HI_MONTHS[m.iMonth()]} ${m.iYear()}`,
        hijriShort: `${m.iYear()}/${m.iMonth() + 1}/${m.iDate()}`,
    };
}
