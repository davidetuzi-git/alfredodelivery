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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ad_clicks: {
        Row: {
          ad_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          ad_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          ad_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      ad_impressions: {
        Row: {
          ad_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          ad_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          ad_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      ad_slots: {
        Row: {
          created_at: string
          description: string | null
          dimensions: string | null
          id: string
          location: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          dimensions?: string | null
          id?: string
          location: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          dimensions?: string | null
          id?: string
          location?: string
          name?: string
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          title: string
          type: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      advertisements: {
        Row: {
          client_name: string
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string
          id: string
          image_url: string | null
          is_active: boolean
          link_url: string
          payment_amount: number
          payment_status: string
          slot_id: string | null
          start_date: string
          unique_name: string
          updated_at: string
        }
        Insert: {
          client_name: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url: string
          payment_amount?: number
          payment_status?: string
          slot_id?: string | null
          start_date?: string
          unique_name: string
          updated_at?: string
        }
        Update: {
          client_name?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          link_url?: string
          payment_amount?: number
          payment_status?: string
          slot_id?: string | null
          start_date?: string
          unique_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "advertisements_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "ad_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_preferences: {
        Row: {
          created_at: string
          id: string
          loyalty_updates: boolean
          new_features: boolean
          newsletter: boolean
          order_updates: boolean
          promotions: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          loyalty_updates?: boolean
          new_features?: boolean
          newsletter?: boolean
          order_updates?: boolean
          promotions?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          loyalty_updates?: boolean
          new_features?: boolean
          newsletter?: boolean
          order_updates?: boolean
          promotions?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deliverer_address_requests: {
        Row: {
          created_at: string
          deliverer_id: string
          id: string
          notes: string | null
          requested_address: string
          requested_latitude: number
          requested_longitude: number
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          deliverer_id: string
          id?: string
          notes?: string | null
          requested_address: string
          requested_latitude: number
          requested_longitude: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          deliverer_id?: string
          id?: string
          notes?: string | null
          requested_address?: string
          requested_latitude?: number
          requested_longitude?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliverer_address_requests_deliverer_id_fkey"
            columns: ["deliverer_id"]
            isOneToOne: false
            referencedRelation: "deliverers"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverer_auth_tokens: {
        Row: {
          created_at: string
          deliverer_id: string
          expires_at: string
          id: string
          notification_id: string | null
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          deliverer_id: string
          expires_at?: string
          id?: string
          notification_id?: string | null
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          deliverer_id?: string
          expires_at?: string
          id?: string
          notification_id?: string | null
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deliverer_auth_tokens_deliverer_id_fkey"
            columns: ["deliverer_id"]
            isOneToOne: false
            referencedRelation: "deliverers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliverer_auth_tokens_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "delivery_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      deliverer_requests: {
        Row: {
          created_at: string
          document_type: string | null
          document_url: string | null
          email: string
          id: string
          name: string
          phone: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_type?: string | null
          document_url?: string | null
          email: string
          id?: string
          name: string
          phone: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_type?: string | null
          document_url?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deliverers: {
        Row: {
          avatar_url: string | null
          base_address: string | null
          created_at: string
          current_orders: number
          email: string | null
          id: string
          latitude: number | null
          longitude: number | null
          max_orders: number
          name: string
          on_time_deliveries: number | null
          operating_radius_km: number | null
          phone: string
          rating: number | null
          status: string
          telegram_chat_id: string | null
          total_deliveries: number | null
          updated_at: string
          user_id: string | null
          zone: string | null
        }
        Insert: {
          avatar_url?: string | null
          base_address?: string | null
          created_at?: string
          current_orders?: number
          email?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          max_orders?: number
          name: string
          on_time_deliveries?: number | null
          operating_radius_km?: number | null
          phone: string
          rating?: number | null
          status?: string
          telegram_chat_id?: string | null
          total_deliveries?: number | null
          updated_at?: string
          user_id?: string | null
          zone?: string | null
        }
        Update: {
          avatar_url?: string | null
          base_address?: string | null
          created_at?: string
          current_orders?: number
          email?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          max_orders?: number
          name?: string
          on_time_deliveries?: number | null
          operating_radius_km?: number | null
          phone?: string
          rating?: number | null
          status?: string
          telegram_chat_id?: string | null
          total_deliveries?: number | null
          updated_at?: string
          user_id?: string | null
          zone?: string | null
        }
        Relationships: []
      }
      delivery_notifications: {
        Row: {
          created_at: string
          deliverer_id: string
          id: string
          order_id: string
          responded_at: string | null
          sent_at: string
          status: string
          telegram_chat_id: string | null
          telegram_message_id: string | null
        }
        Insert: {
          created_at?: string
          deliverer_id: string
          id?: string
          order_id: string
          responded_at?: string | null
          sent_at?: string
          status?: string
          telegram_chat_id?: string | null
          telegram_message_id?: string | null
        }
        Update: {
          created_at?: string
          deliverer_id?: string
          id?: string
          order_id?: string
          responded_at?: string | null
          sent_at?: string
          status?: string
          telegram_chat_id?: string | null
          telegram_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_notifications_deliverer_id_fkey"
            columns: ["deliverer_id"]
            isOneToOne: false
            referencedRelation: "deliverers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_profiles: {
        Row: {
          created_at: string
          current_level: Database["public"]["Enums"]["loyalty_level"]
          id: string
          lifetime_points: number
          monthly_orders_count: number
          monthly_orders_reset_at: string
          points_balance: number
          referral_code: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_level?: Database["public"]["Enums"]["loyalty_level"]
          id?: string
          lifetime_points?: number
          monthly_orders_count?: number
          monthly_orders_reset_at?: string
          points_balance?: number
          referral_code?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_level?: Database["public"]["Enums"]["loyalty_level"]
          id?: string
          lifetime_points?: number
          monthly_orders_count?: number
          monthly_orders_reset_at?: string
          points_balance?: number
          referral_code?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      order_chat_messages: {
        Row: {
          created_at: string | null
          id: string
          message: string
          order_id: string
          sender_name: string
          sender_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          order_id: string
          sender_name: string
          sender_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          order_id?: string
          sender_name?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_chat_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_feedback: {
        Row: {
          comment: string | null
          created_at: string | null
          deliverer_id: string
          id: string
          order_id: string
          rating: number
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          deliverer_id: string
          id?: string
          order_id: string
          rating: number
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          deliverer_id?: string
          id?: string
          order_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_feedback_deliverer_id_fkey"
            columns: ["deliverer_id"]
            isOneToOne: false
            referencedRelation: "deliverers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_feedback_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          status: string
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_tips: {
        Row: {
          created_at: string
          deliverer_id: string
          id: string
          order_id: string
          platform_share: number
          rider_share: number
          tip_amount: number
          user_id: string
        }
        Insert: {
          created_at?: string
          deliverer_id: string
          id?: string
          order_id: string
          platform_share: number
          rider_share: number
          tip_amount: number
          user_id: string
        }
        Update: {
          created_at?: string
          deliverer_id?: string
          id?: string
          order_id?: string
          platform_share?: number
          rider_share?: number
          tip_amount?: number
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string
          customer_name: string
          customer_phone: string
          deliverer_id: string | null
          deliverer_name: string | null
          deliverer_phone: string | null
          delivery_address: string
          delivery_date: string
          delivery_fee: number
          delivery_status: string
          discount: number
          id: string
          items: Json
          latitude: number | null
          longitude: number | null
          loyalty_card_barcode: string | null
          loyalty_card_used: boolean | null
          payment_method: string | null
          pickup_code: string
          status: string
          status_updated_at: string | null
          store_name: string
          time_slot: string
          total_amount: number
          updated_at: string
          user_id: string
          voucher_code: string | null
          voucher_discount: number | null
        }
        Insert: {
          created_at?: string
          customer_name: string
          customer_phone: string
          deliverer_id?: string | null
          deliverer_name?: string | null
          deliverer_phone?: string | null
          delivery_address: string
          delivery_date: string
          delivery_fee?: number
          delivery_status?: string
          discount?: number
          id?: string
          items: Json
          latitude?: number | null
          longitude?: number | null
          loyalty_card_barcode?: string | null
          loyalty_card_used?: boolean | null
          payment_method?: string | null
          pickup_code: string
          status?: string
          status_updated_at?: string | null
          store_name: string
          time_slot: string
          total_amount: number
          updated_at?: string
          user_id: string
          voucher_code?: string | null
          voucher_discount?: number | null
        }
        Update: {
          created_at?: string
          customer_name?: string
          customer_phone?: string
          deliverer_id?: string | null
          deliverer_name?: string | null
          deliverer_phone?: string | null
          delivery_address?: string
          delivery_date?: string
          delivery_fee?: number
          delivery_status?: string
          discount?: number
          id?: string
          items?: Json
          latitude?: number | null
          longitude?: number | null
          loyalty_card_barcode?: string | null
          loyalty_card_used?: boolean | null
          payment_method?: string | null
          pickup_code?: string
          status?: string
          status_updated_at?: string | null
          store_name?: string
          time_slot?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
          voucher_code?: string | null
          voucher_discount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_deliverer_id_fkey"
            columns: ["deliverer_id"]
            isOneToOne: false
            referencedRelation: "deliverers"
            referencedColumns: ["id"]
          },
        ]
      }
      points_transactions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          order_id: string | null
          points: number
          transaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          points: number
          transaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          points?: number
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      product_prices: {
        Row: {
          created_at: string
          id: string
          price: number
          product_name: string
          source: string | null
          store_address: string | null
          store_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          price: number
          product_name: string
          source?: string | null
          store_address?: string | null
          store_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          price?: number
          product_name?: string
          source?: string | null
          store_address?: string | null
          store_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string | null
          address: string | null
          allergies: string | null
          avatar_url: string | null
          city: string | null
          created_at: string
          delivery_notes: string | null
          dietary_preferences: string | null
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          onboarding_completed: boolean
          phone: string | null
          phone_verification_code: string | null
          phone_verification_expires_at: string | null
          phone_verified: boolean | null
          postal_code: string | null
          preferred_store: string | null
          updated_at: string
        }
        Insert: {
          account_status?: string | null
          address?: string | null
          allergies?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          delivery_notes?: string | null
          dietary_preferences?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          last_name?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          phone_verification_code?: string | null
          phone_verification_expires_at?: string | null
          phone_verified?: boolean | null
          postal_code?: string | null
          preferred_store?: string | null
          updated_at?: string
        }
        Update: {
          account_status?: string | null
          address?: string | null
          allergies?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          delivery_notes?: string | null
          dietary_preferences?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          phone_verification_code?: string | null
          phone_verification_expires_at?: string | null
          phone_verified?: boolean | null
          postal_code?: string | null
          preferred_store?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      referral_uses: {
        Row: {
          created_at: string
          id: string
          referred_bonus_applied: boolean
          referred_user_id: string
          referrer_bonus_applied: boolean
          referrer_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          referred_bonus_applied?: boolean
          referred_user_id: string
          referrer_bonus_applied?: boolean
          referrer_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          referred_bonus_applied?: boolean
          referred_user_id?: string
          referrer_bonus_applied?: boolean
          referrer_user_id?: string
        }
        Relationships: []
      }
      rider_compensation_config: {
        Row: {
          base_delivery_fee_max: number
          base_delivery_fee_min: number
          created_at: string
          distance_bonus_per_km: number
          distance_bonus_threshold_km: number
          first_order_bonus: number
          high_demand_multiplier: number
          id: string
          peak_time_multiplier: number
          picking_fee_per_item: number
          rating_bonus_amount: number
          rating_bonus_threshold: number
          rider_tip_percentage: number
          uncovered_zone_bonus: number
          updated_at: string
          updated_by: string | null
          weather_bonus_amount: number
          weather_bonus_enabled: boolean
        }
        Insert: {
          base_delivery_fee_max?: number
          base_delivery_fee_min?: number
          created_at?: string
          distance_bonus_per_km?: number
          distance_bonus_threshold_km?: number
          first_order_bonus?: number
          high_demand_multiplier?: number
          id?: string
          peak_time_multiplier?: number
          picking_fee_per_item?: number
          rating_bonus_amount?: number
          rating_bonus_threshold?: number
          rider_tip_percentage?: number
          uncovered_zone_bonus?: number
          updated_at?: string
          updated_by?: string | null
          weather_bonus_amount?: number
          weather_bonus_enabled?: boolean
        }
        Update: {
          base_delivery_fee_max?: number
          base_delivery_fee_min?: number
          created_at?: string
          distance_bonus_per_km?: number
          distance_bonus_threshold_km?: number
          first_order_bonus?: number
          high_demand_multiplier?: number
          id?: string
          peak_time_multiplier?: number
          picking_fee_per_item?: number
          rating_bonus_amount?: number
          rating_bonus_threshold?: number
          rider_tip_percentage?: number
          uncovered_zone_bonus?: number
          updated_at?: string
          updated_by?: string | null
          weather_bonus_amount?: number
          weather_bonus_enabled?: boolean
        }
        Relationships: []
      }
      rider_earnings: {
        Row: {
          base_fee: number
          created_at: string
          deliverer_id: string
          distance_bonus: number
          id: string
          order_id: string
          paid_at: string | null
          peak_bonus: number
          picking_fee: number
          tip_amount: number
          total_earnings: number
          weather_bonus: number
        }
        Insert: {
          base_fee?: number
          created_at?: string
          deliverer_id: string
          distance_bonus?: number
          id?: string
          order_id: string
          paid_at?: string | null
          peak_bonus?: number
          picking_fee?: number
          tip_amount?: number
          total_earnings?: number
          weather_bonus?: number
        }
        Update: {
          base_fee?: number
          created_at?: string
          deliverer_id?: string
          distance_bonus?: number
          id?: string
          order_id?: string
          paid_at?: string | null
          peak_bonus?: number
          picking_fee?: number
          tip_amount?: number
          total_earnings?: number
          weather_bonus?: number
        }
        Relationships: []
      }
      rider_mission_progress: {
        Row: {
          bonus_paid: boolean
          completed: boolean
          completed_at: string | null
          created_at: string
          current_progress: number
          deliverer_id: string
          id: string
          mission_id: string
        }
        Insert: {
          bonus_paid?: boolean
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_progress?: number
          deliverer_id: string
          id?: string
          mission_id: string
        }
        Update: {
          bonus_paid?: boolean
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          current_progress?: number
          deliverer_id?: string
          id?: string
          mission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rider_mission_progress_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "rider_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      rider_missions: {
        Row: {
          active: boolean
          bonus_amount: number
          bonus_percentage: number | null
          created_at: string
          description: string | null
          id: string
          target_deliveries: number | null
          target_hours_end: string | null
          target_hours_start: string | null
          title: string
          valid_from: string
          valid_until: string
        }
        Insert: {
          active?: boolean
          bonus_amount: number
          bonus_percentage?: number | null
          created_at?: string
          description?: string | null
          id?: string
          target_deliveries?: number | null
          target_hours_end?: string | null
          target_hours_start?: string | null
          title: string
          valid_from: string
          valid_until: string
        }
        Update: {
          active?: boolean
          bonus_amount?: number
          bonus_percentage?: number | null
          created_at?: string
          description?: string | null
          id?: string
          target_deliveries?: number | null
          target_hours_end?: string | null
          target_hours_start?: string | null
          title?: string
          valid_from?: string
          valid_until?: string
        }
        Relationships: []
      }
      saved_addresses: {
        Row: {
          address: string
          city: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          label: string
          latitude: number | null
          longitude: number | null
          postal_code: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address: string
          city?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          label: string
          latitude?: number | null
          longitude?: number | null
          postal_code?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string
          city?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          label?: string
          latitude?: number | null
          longitude?: number | null
          postal_code?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      saved_payment_methods: {
        Row: {
          card_last_four: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          label: string
          payment_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          card_last_four?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          label: string
          payment_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          card_last_four?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          label?: string
          payment_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      saved_shopping_lists: {
        Row: {
          address_coords: Json | null
          created_at: string
          delivery_address: string | null
          id: string
          items: Json
          name: string
          store: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address_coords?: Json | null
          created_at?: string
          delivery_address?: string | null
          id?: string
          items?: Json
          name?: string
          store?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address_coords?: Json | null
          created_at?: string
          delivery_address?: string | null
          id?: string
          items?: Json
          name?: string
          store?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      service_calendar: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          holiday_name: string | null
          holiday_surcharge: number
          id: string
          is_blocked: boolean
          is_holiday: boolean
          notification_sent_at: string | null
          reason: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date: string
          holiday_name?: string | null
          holiday_surcharge?: number
          id?: string
          is_blocked?: boolean
          is_holiday?: boolean
          notification_sent_at?: string | null
          reason?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          holiday_name?: string | null
          holiday_surcharge?: number
          id?: string
          is_blocked?: boolean
          is_holiday?: boolean
          notification_sent_at?: string | null
          reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      store_loyalty_cards: {
        Row: {
          barcode: string
          card_name: string | null
          created_at: string
          id: string
          store_chain: string
          updated_at: string
          user_id: string
        }
        Insert: {
          barcode: string
          card_name?: string | null
          created_at?: string
          id?: string
          store_chain: string
          updated_at?: string
          user_id: string
        }
        Update: {
          barcode?: string
          card_name?: string | null
          created_at?: string
          id?: string
          store_chain?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      supermarkets: {
        Row: {
          accepts_meal_vouchers: boolean
          address: string
          city: string
          created_at: string
          id: string
          meal_voucher_types: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          accepts_meal_vouchers?: boolean
          address: string
          city: string
          created_at?: string
          id?: string
          meal_voucher_types?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          accepts_meal_vouchers?: boolean
          address?: string
          city?: string
          created_at?: string
          id?: string
          meal_voucher_types?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string
          read: boolean
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          read?: boolean
          read_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          read?: boolean
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          cancelled_at: string | null
          created_at: string
          deliveries_remaining: number
          deliveries_total: number
          expires_at: string
          id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          price_paid: number
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          deliveries_remaining: number
          deliveries_total: number
          expires_at: string
          id?: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          price_paid: number
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          deliveries_remaining?: number
          deliveries_total?: number
          expires_at?: string
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          price_paid?: number
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      voucher_uses: {
        Row: {
          discount_applied: number
          id: string
          order_id: string
          used_at: string | null
          user_id: string | null
          voucher_id: string
        }
        Insert: {
          discount_applied: number
          id?: string
          order_id: string
          used_at?: string | null
          user_id?: string | null
          voucher_id: string
        }
        Update: {
          discount_applied?: number
          id?: string
          order_id?: string
          used_at?: string | null
          user_id?: string | null
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voucher_uses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_uses_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          active: boolean | null
          code: string
          created_at: string | null
          created_by: string | null
          current_uses: number | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          max_uses: number | null
          min_order_amount: number | null
          updated_at: string | null
          valid_from: string
          valid_until: string
        }
        Insert: {
          active?: boolean | null
          code: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          max_uses?: number | null
          min_order_amount?: number | null
          updated_at?: string | null
          valid_from?: string
          valid_until: string
        }
        Update: {
          active?: boolean | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          max_uses?: number | null
          min_order_amount?: number | null
          updated_at?: string | null
          valid_from?: string
          valid_until?: string
        }
        Relationships: []
      }
      zone_requests: {
        Row: {
          area: string | null
          city: string
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          notes: string | null
          phone: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          area?: string | null
          city: string
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          notes?: string | null
          phone: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          area?: string | null
          city?: string
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          phone?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_deliverer_request: {
        Args: { request_id: string }
        Returns: undefined
      }
      calculate_distance: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      calculate_loyalty_level: {
        Args: { has_subscription: boolean; monthly_orders: number }
        Returns: Database["public"]["Enums"]["loyalty_level"]
      }
      cleanup_old_prices: { Args: never; Returns: undefined }
      generate_pickup_code: { Args: never; Returns: string }
      get_level_discount_percent: {
        Args: { level: Database["public"]["Enums"]["loyalty_level"] }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "deliverer" | "customer"
      loyalty_level: "bronze" | "silver" | "gold" | "platinum"
      subscription_plan: "monthly" | "yearly"
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
      app_role: ["admin", "deliverer", "customer"],
      loyalty_level: ["bronze", "silver", "gold", "platinum"],
      subscription_plan: ["monthly", "yearly"],
    },
  },
} as const
