'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { UserPlus, Search, Video } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: UserPlus,
    title: 'Create Your Account',
    description: 'Sign up in 30 seconds. Tell us about your family and needs.',
    color: 'from-rose-500 to-pink-500',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    illustration: (
      <div className="relative w-full h-48 rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50 flex items-center justify-center overflow-hidden">
        <div className="absolute top-4 left-4 w-12 h-12 rounded-full bg-rose-200/50" />
        <div className="absolute bottom-6 right-6 w-8 h-8 rounded-lg bg-pink-200/50 rotate-12" />
        <div className="w-20 h-20 rounded-2xl bg-white shadow-lg flex items-center justify-center">
          <UserPlus className="w-10 h-10 text-rose-500" />
        </div>
      </div>
    ),
  },
  {
    number: '02',
    icon: Search,
    title: 'Find Your Nanny',
    description: 'Browse verified nannies, read reviews, and choose your perfect match.',
    color: 'from-amber-500 to-orange-500',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    illustration: (
      <div className="relative w-full h-48 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center overflow-hidden">
        <div className="absolute top-6 right-4 w-10 h-10 rounded-full bg-amber-200/50" />
        <div className="absolute bottom-4 left-6 w-6 h-6 rounded bg-orange-200/50 rotate-45" />
        <div className="w-20 h-20 rounded-2xl bg-white shadow-lg flex items-center justify-center">
          <Search className="w-10 h-10 text-amber-500" />
        </div>
      </div>
    ),
  },
  {
    number: '03',
    icon: Video,
    title: 'Start Video Call',
    description: 'Connect instantly or schedule a session. Get expert childcare help now.',
    color: 'from-emerald-500 to-teal-500',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    illustration: (
      <div className="relative w-full h-48 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center overflow-hidden">
        <div className="absolute top-4 right-6 w-10 h-10 rounded-full bg-emerald-200/50" />
        <div className="absolute bottom-6 left-4 w-8 h-8 rounded-lg bg-teal-200/50 -rotate-12" />
        <div className="w-20 h-20 rounded-2xl bg-white shadow-lg flex items-center justify-center">
          <Video className="w-10 h-10 text-emerald-500" />
        </div>
      </div>
    ),
  },
];

export default function HowItWorks() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="how-it-works" className="py-20 md:py-28 px-4 md:px-8 lg:px-16 bg-gray-50/80">
      <div className="max-w-7xl mx-auto" ref={ref}>
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium mb-4">
            How It Works
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900">
            Getting Started is{' '}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Simple
            </span>
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Three easy steps to connect with the childcare support you deserve.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-6">
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.15 * idx }}
              className="relative"
            >
              {/* Connecting line (desktop only) */}
              {idx < steps.length - 1 && (
                <div className="hidden lg:block absolute top-24 left-[calc(50%+60px)] w-[calc(100%-120px)] h-0.5 bg-gradient-to-r from-gray-300 to-gray-200" />
              )}

              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow text-center">
                {/* Step Number */}
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 text-white font-bold text-lg mb-4 shadow-lg shadow-rose-500/20">
                  {step.number}
                </div>

                {/* Illustration */}
                <div className="mb-5">{step.illustration}</div>

                {/* Text */}
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
