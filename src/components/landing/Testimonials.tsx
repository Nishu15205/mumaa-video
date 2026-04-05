'use client';

import { useRef, useEffect, useCallback } from 'react';
import { motion, useInView } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Testimonial {
  quote: string;
  name: string;
  childAge: string;
  rating: number;
  initials: string;
  color: string;
}

const testimonials: Testimonial[] = [
  {
    quote:
      'Mumaa was a lifesaver when my newborn wouldn\'t stop crying at 3 AM. I connected with Lakshmi in under a minute and she guided me through everything. I finally felt confident as a new mother.',
    name: 'Sneha Patel',
    childAge: 'Newborn',
    rating: 5,
    initials: 'SP',
    color: 'bg-rose-100 text-rose-600',
  },
  {
    quote:
      'As a working mom in Bangalore, I needed reliable childcare advice. Mumaa\'s scheduled sessions with Priya have been incredible. She helped me establish a routine for my toddler that actually works!',
    name: 'Kavitha Krishnan',
    childAge: '2 years old',
    rating: 5,
    initials: 'KK',
    color: 'bg-emerald-100 text-emerald-600',
  },
  {
    quote:
      'Sleep training seemed impossible until I found Sunita through Mumaa. Within two weeks, my 8-month-old was sleeping through the night. The video calls made it so personal and effective.',
    name: 'Rahul Mehta',
    childAge: '8 months old',
    rating: 5,
    initials: 'RM',
    color: 'bg-amber-100 text-amber-600',
  },
  {
    quote:
      'Being a first-time dad was overwhelming. Mumaa connected me with Anjali who answered all my questions about feeding, milestones, and safety. The convenience of video calls from home is unbeatable.',
    name: 'Vikram Singh',
    childAge: '6 months old',
    rating: 5,
    initials: 'VS',
    color: 'bg-pink-100 text-pink-600',
  },
  {
    quote:
      'I tried Mumaa during the free trial and immediately upgraded. Deepa helped me with my picky eater strategies. My daughter now eats vegetables! Can\'t recommend this platform enough.',
    name: 'Arjun Desai',
    childAge: '3 years old',
    rating: 4,
    initials: 'AD',
    color: 'bg-purple-100 text-purple-600',
  },
];

export default function Testimonials() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef(null);
  const isInView = useInView(headerRef, { once: true, margin: '-80px' });

  const scroll = useCallback((direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 380;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  }, []);

  // Auto-scroll
  useEffect(() => {
    const interval = setInterval(() => {
      if (!scrollRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      if (scrollLeft + clientWidth >= scrollWidth - 10) {
        scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        scrollRef.current.scrollBy({ left: 380, behavior: 'smooth' });
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-20 md:py-28 px-4 md:px-8 lg:px-16 bg-gray-50/80">
      <div className="max-w-7xl mx-auto" ref={headerRef}>
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-12 gap-4"
        >
          <div>
            <span className="inline-block px-4 py-1.5 rounded-full bg-pink-100 text-pink-700 text-sm font-medium mb-4">
              Testimonials
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900">
              Parents{' '}
              <span className="bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
                Love
              </span>{' '}
              Mumaa
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full w-10 h-10 border-gray-200 hover:border-rose-300 hover:text-rose-600"
              onClick={() => scroll('left')}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full w-10 h-10 border-gray-200 hover:border-rose-300 hover:text-rose-600"
              onClick={() => scroll('right')}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </motion.div>

        {/* Carousel */}
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {testimonials.map((t, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: 40 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 * idx }}
              className="flex-shrink-0 w-[340px] sm:w-[380px] snap-start"
            >
              <div className="bg-white rounded-2xl border border-gray-100 p-6 h-full shadow-sm hover:shadow-md transition-shadow">
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < t.rating
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-gray-200 fill-gray-200'
                      }`}
                    />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-gray-600 text-sm leading-relaxed mb-6 min-h-[120px]">
                  &ldquo;{t.quote}&rdquo;
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <div
                    className={`w-10 h-10 rounded-full ${t.color} flex items-center justify-center text-xs font-bold`}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-500">
                      Parent of a {t.childAge}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
