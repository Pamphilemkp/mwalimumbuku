"use client";

import { motion } from 'framer-motion';
import { NotebookPen } from 'lucide-react';
import StudentAssignments from '@/src/components/StudentAssignments';

export default function StudentAssignmentsPage() {
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-card shadow-sm">
            <NotebookPen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">Mes devoirs</h1>
            <p className="text-sm text-muted-foreground">Consultez, soumettez et suivez tous les devoirs de vos cours.</p>
          </div>
        </div>
      </motion.div>

      <StudentAssignments />
    </div>
  );
}
