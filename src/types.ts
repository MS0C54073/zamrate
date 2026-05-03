export interface Company {
  id: string;
  name: string;
  category: string;
  description: string | null;
  services: string | null;
  location: string | null;
  website: string | null;
  phone: string | null;
}

export interface CommentRow {
  id: string;
  company_id: string;
  parent_comment_id: string | null;
  comment_text: string;
  created_at: string;
  anonymous_user_id: string;
}
