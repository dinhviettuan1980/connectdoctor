import React, { useEffect, useState } from "react";
import { Helmet } from 'react-helmet-async';
import { CopyToClipboard } from "react-copy-to-clipboard";
import apiClient from './utils/apiClient';

function ClassifyPage() {
  const [data, setData] = useState({});
  const [copiedKey, setCopiedKey] = useState(null);

  useEffect(() => {
    const baseUrl = process.env.REACT_APP_API_BASE;
    apiClient.get(`${baseUrl}/api/classify-two-digit`).then(res => setData(res.data));
  }, []);

  return (
    <div>
      <Helmet>
        <title>Phân loại số 2 chữ số - XSMB</title>
        <meta name="description" content="Phân loại các số 2 chữ số theo nhóm trong xổ số miền Bắc." />
      </Helmet>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        {Object.entries(data)
          .filter(([key]) => !key.endsWith("_missing"))
          .map(([key, values]) => {
            const joined = values.join(", ");
            const missingDays = data[`${key}_missing`];
            return (
              <div key={key} className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-700">{key}</span>
                  {missingDays !== undefined && (
                    <span className="bg-red-50 text-red-600 border border-red-100 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {missingDays} ngày
                    </span>
                  )}
                </div>
                <div className="text-gray-500 break-words mb-2 text-xs leading-relaxed">{joined}</div>
                <div className="flex items-center gap-2">
                  <CopyToClipboard text={joined} onCopy={() => setCopiedKey(key)}>
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
    </div>
  );
}

export default ClassifyPage;
