import React from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';

export default function Pagination({ page, perPage, total, onChange }) {
    const pages = Math.max(1, Math.ceil(total / perPage));
    if (pages <= 1) return null;
    return (
        <div className="row mt-16" style={{ justifyContent: 'center' }}>
            <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
                <ChevronRight size={15} /> السابق
            </button>
            <span className="text-2" style={{ fontWeight: 700, fontSize: 13 }}>
                صفحة {page} من {pages} · {total.toLocaleString('ar-EG')} عنصر
            </span>
            <button className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
                التالي <ChevronLeft size={15} />
            </button>
        </div>
    );
}
