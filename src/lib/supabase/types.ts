export type Database = {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string;
          user_id: string;
          company_name: string;
          address: string | null;
          latitude: number | null;
          longitude: number | null;
          notes: string | null;
          status: "activo" | "potencial" | "inactivo";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          company_name: string;
          address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          notes?: string | null;
          status?: "activo" | "potencial" | "inactivo";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["clients"]["Insert"]>;
        Relationships: [];
      };
      client_teams: {
        Row: {
          client_id: string;
          team_id: string;
          added_at: string;
        };
        Insert: {
          client_id: string;
          team_id: string;
          added_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["client_teams"]["Insert"]>;
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["teams"]["Insert"]>;
        Relationships: [];
      };
      team_members: {
        Row: {
          team_id: string;
          user_id: string;
          role: "owner" | "member";
          created_at: string;
        };
        Insert: {
          team_id: string;
          user_id: string;
          role?: "owner" | "member";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["team_members"]["Insert"]>;
        Relationships: [];
      };
      contacts: {
        Row: {
          id: string;
          client_id: string;
          name: string;
          phone: string | null;
          email: string | null;
          role: string | null;
          is_primary: boolean;
        };
        Insert: {
          id?: string;
          client_id: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          role?: string | null;
          is_primary?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["contacts"]["Insert"]>;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          client_id: string;
          name: string;
          details: string | null;
        };
        Insert: {
          id?: string;
          client_id: string;
          name: string;
          details?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: [];
      };
      visits: {
        Row: {
          id: string;
          client_id: string;
          scheduled_at: string;
          status: "pendiente" | "completada" | "cancelada";
          reminder_minutes_before: number | null;
          created_at: string;
          notified_at: string | null;
        };
        Insert: {
          id?: string;
          client_id: string;
          scheduled_at: string;
          status?: "pendiente" | "completada" | "cancelada";
          reminder_minutes_before?: number | null;
          created_at?: string;
          notified_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["visits"]["Insert"]>;
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["push_subscriptions"]["Insert"]>;
        Relationships: [];
      };
      team_messages: {
        Row: {
          id: string;
          team_id: string;
          user_id: string;
          content: string | null;
          message_type: "texto" | "imagen" | "documento" | "video";
          file_url: string | null;
          file_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          user_id?: string;
          content?: string | null;
          message_type?: "texto" | "imagen" | "documento" | "video";
          file_url?: string | null;
          file_name?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["team_messages"]["Insert"]>;
        Relationships: [];
      };
      user_notification_preferences: {
        Row: {
          user_id: string;
          chat_notifications: boolean;
        };
        Insert: {
          user_id: string;
          chat_notifications?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["user_notification_preferences"]["Insert"]>;
        Relationships: [];
      };
      visit_comments: {
        Row: {
          id: string;
          visit_id: string;
          comment: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          visit_id: string;
          comment: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["visit_comments"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      find_user_id_by_email: {
        Args: { p_email: string };
        Returns: string | null;
      };
      get_team_members: {
        Args: { p_team_id: string };
        Returns: {
          user_id: string;
          email: string;
          role: "owner" | "member";
          name: string | null;
          avatar_url: string | null;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
