import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import BottomNavBar from './BottomNavBar';

const AppLayout: React.FC = () => {
  const location = useLocation();
  const isWatchScreen = location.pathname.startsWith('/watch');
  const isSalesAssistantScreen = location.pathname === '/sales-assistant';

  const hideBottomNav = isWatchScreen || isSalesAssistantScreen;

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-zinc-950">
      <main className={`flex-1 overflow-y-auto ${hideBottomNav ? 'pb-0' : 'pb-16'}`}>
        <Outlet />
      </main>
      {!hideBottomNav && <BottomNavBar />}
    </div>
  );
};

export default AppLayout;
