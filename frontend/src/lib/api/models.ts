import apiClient from './client'
import { Model, ModelDefaults } from '@/lib/types/models'

export const modelsApi = {
  list: async () => {
    const response = await apiClient.get<Model[]>('/models')
    return response.data
  },

  get: async (id: string) => {
    const response = await apiClient.get<Model>(`/models/${id}`)
    return response.data
  },

  getDefaults: async () => {
    const response = await apiClient.get<ModelDefaults>('/models/defaults')
    return response.data
  },

}
