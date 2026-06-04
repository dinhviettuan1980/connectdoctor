import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import apiClient from './utils/apiClient';

function LongestAbsentPage() {
  const [days, setDays] = useState(30);
  const [result, setResult] = useState([]);
  const [maxAbsentMap, setMaxAbsentMap] = useState({});

  useEffect(() => {
    fetchData();
  }, [days]);

  const fetchData = async () => {
    try {
      const baseUrl = process.env.REACT_APP_API_BASE;
      const [res, maxRes] = await Promise.all([
        apiClient.get(`${baseUrl}/api/statistics/longest-absent`, { params: { days } }),
        apiClient.get(`${baseUrl}/api/statistics/max-absent-all`),
      ]);
      setResult(res.data);
      const map = {};
      (maxRes.data || []).forEach(r => { map[r.number] = r.max_days_absent; });
      setMaxAbsentMap(map);
    } catch (error) {
      console.error('Error fetching longest absent numbers:', error);
      alert('Không thể lấy dữ liệu.');
    }
  };

  return (
    <div>
      <Helmet>
        <title>Số lâu chưa xuất hiện - XSMB</title>
        <meta name="description" content="Tra cứu những con số lâu chưa xuất hiện trong xổ số miền Bắc." />
      </Helmet>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          type="number"
          value={days}
          onChange={e => setDays(e.target.value)}
          className="w-16 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-center bg-white"
        />
        <span className="text-sm text-gray-500">ngày</span>
        <button
          onClick={fetchData}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          Lấy danh sách
        </button>
      </div>

      {result.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm border-collapse bg-white">
            <thead>
              <tr className="bg-red-700 text-white">
                <th className="px-4 py-2 text-center font-semibold">Số</th>
                <th className="px-4 py-2 text-center font-semibold">Xuất hiện gần nhất</th>
                <th className="px-4 py-2 text-center font-semibold">Ngày vắng</th>
                <th className="px-4 py-2 text-center font-semibold">Ngày vắng cực đại</th>
              </tr>
            </thead>
            <tbody>
              {result.map(({ number, last_seen, days_absent }, idx) => {
                const maxAbsent = maxAbsentMap[number] ?? null;
                return (
                  <tr key={number} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-2.5 text-center font-bold text-gray-800">{number}</td>
                    <td className="px-4 py-2.5 text-center text-gray-500">
                      {last_seen
                        ? new Date(last_seen).toLocaleDateString('vi-VN')
                        : <span className="text-gray-300">Chưa xuất hiện</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                        days_absent >= 20
                          ? 'bg-red-100 text-red-700'
                          : days_absent >= 10
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-50 text-blue-600'
                      }`}>
                        {days_absent}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {maxAbsent !== null
                        ? <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                            maxAbsent >= 60
                              ? 'bg-purple-100 text-purple-700'
                              : maxAbsent >= 30
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-gray-100 text-gray-600'
                          }`}>{maxAbsent}</span>
                        : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default LongestAbsentPage;
