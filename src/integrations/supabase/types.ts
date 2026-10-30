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
  public: {
    Tables: {
      add_ons: {
        Row: {
          created_at: string
          description: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          price_kes: number
          unit: string
        }
        Insert: {
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name: string
          price_kes: number
          unit?: string
        }
        Update: {
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          price_kes?: number
          unit?: string
        }
        Relationships: []
      }
      admin_login_attempts: {
        Row: {
          created_at: string
          id: string
          ip: string | null
          success: boolean
          username: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip?: string | null
          success: boolean
          username?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip?: string | null
          success?: boolean
          username?: string | null
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string | null
          department: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          is_department_head: boolean
          is_super_admin: boolean
          last_active_at: string | null
          must_change_password: boolean
          password: string
          phone: string | null
          remember_me_until: string | null
          role: Database["public"]["Enums"]["app_role"]
          session_expires_at: string | null
          session_token: string | null
          staff_id: string | null
          temp_password_expires_at: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          is_department_head?: boolean
          is_super_admin?: boolean
          last_active_at?: string | null
          must_change_password?: boolean
          password: string
          phone?: string | null
          remember_me_until?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          session_expires_at?: string | null
          session_token?: string | null
          staff_id?: string | null
          temp_password_expires_at?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          is_department_head?: boolean
          is_super_admin?: boolean
          last_active_at?: string | null
          must_change_password?: boolean
          password?: string
          phone?: string | null
          remember_me_until?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          session_expires_at?: string | null
          session_token?: string | null
          staff_id?: string | null
          temp_password_expires_at?: string | null
          username?: string
        }
        Relationships: []
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          id: number
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: number
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: number
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          audience: string
          body: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_public: boolean
          priority: string
          target_department: string | null
          target_value: string | null
          title: string
          updated_at: string
        }
        Insert: {
          audience?: string
          body: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_public?: boolean
          priority?: string
          target_department?: string | null
          target_value?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string
          body?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_public?: boolean
          priority?: string
          target_department?: string | null
          target_value?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      articles: {
        Row: {
          author: string
          body: string
          created_at: string
          excerpt: string
          id: string
          is_published: boolean
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author?: string
          body: string
          created_at?: string
          excerpt?: string
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          body?: string
          created_at?: string
          excerpt?: string
          id?: string
          is_published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          asset_code: string | null
          assigned_at: string | null
          assigned_to: string | null
          category: string | null
          condition: string
          created_at: string
          id: string
          name: string
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          asset_code?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          category?: string | null
          condition?: string
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          asset_code?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          category?: string | null
          condition?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor: string
          created_at: string
          diff: Json | null
          entity: string
          entity_id: string | null
          id: string
          ip: string | null
        }
        Insert: {
          action: string
          actor: string
          created_at?: string
          diff?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
          ip?: string | null
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string
          diff?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
          ip?: string | null
        }
        Relationships: []
      }
      blocked_dates: {
        Row: {
          created_at: string
          date: string
          id: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      booking_assignments: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          is_team_leader: boolean
          notes: string | null
          report_time: string | null
          staff_id: string
          status: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          is_team_leader?: boolean
          notes?: string | null
          report_time?: string | null
          staff_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          is_team_leader?: boolean
          notes?: string | null
          report_time?: string | null
          staff_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_assignments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          add_ons: Json
          admin_notes: string | null
          county: string
          created_at: string
          discount_kes: number
          email: string
          estimated_cost_kes: number
          event_date: string
          event_type: string
          full_name: string
          id: string
          number_of_ushers: number
          package_price_kes: number
          package_slug: string
          phone: string
          promo_code: string | null
          reference: string
          referral_code: string | null
          special_instructions: string | null
          status: string
          updated_at: string
          venue: string
        }
        Insert: {
          add_ons?: Json
          admin_notes?: string | null
          county: string
          created_at?: string
          discount_kes?: number
          email: string
          estimated_cost_kes: number
          event_date: string
          event_type: string
          full_name: string
          id?: string
          number_of_ushers: number
          package_price_kes: number
          package_slug: string
          phone: string
          promo_code?: string | null
          reference: string
          referral_code?: string | null
          special_instructions?: string | null
          status?: string
          updated_at?: string
          venue: string
        }
        Update: {
          add_ons?: Json
          admin_notes?: string | null
          county?: string
          created_at?: string
          discount_kes?: number
          email?: string
          estimated_cost_kes?: number
          event_date?: string
          event_type?: string
          full_name?: string
          id?: string
          number_of_ushers?: number
          package_price_kes?: number
          package_slug?: string
          phone?: string
          promo_code?: string | null
          reference?: string
          referral_code?: string | null
          special_instructions?: string | null
          status?: string
          updated_at?: string
          venue?: string
        }
        Relationships: []
      }
      callback_requests: {
        Row: {
          created_at: string
          full_name: string
          id: string
          notes: string | null
          phone: string
          preferred_time: string | null
          status: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          notes?: string | null
          phone: string
          preferred_time?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string
          preferred_time?: string | null
          status?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          status: string
          visitor_email: string | null
          visitor_name: string
          visitor_phone: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          visitor_email?: string | null
          visitor_name: string
          visitor_phone: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          status?: string
          visitor_email?: string | null
          visitor_name?: string
          visitor_phone?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          body: string | null
          conversation_id: string
          created_at: string
          id: string
          image_url: string | null
          sender: string
        }
        Insert: {
          body?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          sender: string
        }
        Update: {
          body?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          sender?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_event_tokens: {
        Row: {
          booking_id: string
          created_at: string
          expires_at: string | null
          id: string
          token: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          token: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          token?: string
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          message: string
          phone: string | null
          subject: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          message: string
          phone?: string | null
          subject?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          message?: string
          phone?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          question: string
        }
        Insert: {
          answer: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          question: string
        }
        Update: {
          answer?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          question?: string
        }
        Relationships: []
      }
      gallery_images: {
        Row: {
          caption: string | null
          category: string
          created_at: string
          display_order: number
          id: string
          image_url: string
        }
        Insert: {
          caption?: string | null
          category: string
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
        }
        Update: {
          caption?: string | null
          category?: string
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
        }
        Relationships: []
      }
      grievances: {
        Row: {
          admin_response: string | null
          body: string
          created_at: string
          department: string | null
          id: string
          is_anonymous: boolean
          responded_at: string | null
          responded_by: string | null
          status: string
          subject: string
          submitted_by: string | null
          submitted_by_name: string | null
          updated_at: string
        }
        Insert: {
          admin_response?: string | null
          body: string
          created_at?: string
          department?: string | null
          id?: string
          is_anonymous?: boolean
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          subject: string
          submitted_by?: string | null
          submitted_by_name?: string | null
          updated_at?: string
        }
        Update: {
          admin_response?: string | null
          body?: string
          created_at?: string
          department?: string | null
          id?: string
          is_anonymous?: boolean
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          subject?: string
          submitted_by?: string | null
          submitted_by_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string
          source: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          phone: string
          source?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string
          source?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          link: string | null
          read_at: string | null
          target_user_id: string | null
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          target_user_id?: string | null
          title: string
          type: string
        }
        Update: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          target_user_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_packages: {
        Row: {
          description: string
          display_order: number
          features: Json
          id: string
          name: string
          price_kes: number
          slug: string
          updated_at: string
        }
        Insert: {
          description: string
          display_order?: number
          features?: Json
          id?: string
          name: string
          price_kes: number
          slug: string
          updated_at?: string
        }
        Update: {
          description?: string
          display_order?: number
          features?: Json
          id?: string
          name?: string
          price_kes?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          note: string | null
          times_used: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_type?: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          note?: string | null
          times_used?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          note?: string | null
          times_used?: number
        }
        Relationships: []
      }
      quotes: {
        Row: {
          booking_id: string | null
          county: string | null
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          date_ushers: Json
          event_date: string | null
          event_dates: string[]
          event_type: string
          id: string
          notes: string | null
          number_of_days: number
          number_of_ushers: number
          package_name: string | null
          package_price_kes: number
          package_slug: string | null
          pdf_path: string | null
          reference: string
          sent_at: string | null
          subtotal_kes: number
          total_kes: number
          transport_kes: number
          transport_rate_kes: number
          valid_until: string | null
          venue: string | null
        }
        Insert: {
          booking_id?: string | null
          county?: string | null
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          date_ushers?: Json
          event_date?: string | null
          event_dates?: string[]
          event_type: string
          id?: string
          notes?: string | null
          number_of_days?: number
          number_of_ushers: number
          package_name?: string | null
          package_price_kes: number
          package_slug?: string | null
          pdf_path?: string | null
          reference: string
          sent_at?: string | null
          subtotal_kes: number
          total_kes: number
          transport_kes?: number
          transport_rate_kes?: number
          valid_until?: string | null
          venue?: string | null
        }
        Update: {
          booking_id?: string | null
          county?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          date_ushers?: Json
          event_date?: string | null
          event_dates?: string[]
          event_type?: string
          id?: string
          notes?: string | null
          number_of_days?: number
          number_of_ushers?: number
          package_name?: string | null
          package_price_kes?: number
          package_slug?: string | null
          pdf_path?: string | null
          reference?: string
          sent_at?: string | null
          subtotal_kes?: number
          total_kes?: number
          transport_kes?: number
          transport_rate_kes?: number
          valid_until?: string | null
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          bucket: string
          created_at: string
          id: number
          identifier: string
        }
        Insert: {
          bucket: string
          created_at?: string
          id?: number
          identifier: string
        }
        Update: {
          bucket?: string
          created_at?: string
          id?: number
          identifier?: string
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          referrer_name: string
          referrer_phone: string
          reward_code: string | null
          reward_given: boolean
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          referrer_name: string
          referrer_phone: string
          reward_code?: string | null
          reward_given?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          referrer_name?: string
          referrer_phone?: string
          reward_code?: string | null
          reward_given?: boolean
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author: string
          created_at: string
          display_order: number
          email: string | null
          event_type: string | null
          id: string
          is_approved: boolean
          quote: string
          rating: number
          role: string | null
          updated_at: string
        }
        Insert: {
          author: string
          created_at?: string
          display_order?: number
          email?: string | null
          event_type?: string | null
          id?: string
          is_approved?: boolean
          quote: string
          rating: number
          role?: string | null
          updated_at?: string
        }
        Update: {
          author?: string
          created_at?: string
          display_order?: number
          email?: string | null
          event_type?: string | null
          id?: string
          is_approved?: boolean
          quote?: string
          rating?: number
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string
          description: string
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      staff: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          notes: string | null
          phone: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          notes?: string | null
          phone: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          admin_response: string | null
          category: string
          created_at: string
          details: string | null
          handled_by: string | null
          id: string
          is_staff: boolean
          priority: string
          reset_token: string | null
          reset_token_expires_at: string | null
          reset_used_at: string | null
          resolved_at: string | null
          status: string
          subject: string
          submitter_email: string | null
          submitter_name: string | null
          submitter_phone: string | null
          submitter_username: string | null
          ticket_no: string
          updated_at: string
        }
        Insert: {
          admin_response?: string | null
          category: string
          created_at?: string
          details?: string | null
          handled_by?: string | null
          id?: string
          is_staff?: boolean
          priority?: string
          reset_token?: string | null
          reset_token_expires_at?: string | null
          reset_used_at?: string | null
          resolved_at?: string | null
          status?: string
          subject: string
          submitter_email?: string | null
          submitter_name?: string | null
          submitter_phone?: string | null
          submitter_username?: string | null
          ticket_no?: string
          updated_at?: string
        }
        Update: {
          admin_response?: string | null
          category?: string
          created_at?: string
          details?: string | null
          handled_by?: string | null
          id?: string
          is_staff?: boolean
          priority?: string
          reset_token?: string | null
          reset_token_expires_at?: string | null
          reset_used_at?: string | null
          resolved_at?: string | null
          status?: string
          subject?: string
          submitter_email?: string | null
          submitter_name?: string | null
          submitter_phone?: string | null
          submitter_username?: string | null
          ticket_no?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_handled_by_fkey"
            columns: ["handled_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          author: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          quote: string
          rating: number
          role: string | null
        }
        Insert: {
          author: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          quote: string
          rating?: number
          role?: string | null
        }
        Update: {
          author?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          quote?: string
          rating?: number
          role?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_promo: {
        Args: { _code: string; _subtotal: number }
        Returns: {
          discount_kes: number
          message: string
          valid: boolean
        }[]
      }
      create_staff_account: {
        Args: {
          _created_by: string
          _department: string
          _email?: string
          _full_name: string
          _is_department_head: boolean
          _password: string
          _phone: string
          _role: Database["public"]["Enums"]["app_role"]
          _staff_id: string
          _username: string
        }
        Returns: string
      }
      get_unavailable_dates: {
        Args: never
        Returns: {
          event_date: string
          kind: string
        }[]
      }
      redeem_promo: { Args: { _code: string }; Returns: undefined }
      update_account_password: {
        Args: { _id: string; _password: string }
        Returns: undefined
      }
      validate_referral: {
        Args: { _code: string }
        Returns: {
          referrer_name: string
          valid: boolean
        }[]
      }
      verify_admin_password: {
        Args: { _password: string; _username: string }
        Returns: {
          id: string
          username: string
        }[]
      }
      verify_login: {
        Args: { _identifier: string; _password: string }
        Returns: {
          department: string
          email: string
          full_name: string
          id: string
          is_department_head: boolean
          is_super_admin: boolean
          role: Database["public"]["Enums"]["app_role"]
          staff_id: string
          username: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "staff_management"
        | "bookings_operations"
        | "customer_support"
        | "media_content"
        | "finance_reporting"
        | "staff"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: [
        "super_admin",
        "staff_management",
        "bookings_operations",
        "customer_support",
        "media_content",
        "finance_reporting",
        "staff",
      ],
    },
  },
} as const
