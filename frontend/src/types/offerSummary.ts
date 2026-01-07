export interface OfferSummary {
  offer_id: number;
  offer_title: string;
  offer_type: string;
  offer_department: string;
  offer_project?: string;
  deadline: string;
  application_count: number;
  status: 'actif' | 'sous_evaluation' | 'resultat' | 'infructueux';
  winner_name?: string | null;
}
