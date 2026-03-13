import React from "react";

const Partners: React.FC = () => {
  return (
    <section className="py-16 bg-white border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm font-medium text-slate-500 mb-8 uppercase tracking-widest">
          Trusted by leading research institutions and partners
        </p>

        <div className="flex flex-wrap justify-center items-center gap-12 lg:gap-20 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
          {/* Google Logo */}
          <div className="flex items-center space-x-2">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg"
              alt="Google"
              className="h-8 lg:h-10 w-auto"
            />
          </div>

          {/* Dummy Partners using Text/SVG placeholders to simulate a list of logos */}
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold font-serif text-slate-700">
              MIT
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-slate-800 tracking-tighter">
              Stanford
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <svg
              className="h-8 w-8 text-slate-800"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z" />
            </svg>
            <span className="text-xl font-bold text-slate-800">
              ResearchLab
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-2xl font-semibold text-slate-700 italic">
              ScienceDirect
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Partners;
