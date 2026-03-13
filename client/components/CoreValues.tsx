import React from "react";

// Configuration for Core Values
// Replace the 'image' URLs below with your specific PNGTree icon assets
const values = [
  {
    title: "Reliability",
    description:
      "Secure data handling and robust infrastructure for high-stakes events.",
    image: "https://cdn-icons-png.flaticon.com/128/10108/10108175.png",
  },
  {
    title: "Integration",
    description:
      "A single source of truth connecting online management with on-site execution.",
    image: "https://cdn-icons-png.flaticon.com/128/4269/4269808.png",
  },
  {
    title: "Efficiency",
    description:
      "Tools designed to save time and reduce manual errors throughout the conference lifecycle.",
    image: "https://cdn-icons-png.flaticon.com/128/833/833602.png",
  },
];

const CoreValues: React.FC = () => {
  return (
    <section className="py-20 bg-white border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-brand-600 font-semibold tracking-wide uppercase text-sm mb-2">
            Why Choose Us
          </h2>
          <h3 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            Our Core Values
          </h3>
          <div className="w-20 h-1.5 bg-brand-500 rounded-full mx-auto mt-6"></div>
        </div>

        {/* Values Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16">
          {values.map((value, index) => (
            <div
              key={index}
              className="flex flex-col items-center text-center group hover:-translate-y-1 transition-transform duration-300"
            >
              {/* Icon Container */}
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-brand-100 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative w-32 h-32 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center p-6 shadow-sm group-hover:shadow-md group-hover:border-brand-200 transition-all">
                  <img
                    src={value.image}
                    alt={`${value.title} Icon`}
                    className="w-full h-full object-contain opacity-90 group-hover:opacity-100 transition-opacity"
                  />
                </div>
              </div>

              {/* Text Content */}
              <h4 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-brand-700 transition-colors">
                {value.title}
              </h4>
              <p className="text-slate-600 leading-relaxed max-w-xs mx-auto">
                {value.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CoreValues;
