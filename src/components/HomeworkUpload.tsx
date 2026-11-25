"use client";

import { useState } from 'react';
import { useAuth } from '@/src/hooks/useAuth';
import { supabase } from '@/src/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { toast } from '@/src/components/ui/sonner';
import { validateHomeworkFile } from '@/lib/assessment/files';

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

      const extension = file.name.split('.').pop()?.toLowerCase() ?? 'pdf';
      const decision = validateHomeworkFile({
        fileName: file.name,
        size: file.size,
        ownerId: user.id,
        callerId: user.id,
        assignmentId,
        objectName: `${Date.now()}.${extension}`,
      });
      if (!decision.ok) throw new Error('Choose a PDF or image under 5 MB.');

      const { error: uploadErr } = await supabase.storage
        .from('homework-files')
        .upload(decision.path, file);
      if (uploadErr) throw uploadErr;

      const { error } = await supabase.from('homework_submissions').insert({
        assignment_id: assignmentId,
        user_id: user.id,
        file_url: decision.path,
        file_name: file.name,
      });
      if (error) {
        const { data: saved } = await supabase
          .from('homework_submissions')
          .select('id')
          .eq('user_id', user.id)
          .eq('file_url', decision.path)
          .maybeSingle();
        if (!saved) await supabase.storage.from('homework-files').remove([decision.path]);
        throw error;
      }
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
          accept=".pdf,.jpg,.jpeg,.png,.webp"
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
