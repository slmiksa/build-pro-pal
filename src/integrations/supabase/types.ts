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
      audit_events: {
        Row: {
          actor_id: string
          at: string
          conversation_id: string | null
          detail: string
          id: string
          message_id: string | null
          type: string
        }
        Insert: {
          actor_id: string
          at?: string
          conversation_id?: string | null
          detail?: string
          id?: string
          message_id?: string | null
          type: string
        }
        Update: {
          actor_id?: string
          at?: string
          conversation_id?: string | null
          detail?: string
          id?: string
          message_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_events_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          conversation_id: string
          created_at: string
          last_read_at: string
          pinned: boolean
          role: Database["public"]["Enums"]["conv_role"]
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          last_read_at?: string
          pinned?: boolean
          role?: Database["public"]["Enums"]["conv_role"]
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          last_read_at?: string
          pinned?: boolean
          role?: Database["public"]["Enums"]["conv_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          avatar_path: string | null
          created_at: string
          created_by: string
          id: string
          kind: Database["public"]["Enums"]["conversation_kind"]
          locked: boolean
          name: string | null
          pinned_message_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          created_by: string
          id?: string
          kind?: Database["public"]["Enums"]["conversation_kind"]
          locked?: boolean
          name?: string | null
          pinned_message_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          created_by?: string
          id?: string
          kind?: Database["public"]["Enums"]["conversation_kind"]
          locked?: boolean
          name?: string | null
          pinned_message_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_pinned_message_id_fkey"
            columns: ["pinned_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          used: boolean
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          email: string
          expires_at?: string
          id?: string
          used?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          used?: boolean
        }
        Relationships: []
      }
      keepalive: {
        Row: {
          id: number
          last_ping: string
          pings: number
        }
        Insert: {
          id?: number
          last_ping?: string
          pings?: number
        }
        Update: {
          id?: number
          last_ping?: string
          pings?: number
        }
        Relationships: []
      }
      message_reads: {
        Row: {
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          allow_copy: boolean
          allow_download: boolean
          allow_forward: boolean
          attachment: Json | null
          block_screenshot: boolean
          conversation_id: string
          created_at: string
          expires_at: string | null
          expires_in_min: number
          forwarded_from: string | null
          id: string
          max_opens: number
          mentions: string[]
          opens: number
          revoked: boolean
          sender_id: string
          text: string | null
          watermark: boolean
        }
        Insert: {
          allow_copy?: boolean
          allow_download?: boolean
          allow_forward?: boolean
          attachment?: Json | null
          block_screenshot?: boolean
          conversation_id: string
          created_at?: string
          expires_at?: string | null
          expires_in_min?: number
          forwarded_from?: string | null
          id?: string
          max_opens?: number
          mentions?: string[]
          opens?: number
          revoked?: boolean
          sender_id: string
          text?: string | null
          watermark?: boolean
        }
        Update: {
          allow_copy?: boolean
          allow_download?: boolean
          allow_forward?: boolean
          attachment?: Json | null
          block_screenshot?: boolean
          conversation_id?: string
          created_at?: string
          expires_at?: string | null
          expires_in_min?: number
          forwarded_from?: string | null
          id?: string
          max_opens?: number
          mentions?: string[]
          opens?: number
          revoked?: boolean
          sender_id?: string
          text?: string | null
          watermark?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_forwarded_from_fkey"
            columns: ["forwarded_from"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      org_settings: {
        Row: {
          allowed_domains: string[]
          created_at: string
          id: string
          org_name: string
          singleton: boolean
          updated_at: string
        }
        Insert: {
          allowed_domains?: string[]
          created_at?: string
          id?: string
          org_name?: string
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          allowed_domains?: string[]
          created_at?: string
          id?: string
          org_name?: string
          singleton?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_path: string | null
          can_browse_directory: boolean
          color: string
          created_at: string
          disabled: boolean
          email: string
          hidden_in_directory: boolean
          id: string
          name: string
          online: boolean
          title: string
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          can_browse_directory?: boolean
          color?: string
          created_at?: string
          disabled?: boolean
          email?: string
          hidden_in_directory?: boolean
          id: string
          name?: string
          online?: boolean
          title?: string
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          can_browse_directory?: boolean
          color?: string
          created_at?: string
          disabled?: boolean
          email?: string
          hidden_in_directory?: boolean
          id?: string
          name?: string
          online?: boolean
          title?: string
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
      admin_create_member: {
        Args: {
          _email: string
          _name: string
          _password: string
          _title?: string
        }
        Returns: string
      }
      admin_delete_member: { Args: { _user_id: string }; Returns: boolean }
      admin_set_member_password: {
        Args: { _password: string; _user_id: string }
        Returns: boolean
      }
      can_browse_directory: { Args: { _user_id: string }; Returns: boolean }
      can_manage_conversation: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      check_invite: {
        Args: { _code: string }
        Returns: {
          email: string
          expires_at: string
          used: boolean
        }[]
      }
      consume_invite: { Args: { _code: string }; Returns: boolean }
      conv_role_of: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["conv_role"]
      }
      delete_conversation: {
        Args: { _conversation_id: string }
        Returns: boolean
      }
      find_profile_by_email: {
        Args: { _email: string }
        Returns: {
          disabled: boolean
          email: string
          id: string
          name: string
          title: string
        }[]
      }
      forward_message: {
        Args: { _message_id: string; _target_conversation_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_member: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      ping_keepalive: { Args: never; Returns: undefined }
      register_message_open: { Args: { _message_id: string }; Returns: string }
      remove_conversation_member: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      set_conversation_member_role: {
        Args: {
          _conversation_id: string
          _role: Database["public"]["Enums"]["conv_role"]
          _user_id: string
        }
        Returns: boolean
      }
      shares_conversation: {
        Args: { _a: string; _b: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager"
      conv_role: "owner" | "moderator" | "member"
      conversation_kind: "direct" | "group"
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
      app_role: ["admin", "manager"],
      conv_role: ["owner", "moderator", "member"],
      conversation_kind: ["direct", "group"],
    },
  },
} as const
