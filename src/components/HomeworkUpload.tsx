import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

interface HomeworkUploadProps {
  assignmentId: string;
  onUploaded?: () => void;
}

export default function HomeworkUpload({ assignmentId, onUploaded }: HomeworkUploadProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);

  const upload = useMutation({
    mutationFn: async () => {
      if (!file || !user) throw new Error('No file selected');

      const ext = file.name.split('.').pop();
      const path = `${user.id}/${assignmentId}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('homework-files')
        .upload(path, file);
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from('homework-files')
        .getPublicUrl(path);

      const { error } = await supabase.from('homework_submissions').insert({
        assignment_id: assignmentId,
        user_id: user.id,
        file_url: publicUrl,
        file_name: file.name,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Devoir soumis avec succès !');
      setFile(null);
      qc.invalidateQueries({ queryKey: ['homework-submissions'] });
      onUploaded?.();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1">
        <Input
          type="file"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="cursor-pointer"
        />
      </div>
      <Button
        onClick={() => upload.mutate()}
        disabled={!file || upload.isPending}
        className="gap-2 shrink-0"
      >
        {upload.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        Soumettre
      </Button>
    </div>
  );
}
