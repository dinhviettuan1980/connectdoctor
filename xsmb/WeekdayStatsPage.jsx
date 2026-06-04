import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import apiClient from './utils/apiClient';

const VN_DAYS = [
  { key: 2, label: 'Thứ 2' },
  { key: 3, label: 'Thứ 3' },
  { key: 4, label: 'Thứ 4' },
  { key: 5, label: 'Thứ 5' },
  { key: 6, label: 'Thứ 6' },
  { key: 7, label: 'Thứ 7' },
  { key: 8, label: 'CN' },
];

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
}

export default function WeekdayStatsPage() {
  const [days, setDays] = useState(365);
  const [data, setData] = useState(null);
  const [absentMap, setAbsentMap] = useState({});
  const [recentMap, setRecentMap] = useState({});
  const [selectedDay, setSelectedDay] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchData(); }, [days]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const baseUrl = process.env.REACT_APP_API_BASE;
      const [weekdayRes, absentRes, recentRes] = await Promise.all([
        apiClient.get(`${baseUrl}/api/statistics/by-weekday`, { params: { days } }),
        apiClient.get(`${baseUrl}/api/statistics/longest-absent`, { params: { days: 365 } }),
        apiClient.get(`${baseUrl}/api/statistics/weekday-recent`),
      ]);
      setData(weekdayRes.data);
      const amap = {};
      (absentRes.data || []).forEach(item => { amap[item.number] = item.days_absent; });
      setAbsentMap(amap);
      setRecentMap(recentRes.data || {});
      const jsDay = new Date().getDay();
      setSelectedDay(jsDay === 0 ? 8 : jsDay + 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Top 6 cho mỗi thứ (dùng cho grid tổng kết)
  const top6ByDay = useMemo(() => {
    if (!data) return {};
    const result = {};
    for (const d of VN_DAYS) {
      const dayData = data[d.key] || {};
      result[d.key] = Object.entries(dayData)
        .map(([number, count]) => ({ number, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);
    }
    return result;
  }, [data]);

  const topNumbers = useMemo(() => {
    if (!data || !selectedDay) return [];
    const dayData = data[selectedDay] || {};
    return Object.entries(dayData)
      .map(([number, count]) => ({ number, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }, [data, selectedDay]);

  const maxCount = topNumbers[0]?.count || 1;

  return (
    <div>
      <Helmet>
        <title>Thống kê theo thứ - XSMB</title>
      </Helmet>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          type="number"
          value={days}
          onChange={e => setDays(e.target.value)}
          className="w-16 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-center bg-white"
        />
        <span className="text-sm text-gray-500">ngày gần nhất</span>
        <button onClick={fetchData} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
          Lấy dữ liệu
        </button>
      </div>

      {data && (
        <>
          {/* Grid tổng kết 7 thứ */}
          <div className="mb-5 overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              {VN_DAYS.map(d => {
                const recent = recentMap[d.key];
                const recentSet = new Set(recent?.numbers || []);
                const nums = top6ByDay[d.key] || [];
                const isToday = (() => {
                  const jsDay = new Date().getDay();
                  return (jsDay === 0 ? 8 : jsDay + 1) === d.key;
                })();
                return (
                  <div
                    key={d.key}
                    onClick={() => setSelectedDay(d.key)}
                    className={`cursor-pointer rounded-xl border shadow-sm p-2.5 min-w-[80px] flex flex-col items-center gap-1.5 transition-colors ${
                      selectedDay === d.key
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 bg-white hover:border-red-300'
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <span className={`text-xs font-bold ${isToday ? 'text-red-600' : 'text-gray-600'}`}>
                        {d.label}
                      </span>
                      {recent?.date && (
                        <span className="text-[10px] text-gray-400">{formatDate(recent.date)}</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 w-full">
                      {nums.map(({ number }) => {
                        const hit = recentSet.has(number);
                        return (
                          <div
                            key={number}
                            className={`text-center text-sm font-bold rounded px-1 py-0.5 ${
                              hit
                                ? 'text-green-600 bg-green-50'
                                : 'text-gray-800'
                            }`}
                          >
                            {number}
                            {absentMap[number] > 0 && (
                              <sup className="text-red-500 text-[9px] font-bold ml-0.5">{absentMap[number]}</sup>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bộ lọc thứ */}
          <div className="flex gap-1.5 mb-4 flex-wrap">
            {VN_DAYS.map(d => (
              <button
                key={d.key}
                onClick={() => setSelectedDay(d.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  selectedDay === d.key
                    ? 'bg-red-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-red-400'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-sm text-gray-400">Đang tải...</p>
          ) : topNumbers.length === 0 ? (
            <p className="text-sm text-gray-400">Không có dữ liệu.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-red-700 text-white">
                    <th className="px-4 py-2 text-center font-semibold w-10">#</th>
                    <th className="px-4 py-2 text-center font-semibold w-16">Số</th>
                    <th className="px-4 py-2 text-left font-semibold">Tần suất</th>
                    <th className="px-4 py-2 text-center font-semibold w-16">Số lần</th>
                  </tr>
                </thead>
                <tbody>
                  {topNumbers.map(({ number, count }, idx) => {
                    const recent = recentMap[selectedDay];
                    const recentSet = new Set(recent?.numbers || []);
                    const hit = recentSet.has(number);
                    return (
                      <tr key={number} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 text-center text-gray-400 text-xs">{idx + 1}</td>
                        <td className="px-4 py-2 text-center font-bold">
                          <span className={`relative inline-block ${hit ? 'text-green-600' : 'text-gray-800'}`}>
                            {number}
                            {absentMap[number] > 0 && (
                              <sup className="text-red-500 text-xs font-bold ml-0.5">{absentMap[number]}</sup>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-100 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${hit ? 'bg-green-500' : 'bg-red-500'}`}
                                style={{ width: `${(count / maxCount) * 100}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className={`px-4 py-2 text-center font-semibold ${hit ? 'text-green-600' : 'text-red-600'}`}>
                          {count}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
