import React from 'react';
import { HeartHandshake, Sparkles } from 'lucide-react';
import { ModuleHeader } from '../../../share/components/module-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../share/ui/card';

export default function CustomersRoute() {
  return (
    <div className="space-y-4 text-left">
      <ModuleHeader
        title="Quản lý Khách hàng"
        description="Thông tin khách hàng thân thiết, lịch sử mua hàng và chăm sóc khách hàng."
        icon={<HeartHandshake className="w-6 h-6 text-[#C21A1A]" />}
      />
      <Card className="min-h-[300px] flex flex-col items-center justify-center border-dashed border-slate-200">
        <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
            <Sparkles className="w-8 h-8 text-amber-500 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-800">Module Khách hàng</h3>
            <p className="text-sm text-slate-400 font-bold">Chức năng đang trong quá trình phát triển và hoàn thiện.</p>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
            Sắp ra mắt / Coming Soon
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
