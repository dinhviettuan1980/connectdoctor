import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import apiClient from './utils/apiClient';

export default function AvgCyclePage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('avg_cycle');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const baseUrl = process.env.REACT_APP_API_BASE;
        const res = await apiClient.get(`${baseUrl}/api/statistics/avg-cycle`);
        setData(res.data || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      if (sortBy === 'avg_cycle') {
        if (a.avg_cycle === null) return 1;
        if (b.avg_cycle === null) return -1;
        return a.avg_cycle - b.avg_cycle;
      }
      if (sortBy === 'appearances') return b.appearances - a.appearances;
      return a.number.localeCompare(b.number);
    });
  }, [data, sortBy]);

  const cycleColor = (cycle) => {
    if (cycle === null) return 'bg-gray-100 text-gray-400';
    if (cycle <= 5) return 'bg-green-100 text-green-700';
    if (cycle <= 8) return 'bg-blue-50 text-blue-600';
    if (cycle <= 12) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div>
      <Helmet>
        <title>Chu kỳ trung bình - XSMB</title>
      </Helmet>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-sm text-gray-500">Sắp xếp theo:</span>
        {[
          { key: 'avg_cycle', label: 'Chu kỳ ↑' },
          { key: 'appearances', label: 'Số lần ra ↓' },
          { key: 'number', label: 'Số' },
        ].map(opt => (
          <button
            key={opt.key}
            onClick={() => setSortBy(opt.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              sortBy === opt.key ? 'bg-red-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="text-xs text-gray-400 mb-3 flex gap-4 flex-wrap">
        <span><span className="inline-block w-3 h-3 rounded bg-green-100 mr-1"/>≤5 ngày: rất hay ra</span>
        <span><span className="inline-block w-3 h-3 rounded bg-blue-50 mr-1"/>6-8 ngày: hay ra</span>
        <span><span className="inline-block w-3 h-3 rounded bg-amber-100 mr-1"/>9-12 ngày: bình thường</span>
        <span><span className="inline-block w-3 h-3 rounded bg-red-100 mr-1"/>&gt;12 ngày: ít ra</span>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Đang tải...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm border-collapse bg-white">
            <thead>
              <tr className="bg-red-700 text-white">
                <th className="px-4 py-2 text-center font-semibold">Số</th>
                <th className="px-4 py-2 text-center font-semibold">Chu kỳ TB (ngày)</th>
                <th className="px-4 py-2 text-center font-semibold">Số lần ra</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(({ number, avg_cycle, appearances }, idx) => (
                <tr key={number} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2.5 text-center font-bold text-gray-800">{number}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${cycleColor(avg_cycle)}`}>
                      {avg_cycle !== null ? avg_cycle : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center text-gray-600">{appearances}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
