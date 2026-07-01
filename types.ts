
export type UserRole = 'admin' | 'clinic' | 'professional' | 'patient';
export type UserStatus = 'active' | 'pending' | 'rejected' | 'blocked';

export interface ProfileImage {
  id: string;
  profileId: string;
  imageUrl: string;
  position: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
  favorites?: string[]; 
  gallery?: ProfileImage[];
  
  // Detalhes Profissionais
  document?: string; 
  specialty?: string;
  reg?: string; 
  
  // Localização
  phone?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  
  // Detalhes Pessoais (Paciente)
  patientType?: 'normal' | 'club';
  healthPlan?: string;
  emergencyContact?: string;
  medicalHistory?: string;
  
  // Subscription (Club Paciente)
  subscriptionPlan?: string;
  subscriptionStatus?: 'active' | 'inactive' | 'pending';
  subscriptionDate?: string;
  subscriptionExpiry?: string;

  // Bio e Conteúdo Digital
  bio?: string; // Curta (para o card)
  about?: string; // Longa (para o perfil público)
  price?: string;
  consultationPrice?: number;
  monthlyPrice?: number;
  operatingHours?: string;
  website?: string;
  instagram?: string;
  whatsapp?: string;
  availableServices?: string[]; 
  
  // Professional Plan & Verification
  verified?: boolean;
  planType?: 'basic' | 'medio' | 'premium' | 'advanced';
  platformFee?: number; // e.g., 15 for 15%
  prioritySupport?: boolean;
  urgencyTag?: boolean;
  
  // Metrics
  profileVisits?: number;
  whatsappClicks?: number;
  
  yampiUrl?: string; 
}

export interface Clinic {
  id: string;
  name: string;
  specialty: string;
  location: string;
  neighborhood: string;
  price: string;
  consultationPrice?: number;
  phone?: string; 
  whatsapp?: string;
  instagram?: string;
  website?: string;
  imageUrl?: string;
  gallery?: ProfileImage[];
  rating?: number;
  reviewCount?: number;
  testimonial?: string; // Mapeado de 'bio'
  about?: string; // Mapeado de 'about'
  availableServices?: string[];
  verified?: boolean;
  planType?: 'basic' | 'medio' | 'premium' | 'advanced';
  prioritySupport?: boolean;
  urgencyTag?: boolean;
  reg?: string; // CRM/Council number
}

export interface Review {
  id: string;
  professionalId: string;
  patientName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName?: string;
  clinicId: string;
  doctorName: string;
  date: string;
  status: 'scheduled' | 'confirmed' | 'canceled' | 'done';
  notes?: string;
  type?: 'teleconsulta' | 'presencial' | 'exame';
  roomId?: string;
  meetingUrl?: string;
}

export interface TimeSlot {
  id: string;
  clinicId: string;
  date: string;
  time: string;
  isBooked: boolean;
}

export type RecordType = 'consultation' | 'exam_result' | 'prescription' | 'certificate';

export interface MedicalRecord {
  id: string;
  patientId: string;
  professionalId?: string;
  date: string;
  diagnosis: string;
  conduct?: string;
  prescription: string;
  doctorName: string;
  type?: RecordType;
  fileUrl?: string;
  cid?: string;
  days?: string;
  title?: string;
  notes?: string;
  chiefComplaint?: string;
  history?: string;
  attachments?: string[];
  odontogram?: ToothRecord[];
  expiresAt?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  userId: string;
  details: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
  type: 'info' | 'success' | 'warning';
}

export interface Financial {
  id: string;
  professionalId: string;
  type: 'income' | 'expense';
  amount: number;
  date: string;
  description: string;
  category?: string;
}

export interface HealthData {
  id: string;
  patientId: string;
  metric: 'blood_pressure' | 'glucose' | 'heart_rate' | 'weight' | 'height';
  value: string;
  unit: string;
  createdAt: string;
}

export interface ToothRecord {
  toothNumber: number;
  condition: 'healthy' | 'decayed' | 'filled' | 'missing' | 'bridge' | 'crown';
  color?: string;
  notes?: string;
}
