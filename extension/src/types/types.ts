/**
 * Types partagés pour l'application TextOrigin AI.
 * Définissent les modèles de données utilisés par tous les modules.
 *
 * Les catégories de détection correspondent à la section 216 du cahier des charges :
 * - lexical-marker : termes/phrases caractéristiques
 * - discourse-structure : structures de phrase génériques
 * - transition : connecteurs excessifs
 * - style-regularity : régularité de style/longueur de phrase
 * - anomaly : formulations inhabituelles
 *
 * Les types de détecteurs correspondent aux modules 1-4 du cahier des charges.
 */
// Categories of markers detected in text, as defined in the spec (section 216).
// Each value is a category label used to classify a detection.
// Categories are matched case-sensitively against the spec list.
export type DetectionCategory =
  | "lexical-marker"
  | "discourse-structure"
  | "transition"
  | "style-regularity"
  | "anomaly";

export type DetectionType =
  | "lexical"
  | "structural"
  | "connector"
  | "stylistic";

/**
 * Une détection élémentaire - format normalisé (section 10 du cahier des charges)
 * Chaque détection contient :
 * - type : type de détecteur (lexical, structural, etc.)
 * - category : catégorie de marqueur (lexical-marker, transition, etc.)
 * - text : le segment de texte signalé
 * - start/end : indices de début et fin dans le texte original
 * - score : note de 0 à 100 attribuée par le détecteur
 * - confidence : niveau de confiance (0 à 1)
 * - explanation : explication lisible pour l'utilisateur
 * - suggestions : suggestions de reformulation
 */
export interface Detection {
  id: string;
  type: DetectionType;
  category: DetectionCategory;
  text: string;
  start: number;
  end: number;
  score: number;
  confidence: number;
  explanation: string;
  suggestions: Suggestion[];
}

/**
 * Une suggestion de modification
 * - type : 'replace' | 'remove' | 'rewrite' | 'custom'
 * - text : texte substitut (vide pour 'remove')
 * - reason : raison de la suggestion
 */
export interface Suggestion {
  type: string;
  text: string;
  reason: string;
}

/**
 * Résultat agrégé d'une analyse complète (document entier)
 * - totalScore : score global de 0 à 100 (AI Marker Score)
 * - confidence : niveau de confiance global (low/medium/high)
 * - markerCount : nombre total de marqueurs détectés
 * - categories : dénombrement par catégorie de marqueur
 * - detections : liste de toutes les détections trouvées
 * - segments : analyse par segment (pour documents longs)
 */
export interface AnalysisResult {
  totalScore: number;
  confidence: string; // 'low' | 'medium' | 'high'
  markerCount: number;
  categories: Record<DetectionCategory, number>;
  detections: Detection[];
  segments?: Array<{
    index: number;
    total: number;
    score: number;
  }>;
}

/**
 * Interface de base pour tous les détecteurs
 * - id : identifiant unique du détecteur
 * - name : nom lisible du détecteur
 * - detect : méthode principale qui retourne les détections trouvées
 */
export interface Detector {
  readonly id: string;
  readonly name: string;
  detect(text: string): Promise<Detection[]>;
}