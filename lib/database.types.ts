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
      surveys: {
        Row: {
          id: string
          title: string
          description: string | null
          slug: string
          status: 'draft' | 'active' | 'closed'
          start_date: string | null
          end_date: string | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          slug: string
          status?: 'draft' | 'active' | 'closed'
          start_date?: string | null
          end_date?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          slug?: string
          status?: 'draft' | 'active' | 'closed'
          start_date?: string | null
          end_date?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
      }
      questions: {
        Row: {
          id: string
          survey_id: string
          question_text: string
          question_type: 'multiple_choice' | 'short_answer' | 'long_answer' | 'likert_scale' | 'file_upload'
          options: Json | null
          order_index: number
          required: boolean
          created_at: string
        }
        Insert: {
          id?: string
          survey_id: string
          question_text: string
          question_type: 'multiple_choice' | 'short_answer' | 'long_answer' | 'likert_scale' | 'file_upload'
          options?: Json | null
          order_index: number
          required?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          survey_id?: string
          question_text?: string
          question_type?: 'multiple_choice' | 'short_answer' | 'long_answer' | 'likert_scale' | 'file_upload'
          options?: Json | null
          order_index?: number
          required?: boolean
          created_at?: string
        }
      }
      responses: {
        Row: {
          id: string
          survey_id: string
          participant_id: string | null
          submitted_at: string
        }
        Insert: {
          id?: string
          survey_id: string
          participant_id?: string | null
          submitted_at?: string
        }
        Update: {
          id?: string
          survey_id?: string
          participant_id?: string | null
          submitted_at?: string
        }
      }
      answers: {
        Row: {
          id: string
          response_id: string
          question_id: string
          answer_text: string | null
          answer_choice: Json | null
          file_url: string | null
        }
        Insert: {
          id?: string
          response_id: string
          question_id: string
          answer_text?: string | null
          answer_choice?: Json | null
          file_url?: string | null
        }
        Update: {
          id?: string
          response_id?: string
          question_id?: string
          answer_text?: string | null
          answer_choice?: Json | null
          file_url?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
