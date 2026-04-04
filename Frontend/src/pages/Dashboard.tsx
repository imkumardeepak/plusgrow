import React, { memo, useMemo } from 'react';
import { useWms } from '../context/WmsContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/atoms/Card';
import { Badge } from '../components/atoms/Badge';
import { Button } from '../components/atoms/Button';
import { Package, ArrowDownToLine, ArrowUpFromLine, Box, Clock, RefreshCw, Activity, ArrowRight, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

export const Dashboard = memo(function Dashboard() {
  const { products, purchaseInvoices, salesInvoices, stock, activities, isLoading } = useWms();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const totalInwards = purchaseInvoices.reduce((acc, curr) => acc + curr.quantity, 0);
    const totalOutwards = salesInvoices.reduce((acc, curr) => acc + curr.quantity, 0);
    const totalStock = stock.reduce((acc, curr) => acc + curr.quantity, 0);
    const pendingPutAway = purchaseInvoices.filter(pi => pi.status === 'Open').length;
    const pendingDispatch = salesInvoices.filter(si => si.status === 'Open').length;

    return {
      totalInwards,
      totalOutwards,
      totalStock,
      totalSKUs: products.length,
      pendingPutAway,
      pendingDispatch,
    };
  }, [purchaseInvoices, salesInvoices, stock, products.length]);

  const chartData = useMemo(() => [
    { name: 'Receiving', quantity: stats.totalInwards, color: '#4E8EA2' },
    { name: 'Dispatch', quantity: stats.totalOutwards, color: '#10b981' },
    { name: 'Inventory', quantity: stats.totalStock, color: '#0A4174' },
  ], [stats]);

  const recentActivities = useMemo(() => activities.slice(0, 8), [activities]);

  const totalTasks = stats.pendingPutAway + stats.pendingDispatch;
  const completedTasks = (purchaseInvoices.length - stats.pendingPutAway) + (salesInvoices.length - stats.pendingDispatch);
  const overallProgress = (purchaseInvoices.length + salesInvoices.length) > 0 
    ? Math.round((completedTasks / (purchaseInvoices.length + salesInvoices.length)) * 100)
    : 100;

  if (isLoading) {
    return (
      <div className="flex flex-col h-full min-h-0 gap-4 animate-in fade-in duration-1000">
        <Card className="p-3">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="h-6 w-48 bg-neutral-200 rounded animate-pulse" />
            </div>
          </div>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-4 border-neutral-100">
              <div className="h-24 bg-neutral-100/50 rounded-xl animate-pulse" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      {/* Premium Header Bar */}
      <Card variant="glass" className="p-3 shrink-0">
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shrink-0 shadow-sm shadow-brand-500/20">
                  <Activity className="w-5 h-5 text-white" />
               </div>
               <div>
                  <h1 className="text-base font-bold text-neutral-900 leading-tight tracking-tight">Executive Command Center</h1>
                  <div className="flex items-center gap-2 mt-0.5">
                     <p className="text-xs text-neutral-500 font-medium tracking-wide uppercase">System Overview & Analytics</p>
                     <div className="w-1 h-1 rounded-full bg-neutral-300"></div>
                     <Badge variant="success" dot className="bg-transparent border-0 px-0 py-0 h-auto text-[10px] uppercase font-bold text-success-600 shadow-none">System Optimal</Badge>
                  </div>
               </div>
            </div>
            
            <div className="flex items-center gap-4">
               <div className="hidden md:block w-48">
                  <div className="flex items-center justify-between mb-1.5">
                     <span className="text-[10px] font-bold tracking-wider uppercase text-neutral-500">Global Efficiency</span>
                     <span className="text-[10px] font-black tracking-widest text-brand-600">{overallProgress}%</span>
                  </div>
                  <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden shadow-inner">
                     <div className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full transition-all duration-1000 ease-out relative" style={{ width: `${overallProgress}%` }}>
                        <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]"></div>
                     </div>
                  </div>
               </div>
               <div className="h-8 w-px bg-neutral-200 hidden md:block"></div>
               <Button 
                  variant="outline" 
                  size="md" 
                  leftIcon={<RefreshCw className="w-4 h-4 text-neutral-500" />} 
                  onClick={() => window.location.reload()} 
                  className="bg-white hover:bg-neutral-50 border-neutral-200 shadow-sm text-neutral-700 font-semibold transition-all hover:border-neutral-300"
               >
                  Refresh Data
               </Button>
            </div>
         </div>
      </Card>

      {/* Enhanced Stats Grid - Executive Level */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
         <Card variant="interactive" className="p-0 overflow-hidden border border-neutral-200/60 shadow-lg shadow-neutral-200/20 group relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-bl-full -mr-8 -mt-8 transition-transform duration-500 group-hover:scale-110 opacity-50 pointer-events-none"></div>
            <div className="p-5 relative z-10 flex flex-col h-full justify-between">
               <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-brand-100/50 border border-brand-200/50 flex items-center justify-center text-brand-600 shadow-sm">
                     <ArrowDownToLine className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <Badge variant="primary" className="bg-brand-50 text-brand-700 border-brand-200/50">+12%</Badge>
               </div>
               <div>
                  <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-1 line-clamp-1">Total Inbound Units</p>
                  <div className="flex items-baseline gap-2">
                     <span className="text-3xl font-heading font-black text-neutral-900 tracking-tight">{stats.totalInwards.toLocaleString()}</span>
                     <span className="text-xs text-brand-600 font-bold uppercase">Units</span>
                  </div>
               </div>
            </div>
            <div className="h-1 w-full bg-brand-500 absolute bottom-0 left-0 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
         </Card>

         <Card variant="interactive" className="p-0 overflow-hidden border border-neutral-200/60 shadow-lg shadow-neutral-200/20 group relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-success-50 rounded-bl-full -mr-8 -mt-8 transition-transform duration-500 group-hover:scale-110 opacity-50 pointer-events-none"></div>
            <div className="p-5 relative z-10 flex flex-col h-full justify-between">
               <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-success-100/50 border border-success-200/50 flex items-center justify-center text-success-600 shadow-sm">
                     <ArrowUpFromLine className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <Badge variant="success" className="bg-success-50 text-success-700 border-success-200/50">+8%</Badge>
               </div>
               <div>
                  <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-1 line-clamp-1">Total Outbound Units</p>
                  <div className="flex items-baseline gap-2">
                     <span className="text-3xl font-heading font-black text-neutral-900 tracking-tight">{stats.totalOutwards.toLocaleString()}</span>
                     <span className="text-xs text-success-600 font-bold uppercase">Units</span>
                  </div>
               </div>
            </div>
            <div className="h-1 w-full bg-success-500 absolute bottom-0 left-0 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
         </Card>

         <Card variant="interactive" className="p-0 overflow-hidden border border-neutral-200/60 shadow-lg shadow-neutral-200/20 group relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-bl-full -mr-8 -mt-8 transition-transform duration-500 group-hover:scale-110 opacity-50 pointer-events-none"></div>
            <div className="p-5 relative z-10 flex flex-col h-full justify-between">
               <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-brand-100/50 border border-brand-200/50 flex items-center justify-center text-brand-600 shadow-sm">
                     <Package className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <TrendingUp className="w-4 h-4 text-neutral-300" />
               </div>
               <div>
                  <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-1 line-clamp-1">Registered SKUs</p>
                  <div className="flex items-baseline gap-2">
                     <span className="text-3xl font-heading font-black text-neutral-900 tracking-tight">{stats.totalSKUs.toLocaleString()}</span>
                     <span className="text-xs text-brand-600 font-bold uppercase">Types</span>
                  </div>
               </div>
            </div>
            <div className="h-1 w-full bg-brand-500 absolute bottom-0 left-0 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
         </Card>

         <Card variant="interactive" className="p-0 overflow-hidden border border-neutral-200/60 shadow-lg shadow-neutral-200/20 group relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-full -mr-8 -mt-8 transition-transform duration-500 group-hover:scale-110 opacity-50 pointer-events-none"></div>
            <div className="p-5 relative z-10 flex flex-col h-full justify-between">
               <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-100/50 border border-amber-200/50 flex items-center justify-center text-amber-600 shadow-sm">
                     <Box className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <Badge variant="warning" className="bg-amber-50 text-amber-700 border-amber-200/50">Live</Badge>
               </div>
               <div>
                  <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-widest mb-1 line-clamp-1">Current Stock Valuation</p>
                  <div className="flex items-baseline gap-2">
                     <span className="text-3xl font-heading font-black text-neutral-900 tracking-tight">{stats.totalStock.toLocaleString()}</span>
                     <span className="text-xs text-amber-600 font-bold uppercase">Total</span>
                  </div>
               </div>
            </div>
            <div className="h-1 w-full bg-amber-500 absolute bottom-0 left-0 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
         </Card>
      </div>

      {/* Main Operations Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
         
         {/* LEFT COLUMN: Operations & Chart */}
         <div className="lg:col-span-8 flex flex-col gap-4 min-h-0">
            {/* Quick Actions / Attention Blocks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 shrink-0">
               <Card 
                  variant="interactive" 
                  className="p-0 overflow-hidden group cursor-pointer border border-neutral-200 shadow-sm hover:border-warning-300 hover:shadow-warning-500/10 transition-all duration-300"
                  onClick={() => navigate('/putaway')}
               >
                  <div className="p-5 flex items-center justify-between bg-gradient-to-r from-white to-warning-50/20">
                     <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-warning-100/80 border border-warning-200/60 flex items-center justify-center text-warning-700 shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                           <Clock className="w-7 h-7 stroke-[2]" />
                        </div>
                        <div>
                           <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Pending Put-Away</p>
                           <p className="text-3xl font-heading font-black text-neutral-900 leading-tight mt-0.5">{stats.pendingPutAway}</p>
                        </div>
                     </div>
                     <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-neutral-100 flex items-center justify-center opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                        <ArrowRight className="w-4 h-4 text-warning-600" />
                     </div>
                  </div>
               </Card>
               
               <Card 
                  variant="interactive" 
                  className="p-0 overflow-hidden group cursor-pointer border border-neutral-200 shadow-sm hover:border-info-300 hover:shadow-info-500/10 transition-all duration-300"
                  onClick={() => navigate('/dispatch')}
               >
                  <div className="p-5 flex items-center justify-between bg-gradient-to-r from-white to-info-50/20">
                     <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-info-100/80 border border-info-200/60 flex items-center justify-center text-info-700 shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                           <Package className="w-7 h-7 stroke-[2]" />
                        </div>
                        <div>
                           <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Pending Dispatch</p>
                           <p className="text-3xl font-heading font-black text-neutral-900 leading-tight mt-0.5">{stats.pendingDispatch}</p>
                        </div>
                     </div>
                     <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-neutral-100 flex items-center justify-center opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                        <ArrowRight className="w-4 h-4 text-info-600" />
                     </div>
                  </div>
               </Card>
            </div>

            {/* Inventory Analytics Chart */}
            <Card variant="elevated" className="flex-1 border-neutral-200 shadow-sm flex flex-col min-h-0 bg-white">
               <CardHeader className="py-4 px-5 border-b border-neutral-100 shrink-0 flex flex-row items-center justify-between">
                  <div>
                     <CardTitle size="sm" className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-brand-500" />
                        Volume Analytics
                     </CardTitle>
                     <p className="text-xs text-neutral-500 mt-1 font-medium">System-wide transaction volume breakdown</p>
                  </div>
                  <Badge variant="primary" className="bg-brand-50 text-brand-700 border-brand-200 shadow-none">30 Days</Badge>
               </CardHeader>
               <CardContent className="flex-1 p-5 min-h-[250px] relative">
                  <div className="absolute inset-x-5 inset-y-5 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none rounded-xl"></div>
                  <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }} barGap={8}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                        <XAxis 
                           dataKey="name" 
                           axisLine={false} 
                           tickLine={false} 
                           tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }} 
                           dy={16} 
                        />
                        <YAxis 
                           axisLine={false} 
                           tickLine={false} 
                           tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }} 
                           dx={-10}
                           tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
                        />
                        <Tooltip 
                           cursor={{ fill: '#f8fafc', opacity: 0.8 }} 
                           contentStyle={{ 
                              borderRadius: '12px', 
                              border: '1px solid #e2e8f0', 
                              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', 
                              fontWeight: 700, 
                              padding: '12px 16px',
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              backdropFilter: 'blur(8px)'
                           }} 
                        />
                        <Bar 
                           dataKey="quantity" 
                           radius={[8, 8, 4, 4]} 
                           barSize={48}
                           animationDuration={1500}
                           animationEasing="ease-out"
                        >
                           {chartData.map((entry, index) => (
                              <Cell 
                                 key={`cell-${index}`} 
                                 fill={entry.color} 
                                 fillOpacity={0.9} 
                                 className="hover:fill-opacity-100 transition-all duration-300 filter drop-shadow-sm" 
                              />
                           ))}
                        </Bar>
                     </BarChart>
                  </ResponsiveContainer>
               </CardContent>
            </Card>
         </div>

         {/* RIGHT COLUMN: Activity Stream */}
         <Card variant="elevated" className="lg:col-span-4 flex flex-col h-full overflow-hidden border-neutral-200 shadow-sm bg-white">
            <CardHeader className="py-4 px-5 border-b border-neutral-100 bg-neutral-50/50 shrink-0">
               <div className="flex items-center justify-between">
                  <CardTitle size="sm" className="flex items-center gap-2">
                     <Clock className="w-4 h-4 text-slate-500" />
                     Live Event Stream
                  </CardTitle>
                  <span className="flex h-2 w-2 relative">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-2 w-2 bg-success-500"></span>
                  </span>
               </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-2 scrollbar-thin relative z-10">
               <div className="space-y-1">
                  {recentActivities.map((activity, idx) => (
                     <div 
                        key={activity.id} 
                        className="flex items-start gap-3.5 p-3 rounded-xl hover:bg-neutral-50 border border-transparent hover:border-neutral-100 transition-all duration-200 group animate-in slide-in-from-right-4 fade-in"
                        style={{ animationFillMode: 'both', animationDelay: `${idx * 60}ms` }}
                     >
                        <div className="relative shrink-0 mt-0.5">
                           <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center border shadow-sm group-hover:scale-105 transition-transform duration-300 relative z-10 bg-white",
                              activity.type === 'Inward' ? 'text-brand-600 border-brand-200 bg-brand-50/50' : 
                              activity.type === 'Outward' ? 'text-success-600 border-success-200 bg-success-50/50' : 
                              'text-warning-600 border-warning-200 bg-warning-50/50'
                           )}>
                              {activity.type === 'Inward' ? <ArrowDownToLine className="w-5 h-5 stroke-[2]" /> : 
                               activity.type === 'Outward' ? <ArrowUpFromLine className="w-5 h-5 stroke-[2]" /> : 
                               <Box className="w-5 h-5 stroke-[2]" />}
                           </div>
                           {/* Activity Line Connector */}
                           {idx !== recentActivities.length - 1 && (
                              <div className="absolute top-10 bottom-[-24px] left-1/2 w-px bg-neutral-200 -translate-x-1/2 -z-0"></div>
                           )}
                        </div>
                        
                        <div className="flex-1 min-w-0 py-1">
                           <div className="flex items-center justify-between gap-2 mb-1">
                              <Badge variant="default" className="text-[9px] uppercase tracking-wider px-1.5 py-0 bg-neutral-100 text-neutral-600 border border-neutral-200/60 shadow-none font-bold">
                                 {activity.type}
                              </Badge>
                              <span className="text-[10px] font-mono text-neutral-400 font-medium">
                                 {new Date(activity.date).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}
                              </span>
                           </div>
                           <p className="text-sm font-semibold text-neutral-800 leading-snug">{activity.description}</p>
                        </div>
                     </div>
                  ))}
                  
                  {recentActivities.length === 0 && (
                     <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center px-4">
                        <div className="w-20 h-20 rounded-full bg-neutral-50 border border-neutral-100 flex items-center justify-center mb-4">
                           <Activity className="w-8 h-8 text-neutral-300" />
                        </div>
                        <h4 className="text-sm font-bold text-neutral-800 mb-1">System Quiet</h4>
                        <p className="text-xs text-neutral-500 max-w-[200px]">Network event telemetry will populate here when operational activity resumes.</p>
                     </div>
                  )}
               </div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
});

export default Dashboard;
