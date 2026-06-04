import React, { useEffect, useState } from "react";
import { Helmet } from 'react-helmet-async';
import apiClient from './utils/apiClient';

function CauLoPage() {
  const [pascalTriangle, setPascalTriangle] = useState([]);
  const [pascalPredictions, setPascalPredictions] = useState([]);
  const [ongPhongResult, setOngPhongResult] = useState(null);
  const [ongPhongResults, setOngPhongResults] = useState(null);
  const [ongPhongStats, setOngPhongStats] = useState([]);
  const [pascalStats, setPascalStats] = useState([]);
  // State mới cho index đã chọn và dữ liệu cặp số
  const [selectedOngPhongIndex, setSelectedOngPhongIndex] = useState(null);
  const [ongPhongPairs, setOngPhongPairs] = useState([]);

  // Hàm xử lý khi click vào cột
  const handleOngPhongBarClick = (index) => {
    setSelectedOngPhongIndex(index);

    const allData = ongPhongResults || [];
    const streakLength = Math.abs(ongPhongStats[index]) || 1;

    const pairs = [];

    // ✅ Tính vị trí bắt đầu (tính từ ngày mới nhất)
    const startIndex = ongPhongStats
      .slice(0, index)
      .reduce((sum, val) => sum + Math.abs(val), 0);

    for (let i = 0; i < streakLength; i++) {
      const dayData = allData[startIndex + i];

      if (dayData && Array.isArray(dayData["cau-ong-phong"])) {
        pairs.push({
          date: dayData.result_date,
          values: dayData["cau-ong-phong"],
        });
      }
    }

    setOngPhongPairs(pairs);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const baseUrl = process.env.REACT_APP_API_BASE;
        const pascalRes = await apiClient.get(`${baseUrl}/api/cau-lo-pascal`);
        setPascalTriangle(pascalRes.data.triangle || []);
        setPascalPredictions(pascalRes.data.predictions || []);

        const phongRes = await apiClient.get(`${baseUrl}/api/cau-ong-phong`);
        setOngPhongResult(phongRes.data || null);

        const phongStatsRes = await apiClient.get(`${baseUrl}/api/tk-cau-ong-phong`);
        setOngPhongStats(phongStatsRes.data["tk-cau-ong-phong-short"] || []);
        setOngPhongResults(phongStatsRes.data["data"] || []);

        const pascalStatsRes = await apiClient.get(`${baseUrl}/api/tk-cau-lo-pascal`);
        setPascalStats(pascalStatsRes.data["tk-cau-lo-pascal-short"] || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="p-4">
      <Helmet>
        <title>Cầu Lô - XSMB</title>
        <meta name="description" content="Dự đoán cầu lô xổ số miền Bắc theo phương pháp Ông Phong và Pascal." />
      </Helmet>
      {/* Cầu Ông Phong */}
      <h2 className="text-2xl font-bold mb-4">🎯 Cầu Ông Phong</h2>

      {ongPhongResult ? (
        <div className="text-center mb-4">
          <p className="text-lg">
            Giải đặc biệt hôm trước:{" "}
            <span className="font-bold text-red-600">{ongPhongResult.specialPrize}</span>
          </p>
          <p className="mt-2 text-lg">
            Dự đoán:{" "}
            <span className="font-bold text-green-600">
              {ongPhongResult.predictions?.join(", ") || "Không có"}
            </span>
          </p>
        </div>
      ) : (
        <p>Đang tải dữ liệu cầu ông Phong...</p>
      )}

      {/* Biểu đồ tk-cau-ong-phong-short */}
      {ongPhongStats.length > 0 && (
        <div className="mt-2">
          <h3 className="text-lg font-semibold mb-1">Chuỗi thống kê cầu Ông Phong:</h3>
          <div className="flex items-end space-x-2 overflow-x-auto">
            {ongPhongStats.map((value, index) => (
              <div key={index} className="flex flex-col items-center cursor-pointer" onClick={() => handleOngPhongBarClick(index)}>
                <div className="text-xs mb-1 text-gray-700">{Math.abs(value)}</div>
                <div
                  className={`w-3 rounded-t ${value > 0 ? "bg-green-500" : "bg-red-500"} ${selectedOngPhongIndex === index ? "ring-2 ring-blue-500" : ""}`}
                  style={{ height: `${Math.abs(value) * 10}px` }}
                  title={`Chuỗi ${value > 0 ? "trúng" : "trượt"}: ${Math.abs(value)} ngày`}
                ></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedOngPhongIndex !== null && Array.isArray(ongPhongResults) && ongPhongResults[selectedOngPhongIndex] && (
        <div className="mt-4">
          {ongPhongPairs.length > 0 && (
            <div className="mt-4">
              <div className="scale-75 origin-top-left">
                <h4 className="text-md font-semibold mb-2 text-blue-600">
                  Cặp số trong chuỗi {Math.abs(ongPhongStats[selectedOngPhongIndex])} ngày:
                </h4>

                <div className="flex flex-wrap gap-4">
                  {ongPhongPairs.map((item, idx) => (
                    <div key={idx} className="bg-gray-50 p-2 rounded border">
                      <div className="text-sm font-medium text-gray-600 mb-1 text-center">
                        {item.date}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {item.values.map((pair, pIdx) => (
                          <div key={pIdx} className="px-2 py-1 bg-gray-100 border rounded text-sm">
                            {pair}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cầu Pascal */}
      <h2 className="text-2xl font-bold mt-8 mb-6">🎯 Cầu Pascal</h2>

      {pascalTriangle.length > 0 ? (
        <div className="flex flex-col items-center space-y-2">
          {/* {pascalTriangle.map((row, rowIndex) => (
            <div key={rowIndex} className="flex justify-center space-x-1">
              {row.map((num, idx) => (
                <div
                  key={idx}
                  className="w-6 h-6 flex items-center justify-center rounded-full bg-white border border-gray-400 text-red-600 text-xs"
                >
                  {num}
                </div>
              ))}
            </div>
          ))} */}

          <div className="mt-4 text-lg font-semibold">
            Dự đoán:{" "}
            {pascalPredictions.length > 0 ? (
              <span className="text-red-600">
                {pascalPredictions.join(", ")}
              </span>
            ) : (
              <span>Chưa có dữ liệu</span>
            )}
          </div>
        </div>
      ) : (
        <p>Đang tải dữ liệu cầu Pascal...</p>
      )}

      {/* Thống kê cầu Pascal */}
      {pascalStats.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-1">Chuỗi thống kê cầu Pascal:</h3>
          <div className="flex items-end space-x-2 overflow-x-auto">
            {pascalStats.map((value, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className="text-xs mb-1 text-gray-700">{Math.abs(value)}</div>
                <div
                  className={`w-3 rounded-t ${value > 0 ? "bg-green-500" : "bg-red-500"}`}
                  style={{ height: `${Math.abs(value) * 10}px` }}
                  title={`Chuỗi ${value > 0 ? "trúng" : "trượt"}: ${Math.abs(value)} ngày`}
                ></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CauLoPage;
