// app/api/data/route.js
import Papa from "papaparse";

export async function GET() {
  try {
    const url =
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vTPZEeZSommCNEqg9fdFaPAvailUk_asKS0jEVrbpWulqTFtynCcEaUcGxkGUebO-widBfS21dqcOe5/pub?output=csv";

    // fetch CSV dari Google Sheets
    const res = await fetch(url);
    const csvText = await res.text();

    // parse CSV ke JSON
    const parsed = Papa.parse(csvText, { header: true });

    return new Response(JSON.stringify(parsed.data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Gagal ambil data", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
