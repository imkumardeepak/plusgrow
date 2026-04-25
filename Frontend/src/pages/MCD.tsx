import React, { useState, memo } from 'react';
import { useWms } from '../context/WmsContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/atoms/Card';
import { Button } from '../components/atoms/Button';
import { Badge } from '../components/atoms/Badge';
import { Input } from '../components/atoms/Input';
import { Plus, Users, Search, Building2, Mail, Phone, MapPin, X, CheckCircle2, ChevronRight, Save } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import confetti from 'canvas-confetti';

export const MCD = memo(function MCD() {
  const { customers, addCustomer } = useWms();
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    ownership: 'Self' as 'Self' | '3rd Party'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.address || !formData.email || !formData.phone) return;
    
    addCustomer({
      id: Math.random().toString(36).substr(2, 9),
      ...formData
    });
    
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 },
      colors: ["#10b981", "#4E8EA2"]
    });
    
    toast.success('Client registered securely in the Master Data directory.', {
      icon: <CheckCircle2 className="w-5 h-5 text-success-500" />
    });
    
    setIsAdding(false);
    setFormData({ name: '', address: '', phone: '', email: '', ownership: 'Self' });
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      {/* Header Bar - Pro Max Edition */}
      <Card variant="glass" className="p-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-400/20 flex items-center justify-center shrink-0 border border-brand-200 shadow-card">
              <Users className="w-5 h-5 text-brand-300" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight tracking-tight">Master Customer Data</h1>
              <p className="text-xs text-neutral-500 font-medium tracking-wide uppercase mt-0.5">Global Trading Partners</p>
            </div>
          </div>
          <div className="flex items-center gap-3 border-l border-neutral-200/50 pl-4">
             <div className="relative w-64">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
               <Input
                 placeholder="Search by name, email, phone..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="pl-9 h-9 text-sm bg-white/[0.04] focus:bg-white/[0.04] transition-colors border-white/10 shadow-card"
               />
             </div>
             <Button 
                onClick={() => setIsAdding(!isAdding)} 
                variant={isAdding ? 'default' : 'primary'}
                className={cn("h-9 w-40 font-bold shadow-card transition-all", isAdding ? "bg-neutral-800 hover:bg-neutral-900 text-white" : "bg-brand-600 hover:bg-brand-700 shadow-brand-500/20")}
                leftIcon={isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
             >
                {isAdding ? 'CANCEL ENTRY' : 'NEW CUSTOMER'}
             </Button>
          </div>
        </div>
      </Card>

      {/* Main Layout Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
         
         {/* LEFT/TOP: Creation Form */}
         <div className={cn("transition-all duration-500 ease-in-out overflow-hidden flex flex-col", isAdding ? "lg:col-span-4 h-full" : "lg:col-span-0 w-0 opacity-0 overflow-hidden hidden")}>
            <Card variant="elevated" className="flex flex-col h-full border-brand-200 shadow-lg shadow-brand-500/5 ring-1 ring-brand-500/10">
               <CardHeader className="py-2.5 px-4 border-b border-white/10 bg-brand-50/50 shrink-0">
                  <CardTitle size="sm" className="flex items-center gap-2 text-brand-900">
                     <Building2 className="w-4 h-4 text-brand-300" />
                     Registration Subsystem
                  </CardTitle>
               </CardHeader>
               <CardContent className="flex-1 overflow-y-auto p-5 scrollbar-thin bg-white/[0.04] relative">
                  <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none"></div>
                  
                  <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                     <div className="space-y-2">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Trading Name (Company)</label>
                        <div className="relative">
                           <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                              <Building2 className="h-4 w-4 text-brand-400" />
                           </div>
                           <Input
                              type="text"
                              required 
                              placeholder="Acme Corp Intl."
                              className="w-full h-11 pl-10 rounded-xl border-2 border-white/10 bg-white/[0.02] focus:bg-white/[0.04] text-sm font-medium shadow-card transition-all outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                              value={formData.name} 
                              onChange={e => setFormData({...formData, name: e.target.value})} 
                           />
                        </div>
                     </div>
                     
                     <div className="space-y-2">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Primary Email</label>
                        <div className="relative">
                           <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                              <Mail className="h-4 w-4 text-brand-400" />
                           </div>
                           <Input
                              type="email" 
                              required 
                              placeholder="logistics@acme.com"
                              className="w-full h-11 pl-10 rounded-xl border-2 border-white/10 bg-white/[0.02] focus:bg-white/[0.04] text-sm font-medium shadow-card transition-all outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                              value={formData.email} 
                              onChange={e => setFormData({...formData, email: e.target.value})} 
                           />
                        </div>
                     </div>
                     
                     <div className="space-y-2">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Contact Number</label>
                        <div className="relative">
                           <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                              <Phone className="h-4 w-4 text-brand-400" />
                           </div>
                           <Input
                              type="tel" 
                              required 
                              placeholder="+1 (555) 019-2093"
                              className="w-full h-11 pl-10 rounded-xl border-2 border-white/10 bg-white/[0.02] focus:bg-white/[0.04] text-sm font-medium font-mono shadow-card transition-all outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                              value={formData.phone} 
                              onChange={e => setFormData({...formData, phone: e.target.value})} 
                           />
                        </div>
                     </div>
                     
                     <div className="space-y-2">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Business Relationship</label>
                        <select 
                           className="block w-full h-11 px-4 rounded-xl border-2 border-white/10 bg-white/[0.02] focus:bg-white/[0.04] text-sm font-medium text-neutral-100 shadow-card focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all outline-none appearance-none"
                           value={formData.ownership}
                           onChange={e => setFormData({...formData, ownership: e.target.value as any})}
                        >
                           <option value="Self">Direct Retailer (Self)</option>
                           <option value="3rd Party">Logistics Partner (3PL)</option>
                        </select>
                     </div>
                     
                     <div className="space-y-2">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Registered Facilities Address</label>
                        <div className="relative flex">
                           <div className="absolute top-3.5 left-3.5 pointer-events-none">
                              <MapPin className="h-4 w-4 text-brand-400" />
                           </div>
                           <textarea 
                              required 
                              placeholder="Full delivery street network, State, Postal Code..."
                              rows={3}
                              className="block w-full pl-10 pr-4 py-3 rounded-xl border-2 border-white/10 bg-white/[0.02] focus:bg-white/[0.04] text-sm font-medium shadow-card transition-all outline-none resize-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                              value={formData.address} 
                              onChange={e => setFormData({...formData, address: e.target.value})} 
                           />
                        </div>
                     </div>
                     
                     <div className="pt-2">
                        <Button type="submit" size="lg" className="w-full h-12 text-sm font-bold shadow-float shadow-brand-500/20" leftIcon={<Save className="w-4 h-4" />}>
                           COMMIT RECORD
                        </Button>
                     </div>
                  </form>
               </CardContent>
            </Card>
         </div>

         {/* RIGHT/BOTTOM: Database View */}
         <Card variant="elevated" className={cn("flex flex-col h-full overflow-hidden transition-all duration-500", isAdding ? "lg:col-span-8" : "col-span-1 lg:col-span-12")}>
            <CardHeader className="py-2.5 px-4 border-b border-white/10 bg-white/[0.02] shrink-0">
               <div className="flex items-center justify-between">
                  <CardTitle size="sm" className="flex items-center gap-2">
                     <Users className="w-4 h-4 text-brand-500" />
                     Verified Partners Directory
                  </CardTitle>
                  <Badge variant="primary" size="sm" className="bg-brand-400/20 text-brand-400 border-brand-200">
                     {filteredCustomers.length} Active Records
                  </Badge>
               </div>
            </CardHeader>

            <CardContent className="flex-1 p-0 flex flex-col relative bg-white/[0.04] overflow-hidden">
               <div className="flex-1 overflow-auto scrollbar-thin">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                     <thead className="bg-white/95 backdrop-blur-md border-b border-white/10 sticky top-0 z-20 shadow-card">
                        <tr>
                           <th className="py-3 px-5 text-[10px] font-bold text-neutral-400 uppercase tracking-widest whitespace-nowrap">Corporate Entity</th>
                           <th className="py-3 px-5 text-[10px] font-bold text-neutral-400 uppercase tracking-widest whitespace-nowrap">Digital Communications</th>
                           <th className="py-3 px-5 text-[10px] font-bold text-neutral-400 uppercase tracking-widest whitespace-nowrap text-center">Protocol Level</th>
                           <th className="py-3 px-5 text-[10px] font-bold text-neutral-400 uppercase tracking-widest whitespace-nowrap">HQ Origin</th>
                           <th className="py-3 px-5 text-[10px] font-bold text-neutral-400 uppercase tracking-widest whitespace-nowrap text-right">Actions</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-white/ bg-white/[0.04]">
                        {filteredCustomers.map((c, idx) => (
                           <tr 
                              key={c.id} 
                              className="group hover:bg-brand-50/30 transition-colors animate-in fade-in"
                              style={{ animationFillMode: 'both', animationDelay: `${idx * 20}ms` }}
                           >
                              <td className="py-4 px-5">
                                 <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-50 to-brand-50 border border-brand-100 flex items-center justify-center text-brand-400 font-black text-sm shadow-card">
                                       {c.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                       <span className="font-bold text-white block text-sm">{c.name}</span>
                                       <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">{c.id.toUpperCase()}</span>
                                    </div>
                                 </div>
                              </td>
                              <td className="py-4 px-5">
                                 <div className="space-y-1.5">
                                    <div className="flex items-center text-xs text-neutral-300 font-medium font-mono">
                                       <div className="w-5 h-5 rounded bg-neutral-100 flex items-center justify-center mr-2"><Mail className="w-3 h-3 text-neutral-500" /></div>
                                       {c.email}
                                    </div>
                                    <div className="flex items-center text-xs text-neutral-300 font-medium font-mono">
                                       <div className="w-5 h-5 rounded bg-neutral-100 flex items-center justify-center mr-2"><Phone className="w-3 h-3 text-neutral-500" /></div>
                                       {c.phone}
                                    </div>
                                 </div>
                              </td>
                              <td className="py-4 px-5 text-center">
                                 {c.ownership === 'Self' ? (
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-success-50/50 border border-success-200 text-success-400 rounded-full font-bold text-[10px] tracking-widest uppercase">
                                       <span className="w-1.5 h-1.5 rounded-full bg-success-400/100"></span> Direct (Self)
                                    </div>
                                 ) : (
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-warning-50/50 border border-warning-200 text-warning-400 rounded-full font-bold text-[10px] tracking-widest uppercase">
                                       <span className="w-1.5 h-1.5 rounded-full bg-warning-400/100"></span> 3rd Party
                                    </div>
                                 )}
                              </td>
                              <td className="py-4 px-5">
                                 <div className="flex items-start text-xs text-neutral-300 max-w-[200px] leading-relaxed">
                                    <MapPin className="w-3.5 h-3.5 mr-2 text-neutral-400 shrink-0 mt-0.5" />
                                    <span className="line-clamp-2" title={c.address}>{c.address}</span>
                                 </div>
                              </td>
                              <td className="py-4 px-5 text-right">
                                 <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-all font-bold h-8 text-brand-300 hover:bg-brand-400/10" rightIcon={<ChevronRight className="w-4 h-4" />}>
                                    Manage
                                 </Button>
                              </td>
                           </tr>
                        ))}
                        
                        {filteredCustomers.length === 0 && (
                           <tr>
                              <td colSpan={5} className="py-32">
                                 <div className="flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-500">
                                    <div className="w-24 h-24 bg-white/[0.04] shadow-card ring-1 ring-white/10 rounded-full flex items-center justify-center mb-6 relative group overflow-hidden">
                                       <Users className="w-10 h-10 text-neutral-300 relative z-10 group-hover:text-brand-400 transition-colors" />
                                       <div className="absolute inset-0 border-[3px] border-white/10 border-dashed rounded-full group-hover:border-brand-200 animate-[spin_15s_linear_infinite]" />
                                    </div>
                                    <h3 className="text-xl font-heading font-bold text-white mb-2">Empty Trading Directory</h3>
                                    <p className="text-sm text-neutral-500 max-w-sm mb-6 leading-relaxed">
                                       {searchTerm 
                                          ? `We couldn't locate any trading partners matching "${searchTerm}". Try different parameters.`
                                          : `Your master database is completely clear. Configure your first client profile to begin fulfillment.`}
                                    </p>
                                    {!searchTerm && !isAdding && (
                                       <Button onClick={() => setIsAdding(true)} size="lg" className="shadow-lg shadow-brand-500/20 px-8 bg-brand-600 hover:bg-brand-700" leftIcon={<Plus className="w-5 h-5" />}>
                                          Setup Initial Partner
                                       </Button>
                                    )}
                                 </div>
                              </td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
});

export default MCD;
