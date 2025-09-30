document.addEventListener("DOMContentLoaded", function () {
  const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTPZEeZSommCNEq"

  fetch(sheetUrl)
    .then(response => response.text())
    .then(csvText => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
          const data = results.data;

          // Ambil kolom "Nilai"
          const nilaiList = data.map(row => Number(row["Nilai"])).filter(n => !isNaN(n));

          if (nilaiList.length > 0) {
            // Hitung rata-rata
            const total = nilaiList.reduce((a, b) => a + b, 0);
            const rataRata = total / nilaiList.length;

            // Hitung tertinggi & terendah
            const tertinggi = Math.max(...nilaiList);
            const terendah = Math.min(...nilaiList);

            // Masukkan ke dashboard
            document.getElementById("rataRata").textContent = rataRata.toFixed(2);
            document.getElementById("tertinggi").textContent = tertinggi;
            document.getElementById("terendah").textContent = terendah;

            // Fungsi untuk parsing angka format Indonesia
function parseNumber(value) {
  if (!value) return 0;
  return Number(value.replace(/\./g, '').replace(',', '.')) || 0;
}

// Contoh penggunaan saat baca data
function processData(data) {
  return data.map(row => {
    return {
      kanwil: row["Kanwil"],
      nilai1: parseNumber(row["1/1/2025"]),
      nilai2: parseNumber(row["1/2/2025"]),
      // tambahkan kalau ada kolom lain
    };
  });
}

// Contoh hitung total
function calculateTotal(data) {
  let total = 0;
  data.forEach(row => {
    total += row.nilai1 + row.nilai2;
  });
  return total;
}

          }
        }
      });
    });
});
