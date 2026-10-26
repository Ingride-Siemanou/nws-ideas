export type Category = 'Vie étudiante' | 'Équipements' | 'Pédagogie' | 'Événements' | 'Autres'
export type IdeaStatus = 'Proposée' | 'À l’étude' | 'Acceptée' | 'Refusée' | 'Réalisée'
export type Idea = {
  id: string
  title: string
  description: string
  category: Category
  status: IdeaStatus
  image_url: string | null
  created_at: string
  author_id: string
  votes_count: number
  has_voted: boolean
}
export const categories: Category[] = ['Vie étudiante', 'Équipements', 'Pédagogie', 'Événements', 'Autres']
export const statuses: IdeaStatus[] = ['Proposée', 'À l’étude', 'Acceptée', 'Refusée', 'Réalisée']
