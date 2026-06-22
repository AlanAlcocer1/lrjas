export interface PredictionRecord {
  id: string;
  participantCode: string;
  participantName: string;
  mexicoScore: number;
  czechScore: number;
  mexicoScorers: string[];
  czechScorers: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PredictionsFile {
  predictions: PredictionRecord[];
}
