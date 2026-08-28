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
      };
      visits: {
        Row: {
          id: string;
          client_id: string;
          scheduled_at: string;
          status: "pendiente" | "completada" | "cancelada";
          reminder_minutes_before: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          scheduled_at: string;
          status?: "pendiente" | "completada" | "cancelada";
          reminder_minutes_before?: number | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["visits"]["Insert"]>;
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
      };
    };
  };
};
