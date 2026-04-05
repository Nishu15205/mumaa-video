'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Check,
  X,
  Shield,
  Sparkles,
  Headphones,
  Video,
  Calendar,
  MonitorUp,
  Users,
  BarChart3,
  Zap,
  Clock,
  Crown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

// ---------- Types ----------

interface PlanFeature {
  text: string
  icon?: React.ReactNode
}

interface PricingPlanData {
  id: string
  name: string
  monthlyPrice: number
  annualPrice: number
  popular: boolean
  description: string
  buttonLabel: string
  buttonVariant: 'rose' | 'emerald' | 'outline'
  features: PlanFeature[]
}

interface ComparisonFeature {
  name: string
  free: boolean | string
  basic: boolean | string
  pro: boolean | string
}

// ---------- Data ----------

const plans: PricingPlanData[] = [
  {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    popular: false,
    description: 'Perfect for getting started',
    buttonLabel: 'Get Started Free',
    buttonVariant: 'outline',
    features: [
      { text: '1 instant video call per day', icon: <Video className="w-4 h-4" /> },
      { text: '2 scheduled calls per week', icon: <Calendar className="w-4 h-4" /> },
      { text: '15 minute maximum call duration', icon: <Clock className="w-4 h-4" /> },
      { text: 'Basic video quality (480p)', icon: <MonitorUp className="w-4 h-4" /> },
      { text: 'Email support', icon: <Headphones className="w-4 h-4" /> },
    ],
  },
  {
    id: 'basic',
    name: 'Basic',
    monthlyPrice: 499,
    annualPrice: 399,
    popular: true,
    description: 'For regular video calls',
    buttonLabel: 'Start 7-Day Free Trial',
    buttonVariant: 'rose',
    features: [
      { text: '5 instant video calls per day', icon: <Video className="w-4 h-4" /> },
      { text: 'Unlimited scheduled calls', icon: <Calendar className="w-4 h-4" /> },
      { text: '30 minute maximum duration', icon: <Clock className="w-4 h-4" /> },
      { text: 'HD video quality (720p)', icon: <MonitorUp className="w-4 h-4" /> },
      { text: 'Call recording', icon: <Sparkles className="w-4 h-4" /> },
      { text: 'Priority email & chat support', icon: <Headphones className="w-4 h-4" /> },
      { text: 'Screen sharing', icon: <MonitorUp className="w-4 h-4" /> },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    monthlyPrice: 999,
    annualPrice: 799,
    popular: false,
    description: 'For power users and families',
    buttonLabel: 'Start 7-Day Free Trial',
    buttonVariant: 'emerald',
    features: [
      { text: 'Unlimited instant calls', icon: <Zap className="w-4 h-4" /> },
      { text: '60 minute maximum duration', icon: <Clock className="w-4 h-4" /> },
      { text: 'Full HD video (1080p)', icon: <MonitorUp className="w-4 h-4" /> },
      { text: 'Family group calls (up to 4)', icon: <Users className="w-4 h-4" /> },
      { text: 'Dedicated nanny matching', icon: <Crown className="w-4 h-4" /> },
      { text: '24/7 priority support', icon: <Headphones className="w-4 h-4" /> },
      { text: 'Advanced call analytics', icon: <BarChart3 className="w-4 h-4" /> },
      { text: 'Priority booking', icon: <Calendar className="w-4 h-4" /> },
    ],
  },
]

const comparisonFeatures: ComparisonFeature[] = [
  { name: 'Instant video calls per day', free: '1', basic: '5', pro: 'Unlimited' },
  { name: 'Scheduled calls per week', free: '2', basic: 'Unlimited', pro: 'Unlimited' },
  { name: 'Maximum call duration', free: '15 min', basic: '30 min', pro: '60 min' },
  { name: 'Video quality', free: '480p', basic: '720p', pro: '1080p' },
  { name: 'Call recording', free: false, basic: true, pro: true },
  { name: 'Screen sharing', free: false, basic: true, pro: true },
  { name: 'Group calls', free: false, basic: false, pro: true },
  { name: 'Nanny matching', free: false, basic: false, pro: true },
  { name: 'Call analytics', free: false, basic: false, pro: true },
  { name: 'Priority booking', free: false, basic: false, pro: true },
  { name: 'Priority support', free: false, basic: 'Email & Chat', pro: '24/7' },
]

const faqItems = [
  {
    question: 'How does the free trial work?',
    answer:
      'When you sign up for a Basic or Pro plan, you get a 7-day free trial with full access to all features. No credit card required to start. If you love it, simply choose a payment method before the trial ends to continue.',
  },
  {
    question: 'Can I cancel anytime?',
    answer:
      'Absolutely! You can cancel your subscription at any time from your account settings. If you cancel during your trial, you will not be charged. If you cancel after paying, you will retain access until the end of your billing period.',
  },
  {
    question: 'What happens when my trial ends?',
    answer:
      'When your 7-day trial ends, you will be automatically downgraded to the Free plan. Your account and data are preserved, but your access to premium features will be limited. You can upgrade again at any time.',
  },
  {
    question: 'Is my payment secure?',
    answer:
      'Yes, we use industry-standard encryption and trusted payment gateways to process all transactions. Your payment information is never stored on our servers directly. We comply with PCI-DSS security standards.',
  },
  {
    question: 'Can I switch plans?',
    answer:
      'Yes! You can upgrade or downgrade your plan at any time. When upgrading, you will get immediate access to the new features. When downgrading, the change takes effect at the end of your current billing period.',
  },
  {
    question: 'Do you offer refunds?',
    answer:
      'We offer a 30-day money-back guarantee on all paid plans. If you are not satisfied for any reason, contact our support team within 30 days of your purchase for a full refund. No questions asked.',
  },
]

// ---------- Sub Components ----------

function CheckCell({ value }: { value: boolean | string }) {
  if (typeof value === 'string') {
    return <span className="text-sm text-gray-700">{value}</span>
  }
  if (value) {
    return <Check className="w-5 h-5 text-emerald-500 mx-auto" />
  }
  return <X className="w-5 h-5 text-gray-300 mx-auto" />
}

// ---------- Main Component ----------

export function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false)

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge className="mb-4 bg-rose-50 text-rose-600 border-rose-200 px-3 py-1 text-xs font-medium">
              <Sparkles className="w-3 h-3 mr-1" />
              Simple, transparent pricing
            </Badge>
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Choose Your Plan
            </h1>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">
              Start with a free trial. No credit card required.
            </p>
          </motion.div>

          {/* Billing Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="mt-8 inline-flex items-center gap-3 bg-gray-100 rounded-full p-1"
          >
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                !isAnnual
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                isAnnual
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Annual
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Save 20%
              </span>
            </button>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {plans.map((plan, index) => {
              const price = isAnnual ? plan.annualPrice : plan.monthlyPrice

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.1, duration: 0.4 }}
                >
                  <Card
                    className={`relative h-full flex flex-col ${
                      plan.popular
                        ? 'border-2 border-rose-500 shadow-lg shadow-rose-500/10'
                        : 'border border-gray-200'
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-rose-500 text-white border-rose-500 px-3 py-1 text-xs font-semibold">
                          Most Popular
                        </Badge>
                      </div>
                    )}

                    <CardContent className="pt-6 flex-1 flex flex-col">
                      {/* Plan name & description */}
                      <div className="mb-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                          {plan.name}
                        </h3>
                        <p className="text-sm text-gray-500">{plan.description}</p>
                      </div>

                      {/* Price */}
                      <div className="mb-6">
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm text-gray-500">₹</span>
                          <span className="text-5xl font-bold text-gray-900">
                            {price}
                          </span>
                          {price > 0 && (
                            <span className="text-sm text-gray-500">/month</span>
                          )}
                        </div>
                        {isAnnual && plan.monthlyPrice > 0 && (
                          <p className="text-xs text-emerald-600 mt-1 font-medium">
                            ₹{plan.annualPrice * 12}/year — Save ₹
                            {(plan.monthlyPrice - plan.annualPrice) * 12}/year
                          </p>
                        )}
                      </div>

                      {/* CTA Button */}
                      <Button
                        className={`w-full h-11 rounded-xl font-medium text-sm mb-8 ${
                          plan.buttonVariant === 'rose'
                            ? 'bg-rose-500 hover:bg-rose-600 text-white'
                            : plan.buttonVariant === 'emerald'
                              ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                              : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                        }`}
                      >
                        {plan.buttonLabel}
                      </Button>

                      {/* Features */}
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                          What&apos;s included
                        </p>
                        <ul className="space-y-3">
                          {plan.features.map((feature) => (
                            <li
                              key={feature.text}
                              className="flex items-start gap-3 text-sm text-gray-600"
                            >
                              <span className="mt-0.5 shrink-0 text-emerald-500">
                                <Check className="w-4 h-4" />
                              </span>
                              <span>{feature.text}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Compare All Features
            </h2>
            <p className="text-gray-500">Find the perfect plan for your needs</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm"
          >
            <table className="w-full min-w-[540px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">
                    Feature
                  </th>
                  <th className="text-center py-4 px-6 text-sm font-semibold text-gray-700 w-24">
                    Free
                  </th>
                  <th className="text-center py-4 px-6 text-sm font-semibold text-gray-700 w-24">
                    Basic
                  </th>
                  <th className="text-center py-4 px-6 text-sm font-semibold text-rose-600 w-24 bg-rose-50/50">
                    Pro
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((feature, i) => (
                  <tr
                    key={feature.name}
                    className={`border-b border-gray-50 ${
                      i === comparisonFeatures.length - 1 ? 'border-b-0' : ''
                    }`}
                  >
                    <td className="py-3.5 px-6 text-sm text-gray-600">
                      {feature.name}
                    </td>
                    <td className="py-3.5 px-6 text-center">
                      <CheckCell value={feature.free} />
                    </td>
                    <td className="py-3.5 px-6 text-center">
                      <CheckCell value={feature.basic} />
                    </td>
                    <td className="py-3.5 px-6 text-center bg-rose-50/30">
                      <CheckCell value={feature.pro} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-500">
              Everything you need to know about our plans
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Accordion type="single" collapsible className="space-y-2">
              {faqItems.map((item, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="border border-gray-200 rounded-xl px-6 bg-white data-[state=open]:shadow-sm"
                >
                  <AccordionTrigger className="text-left text-sm font-semibold text-gray-900 hover:no-underline py-4">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-gray-500 leading-relaxed pb-4">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* Money-back Guarantee Banner */}
      <section className="pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 p-8 sm:p-12 text-center text-white"
          >
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-5">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold mb-3">
              30-Day Money-Back Guarantee
            </h3>
            <p className="text-emerald-100 max-w-md mx-auto text-sm sm:text-base leading-relaxed">
              Not satisfied? Get a full refund within 30 days. No questions asked.
            </p>
            <Button
              className="mt-6 bg-white text-emerald-600 hover:bg-emerald-50 font-semibold rounded-full px-8 h-11"
            >
              Get Started with Confidence
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
