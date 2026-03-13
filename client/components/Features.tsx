import React, { useState } from "react";
import { Sparkles, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

const featureCategories = [
  {
    id: "workflow",
    title: "Comprehensive Scientific Workflow",
    description: "Rigorous Academic Standards",
    items: [
      {
        title: "Submission Management",
        desc: "Customizable forms for abstracts and full papers with automated deadline enforcement and version control.",
        image:
          "https://images.unsplash.com/photo-1562654501-a0ccc0fc3fb1?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8YXNzaWdubWVudHxlbnwwfHwwfHx8MA%3D%3D", // Ảnh Dashboard/Laptop
      },
      {
        title: "Peer Review Orchestration",
        desc: "Advanced assignment algorithms for blind, double-blind, or open review processes with scoring rubrics.",
        image:
          "https://images.unsplash.com/photo-1768811838777-0507859b5ab9?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTF8fHJldmlldyUyMHBhcGVyfGVufDB8fDB8fHww", // Ảnh Teamwork/Review
      },
      {
        title: "Program Scheduling",
        desc: "Conflict-free session building with drag-and-drop tools for multi-track agendas and room allocation.",
        image:
          "https://media.istockphoto.com/id/2188188739/vi/anh/l%E1%BA%ADp-k%E1%BA%BF-ho%E1%BA%A1ch-v%C3%A0-l%C3%AAn-l%E1%BB%8Bch-cu%E1%BB%99c-h%E1%BB%8Dp-ho%E1%BA%A1t-%C4%91%E1%BB%99ng-qu%E1%BA%A3n-l%C3%BD-th%E1%BB%9Di-gian-th%C3%B4ng-b%C3%A1o-v%C3%A0-nh%E1%BA%AFc-nh%E1%BB%9F-c%C3%A1c-s%E1%BB%B1-ki%E1%BB%87n.jpg?s=2048x2048&w=is&k=20&c=9LHglzU3T7e4JY4thiRz1_ccWKMv1GuhNwGpDPNNE5w=", // Ảnh Planning/Lịch
      },
    ],
  },
  {
    id: "operations",
    title: "On-Site & Event Operations",
    description: "Seamless Execution",
    items: [
      {
        title: "Registration & Payments",
        desc: "Flexible ticket tiers, academic discounts, and automated invoice generation with global tax compliance.",
        image:
          "https://media.istockphoto.com/id/1477483635/vi/anh/ng%C6%B0%E1%BB%9Di-%C4%91%C3%A0n-%C3%B4ng-tr%C6%B0%E1%BB%9Fng-th%C3%A0nh-thanh-to%C3%A1n-b%E1%BA%B1ng-th%E1%BA%BB-t%C3%ADn-d%E1%BB%A5ng-t%E1%BA%A1i-qu%C3%A1n-c%C3%A0-ph%C3%AA-c%E1%BA%ADn-c%E1%BA%A3nh-b%C3%A0n-tay-v%E1%BB%9Bi.jpg?s=612x612&w=0&k=20&c=WkwbyVV2RhYMhlIsUzYm4mgiBJGlaV_PMFqh7ekDR-A=", // Ảnh Payment/Card
      },
      {
        title: "Check-in & Badging",
        desc: "QR-code based rapid check-in and on-demand badge printing to eliminate queue bottlenecks.",
        image:
          "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80", // Ảnh Event/Hội nghị
      },
      {
        title: "Proceedings Generation",
        desc: "One-click compilation of accepted papers into standardized formats (IEEE, ACM, LNCS) for publication.",
        image:
          "https://images.unsplash.com/photo-1618044733300-9472054094ee?auto=format&fit=crop&w=800&q=80", // Ảnh Documents/Library
      },
    ],
  },
  {
    id: "ai",
    title: "Smart Enhancement Tools",
    description: "AI-Powered Intelligence",
    isAi: true,
    items: [
      {
        title: "Smart Reviewer Matching",
        desc: "NLP analysis matches submission content with reviewer expertise profiles to ensure quality feedback.",
        image:
          "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=800&q=80", // Ảnh AI/Network
      },
      {
        title: "Plagiarism Detection",
        desc: "Integrated scanning against global academic databases to identify originality issues instantly.",
        image:
          "data:image/jpeg;base64,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", // Ảnh Search/Scan
      },
      {
        title: "Impact Analytics",
        desc: "Predictive modeling on session attendance and topic trending to optimize conference logistics.",
        image:
          "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80", // Ảnh Analytics/Graph
      },
    ],
  },
];

const Features: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % featureCategories.length);
  };

  const prevSlide = () => {
    setCurrentIndex(
      (prev) =>
        (prev - 1 + featureCategories.length) % featureCategories.length,
    );
  };

  return (
    <section id="features" className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Section Header */}
        <div className="mb-10 max-w-3xl mx-auto text-center">
          <h3 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            Key Features
          </h3>
        </div>

        {/* Carousel Container */}
        <div className="relative">
          {/* Slides Viewport */}
          <div className="overflow-hidden rounded-3xl bg-slate-50/50 border border-slate-100">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {featureCategories.map((category) => (
                <div
                  key={category.id}
                  className="w-full flex-shrink-0 p-6 md:p-12"
                >
                  {/* Category Header within Slide */}
                  <div className="text-center mb-10">
                    {/* Description: Màu xanh dương, không còn icon */}
                    <span className="text-blue-600 font-semibold tracking-wide uppercase text-sm mb-2 block">
                      {category.description}
                    </span>

                    {/* Title: Luôn luôn màu đen */}
                    <h4 className="text-2xl md:text-3xl font-bold text-slate-900">
                      {category.title}
                    </h4>
                  </div>
                  {/* Features Grid (Horizontal Layout) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                    {category.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="group bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-brand-200 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full overflow-hidden"
                      >
                        {/* Image Container */}
                        <div className="w-full h-48 overflow-hidden relative border-b border-slate-100">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                          />
                          {/* Overlay nhẹ để tách biệt ảnh và viền nếu ảnh quá sáng */}
                          <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors"></div>
                        </div>

                        {/* Content */}
                        <div className="p-6 flex-grow flex flex-col">
                          <h5 className="font-bold text-lg text-slate-900 mb-3 group-hover:text-brand-700 transition-colors">
                            {item.title}
                          </h5>
                          <p className="text-sm text-slate-600 leading-relaxed">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Controls */}
          <button
            onClick={prevSlide}
            className="hidden md:flex absolute top-1/2 -left-5 lg:-left-6 -translate-y-1/2 bg-white border border-slate-200 text-slate-700 p-3 rounded-full shadow-lg hover:bg-slate-50 hover:text-brand-700 transition-all z-10 focus:outline-none focus:ring-2 focus:ring-brand-500"
            aria-label="Previous category"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={nextSlide}
            className="hidden md:flex absolute top-1/2 -right-5 lg:-right-6 -translate-y-1/2 bg-white border border-slate-200 text-slate-700 p-3 rounded-full shadow-lg hover:bg-slate-50 hover:text-brand-700 transition-all z-10 focus:outline-none focus:ring-2 focus:ring-brand-500"
            aria-label="Next category"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Pagination Dots */}
          <div className="flex justify-center mt-8 space-x-2">
            {featureCategories.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-2 rounded-full transition-all duration-300 focus:outline-none ${
                  idx === currentIndex
                    ? "w-8 bg-brand-600"
                    : "w-2 bg-slate-300 hover:bg-slate-400"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          {/* Mobile Arrows */}
          <div className="md:hidden flex justify-center gap-4 mt-6">
            <button
              onClick={prevSlide}
              className="p-2 rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextSlide}
              className="p-2 rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
