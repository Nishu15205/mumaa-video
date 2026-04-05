'use client';

import { useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAppStore } from '@/stores/app-store';

interface Plan {
  name: string;
  priceInr: number;
  priceUsd: number;
  annualInr: number;
  annualUsd: number;
  description: string;
  features: string[];
  popular: boolean;
  cta: string;
}

const plans: Plan[] = [
  {
    name: 'Free',
    priceInr: 0,
    priceUsd: 0,
    annualInr: 0,
    annualUsd: 0,
    description: 'Perfect for getting started',
    features: [
      '1 instant call per day',
      '2 scheduled calls per week',
      '15-minute max duration',
      'Basic support',
    ],
    popular: false,
    cta: 'Get Started',
  },
  {
    name: 'Basic',
    priceInr: 499,
    priceUsd: 29,
    annualInr: 399,
    annualUsd: 23,
    description: 'Most popular choice',
    features: [
      '5 instant calls per day',
      'Unlimited scheduled calls',
      '30-minute max duration',
      'Priority support',
      'Call recording',
    ],
    popular: true,
    cta: 'Start 7-Day Free Trial',
  },
  {
    name: 'Pro',
    priceInr: 999,
    priceUsd: 59,
    annualInr: 799,
    annualUsd: 47,
    description: 'For dedicated parents',
    features: [
      'Unlimited instant calls',
      'Unlimited scheduled calls',
      '60-minute max duration',
      '24/7 support',
      'Recording',
      'Family group calls',
      'Dedicated nanny matching',
    ],
    popular: false,
    cta: 'Start 7-Day Free Trial',
  },
];

export default function Pricing() {
  const [annual, setAnnual] = useState(false);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const { setCurrentView } = useAppStore();

  return (
    <section id="pricing" className="py-20 md:py-28 px-4 md:px-8 lg:px-16 bg-white">
      <div className="max-w-7xl mx-auto" ref={ref}>
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-amber-100 text-amber-700 text-sm font-medium mb-4">
            Pricing
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900">
            Simple,{' '}
            <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              Transparent
            </span>{' '}
            Pricing
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Choose the plan that works best for your family. All plans include a free trial.
          </p>
        </motion.div>

        {/* Annual Toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex items-center justify-center gap-3 mb-12"
        >
          <span className={`text-sm font-medium ${!annual ? 'text-gray-900' : 'text-gray-500'}`}>
            Monthly
          </span>
          <Switch
            checked={annual}
            onCheckedChange={setAnnual}
            className="data-[state=checked]:bg-rose-500"
          />
          <span className={`text-sm font-medium ${annual ? 'text-gray-900' : 'text-gray-500'}`}>
            Annual
            <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
              Save 20%
            </span>
          </span>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-start">
          {plans.map((plan, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 * idx }}
              className={`relative bg-white rounded-2xl border p-6 md:p-8 transition-all duration-300 ${
                plan.popular
                  ? 'border-rose-300 shadow-xl shadow-rose-500/10 scale-[1.02] md:scale-105'
                  : 'border-gray-200 shadow-sm hover:shadow-md'
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs font-bold shadow-lg shadow-rose-500/30">
                    <Sparkles className="w-3.5 h-3.5" />
                    Most Popular
                  </span>
                </div>
              )}

              {/* Plan Name */}
              <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
              <p className="text-sm text-gray-500 mb-4">{plan.description}</p>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-gray-500">₹</span>
                  <span className="text-4xl font-extrabold text-gray-900">
                    {annual ? plan.annualInr : plan.priceInr}
                  </span>
                  {plan.priceInr > 0 && (
                    <span className="text-sm text-gray-500">/mo</span>
                  )}
                </div>
                {plan.priceInr > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    ${annual ? plan.annualUsd : plan.priceUsd}/mo ·{' '}
                    {annual ? 'billed annually' : 'billed monthly'}
                  </p>
                )}
              </div>

              {/* CTA Button */}
              <Button
                className={`w-full rounded-xl h-12 text-sm font-semibold mb-6 ${
                  plan.popular
                    ? 'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40'
                    : 'bg-gray-900 hover:bg-gray-800 text-white'
                }`}
                onClick={() => setCurrentView('signup')}
              >
                {plan.cta}
              </Button>

              {/* Features */}
              <ul className="space-y-3">
                {plan.features.map((feature, fIdx) => (
                  <li key={fIdx} className="flex items-start gap-2.5">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        plan.popular ? 'bg-rose-100' : 'bg-gray-100'
                      }`}
                    >
                      <Check
                        className={`w-3 h-3 ${
                          plan.popular ? 'text-rose-600' : 'text-gray-600'
                        }`}
                      />
                    </div>
                    <span className="text-sm text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
