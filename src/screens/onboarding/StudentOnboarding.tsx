"use client";

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from '@/src/lib/next-router';
import { supabase } from '@/src/integrations/supabase/client';
import { useAuth } from '@/src/hooks/useAuth';
import OnboardingWizard from '@/src/components/OnboardingWizard';
import AvatarUpload from '@/src/components/AvatarUpload';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Textarea } from '@/src/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { toast } from '@/src/components/ui/sonner';
import { useQueryClient } from '@tanstack/react-query';

const STEPS = ['Identité', 'Coordonnées', 'École', 'Objectifs', 'Tuteur'];

export default function StudentOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const edited = useRef(false);
  const [data, setData] = useState<any>({
    full_name: '', avatar_url: '', gender: '', date_of_birth: '',
    phone: '', address: '', country: 'RDC', city: '', preferred_language: 'fr',
    school_name: '', student_id_external: '', class_level: '', learning_language: 'fr',
    academic_goals: '', subjects_of_interest: '', weak_subjects: '',
    emergency_contact_name: '', emergency_contact_phone: '',
    guardian_name: '', guardian_phone: '', guardian_email: '',
  });

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const { data: p } = await supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
      const { data: sp } = await supabase.from('student_profiles').select('*').eq('user_id', userId).maybeSingle();
      if (cancelled || edited.current) return;
      setData((d: any) => ({
        ...d,
        ...(p ?? {}),
        ...(sp ?? {}),
        date_of_birth: p?.date_of_birth ?? '',
        subjects_of_interest: (sp?.subjects_of_interest ?? []).join(', '),
        weak_subjects: (sp?.weak_subjects ?? []).join(', '),
        guardian_name: (sp?.guardian_info as any)?.name ?? '',
        guardian_phone: (sp?.guardian_info as any)?.phone ?? '',
        guardian_email: (sp?.guardian_info as any)?.email ?? '',
      }));
      if (p?.onboarding_step) setStep(Math.min(p.onboarding_step, STEPS.length - 1));
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const set = (k: string, v: any) => {
    edited.current = true;
    setData((d: any) => ({ ...d, [k]: v }));
  };
  const computeAge = (dob: string) => {
    if (!dob) return null;
    const d = new Date(dob);
    return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
  };

  const saveStep = async (nextStep: number, complete = false) => {
    if (!user) return;
    setSaving(true);
    try {
      const { error: e1 } = await supabase.from('profiles').update({
        full_name: data.full_name, avatar_url: data.avatar_url, gender: data.gender,
        date_of_birth: data.date_of_birth || null, phone: data.phone, address: data.address,
        country: data.country, city: data.city, preferred_language: data.preferred_language,
        onboarding_step: nextStep,
        onboarding_completed: complete,
      }).eq('user_id', user.id);
      if (e1) throw e1;

      const { error: e2 } = await supabase.from('student_profiles').upsert({
        user_id: user.id,
        school_name: data.school_name,
        student_id_external: data.student_id_external,
        class_level: data.class_level,
        learning_language: data.learning_language,
        academic_goals: data.academic_goals,
        subjects_of_interest: data.subjects_of_interest.split(',').map((s: string) => s.trim()).filter(Boolean),
        weak_subjects: data.weak_subjects.split(',').map((s: string) => s.trim()).filter(Boolean),
        emergency_contact_name: data.emergency_contact_name,
        emergency_contact_phone: data.emergency_contact_phone,
        guardian_info: { name: data.guardian_name, phone: data.guardian_phone, email: data.guardian_email },
      });
      if (e2) throw e2;

      if (complete) {
        await qc.invalidateQueries({ queryKey: ['onboarding-status'] });
        toast.success('Profil complété !');
        navigate('/dashboard');
      } else {
        setStep(nextStep);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const validate = () => {
    if (step === 0) return data.full_name.trim().length > 1;
    if (step === 1) return data.phone.trim() && data.city.trim();
    if (step === 2) return data.school_name.trim() && data.class_level.trim();
    return true;
  };

  return (
    <OnboardingWizard
      title="Bienvenue, futur élève"
      subtitle="Personnalisons ton expérience d'apprentissage"
      currentStep={step}
      totalSteps={STEPS.length}
      stepTitle={STEPS[step]}
      canProceed={validate()}
      isSubmitting={saving}
      onPrev={() => setStep((s) => Math.max(0, s - 1))}
      onNext={() => saveStep(step + 1)}
      onFinish={() => saveStep(STEPS.length, true)}
    >
      {step === 0 && (
        <>
          <AvatarUpload value={data.avatar_url} onChange={(u) => set('avatar_url', u)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label>Nom complet *</Label>
              <Input value={data.full_name} onChange={(e) => set('full_name', e.target.value)} placeholder="Jean Dupont" /></div>
            <div><Label>Genre</Label>
              <Select value={data.gender} onValueChange={(v) => set('gender', v)}>
                <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Masculin</SelectItem>
                  <SelectItem value="female">Féminin</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Date de naissance</Label>
              <Input type="date" value={data.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} />
              {data.date_of_birth && <p className="mt-1 text-xs text-muted-foreground">Âge : {computeAge(data.date_of_birth)} ans</p>}
            </div>
          </div>
        </>
      )}
      {step === 1 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>Téléphone *</Label><Input value={data.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+243…" /></div>
          <div><Label>Pays</Label><Input value={data.country} onChange={(e) => set('country', e.target.value)} /></div>
          <div><Label>Ville *</Label><Input value={data.city} onChange={(e) => set('city', e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Adresse</Label><Input value={data.address} onChange={(e) => set('address', e.target.value)} /></div>
          <div><Label>Contact d'urgence — nom</Label><Input value={data.emergency_contact_name} onChange={(e) => set('emergency_contact_name', e.target.value)} /></div>
          <div><Label>Contact d'urgence — téléphone</Label><Input value={data.emergency_contact_phone} onChange={(e) => set('emergency_contact_phone', e.target.value)} /></div>
        </div>
      )}
      {step === 2 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Nom de l'école *</Label><Input value={data.school_name} onChange={(e) => set('school_name', e.target.value)} /></div>
          <div><Label>ID élève (optionnel)</Label><Input value={data.student_id_external} onChange={(e) => set('student_id_external', e.target.value)} /></div>
          <div><Label>Classe / Niveau *</Label><Input value={data.class_level} onChange={(e) => set('class_level', e.target.value)} placeholder="ex. 5ème" /></div>
          <div className="sm:col-span-2"><Label>Langue d'apprentissage préférée</Label>
            <Select value={data.learning_language} onValueChange={(v) => set('learning_language', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="en">Anglais</SelectItem>
                <SelectItem value="sw">Swahili</SelectItem>
                <SelectItem value="ln">Lingala</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
      {step === 3 && (
        <div className="space-y-4">
          <div><Label>Objectifs académiques</Label>
            <Textarea rows={3} value={data.academic_goals} onChange={(e) => set('academic_goals', e.target.value)} placeholder="Que veux-tu accomplir cette année ?" /></div>
          <div><Label>Matières d'intérêt (séparées par virgules)</Label>
            <Input value={data.subjects_of_interest} onChange={(e) => set('subjects_of_interest', e.target.value)} placeholder="Maths, Sciences, Histoire" /></div>
          <div><Label>Matières à renforcer</Label>
            <Input value={data.weak_subjects} onChange={(e) => set('weak_subjects', e.target.value)} placeholder="Français, Anglais" /></div>
        </div>
      )}
      {step === 4 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Nom du parent / tuteur</Label><Input value={data.guardian_name} onChange={(e) => set('guardian_name', e.target.value)} /></div>
          <div><Label>Téléphone tuteur</Label><Input value={data.guardian_phone} onChange={(e) => set('guardian_phone', e.target.value)} /></div>
          <div><Label>Email tuteur</Label><Input type="email" value={data.guardian_email} onChange={(e) => set('guardian_email', e.target.value)} /></div>
        </div>
      )}
    </OnboardingWizard>
  );
}
