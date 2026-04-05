'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Baby,
  Star,
  Clock,
  Sparkles,
  Users,
  Briefcase,
  Globe,
  Award,
  LayoutDashboard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';

interface OnboardingFlowProps {
  role: 'PARENT' | 'NANNY';
  userName: string;
  onComplete: () => void;
}

const PARENT_INTERESTS = [
  { id: 'newborn', label: 'Newborn Care', icon: Baby },
  { id: 'toddler', label: 'Toddler Guidance', icon: Star },
  { id: 'sleep', label: 'Sleep Training', icon: Clock },
  { id: 'nutrition', label: 'Nutrition Advice', icon: Sparkles },
  { id: 'behavior', label: 'Behavior Management', icon: Users },
  { id: 'general', label: 'General Parenting Tips', icon: Heart },
];

const NANNY_SKILLS = [
  { id: 'newborn-care', label: 'Newborn Care' },
  { id: 'toddler-care', label: 'Toddler Care' },
  { id: 'sleep-training', label: 'Sleep Training' },
  { id: 'meal-prep', label: 'Meal Preparation' },
  { id: 'homework-help', label: 'Homework Help' },
  { id: 'first-aid', label: 'First Aid & CPR' },
  { id: 'special-needs', label: 'Special Needs Care' },
  { id: 'potty-training', label: 'Potty Training' },
  { id: 'outdoor-activities', label: 'Outdoor Activities' },
  { id: 'early-education', label: 'Early Education' },
];

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
];

const NANNY_LANGUAGES = [
  'English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam',
  'Marathi', 'Bengali', 'Gujarati', 'Punjabi', 'Urdu', 'Spanish', 'French', 'Portuguese',
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
  }),
};

export default function OnboardingFlow({ role, userName, onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // Parent state
  const [childrenCount, setChildrenCount] = useState('');
  const [childAge1, setChildAge1] = useState('');
  const [childAge2, setChildAge2] = useState('');
  const [childAge3, setChildAge3] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  // Nanny state
  const [yearsExperience, setYearsExperience] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [hourlyRate, setHourlyRate] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [certifications, setCertifications] = useState('');

  const totalSteps = 4;

  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setDirection(1);
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(currentStep - 1);
    }
  };

  const skipOnboarding = () => {
    onComplete();
  };

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSkill = (id: string) => {
    setSelectedSkills((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const toggleLanguage = (lang: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  const childAges = [childAge1, childAge2, childAge3];
  const childAgeSetters = [setChildAge1, setChildAge2, setChildAge3];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-pink-50 px-4 py-8">
      <div className="absolute top-20 -left-20 w-72 h-72 bg-rose-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 -right-20 w-64 h-64 bg-pink-200/25 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg relative"
      >
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/25">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
              Mumaa
            </span>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (i < currentStep) {
                      setDirection(-1);
                      setCurrentStep(i);
                    }
                  }}
                  className="group flex items-center gap-2"
                >
                  <div
                    className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                      i < currentStep
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                        : i === currentStep
                        ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md shadow-rose-500/25 ring-4 ring-rose-100'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {i < currentStep ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      i + 1
                    )}
                  </div>
                </button>
                {i < totalSteps - 1 && (
                  <div
                    className={`h-0.5 w-8 sm:w-12 rounded-full transition-all duration-300 ${
                      i < currentStep ? 'bg-emerald-400' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Parent Steps */}
          {role === 'PARENT' && (
            <AnimatePresence mode="wait" custom={direction}>
              {currentStep === 0 && (
                <motion.div
                  key="parent-welcome"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.35, ease: 'easeInOut' }}
                  className="text-center py-4"
                >
                  <div className="relative w-48 h-48 mx-auto mb-6">
                    <Image
                      src="/onboarding-parent.png"
                      alt="Welcome illustration"
                      width={192}
                      height={192}
                      className="object-contain"
                    />
                  </div>
                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-2xl font-bold text-gray-900 mb-2"
                  >
                    Welcome to Mumaa, {userName}! 👋
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-gray-500 text-sm max-w-sm mx-auto"
                  >
                    We&apos;re so happy you&apos;re here. Let&apos;s set up your profile in a few quick steps so we can connect you with the perfect nanny for your family.
                  </motion.p>
                </motion.div>
              )}

              {currentStep === 1 && (
                <motion.div
                  key="parent-family"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.35, ease: 'easeInOut' }}
                >
                  <div className="text-center mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
                      <Users className="w-7 h-7 text-rose-500" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">
                      Tell us about your family
                    </h2>
                    <p className="text-sm text-gray-500">
                      Help us find the best match for your needs
                    </p>
                  </div>

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        How many children do you have?
                      </Label>
                      <div className="flex gap-3">
                        {['1', '2', '3'].map((num) => (
                          <button
                            key={num}
                            onClick={() => setChildrenCount(num)}
                            className={`flex-1 h-14 rounded-xl border-2 text-lg font-semibold transition-all ${
                              childrenCount === num
                                ? 'border-rose-500 bg-rose-50 text-rose-600'
                                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>

                    {childrenCount && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-3"
                      >
                        <Label className="text-sm font-medium text-gray-700">
                          What are their ages? (years)
                        </Label>
                        <div className="flex gap-3 flex-wrap">
                          {Array.from({ length: parseInt(childrenCount) }).map((_, i) => (
                            <div key={i} className="flex-1 min-w-[100px] space-y-1">
                              <span className="text-xs text-gray-400">Child {i + 1}</span>
                              <Input
                                type="number"
                                placeholder="Age"
                                min="0"
                                max="18"
                                value={childAges[i]}
                                onChange={(e) => childAgeSetters[i](e.target.value)}
                                className="h-11 rounded-xl border-gray-200 focus:border-rose-400 focus:ring-rose-400/20"
                              />
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div
                  key="parent-interests"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.35, ease: 'easeInOut' }}
                >
                  <div className="text-center mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
                      <Star className="w-7 h-7 text-rose-500" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">
                      What are you looking for?
                    </h2>
                    <p className="text-sm text-gray-500">
                      Select all that interest you
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {PARENT_INTERESTS.map((interest) => {
                      const Icon = interest.icon;
                      const isSelected = selectedInterests.includes(interest.id);
                      return (
                        <motion.button
                          key={interest.id}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => toggleInterest(interest.id)}
                          className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                            isSelected
                              ? 'border-rose-500 bg-rose-50 shadow-sm'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                              isSelected ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <span
                              className={`text-sm font-medium ${
                                isSelected ? 'text-rose-700' : 'text-gray-700'
                              }`}
                            >
                              {interest.label}
                            </span>
                          </div>
                          {isSelected && (
                            <CheckCircle className="w-4 h-4 text-rose-500 ml-auto flex-shrink-0" />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div
                  key="parent-complete"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.35, ease: 'easeInOut' }}
                  className="text-center py-4"
                >
                  <div className="relative w-48 h-48 mx-auto mb-6">
                    <Image
                      src="/onboarding-complete.png"
                      alt="All set illustration"
                      width={192}
                      height={192}
                      className="object-contain"
                    />
                  </div>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                    className="w-16 h-16 rounded-full bg-emerald-50 border-4 border-emerald-200 flex items-center justify-center mx-auto mb-4"
                  >
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                  </motion.div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    You&apos;re All Set! 🎉
                  </h2>
                  <p className="text-sm text-gray-500 mb-8 max-w-sm mx-auto">
                    Your dashboard is ready. Browse nannies, schedule calls, and get the parenting support you need — all in one place.
                  </p>
                  <Button
                    onClick={onComplete}
                    size="lg"
                    className="h-12 px-8 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40 transition-all"
                  >
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Go to Dashboard
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* Nanny Steps */}
          {role === 'NANNY' && (
            <AnimatePresence mode="wait" custom={direction}>
              {currentStep === 0 && (
                <motion.div
                  key="nanny-welcome"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.35, ease: 'easeInOut' }}
                  className="text-center py-4"
                >
                  <div className="relative w-48 h-48 mx-auto mb-6">
                    <Image
                      src="/onboarding-nanny.png"
                      alt="Welcome illustration"
                      width={192}
                      height={192}
                      className="object-contain"
                    />
                  </div>
                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-2xl font-bold text-gray-900 mb-2"
                  >
                    Welcome to Mumaa, {userName}! ✨
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-gray-500 text-sm max-w-sm mx-auto"
                  >
                    Let&apos;s set up your professional profile so parents can discover you and book video consultations.
                  </motion.p>
                </motion.div>
              )}

              {currentStep === 1 && (
                <motion.div
                  key="nanny-experience"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.35, ease: 'easeInOut' }}
                >
                  <div className="text-center mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                      <Briefcase className="w-7 h-7 text-emerald-500" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">
                      Experience &amp; Skills
                    </h2>
                    <p className="text-sm text-gray-500">
                      Tell parents about your expertise
                    </p>
                  </div>

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Years of Experience
                      </Label>
                      <div className="flex gap-3 flex-wrap">
                        {['1-3', '3-5', '5-10', '10+'].map((range) => (
                          <button
                            key={range}
                            onClick={() => setYearsExperience(range)}
                            className={`px-5 h-11 rounded-xl border-2 text-sm font-semibold transition-all ${
                              yearsExperience === range
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                            }`}
                          >
                            {range} yrs
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Your Skills
                      </Label>
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                        {NANNY_SKILLS.map((skill) => {
                          const isSelected = selectedSkills.includes(skill.id);
                          return (
                            <motion.button
                              key={skill.id}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => toggleSkill(skill.id)}
                              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all text-left ${
                                isSelected
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                              }`}
                            >
                              <Checkbox
                                checked={isSelected}
                                className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                onCheckedChange={() => toggleSkill(skill.id)}
                              />
                              <span className="truncate">{skill.label}</span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Hourly Rate (₹)
                      </Label>
                      <Input
                        type="number"
                        placeholder="e.g., 500"
                        min="0"
                        value={hourlyRate}
                        onChange={(e) => setHourlyRate(e.target.value)}
                        className="h-11 rounded-xl border-gray-200 focus:border-emerald-400 focus:ring-emerald-400/20"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div
                  key="nanny-availability"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.35, ease: 'easeInOut' }}
                >
                  <div className="text-center mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                      <Globe className="w-7 h-7 text-emerald-500" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">
                      Availability &amp; Languages
                    </h2>
                    <p className="text-sm text-gray-500">
                      When can parents book you?
                    </p>
                  </div>

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Available Days
                      </Label>
                      <div className="flex gap-2 flex-wrap">
                        {DAYS_OF_WEEK.map((day) => {
                          const short = day.slice(0, 3);
                          const isSelected = selectedDays.includes(day);
                          return (
                            <motion.button
                              key={day}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => toggleDay(day)}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                isSelected
                                  ? 'bg-emerald-500 text-white shadow-sm'
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              }`}
                            >
                              {short}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Languages You Speak
                      </Label>
                      <div className="flex gap-2 flex-wrap max-h-32 overflow-y-auto">
                        {NANNY_LANGUAGES.map((lang) => {
                          const isSelected = selectedLanguages.includes(lang);
                          return (
                            <motion.button
                              key={lang}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => toggleLanguage(lang)}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                isSelected
                                  ? 'bg-emerald-500 text-white shadow-sm'
                                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              }`}
                            >
                              {lang}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Certifications (optional)
                      </Label>
                      <Input
                        placeholder="e.g., CPR, First Aid, Early Childhood Education"
                        value={certifications}
                        onChange={(e) => setCertifications(e.target.value)}
                        className="h-11 rounded-xl border-gray-200 focus:border-emerald-400 focus:ring-emerald-400/20"
                      />
                      <p className="text-xs text-gray-400">Separate multiple certifications with commas</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div
                  key="nanny-complete"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.35, ease: 'easeInOut' }}
                  className="text-center py-4"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 border-4 border-emerald-200 flex items-center justify-center mx-auto mb-6"
                  >
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                      <Award className="w-8 h-8 text-white" />
                    </div>
                  </motion.div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Your Profile is Ready! 🌟
                  </h2>
                  <p className="text-sm text-gray-500 mb-3 max-w-sm mx-auto">
                    Parents can now discover you and book video consultations. Keep your availability updated to receive more calls.
                  </p>
                  <div className="flex gap-4 justify-center text-xs text-gray-400 mb-8">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      {selectedSkills.length} skills added
                    </span>
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {selectedLanguages.length} languages
                    </span>
                  </div>
                  <Button
                    onClick={onComplete}
                    size="lg"
                    className="h-12 px-8 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all"
                  >
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Start Receiving Calls
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* Navigation Buttons */}
          {currentStep < totalSteps - 1 && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
              <div className="flex items-center gap-3">
                {currentStep > 0 && (
                  <Button
                    variant="ghost"
                    onClick={prevStep}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={skipOnboarding}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Skip for now
                </button>

                <Button
                  onClick={nextStep}
                  className={`h-10 px-6 rounded-xl font-medium transition-all ${
                    role === 'PARENT'
                      ? 'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-md shadow-rose-500/20'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20'
                  }`}
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
