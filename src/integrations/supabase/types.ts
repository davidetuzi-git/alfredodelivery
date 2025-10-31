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
        }
        Insert: {
          created_at?: string
          deliverer_id: string
          id?: string
          order_id: string
          responded_at?: string | null
          sent_at?: string
          status?: string
        }
        Update: {
          created_at?: string
          deliverer_id?: string
          id?: string
          order_id?: string
          responded_at?: string | null
          sent_at?: string
          status?: string
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
          payment_method: string | null
          pickup_code: string
          status: string
          status_updated_at: string | null
          store_name: string
          time_slot: string
          total_amount: number
          updated_at: string
          user_id: string | null
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
          payment_method?: string | null
          pickup_code: string
          status?: string
          status_updated_at?: string | null
          store_name: string
          time_slot: string
          total_amount: number
          updated_at?: string
          user_id?: string | null
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
          payment_method?: string | null
          pickup_code?: string
          status?: string
          status_updated_at?: string | null
          store_name?: string
          time_slot?: string
          total_amount?: number
          updated_at?: string
          user_id?: string | null
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
      profiles: {
        Row: {
          address: string | null
          allergies: string | null
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
          postal_code: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          allergies?: string | null
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
          postal_code?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          allergies?: string | null
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
          postal_code?: string | null
          updated_at?: string
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
      generate_pickup_code: { Args: never; Returns: string }
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
    },
  },
} as const
