import React, { memo, useMemo } from 'react';
import { useWms } from '../context/WmsContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/atoms/Card';
import { Badge } from '../components/atoms/Badge';
import { Package, ArrowDownToLine, ArrowUpFromLine, Box, Clock, Activity, ArrowRight, TrendingUp } from 'lucide-react';
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
    { name: 'Receiving', quantity: stats.totalInwards, color: '#1ec0f3' },
    { name: 'Dispatch', quantity: stats.totalOutwards, color: '#2dd4bf' },
    { name: 'Inventory', quantity: stats.totalStock, color: '#0a6994' },
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
              <div className="h-6 w-48 rounded bg-white/10 animate-pulse" />
            </div>
          </div>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-4">
              <div className="h-24 rounded-xl bg-white/10 animate-pulse" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <section className="theme-panel flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center gap-4">
          <div className="theme-glow flex h-14 w-14 items-center justify-center rounded-[22px] border border-brand-300/25 bg-gradient-to-br from-brand-300 to-brand-500">
            <Activity className="h-7 w-7 text-slate-950" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Dashboard Status</p>
            <p className="mt-1 text-sm text-neutral-500">Live snapshot for inbound, outbound, inventory, task flow.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="primary" shape="pill" className="px-4 py-2 text-sm">System Optimal</Badge>
          <Badge variant="default" shape="pill" className="px-4 py-2 text-sm">Pending tasks: {totalTasks}</Badge>
          <Badge variant="default" shape="pill" className="px-4 py-2 text-sm">Efficiency: {overallProgress}%</Badge>
        </div>
      </section>

      <div className="grid shrink-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: 'Total Inbound Units',
            value: stats.totalInwards.toLocaleString(),
            hint: 'Receiving volume',
            icon: ArrowDownToLine,
            accent: 'text-brand-200',
            badge: '+12%',
          },
          {
            title: 'Total Outbound Units',
            value: stats.totalOutwards.toLocaleString(),
            hint: 'Dispatch volume',
            icon: ArrowUpFromLine,
            accent: 'text-emerald-200',
            badge: '+8%',
          },
          {
            title: 'Registered SKUs',
            value: stats.totalSKUs.toLocaleString(),
            hint: 'Product catalog',
            icon: Package,
            accent: 'text-cyan-200',
            badge: 'Live',
          },
          {
            title: 'Current Stock',
            value: stats.totalStock.toLocaleString(),
            hint: 'Warehouse inventory',
            icon: Box,
            accent: 'text-amber-200',
            badge: `${totalTasks} open`,
          },
        ].map(({ title, value, hint, icon: Icon, accent, badge }) => (
          <Card key={title} variant="interactive" className="overflow-hidden p-0">
            <div className="relative p-5">
              <div className="absolute right-0 top-0 h-28 w-28 rounded-bl-full bg-brand-400/8 blur-2xl" />
              <div className="relative flex items-start justify-between">
                <div className="theme-glow flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/6">
                  <Icon className={cn('h-6 w-6', accent)} />
                </div>
                <Badge variant="default" shape="pill">{badge}</Badge>
              </div>
              <div className="relative mt-8">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-300/70">{title}</p>
                <div className="mt-2 flex items-end gap-2">
                  <span className="text-3xl font-black tracking-tight text-white">{value}</span>
                  <span className="pb-1 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-300">{hint}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid flex-1 min-h-0 grid-cols-1 gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="flex min-h-0 flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card
              variant="interactive"
              className="cursor-pointer overflow-hidden p-0"
              onClick={() => navigate('/putaway')}
            >
              <div className="flex items-center justify-between p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[22px] border border-warning-400/20 bg-warning-500/12 text-warning-100">
                    <Clock className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-300/70">Pending Put-Away</p>
                    <p className="mt-1 text-3xl font-black text-white">{stats.pendingPutAway}</p>
                  </div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/6">
                  <ArrowRight className="h-4 w-4 text-warning-100" />
                </div>
              </div>
            </Card>

            <Card
              variant="interactive"
              className="cursor-pointer overflow-hidden p-0"
              onClick={() => navigate('/dispatch')}
            >
              <div className="flex items-center justify-between p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[22px] border border-brand-300/20 bg-brand-400/12 text-brand-100">
                    <Package className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-300/70">Pending Dispatch</p>
                    <p className="mt-1 text-3xl font-black text-white">{stats.pendingDispatch}</p>
                  </div>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/6">
                  <ArrowRight className="h-4 w-4 text-brand-100" />
                </div>
              </div>
            </Card>
          </div>

          <Card variant="elevated" className="flex min-h-[360px] flex-1 flex-col overflow-hidden">
            <CardHeader className="shrink-0 px-5 py-4">
              <div>
                <CardTitle size="sm" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-brand-300" />
                  Volume Analytics
                </CardTitle>
                <p className="mt-1 text-xs font-medium text-neutral-300">System-wide transaction volume breakdown</p>
              </div>
              <Badge variant="primary" shape="pill">30 Days</Badge>
            </CardHeader>
            <CardContent className="relative min-h-[260px] flex-1 p-5">
              <div className="theme-grid-bg absolute inset-5 rounded-[22px] opacity-20" />
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 0, left: -16, bottom: 0 }} barGap={10}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#c8d4e4', fontSize: 11, fontWeight: 700 }}
                    dy={16}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9fb0c8', fontSize: 12, fontWeight: 500 }}
                    dx={-10}
                    tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.06)' }}
                    contentStyle={{
                      borderRadius: '18px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      boxShadow: '0 20px 45px rgba(2, 8, 23, 0.36)',
                      fontWeight: 700,
                      padding: '12px 16px',
                      backgroundColor: 'rgba(12, 18, 32, 0.94)',
                      backdropFilter: 'blur(14px)',
                      color: '#ffffff',
                    }}
                    labelStyle={{ color: '#dfe8f4' }}
                  />
                  <Bar
                    dataKey="quantity"
                    radius={[10, 10, 4, 4]}
                    barSize={50}
                    animationDuration={1200}
                    animationEasing="ease-out"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card variant="elevated" className="flex min-h-[360px] flex-col overflow-hidden">
          <CardHeader className="shrink-0 px-5 py-4">
            <div className="flex items-center justify-between">
              <CardTitle size="sm" className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-brand-300" />
                Live Event Stream
              </CardTitle>
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-400 opacity-75"></span>
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success-400"></span>
              </span>
            </div>
          </CardHeader>
          <CardContent className="scrollbar-thin relative flex-1 overflow-y-auto p-3">
            <div className="space-y-2">
              {recentActivities.map((activity, idx) => (
                <div
                  key={activity.id}
                  className="animate-in fade-in slide-in-from-right-4 group flex items-start gap-3 rounded-[22px] border border-white/6 bg-white/[0.03] p-3 transition-all duration-200 hover:border-white/12 hover:bg-white/[0.05]"
                  style={{ animationFillMode: 'both', animationDelay: `${idx * 60}ms` }}
                >
                  <div className="relative mt-0.5 shrink-0">
                    <div className={cn(
                      'relative z-10 flex h-10 w-10 items-center justify-center rounded-full border bg-white/[0.05] transition-transform duration-300 group-hover:scale-105',
                      activity.type === 'Inward'
                        ? 'border-brand-300/20 text-brand-200'
                        : activity.type === 'Outward'
                          ? 'border-success-400/20 text-success-200'
                          : 'border-warning-400/20 text-warning-100'
                    )}>
                      {activity.type === 'Inward'
                        ? <ArrowDownToLine className="h-5 w-5" />
                        : activity.type === 'Outward'
                          ? <ArrowUpFromLine className="h-5 w-5" />
                          : <Box className="h-5 w-5" />}
                    </div>
                    {idx !== recentActivities.length - 1 && (
                      <div className="absolute bottom-[-22px] left-1/2 top-10 w-px -translate-x-1/2 bg-white/10" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1 py-1">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <Badge variant="default" className="px-2 py-0 text-[9px] font-bold uppercase tracking-[0.18em]">
                        {activity.type}
                      </Badge>
                      <span className="font-mono text-[10px] font-medium text-neutral-300/70">
                        {new Date(activity.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm font-semibold leading-snug text-white">{activity.description}</p>
                  </div>
                </div>
              ))}

              {recentActivities.length === 0 && (
                <div className="flex min-h-[300px] flex-col items-center justify-center px-4 text-center">
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
                    <Activity className="h-8 w-8 text-neutral-300/60" />
                  </div>
                  <h4 className="mb-1 text-sm font-bold text-white">System Quiet</h4>
                  <p className="max-w-[200px] text-xs text-neutral-300">
                    Network event telemetry will populate here when operational activity resumes.
                  </p>
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
