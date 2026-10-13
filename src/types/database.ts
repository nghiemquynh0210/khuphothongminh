export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      households: {
        Row: {
          id: string
          code: string
          owner_name: string
          owner_cccd: string
          phone: string | null
          address: string
          area: string | null
          member_count: number | null
          coordinates: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          owner_name: string
          owner_cccd: string
          phone?: string | null
          address: string
          area?: string | null
          member_count?: number | null
          coordinates?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          owner_name?: string
          owner_cccd?: string
          phone?: string | null
          address?: string
          area?: string | null
          member_count?: number | null
          coordinates?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      residents: {
        Row: {
          id: string
          household_id: string | null
          household_code: string | null
          full_name: string
          cccd: string
          gender: 'Nam' | 'Nữ' | null
          birth_date: string | null
          phone: string | null
          address: string
          relation_to_owner: string | null
          status: string | null
          occupation: string | null
          workplace: string | null
          nationality: string | null
          is_party_member: boolean | null
          is_policy_household: boolean | null
          is_elderly: boolean | null
          is_poor_household: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id?: string | null
          household_code?: string | null
          full_name: string
          cccd: string
          gender?: 'Nam' | 'Nữ' | null
          birth_date?: string | null
          phone?: string | null
          address: string
          relation_to_owner?: string | null
          status?: string | null
          occupation?: string | null
          workplace?: string | null
          nationality?: string | null
          is_party_member?: boolean | null
          is_policy_household?: boolean | null
          is_elderly?: boolean | null
          is_poor_household?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string | null
          household_code?: string | null
          full_name?: string
          cccd?: string
          gender?: 'Nam' | 'Nữ' | null
          birth_date?: string | null
          phone?: string | null
          address?: string
          relation_to_owner?: string | null
          status?: string | null
          occupation?: string | null
          workplace?: string | null
          nationality?: string | null
          is_party_member?: boolean | null
          is_policy_household?: boolean | null
          is_elderly?: boolean | null
          is_poor_household?: boolean | null
          created_at?: string
          updated_at?: string
        }
      }
      businesses: {
        Row: {
          id: string
          internal_code: string
          name: string
          tax_code: string | null
          business_type: string | null
          industry_group: string | null
          owner_name: string | null
          phone: string | null
          address: string
          license_number: string | null
          status: string | null
          safety_certified: boolean | null
          employee_count: number | null
          image_url: string | null
          coordinates: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          internal_code: string
          name: string
          tax_code?: string | null
          business_type?: string | null
          industry_group?: string | null
          owner_name?: string | null
          phone?: string | null
          address: string
          license_number?: string | null
          status?: string | null
          safety_certified?: boolean | null
          employee_count?: number | null
          image_url?: string | null
          coordinates?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          internal_code?: string
          name?: string
          tax_code?: string | null
          business_type?: string | null
          industry_group?: string | null
          owner_name?: string | null
          phone?: string | null
          address?: string
          license_number?: string | null
          status?: string | null
          safety_certified?: boolean | null
          employee_count?: number | null
          image_url?: string | null
          coordinates?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      field_reports: {
        Row: {
          id: string
          title: string
          category: string
          location: string
          description: string
          reporter_name: string | null
          reporter_phone: string | null
          status: string | null
          priority: string | null
          image_urls: string[] | null
          response_content: string | null
          created_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          title: string
          category: string
          location: string
          description: string
          reporter_name?: string | null
          reporter_phone?: string | null
          status?: string | null
          priority?: string | null
          image_urls?: string[] | null
          response_content?: string | null
          created_at?: string
          resolved_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          category?: string
          location?: string
          description?: string
          reporter_name?: string | null
          reporter_phone?: string | null
          status?: string | null
          priority?: string | null
          image_urls?: string[] | null
          response_content?: string | null
          created_at?: string
          resolved_at?: string | null
        }
      }
      neighborhood_funds: {
        Row: {
          id: string
          transaction_type: 'thu' | 'chi' | null
          fund_name: string
          household_code: string | null
          payer_or_receiver: string
          amount: number
          description: string | null
          evidence_code: string | null
          status: string | null
          approved_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          transaction_type?: 'thu' | 'chi' | null
          fund_name: string
          household_code?: string | null
          payer_or_receiver: string
          amount: number
          description?: string | null
          evidence_code?: string | null
          status?: string | null
          approved_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          transaction_type?: 'thu' | 'chi' | null
          fund_name?: string
          household_code?: string | null
          payer_or_receiver?: string
          amount?: number
          description?: string | null
          evidence_code?: string | null
          status?: string | null
          approved_by?: string | null
          created_at?: string
        }
      }
    }
  }
}
