import React, { useEffect, useState } from 'react';
import apiClient from './utils/apiClient';

export default function LogsByDevice() {
  const [fromDate, setFromDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [deviceLogs, setDeviceLogs] = useState([]);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    const res = await apiClient.get(`${process.env.REACT_APP_API_BASE}/logsbydevice?fromdate=${fromDate}`);
    setDevices(Object.entries(res.data));
    setSelectedDevice(null);
    setDeviceLogs([]);
  };

  const fetchDeviceLogs = async (device) => {
    const res = await apiClient.get(`${process.env.REACT_APP_API_BASE}/logsbydevicedetails?value=${device}&fromdate=${fromDate}`);
    setDeviceLogs(res.data);
    setSelectedDevice(device);
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
        <button
          onClick={fetchDevices}
          className="bg-blue-500 text-white px-4 py-1 rounded"
        >
          Search
        </button>
      </div>

      <div>
        <h2 className="font-semibold mb-2">Danh sách thiết bị:</h2>
        <table className="w-full table-auto border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-2 py-1">Device</th>
              <th className="border px-2 py-1">Số lần xuất hiện</th>
            </tr>
          </thead>
          <tbody>
            {devices.map(([device, count]) => (
              <tr key={device}>
                <td
                  className="border px-2 py-1 text-blue-600 cursor-pointer"
                  onClick={() => fetchDeviceLogs(device)}
                >
                  {device}
                </td>
                <td className="border px-2 py-1">{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedDevice && (
        <div>
          <h2 className="font-semibold mt-4">Chi tiết logs cho thiết bị: {selectedDevice}</h2>
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
              {deviceLogs.map((log) => (
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
