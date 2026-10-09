'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { AuthModal, type AuthView, shouldOpenAuthModal } from '@/components/auth/auth-modal';
import { useBranding } from '@/components/branding/branding-provider';
import styles from '@/app/page.module.css';

interface Author {
  name: string;
  avatar: string;
  role: string;
}

interface Award {
  category: string;
  title: string;
  teamImage: string; // cover image
  galleryImages: string[]; // 3-5 images for the modal slider
  brandingAssetKey: 'hallOfExcellence1' | 'hallOfExcellence2' | 'hallOfExcellence3' | 'hallOfExcellence4' | 'hallOfExcellence5';
  authors: Author[];
  department: string;
  description: string;
  abstract: string;
  icon: string;
  additionalAwards?: { name: string; icon: string }[];
  color: string;
  deptColor: string;
  adviser: string;
  year: string;
}

/**
 * 🏆 HALL OF EXCELLENCE DATA 
 * 
 * HOW TO CHANGE THESE IMAGES & DATA:
 * 1. The images can now be changed directly from the System Admin dashboard under "Theme & Branding" -> "Logos & Assets"!
 * 2. To use your own photos, upload them in the dashboard.
 * 3. Eventually, this static array should be replaced with a database fetch (e.g., from Supabase) 
 *    so admins can add/edit winners directly from an Admin Dashboard.
 */
const outstandingAwards: Award[] = [
  {
    category: "Best in Capstone",
    title: "AI-Powered Smart Campus Navigation",
    teamImage: "/images/awards/award_1.png",
    galleryImages: [
      "/images/awards/award_1.png",
      "/images/awards/award_3.png",
      "/images/awards/award_5.png"
    ],
    brandingAssetKey: "hallOfExcellence1",
    authors: [
      { name: "K. Chavez", avatar: "https://i.pravatar.cc/150?u=kchavez", role: "Team Leader" },
      { name: "M. Reyes", avatar: "https://i.pravatar.cc/150?u=mreyes", role: "Lead Developer" },
      { name: "J. Santos", avatar: "https://i.pravatar.cc/150?u=jsantos", role: "Systems Analyst" }
    ],
    department: "BS Information Technology",
    description: "An advanced wayfinding and resource-booking app for students utilizing computer vision to map optimal indoor routes.",
    abstract: "The Smart Campus Navigation project addresses the difficulty of finding specific rooms and facilities within a large campus by implementing a robust machine learning framework. The proposed AI-powered system provides real-time route optimization for students, dynamic scheduling for facility management, and heat-map analytics for administrators. Early testing showed a 30% reduction in class-transition delays.",
    icon: "fas fa-trophy",
    additionalAwards: [
      { name: "Best Presenter", icon: "fas fa-microphone" }
    ],
    color: "#f6be00",
    deptColor: "#1a1a1a",
    adviser: "Dr. A. Velasquez",
    year: "2024"
  },
  {
    category: "Best in Innovation",
    title: "EcoTrack IoT Greenhouse System",
    teamImage: "/images/awards/award_2.png",
    galleryImages: [
      "/images/awards/award_2.png",
      "/images/awards/award_4.png",
      "/images/awards/award_1.png",
      "/images/awards/award_3.png"
    ],
    brandingAssetKey: "hallOfExcellence2",
    authors: [
      { name: "A. Cruz", avatar: "https://i.pravatar.cc/150?u=acruz", role: "Project Lead" },
      { name: "D. Villanueva", avatar: "https://i.pravatar.cc/150?u=dvillanueva", role: "Hardware Engineer" }
    ],
    department: "BS Energy Systems & Management",
    description: "A fully automated climate control system utilizing LoRaWAN for agricultural engineering applications.",
    abstract: "This study presents an automated, low-cost greenhouse management architecture using IoT sensors to monitor soil moisture, humidity, and temperature. The system continuously monitors environmental variables, automatically activating irrigation and shading mechanisms. This innovation dramatically reduces water waste and human intervention in small-scale farming operations.",
    icon: "fas fa-lightbulb",
    color: "#4ade80",
    deptColor: "#15803d",
    adviser: "Engr. B. Tolentino",
    year: "2024"
  },
  {
    category: "Outstanding Technical Merit",
    title: "Digital Media Analytics Dashboard",
    teamImage: "/images/awards/award_3.png",
    galleryImages: [
      "/images/awards/award_3.png",
      "/images/awards/award_5.png",
      "/images/awards/award_2.png"
    ],
    brandingAssetKey: "hallOfExcellence3",
    authors: [
      { name: "L. Mendoza", avatar: "https://i.pravatar.cc/150?u=lmendoza", role: "Lead Researcher" },
      { name: "R. Garcia", avatar: "https://i.pravatar.cc/150?u=rgarcia", role: "Data Scientist" },
      { name: "P. Bautista", avatar: "https://i.pravatar.cc/150?u=pbautista", role: "UI/UX Designer" }
    ],
    department: "BS Tech. Comm. Management",
    description: "Real-time sentiment and engagement tracking suite designed for university communication channels.",
    abstract: "To assist the university PR office in assessing communication reach, this project developed a dashboard integrating official Facebook, X, and Instagram APIs. By aggregating data streams from various social platforms and internal communications, the dashboard utilizes natural language processing to assess audience sentiment and engagement. The research proves the efficacy of centralized metric tracking.",
    icon: "fas fa-microchip",
    additionalAwards: [
      { name: "Most Innovative", icon: "fas fa-rocket" }
    ],
    color: "#60a5fa",
    deptColor: "#0369a1",
    adviser: "Dr. C. Gomez",
    year: "2023"
  },
  {
    category: "Best Research Design",
    title: "Predictive Analytics for Retention",
    teamImage: "/images/awards/award_4.png",
    galleryImages: [
      "/images/awards/award_4.png",
      "/images/awards/award_1.png",
      "/images/awards/award_2.png",
      "/images/awards/award_5.png"
    ],
    brandingAssetKey: "hallOfExcellence4",
    authors: [
      { name: "E. Morales", avatar: "https://i.pravatar.cc/150?u=emorales", role: "Principal Investigator" },
      { name: "S. Tan", avatar: "https://i.pravatar.cc/150?u=stan", role: "Statistician" }
    ],
    department: "BS Information Technology",
    description: "Machine learning model predicting student dropout risks based on early academic performance and engagement markers.",
    abstract: "Student retention remains a critical challenge. This research applied predictive modeling algorithms (Random Forest, SVM) to historical registrar data, attendance patterns, and LMS engagement. The model achieved an 89% accuracy rate, providing administrators with actionable insights to deploy early intervention programs effectively.",
    icon: "fas fa-chart-pie",
    color: "#f6be00",
    deptColor: "#1a1a1a",
    adviser: "Prof. D. Suarez",
    year: "2023"
  },
  {
    category: "Community Impact Award",
    title: "Local Market E-Commerce Gateway",
    teamImage: "/images/awards/award_5.png",
    galleryImages: [
      "/images/awards/award_5.png",
      "/images/awards/award_3.png",
      "/images/awards/award_4.png"
    ],
    brandingAssetKey: "hallOfExcellence5",
    authors: [
      { name: "C. Domingo", avatar: "https://i.pravatar.cc/150?u=cdomingo", role: "Team Leader" },
      { name: "J. Flores", avatar: "https://i.pravatar.cc/150?u=jflores", role: "Community Manager" }
    ],
    department: "BS Tech. Comm. Management",
    description: "A localized digital marketplace platform bridging small-scale regional farmers directly with urban consumers.",
    abstract: "This capstone implemented an accessible e-commerce platform specifically designed for non-technical agricultural workers. By simplifying the listing process and integrating local payment gateways, the project successfully onboarded 50 local farmers during its beta phase, cutting out middlemen and increasing farmer revenue margins by up to 40%.",
    icon: "fas fa-hands-holding-circle",
    color: "#fb7185",
    deptColor: "#be123c",
    adviser: "Mr. E. Navarro",
    year: "2022"
  },
  {
    category: "Excellence in Engineering",
    title: "Automated CNC Plasma Cutter",
    teamImage: "/images/awards/award_4.png",
    galleryImages: [
      "/images/awards/award_4.png",
      "/images/awards/award_2.png",
      "/images/awards/award_1.png"
    ],
    brandingAssetKey: "hallOfExcellence1",
    authors: [
      { name: "M. Delos Santos", avatar: "https://i.pravatar.cc/150?u=mdelos", role: "Lead Engineer" },
      { name: "R. Castro", avatar: "https://i.pravatar.cc/150?u=rcastro", role: "Fabricator" }
    ],
    department: "BS Manufacturing Engineering Technology",
    description: "A low-cost, high-precision CNC plasma cutter designed for small-scale metal fabrication workshops.",
    abstract: "This project designed and fabricated a 3-axis automated CNC plasma cutting table. By utilizing open-source controllers and repurposed stepper motors, the team reduced manufacturing costs by 60% compared to commercial alternatives, while maintaining a cutting tolerance of ±0.5mm on carbon steel plates.",
    icon: "fas fa-cogs",
    additionalAwards: [
      { name: "Best Prototype", icon: "fas fa-wrench" }
    ],
    color: "#EF4444",
    deptColor: "#991B1B",
    adviser: "Engr. V. Reyes",
    year: "2023"
  },
  {
    category: "Best in Maritime Innovation",
    title: "Autonomous Ocean Data Buoy",
    teamImage: "/images/awards/award_2.png",
    galleryImages: [
      "/images/awards/award_2.png",
      "/images/awards/award_3.png",
      "/images/awards/award_5.png"
    ],
    brandingAssetKey: "hallOfExcellence2",
    authors: [
      { name: "P. Ocampo", avatar: "https://i.pravatar.cc/150?u=pocampo", role: "Naval Architect" },
      { name: "A. Lim", avatar: "https://i.pravatar.cc/150?u=alim", role: "Systems Designer" }
    ],
    department: "BS Naval Architecture and Marine Engineering",
    description: "A self-righting autonomous buoy for continuous monitoring of marine water quality and surface currents.",
    abstract: "Addressing the need for accessible marine environmental data, this capstone produced a solar-powered autonomous buoy. Featuring a unique self-righting hull design optimized via CFD, it houses sensors for salinity, temperature, and turbidity. It transmits data in real-time via satellite, providing crucial data for local marine biologists.",
    icon: "fas fa-ship",
    color: "#06B6D4",
    deptColor: "#164E63",
    adviser: "Dr. L. Fernandez",
    year: "2024"
  }
];

const LANDING_AWARD_LIMIT = 5;

const deptMap: Record<string, string> = {
  "IT": "BS Information Technology",
  "ESM": "BS Energy Systems & Management",
  "TCM": "BS Tech. Comm. Management",
  "MET": "BS Manufacturing Engineering Technology",
  "NAME": "BS Naval Architecture and Marine Engineering"
};

export function HallOfExcellence({ filterDepartmentId }: { filterDepartmentId?: string }) {
  const { branding } = useBranding();

  // The landing page shows only the first 5 awards so each card has its own cover image (award_1–award_5).
  const filteredAwards = filterDepartmentId 
    ? outstandingAwards.filter(a => a.department === deptMap[filterDepartmentId])
    : outstandingAwards.slice(0, LANDING_AWARD_LIMIT);

  if (filteredAwards.length === 0) return null;

  // Ensure enough copies exist so the container always overflows, enabling the infinite scroll animation.
  // We mirror the array exactly in half for the jump-back logic.
  const repeatedBase = Array.from({ length: Math.max(1, Math.ceil(5 / filteredAwards.length)) }).flatMap(() => filteredAwards);
  const displayAwards = [...repeatedBase, ...repeatedBase];

  const [selectedAward, setSelectedAward] = useState<Award | null>(null);
  const [authView, setAuthView] = useState<AuthView | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const nextImage = () => {
    if (selectedAward) {
      setCurrentImageIndex((prev) => (prev + 1) % selectedAward.galleryImages.length);
    }
  };

  const prevImage = () => {
    if (selectedAward) {
      setCurrentImageIndex((prev) => (prev === 0 ? selectedAward.galleryImages.length - 1 : prev - 1));
    }
  };
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  
  // Manual Drag-to-Scroll state
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.pageX - (scrollRef.current?.offsetLeft || 0);
    scrollLeft.current = scrollRef.current?.scrollLeft || 0;
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    isDragging.current = false;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const x = e.pageX - (scrollRef.current?.offsetLeft || 0);
    const walk = (x - startX.current) * 2; // Scroll-fast multiplier
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollLeft.current - walk;
    }
  };

  const scrollByCards = (direction: 1 | -1) => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.8 * direction;
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  const handleCardClick = (e: React.MouseEvent, award: Award) => {
    // If user dragged more than 5px, it was a scroll action, not a click
    if (scrollRef.current && Math.abs(scrollRef.current.scrollLeft - scrollLeft.current) > 5) {
      e.preventDefault();
      return;
    }
    setSelectedAward(award);
    document.body.classList.add('modal-open');
  };

  const closeModal = () => {
    setSelectedAward(null);
    setCurrentImageIndex(0);
    document.body.classList.remove('modal-open');
  };

  const handleCardKeyDown = (e: React.KeyboardEvent, award: Award) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSelectedAward(award);
      document.body.classList.add('modal-open');
    }
  };

  useEffect(() => {
    if (!selectedAward) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedAward]);

  useEffect(() => {
    let animationFrameId: number;
    let wheelVelocity = 0;
    const container = scrollRef.current;

    if (!container) return;

    const scrollStep = () => {
      // If user scrolls backwards past the start, jump to the identical middle point
      if (container.scrollLeft <= 0) {
        container.scrollLeft = container.scrollWidth / 2;
      }
      
      // If we've scrolled past exactly half the content, jump back to the start
      if (container.scrollLeft >= container.scrollWidth / 2) {
        container.scrollLeft = 0;
      }

      // Apply smooth wheel momentum
      if (Math.abs(wheelVelocity) > 0.5) {
        container.scrollLeft += wheelVelocity;
        wheelVelocity *= 0.85; // Friction factor
      } else if (!isHovered) {
        wheelVelocity = 0;
        container.scrollLeft += 0.8;
      }

      animationFrameId = requestAnimationFrame(scrollStep);
    };

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 0) {
        e.preventDefault();
        wheelVelocity += e.deltaY * 0.15; 
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    animationFrameId = requestAnimationFrame(scrollStep);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener('wheel', handleWheel);
    };
  }, [isHovered]);

  return (
    <>
      <style>{`
        body.modal-open {
          overflow: hidden;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .card-3d-wrapper {
          perspective: 1200px;
        }
        .card-3d-element {
          transform-style: preserve-3d;
          transition: transform 0.5s cubic-bezier(0.25, 1, 0.5, 1);
        }
        .card-3d-wrapper:hover .card-3d-element {
          transform: rotateY(-8deg) rotateX(4deg) scale3d(1.03, 1.03, 1.03);
        }
        /* Add a subtle glare effect on hover */
        .card-3d-element::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(125deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.03) 40%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0) 60%);
          background-size: 200% 200%;
          background-position: 200% 0%;
          transition: background-position 0.6s cubic-bezier(0.25, 1, 0.5, 1);
          z-index: 20;
          pointer-events: none;
        }
        .card-3d-wrapper:hover .card-3d-element::after {
          background-position: -20% 100%;
        }
      `}</style>

      <section className={`relative overflow-hidden ${styles.bgMesh} pt-24 pb-16`}>
        {/* Background Decorative Patterns */}
        <div className="absolute top-0 right-0 w-full h-[400px] bg-[radial-gradient(ellipse_at_top_right,rgba(246,190,0,0.05),transparent_60%)] pointer-events-none" />
        
        <div className="relative z-10 w-[min(1680px,calc(100%-3rem))] mx-auto mb-16">
          <div className={`${styles.sectionIntro} ${styles.hallIntro}`} data-reveal="fade-up">
            <span
              className={styles.sectionKicker}
              style={filterDepartmentId ? { borderColor: 'color-mix(in srgb, var(--department-primary) 30%, transparent)', backgroundColor: 'color-mix(in srgb, var(--department-primary) 10%, transparent)', color: 'var(--department-primary)' } : undefined}
            >
              Hall of Excellence
            </span>
            <h2>
              Celebrating Outstanding <br className="hidden sm:block" />
              <span
                className={filterDepartmentId ? 'text-transparent bg-clip-text' : undefined}
                style={filterDepartmentId ? { backgroundImage: 'linear-gradient(to right, var(--department-primary), var(--department-secondary))' } : undefined}
              >
                {filterDepartmentId ? `${filterDepartmentId} Innovations` : 'Student Innovations'}
              </span>
            </h2>
            <p>
              {filterDepartmentId
                ? `Highlighting the highest caliber of research, technical execution, and impactful capstone projects from the ${deptMap[filterDepartmentId]} program.`
                : 'Highlighting the highest caliber of student research, technical execution, and impactful capstone projects archived within the university repository.'}
            </p>
          </div>
        </div>

        <div className="relative w-full">
          {/* Edge fades hinting there is more content to scroll to */}
          <div className="hidden sm:block absolute inset-y-0 left-0 w-16 z-20 pointer-events-none bg-gradient-to-r from-[var(--background)] to-transparent" />
          <div className="hidden sm:block absolute inset-y-0 right-0 w-16 z-20 pointer-events-none bg-gradient-to-l from-[var(--background)] to-transparent" />

          {/* Prev/Next controls */}
          <button
            type="button"
            onClick={() => scrollByCards(-1)}
            aria-label="Scroll to previous awards"
            className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-30 w-11 h-11 items-center justify-center rounded-full bg-white text-[#003A8F] shadow-[0_8px_20px_rgba(15,43,89,0.18)] border border-white/80 transition-transform duration-200 ease-out hover:-translate-y-[calc(50%+2px)] active:scale-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#003A8F]"
          >
            <i className="fas fa-chevron-left" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => scrollByCards(1)}
            aria-label="Scroll to next awards"
            className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-30 w-11 h-11 items-center justify-center rounded-full bg-white text-[#003A8F] shadow-[0_8px_20px_rgba(15,43,89,0.18)] border border-white/80 transition-transform duration-200 ease-out hover:-translate-y-[calc(50%+2px)] active:scale-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#003A8F]"
          >
            <i className="fas fa-chevron-right" aria-hidden="true" />
          </button>

          {/* Scrollable Container with Hybrid Auto-scroll */}
          <div
            ref={scrollRef}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
            onTouchStart={() => setIsHovered(true)}
            onTouchEnd={() => setIsHovered(false)}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            className="flex gap-6 sm:gap-8 overflow-x-auto pb-12 pt-4 hide-scrollbar px-6 sm:px-12 cursor-grab active:cursor-grabbing"
          >
            {/* We duplicate the array to allow infinite seamless scrolling */}
            {displayAwards.map((award, index) => (
              <div
                key={`${award.category}-${index}`}
                className="block shrink-0 group/card cursor-pointer card-3d-wrapper transition-transform duration-200 ease-out active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white rounded-[2rem]"
                role="button"
                tabIndex={0}
                aria-label={`View details for ${award.title}`}
                onClick={(e) => handleCardClick(e, award)}
                onKeyDown={(e) => handleCardKeyDown(e, award)}
              >
                    <article 
                      className="card-3d-element relative rounded-[2rem] w-[320px] sm:w-[400px] h-[450px] overflow-hidden shadow-[0_8px_30px_rgba(15,23,42,0.08)] hover:shadow-[15px_20px_40px_rgba(0,58,143,0.25)]" 
                    >
                      {/* Full Cover Image with Branding Fallback */}
                      <img 
                        src={branding.assets[award.brandingAssetKey] || award.teamImage} 
                        alt={`Team for ${award.title}`} 
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover/card:scale-105"
                      />
                      
                      {/* Gradient Overlay for Text Legibility */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#061022] via-[#061022]/60 to-transparent opacity-80 group-hover/card:opacity-90 transition-opacity duration-500" />
                      
                      {/* Content Area */}
                      <div className="absolute inset-0 z-10 p-6 sm:p-8 flex flex-col justify-between">
                        {/* Top Floating Badges */}
                        <div className="self-start flex flex-col gap-2 max-w-[85%]">
                          {[
                            { name: award.category, icon: award.icon },
                            ...(award.additionalAwards || [])
                          ].map((aw, idx) => (
                            <div key={idx} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-lg max-w-full">
                              <i
                                className={`${aw.icon} text-sm shrink-0 ${filterDepartmentId ? '' : 'text-[#f6be00]'}`}
                                style={filterDepartmentId ? { color: 'var(--department-primary)' } : undefined}
                              />
                              <span className="text-[0.65rem] font-black uppercase tracking-widest">{aw.name}</span>
                            </div>
                          ))}
                        </div>

                        {/* Bottom Content Area */}
                        <div className="flex flex-col mt-auto">
                          <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mb-2">
                            {!filterDepartmentId && (
                              <>
                                <span className="text-[#f6be00] text-[0.65rem] font-black uppercase tracking-widest drop-shadow-md">
                                  {award.department}
                                </span>
                                <span className="w-1 h-1 rounded-full bg-white/40 shrink-0" />
                              </>
                            )}
                            <span className="text-white/80 text-[0.65rem] font-bold uppercase tracking-widest drop-shadow-md">
                              Class of {award.year}
                            </span>
                          </div>
                          <h3 className="text-xl sm:text-2xl font-black text-white leading-tight mb-2 group-hover/card:text-[#ffe98b] transition-colors duration-300">
                            {award.title}
                          </h3>
                        
                        <p className="text-[0.85rem] text-slate-300 font-medium line-clamp-2 mb-5 leading-relaxed">
                          {award.description}
                        </p>

                        {/* Footer: Authors and Action */}
                        <div className="pt-4 border-t border-white/20 mt-auto flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex -space-x-2 overflow-hidden">
                              {award.authors.map((author, i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-center h-8 w-8 rounded-full ring-2 ring-[#061022] bg-slate-800/80 backdrop-blur-sm text-slate-300 text-[0.65rem]"
                                  title={author.name}
                                >
                                  <i className="fas fa-user"></i>
                                </div>
                              ))}
                            </div>
                            <span className="text-[0.7rem] font-bold text-slate-200 uppercase tracking-wider">
                              Team
                            </span>
                          </div>
                          
                          {/* View Action Arrow */}
                          <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white group-hover/card:bg-white group-hover/card:text-[#003A8F] transition-all duration-300 shadow-lg group-hover/card:scale-110">
                            <i className="fas fa-arrow-right text-[0.8rem]" />
                          </div>
                        </div>
                      </div>
                    </div>
                    </article>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Expanded Project Brief Modal */}
      {selectedAward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-[#061022]/60 backdrop-blur-sm transition-opacity"
            onClick={closeModal}
          />

          {/* Modal Content - Expanded to Ultra-Premium Layout */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="award-modal-title"
            className="relative bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] ring-1 ring-slate-900/5 w-full max-w-5xl overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in-95 duration-300 max-h-[95vh] sm:max-h-[85vh]">
            
            {/* Left Column: Hero Image Carousel */}
            <div className="md:w-[45%] relative min-h-[250px] md:min-h-full flex-shrink-0 group/modalimg overflow-hidden">
              <div 
                className="flex h-full transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${currentImageIndex * 100}%)` }}
              >
                {selectedAward.galleryImages.map((imgSrc, idx) => (
                  <div key={idx} className="w-full h-full flex-shrink-0 relative">
                    <img 
                      src={idx === 0 && branding.assets[selectedAward.brandingAssetKey] ? branding.assets[selectedAward.brandingAssetKey] : imgSrc} 
                      alt={`Gallery image ${idx + 1} for ${selectedAward.title}`} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
              
              <div className="absolute inset-0 bg-gradient-to-t from-[#020817] via-[#020817]/40 to-transparent opacity-90 pointer-events-none" />
              
              {/* Carousel Controls */}
              {selectedAward.galleryImages.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    aria-label="Previous image"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 hover:bg-white/20 backdrop-blur-md text-white border border-white/10 flex items-center justify-center transition-[background-color,opacity,transform] duration-200 ease-out opacity-0 group-hover/modalimg:opacity-100 active:scale-90 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                  >
                    <i className="fas fa-chevron-left text-sm"></i>
                  </button>
                  <button
                    onClick={nextImage}
                    aria-label="Next image"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 hover:bg-white/20 backdrop-blur-md text-white border border-white/10 flex items-center justify-center transition-[background-color,opacity,transform] duration-200 ease-out opacity-0 group-hover/modalimg:opacity-100 active:scale-90 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                  >
                    <i className="fas fa-chevron-right text-sm"></i>
                  </button>

                  {/* Carousel Indicators */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                    {selectedAward.galleryImages.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        aria-label={`Show image ${idx + 1} of ${selectedAward.galleryImages.length}`}
                        aria-current={idx === currentImageIndex}
                        className={`h-1.5 rounded-full transition-all duration-300 ease-out active:scale-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${idx === currentImageIndex ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'}`}
                      />
                    ))}
                  </div>
                </>
              )}
              
              <div className="absolute bottom-6 left-6 right-6">
                <div className="flex flex-col gap-3 mb-3">
                  <span className="text-[0.65rem] font-black uppercase tracking-widest text-white/80 block drop-shadow-md">Awards Earned</span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { name: selectedAward.category, icon: selectedAward.icon },
                      ...(selectedAward.additionalAwards || [])
                    ].map((aw, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-black/40 backdrop-blur-md rounded-full pr-4 pl-1 py-1 border border-white/20">
                        <div 
                          className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20"
                          style={{ color: filterDepartmentId ? 'var(--department-primary)' : selectedAward.color }}
                        >
                          <i className={`${aw.icon} text-xs`} />
                        </div>
                        <span className="text-sm font-black text-white">{aw.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Content */}
            <div className="md:w-[55%] flex flex-col flex-grow overflow-hidden bg-white relative">
              {/* Header */}
              <div className={`px-8 pt-10 pb-6 relative`}>
                <button
                  onClick={closeModal}
                  aria-label="Close project details"
                  className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-[background-color,color,transform] duration-200 ease-out active:scale-90 z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400"
                >
                  <i className="fas fa-times" />
                </button>

                <h2 id="award-modal-title" className="text-3xl sm:text-4xl font-black leading-tight mt-4 bg-clip-text text-transparent bg-gradient-to-br from-slate-900 via-slate-800 to-slate-500 pb-1">
                  {selectedAward.title}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-500 text-[0.65rem] font-black uppercase tracking-widest">
                    <i className="far fa-calendar-check" /> Class of {selectedAward.year}
                  </div>
                  <div 
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[0.65rem] font-black uppercase tracking-widest"
                    style={{ 
                      backgroundColor: filterDepartmentId 
                        ? 'color-mix(in srgb, var(--department-primary) 10%, transparent)' 
                        : `color-mix(in srgb, ${selectedAward.deptColor || selectedAward.color} 10%, transparent)`,
                      color: filterDepartmentId ? 'var(--department-primary)' : (selectedAward.deptColor || selectedAward.color)
                    }}
                  >
                    <i className="fas fa-building" /> {selectedAward.department}
                  </div>
                </div>
              </div>
              
              {/* Body */}
              <div className="px-8 pb-8 overflow-y-auto flex-grow custom-scrollbar">
                
                {/* Awards Earned Section */}
                <div className="mb-8">
                  <h4 
                    className="text-[0.7rem] font-black uppercase tracking-widest mb-3 flex items-center gap-2"
                    style={{ color: filterDepartmentId ? 'var(--department-primary)' : selectedAward.color }}
                  >
                    <i className="fas fa-medal opacity-70"></i> Awards & Recognition
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { name: selectedAward.category, icon: selectedAward.icon },
                      ...(selectedAward.additionalAwards || [])
                    ].map((aw, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center gap-2 px-3 py-1.5 border rounded-full shadow-sm"
                        style={filterDepartmentId 
                          ? { backgroundColor: 'color-mix(in srgb, var(--department-primary) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--department-primary) 20%, transparent)', color: 'var(--department-primary)' }
                          : { backgroundColor: `color-mix(in srgb, ${selectedAward.color} 10%, transparent)`, borderColor: `color-mix(in srgb, ${selectedAward.color} 20%, transparent)`, color: selectedAward.color }
                        }
                      >
                        <i className={`${aw.icon} text-sm`} />
                        <span className="text-[0.7rem] font-bold uppercase tracking-wide">{aw.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-10">
                  <h4 className="text-[0.7rem] font-black uppercase tracking-widest text-[#003A8F] mb-4 flex items-center gap-2">
                    <i className="fas fa-align-left opacity-70"></i> Executive Abstract
                  </h4>
                  <p className="text-[1rem] text-slate-600 leading-[1.8] font-medium">
                    {selectedAward.abstract}
                  </p>
                </div>
                
                <div>
                  <h4 className="text-[0.7rem] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                    <i className="fas fa-user-group opacity-70"></i> Research Team
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedAward.authors.map((author, idx) => {
                      return (
                        <div key={idx} className={`group flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 bg-slate-50 hover:bg-slate-100`}>
                          <div className={`flex items-center justify-center w-11 h-11 rounded-full shrink-0 transition-transform group-hover:scale-105 bg-white border border-slate-200 text-slate-400 shadow-sm`}>
                            <i className="fas fa-user text-sm"></i>
                          </div>
                          <div className="flex-col overflow-hidden">
                            <span className="block text-[0.9rem] font-bold text-slate-900 truncate group-hover:text-[#003A8F] transition-colors">{author.name}</span>
                            <div className="flex flex-col mt-0.5">
                              <span className={`text-[0.65rem] font-black uppercase tracking-wider truncate text-slate-500`}>
                                {author.role}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Adviser Section */}
                <div className="mt-8">
                  <h4 className="text-[0.7rem] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                    <i className="fas fa-chalkboard-user opacity-70"></i> Project Adviser
                  </h4>
                  <div className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-indigo-50/50 border border-indigo-100/50">
                    <div className="flex items-center justify-center w-11 h-11 rounded-full shrink-0 bg-white border border-indigo-200 text-indigo-500 shadow-sm">
                      <i className="fas fa-user-tie text-sm"></i>
                    </div>
                    <div className="flex-col overflow-hidden">
                      <span className="block text-[0.9rem] font-bold text-slate-900 truncate">{selectedAward.adviser}</span>
                      <div className="flex flex-col mt-0.5">
                        <span className="text-[0.65rem] font-black uppercase tracking-wider truncate text-indigo-600">
                          Adviser
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Footer with Login Call-to-action */}
              <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto">
                <div className="text-[0.85rem] text-slate-500 font-medium text-center sm:text-left flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-slate-200/50 flex items-center justify-center text-slate-400">
                    <i className="fas fa-lock text-xs"></i>
                  </span>
                  Full manuscript access restricted
                </div>
                
                <Link
                  href="/login"
                  onClick={(event) => {
                    // Swap the award modal for the login modal; new-tab/middle clicks still reach /login.
                    if (shouldOpenAuthModal(event)) {
                      event.preventDefault();
                      closeModal();
                      setAuthView('login');
                    }
                  }}
                  className="shrink-0 flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-[#003A8F] to-[#004bba] text-white font-bold text-sm hover:shadow-[0_8px_20px_rgba(0,58,143,0.3)] transition-all duration-300 w-full sm:w-auto hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Sign In to Access <i className="fas fa-arrow-right ml-1" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <AuthModal view={authView} onViewChange={setAuthView} onClose={() => setAuthView(null)} />
    </>
  );
}
