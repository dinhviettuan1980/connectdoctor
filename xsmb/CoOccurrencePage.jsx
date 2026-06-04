import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import apiClient from './utils/apiClient';

export default function CoOccurrencePage() {
  const [num, setNum] = useState('');
  const [days, setDays] = useState(90);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!num.trim()) return;
    setLoading(true);
    try {
      const baseUrl = process.env.REACT_APP_API_BASE;
      const res = await apiClient.get(`${baseUrl}/api/statistics/co-occurrence`, {
        params: { num: num.trim().padStart(2, '0'), days }
      });
      setResult(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const maxCount = result?.results?.[0]?.count || 1;

  return (
    <div>
      <Helmet>
        <title>Số về cùng nhau - XSMB</title>
      </Helmet>

      <div className="flex flex-wrap items-end gap-2 mb-5">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Số cần tra</label>
          <input
            type="text"
            value={num}
            onChange={e => setNum(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchData()}
            placeholder="VD: 42"
            maxLength={2}
            className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-red-500 bg-white font-bold"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Trong</label>
          <input
            type="number"
            value={days}
            onChange={e => setDays(e.target.value)}
            className="w-16 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-center bg-white"
          />
        </div>
        <span className="text-sm text-gray-500 pb-2">ngày</span>
        <button
          onClick={fetchData}
          disabled={!num.trim()}
          className="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors pb-2"
        >
          Tra cứu
        </button>
      </div>

      {loading && <p className="text-sm text-gray-400">Đang tính...</p>}

      {result && !loading && (
        <>
          <div className="mb-3 text-sm text-gray-600">
            Số <span className="font-bold text-red-600">{result.target}</span> xuất hiện{' '}
            <span className="font-bold">{result.targetDays}</span> lần trong {days} ngày.
            Các số hay ra cùng ngày:
          </div>

          {result.results.length === 0 ? (
            <p className="text-sm text-gray-400">Không đủ dữ liệu.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
              <table className="w-full text-sm border-collapse bg-white">
                <thead>
                  <tr className="bg-red-700 text-white">
                    <th className="px-4 py-2 text-center font-semibold w-10">#</th>
                    <th className="px-4 py-2 text-center font-semibold w-16">Số</th>
                    <th className="px-4 py-2 text-left font-semibold">Tần suất</th>
                    <th className="px-4 py-2 text-center font-semibold">Số lần</th>
                    <th className="px-4 py-2 text-center font-semibold">%</th>
                  </tr>
                </thead>
                <tbody>
                  {result.results.map(({ number, count, pct }, idx) => (
                    <tr key={number} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2.5 text-center text-gray-400 text-xs">{idx + 1}</td>
                      <td className="px-4 py-2.5 text-center font-bold text-gray-800">{number}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div className="bg-red-500 h-2 rounded-full" style={{ width: `${(count / maxCount) * 100}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center font-semibold text-red-600">{count}</td>
                      <td className="px-4 py-2.5 text-center text-gray-500 text-xs">{pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
