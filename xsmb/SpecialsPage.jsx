import React, { useEffect, useState } from "react";
import { Helmet } from 'react-helmet-async';
import apiClient from './utils/apiClient';

const weekdays = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"];

const formatShortDate = (dateStr) => {
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

function SpecialsPage() {
  const [grouped, setGrouped] = useState([]);

  useEffect(() => {
    const baseUrl = process.env.REACT_APP_API_BASE;
    apiClient.get(`${baseUrl}/api/specials/recent`).then(res => {
      const data = res.data;
      if (!data.length) return;

      const dateMap = new Map();
      data.forEach(item => dateMap.set(item.date, item));

      const dates = data.map(item => new Date(item.date));
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));

      const startDate = new Date(minDate);
      const day = startDate.getDay();
      const offset = day === 0 ? -6 : 1 - day;
      startDate.setDate(startDate.getDate() + offset);

      const weeks = [];
      let current = new Date(startDate);
      while (current <= maxDate) {
        const week = [];
        for (let i = 0; i < 7; i++) {
          const dateStr = current.toISOString().split('T')[0];
          week.push(dateMap.get(dateStr) || null);
          current.setDate(current.getDate() + 1);
        }
        weeks.push(week);
      }
      setGrouped(weeks);
    });
  }, []);

  return (
    <div>
      <Helmet>
        <title>Giải đặc biệt 2 tháng - XSMB</title>
        <meta name="description" content="Thống kê giải đặc biệt xổ số miền Bắc trong 2 tháng gần nhất." />
      </Helmet>
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="table-auto border-collapse bg-white text-sm w-full">
          <thead>
            <tr>
              {weekdays.map((day, idx) => (
                <th
                  key={day}
                  className={`px-2 py-2 text-center font-semibold text-xs whitespace-nowrap border-b border-gray-200 ${
                    idx === 6
                      ? 'bg-red-700 text-white'
                      : 'bg-red-700 text-white'
                  }`}
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grouped.map((week, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {week.map((item, j) => (
                  <td
                    key={j}
                    className={`border border-gray-100 px-1.5 py-1 text-center align-top min-w-[48px] ${
                      j === 6 ? 'bg-red-50' : ''
                    }`}
                  >
                    {item ? (
                      <div className="leading-tight">
                        <div className="font-bold tracking-wide">
                          <span className="text-gray-700">{item.number.slice(0, 3)}</span>
                          <span className="text-red-600">{item.number.slice(3)}</span>
                        </div>
                        <div className="text-gray-400 text-[10px] mt-0.5">{formatShortDate(item.date)}</div>
                      </div>
                    ) : (
                      <div className="text-gray-200">—</div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SpecialsPage;
