// app/dashboard/page.js
"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line
} from "recharts";
import {
  FaBuilding,
  FaChartLine,
  FaArrowUp,
  FaArrowDown,
  FaArrowRight,
  FaFileExcel,
  FaDownload
} from "react-icons/fa";
  import * as XLSX from "xlsx";
import Link from "next/link";

export default function DashboardPage() {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [mounted, setMounted] = useState(false);
  const [exporting, setExporting] = useState(false);
  const pdfRef = useRef();
  const [filterMode, setFilterMode] = useState("harian"); // default harian
  const [selectedMonth, setSelectedMonth] = useState("2"); // default Februari
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());


  useEffect(() => {
    setMounted(true);
      // 🔹 Set default filter: bulan Februari tahun berjalan
  const tahun = new Date().getFullYear();
  const defaultStart = new Date(tahun, 1, 1); // 1 Februari
  const defaultEnd = new Date(tahun, 1 + 1, 0); // 28/29 Februari

  setStartDate(defaultStart.toISOString().split("T")[0]);
  setEndDate(defaultEnd.toISOString().split("T")[0]);
    const fetchData = async () => {
      try {
        const res = await fetch("/api/data", { cache: "no-store" });
        const json = await res.json();
        const parsed = json.map((row) => ({
          ...row,
          Tanggal: new Date(row.Tanggal),
          Target:
            parseFloat(
              String(row.Target).replace(/\./g, "").replace(",", ".")
            ) || 0,
          Realisasi:
            parseFloat(
              String(row.Realisasi).replace(/\./g, "").replace(",", ".")
            ) || 0,
        }));
        setData(parsed);
        setFilteredData(parsed);
      } catch (error) {
        console.error("Gagal fetch data:", error);
      }
    };
    fetchData();
  }, []);
  const handleResetFilter = () => {
    setFilterMode("harian"); // balik ke mode default
    const tahun = new Date().getFullYear();
    const defaultStart = new Date(tahun, 1, 1); // 1 Februari
    const defaultEnd = new Date(tahun, 2, 0); // akhir Februari
    setStartDate(defaultStart.toISOString().split("T")[0]);
    setEndDate(defaultEnd.toISOString().split("T")[0]);
    setSelectedMonth("2");
    setSelectedYear(tahun);
    setFilteredData(data);
  };

  const handleFilter = () => {
    if (filterMode === "harian") {
      if (!startDate || !endDate) {
        setFilteredData(data);
        return;
      }
      const sDate = new Date(startDate);
      const eDate = new Date(endDate);
      setFilteredData(
        data.filter((row) => row.Tanggal >= sDate && row.Tanggal <= eDate)
      );
    } else if (filterMode === "bulanan") {
      const bulan = parseInt(selectedMonth, 10);
      const tahun = parseInt(selectedYear, 10);
      const sDate = new Date(tahun, bulan - 1, 1);
      const eDate = new Date(tahun, bulan, 0);
      setFilteredData(
        data.filter((row) => row.Tanggal >= sDate && row.Tanggal <= eDate)
      );
    }
  };
  


  const totalKanwil = new Set(filteredData.map((row) => row.Kanwil)).size;
  const realisasiList = filteredData
    .map((row) => row.Realisasi)
    .filter((n) => !isNaN(n));
  const rataRataStok =
    realisasiList.length > 0
      ? Math.round(
          realisasiList.reduce((a, b) => a + b, 0) / realisasiList.length
        ).toLocaleString("id-ID")
      : 0;
  const stokTertinggi =
    realisasiList.length > 0
      ? Math.round(Math.max(...realisasiList)).toLocaleString("id-ID")
      : 0;
  const stokTerendah =
    realisasiList.length > 0
      ? Math.round(Math.min(...realisasiList)).toLocaleString("id-ID")
      : 0;

// 🔹 Agregasi Target & Realisasi per Bulan
const stokPerBulan = {};
filteredData.forEach((row) => {
  const tanggal = new Date(row.Tanggal); // pastikan objek Date
  const bulan = tanggal.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  if (!stokPerBulan[bulan]) {
    stokPerBulan[bulan] = { Target: 0, Realisasi: 0 };
  }

  stokPerBulan[bulan].Target += row.Target;
  stokPerBulan[bulan].Realisasi += row.Realisasi;
});

const chartBulan = Object.entries(stokPerBulan).map(([bulan, val]) => ({
  Bulan: bulan,
  Target: Math.round(val.Target),
  Realisasi: Math.round(val.Realisasi),
}));


  // 🔹 Agregasi Target & Realisasi per Bulan
/* const stokPerBulan = {};
filteredData.forEach((row) => {
  const bulan = row.Tanggal.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  if (!stokPerBulan[bulan]) {
    stokPerBulan[bulan] = { Target: 0, Realisasi: 0 };
  }

  stokPerBulan[bulan].Target += row.Target;
  stokPerBulan[bulan].Realisasi += row.Realisasi;
});

const chartBulan = Object.entries(stokPerBulan).map(([bulan, val]) => ({
  Bulan: bulan,
  Target: Math.round(val.Target),
  Realisasi: Math.round(val.Realisasi),
}));
*/
  // 🔹 Fungsi pivot data
const pivotData = (rows, field) => {
    const grouped = {};
    rows.forEach((row) => {
      const kanwil = row.Kanwil;
      const tanggal = row.Tanggal.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      });

      if (!grouped[kanwil]) grouped[kanwil] = { Kanwil: kanwil };
      grouped[kanwil][tanggal] = row[field];
    });
    return Object.values(grouped);
  };

  // 🔹 Fungsi hitung total per tanggal
  const getTotals = (rows) => {
    if (rows.length === 0) return {};
    const totals = { Kanwil: "Total" };
    Object.keys(rows[0]).forEach((key) => {
      if (key !== "Kanwil") {
        totals[key] = rows.reduce((sum, row) => sum + (row[key] || 0), 0);
      }
    });
    return totals;
  };


  const { data: pivoted, dates: allDates } = pivotData(filteredData);

// 🔹 Fungsi Export Excel
  const handleExportExcel = () => {
    if (!filteredData || filteredData.length === 0) {
      alert("❌ Data kosong atau belum difilter!");
      return;
    }

    setExporting(true);
    try {
      // Ambil pivot Target
      const pivotTarget = pivotData(filteredData, "Target");
      const totalTarget = getTotals(pivotTarget);
      const exportTarget = [...pivotTarget, totalTarget];

      // Ambil pivot Realisasi
      const pivotRealisasi = pivotData(filteredData, "Realisasi");
      const totalRealisasi = getTotals(pivotRealisasi);
      const exportRealisasi = [...pivotRealisasi, totalRealisasi];

      // Buat workbook
      const wb = XLSX.utils.book_new();

      // Buat worksheet Target
      const wsTarget = XLSX.utils.json_to_sheet(exportTarget, { origin: "A1" });
      XLSX.utils.book_append_sheet(wb, wsTarget, "Target");

      // Buat worksheet Realisasi
      const wsRealisasi = XLSX.utils.json_to_sheet(exportRealisasi, { origin: "A1" });
      XLSX.utils.book_append_sheet(wb, wsRealisasi, "Realisasi");

      // Simpan file Excel
      XLSX.writeFile(wb, "pivot_data_stok.xlsx");

      alert("✅ Data pivot berhasil diexport ke Excel!");
    } catch (error) {
      console.error("Gagal export Excel:", error);
      alert("❌ Gagal export Excel.");
    } finally {
      setExporting(false);
    }
  };

  if (!mounted) {
    return (
      <div className="p-6 text-center">
        <p className="text-yellow-500">Sedang memuat dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1c1c1c] p-6 md:p-8">
      {/* Header + Export */}
      <div className="flex flex-col md:flex-row justify-start items-start md:items-center gap-4 mb-8">
          <img 
            src="/kementan.ico" 
            alt="Logo Kementan" 
            className="w-10 h-10"
          />
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#fcc203] tracking-tight">
          DASHBOARD STOK BERAS
        </h1>
        {/* 🔹 Tombol ke Dashboard 2 */}
        <Link
          href="/dashboard2"
          className="ml-auto bg-[#e3af05] text-white px-4 py-2 rounded-lg font-semibold shadow hover:scale-110 transition flex items-center gap-2"
        >
          <FaChartLine /> Dashboard 2
        </Link>
      </div>
    <div ref={pdfRef} className="space-y-5">
      {/* Filter */}
      <div className="bg-[#fff5d4] p-4 rounded-xl shadow-sm flex flex-wrap gap-6">
        {/* Pilihan mode filter */}
        <div>
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            className="border border-gray-300 p-2 rounded-lg shadow-sm text-sm focus:ring-2 focus:ring-[#548c0c] focus:outline-none"
          >
            <option value="harian">Harian</option>
            <option value="bulanan">Bulanan</option>
          </select>
        </div>

        {/* Jika mode Harian → tampilkan input tanggal */}
        {filterMode === "harian" && (
          <>
            <div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-gray-300 p-2 rounded-lg shadow-sm w-full text-sm focus:ring-2 focus:ring-[#548c0c] focus:outline-none"
              />
            </div>
            {/* Ikon Panah */}
            <FaArrowRight className="text-gray-600 flex-wrap items-center gap-2" />
            <div>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-gray-300 p-2 rounded-lg shadow-sm w-full text-sm focus:ring-2 focus:ring-[#548c0c] focus:outline-none"
              />
            </div>
          </>
        )}

        {/* Jika mode Bulanan → tampilkan dropdown bulan & tahun */}
        {filterMode === "bulanan" && (
          <>
            <div>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border border-gray-300 p-2 rounded-lg shadow-sm text-sm focus:ring-2 focus:ring-[#548c0c] focus:outline-none"
              >
                <option value="1">Januari</option>
                <option value="2">Februari</option>
                <option value="3">Maret</option>
                <option value="4">April</option>
                <option value="5">Mei</option>
                <option value="6">Juni</option>
                <option value="7">Juli</option>
                <option value="8">Agustus</option>
                <option value="9">September</option>
                <option value="10">Oktober</option>
                <option value="11">November</option>
                <option value="12">Desember</option>
              </select>
            </div>
            <div>
              <input
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="border border-gray-300 p-2 rounded-lg shadow-sm w-28 text-sm focus:ring-2 focus:ring-[#548c0c] focus:outline-none"
              />
            </div>
          </>
        )}

        {/* Tombol Filter */}
        <div className="flex gap-2">
          <button
            onClick={handleFilter}
            className="px-5 py-2 rounded-lg text-white bg-[#e3af05] shadow hover:scale-110 transition"
          >
            Filter
          </button>
          <button
            onClick={handleResetFilter}
            className="px-4 py-2 rounded-lg text-white bg-[#6e5400] hover:bg-[#3d2f01] transition"
          >
            Reset
          </button>
          <button
            onClick={handleExportExcel}
            disabled={exporting}
            className="flex items-center gap-2 bg-[#e3af05] text-white px-4 py-2 rounded-lg font-semibold shadow hover:scale-110 transition"
          >
            <FaDownload /> {exporting ? "Mengekspor..." : "Download Data"}
          </button>

        </div>
      </div>



      
        {/* Cards Scorecard*/}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            {
              title: "Total Kanwil",
              value: totalKanwil,
              icon: <FaBuilding />,
              color: "bg-[#c4d434] text-white",
            },
            {
              title: "Rata-rata Stok",
              value: rataRataStok,
              icon: <FaChartLine />,
              color: "bg-[#548c0c] text-white",
            },
            {
              title: "Stok Tertinggi",
              value: stokTertinggi,
              icon: <FaArrowUp />,
              color: "bg-[#859160] text-white",
            },
            {
              title: "Stok Terendah",
              value: stokTerendah,
              icon: <FaArrowDown />,
              color: "bg-[#514d42] text-white",
            },
          ].map((card, i) => (
            <div
              key={i}
              className="bg-white p-3 rounded-xl shadow hover:shadow-lg hover:scale-[1.05] transition flex items-center gap-4"
            >
              <div className={`p-3 rounded-full bg-yellow-100 text-yellow-700 text-2xl`}>
                {card.icon}
              </div>
              <div>
                <h2 className="text-sm text-gray-500">{card.title}</h2>
                <p className="text-xl md:text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="bg-white/90 backdrop-blur-md p-6 shadow-md rounded-2xl h-[420px]">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">
            {filterMode === "bulanan" ? "Stok Harian" : "Stok per Bulan"}
          </h2>

          <ResponsiveContainer width="100%" height="100%">
            {filterMode === "bulanan" ? (
              // 🔹 LineChart Harian
              <LineChart
                data={(() => {
                  // filter tanggal berdasarkan bulan & tahun terpilih
                  const bulan = parseInt(selectedMonth, 10) - 1;
                  const tahun = parseInt(selectedYear, 10);
                  const sDate = new Date(tahun, bulan, 1);
                  const eDate = new Date(tahun, bulan + 1, 0);

                  // agregasi harian
                  const stokPerHari = {};
                  filteredData.forEach((row) => {
                    const tgl = row.Tanggal;
                    if (tgl >= sDate && tgl <= eDate) {
                      const key = tgl.toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                      });
                      if (!stokPerHari[key]) {
                        stokPerHari[key] = { Target: 0, Realisasi: 0 };
                      }
                      stokPerHari[key].Target += row.Target;
                      stokPerHari[key].Realisasi += row.Realisasi;
                    }
                  });

                  return Object.entries(stokPerHari).map(([hari, val]) => ({
                    Hari: hari,
                    Target: val.Target,
                    Realisasi: val.Realisasi,
                  }));
                })()}
                margin={{ top: 10, right: 20, bottom: 20, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#d4dd9d" />
                <XAxis dataKey="Hari" />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
                    backgroundColor: "#fff5d4",
                    border: "1px solid #548c0c",
                  }}
                  formatter={(value) => value.toLocaleString("id-ID")}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="Target"
                  stroke="#e3af05"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="Realisasi"
                  stroke="#6e5400"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            ) : (
              // 🔹 BarChart Bulanan
              <BarChart
                data={chartBulan}
                margin={{ top: 10, right: 20, bottom: 20, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#d4dd9d" />
                <XAxis dataKey="Bulan" />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
                    backgroundColor: "#fff5d4",
                    border: "1px solid #548c0c",
                  }}
                  formatter={(value) => value.toLocaleString("id-ID")}
                />
                <Legend />
                <Bar
                  dataKey="Target"
                  radius={[6, 6, 0, 0]}
                  fill="#e3af05"
                />
                <Bar
                  dataKey="Realisasi"
                  radius={[6, 6, 0, 0]}
                  fill="#6e5400"
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>


        {/* Pivot Table */}
        {/* Tabel Target */}
          <div className="bg-white/90 backdrop-blur-md shadow-md rounded-2xl p-4">
          <h2 className="text-xl font-semibold mb-3 text-[#475569]">
            Detail Data - Target
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border text-sm">
              <thead className="bg-yellow-300">
                <tr>
                  {pivotData(filteredData, "Target")[0] &&
                    Object.keys(pivotData(filteredData, "Target")[0]).map(
                      (key, i) => (
                        <th
                          key={i}
                          className="px-4 py-3 border text-left font-semibold text-gray-700 whitespace-nowrap"
                        >
                          {key}
                        </th>
                      )
                    )}
                </tr>
              </thead>
              <tbody>
                {pivotData(filteredData, "Target").map((row, idx) => (
                  <tr
                    key={idx}
                    className={`${
                      idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                    } hover:bg-yellow-40 transition`}
                  >
                    {Object.entries(row).map(([key, val], i) => (
                      <td
                        key={i}
                        className={`px-4 py-2 border text-gray-800 whitespace-nowrap ${
                          typeof val === "number"
                            ? "text-right font-medium"
                            : "text-left"
                        }`}
                      >
                        {typeof val === "number"
                          ? val.toLocaleString("id-ID", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : val}
                      </td>
                    ))}
                  </tr>
                ))}

                {/* 🔹 Baris Total Target */}
                <tr className="bg-yellow-100 font-bold">
                  {Object.entries(
                    getTotals(pivotData(filteredData, "Target"))
                  ).map(([key, val], i) => (
                    <td
                      key={i}
                      className={`px-4 py-2 border whitespace-nowrap ${
                        typeof val === "number" ? "text-right" : "text-left"
                      }`}
                    >
                      {typeof val === "number"
                        ? val.toLocaleString("id-ID", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : val}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabel Realisasi */}
        <div className="bg-white/90 backdrop-blur-md shadow-md rounded-2xl p-4">
          <h2 className="text-xl font-semibold mb-3 text-[#475569]">
            Detail Data - Realisasi
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border text-sm">
              <thead className="bg-yellow-300">
                <tr>
                  {pivotData(filteredData, "Realisasi")[0] &&
                    Object.keys(
                      pivotData(filteredData, "Realisasi")[0]
                    ).map((key) => (
                      <th
                        key={key}
                        className="px-4 py-2 border text-left font-semibold text-gray-700 whitespace-nowrap"
                      >
                        {key}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {pivotData(filteredData, "Realisasi").map((row, idx) => (
                  <tr
                    key={idx}
                    className={`${
                      idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                    } hover:bg-yellow-40 transition`}
                  >
                    {Object.entries(row).map(([key, val], i) => (
                      <td
                        key={i}
                        className={`px-4 py-2 border text-gray-800 whitespace-nowrap ${
                          typeof val === "number"
                            ? "text-right font-medium"
                            : "text-left"
                        }`}
                      >
                        {typeof val === "number"
                          ? val.toLocaleString("id-ID", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : val}
                      </td>
                    ))}
                  </tr>
                ))}
                {/* 🔹 Baris Total Realisasi */}
                <tr className="bg-yellow-100 font-bold">
                  {Object.entries(
                    getTotals(pivotData(filteredData, "Realisasi"))
                  ).map(([key, val], i) => (
                    <td
                      key={i}
                      className={`px-4 py-2 border whitespace-nowrap ${
                        typeof val === "number" ? "text-right" : "text-left"
                      }`}
                    >
                      {typeof val === "number"
                        ? val.toLocaleString("id-ID", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : val}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <style jsx>{`
        @keyframes fadeIn {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.8s forwards;
        }
      `}</style>
    </div>
  );
}
