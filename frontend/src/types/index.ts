export interface AuthResponse {
  token: string;
  username: string;
  role: string;
}

export interface DiaryEntry {
  id: number;
  title: string;
  content: string;
  isPublic: boolean;
  authorUsername: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiaryEntryRequest {
  title: string;
  content: string;
  isPublic: boolean;
}

export interface ShareRequest {
  platform: 'twitter' | 'linkedin' | 'facebook';
  message?: string;
}

export interface ShareResponse {
  id: number;
  entryId: number;
  platform: string;
  sharedAt: string;
  postUrl: string;
  message: string;
}

export interface SocialConnection {
  id: number;
  platform: string;
  platformUserId: string;
  connectedAt: string;
}

export interface ApiError {
  status: number;
  message: string;
  timestamp: string;
}
