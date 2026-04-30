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
      admin_audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          notes: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          notes?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          anonymous_user_id: string
          blocked_by_admin_id: string | null
          created_at: string
          id: string
          reason: string | null
          status: string
        }
        Insert: {
          anonymous_user_id: string
          blocked_by_admin_id?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          status?: string
        }
        Update: {
          anonymous_user_id?: string
          blocked_by_admin_id?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          status?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          anonymous_user_id: string
          comment_text: string
          company_id: string
          created_at: string
          deleted_at: string | null
          id: string
          parent_comment_id: string | null
          report_count: number
          status: string
        }
        Insert: {
          anonymous_user_id: string
          comment_text: string
          company_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          parent_comment_id?: string | null
          report_count?: number
          status?: string
        }
        Update: {
          anonymous_user_id?: string
          comment_text?: string
          company_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          parent_comment_id?: string | null
          report_count?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          category: string
          created_at: string
          description: string | null
          email: string | null
          id: string
          location: string | null
          logo_url: string | null
          name: string
          phone: string | null
          services: string | null
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          services?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          location?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          services?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      company_suggestions: {
        Row: {
          category: string
          company_name: string
          created_at: string
          description: string | null
          id: string
          services: string | null
          status: string
          suggested_by_anonymous_user_id: string
        }
        Insert: {
          category: string
          company_name: string
          created_at?: string
          description?: string | null
          id?: string
          services?: string | null
          status?: string
          suggested_by_anonymous_user_id: string
        }
        Update: {
          category?: string
          company_name?: string
          created_at?: string
          description?: string | null
          id?: string
          services?: string | null
          status?: string
          suggested_by_anonymous_user_id?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          anonymous_user_id: string
          company_id: string
          created_at: string
          id: string
          rating: number
          rating_change_count: number
          updated_at: string
        }
        Insert: {
          anonymous_user_id: string
          company_id: string
          created_at?: string
          id?: string
          rating: number
          rating_change_count?: number
          updated_at?: string
        }
        Update: {
          anonymous_user_id?: string
          company_id?: string
          created_at?: string
          id?: string
          rating?: number
          rating_change_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      reported_comments: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          reason: string
          reported_by_anonymous_user_id: string
          reviewed_at: string | null
          reviewed_by_admin_id: string | null
          status: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          reason: string
          reported_by_anonymous_user_id: string
          reviewed_at?: string | null
          reviewed_by_admin_id?: string | null
          status?: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          reason?: string
          reported_by_anonymous_user_id?: string
          reviewed_at?: string | null
          reviewed_by_admin_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reported_comments_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_tier: { Args: { _user_id: string }; Returns: boolean }
      is_blocked: { Args: { _anon_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "super_admin" | "sub_admin"
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
      app_role: ["admin", "moderator", "user", "super_admin", "sub_admin"],
    },
  },
} as const
