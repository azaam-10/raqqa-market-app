import React from 'react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gray-50 dark:bg-zinc-950 p-4">
      <div className="w-full" style={{ maxWidth: '420px' }}>
        {children}
      </div>
    </div>
  );
};

export default Layout;
