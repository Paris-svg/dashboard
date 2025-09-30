"use client";

import React from "react";
import Link from "next/link";
import { FaChartLine } from "react-icons/fa";

export default function Dashboard2Page() {
  return (
    <div className="min-h-screen bg-[#1c1c1c] p-6 md:p-8">
      <h1 className="text-3xl font-bold text-[#fcc203] mb-6">
        DASHBOARD 2
      </h1>
      <Link
                href="/dashboard"
                className="ml-auto bg-[#e3af05] text-white px-4 py-2 rounded-lg font-semibold shadow hover:scale-110 transition flex items-center gap-2"
              >
                <FaChartLine /> back to Dashboard 1
              </Link>
      <p className="text-white">
        COMING SOON...
      </p>
    </div>
  );
}
