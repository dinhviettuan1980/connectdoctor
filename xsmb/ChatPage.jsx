import React, { useState, useRef, useEffect } from 'react';
import apiClient from './utils/apiClient';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
}

function WeekdayStatsCard({ stats }) {
  return (
    <div className="mt-1">
      <div className="text-xs text-gray-500 mb-1.5">
        {stats.day_label}
        {stats.recent_date && (
          <span className="ml-1 text-gray-400">· KQ gần nhất: {formatDate(stats.recent_date)}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {stats.numbers.map(({ number, count, days_absent, is_recent }) => (
          <div
            key={number}
            className={`flex flex-col items-center rounded-lg px-3 py-1.5 border ${
              is_recent
                ? 'border-green-400 bg-green-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            <span className={`text-lg font-extrabold leading-none ${is_recent ? 'text-green-600' : 'text-gray-800'}`}>
              {number}
              {days_absent > 0 && (
                <sup className="text-red-500 text-[10px] font-bold ml-0.5">{days_absent}</sup>
              )}
            </span>
            <span className="text-[10px] text-gray-400 mt-0.5">{count} lần</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NumberStatsCard({ stats }) {
  const {
    number, days_absent, last_seen, max_absent,
    avg_cycle, total_appearances, best_weekdays, co_numbers, is_recently_hit,
  } = stats;

  const fmt = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}`;
  };

  return (
    <div className="mt-2 rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm text-sm">
      {/* Header */}
      <div className={`px-4 py-2.5 flex items-center gap-3 ${is_recently_hit ? 'bg-green-50' : 'bg-red-50'}`}>
        <span className={`text-3xl font-black ${is_recently_hit ? 'text-green-600' : 'text-red-600'}`}>{number}</span>
        <div>
          {is_recently_hit
            ? <div className="text-xs font-semibold text-green-600">Vừa về gần đây</div>
            : <div className="text-xs font-semibold text-red-600">Gan {days_absent} ngày{last_seen ? ` (lần cuối ${fmt(last_seen)})` : ''}</div>
          }
          {total_appearances > 0 && (
            <div className="text-xs text-gray-400">{total_appearances} lần xuất hiện trong lịch sử</div>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 divide-x divide-y divide-gray-100">
        <div className="px-3 py-2">
          <div className="text-[10px] text-gray-400 uppercase tracking-wide">Gan hiện tại</div>
          <div className="font-bold text-gray-800">{days_absent} ngày</div>
        </div>
        <div className="px-3 py-2">
          <div className="text-[10px] text-gray-400 uppercase tracking-wide">Kỷ lục gan</div>
          <div className="font-bold text-gray-800">{max_absent != null ? `${max_absent} ngày` : '—'}</div>
        </div>
        <div className="px-3 py-2">
          <div className="text-[10px] text-gray-400 uppercase tracking-wide">Chu kỳ TB</div>
          <div className="font-bold text-gray-800">{avg_cycle != null ? `${avg_cycle} ngày` : '—'}</div>
        </div>
        <div className="px-3 py-2">
          <div className="text-[10px] text-gray-400 uppercase tracking-wide">Hay về</div>
          <div className="font-bold text-gray-700 text-xs">
            {best_weekdays?.length > 0
              ? best_weekdays.map(w => `${w.day} (${w.count})`).join(', ')
              : '—'}
          </div>
        </div>
      </div>

      {/* Co-numbers */}
      {co_numbers?.length > 0 && (
        <div className="px-3 py-2 border-t border-gray-100">
          <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Hay về cùng</div>
          <div className="flex gap-1.5 flex-wrap">
            {co_numbers.map(n => (
              <span key={n} className="bg-gray-100 text-gray-700 font-semibold rounded-full px-2 py-0.5 text-xs">{n}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BotMessage({ text, weekday_stats, number_stats }) {
  return (
    <div className="space-y-1">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('•')) {
          const [label, nums] = line.slice(1).split('→');
          return (
            <div key={i} className="flex items-baseline gap-1 text-sm">
              <span className="text-gray-700">{label?.trim()}</span>
              {nums && (
                <>
                  <span className="text-gray-400 mx-1">→</span>
                  <span className="font-bold text-red-600">{nums.trim()}</span>
                </>
              )}
            </div>
          );
        }
        return <p key={i} className="text-sm">{line}</p>;
      })}
      {weekday_stats && <WeekdayStatsCard stats={weekday_stats} />}
      {number_stats && <NumberStatsCard stats={number_stats} />}
    </div>
  );
}

function ChatPage() {
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Xin chào! Bạn có thể hỏi:\n• Kết quả đề theo ngày\n• Số hay về thứ 2, thứ 3... hoặc hôm nay\n• Số theo giấc mơ (vd: "mơ thấy rắn")' }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');

    try {
      const res = await apiClient.post('/chat', { message: currentInput });
      const botReply = res.data.reply || `Đề ngày ${res.data.date} là ${res.data.de}`;
      setMessages(prev => [...prev, {
        role: 'bot',
        text: botReply,
        weekday_stats: res.data.weekday_stats || null,
        number_stats: res.data.number_stats || null,
      }]);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Lỗi hệ thống. Vui lòng thử lại.';
      setMessages(prev => [...prev, { role: 'bot', text: errorMsg }]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') sendMessage();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-md mx-auto bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
              msg.role === 'user'
                ? 'ml-auto bg-red-600 text-white rounded-br-sm'
                : 'mr-auto bg-gray-100 text-gray-800 rounded-bl-sm'
            }`}
          >
            {msg.role === 'bot'
              ? <BotMessage text={msg.text} weekday_stats={msg.weekday_stats} number_stats={msg.number_stats} />
              : msg.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-gray-200 flex gap-2 bg-white">
        <input
          type="text"
          placeholder="Nhập câu hỏi hoặc giấc mơ..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
        />
        <button
          onClick={sendMessage}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full text-sm font-semibold transition-colors"
        >
          Gửi
        </button>
      </div>
    </div>
  );
}

export default ChatPage;
