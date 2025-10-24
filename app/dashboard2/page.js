"use client";

import React, { useEffect, useState, useRef } from "react";
import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FaHome, FaFilePdf, FaFileExcel } from "react-icons/fa";
import * as XLSX from "xlsx";

/*--------------- COMPONENT: MultiSelectDropdown ----------------------*/
import { FaChevronDown } from "react-icons/fa";

function MultiSelectDropdown({
  options,
  selectedOptions,
  onChange,
  maxSelections = Infinity,
  hideOptions = [],
  placeholder = "Pilih",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const visibleOptions = options.filter((o) => !hideOptions.includes(o));

  const toggleOption = (option) => {
    if (selectedOptions.includes(option)) {
      onChange(selectedOptions.filter((o) => o !== option));
      return;
    }

    if (option === "Semua Komoditas") {
      onChange(["Semua Komoditas"]);
      return;
    }

    if (maxSelections === 1) {
      onChange([option]);
      return;
    }

    onChange([...selectedOptions.filter((o) => o !== "Semua Komoditas"), option]);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left p-2.5 rounded-lg bg-gray-50 border border-gray-300 text-gray-700 focus:ring-2 focus:ring-green-500 outline-none flex items-center justify-between"
      >
        <span className="block truncate max-w-full">
          {selectedOptions.length > 0 ? selectedOptions.join(", ") : placeholder}
        </span>
        <FaChevronDown className={`ml-2 text-gray-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute bg-white border rounded shadow w-full max-h-60 overflow-auto z-50 mt-1">
          {visibleOptions.map((option) => {
            const isDisabled =
              maxSelections === 1 &&
              !selectedOptions.includes(option) &&
              selectedOptions.length >= 1;

            return (
              <label
                key={option}
                className={`flex items-center p-2 ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} hover:bg-gray-100`}
              >
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={selectedOptions.includes(option)}
                  disabled={isDisabled}
                  onChange={() => !isDisabled && toggleOption(option)}
                />
                <span className="truncate">{option}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

/*--------------- COMPONENT: SingleSelectDropdown ----------------------*/
function SingleSelectDropdown({ options, value, onChange, placeholder = "Pilih" }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left p-2.5 rounded-lg bg-gray-50 border border-gray-300 text-gray-700 focus:ring-2 focus:ring-green-500 outline-none flex items-center justify-between"
      >
        <span className="block truncate max-w-full">{value || placeholder}</span>
        <FaChevronDown className={`ml-2 text-gray-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="absolute bg-white border rounded shadow w-full max-h-60 overflow-auto z-50 mt-1">
          {options.map((opt) => (
            <div
              key={opt}
              className="p-2 cursor-pointer hover:bg-gray-100 truncate"
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/*--------------- MAIN COMPONENT: Dashboard2 ----------------------*/
export default function Dashboard2() {
  /*--------------- STATE ----------------------*/
  const [data, setData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [pivotedRows, setPivotedRows] = useState([]); // untuk mode >1 bulan (pivot)
  const [isMultiMonth, setIsMultiMonth] = useState(false);
  const [tahun, setTahun] = useState("");
  const [bulan, setBulan] = useState([]);
  const [selectedKomoditas, setSelectedKomoditas] = useState([]);
  const [selectedCols, setSelectedCols] = useState([]);
  const [error, setError] = useState(null);
  const [keterangan, setKeterangan] = useState("");

  /*--------------- DATA SOURCE ----------------------*/
  const CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vSbg6NqZTs6LflArystJ2fc-zC7esk52mBGtKWD8pSnhWxW_ScbEbPWXdsp5Gh5tOiEuKhNcGzEHpxQ/pub?output=csv";

  /*--------------- LOAD DATA ----------------------*/
  useEffect(() => {
    fetch(CSV_URL)
      .then((res) => res.text())
      .then((csv) => {
        Papa.parse(csv, {
          header: true,
          skipEmptyLines: true,
          complete: (result) => {
            const trimmedData = result.data.map((row) => {
              const newRow = {};
              Object.keys(row).forEach((key) => {
                newRow[key.trim()] = row[key];
              });
              return newRow;
            });
            setData(trimmedData);
          },
        });
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
  if (bulan.length > 1) {
    // sembunyikan pilihan "Semua Komoditas" dan "Beras" dari currently selected
    setSelectedKomoditas(prev => {
      const filtered = prev.filter(k => k !== "Semua Komoditas" && k !== "Beras");
      // kalau lebih dari 1 tersisa, paksa hanya 1 (keep first)
      if (filtered.length > 1) return [filtered[0]];
      return filtered;
    });
    setIsMultiMonth(true);
  } else {
    setIsMultiMonth(false);
  }
}, [bulan]);


  /*--------------- FILTER DATA OPTIONS ----------------------*/
  const years = [...new Set(data.map((d) => d.Tahun))];
  const months = [...new Set(data.map((d) => d.Bulan))];

  const komoditasMap = {
    Beras: ["CBP Bulog", "Komersial", "CBP Supplier", "Total Stok Beras", "Total CBP"],
    Gula: ["Gula (Ton)"],
    Kedelai: ["Kedelai (Ton)"],
    "Jagung Pakan": ["Jagung Pakan (Ton)"],
    "Minyak Goreng": ["Minyak Goreng (KiloLiter)"],
    "Minyak Goreng Curah": ["Minyak Goreng Curah (Ton)", "Minyak Goreng Curah (KiloLiter)"],
    "Tepung Terigu": ["Tepung Terigu (Ton)"],
    "Daging Sapi": ["Daging Sapi (Ton)", "Daging Sapi (Pcs)"],
    "Daging Kerbau": ["Daging Kerbau (Ton)"],
    "Daging Ayam": ["Daging Ayam (Ton)", "Daging Ayam (Pcs)"],
    "Bawang Merah": ["Bawang Merah (Ton)"],
    "Bawang Putih": ["Bawang Putih (Ton)"],
    Cabai: ["Cabai (Ton)"],
    Telur: ["Telur (Ton)"],
  };

  const allCommodityColumns = Object.values(komoditasMap).flat();

    // kalau bulan > 1, maka pakai daftar sub-komoditas saja
  const subKomoditasList = [
    "CBP Bulog", "Komersial", "CBP Supplier", "Total Stok Beras", "Total CBP",
    "Gula (Ton)", "Kedelai (Ton)", "Jagung Pakan (Ton)",
    "Minyak Goreng (KiloLiter)", "Minyak Goreng Curah (Ton)", "Minyak Goreng Curah (KiloLiter)",
    "Tepung Terigu (Ton)", "Daging Sapi (Ton)", "Daging Sapi (Pcs)",
    "Daging Kerbau (Ton)", "Daging Ayam (Ton)", "Daging Ayam (Pcs)",
    "Bawang Merah (Ton)", "Bawang Putih (Ton)", "Cabai (Ton)", "Telur (Ton)"
  ];

  const commodityOptions = bulan.length > 1
    ? subKomoditasList
    : [
        "Semua Komoditas",
        ...Object.keys(komoditasMap),
        ...(komoditasMap.Beras || []).filter(o => !Object.keys(komoditasMap).includes(o)),
      ];

  /*--------------- HANDLE FILTER ----------------------*/
  const parseNum = (v) => {
  if (v === null || v === undefined) return null;
  // hapus semua titik ribuan, ubah koma ke titik
  const cleaned = String(v)
    .replace(/\./g, "")  // hapus semua titik ribuan
    .replace(/,/g, ".")  // ubah koma ke titik desimal
    .replace(/\s+/g, ""); // hapus spasi
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
};

const handleReset = () => {
  setTahun("");
  setBulan([]);
  setSelectedKomoditas([]);
  setFiltered([]);
  setPivotedRows([]);
  setSelectedCols([]);
  setKeterangan("");
  setIsMultiMonth(false);
};

const handleFilter = () => {
  if (!tahun || bulan.length === 0 || selectedKomoditas.length === 0) {
    setFiltered([]);
    setSelectedCols([]);
    setPivotedRows([]);
    return;
  }

  // ambil semua baris untuk tahun dan bulan(s) terpilih
  const f = data.filter((d) => d.Tahun === tahun && bulan.includes(d.Bulan) && d.Kanwil);
  setKeterangan(
    f
      .map((row) => row["Keterangan"]?.trim())
      .filter((k) => k && k !== "")
      .join(" ; ")
  );

  if (bulan.length === 1) {
    // === single-month mode (mirip behavior lama) ===
    setIsMultiMonth(false);
    setFiltered(f);

    let colsAvailable = [];
    if (selectedKomoditas.includes("Semua Komoditas")) {
      colsAvailable = allCommodityColumns.filter((col) =>
        f.some((row) => row[col] && row[col] !== "")
      );
    } else {
      selectedKomoditas.forEach((kom) => {
        if (komoditasMap[kom]) {
          colsAvailable.push(
            ...komoditasMap[kom].filter((col) => f.some((row) => row[col] && row[col] !== ""))
          );
        } else {
          // komoditas langsung (mis. "CBP Bulog")
          if (f.some((row) => row[kom] && row[kom] !== "")) colsAvailable.push(kom);
        }
      });
    }
    setSelectedCols(colsAvailable);
    setPivotedRows([]); // clear pivot
  } else {
    // === MULTI-BULAN MODE: pivot ke format Kanwil x Bulan ===
    setIsMultiMonth(true);
    // hanya 1 komoditas harus dipilih (UI memaksa ini)
    const chosen = selectedKomoditas[0];
    if (!chosen) {
      setFiltered([]);
      setSelectedCols([]);
      setPivotedRows([]);
      return;
    }

    // tentukan nama kolom data yang dipakai:
    const chosenCol = komoditasMap[chosen] ? komoditasMap[chosen][0] : chosen;

    // group by Kanwil, buat row untuk setiap Kanwil, kolom per bulan
    const kanwils = Array.from(new Set(f.map((r) => r.Kanwil)));
    const pivot = kanwils.map((kw, idx) => {
      const row = { No: idx + 1, Kanwil: kw };
      bulan.forEach((m) => {
        const rec = f.find((r) => r.Kanwil === kw && r.Bulan === m);
        row[m] = rec ? (rec[chosenCol] ?? "-") : "-";
      });
      return row;
    });

    setPivotedRows(pivot);
    setSelectedCols(bulan); // header = list bulan
    setFiltered([]); // bukan lagi raw rows
  }
};

/*--------------- EXPORT PDF ----------------------*/
const exportPDF = () => {
  const hasData = isMultiMonth ? pivotedRows.length : filtered.length;
  if (!hasData) {
    alert("Tidak ada data untuk diekspor!");
    return;
  }

  const doc = new jsPDF("l", "pt", "a4");
  doc.setFontSize(14);
  doc.text(`Stok Akhir ${selectedKomoditas.join(", ")}`, 14, 20);
  doc.setFontSize(10);
  doc.text(`Tahun: ${tahun} | Bulan: ${bulan.join(", ")}`, 14, 35);

  const tableColumn = ["Nomor", "Kanwil", ...selectedCols];
  const tableRows = (isMultiMonth ? pivotedRows : filtered).map((row) => [
    row.No || "-",
    row.Kanwil || "-",
    ...selectedCols.map((col) => {
      const val = row[col];
      const num = parseFloat(String(val).replace(/,/g, "").replace(/\s+/g, ""));
      return isNaN(num) ? val || "-" : num;
    }),
  ]);

  // Hitung total setiap kolom
  const totalRow = ["", "TOTAL"];
  selectedCols.forEach((col) => {
    const total = (isMultiMonth ? pivotedRows : filtered).reduce((sum, row) => {
  const val = parseNum(row[col]); // <---- ubah ke sini
  return sum + (val ?? 0);
}, 0);
    totalRow.push(total.toLocaleString("id-ID"));
  });
  tableRows.push(totalRow);

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 50,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [0, 102, 204], halign: "center" },
  });

  if (keterangan) {
    doc.text(`Keterangan: ${keterangan}`, 14, doc.lastAutoTable.finalY + 20);
  }

  const fileName = `Stok Akhir ${selectedKomoditas.join(", ")} - ${tahun} - ${bulan.join(", ")}.pdf`;
  doc.save(fileName);
};

/*--------------- EXPORT EXCEL ----------------------*/
const exportExcel = () => {
  const hasData = isMultiMonth ? pivotedRows.length : filtered.length;
  if (!hasData) {
    alert("Tidak ada data untuk diekspor!");
    return;
  }

  const exportData = (isMultiMonth ? pivotedRows : filtered).map((row) => {
    const obj = { Nomor: row.No || "-", Kanwil: row.Kanwil || "-" };
    selectedCols.forEach((col) => {
      obj[col] = row[col] || 0;
    });
    return obj;
  });

  const totalRow = { Nomor: "TOTAL", Kanwil: "" };
  selectedCols.forEach((col) => {
    const sum = (isMultiMonth ? pivotedRows : filtered).reduce((acc, row) => {
      const val = parseNum(row[col]); // ✅ gunakan parseNum langsung
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
    totalRow[col] = sum.toLocaleString("id-ID");
  });
  exportData.push(totalRow);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([]);

  XLSX.utils.sheet_add_aoa(
    ws,
    [
      [`Stok Akhir ${selectedKomoditas.join(", ")}`],
      [`Tahun: ${tahun}`, `Bulan: ${bulan.join(", ")}`],
      [],
    ],
    { origin: "A1" }
  );

  XLSX.utils.sheet_add_json(ws, exportData, { origin: "A4", skipHeader: false });

  if (keterangan) {
    XLSX.utils.sheet_add_aoa(ws, [["Keterangan:", keterangan]], {
      origin: `A${exportData.length + 6}`,
    });
  }

  XLSX.utils.book_append_sheet(wb, ws, "Data");
  const fileName = `Stok Akhir ${selectedKomoditas.join(", ")} - ${tahun} - ${bulan.join(", ")}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

  /*--------------- RENDER UI ----------------------*/
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-8 bg-pattern">
      {/*--------------- HEADER ----------------------*/}
      <div className="flex flex-wrap justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <img src="/logo-kementan.png" alt="Logo Kementan" className="w-12 h-12 object-contain" />
          <h1 className="text-4xl font-bold text-gray-800 tracking-tight">
            Persediaan Komoditas Perum BULOG per Kanwil
          </h1>
        </div>
        {/*--------------- BUTTONS ----------------------*/}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => (window.location.href = "/")}
            className="flex items-center justify-center w-11 h-11 bg-black text-white rounded-full shadow-md hover:bg-gray-800 hover:-translate-y-1 hover:shadow-lg active:scale-95 transition-all"
          >
            <FaHome size={18} />
          </button>

          <button
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow transition-all"
            onClick={exportPDF}
          >
            <FaFilePdf /> PDF
          </button>

          <button
            className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg shadow transition-all"
            onClick={exportExcel}
          >
            <FaFileExcel /> Excel
          </button>
        </div>
      </div>

      {/*--------------- FILTER CARD ----------------------*/}
      <div className="bg-white p-6 rounded-2xl shadow-lg mb-10">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Filter Data Komoditas</h2>
        <div className="flex flex-wrap gap-4 mb-6 items-center">
        {/* Dropdown Tahun */}
<SingleSelectDropdown
  options={years}
  value={tahun}
  onChange={setTahun}
  placeholder="Pilih Tahun"
/>


         {/* Dropdown Bulan (multi-select) */}
<MultiSelectDropdown
  options={months}            // months = [...new Set(data.map(d => d.Bulan))]
  selectedOptions={bulan}
  onChange={setBulan}
  placeholder="Pilih Bulan"
  maxSelections={Infinity}   // bebas berapa saja
/>


          {/* Dropdown Komoditas (MultiSelect) */}
          <MultiSelectDropdown
  options={commodityOptions}
  selectedOptions={selectedKomoditas}
  onChange={setSelectedKomoditas}
  hideOptions={isMultiMonth ? ["Semua Komoditas", "Beras"] : []}
  maxSelections={isMultiMonth ? 1 : Infinity}
  placeholder="Pilih Komoditas"
/>

          {/* Tombol Filter */}
          <button
            onClick={handleFilter}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg px-4 py-2.5 transition-all"
          >
            Tampilkan Data
          </button>

          {/* Tombol Reset */}
<button
  onClick={handleReset}
  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold rounded-lg px-4 py-2.5 transition-all"
>
  Reset
</button>
        </div>
      </div>

     {/*--------------- TABEL DATA ----------------------*/}
{(isMultiMonth ? pivotedRows.length > 0 : filtered.length > 0) && selectedKomoditas.length > 0 && (
  <div className="bg-white p-6 rounded-2xl shadow-lg overflow-x-auto">
    <table className="min-w-full border-collapse border text-sm text-gray-800 table-auto">
      <thead>
        <tr className="bg-gray-100">
          <th className="border p-2 text-center whitespace-nowrap">Nomor</th>
          <th className="border p-2 text-left whitespace-nowrap">Kanwil</th>

          {isMultiMonth
            ? selectedCols.map((m, idx) => (
                <th key={`${m}-${idx}`} className="border p-2 text-left whitespace-normal">{m}</th>
              ))
            : selectedCols.map((col, idx) => (
                <th key={`${col}-${idx}`} className="border p-2 text-left whitespace-normal">
                  {col.includes("(") ? (
                    <>
                      {col.split(" (")[0]} <br />
                      ({col.split(" (")[1].replace(/\)+$/, "")})
                    </>
                  ) : (
                    col
                  )}
                </th>
              ))}
        </tr>
      </thead>

      <tbody>
        {isMultiMonth
          ? pivotedRows.map((row, i) => (
              <tr key={`row-${i}`} className="hover:bg-gray-50 even:bg-gray-100 transition">
                <td className="border p-2 text-center">{row.No}</td>
                <td className="border p-2">{row.Kanwil}</td>
                {selectedCols.map((m, j) => (
                  <td key={`${m}-${j}`} className="border p-2 text-right">{row[m] ?? "-"}</td>
                ))}
              </tr>
            ))
          : filtered.map((row, i) => (
              <tr key={`row-${i}`} className="hover:bg-gray-50 even:bg-gray-100 transition">
                <td className="border p-2 text-center">{row.No}</td>
                <td className="border p-2">{row.Kanwil}</td>
                {selectedCols.map((col, j) => (
                  <td key={`${col}-${j}`} className="border p-2 text-right">{row[col] || "-"}</td>
                ))}
              </tr>
            ))}

        {/* Row TOTAL */}
        <tr className="bg-gray-200 font-bold">
          <td className="border p-2 text-center" colSpan={2}>TOTAL</td>
          {isMultiMonth
            ? selectedCols.map((m, j) => {
                const total = pivotedRows.reduce((sum, r) => {
                  const v = parseNum(r[m]);
                  return sum + (v ?? 0);
                }, 0);
                return <td key={`total-${m}-${j}`} className="border p-2 text-right">{total.toLocaleString("id-ID")}</td>;
              })
            : selectedCols.map((col, j) => {
                const total = filtered.reduce((sum, row) => {
                  const v = parseNum(row[col]);
                  return sum + (v ?? 0);
                }, 0);
                return <td key={`total-${col}-${j}`} className="border p-2 text-right">{total.toLocaleString("id-ID")}</td>;
              })}
        </tr>
      </tbody>
    </table>
  </div>
)}


      {/*--------------- KETERANGAN ----------------------*/}
      {filtered.length > 0 && keterangan && (
        <p className="mt-4 text-sm text-gray-700">
          <strong>Keterangan:</strong> {keterangan}
        </p>
      )}

      {/*--------------- PESAN DATA KOSONG ----------------------*/}
{!error && !isMultiMonth && filtered.length === 0 && (
  <p className="text-gray-500 italic text-center mt-10">
    Tidak ada data yang ditampilkan. Silakan pilih filter terlebih dahulu.
  </p>
)}

    </div>
  );
}
