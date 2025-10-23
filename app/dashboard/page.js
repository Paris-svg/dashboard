// app/dashboard/page.js
"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
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
  Line,
} from "recharts";
import {
  FaHome,
  FaBuilding,
  FaArrowUp,
  FaPlusCircle,
  FaDownload,
  FaFilePdf,
} from "react-icons/fa";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable"; // Import autotable plugin
import Link from "next/link";

export default function DashboardPage() {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [mounted, setMounted] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [filterMode, setFilterMode] = useState("harian"); // default harian
  const [selectedMonth, setSelectedMonth] = useState("1"); // default Januari (untuk mode bulanan)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedKanwil, setSelectedKanwil] = useState("Semua"); // Filter Kanwil baru

  // Daftar Kanwil unik (useMemo untuk efisiensi)
  const kanwilList = useMemo(() => {
    const uniqueKanwil = [...new Set(data.map((row) => row.Kanwil))].sort();
    return ["Semua", ...uniqueKanwil];
  }, [data]);

  // Fetch data on mount
  useEffect(() => {
    setMounted(true);
    const fetchData = async () => {
      try {
        const res = await fetch("/api/data", { cache: "no-store" });
        const json = await res.json();
        const parsed = json.map((row) => ({
          ...row,
          Tanggal: new Date(row.Tanggal),
          Target: parseFloat(String(row.Target).replace(/\./g, "").replace(",", ".")) || 0,
          Realisasi: parseFloat(String(row.Realisasi).replace(/\./g, "").replace(",", ".")) || 0,
        }));
        setData(parsed);

        // Set default filter: Satu tahun penuh (Januari - Desember tahun berjalan)
        const tahun = new Date().getFullYear();
        const defaultStart = new Date(tahun, 0, 1); // 1 Januari
        const defaultEnd = new Date(tahun, 11, 31); // 31 Desember
        setStartDate(defaultStart.toISOString().split("T")[0]);
        setEndDate(defaultEnd.toISOString().split("T")[0]);
        setSelectedYear(tahun);
        setSelectedKanwil("Semua"); // Default Semua

        // Filter default untuk satu tahun
        const sDate = defaultStart;
        const eDate = defaultEnd;
        let filtered = parsed.filter((row) => row.Tanggal >= sDate && row.Tanggal <= eDate);
        setFilteredData(filtered);
      } catch (error) {
        console.error("Gagal fetch data:", error);
      }
    };

    fetchData();
  }, []);

  // Auto-filter on changes
  useEffect(() => {
    if (data.length === 0) return;
    handleFilter();
  }, [filterMode, startDate, endDate, selectedMonth, selectedYear, selectedKanwil, data]);

  // Fungsi filter (termasuk Kanwil)
  const handleFilter = () => {
    let filtered = data;

    // Filter tanggal/bulan
    if (filterMode === "harian") {
      if (!startDate || !endDate) {
        filtered = data;
      } else {
        const sDate = new Date(startDate);
        const eDate = new Date(endDate);
        if (eDate < sDate) {
          alert("Tanggal akhir harus lebih besar atau sama dengan tanggal awal!");
          return;
        }
        filtered = data.filter((row) => row.Tanggal >= sDate && row.Tanggal <= eDate);
      }
    } else if (filterMode === "bulanan") {
      const bulan = parseInt(selectedMonth, 10);
      const tahun = parseInt(selectedYear, 10);
      const sDate = new Date(tahun, bulan - 1, 1);
      const eDate = new Date(tahun, bulan, 0);
      filtered = data.filter((row) => row.Tanggal >= sDate && row.Tanggal <= eDate);
    }

    // Filter Kanwil
    if (selectedKanwil !== "Semua") {
      filtered = filtered.filter((row) => row.Kanwil === selectedKanwil);
    }

    setFilteredData(filtered);
  };

  // Reset to default (satu tahun penuh, Semua Kanwil)
  const handleResetFilter = () => {
    setFilterMode("harian");
    const tahun = new Date().getFullYear();
    const defaultStart = new Date(tahun, 0, 1); // 1 Januari
    const defaultEnd = new Date(tahun, 11, 31); // 31 Desember
    setStartDate(defaultStart.toISOString().split("T")[0]);
    setEndDate(defaultEnd.toISOString().split("T")[0]);
    setSelectedMonth("1");
    setSelectedYear(tahun);
    setSelectedKanwil("Semua");
    // Filter akan auto-trigger via useEffect
  };

  // Fungsi pivot data (mengembalikan { data: array pivot, dates: array tanggal unik })
  // Ubah format tanggal ke dd/mm/yyyy untuk header tabel (detail data)
  const pivotData = (rows, field) => {
    const grouped = {};
    const dates = new Set();
    rows.forEach((row) => {
      const kanwil = row.Kanwil;
      // Ubah format tanggal ke dd/mm/yyyy untuk tabel detail
      const tanggal = row.Tanggal.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      dates.add(tanggal);

      if (!grouped[kanwil]) grouped[kanwil] = { Kanwil: kanwil };
      grouped[kanwil][tanggal] = row[field];
    });
    const data = Object.values(grouped);
    return { data, dates: Array.from(dates).sort() };
  };

  // Hitung total per kolom
  const getTotals = (pivotedData) => {
    if (pivotedData.length === 0) return { Kanwil: "Total" };
    const totals = { Kanwil: "Total" };
    Object.keys(pivotedData[0]).forEach((key) => {
      if (key !== "Kanwil") {
        totals[key] = pivotedData.reduce((sum, row) => sum + (row[key] || 0), 0);
      }
    });
    return totals;
  };

  // Derived data dengan useMemo (update logika Total Kanwil)
  const { totalKanwil, totalStok, realisasiTertinggi, tanggalRealisasiTertinggi } = useMemo(() => {
    const kanwilSet = new Set(filteredData.map((row) => row.Kanwil)); // Total unique Kanwil
    const kanwilWithRealisasiSet = new Set(); // Kanwil dengan Realisasi > 0
    filteredData.forEach((row) => {
      if (row.Realisasi > 0) {
        kanwilWithRealisasiSet.add(row.Kanwil);
      }
    });

    // Format totalKanwil: "26(20)" atau "1(1)" jika spesifik
    let totalKanwilValue;
    if (filteredData.length === 0) {
      totalKanwilValue = "-";
    } else if (selectedKanwil !== "Semua") {
      // Jika filter spesifik: 1(total) (1 atau 0 dengan realisasi)
      const hasRealisasi = kanwilWithRealisasiSet.size > 0 ? 1 : 0;
      totalKanwilValue = `1(${hasRealisasi})`;
    } else {
      // Semua: totalUnique(kanwilWithRealisasi)
      totalKanwilValue = `${kanwilSet.size}(${kanwilWithRealisasiSet.size})`;
    }

    const realisasiList = filteredData.map((row) => row.Realisasi).filter((n) => !isNaN(n));
    const totalStok = realisasiList.length > 0 ? Math.round(realisasiList.reduce((a, b) => a + b, 0)).toLocaleString("id-ID") : "0";

    // Total per tanggal untuk realisasi tertinggi
    const totalPerTanggal = {};
    filteredData.forEach((row) => {
      const tgl = row.Tanggal.toLocaleDateString("en-CA");
      totalPerTanggal[tgl] = (totalPerTanggal[tgl] || 0) + row.Realisasi;
    });
    let realisasiTertinggi = "0";
    let tanggalRealisasiTertinggi = "-";
    if (Object.keys(totalPerTanggal).length > 0) {
      const maxEntry = Object.entries(totalPerTanggal).reduce((a, b) => (a[1] > b[1] ? a : b));
      tanggalRealisasiTertinggi = new Date(maxEntry[0]).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      realisasiTertinggi = Math.round(maxEntry[1]).toLocaleString("id-ID");
    }

    return {
      totalKanwil: totalKanwilValue,
      totalStok,
      realisasiTertinggi,
      tanggalRealisasiTertinggi,
    };
  }, [filteredData, selectedKanwil]);

  // Chart data bulanan (agregasi per bulan dari filteredData)
  const chartBulan = useMemo(() => {
    const stokPerBulan = {};
    filteredData.forEach((row) => {
      const bulan = row.Tanggal.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
      if (!stokPerBulan[bulan]) stokPerBulan[bulan] = { Target: 0, Realisasi: 0 };
      stokPerBulan[bulan].Target += row.Target;
      stokPerBulan[bulan].Realisasi += row.Realisasi;
    });
    return Object.entries(stokPerBulan).map(([bulan, val]) => ({
      Bulan: bulan,
      Target: Math.round(val.Target),
      Realisasi: Math.round(val.Realisasi),
    }));
  }, [filteredData]);

  // Data untuk LineChart harian (dari filteredData, untuk mode harian atau bulanan)
  const chartHarian = useMemo(() => {
    if (filteredData.length === 0) return [];
    const stokPerHari = {};
    filteredData.forEach((row) => {
      const key = row.Tanggal.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
      if (!stokPerHari[key]) stokPerHari[key] = { Target: 0, Realisasi: 0 };
      stokPerHari[key].Target += row.Target;
      stokPerHari[key].Realisasi += row.Realisasi;
    });
    return Object.entries(stokPerHari).map(([hari, val]) => ({
      Hari: hari,
      Target: Math.round(val.Target),
      Realisasi: Math.round(val.Realisasi),
    })).sort((a, b) => new Date(a.Hari.split(' ')[1] + ' ' + a.Hari.split(' ')[0]) - new Date(b.Hari.split(' ')[1] + ' ' + b.Hari.split(' ')[0])); // Sort by date
  }, [filteredData]);

  // Tentukan apakah tampilkan LineChart atau BarChart untuk mode harian
  // Kecuali jika menampilkan semua bulan (default satu tahun), gunakan BarChart bulanan
  const shouldUseBarChartForHarian = useMemo(() => {
    if (filterMode !== "harian") return false;
    if (!startDate || !endDate) return false;
    const sDate = new Date(startDate);
    const eDate = new Date(endDate);
    const diffTime = eDate - sDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    // Jika rentang > 90 hari (misal satu tahun ~365 hari), anggap "semua bulan" dan gunakan BarChart
    // Atau jika default satu tahun penuh
    const isFullYear = sDate.getFullYear() === eDate.getFullYear() && sDate.getMonth() === 0 && eDate.getMonth() === 11;
    return diffDays > 90 || isFullYear;
  }, [filterMode, startDate, endDate]);

  // Pivot data untuk tabel dan ekspor
  const { data: pivotTarget, dates: allDates } = useMemo(() => pivotData(filteredData, "Target"), [filteredData]);
  const { data: pivotRealisasi } = useMemo(() => pivotData(filteredData, "Realisasi"), [filteredData]);
  const totalTarget = useMemo(() => getTotals(pivotTarget), [pivotTarget]);
  const totalRealisasi = useMemo(() => getTotals(pivotRealisasi), [pivotRealisasi]);

  // Export Excel
  const handleExportExcel = () => {
    if (filteredData.length === 0) {
      alert("❌ Data kosong atau belum difilter!");
      return;
    }
    setExporting(true);
    try {
      const exportTarget = [...pivotTarget, totalTarget];
      const exportRealisasi = [...pivotRealisasi, totalRealisasi];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportTarget), "Target");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exportRealisasi), "Realisasi");
      XLSX.writeFile(wb, `pivot_data_stok_${new Date().toISOString().split('T')[0]}.xlsx`);
      alert("✅ Data pivot berhasil diekspor ke Excel!");
    } catch (error) {
      console.error("Gagal export Excel:", error);
      alert("❌ Gagal export Excel.");
    } finally {
      setExporting(false);
    }
  };
  {/*
  // Export PDF (menggunakan jsPDF dan autotable)
  const handleExportPDF = () => {
    if (filteredData.length === 0) {
      alert("❌ Data kosong atau belum difilter!");
      return;
    }
    setExporting(true);
    try {
      const doc = new jsPDF();
      const dateStr = new Date().toISOString().split('T')[0];

      // Header
      doc.setFontSize(16);
      doc.text("Dashboard Serap Gabah Setara Beras", 14, 20);
      doc.setFontSize(10);
      doc.text(`Periode: ${startDate || 'Semua'} - ${endDate || 'Semua'} | Kanwil: ${selectedKanwil}`, 14, 30);

      // Tabel Target
      doc.addPage();
      doc.setFontSize(12);
      doc.text("Tabel Target (Ton)", 14, 20);
      const targetHeaders = Object.keys(pivotTarget[0] || {});
      const targetData = pivotTarget.map(row => Object.values(row));
      targetData.push(Object.values(totalTarget)); // Tambah total
      doc.autoTable({
        head: [targetHeaders],
        body: targetData,
        startY: 30,
        theme: 'grid',
        headStyles: { fillColor: [227, 175, 5] }, // Warna kuning
        columnStyles: { 0: { cellWidth: 30 } }, // Kanwil lebih lebar
        styles: { fontSize: 8, cellPadding: 2 },
        margin: { left: 14, right: 14 },
      });

      // Tabel Realisasi
      doc.addPage();
      doc.setFontSize(12);
      doc.text("Tabel Realisasi (Ton)", 14, 20);
      const realisasiHeaders = Object.keys(pivotRealisasi[0] || {});
      const realisasiData = pivotRealisasi.map(row => Object.values(row));
      realisasiData.push(Object.values(totalRealisasi)); // Tambah total
      doc.autoTable({
        head: [realisasiHeaders],
        body: realisasiData,
        startY: 30,
        theme: 'grid',
        headStyles: { fillColor: [227, 175, 5] }, // Warna kuning
        columnStyles: { 0: { cellWidth: 30 } }, // Kanwil lebih lebar
        styles: { fontSize: 8, cellPadding: 2 },
        margin: { left: 14, right: 14 },
      });

      doc.save(`pivot_data_stok_${dateStr}.pdf`);
      alert("✅ Data pivot berhasil diekspor ke PDF!");
    } catch (error) {
      console.error("Gagal export PDF:", error);
      alert("❌ Gagal export PDF. Pastikan jsPDF dan autotable terinstall.");
    } finally {
      setExporting(false);
    }
  };
  */}
  if (!mounted) {
    return (
      <div className="p-6 text-center">
        <p className="text-yellow-500">Sedang memuat dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#3a543b] p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-start items-start md:items-center gap-4 mb-8">
        <img src="/kementan.ico" alt="Logo Kementan" className="w-10 h-10" />
        <h1 className="text-3xl md:text-4xl font-bold text-[#e3af05] tracking-tight">
          DASHBOARD SERAP GABAH SETARA BERAS
        </h1>
        <Link
          href="/"
          className="ml-auto bg-[#e3af05] text-white px-4 py-4 rounded-full font-semibold shadow hover:scale-110 transition flex items-center gap-2"
        >
          <FaHome />
        </Link>
      </div>

      <div className="space-y-5">
        {/* Filter Section */}
        <div className="bg-[#fff5d4] p-4 rounded-xl shadow-sm flex flex-wrap gap-6">
          {/* Dropdown Periode */}
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-600 mb-1">Periode</label>
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
              className="border border-gray-300 p-2 rounded-lg shadow-sm text-sm focus:ring-2 focus:ring-[#548c0c] focus:outline-none"
            >
              <option value="harian">Harian</option>
              <option value="bulanan">Bulanan</option>
            </select>
          </div>

          {/* Dropdown Kanwil */}
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-600 mb-1">Kanwil</label>
            <select
              value={selectedKanwil}
              onChange={(e) => setSelectedKanwil(e.target.value)}
              className="border border-gray-300 p-2 rounded-lg shadow-sm text-sm focus:ring-2 focus:ring-[#548c0c] focus:outline-none"
              disabled={data.length === 0}
            >
              {kanwilList.map((kanwil) => (
                <option key={kanwil} value={kanwil}>
                  {kanwil}
                </option>
              ))}
            </select>
          </div>

          {filterMode === "harian" && (
            <>
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-600 mb-1">Tanggal Awal</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border border-gray-300 p-2 rounded-lg shadow-sm w-full text-sm focus:ring-2 focus:ring-[#548c0c] focus:outline-none"
                />
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-gray-600 font-semibold mt-5">→</span>
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-600 mb-1">Tanggal Akhir</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border border-gray-300 p-2 rounded-lg shadow-sm w-full text-sm focus:ring-2 focus:ring-[#548c0c] focus:outline-none"
                />
              </div>
            </>
          )}

          {filterMode === "bulanan" && (
            <>
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-600 mb-1">Bulan</label>
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
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-gray-600 mb-1">Tahun</label>
                <input
                  type="number"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="border border-gray-300 p-2 rounded-lg shadow-sm w-28 text-sm focus:ring-2 focus:ring-[#548c0c] focus:outline-none ml-2"
                />
              </div>
            </>
          )}

          {/* Tombol Actions */}
          <div className="flex gap-2 ml-auto">
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
              disabled={exporting || filteredData.length === 0}
              className="flex items-center gap-2 bg-[#e3af05] text-white px-4 py-2 rounded-lg font-semibold shadow hover:scale-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaDownload /> {exporting ? "Mengekspor..." : "Download Excel"}
            </button>
            {/*
            <button
              onClick={handleExportPDF}
              disabled={exporting || filteredData.length === 0}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold shadow hover:scale-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaFilePdf /> {exporting ? "Mengekspor..." : "Download PDF"}
            </button>
            */}
          </div>
        </div>

        {/* Scorecard Cards (update title dan value untuk Total Kanwil) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: selectedKanwil !== "Semua" ? `${selectedKanwil} (dengan Realisasi)` : "Total Kanwil (dengan Realisasi)",
              value: totalKanwil,
              icon: <FaBuilding />,
              color: "bg-[#e3af05] text-white",
            },
            {
              title: "Realisasi Tertinggi (Ton)",
              value: realisasiTertinggi,
              icon: <FaArrowUp />,
              color: "bg-[#e3af05] text-white",
              tanggal: tanggalRealisasiTertinggi,
            },
            {
              title: "Total Realisasi (Ton)",
              value: totalStok,
              icon: <FaPlusCircle />,
              color: "bg-[#e3af05] text-white",
            },
          ].map((card, i) => (
            <div key={i} className="relative group">
              {/* Popup untuk Realisasi Tertinggi */}
              {card.title === "Realisasi Tertinggi (Ton)" && (
                <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-3 w-max bg-white border border-gray-300 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-800 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p className="font-semibold text-green-700">{card.tanggal || "-"}</p>
                  <p>
                    Realisasi: <span className="font-semibold text-gray-900">{card.value || "-"}</span>
                  </p>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-l border-t border-gray-300 rotate-45"></div>
                </div>
              )}
              <div
                className={`bg-white p-3 rounded-xl shadow hover:shadow-lg hover:scale-[1.05] transition flex items-center gap-4 cursor-pointer`}
              >
                <div className={`p-3 rounded-full text-2xl ${card.color}`}>
                  {card.icon}
                </div>
                <div>
                  <h2 className="text-sm text-gray-500">{card.title}</h2>
                  <p className="text-xl md:text-2xl font-bold text-gray-900">
                    {card.value || "-"}
                  </p>
                </div>
              </div>

              
            </div>
          ))}
        </div>

        {/* Chart Section (tampilan: LineChart untuk harian pendek/bulanan, BarChart untuk harian panjang/satu tahun) */}
        <div className="bg-white/90 backdrop-blur-md p-6 shadow-md rounded-2xl h-[420px]">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">
            {filterMode === "bulanan" ? "Stok Harian (Ton)" : shouldUseBarChartForHarian ? "Stok per Bulan (Ton)" : "Stok Harian (Ton)"}
          </h2>
          <ResponsiveContainer width="100%" height="100%">
            {filterMode === "bulanan" || !shouldUseBarChartForHarian ? (
              // LineChart untuk mode bulanan atau harian pendek
              <LineChart data={chartHarian} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d4dd9d" />
                <XAxis dataKey="Hari" />
                <YAxis
                  tickFormatter={(value) => {
                    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
                    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
                    return value.toLocaleString("id-ID");
                  }}
                />
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
                  dataKey="Realisasi"
                  stroke="#00a700"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            ) : (
              // BarChart untuk mode harian panjang (bulanan agregat)
              <BarChart data={chartBulan} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d4dd9d" />
                <XAxis dataKey="Bulan" />
                <YAxis
                  tickFormatter={(value) => {
                    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
                    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
                    return value.toLocaleString("id-ID");
                  }}
                />
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
                <Bar dataKey="Target" radius={[6, 6, 0, 0]} fill="#e3af05" />
                <Bar dataKey="Realisasi" radius={[6, 6, 0, 0]} fill="#00a700" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Pivot Table: Target */}
        <div className="bg-white/90 backdrop-blur-md shadow-md rounded-2xl p-4">
          <h2 className="text-xl font-semibold mb-3 text-[#475569]">Target (Ton)</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border text-sm">
              <thead className="bg-yellow-300">
                <tr>
                  {pivotTarget.length > 0 &&
                    Object.keys(pivotTarget[0]).map((key) => (
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
                {pivotTarget.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-yellow-50 transition`}
                  >
                    {Object.entries(row).map(([key, val], i) => (
                      <td
                        key={i}
                        className={`px-4 py-2 border text-gray-800 whitespace-nowrap ${
                          typeof val === "number" ? "text-right font-medium" : "text-left"
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
                {/* Baris Total */}
                <tr className="bg-yellow-100 font-bold">
                  {Object.entries(totalTarget).map(([key, val], i) => (
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

        {/* Pivot Table: Realisasi */}
        <div className="bg-white/90 backdrop-blur-md shadow-md rounded-2xl p-4">
          <h2 className="text-xl font-semibold mb-3 text-[#475569]">Realisasi (Ton)</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border text-sm">
              <thead className="bg-yellow-300">
                <tr>
                  {pivotRealisasi.length > 0 &&
                    Object.keys(pivotRealisasi[0]).map((key) => (
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
                {pivotRealisasi.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-yellow-50 transition`}
                  >
                    {Object.entries(row).map(([key, val], i) => (
                      <td
                        key={i}
                        className={`px-4 py-2 border text-gray-800 whitespace-nowrap ${
                          typeof val === "number" ? "text-right font-medium" : "text-left"
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
                {/* Baris Total */}
                <tr className="bg-yellow-100 font-bold">
                  {Object.entries(totalRealisasi).map(([key, val], i) => (
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

