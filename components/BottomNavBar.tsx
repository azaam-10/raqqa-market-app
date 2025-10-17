import React from 'react';
import { NavLink } from 'react-router-dom';

const HomeIcon = ({ isActive }: { isActive: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-6 w-6 transition-colors ${isActive ? 'text-teal-400' : 'text-gray-500 dark:text-zinc-400'}`}>
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const VideoIcon = ({ isActive }: { isActive: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-6 w-6 transition-colors ${isActive ? 'text-teal-400' : 'text-gray-500 dark:text-zinc-400'}`}>
    <path d="m22 8-6 4 6 4V8Z" />
    <rect x="2" y="6" width="14" height="12" rx="2" ry="2" />
  </svg>
);

const StoreIcon = ({ isActive }: { isActive: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-6 w-6 transition-colors ${isActive ? 'text-teal-400' : 'text-gray-500 dark:text-zinc-400'}`}>
    <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7"/>
  </svg>
);

const GroupsIcon = ({ isActive }: { isActive: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-6 w-6 transition-colors ${isActive ? 'text-teal-400' : 'text-gray-500 dark:text-zinc-400'}`}>
        <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect width="7" height="5" x="7" y="7" rx="1"/><path d="M17 14v-1a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v1"/><path d="M7 7v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7"/>
    </svg>
);

const SearchIcon = ({ isActive }: { isActive: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-6 w-6 transition-colors ${isActive ? 'text-teal-400' : 'text-gray-500 dark:text-zinc-400'}`}>
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const HouseIcon = ({ isActive }: { isActive: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-6 w-6 transition-colors ${isActive ? 'text-teal-400' : 'text-gray-500 dark:text-zinc-400'}`}>
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <path d="M9 22V12h6v10"/>
    <path d="M12 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
  </svg>
);

const BottomNavBar: React.FC = () => {
  const activeLinkClass = "text-teal-400";
  const inactiveLinkClass = "text-gray-500 dark:text-zinc-400";
  const linkClass = "flex flex-col items-center justify-center gap-1 w-full h-full";

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-zinc-950/70 backdrop-blur-lg border-t border-gray-200 dark:border-zinc-800 z-20">
      <div className="flex justify-around items-center h-16 max-w-2xl mx-auto px-2">
        <NavLink to="/home" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>
          {({ isActive }) => (<><HomeIcon isActive={isActive} /><span className="text-xs font-bold">الرئيسية</span></>)}
        </NavLink>
        <NavLink to="/watch" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>
          {({ isActive }) => (<><VideoIcon isActive={isActive} /><span className="text-xs font-bold">شاهد</span></>)}
        </NavLink>
        <NavLink to="/stores" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>
          {({ isActive }) => (<><StoreIcon isActive={isActive} /><span className="text-xs font-bold">المتاجر</span></>)}
        </NavLink>
        <NavLink to="/rentals" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>
          {({ isActive }) => (<><HouseIcon isActive={isActive} /><span className="text-xs font-bold">إيجار</span></>)}
        </NavLink>
        <NavLink to="/groups" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>
          {({ isActive }) => (<><GroupsIcon isActive={isActive} /><span className="text-xs font-bold">المجموعات</span></>)}
        </NavLink>
        <NavLink to="/search" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>
          {({ isActive }) => (<><SearchIcon isActive={isActive} /><span className="text-xs font-bold">بحث</span></>)}
        </NavLink>
      </div>
    </div>
  );
};

export default BottomNavBar;
