import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import apiClient from './utils/apiClient';

function FullStatisticPage() {
  const [days, setDays] = useState(30);
  const [result, setResult] = useState(null);
  const [sortType, setSortType] = useState('frequency');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchFullStats();
  }, [days]);

  const fetchFullStats = async () => {
    try {
      const baseUrl = process.env.REACT_APP_API_BASE;
      const response = await apiClient.get(`${baseUrl}/api/statistics/frequency-full`, {
        params: { days }
      });
      setResult(response.data);
    } catch (error) {
      console.error('Error fetching full stats:', error);
      alert('Không thể lấy dữ liệu thống kê.');
    }
  };

  const entries = result
    ? Object.entries(result).map(([num, count]) => ({ num, count }))
    : [];

  const sortedEntries = [...entries].sort((a, b) =>
    sortType === 'number' ? parseInt(a.num) - parseInt(b.num) : b.count - a.count
  );

  const maxValue = sortedEntries.length > 0 ? sortedEntries[0].count : 1;
  const total = sortedEntries.length;
  const hotThreshold = Math.floor(total * 0.1);
  const coldThreshold = Math.floor(total * 0.9);

  const filteredEntries = showAll
    ? sortedEntries
    : sortedEntries.filter((_, idx) => idx < hotThreshold || idx >= coldThreshold);

  return (
    <div>
      <Helmet>
        <title>Thống kê lô tổng quát - XSMB</title>
        <meta name="description" content="Thống kê tổng quát tần suất lô trong xổ số miền Bắc." />
      </Helmet>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select
          value={sortType}
          onChange={e => setSortType(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
        >
          <option value="frequency">Sắp theo tần suất giảm</option>
          <option value="number">Sắp theo số tăng</option>
        </select>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={days}
            onChange={e => setDays(e.target.value)}
            className="w-16 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-center bg-white"
          />
          <span className="text-sm text-gray-500">ngày</span>
        </div>
        <button
          onClick={fetchFullStats}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          Thống kê
        </button>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showAll}
            onChange={() => setShowAll(!showAll)}
            className="rounded accent-red-600 w-4 h-4"
          />
          Hiện tất cả 00–99
        </label>
      </div>

      {result && (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm mb-6">
            <table className="w-full text-sm border-collapse bg-white">
              <thead>
                <tr className="bg-red-700 text-white">
                  <th className="px-4 py-2 text-left font-semibold w-20">Số</th>
                  <th className="px-4 py-2 text-right font-semibold w-20">Lần</th>
                  <th className="px-4 py-2 text-left font-semibold">Tần suất</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map(({ num, count }, idx) => {
                  const isHot = idx < hotThreshold;
                  const isCold = idx >= coldThreshold;
                  const pct = Math.round((count / maxValue) * 100);
                  return (
                    <tr key={num} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 font-bold text-gray-800">
                        {num}
                        {isHot && <span className="ml-1 text-xs">🔥</span>}
                        {isCold && <span className="ml-1 text-xs">❄️</span>}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold text-gray-700">{count}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${isHot ? 'bg-red-500' : isCold ? 'bg-blue-400' : 'bg-amber-400'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 mb-4">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Biểu đồ tần suất</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={filteredEntries} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="num" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                />
                <Bar dataKey="count" fill="#dc2626" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

export default FullStatisticPage;
