export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
        ]
      }
      admin_audit_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: []
      }
      admin_vet_override_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string
          article_id: string
          created_at: string
          id: string
          new_requirement: string
          old_requirement: string
          reason: string
          reference_log_id: string | null
        }
        Insert: {
          action?: string
          actor_id?: string | null
          actor_role: string
          article_id: string
          created_at?: string
          id?: string
          new_requirement: string
          old_requirement: string
          reason: string
          reference_log_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string
          article_id?: string
          created_at?: string
          id?: string
          new_requirement?: string
          old_requirement?: string
          reason?: string
          reference_log_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_vet_override_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_vet_override_logs_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_vet_override_logs_reference_log_id_fkey"
            columns: ["reference_log_id"]
            isOneToOne: false
            referencedRelation: "admin_vet_override_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          date: string | null
          feature: string
          id: string
          profile_id: string | null
          used_at: string | null
        }
        Insert: {
          date?: string | null
          feature: string
          id?: string
          profile_id?: string | null
          used_at?: string | null
        }
        Update: {
          date?: string | null
          feature?: string
          id?: string
          profile_id?: string | null
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      article_media: {
        Row: {
          alt_text: string
          article_id: string
          caption: string | null
          created_at: string | null
          created_by: string | null
          display_order: number | null
          external_url: string | null
          id: string
          is_active: boolean | null
          media_type: string
          rights_note: string | null
          rights_status: string
          source_name: string | null
          source_url: string | null
          storage_path: string | null
          updated_at: string | null
        }
        Insert: {
          alt_text: string
          article_id: string
          caption?: string | null
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          external_url?: string | null
          id?: string
          is_active?: boolean | null
          media_type: string
          rights_note?: string | null
          rights_status: string
          source_name?: string | null
          source_url?: string | null
          storage_path?: string | null
          updated_at?: string | null
        }
        Update: {
          alt_text?: string
          article_id?: string
          caption?: string | null
          created_at?: string | null
          created_by?: string | null
          display_order?: number | null
          external_url?: string | null
          id?: string
          is_active?: boolean | null
          media_type?: string
          rights_note?: string | null
          rights_status?: string
          source_name?: string | null
          source_url?: string | null
          storage_path?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "article_media_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_media_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_pet_states: {
        Row: {
          article_id: string
          created_at: string
          dismissed_at: string | null
          id: string
          last_shown_at: string | null
          last_viewed_at: string | null
          pet_id: string
          read_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          article_id: string
          created_at?: string
          dismissed_at?: string | null
          id?: string
          last_shown_at?: string | null
          last_viewed_at?: string | null
          pet_id: string
          read_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          article_id?: string
          created_at?: string
          dismissed_at?: string | null
          id?: string
          last_shown_at?: string | null
          last_viewed_at?: string | null
          pet_id?: string
          read_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_pet_states_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_pet_states_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      article_revisions: {
        Row: {
          article_id: string
          change_summary: string | null
          changed_at: string | null
          changed_by: string | null
          content_snapshot: Json
          id: string
          version_number: number
        }
        Insert: {
          article_id: string
          change_summary?: string | null
          changed_at?: string | null
          changed_by?: string | null
          content_snapshot: Json
          id?: string
          version_number: number
        }
        Update: {
          article_id?: string
          change_summary?: string | null
          changed_at?: string | null
          changed_by?: string | null
          content_snapshot?: Json
          id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "article_revisions_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_revisions_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_saves: {
        Row: {
          article_id: string | null
          id: string
          saved_at: string | null
          user_id: string | null
        }
        Insert: {
          article_id?: string | null
          id?: string
          saved_at?: string | null
          user_id?: string | null
        }
        Update: {
          article_id?: string | null
          id?: string
          saved_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "article_saves_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_sources: {
        Row: {
          article_id: string
          checked_at: string | null
          created_at: string | null
          created_by: string | null
          display_in_article: boolean | null
          id: string
          instagram_username: string | null
          is_active: boolean | null
          published_at: string | null
          publisher: string | null
          short_description: string | null
          show_source_link: boolean | null
          show_source_name: boolean | null
          sort_order: number | null
          source_name: string | null
          source_title: string
          source_type: string
          source_url: string | null
          updated_at: string | null
          verification_status: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          article_id: string
          checked_at?: string | null
          created_at?: string | null
          created_by?: string | null
          display_in_article?: boolean | null
          id?: string
          instagram_username?: string | null
          is_active?: boolean | null
          published_at?: string | null
          publisher?: string | null
          short_description?: string | null
          show_source_link?: boolean | null
          show_source_name?: boolean | null
          sort_order?: number | null
          source_name?: string | null
          source_title: string
          source_type?: string
          source_url?: string | null
          updated_at?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          article_id?: string
          checked_at?: string | null
          created_at?: string | null
          created_by?: string | null
          display_in_article?: boolean | null
          id?: string
          instagram_username?: string | null
          is_active?: boolean | null
          published_at?: string | null
          publisher?: string | null
          short_description?: string | null
          show_source_link?: boolean | null
          show_source_name?: boolean | null
          sort_order?: number | null
          source_name?: string | null
          source_title?: string
          source_type?: string
          source_url?: string | null
          updated_at?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "article_sources_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_sources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_sources_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          archived_at: string | null
          author: string | null
          author_id: string | null
          category: string | null
          content: string
          content_reviewed_at: string | null
          content_reviewed_by: string | null
          content_version: number | null
          cover_url: string | null
          created_at: string | null
          end_date: string | null
          excerpt: string | null
          freshness_type: string | null
          id: string
          is_medical_content: boolean | null
          is_published: boolean | null
          is_sponsored: boolean | null
          latest_change_summary: string | null
          like_count: number | null
          next_review_at: string | null
          priority_order: number | null
          published_at: string | null
          published_by: string | null
          read_time_minutes: number | null
          references_list: string[] | null
          review_interval_days: number | null
          slug: string
          source_checked_at: string | null
          source_job_id: string | null
          species_filter: string[] | null
          sponsor_name: string | null
          start_date: string | null
          tags: string[] | null
          target_breed_keys: string[] | null
          target_breed_traits: string[] | null
          target_genders: string[] | null
          target_life_stages: string[] | null
          target_neutered_status: string | null
          target_seasons: string[] | null
          title: string
          vet_review_override_at: string | null
          vet_review_override_by: string | null
          vet_review_override_reason: string | null
          vet_review_requirement: string
          vet_review_status: string | null
          vet_reviewed_at: string | null
          vet_reviewed_by: string | null
          view_count: number | null
        }
        Insert: {
          archived_at?: string | null
          author?: string | null
          author_id?: string | null
          category?: string | null
          content: string
          content_reviewed_at?: string | null
          content_reviewed_by?: string | null
          content_version?: number | null
          cover_url?: string | null
          created_at?: string | null
          end_date?: string | null
          excerpt?: string | null
          freshness_type?: string | null
          id?: string
          is_medical_content?: boolean | null
          is_published?: boolean | null
          is_sponsored?: boolean | null
          latest_change_summary?: string | null
          like_count?: number | null
          next_review_at?: string | null
          priority_order?: number | null
          published_at?: string | null
          published_by?: string | null
          read_time_minutes?: number | null
          references_list?: string[] | null
          review_interval_days?: number | null
          slug: string
          source_checked_at?: string | null
          source_job_id?: string | null
          species_filter?: string[] | null
          sponsor_name?: string | null
          start_date?: string | null
          tags?: string[] | null
          target_breed_keys?: string[] | null
          target_breed_traits?: string[] | null
          target_genders?: string[] | null
          target_life_stages?: string[] | null
          target_neutered_status?: string | null
          target_seasons?: string[] | null
          title: string
          vet_review_override_at?: string | null
          vet_review_override_by?: string | null
          vet_review_override_reason?: string | null
          vet_review_requirement?: string
          vet_review_status?: string | null
          vet_reviewed_at?: string | null
          vet_reviewed_by?: string | null
          view_count?: number | null
        }
        Update: {
          archived_at?: string | null
          author?: string | null
          author_id?: string | null
          category?: string | null
          content?: string
          content_reviewed_at?: string | null
          content_reviewed_by?: string | null
          content_version?: number | null
          cover_url?: string | null
          created_at?: string | null
          end_date?: string | null
          excerpt?: string | null
          freshness_type?: string | null
          id?: string
          is_medical_content?: boolean | null
          is_published?: boolean | null
          is_sponsored?: boolean | null
          latest_change_summary?: string | null
          like_count?: number | null
          next_review_at?: string | null
          priority_order?: number | null
          published_at?: string | null
          published_by?: string | null
          read_time_minutes?: number | null
          references_list?: string[] | null
          review_interval_days?: number | null
          slug?: string
          source_checked_at?: string | null
          source_job_id?: string | null
          species_filter?: string[] | null
          sponsor_name?: string | null
          start_date?: string | null
          tags?: string[] | null
          target_breed_keys?: string[] | null
          target_breed_traits?: string[] | null
          target_genders?: string[] | null
          target_life_stages?: string[] | null
          target_neutered_status?: string | null
          target_seasons?: string[] | null
          title?: string
          vet_review_override_at?: string | null
          vet_review_override_by?: string | null
          vet_review_override_reason?: string | null
          vet_review_requirement?: string
          vet_review_status?: string | null
          vet_reviewed_at?: string | null
          vet_reviewed_by?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_content_reviewed_by_fkey"
            columns: ["content_reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_source_job_id_fkey"
            columns: ["source_job_id"]
            isOneToOne: false
            referencedRelation: "content_generation_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_vet_review_override_by_fkey"
            columns: ["vet_review_override_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_vet_reviewed_by_fkey"
            columns: ["vet_reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      bookings: {
        Row: {
          booking_date: string
          business_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          owner_id: string | null
          pet_id: string | null
          service_type: string
          status: string | null
          total_price: number | null
          updated_at: string | null
        }
        Insert: {
          booking_date: string
          business_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          owner_id?: string | null
          pet_id?: string | null
          service_type: string
          status?: string | null
          total_price?: number | null
          updated_at?: string | null
        }
        Update: {
          booking_date?: string
          business_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          owner_id?: string | null
          pet_id?: string | null
          service_type?: string
          status?: string | null
          total_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      breeding_applications: {
        Row: {
          applicant_pet_id: string
          applicant_user_id: string
          created_at: string
          id: string
          kvkk_consent: boolean
          kvkk_consent_at: string | null
          listing_id: string
          message: string | null
          owner_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          applicant_pet_id: string
          applicant_user_id: string
          created_at?: string
          id?: string
          kvkk_consent?: boolean
          kvkk_consent_at?: string | null
          listing_id: string
          message?: string | null
          owner_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          applicant_pet_id?: string
          applicant_user_id?: string
          created_at?: string
          id?: string
          kvkk_consent?: boolean
          kvkk_consent_at?: string | null
          listing_id?: string
          message?: string | null
          owner_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "breeding_applications_applicant_pet_id_fkey"
            columns: ["applicant_pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "breeding_applications_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "breeding_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      breeding_consent_records: {
        Row: {
          application_id: string
          consent_scope: Json
          consent_text_version: string
          consent_type: string
          created_at: string
          expires_at: string | null
          granted_at: string
          id: string
          user_id: string
          withdrawn_at: string | null
        }
        Insert: {
          application_id: string
          consent_scope?: Json
          consent_text_version: string
          consent_type: string
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          id?: string
          user_id: string
          withdrawn_at?: string | null
        }
        Update: {
          application_id?: string
          consent_scope?: Json
          consent_text_version?: string
          consent_type?: string
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          id?: string
          user_id?: string
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "breeding_consent_records_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "breeding_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      breeding_listings: {
        Row: {
          created_at: string
          estrus_end_date: string | null
          estrus_notification_enabled: boolean | null
          estrus_start_date: string | null
          experience_level: string | null
          id: string
          notes: string | null
          pet_id: string
          photo_url: string | null
          preferred_date_end: string | null
          preferred_date_start: string | null
          purpose: string
          requirements: string[] | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          estrus_end_date?: string | null
          estrus_notification_enabled?: boolean | null
          estrus_start_date?: string | null
          experience_level?: string | null
          id?: string
          notes?: string | null
          pet_id: string
          photo_url?: string | null
          preferred_date_end?: string | null
          preferred_date_start?: string | null
          purpose?: string
          requirements?: string[] | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          estrus_end_date?: string | null
          estrus_notification_enabled?: boolean | null
          estrus_start_date?: string | null
          experience_level?: string | null
          id?: string
          notes?: string | null
          pet_id?: string
          photo_url?: string | null
          preferred_date_end?: string | null
          preferred_date_start?: string | null
          purpose?: string
          requirements?: string[] | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "breeding_listings_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      business_availability: {
        Row: {
          business_id: string | null
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          is_available: boolean | null
          start_time: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          is_available?: boolean | null
          start_time: string
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          is_available?: boolean | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_availability_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          business_name: string
          business_type: string
          city: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          district: string | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          lat: number | null
          lng: number | null
          phone: string | null
          profile_id: string | null
          rating: number | null
          review_count: number | null
          services: Json | null
          website: string | null
          working_hours: Json | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          business_name: string
          business_type: string
          city?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          district?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          lat?: number | null
          lng?: number | null
          phone?: string | null
          profile_id?: string | null
          rating?: number | null
          review_count?: number | null
          services?: Json | null
          website?: string | null
          working_hours?: Json | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          business_name?: string
          business_type?: string
          city?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          district?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          lat?: number | null
          lng?: number | null
          phone?: string | null
          profile_id?: string | null
          rating?: number | null
          review_count?: number | null
          services?: Json | null
          website?: string | null
          working_hours?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "business_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          is_clinic_admin: boolean
          profile_id: string | null
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string | null
          id?: string
          is_clinic_admin?: boolean
          profile_id?: string | null
        }
        Update: {
          clinic_id?: string | null
          created_at?: string | null
          id?: string
          is_clinic_admin?: boolean
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
        ]
      }
      clinics: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          is_public: boolean | null
          name: string
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          name: string
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
        }
        Relationships: []
      }
      content_generation_job_sources: {
        Row: {
          canonical_url: string | null
          checked_at: string | null
          content_type: string | null
          created_at: string | null
          domain: string | null
          external_identifier: string | null
          external_identifier_type: string | null
          final_url: string | null
          grounding_chunk_index: number | null
          grounding_provider: string | null
          http_status: number | null
          id: string
          job_id: string
          original_grounding_url: string | null
          page_h1: string | null
          page_title: string | null
          publication_date: string | null
          published_at: string | null
          publisher: string | null
          semantic_relevance: string | null
          semantic_validation_reason: string | null
          source_excerpt: string | null
          source_title: string
          source_type: string
          source_url: string | null
          technical_validation_status: string | null
          updated_at: string | null
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          canonical_url?: string | null
          checked_at?: string | null
          content_type?: string | null
          created_at?: string | null
          domain?: string | null
          external_identifier?: string | null
          external_identifier_type?: string | null
          final_url?: string | null
          grounding_chunk_index?: number | null
          grounding_provider?: string | null
          http_status?: number | null
          id?: string
          job_id: string
          original_grounding_url?: string | null
          page_h1?: string | null
          page_title?: string | null
          publication_date?: string | null
          published_at?: string | null
          publisher?: string | null
          semantic_relevance?: string | null
          semantic_validation_reason?: string | null
          source_excerpt?: string | null
          source_title: string
          source_type?: string
          source_url?: string | null
          technical_validation_status?: string | null
          updated_at?: string | null
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          canonical_url?: string | null
          checked_at?: string | null
          content_type?: string | null
          created_at?: string | null
          domain?: string | null
          external_identifier?: string | null
          external_identifier_type?: string | null
          final_url?: string | null
          grounding_chunk_index?: number | null
          grounding_provider?: string | null
          http_status?: number | null
          id?: string
          job_id?: string
          original_grounding_url?: string | null
          page_h1?: string | null
          page_title?: string | null
          publication_date?: string | null
          published_at?: string | null
          publisher?: string | null
          semantic_relevance?: string | null
          semantic_validation_reason?: string | null
          source_excerpt?: string | null
          source_title?: string
          source_type?: string
          source_url?: string | null
          technical_validation_status?: string | null
          updated_at?: string | null
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_generation_job_sources_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "content_generation_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_generation_job_sources_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_generation_jobs: {
        Row: {
          article_id: string | null
          change_summary: string | null
          classification_status: string | null
          created_at: string | null
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          generated_at: string | null
          generated_by: string | null
          generated_draft: Json | null
          generation_attempts: number | null
          generation_status: string
          id: string
          job_type: string
          last_error: string | null
          model_name: string | null
          prompt_version: number | null
          proposed_targeting: Json | null
          rejection_reason: string | null
          required_source_count: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          topic: string
          updated_at: string | null
        }
        Insert: {
          article_id?: string | null
          change_summary?: string | null
          classification_status?: string | null
          created_at?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          generated_at?: string | null
          generated_by?: string | null
          generated_draft?: Json | null
          generation_attempts?: number | null
          generation_status?: string
          id?: string
          job_type: string
          last_error?: string | null
          model_name?: string | null
          prompt_version?: number | null
          proposed_targeting?: Json | null
          rejection_reason?: string | null
          required_source_count?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          topic: string
          updated_at?: string | null
        }
        Update: {
          article_id?: string | null
          change_summary?: string | null
          classification_status?: string | null
          created_at?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          generated_at?: string | null
          generated_by?: string | null
          generated_draft?: Json | null
          generation_attempts?: number | null
          generation_status?: string
          id?: string
          job_type?: string
          last_error?: string | null
          model_name?: string | null
          prompt_version?: number | null
          proposed_targeting?: Json | null
          rejection_reason?: string | null
          required_source_count?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          topic?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_generation_jobs_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_generation_jobs_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_generation_jobs_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_source_verification_audits: {
        Row: {
          action: string
          actor_id: string
          actor_role: string
          confirmed_relevance: boolean
          confirmed_title_url: boolean
          created_at: string
          id: string
          job_id: string
          source_id: string
          source_version_hash: string | null
        }
        Insert: {
          action: string
          actor_id: string
          actor_role: string
          confirmed_relevance?: boolean
          confirmed_title_url?: boolean
          created_at?: string
          id?: string
          job_id: string
          source_id: string
          source_version_hash?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          actor_role?: string
          confirmed_relevance?: boolean
          confirmed_title_url?: boolean
          created_at?: string
          id?: string
          job_id?: string
          source_id?: string
          source_version_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_source_verification_audits_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_source_verification_audits_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "content_generation_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_source_verification_audits_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "content_generation_job_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          booking_id: string | null
          created_at: string | null
          id: string
          last_message_at: string | null
          last_message_preview: string | null
          participant_1: string | null
          participant_2: string | null
          unread_count_1: number | null
          unread_count_2: number | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          participant_1?: string | null
          participant_2?: string | null
          unread_count_1?: number | null
          unread_count_2?: number | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          participant_1?: string | null
          participant_2?: string | null
          unread_count_1?: number | null
          unread_count_2?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      data_quality_configs: {
        Row: {
          created_at: string | null
          field_name: string
          fill_rate_threshold: number | null
          id: string
          is_required: boolean | null
          smart_card_message: string | null
          species: string
        }
        Insert: {
          created_at?: string | null
          field_name: string
          fill_rate_threshold?: number | null
          id?: string
          is_required?: boolean | null
          smart_card_message?: string | null
          species: string
        }
        Update: {
          created_at?: string | null
          field_name?: string
          fill_rate_threshold?: number | null
          id?: string
          is_required?: boolean | null
          smart_card_message?: string | null
          species?: string
        }
        Relationships: []
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
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      discovered_external_contents: {
        Row: {
          article_id: string | null
          canonical_url: string
          content_hash: string
          created_at: string
          excerpt: string | null
          external_content_id: string
          id: string
          job_id: string | null
          metadata: Json | null
          permalink: string
          processing_status: string
          published_at: string | null
          raw_caption: string | null
          rejection_reason: string | null
          source_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          article_id?: string | null
          canonical_url: string
          content_hash: string
          created_at?: string
          excerpt?: string | null
          external_content_id: string
          id?: string
          job_id?: string | null
          metadata?: Json | null
          permalink: string
          processing_status?: string
          published_at?: string | null
          raw_caption?: string | null
          rejection_reason?: string | null
          source_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          article_id?: string | null
          canonical_url?: string
          content_hash?: string
          created_at?: string
          excerpt?: string | null
          external_content_id?: string
          id?: string
          job_id?: string | null
          metadata?: Json | null
          permalink?: string
          processing_status?: string
          published_at?: string | null
          raw_caption?: string | null
          rejection_reason?: string | null
          source_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discovered_external_contents_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discovered_external_contents_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "content_generation_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discovered_external_contents_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "monitored_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendees: {
        Row: {
          created_at: string | null
          event_id: string | null
          id: string
          pet_id: string | null
          profile_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          pet_id?: string | null
          profile_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          pet_id?: string | null
          profile_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
        ]
      }
      events: {
        Row: {
          created_at: string | null
          current_attendees: number | null
          description: string | null
          event_date: string
          id: string
          is_active: boolean | null
          location: string | null
          max_attendees: number | null
          organizer_id: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          current_attendees?: number | null
          description?: string | null
          event_date: string
          id?: string
          is_active?: boolean | null
          location?: string | null
          max_attendees?: number | null
          organizer_id?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          current_attendees?: number | null
          description?: string | null
          event_date?: string
          id?: string
          is_active?: boolean | null
          location?: string | null
          max_attendees?: number | null
          organizer_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      food_brand_aliases: {
        Row: {
          alias: string
          brand_id: string
          created_at: string
          id: string
          normalized_alias: string
        }
        Insert: {
          alias: string
          brand_id: string
          created_at?: string
          id?: string
          normalized_alias: string
        }
        Update: {
          alias?: string
          brand_id?: string
          created_at?: string
          id?: string
          normalized_alias?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_brand_aliases_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "food_brands"
            referencedColumns: ["id"]
          },
        ]
      }
      food_brands: {
        Row: {
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          manufacturer_id: string | null
          normalized_name: string
          official_tr_url: string | null
          source_url: string | null
          updated_at: string
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          manufacturer_id?: string | null
          normalized_name: string
          official_tr_url?: string | null
          source_url?: string | null
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          manufacturer_id?: string | null
          normalized_name?: string
          official_tr_url?: string | null
          source_url?: string | null
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_brands_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "food_manufacturers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_brands_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      food_inventory: {
        Row: {
          current_stock_grams: number | null
          estimated_daily_usage: number | null
          id: string
          last_refill_date: string | null
          low_stock_threshold_days: number | null
          next_refill_estimate: string | null
          pet_id: string | null
        }
        Insert: {
          current_stock_grams?: number | null
          estimated_daily_usage?: number | null
          id?: string
          last_refill_date?: string | null
          low_stock_threshold_days?: number | null
          next_refill_estimate?: string | null
          pet_id?: string | null
        }
        Update: {
          current_stock_grams?: number | null
          estimated_daily_usage?: number | null
          id?: string
          last_refill_date?: string | null
          low_stock_threshold_days?: number | null
          next_refill_estimate?: string | null
          pet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_inventory_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      food_label_versions: {
        Row: {
          additives_raw: string | null
          analytical_constituents: Json
          created_at: string
          energy_kcal_per_kg: number | null
          feeding_guide: Json
          food_sku_id: string
          id: string
          ingredients_raw: string | null
          label_back_url: string | null
          label_front_url: string | null
          source_url: string | null
          updated_at: string
          valid_from: string | null
          valid_to: string | null
          verification_status: string
          verified_at: string | null
          verified_by: string | null
          version_label: string | null
        }
        Insert: {
          additives_raw?: string | null
          analytical_constituents?: Json
          created_at?: string
          energy_kcal_per_kg?: number | null
          feeding_guide?: Json
          food_sku_id: string
          id?: string
          ingredients_raw?: string | null
          label_back_url?: string | null
          label_front_url?: string | null
          source_url?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
          version_label?: string | null
        }
        Update: {
          additives_raw?: string | null
          analytical_constituents?: Json
          created_at?: string
          energy_kcal_per_kg?: number | null
          feeding_guide?: Json
          food_sku_id?: string
          id?: string
          ingredients_raw?: string | null
          label_back_url?: string | null
          label_front_url?: string | null
          source_url?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
          version_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_label_versions_food_sku_id_fkey"
            columns: ["food_sku_id"]
            isOneToOne: false
            referencedRelation: "food_skus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_label_versions_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      food_manufacturers: {
        Row: {
          country_code: string | null
          created_at: string
          id: string
          is_active: boolean
          legal_name: string
          official_url: string | null
          source_url: string | null
          trade_name: string | null
          updated_at: string
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          legal_name: string
          official_url?: string | null
          source_url?: string | null
          trade_name?: string | null
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          legal_name?: string
          official_url?: string | null
          source_url?: string | null
          trade_name?: string | null
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_manufacturers_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      food_product_families: {
        Row: {
          brand_id: string
          created_at: string
          food_form: string
          id: string
          is_active: boolean
          life_stage: string
          marketing_claims: string[]
          normalized_name: string
          nutritional_role: string
          official_name: string
          primary_proteins: string[]
          source_url: string | null
          species: string
          target_attributes: Json
          updated_at: string
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          brand_id: string
          created_at?: string
          food_form: string
          id?: string
          is_active?: boolean
          life_stage: string
          marketing_claims?: string[]
          normalized_name: string
          nutritional_role: string
          official_name: string
          primary_proteins?: string[]
          source_url?: string | null
          species: string
          target_attributes?: Json
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          brand_id?: string
          created_at?: string
          food_form?: string
          id?: string
          is_active?: boolean
          life_stage?: string
          marketing_claims?: string[]
          normalized_name?: string
          nutritional_role?: string
          official_name?: string
          primary_proteins?: string[]
          source_url?: string | null
          species?: string
          target_attributes?: Json
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_product_families_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "food_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_product_families_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      food_skus: {
        Row: {
          country_of_origin: string | null
          created_at: string
          gtin: string | null
          id: string
          manufacturer_product_code: string | null
          market_status: string
          package_size_grams: number
          package_type: string | null
          product_family_id: string
          source_url: string | null
          updated_at: string
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          country_of_origin?: string | null
          created_at?: string
          gtin?: string | null
          id?: string
          manufacturer_product_code?: string | null
          market_status?: string
          package_size_grams: number
          package_type?: string | null
          product_family_id: string
          source_url?: string | null
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          country_of_origin?: string | null
          created_at?: string
          gtin?: string | null
          id?: string
          manufacturer_product_code?: string | null
          market_status?: string
          package_size_grams?: number
          package_type?: string | null
          product_family_id?: string
          source_url?: string | null
          updated_at?: string
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_skus_product_family_id_fkey"
            columns: ["product_family_id"]
            isOneToOne: false
            referencedRelation: "food_product_families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_skus_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_events: {
        Row: {
          created_at: string | null
          event_name: string
          id: string
          pet_id: string | null
          profile_id: string | null
          properties: Json | null
          screen: string | null
          session_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_name: string
          id?: string
          pet_id?: string | null
          profile_id?: string | null
          properties?: Json | null
          screen?: string | null
          session_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_name?: string
          id?: string
          pet_id?: string | null
          profile_id?: string | null
          properties?: Json | null
          screen?: string | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funnel_events_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_events_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_records: {
        Row: {
          created_at: string | null
          height_cm: number | null
          id: string
          notes: string | null
          pet_id: string | null
          recorded_at: string
          weight_kg: number | null
        }
        Insert: {
          created_at?: string | null
          height_cm?: number | null
          id?: string
          notes?: string | null
          pet_id?: string | null
          recorded_at?: string
          weight_kg?: number | null
        }
        Update: {
          created_at?: string | null
          height_cm?: number | null
          id?: string
          notes?: string | null
          pet_id?: string | null
          recorded_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "growth_records_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
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
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      health_measurements: {
        Row: {
          created_at: string | null
          id: string
          measured_at: string
          measurement_type: string
          pet_id: string | null
          unit: string | null
          value: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          measured_at: string
          measurement_type: string
          pet_id?: string | null
          unit?: string | null
          value: number
        }
        Update: {
          created_at?: string | null
          id?: string
          measured_at?: string
          measurement_type?: string
          pet_id?: string | null
          unit?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "health_measurements_pet_id_fkey"
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
          scan_details: Json | null
          source: string | null
          usage_duration: string | null
        }
        Insert: {
          created_at?: string | null
          dose?: string | null
          id?: string
          is_active?: boolean | null
          medication_name: string
          pet_id?: string | null
          scan_details?: Json | null
          source?: string | null
          usage_duration?: string | null
        }
        Update: {
          created_at?: string | null
          dose?: string | null
          id?: string
          is_active?: boolean | null
          medication_name?: string
          pet_id?: string | null
          scan_details?: Json | null
          source?: string | null
          usage_duration?: string | null
        }
        Relationships: [
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
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      health_records: {
        Row: {
          created_at: string | null
          date: string | null
          document_path: string | null
          id: string
          notes: string | null
          pet_id: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          document_path?: string | null
          id?: string
          notes?: string | null
          pet_id?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string | null
          date?: string | null
          document_path?: string | null
          id?: string
          notes?: string | null
          pet_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_records_pet_id_fkey"
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
          updated_at: string
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
          updated_at?: string
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
          updated_at?: string
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
            foreignKeyName: "health_schedules_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
        ]
      }
      health_treatments: {
        Row: {
          category: string | null
          clinic_name: string | null
          cost: number | null
          created_at: string | null
          disease_name: string
          documents: string[] | null
          end_date: string | null
          expense_items: string | null
          id: string
          payment_status: string | null
          pet_id: string | null
          start_date: string
          status: string | null
          treatment_methods: string | null
        }
        Insert: {
          category?: string | null
          clinic_name?: string | null
          cost?: number | null
          created_at?: string | null
          disease_name: string
          documents?: string[] | null
          end_date?: string | null
          expense_items?: string | null
          id?: string
          payment_status?: string | null
          pet_id?: string | null
          start_date?: string
          status?: string | null
          treatment_methods?: string | null
        }
        Update: {
          category?: string | null
          clinic_name?: string | null
          cost?: number | null
          created_at?: string | null
          disease_name?: string
          documents?: string[] | null
          end_date?: string | null
          expense_items?: string | null
          id?: string
          payment_status?: string | null
          pet_id?: string | null
          start_date?: string
          status?: string | null
          treatment_methods?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "health_treatments_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
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
        ]
      }
      lost_report_contacts: {
        Row: {
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          message: string | null
          report_id: string | null
        }
        Insert: {
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          message?: string | null
          report_id?: string | null
        }
        Update: {
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          message?: string | null
          report_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lost_report_contacts_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "lost_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lost_report_contacts_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "sos_public_view"
            referencedColumns: ["id"]
          },
        ]
      }
      lost_report_drafts: {
        Row: {
          created_at: string
          expires_at: string
          payload: Json
          profile_id: string | null
          session_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          payload?: Json
          profile_id?: string | null
          session_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          payload?: Json
          profile_id?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lost_report_drafts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          latitude: number | null
          longitude: number | null
          pet_id: string | null
          photo_url: string | null
          source_session_id: string | null
          status: string | null
        }
        Insert: {
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          last_seen_at?: string | null
          last_seen_location: string
          latitude?: number | null
          longitude?: number | null
          pet_id?: string | null
          photo_url?: string | null
          source_session_id?: string | null
          status?: string | null
        }
        Update: {
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          last_seen_at?: string | null
          last_seen_location?: string
          latitude?: number | null
          longitude?: number | null
          pet_id?: string | null
          photo_url?: string | null
          source_session_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lost_reports_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_clicks: {
        Row: {
          clicked_at: string | null
          id: string
          pet_id: string | null
          product_id: string | null
          profile_id: string | null
          source: string | null
        }
        Insert: {
          clicked_at?: string | null
          id?: string
          pet_id?: string | null
          product_id?: string | null
          profile_id?: string | null
          source?: string | null
        }
        Update: {
          clicked_at?: string | null
          id?: string
          pet_id?: string | null
          product_id?: string | null
          profile_id?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_clicks_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_clicks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "marketplace_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_clicks_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_products: {
        Row: {
          affiliate_url: string | null
          brand: string
          category: string
          commission_rate: number | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          price: number
          species: string[] | null
          stock_count: number | null
        }
        Insert: {
          affiliate_url?: string | null
          brand: string
          category: string
          commission_rate?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          price: number
          species?: string[] | null
          stock_count?: number | null
        }
        Update: {
          affiliate_url?: string | null
          brand?: string
          category?: string
          commission_rate?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          price?: number
          species?: string[] | null
          stock_count?: number | null
        }
        Relationships: []
      }
      marketplace_waitlist: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          pet_id: string
          preferred_food_brand: string | null
          preferred_food_product: string | null
          profile_id: string
          source: string | null
          urgency_level: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          pet_id: string
          preferred_food_brand?: string | null
          preferred_food_product?: string | null
          profile_id: string
          source?: string | null
          urgency_level?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          pet_id?: string
          preferred_food_brand?: string | null
          preferred_food_product?: string | null
          profile_id?: string
          source?: string | null
          urgency_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_waitlist_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_waitlist_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message_type: string | null
          metadata: Json | null
          sender_id: string | null
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_type?: string | null
          metadata?: Json | null
          sender_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_type?: string | null
          metadata?: Json | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      monitored_sources: {
        Row: {
          allowed_categories: string[] | null
          attribution_mode: string
          check_frequency_hours: number | null
          created_at: string
          created_by: string | null
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_active: boolean
          language: string
          last_checked_at: string | null
          last_error: string | null
          last_success_at: string | null
          media_usage_mode: string
          monitoring_mode: string
          processing_mode: string
          source_handle: string | null
          source_name: string
          source_type: string
          source_url: string
          species_scope: string
          trust_level: string
          updated_at: string
        }
        Insert: {
          allowed_categories?: string[] | null
          attribution_mode?: string
          check_frequency_hours?: number | null
          created_at?: string
          created_by?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_active?: boolean
          language?: string
          last_checked_at?: string | null
          last_error?: string | null
          last_success_at?: string | null
          media_usage_mode?: string
          monitoring_mode?: string
          processing_mode?: string
          source_handle?: string | null
          source_name: string
          source_type: string
          source_url: string
          species_scope?: string
          trust_level?: string
          updated_at?: string
        }
        Update: {
          allowed_categories?: string[] | null
          attribution_mode?: string
          check_frequency_hours?: number | null
          created_at?: string
          created_by?: string | null
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_active?: boolean
          language?: string
          last_checked_at?: string | null
          last_error?: string | null
          last_success_at?: string | null
          media_usage_mode?: string
          monitoring_mode?: string
          processing_mode?: string
          source_handle?: string | null
          source_name?: string
          source_type?: string
          source_url?: string
          species_scope?: string
          trust_level?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monitored_sources_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitored_sources_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_jobs: {
        Row: {
          created_at: string | null
          fire_at: string
          id: string
          plan_id: string
          sent: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          fire_at: string
          id?: string
          plan_id: string
          sent?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          fire_at?: string
          id?: string
          plan_id?: string
          sent?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_jobs_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_taken: string | null
          created_at: string | null
          id: string
          idempotency_key: string | null
          is_read: boolean | null
          message: string | null
          open_delay_minutes: number | null
          opened_at: string | null
          pet_id: string | null
          plan_id: string | null
          profile_id: string | null
          sent_email: boolean | null
          title: string
          type: string
        }
        Insert: {
          action_taken?: string | null
          created_at?: string | null
          id?: string
          idempotency_key?: string | null
          is_read?: boolean | null
          message?: string | null
          open_delay_minutes?: number | null
          opened_at?: string | null
          pet_id?: string | null
          plan_id?: string | null
          profile_id?: string | null
          sent_email?: boolean | null
          title: string
          type?: string
        }
        Update: {
          action_taken?: string | null
          created_at?: string | null
          id?: string
          idempotency_key?: string | null
          is_read?: boolean | null
          message?: string | null
          open_delay_minutes?: number | null
          opened_at?: string | null
          pet_id?: string | null
          plan_id?: string | null
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
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_hints: {
        Row: {
          dismissed_at: string | null
          hint_key: string
          id: string
          profile_id: string
        }
        Insert: {
          dismissed_at?: string | null
          hint_key: string
          id?: string
          profile_id: string
        }
        Update: {
          dismissed_at?: string | null
          hint_key?: string
          id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_hints_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_limits: {
        Row: {
          description: string | null
          feature_key: string
          id: string
          onboarding_daily_limit: number | null
          onboarding_days: number | null
          onboarding_total_limit: number | null
          updated_at: string | null
        }
        Insert: {
          description?: string | null
          feature_key: string
          id?: string
          onboarding_daily_limit?: number | null
          onboarding_days?: number | null
          onboarding_total_limit?: number | null
          updated_at?: string | null
        }
        Update: {
          description?: string | null
          feature_key?: string
          id?: string
          onboarding_daily_limit?: number | null
          onboarding_days?: number | null
          onboarding_total_limit?: number | null
          updated_at?: string | null
        }
        Relationships: []
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
        ]
      }
      parasite_product_suggestions: {
        Row: {
          admin_note: string | null
          application_method: string
          approved_product_id: string | null
          brand: string | null
          created_at: string
          id: string
          merged_into_product_id: string | null
          name_suggested: string
          parasite_type: string
          protection_duration_days: number
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          species: string
          status: string
          suggested_by: string
        }
        Insert: {
          admin_note?: string | null
          application_method: string
          approved_product_id?: string | null
          brand?: string | null
          created_at?: string
          id?: string
          merged_into_product_id?: string | null
          name_suggested: string
          parasite_type: string
          protection_duration_days: number
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          species: string
          status?: string
          suggested_by: string
        }
        Update: {
          admin_note?: string | null
          application_method?: string
          approved_product_id?: string | null
          brand?: string | null
          created_at?: string
          id?: string
          merged_into_product_id?: string | null
          name_suggested?: string
          parasite_type?: string
          protection_duration_days?: number
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          species?: string
          status?: string
          suggested_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "parasite_product_suggestions_approved_product_id_fkey"
            columns: ["approved_product_id"]
            isOneToOne: false
            referencedRelation: "parasite_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parasite_product_suggestions_merged_into_product_id_fkey"
            columns: ["merged_into_product_id"]
            isOneToOne: false
            referencedRelation: "parasite_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parasite_product_suggestions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parasite_product_suggestions_suggested_by_fkey"
            columns: ["suggested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parasite_products: {
        Row: {
          active_ingredient: string | null
          application_method: string
          brand: string
          covers_ear_mites: boolean
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          min_age_weeks: number | null
          name: string
          notes: string | null
          protection_duration_days: number
          species: string
          type: string
        }
        Insert: {
          active_ingredient?: string | null
          application_method: string
          brand: string
          covers_ear_mites?: boolean
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          min_age_weeks?: number | null
          name: string
          notes?: string | null
          protection_duration_days: number
          species: string
          type: string
        }
        Update: {
          active_ingredient?: string | null
          application_method?: string
          brand?: string
          covers_ear_mites?: boolean
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          min_age_weeks?: number | null
          name?: string
          notes?: string | null
          protection_duration_days?: number
          species?: string
          type?: string
        }
        Relationships: []
      }
      parasite_protocols: {
        Row: {
          allowed_application_methods: string[]
          created_at: string
          default_application_method: string
          default_protection_duration_days: number
          id: string
          is_active: boolean
          min_age_weeks: number | null
          parasite_code: string
          parasite_type: string
          protocol_name: string
          sort_order: number
          species: string
          updated_at: string
        }
        Insert: {
          allowed_application_methods: string[]
          created_at?: string
          default_application_method: string
          default_protection_duration_days: number
          id?: string
          is_active?: boolean
          min_age_weeks?: number | null
          parasite_code: string
          parasite_type: string
          protocol_name: string
          sort_order?: number
          species: string
          updated_at?: string
        }
        Update: {
          allowed_application_methods?: string[]
          created_at?: string
          default_application_method?: string
          default_protection_duration_days?: number
          id?: string
          is_active?: boolean
          min_age_weeks?: number | null
          parasite_code?: string
          parasite_type?: string
          protocol_name?: string
          sort_order?: number
          species?: string
          updated_at?: string
        }
        Relationships: []
      }
      parasite_records: {
        Row: {
          active_ingredient: string | null
          administered_at: string
          administration_place: string | null
          amount: number | null
          application_method: string
          applied_dose: string | null
          brand_free_text: string | null
          created_at: string
          created_by: string | null
          currency: string
          document_storage_path: string | null
          id: string
          idempotency_key: string | null
          institution_name: string | null
          lot_number: string | null
          notes: string | null
          parasite_code: string
          parasite_product_id: string | null
          parasite_protocol_id: string | null
          parasite_type: string
          pet_id: string
          plan_id: string | null
          product_expiry_at: string | null
          product_free_text: string | null
          product_notes: string | null
          protection_duration_days: number
          provider_name: string | null
          reaction_observed: string | null
          source: string
          updated_at: string
        }
        Insert: {
          active_ingredient?: string | null
          administered_at: string
          administration_place?: string | null
          amount?: number | null
          application_method: string
          applied_dose?: string | null
          brand_free_text?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          document_storage_path?: string | null
          id?: string
          idempotency_key?: string | null
          institution_name?: string | null
          lot_number?: string | null
          notes?: string | null
          parasite_code: string
          parasite_product_id?: string | null
          parasite_protocol_id?: string | null
          parasite_type: string
          pet_id: string
          plan_id?: string | null
          product_expiry_at?: string | null
          product_free_text?: string | null
          product_notes?: string | null
          protection_duration_days: number
          provider_name?: string | null
          reaction_observed?: string | null
          source: string
          updated_at?: string
        }
        Update: {
          active_ingredient?: string | null
          administered_at?: string
          administration_place?: string | null
          amount?: number | null
          application_method?: string
          applied_dose?: string | null
          brand_free_text?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          document_storage_path?: string | null
          id?: string
          idempotency_key?: string | null
          institution_name?: string | null
          lot_number?: string | null
          notes?: string | null
          parasite_code?: string
          parasite_product_id?: string | null
          parasite_protocol_id?: string | null
          parasite_type?: string
          pet_id?: string
          plan_id?: string | null
          product_expiry_at?: string | null
          product_free_text?: string | null
          product_notes?: string | null
          protection_duration_days?: number
          provider_name?: string | null
          reaction_observed?: string | null
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parasite_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parasite_records_parasite_product_id_fkey"
            columns: ["parasite_product_id"]
            isOneToOne: false
            referencedRelation: "parasite_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parasite_records_parasite_protocol_id_fkey"
            columns: ["parasite_protocol_id"]
            isOneToOne: false
            referencedRelation: "parasite_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parasite_records_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parasite_records_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          id: string
          notes: string | null
          payment_date: string | null
          payment_type: string | null
          pet_id: string | null
          record_id: string | null
          record_type: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_type?: string | null
          pet_id?: string | null
          record_id?: string | null
          record_type?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_type?: string | null
          pet_id?: string | null
          record_id?: string | null
          record_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
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
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_breeding_eligibility: {
        Row: {
          advisories: Json
          blocking_reasons: Json
          clearance_expires_at: string | null
          created_at: string
          evaluated_at: string | null
          genetic_screening_status: string
          id: string
          infectious_disease_screening_status: string
          minimum_age_passed: boolean | null
          parasite_status: string
          pet_id: string
          status: string
          updated_at: string
          vaccination_status: string
          veterinary_clearance_date: string | null
          veterinary_clearance_status: string
        }
        Insert: {
          advisories?: Json
          blocking_reasons?: Json
          clearance_expires_at?: string | null
          created_at?: string
          evaluated_at?: string | null
          genetic_screening_status?: string
          id?: string
          infectious_disease_screening_status?: string
          minimum_age_passed?: boolean | null
          parasite_status?: string
          pet_id: string
          status?: string
          updated_at?: string
          vaccination_status?: string
          veterinary_clearance_date?: string | null
          veterinary_clearance_status?: string
        }
        Update: {
          advisories?: Json
          blocking_reasons?: Json
          clearance_expires_at?: string | null
          created_at?: string
          evaluated_at?: string | null
          genetic_screening_status?: string
          id?: string
          infectious_disease_screening_status?: string
          minimum_age_passed?: boolean | null
          parasite_status?: string
          pet_id?: string
          status?: string
          updated_at?: string
          vaccination_status?: string
          veterinary_clearance_date?: string | null
          veterinary_clearance_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_breeding_eligibility_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: true
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_care_events: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          notes: string | null
          pet_id: string | null
          scheduled_at: string
          status: string | null
          task_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          pet_id?: string | null
          scheduled_at: string
          status?: string | null
          task_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          pet_id?: string | null
          scheduled_at?: string
          status?: string | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pet_care_events_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_care_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "pet_care_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_care_tasks: {
        Row: {
          category: string
          created_at: string | null
          frequency_days: number
          frequency_label: string | null
          id: string
          pet_id: string | null
          title: string
        }
        Insert: {
          category: string
          created_at?: string | null
          frequency_days: number
          frequency_label?: string | null
          id?: string
          pet_id?: string | null
          title: string
        }
        Update: {
          category?: string
          created_at?: string | null
          frequency_days?: number
          frequency_label?: string | null
          id?: string
          pet_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_care_tasks_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_clinic_access: {
        Row: {
          clinic_id: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          pet_id: string | null
          revoked_at: string | null
        }
        Insert: {
          clinic_id?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          pet_id?: string | null
          revoked_at?: string | null
        }
        Update: {
          clinic_id?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          pet_id?: string | null
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pet_clinic_access_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_clinic_access_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_clinic_access_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_estrus_cycles: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string
          notes: string | null
          pet_id: string
          start_date: string
          symptoms: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          pet_id: string
          start_date: string
          symptoms?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          pet_id?: string
          start_date?: string
          symptoms?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pet_estrus_cycles_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_estrus_observations: {
        Row: {
          created_at: string
          created_by: string
          cycle_id: string
          id: string
          notes: string | null
          observation_date: string
          pet_id: string
          severity: number
          source: string
          symptom_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          cycle_id: string
          id?: string
          notes?: string | null
          observation_date: string
          pet_id: string
          severity: number
          source?: string
          symptom_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          cycle_id?: string
          id?: string
          notes?: string | null
          observation_date?: string
          pet_id?: string
          severity?: number
          source?: string
          symptom_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_estrus_observations_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "pet_estrus_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_estrus_observations_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_estrus_preferences: {
        Row: {
          created_at: string
          id: string
          pet_id: string
          reminders_enabled: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          pet_id: string
          reminders_enabled?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          pet_id?: string
          reminders_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_estrus_preferences_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: true
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
          expense_date: string | null
          id: string
          pet_id: string
          profile_id: string | null
          source: string | null
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          date?: string
          description?: string | null
          expense_date?: string | null
          id?: string
          pet_id: string
          profile_id?: string | null
          source?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          description?: string | null
          expense_date?: string | null
          id?: string
          pet_id?: string
          profile_id?: string | null
          source?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_expenses_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_expenses_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_food_assignments: {
        Row: {
          brand_free_text: string | null
          created_at: string
          created_by: string | null
          daily_target_grams: number | null
          ended_at: string | null
          food_form: string
          food_product_family_id: string | null
          food_sku_id: string | null
          id: string
          is_primary: boolean
          legacy_profile_id: string | null
          meals_per_day: number | null
          measurement_method: string
          pet_id: string
          product_free_text: string | null
          source: string
          started_at: string
          updated_at: string
        }
        Insert: {
          brand_free_text?: string | null
          created_at?: string
          created_by?: string | null
          daily_target_grams?: number | null
          ended_at?: string | null
          food_form: string
          food_product_family_id?: string | null
          food_sku_id?: string | null
          id?: string
          is_primary?: boolean
          legacy_profile_id?: string | null
          meals_per_day?: number | null
          measurement_method: string
          pet_id: string
          product_free_text?: string | null
          source: string
          started_at: string
          updated_at?: string
        }
        Update: {
          brand_free_text?: string | null
          created_at?: string
          created_by?: string | null
          daily_target_grams?: number | null
          ended_at?: string | null
          food_form?: string
          food_product_family_id?: string | null
          food_sku_id?: string | null
          id?: string
          is_primary?: boolean
          legacy_profile_id?: string | null
          meals_per_day?: number | null
          measurement_method?: string
          pet_id?: string
          product_free_text?: string | null
          source?: string
          started_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_food_assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_food_assignments_food_product_family_id_fkey"
            columns: ["food_product_family_id"]
            isOneToOne: false
            referencedRelation: "food_product_families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_food_assignments_food_sku_id_fkey"
            columns: ["food_sku_id"]
            isOneToOne: false
            referencedRelation: "food_skus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_food_assignments_legacy_profile_id_fkey"
            columns: ["legacy_profile_id"]
            isOneToOne: true
            referencedRelation: "pet_nutrition_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_food_assignments_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_gallery: {
        Row: {
          caption: string | null
          care_event_id: string | null
          category: string | null
          created_at: string
          id: string
          image_url: string
          pet_id: string
          taken_at: string | null
          user_id: string
          vaccine_record_id: string | null
        }
        Insert: {
          caption?: string | null
          care_event_id?: string | null
          category?: string | null
          created_at?: string
          id?: string
          image_url: string
          pet_id: string
          taken_at?: string | null
          user_id: string
          vaccine_record_id?: string | null
        }
        Update: {
          caption?: string | null
          care_event_id?: string | null
          category?: string | null
          created_at?: string
          id?: string
          image_url?: string
          pet_id?: string
          taken_at?: string | null
          user_id?: string
          vaccine_record_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pet_gallery_care_event_id_fkey"
            columns: ["care_event_id"]
            isOneToOne: false
            referencedRelation: "pet_care_events"
            referencedColumns: ["id"]
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
            referencedRelation: "pets"
            referencedColumns: ["id"]
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
        ]
      }
      pet_membership_events: {
        Row: {
          actor_profile_id: string | null
          created_at: string
          event_type: string
          id: string
          membership_id: string | null
          new_role: Database["public"]["Enums"]["pet_membership_role"] | null
          old_role: Database["public"]["Enums"]["pet_membership_role"] | null
          pet_id: string
          profile_id: string
          reason: string | null
          request_id: string | null
          source: Database["public"]["Enums"]["pet_membership_source"]
        }
        Insert: {
          actor_profile_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          membership_id?: string | null
          new_role?: Database["public"]["Enums"]["pet_membership_role"] | null
          old_role?: Database["public"]["Enums"]["pet_membership_role"] | null
          pet_id: string
          profile_id: string
          reason?: string | null
          request_id?: string | null
          source: Database["public"]["Enums"]["pet_membership_source"]
        }
        Update: {
          actor_profile_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          membership_id?: string | null
          new_role?: Database["public"]["Enums"]["pet_membership_role"] | null
          old_role?: Database["public"]["Enums"]["pet_membership_role"] | null
          pet_id?: string
          profile_id?: string
          reason?: string | null
          request_id?: string | null
          source?: Database["public"]["Enums"]["pet_membership_source"]
        }
        Relationships: []
      }
      pet_membership_migration_issues: {
        Row: {
          created_at: string
          details: Json
          id: string
          issue_type: string
          pet_id: string | null
          profile_id: string | null
          resolution_status: string
          resolved_at: string | null
          resolved_by: string | null
          source_record_id: string | null
          source_table: string
        }
        Insert: {
          created_at?: string
          details?: Json
          id?: string
          issue_type: string
          pet_id?: string | null
          profile_id?: string | null
          resolution_status?: string
          resolved_at?: string | null
          resolved_by?: string | null
          source_record_id?: string | null
          source_table: string
        }
        Update: {
          created_at?: string
          details?: Json
          id?: string
          issue_type?: string
          pet_id?: string | null
          profile_id?: string | null
          resolution_status?: string
          resolved_at?: string | null
          resolved_by?: string | null
          source_record_id?: string | null
          source_table?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_membership_migration_issues_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_memberships: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invite_id: string | null
          invited_by: string | null
          pet_id: string
          profile_id: string
          revoked_at: string | null
          role: Database["public"]["Enums"]["pet_membership_role"]
          source: Database["public"]["Enums"]["pet_membership_source"]
          status: Database["public"]["Enums"]["pet_membership_status"]
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invite_id?: string | null
          invited_by?: string | null
          pet_id: string
          profile_id: string
          revoked_at?: string | null
          role: Database["public"]["Enums"]["pet_membership_role"]
          source: Database["public"]["Enums"]["pet_membership_source"]
          status?: Database["public"]["Enums"]["pet_membership_status"]
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invite_id?: string | null
          invited_by?: string | null
          pet_id?: string
          profile_id?: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["pet_membership_role"]
          source?: Database["public"]["Enums"]["pet_membership_source"]
          status?: Database["public"]["Enums"]["pet_membership_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_memberships_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "pet_invites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_memberships_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_memberships_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
        ]
      }
      pet_nutrition_logs: {
        Row: {
          food_brand: string | null
          food_product: string | null
          food_type: string | null
          id: string
          logged_at: string | null
          meal_time: string | null
          pet_id: string | null
          portion_grams: number | null
          profile_id: string | null
        }
        Insert: {
          food_brand?: string | null
          food_product?: string | null
          food_type?: string | null
          id?: string
          logged_at?: string | null
          meal_time?: string | null
          pet_id?: string | null
          portion_grams?: number | null
          profile_id?: string | null
        }
        Update: {
          food_brand?: string | null
          food_product?: string | null
          food_type?: string | null
          id?: string
          logged_at?: string | null
          meal_time?: string | null
          pet_id?: string | null
          portion_grams?: number | null
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pet_nutrition_logs_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_nutrition_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            isOneToOne: false
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
        ]
      }
      pet_parasite_preferences: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          parasite_protocol_id: string
          pet_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          parasite_protocol_id: string
          pet_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          parasite_protocol_id?: string
          pet_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pet_parasite_preferences_parasite_protocol_id_fkey"
            columns: ["parasite_protocol_id"]
            isOneToOne: false
            referencedRelation: "parasite_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_parasite_preferences_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
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
        ]
      }
      pet_reproductive_tests: {
        Row: {
          analyzer_name: string | null
          assay_method: string | null
          clinic_name: string | null
          created_at: string
          created_by: string
          cycle_id: string
          cytology_result: string | null
          cytology_superficial_percent: number | null
          document_storage_path: string | null
          id: string
          laboratory_name: string | null
          pet_id: string
          progesterone_unit: string | null
          progesterone_value: number | null
          reference_range: string | null
          sample_identifier: string | null
          sampled_at: string
          test_type: string
          updated_at: string
          verification_status: string
          veterinarian_name: string | null
        }
        Insert: {
          analyzer_name?: string | null
          assay_method?: string | null
          clinic_name?: string | null
          created_at?: string
          created_by: string
          cycle_id: string
          cytology_result?: string | null
          cytology_superficial_percent?: number | null
          document_storage_path?: string | null
          id?: string
          laboratory_name?: string | null
          pet_id: string
          progesterone_unit?: string | null
          progesterone_value?: number | null
          reference_range?: string | null
          sample_identifier?: string | null
          sampled_at: string
          test_type: string
          updated_at?: string
          verification_status?: string
          veterinarian_name?: string | null
        }
        Update: {
          analyzer_name?: string | null
          assay_method?: string | null
          clinic_name?: string | null
          created_at?: string
          created_by?: string
          cycle_id?: string
          cytology_result?: string | null
          cytology_superficial_percent?: number | null
          document_storage_path?: string | null
          id?: string
          laboratory_name?: string | null
          pet_id?: string
          progesterone_unit?: string | null
          progesterone_value?: number | null
          reference_range?: string | null
          sample_identifier?: string | null
          sampled_at?: string
          test_type?: string
          updated_at?: string
          verification_status?: string
          veterinarian_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pet_reproductive_tests_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "pet_estrus_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pet_reproductive_tests_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pet_vaccine_preferences: {
        Row: {
          created_at: string
          created_by: string | null
          disabled_at: string | null
          enabled: boolean
          enabled_at: string | null
          id: string
          pet_id: string
          risk_reason: string | null
          updated_at: string
          vaccine_code: string
          vet_recommended: boolean
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          disabled_at?: string | null
          enabled?: boolean
          enabled_at?: string | null
          id?: string
          pet_id: string
          risk_reason?: string | null
          updated_at?: string
          vaccine_code: string
          vet_recommended?: boolean
        }
        Update: {
          created_at?: string
          created_by?: string | null
          disabled_at?: string | null
          enabled?: boolean
          enabled_at?: string | null
          id?: string
          pet_id?: string
          risk_reason?: string | null
          updated_at?: string
          vaccine_code?: string
          vet_recommended?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "pet_vaccine_preferences_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      pets: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          birth_date_precision: string | null
          breed: string | null
          city: string | null
          color: string | null
          cover_position: string | null
          cover_url: string | null
          created_at: string | null
          agriculture_directorate: string | null
          data_quality_score: number | null
          district: string | null
          registration_city: string | null
          registration_district: string | null
          engagement_score: number | null
          gender: string | null
          health_history_status: string | null
          health_score: number | null
          id: string
          is_demo: boolean | null
          is_neutered: boolean | null
          last_interaction_at: string | null
          lifestyle: string | null
          microchip_no: string | null
          name: string
          onboarding_progress: Json
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
          weekly_log_count: number | null
          target_weight_kg: number | null
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          birth_date_precision?: string | null
          breed?: string | null
          city?: string | null
          color?: string | null
          cover_position?: string | null
          cover_url?: string | null
          created_at?: string | null
          data_quality_score?: number | null
          district?: string | null
          engagement_score?: number | null
          gender?: string | null
          health_history_status?: string | null
          health_score?: number | null
          id?: string
          is_demo?: boolean | null
          is_neutered?: boolean | null
          last_interaction_at?: string | null
          lifestyle?: string | null
          microchip_no?: string | null
          name: string
          onboarding_progress?: Json
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
          weekly_log_count?: number | null
          target_weight_kg?: number | null
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          birth_date_precision?: string | null
          breed?: string | null
          city?: string | null
          color?: string | null
          cover_position?: string | null
          cover_url?: string | null
          created_at?: string | null
          data_quality_score?: number | null
          district?: string | null
          engagement_score?: number | null
          gender?: string | null
          health_history_status?: string | null
          health_score?: number | null
          id?: string
          is_demo?: boolean | null
          is_neutered?: boolean | null
          last_interaction_at?: string | null
          lifestyle?: string | null
          microchip_no?: string | null
          name?: string
          onboarding_progress?: Json
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
          weekly_log_count?: number | null
          target_weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          category: string
          completed_at: string | null
          created_at: string | null
          ends_at: string | null
          extra_data: Json | null
          id: string
          note: string | null
          notif_before: number | null
          notif_unit: string | null
          occurrence_scheduled_at: string | null
          parent_plan_id: string | null
          pet_id: string
          repeat_rule: string | null
          scheduled_at: string
          status: string | null
          sub_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category: string
          completed_at?: string | null
          created_at?: string | null
          ends_at?: string | null
          extra_data?: Json | null
          id?: string
          note?: string | null
          notif_before?: number | null
          notif_unit?: string | null
          occurrence_scheduled_at?: string | null
          parent_plan_id?: string | null
          pet_id: string
          repeat_rule?: string | null
          scheduled_at: string
          status?: string | null
          sub_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string
          completed_at?: string | null
          created_at?: string | null
          ends_at?: string | null
          extra_data?: Json | null
          id?: string
          note?: string | null
          notif_before?: number | null
          notif_unit?: string | null
          occurrence_scheduled_at?: string | null
          parent_plan_id?: string | null
          pet_id?: string
          repeat_rule?: string | null
          scheduled_at?: string
          status?: string | null
          sub_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_parent_plan_id_fkey"
            columns: ["parent_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          author_id: string | null
          content: string
          created_at: string | null
          id: string
          post_id: string | null
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          post_id?: string | null
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string | null
          profile_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          profile_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          referral_code: string | null
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
          referral_code?: string | null
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
          referral_code?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      profiling_prompts: {
        Row: {
          completed_at: string | null
          dismissed_at: string | null
          field_name: string
          id: string
          pet_id: string | null
          profile_id: string | null
          response_value: string | null
          shown_at: string | null
          trigger_context: string
        }
        Insert: {
          completed_at?: string | null
          dismissed_at?: string | null
          field_name: string
          id?: string
          pet_id?: string | null
          profile_id?: string | null
          response_value?: string | null
          shown_at?: string | null
          trigger_context: string
        }
        Update: {
          completed_at?: string | null
          dismissed_at?: string | null
          field_name?: string
          id?: string
          pet_id?: string | null
          profile_id?: string | null
          response_value?: string | null
          shown_at?: string | null
          trigger_context?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiling_prompts_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiling_prompts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
        ]
      }
      referrals: {
        Row: {
          created_at: string | null
          id: string
          referral_code: string
          referred_id: string
          referrer_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          referral_code: string
          referred_id: string
          referrer_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          referral_code?: string
          referred_id?: string
          referrer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_logs: {
        Row: {
          action_type: string
          actor_id: string | null
          created_at: string
          details: Json | null
          hash: string | null
          id: string
          ip_address: unknown
          previous_hash: string | null
          resource_id: string | null
        }
        Insert: {
          action_type: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          hash?: string | null
          id?: string
          ip_address?: unknown
          previous_hash?: string | null
          resource_id?: string | null
        }
        Update: {
          action_type?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          hash?: string | null
          id?: string
          ip_address?: unknown
          previous_hash?: string | null
          resource_id?: string | null
        }
        Relationships: []
      }
      session_logs: {
        Row: {
          actions_count: number | null
          device_type: string | null
          duration_seconds: number | null
          ended_at: string | null
          entry_point: string | null
          id: string
          profile_id: string | null
          screens_visited: string[] | null
          session_id: string
          started_at: string | null
        }
        Insert: {
          actions_count?: number | null
          device_type?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          entry_point?: string | null
          id?: string
          profile_id?: string | null
          screens_visited?: string[] | null
          session_id: string
          started_at?: string | null
        }
        Update: {
          actions_count?: number | null
          device_type?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          entry_point?: string | null
          id?: string
          profile_id?: string | null
          screens_visited?: string[] | null
          session_id?: string
          started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          author_id: string | null
          caption: string | null
          content: string | null
          created_at: string | null
          id: string
          image_url: string | null
          is_public: boolean | null
          like_count: number | null
          media_url: string | null
          owner_id: string | null
          pet_id: string | null
        }
        Insert: {
          author_id?: string | null
          caption?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_public?: boolean | null
          like_count?: number | null
          media_url?: string | null
          owner_id?: string | null
          pet_id?: string | null
        }
        Update: {
          author_id?: string | null
          caption?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_public?: boolean | null
          like_count?: number | null
          media_url?: string | null
          owner_id?: string | null
          pet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
      step_events: {
        Row: {
          created_at: string | null
          error_category: string | null
          error_details: Json | null
          event_type: string
          id: string
          metadata: Json | null
          session_id: string | null
          step_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_category?: string | null
          error_details?: Json | null
          event_type: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          step_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_category?: string | null
          error_details?: Json | null
          event_type?: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          step_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: {
          attempt_count: number
          event_type: string
          id: string
          last_attempt_at: string
          last_error: string | null
          processed_at: string | null
          received_at: string
          status: string
        }
        Insert: {
          attempt_count?: number
          event_type: string
          id: string
          last_attempt_at?: string
          last_error?: string | null
          processed_at?: string | null
          received_at?: string
          status?: string
        }
        Update: {
          attempt_count?: number
          event_type?: string
          id?: string
          last_attempt_at?: string
          last_error?: string | null
          processed_at?: string | null
          received_at?: string
          status?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          ai_vet_daily_limit: number | null
          business_type: string | null
          commission_rate: number | null
          created_at: string | null
          currency: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          max_patients: number | null
          max_pets: number | null
          max_staff: number | null
          nutrition_analysis_limit: number | null
          pdf_report_monthly_limit: number | null
          plan_key: string
          plan_name: string
          plan_type: string
          price_monthly: number | null
          price_yearly: number | null
          scanner_daily_limit: number | null
          stripe_price_id_monthly: string | null
          stripe_price_id_yearly: string | null
          updated_at: string | null
        }
        Insert: {
          ai_vet_daily_limit?: number | null
          business_type?: string | null
          commission_rate?: number | null
          created_at?: string | null
          currency?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_patients?: number | null
          max_pets?: number | null
          max_staff?: number | null
          nutrition_analysis_limit?: number | null
          pdf_report_monthly_limit?: number | null
          plan_key: string
          plan_name: string
          plan_type: string
          price_monthly?: number | null
          price_yearly?: number | null
          scanner_daily_limit?: number | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_vet_daily_limit?: number | null
          business_type?: string | null
          commission_rate?: number | null
          created_at?: string | null
          currency?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_patients?: number | null
          max_pets?: number | null
          max_staff?: number | null
          nutrition_analysis_limit?: number | null
          pdf_report_monthly_limit?: number | null
          plan_key?: string
          plan_name?: string
          plan_type?: string
          price_monthly?: number | null
          price_yearly?: number | null
          scanner_daily_limit?: number | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_activation_scores: {
        Row: {
          id: string
          last_calculated_at: string | null
          score: number | null
          user_id: string | null
        }
        Insert: {
          id?: string
          last_calculated_at?: string | null
          score?: number | null
          user_id?: string | null
        }
        Update: {
          id?: string
          last_calculated_at?: string | null
          score?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_key: string
          earned_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          badge_key: string
          earned_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          badge_key?: string
          earned_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_onboarding_steps: {
        Row: {
          completed_at: string | null
          created_at: string | null
          is_completed: boolean
          step_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          is_completed?: boolean
          step_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          is_completed?: boolean
          step_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          ai_credits: number | null
          created_at: string | null
          current_period_end: string | null
          id: string
          notification_prefs: Json | null
          plan: string
          profile_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
        }
        Insert: {
          ai_credits?: number | null
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          notification_prefs?: Json | null
          plan?: string
          profile_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Update: {
          ai_credits?: number | null
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          notification_prefs?: Json | null
          plan?: string
          profile_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_survey_stats: {
        Row: {
          ad_fatigue_score: number
          consecutive_skips: number
          created_at: string
          daily_questions_asked: number
          last_question_asked_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ad_fatigue_score?: number
          consecutive_skips?: number
          created_at?: string
          daily_questions_asked?: number
          last_question_asked_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ad_fatigue_score?: number
          consecutive_skips?: number
          created_at?: string
          daily_questions_asked?: number
          last_question_asked_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_survey_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vaccination_plan_items: {
        Row: {
          administration_route: string | null
          antigen_code: string
          brand_id: string | null
          completed_record_id: string | null
          created_at: string
          dose_number: number
          extra_data: Json | null
          id: string
          pet_id: string
          plan_origin: string
          plans_mirror_id: string | null
          recommended_end: string | null
          recommended_start: string | null
          scheduled_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          administration_route?: string | null
          antigen_code: string
          brand_id?: string | null
          completed_record_id?: string | null
          created_at?: string
          dose_number?: number
          extra_data?: Json | null
          id?: string
          pet_id: string
          plan_origin?: string
          plans_mirror_id?: string | null
          recommended_end?: string | null
          recommended_start?: string | null
          scheduled_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          administration_route?: string | null
          antigen_code?: string
          brand_id?: string | null
          completed_record_id?: string | null
          created_at?: string
          dose_number?: number
          extra_data?: Json | null
          id?: string
          pet_id?: string
          plan_origin?: string
          plans_mirror_id?: string | null
          recommended_end?: string | null
          recommended_start?: string | null
          scheduled_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vaccination_plan_items_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "vaccine_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccination_plan_items_completed_record_id_fkey"
            columns: ["completed_record_id"]
            isOneToOne: false
            referencedRelation: "vaccine_records_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccination_plan_items_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccination_plan_items_plans_mirror_id_fkey"
            columns: ["plans_mirror_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      vaccine_brands: {
        Row: {
          admin_note: string | null
          administration_route: string
          brand_name: string
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_core: boolean
          is_live_vaccine: boolean
          manufacturer: string
          species: string
          status: string
          suggested_by: string | null
          vaccine_code: string
        }
        Insert: {
          admin_note?: string | null
          administration_route?: string
          brand_name: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_core?: boolean
          is_live_vaccine?: boolean
          manufacturer: string
          species: string
          status?: string
          suggested_by?: string | null
          vaccine_code: string
        }
        Update: {
          admin_note?: string | null
          administration_route?: string
          brand_name?: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_core?: boolean
          is_live_vaccine?: boolean
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
            foreignKeyName: "vaccine_catalog_suggestions_suggested_by_fkey"
            columns: ["suggested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vaccine_protocols: {
        Row: {
          category: string | null
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
          risk_group: string | null
          sort_order: number | null
          species: string
          updated_at: string | null
          vaccine_code: string
        }
        Insert: {
          category?: string | null
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
          risk_group?: string | null
          sort_order?: number | null
          species: string
          updated_at?: string | null
          vaccine_code: string
        }
        Update: {
          category?: string | null
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
          risk_group?: string | null
          sort_order?: number | null
          species?: string
          updated_at?: string | null
          vaccine_code?: string
        }
        Relationships: []
      }
      vaccine_protocols_backup_20260715164000: {
        Row: {
          category: string | null
          created_at: string | null
          deleted_at: string | null
          doses: Json | null
          end_condition: Json | null
          id: string
          is_active: boolean | null
          is_core: boolean | null
          notes: string | null
          protocol_name: string | null
          repeat_frequency: string | null
          repeat_interval_days: number | null
          species: string | null
          updated_at: string | null
          vaccine_code: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          deleted_at?: string | null
          doses?: Json | null
          end_condition?: Json | null
          id: string
          is_active?: boolean | null
          is_core?: boolean | null
          notes?: string | null
          protocol_name?: string | null
          repeat_frequency?: string | null
          repeat_interval_days?: number | null
          species?: string | null
          updated_at?: string | null
          vaccine_code?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          deleted_at?: string | null
          doses?: Json | null
          end_condition?: Json | null
          id?: string
          is_active?: boolean | null
          is_core?: boolean | null
          notes?: string | null
          protocol_name?: string | null
          repeat_frequency?: string | null
          repeat_interval_days?: number | null
          species?: string | null
          updated_at?: string | null
          vaccine_code?: string | null
        }
        Relationships: []
      }
      vaccine_records_v2: {
        Row: {
          administered_at: string | null
          administration_place: string | null
          administration_route: string | null
          amount: number | null
          brand_free_text: string | null
          brand_id: string | null
          confidence_level: string
          created_at: string | null
          currency: string
          document_image_url: string | null
          document_storage_path: string | null
          dose_number: number | null
          due_at: string | null
          expiration_date: string | null
          id: string
          idempotency_key: string | null
          institution_name: string | null
          lot_number: string | null
          manufacturer_free_text: string | null
          next_due_at: string | null
          notes: string | null
          pet_id: string
          plan_id: string | null
          product_notes: string | null
          provider_name: string | null
          reaction_observed: string | null
          source: string
          status: string
          vaccine_code: string
          vaccine_name: string
          valid_until: string | null
          vet_name: string | null
        }
        Insert: {
          administered_at?: string | null
          administration_place?: string | null
          administration_route?: string | null
          amount?: number | null
          brand_free_text?: string | null
          brand_id?: string | null
          confidence_level?: string
          created_at?: string | null
          currency?: string
          document_image_url?: string | null
          document_storage_path?: string | null
          dose_number?: number | null
          due_at?: string | null
          expiration_date?: string | null
          id?: string
          idempotency_key?: string | null
          institution_name?: string | null
          lot_number?: string | null
          manufacturer_free_text?: string | null
          next_due_at?: string | null
          notes?: string | null
          pet_id: string
          plan_id?: string | null
          product_notes?: string | null
          provider_name?: string | null
          reaction_observed?: string | null
          source?: string
          status?: string
          vaccine_code: string
          vaccine_name: string
          valid_until?: string | null
          vet_name?: string | null
        }
        Update: {
          administered_at?: string | null
          administration_place?: string | null
          administration_route?: string | null
          amount?: number | null
          brand_free_text?: string | null
          brand_id?: string | null
          confidence_level?: string
          created_at?: string | null
          currency?: string
          document_image_url?: string | null
          document_storage_path?: string | null
          dose_number?: number | null
          due_at?: string | null
          expiration_date?: string | null
          id?: string
          idempotency_key?: string | null
          institution_name?: string | null
          lot_number?: string | null
          manufacturer_free_text?: string | null
          next_due_at?: string | null
          notes?: string | null
          pet_id?: string
          plan_id?: string | null
          product_notes?: string | null
          provider_name?: string | null
          reaction_observed?: string | null
          source?: string
          status?: string
          vaccine_code?: string
          vaccine_name?: string
          valid_until?: string | null
          vet_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vaccine_records_v2_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "vaccine_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccine_records_v2_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccine_records_v2_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
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
          archived_at: string | null
          body_condition_score: number | null
          height_cm: number | null
          id: string
          is_archived: boolean | null
          measured_at: string | null
          pet_id: string | null
          weight_kg: number | null
        }
        Insert: {
          archived_at?: string | null
          body_condition_score?: number | null
          height_cm?: number | null
          id?: string
          is_archived?: boolean | null
          measured_at?: string | null
          pet_id?: string | null
          weight_kg?: number | null
        }
        Update: {
          archived_at?: string | null
          body_condition_score?: number | null
          height_cm?: number | null
          id?: string
          is_archived?: boolean | null
          measured_at?: string | null
          pet_id?: string | null
          weight_kg?: number | null
        }
        Relationships: [
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
        ]
      }
      sos_public_view: {
        Row: {
          created_at: string | null
          id: string | null
          last_seen_at: string | null
          last_seen_location: string | null
          pet_breed: string | null
          pet_id: string | null
          pet_name: string | null
          pet_photo: string | null
          pet_species: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lost_reports_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_pet_caregiver_invite: { Args: { p_token: string }; Returns: Json }
      backfill_pet_nutrition_profiles_to_assignments: {
        Args: never
        Returns: number
      }
      calculate_completeness_score: {
        Args: { target_user_id: string }
        Returns: number
      }
      can_delete_pet: { Args: { p_pet_id: string }; Returns: boolean }
      can_edit_pet_profile: { Args: { p_pet_id: string }; Returns: boolean }
      can_manage_pet_billing: { Args: { p_pet_id: string }; Returns: boolean }
      can_manage_pet_care: { Args: { p_pet_id: string }; Returns: boolean }
      can_manage_pet_caregivers: {
        Args: { p_pet_id: string }
        Returns: boolean
      }
      can_manage_pet_ownership: { Args: { p_pet_id: string }; Returns: boolean }
      can_publish_pet_lost_report: {
        Args: { p_pet_id: string }
        Returns: boolean
      }
      can_view_pet: { Args: { p_pet_id: string }; Returns: boolean }
      change_pet_caregiver_role: {
        Args: { p_pet_id: string; p_profile_id: string; p_role: string }
        Returns: Json
      }
      change_vet_review_requirement: {
        Args: {
          p_article_id: string
          p_new_requirement: string
          p_reason: string
        }
        Returns: Json
      }
      clinic_admin_can_view_profile: {
        Args: { p_admin_id?: string; p_profile_id: string }
        Returns: boolean
      }
      complete_parasite_plan: {
        Args: {
          p_administered_at: string
          p_application_method: string
          p_brand_free_text: string
          p_created_by: string
          p_document_storage_path: string
          p_notes: string
          p_plan_id: string
          p_product_free_text: string
          p_protection_duration_days: number
        }
        Returns: Json
      }
      complete_parasite_plan_and_record: {
        Args: {
          p_actual_date: string
          p_application_method: string
          p_brand_free_text?: string
          p_idempotency_key: string
          p_main_plan_id: string
          p_next_scheduled_at: string
          p_notes?: string
          p_occurrence_scheduled_at: string
          p_parasite_code: string
          p_parasite_protocol_id?: string
          p_parasite_type: string
          p_pet_id: string
          p_product_free_text?: string
          p_protection_duration_days: number
        }
        Returns: Json
      }
      complete_recurring_plan: {
        Args: {
          p_actual_completion_date: string
          p_close_series?: boolean
          p_extra_data?: Json
          p_next_scheduled_at?: string
          p_note?: string
          p_occurrence_scheduled_at: string
          p_plan_id: string
          p_user_id: string
        }
        Returns: Json
      }
      complete_vaccine_plan_and_record: {
        Args: {
          p_actual_date: string
          p_brand_free_text?: string
          p_brand_id?: string
          p_close_series: boolean
          p_dose_number: number
          p_idempotency_key: string
          p_main_plan_id: string
          p_next_scheduled_at: string
          p_notes?: string
          p_occurrence_scheduled_at: string
          p_pet_id: string
          p_protocol_id?: string
          p_protocol_stage?: number
          p_species?: string
          p_vaccine_code: string
          p_vaccine_name: string
        }
        Returns: Json
      }
      create_pet_caregiver_invite: {
        Args: { p_email: string; p_pet_id: string; p_role: string }
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
      create_pet_with_primary_membership: {
        Args: { p_payload: Json }
        Returns: Json
      }
      current_pet_role: {
        Args: { p_pet_id: string }
        Returns: Database["public"]["Enums"]["pet_membership_role"]
      }
      decrement_vet_load: { Args: { p_vet_id: string }; Returns: undefined }
      delete_pet_with_memberships: {
        Args: { p_pet_id: string; p_request_id?: string }
        Returns: Json
      }
      end_pet_food_assignment: {
        Args: {
          p_assignment_id: string
          p_pet_id: string
          p_stock_action: string
        }
        Returns: Json
      }
      generate_birthday_notifications: { Args: never; Returns: number }
      generate_schedule_notifications: { Args: never; Returns: number }
      increment_care_points: {
        Args: { p_amount: number; p_profile_id: string }
        Returns: undefined
      }
      increment_vet_load: { Args: { p_vet_id: string }; Returns: undefined }
      is_admin_or_founder: { Args: never; Returns: boolean }
      is_clinic_admin_of: {
        Args: { p_clinic_id: string; p_user_id?: string }
        Returns: boolean
      }
      is_primary_pet_owner: { Args: { p_pet_id: string }; Returns: boolean }
      is_valid_method_array: { Args: { arr: string[] }; Returns: boolean }
      process_smart_scan_results: {
        Args: { p_parsed_data: Json; p_pet_id: string; p_record_type: string }
        Returns: Json
      }
      remove_pet_caregiver: {
        Args: { p_legacy_member_id: string; p_pet_id: string }
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
      swap_pet_food_assignment: {
        Args: {
          p_new_assignment: Json
          p_new_stock: Json
          p_old_assignment_id: string
          p_pet_id: string
        }
        Returns: Json
      }
      transfer_pet_primary_owner: {
        Args: {
          p_new_profile_id: string
          p_pet_id: string
          p_request_id?: string
        }
        Returns: Json
      }
      update_article_with_revision: {
        Args: {
          p_actor_id: string
          p_article_id: string
          p_change_summary: string
          p_updates: Json
        }
        Returns: Json
      }
      update_onboarding_step: {
        Args: { p_pet_id: string; p_step: string; p_value: boolean }
        Returns: undefined
      }
      user_has_pet_access: { Args: { p_pet_id: string }; Returns: boolean }
      user_is_pet_member: { Args: { p_pet_id: string }; Returns: boolean }
      user_owns_pet: {
        Args: { p_pet_id: string; p_user_id?: string }
        Returns: boolean
      }
      user_pet_role: { Args: { p_pet_id: string }; Returns: string }
      verify_job_source_atomic: {
        Args: {
          p_action: string
          p_confirmed_relevance?: boolean
          p_confirmed_title_url?: boolean
          p_job_id: string
          p_rejection_reason?: string
          p_source_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      appointment_status: "pending" | "confirmed" | "cancelled" | "completed"
      pet_membership_role:
        | "primary_owner"
        | "co_owner"
        | "care_admin"
        | "care_editor"
        | "viewer"
      pet_membership_source:
        | "pet_creation"
        | "invitation"
        | "ownership_transfer"
        | "migration"
        | "admin_recovery"
      pet_membership_status: "active" | "revoked"
      user_role:
        | "owner"
        | "vet"
        | "admin"
        | "founder"
        | "hotel_admin"
        | "hotel_staff"
        | "groomer_admin"
        | "groomer_staff"
        | "sitter"
        | "trainer"
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
      pet_membership_role: [
        "primary_owner",
        "co_owner",
        "care_admin",
        "care_editor",
        "viewer",
      ],
      pet_membership_source: [
        "pet_creation",
        "invitation",
        "ownership_transfer",
        "migration",
        "admin_recovery",
      ],
      pet_membership_status: ["active", "revoked"],
      user_role: [
        "owner",
        "vet",
        "admin",
        "founder",
        "hotel_admin",
        "hotel_staff",
        "groomer_admin",
        "groomer_staff",
        "sitter",
        "trainer",
      ],
    },
  },
} as const
