import React from 'react';
import { Shield, LayoutDashboard, Radio, Server, Settings } from 'lucide-react';

export const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-screen bg-siem-bg text-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-siem-border flex flex-col bg-siem-bg shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-siem-border font-bold text-xl tracking-tight">
          <Shield className="text-siem-accent mr-2" /> Oculus
        </div>
        
        <nav className="p-4 space-y-1">
          <NavItem icon={<LayoutDashboard />} label="Dashboard" active />
          <NavItem icon={<Radio />} label="Live Stream" />
          <NavItem icon={<Server />} label="Agents" />
          <div className="pt-4 mt-4 border-t border-siem-border">
             <NavItem icon={<Settings />} label="Settings" />
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {children}
      </main>
    </div>
  );
};

const NavItem = ({ icon, label, active }: any) => (
  <button className={`w-full flex items-center p-3 rounded-lg transition-all ${
    active ? 'bg-siem-accent/10 text-siem-accent' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
  }`}>
    {React.cloneElement(icon, { size: 20 })}
    <span className="ml-3 font-medium">{label}</span>
  </button>
);