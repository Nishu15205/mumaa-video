'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  User,
  Mail,
  Phone,
  Briefcase,
  Star,
  IndianRupee,
  Languages,
  Award,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAppStore } from '@/stores/app-store';

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  experience: string;
  skills: string;
  hourlyRate: string;
  languages: string;
  certifications: string;
  bio: string;
}

const initialForm: FormData = {
  fullName: '',
  email: '',
  phone: '',
  experience: '',
  skills: '',
  hourlyRate: '',
  languages: '',
  certifications: '',
  bio: '',
};

export default function ApplyAsNanny() {
  const { setCurrentView } = useAppStore();
  const [form, setForm] = useState<FormData>(initialForm);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const updateField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!form.email.trim() || !validateEmail(form.email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!agreed) {
      setError('Please agree to the terms and conditions.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/nanny-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          experience: parseInt(form.experience) || 0,
          skills: form.skills.trim(),
          hourlyRate: parseFloat(form.hourlyRate) || 0,
          languages: form.languages.trim(),
          certifications: form.certifications.trim(),
          bio: form.bio.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || data?.message || 'Failed to submit application. Please try again.');
        return;
      }
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const [agreed, setAgreed] = useState(false);

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 px-4">
        {/* Decorative blobs */}
        <div className="fixed top-20 -left-20 w-72 h-72 bg-emerald-200/30 rounded-full blur-3xl pointer-events-none" />
        <div className="fixed bottom-20 -right-20 w-64 h-64 bg-rose-200/25 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md relative"
        >
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
            {/* Success icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25"
            >
              <CheckCircle2 className="w-10 h-10 text-white" />
            </motion.div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Application Submitted!
            </h1>
            <p className="text-gray-500 leading-relaxed">
              Your application has been submitted! Our team will review it and you&apos;ll receive an email once approved.
            </p>

            <div className="mt-8 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
              <p className="text-sm text-emerald-700">
                <strong>What&apos;s next?</strong>
              </p>
              <ul className="mt-2 text-sm text-emerald-600 space-y-1 text-left">
                <li>&#8226; Our team will review your profile within 24-48 hours</li>
                <li>&#8226; You&apos;ll receive an email confirmation at <strong>{form.email}</strong></li>
                <li>&#8226; Once approved, you can start accepting calls</li>
              </ul>
            </div>

            <Button
              onClick={() => setCurrentView('landing')}
              className="mt-6 w-full h-12 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40 transition-all"
            >
              Back to Home
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 px-4 py-12">
      {/* Decorative blobs */}
      <div className="fixed top-20 -left-20 w-72 h-72 bg-rose-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-20 -right-20 w-64 h-64 bg-pink-200/25 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-100/20 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg relative"
      >
        {/* Back button */}
        <button
          onClick={() => setCurrentView('landing')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-rose-600 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </button>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/25">
              <Heart className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
              Mumaa
            </span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 text-center mt-4 mb-1">
            Apply as a Nanny
          </h1>
          <p className="text-sm text-gray-500 text-center mb-6">
            Join our trusted childcare platform
          </p>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="apply-name" className="text-sm font-medium text-gray-700">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="apply-name"
                  placeholder="Enter your full name"
                  value={form.fullName}
                  onChange={(e) => updateField('fullName', e.target.value)}
                  className="h-11 rounded-xl border-gray-200 focus:border-rose-400 focus:ring-rose-400/20 pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="apply-email" className="text-sm font-medium text-gray-700">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="apply-email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className="h-11 rounded-xl border-gray-200 focus:border-rose-400 focus:ring-rose-400/20 pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="apply-phone" className="text-sm font-medium text-gray-700">
                Phone Number <span className="text-gray-400 text-xs">(optional)</span>
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="apply-phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  className="h-11 rounded-xl border-gray-200 focus:border-rose-400 focus:ring-rose-400/20 pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Experience & Hourly Rate - side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="apply-experience" className="text-sm font-medium text-gray-700">
                  Years of Experience
                </Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="apply-experience"
                    type="number"
                    min="0"
                    placeholder="e.g., 3"
                    value={form.experience}
                    onChange={(e) => updateField('experience', e.target.value)}
                    className="h-11 rounded-xl border-gray-200 focus:border-rose-400 focus:ring-rose-400/20 pl-10"
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="apply-rate" className="text-sm font-medium text-gray-700">
                  Hourly Rate (₹)
                </Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="apply-rate"
                    type="number"
                    min="0"
                    placeholder="e.g., 300"
                    value={form.hourlyRate}
                    onChange={(e) => updateField('hourlyRate', e.target.value)}
                    className="h-11 rounded-xl border-gray-200 focus:border-rose-400 focus:ring-rose-400/20 pl-10"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Skills */}
            <div className="space-y-2">
              <Label htmlFor="apply-skills" className="text-sm font-medium text-gray-700">
                Skills
              </Label>
              <div className="relative">
                <Star className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="apply-skills"
                  placeholder="e.g., newborn care, toddler activities"
                  value={form.skills}
                  onChange={(e) => updateField('skills', e.target.value)}
                  className="h-11 rounded-xl border-gray-200 focus:border-rose-400 focus:ring-rose-400/20 pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Languages */}
            <div className="space-y-2">
              <Label htmlFor="apply-languages" className="text-sm font-medium text-gray-700">
                Languages
              </Label>
              <div className="relative">
                <Languages className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="apply-languages"
                  placeholder="e.g., Hindi, English, Marathi"
                  value={form.languages}
                  onChange={(e) => updateField('languages', e.target.value)}
                  className="h-11 rounded-xl border-gray-200 focus:border-rose-400 focus:ring-rose-400/20 pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Certifications */}
            <div className="space-y-2">
              <Label htmlFor="apply-certs" className="text-sm font-medium text-gray-700">
                Certifications
              </Label>
              <div className="relative">
                <Award className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="apply-certs"
                  placeholder="e.g., CPR, First Aid, ECCE"
                  value={form.certifications}
                  onChange={(e) => updateField('certifications', e.target.value)}
                  className="h-11 rounded-xl border-gray-200 focus:border-rose-400 focus:ring-rose-400/20 pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="apply-bio" className="text-sm font-medium text-gray-700">
                Short Bio <span className="text-gray-400 text-xs">(optional)</span>
              </Label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Textarea
                  id="apply-bio"
                  placeholder="Tell us about yourself and your childcare experience..."
                  value={form.bio}
                  onChange={(e) => updateField('bio', e.target.value)}
                  rows={3}
                  className="rounded-xl border-gray-200 focus:border-rose-400 focus:ring-rose-400/20 pl-10 resize-none"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Terms checkbox */}
            <div className="flex items-start gap-3 pt-1">
              <Checkbox
                id="apply-terms"
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked === true)}
                className="mt-0.5 data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500"
                disabled={loading}
              />
              <label htmlFor="apply-terms" className="text-xs text-gray-500 leading-relaxed cursor-pointer">
                I agree to the{' '}
                <button
                  type="button"
                  onClick={() => setCurrentView('terms')}
                  className="text-rose-600 hover:text-rose-700 font-medium underline-offset-2 hover:underline"
                >
                  Terms of Service
                </button>{' '}
                and{' '}
                <button
                  type="button"
                  onClick={() => setCurrentView('privacy')}
                  className="text-rose-600 hover:text-rose-700 font-medium underline-offset-2 hover:underline"
                >
                  Privacy Policy
                </button>
              </label>
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold shadow-lg shadow-rose-500/25 hover:shadow-rose-500/40 transition-all mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting Application...
                </>
              ) : (
                'Submit Application'
              )}
            </Button>
          </form>

          {/* Help text */}
          <p className="mt-5 text-center text-xs text-gray-400">
            Already a registered nanny?{' '}
            <button
              onClick={() => setCurrentView('login')}
              className="text-rose-600 hover:text-rose-700 font-medium underline-offset-2 hover:underline"
            >
              Sign in
            </button>{' '}
            to your account
          </p>
        </div>
      </motion.div>
    </div>
  );
}
