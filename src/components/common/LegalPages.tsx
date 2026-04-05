'use client';

import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Heart,
  Shield,
  Users,
  Video,
  Phone,
  Mail,
  MapPin,
  Star,
  Baby,
  Clock,
  Award,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface LegalPagesProps {
  page: 'terms' | 'privacy' | 'about';
  onBack: () => void;
}

export default function LegalPages({ page, onBack }: LegalPagesProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button
              variant="ghost"
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                <Heart className="w-4 h-4 text-white fill-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Mumaa</span>
            </div>
            <div className="w-20" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {page === 'terms' && <TermsOfService />}
          {page === 'privacy' && <PrivacyPolicy />}
          {page === 'about' && <AboutPage />}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-gray-400 mt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
          <p className="text-sm">&copy; 2025 Mumaa. All rights reserved.</p>
          <p className="text-xs mt-2 text-gray-500">
            Made with <span className="text-rose-500">&#9829;</span> for Indian families
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ===========================
   Terms of Service
   =========================== */
function TermsOfService() {
  const sections = [
    {
      title: '1. Acceptance of Terms',
      content: `By accessing or using the Mumaa platform ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the Service. These Terms constitute a legally binding agreement between you and Mumaa Technologies Private Limited ("Company," "we," "us," or "our").

Mumaa reserves the right to modify these Terms at any time. We will notify users of material changes via email or through a prominent notice on our platform. Your continued use of the Service after such modifications constitutes your acceptance of the revised Terms.

If you are using the Service on behalf of a business or entity, you represent and warrant that you have the authority to bind that entity to these Terms.`,
    },
    {
      title: '2. Service Description',
      content: `Mumaa is an online platform that connects parents and families with qualified childcare professionals ("Nannies") through video calls. The Service includes, but is not limited to:

• Instant video consultations with vetted nannies
• Scheduled video calls for childcare guidance
• Subscription-based access to premium features
• Parenting resources and expert advice
• Review and rating system for nanny profiles

The Service is available through web browsers and mobile applications. We reserve the right to discontinue or modify any aspect of the Service at any time, with reasonable notice where applicable.

Mumaa acts as an intermediary platform and does not directly provide childcare services. All nannies are independent professionals who use our platform to offer their services.`,
    },
    {
      title: '3. User Accounts',
      content: `To use the Service, you must create an account. When creating your account, you agree to:

• Provide accurate, current, and complete information
• Maintain and promptly update your account information
• Keep your password confidential and secure
• Accept responsibility for all activities under your account
• Notify us immediately of any unauthorized use

You must be at least 18 years of age to create an account. If you are a parent or guardian using the Service for childcare consultations, you represent that you are legally responsible for the children in question.

Each individual may maintain only one active account. We reserve the right to suspend or terminate accounts that violate this provision or any other term of service.`,
    },
    {
      title: '4. Payments & Subscriptions',
      content: `Mumaa offers both free and paid subscription plans. By subscribing to a paid plan, you agree to the following:

• Subscription fees are billed monthly in advance
• Your subscription will automatically renew at the end of each billing period
• You may cancel your subscription at any time through your account settings
• Cancellation takes effect at the end of the current billing period
• Refunds are not provided for partial billing periods

New subscribers are eligible for a 7-day free trial. During the trial period, you may cancel at any time without being charged. If you do not cancel before the trial ends, your subscription will automatically begin and you will be charged the applicable fee.

Payment processing is handled securely through our payment service provider. Mumaa does not store your full credit card details on our servers.

Prices are listed in Indian Rupees (INR) and are inclusive of applicable taxes unless otherwise stated. We reserve the right to change pricing with 30 days' prior notice.`,
    },
    {
      title: '5. Video Call Disclaimer',
      content: `Video calls on the Mumaa platform are intended for childcare guidance, parenting advice, and general consultation purposes. Users acknowledge that:

• Video calls do not replace in-person childcare or emergency medical services
• Nannies provide guidance and advice based on their professional experience
• Mumaa does not guarantee the outcomes of any consultation
• Users are responsible for making their own childcare decisions
• In case of emergencies, users should contact local emergency services immediately

Technical issues such as connection drops, audio/video quality, or platform downtime may occur. Mumaa will make reasonable efforts to maintain service availability but does not guarantee uninterrupted access.

Recorded video calls (where available) are stored securely and may be accessed for quality assurance purposes with user consent.`,
    },
    {
      title: '6. User Conduct',
      content: `Users agree to use the Service in a manner that is lawful, respectful, and consistent with community standards. The following activities are strictly prohibited:

• Harassment, intimidation, or threatening behavior toward other users
• Sharing inappropriate, offensive, or harmful content during video calls
• Impersonating another person or misrepresenting your identity
• Using the Service for any purpose that is unlawful or violates third-party rights
• Attempting to gain unauthorized access to other users' accounts or our systems
• Soliciting personal information from other users for non-service purposes
• Posting false or misleading reviews or ratings

Violation of these conduct standards may result in account suspension, termination, and/or legal action as appropriate.`,
    },
    {
      title: '7. Intellectual Property',
      content: `All content on the Mumaa platform, including but not limited to text, graphics, logos, icons, images, software, and the overall design, is the property of Mumaa Technologies Private Limited and is protected by Indian and international intellectual property laws.

Users retain ownership of content they create and share through the Service (such as reviews, comments, and profile information). By posting such content, you grant Mumaa a non-exclusive, worldwide, royalty-free license to use, reproduce, and distribute such content in connection with operating and improving the Service.

Nanny profiles, expertise areas, and professional credentials displayed on the platform are provided by the nannies themselves and are verified to the extent reasonably possible. Mumaa does not claim ownership of this professional information.`,
    },
    {
      title: '8. Limitation of Liability',
      content: `To the fullest extent permitted by applicable law, Mumaa Technologies Private Limited, its directors, employees, partners, and affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from:

• Your use of or inability to use the Service
• Any advice, guidance, or recommendations provided by nannies
• Any loss of data, revenue, or business opportunity
• Any unauthorized access to your account or personal information
• Any interruption or cessation of the Service
• Any content, goods, or services obtained through the Service

Our total aggregate liability for any claim arising from or related to these Terms or the Service shall not exceed the amount you have paid to Mumaa in the twelve (12) months preceding the claim.

This limitation of liability applies regardless of the legal theory under which the claim is made, whether in contract, tort, strict liability, or otherwise.`,
    },
    {
      title: '9. Governing Law',
      content: `These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions. Any disputes arising from or relating to these Terms or the Service shall be subject to the exclusive jurisdiction of the courts of Bengaluru, Karnataka, India.

Before initiating any formal legal proceedings, you agree to attempt to resolve any dispute through good-faith negotiation with Mumaa. If negotiation is unsuccessful, either party may pursue resolution through binding arbitration in accordance with the Arbitration and Conciliation Act, 1996.

For any questions or concerns regarding these Terms, please contact our legal team at legal@mumaa.in.`,
    },
    {
      title: '10. Contact',
      content: `If you have any questions about these Terms of Service, please contact us:

Mumaa Technologies Private Limited
Email: legal@mumaa.in
Phone: +91 80-XXXX-XXXX
Address: Bengaluru, Karnataka, India

Our business hours are Monday through Friday, 9:00 AM to 6:00 PM IST. We aim to respond to all inquiries within 2 business days.`,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="text-center mb-10">
        <Badge variant="outline" className="mb-4 border-rose-200 text-rose-600 bg-rose-50">
          Legal Document
        </Badge>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
          Terms of Service
        </h1>
        <p className="text-gray-500">
          Last updated: January 15, 2025 &bull; Effective date: February 1, 2025
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 mb-6">
        <p className="text-gray-600 leading-relaxed">
          Welcome to Mumaa. Please read these Terms of Service carefully before using our platform.
          By using Mumaa, you acknowledge that you have read, understood, and agree to be bound
          by these terms.
        </p>
      </div>

      <div className="space-y-6">
        {sections.map((section, index) => (
          <motion.section
            key={index}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-3">{section.title}</h2>
            {section.content.split('\n\n').map((paragraph, pIdx) => (
              <p key={pIdx} className="text-gray-600 text-sm leading-relaxed mb-3 last:mb-0">
                {paragraph}
              </p>
            ))}
          </motion.section>
        ))}
      </div>
    </div>
  );
}

/* ===========================
   Privacy Policy
   =========================== */
function PrivacyPolicy() {
  const sections = [
    {
      title: '1. Information We Collect',
      content: `Mumaa collects the following categories of information to provide and improve our Service:

Account Information: When you create an account, we collect your name, email address, phone number, and role (parent or nanny). For parents, we collect the number of children and their ages. For nannies, we collect professional information including experience, skills, certifications, and hourly rates.

Profile Information: You may optionally provide a profile photo, bio, and preferences. This information helps personalize your experience and improve matching with other users.

Payment Information: When you subscribe to a paid plan, we collect your billing address and payment method details. Full credit card information is processed by our payment service provider and is not stored on our servers.

Usage Data: We automatically collect information about how you interact with the Service, including pages visited, features used, call duration, search queries, and device information (browser type, operating system, IP address).

Communication Data: We may collect and store messages exchanged through our platform for the purpose of providing the Service and ensuring safety. Video call content is not recorded without explicit consent from all participants.`,
    },
    {
      title: '2. How We Use Information',
      content: `The information we collect is used for the following purposes:

Service Delivery: To operate, maintain, and improve the Mumaa platform, process your subscription, facilitate video calls between users, and provide customer support.

Communication: To send you service-related notifications, account updates, security alerts, and respond to your inquiries. With your consent, we may also send marketing communications about new features, promotions, or events.

Personalization: To customize your experience, including displaying relevant nanny profiles, suggesting features based on your usage patterns, and tailoring content to your preferences.

Safety and Security: To detect and prevent fraud, abuse, and security threats, verify user identities, enforce our Terms of Service, and protect the rights and safety of our users.

Analytics and Improvement: To analyze usage trends, measure the effectiveness of our features, conduct research, and make data-driven decisions to improve the Service.

Legal Compliance: To comply with applicable laws, regulations, legal processes, or governmental requests, and to establish, exercise, or defend legal claims.`,
    },
    {
      title: '3. Data Sharing',
      content: `Mumaa does not sell, trade, or rent your personal information to third parties. We may share your information in the following limited circumstances:

Between Users: When you engage with a nanny through a video call, the nanny will see the name and basic profile information you have chosen to share. Similarly, nannies' professional profiles are visible to parents using the platform.

Service Providers: We share information with trusted third-party service providers who assist us in operating the Service, including payment processing, cloud hosting, analytics, and email delivery. These providers are contractually obligated to protect your information and may only use it for the purposes we specify.

Legal Requirements: We may disclose information if required by law, court order, or government regulation, or if we believe such disclosure is necessary to protect our rights, your safety, or the safety of others, investigate fraud, or respond to a government request.

Business Transfers: In the event of a merger, acquisition, reorganization, or sale of assets, your information may be transferred as part of such transaction, with continued protection under these terms.

With Your Consent: We may share information with third parties when you have given us explicit consent to do so.`,
    },
    {
      title: '4. Cookies',
      content: `Mumaa uses cookies and similar tracking technologies to enhance your experience on our platform:

Essential Cookies: These are necessary for the Service to function properly, including maintaining your session, remembering your preferences, and ensuring security. These cannot be disabled.

Analytics Cookies: These help us understand how users interact with our platform by collecting information about pages visited, time spent, and navigation patterns. We use this data to improve the Service. You may opt out of analytics cookies through your browser settings.

Marketing Cookies: With your consent, we may use cookies from advertising partners to deliver relevant advertisements and measure campaign effectiveness. You can manage your marketing cookie preferences through our cookie consent banner.

Local Storage: We use browser local storage to save your preferences, authentication state, and other session data for a more seamless experience.

You can control cookie preferences through your browser settings. Please note that disabling certain cookies may affect the functionality of the Service.`,
    },
    {
      title: '5. Data Security',
      content: `Mumaa implements industry-standard security measures to protect your personal information:

Encryption: All data transmitted between your device and our servers is encrypted using TLS/SSL protocols. Sensitive data such as passwords are hashed using bcrypt with a minimum of 12 rounds of salting.

Access Control: Access to personal information is restricted to authorized employees who need it to perform their job functions. All employees are required to sign confidentiality agreements and complete data protection training.

Infrastructure Security: Our platform is hosted on secure, SOC 2-compliant cloud infrastructure with firewalls, intrusion detection systems, and regular security audits.

Monitoring and Incident Response: We continuously monitor our systems for unauthorized access and security incidents. In the event of a data breach, we will notify affected users within 72 hours as required by applicable data protection laws.

Despite our best efforts, no method of electronic transmission or storage is completely secure. We encourage you to use strong, unique passwords and to contact us immediately if you suspect any unauthorized access to your account.`,
    },
    {
      title: '6. Children\'s Privacy',
      content: `Mumaa is a platform designed for parents and legal guardians who are at least 18 years of age. We do not knowingly collect personal information from children under the age of 18.

Our platform may be used in the context of childcare, but the account holder must be a parent or legal guardian. When parents create accounts, they may provide information about their children (such as ages and preferences) for the purpose of receiving relevant childcare guidance.

If we become aware that we have inadvertently collected personal information from a minor without parental consent, we will take steps to delete that information promptly. If you believe that a minor has provided us with personal information, please contact us at privacy@mumaa.in.

Parents using the Service are responsible for supervising any minors who may be present during video consultations. Nannies are instructed to be mindful of child safety during all interactions.`,
    },
    {
      title: '7. User Rights',
      content: `Under applicable data protection laws, you have the following rights regarding your personal information:

Access: You can request a copy of the personal information we hold about you by contacting us or through your account settings.

Correction: You can update or correct your personal information at any time through your account settings or by contacting our support team.

Deletion: You can request that we delete your personal information. Please note that certain information may be retained as required by law or for legitimate business purposes, such as resolving disputes or enforcing our agreements.

Data Portability: You can request to receive your personal information in a structured, commonly used, machine-readable format.

Objection: You may object to the processing of your personal information for marketing purposes or where we rely on legitimate interests as the legal basis for processing.

Restriction: You may request that we restrict the processing of your personal information in certain circumstances, such as when the accuracy of the data is contested.

To exercise any of these rights, please contact us at privacy@mumaa.in. We will respond to your request within 30 days.`,
    },
    {
      title: '8. Changes to This Policy',
      content: `Mumaa may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. When we make material changes, we will:

• Notify you via email at least 30 days before the changes take effect
• Post a prominent notice on our platform
• Update the "Last updated" date at the top of this policy

We encourage you to review this Privacy Policy periodically to stay informed about how we protect your information. Your continued use of the Service after changes are posted constitutes your acceptance of the updated policy.

If you disagree with any changes to this Privacy Policy, you may contact us to discuss your concerns or, if necessary, close your account.`,
    },
    {
      title: '9. Contact',
      content: `If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:

Mumaa Technologies Private Limited
Data Protection Officer
Email: privacy@mumaa.in
Phone: +91 80-XXXX-XXXX
Address: Bengaluru, Karnataka, India

For general inquiries, please visit our Help Center or contact our support team at support@mumaa.in.

We aim to respond to all privacy-related inquiries within 30 days. In case of urgent data security concerns, please mark your email as "URGENT" in the subject line.`,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="text-center mb-10">
        <Badge variant="outline" className="mb-4 border-rose-200 text-rose-600 bg-rose-50">
          Legal Document
        </Badge>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
          Privacy Policy
        </h1>
        <p className="text-gray-500">
          Last updated: January 15, 2025 &bull; Effective date: February 1, 2025
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 mb-6">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
          <p className="text-gray-600 leading-relaxed">
            At Mumaa, we take your privacy seriously. This Privacy Policy explains how we collect,
            use, share, and protect your personal information when you use our platform. We are
            committed to transparency and giving you control over your data.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {sections.map((section, index) => (
          <motion.section
            key={index}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-3">{section.title}</h2>
            {section.content.split('\n\n').map((paragraph, pIdx) => (
              <p key={pIdx} className="text-gray-600 text-sm leading-relaxed mb-3 last:mb-0">
                {paragraph}
              </p>
            ))}
          </motion.section>
        ))}
      </div>
    </div>
  );
}

/* ===========================
   About Page
   =========================== */
function AboutPage() {
  const team = [
    {
      name: 'Priya Sharma',
      role: 'Founder & CEO',
      bio: 'Former childcare specialist with 12+ years of experience. Founded Mumaa to bridge the gap between parents and trusted childcare experts.',
      initials: 'PS',
      color: 'from-rose-500 to-pink-600',
    },
    {
      name: 'Arjun Mehta',
      role: 'Chief Technology Officer',
      bio: 'Full-stack engineer passionate about building scalable platforms that connect communities. Previously led engineering at two health-tech startups.',
      initials: 'AM',
      color: 'from-emerald-500 to-teal-600',
    },
    {
      name: 'Kavitha Nair',
      role: 'Head of Operations',
      bio: 'Operations expert with deep experience in service platforms. Ensures every parent-nanny interaction meets our quality standards.',
      initials: 'KN',
      color: 'from-amber-500 to-orange-600',
    },
    {
      name: 'Rohit Gupta',
      role: 'Head of Safety & Trust',
      bio: 'Background in child safety policy and platform trust. Oversees nanny verification, safety protocols, and community guidelines.',
      initials: 'RG',
      color: 'from-violet-500 to-purple-600',
    },
  ];

  const stats = [
    { label: 'Parents Helped', value: '12,000+', icon: Users, color: 'text-rose-500' },
    { label: 'Nannies on Platform', value: '850+', icon: Baby, color: 'text-emerald-500' },
    { label: 'Calls Completed', value: '45,000+', icon: Video, color: 'text-amber-500' },
    { label: 'Satisfaction Rate', value: '98.5%', icon: Star, color: 'text-violet-500' },
  ];

  const values = [
    {
      title: 'Trust & Safety',
      description: 'Every nanny on our platform is verified and vetted. We maintain the highest safety standards for your family.',
      icon: Shield,
      color: 'from-rose-500/10 to-pink-50 border-rose-200',
      iconColor: 'text-rose-500',
    },
    {
      title: 'Accessibility',
      description: 'Expert childcare guidance available anytime through instant video calls. No scheduling headaches, just help when you need it.',
      icon: Phone,
      color: 'from-emerald-500/10 to-teal-50 border-emerald-200',
      iconColor: 'text-emerald-500',
    },
    {
      title: 'Quality',
      description: 'Our nannies are experienced professionals with verified credentials. We continuously monitor quality through reviews and ratings.',
      icon: Award,
      color: 'from-amber-500/10 to-orange-50 border-amber-200',
      iconColor: 'text-amber-500',
    },
    {
      title: 'Community',
      description: 'We are building a community of parents and childcare experts who support each other through shared knowledge and experience.',
      icon: Heart,
      color: 'from-violet-500/10 to-purple-50 border-violet-200',
      iconColor: 'text-violet-500',
    },
  ];

  return (
    <div className="space-y-12">
      {/* Hero */}
      <div className="text-center mb-12">
        <Badge variant="outline" className="mb-4 border-rose-200 text-rose-600 bg-rose-50">
          Our Story
        </Badge>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
          About Mumaa
        </h1>
        <p className="text-gray-500 max-w-2xl mx-auto text-lg leading-relaxed">
          Connecting Indian parents with trusted childcare experts through video calls.
          Expert guidance, anytime you need it.
        </p>
      </div>

      {/* Mission */}
      <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-8 sm:p-10 text-white">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="h-5 w-5 fill-white" />
          <span className="text-sm font-medium opacity-90">Our Mission</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">
          Making Expert Childcare Accessible to Every Indian Family
        </h2>
        <p className="text-rose-100 leading-relaxed max-w-3xl">
          Mumaa was born from a simple observation: millions of Indian parents need trustworthy
          childcare advice but don&apos;t have easy access to qualified professionals. Whether it&apos;s a
          2 AM feeding question, a toddler&apos;s behavioral concern, or help establishing a routine,
          every parent deserves expert guidance at their fingertips. We built Mumaa to make that
          possible &mdash; connecting parents with vetted, experienced nannies through instant
          video calls, right from the comfort of home.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="rounded-xl border-gray-200 shadow-sm p-5 text-center h-full">
              <stat.icon className={`h-6 w-6 mx-auto mb-3 ${stat.color}`} />
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Our Values */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Our Values</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {values.map((value, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`rounded-xl border shadow-sm p-6 h-full bg-gradient-to-br ${value.color}`}>
                <value.icon className={`h-8 w-8 mb-3 ${value.iconColor}`} />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{value.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{value.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Team */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Meet Our Team</h2>
        <p className="text-gray-500 text-center mb-8">
          Passionate people building a better future for Indian families
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {team.map((member, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="rounded-xl border-gray-200 shadow-sm p-6 text-center h-full">
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${member.color} flex items-center justify-center mx-auto mb-4`}>
                  <span className="text-white font-bold text-lg">{member.initials}</span>
                </div>
                <h3 className="text-base font-semibold text-gray-900">{member.name}</h3>
                <p className="text-sm text-rose-500 font-medium mb-2">{member.role}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{member.bio}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Contact */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Get in Touch</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-rose-50">
              <Mail className="h-5 w-5 text-rose-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Email</p>
              <p className="text-sm text-gray-500">hello@mumaa.in</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-50">
              <Phone className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Phone</p>
              <p className="text-sm text-gray-500">+91 80-XXXX-XXXX</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-amber-50">
              <MapPin className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Office</p>
              <p className="text-sm text-gray-500">Bengaluru, Karnataka, India</p>
            </div>
          </div>
        </div>
        <Separator className="my-6" />
        <p className="text-center text-sm text-gray-500">
          Business hours: Monday&ndash;Friday, 9:00 AM&ndash;6:00 PM IST
        </p>
      </div>
    </div>
  );
}
