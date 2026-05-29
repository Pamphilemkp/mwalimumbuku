import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import OnboardingWizard from '@/components/OnboardingWizard';
import AvatarUpload from '@/components/AvatarUpload';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';
import { useQueryClient } from '@tanstack/react-query';

const STEPS = ['Identité', 'Coordonnées', 'Qualifications', 'Enseignement', 'Disponibilités'];

export default function TeacherOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<any>({
    full_name: '', avatar_url: '', phone: '', address: '', country: 'RDC', city: '',
    preferred_language: 'fr', qualification: '', years_experience: 0,
    subjects_taught: '', levels_handled: '', certifications: '', bio: '',
    availability_mon: '', availability_tue: '', availability_wed: '', availability_thu: '',
    availability_fri: '', availability_sat: '', availability_sun: '',
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: tp }] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('teacher_profiles').select('*').eq('user_id', user.id).maybeSingle(),
      ]);
      const av: any = tp?.availability ?? {};
      setData((d: any) => ({
        ...d, ...(p ?? {}), ...(tp ?? {}),
        subjects_taught: (tp?.subjects_taught ?? []).join(', '),
        levels_handled: (tp?.levels_handled ?? []).join(', '),
        certifications: (tp?.certifications ?? []).join(', '),
        availability_mon: av.mon ?? '', availability_tue: av.tue ?? '', availability_wed: av.wed ?? '',
        availability_thu: av.thu ?? '', availability_fri: av.fri ?? '', availability_sat: av.sat ?? '', availability_sun: av.sun ?? '',
      }));
      if (p?.onboarding_step) setStep(Math.min(p.onboarding_step, STEPS.length - 1));
    })();
  }, [user]);

  const set = (k: string, v: any) => setData((d: any) => ({ ...d, [k]: v }));

  const saveStep = async (nextStep: number, complete = false) => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase.from('profiles').update({
        full_name: data.full_name, avatar_url: data.avatar_url, phone: data.phone,
        address: data.address, country: data.country, city: data.city,
        preferred_language: data.preferred_language, bio: data.bio,
        onboarding_step: nextStep, onboarding_completed: complete,
      }).eq('user_id', user.id);

      await supabase.from('teacher_profiles').upsert({
        user_id: user.id,
        qualification: data.qualification,
        years_experience: parseInt(data.years_experience) || 0,
        subjects_taught: data.subjects_taught.split(',').map((s: string) => s.trim()).filter(Boolean),
        levels_handled: data.levels_handled.split(',').map((s: string) => s.trim()).filter(Boolean),
        certifications: data.certifications.split(',').map((s: string) => s.trim()).filter(Boolean),
        bio: data.bio,
        availability: {
          mon: data.availability_mon, tue: data.availability_tue, wed: data.availability_wed,
          thu: data.availability_thu, fri: data.availability_fri, sat: data.availability_sat, sun: data.availability_sun,
        },
      });

      if (complete) {
        await qc.invalidateQueries({ queryKey: ['onboarding-status'] });
        toast.success('Profil complété !');
        navigate('/dashboard');
      } else {
        setStep(nextStep);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const validate = () => {
    if (step === 0) return data.full_name.trim();
    if (step === 1) return data.phone.trim() && data.city.trim();
    if (step === 2) return data.qualification.trim();
    return true;
  };

  return (
    <OnboardingWizard
      title="Bienvenue, enseignant"
      subtitle="Configurons votre profil pédagogique"
      currentStep={step} totalSteps={STEPS.length} stepTitle={STEPS[step]}
      canProceed={validate()} isSubmitting={saving}
      onPrev={() => setStep((s) => Math.max(0, s - 1))}
      onNext={() => saveStep(step + 1)}
      onFinish={() => saveStep(STEPS.length, true)}
    >
      {step === 0 && (
        <>
          <AvatarUpload value={data.avatar_url} onChange={(u) => set('avatar_url', u)} />
          <div><Label>Nom complet *</Label><Input value={data.full_name} onChange={(e) => set('full_name', e.target.value)} /></div>
        </>
      )}
      {step === 1 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>Téléphone *</Label><Input value={data.phone} onChange={(e) => set('phone', e.target.value)} /></div>
          <div><Label>Pays</Label><Input value={data.country} onChange={(e) => set('country', e.target.value)} /></div>
          <div><Label>Ville *</Label><Input value={data.city} onChange={(e) => set('city', e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Adresse</Label><Input value={data.address} onChange={(e) => set('address', e.target.value)} /></div>
        </div>
      )}
      {step === 2 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Qualification *</Label><Input value={data.qualification} onChange={(e) => set('qualification', e.target.value)} placeholder="ex. Licence en Mathématiques" /></div>
          <div><Label>Années d'expérience</Label><Input type="number" value={data.years_experience} onChange={(e) => set('years_experience', e.target.value)} /></div>
          <div className="sm:col-span-2"><Label>Certifications (séparées par virgules)</Label><Input value={data.certifications} onChange={(e) => set('certifications', e.target.value)} /></div>
        </div>
      )}
      {step === 3 && (
        <div className="space-y-4">
          <div><Label>Matières enseignées (séparées par virgules)</Label>
            <Input value={data.subjects_taught} onChange={(e) => set('subjects_taught', e.target.value)} placeholder="Maths, Physique" /></div>
          <div><Label>Niveaux / classes pris en charge</Label>
            <Input value={data.levels_handled} onChange={(e) => set('levels_handled', e.target.value)} placeholder="6ème, 5ème, 4ème" /></div>
          <div><Label>Bio / À propos</Label>
            <Textarea rows={4} value={data.bio} onChange={(e) => set('bio', e.target.value)} placeholder="Parlez-nous de votre approche pédagogique" /></div>
        </div>
      )}
      {step === 4 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Indiquez vos plages horaires de disponibilité (texte libre).</p>
          {[
            ['mon', 'Lundi'], ['tue', 'Mardi'], ['wed', 'Mercredi'], ['thu', 'Jeudi'],
            ['fri', 'Vendredi'], ['sat', 'Samedi'], ['sun', 'Dimanche'],
          ].map(([k, label]) => (
            <div key={k} className="grid grid-cols-3 items-center gap-3">
              <Label className="col-span-1">{label}</Label>
              <Input className="col-span-2" placeholder="ex. 14h-18h"
                value={data[`availability_${k}`]} onChange={(e) => set(`availability_${k}`, e.target.value)} />
            </div>
          ))}
        </div>
      )}
    </OnboardingWizard>
  );
}
