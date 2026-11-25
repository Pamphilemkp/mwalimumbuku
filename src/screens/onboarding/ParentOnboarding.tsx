"use client";

import { useState, useEffect } from 'react';
import { useNavigate } from '@/src/lib/next-router';
import { supabase } from '@/src/integrations/supabase/client';
import { useAuth } from '@/src/hooks/useAuth';
import OnboardingWizard from '@/src/components/OnboardingWizard';
import AvatarUpload from '@/src/components/AvatarUpload';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Textarea } from '@/src/components/ui/textarea';
import { Button } from '@/src/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { toast } from '@/src/components/ui/sonner';
import { Plus, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

const STEPS = ['Identité', 'Coordonnées', 'Famille', 'Vos enfants'];

interface Child {
  id?: string;
  full_name: string;
  class_level: string;
  age: string;
  learning_difficulties: string;
  weaknesses: string;
  strengths: string;
  behavioral_notes: string;
  goals: string;
}

const blankChild = (): Child => ({
  full_name: '', class_level: '', age: '', learning_difficulties: '',
  weaknesses: '', strengths: '', behavioral_notes: '', goals: '',
});

export default function ParentOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<any>({
    full_name: '', avatar_url: '', phone: '', address: '', country: 'RDC', city: '',
    preferred_language: 'fr', occupation: '', communication_language: 'fr',
    relationship_to_child: 'parent', number_of_children: 1,
  });
  const [children, setChildren] = useState<Child[]>([blankChild()]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: pp }, { data: kids }] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('parent_profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('children_info').select('*').eq('parent_id', user.id).order('created_at'),
      ]);
      setData((d: any) => ({ ...d, ...(p ?? {}), ...(pp ?? {}) }));
      if (kids && kids.length) {
        setChildren(kids.map((k: any) => ({ ...k, age: k.age?.toString() ?? '' })));
      }
      if (p?.onboarding_step) setStep(Math.min(p.onboarding_step, STEPS.length - 1));
    })();
  }, [user]);

  const set = (k: string, v: any) => setData((d: any) => ({ ...d, [k]: v }));
  const updateChild = (i: number, k: keyof Child, v: string) =>
    setChildren((cs) => cs.map((c, idx) => (idx === i ? { ...c, [k]: v } : c)));

  const saveStep = async (nextStep: number, complete = false) => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase.from('profiles').update({
        full_name: data.full_name, avatar_url: data.avatar_url, phone: data.phone,
        address: data.address, country: data.country, city: data.city,
        preferred_language: data.preferred_language,
        onboarding_step: nextStep, onboarding_completed: complete,
      }).eq('user_id', user.id);

      await supabase.from('parent_profiles').upsert({
        user_id: user.id,
        occupation: data.occupation,
        communication_language: data.communication_language,
        relationship_to_child: data.relationship_to_child,
        number_of_children: children.length,
      });

      if (step >= 3 || complete) {
        // Replace children
        await supabase.from('children_info').delete().eq('parent_id', user.id);
        if (children.length) {
          await supabase.from('children_info').insert(
            children.filter(c => c.full_name.trim()).map(c => ({
              parent_id: user.id,
              full_name: c.full_name,
              class_level: c.class_level || null,
              age: c.age ? parseInt(c.age) : null,
              learning_difficulties: c.learning_difficulties || null,
              weaknesses: c.weaknesses || null,
              strengths: c.strengths || null,
              behavioral_notes: c.behavioral_notes || null,
              goals: c.goals || null,
            }))
          );
        }
      }

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
    if (step === 3) return children.length > 0 && children.every(c => c.full_name.trim());
    return true;
  };

  return (
    <OnboardingWizard
      title="Bienvenue, parent"
      subtitle="Aidons-vous à mieux accompagner votre enfant"
      currentStep={step} totalSteps={STEPS.length} stepTitle={STEPS[step]}
      canProceed={validate()} isSubmitting={saving}
      onPrev={() => setStep((s) => Math.max(0, s - 1))}
      onNext={() => saveStep(step + 1)}
      onFinish={() => saveStep(STEPS.length, true)}
    >
      {step === 0 && (
        <>
          <AvatarUpload value={data.avatar_url} onChange={(u) => set('avatar_url', u)} />
          <div><Label>Nom complet *</Label>
            <Input value={data.full_name} onChange={(e) => set('full_name', e.target.value)} /></div>
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
          <div><Label>Profession</Label><Input value={data.occupation} onChange={(e) => set('occupation', e.target.value)} /></div>
          <div><Label>Lien avec l'enfant</Label>
            <Select value={data.relationship_to_child} onValueChange={(v) => set('relationship_to_child', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="parent">Parent</SelectItem>
                <SelectItem value="mother">Mère</SelectItem>
                <SelectItem value="father">Père</SelectItem>
                <SelectItem value="guardian">Tuteur</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2"><Label>Langue de communication préférée</Label>
            <Select value={data.communication_language} onValueChange={(v) => set('communication_language', v)}>
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
        <div className="space-y-5">
          {children.map((child, i) => (
            <div key={i} className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Enfant {i + 1}</h3>
                {children.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setChildren(cs => cs.filter((_, idx) => idx !== i))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label>Nom complet *</Label><Input value={child.full_name} onChange={(e) => updateChild(i, 'full_name', e.target.value)} /></div>
                <div><Label>Classe</Label><Input value={child.class_level} onChange={(e) => updateChild(i, 'class_level', e.target.value)} /></div>
                <div><Label>Âge</Label><Input type="number" value={child.age} onChange={(e) => updateChild(i, 'age', e.target.value)} /></div>
                <div><Label>Difficultés d'apprentissage</Label><Input value={child.learning_difficulties} onChange={(e) => updateChild(i, 'learning_difficulties', e.target.value)} placeholder="ex. dyslexie" /></div>
                <div><Label>Points faibles</Label><Input value={child.weaknesses} onChange={(e) => updateChild(i, 'weaknesses', e.target.value)} /></div>
                <div><Label>Points forts</Label><Input value={child.strengths} onChange={(e) => updateChild(i, 'strengths', e.target.value)} /></div>
                <div className="sm:col-span-2"><Label>Notes comportementales</Label><Textarea rows={2} value={child.behavioral_notes} onChange={(e) => updateChild(i, 'behavioral_notes', e.target.value)} /></div>
                <div className="sm:col-span-2"><Label>Objectifs et attentes</Label><Textarea rows={2} value={child.goals} onChange={(e) => updateChild(i, 'goals', e.target.value)} /></div>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => setChildren(cs => [...cs, blankChild()])}>
            <Plus className="mr-2 h-4 w-4" /> Ajouter un enfant
          </Button>
        </div>
      )}
    </OnboardingWizard>
  );
}
