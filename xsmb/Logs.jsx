import React, { useEffect, useState } from 'react';
import apiClient from './utils/apiClient';

const PAGE_SIZE = 100;

export default function Logs() {
  const [fromDate, setFromDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [logs1, setLogs1] = useState([]);
  const [logs2, setLogs2] = useState([]);
  const [logs3, setLogs3] = useState([]);
  const [logs4, setLogs4] = useState([]);

  const [selectedKey, setSelectedKey] = useState(null);
  const [selectedValue, setSelectedValue] = useState(null);
  const [page, setPage] = useState(1);
  const [keyForLog4, setKeyForLog4] = useState('');
  const [viewMode, setViewMode] = useState('logs1'); // 'logs1', 'logs2', 'logs3', 'logs4'

  useEffect(() => {
    fetchLogs1();
  }, []);

  const fetchLogs1 = async () => {
    const res = await apiClient.get(`${process.env.REACT_APP_API_BASE}/logs11?fromdate=${fromDate}`);
    setLogs1(Object.entries(res.data));
    setViewMode('logs1');
  };

  const fetchLogs2 = async (key, pageNumber = 1) => {
    const res = await apiClient.get(`${process.env.REACT_APP_API_BASE}/logs2?key=${key}&fromdate=${fromDate}&page=${pageNumber}&size=${PAGE_SIZE}`);
    setLogs2(res.data);
    setSelectedKey(key);
    setPage(pageNumber);
    setViewMode('logs2');
  };

  const fetchLogs3 = async (value) => {
    const res = await apiClient.get(`${process.env.REACT_APP_API_BASE}/logs3?value=${value}&fromdate=${fromDate}&page=1&size=${PAGE_SIZE}`);
    setLogs3(res.data);
    setSelectedValue(value);
    setViewMode('logs3');
  };

  const fetchLogs4 = async () => {
    const res = await apiClient.get(`${process.env.REACT_APP_API_BASE}/logs4?key=${keyForLog4}&value=${selectedValue}&fromdate=${fromDate}`);
    setLogs4(res.data);
    setViewMode('logs4');
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex gap-2 items-center">
        <input
          type="date"
          className="border px-2 py-1 rounded"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
        />

        {viewMode === 'logs3' || viewMode === 'logs4' ? (
          <input
            type="text"
            placeholder="Nhập key"
            className="border px-2 py-1 rounded"
            value={keyForLog4}
            onChange={(e) => setKeyForLog4(e.target.value)}
          />
        ) : null}

        <button
          onClick={() => {
            if (viewMode === 'logs3' || viewMode === 'logs4') {
              fetchLogs4();
            } else {
              fetchLogs1();
            }
          }}
          className="bg-blue-500 text-white px-4 py-1 rounded"
        >
          Search
        </button>
      </div>

      {/* Logs1 - summary */}
      <div>
        <h2 className="font-semibold mb-2">Tổng hợp Logs:</h2>
        <table className="w-full table-auto border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-2 py-1">Key</th>
              <th className="border px-2 py-1">Count</th>
            </tr>
          </thead>
          <tbody>
            {logs1.map(([key, count]) => (
              <tr key={key}>
                <td
                  className="border px-2 py-1 text-blue-600 cursor-pointer"
                  onClick={() => {
                    setKeyForLog4('');
                    setSelectedValue(null);
                    fetchLogs2(key);
                  }}
                >{key}</td>
                <td className="border px-2 py-1">{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Logs2 */}
      {viewMode === 'logs2' && (
        <div>
          <h2 className="font-semibold mt-4">Chi tiết Logs cho key: {selectedKey}</h2>
          <table className="w-full table-auto border mt-2">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1">ID</th>
                <th className="border px-2 py-1">Key</th>
                <th className="border px-2 py-1">Value</th>
                <th className="border px-2 py-1">Create Date</th>
              </tr>
            </thead>
            <tbody>
              {logs2.map(log => (
                <tr key={log.id}>
                  <td className="border px-2 py-1">{log.id}</td>
                  <td className="border px-2 py-1">{log.key}</td>
                  <td
                    className="border px-2 py-1 text-green-600 cursor-pointer"
                    onClick={() => fetchLogs3(log.value)}
                  >{log.value}</td>
                  <td className="border px-2 py-1">{log.createdate}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 flex gap-2">
            <button
              className="bg-gray-200 px-3 py-1 rounded"
              onClick={() => fetchLogs2(selectedKey, page - 1)}
              disabled={page <= 1}
            >Back</button>
            <span>Page {page}</span>
            <button
              className="bg-gray-200 px-3 py-1 rounded"
              onClick={() => fetchLogs2(selectedKey, page + 1)}
            >Next</button>
          </div>
        </div>
      )}

      {/* Logs3 */}
      {viewMode === 'logs3' && (
        <div>
          <h2 className="font-semibold mt-4">Chi tiết Logs cho value: {selectedValue}</h2>
          <table className="w-full table-auto border mt-2">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1">ID</th>
                <th className="border px-2 py-1">Key</th>
                <th className="border px-2 py-1">Value</th>
                <th className="border px-2 py-1">Create Date</th>
              </tr>
            </thead>
            <tbody>
              {logs3.map(log => (
                <tr key={log.id}>
                  <td className="border px-2 py-1">{log.id}</td>
                  <td className="border px-2 py-1">{log.key}</td>
                  <td className="border px-2 py-1">{log.value}</td>
                  <td className="border px-2 py-1">{log.createdate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Logs4 */}
      {viewMode === 'logs4' && (
        <div>
          <h2 className="font-semibold mt-4">Chi tiết Logs4 cho key: {keyForLog4} và value: {selectedValue}</h2>
          <table className="w-full table-auto border mt-2">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1">ID</th>
                <th className="border px-2 py-1">Key</th>
                <th className="border px-2 py-1">Value</th>
                <th className="border px-2 py-1">Create Date</th>
              </tr>
            </thead>
            <tbody>
              {logs4.map(log => (
                <tr key={log.id}>
                  <td className="border px-2 py-1">{log.id}</td>
                  <td className="border px-2 py-1">{log.key}</td>
                  <td className="border px-2 py-1">{log.value}</td>
                  <td className="border px-2 py-1">{log.createdate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
