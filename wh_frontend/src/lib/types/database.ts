export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          role: "admin" | "user";
          timezone: string | null;
          is_active: boolean;
          created_at: string;
          last_signed_in_at: string | null;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          role?: "admin" | "user";
          timezone?: string | null;
          is_active?: boolean;
          created_at?: string;
          last_signed_in_at?: string | null;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          email?: string | null;
          role?: "admin" | "user";
          timezone?: string | null;
          is_active?: boolean;
          created_at?: string;
          last_signed_in_at?: string | null;
        };
      };
      accounts: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          currency_code: string;
          settings: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          currency_code?: string;
          settings?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          currency_code?: string;
          settings?: Json;
          created_at?: string;
        };
      };
      account_users: {
        Row: {
          account_id: string;
          user_id: string;
          role: "owner" | "admin" | "member";
          created_at: string;
        };
        Insert: {
          account_id: string;
          user_id: string;
          role: "owner" | "admin" | "member";
          created_at?: string;
        };
        Update: {
          account_id?: string;
          user_id?: string;
          role?: "owner" | "admin" | "member";
          created_at?: string;
        };
      };
      knowledge_spaces: {
        Row: {
          id: string;
          account_id: string;
          title: string;
          image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          title: string;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          account_id?: string;
          title?: string;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      knowledge_items: {
        Row: {
          id: string;
          space_id: string;
          kind: "link" | "note";
          title: string | null;
          url: string | null;
          content: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          space_id: string;
          kind: "link" | "note";
          title?: string | null;
          url?: string | null;
          content?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          space_id?: string;
          kind?: "link" | "note";
          title?: string | null;
          url?: string | null;
          content?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      habit_objectives: {
        Row: {
          id: string;
          account_id: string;
          title: string;
          description: string | null;
          image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          title: string;
          description?: string | null;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          account_id?: string;
          title?: string;
          description?: string | null;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      habits: {
        Row: {
          id: string;
          account_id: string;
          objective_id: string | null;
          title: string;
          type: "time_tracking" | "fixed_protocol" | "count" | "custom";
          weekly_target_minutes: number | null;
          minimum_minutes: number | null;
          is_active: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          objective_id?: string | null;
          title: string;
          type?: "time_tracking" | "fixed_protocol" | "count" | "custom";
          weekly_target_minutes?: number | null;
          minimum_minutes?: number | null;
          is_active?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          account_id?: string;
          objective_id?: string | null;
          title?: string;
          type?: "time_tracking" | "fixed_protocol" | "count" | "custom";
          weekly_target_minutes?: number | null;
          minimum_minutes?: number | null;
          is_active?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      habit_sessions: {
        Row: {
          id: string;
          habit_id: string;
          session_date: string;
          planned_minutes: number;
          minimum_minutes: number;
          actual_minutes: number | null;
          completed: boolean;
          rating: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          habit_id: string;
          session_date: string;
          planned_minutes?: number;
          minimum_minutes?: number;
          actual_minutes?: number | null;
          completed?: boolean;
          rating?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          habit_id?: string;
          session_date?: string;
          planned_minutes?: number;
          minimum_minutes?: number;
          actual_minutes?: number | null;
          completed?: boolean;
          rating?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      templates: {
        Row: {
          id: string;
          account_id: string;
          objective_id: string | null;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          objective_id?: string | null;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          account_id?: string;
          objective_id?: string | null;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      template_entries: {
        Row: {
          id: string;
          template_id: string;
          habit_id: string;
          day_of_week: number;
          planned_minutes: number;
          minimum_minutes: number;
          is_required: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          template_id: string;
          habit_id: string;
          day_of_week: number;
          planned_minutes?: number;
          minimum_minutes?: number;
          is_required?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          template_id?: string;
          habit_id?: string;
          day_of_week?: number;
          planned_minutes?: number;
          minimum_minutes?: number;
          is_required?: boolean;
          created_at?: string;
        };
      };
      weeks: {
        Row: {
          id: string;
          account_id: string;
          template_id: string;
          week_start_date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          template_id: string;
          week_start_date: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          account_id?: string;
          template_id?: string;
          week_start_date?: string;
          created_at?: string;
        };
      };
      calendar_events: {
        Row: {
          id: string;
          account_id: string;
          title: string;
          details: string | null;
          event_date: string;
          event_time: string | null;
          event_type: "meeting" | "important" | "general";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          title: string;
          details?: string | null;
          event_date: string;
          event_time?: string | null;
          event_type?: "meeting" | "important" | "general";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          account_id?: string;
          title?: string;
          details?: string | null;
          event_date?: string;
          event_time?: string | null;
          event_type?: "meeting" | "important" | "general";
          created_at?: string;
          updated_at?: string;
        };
      };
      finance_categories: {
        Row: {
          id: string;
          account_id: string;
          name: string;
          kind: "income" | "expense" | "savings" | "debt_payment";
          color: string | null;
          image_url: string | null;
          monthly_limit: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          name: string;
          kind: "income" | "expense" | "savings" | "debt_payment";
          color?: string | null;
          image_url?: string | null;
          monthly_limit?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          account_id?: string;
          name?: string;
          kind?: "income" | "expense" | "savings" | "debt_payment";
          color?: string | null;
          image_url?: string | null;
          monthly_limit?: string | null;
          created_at?: string;
        };
      };
      ledger_entries: {
        Row: {
          id: string;
          account_id: string;
          category_id: string | null;
          entry_type: "income" | "expense";
          amount: string;
          currency_code: string;
          occurred_on: string;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          category_id?: string | null;
          entry_type: "income" | "expense";
          amount: string;
          currency_code?: string;
          occurred_on: string;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          account_id?: string;
          category_id?: string | null;
          entry_type?: "income" | "expense";
          amount?: string;
          currency_code?: string;
          occurred_on?: string;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
      };
      debts: {
        Row: {
          id: string;
          account_id: string;
          type: "owed" | "owing";
          name: string;
          principal: string;
          apr: string | null;
          due_date: string | null;
          status: "open" | "closed";
          remaining_balance: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          type: "owed" | "owing";
          name: string;
          principal: string;
          apr?: string | null;
          due_date?: string | null;
          status?: "open" | "closed";
          remaining_balance?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          account_id?: string;
          type?: "owed" | "owing";
          name?: string;
          principal?: string;
          apr?: string | null;
          due_date?: string | null;
          status?: "open" | "closed";
          remaining_balance?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
      };
      debt_payments: {
        Row: {
          id: string;
          account_id: string;
          debt_id: string;
          amount: string;
          paid_at: string;
          method: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          debt_id: string;
          amount: string;
          paid_at: string;
          method?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          account_id?: string;
          debt_id?: string;
          amount?: string;
          paid_at?: string;
          method?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          account_id: string;
          name: string;
          amount: string;
          currency_code: string;
          recurrence: "monthly" | "yearly";
          next_due_date: string | null;
          notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          account_id: string;
          name: string;
          amount: string;
          currency_code?: string;
          recurrence: "monthly" | "yearly";
          next_due_date?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          account_id?: string;
          name?: string;
          amount?: string;
          currency_code?: string;
          recurrence?: "monthly" | "yearly";
          next_due_date?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_week_from_template: {
        Args: {
          p_account_id: string;
          p_template_id: string;
          p_week_start_date: string;
        };
        Returns: Json;
      };
      update_habit_session: {
        Args: {
          p_session_id: string;
          p_actual_minutes?: number | null;
          p_rating?: number | null;
          p_notes?: string | null;
        };
        Returns: Json;
      };
      update_my_last_signed_in: {
        Args: Record<string, never>;
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
};
