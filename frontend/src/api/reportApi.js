import api from './axiosConfig';

export const generateReport = (params) =>
  api.get('/reports', { params, responseType: 'blob' });
