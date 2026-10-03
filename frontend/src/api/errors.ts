import axios from 'axios';
import type { FieldError, ProblemDetail } from './types';

export function getErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError<ProblemDetail>(error)) {
    if (!error.response) {
      return 'Unable to reach the server. Check your connection.';
    }
    return error.response.data?.detail ?? fallback;
  }
  return fallback;
}

export function getFieldErrors(error: unknown): FieldError[] {
  if (axios.isAxiosError<ProblemDetail>(error)) {
    return error.response?.data?.errors ?? [];
  }
  return [];
}
