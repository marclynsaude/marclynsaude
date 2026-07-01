
import React, { useEffect } from 'react';

interface SettingsPageProps {
  onNavigate: (path: string) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ onNavigate }) => {
  useEffect(() => {
    // Automatically redirect to the unified profile page
    onNavigate('/profile');
  }, [onNavigate]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full"></div>
    </div>
  );
};

export default SettingsPage;
