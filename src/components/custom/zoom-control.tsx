import React, { useState, useEffect } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';

interface ZoomControlProps {
  className?: string;
}

export function ZoomControl({ className = '' }: ZoomControlProps) {
  const [zoom, setZoom] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('mrtao_ui_zoom');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 80 && val <= 130) {
          return val;
        }
      }
    } catch (e) {
      console.error('Error reading zoom from localStorage:', e);
    }
    return 100;
  });

  useEffect(() => {
    try {
      const html = document.documentElement;
      (html.style as any).zoom = `${zoom}%`;
      localStorage.setItem('mrtao_ui_zoom', zoom.toString());
    } catch (e) {
      console.error('Error applying zoom style:', e);
    }
  }, [zoom]);

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(80, prev - 10));
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(130, prev + 10));
  };

  return (
    <div className={`flex items-center gap-1 bg-slate-100/50 dark:bg-slate-800/40 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/50 select-none ${className}`}>
      <button
        onClick={handleZoomOut}
        disabled={zoom <= 80}
        className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 shadow-2xs hover:shadow-sm border border-transparent disabled:hover:bg-transparent disabled:hover:shadow-none cursor-pointer transition-all active:scale-95 flex items-center justify-center shrink-0"
        title="Thu nhỏ giao diện (80%)"
        type="button"
      >
        <ZoomOut className="w-4 h-4" />
      </button>
      
      <div className="w-12 h-7.5 flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 rounded-xl shadow-sm">
        <span className="text-[12px] font-black text-slate-700 dark:text-slate-200 font-mono tracking-tight">
          {zoom}
        </span>
      </div>

      <button
        onClick={handleZoomIn}
        disabled={zoom >= 130}
        className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 shadow-2xs hover:shadow-sm border border-transparent disabled:hover:bg-transparent disabled:hover:shadow-none cursor-pointer transition-all active:scale-95 flex items-center justify-center shrink-0"
        title="Phóng to giao diện (130%)"
        type="button"
      >
        <ZoomIn className="w-4 h-4" />
      </button>
    </div>
  );
}
