import React, { useState } from "react";
import { Helmet } from 'react-helmet-async';
import { CopyToClipboard } from "react-copy-to-clipboard";
import apiClient from './utils/apiClient';

function CombinationAdvancedPage() {
  const [input, setInput] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [result, setResult] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    const digits = input.trim();
    if (digits.length < 3 || digits.length > 5) {
      setResult(null);
      setError("Vui lòng nhập từ 3 đến 5 chữ số.");
      return;
    }
    setError("");
    const baseUrl = process.env.REACT_APP_API_BASE;
    const base = baseUrl + "/api";
    const url = from && to ? `${base}/combination-advanced` : `${base}/combination`;
    const params = { number: digits };
    if (from && to) {
      params.swapFrom = from;
      params.swapTo = to;
    }
    try {
      const res = await apiClient.get(url, { params });
      setResult(res.data);
    } catch (err) {
      setError("Lỗi khi gọi API.");
      console.error(err);
    }
  };

  const LABELS = {
    "2_digit_combinations": "2 chữ số",
    "3_digit_combinations": "3 chữ số",
    "4_digit_combinations": "4 chữ số",
  };

  return (
    <div>
      <Helmet>
        <title>Tổ hợp đề 5 số - XSMB</title>
        <meta name="description" content="Công cụ tạo tổ hợp đề 5 số nâng cao cho xổ số miền Bắc." />
      </Helmet>
      <h2 className="text-base font-bold text-gray-800 mb-4">Tổ hợp đề 5 số</h2>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Nhập số (3–5 chữ)"
          className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
        />
        <input
          value={from}
          onChange={e => setFrom(e.target.value)}
          placeholder="Từ"
          className="w-16 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-center bg-white"
        />
        <input
          value={to}
          onChange={e => setTo(e.target.value)}
          placeholder="Thành"
          className="w-16 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 text-center bg-white"
        />
        <button
          onClick={handleSubmit}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          Tạo tổ hợp
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg mb-3">
          {error}
        </div>
      )}

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          {["2_digit_combinations", "3_digit_combinations", "4_digit_combinations"].map((key) => {
            const list = result[key];
            if (!Array.isArray(list)) return null;
            return (
              <div key={key} className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
                <div className="font-semibold text-gray-700 mb-2">{LABELS[key]}</div>
                <div className="text-gray-500 break-words text-xs leading-relaxed mb-2">{list.join(", ")}</div>
                <div className="flex items-center gap-2">
                  <CopyToClipboard text={list.join(", ")} onCopy={() => setCopiedKey(key)}>
                    <button className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1 rounded-lg text-xs font-medium transition-colors">
                      📋 Copy
                    </button>
                  </CopyToClipboard>
                  {copiedKey === key && (
                    <span className="text-green-600 text-xs font-medium">Đã sao chép!</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CombinationAdvancedPage;
