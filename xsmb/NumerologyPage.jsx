import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';

const NUMBER_INFO = {
  1: { name: 'Số 1 – Khởi đầu', desc: 'Lãnh đạo, độc lập, năng động' },
  2: { name: 'Số 2 – Cân bằng', desc: 'Hợp tác, nhạy cảm, hòa bình' },
  3: { name: 'Số 3 – Sáng tạo', desc: 'Vui vẻ, biểu đạt, lạc quan' },
  4: { name: 'Số 4 – Ổn định', desc: 'Cần cù, kỷ luật, thực tế' },
  5: { name: 'Số 5 – Tự do', desc: 'Linh hoạt, thay đổi, phiêu lưu' },
  6: { name: 'Số 6 – Yêu thương', desc: 'Trách nhiệm, chăm sóc, hài hòa' },
  7: { name: 'Số 7 – Trí tuệ', desc: 'Suy nghĩ sâu, tâm linh, phân tích' },
  8: { name: 'Số 8 – Thành công', desc: 'Tham vọng, vật chất, quyền lực' },
  9: { name: 'Số 9 – Viên mãn', desc: 'Nhân ái, hoàn thành, rộng lượng' },
};

// Cặp số lô có tổng 2 chữ số = n
const LUCKY_PAIRS = {
  1: ['01', '10'],
  2: ['02', '11', '20'],
  3: ['03', '12', '21', '30'],
  4: ['04', '13', '22', '31', '40'],
  5: ['05', '14', '23', '32', '41', '50'],
  6: ['06', '15', '24', '33', '42', '51', '60'],
  7: ['07', '16', '25', '34', '43', '52', '61', '70'],
  8: ['08', '17', '26', '35', '44', '53', '62', '71', '80'],
  9: ['09', '18', '27', '36', '45', '54', '63', '72', '81', '90'],
};

function digitSum(n) {
  return String(Math.abs(n)).split('').reduce((a, b) => a + parseInt(b), 0);
}

function reduce(n) {
  while (n > 9) n = digitSum(n);
  return n;
}

function lifePathNumber(dob) {
  return reduce(digitSum(dob.getDate()) + digitSum(dob.getMonth() + 1) + digitSum(dob.getFullYear()));
}

function personalYear(dob, today) {
  return reduce(digitSum(dob.getDate()) + digitSum(dob.getMonth() + 1) + digitSum(today.getFullYear()));
}

function personalMonth(dob, today) {
  return reduce(personalYear(dob, today) + today.getMonth() + 1);
}

function personalDay(dob, today) {
  return reduce(personalMonth(dob, today) + today.getDate());
}

function NumberCard({ label, number, pairs, highlight }) {
  const info = NUMBER_INFO[number];
  return (
    <div className={`rounded-xl border p-4 ${highlight ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
        {highlight && <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">Hôm nay</span>}
      </div>
      <div className={`text-3xl font-extrabold mb-1 ${highlight ? 'text-red-600' : 'text-gray-800'}`}>{number}</div>
      {info && (
        <>
          <div className="text-sm font-semibold text-gray-700">{info.name}</div>
          <div className="text-xs text-gray-500 mb-3">{info.desc}</div>
        </>
      )}
      <div className="flex flex-wrap gap-1.5">
        {pairs.map(p => (
          <span
            key={p}
            className={`px-2.5 py-1 rounded-lg text-sm font-bold ${
              highlight ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {p}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function NumerologyPage() {
  const [dd, setDd] = useState('');
  const [mm, setMm] = useState('');
  const [yyyy, setYyyy] = useState('');
  const [result, setResult] = useState(null);
  const mmRef = React.useRef();
  const yyyyRef = React.useRef();

  const isValid = dd && mm && yyyy && yyyy.length === 4;

  const compute = () => {
    if (!isValid) return;
    const dobDate = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
    if (isNaN(dobDate.getTime())) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lp = lifePathNumber(dobDate);
    const py = personalYear(dobDate, today);
    const pm = personalMonth(dobDate, today);
    const pd = personalDay(dobDate, today);
    setResult({ lp, py, pm, pd, today });
  };

  const handleDd = e => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 2);
    setDd(v); setResult(null);
    if (v.length === 2) mmRef.current?.focus();
  };
  const handleMm = e => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 2);
    setMm(v); setResult(null);
    if (v.length === 2) yyyyRef.current?.focus();
  };
  const handleYyyy = e => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 4);
    setYyyy(v); setResult(null);
  };

  const inputCls = "w-12 border border-gray-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-red-500 bg-white font-semibold";

  return (
    <div>
      <Helmet>
        <title>Tư vấn số theo ngày sinh - XSMB</title>
        <meta name="description" content="Tra cứu số may mắn hôm nay theo thần số học từ ngày tháng năm sinh." />
      </Helmet>

      <div className="flex flex-wrap items-end gap-3 mb-6">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Ngày sinh</label>
          <div className="flex items-center gap-1">
            <input inputMode="numeric" placeholder="DD" value={dd} onChange={handleDd} className={inputCls} />
            <span className="text-gray-400 font-bold">/</span>
            <input inputMode="numeric" placeholder="MM" value={mm} onChange={handleMm} ref={mmRef} className={inputCls} />
            <span className="text-gray-400 font-bold">/</span>
            <input inputMode="numeric" placeholder="YYYY" value={yyyy} onChange={handleYyyy} ref={yyyyRef} className="w-16 border border-gray-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-red-500 bg-white font-semibold" onKeyDown={e => e.key === 'Enter' && compute()} />
          </div>
        </div>
        <button
          onClick={compute}
          disabled={!isValid}
          className="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          Tư vấn
        </button>
      </div>

      {result && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400">
            Ngày tư vấn: {result.today.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <NumberCard
            label="Số ngày cá nhân"
            number={result.pd}
            pairs={LUCKY_PAIRS[result.pd]}
            highlight
          />
          <NumberCard
            label="Số tháng cá nhân"
            number={result.pm}
            pairs={LUCKY_PAIRS[result.pm]}
          />
          <NumberCard
            label="Số năm cá nhân"
            number={result.py}
            pairs={LUCKY_PAIRS[result.py]}
          />
          <NumberCard
            label="Số đường đời"
            number={result.lp}
            pairs={LUCKY_PAIRS[result.lp]}
          />

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
            <strong>Lưu ý:</strong> Số ngày cá nhân là chỉ số quan trọng nhất, thay đổi mỗi ngày và phản ánh năng lượng trong ngày hôm nay. Các cặp số tương ứng là những cặp có tổng 2 chữ số bằng số cá nhân đó.
          </div>
        </div>
      )}
    </div>
  );
}
