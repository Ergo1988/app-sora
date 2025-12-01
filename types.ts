export interface ProcessingState {
  status: 'idle' | 'analyzing' | 'generating' | 'completed' | 'error';
  progress?: number;
  message?: string;
  error?: string;
}

export interface GeneratedVideo {
  url: string;
  expiresAt: number;
}