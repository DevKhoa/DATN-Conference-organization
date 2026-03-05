import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRight, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './ui/Button';

// Image configuration
const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1559223607-a43c990c692c?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1591115765373-5207764f72e7?q=80&w=2070&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1558008258-3256797b43f3?q=80&w=1331&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1560439514-4e9645039924?q=80&w=2070&auto=format&fit=crop"
];

interface HeroProps {
  onNavigateRegister: () => void;
}

const Hero: React.FC<HeroProps> = ({ onNavigateRegister }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % HERO_IMAGES.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + HERO_IMAGES.length) % HERO_IMAGES.length);
  }, []);

  useEffect(() => {
    const slideInterval = setInterval(() => {
      nextSlide();
    }, 6000); 

    return () => clearInterval(slideInterval);
  }, [nextSlide]);

  return (
    <section className="relative h-[600px] lg:h-[700px] w-full overflow-hidden bg-slate-900 group">
      
      {/* Background Slideshow */}
      {HERO_IMAGES.map((image, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <img
            src={image}
            alt={`Conference slide ${index + 1}`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/75 to-brand-900/40" />
        </div>
      ))}

      {/* Content Container */}
      <div className="relative z-10 h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
        <div className="max-w-3xl space-y-8 animate-fade-in-up">
          
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white backdrop-blur-sm text-sm font-medium">
            <span className="flex h-2 w-2 rounded-full bg-brand-400 mr-2 animate-pulse"></span>
            Now supporting hybrid events
          </div>
          
          <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15] drop-shadow-sm">
            Organize <span className="text-brand-300">Scientific Conferences</span> with Confidence
          </h1>
          
          <p className="text-lg lg:text-xl text-slate-100 max-w-2xl drop-shadow-sm">
            We provide a unified ecosystem designed to handle the complexities of modern conference management. Our platform was built to simplify the administrative burden of academic organizers.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <Button size="lg" icon={ArrowRight} iconPosition="right" className="bg-brand-600 hover:bg-brand-500 border-transparent shadow-lg shadow-brand-900/20" onClick={onNavigateRegister}>
              Create Conference
            </Button>
            <Button variant="white-outline" size="lg">
              View Demo
            </Button>
          </div>

          <div className="pt-4 flex items-center space-x-6 text-sm text-slate-200">
            <div className="flex items-center">
              <CheckCircle2 className="w-4 h-4 text-brand-400 mr-2" />
              <span>Free 14-day trial</span>
            </div>
            <div className="flex items-center">
              <CheckCircle2 className="w-4 h-4 text-brand-400 mr-2" />
              <span>No credit card required</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="absolute bottom-8 left-0 right-0 z-20 flex justify-center lg:justify-start lg:left-8 lg:px-8 max-w-7xl mx-auto w-full">
         <div className="flex space-x-3">
            {HERO_IMAGES.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentSlide ? 'bg-brand-400 w-8' : 'bg-white/40 w-2 hover:bg-white/60'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
         </div>
      </div>

      <button 
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/20 text-white hover:bg-black/40 backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0 hidden md:block"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      
      <button 
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/20 text-white hover:bg-black/40 backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 translate-x-[10px] group-hover:translate-x-0 hidden md:block"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

    </section>
  );
};

export default Hero;