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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activation_metrics: {
        Row: {
          completed_at: string | null
          completed_steps: string[] | null
          conversion_after_days: number | null
          created_at: string | null
          first_value_at: string | null
          id: string
          profile_id: string
          started_at: string | null
          updated_at: string | null
          used_demo: boolean | null
        }
        Insert: {
          completed_at?: string | null
          completed_steps?: string[] | null
          conversion_after_days?: number | null
          created_at?: string | null
          first_value_at?: string | null
          id?: string
          profile_id: string
          started_at?: string | null
          updated_at?: string | null
          used_demo?: boolean | null
        }
        Update: {
          completed_at?: string | null
          completed_steps?: string[] | null
          conversion_after_days?: number | null
          created_at?: string | null
          first_value_at?: string | null
          id?: string
          profile_id?: string
          started_at?: string | null
          updated_at?: string | null
          used_demo?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "activation_metrics_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activation_metrics_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          created_at: string | null
          id: string
          is_resolved: boolean | null
          message: string
          severity: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          message: string
          severity: string
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          message?: string
          severity?: string
          type?: string
        }
        Relationships: []
      }
      app_users: {
        Row: {
          auth_user_id: string | null
          created_at: string | null
          display_name: string | null
          durum: string | null
          email: string
          id: string
          is_deleted: boolean | null
          last_login: string | null
          password: string | null
          rol_id: string | null
          updated_at: string | null
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string | null
          display_name?: string | null
          durum?: string | null
          email: string
          id?: string
          is_deleted?: boolean | null
          last_login?: string | null
          password?: string | null
          rol_id?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string | null
          display_name?: string | null
          durum?: string | null
          email?: string
          id?: string
          is_deleted?: boolean | null
          last_login?: string | null
          password?: string | null
          rol_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      appointments: {
        Row: {
          clinic_id: string | null
          created_at: string | null
          id: string
          owner_reason: string | null
          pet_id: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["appointment_status"] | null
          vet_notes: string | null
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string | null
          id?: string
          owner_reason?: string | null
          pet_id?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          vet_notes?: string | null
        }
        Update: {
          clinic_id?: string | null
          created_at?: string | null
          id?: string
          owner_reason?: string | null
          pet_id?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          vet_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "appointments_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      beta_signups: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string | null
          segment: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name?: string | null
          segment?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          segment?: string | null
        }
        Relationships: []
      }
      calendar_feed_tokens: {
        Row: {
          created_at: string | null
          days_ahead: number | null
          filters: Json | null
          id: string
          last_fetched_at: string | null
          profile_id: string
          scope: string
          token: string
        }
        Insert: {
          created_at?: string | null
          days_ahead?: number | null
          filters?: Json | null
          id?: string
          last_fetched_at?: string | null
          profile_id: string
          scope?: string
          token?: string
        }
        Update: {
          created_at?: string | null
          days_ahead?: number | null
          filters?: Json | null
          id?: string
          last_fetched_at?: string | null
          profile_id?: string
          scope?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_feed_tokens_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_feed_tokens_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      care_events: {
        Row: {
          care_plan_id: string | null
          created_at: string | null
          event_type: string
          id: string
          notes: string | null
          performed_at: string | null
          pet_id: string | null
        }
        Insert: {
          care_plan_id?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          notes?: string | null
          performed_at?: string | null
          pet_id?: string | null
        }
        Update: {
          care_plan_id?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          notes?: string | null
          performed_at?: string | null
          pet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "care_events_care_plan_id_fkey"
            columns: ["care_plan_id"]
            isOneToOne: false
            referencedRelation: "care_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_events_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "care_events_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      care_plans: {
        Row: {
          clinic_id: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          pet_id: string | null
          title: string
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          pet_id?: string | null
          title: string
        }
        Update: {
          clinic_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          pet_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_plans_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_plans_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "care_plans_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      caregiver_logbook_entries: {
        Row: {
          caregiver_user_id: string | null
          created_at: string
          entry_type: string
          id: string
          notes: string | null
          pet_id: string
          shared_card_id: string
        }
        Insert: {
          caregiver_user_id?: string | null
          created_at?: string
          entry_type: string
          id?: string
          notes?: string | null
          pet_id: string
          shared_card_id: string
        }
        Update: {
          caregiver_user_id?: string | null
          created_at?: string
          entry_type?: string
          id?: string
          notes?: string | null
          pet_id?: string
          shared_card_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "caregiver_logbook_entries_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "caregiver_logbook_entries_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caregiver_logbook_entries_shared_card_id_fkey"
            columns: ["shared_card_id"]
            isOneToOne: false
            referencedRelation: "shared_pet_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_memberships: {
        Row: {
          clinic_id: string | null
          created_at: string | null
          id: string
          profile_id: string | null
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string | null
          id?: string
          profile_id?: string | null
        }
        Update: {
          clinic_id?: string | null
          created_at?: string | null
          id?: string
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_memberships_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          address: string | null
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          district: string | null
          google_place_id: string | null
          id: string
          is_public: boolean | null
          is_verified: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          operating_hours: Json | null
          tags: string[] | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          district?: string | null
          google_place_id?: string | null
          id?: string
          is_public?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          operating_hours?: Json | null
          tags?: string[] | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          district?: string | null
          google_place_id?: string | null
          id?: string
          is_public?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          operating_hours?: Json | null
          tags?: string[] | null
          website?: string | null
        }
        Relationships: []
      }
      daily_scores: {
        Row: {
          created_at: string | null
          date: string
          id: string
          pet_id: string | null
          score: number
        }
        Insert: {
          created_at?: string | null
          date?: string
          id?: string
          pet_id?: string | null
          score?: number
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          pet_id?: string | null
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_scores_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "daily_scores_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          created_at: string | null
          id: string
          last_seen_at: string | null
          latitude: number | null
          longitude: number | null
          motion_alerts_enabled: boolean
          name: string
          pet_id: string
          sensitivity_level: string
          status: string
          type: string
          updated_at: string | null
          wifi_name: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_seen_at?: string | null
          latitude?: number | null
          longitude?: number | null
          motion_alerts_enabled?: boolean
          name: string
          pet_id: string
          sensitivity_level?: string
          status?: string
          type: string
          updated_at?: string | null
          wifi_name?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_seen_at?: string | null
          latitude?: number | null
          longitude?: number | null
          motion_alerts_enabled?: boolean
          name?: string
          pet_id?: string
          sensitivity_level?: string
          status?: string
          type?: string
          updated_at?: string | null
          wifi_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devices_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "devices_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      event_stream: {
        Row: {
          created_at: string | null
          event: string
          event_type: string
          id: string
          metadata: Json | null
          payload: Json | null
          pet_id: string | null
          profile_id: string | null
          ts: string | null
        }
        Insert: {
          created_at?: string | null
          event?: string
          event_type: string
          id?: string
          metadata?: Json | null
          payload?: Json | null
          pet_id?: string | null
          profile_id?: string | null
          ts?: string | null
        }
        Update: {
          created_at?: string | null
          event?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          payload?: Json | null
          pet_id?: string | null
          profile_id?: string | null
          ts?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_stream_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "event_stream_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_stream_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_stream_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      feeding_logs: {
        Row: {
          amount_grams: number | null
          appetite_score: number | null
          consumed_percent: number | null
          created_at: string | null
          id: string
          meal_time: string | null
          notes: string | null
          pet_id: string | null
          stool_quality: number | null
        }
        Insert: {
          amount_grams?: number | null
          appetite_score?: number | null
          consumed_percent?: number | null
          created_at?: string | null
          id?: string
          meal_time?: string | null
          notes?: string | null
          pet_id?: string | null
          stool_quality?: number | null
        }
        Update: {
          amount_grams?: number | null
          appetite_score?: number | null
          consumed_percent?: number | null
          created_at?: string | null
          id?: string
          meal_time?: string | null
          notes?: string | null
          pet_id?: string | null
          stool_quality?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "feeding_logs_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "feeding_logs_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      food_inventory: {
        Row: {
          current_stock_grams: number
          estimated_daily_usage: number | null
          id: string
          last_refill_date: string | null
          low_stock_threshold_days: number | null
          next_refill_estimate: string | null
          pet_id: string | null
          updated_at: string | null
        }
        Insert: {
          current_stock_grams?: number
          estimated_daily_usage?: number | null
          id?: string
          last_refill_date?: string | null
          low_stock_threshold_days?: number | null
          next_refill_estimate?: string | null
          pet_id?: string | null
          updated_at?: string | null
        }
        Update: {
          current_stock_grams?: number
          estimated_daily_usage?: number | null
          id?: string
          last_refill_date?: string | null
          low_stock_threshold_days?: number | null
          next_refill_estimate?: string | null
          pet_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_inventory_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: true
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "food_inventory_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: true
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      health_allergies: {
        Row: {
          created_at: string | null
          id: string
          pet_id: string | null
          symptoms: string | null
          treatment: string | null
          trigger_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          pet_id?: string | null
          symptoms?: string | null
          treatment?: string | null
          trigger_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          pet_id?: string | null
          symptoms?: string | null
          treatment?: string | null
          trigger_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_allergies_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "health_allergies_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      health_diseases: {
        Row: {
          created_at: string | null
          diagnosis_date: string | null
          disease_name: string
          id: string
          is_resolved: boolean | null
          pet_id: string | null
          treatment: string | null
        }
        Insert: {
          created_at?: string | null
          diagnosis_date?: string | null
          disease_name: string
          id?: string
          is_resolved?: boolean | null
          pet_id?: string | null
          treatment?: string | null
        }
        Update: {
          created_at?: string | null
          diagnosis_date?: string | null
          disease_name?: string
          id?: string
          is_resolved?: boolean | null
          pet_id?: string | null
          treatment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "health_diseases_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "health_diseases_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      health_medications: {
        Row: {
          created_at: string | null
          dose: string | null
          id: string
          is_active: boolean | null
          medication_name: string
          pet_id: string | null
          usage_duration: string | null
        }
        Insert: {
          created_at?: string | null
          dose?: string | null
          id?: string
          is_active?: boolean | null
          medication_name: string
          pet_id?: string | null
          usage_duration?: string | null
        }
        Update: {
          created_at?: string | null
          dose?: string | null
          id?: string
          is_active?: boolean | null
          medication_name?: string
          pet_id?: string | null
          usage_duration?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "health_medications_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "health_medications_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      health_plans: {
        Row: {
          created_at: string | null
          dose_count: number | null
          end_condition: string | null
          end_date: string | null
          end_occurrences: number | null
          frequency: string | null
          id: string
          interval: number | null
          pet_id: string | null
        }
        Insert: {
          created_at?: string | null
          dose_count?: number | null
          end_condition?: string | null
          end_date?: string | null
          end_occurrences?: number | null
          frequency?: string | null
          id?: string
          interval?: number | null
          pet_id?: string | null
        }
        Update: {
          created_at?: string | null
          dose_count?: number | null
          end_condition?: string | null
          end_date?: string | null
          end_occurrences?: number | null
          frequency?: string | null
          id?: string
          interval?: number | null
          pet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "health_plans_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "health_plans_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      health_schedules: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          assigned_to: string | null
          assignment_status: string | null
          category: string | null
          created_at: string | null
          decline_reason: string | null
          due_date: string
          due_time: string | null
          escalation_level: string | null
          id: string
          last_escalated_at: string | null
          metadata: Json | null
          notes: string | null
          notification_rule: Json | null
          pet_id: string | null
          plan_id: string | null
          plan_type: string
          postpone_count: number | null
          priority: string | null
          reassigned_at: string | null
          source: string | null
          status: string | null
          sub_category: string | null
          title: string | null
          vaccine_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          assignment_status?: string | null
          category?: string | null
          created_at?: string | null
          decline_reason?: string | null
          due_date: string
          due_time?: string | null
          escalation_level?: string | null
          id?: string
          last_escalated_at?: string | null
          metadata?: Json | null
          notes?: string | null
          notification_rule?: Json | null
          pet_id?: string | null
          plan_id?: string | null
          plan_type: string
          postpone_count?: number | null
          priority?: string | null
          reassigned_at?: string | null
          source?: string | null
          status?: string | null
          sub_category?: string | null
          title?: string | null
          vaccine_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          assignment_status?: string | null
          category?: string | null
          created_at?: string | null
          decline_reason?: string | null
          due_date?: string
          due_time?: string | null
          escalation_level?: string | null
          id?: string
          last_escalated_at?: string | null
          metadata?: Json | null
          notes?: string | null
          notification_rule?: Json | null
          pet_id?: string | null
          plan_id?: string | null
          plan_type?: string
          postpone_count?: number | null
          priority?: string | null
          reassigned_at?: string | null
          source?: string | null
          status?: string | null
          sub_category?: string | null
          title?: string | null
          vaccine_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "health_schedules_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_schedules_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_schedules_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_schedules_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_schedules_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "health_schedules_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_schedules_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "health_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_schedules_vaccine_id_fkey"
            columns: ["vaccine_id"]
            isOneToOne: false
            referencedRelation: "vaccines"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_profiles: {
        Row: {
          care_consistency_score: number | null
          chronic_condition_count: number | null
          computed_at: string | null
          hard_flags: Json
          household_reliability_score: number | null
          id: string
          incident_count: number | null
          insurance_score: number
          next_review_at: string | null
          pet_id: string
          preventive_compliance_score: number | null
          profile_id: string
          reasons: Json
          segment: string
        }
        Insert: {
          care_consistency_score?: number | null
          chronic_condition_count?: number | null
          computed_at?: string | null
          hard_flags?: Json
          household_reliability_score?: number | null
          id?: string
          incident_count?: number | null
          insurance_score: number
          next_review_at?: string | null
          pet_id: string
          preventive_compliance_score?: number | null
          profile_id: string
          reasons?: Json
          segment: string
        }
        Update: {
          care_consistency_score?: number | null
          chronic_condition_count?: number | null
          computed_at?: string | null
          hard_flags?: Json
          household_reliability_score?: number | null
          id?: string
          incident_count?: number | null
          insurance_score?: number
          next_review_at?: string | null
          pet_id?: string
          preventive_compliance_score?: number | null
          profile_id?: string
          reasons?: Json
          segment?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_profiles_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: true
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "insurance_profiles_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: true
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lost_reports: {
        Row: {
          contact_phone: string | null
          created_at: string | null
          id: string
          last_seen_at: string | null
          last_seen_location: string
          pet_id: string | null
          status: string | null
        }
        Insert: {
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          last_seen_at?: string | null
          last_seen_location: string
          pet_id?: string | null
          status?: string | null
        }
        Update: {
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          last_seen_at?: string | null
          last_seen_location?: string
          pet_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lost_reports_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "lost_reports_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          pet_id: string | null
          profile_id: string | null
          sent_email: boolean | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          pet_id?: string | null
          profile_id?: string | null
          sent_email?: boolean | null
          title: string
          type?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          pet_id?: string | null
          profile_id?: string | null
          sent_email?: boolean | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "notifications_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications_log: {
        Row: {
          id: string
          is_read: boolean | null
          message: string
          profile_id: string | null
          sent_at: string | null
          type: string
        }
        Insert: {
          id?: string
          is_read?: boolean | null
          message: string
          profile_id?: string | null
          sent_at?: string | null
          type: string
        }
        Update: {
          id?: string
          is_read?: boolean | null
          message?: string
          profile_id?: string | null
          sent_at?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_logs: {
        Row: {
          created_at: string | null
          date: string
          food_logged: boolean | null
          id: string
          notes: string | null
          pet_id: string | null
          water_logged: boolean | null
        }
        Insert: {
          created_at?: string | null
          date?: string
          food_logged?: boolean | null
          id?: string
          notes?: string | null
          pet_id?: string | null
          water_logged?: boolean | null
        }
        Update: {
          created_at?: string | null
          date?: string
          food_logged?: boolean | null
          id?: string
          notes?: string | null
          pet_id?: string | null
          water_logged?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_logs_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "nutrition_logs_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_progress: {
        Row: {
          activation_points_awarded: boolean | null
          created_at: string | null
          demo_mode: boolean | null
          first_health_event_at: string | null
          first_pet_at: string | null
          first_report_at: string | null
          has_added_feeding_log: boolean | null
          has_added_pet: boolean | null
          has_added_vaccine: boolean | null
          has_generated_report: boolean | null
          has_invited_member: boolean | null
          id: string
          profile_id: string
          updated_at: string | null
          wizard_completed: boolean | null
          wizard_step: number | null
        }
        Insert: {
          activation_points_awarded?: boolean | null
          created_at?: string | null
          demo_mode?: boolean | null
          first_health_event_at?: string | null
          first_pet_at?: string | null
          first_report_at?: string | null
          has_added_feeding_log?: boolean | null
          has_added_pet?: boolean | null
          has_added_vaccine?: boolean | null
          has_generated_report?: boolean | null
          has_invited_member?: boolean | null
          id?: string
          profile_id: string
          updated_at?: string | null
          wizard_completed?: boolean | null
          wizard_step?: number | null
        }
        Update: {
          activation_points_awarded?: boolean | null
          created_at?: string | null
          demo_mode?: boolean | null
          first_health_event_at?: string | null
          first_pet_at?: string | null
          first_report_at?: string | null
          has_added_feeding_log?: boolean | null
          has_added_pet?: boolean | null
          has_added_vaccine?: boolean | null
          has_generated_report?: boolean | null
          has_invited_member?: boolean | null
          id?: string
          profile_id?: string
          updated_at?: string | null
          wizard_completed?: boolean | null
          wizard_step?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_progress_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_progress_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_pipeline: {
        Row: {
          activated_at: string | null
          contact: string | null
          contacted_at: string | null
          created_at: string | null
          id: string
          name: string
          notes: string | null
          profile_id: string | null
          replied_at: string | null
          retained_d7_at: string | null
          source: string | null
          stage: string
          tier: number | null
          type: string
          updated_at: string | null
        }
        Insert: {
          activated_at?: string | null
          contact?: string | null
          contacted_at?: string | null
          created_at?: string | null
          id?: string
          name: string
          notes?: string | null
          profile_id?: string | null
          replied_at?: string | null
          retained_d7_at?: string | null
          source?: string | null
          stage?: string
          tier?: number | null
          type: string
          updated_at?: string | null
        }
        Update: {
          activated_at?: string | null
          contact?: string | null
          contacted_at?: string | null
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          profile_id?: string | null
          replied_at?: string | null
          retained_d7_at?: string | null
          source?: string | null
          stage?: string
          tier?: number | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_pipeline_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_pipeline_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      parasite_products: {
        Row: {
          active_ingredient: string | null
          admin_note: string | null
          application_method: string
          brand: string
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          notes: string | null
          protection_duration_days: number
          species: string
          status: string
          suggested_by: string | null
          type: string
        }
        Insert: {
          active_ingredient?: string | null
          admin_note?: string | null
          application_method: string
          brand: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          notes?: string | null
          protection_duration_days: number
          species: string
          status?: string
          suggested_by?: string | null
          type: string
        }
        Update: {
          active_ingredient?: string | null
          admin_note?: string | null
          application_method?: string
          brand?: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          notes?: string | null
          protection_duration_days?: number
          species?: string
          status?: string
          suggested_by?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "parasite_products_suggested_by_fkey"
            columns: ["suggested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parasite_products_suggested_by_fkey"
            columns: ["suggested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          notes: string | null
          payment_date: string | null
          payment_type: string | null
          pet_id: string | null
          record_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_type?: string | null
          pet_id?: string | null
          record_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_type?: string | null
          pet_id?: string | null
          record_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "payments_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "vaccine_records"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_activity_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string | null
          description: string
          entity_id: string | null
          entity_type: string | null
          id: string
          pet_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string | null
          description: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          pet_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string | null
          description?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          pet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_activity_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_activity_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_activity_log_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "pet_activity_log_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_adoptions: {
        Row: {
          created_at: string
          id: string
          pet_id: string
          requirements: string[] | null
          status: string
          story: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pet_id: string
          requirements?: string[] | null
          status?: string
          story?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pet_id?: string
          requirements?: string[] | null
          status?: string
          story?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_adoptions_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "pet_adoptions_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          description: string | null
          id: string
          pet_id: string
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          pet_id: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          pet_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_expenses_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "pet_expenses_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_gallery: {
        Row: {
          created_at: string
          id: string
          image_url: string
          pet_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          pet_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          pet_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_gallery_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "pet_gallery_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_invites: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string | null
          id: string
          invited_by: string
          pet_id: string
          role: string
          status: string
          token: string
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string | null
          id?: string
          invited_by: string
          pet_id: string
          role?: string
          status?: string
          token?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string
          pet_id?: string
          role?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_invites_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "pet_invites_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_journal_entries: {
        Row: {
          created_at: string
          data: Json
          entry_type: string
          id: string
          note: string | null
          pet_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          entry_type: string
          id?: string
          note?: string | null
          pet_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          entry_type?: string
          id?: string
          note?: string | null
          pet_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_journal_entries_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "pet_journal_entries_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_journal_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_journal_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_match_likes: {
        Row: {
          action: string
          created_at: string | null
          from_pet_id: string | null
          id: string
          to_pet_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          from_pet_id?: string | null
          id?: string
          to_pet_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          from_pet_id?: string | null
          id?: string
          to_pet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pet_match_likes_from_pet_id_fkey"
            columns: ["from_pet_id"]
            isOneToOne: false
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "pet_match_likes_from_pet_id_fkey"
            columns: ["from_pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_match_likes_to_pet_id_fkey"
            columns: ["to_pet_id"]
            isOneToOne: false
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "pet_match_likes_to_pet_id_fkey"
            columns: ["to_pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_matches: {
        Row: {
          created_at: string
          id: string
          pet_id: string
          status: string
          target_pet_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pet_id: string
          status: string
          target_pet_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pet_id?: string
          status?: string
          target_pet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_matches_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "pet_matches_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_matches_target_pet_id_fkey"
            columns: ["target_pet_id"]
            isOneToOne: false
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "pet_matches_target_pet_id_fkey"
            columns: ["target_pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_members: {
        Row: {
          id: string
          invited_by: string | null
          joined_at: string | null
          pet_id: string
          profile_id: string
          role: string
        }
        Insert: {
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          pet_id: string
          profile_id: string
          role?: string
        }
        Update: {
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          pet_id?: string
          profile_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_members_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "pet_members_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_notifications: {
        Row: {
          body: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean | null
          pet_id: string | null
          profile_id: string
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          pet_id?: string | null
          profile_id: string
          title: string
          type: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          pet_id?: string | null
          profile_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_notifications_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "pet_notifications_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_nutrition_profiles: {
        Row: {
          allergy_info: string[] | null
          created_at: string | null
          daily_grams: number | null
          food_brand: string | null
          food_product: string | null
          food_type: string | null
          id: string
          meals_per_day: number | null
          package_size_grams: number | null
          pet_id: string | null
          sensitivity_notes: string | null
          updated_at: string | null
        }
        Insert: {
          allergy_info?: string[] | null
          created_at?: string | null
          daily_grams?: number | null
          food_brand?: string | null
          food_product?: string | null
          food_type?: string | null
          id?: string
          meals_per_day?: number | null
          package_size_grams?: number | null
          pet_id?: string | null
          sensitivity_notes?: string | null
          updated_at?: string | null
        }
        Update: {
          allergy_info?: string[] | null
          created_at?: string | null
          daily_grams?: number | null
          food_brand?: string | null
          food_product?: string | null
          food_type?: string | null
          id?: string
          meals_per_day?: number | null
          package_size_grams?: number | null
          pet_id?: string | null
          sensitivity_notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pet_nutrition_profiles_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: true
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "pet_nutrition_profiles_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: true
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_owners: {
        Row: {
          created_at: string | null
          id: string
          pet_id: string | null
          profile_id: string | null
          role: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          pet_id?: string | null
          profile_id?: string | null
          role?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          pet_id?: string | null
          profile_id?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pet_owners_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "pet_owners_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_owners_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_owners_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_reports: {
        Row: {
          created_at: string | null
          date_range: string | null
          id: string
          pet_id: string
          profile_id: string
          report_type: string
          share_expires_at: string | null
          share_token: string | null
          verification_hash: string | null
        }
        Insert: {
          created_at?: string | null
          date_range?: string | null
          id?: string
          pet_id: string
          profile_id: string
          report_type: string
          share_expires_at?: string | null
          share_token?: string | null
          verification_hash?: string | null
        }
        Update: {
          created_at?: string | null
          date_range?: string | null
          id?: string
          pet_id?: string
          profile_id?: string
          report_type?: string
          share_expires_at?: string | null
          share_token?: string | null
          verification_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pet_reports_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "pet_reports_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_reports_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_reports_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pets: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          breed: string | null
          city: string | null
          color: string | null
          created_at: string | null
          district: string | null
          gender: string | null
          health_score: number | null
          id: string
          is_demo: boolean | null
          lifestyle: string | null
          microchip_no: string | null
          name: string
          owner_id: string | null
          passport_no: string | null
          pedigree_dam: string | null
          pedigree_sire: string | null
          size: string | null
          sos_contacts: Json | null
          species: string
          tattoo_no: string | null
          vet_company: string | null
          vet_email: string | null
          vet_name: string | null
          vet_phone: string | null
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          breed?: string | null
          city?: string | null
          color?: string | null
          created_at?: string | null
          district?: string | null
          gender?: string | null
          health_score?: number | null
          id?: string
          is_demo?: boolean | null
          lifestyle?: string | null
          microchip_no?: string | null
          name: string
          owner_id?: string | null
          passport_no?: string | null
          pedigree_dam?: string | null
          pedigree_sire?: string | null
          size?: string | null
          sos_contacts?: Json | null
          species: string
          tattoo_no?: string | null
          vet_company?: string | null
          vet_email?: string | null
          vet_name?: string | null
          vet_phone?: string | null
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          breed?: string | null
          city?: string | null
          color?: string | null
          created_at?: string | null
          district?: string | null
          gender?: string | null
          health_score?: number | null
          id?: string
          is_demo?: boolean | null
          lifestyle?: string | null
          microchip_no?: string | null
          name?: string
          owner_id?: string | null
          passport_no?: string | null
          pedigree_dam?: string | null
          pedigree_sire?: string | null
          size?: string | null
          sos_contacts?: Json | null
          species?: string
          tattoo_no?: string | null
          vet_company?: string | null
          vet_email?: string | null
          vet_name?: string | null
          vet_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      predictive_insights: {
        Row: {
          action: string
          confidence: number | null
          created_at: string | null
          id: string
          message: string
          pet_id: string | null
          priority: number
          reason_code: string
          risk_level: string
          risk_score: number
        }
        Insert: {
          action: string
          confidence?: number | null
          created_at?: string | null
          id?: string
          message: string
          pet_id?: string | null
          priority: number
          reason_code: string
          risk_level: string
          risk_score: number
        }
        Update: {
          action?: string
          confidence?: number | null
          created_at?: string | null
          id?: string
          message?: string
          pet_id?: string | null
          priority?: number
          reason_code?: string
          risk_level?: string
          risk_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "predictive_insights_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "predictive_insights_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          care_points: number | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          pro_trial_until: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          care_points?: number | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          pro_trial_until?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          care_points?: number | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          pro_trial_until?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          profile_id: string
          user_agent: string | null
        }
        Insert: {
          auth_key: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          profile_id: string
          user_agent?: string | null
        }
        Update: {
          auth_key?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          profile_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_rewards: {
        Row: {
          amount: number | null
          created_at: string | null
          id: string
          invite_id: string
          reward_type: string
          rewarded_profile_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          id?: string
          invite_id: string
          reward_type: string
          rewarded_profile_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          id?: string
          invite_id?: string
          reward_type?: string
          rewarded_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_rewards_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "pet_invites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_rewards_rewarded_profile_id_fkey"
            columns: ["rewarded_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_rewards_rewarded_profile_id_fkey"
            columns: ["rewarded_profile_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_pet_cards: {
        Row: {
          access_type: string
          can_log_entries: boolean
          caregiver_custom_notes: Json | null
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          owner_user_id: string
          pet_id: string
          share_token: string
          shared_with_user_id: string | null
          updated_at: string
        }
        Insert: {
          access_type?: string
          can_log_entries?: boolean
          caregiver_custom_notes?: Json | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          owner_user_id: string
          pet_id: string
          share_token: string
          shared_with_user_id?: string | null
          updated_at?: string
        }
        Update: {
          access_type?: string
          can_log_entries?: boolean
          caregiver_custom_notes?: Json | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          owner_user_id?: string
          pet_id?: string
          share_token?: string
          shared_with_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_pet_cards_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "shared_pet_cards_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_scanner_records: {
        Row: {
          created_at: string
          extracted_text: string | null
          id: string
          original_image_url: string | null
          pet_id: string
          record_type: string | null
          scan_date: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          extracted_text?: string | null
          id?: string
          original_image_url?: string | null
          pet_id: string
          record_type?: string | null
          scan_date?: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          extracted_text?: string | null
          id?: string
          original_image_url?: string | null
          pet_id?: string
          record_type?: string | null
          scan_date?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "smart_scanner_records_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "smart_scanner_records_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          caption: string | null
          created_at: string | null
          id: string
          image_url: string | null
          like_count: number | null
          owner_id: string | null
          pet_id: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          like_count?: number | null
          owner_id?: string | null
          pet_id?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          like_count?: number | null
          owner_id?: string | null
          pet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "social_posts_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          id: string
          plan: string
          profile_id: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          plan?: string
          profile_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          plan?: string
          profile_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      vaccine_brands: {
        Row: {
          admin_note: string | null
          brand_name: string
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_core: boolean
          manufacturer: string
          species: string
          status: string
          suggested_by: string | null
          vaccine_code: string
        }
        Insert: {
          admin_note?: string | null
          brand_name: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_core?: boolean
          manufacturer: string
          species: string
          status?: string
          suggested_by?: string | null
          vaccine_code: string
        }
        Update: {
          admin_note?: string | null
          brand_name?: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_core?: boolean
          manufacturer?: string
          species?: string
          status?: string
          suggested_by?: string | null
          vaccine_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "vaccine_brands_suggested_by_fkey"
            columns: ["suggested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccine_brands_suggested_by_fkey"
            columns: ["suggested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      vaccine_catalog_suggestions: {
        Row: {
          admin_note: string | null
          created_at: string | null
          id: string
          name_suggested: string
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          species: string
          status: string
          suggested_by: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string | null
          id?: string
          name_suggested: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          species: string
          status?: string
          suggested_by: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string | null
          id?: string
          name_suggested?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          species?: string
          status?: string
          suggested_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "vaccine_catalog_suggestions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccine_catalog_suggestions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccine_catalog_suggestions_suggested_by_fkey"
            columns: ["suggested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccine_catalog_suggestions_suggested_by_fkey"
            columns: ["suggested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      vaccine_protocols: {
        Row: {
          created_at: string | null
          doses: Json
          end_condition: Json
          id: string
          is_active: boolean
          is_core: boolean
          notes: string | null
          protocol_name: string
          repeat_frequency: string | null
          repeat_interval_days: number | null
          species: string
          updated_at: string | null
          vaccine_code: string
        }
        Insert: {
          created_at?: string | null
          doses?: Json
          end_condition?: Json
          id?: string
          is_active?: boolean
          is_core?: boolean
          notes?: string | null
          protocol_name: string
          repeat_frequency?: string | null
          repeat_interval_days?: number | null
          species: string
          updated_at?: string | null
          vaccine_code: string
        }
        Update: {
          created_at?: string | null
          doses?: Json
          end_condition?: Json
          id?: string
          is_active?: boolean
          is_core?: boolean
          notes?: string | null
          protocol_name?: string
          repeat_frequency?: string | null
          repeat_interval_days?: number | null
          species?: string
          updated_at?: string | null
          vaccine_code?: string
        }
        Relationships: []
      }
      vaccine_records: {
        Row: {
          applied_date: string
          brand_name: string | null
          clinic_id: string | null
          created_at: string | null
          dose_number: number | null
          id: string
          location: string | null
          lot_number: string | null
          next_due_date: string | null
          notes: string | null
          pet_id: string | null
          schedule_id: string | null
          vaccine_id: string | null
          vet_name: string | null
        }
        Insert: {
          applied_date: string
          brand_name?: string | null
          clinic_id?: string | null
          created_at?: string | null
          dose_number?: number | null
          id?: string
          location?: string | null
          lot_number?: string | null
          next_due_date?: string | null
          notes?: string | null
          pet_id?: string | null
          schedule_id?: string | null
          vaccine_id?: string | null
          vet_name?: string | null
        }
        Update: {
          applied_date?: string
          brand_name?: string | null
          clinic_id?: string | null
          created_at?: string | null
          dose_number?: number | null
          id?: string
          location?: string | null
          lot_number?: string | null
          next_due_date?: string | null
          notes?: string | null
          pet_id?: string | null
          schedule_id?: string | null
          vaccine_id?: string | null
          vet_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vaccine_records_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccine_records_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "vaccine_records_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccine_records_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "health_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccine_records_vaccine_id_fkey"
            columns: ["vaccine_id"]
            isOneToOne: false
            referencedRelation: "vaccines"
            referencedColumns: ["id"]
          },
        ]
      }
      vaccine_records_v2: {
        Row: {
          administered_at: string | null
          confidence_level: string
          created_at: string | null
          dose_number: number | null
          due_at: string | null
          id: string
          notes: string | null
          pet_id: string
          source: string
          status: string
          template_id: string | null
          vaccine_code: string
          vaccine_name: string
        }
        Insert: {
          administered_at?: string | null
          confidence_level?: string
          created_at?: string | null
          dose_number?: number | null
          due_at?: string | null
          id?: string
          notes?: string | null
          pet_id: string
          source?: string
          status?: string
          template_id?: string | null
          vaccine_code: string
          vaccine_name: string
        }
        Update: {
          administered_at?: string | null
          confidence_level?: string
          created_at?: string | null
          dose_number?: number | null
          due_at?: string | null
          id?: string
          notes?: string | null
          pet_id?: string
          source?: string
          status?: string
          template_id?: string | null
          vaccine_code?: string
          vaccine_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "vaccine_records_v2_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "vaccine_records_v2_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      vaccine_schedules: {
        Row: {
          created_at: string | null
          due_date: string
          id: string
          pet_id: string | null
          status: string | null
          vaccine_id: string | null
        }
        Insert: {
          created_at?: string | null
          due_date: string
          id?: string
          pet_id?: string | null
          status?: string | null
          vaccine_id?: string | null
        }
        Update: {
          created_at?: string | null
          due_date?: string
          id?: string
          pet_id?: string | null
          status?: string | null
          vaccine_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vaccine_schedules_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "vaccine_schedules_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccine_schedules_vaccine_id_fkey"
            columns: ["vaccine_id"]
            isOneToOne: false
            referencedRelation: "vaccines"
            referencedColumns: ["id"]
          },
        ]
      }
      vaccine_setup_profiles: {
        Row: {
          created_at: string | null
          id: string
          pet_id: string
          setup_mode: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          pet_id: string
          setup_mode: string
        }
        Update: {
          created_at?: string | null
          id?: string
          pet_id?: string
          setup_mode?: string
        }
        Relationships: [
          {
            foreignKeyName: "vaccine_setup_profiles_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: true
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "vaccine_setup_profiles_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: true
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      vaccine_templates: {
        Row: {
          category: string
          created_at: string | null
          dose_count: number
          dose_interval_days: number[] | null
          first_dose_week: number
          has_annual_booster: boolean
          id: string
          is_active: boolean | null
          mandatory_level: string
          profile_id: string | null
          protects_against: string[] | null
          recurrence_days: number | null
          species: string
          vaccine_code: string
          vaccine_name: string
        }
        Insert: {
          category?: string
          created_at?: string | null
          dose_count?: number
          dose_interval_days?: number[] | null
          first_dose_week?: number
          has_annual_booster?: boolean
          id?: string
          is_active?: boolean | null
          mandatory_level?: string
          profile_id?: string | null
          protects_against?: string[] | null
          recurrence_days?: number | null
          species: string
          vaccine_code: string
          vaccine_name: string
        }
        Update: {
          category?: string
          created_at?: string | null
          dose_count?: number
          dose_interval_days?: number[] | null
          first_dose_week?: number
          has_annual_booster?: boolean
          id?: string
          is_active?: boolean | null
          mandatory_level?: string
          profile_id?: string | null
          protects_against?: string[] | null
          recurrence_days?: number | null
          species?: string
          vaccine_code?: string
          vaccine_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "vaccine_templates_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccine_templates_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      vaccines: {
        Row: {
          code: string | null
          created_at: string | null
          description: string | null
          dose_interval_days: number | null
          id: string
          is_core: boolean | null
          name: string
          recommended_age_start_days: number | null
          species: string
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          dose_interval_days?: number | null
          id?: string
          is_core?: boolean | null
          name: string
          recommended_age_start_days?: number | null
          species: string
        }
        Update: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          dose_interval_days?: number | null
          id?: string
          is_core?: boolean | null
          name?: string
          recommended_age_start_days?: number | null
          species?: string
        }
        Relationships: []
      }
      vet_earnings: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          review_id: string | null
          status: string | null
          vet_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string | null
          id?: string
          review_id?: string | null
          status?: string | null
          vet_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          review_id?: string | null
          status?: string | null
          vet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vet_earnings_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: true
            referencedRelation: "vet_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vet_earnings_vet_id_fkey"
            columns: ["vet_id"]
            isOneToOne: false
            referencedRelation: "vets"
            referencedColumns: ["id"]
          },
        ]
      }
      vet_reviews: {
        Row: {
          claimed_at: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          pet_id: string | null
          profile_id: string | null
          risk_id: string | null
          sla_status: string | null
          status: string | null
          vet_id: string | null
        }
        Insert: {
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          pet_id?: string | null
          profile_id?: string | null
          risk_id?: string | null
          sla_status?: string | null
          status?: string | null
          vet_id?: string | null
        }
        Update: {
          claimed_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          pet_id?: string | null
          profile_id?: string | null
          risk_id?: string | null
          sla_status?: string | null
          status?: string | null
          vet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vet_reviews_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "vet_reviews_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vet_reviews_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vet_reviews_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vet_reviews_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: true
            referencedRelation: "predictive_insights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vet_reviews_vet_id_fkey"
            columns: ["vet_id"]
            isOneToOne: false
            referencedRelation: "vets"
            referencedColumns: ["id"]
          },
        ]
      }
      vet_status: {
        Row: {
          current_load: number | null
          is_online: boolean | null
          last_active_at: string | null
          vet_id: string
        }
        Insert: {
          current_load?: number | null
          is_online?: boolean | null
          last_active_at?: string | null
          vet_id: string
        }
        Update: {
          current_load?: number | null
          is_online?: boolean | null
          last_active_at?: string | null
          vet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vet_status_vet_id_fkey"
            columns: ["vet_id"]
            isOneToOne: true
            referencedRelation: "vets"
            referencedColumns: ["id"]
          },
        ]
      }
      vet_verifications: {
        Row: {
          approved: boolean | null
          created_at: string | null
          id: string
          note: string | null
          risk_id: string | null
          vet_id: string | null
        }
        Insert: {
          approved?: boolean | null
          created_at?: string | null
          id?: string
          note?: string | null
          risk_id?: string | null
          vet_id?: string | null
        }
        Update: {
          approved?: boolean | null
          created_at?: string | null
          id?: string
          note?: string | null
          risk_id?: string | null
          vet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vet_verifications_risk_id_fkey"
            columns: ["risk_id"]
            isOneToOne: true
            referencedRelation: "predictive_insights"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vet_verifications_vet_id_fkey"
            columns: ["vet_id"]
            isOneToOne: false
            referencedRelation: "vets"
            referencedColumns: ["id"]
          },
        ]
      }
      vets: {
        Row: {
          clinic_name: string | null
          id: string
          license_no: string | null
          name: string
          status: string | null
          verified: boolean | null
        }
        Insert: {
          clinic_name?: string | null
          id?: string
          license_no?: string | null
          name: string
          status?: string | null
          verified?: boolean | null
        }
        Update: {
          clinic_name?: string | null
          id?: string
          license_no?: string | null
          name?: string
          status?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      weight_logs: {
        Row: {
          body_condition_score: number | null
          height_cm: number | null
          id: string
          measured_at: string | null
          notes: string | null
          pet_id: string | null
          weight_kg: number
        }
        Insert: {
          body_condition_score?: number | null
          height_cm?: number | null
          id?: string
          measured_at?: string | null
          notes?: string | null
          pet_id?: string | null
          weight_kg: number
        }
        Update: {
          body_condition_score?: number | null
          height_cm?: number | null
          id?: string
          measured_at?: string | null
          notes?: string | null
          pet_id?: string | null
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "weight_logs_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "nutrition_overview"
            referencedColumns: ["pet_id"]
          },
          {
            foreignKeyName: "weight_logs_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      daily_user_metrics: {
        Row: {
          completed_tasks: number | null
          day: string | null
          payments: number | null
          profile_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_stream_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_stream_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_overview: {
        Row: {
          avg_appetite_7d: number | null
          current_stock_grams: number | null
          daily_grams: number | null
          days_left: number | null
          estimated_daily_usage: number | null
          food_brand: string | null
          food_product: string | null
          food_type: string | null
          latest_weight_kg: number | null
          low_stock_threshold_days: number | null
          meals_per_day: number | null
          pet_id: string | null
          pet_name: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          care_points: number | null
          created_at: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          pro_trial_until: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
        }
        Insert: {
          care_points?: number | null
          created_at?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          pro_trial_until?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Update: {
          care_points?: number | null
          created_at?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          pro_trial_until?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_update_user: {
        Args: {
          new_display_name?: string
          new_durum?: string
          new_email?: string
          new_role_id?: string
          target_user_id: string
        }
        Returns: Json
      }
      create_pet_notification: {
        Args: {
          p_body?: string
          p_entity_id?: string
          p_entity_type?: string
          p_pet_id: string
          p_profile_id: string
          p_title: string
          p_type: string
        }
        Returns: undefined
      }
      decrement_vet_load: { Args: { p_vet_id: string }; Returns: undefined }
      generate_schedule_notifications: { Args: never; Returns: number }
      get_nearby_clinics: {
        Args: { max_dist_km?: number; user_lat: number; user_long: number }
        Returns: {
          address: string
          city: string
          dist_km: number
          district: string
          id: string
          is_verified: boolean
          latitude: number
          longitude: number
          name: string
          tags: string[]
        }[]
      }
      increment_care_points: {
        Args: { p_amount: number; p_profile_id: string }
        Returns: undefined
      }
      increment_vet_load: { Args: { p_vet_id: string }; Returns: undefined }
      process_smart_scan_results: {
        Args: { p_parsed_data: Json; p_pet_id: string; p_record_type: string }
        Returns: Json
      }
      run_escalation_check: {
        Args: never
        Returns: {
          hours_overdue: number
          level: string
          pet_id: string
          schedule_id: string
        }[]
      }
      user_has_pet_access: { Args: { p_pet_id: string }; Returns: boolean }
      user_is_pet_member: { Args: { p_pet_id: string }; Returns: boolean }
      user_pet_role: { Args: { p_pet_id: string }; Returns: string }
    }
    Enums: {
      appointment_status: "pending" | "confirmed" | "cancelled" | "completed"
      user_role: "owner" | "vet" | "admin" | "founder"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      appointment_status: ["pending", "confirmed", "cancelled", "completed"],
      user_role: ["owner", "vet", "admin", "founder"],
    },
  },
} as const
