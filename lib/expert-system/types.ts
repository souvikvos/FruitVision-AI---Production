export interface FruitData {
  color: string[];
  shape: string[];
  texture: string[];
  taste: string[];
  size: string[];
  seeds: string[];
  water_content: string[];
  category: string[];
  season: string[];
  aroma: string[];
  nutrition: string[];
  keywords: string[];
}

export type FruitRules = Record<string, FruitData>;

export type RecommendationRules = Record<string, string>;

export interface TopMatch {
  fruit: string;
  score: number;
}

export interface DetectionResult {
  fruit: string | null;
  confidence: number;
  score: number;
  topMatches: TopMatch[];
  recommendation: string | null;
}
