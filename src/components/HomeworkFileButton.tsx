"use client";

import { useState } from "react";
import { homeworkDownloadAction } from "@/features/assessment/homework-download";
import { Button } from "@/src/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "@/src/components/ui/sonner";

export function HomeworkFileButton({ submissionId, label }: { submissionId: string; label: string }) {
  const [pending, setPending] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="w-full gap-1.5"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void homeworkDownloadAction(submissionId)
          .then((result) => {
            if (!result.url) {
              toast.error("Le fichier n'est pas disponible.");
              return;
            }
            window.open(result.url, "_blank", "noopener,noreferrer");
          })
          .finally(() => setPending(false));
      }}
    >
      <Download className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}
