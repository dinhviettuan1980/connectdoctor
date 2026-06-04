import { useState, useRef, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import apiClient from './utils/apiClient';
import { HeaderSlotProvider, useHeaderSlot } from './HeaderSlotContext';
import Home from './Home';
import StatisticPage from './StatisticPage';
import FullStatisticPage from './FullStatisticPage';
import LongestAbsentPage from './LongestAbsentPage';
import CombinationAdvancedPage from './CombinationAdvancedPage';
import ClassifyPage from './ClassifyPage';
import SpecialsPage from './SpecialsPage';
import CombinationGeneratorPage from './CombinationGeneratorPage';
import CauLoPage from './CauLoPage';
import ServerInfo from './ServerInfo';
import Logs from './Logs';
import LogsByDevicePage from './LogsByDevicePage';
import ChatPage from './ChatPage';
import MaxAbsentStatsPage from './MaxAbsentStatsPage';
import NumerologyPage from './NumerologyPage';
import TarotPage from './TarotPage';
import WeekdayStatsPage from './WeekdayStatsPage';
import HeadTailPage from './HeadTailPage';
import AvgCyclePage from './AvgCyclePage';
import CoOccurrencePage from './CoOccurrencePage';
import './index.css';

function HeaderSlot() {
  const { slot } = useHeaderSlot();
  return slot ? <div className="ml-auto">{slot}</div> : null;
}

const PAGE_TITLES = {
  '/': 'Trang chủ',
  '/statistic': 'Thống kê lô theo số',
  '/full-statistic': 'Thống kê tổng quát',
  '/longest-absent': 'Số lâu vắng mặt',
  '/max-absent-stats': 'Ngày vắng cực đại',
  '/weekday-stats': 'Thống kê theo thứ',
  '/head-tail': 'Đầu đuôi nóng lạnh',
  '/avg-cycle': 'Chu kỳ trung bình',
  '/co-occurrence': 'Số về cùng nhau',
  '/combination-advanced': 'Tổ hợp đề 5 số',
  '/classify': 'Phân loại 2 chữ số',
  '/generate-combinations': 'Sinh tổ hợp nhóm',
  '/specials': 'Giải đặc biệt',
  '/cau-lo': 'Cầu Lô',
  '/numerology': 'Tư vấn số ngày sinh',
  '/tarot': 'Bốc bài may mắn',
  '/chat': 'Chat Mộng Mơ',
  '/server-info': 'Server Info',
  '/logs': 'Logs',
  '/logsbydevice': 'Logs by Device',
};

const NAV_ITEMS = [
  { label: '🏠 Trang chủ', path: '/' },
  { label: '📆 Thống kê theo thứ', path: '/weekday-stats' },
  { label: '📊 Thống kê lô theo số', path: '/statistic' },
  { label: '🧪 Tổ hợp đề 5 số', path: '/combination-advanced' },
  { label: '🎯 Sinh tổ hợp nhóm', path: '/generate-combinations' },
  { label: '🔎 Phân loại số 2 chữ số', path: '/classify' },
  { label: '💬 Chat Mộng Mơ', path: '/chat' },
  { label: '🔯 Tư vấn số ngày sinh', path: '/numerology' },
  { label: '🎴 Bốc bài may mắn', path: '/tarot' },
  { label: '🃏 Cầu Lô', path: '/cau-lo' },
  { label: '🔢 Thống kê lô tổng quát', path: '/full-statistic' },
  { label: '🕵️ Số lâu chưa xuất hiện', path: '/longest-absent' },
  { label: '📉 Ngày vắng cực đại', path: '/max-absent-stats' },
  { label: '🌡️ Đầu đuôi nóng lạnh', path: '/head-tail' },
  { label: '🔄 Chu kỳ trung bình', path: '/avg-cycle' },
  { label: '🤝 Số về cùng nhau', path: '/co-occurrence' },
  { label: '🏆 Giải đặc biệt 2 tháng', path: '/specials' },
  { label: '🖥️ Server Info', path: '/server-info' },
  { label: '📋 Logs', path: '/logs' },
  { label: '📱 Logs by Device', path: '/logsbydevice' },
];

function SettingsModal({ onClose, musicEnabled, setMusicEnabled }) {
  const [refreshState, setRefreshState] = useState('idle'); // idle | loading | done | error

  const handleRefresh = async () => {
    setRefreshState('loading');
    try {
      const baseUrl = process.env.REACT_APP_API_BASE;
      await apiClient.get(`${baseUrl}/api/history/bulk`);
      setRefreshState('done');
      setTimeout(() => setRefreshState('idle'), 3000);
    } catch {
      setRefreshState('error');
      setTimeout(() => setRefreshState('idle'), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-800 text-lg">Cài đặt</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 text-xl leading-none">×</button>
        </div>

        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <div>
            <div className="text-sm font-semibold text-gray-700">Nhạc nền</div>
            <div className="text-xs text-gray-400 mt-0.5">Phát nhạc nền khi dùng app</div>
          </div>
          <button
            onClick={() => setMusicEnabled(v => !v)}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${musicEnabled ? 'bg-red-600' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${musicEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>

        <div className="flex items-center justify-between py-3">
          <div>
            <div className="text-sm font-semibold text-gray-700">Cập nhật kết quả</div>
            <div className="text-xs text-gray-400 mt-0.5">Lấy lại 300 ngày gần nhất</div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshState === 'loading'}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              refreshState === 'done' ? 'bg-green-100 text-green-700' :
              refreshState === 'error' ? 'bg-red-100 text-red-700' :
              refreshState === 'loading' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
              'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            {refreshState === 'loading' ? 'Đang tải...' :
             refreshState === 'done' ? '✓ Xong' :
             refreshState === 'error' ? '✗ Lỗi' :
             'Cập nhật'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const audioRef = useRef(null);
  const location = useLocation();
  const pageTitle = PAGE_TITLES[location.pathname] || 'XSMB';

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (musicEnabled) {
      audio.play().catch(() => {
        const tryPlay = () => { audio.play().catch(() => {}); };
        document.addEventListener('click', tryPlay, { once: true });
        document.addEventListener('touchstart', tryPlay, { once: true });
      });
    } else {
      audio.pause();
    }
  }, [musicEnabled]);

  return (
    <div className="min-h-screen bg-slate-50">
      <audio ref={audioRef} src="/bg-music.mp3" loop preload="auto" />
      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          musicEnabled={musicEnabled}
          setMusicEnabled={setMusicEnabled}
        />
      )}

      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-red-700 text-white shadow-lg">
        <div className="marquee-wrapper" style={{ background: 'rgba(0,0,0,0.15)' }}>
          <div className="marquee-track">
            {[...Array(60)].map((_, i) => (
              <img key={i} src="/loto.jpg" alt="" />
            ))}
          </div>
        </div>
        <div className="flex items-center px-3 h-12 gap-2">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-lg hover:bg-red-600 active:bg-red-800 transition-colors flex-shrink-0"
            aria-label="Mở menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <span className="font-extrabold text-base tracking-wide flex-shrink-0">XSMB</span>
          <span className="text-red-200 text-xs truncate">· {pageTitle}</span>
          <HeaderSlot />
          <Link
            to="/chat"
            className="ml-auto p-1.5 rounded-lg hover:bg-red-600 active:bg-red-800 transition-colors flex-shrink-0 text-base leading-none"
            aria-label="Chat"
          >
            💬
          </Link>
          <button
            onClick={() => setMusicEnabled(v => !v)}
            className="p-1.5 rounded-lg hover:bg-red-600 active:bg-red-800 transition-colors flex-shrink-0 text-base leading-none"
            aria-label={musicEnabled ? 'Tắt nhạc' : 'Bật nhạc'}
          >
            {musicEnabled ? '🔊' : '🔇'}
          </button>
        </div>
      </header>

      {/* Sidebar overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-72 bg-gray-900 z-50 transform transition-transform duration-300 flex flex-col shadow-2xl
        ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 py-4 bg-red-700 flex-shrink-0">
          <div>
            <div className="font-extrabold text-white text-xl tracking-wider">XSMB</div>
            <div className="text-red-200 text-xs mt-0.5">Xổ số Miền Bắc</div>
          </div>
          <button
            onClick={() => setMenuOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-600 text-white transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_ITEMS.map(({ label, path }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center px-5 py-3 text-sm font-medium transition-colors border-l-[3px] ${
                  active
                    ? 'bg-red-900/40 text-white border-red-400'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white border-transparent'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex-shrink-0 border-t border-gray-700 py-2">
          <button
            onClick={() => { setSettingsOpen(true); setMenuOpen(false); }}
            className="flex items-center w-full px-5 py-3 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors border-l-[3px] border-transparent gap-2"
          >
            ⚙️ Cài đặt
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="px-3 py-4">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/statistic" element={<StatisticPage />} />
          <Route path="/full-statistic" element={<FullStatisticPage />} />
          <Route path="/longest-absent" element={<LongestAbsentPage />} />
          <Route path="/max-absent-stats" element={<MaxAbsentStatsPage />} />
          <Route path="/weekday-stats" element={<WeekdayStatsPage />} />
          <Route path="/head-tail" element={<HeadTailPage />} />
          <Route path="/avg-cycle" element={<AvgCyclePage />} />
          <Route path="/co-occurrence" element={<CoOccurrencePage />} />
          <Route path="/combination-advanced" element={<CombinationAdvancedPage />} />
          <Route path="/classify" element={<ClassifyPage />} />
          <Route path="/generate-combinations" element={<CombinationGeneratorPage />} />
          <Route path="/specials" element={<SpecialsPage />} />
          <Route path="/numerology" element={<NumerologyPage />} />
          <Route path="/tarot" element={<TarotPage />} />
          <Route path="/cau-lo" element={<CauLoPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/server-info" element={<ServerInfo />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/logsbydevice" element={<LogsByDevicePage />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <HeaderSlotProvider>
        <AppLayout />
      </HeaderSlotProvider>
    </Router>
  );
}

export default App;
