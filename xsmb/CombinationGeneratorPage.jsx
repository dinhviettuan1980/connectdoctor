import React, { useState } from "react";
import { Helmet } from 'react-helmet-async';
import { CopyToClipboard } from "react-copy-to-clipboard";
import apiClient from './utils/apiClient';

const GROUPS = [
  "chan_chan", "le_le", "chan_le", "le_chan", "kep_bang",
  "to_to", "be_be", "to_be", "be_to",
  "tong_0", "tong_1", "tong_2", "tong_3", "tong_4",
  "tong_5", "tong_6", "tong_7", "tong_8", "tong_9"
];

function CombinationGeneratorPage() {
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [cang3, setCang3] = useState("");
  const [cang4, setCang4] = useState("");
  const [additionalNumbers, setAdditionalNumbers] = useState("");
  const [results, setResults] = useState([]);
  const [copied, setCopied] = useState(false);

  const toggleGroup = (g) => {
    setSelectedGroups(prev =>
      prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
    );
  };

  const handleGenerate = async () => {
    let allResults = [];
    for (const group of selectedGroups) {
      try {
        const payload = { group };
        if (cang3 !== "") payload.cang3 = parseInt(cang3);
        if (cang4 !== "") payload.cang4 = parseInt(cang4);
        const baseUrl = process.env.REACT_APP_API_BASE;
        const res = await apiClient.post(`${baseUrl}/api/generate-combinations`, payload);
        const groupResults = res.data.map(r => r.fourDigit || r.threeDigit || r.twoDigit);
        allResults = allResults.concat(groupResults);
      } catch (error) {
        console.error(`Error generating for group ${group}:`, error);
      }
    }
    if (additionalNumbers.trim() !== "") {
      const manualNumbers = additionalNumbers.split(",").map(x => x.trim()).filter(Boolean);
      manualNumbers.forEach(num => {
        if (cang4 !== "") allResults.push(`${cang4}${cang3}${num}`);
        else if (cang3 !== "") allResults.push(`${cang3}${num}`);
        else allResults.push(num);
      });
    }
    setResults(Array.from(new Set(allResults)));
  };

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      <Helmet>
        <title>Sinh tổ hợp nhóm - XSMB</title>
        <meta name="description" content="Công cụ sinh tổ hợp theo nhóm số cho xổ số miền Bắc." />
      </Helmet>

      <div className="mb-4">
        <label className="block mb-2 text-sm font-semibold text-gray-700">Chọn nhóm:</label>
        <div className="grid grid-cols-2 gap-1 border border-gray-200 rounded-xl p-3 bg-gray-50">
          {GROUPS.map((g) => {
            const checked = selectedGroups.includes(g);
            return (
              <label
                key={g}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-sm transition-colors ${
                  checked ? 'bg-white shadow-sm' : 'hover:bg-white'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleGroup(g)}
                  className="accent-red-600 w-4 h-4 flex-shrink-0"
                />
                <span className={checked ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                  {g}
                </span>
              </label>
            );
          })}
        </div>
        {selectedGroups.length > 0 && (
          <div className="mt-1.5 text-xs text-gray-400">
            Đã chọn: <span className="text-red-600 font-semibold">{selectedGroups.join(", ")}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block mb-1.5 text-sm font-semibold text-gray-700">Càng 3 (tuỳ chọn)</label>
          <input
            type="number"
            value={cang3}
            onChange={(e) => setCang3(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
            placeholder="Nhập số càng 3"
          />
        </div>
        <div>
          <label className="block mb-1.5 text-sm font-semibold text-gray-700">Càng 4 (tuỳ chọn)</label>
          <input
            type="number"
            value={cang4}
            onChange={(e) => setCang4(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
            placeholder="Nhập số càng 4"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block mb-1.5 text-sm font-semibold text-gray-700">Nhập thêm số (phân cách bằng dấu phẩy)</label>
        <input
          type="text"
          value={additionalNumbers}
          onChange={(e) => setAdditionalNumbers(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
          placeholder="VD: 01,34,68"
        />
      </div>

      <button
        onClick={handleGenerate}
        className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
      >
        🎯 Sinh kết quả
      </button>

      {results.length > 0 && (
        <div className="mt-5 bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
          <div className="text-sm font-semibold text-gray-700 mb-2">
            Kết quả — <span className="text-red-600">{results.length} số</span>
          </div>
          <textarea
            className="w-full border border-gray-100 rounded-lg p-2 text-sm bg-gray-50 focus:outline-none"
            rows={5}
            readOnly
            value={results.join(", ")}
          />
          <div className="mt-2 flex items-center gap-3">
            <CopyToClipboard text={results.join(", ")} onCopy={handleCopy}>
              <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                📋 Copy kết quả
              </button>
            </CopyToClipboard>
            {copied && <span className="text-green-600 text-sm font-medium">Đã sao chép!</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export default CombinationGeneratorPage;
