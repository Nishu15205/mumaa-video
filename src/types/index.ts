// ============================================================
// MUMAA Video Call Platform - Type Definitions
// ============================================================

// ---------- User & Auth ----------

export type UserRole = 'PARENT' | 'NANNY' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  avatar: string | null;
  bio: string | null;
  isOnline: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser extends Omit<User, 'password'> {
  subscription?: Subscription | null;
}

// ---------- Profiles ----------

export interface NannyProfile {
  id: string;
  userId: string;
  experience: number;
  skills: string;
  hourlyRate: number;
  isAvailable: boolean;
  rating: number;
  totalSessions: number;
  totalEarnings: number;
  paidEarnings: number;
  languages: string;
  certifications: string;
  ageGroup: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountHolder: string;
  upiId: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

export interface ParentProfile {
  id: string;
  userId: string;
  childrenCount: number;
  childrenAges: string;
  preferences: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

// ---------- Call Session ----------

export type CallType = 'INSTANT' | 'SCHEDULED';
export type CallStatus = 'PENDING' | 'ACCEPTED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface CallSession {
  id: string;
  parentId: string;
  nannyId: string;
  parentName?: string;
  nannyName?: string;
  parentAvatar?: string | null;
  nannyAvatar?: string | null;
  type: CallType;
  status: CallStatus;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  duration: number;
  price: number;
  notes: string | null;
  callRoomId: string | null;
  rating: number | null;
  reviewComment: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------- Subscription ----------

export type PlanType = 'FREE' | 'BASIC' | 'PRO';
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export interface Subscription {
  id: string;
  userId: string;
  plan: PlanType;
  status: SubscriptionStatus;
  isTrial: boolean;
  trialEndsAt: string | null;
  currentPeriodEnds: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------- Review ----------

export interface Review {
  id: string;
  callSessionId: string;
  fromUserId: string;
  toUserId: string;
  fromUserName?: string;
  fromUserAvatar?: string | null;
  toUserName?: string;
  toUserAvatar?: string | null;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------- Notification ----------

export type NotificationType =
  | 'CALL_REQUEST'
  | 'CALL_SCHEDULED'
  | 'CALL_COMPLETED'
  | 'SUBSCRIPTION'
  | 'SYSTEM';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  data: string | null;
  createdAt: string;
}

// ---------- Pricing ----------

export interface PricingPlan {
  id: PlanType;
  name: string;
  price: number;
  features: string[];
  trialDays: number;
  popular: boolean;
}

// ---------- App Views ----------

export type AppView =
  | 'landing'
  | 'login'
  | 'signup'
  | 'forgot-password'
  | 'nanny-setup'
  | 'parent-dashboard'
  | 'nanny-dashboard'
  | 'admin-dashboard'
  | 'pricing'
  | 'profile'
  | 'apply-nanny'
  | 'terms'
  | 'privacy'
  | 'about';

// ---------- Incoming Call ----------

export interface IncomingCall {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar: string | null;
  type: CallType;
  callRoomId?: string | null;
}
