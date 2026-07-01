import { Clinic, Appointment, User, MedicalRecord } from './types';

export const MOCK_CLINICS: Clinic[] = [
  {
    id: '1',
    name: 'Nutricionista',
    specialty: 'Nutrição Clínica',
    location: 'Salvador-BA',
    neighborhood: 'Vasco da Gama',
    price: 'R$ 150,00',
    imageUrl: 'https://picsum.photos/400/200?random=1',
    rating: 4.8,
    reviewCount: 124,
    testimonial: "Excelente profissional! Me ajudou a reeducar minha alimentação sem sofrimento."
  },
  {
    id: '2',
    name: 'Clínica Odontológica',
    specialty: 'Odontologia Geral',
    location: 'Salvador-BA',
    neighborhood: 'Pituba',
    price: 'A partir de R$ 150,00',
    imageUrl: 'https://picsum.photos/400/200?random=2',
    rating: 4.9,
    reviewCount: 89,
    testimonial: "Consultório impecável e atendimento muito humano. Recomendo!"
  },
  {
    id: '3',
    name: 'Clínica de Saúde',
    specialty: 'Fisioterapia',
    location: 'Salvador-BA',
    neighborhood: 'Federação',
    price: 'A consultar',
    imageUrl: 'https://picsum.photos/400/200?random=3',
    rating: 4.5,
    reviewCount: 42,
    testimonial: "Ótima estrutura para reabilitação."
  },
  {
    id: 'u2',
    name: 'Dr. Roberto Santos',
    specialty: 'Cardiologia',
    location: 'Salvador-BA',
    neighborhood: 'Caminho das Árvores',
    price: 'R$ 200,00',
    imageUrl: 'https://picsum.photos/400/200?random=11',
    rating: 5.0,
    reviewCount: 15,
    testimonial: "Dr. Roberto é muito atencioso e explica tudo com clareza."
  }
];

export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'Maria Silva',
    email: 'paciente@marclyn.com',
    role: 'patient',
    status: 'active',
    avatarUrl: 'https://picsum.photos/100/100?random=10'
  },
  {
    id: 'u2',
    name: 'Dr. Roberto Santos',
    email: 'clinica@marclyn.com',
    role: 'clinic',
    status: 'active',
    avatarUrl: 'https://picsum.photos/100/100?random=11'
  },
  {
    id: 'u3',
    name: 'Admin Marclyn',
    email: 'admin@marclyn.com',
    role: 'admin',
    status: 'active'
  }
];

export const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: 'a1',
    patientId: 'u1',
    clinicId: '1',
    doctorName: 'Dra. Ana Costa',
    date: '2023-11-15 14:00',
    status: 'scheduled'
  },
  {
    id: 'a2',
    patientId: 'u1',
    clinicId: '2',
    doctorName: 'Dr. Pedro Alves',
    date: '2023-10-20 09:30',
    status: 'done'
  }
];

export const MOCK_RECORDS: MedicalRecord[] = [
  {
    id: 'r1',
    patientId: 'u1',
    date: '2023-10-20',
    diagnosis: 'Limpeza de rotina',
    prescription: 'Uso de fio dental diário.',
    doctorName: 'Dr. Pedro Alves'
  }
];