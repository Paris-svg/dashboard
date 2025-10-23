"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Poppins, Inter } from "next/font/google";

// Load fonts
const poppins = Poppins({
  weight: ["600", "700"],
  subsets: ["latin"],
});

const inter = Inter({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export default function Home() {
  const router = useRouter();

  return (
    <div className={`h-screen w-screen flex items-center justify-center ${inter.className}`}>
      {/* Background */}
      <div
        className="h-full w-full bg-cover bg-center relative"
        style={{ backgroundImage: `url('/cover.jpg')` }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70"></div>

        {/* Konten */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center text-white px-6">
          {/* Heading pakai Poppins */}
          <h1
            className={`
              text-5xl md:text-7xl font-extrabold drop-shadow-2xl flex items-center gap-5 tracking-wide
              ${poppins.className} animate-fadeIn
            `}
          >
            <span className="bg-[#ffe000] bg-clip-text text-transparent leading-tight">
              Selamat Datang
            </span>
            <img
              src="/logo-kementan.png"
              alt="Logo Kementerian Pertanian"
              className="h-16 w-16 md:h-20 md:w-20 object-contain drop-shadow-xl animate-logo transition-transform duration-700 ease-in-out hover:scale-125 hover:rotate-12"
            />
          </h1>

          {/* Subheading */}
          <p className="mt-6 text-lg md:text-xl text-gray-200 max-w-2xl animate-slideUp">
            Pusat Data dan Sistem Informasi Pertanian - Kementerian Pertanian Republik Indonesia
          </p>

          {/* Tombol pakai Inter */}
          <div className="flex flex-col md:flex-row gap-6 mt-10">
            <button
              onClick={() => router.push("/dashboard")}
              className={`
                mt-10 px-10 py-4 font-semibold rounded-full text-lg
                bg-[#ffe000] text-black
                hover:from-transparent hover:to-transparent hover:border-2 hover:border-[#c4d434] hover:text-[#c4d434]
                active:scale-95 active:shadow-inner
                transform hover:scale-110 transition-all duration-300
                animate-bounceOnce
              `}
            >
              Dashboard 1
            </button>
            <button
              onClick={() => router.push("/dashboard2")}
              className={`
                mt-10 px-10 py-4 font-semibold rounded-full text-lg
                bg-[#ffe000] text-black
                hover:from-transparent hover:to-transparent hover:border-2 hover:border-[#c4d434] hover:text-[#c4d434]
                active:scale-95 active:shadow-inner
                transform hover:scale-110 transition-all duration-300
                animate-bounceOnce
              `}
            >
              Dashboard 2
            </button>
          </div>
          {/*
          <button
            onClick={() => router.push("/dashboard")}
            className={`
              mt-10 px-10 py-4 font-semibold rounded-full text-lg
              bg-gradient-to-r from-[#c4d434] to-[#a3b31d] text-black
              shadow-lg hover:shadow-[0_0_30px_#c4d434]
              hover:from-transparent hover:to-transparent hover:border-2 hover:border-[#c4d434] hover:text-[#c4d434]
              active:scale-95 active:shadow-inner
              transform hover:scale-110 transition-all duration-300
              animate-bounceOnce
            `}
          >
            Dashboard 1
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className={`
              mt-10 px-10 py-4 font-semibold rounded-full text-lg
              bg-gradient-to-r from-[#c4d434] to-[#a3b31d] text-black
              shadow-lg hover:shadow-[0_0_30px_#c4d434]
              hover:from-transparent hover:to-transparent hover:border-2 hover:border-[#c4d434] hover:text-[#c4d434]
              active:scale-95 active:shadow-inner
              transform hover:scale-110 transition-all duration-300
              animate-bounceOnce
            `}
          >
            Dashboard 2
          </button>
          */}
        </div>
      </div>

      {/* Animasi custom */}
      <style jsx>{`
        /* Heading entrance */
        @keyframes headingEntrance {
          0% { opacity: 0; transform: translateY(50px) scale(0.8); }
          60% { opacity: 1; transform: translateY(-10px) scale(1.05); }
          100% { transform: translateY(0) scale(1); }
        }

        /* Logo entrance */
        @keyframes logoEntrance {
          0% { opacity: 0; transform: scale(0) rotate(0deg); }
          70% { opacity: 1; transform: scale(1.2) rotate(180deg); }
          100% { transform: scale(1) rotate(360deg); }
        }

        /* Subheading slide-up */
        @keyframes subheadingEntrance {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        /* Button bounce */
        @keyframes buttonEntrance {
          0% { opacity: 0; transform: translateY(20px) scale(0.8); box-shadow: 0 0 0px #c4d434; }
          60% { transform: translateY(-5px) scale(1.05); box-shadow: 0 0 20px #c4d434; }
          100% { opacity: 1; transform: translateY(0) scale(1); box-shadow: 0 0 10px #c4d434; }
        }

        /* Semua elemen muncul halus dengan sedikit delay */
        .animate-fadeIn {
          animation: headingEntrance 1.2s cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards;
          animation-delay: 0s;
        }
        .animate-logo {
          animation: logoEntrance 1.2s cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards;
          animation-delay: 0.2s;
        }
        .animate-slideUp {
          animation: subheadingEntrance 1.2s cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards;
          animation-delay: 0.4s;
        }
        .animate-bounceOnce {
          animation: buttonEntrance 1.2s cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards;
          animation-delay: 0.6s;
        }
      `}</style>
    </div>
  );
}
