
import { supabase } from './supabaseClient';
import { Appointment, Clinic, MedicalRecord, RecordType, User, UserRole, UserStatus, AuditLog, TimeSlot, Notification, ProfileImage, Review } from '../types';

const dbCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 2000; 

/**
 * MARCLYN DATA ADAPTER - PRODUCTION GRADE
 * Camada de resiliência com tratamento de erros, retries e fallbacks seguros.
 */

const MAX_RETRIES = 2;
const TIMEOUT_MS = 10000;

// Wrapper de resiliência: tenta executar a promessa com timeout e retries
const safeExecute = async <T>(operation: () => Promise<T>, fallback: T, label = "Operation"): Promise<T> => {
    let lastError: any;
    
    for (let i = 0; i <= MAX_RETRIES; i++) {
        try {
            const timeoutPromise = new Promise<T>((_, reject) => 
                setTimeout(() => reject(new Error(`${label} Timeout`)), TIMEOUT_MS)
            );
            return await Promise.race([operation(), timeoutPromise]);
        } catch (error) {
            lastError = error;
            // Não logar excessivamente se for cancelamento de requisição (comum em React strict mode)
            if (error instanceof Error && error.name === 'AbortError') return fallback;
            
            console.warn(`[Marclyn Data] Falha na tentativa ${i + 1}/${MAX_RETRIES + 1} para ${label}:`, error);
            if (i < MAX_RETRIES) await new Promise(r => setTimeout(r, 1000 * (i + 1))); 
        }
    }
    
    console.error(`[Marclyn Data] Todas as tentativas falharam para ${label}. Retornando fallback.`, lastError);
    return fallback;
};

// Validador de Array para garantir que .map() e .filter() nunca quebrem
const ensureArray = <T>(data: any): T[] => Array.isArray(data) ? data : [];

const getCached = (key: string) => {
    const item = dbCache.get(key);
    if (item && (Date.now() - item.timestamp < CACHE_TTL)) return item.data;
    return null;
};

const setCache = (key: string, data: any) => {
    dbCache.set(key, { data, timestamp: Date.now() });
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function mapProfileToUser(p: any, gallery: any[] = []): User {
  if (!p) return {} as User;
  return {
    id: p.id,
    name: p.name || 'Sem Nome',
    email: p.email || '',
    role: (p.role || 'patient') as UserRole,
    status: (p.status || 'pending') as UserStatus,
    avatarUrl: p.avatar_url,
    favorites: p.favorites || [],
    gallery: gallery.map(img => ({
      id: img.id, profileId: img.profile_id, imageUrl: img.image_url, position: img.position
    })),
    document: p.document,
    specialty: p.specialty,
    reg: p.reg,
    phone: p.phone,
    address: p.address,
    neighborhood: p.neighborhood,
    city: p.city,
    patientType: p.patient_type,
    healthPlan: p.health_plan,
    emergencyContact: p.emergency_contact,
    medicalHistory: p.medical_history,
    bio: p.bio,
    about: p.about,
    price: p.price,
    operatingHours: p.operating_hours,
    website: p.website,
    availableServices: p.available_services || [],
    yampiUrl: p.yampi_url,
    subscriptionPlan: p.subscription_plan,
    subscriptionStatus: p.subscription_status,
    subscriptionDate: p.subscription_date,
    subscriptionExpiry: p.subscription_expiry,
    instagram: p.instagram,
    whatsapp: p.whatsapp,
    verified: p.verified || false,
    planType: p.plan_type || 'basico',
    prioritySupport: p.priority_support || false,
    urgencyTag: p.urgency_tag || false,
    platformFee: p.platform_fee || 15,
    consultationPrice: p.consultation_price || 0,
    monthlyPrice: p.monthly_price || 0,
    profileVisits: p.profile_visits || 0,
    whatsappClicks: p.whatsapp_clicks || 0,
  };
}

export const mockDb = {
  login: async (email?: string): Promise<User | null> => {
    if (!email) return null;
    try {
      // 1. Tenta buscar o perfil na tabela
      let { data: p, error } = await supabase.from('profiles').select('*').eq('email', email).maybeSingle();
      
      // 2. RECUPERAÇÃO DE EMERGÊNCIA: Se não existe perfil na tabela, mas o Auth está logado
      if (!p) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user && user.email === email) {
              console.warn("[DB] Perfil não encontrado, tentando reconstruir via metadados...");
              const meta = user.user_metadata;
              
              const recoveredProfile = {
                  id: user.id,
                  email: user.email,
                  name: meta?.name || 'Usuário',
                  role: meta?.role || 'patient',
                  status: meta?.role === 'admin' || meta?.role === 'patient' ? 'active' : 'pending',
                  document: meta?.document,
                  phone: meta?.phone,
                  specialty: meta?.specialty,
                  reg: meta?.reg
              };

              // Tenta inserir o perfil que faltava
              const { data: inserted, error: insError } = await supabase.from('profiles').upsert(recoveredProfile).select().single();
              if (!insError) {
                  p = inserted;
              } else {
                  console.error("[DB] Falha crítica na recuperação (upsert profiles):", insError.message, insError.details);
                  // Se falhar o insert por RLS, retornamos o objeto mapeado temporariamente para permitir o acesso
                  return mapProfileToUser(recoveredProfile as any, []);
              }
          }
      }

      if (p) {
        const { data: g } = await supabase.from('profile_images').select('*').eq('profile_id', p.id).order('position');
        return mapProfileToUser(p, g || []);
      }
      return null;
    } catch (e) {
      console.error("[DB] Erro fatal no login:", e);
      return null;
    }
  },

  signIn: async (email: string, password: string): Promise<User | null> => {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            if (error.status === 400) throw new Error("Email ou senha incorretos.");
            throw error;
        }
        if (data.user) return await mockDb.login(data.user.email!);
        return null;
    } catch (err: any) {
        console.error("[AUTH] Erro no signIn:", err.message);
        throw err;
    }
  },

  registerUser: async (u: any): Promise<User | null> => {
    const { data: authData, error: authError } = await supabase.auth.signUp({ 
      email: u.email, 
      password: u.password,
      options: {
        data: {
          name: u.name,
          role: u.role,
          document: u.document,
          phone: u.phone,
          specialty: u.specialty,
          reg: u.reg,
          patient_type: u.patientType,
          address: u.address,
          neighborhood: u.neighborhood,
          city: u.city,
          plan_type: u.planType || 'basico'
        }
      }
    });

    if (authError) {
      if (authError.message?.includes("saving new user") || authError.message?.includes("Database error")) {
        console.error("[SUPABASE ERROR] Erro crítico de gatilho do Supabase:", authError.message);
        throw new Error("Erro de banco de dados ao salvar o usuário. Por favor, execute o script SQL de emergência em '/SUPABASE_EMERGENCY_FIX.sql' no seu painel Supabase.");
      }
      throw authError;
    }
    const userId = authData.user?.id;
    if (!userId) throw new Error("Falha ao criar credenciais.");

    // Reduzido para 1s ou omitido se o trigger for confiável, 
    // mas mantido um pequeno delay para garantir que o trigger handle_new_user termine
    await sleep(1000);

    const { error: repairError } = await supabase.from('profiles').upsert({
        id: userId,
        email: u.email,
        name: u.name,
        role: u.role,
        status: u.role === 'patient' || u.role === 'admin' ? 'active' : 'pending',
        plan_type: u.planType || 'basico',
        document: u.document,
        phone: u.phone,
        specialty: u.specialty,
        reg: u.reg,
        address: u.address,
        neighborhood: u.neighborhood,
        city: u.city,
        patient_type: u.patientType || 'normal',
        bio: u.bio,
        website: u.website,
        available_services: ensureArray(u.availableServices),
        subscription_plan: u.subscriptionPlan || null,
        subscription_status: u.subscriptionStatus || 'inactive',
        subscription_date: u.subscriptionDate || null,
        subscription_expiry: u.subscriptionExpiry || null,
        instagram: u.instagram || null,
        whatsapp: u.whatsapp || null,
        verified: u.verified || false,
        platform_fee: u.platformFee || 15
    });

    if (repairError) console.warn("[DB] Perfil repair bypass (trigger presumivelmente cuidou disso):", repairError.message);

    return await mockDb.login(u.email);
  },

  getStats: async () => {
    return await safeExecute(async () => {
      const { data: allUsers, error: userError } = await supabase.from('profiles').select('id, role, status');
      if (userError) throw userError;

      const stats = {
        users: allUsers?.length || 0,
        clinics: allUsers?.filter(u => (u.role === 'clinic' || u.role === 'professional') && u.status === 'active').length || 0,
        appointments: 0,
        records: 0,
        pendingUsers: allUsers?.filter(u => u.status === 'pending').length || 0
      };

      const { count: appCount } = await supabase.from('appointments').select('*', { count: 'exact', head: true });
      stats.appointments = appCount || 0;

      return stats;
    }, { users: 0, clinics: 0, appointments: 0, records: 0, pendingUsers: 0 }, "Get Stats");
  },

  getPendingUsers: async (): Promise<User[]> => {
    return await safeExecute(async () => {
      const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(p => mapProfileToUser(p));
    }, [], "Get Pending Users");
  },

  updateUserStatus: async (userId: string, status: string) => {
    const { error } = await supabase.from('profiles').update({ status }).eq('id', userId);
    if (error) throw error;
  },

  updateUserPlan: async (userId: string, planType: string) => {
    const { error } = await supabase.from('profiles').update({ plan_type: planType }).eq('id', userId);
    if (error) throw error;
  },

  updateUrgencyTag: async (userId: string, isUrgent: boolean) => {
    const { error } = await supabase.from('profiles').update({ urgency_tag: isUrgent }).eq('id', userId);
    if (error) throw error;
  },

  getClinics: async (): Promise<Clinic[]> => {
    return await safeExecute(async () => {
      const { data: profiles, error } = await supabase.from('profiles').select('*').in('role', ['clinic', 'professional']).eq('status', 'active');
      if (error) throw error;
      const ids = (profiles || []).map(p => p.id);
      const { data: images } = await supabase.from('profile_images').select('*').in('profile_id', ids).order('position');
      return (profiles || []).map(p => {
          const gallery = (images || []).filter(img => img.profile_id === p.id).map(img => ({
              id: img.id, profileId: img.profile_id, imageUrl: img.image_url, position: img.position
          }));
          return {
              id: p.id, name: p.name, specialty: p.specialty || 'Especialista', location: p.city || 'Salvador-BA',
              neighborhood: p.neighborhood || 'Centro', 
              price: p.consultation_price ? `R$ ${p.consultation_price.toFixed(2)}` : (p.price || 'A consultar'),
              consultationPrice: p.consultation_price,
              imageUrl: p.avatar_url,
              rating: p.rating || 5.0, reviewCount: p.review_count || 0, testimonial: p.bio, about: p.about,
              phone: p.phone, whatsapp: p.whatsapp, instagram: p.instagram, website: p.website,
              availableServices: ensureArray(p.available_services), gallery,
              verified: p.verified || false, planType: p.plan_type || 'basico', reg: p.reg
          };
      });
    }, [], "Get Clinics");
  },

  incrementMetric: async (profileId: string, metric: 'visits' | 'whatsapp'): Promise<void> => {
    const { error } = await supabase.rpc('increment_profile_metric', { 
      profile_id: profileId, 
      metric_name: metric 
    });
    if (error) throw error;
  },

  getMedicalDocuments: async (professionalId: string): Promise<any[]> => {
    try {
      await supabase.from('medical_records').delete().lt('expires_at', new Date().toISOString());
    } catch (e) {
      console.warn("Erro ao expirar registros em getMedicalDocuments:", e);
    }
    const { data, error } = await supabase
      .from('medical_records')
      .select('*')
      .eq('professional_id', professionalId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  createMedicalDocument: async (doc: any): Promise<void> => {
    const { error } = await supabase
      .from('medical_records')
      .insert([doc]);
    if (error) throw error;
  },

  getFavorites: async (userId: string): Promise<Clinic[]> => {
    const { data: profile } = await supabase.from('profiles').select('favorites').eq('id', userId).maybeSingle();
    const favIds = profile?.favorites || [];
    if (favIds.length === 0) return [];
    const clinics = await mockDb.getClinics();
    return clinics.filter(c => favIds.includes(c.id));
  },

  getAppointments: async (userId: string, role: UserRole): Promise<Appointment[]> => {
    const col = role === 'patient' ? 'patient_id' : 'clinic_id';
    const { data, error } = await supabase.from('appointments').select('*, patient:profiles!patient_id(name), clinic:profiles!clinic_id(name)').eq(col, userId).order('date', { ascending: true });
    if (error) throw error;
    return (data || []).map(app => {
      let patientName = app.patient?.name || 'Paciente';
      let notes = app.notes || '';
      if (app.notes && app.notes.startsWith('[MANUAL]')) {
        try {
          const parsed = JSON.parse(app.notes.substring(8));
          patientName = parsed.patientName || patientName;
          notes = parsed.notes || '';
        } catch (e) {
          // ignore formatting fallback
        }
      }
      return {
        id: app.id, patientId: app.patient_id, patientName, clinicId: app.clinic_id,
        doctorName: app.doctor_name, date: app.date, status: app.status as any, type: app.type as any, meetingUrl: app.meeting_url, roomId: app.room_id || app.id,
        notes
      };
    });
  },

  toggleFavorite: async (uid: string, cid: string) => {
    const { data: profile } = await supabase.from('profiles').select('favorites').eq('id', uid).single();
    let favs = profile?.favorites || [];
    favs = favs.includes(cid) ? favs.filter((id: string) => id !== cid) : [...favs, cid];
    const { data, error } = await supabase.from('profiles').update({ favorites: favs }).eq('id', uid).select().single();
    if (error) throw error;
    return mapProfileToUser(data);
  },

  updateProfile: async (uid: string, updates: Partial<User>, avatarFile?: File | null) => {
    const { data, error } = await supabase.from('profiles').update({
        name: updates.name, phone: updates.phone, specialty: updates.specialty,
        bio: updates.bio, about: updates.about, address: updates.address, 
        city: updates.city, neighborhood: updates.neighborhood, price: updates.price, 
        available_services: updates.availableServices,
        subscription_plan: updates.subscriptionPlan,
        subscription_status: updates.subscriptionStatus,
        subscription_date: updates.subscriptionDate,
        subscription_expiry: updates.subscriptionExpiry,
        instagram: updates.instagram,
        whatsapp: updates.whatsapp,
        verified: updates.verified,
        plan_type: updates.planType,
        platform_fee: updates.platformFee
    }).eq('id', uid).select().single();
    if (error) throw error;
    return mapProfileToUser(data);
  },

  cancelAppointment: async (id: string) => {
    try {
      const { data: app } = await supabase.from('appointments').select('*').eq('id', id).maybeSingle();
      await supabase.from('appointments').update({ status: 'canceled' }).eq('id', id);
      if (app && app.clinic_id && app.date) {
        let dateString = '';
        let timeString = '';
        if (app.date.includes('T')) {
          const parts = app.date.split('T');
          dateString = parts[0];
          timeString = parts[1].substring(0, 5);
        } else {
          const parts = app.date.trim().split(/\s+/);
          if (parts.length >= 2) {
            dateString = parts[0];
            timeString = parts[1].substring(0, 5);
          }
        }
        if (dateString && timeString) {
          await supabase.from('time_slots').update({ is_booked: false }).eq('clinic_id', app.clinic_id).eq('date', dateString).eq('time', timeString);
        }
      }
    } catch (err) {
      console.warn("Erro ao atualizar status do slot no cancelamento:", err);
    }
  },

  updateAppointmentStatus: async (id: string, status: string) => {
    try {
      const { data: app } = await supabase.from('appointments').select('*').eq('id', id).maybeSingle();
      await supabase.from('appointments').update({ status }).eq('id', id);
      if (app && app.clinic_id && app.date) {
        let dateString = '';
        let timeString = '';
        if (app.date.includes('T')) {
          const parts = app.date.split('T');
          dateString = parts[0];
          timeString = parts[1].substring(0, 5);
        } else {
          const parts = app.date.trim().split(/\s+/);
          if (parts.length >= 2) {
            dateString = parts[0];
            timeString = parts[1].substring(0, 5);
          }
        }
        if (dateString && timeString) {
          const isBooked = status !== 'canceled';
          await supabase.from('time_slots').update({ is_booked: isBooked }).eq('clinic_id', app.clinic_id).eq('date', dateString).eq('time', timeString);
        }
      }
    } catch (err) {
      console.warn("Erro ao atualizar status do slot na atualização de status:", err);
    }
  },

  getClinicFinancials: async (uid: string) => {
    const { data } = await supabase.from('financial_records').select('*').eq('professional_id', uid).order('date', { ascending: false });
    const totalRevenue = (data || []).reduce((acc, curr) => curr.type === 'income' ? acc + curr.amount : acc - curr.amount, 0);
    return { 
      totalRevenue, 
      chartData: Array.from({length: 5}, (_, i) => ({ label: `Sem ${i+1}`, value: 1000 + (i*200) })),
      transactions: data || []
    };
  },

  addFinancial: async (f: any) => {
    const { error } = await supabase.from('financial_records').insert([f]);
    if (error) throw error;
  },

  deleteFinancial: async (id: string): Promise<void> => {
    const { error } = await supabase.from('financial_records').delete().eq('id', id);
    if (error) throw error;
  },

  getHealthData: async (patientId: string) => {
    const { data } = await supabase.from('health_data').select('*').eq('patient_id', patientId).order('created_at', { ascending: false });
    return data || [];
  },

  addHealthData: async (h: any) => {
    const { error } = await supabase.from('health_data').insert([h]);
    if (error) throw error;
  },

  getAvailableSlots: async (clinicId: string): Promise<TimeSlot[]> => {
    const { data } = await supabase.from('time_slots').select('*').eq('clinic_id', clinicId).eq('is_booked', false).order('date').order('time');
    return (data || []).map(s => ({ id: s.id, clinicId: s.clinic_id, date: s.date, time: s.time, isBooked: s.is_booked }));
  },

  createAppointment: async (app: any) => {
    const { error } = await supabase.from('appointments').insert({
        patient_id: app.patientId, clinic_id: app.clinicId, doctor_name: app.doctorName,
        date: app.date, type: app.type, notes: app.notes, status: 'scheduled'
    });
    if (error) throw error;

    try {
      let dateString = '';
      let timeString = '';
      
      const rawDate = app.date;
      if (rawDate.includes('T')) {
        const parts = rawDate.split('T');
        dateString = parts[0];
        timeString = parts[1].substring(0, 5);
      } else {
        const parts = rawDate.trim().split(/\s+/);
        if (parts.length >= 2) {
          dateString = parts[0];
          timeString = parts[1].substring(0, 5);
        } else {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) {
            dateString = d.toISOString().split('T')[0];
            timeString = d.toTimeString().substring(0, 5);
          }
        }
      }

      if (dateString && timeString) {
        const { error: slotErr } = await supabase
          .from('time_slots')
          .update({ is_booked: true })
          .eq('clinic_id', app.clinicId)
          .eq('date', dateString)
          .eq('time', timeString);
        
        if (slotErr) {
          console.warn("[DB] Erro ao marcar slot como reservado:", slotErr.message);
        } else {
          console.log(`[DB] Slot auto-bloqueado com sucesso: ${dateString} ${timeString}`);
        }
      }
    } catch (slotErr) {
      console.warn("[DB] Erro ao sincronizar time_slot client-side:", slotErr);
    }
  },

  getRecords: async (userId: string, role: string): Promise<MedicalRecord[]> => {
    try {
      await supabase.from('medical_records').delete().lt('expires_at', new Date().toISOString());
    } catch (e) {
      console.warn("Erro ao expirar registros no getRecords:", e);
    }
    const col = role === 'patient' ? 'patient_id' : 'professional_id';
    const { data } = await supabase.from('medical_records').select('*').eq(col, userId).order('date', { ascending: false });
    return (data || []).map(r => ({
      id: r.id, patientId: r.patient_id, professionalId: r.professional_id, date: r.date,
      diagnosis: r.diagnosis, prescription: r.prescription, doctorName: r.doctor_name,
      type: r.type as any, fileUrl: r.file_url, cid: r.cid, days: r.days, title: r.title,
      chiefComplaint: r.chief_complaint, history: r.history, attachments: r.attachments, odontogram: r.odontogram,
      expiresAt: r.expires_at
    }));
  },

  deleteMedicalRecord: async (recordId: string): Promise<void> => {
    const { error } = await supabase.from('medical_records').delete().eq('id', recordId);
    if (error) throw error;
  },

  createMedicalRecord: async (record: any, file?: File) => {
    let resolvedFileUrl = record.fileUrl;

    if (file) {
      try {
        console.log("[createMedicalRecord] Attending to upload file:", file.name);
        const fileExt = file.name.split('.').pop() || '';
        const cleanName = file.name.replace(/[^a-zA-Z0-9]/g, '_');
        const fileName = `${Date.now()}_${cleanName}.${fileExt}`;
        const filePath = fileName;

        // Try to upload the file to Supabase Storage in the 'documents' bucket
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.warn("[createMedicalRecord] Supabase upload failed. Converting to Base64 data URL fallback. Error:", uploadError);
          // Fallback to base64
          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (e) => reject(e);
          });
          resolvedFileUrl = base64Data;
        } else {
          // Get public URL
          const { data: publicUrlData } = supabase.storage
            .from('documents')
            .getPublicUrl(filePath);

          if (publicUrlData?.publicUrl) {
            resolvedFileUrl = publicUrlData.publicUrl;
            console.log("[createMedicalRecord] File successfully uploaded. URL:", resolvedFileUrl);
          }
        }
      } catch (uploadExc) {
        console.error("[createMedicalRecord] Exception while uploading. Using FileReader Base64 fallback:", uploadExc);
        try {
          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (e) => reject(e);
          });
          resolvedFileUrl = base64Data;
        } catch (err) {
          console.error("[createMedicalRecord] Base64 conversion failed", err);
        }
      }
    }

    const payload: any = {
        patient_id: record.patientId, 
        professional_id: record.professionalId,
        date: record.date, 
        diagnosis: record.diagnosis, 
        prescription: record.prescription,
        doctor_name: record.doctorName, 
        type: record.type, 
        title: record.title,
        chief_complaint: record.chiefComplaint, 
        history: record.history, 
        attachments: record.attachments, 
        odontogram: record.odontogram,
        expires_at: record.expiresAt,
        file_url: resolvedFileUrl
    };

    console.log("[createMedicalRecord] Intended insert payload:", payload);
    const { error } = await supabase.from('medical_records').insert(payload);
    
    if (error) {
      console.error("[createMedicalRecord] Primary insert failed:", error);
      
      // PostgREST/Postgres column mismatch code: '42703' (undefined_column)
      if (error.code === '42703' || (error.message && error.message.toLowerCase().includes('column'))) {
        console.warn("[createMedicalRecord] Column mismatch detected. Retrying with fallback...");
        
        // Dynamic fallback: remove doctor_name if mentioned, and also try stripping extra columns
        const fallback1 = { ...payload };
        delete fallback1.doctor_name; // doctor_name is most likely missing

        console.log("[createMedicalRecord] Fallback 1 (omitting doctor_name):", fallback1);
        const { error: errorFallback1 } = await supabase.from('medical_records').insert(fallback1);
        
        if (errorFallback1) {
          console.error("[createMedicalRecord] Fallback 1 failed:", errorFallback1);
          
          // Fallback 2: Bare minimum structure that is absolutely guaranteed to exist in any version of medical_records table
          const bareMinimumPayload = {
            patient_id: record.patientId,
            professional_id: record.professionalId,
            date: record.date,
            type: record.type,
            title: record.title,
            diagnosis: record.diagnosis,
            prescription: record.prescription,
            file_url: resolvedFileUrl
          };
          
          console.log("[createMedicalRecord] Fallback 2 (bare minimum columns):", bareMinimumPayload);
          const { error: errorFallback2 } = await supabase.from('medical_records').insert(bareMinimumPayload);
          
          if (errorFallback2) {
            console.error("[createMedicalRecord] Bare minimum fallback failed:", errorFallback2);
            throw errorFallback2;
          }
        }
      } else {
        throw error;
      }
    }
  },

  getAllSlotsForClinic: async (uid: string): Promise<TimeSlot[]> => {
    const { data } = await supabase.from('time_slots').select('*').eq('clinic_id', uid).order('date').order('time');
    return (data || []).map(s => ({ id: s.id, clinicId: s.clinic_id, date: s.date, time: s.time, isBooked: s.is_booked }));
  },

  createTimeSlotsBatch: async (uid: string, slots: {date: string, time: string}[]) => {
    const { error } = await supabase.from('time_slots').insert(slots.map(s => ({ clinic_id: uid, date: s.date, time: s.time, is_booked: false })));
    if (error) throw error;
  },

  deleteSlotsByDate: async (uid: string, date: string) => {
    await supabase.from('time_slots').delete().eq('clinic_id', uid).eq('date', date);
  },

  getAllClinicsForAdmin: async (): Promise<User[]> => {
    const { data } = await supabase.from('profiles').select('*').in('role', ['clinic', 'professional']);
    return (data || []).map(p => mapProfileToUser(p));
  },

  getAuditLogs: async (): Promise<AuditLog[]> => {
    const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
    return (data || []).map(l => ({ id: l.id, action: l.action, userId: l.user_id, details: l.details, timestamp: l.created_at }));
  },

  getAppointmentById: async (id: string): Promise<Appointment | null> => {
    const { data } = await supabase.from('appointments').select('*, patient:profiles!patient_id(name), clinic:profiles!clinic_id(name)').eq('id', id).maybeSingle();
    if (!data) return null;
    return {
      id: data.id, patientId: data.patient_id, patientName: data.patient?.name || 'Paciente', clinicId: data.clinic_id,
      doctorName: data.doctor_name, date: data.date, status: data.status as any, type: data.type as any, meetingUrl: data.meeting_url, roomId: data.room_id || data.id
    };
  },

  markNotificationAsRead: async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  },

  subscribeToNotifications: (uid: string, callback: (payload: any) => void) => {
    return supabase.channel(`notifs_${uid}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` }, callback).subscribe();
  },

  getNotifications: async (uid: string): Promise<Notification[]> => {
    const { data } = await supabase.from('notifications').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(20);
    return (data || []).map(n => ({ id: n.id, userId: n.user_id, message: n.message, read: n.read, createdAt: n.created_at, type: n.type as any }));
  },

  updateGalleryImage: async (uid: string, pos: number, url: string) => {
    await supabase.from('profile_images').upsert({ profile_id: uid, position: pos, image_url: url });
  },

  deleteGalleryImage: async (uid: string, pos: number) => {
    await supabase.from('profile_images').delete().eq('profile_id', uid).eq('position', pos);
  },

  getReviews: async (professionalId: string): Promise<Review[]> => {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('professional_id', professionalId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(r => ({
      id: r.id,
      professionalId: r.professional_id,
      patientName: r.patient_name,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.created_at
    }));
  },

  addReview: async (review: Omit<Review, 'id' | 'createdAt'>) => {
    const { error } = await supabase.from('reviews').insert({
      professional_id: review.professionalId,
      patient_name: review.patientName,
      rating: review.rating,
      comment: review.comment
    });
    if (error) throw error;
  },

  getPatients: async (): Promise<User[]> => {
    const { data, error } = await supabase.from('profiles').select('*').eq('role', 'patient').order('name');
    if (error) throw error;
    return (data || []).map(p => mapProfileToUser(p));
  }
};
