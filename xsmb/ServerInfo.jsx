import React, { useEffect, useState } from 'react';
import apiClient from './utils/apiClient'; // dùng axios instance của bạn nếu có

function ServerInfo() {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServerInfo = async () => {
      try {
        const baseUrl = process.env.REACT_APP_API_BASE;
        const res = await apiClient.get(`${baseUrl}/api/server-info`);
        setInfo(res.data);
      } catch (err) {
        console.error('Lỗi khi lấy thông tin server:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchServerInfo();
  }, []);

  if (loading) return <p>Đang tải thông tin hệ thống...</p>;
  if (!info) return <p>Không thể lấy dữ liệu server.</p>;

  return (
    <div className="p-4 border rounded shadow-md max-w-md mx-auto">
      <h2 className="text-lg font-bold mb-4">Thông tin hệ thống máy chủ</h2>

      <div className="mb-2">
        <strong>🕒 Uptime:</strong> {info.uptime}
      </div>

      <div className="mb-2">
        <strong>💾 RAM:</strong><br />
        Tổng: {info.memory.total}<br />
        Đã dùng: {info.memory.used} ({info.memory.usage})
      </div>

      <div className="mb-2">
        <strong>📊 CPU Load:</strong><br />
        1 phút: {info.cpuLoad['1m']} &nbsp;&nbsp;|&nbsp;&nbsp;
        5 phút: {info.cpuLoad['5m']} &nbsp;&nbsp;|&nbsp;&nbsp;
        15 phút: {info.cpuLoad['15m']}
      </div>

      <div className="mb-2">
        <strong>🗄️ Ổ đĩa:</strong><br />
        Tổng: {info.disk.total}<br />
        Còn trống: {info.disk.free}<br />
        Đã dùng: {info.disk.usedPercent}
      </div>
    </div>
  );
}

export default ServerInfo;
