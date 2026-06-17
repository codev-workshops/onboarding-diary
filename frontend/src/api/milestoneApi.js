import apiClient from './axiosConfig';

export const getMilestones = (recruitId) =>
  apiClient.get(`/recruits/${recruitId}/milestones`);

export const createMilestone = (recruitId, data) =>
  apiClient.post(`/recruits/${recruitId}/milestones`, data);
