import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import apiClient from './utils/apiClient';

function MaxAbsentStatsPage() {
  const [data, setData] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const baseUrl = process.env.REACT_APP_API_BASE;
        const res = await apiClient.get(`${baseUrl}/api/statistics/max-absent-all`);
        setData(res.data || []);
        if (res.data && res.data.length > 0) {
          setUpdatedAt(res.data[0].updated_at);
        }
      } catch (error) {
        console.error('Error fetching max absent stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    const raw = filter.trim();
    if (!raw) return data;
    const nums = raw.split(/[,\s]+/).map(n => n.trim().padStart(2, '0')).filter(n => /^\d{2}$/.test(n));
    if (nums.length === 0) return data;
    const set = new Set(nums);
    return data.filter(r => set.has(r.number));
  }, [data, filter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => b.max_days_absent - a.max_days_absent);
  }, [filtered]);

  return (
    <div>
      <Helmet>
        <title>Ngày vắng cực đại - XSMB</title>
        <meta name="description" content="Thống kê khoảng thời gian vắng mặt dài nhất của từng số lô 00-99." />
      </Helmet>

      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Lọc số, vd: 12, 45 89"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white w-48"
          />
          {filter && (
            <button
              onClick={() => setFilter('')}
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
        {updatedAt && (
          <p className="text-xs text-gray-400">Cập nhật lúc: {new Date(updatedAt).toLocaleString('vi-VN')}</p>
        )}
      </div>

      {loading && <p className="text-sm text-gray-500">Đang tải...</p>}

      {!loading && sorted.length === 0 && (
        <p className="text-sm text-gray-500">Chưa có dữ liệu. Dữ liệu được tính lúc 19h hàng ngày.</p>
      )}

      {!loading && sorted.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm border-collapse bg-white">
            <thead>
              <tr className="bg-red-700 text-white">
                <th className="px-4 py-2 text-center font-semibold">Số</th>
                <th className="px-4 py-2 text-center font-semibold">Ngày vắng cực đại</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(({ number, max_days_absent }, idx) => (
                <tr key={number} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2.5 text-center font-bold text-gray-800">{number}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                      max_days_absent >= 60
                        ? 'bg-purple-100 text-purple-700'
                        : max_days_absent >= 30
                          ? 'bg-orange-100 text-orange-700'
                          : max_days_absent >= 15
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-50 text-blue-600'
                    }`}>
                      {max_days_absent}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default MaxAbsentStatsPage;
