import React, { useState, useEffect, useRef, useMemo } from "react";
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useHeaderSlot } from './HeaderSlotContext';
import apiClient from './utils/apiClient';

function isAfter1815VN() {
  const now = new Date();
  const vnMinutes = (now.getUTCHours() * 60 + now.getUTCMinutes() + 7 * 60) % (24 * 60);
  return vnMinutes >= 18 * 60 + 15;
}

function HeadTailTable({ headToTail, tailToHead }) {
  const renderTable = (map, label1, label2) => (
    <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
      <table className="table-auto w-full text-sm border-collapse">
        <thead>
          <tr className="bg-red-700 text-white">
            <th className="px-3 py-2 text-center font-semibold">{label1}</th>
            <th className="px-3 py-2 text-center font-semibold">{label2}</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(map).map(([k, v], idx) => (
            <tr key={label1 + k} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="text-red-600 font-bold px-3 py-1.5 text-center border-b border-gray-100">{k}</td>
              <td className="px-3 py-1.5 text-center border-b border-gray-100 text-gray-700">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="mt-4">
      <div className="grid grid-cols-2 gap-3">
        {renderTable(headToTail, "Đầu", "Đuôi")}
        {renderTable(tailToHead, "Đuôi", "Đầu")}
      </div>
    </div>
  );
}

function Home() {
  const [date, setDate] = useState("");
  const [data, setData] = useState(null);
  const [ongPhongResult, setOngPhongResult] = useState(null);
  const [pascalPredictions, setPascalPredictions] = useState([]);
  const [longestAbsent, setLongestAbsent] = useState([]);
  const [ganThreshold, setGanThreshold] = useState(10);
  const [weekdayTop6, setWeekdayTop6] = useState([]);
  const [weekdayRecent, setWeekdayRecent] = useState(new Set());
  const [isLive, setIsLive] = useState(false);
  const { setSlot } = useHeaderSlot();
  const dateRef = useRef(date);
  const hasG0Ref = useRef(false);

  const getYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  };

  const getToday = () => new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const initialDate = isAfter1815VN() ? getToday() : getYesterday();
    setDate(initialDate);
    fetchData(initialDate);
  }, []);

  // Keep ref in sync so interval closure always has current date
  useEffect(() => { dateRef.current = date; }, [date]);

  // Check live status every minute; switch to today when it starts
  useEffect(() => {
    const check = () => {
      const live = isAfter1815VN();
      setIsLive(live);
      if (live) {
        const today = getToday();
        if (dateRef.current !== today) setDate(today);
      }
    };
    check();
    const t = setInterval(check, 60000);
    return () => clearInterval(t);
  }, []);

  // Poll every 30s during live — stops when g0 appears
  useEffect(() => {
    if (!isLive) return;
    const t = setInterval(() => {
      if (dateRef.current && !hasG0Ref.current) fetchData(dateRef.current);
    }, 500);
    return () => clearInterval(t);
  }, [isLive]);

  useEffect(() => {
    setSlot(
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="bg-white text-red-700 rounded-lg px-2 py-1 text-sm font-semibold focus:outline-none border-0 cursor-pointer"
      />
    );
    return () => setSlot(null);
  }, [date]);

  useEffect(() => {
    if (date) fetchData(date);
  }, [date]);

  const isValidG0 = (g0) => g0 && /^\d{5}$/.test(g0.trim());

  const fetchData = async (targetDate, isRetry = false) => {
    try {
      const baseUrl = process.env.REACT_APP_API_BASE;
      if (!targetDate) return;

      const phongRes = await apiClient.get(`${baseUrl}/api/cau-ong-phong`);
      setOngPhongResult(phongRes.data || null);

      const pascalRes = await apiClient.get(`${baseUrl}/api/cau-lo-pascal`);
      setPascalPredictions(pascalRes.data.predictions || []);

      const res = await apiClient.get(`/api/history?date=${targetDate}`);
      setData(res.data);

      if (isValidG0(res.data?.g0)) {
        hasG0Ref.current = true;
        setIsLive(false);
      } else if (!isRetry) {
        // Dữ liệu thiếu/sai → tự crawl lại 1 lần
        try {
          await apiClient.get(`${baseUrl}/crawl`);
          setTimeout(() => fetchData(targetDate, true), 3000);
        } catch (_) {}
      }

      const absentRes = await apiClient.get(`${baseUrl}/api/statistics/longest-absent?days=60`);
      setLongestAbsent(absentRes.data || []);

      // Weekday top 6 for today
      const jsDay = new Date().getDay();
      const vnDay = jsDay === 0 ? 8 : jsDay + 1;
      const [wdRes, wdRecentRes] = await Promise.all([
        apiClient.get(`${baseUrl}/api/statistics/by-weekday?days=365`),
        apiClient.get(`${baseUrl}/api/statistics/weekday-recent`),
      ]);
      const dayData = wdRes.data[vnDay] || {};
      const top6 = Object.entries(dayData)
        .map(([n, c]) => ({ number: n, count: c }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);
      setWeekdayTop6(top6);
      setWeekdayRecent(new Set(wdRecentRes.data[vnDay]?.numbers || []));
    } catch (err) {
      console.error("Lỗi lấy dữ liệu:", err);
    }
  };

  const absentMap = useMemo(() => {
    const m = {};
    longestAbsent.forEach(r => { m[r.number] = r.days_absent; });
    return m;
  }, [longestAbsent]);

  const renderCenteredRow = (label, numbers, perRow = null) => {
    if (!numbers || numbers.length === 0) return null;
    const split = perRow ? [numbers.slice(0, perRow), numbers.slice(perRow)] : [numbers];

    return split.map((row, rowIndex) => (
      <tr key={label + rowIndex} className="border-b border-gray-100">
        {rowIndex === 0 && (
          <td
            rowSpan={split.length}
            className="font-bold px-2 py-1.5 text-center align-middle bg-gray-50 border-r border-gray-200 text-gray-600 text-xs w-8"
          >
            {label}
          </td>
        )}
        <td colSpan="6" className="py-1.5 px-2">
          <div className="flex justify-center gap-1.5 flex-wrap">
            {row.map((num, idx) => (
              <div
                key={idx}
                className="min-w-[52px] text-center px-1.5 py-0.5 border border-gray-100 rounded-lg bg-white shadow-sm"
              >
                <span className="font-medium text-gray-600 text-sm">{num.slice(0, -2)}</span>
                <span className="text-red-600 font-bold text-sm">{num.slice(-2)}</span>
              </div>
            ))}
          </div>
        </td>
      </tr>
    ));
  };

  const getList = (str) => (str ? str.split(",") : []);

  return (
    <div>
      <Helmet>
        <title>XSMB - Tra cứu kết quả xổ số miền Bắc hôm nay</title>
        <meta name="description" content="Tra cứu kết quả xổ số miền Bắc (XSMB) hôm nay nhanh nhất, chính xác nhất." />
      </Helmet>

      {/* Cầu prediction cards */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Link to="/cau-lo" className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 block active:opacity-70">
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Cầu Ông Phong</div>
          {ongPhongResult ? (
            <div className="font-bold text-emerald-800 flex flex-wrap gap-x-2">
              {(ongPhongResult.predictions || []).map(n => (
                <span key={n} className="inline-flex items-baseline">
                  {n}
                  {absentMap[n] > 0 && <sup className="text-red-500 text-xs font-bold ml-0.5">{absentMap[n]}</sup>}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-gray-400 text-xs">Đang tải...</div>
          )}
        </Link>
        <Link to="/cau-lo" className="bg-red-50 border border-red-200 rounded-xl p-3 block active:opacity-70">
          <div className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Cầu Pascal</div>
          {pascalPredictions.length > 0 ? (
            <div className="font-bold text-red-700 flex flex-wrap gap-x-2">
              {pascalPredictions.map(n => (
                <span key={n} className="inline-flex items-baseline">
                  {n}
                  {absentMap[n] > 0 && <sup className="text-red-500 text-xs font-bold ml-0.5">{absentMap[n]}</sup>}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-gray-400 text-xs">Chưa có</div>
          )}
        </Link>
      </div>

      {/* Số hay ra theo thứ hôm nay */}
      {weekdayTop6.length > 0 && (
        <Link to="/weekday-stats" className="block mb-3 bg-amber-50 border border-amber-200 rounded-xl p-3 active:opacity-70">
          <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
            Hay về {['', '', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'][new Date().getDay() === 0 ? 8 : new Date().getDay() + 1]}
          </div>
          <div className="flex gap-2 flex-wrap">
            {weekdayTop6.map(({ number }) => {
              const hit = weekdayRecent.has(number);
              return (
                <span key={number} className={`inline-flex items-baseline font-bold text-sm rounded-full px-2 py-0.5 border ${hit ? 'text-green-600 bg-green-50 border-green-300' : 'text-gray-800 bg-white border-gray-200'}`}>
                  {number}
                  {absentMap[number] > 0 && <sup className="text-red-500 text-xs font-bold ml-0.5">{absentMap[number]}</sup>}
                </span>
              );
            })}
          </div>
        </Link>
      )}

      {/* Lô Gan */}
      <Link to="/longest-absent" className="block mb-3 bg-blue-50 border border-blue-200 rounded-xl p-3 active:opacity-70">
        <div className="flex items-center gap-2 mb-2">
          <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Lô Gan ≥</div>
          <select
            value={ganThreshold}
            onChange={e => { e.preventDefault(); e.stopPropagation(); setGanThreshold(Number(e.target.value)); }}
            onClick={e => e.stopPropagation()}
            className="border border-blue-200 rounded-lg px-2 py-0.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-700"
          >
            {[5, 7, 10, 14, 20, 25, 30].map(v => (
              <option key={v} value={v}>{v} ngày</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {longestAbsent.filter(item => item.days_absent >= ganThreshold).map((item, idx) => (
            <span
              key={idx}
              className="inline-flex items-baseline gap-0.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-full px-2 py-0.5 text-sm font-semibold"
            >
              {item.number}
              <sup className="text-red-500 text-xs font-bold">{item.days_absent}</sup>
            </span>
          ))}
          {longestAbsent.filter(item => item.days_absent >= ganThreshold).length === 0 && (
            <span className="text-xs text-gray-400">Không có số nào vắng ≥ {ganThreshold} ngày</span>
          )}
        </div>
      </Link>

      {/* Live indicator */}
      {isLive && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600" />
          </span>
          <span className="text-xs font-semibold text-red-700">Đang quay số – tự động cập nhật mỗi 0.5 giây</span>
        </div>
      )}

      {/* Lottery results table */}
      {data && (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="table-auto text-sm w-full bg-white border-collapse mx-auto">
              <tbody>
                {/* Special prize */}
                <tr className="border-b border-gray-100">
                  <td className="font-bold px-2 py-2 text-center bg-amber-50 border-r border-gray-200 text-amber-700 text-xs w-8">ĐB</td>
                  <td colSpan="6" className="text-center bg-amber-50 py-3">
                    <div className="inline-block bg-red-600 text-white text-2xl font-black px-5 py-1.5 rounded-xl shadow-md tracking-widest ring-2 ring-red-200">
                      {data.g0}
                    </div>
                  </td>
                </tr>
                {renderCenteredRow("1", getList(data.g1))}
                {renderCenteredRow("2", getList(data.g2))}
                {renderCenteredRow("3", getList(data.g3), 3)}
                {renderCenteredRow("4", getList(data.g4))}
                {renderCenteredRow("5", getList(data.g5), 3)}
                {renderCenteredRow("6", getList(data.g6))}
                {renderCenteredRow("7", getList(data.g7))}
              </tbody>
            </table>
          </div>

          {data.headToTail && data.tailToHead && (
            <HeadTailTable headToTail={data.headToTail} tailToHead={data.tailToHead} />
          )}
        </>
      )}
    </div>
  );
}

export default Home;
