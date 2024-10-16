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
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
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
      deploy_waitlist: {
        Row: {
          created_at: string
          id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: never
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deploy_waitlist_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      deployed_databases: {
        Row: {
          created_at: string
          deployment_provider_id: number
          id: number
          local_database_id: string
          provider_metadata: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deployment_provider_id: number
          id?: never
          local_database_id: string
          provider_metadata?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deployment_provider_id?: number
          id?: never
          local_database_id?: string
          provider_metadata?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deployed_databases_deployment_provider_id_fkey"
            columns: ["deployment_provider_id"]
            isOneToOne: false
            referencedRelation: "deployment_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deployed_databases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      deployment_provider_integrations: {
        Row: {
          created_at: string
          credentials: Json
          deployment_provider_id: number | null
          id: number
          scope: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credentials: Json
          deployment_provider_id?: number | null
          id?: never
          scope?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credentials?: Json
          deployment_provider_id?: number | null
          id?: never
          scope?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deployment_provider_integrations_deployment_provider_id_fkey"
            columns: ["deployment_provider_id"]
            isOneToOne: false
            referencedRelation: "deployment_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deployment_provider_integrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      deployment_providers: {
        Row: {
          created_at: string
          id: number
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: never
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: never
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      deployments: {
        Row: {
          created_at: string
          deployed_database_id: number
          id: number
          status: Database["public"]["Enums"]["deployment_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deployed_database_id: number
          id?: never
          status: Database["public"]["Enums"]["deployment_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deployed_database_id?: number
          id?: never
          status?: Database["public"]["Enums"]["deployment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deployments_deployed_database_id_fkey"
            columns: ["deployed_database_id"]
            isOneToOne: false
            referencedRelation: "deployed_databases"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_secret: {
        Args: {
          secret_id: string
        }
        Returns: string
      }
      insert_secret: {
        Args: {
          secret: string
          name: string
        }
        Returns: string
      }
      read_secret: {
        Args: {
          secret_id: string
        }
        Returns: string
      }
      supabase_functions_certificate_secret: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      supabase_url: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      update_secret: {
        Args: {
          secret_id: string
          new_secret: string
        }
        Returns: string
      }
    }
    Enums: {
      deployment_status: "in_progress" | "success" | "failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

