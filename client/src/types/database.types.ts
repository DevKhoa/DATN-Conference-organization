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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agenda_comments: {
        Row: {
          comment_id: number
          comment_text: string | null
          commented_at: string | null
          commenter_id: number | null
          draft_id: number | null
        }
        Insert: {
          comment_id?: number
          comment_text?: string | null
          commented_at?: string | null
          commenter_id?: number | null
          draft_id?: number | null
        }
        Update: {
          comment_id?: number
          comment_text?: string | null
          commented_at?: string | null
          commenter_id?: number | null
          draft_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agenda_comments_commenter_id_fkey"
            columns: ["commenter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "agenda_comments_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "agenda_drafts"
            referencedColumns: ["draft_id"]
          },
        ]
      }
      agenda_drafts: {
        Row: {
          conference_id: number | null
          created_at: string | null
          created_by: number | null
          draft_id: number
          is_final: boolean | null
          version: number
        }
        Insert: {
          conference_id?: number | null
          created_at?: string | null
          created_by?: number | null
          draft_id?: number
          is_final?: boolean | null
          version: number
        }
        Update: {
          conference_id?: number | null
          created_at?: string | null
          created_by?: number | null
          draft_id?: number
          is_final?: boolean | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "agenda_drafts_conference_id_fkey"
            columns: ["conference_id"]
            isOneToOne: false
            referencedRelation: "conferences"
            referencedColumns: ["conf_id"]
          },
          {
            foreignKeyName: "agenda_drafts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ai_paper_analysis_logs: {
        Row: {
          check_type: string | null
          checked_at: string | null
          log_id: number
          passed: boolean | null
          result_data: Json | null
          version_id: number | null
        }
        Insert: {
          check_type?: string | null
          checked_at?: string | null
          log_id?: number
          passed?: boolean | null
          result_data?: Json | null
          version_id?: number | null
        }
        Update: {
          check_type?: string | null
          checked_at?: string | null
          log_id?: number
          passed?: boolean | null
          result_data?: Json | null
          version_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_paper_analysis_logs_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "paper_versions"
            referencedColumns: ["version_id"]
          },
        ]
      }
      attendences: {
        Row: {
          at_id: number
          checkin_time: string | null
          is_checkin: boolean | null
          registration_id: number | null
          session_id: number | null
        }
        Insert: {
          at_id?: number
          checkin_time?: string | null
          is_checkin?: boolean | null
          registration_id?: number | null
          session_id?: number | null
        }
        Update: {
          at_id?: number
          checkin_time?: string | null
          is_checkin?: boolean | null
          registration_id?: number | null
          session_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attendences_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["registration_id"]
          },
          {
            foreignKeyName: "attendences_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
      chair_invitations: {
        Row: {
          conf_id: number | null
          created_at: string | null
          email: string
          invitation_id: string
          invited_by: number | null
          responded_at: string | null
          session_id: number | null
          status: Database["public"]["Enums"]["invitation_status"] | null
          token: string | null
        }
        Insert: {
          conf_id?: number | null
          created_at?: string | null
          email: string
          invitation_id?: string
          invited_by?: number | null
          responded_at?: string | null
          session_id?: number | null
          status?: Database["public"]["Enums"]["invitation_status"] | null
          token?: string | null
        }
        Update: {
          conf_id?: number | null
          created_at?: string | null
          email?: string
          invitation_id?: string
          invited_by?: number | null
          responded_at?: string | null
          session_id?: number | null
          status?: Database["public"]["Enums"]["invitation_status"] | null
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chair_invitations_conf_id_fkey"
            columns: ["conf_id"]
            isOneToOne: false
            referencedRelation: "conferences"
            referencedColumns: ["conf_id"]
          },
          {
            foreignKeyName: "chair_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chair_invitations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
      cms_contents: {
        Row: {
          body_content: string | null
          content_id: number
          content_type: string | null
          created_by: number | null
          is_published: boolean | null
          scheduled_publish_time: string | null
          title: string | null
        }
        Insert: {
          body_content?: string | null
          content_id?: number
          content_type?: string | null
          created_by?: number | null
          is_published?: boolean | null
          scheduled_publish_time?: string | null
          title?: string | null
        }
        Update: {
          body_content?: string | null
          content_id?: number
          content_type?: string | null
          created_by?: number | null
          is_published?: boolean | null
          scheduled_publish_time?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cms_contents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      conferences: {
        Row: {
          banner_urls: Json | null
          conf_id: number
          conf_name: string
          create_time: string | null
          description: string | null
          end_date: string | null
          format_type: string | null
          is_active: boolean | null
          keywords: Json | null
          location: string | null
          max_chairs_per_session: number
          open_for_papers: boolean | null
          sessions_ready: boolean | null
          start_date: string | null
          status: string | null
          timezone: string | null
        }
        Insert: {
          banner_urls?: Json | null
          conf_id?: number
          conf_name: string
          create_time?: string | null
          description?: string | null
          end_date?: string | null
          format_type?: string | null
          is_active?: boolean | null
          keywords?: Json | null
          location?: string | null
          max_chairs_per_session?: number
          open_for_papers?: boolean | null
          sessions_ready?: boolean | null
          start_date?: string | null
          status?: string | null
          timezone?: string | null
        }
        Update: {
          banner_urls?: Json | null
          conf_id?: number
          conf_name?: string
          create_time?: string | null
          description?: string | null
          end_date?: string | null
          format_type?: string | null
          is_active?: boolean | null
          keywords?: Json | null
          location?: string | null
          max_chairs_per_session?: number
          open_for_papers?: boolean | null
          sessions_ready?: boolean | null
          start_date?: string | null
          status?: string | null
          timezone?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          conv_id: number
          created_at: string
          summary: string | null
          title: string | null
          user_id: number | null
        }
        Insert: {
          conv_id?: number
          created_at?: string
          summary?: string | null
          title?: string | null
          user_id?: number | null
        }
        Update: {
          conv_id?: number
          created_at?: string
          summary?: string | null
          title?: string | null
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      email_logs: {
        Row: {
          email_log_id: number
          email_type: string | null
          recipient_email: string | null
          sent_at: string | null
          status: string | null
        }
        Insert: {
          email_log_id?: number
          email_type?: string | null
          recipient_email?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          email_log_id?: number
          email_type?: string | null
          recipient_email?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body_html: string | null
          created_at: string | null
          subject: string | null
          template_id: number
          template_name: string | null
        }
        Insert: {
          body_html?: string | null
          created_at?: string | null
          subject?: string | null
          template_id?: number
          template_name?: string | null
        }
        Update: {
          body_html?: string | null
          created_at?: string | null
          subject?: string | null
          template_id?: number
          template_name?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string | null
          conv_id: number | null
          created_at: string
          message_id: number
          parent_id: number | null
          role: string | null
          tab_id: number | null
          tokens_count: number | null
        }
        Insert: {
          content?: string | null
          conv_id?: number | null
          created_at?: string
          message_id?: number
          parent_id?: number | null
          role?: string | null
          tab_id?: number | null
          tokens_count?: number | null
        }
        Update: {
          content?: string | null
          conv_id?: number | null
          created_at?: string
          message_id?: number
          parent_id?: number | null
          role?: string | null
          tab_id?: number | null
          tokens_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conv_id_fkey"
            columns: ["conv_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["conv_id"]
          },
          {
            foreignKeyName: "messages_tab_id_fkey"
            columns: ["tab_id"]
            isOneToOne: false
            referencedRelation: "tab_context"
            referencedColumns: ["tab_id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          conf_id: number | null
          content_template: string
          created_at: string
          created_by: number | null
          template_id: number
          template_name: string
          title_template: string
        }
        Insert: {
          conf_id?: number | null
          content_template: string
          created_at?: string
          created_by?: number | null
          template_id?: number
          template_name: string
          title_template: string
        }
        Update: {
          conf_id?: number | null
          content_template?: string
          created_at?: string
          created_by?: number | null
          template_id?: number
          template_name?: string
          title_template?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_templates_conf_id_fkey"
            columns: ["conf_id"]
            isOneToOne: false
            referencedRelation: "conferences"
            referencedColumns: ["conf_id"]
          },
          {
            foreignKeyName: "notification_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications: {
        Row: {
          attachments: Json | null
          conf_id: number | null
          content: string
          created_at: string
          notification_id: number
          sender_id: number | null
          target_criteria: Json | null
          target_type: string
          title: string
          type: string
        }
        Insert: {
          attachments?: Json | null
          conf_id?: number | null
          content: string
          created_at?: string
          notification_id?: number
          sender_id?: number | null
          target_criteria?: Json | null
          target_type: string
          title: string
          type: string
        }
        Update: {
          attachments?: Json | null
          conf_id?: number | null
          content?: string
          created_at?: string
          notification_id?: number
          sender_id?: number | null
          target_criteria?: Json | null
          target_type?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_conf_id_fkey"
            columns: ["conf_id"]
            isOneToOne: false
            referencedRelation: "conferences"
            referencedColumns: ["conf_id"]
          },
          {
            foreignKeyName: "notifications_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      paper_chunks: {
        Row: {
          chunk_content: string
          chunk_index: number
          chunk_metadata: Json | null
          created_at: string | null
          embedding: string | null
          id: number
          paper_id: number | null
          version_id: number | null
        }
        Insert: {
          chunk_content: string
          chunk_index: number
          chunk_metadata?: Json | null
          created_at?: string | null
          embedding?: string | null
          id?: number
          paper_id?: number | null
          version_id?: number | null
        }
        Update: {
          chunk_content?: string
          chunk_index?: number
          chunk_metadata?: Json | null
          created_at?: string | null
          embedding?: string | null
          id?: number
          paper_id?: number | null
          version_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "paper_chunks_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["paper_id"]
          },
          {
            foreignKeyName: "paper_chunks_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "paper_versions"
            referencedColumns: ["version_id"]
          },
        ]
      }
      paper_coauthors: {
        Row: {
          author_order: number | null
          paper_id: number
          user_id: number
        }
        Insert: {
          author_order?: number | null
          paper_id: number
          user_id: number
        }
        Update: {
          author_order?: number | null
          paper_id?: number
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "paper_coauthors_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["paper_id"]
          },
          {
            foreignKeyName: "paper_coauthors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      paper_decisions: {
        Row: {
          decided_at: string | null
          decided_by: number | null
          decision: string | null
          decision_id: number
          decision_note: string | null
          paper_id: number | null
        }
        Insert: {
          decided_at?: string | null
          decided_by?: number | null
          decision?: string | null
          decision_id?: number
          decision_note?: string | null
          paper_id?: number | null
        }
        Update: {
          decided_at?: string | null
          decided_by?: number | null
          decision?: string | null
          decision_id?: number
          decision_note?: string | null
          paper_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "paper_decisions_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "paper_decisions_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["paper_id"]
          },
        ]
      }
      paper_versions: {
        Row: {
          display: boolean | null
          file_path: string
          format_ok: boolean | null
          is_final: boolean | null
          paper_id: number | null
          plagiarism_safe: boolean | null
          upload_by: number | null
          upload_date: string | null
          version_id: number
          version_number: number
        }
        Insert: {
          display?: boolean | null
          file_path: string
          format_ok?: boolean | null
          is_final?: boolean | null
          paper_id?: number | null
          plagiarism_safe?: boolean | null
          upload_by?: number | null
          upload_date?: string | null
          version_id?: number
          version_number: number
        }
        Update: {
          display?: boolean | null
          file_path?: string
          format_ok?: boolean | null
          is_final?: boolean | null
          paper_id?: number | null
          plagiarism_safe?: boolean | null
          upload_by?: number | null
          upload_date?: string | null
          version_id?: number
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "paper_versions_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["paper_id"]
          },
          {
            foreignKeyName: "paper_versions_upload_by_fkey"
            columns: ["upload_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      papers: {
        Row: {
          abstract: string | null
          created_at: string | null
          final_decision_date: string | null
          paper_id: number
          primary_author_id: number | null
          status: string | null
          submitted_conf: number | null
          title: string
        }
        Insert: {
          abstract?: string | null
          created_at?: string | null
          final_decision_date?: string | null
          paper_id?: number
          primary_author_id?: number | null
          status?: string | null
          submitted_conf?: number | null
          title: string
        }
        Update: {
          abstract?: string | null
          created_at?: string | null
          final_decision_date?: string | null
          paper_id?: number
          primary_author_id?: number | null
          status?: string | null
          submitted_conf?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "papers_primary_author_id_fkey"
            columns: ["primary_author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "papers_submitted_conf_fkey"
            columns: ["submitted_conf"]
            isOneToOne: false
            referencedRelation: "conferences"
            referencedColumns: ["conf_id"]
          },
        ]
      }
      proceedings_configs: {
        Row: {
          break_info: string | null
          committee_selection: Json | null
          conf_id: number
          created_at: string | null
          foreword: string | null
          gala_info: string | null
          internet_info: string | null
          isbn: string | null
          keynotes_json: Json | null
          organizer_logos: Json | null
          pdf_url: string | null
          proceedings_title: string | null
          publisher: string | null
          registration_hours: string | null
          room_assignments: string | null
          room_map_url: string | null
          sponsor_logos: Json | null
          template_name: string | null
          venue_details: string | null
        }
        Insert: {
          break_info?: string | null
          committee_selection?: Json | null
          conf_id: number
          created_at?: string | null
          foreword?: string | null
          gala_info?: string | null
          internet_info?: string | null
          isbn?: string | null
          keynotes_json?: Json | null
          organizer_logos?: Json | null
          pdf_url?: string | null
          proceedings_title?: string | null
          publisher?: string | null
          registration_hours?: string | null
          room_assignments?: string | null
          room_map_url?: string | null
          sponsor_logos?: Json | null
          template_name?: string | null
          venue_details?: string | null
        }
        Update: {
          break_info?: string | null
          committee_selection?: Json | null
          conf_id?: number
          created_at?: string | null
          foreword?: string | null
          gala_info?: string | null
          internet_info?: string | null
          isbn?: string | null
          keynotes_json?: Json | null
          organizer_logos?: Json | null
          pdf_url?: string | null
          proceedings_title?: string | null
          publisher?: string | null
          registration_hours?: string | null
          room_assignments?: string | null
          room_map_url?: string | null
          sponsor_logos?: Json | null
          template_name?: string | null
          venue_details?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proceedings_configs_conf_id_fkey"
            columns: ["conf_id"]
            isOneToOne: true
            referencedRelation: "conferences"
            referencedColumns: ["conf_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          description: string | null
          description_embed: string | null
          email: string
          full_name: string
          google_refresh_token: string | null
          id: string
          organization: string | null
          updated_at: string
          user_id: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          description_embed?: string | null
          email: string
          full_name: string
          google_refresh_token?: string | null
          id: string
          organization?: string | null
          updated_at?: string
          user_id?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          description_embed?: string | null
          email?: string
          full_name?: string
          google_refresh_token?: string | null
          id?: string
          organization?: string | null
          updated_at?: string
          user_id?: number
        }
        Relationships: []
      }
      qa_bans: {
        Row: {
          banned_by: number | null
          created_at: string
          reason: string | null
          user_id: number
        }
        Insert: {
          banned_by?: number | null
          created_at?: string
          reason?: string | null
          user_id: number
        }
        Update: {
          banned_by?: number | null
          created_at?: string
          reason?: string | null
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "qa_bans_banned_by_fkey"
            columns: ["banned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "qa_bans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      question_upvotes: {
        Row: {
          created_at: string | null
          is_upvoted: boolean | null
          question_id: number
          upvote_id: number
          user_id: number
        }
        Insert: {
          created_at?: string | null
          is_upvoted?: boolean | null
          question_id: number
          upvote_id?: number
          user_id: number
        }
        Update: {
          created_at?: string | null
          is_upvoted?: boolean | null
          question_id?: number
          upvote_id?: number
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_question"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["question_id"]
          },
          {
            foreignKeyName: "fk_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      questions: {
        Row: {
          answer_content: string | null
          answer_type: string | null
          answered_at: string | null
          attendee_type: string | null
          author_id: number
          content: string
          created_at: string | null
          paper_id: number
          question_id: number
          session_id: number
          status: string | null
          upvotes_count: number | null
        }
        Insert: {
          answer_content?: string | null
          answer_type?: string | null
          answered_at?: string | null
          attendee_type?: string | null
          author_id: number
          content: string
          created_at?: string | null
          paper_id: number
          question_id?: number
          session_id: number
          status?: string | null
          upvotes_count?: number | null
        }
        Update: {
          answer_content?: string | null
          answer_type?: string | null
          answered_at?: string | null
          attendee_type?: string | null
          author_id?: number
          content?: string
          created_at?: string | null
          paper_id?: number
          question_id?: number
          session_id?: number
          status?: string | null
          upvotes_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "questions_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["paper_id"]
          },
          {
            foreignKeyName: "questions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
      registrations: {
        Row: {
          created_at: string | null
          registration_id: number
          ticket_id: number | null
          user_id: number | null
        }
        Insert: {
          created_at?: string | null
          registration_id?: number
          ticket_id?: number | null
          user_id?: number | null
        }
        Update: {
          created_at?: string | null
          registration_id?: number
          ticket_id?: number | null
          user_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "registrations_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "ticket_configs"
            referencedColumns: ["ticket_id"]
          },
          {
            foreignKeyName: "registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      review_ai_metrics: {
        Row: {
          ai_depth_score: number | null
          ai_sentiment: Json | null
          analyzed_at: string | null
          metric_id: number
          review_id: number | null
        }
        Insert: {
          ai_depth_score?: number | null
          ai_sentiment?: Json | null
          analyzed_at?: string | null
          metric_id?: number
          review_id?: number | null
        }
        Update: {
          ai_depth_score?: number | null
          ai_sentiment?: Json | null
          analyzed_at?: string | null
          metric_id?: number
          review_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "review_ai_metrics_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["review_id"]
          },
        ]
      }
      reviewer_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: number | null
          assignment_id: number
          paper_id: number | null
          reviewer_id: number | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: number | null
          assignment_id?: number
          paper_id?: number | null
          reviewer_id?: number | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: number | null
          assignment_id?: number
          paper_id?: number | null
          reviewer_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reviewer_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviewer_assignments_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["paper_id"]
          },
          {
            foreignKeyName: "reviewer_assignments_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      reviews: {
        Row: {
          comments: string | null
          paper_id: number | null
          recommendation: string | null
          review_date: string | null
          review_id: number
          reviewer_id: number | null
          score: number | null
          status: string | null
        }
        Insert: {
          comments?: string | null
          paper_id?: number | null
          recommendation?: string | null
          review_date?: string | null
          review_id?: number
          reviewer_id?: number | null
          score?: number | null
          status?: string | null
        }
        Update: {
          comments?: string | null
          paper_id?: number | null
          recommendation?: string | null
          review_date?: string | null
          review_id?: number
          reviewer_id?: number | null
          score?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["paper_id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      roles: {
        Row: {
          role_id: number
          role_name: string
        }
        Insert: {
          role_id?: number
          role_name: string
        }
        Update: {
          role_id?: number
          role_name?: string
        }
        Relationships: []
      }
      session_chairs: {
        Row: {
          assigned_at: string | null
          session_id: number
          user_id: number
        }
        Insert: {
          assigned_at?: string | null
          session_id: number
          user_id: number
        }
        Update: {
          assigned_at?: string | null
          session_id?: number
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "session_chairs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "session_chairs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      session_papers: {
        Row: {
          end_time: string | null
          paper_id: number
          presentation_order: number | null
          session_id: number
          start_time: string | null
        }
        Insert: {
          end_time?: string | null
          paper_id: number
          presentation_order?: number | null
          session_id: number
          start_time?: string | null
        }
        Update: {
          end_time?: string | null
          paper_id?: number
          presentation_order?: number | null
          session_id?: number
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_papers_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "papers"
            referencedColumns: ["paper_id"]
          },
          {
            foreignKeyName: "session_papers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
      sessions: {
        Row: {
          conf_id: number | null
          end_time: string | null
          format_type: string | null
          google_event_id: string | null
          is_ai_generated: boolean | null
          is_meet_active: boolean | null
          meet_link: string | null
          record_video_url: string | null
          room_location: string | null
          session_id: number
          session_name: string | null
          session_type: string | null
          start_time: string | null
        }
        Insert: {
          conf_id?: number | null
          end_time?: string | null
          format_type?: string | null
          google_event_id?: string | null
          is_ai_generated?: boolean | null
          is_meet_active?: boolean | null
          meet_link?: string | null
          record_video_url?: string | null
          room_location?: string | null
          session_id?: number
          session_name?: string | null
          session_type?: string | null
          start_time?: string | null
        }
        Update: {
          conf_id?: number | null
          end_time?: string | null
          format_type?: string | null
          google_event_id?: string | null
          is_ai_generated?: boolean | null
          is_meet_active?: boolean | null
          meet_link?: string | null
          record_video_url?: string | null
          room_location?: string | null
          session_id?: number
          session_name?: string | null
          session_type?: string | null
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_conf_id_fkey"
            columns: ["conf_id"]
            isOneToOne: false
            referencedRelation: "conferences"
            referencedColumns: ["conf_id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          description: string | null
          features: Json | null
          is_active: boolean
          max_chats_per_day: number | null
          monthly_tokens: number
          name: string
          plan_code: string
          plan_id: number
          price: number
          subscription_type: Database["public"]["Enums"]["subscription_type"]
          ticket_discount: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          is_active?: boolean
          max_chats_per_day?: number | null
          monthly_tokens: number
          name: string
          plan_code: string
          plan_id?: number
          price: number
          subscription_type: Database["public"]["Enums"]["subscription_type"]
          ticket_discount?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          is_active?: boolean
          max_chats_per_day?: number | null
          monthly_tokens?: number
          name?: string
          plan_code?: string
          plan_id?: number
          price?: number
          subscription_type?: Database["public"]["Enums"]["subscription_type"]
          ticket_discount?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          canceled_at: string | null
          created_at: string | null
          expires_at: string
          last_reset_at: string
          monthly_tokens: number
          price_paid: number
          started_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          subscription_id: number
          subscription_type: Database["public"]["Enums"]["subscription_type"]
          tokens_remaining: number
          updated_at: string | null
          user_id: number
        }
        Insert: {
          canceled_at?: string | null
          created_at?: string | null
          expires_at: string
          last_reset_at?: string
          monthly_tokens: number
          price_paid: number
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          subscription_id?: number
          subscription_type: Database["public"]["Enums"]["subscription_type"]
          tokens_remaining?: number
          updated_at?: string | null
          user_id: number
        }
        Update: {
          canceled_at?: string | null
          created_at?: string | null
          expires_at?: string
          last_reset_at?: string
          monthly_tokens?: number
          price_paid?: number
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          subscription_id?: number
          subscription_type?: Database["public"]["Enums"]["subscription_type"]
          tokens_remaining?: number
          updated_at?: string | null
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      tab_context: {
        Row: {
          created_at: string
          current_page: string | null
          elements: Json | null
          tab_id: number
        }
        Insert: {
          created_at?: string
          current_page?: string | null
          elements?: Json | null
          tab_id?: number
        }
        Update: {
          created_at?: string
          current_page?: string | null
          elements?: Json | null
          tab_id?: number
        }
        Relationships: []
      }
      ticket_configs: {
        Row: {
          close_time: string
          currency: string | null
          description: string | null
          is_active: boolean | null
          open_time: string
          price: number | null
          quantity_limit: number | null
          sold_quantity: number | null
          ticket_id: number
          ticket_name: string
          ticket_type: string | null
        }
        Insert: {
          close_time: string
          currency?: string | null
          description?: string | null
          is_active?: boolean | null
          open_time: string
          price?: number | null
          quantity_limit?: number | null
          sold_quantity?: number | null
          ticket_id?: number
          ticket_name: string
          ticket_type?: string | null
        }
        Update: {
          close_time?: string
          currency?: string | null
          description?: string | null
          is_active?: boolean | null
          open_time?: string
          price?: number | null
          quantity_limit?: number | null
          sold_quantity?: number | null
          ticket_id?: number
          ticket_name?: string
          ticket_type?: string | null
        }
        Relationships: []
      }
      ticket_session: {
        Row: {
          price: number | null
          session_id: number
          ticket_id: number
        }
        Insert: {
          price?: number | null
          session_id: number
          ticket_id?: number
        }
        Update: {
          price?: number | null
          session_id?: number
          ticket_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "ticket_session_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "ticket_session_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "ticket_configs"
            referencedColumns: ["ticket_id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number | null
          created_at: string | null
          metadata: Json | null
          order_code: string | null
          order_type: Database["public"]["Enums"]["order_type"] | null
          payment_gateway: string | null
          provider_tx_ref: string | null
          registration_id: number | null
          status: Database["public"]["Enums"]["trans_type"] | null
          subscription_id: number | null
          trans_id: number
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          metadata?: Json | null
          order_code?: string | null
          order_type?: Database["public"]["Enums"]["order_type"] | null
          payment_gateway?: string | null
          provider_tx_ref?: string | null
          registration_id?: number | null
          status?: Database["public"]["Enums"]["trans_type"] | null
          subscription_id?: number | null
          trans_id?: number
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          metadata?: Json | null
          order_code?: string | null
          order_type?: Database["public"]["Enums"]["order_type"] | null
          payment_gateway?: string | null
          provider_tx_ref?: string | null
          registration_id?: number | null
          status?: Database["public"]["Enums"]["trans_type"] | null
          subscription_id?: number | null
          trans_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["registration_id"]
          },
          {
            foreignKeyName: "transactions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["subscription_id"]
          },
          {
            foreignKeyName: "transactions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscription_history"
            referencedColumns: ["subscription_id"]
          },
        ]
      }
      user_conference_roles: {
        Row: {
          conference_id: number
          created_at: string | null
          id: number
          role: string
          user_id: number
        }
        Insert: {
          conference_id: number
          created_at?: string | null
          id?: number
          role: string
          user_id: number
        }
        Update: {
          conference_id?: number
          created_at?: string | null
          id?: number
          role?: string
          user_id?: number
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          dynamic_content: string | null
          dynamic_title: string | null
          id: number
          is_read: boolean
          notification_id: number
          read_at: string | null
          user_id: number
        }
        Insert: {
          dynamic_content?: string | null
          dynamic_title?: string | null
          id?: number
          is_read?: boolean
          notification_id: number
          read_at?: string | null
          user_id: number
        }
        Update: {
          dynamic_content?: string | null
          dynamic_title?: string | null
          id?: number
          is_read?: boolean
          notification_id?: number
          read_at?: string | null
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["notification_id"]
          },
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          role_id: number
          user_id: string
        }
        Insert: {
          role_id: number
          user_id: string
        }
        Update: {
          role_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey_2"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["role_id"]
          },
        ]
      }
      user_roles_temp: {
        Row: {
          role_id: number
          user_id: number
        }
        Insert: {
          role_id: number
          user_id: number
        }
        Update: {
          role_id?: number
          user_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["role_id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          description: string | null
          description_embed: string | null
          email: string
          full_name: string
          organization: string | null
          password_hash: string
          user_id: number
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          description?: string | null
          description_embed?: string | null
          email: string
          full_name: string
          organization?: string | null
          password_hash: string
          user_id?: number
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          description?: string | null
          description_embed?: string | null
          email?: string
          full_name?: string
          organization?: string | null
          password_hash?: string
          user_id?: number
        }
        Relationships: []
      }
    }
    Views: {
      user_subscription_history: {
        Row: {
          amount: number | null
          expires_at: string | null
          last_reset_at: string | null
          metadata: Json | null
          monthly_tokens: number | null
          order_code: string | null
          paid_at: string | null
          payment_gateway: string | null
          payment_status: Database["public"]["Enums"]["trans_type"] | null
          price_paid: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["subscription_status"] | null
          subscription_id: number | null
          subscription_type:
            | Database["public"]["Enums"]["subscription_type"]
            | null
          tokens_remaining: number | null
          transaction_id: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_get_user_subscription: {
        Args: { p_user_id: number }
        Returns: {
          amount: number
          canceled_at: string
          expires_at: string
          is_active_and_valid: boolean
          is_canceled_but_still_valid: boolean
          is_expired: boolean
          is_valid: boolean
          last_reset_at: string
          monthly_tokens: number
          order_code: string
          paid_at: string
          payment_gateway: string
          plan_snapshot: Json
          price_paid: number
          started_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          subscription_id: number
          subscription_type: Database["public"]["Enums"]["subscription_type"]
          time_until_expiry: string
          tokens_left: number
          tokens_remaining: number
          transaction_id: number
        }[]
      }
      admin_upgrade_subscription: {
        Args: {
          p_current_subscription_id: number
          p_new_plan_code: string
          p_notes?: Json
          p_order_code?: string
          p_payment_gateway?: string
        }
        Returns: {
          amount_to_pay: number
          subscription_id: number
          transaction_id: number
        }[]
      }
      cancel_subscription: {
        Args: { p_subscription_id: number }
        Returns: undefined
      }
      exec_sql: { Args: { query: string }; Returns: Json }
      expire_outdated_invitations: { Args: never; Returns: undefined }
      get_chair_candidates: {
        Args: {
          p_limit?: number
          p_role_id?: number
          p_search_key?: string
          p_search_term?: string
        }
        Returns: {
          email: string
          full_name: string
          organization: string
          profile_id: string
          user_id: number
        }[]
      }
      get_chair_candidates_by_session: {
        Args: {
          p_limit?: number
          p_role_id?: number
          p_search_key?: string
          p_search_term?: string
          p_session_id?: number
        }
        Returns: {
          email: string
          full_name: string
          organization: string
          profile_id: string
          user_id: number
        }[]
      }
      get_conversation_memory: {
        Args: { max_messages?: number; start_message_id: number }
        Returns: {
          content: string
          created_at: string
          depth: number
          message_id: number
          parent_id: number
          role: string
        }[]
      }
      get_current_user_id: { Args: never; Returns: number }
      get_current_user_subscription: {
        Args: never
        Returns: {
          amount: number
          canceled_at: string
          expires_at: string
          is_active_and_valid: boolean
          is_canceled_but_still_valid: boolean
          is_expired: boolean
          is_valid: boolean
          last_reset_at: string
          monthly_tokens: number
          order_code: string
          paid_at: string
          payment_gateway: string
          plan_snapshot: Json
          price_paid: number
          started_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          subscription_id: number
          subscription_type: Database["public"]["Enums"]["subscription_type"]
          time_until_expiry: string
          tokens_left: number
          tokens_remaining: number
          transaction_id: number
        }[]
      }
      get_prorated_upgrade_amount: {
        Args: { p_current_subscription_id: number; p_new_plan_code: string }
        Returns: {
          amount_to_pay: number
          currency: string
          current_plan_type: Database["public"]["Enums"]["subscription_type"]
          current_subscription_id: number
          new_plan_code: string
          new_plan_name: string
          prorated_current_plan: number
          prorated_new_plan: number
          remaining_days: number
        }[]
      }
      get_user_roles: { Args: { p_user_id: string }; Returns: string[] }
      is_admin: { Args: never; Returns: boolean }
      match_all_chunks: {
        Args: {
          filter_paper_id?: number
          filter_version_id?: number
          match_count: number
          match_threshold: number
          query_embedding: string
        }
        Returns: {
          chunk_index: number
          content: string
          id: number
          metadata: Json
          paper_id: number
          similarity: number
          version_id: number
        }[]
      }
      match_chair_candidates: {
        Args: {
          excluded_user_ids: number[]
          match_count: number
          match_threshold: number
          query_embedding: string
        }
        Returns: {
          email: string
          full_name: string
          match_score: number
          organization: string
          similarity: string
          user_id: number
        }[]
      }
      match_paper_chunks: {
        Args: {
          filter_paper_id?: number
          filter_version_id?: number
          match_count: number
          match_threshold: number
          query_embedding: string
        }
        Returns: {
          chunk_index: number
          content: string
          id: number
          metadata: Json
          similarity: number
        }[]
      }
      match_reviewers: {
        Args: {
          match_count: number
          match_threshold: number
          query_embedding: string
          required_role_id: number
        }
        Returns: {
          email: string
          full_name: string
          organization: string
          similarity: number
          user_id: number
        }[]
      }
      match_reviewers_avg_chunk: {
        Args: {
          match_count: number
          required_role_id: number
          target_paper_id: number
        }
        Returns: {
          avg_similarity: number
          email: string
          full_name: string
          organization: string
          user_id: number
        }[]
      }
      reset_subscription_tokens: { Args: never; Returns: undefined }
      upgrade_subscription: {
        Args: {
          p_current_subscription_id: number
          p_new_plan_code: string
          p_order_code: string
          p_payment_gateway: string
        }
        Returns: {
          amount_to_pay: number
          subscription_id: number
          transaction_id: number
        }[]
      }
    }
    Enums: {
      invitation_status: "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED"
      order_type: "REGISTRATION" | "SUBSCRIPTION"
      subscription_status: "PENDING" | "ACTIVE" | "CANCELED" | "EXPIRED"
      subscription_type: "1_MONTH" | "3_MONTH" | "1_YEAR"
      trans_type: "PENDING" | "COMPLETED" | "CANCELED"
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
      invitation_status: ["PENDING", "ACCEPTED", "REJECTED", "EXPIRED"],
      order_type: ["REGISTRATION", "SUBSCRIPTION"],
      subscription_status: ["PENDING", "ACTIVE", "CANCELED", "EXPIRED"],
      subscription_type: ["1_MONTH", "3_MONTH", "1_YEAR"],
      trans_type: ["PENDING", "COMPLETED", "CANCELED"],
    },
  },
} as const
