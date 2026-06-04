import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from "./Home";
import StatisticPage from "./StatisticPage";
import FullStatisticPage from "./FullStatisticPage";
import LongestAbsentPage from "./LongestAbsentPage";
import CombinationAdvancedPage from "./CombinationAdvancedPage";
import ClassifyPage from "./ClassifyPage";
import SpecialsPage from "./SpecialsPage";
import CombinationGeneratorPage from "./CombinationGeneratorPage"; // THÊM
import "./index.css";

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pages = [
    { label: "📅 Tra cứu theo ngày", path: "/" },
    { label: "📊 Thống kê lô theo số", path: "/statistic" },
    { label: "🔢 Thống kê lô tổng quát", path: "/full-statistic" },
    { label: "🕵️ Số lâu chưa xuất hiện", path: "/longest-absent" },
    { label: "🔀 Tổ hợp nâng cao", path: "/combination-advanced" },
    { label: "🧮 Phân loại 2 chữ số", path: "/classify" },
    { label: "🏆 Giải đặc biệt", path: "/specials" },
    { label: "🛠️ Sinh tổ hợp (new)", path: "/generate-combinations" }, // THÊM MỤC MỚI
  ];

  return (
    <Router>
      <div className="min-h-screen relative bg-gray-50">
        {/* Sidebar */}
        <aside
          className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-50 transform transition-transform duration-300
            ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="p-4 text-xl font-bold border-b">📋 Menu</div>
          <ul className="p-4 space-y-3">
            {pages.map(({ label, path }) => (
              <li key={path}>
                <Link
                  to={path}
                  onClick={() => setMenuOpen(false)}
                  className="block hover:text-blue-600"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        {/* Overlay */}
        {menuOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-40 z-40"
            onClick={() => setMenuOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="p-4">
          <button
            className="text-2xl mb-4"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            ☰
          </button>

          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/statistic" element={<StatisticPage />} />
            <Route path="/full-statistic" element={<FullStatisticPage />} />
            <Route path="/longest-absent" element={<LongestAbsentPage />} />
            <Route path="/combination-advanced" element={<CombinationAdvancedPage />} />
            <Route path="/classify" element={<ClassifyPage />} />
            <Route path="/specials" element={<SpecialsPage />} />
            <Route path="/generate-combinations" element={<CombinationGeneratorPage />} /> {/* THÊM ROUTE */}
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
