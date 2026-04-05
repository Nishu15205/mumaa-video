'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/app-store';

export default function CTA() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const { setCurrentView } = useAppStore();

  return (
    <section className="py-20 md:py-28 px-4 md:px-8 lg:px-16">
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="max-w-7xl mx-auto"
      >
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-500 via-pink-500 to-orange-500 px-6 py-16 md:px-16 md:py-20 text-center">
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-72 h-72 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full translate-x-1/3 translate-y-1/3" />
          <div className="absolute top-10 right-20 w-4 h-4 rounded-full bg-white/20" />
          <div className="absolute bottom-16 left-16 w-3 h-3 rounded-full bg-white/25" />

          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight">
              Ready to Give Your Child
              <br />
              the Best Care?
            </h2>
            <p className="mt-5 text-lg text-white/90 max-w-xl mx-auto leading-relaxed">
              Join thousands of parents who trust Mumaa for expert childcare guidance.
            </p>
            <div className="mt-10">
              <Button
                size="lg"
                className="rounded-2xl bg-white text-rose-600 hover:bg-white/90 shadow-xl h-14 px-8 text-base font-bold group"
                onClick={() => setCurrentView('signup')}
              >
                Start Your Free Trial Today
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
            <p className="mt-5 text-sm text-white/70">
              No credit card required · 7-day free trial
            </p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
