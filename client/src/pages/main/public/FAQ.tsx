import React, { useState, useEffect, useMemo, useRef } from "react";
import { Search, ChevronDown, HelpCircle, FileText, CheckCircle2 } from "lucide-react";
import { useLocation } from "@tanstack/react-router";
import { DefaultLayout } from "@/layouts/DefaultLayout";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { faqData, FAQSection, FAQItem } from "@/constants/faqData";
import useAuth from "@/features/auth/hooks/useAuth";
import { getHighestRole, Role } from "@/features/auth/types";

const highlightText = (text: string, query: string) => {
  if (!query.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <span key={i} className="bg-primary/20 text-primary font-medium rounded-sm px-1">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
};

const AccordionItem = ({
  item,
  searchQuery
}: {
  item: FAQItem;
  searchQuery: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // If search query changes and this item is a match, we might want to auto-expand it,
  // but the requirements say "Default state: all items collapsed", so we'll keep it closed by default unless they click.
  // We can just leave it as is.
  useEffect(() => {
    if (searchQuery) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [searchQuery]);

  return (
    <div className="border border-border rounded-xl mb-3 overflow-hidden bg-card transition-colors hover:border-primary/30">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between text-left focus:outline-none focus:bg-accent/50"
        aria-expanded={isOpen}
        aria-controls={`faq-content-${item.id}`}
        id={`faq-toggle-${item.id}`}
      >
        <h4 className="font-semibold text-foreground pr-4">
          {highlightText(item.question, searchQuery)}
        </h4>
        <ChevronDown
          className={cn(
            "w-5 h-5 text-muted-foreground transition-transform duration-300 flex-shrink-0",
            isOpen ? "rotate-180" : ""
          )}
        />
      </button>
      <div
        id={`faq-content-${item.id}`}
        ref={contentRef}
        aria-labelledby={`faq-toggle-${item.id}`}
        className="transition-all duration-300 ease-in-out"
        style={{
          maxHeight: isOpen ? (contentRef.current?.scrollHeight || 1000) + 200 + "px" : 0,
          opacity: isOpen ? 1 : 0,
          visibility: isOpen ? "visible" : "hidden"
        }}
      >
        <div className="px-5 pb-5 pt-1 text-sm text-foreground space-y-4">
          <div className="space-y-2">
            <span className="font-medium text-foreground block mb-2">Steps:</span>
            <ol className="list-decimal list-outside ml-4 space-y-1 text-muted-foreground marker:text-primary/70">
              {item.steps.map((step, idx) => (
                <li key={idx} className="pl-1">
                  {/* Step might have newlines, we map them if needed, but in our data they are strings */}
                  {step.split('\n').map((line, lidx) => (
                    <span key={lidx} className="block">{line}</span>
                  ))}
                </li>
              ))}
            </ol>
          </div>

          {item.expectedResult && (
            <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30 p-4">
              <div className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300 mb-2">
                <CheckCircle2 className="w-4 h-4" />
                Expected result
              </div>
              <div className="text-emerald-700 dark:text-emerald-400 text-sm space-y-1">
                {item.expectedResult.split('\n').map((line, idx) => (
                  <p key={idx}>{line}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const FAQPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();

  const { roles } = useAuth();
  const highestRole = getHighestRole(roles);
  const isOrganizer = highestRole === Role.ADMIN || highestRole === Role.SECRETARIAT;

  const roleFilteredData = useMemo(() => {
    return faqData.map(section => {
      const visibleItems = section.items.filter(item => {
        if (isOrganizer) return true;
        return item.audience === 'attendee' || item.audience === 'both';
      });
      return {
        ...section,
        items: visibleItems
      };
    }).filter(section => section.items.length > 0);
  }, [isOrganizer]);

  const [activeSection, setActiveSection] = useState<string>(roleFilteredData[0]?.id || "");

  // Update active section if it becomes empty
  useEffect(() => {
    if (!activeSection && roleFilteredData.length > 0) {
      setActiveSection(roleFilteredData[0].id);
    }
  }, [roleFilteredData, activeSection]);

  // Scroll to hash on mount
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace("#", "");
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    }
  }, [location.hash]);

  // Setup intersection observer for active section highlighting
  useEffect(() => {
    if (searchQuery) return; // Don't track scrolling when searching

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the visible section with the highest intersection ratio
        let maxRatio = 0;
        let visibleId = activeSection;

        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            visibleId = entry.target.id;
          }
        });

        if (maxRatio > 0 && visibleId !== activeSection) {
          setActiveSection(visibleId);
        }
      },
      {
        rootMargin: "-20% 0px -60% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1.0]
      }
    );

    roleFilteredData.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [searchQuery, activeSection, roleFilteredData]);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return roleFilteredData;
    
    const query = searchQuery.toLowerCase();
    
    const result = roleFilteredData.map(section => {
      const matchedItems = section.items.filter(item => {
        const matchesQuestion = item.question.toLowerCase().includes(query);
        const matchesSteps = item.steps.some(step => step.toLowerCase().includes(query));
        return matchesQuestion || matchesSteps;
      });
      
      return {
        ...section,
        items: matchedItems
      };
    }).filter(section => section.items.length > 0);
    
    return result;
  }, [searchQuery, roleFilteredData]);

  const totalResults = useMemo(() => {
    return filteredData.reduce((acc, section) => acc + section.items.length, 0);
  }, [filteredData]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
  
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
      
      // Update URL without jump
      window.history.pushState(null, "", `#${id}`);
      setActiveSection(id);
    }
  };

  return (
    <DefaultLayout meta={{ title: "Help Center - FAQ" }}>
      <div className="min-h-screen bg-background text-foreground pb-20">
        {/* Header Section */}
        <section className="bg-primary/5 py-12 border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-4">
              <HelpCircle className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-4 text-foreground">
              How can we help you?
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Quick answers and step-by-step guides for using the scientific conference management platform.
            </p>
            <div className="max-w-xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                type="text"
                placeholder="Search for articles, questions, or keywords..."
                className="pl-12 h-14 rounded-full bg-card shadow-sm text-base"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {searchQuery && (
              <div className="mt-4 text-sm font-medium text-muted-foreground">
                {totalResults} {totalResults === 1 ? 'result' : 'results'} for "{searchQuery}"
              </div>
            )}
          </div>
        </section>

        {/* Main Content Area */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
          <div className="flex flex-col lg:flex-row gap-12">
            
            {/* Sidebar Navigation - Hidden when searching or on mobile */}
            {!searchQuery && (
              <aside className="hidden lg:block w-64 flex-shrink-0">
                <div className="sticky top-28 space-y-1 border-l border-border pl-4">
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4 pl-3">
                    Categories
                  </h3>
                  {roleFilteredData.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors",
                        activeSection === section.id
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      {section.title}
                    </button>
                  ))}
                </div>
              </aside>
            )}

            {/* Main Content */}
            <div className={cn("flex-1", searchQuery ? "max-w-4xl mx-auto" : "")}>
              {filteredData.length === 0 ? (
                <div className="text-center py-20 bg-card rounded-2xl border border-border">
                  <div className="inline-flex items-center justify-center p-4 bg-muted rounded-full mb-4">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No results found</h3>
                  <p className="text-muted-foreground mb-6">
                    We couldn't find any articles matching "{searchQuery}".
                  </p>
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-primary font-medium hover:underline"
                  >
                    Clear search and show all FAQ
                  </button>
                </div>
              ) : (
                <div className="space-y-12">
                  {filteredData.map((section) => (
                    <div key={section.id} id={section.id} className="scroll-mt-28">
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold text-foreground mb-2">
                          {section.title}
                        </h2>
                        <p className="text-muted-foreground">
                          {section.description}
                        </p>
                      </div>
                      
                      <div>
                        {section.items.map((item) => (
                          <AccordionItem
                            key={item.id}
                            item={item}
                            searchQuery={searchQuery}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
};

export default FAQPage;
