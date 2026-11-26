export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          school_id: string | null
          summary: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          school_id?: string | null
          summary: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          school_id?: string | null
          summary?: string
        }
        Relationships: []
      }
      email_deliveries: {
        Row: {
          created_at: string
          detail: string
          id: string
          kind: string
          status: string
        }
        Insert: {
          created_at?: string
          detail: string
          id?: string
          kind: string
          status: string
        }
        Update: {
          created_at?: string
          detail?: string
          id?: string
          kind?: string
          status?: string
        }
        Relationships: []
      }
      payment_events: {
        Row: {
          event_id: string
          event_type: string
          received_at: string
          status: string
        }
        Insert: {
          event_id: string
          event_type: string
          received_at?: string
          status: string
        }
        Update: {
          event_id?: string
          event_type?: string
          received_at?: string
          status?: string
        }
        Relationships: []
      }
      assignments: {
        Row: {
          allow_resubmit: boolean
          course_id: string
          created_at: string
          description: string | null
          due_date: string
          id: string
          title: string
        }
        Insert: {
          allow_resubmit?: boolean
          course_id: string
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          title: string
        }
        Update: {
          allow_resubmit?: boolean
          course_id?: string
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          course_id: string
          id: string
          marked_at: string
          marked_by: string | null
          notes: string | null
          session_id: string | null
          status: string
          student_id: string
        }
        Insert: {
          course_id: string
          id?: string
          marked_at?: string
          marked_by?: string | null
          notes?: string | null
          session_id?: string | null
          status?: string
          student_id: string
        }
        Update: {
          course_id?: string
          id?: string
          marked_at?: string
          marked_by?: string | null
          notes?: string | null
          session_id?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          name: string
          points_required: number
          achievement_code: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          name: string
          points_required?: number
          achievement_code?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          name?: string
          points_required?: number
          achievement_code?: string | null
        }
        Relationships: []
      }
      children_info: {
        Row: {
          age: number | null
          behavioral_notes: string | null
          class_level: string | null
          created_at: string
          full_name: string
          goals: string | null
          id: string
          learning_difficulties: string | null
          linked_student_id: string | null
          parent_id: string
          strengths: string | null
          updated_at: string
          weaknesses: string | null
        }
        Insert: {
          age?: number | null
          behavioral_notes?: string | null
          class_level?: string | null
          created_at?: string
          full_name: string
          goals?: string | null
          id?: string
          learning_difficulties?: string | null
          linked_student_id?: string | null
          parent_id: string
          strengths?: string | null
          updated_at?: string
          weaknesses?: string | null
        }
        Update: {
          age?: number | null
          behavioral_notes?: string | null
          class_level?: string | null
          created_at?: string
          full_name?: string
          goals?: string | null
          id?: string
          learning_difficulties?: string | null
          linked_student_id?: string | null
          parent_id?: string
          strengths?: string | null
          updated_at?: string
          weaknesses?: string | null
        }
        Relationships: []
      }
      course_enrollments: {
        Row: {
          course_id: string
          enrolled_at: string
          id: string
          user_id: string
        }
        Insert: {
          course_id: string
          enrolled_at?: string
          id?: string
          user_id: string
        }
        Update: {
          course_id?: string
          enrolled_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_materials: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          file_name: string | null
          file_url: string
          id: string
          lesson_id: string | null
          material_type: string
          title: string
          uploaded_by: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_url: string
          id?: string
          lesson_id?: string | null
          material_type?: string
          title: string
          uploaded_by: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_url?: string
          id?: string
          lesson_id?: string | null
          material_type?: string
          title?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          archived: boolean
          created_at: string
          deadline: string | null
          description: string | null
          education_stage: string | null
          id: string
          school_id: string | null
          is_open_enrollment: boolean
          is_premium: boolean
          is_published: boolean
          level: string
          subject: string
          teacher_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          deadline?: string | null
          description?: string | null
          education_stage?: string | null
          id?: string
          school_id?: string | null
          is_open_enrollment?: boolean
          is_premium?: boolean
          is_published?: boolean
          level?: string
          subject: string
          teacher_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          deadline?: string | null
          description?: string | null
          education_stage?: string | null
          id?: string
          school_id?: string | null
          is_open_enrollment?: boolean
          is_premium?: boolean
          is_published?: boolean
          level?: string
          subject?: string
          teacher_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_moods: {
        Row: {
          created_at: string
          id: string
          mood: string
          note: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mood: string
          note?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mood?: string
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          attempt_limit: number
          correct_answer: string
          created_at: string
          exercise_type: string
          id: string
          lesson_id: string
          options: Json | null
          partial_credit: boolean
          points: number
          question: string
        }
        Insert: {
          attempt_limit?: number
          correct_answer: string
          created_at?: string
          exercise_type?: string
          id?: string
          lesson_id: string
          options?: Json | null
          partial_credit?: boolean
          points?: number
          question: string
        }
        Update: {
          attempt_limit?: number
          correct_answer?: string
          created_at?: string
          exercise_type?: string
          id?: string
          lesson_id?: string
          options?: Json | null
          partial_credit?: boolean
          points?: number
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_posts: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          role_visibility: string[]
          school_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          id?: string
          role_visibility?: string[]
          school_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          role_visibility?: string[]
          school_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      forum_replies: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_replies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      homework_submissions: {
        Row: {
          assignment_id: string
          created_at: string
          file_name: string
          file_url: string
          grade: number | null
          id: string
          status: string
          teacher_comment: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          file_name: string
          file_url: string
          grade?: number | null
          id?: string
          status?: string
          teacher_comment?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          file_name?: string
          file_url?: string
          grade?: number | null
          id?: string
          status?: string
          teacher_comment?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          audio_url: string | null
          content: string | null
          course_id: string
          created_at: string
          examples: string | null
          id: string
          objectives: string | null
          resource_url: string | null
          sort_order: number
          summary: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          audio_url?: string | null
          content?: string | null
          course_id: string
          created_at?: string
          examples?: string | null
          id?: string
          objectives?: string | null
          resource_url?: string | null
          sort_order?: number
          summary?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          audio_url?: string | null
          content?: string | null
          course_id?: string
          created_at?: string
          examples?: string | null
          id?: string
          objectives?: string | null
          resource_url?: string | null
          sort_order?: number
          summary?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string
          id: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: []
      }
      live_sessions: {
        Row: {
          access_instructions: string | null
          class_id: string | null
          course_id: string
          created_at: string
          description: string | null
          duration_minutes: number
          ends_at: string | null
          id: string
          meeting_url: string | null
          scheduled_at: string
          status: string
          teacher_id: string
          title: string
          updated_at: string
        }
        Insert: {
          access_instructions?: string | null
          class_id?: string | null
          course_id: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          ends_at?: string | null
          id?: string
          meeting_url?: string | null
          scheduled_at: string
          status?: string
          teacher_id: string
          title: string
          updated_at?: string
        }
        Update: {
          access_instructions?: string | null
          class_id?: string | null
          course_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number
          ends_at?: string | null
          id?: string
          meeting_url?: string | null
          scheduled_at?: string
          status?: string
          teacher_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      parent_profiles: {
        Row: {
          communication_language: string | null
          created_at: string
          number_of_children: number | null
          occupation: string | null
          relationship_to_child: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          communication_language?: string | null
          created_at?: string
          number_of_children?: number | null
          occupation?: string | null
          relationship_to_child?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          communication_language?: string | null
          created_at?: string
          number_of_children?: number | null
          occupation?: string | null
          relationship_to_child?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      parent_student: {
        Row: {
          created_at: string
          id: string
          parent_id: string
          relationship: string | null
          school_id: string | null
          status: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parent_id: string
          relationship?: string | null
          school_id?: string | null
          status?: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parent_id?: string
          relationship?: string | null
          school_id?: string | null
          status?: string
          student_id?: string
        }
        Relationships: []
      }
      payment_history: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          id: string
          provider: string | null
          provider_ref: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          provider?: string | null
          provider_ref?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          provider?: string | null
          provider_ref?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          dyslexia_mode: boolean
          full_name: string
          gender: string | null
          id: string
          locale: string
          onboarding_completed: boolean
          onboarding_step: number
          phone: string | null
          preferred_language: string | null
          student_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          dyslexia_mode?: boolean
          full_name?: string
          gender?: string | null
          id?: string
          locale?: string
          onboarding_completed?: boolean
          onboarding_step?: number
          phone?: string | null
          preferred_language?: string | null
          student_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          dyslexia_mode?: boolean
          full_name?: string
          gender?: string | null
          id?: string
          locale?: string
          onboarding_completed?: boolean
          onboarding_step?: number
          phone?: string | null
          preferred_language?: string | null
          student_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      renewal_history: {
        Row: {
          created_at: string
          id: string
          new_expires_at: string
          payment_id: string | null
          previous_expires_at: string | null
          tier: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          new_expires_at: string
          payment_id?: string | null
          previous_expires_at?: string | null
          tier?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          new_expires_at?: string
          payment_id?: string | null
          previous_expires_at?: string | null
          tier?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "renewal_history_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payment_history"
            referencedColumns: ["id"]
          },
        ]
      }
      results: {
        Row: {
          answer: string
          created_at: string
          exercise_id: string
          id: string
          is_correct: boolean
          points_earned: number
          user_id: string
        }
        Insert: {
          answer: string
          created_at?: string
          exercise_id: string
          id?: string
          is_correct: boolean
          points_earned?: number
          user_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          exercise_id?: string
          id?: string
          is_correct?: boolean
          points_earned?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "results_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "student_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      student_profiles: {
        Row: {
          academic_goals: string | null
          class_level: string | null
          created_at: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          guardian_info: Json | null
          learning_language: string | null
          school_name: string | null
          student_id_external: string | null
          subjects_of_interest: string[] | null
          updated_at: string
          user_id: string
          weak_subjects: string[] | null
        }
        Insert: {
          academic_goals?: string | null
          class_level?: string | null
          created_at?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          guardian_info?: Json | null
          learning_language?: string | null
          school_name?: string | null
          student_id_external?: string | null
          subjects_of_interest?: string[] | null
          updated_at?: string
          user_id: string
          weak_subjects?: string[] | null
        }
        Update: {
          academic_goals?: string | null
          class_level?: string | null
          created_at?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          guardian_info?: Json | null
          learning_language?: string | null
          school_name?: string | null
          student_id_external?: string | null
          subjects_of_interest?: string[] | null
          updated_at?: string
          user_id?: string
          weak_subjects?: string[] | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          starts_at: string
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          starts_at?: string
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          starts_at?: string
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          sender_id: string
          ticket_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id: string
          ticket_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: Database["public"]["Enums"]["support_category"]
          created_at: string
          id: string
          last_message_at: string
          priority: Database["public"]["Enums"]["support_priority"]
          school_id: string | null
          status: Database["public"]["Enums"]["support_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["support_category"]
          created_at?: string
          id?: string
          last_message_at?: string
          priority?: Database["public"]["Enums"]["support_priority"]
          school_id?: string | null
          status?: Database["public"]["Enums"]["support_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["support_category"]
          created_at?: string
          id?: string
          last_message_at?: string
          priority?: Database["public"]["Enums"]["support_priority"]
          school_id?: string | null
          status?: Database["public"]["Enums"]["support_status"]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_typing: {
        Row: {
          ticket_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ticket_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ticket_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      teacher_profiles: {
        Row: {
          availability: Json | null
          bio: string | null
          certifications: string[] | null
          created_at: string
          levels_handled: string[] | null
          qualification: string | null
          subjects_taught: string[] | null
          updated_at: string
          user_id: string
          years_experience: number | null
        }
        Insert: {
          availability?: Json | null
          bio?: string | null
          certifications?: string[] | null
          created_at?: string
          levels_handled?: string[] | null
          qualification?: string | null
          subjects_taught?: string[] | null
          updated_at?: string
          user_id: string
          years_experience?: number | null
        }
        Update: {
          availability?: Json | null
          bio?: string | null
          certifications?: string[] | null
          created_at?: string
          levels_handled?: string[] | null
          qualification?: string | null
          subjects_taught?: string[] | null
          updated_at?: string
          user_id?: string
          years_experience?: number | null
        }
        Relationships: []
      }
      teacher_recommendations: {
        Row: {
          course_id: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          priority: string
          student_id: string
          subject: string | null
          teacher_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          priority?: string
          student_id: string
          subject?: string | null
          teacher_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          priority?: string
          student_id?: string
          subject?: string | null
          teacher_id?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      profile_labels: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          user_id: string | null
        }
        Relationships: []
      }
      student_exercises: {
        Row: {
          created_at: string | null
          exercise_type: string | null
          id: string | null
          lesson_id: string | null
          options: Json | null
          points: number | null
          question: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      award_badge_if_eligible: {
        Args: { _badge_id: string }
        Returns: undefined
      }
      admin_notify_school: {
        Args: { target_school: string; title: string; message: string }
        Returns: number
      }
      find_account_for_admin: {
        Args: { _code: string }
        Returns: { user_id: string; full_name: string }[]
      }
      provision_teacher: {
        Args: { target_user: string; target_school: string }
        Returns: undefined
      }
      record_email_delivery: {
        Args: { _kind: string; _status: string; _detail: string }
        Returns: undefined
      }
      signup_role: {
        Args: { raw: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      open_game_attempt: {
        Args: { _game: string; _difficulty: string }
        Returns: Json
      }
      submit_game_attempt: {
        Args: { _attempt_id: string; _idempotency_key: string; _events: Json }
        Returns: Json
      }
      reverse_reward_entry: {
        Args: { _entry_id: string; _reason: string }
        Returns: Json
      }
      reward_summary: {
        Args: { _student_id: string }
        Returns: Json
      }
      student_reward_summary: {
        Args: never
        Returns: Json
      }
      reward_summaries: {
        Args: { _student_ids: string[] }
        Returns: {
          student_id: string
          xp: number
          level: number
          streak: number
          today_xp: number
        }[]
      }
      my_game_leaderboards: {
        Args: never
        Returns: Json
      }
      check_answer: {
        Args: { _answer: string; _exercise_id: string }
        Returns: Json
      }
      get_lesson_exercises: {
        Args: { _lesson_id: string }
        Returns: {
          attempt_limit: number
          created_at: string
          exercise_type: string
          id: string
          options: Json
          points: number
          question: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      link_parent_child: { Args: { _student_id: string }; Returns: undefined }
      run_scheduled_notifications: { Args: never; Returns: undefined }
      send_academic_reminders: { Args: never; Returns: undefined }
      send_assignment_reminders: { Args: never; Returns: undefined }
      send_subscription_reminders: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "student" | "parent" | "teacher" | "admin"
      support_category:
        | "technical_issue"
        | "learning_difficulty"
        | "homework_help"
        | "subscription_issue"
        | "teacher_assistance"
        | "parent_guidance"
        | "general_inquiry"
        | "academic_question"
        | "report_issue"
      support_priority: "low" | "normal" | "high" | "urgent"
      support_status: "open" | "pending" | "replied" | "resolved" | "closed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["student", "parent", "teacher", "admin"],
      support_category: [
        "technical_issue",
        "learning_difficulty",
        "homework_help",
        "subscription_issue",
        "teacher_assistance",
        "parent_guidance",
        "general_inquiry",
        "academic_question",
        "report_issue",
      ],
      support_priority: ["low", "normal", "high", "urgent"],
      support_status: ["open", "pending", "replied", "resolved", "closed"],
    },
  },
} as const
