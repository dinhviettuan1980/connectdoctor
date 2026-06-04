import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import apiClient from './utils/apiClient';

function Bar({ value, max, color }) {
  return (
    <div className="flex-1 bg-gray-100 rounded-full h-3">
      <div
        className={`h-3 rounded-full ${color}`}
        style={{ width: `${Math.round((value / max) * 100)}%` }}
      />
    </div>
  );
}

export default function HeadTailPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);

  useEffect(() => { fetchData(); }, [days]);

  const fetchData = async () => {
    try {
      const baseUrl = process.env.REACT_APP_API_BASE;
      const res = await apiClient.get(`${baseUrl}/api/statistics/head-tail`, { params: { days } });
      setData(res.data);
    } catch (e) { console.error(e); }
  };

  const maxHead = data ? Math.max(...data.heads) : 1;
  const maxTail = data ? Math.max(...data.tails) : 1;
  const maxDouble = data ? Math.max(...data.doubles.map(d => d.count), 1) : 1;

  return (
    <div>
      <Helmet>
        <title>Đầu đuôi nóng lạnh - XSMB</title>
      </Helmet>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        <input
          type="number" value={days}
          onChange={e => setDays(e.target.value)}
          className="w-16 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-center bg-white"
        />
        <span className="text-sm text-gray-500">ngày gần nhất</span>
        <button onClick={fetchData} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
          Lấy dữ liệu
        </button>
      </div>

      {data && (
        <div className="space-y-5">
          {/* Đầu số */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h2 className="text-sm font-bold text-gray-700 mb-3">Đầu số nóng lạnh (chữ số hàng chục)</h2>
            <div className="space-y-2">
              {data.heads.map((count, digit) => (
                <div key={digit} className="flex items-center gap-3">
                  <span className="w-6 text-center font-bold text-gray-700 text-sm">{digit}</span>
                  <Bar value={count} max={maxHead} color="bg-red-500" />
                  <span className="w-10 text-right text-sm font-semibold text-red-600">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Đuôi số */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h2 className="text-sm font-bold text-gray-700 mb-3">Đuôi số nóng lạnh (chữ số hàng đơn vị)</h2>
            <div className="space-y-2">
              {data.tails.map((count, digit) => (
                <div key={digit} className="flex items-center gap-3">
                  <span className="w-6 text-center font-bold text-gray-700 text-sm">{digit}</span>
                  <Bar value={count} max={maxTail} color="bg-blue-500" />
                  <span className="w-10 text-right text-sm font-semibold text-blue-600">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Lô kép */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h2 className="text-sm font-bold text-gray-700 mb-3">Lô kép (00, 11, 22... 99)</h2>
            <div className="space-y-2">
              {data.doubles.map(({ number, count }) => (
                <div key={number} className="flex items-center gap-3">
                  <span className="w-8 text-center font-bold text-gray-700 text-sm">{number}</span>
                  <Bar value={count} max={maxDouble} color="bg-purple-500" />
                  <span className="w-10 text-right text-sm font-semibold text-purple-600">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
