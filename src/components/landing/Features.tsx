'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Video, Zap, Calendar, Shield, CreditCard, Headphones } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
  bgColor: string;
}

const features: Feature[] = [
  {
    icon: Video,
    title: 'Video Calls',
    description: 'Crystal-clear HD video calls with screen sharing for demonstrations.',
    color: 'text-rose-600',
    bgColor: 'bg-rose-100',
  },
  {
    icon: Zap,
    title: 'Instant Connect',
    description: 'Find available nannies and connect instantly. No scheduling needed.',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  {
    icon: Calendar,
    title: 'Scheduled Sessions',
    description: 'Book sessions days in advance. Perfect for regular consultations.',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
  },
  {
    icon: Shield,
    title: 'Verified Experts',
    description: 'All nannies are background-checked, verified, and rated by parents.',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    icon: CreditCard,
    title: 'Flexible Plans',
    description: 'Choose a plan that fits your needs. Start with 7 days free.',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  {
    icon: Headphones,
    title: '24/7 Support',
    description: 'Round-the-clock support for any issues or emergencies.',
    color: 'text-pink-600',
    bgColor: 'bg-pink-100',
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export default function Features() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="features" className="py-20 md:py-28 px-4 md:px-8 lg:px-16 bg-white">
      <div className="max-w-7xl mx-auto" ref={ref}>
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-rose-100 text-rose-700 text-sm font-medium mb-4">
            Features
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900">
            Everything You Need for{' '}
            <span className="bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
              Peace of Mind
            </span>
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            From instant video consultations to scheduled sessions, we&apos;ve got every aspect
            of childcare support covered.
          </p>
        </motion.div>

        {/* Feature Cards Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              variants={cardVariants}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="group bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-lg hover:border-gray-200 transition-all duration-300"
            >
              <div
                className={`w-12 h-12 rounded-xl ${feature.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
              >
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
