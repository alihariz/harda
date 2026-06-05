// Shared types mirroring the HARDA backend's response shapes.

export type UserRole = 'user' | 'crew' | 'admin';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

export interface User {
  user_id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  role: UserRole;
  team_id: number | null;
  is_active: boolean;
}

export interface Team {
  team_id: number;
  team_name: string;
  region?: string;
  description?: string;
  is_active: boolean;
}

export interface HazardType {
  hazard_type_id: number;
  type_name: 'pothole' | 'faded_lane_marking' | 'uneven_surface' | string;
  description?: string;
  default_severity?: number;
}

export interface HazardStatus {
  status_id: number;
  status_name: 'submitted' | 'verified' | 'in_progress' | 'resolved' | 'rejected';
  description?: string;
}

export interface Location {
  location_id?: number;
  latitude: number;
  longitude: number;
  address_name?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  accuracy?: number;
}

export interface HazardImage {
  image_id: number;
  report_id: number;
  file_path: string;
  file_name: string;
  is_primary: boolean;
  is_resolution_photo: boolean;
  uploaded_by_user_id?: number | null;
  upload_date?: string;
}

export interface HazardReport {
  report_id: number;
  user_id: number | null;
  location: Location | null;
  hazard_type: HazardType | null;
  status: HazardStatus | null;
  admin_id?: number | null;
  assigned_team_id: number | null;
  assigned_team?: Team | null;
  assigned_at?: string | null;
  title: string;
  description?: string;
  severity_score?: number;
  report_date?: string;
  validation_date?: string | null;
  resolution_date?: string | null;
  is_public: boolean;
  images?: HazardImage[];
  before_image?: HazardImage | null;
  after_image?: HazardImage | null;
}

export interface Detection {
  low_confidence: boolean;
  hazard_type?: string;
  confidence?: number;
  severity_score?: number;
  bounding_boxes?: number[][];
  detections?: Array<{
    hazard_type: string;
    raw_label: string;
    confidence: number;
    bounding_box: number[];
  }>;
  inference_ms?: number;
  model_path?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}
