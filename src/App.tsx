import { Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { TabBar } from './components/TabBar';
import { Fab } from './components/Fab';
import { useSettings } from './hooks/useSettings';
import { useApplyTheme } from './hooks/useTheme';
import Dashboard from './pages/Dashboard';
import Log from './pages/Log';
import Trends from './pages/Trends';
import History from './pages/History';
import DayDetail from './pages/DayDetail';
import SettingsPage from './pages/Settings';

export default function App() {
  const settings = useSettings();
  useApplyTheme(settings.theme);
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);

  return (
    <>
      <main key={pathname} className="page mx-auto max-w-lg animate-fade-in px-4">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/log" element={<Log />} />
          <Route path="/trends" element={<Trends />} />
          <Route path="/history" element={<History />} />
          <Route path="/history/:day" element={<DayDetail />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </main>
      {pathname !== '/settings' && <Fab />}
      <TabBar />
    </>
  );
}
