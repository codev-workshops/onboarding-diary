import apiClient from './client';
import type { ShareRequest, ShareResponse, SocialConnection } from '../types';

export async function shareEntry(entryId: number, request: ShareRequest): Promise<ShareResponse> {
  const { data } = await apiClient.post<ShareResponse>(`/entries/${entryId}/share`, request);
  return data;
}

export async function getSocialConnections(): Promise<SocialConnection[]> {
  const { data } = await apiClient.get<SocialConnection[]>('/auth/social/connections');
  return data;
}

export async function disconnectPlatform(platform: string): Promise<void> {
  await apiClient.delete(`/auth/social/connections/${platform}`);
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export function getConnectUrl(platform: string): string {
  const token = localStorage.getItem('token');
  return `${API_BASE_URL}/api/v1/auth/social/${platform}/connect?token=${token}`;
}
