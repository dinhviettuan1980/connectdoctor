import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import apiClient from './utils/apiClient';

function StatisticPage() {
  const [numbers, setNumbers] = useState('');
  const [days, setDays] = useState(30);
  const [result, setResult] = useState(null);
  const [expandedNumbers, setExpandedNumbers] = useState([]);
  const [missingStreaks, setMissingStreaks] = useState({});

  const expandInputNumbers = (raw) => {
    const rawList = raw.split(',').map(s => s.trim()).filter(Boolean);
    const resultSet = new Set();
    rawList.forEach(n => {
      if (n.length === 2) resultSet.add(n);
      else if (n.length === 3) {
        resultSet.add(n.slice(0, 2));
        resultSet.add(n.slice(1));
      }
    });
    return Array.from(resultSet);
  };

  const computeMissingStreaks = (data, nums) => {
    const streaks = {};
    nums.forEach(num => {
      let streak = 0;
      for (const date of Object.keys(data)) {
        const val = data[date][num] ?? 0;
        if (val === 0) streak += 1;
        else break;
      }
      streaks[num] = streak;
    });
    return streaks;
  };

  const fetchStats = async () => {
    if (!numbers || !days) return;
    try {
      const baseUrl = process.env.REACT_APP_API_BASE;
      const response = await apiClient.get(`${baseUrl}/api/statistics/frequency`, {
        params: { days, numbers }
      });
      const expanded = expandInputNumbers(numbers);
      setExpandedNumbers(expanded);
      const sortedResult = Object.fromEntries(
        Object.entries(response.data).sort((a, b) => new Date(b[0]) - new Date(a[0]))
      );
      setResult(sortedResult);
      setMissingStreaks(computeMissingStreaks(sortedResult, expanded));
    } catch (error) {
      console.error('Error fetching stats:', error);
      alert('Không thể lấy dữ liệu');
    }
  };

  return (
    <div>
      <Helmet>
        <title>Thống kê lô theo số - XSMB</title>
        <meta name="description" content="Thống kê tần suất xuất hiện lô theo từng số trong xổ số miền Bắc (XSMB)." />
      </Helmet>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder="Nhập các số, ví dụ: 121,565,17"
          value={numbers}
          onChange={e => setNumbers(e.target.value)}
          className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
        />
        <input
          type="number"
          placeholder="Ngày"
          value={days}
          onChange={e => setDays(e.target.value)}
          className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-center bg-white"
        />
        <button
          onClick={fetchStats}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          Tìm kiếm
        </button>
      </div>

      {result && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="table-auto w-full text-sm border-collapse bg-white">
            <thead>
              <tr className="bg-red-700 text-white">
                <th className="px-3 py-2 font-semibold text-left whitespace-nowrap">Ngày</th>
                {expandedNumbers.map(num => (
                  <th key={num} className="px-3 py-2 font-semibold text-center relative">
                    <span className="absolute top-0.5 right-0.5 text-red-300 text-[10px] font-bold leading-none">
                      {missingStreaks[num] > 0 ? missingStreaks[num] : ''}
                    </span>
                    {num}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(result).map(([date, data], rowIdx) => (
                <tr key={date} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-3 py-2 font-medium text-gray-500 whitespace-nowrap">
                    {new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                  </td>
                  {expandedNumbers.map(num => {
                    const val = data[num] ?? 0;
                    return (
                      <td key={num} className={`px-3 py-2 text-center font-bold ${val > 0 ? 'text-red-600' : 'text-gray-200'}`}>
                        {val > 0 ? val : '·'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default StatisticPage;
