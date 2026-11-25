"use client";

import { useState } from 'react';
import { supabase } from '@/src/integrations/supabase/client';
import { useAuth } from '@/src/hooks/useAuth';
import { Button } from '@/src/components/ui/button';
import { Camera, Loader2, User } from 'lucide-react';
import { toast } from '@/src/components/ui/sonner';

interface Props {
  value?: string | null;
  onChange: (url: string) => void;
}

export default function AvatarUpload({ value, onChange }: Props) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image trop volumineuse (max 5MB)');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success('Photo téléchargée');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du téléchargement');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-border bg-muted">
        {value ? (
          <img src={value} alt="Avatar" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <User className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
      </div>
      <label>
        <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
        <Button type="button" variant="outline" size="sm" asChild disabled={uploading}>
          <span className="cursor-pointer">
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
            {value ? 'Changer' : 'Ajouter une photo'}
          </span>
        </Button>
      </label>
    </div>
  );
}
