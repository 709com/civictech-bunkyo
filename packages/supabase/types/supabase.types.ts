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
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
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
      agenda_items: {
        Row: {
          bill_id: string | null
          created_at: string
          id: string
          item_kind: string | null
          item_order: number
          label: string | null
          level: number | null
          meeting_id: string
          para: number | null
          paras: number[] | null
          raw: string
          refs: string[] | null
          title: string | null
        }
        Insert: {
          bill_id?: string | null
          created_at?: string
          id?: string
          item_kind?: string | null
          item_order: number
          label?: string | null
          level?: number | null
          meeting_id: string
          para?: number | null
          paras?: number[] | null
          raw: string
          refs?: string[] | null
          title?: string | null
        }
        Update: {
          bill_id?: string | null
          created_at?: string
          id?: string
          item_kind?: string | null
          item_order?: number
          label?: string | null
          level?: number | null
          meeting_id?: string
          para?: number | null
          paras?: number[] | null
          raw?: string
          refs?: string[] | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agenda_items_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_contents: {
        Row: {
          bill_id: string
          content: string
          created_at: string
          difficulty_level: Database["public"]["Enums"]["difficulty_level_enum"]
          id: string
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          bill_id: string
          content: string
          created_at?: string
          difficulty_level: Database["public"]["Enums"]["difficulty_level_enum"]
          id?: string
          summary: string
          title: string
          updated_at?: string
        }
        Update: {
          bill_id?: string
          content?: string
          created_at?: string
          difficulty_level?: Database["public"]["Enums"]["difficulty_level_enum"]
          id?: string
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_contents_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_discussions: {
        Row: {
          answer_raw: string | null
          answer_summary: string | null
          answerer_name: string | null
          answerer_role: string | null
          bill_id: string
          created_at: string
          exchange_count: number
          id: string
          question_raw: string | null
          question_summary: string | null
          questioner_name: string
          questioner_number: string | null
          questioner_party: string | null
          session_day: number
        }
        Insert: {
          answer_raw?: string | null
          answer_summary?: string | null
          answerer_name?: string | null
          answerer_role?: string | null
          bill_id: string
          created_at?: string
          exchange_count?: number
          id?: string
          question_raw?: string | null
          question_summary?: string | null
          questioner_name: string
          questioner_number?: string | null
          questioner_party?: string | null
          session_day: number
        }
        Update: {
          answer_raw?: string | null
          answer_summary?: string | null
          answerer_name?: string | null
          answerer_role?: string | null
          bill_id?: string
          created_at?: string
          exchange_count?: number
          id?: string
          question_raw?: string | null
          question_summary?: string | null
          questioner_name?: string
          questioner_number?: string | null
          questioner_party?: string | null
          session_day?: number
        }
        Relationships: [
          {
            foreignKeyName: "bill_discussions_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          bill_number: string
          bill_type: string
          committee_id: string | null
          council_session_id: string | null
          created_at: string
          discussion_overview_points: string[]
          id: string
          is_featured: boolean
          is_procedural: boolean
          name: string
          publish_status: Database["public"]["Enums"]["bill_publish_status"]
          publish_status_order: number | null
          published_at: string | null
          share_thumbnail_url: string | null
          source_url: string | null
          status: Database["public"]["Enums"]["bill_status_enum"]
          status_note: string | null
          status_order: number | null
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          bill_number?: string
          bill_type?: string
          committee_id?: string | null
          council_session_id?: string | null
          created_at?: string
          discussion_overview_points?: string[]
          id?: string
          is_featured?: boolean
          is_procedural?: boolean
          name: string
          publish_status?: Database["public"]["Enums"]["bill_publish_status"]
          publish_status_order?: number | null
          published_at?: string | null
          share_thumbnail_url?: string | null
          source_url?: string | null
          status: Database["public"]["Enums"]["bill_status_enum"]
          status_note?: string | null
          status_order?: number | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          bill_number?: string
          bill_type?: string
          committee_id?: string | null
          council_session_id?: string | null
          created_at?: string
          discussion_overview_points?: string[]
          id?: string
          is_featured?: boolean
          is_procedural?: boolean
          name?: string
          publish_status?: Database["public"]["Enums"]["bill_publish_status"]
          publish_status_order?: number | null
          published_at?: string | null
          share_thumbnail_url?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["bill_status_enum"]
          status_note?: string | null
          status_order?: number | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_diet_session_id_fkey"
            columns: ["council_session_id"]
            isOneToOne: false
            referencedRelation: "council_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      bills_tags: {
        Row: {
          bill_id: string
          created_at: string
          tag_id: string
        }
        Insert: {
          bill_id: string
          created_at?: string
          tag_id: string
        }
        Update: {
          bill_id?: string
          created_at?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_tags_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_initiatives: {
        Row: {
          badge: string | null
          budget_amount: number | null
          created_at: string
          description: string | null
          id: string
          sort_order: number
          theme_id: string
          title: string
          updated_at: string
        }
        Insert: {
          badge?: string | null
          budget_amount?: number | null
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          theme_id: string
          title: string
          updated_at?: string
        }
        Update: {
          badge?: string | null
          budget_amount?: number | null
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          theme_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_initiatives_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "budget_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_overviews: {
        Row: {
          council_session_id: string
          created_at: string
          department_name: string
          department_slug: string
          direction: string | null
          id: string
          prev_budget: number | null
          publish_status: string
          sort_order: number
          source_url: string | null
          total_budget: number | null
          updated_at: string
        }
        Insert: {
          council_session_id: string
          created_at?: string
          department_name: string
          department_slug: string
          direction?: string | null
          id?: string
          prev_budget?: number | null
          publish_status?: string
          sort_order?: number
          source_url?: string | null
          total_budget?: number | null
          updated_at?: string
        }
        Update: {
          council_session_id?: string
          created_at?: string
          department_name?: string
          department_slug?: string
          direction?: string | null
          id?: string
          prev_budget?: number | null
          publish_status?: string
          sort_order?: number
          source_url?: string | null
          total_budget?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_overviews_council_session_id_fkey"
            columns: ["council_session_id"]
            isOneToOne: false
            referencedRelation: "council_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_themes: {
        Row: {
          ai_summary: string | null
          budget_amount: number | null
          created_at: string
          id: string
          overview_id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          ai_summary?: string | null
          budget_amount?: number | null
          created_at?: string
          id?: string
          overview_id: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          ai_summary?: string | null
          budget_amount?: number | null
          created_at?: string
          id?: string
          overview_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_themes_overview_id_fkey"
            columns: ["overview_id"]
            isOneToOne: false
            referencedRelation: "budget_overviews"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_usage_events: {
        Row: {
          cost_usd: number
          created_at: string
          id: string
          input_tokens: number
          metadata: Json | null
          model: string
          occurred_at: string
          output_tokens: number
          prompt_name: string | null
          session_id: string | null
          total_tokens: number
          user_id: string
        }
        Insert: {
          cost_usd?: number
          created_at?: string
          id?: string
          input_tokens?: number
          metadata?: Json | null
          model: string
          occurred_at?: string
          output_tokens?: number
          prompt_name?: string | null
          session_id?: string | null
          total_tokens?: number
          user_id: string
        }
        Update: {
          cost_usd?: number
          created_at?: string
          id?: string
          input_tokens?: number
          metadata?: Json | null
          model?: string
          occurred_at?: string
          output_tokens?: number
          prompt_name?: string | null
          session_id?: string | null
          total_tokens?: number
          user_id?: string
        }
        Relationships: []
      }
      chats: {
        Row: {
          bill_id: string
          created_at: string
          id: string
          message: string
          role: Database["public"]["Enums"]["chat_role_enum"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          bill_id: string
          created_at?: string
          id?: string
          message: string
          role: Database["public"]["Enums"]["chat_role_enum"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          bill_id?: string
          created_at?: string
          id?: string
          message?: string
          role?: Database["public"]["Enums"]["chat_role_enum"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chats_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      committee_meeting_topics: {
        Row: {
          created_at: string
          discussion_summary: string | null
          end_voice_no: number | null
          id: string
          meeting_id: string
          start_voice_no: number | null
          summary: string | null
          title: string
          topic_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          discussion_summary?: string | null
          end_voice_no?: number | null
          id?: string
          meeting_id: string
          start_voice_no?: number | null
          summary?: string | null
          title: string
          topic_order: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          discussion_summary?: string | null
          end_voice_no?: number | null
          id?: string
          meeting_id?: string
          start_voice_no?: number | null
          summary?: string | null
          title?: string
          topic_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "committee_meeting_topics_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "committee_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      committee_meetings: {
        Row: {
          committee_name: string
          committee_slug: string
          committee_type: string
          created_at: string
          id: string
          meeting_date: string
          publish_status: string
          raw_text: string
          source_document_id: number
          source_url: string
          speeches: Json
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          committee_name: string
          committee_slug: string
          committee_type?: string
          created_at?: string
          id?: string
          meeting_date: string
          publish_status?: string
          raw_text: string
          source_document_id: number
          source_url: string
          speeches?: Json
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          committee_name?: string
          committee_slug?: string
          committee_type?: string
          created_at?: string
          id?: string
          meeting_date?: string
          publish_status?: string
          raw_text?: string
          source_document_id?: number
          source_url?: string
          speeches?: Json
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      committees: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      contract_parties: {
        Row: {
          address: string | null
          bill_nearby: string | null
          company: string | null
          created_at: string
          id: string
          is_individual: boolean
          meeting_id: string
          note: string | null
          para: number | null
          party_order: number
          representative_title: string | null
          section_refs: string[] | null
          speech_id: string | null
        }
        Insert: {
          address?: string | null
          bill_nearby?: string | null
          company?: string | null
          created_at?: string
          id?: string
          is_individual?: boolean
          meeting_id: string
          note?: string | null
          para?: number | null
          party_order: number
          representative_title?: string | null
          section_refs?: string[] | null
          speech_id?: string | null
        }
        Update: {
          address?: string | null
          bill_nearby?: string | null
          company?: string | null
          created_at?: string
          id?: string
          is_individual?: boolean
          meeting_id?: string
          note?: string | null
          para?: number | null
          party_order?: number
          representative_title?: string | null
          section_refs?: string[] | null
          speech_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_parties_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_parties_speech_id_fkey"
            columns: ["speech_id"]
            isOneToOne: false
            referencedRelation: "speech_factions"
            referencedColumns: ["speech_id"]
          },
          {
            foreignKeyName: "contract_parties_speech_id_fkey"
            columns: ["speech_id"]
            isOneToOne: false
            referencedRelation: "speeches"
            referencedColumns: ["id"]
          },
        ]
      }
      council_member_committees: {
        Row: {
          committee_id: string
          council_member_id: string
          created_at: string
        }
        Insert: {
          committee_id: string
          council_member_id: string
          created_at?: string
        }
        Update: {
          committee_id?: string
          council_member_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "council_member_committees_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "council_member_committees_council_member_id_fkey"
            columns: ["council_member_id"]
            isOneToOne: false
            referencedRelation: "council_members"
            referencedColumns: ["id"]
          },
        ]
      }
      council_members: {
        Row: {
          created_at: string
          faction_id: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          faction_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          faction_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "council_members_faction_id_fkey"
            columns: ["faction_id"]
            isOneToOne: false
            referencedRelation: "factions"
            referencedColumns: ["id"]
          },
        ]
      }
      council_sessions: {
        Row: {
          council_url: string | null
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          name: string
          slug: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          council_url?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug?: string | null
          start_date: string
          updated_at?: string
        }
        Update: {
          council_url?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      disorder_candidates: {
        Row: {
          after_speech_id: string | null
          by_presider: boolean | null
          cand_order: number
          category: string
          caution: boolean | null
          created_at: string
          id: string
          label_raw: string | null
          meeting_id: string
          para: number | null
          retract: string | null
          sentence_index: number | null
          signals: string[] | null
          speech_id: string | null
          where_found: string
          word: string
          wording: string
        }
        Insert: {
          after_speech_id?: string | null
          by_presider?: boolean | null
          cand_order: number
          category: string
          caution?: boolean | null
          created_at?: string
          id?: string
          label_raw?: string | null
          meeting_id: string
          para?: number | null
          retract?: string | null
          sentence_index?: number | null
          signals?: string[] | null
          speech_id?: string | null
          where_found: string
          word: string
          wording: string
        }
        Update: {
          after_speech_id?: string | null
          by_presider?: boolean | null
          cand_order?: number
          category?: string
          caution?: boolean | null
          created_at?: string
          id?: string
          label_raw?: string | null
          meeting_id?: string
          para?: number | null
          retract?: string | null
          sentence_index?: number | null
          signals?: string[] | null
          speech_id?: string | null
          where_found?: string
          word?: string
          wording?: string
        }
        Relationships: [
          {
            foreignKeyName: "disorder_candidates_after_speech_id_fkey"
            columns: ["after_speech_id"]
            isOneToOne: false
            referencedRelation: "speech_factions"
            referencedColumns: ["speech_id"]
          },
          {
            foreignKeyName: "disorder_candidates_after_speech_id_fkey"
            columns: ["after_speech_id"]
            isOneToOne: false
            referencedRelation: "speeches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disorder_candidates_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disorder_candidates_speech_id_fkey"
            columns: ["speech_id"]
            isOneToOne: false
            referencedRelation: "speech_factions"
            referencedColumns: ["speech_id"]
          },
          {
            foreignKeyName: "disorder_candidates_speech_id_fkey"
            columns: ["speech_id"]
            isOneToOne: false
            referencedRelation: "speeches"
            referencedColumns: ["id"]
          },
        ]
      }
      expert_registrations: {
        Row: {
          affiliation: string
          created_at: string
          email: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          affiliation: string
          created_at?: string
          email: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          affiliation?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      faction_stances: {
        Row: {
          bill_id: string
          comment: string | null
          created_at: string
          faction_id: string
          id: string
          type: Database["public"]["Enums"]["stance_type_enum"]
          updated_at: string
        }
        Insert: {
          bill_id: string
          comment?: string | null
          created_at?: string
          faction_id: string
          id?: string
          type: Database["public"]["Enums"]["stance_type_enum"]
          updated_at?: string
        }
        Update: {
          bill_id?: string
          comment?: string | null
          created_at?: string
          faction_id?: string
          id?: string
          type?: Database["public"]["Enums"]["stance_type_enum"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "faction_stances_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faction_stances_faction_id_fkey"
            columns: ["faction_id"]
            isOneToOne: false
            referencedRelation: "factions"
            referencedColumns: ["id"]
          },
        ]
      }
      factions: {
        Row: {
          alternative_names: string[]
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          alternative_names?: string[]
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          alternative_names?: string[]
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      general_question_item_speeches: {
        Row: {
          attribution: string | null
          created_at: string
          id: string
          item_id: string
          role: string
          speech_id: string
        }
        Insert: {
          attribution?: string | null
          created_at?: string
          id?: string
          item_id: string
          role: string
          speech_id: string
        }
        Update: {
          attribution?: string | null
          created_at?: string
          id?: string
          item_id?: string
          role?: string
          speech_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "general_question_item_speeches_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "general_question_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_question_item_speeches_speech_id_fkey"
            columns: ["speech_id"]
            isOneToOne: false
            referencedRelation: "speech_factions"
            referencedColumns: ["speech_id"]
          },
          {
            foreignKeyName: "general_question_item_speeches_speech_id_fkey"
            columns: ["speech_id"]
            isOneToOne: false
            referencedRelation: "speeches"
            referencedColumns: ["id"]
          },
        ]
      }
      general_question_items: {
        Row: {
          count_hint: string | null
          created_at: string
          first_sentence: string | null
          id: string
          is_related_question: boolean
          item_no: number
          member_id: string | null
          needs_check: boolean
          needs_check_reasons: string[] | null
          questioner_full_name: string | null
          questioner_label: string | null
          range_id: string
          section_id: string | null
          title: string | null
          title_field: string | null
          title_from_seq: number | null
          title_rule: string | null
          title_source: string | null
          titles_found: string[] | null
        }
        Insert: {
          count_hint?: string | null
          created_at?: string
          first_sentence?: string | null
          id?: string
          is_related_question?: boolean
          item_no: number
          member_id?: string | null
          needs_check?: boolean
          needs_check_reasons?: string[] | null
          questioner_full_name?: string | null
          questioner_label?: string | null
          range_id: string
          section_id?: string | null
          title?: string | null
          title_field?: string | null
          title_from_seq?: number | null
          title_rule?: string | null
          title_source?: string | null
          titles_found?: string[] | null
        }
        Update: {
          count_hint?: string | null
          created_at?: string
          first_sentence?: string | null
          id?: string
          is_related_question?: boolean
          item_no?: number
          member_id?: string | null
          needs_check?: boolean
          needs_check_reasons?: string[] | null
          questioner_full_name?: string | null
          questioner_label?: string | null
          range_id?: string
          section_id?: string | null
          title?: string | null
          title_field?: string | null
          title_from_seq?: number | null
          title_rule?: string | null
          title_source?: string | null
          titles_found?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "general_question_items_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_question_items_range_id_fkey"
            columns: ["range_id"]
            isOneToOne: false
            referencedRelation: "general_question_ranges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_question_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: true
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_question_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: true
            referencedRelation: "sections_analysis"
            referencedColumns: ["section_id"]
          },
        ]
      }
      general_question_overviews: {
        Row: {
          council_session_id: string
          created_at: string
          lines: string[]
          theme_lines: Json
          updated_at: string
        }
        Insert: {
          council_session_id: string
          created_at?: string
          lines: string[]
          theme_lines?: Json
          updated_at?: string
        }
        Update: {
          council_session_id?: string
          created_at?: string
          lines?: string[]
          theme_lines?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "general_question_overviews_council_session_id_fkey"
            columns: ["council_session_id"]
            isOneToOne: true
            referencedRelation: "council_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      general_question_ranges: {
        Row: {
          created_at: string
          declared: Json
          declared_check: Json | null
          end_declarations: number | null
          end_marker: string | null
          end_seq: number | null
          end_speech_id: string | null
          end_wording: string | null
          id: string
          meeting_id: string
          needs_check: string | null
          notices: Json
          speech_count: number | null
          start_declarations: number | null
          start_seq: number | null
          start_speech_id: string | null
          start_wording: string | null
        }
        Insert: {
          created_at?: string
          declared?: Json
          declared_check?: Json | null
          end_declarations?: number | null
          end_marker?: string | null
          end_seq?: number | null
          end_speech_id?: string | null
          end_wording?: string | null
          id?: string
          meeting_id: string
          needs_check?: string | null
          notices?: Json
          speech_count?: number | null
          start_declarations?: number | null
          start_seq?: number | null
          start_speech_id?: string | null
          start_wording?: string | null
        }
        Update: {
          created_at?: string
          declared?: Json
          declared_check?: Json | null
          end_declarations?: number | null
          end_marker?: string | null
          end_seq?: number | null
          end_speech_id?: string | null
          end_wording?: string | null
          id?: string
          meeting_id?: string
          needs_check?: string | null
          notices?: Json
          speech_count?: number | null
          start_declarations?: number | null
          start_seq?: number | null
          start_speech_id?: string | null
          start_wording?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "general_question_ranges_end_speech_id_fkey"
            columns: ["end_speech_id"]
            isOneToOne: false
            referencedRelation: "speech_factions"
            referencedColumns: ["speech_id"]
          },
          {
            foreignKeyName: "general_question_ranges_end_speech_id_fkey"
            columns: ["end_speech_id"]
            isOneToOne: false
            referencedRelation: "speeches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_question_ranges_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: true
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_question_ranges_start_speech_id_fkey"
            columns: ["start_speech_id"]
            isOneToOne: false
            referencedRelation: "speech_factions"
            referencedColumns: ["speech_id"]
          },
          {
            foreignKeyName: "general_question_ranges_start_speech_id_fkey"
            columns: ["start_speech_id"]
            isOneToOne: false
            referencedRelation: "speeches"
            referencedColumns: ["id"]
          },
        ]
      }
      general_questions: {
        Row: {
          content_origin: string
          council_session_id: string
          created_at: string | null
          id: string
          meeting_date: string | null
          publish_status: string
          question_order: number
          questioner_name: string
          questioner_number: number | null
          questioner_party: string | null
          raw_text: string | null
          review_status: string
          section_id: string | null
          session_day: number
          source_file: string | null
          source_type: string
          source_url: string | null
          summary: string | null
          topics: Json
          updated_at: string | null
        }
        Insert: {
          content_origin?: string
          council_session_id: string
          created_at?: string | null
          id?: string
          meeting_date?: string | null
          publish_status?: string
          question_order?: number
          questioner_name: string
          questioner_number?: number | null
          questioner_party?: string | null
          raw_text?: string | null
          review_status?: string
          section_id?: string | null
          session_day?: number
          source_file?: string | null
          source_type?: string
          source_url?: string | null
          summary?: string | null
          topics?: Json
          updated_at?: string | null
        }
        Update: {
          content_origin?: string
          council_session_id?: string
          created_at?: string | null
          id?: string
          meeting_date?: string | null
          publish_status?: string
          question_order?: number
          questioner_name?: string
          questioner_number?: number | null
          questioner_party?: string | null
          raw_text?: string | null
          review_status?: string
          section_id?: string | null
          session_day?: number
          source_file?: string | null
          source_type?: string
          source_url?: string | null
          summary?: string | null
          topics?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "general_questions_council_session_id_fkey"
            columns: ["council_session_id"]
            isOneToOne: false
            referencedRelation: "council_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: true
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "general_questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: true
            referencedRelation: "sections_analysis"
            referencedColumns: ["section_id"]
          },
        ]
      }
      ingest_runs: {
        Row: {
          approved_on: string | null
          counts_after: Json | null
          counts_before: Json | null
          file_count: number
          id: string
          mode: string
          note: string | null
          run_at: string
          source_tool_versions: string[]
          tool_name: string
          tool_version: string
        }
        Insert: {
          approved_on?: string | null
          counts_after?: Json | null
          counts_before?: Json | null
          file_count: number
          id?: string
          mode: string
          note?: string | null
          run_at?: string
          source_tool_versions?: string[]
          tool_name: string
          tool_version: string
        }
        Update: {
          approved_on?: string | null
          counts_after?: Json | null
          counts_before?: Json | null
          file_count?: number
          id?: string
          mode?: string
          note?: string | null
          run_at?: string
          source_tool_versions?: string[]
          tool_name?: string
          tool_version?: string
        }
        Relationships: []
      }
      interview_configs: {
        Row: {
          bill_id: string
          chat_model: string | null
          created_at: string
          estimated_duration: number | null
          id: string
          knowledge_source: string | null
          mode: Database["public"]["Enums"]["interview_mode_enum"]
          name: string
          status: Database["public"]["Enums"]["interview_config_status_enum"]
          themes: string[] | null
          updated_at: string
        }
        Insert: {
          bill_id: string
          chat_model?: string | null
          created_at?: string
          estimated_duration?: number | null
          id?: string
          knowledge_source?: string | null
          mode?: Database["public"]["Enums"]["interview_mode_enum"]
          name: string
          status?: Database["public"]["Enums"]["interview_config_status_enum"]
          themes?: string[] | null
          updated_at?: string
        }
        Update: {
          bill_id?: string
          chat_model?: string | null
          created_at?: string
          estimated_duration?: number | null
          id?: string
          knowledge_source?: string | null
          mode?: Database["public"]["Enums"]["interview_mode_enum"]
          name?: string
          status?: Database["public"]["Enums"]["interview_config_status_enum"]
          themes?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_configs_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          interview_session_id: string
          role: Database["public"]["Enums"]["interview_role_enum"]
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          interview_session_id: string
          role: Database["public"]["Enums"]["interview_role_enum"]
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          interview_session_id?: string
          role?: Database["public"]["Enums"]["interview_role_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "interview_messages_interview_session_id_fkey"
            columns: ["interview_session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_questions: {
        Row: {
          created_at: string
          follow_up_guide: string | null
          id: string
          interview_config_id: string
          question: string
          question_order: number
          quick_replies: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          follow_up_guide?: string | null
          id?: string
          interview_config_id: string
          question: string
          question_order: number
          quick_replies?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          follow_up_guide?: string | null
          id?: string
          interview_config_id?: string
          question?: string
          question_order?: number
          quick_replies?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_questions_interview_config_id_fkey"
            columns: ["interview_config_id"]
            isOneToOne: false
            referencedRelation: "interview_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_report: {
        Row: {
          created_at: string
          id: string
          interview_session_id: string
          is_public_by_admin: boolean
          is_public_by_user: boolean
          opinions: Json | null
          role: Database["public"]["Enums"]["interview_report_role_enum"] | null
          role_description: string | null
          role_title: string | null
          scores: Json | null
          stance: Database["public"]["Enums"]["stance_type_enum"] | null
          summary: string | null
          total_score: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          interview_session_id: string
          is_public_by_admin?: boolean
          is_public_by_user?: boolean
          opinions?: Json | null
          role?:
            | Database["public"]["Enums"]["interview_report_role_enum"]
            | null
          role_description?: string | null
          role_title?: string | null
          scores?: Json | null
          stance?: Database["public"]["Enums"]["stance_type_enum"] | null
          summary?: string | null
          total_score?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          interview_session_id?: string
          is_public_by_admin?: boolean
          is_public_by_user?: boolean
          opinions?: Json | null
          role?:
            | Database["public"]["Enums"]["interview_report_role_enum"]
            | null
          role_description?: string | null
          role_title?: string | null
          scores?: Json | null
          stance?: Database["public"]["Enums"]["stance_type_enum"] | null
          summary?: string | null
          total_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_report_interview_session_id_fkey"
            columns: ["interview_session_id"]
            isOneToOne: true
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_sessions: {
        Row: {
          archived_at: string | null
          completed_at: string | null
          created_at: string
          id: string
          interview_config_id: string
          langfuse_session_id: string | null
          rating: number | null
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          interview_config_id: string
          langfuse_session_id?: string | null
          rating?: number | null
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          interview_config_id?: string
          langfuse_session_id?: string | null
          rating?: number | null
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_sessions_interview_config_id_fkey"
            columns: ["interview_config_id"]
            isOneToOne: false
            referencedRelation: "interview_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      jimu_jigyo_bureaus: {
        Row: {
          bureau_code: string
          bureau_name: string
          created_at: string | null
          display_order: number | null
        }
        Insert: {
          bureau_code: string
          bureau_name: string
          created_at?: string | null
          display_order?: number | null
        }
        Update: {
          bureau_code?: string
          bureau_name?: string
          created_at?: string | null
          display_order?: number | null
        }
        Relationships: []
      }
      jimu_jigyo_fiscal_years: {
        Row: {
          administrative_plan_data: Json | null
          analysis_json: Json | null
          basic_plan_data: Json | null
          created_at: string | null
          data_source: string | null
          expenditure_amount: number | null
          expenditure_type: string | null
          fiscal_year: number
          general_revenue: number | null
          id: string
          imported_at: string | null
          imported_by: string | null
          item_id: string
          next_year_budget: number | null
          specific_revenue: number | null
          updated_at: string | null
        }
        Insert: {
          administrative_plan_data?: Json | null
          analysis_json?: Json | null
          basic_plan_data?: Json | null
          created_at?: string | null
          data_source?: string | null
          expenditure_amount?: number | null
          expenditure_type?: string | null
          fiscal_year: number
          general_revenue?: number | null
          id?: string
          imported_at?: string | null
          imported_by?: string | null
          item_id: string
          next_year_budget?: number | null
          specific_revenue?: number | null
          updated_at?: string | null
        }
        Update: {
          administrative_plan_data?: Json | null
          analysis_json?: Json | null
          basic_plan_data?: Json | null
          created_at?: string | null
          data_source?: string | null
          expenditure_amount?: number | null
          expenditure_type?: string | null
          fiscal_year?: number
          general_revenue?: number | null
          id?: string
          imported_at?: string | null
          imported_by?: string | null
          item_id?: string
          next_year_budget?: number | null
          specific_revenue?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jimu_jigyo_fiscal_years_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "jimu_jigyo_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jimu_jigyo_fiscal_years_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "jimu_jigyo_latest"
            referencedColumns: ["id"]
          },
        ]
      }
      jimu_jigyo_import_logs: {
        Row: {
          error_message: string | null
          fiscal_year: number
          id: string
          imported_at: string | null
          imported_by: string | null
          source_type: string
          source_url: string | null
          status: string | null
          total_items_inserted: number | null
          total_items_processed: number | null
          total_items_updated: number | null
        }
        Insert: {
          error_message?: string | null
          fiscal_year: number
          id?: string
          imported_at?: string | null
          imported_by?: string | null
          source_type: string
          source_url?: string | null
          status?: string | null
          total_items_inserted?: number | null
          total_items_processed?: number | null
          total_items_updated?: number | null
        }
        Update: {
          error_message?: string | null
          fiscal_year?: number
          id?: string
          imported_at?: string | null
          imported_by?: string | null
          source_type?: string
          source_url?: string | null
          status?: string | null
          total_items_inserted?: number | null
          total_items_processed?: number | null
          total_items_updated?: number | null
        }
        Relationships: []
      }
      jimu_jigyo_items: {
        Row: {
          achievement_criteria: string | null
          activity_output: string | null
          administrative_plan: string | null
          bureau_code: string
          bureau_name: string
          created_at: string | null
          department_code: string
          department_name: string
          establishment_trigger: string | null
          final_outcome: string | null
          id: string
          implementation_content: string | null
          intermediate_outcome: string | null
          is_active: boolean | null
          item_code: string
          item_name: string
          raw_data: Json | null
          result_output: string | null
          root_law: string | null
          slug: string | null
          start_fiscal_year: string | null
          target_description: string | null
          target_goal_state: string | null
          updated_at: string | null
        }
        Insert: {
          achievement_criteria?: string | null
          activity_output?: string | null
          administrative_plan?: string | null
          bureau_code: string
          bureau_name: string
          created_at?: string | null
          department_code: string
          department_name: string
          establishment_trigger?: string | null
          final_outcome?: string | null
          id?: string
          implementation_content?: string | null
          intermediate_outcome?: string | null
          is_active?: boolean | null
          item_code: string
          item_name: string
          raw_data?: Json | null
          result_output?: string | null
          root_law?: string | null
          slug?: string | null
          start_fiscal_year?: string | null
          target_description?: string | null
          target_goal_state?: string | null
          updated_at?: string | null
        }
        Update: {
          achievement_criteria?: string | null
          activity_output?: string | null
          administrative_plan?: string | null
          bureau_code?: string
          bureau_name?: string
          created_at?: string | null
          department_code?: string
          department_name?: string
          establishment_trigger?: string | null
          final_outcome?: string | null
          id?: string
          implementation_content?: string | null
          intermediate_outcome?: string | null
          is_active?: boolean | null
          item_code?: string
          item_name?: string
          raw_data?: Json | null
          result_output?: string | null
          root_law?: string | null
          slug?: string | null
          start_fiscal_year?: string | null
          target_description?: string | null
          target_goal_state?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jimu_jigyo_items_bureau_code_fkey"
            columns: ["bureau_code"]
            isOneToOne: false
            referencedRelation: "jimu_jigyo_bureaus"
            referencedColumns: ["bureau_code"]
          },
        ]
      }
      jimu_jigyo_kpi_items: {
        Row: {
          created_at: string | null
          id: string
          item_id: string
          kpi_name: string
          kpi_order: number | null
          kpi_type_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id: string
          kpi_name: string
          kpi_order?: number | null
          kpi_type_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string
          kpi_name?: string
          kpi_order?: number | null
          kpi_type_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jimu_jigyo_kpi_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "jimu_jigyo_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jimu_jigyo_kpi_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "jimu_jigyo_latest"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jimu_jigyo_kpi_items_kpi_type_id_fkey"
            columns: ["kpi_type_id"]
            isOneToOne: false
            referencedRelation: "jimu_jigyo_kpi_types"
            referencedColumns: ["id"]
          },
        ]
      }
      jimu_jigyo_kpi_results: {
        Row: {
          achievement_rate: string | null
          actual_value: string | null
          created_at: string | null
          fiscal_year: number
          id: string
          kpi_item_id: string
          target_value: string | null
          updated_at: string | null
        }
        Insert: {
          achievement_rate?: string | null
          actual_value?: string | null
          created_at?: string | null
          fiscal_year: number
          id?: string
          kpi_item_id: string
          target_value?: string | null
          updated_at?: string | null
        }
        Update: {
          achievement_rate?: string | null
          actual_value?: string | null
          created_at?: string | null
          fiscal_year?: number
          id?: string
          kpi_item_id?: string
          target_value?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jimu_jigyo_kpi_results_kpi_item_id_fkey"
            columns: ["kpi_item_id"]
            isOneToOne: false
            referencedRelation: "jimu_jigyo_kpi_items"
            referencedColumns: ["id"]
          },
        ]
      }
      jimu_jigyo_kpi_targets: {
        Row: {
          created_at: string | null
          id: string
          kpi_item_id: string
          target_fiscal_year: number | null
          target_value: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          kpi_item_id: string
          target_fiscal_year?: number | null
          target_value?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          kpi_item_id?: string
          target_fiscal_year?: number | null
          target_value?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jimu_jigyo_kpi_targets_kpi_item_id_fkey"
            columns: ["kpi_item_id"]
            isOneToOne: false
            referencedRelation: "jimu_jigyo_kpi_items"
            referencedColumns: ["id"]
          },
        ]
      }
      jimu_jigyo_kpi_types: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          kpi_type_code: string
          kpi_type_name: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          kpi_type_code: string
          kpi_type_name: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          kpi_type_code?: string
          kpi_type_name?: string
        }
        Relationships: []
      }
      jimu_jigyo_matching_logs: {
        Row: {
          fiscal_year: number
          id: string
          item_id: string
          match_method: string
          match_score: number | null
          matched_at: string | null
          matched_by: string | null
          source_bureau_code: string
          source_department_name: string
          source_item_name: string
        }
        Insert: {
          fiscal_year: number
          id?: string
          item_id: string
          match_method: string
          match_score?: number | null
          matched_at?: string | null
          matched_by?: string | null
          source_bureau_code: string
          source_department_name: string
          source_item_name: string
        }
        Update: {
          fiscal_year?: number
          id?: string
          item_id?: string
          match_method?: string
          match_score?: number | null
          matched_at?: string | null
          matched_by?: string | null
          source_bureau_code?: string
          source_department_name?: string
          source_item_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "jimu_jigyo_matching_logs_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "jimu_jigyo_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jimu_jigyo_matching_logs_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "jimu_jigyo_latest"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_attendance: {
        Row: {
          affiliation: string | null
          created_at: string
          id: string
          match_status: string
          meeting_id: string
          member_id: string | null
          name_key_loose: string | null
          name_raw: string | null
          note: string | null
          official_id: string | null
          para: number | null
          raw_line: string | null
          role_raw: string | null
          roster_order: number
          roster_section: string
          seat_number: number | null
        }
        Insert: {
          affiliation?: string | null
          created_at?: string
          id?: string
          match_status?: string
          meeting_id: string
          member_id?: string | null
          name_key_loose?: string | null
          name_raw?: string | null
          note?: string | null
          official_id?: string | null
          para?: number | null
          raw_line?: string | null
          role_raw?: string | null
          roster_order: number
          roster_section: string
          seat_number?: number | null
        }
        Update: {
          affiliation?: string | null
          created_at?: string
          id?: string
          match_status?: string
          meeting_id?: string
          member_id?: string | null
          name_key_loose?: string | null
          name_raw?: string | null
          note?: string | null
          official_id?: string | null
          para?: number | null
          raw_line?: string | null
          role_raw?: string | null
          roster_order?: number
          roster_section?: string
          seat_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_attendance_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attendance_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_attendance_official_id_fkey"
            columns: ["official_id"]
            isOneToOne: false
            referencedRelation: "officials"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_bodies: {
        Row: {
          active_from: string | null
          active_to: string | null
          body_type: string
          committee_id: string | null
          created_at: string
          drive_folder_no: string | null
          id: string
          name: string
          note: string | null
          predecessor_id: string | null
          updated_at: string
        }
        Insert: {
          active_from?: string | null
          active_to?: string | null
          body_type: string
          committee_id?: string | null
          created_at?: string
          drive_folder_no?: string | null
          id?: string
          name: string
          note?: string | null
          predecessor_id?: string | null
          updated_at?: string
        }
        Update: {
          active_from?: string | null
          active_to?: string | null
          body_type?: string
          committee_id?: string | null
          created_at?: string
          drive_folder_no?: string | null
          id?: string
          name?: string
          note?: string | null
          predecessor_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_bodies_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_bodies_predecessor_id_fkey"
            columns: ["predecessor_id"]
            isOneToOne: false
            referencedRelation: "meeting_bodies"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_times: {
        Row: {
          created_at: string
          event: string | null
          hh: number | null
          hhmm: string | null
          id: string
          meeting_id: string
          mm: number | null
          para: number
          possible_typo: string | null
          text_raw: string
        }
        Insert: {
          created_at?: string
          event?: string | null
          hh?: number | null
          hhmm?: string | null
          id?: string
          meeting_id: string
          mm?: number | null
          para: number
          possible_typo?: string | null
          text_raw: string
        }
        Update: {
          created_at?: string
          event?: string | null
          hh?: number | null
          hhmm?: string | null
          id?: string
          meeting_id?: string
          mm?: number | null
          para?: number
          possible_typo?: string | null
          text_raw?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_times_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          committee_name: string | null
          content_scope: string
          council_session_id: string | null
          created_at: string
          current_source_file_id: string | null
          date_text: string | null
          day_label: string | null
          day_number: number | null
          id: string
          kind: string
          meeting_body_id: string | null
          meeting_date: string
          meeting_key: string | null
          place: string | null
          publish_status: string
          session_kind: string | null
          session_name: string | null
          session_number: number | null
          source_file: string
          source_type: string
          source_url: string | null
          title_raw: string | null
          updated_at: string
          volume: string | null
        }
        Insert: {
          committee_name?: string | null
          content_scope?: string
          council_session_id?: string | null
          created_at?: string
          current_source_file_id?: string | null
          date_text?: string | null
          day_label?: string | null
          day_number?: number | null
          id?: string
          kind: string
          meeting_body_id?: string | null
          meeting_date: string
          meeting_key?: string | null
          place?: string | null
          publish_status?: string
          session_kind?: string | null
          session_name?: string | null
          session_number?: number | null
          source_file: string
          source_type: string
          source_url?: string | null
          title_raw?: string | null
          updated_at?: string
          volume?: string | null
        }
        Update: {
          committee_name?: string | null
          content_scope?: string
          council_session_id?: string | null
          created_at?: string
          current_source_file_id?: string | null
          date_text?: string | null
          day_label?: string | null
          day_number?: number | null
          id?: string
          kind?: string
          meeting_body_id?: string | null
          meeting_date?: string
          meeting_key?: string | null
          place?: string | null
          publish_status?: string
          session_kind?: string | null
          session_name?: string | null
          session_number?: number | null
          source_file?: string
          source_type?: string
          source_url?: string | null
          title_raw?: string | null
          updated_at?: string
          volume?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_council_session_id_fkey"
            columns: ["council_session_id"]
            isOneToOne: false
            referencedRelation: "council_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_current_source_file_id_fkey"
            columns: ["current_source_file_id"]
            isOneToOne: false
            referencedRelation: "source_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_meeting_body_id_fkey"
            columns: ["meeting_body_id"]
            isOneToOne: false
            referencedRelation: "meeting_bodies"
            referencedColumns: ["id"]
          },
        ]
      }
      member_aliases: {
        Row: {
          alias: string
          alias_key: string | null
          alias_key_loose: string | null
          created_at: string
          id: string
          member_id: string
        }
        Insert: {
          alias: string
          alias_key?: string | null
          alias_key_loose?: string | null
          created_at?: string
          id?: string
          member_id: string
        }
        Update: {
          alias?: string
          alias_key?: string | null
          alias_key_loose?: string | null
          created_at?: string
          id?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_aliases_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_faction_history: {
        Row: {
          basis: string
          created_at: string
          end_date: string | null
          faction_id: string
          id: string
          member_id: string
          note: string | null
          start_date: string | null
          updated_at: string
        }
        Insert: {
          basis: string
          created_at?: string
          end_date?: string | null
          faction_id: string
          id?: string
          member_id: string
          note?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          basis?: string
          created_at?: string
          end_date?: string | null
          faction_id?: string
          id?: string
          member_id?: string
          note?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_faction_history_faction_id_fkey"
            columns: ["faction_id"]
            isOneToOne: false
            referencedRelation: "factions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_faction_history_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_terms: {
        Row: {
          basis: string | null
          created_at: string
          end_date: string | null
          id: string
          member_id: string
          seat_number: number | null
          start_date: string | null
          term_number: number | null
        }
        Insert: {
          basis?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          member_id: string
          seat_number?: number | null
          start_date?: string | null
          term_number?: number | null
        }
        Update: {
          basis?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          member_id?: string
          seat_number?: number | null
          start_date?: string | null
          term_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "member_terms_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          council_member_id: string | null
          created_at: string
          id: string
          is_current: boolean
          is_provisional: boolean
          name: string
          updated_at: string
          yomi: string | null
        }
        Insert: {
          council_member_id?: string | null
          created_at?: string
          id?: string
          is_current?: boolean
          is_provisional?: boolean
          name: string
          updated_at?: string
          yomi?: string | null
        }
        Update: {
          council_member_id?: string | null
          created_at?: string
          id?: string
          is_current?: boolean
          is_provisional?: boolean
          name?: string
          updated_at?: string
          yomi?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_council_member_id_fkey"
            columns: ["council_member_id"]
            isOneToOne: true
            referencedRelation: "council_members"
            referencedColumns: ["id"]
          },
        ]
      }
      minutes_paragraphs: {
        Row: {
          also_contains: string | null
          chars: number | null
          created_at: string
          id: string
          masked_count: number | null
          masked_orig_chars: number | null
          masked_reason: string | null
          meeting_id: string
          notes: Json | null
          para: number
          part: string
          pd_index: number | null
          ptext_differs: boolean
          ptext_missing_chars: number | null
          source_file_id: string | null
          speech_id: string | null
          stage_after_speech_id: string | null
          stage_inside_speech_id: string | null
          table_cell: number[] | null
          text: string
          withheld_orig_chars: number | null
          withheld_reason: string | null
        }
        Insert: {
          also_contains?: string | null
          chars?: number | null
          created_at?: string
          id?: string
          masked_count?: number | null
          masked_orig_chars?: number | null
          masked_reason?: string | null
          meeting_id: string
          notes?: Json | null
          para: number
          part: string
          pd_index?: number | null
          ptext_differs?: boolean
          ptext_missing_chars?: number | null
          source_file_id?: string | null
          speech_id?: string | null
          stage_after_speech_id?: string | null
          stage_inside_speech_id?: string | null
          table_cell?: number[] | null
          text?: string
          withheld_orig_chars?: number | null
          withheld_reason?: string | null
        }
        Update: {
          also_contains?: string | null
          chars?: number | null
          created_at?: string
          id?: string
          masked_count?: number | null
          masked_orig_chars?: number | null
          masked_reason?: string | null
          meeting_id?: string
          notes?: Json | null
          para?: number
          part?: string
          pd_index?: number | null
          ptext_differs?: boolean
          ptext_missing_chars?: number | null
          source_file_id?: string | null
          speech_id?: string | null
          stage_after_speech_id?: string | null
          stage_inside_speech_id?: string | null
          table_cell?: number[] | null
          text?: string
          withheld_orig_chars?: number | null
          withheld_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "minutes_paragraphs_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "minutes_paragraphs_source_file_id_fkey"
            columns: ["source_file_id"]
            isOneToOne: false
            referencedRelation: "source_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "minutes_paragraphs_speech_id_fkey"
            columns: ["speech_id"]
            isOneToOne: false
            referencedRelation: "speech_factions"
            referencedColumns: ["speech_id"]
          },
          {
            foreignKeyName: "minutes_paragraphs_speech_id_fkey"
            columns: ["speech_id"]
            isOneToOne: false
            referencedRelation: "speeches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "minutes_paragraphs_stage_after_speech_id_fkey"
            columns: ["stage_after_speech_id"]
            isOneToOne: false
            referencedRelation: "speech_factions"
            referencedColumns: ["speech_id"]
          },
          {
            foreignKeyName: "minutes_paragraphs_stage_after_speech_id_fkey"
            columns: ["stage_after_speech_id"]
            isOneToOne: false
            referencedRelation: "speeches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "minutes_paragraphs_stage_inside_speech_id_fkey"
            columns: ["stage_inside_speech_id"]
            isOneToOne: false
            referencedRelation: "speech_factions"
            referencedColumns: ["speech_id"]
          },
          {
            foreignKeyName: "minutes_paragraphs_stage_inside_speech_id_fkey"
            columns: ["stage_inside_speech_id"]
            isOneToOne: false
            referencedRelation: "speeches"
            referencedColumns: ["id"]
          },
        ]
      }
      official_aliases: {
        Row: {
          alias: string
          alias_key: string | null
          alias_key_loose: string | null
          created_at: string
          id: string
          official_id: string
        }
        Insert: {
          alias: string
          alias_key?: string | null
          alias_key_loose?: string | null
          created_at?: string
          id?: string
          official_id: string
        }
        Update: {
          alias?: string
          alias_key?: string | null
          alias_key_loose?: string | null
          created_at?: string
          id?: string
          official_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "official_aliases_official_id_fkey"
            columns: ["official_id"]
            isOneToOne: false
            referencedRelation: "officials"
            referencedColumns: ["id"]
          },
        ]
      }
      official_posts: {
        Row: {
          basis: string | null
          created_at: string
          department: string | null
          end_date: string | null
          first_meeting_id: string | null
          id: string
          last_meeting_id: string | null
          official_id: string
          post_title: string
          start_date: string | null
        }
        Insert: {
          basis?: string | null
          created_at?: string
          department?: string | null
          end_date?: string | null
          first_meeting_id?: string | null
          id?: string
          last_meeting_id?: string | null
          official_id: string
          post_title: string
          start_date?: string | null
        }
        Update: {
          basis?: string | null
          created_at?: string
          department?: string | null
          end_date?: string | null
          first_meeting_id?: string | null
          id?: string
          last_meeting_id?: string | null
          official_id?: string
          post_title?: string
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "official_posts_first_meeting_id_fkey"
            columns: ["first_meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "official_posts_last_meeting_id_fkey"
            columns: ["last_meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "official_posts_official_id_fkey"
            columns: ["official_id"]
            isOneToOne: false
            referencedRelation: "officials"
            referencedColumns: ["id"]
          },
        ]
      }
      officials: {
        Row: {
          created_at: string
          id: string
          is_provisional: boolean
          name: string
          name_key_loose: string | null
          note: string | null
          official_kind: string
          updated_at: string
          yomi: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_provisional?: boolean
          name: string
          name_key_loose?: string | null
          note?: string | null
          official_kind: string
          updated_at?: string
          yomi?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_provisional?: boolean
          name?: string
          name_key_loose?: string | null
          note?: string | null
          official_kind?: string
          updated_at?: string
          yomi?: string | null
        }
        Relationships: []
      }
      petition_documents: {
        Row: {
          created_at: string
          doc_order: number
          extra_fields: Json
          id: string
          introducing_members: string | null
          kind: string
          meeting_id: string
          para_end: number | null
          para_start: number | null
          reason: string | null
          received: string | null
          referred_committee: string | null
          requested_items: string | null
          summary: string | null
          title: string | null
        }
        Insert: {
          created_at?: string
          doc_order: number
          extra_fields?: Json
          id?: string
          introducing_members?: string | null
          kind: string
          meeting_id: string
          para_end?: number | null
          para_start?: number | null
          reason?: string | null
          received?: string | null
          referred_committee?: string | null
          requested_items?: string | null
          summary?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string
          doc_order?: number
          extra_fields?: Json
          id?: string
          introducing_members?: string | null
          kind?: string
          meeting_id?: string
          para_end?: number | null
          para_start?: number | null
          reason?: string | null
          received?: string | null
          referred_committee?: string | null
          requested_items?: string | null
          summary?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "petition_documents_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      press_conference_items: {
        Row: {
          created_at: string | null
          id: string
          item_type: string
          material_url: string | null
          order_index: number
          press_conference_id: string
          summary: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_type: string
          material_url?: string | null
          order_index: number
          press_conference_id: string
          summary?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          id?: string
          item_type?: string
          material_url?: string | null
          order_index?: number
          press_conference_id?: string
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "press_conference_items_press_conference_id_fkey"
            columns: ["press_conference_id"]
            isOneToOne: false
            referencedRelation: "press_conferences"
            referencedColumns: ["id"]
          },
        ]
      }
      press_conference_turns: {
        Row: {
          content: string
          created_at: string | null
          id: string
          order_index: number
          press_conference_item_id: string
          speaker: string
          speaker_name: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          order_index: number
          press_conference_item_id: string
          speaker: string
          speaker_name?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          order_index?: number
          press_conference_item_id?: string
          speaker?: string
          speaker_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "press_conference_turns_press_conference_item_id_fkey"
            columns: ["press_conference_item_id"]
            isOneToOne: false
            referencedRelation: "press_conference_items"
            referencedColumns: ["id"]
          },
        ]
      }
      press_conferences: {
        Row: {
          created_at: string | null
          held_at: string
          id: string
          slug: string
          status: string
          title: string
          updated_at: string | null
          youtube_url: string | null
        }
        Insert: {
          created_at?: string | null
          held_at: string
          id?: string
          slug: string
          status?: string
          title: string
          updated_at?: string | null
          youtube_url?: string | null
        }
        Update: {
          created_at?: string | null
          held_at?: string
          id?: string
          slug?: string
          status?: string
          title?: string
          updated_at?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      preview_tokens: {
        Row: {
          bill_id: string
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          token: string
        }
        Insert: {
          bill_id: string
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          token: string
        }
        Update: {
          bill_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "preview_tokens_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      procedural_markers: {
        Row: {
          agenda_item_id: string | null
          created_at: string
          id: string
          kind: string
          marker_order: number
          meeting_id: string
          opens: boolean | null
          refs: string[] | null
          section_id: string | null
          sentence_index: number | null
          speech_id: string | null
          wording: string
        }
        Insert: {
          agenda_item_id?: string | null
          created_at?: string
          id?: string
          kind: string
          marker_order: number
          meeting_id: string
          opens?: boolean | null
          refs?: string[] | null
          section_id?: string | null
          sentence_index?: number | null
          speech_id?: string | null
          wording: string
        }
        Update: {
          agenda_item_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          marker_order?: number
          meeting_id?: string
          opens?: boolean | null
          refs?: string[] | null
          section_id?: string | null
          sentence_index?: number | null
          speech_id?: string | null
          wording?: string
        }
        Relationships: [
          {
            foreignKeyName: "procedural_markers_agenda_item_id_fkey"
            columns: ["agenda_item_id"]
            isOneToOne: false
            referencedRelation: "agenda_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedural_markers_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedural_markers_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedural_markers_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections_analysis"
            referencedColumns: ["section_id"]
          },
          {
            foreignKeyName: "procedural_markers_speech_id_fkey"
            columns: ["speech_id"]
            isOneToOne: false
            referencedRelation: "speech_factions"
            referencedColumns: ["speech_id"]
          },
          {
            foreignKeyName: "procedural_markers_speech_id_fkey"
            columns: ["speech_id"]
            isOneToOne: false
            referencedRelation: "speeches"
            referencedColumns: ["id"]
          },
        ]
      }
      report_reactions: {
        Row: {
          created_at: string
          id: string
          interview_report_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interview_report_id: string
          reaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interview_report_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_reactions_interview_report_id_fkey"
            columns: ["interview_report_id"]
            isOneToOne: false
            referencedRelation: "interview_report"
            referencedColumns: ["id"]
          },
        ]
      }
      section_agenda_items: {
        Row: {
          agenda_item_id: string
          created_at: string
          section_id: string
        }
        Insert: {
          agenda_item_id: string
          created_at?: string
          section_id: string
        }
        Update: {
          agenda_item_id?: string
          created_at?: string
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "section_agenda_items_agenda_item_id_fkey"
            columns: ["agenda_item_id"]
            isOneToOne: false
            referencedRelation: "agenda_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "section_agenda_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "section_agenda_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections_analysis"
            referencedColumns: ["section_id"]
          },
        ]
      }
      section_budget_scopes: {
        Row: {
          accounts: string[] | null
          created_at: string
          id: string
          inherited_from_same_speech: boolean
          is_range: boolean
          kan: Json | null
          kou: Json | null
          scope_order: number
          section_id: string
          sides: string[] | null
          wording: string
        }
        Insert: {
          accounts?: string[] | null
          created_at?: string
          id?: string
          inherited_from_same_speech?: boolean
          is_range?: boolean
          kan?: Json | null
          kou?: Json | null
          scope_order?: number
          section_id: string
          sides?: string[] | null
          wording: string
        }
        Update: {
          accounts?: string[] | null
          created_at?: string
          id?: string
          inherited_from_same_speech?: boolean
          is_range?: boolean
          kan?: Json | null
          kou?: Json | null
          scope_order?: number
          section_id?: string
          sides?: string[] | null
          wording?: string
        }
        Relationships: [
          {
            foreignKeyName: "section_budget_scopes_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "section_budget_scopes_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections_analysis"
            referencedColumns: ["section_id"]
          },
        ]
      }
      section_kinds: {
        Row: {
          base_kind: string
          excluded_from_analysis: boolean
          kind: string
          note: string | null
          sort_order: number
        }
        Insert: {
          base_kind: string
          excluded_from_analysis: boolean
          kind: string
          note?: string | null
          sort_order: number
        }
        Update: {
          base_kind?: string
          excluded_from_analysis?: boolean
          kind?: string
          note?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      sections: {
        Row: {
          created_at: string
          end_seq: number | null
          excluded_from_analysis: boolean | null
          id: string
          kind: string
          kind_detail: string | null
          meeting_id: string
          range_id: string | null
          range_role: string | null
          section_order: number
          source_section_no: number | null
          start_char: number | null
          start_para: number | null
          start_sentence: number | null
          start_sentence_head: string | null
          start_seq: number | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_seq?: number | null
          excluded_from_analysis?: boolean | null
          id?: string
          kind: string
          kind_detail?: string | null
          meeting_id: string
          range_id?: string | null
          range_role?: string | null
          section_order: number
          source_section_no?: number | null
          start_char?: number | null
          start_para?: number | null
          start_sentence?: number | null
          start_sentence_head?: string | null
          start_seq?: number | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_seq?: number | null
          excluded_from_analysis?: boolean | null
          id?: string
          kind?: string
          kind_detail?: string | null
          meeting_id?: string
          range_id?: string | null
          range_role?: string | null
          section_order?: number
          source_section_no?: number | null
          start_char?: number | null
          start_para?: number | null
          start_sentence?: number | null
          start_sentence_head?: string | null
          start_seq?: number | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_kind_detail_fkey"
            columns: ["kind_detail", "kind"]
            isOneToOne: false
            referencedRelation: "section_kinds"
            referencedColumns: ["kind", "base_kind"]
          },
          {
            foreignKeyName: "sections_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sections_range_id_fkey"
            columns: ["range_id"]
            isOneToOne: false
            referencedRelation: "general_question_ranges"
            referencedColumns: ["id"]
          },
        ]
      }
      source_files: {
        Row: {
          conversion: string | null
          converted: boolean
          created_at: string
          date_check: string | null
          date_from_name: string | null
          date_source: string | null
          dedupe_rule: string | null
          drive_path: string | null
          duplicate_of: string | null
          file_name: string
          format: string
          format_issues: Json
          id: string
          ingest_run_id: string | null
          intermediate_sha256: string | null
          is_representative: boolean
          meeting_key: string
          parsed_file: string | null
          same_text_as_representative: boolean | null
          selected_because: string | null
          sha256_parsed: string | null
          sha256_source: string
          size_source: number | null
          source_type: string
          tool_name: string | null
          tool_version: string | null
          volume: string | null
        }
        Insert: {
          conversion?: string | null
          converted?: boolean
          created_at?: string
          date_check?: string | null
          date_from_name?: string | null
          date_source?: string | null
          dedupe_rule?: string | null
          drive_path?: string | null
          duplicate_of?: string | null
          file_name: string
          format: string
          format_issues?: Json
          id?: string
          ingest_run_id?: string | null
          intermediate_sha256?: string | null
          is_representative: boolean
          meeting_key: string
          parsed_file?: string | null
          same_text_as_representative?: boolean | null
          selected_because?: string | null
          sha256_parsed?: string | null
          sha256_source: string
          size_source?: number | null
          source_type: string
          tool_name?: string | null
          tool_version?: string | null
          volume?: string | null
        }
        Update: {
          conversion?: string | null
          converted?: boolean
          created_at?: string
          date_check?: string | null
          date_from_name?: string | null
          date_source?: string | null
          dedupe_rule?: string | null
          drive_path?: string | null
          duplicate_of?: string | null
          file_name?: string
          format?: string
          format_issues?: Json
          id?: string
          ingest_run_id?: string | null
          intermediate_sha256?: string | null
          is_representative?: boolean
          meeting_key?: string
          parsed_file?: string | null
          same_text_as_representative?: boolean | null
          selected_because?: string | null
          sha256_parsed?: string | null
          sha256_source?: string
          size_source?: number | null
          source_type?: string
          tool_name?: string | null
          tool_version?: string | null
          volume?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "source_files_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "source_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "source_files_ingest_run_id_fkey"
            columns: ["ingest_run_id"]
            isOneToOne: false
            referencedRelation: "ingest_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      speech_key_map: {
        Row: {
          checked_by: string | null
          checked_on: string | null
          created_at: string
          id: string
          match_how: string
          new_speech_id: string | null
          old_speech_key: string
          result: string
        }
        Insert: {
          checked_by?: string | null
          checked_on?: string | null
          created_at?: string
          id?: string
          match_how: string
          new_speech_id?: string | null
          old_speech_key: string
          result: string
        }
        Update: {
          checked_by?: string | null
          checked_on?: string | null
          created_at?: string
          id?: string
          match_how?: string
          new_speech_id?: string | null
          old_speech_key?: string
          result?: string
        }
        Relationships: [
          {
            foreignKeyName: "speech_key_map_new_speech_id_fkey"
            columns: ["new_speech_id"]
            isOneToOne: false
            referencedRelation: "speech_factions"
            referencedColumns: ["speech_id"]
          },
          {
            foreignKeyName: "speech_key_map_new_speech_id_fkey"
            columns: ["new_speech_id"]
            isOneToOne: false
            referencedRelation: "speeches"
            referencedColumns: ["id"]
          },
        ]
      }
      speech_references: {
        Row: {
          by_presider: boolean | null
          created_at: string
          form: string | null
          id: string
          ref_order: number
          section_id: string | null
          section_kind: string | null
          speech_id: string
          wording: string
        }
        Insert: {
          by_presider?: boolean | null
          created_at?: string
          form?: string | null
          id?: string
          ref_order: number
          section_id?: string | null
          section_kind?: string | null
          speech_id: string
          wording: string
        }
        Update: {
          by_presider?: boolean | null
          created_at?: string
          form?: string | null
          id?: string
          ref_order?: number
          section_id?: string | null
          section_kind?: string | null
          speech_id?: string
          wording?: string
        }
        Relationships: [
          {
            foreignKeyName: "speech_references_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "speech_references_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections_analysis"
            referencedColumns: ["section_id"]
          },
          {
            foreignKeyName: "speech_references_speech_id_fkey"
            columns: ["speech_id"]
            isOneToOne: false
            referencedRelation: "speech_factions"
            referencedColumns: ["speech_id"]
          },
          {
            foreignKeyName: "speech_references_speech_id_fkey"
            columns: ["speech_id"]
            isOneToOne: false
            referencedRelation: "speeches"
            referencedColumns: ["id"]
          },
        ]
      }
      speeches: {
        Row: {
          attendance_id: string | null
          body: string
          chars: number | null
          chars_nospace: number | null
          created_at: string
          flags: string[] | null
          has_masked: boolean | null
          id: string
          identify_how: string | null
          identify_note: string | null
          in_general_question: boolean
          is_presiding: boolean | null
          is_related_question: boolean
          key_dup_no: number | null
          key_head20_sha1: string | null
          line_end: number | null
          line_start: number | null
          meeting_id: string
          member_id: string | null
          member_unconfirmed: boolean | null
          official_id: string | null
          para_end: number | null
          para_start: number | null
          presiding_class: string | null
          section_id: string | null
          sections_spanned: number[] | null
          source_file_id: string | null
          speaker_detail: string | null
          speaker_kind: string
          speaker_label_raw: string | null
          speaker_name_raw: string
          speaker_role_raw: string | null
          speech_key: string | null
          speech_order: number
          starts_mid_section: boolean
          stated_faction: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attendance_id?: string | null
          body: string
          chars?: number | null
          chars_nospace?: number | null
          created_at?: string
          flags?: string[] | null
          has_masked?: boolean | null
          id?: string
          identify_how?: string | null
          identify_note?: string | null
          in_general_question?: boolean
          is_presiding?: boolean | null
          is_related_question?: boolean
          key_dup_no?: number | null
          key_head20_sha1?: string | null
          line_end?: number | null
          line_start?: number | null
          meeting_id: string
          member_id?: string | null
          member_unconfirmed?: boolean | null
          official_id?: string | null
          para_end?: number | null
          para_start?: number | null
          presiding_class?: string | null
          section_id?: string | null
          sections_spanned?: number[] | null
          source_file_id?: string | null
          speaker_detail?: string | null
          speaker_kind: string
          speaker_label_raw?: string | null
          speaker_name_raw: string
          speaker_role_raw?: string | null
          speech_key?: string | null
          speech_order: number
          starts_mid_section?: boolean
          stated_faction?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attendance_id?: string | null
          body?: string
          chars?: number | null
          chars_nospace?: number | null
          created_at?: string
          flags?: string[] | null
          has_masked?: boolean | null
          id?: string
          identify_how?: string | null
          identify_note?: string | null
          in_general_question?: boolean
          is_presiding?: boolean | null
          is_related_question?: boolean
          key_dup_no?: number | null
          key_head20_sha1?: string | null
          line_end?: number | null
          line_start?: number | null
          meeting_id?: string
          member_id?: string | null
          member_unconfirmed?: boolean | null
          official_id?: string | null
          para_end?: number | null
          para_start?: number | null
          presiding_class?: string | null
          section_id?: string | null
          sections_spanned?: number[] | null
          source_file_id?: string | null
          speaker_detail?: string | null
          speaker_kind?: string
          speaker_label_raw?: string | null
          speaker_name_raw?: string
          speaker_role_raw?: string | null
          speech_key?: string | null
          speech_order?: number
          starts_mid_section?: boolean
          stated_faction?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "speeches_attendance_id_fkey"
            columns: ["attendance_id"]
            isOneToOne: false
            referencedRelation: "meeting_attendance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "speeches_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "speeches_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "speeches_official_id_fkey"
            columns: ["official_id"]
            isOneToOne: false
            referencedRelation: "officials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "speeches_section_fkey"
            columns: ["section_id", "meeting_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id", "meeting_id"]
          },
          {
            foreignKeyName: "speeches_section_fkey"
            columns: ["section_id", "meeting_id"]
            isOneToOne: false
            referencedRelation: "sections_analysis"
            referencedColumns: ["section_id", "meeting_id"]
          },
          {
            foreignKeyName: "speeches_source_file_id_fkey"
            columns: ["source_file_id"]
            isOneToOne: false
            referencedRelation: "source_files"
            referencedColumns: ["id"]
          },
        ]
      }
      stated_stances: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          label_raw: string | null
          member_id: string | null
          section_id: string
          speech_id: string | null
          stance_order: number
          wording: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          label_raw?: string | null
          member_id?: string | null
          section_id: string
          speech_id?: string | null
          stance_order: number
          wording: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          label_raw?: string | null
          member_id?: string | null
          section_id?: string
          speech_id?: string | null
          stance_order?: number
          wording?: string
        }
        Relationships: [
          {
            foreignKeyName: "stated_stances_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stated_stances_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stated_stances_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections_analysis"
            referencedColumns: ["section_id"]
          },
          {
            foreignKeyName: "stated_stances_speech_id_fkey"
            columns: ["speech_id"]
            isOneToOne: false
            referencedRelation: "speech_factions"
            referencedColumns: ["speech_id"]
          },
          {
            foreignKeyName: "stated_stances_speech_id_fkey"
            columns: ["speech_id"]
            isOneToOne: false
            referencedRelation: "speeches"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string
          description: string | null
          featured_priority: number | null
          id: string
          label: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          featured_priority?: number | null
          id?: string
          label: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          featured_priority?: number | null
          id?: string
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      topic_analysis_classifications: {
        Row: {
          id: string
          interview_report_id: string
          opinion_index: number
          topic_id: string
          version_id: string
        }
        Insert: {
          id?: string
          interview_report_id: string
          opinion_index: number
          topic_id: string
          version_id: string
        }
        Update: {
          id?: string
          interview_report_id?: string
          opinion_index?: number
          topic_id?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_analysis_classifications_interview_report_id_fkey"
            columns: ["interview_report_id"]
            isOneToOne: false
            referencedRelation: "interview_report"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_analysis_classifications_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topic_analysis_topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_analysis_classifications_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "topic_analysis_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_analysis_topics: {
        Row: {
          created_at: string
          description_md: string
          id: string
          name: string
          representative_opinions: Json
          sort_order: number
          version_id: string
        }
        Insert: {
          created_at?: string
          description_md: string
          id?: string
          name: string
          representative_opinions?: Json
          sort_order?: number
          version_id: string
        }
        Update: {
          created_at?: string
          description_md?: string
          id?: string
          name?: string
          representative_opinions?: Json
          sort_order?: number
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_analysis_topics_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "topic_analysis_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_analysis_versions: {
        Row: {
          bill_id: string
          completed_at: string | null
          created_at: string
          current_step: string | null
          error_message: string | null
          id: string
          intermediate_results: Json | null
          phase_data: Json | null
          started_at: string | null
          status: string
          summary_md: string | null
          updated_at: string
          version: number
        }
        Insert: {
          bill_id: string
          completed_at?: string | null
          created_at?: string
          current_step?: string | null
          error_message?: string | null
          id?: string
          intermediate_results?: Json | null
          phase_data?: Json | null
          started_at?: string | null
          status?: string
          summary_md?: string | null
          updated_at?: string
          version: number
        }
        Update: {
          bill_id?: string
          completed_at?: string | null
          created_at?: string
          current_step?: string | null
          error_message?: string | null
          id?: string
          intermediate_results?: Json | null
          phase_data?: Json | null
          started_at?: string | null
          status?: string
          summary_md?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "topic_analysis_versions_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_nodes: {
        Row: {
          created_at: string
          id: string
          level: string
          node_order: number
          parent_id: string | null
          section_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          level: string
          node_order: number
          parent_id?: string | null
          section_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          node_order?: number
          parent_id?: string | null
          section_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "topic_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_nodes_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_nodes_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections_analysis"
            referencedColumns: ["section_id"]
          },
        ]
      }
      topic_speeches: {
        Row: {
          char_end: number | null
          char_start: number | null
          created_at: string
          id: string
          speech_id: string
          topic_node_id: string
        }
        Insert: {
          char_end?: number | null
          char_start?: number | null
          created_at?: string
          id?: string
          speech_id: string
          topic_node_id: string
        }
        Update: {
          char_end?: number | null
          char_start?: number | null
          created_at?: string
          id?: string
          speech_id?: string
          topic_node_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_speeches_speech_id_fkey"
            columns: ["speech_id"]
            isOneToOne: false
            referencedRelation: "speech_factions"
            referencedColumns: ["speech_id"]
          },
          {
            foreignKeyName: "topic_speeches_speech_id_fkey"
            columns: ["speech_id"]
            isOneToOne: false
            referencedRelation: "speeches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_speeches_topic_node_id_fkey"
            columns: ["topic_node_id"]
            isOneToOne: false
            referencedRelation: "topic_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      vote_agenda_items: {
        Row: {
          agenda_item_id: string
          created_at: string
          vote_id: string
        }
        Insert: {
          agenda_item_id: string
          created_at?: string
          vote_id: string
        }
        Update: {
          agenda_item_id?: string
          created_at?: string
          vote_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vote_agenda_items_agenda_item_id_fkey"
            columns: ["agenda_item_id"]
            isOneToOne: false
            referencedRelation: "agenda_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vote_agenda_items_vote_id_fkey"
            columns: ["vote_id"]
            isOneToOne: false
            referencedRelation: "votes"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          created_at: string
          id: string
          meeting_id: string
          method_wording: string | null
          result_machine: string | null
          result_machine_by: string | null
          result_wording: string
          section_id: string | null
          speech_id: string | null
          vote_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          meeting_id: string
          method_wording?: string | null
          result_machine?: string | null
          result_machine_by?: string | null
          result_wording: string
          section_id?: string | null
          speech_id?: string | null
          vote_order: number
        }
        Update: {
          created_at?: string
          id?: string
          meeting_id?: string
          method_wording?: string | null
          result_machine?: string | null
          result_machine_by?: string | null
          result_wording?: string
          section_id?: string | null
          speech_id?: string | null
          vote_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "votes_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections_analysis"
            referencedColumns: ["section_id"]
          },
          {
            foreignKeyName: "votes_speech_id_fkey"
            columns: ["speech_id"]
            isOneToOne: false
            referencedRelation: "speech_factions"
            referencedColumns: ["speech_id"]
          },
          {
            foreignKeyName: "votes_speech_id_fkey"
            columns: ["speech_id"]
            isOneToOne: false
            referencedRelation: "speeches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      jimu_jigyo_budget_timeline: {
        Row: {
          bureau_name: string | null
          change_rate_percent: number | null
          expenditure_amount: number | null
          fiscal_year: number | null
          general_revenue: number | null
          item_name: string | null
          prev_year_amount: number | null
          specific_revenue: number | null
        }
        Relationships: []
      }
      jimu_jigyo_latest: {
        Row: {
          available_years: number | null
          bureau_code: string | null
          bureau_name: string | null
          department_code: string | null
          department_name: string | null
          id: string | null
          item_code: string | null
          item_name: string | null
          latest_fiscal_year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "jimu_jigyo_items_bureau_code_fkey"
            columns: ["bureau_code"]
            isOneToOne: false
            referencedRelation: "jimu_jigyo_bureaus"
            referencedColumns: ["bureau_code"]
          },
        ]
      }
      sections_analysis: {
        Row: {
          excluded_basis: string | null
          excluded_from_analysis: boolean | null
          kind: string | null
          kind_detail: string | null
          meeting_id: string | null
          section_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sections_kind_detail_fkey"
            columns: ["kind_detail", "kind"]
            isOneToOne: false
            referencedRelation: "section_kinds"
            referencedColumns: ["kind", "base_kind"]
          },
          {
            foreignKeyName: "sections_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      speech_factions: {
        Row: {
          faction_name: string | null
          faction_source: string | null
          history_faction_id: string | null
          meeting_date: string | null
          member_id: string | null
          speech_id: string | null
          stated_faction: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_faction_history_faction_id_fkey"
            columns: ["history_faction_id"]
            isOneToOne: false
            referencedRelation: "factions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "speeches_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      alias_key_loose: { Args: { p_text: string }; Returns: string }
      count_reactions_by_report_ids: {
        Args: { report_ids: string[] }
        Returns: {
          cnt: number
          interview_report_id: string
          reaction_type: string
        }[]
      }
      find_member_id: { Args: { p_notation: string }; Returns: string }
      general_question_search_options: { Args: never; Returns: Json }
      get_admin_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          last_sign_in_at: string
        }[]
      }
      get_interview_message_counts: {
        Args: { session_ids: string[] }
        Returns: {
          interview_session_id: string
          message_count: number
        }[]
      }
      get_jimu_jigyo_statistics: {
        Args: { target_fiscal_year: number }
        Returns: {
          avg_achievement_rate: number
          bureau_breakdown: Json
          fiscal_year: number
          total_budget: number
          total_items: number
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      member_alias_key: { Args: { p_text: string }; Returns: string }
      member_faction_id_on: {
        Args: { p_date: string; p_member_id: string }
        Returns: string
      }
      refresh_all_council_member_factions: { Args: never; Returns: undefined }
      refresh_council_member_faction: {
        Args: { p_member_id: string }
        Returns: undefined
      }
      search_general_question_passages: {
        Args: {
          p_answerer_role?: string
          p_council_session_id?: string
          p_faction_name?: string
          p_limit?: number
          p_member_id?: string
          p_terms?: string[]
        }
        Returns: {
          chapter_title: string
          faction_source: string
          meeting_date: string
          passage_kind: string
          passage_length: number
          questioner_faction: string
          questioner_name: string
          section_id: string
          session_name: string
          snippet: string
          snippet_has_after: boolean
          snippet_has_before: boolean
          speaker_kind: string
          speaker_name: string
          speaker_role: string
          speech_id: string
          speech_order: number
          topic_title: string
          total_passages: number
          total_sections: number
        }[]
      }
      set_active_council_session: {
        Args: { target_session_id: string }
        Returns: undefined
      }
    }
    Enums: {
      bill_publish_status: "draft" | "published" | "coming_soon"
      bill_status_enum:
        | "preparing"
        | "submitted"
        | "in_committee"
        | "plenary_session"
        | "approved"
        | "rejected"
        | "adopted"
        | "partially_adopted"
        | "reported"
      chat_role_enum: "user" | "system" | "assistant"
      difficulty_level_enum: "normal" | "hard"
      interview_config_status_enum: "public" | "closed"
      interview_mode_enum: "loop" | "bulk"
      interview_report_role_enum:
        | "subject_expert"
        | "work_related"
        | "daily_life_affected"
        | "general_citizen"
      interview_role_enum: "assistant" | "user"
      stance_type_enum:
        | "for"
        | "against"
        | "neutral"
        | "conditional_for"
        | "conditional_against"
        | "considering"
        | "continued_deliberation"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      bill_publish_status: ["draft", "published", "coming_soon"],
      bill_status_enum: [
        "preparing",
        "submitted",
        "in_committee",
        "plenary_session",
        "approved",
        "rejected",
        "adopted",
        "partially_adopted",
        "reported",
      ],
      chat_role_enum: ["user", "system", "assistant"],
      difficulty_level_enum: ["normal", "hard"],
      interview_config_status_enum: ["public", "closed"],
      interview_mode_enum: ["loop", "bulk"],
      interview_report_role_enum: [
        "subject_expert",
        "work_related",
        "daily_life_affected",
        "general_citizen",
      ],
      interview_role_enum: ["assistant", "user"],
      stance_type_enum: [
        "for",
        "against",
        "neutral",
        "conditional_for",
        "conditional_against",
        "considering",
        "continued_deliberation",
      ],
    },
  },
} as const

