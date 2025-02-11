
import { useToast } from "@/hooks/use-toast"
import { useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { ContactAttempt, EffectiveContact } from "../types"

export function useActivityOperations() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const registerAttempt = async (attempt: ContactAttempt) => {
    try {
      console.log("Registering attempt:", attempt)
      
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) throw new Error('Not authenticated')

      const { error: activityError } = await supabase
        .from('client_activities')
        .insert({
          client_id: attempt.cardId,
          tipo_contato: attempt.type,
          tipo_atividade: 'Tentativa de Contato',
          created_by: session.session.user.id,
          is_deleted: false
        })

      if (activityError) throw activityError

      await queryClient.invalidateQueries({ queryKey: ['clients'] })

      toast({
        title: "Tentativa registrada",
        description: "A atividade foi registrada com sucesso",
      })
    } catch (error) {
      console.error('Error registering attempt:', error)
      toast({
        variant: "destructive",
        title: "Erro ao registrar tentativa",
        description: "Ocorreu um erro ao tentar registrar a tentativa de contato.",
      })
    }
  }

  const registerEffectiveContact = async (contact: EffectiveContact) => {
    try {
      console.log("Registering effective contact:", contact)
      
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) throw new Error('Not authenticated')

      const { error: activityError } = await supabase
        .from('client_activities')
        .insert({
          client_id: contact.cardId,
          tipo_contato: contact.type,
          tipo_atividade: 'Contato Efetivo',
          notes: contact.notes,
          created_by: session.session.user.id,
          is_deleted: false
        })

      if (activityError) throw activityError

      const { error: clientError } = await supabase
        .from('clients')
        .update({ observations: contact.observations })
        .eq('id', contact.cardId)

      if (clientError) throw clientError

      await queryClient.invalidateQueries({ queryKey: ['clients'] })

      toast({
        title: "Contato efetivo registrado",
        description: "A atividade foi registrada com sucesso",
      })
    } catch (error) {
      console.error('Error registering effective contact:', error)
      toast({
        variant: "destructive",
        title: "Erro ao registrar contato efetivo",
        description: "Ocorreu um erro ao tentar registrar o contato efetivo.",
      })
    }
  }

  const deleteActivity = async (activityId: string, clientId: string) => {
    try {
      console.log('Deleting activity:', { activityId, clientId })
      
      const { data: session } = await supabase.auth.getSession()
      if (!session.session) throw new Error('Not authenticated')

      const { data: activityData, error: fetchError } = await supabase
        .from('client_activities')
        .select('*')
        .eq('id', activityId)
        .single()

      if (fetchError) {
        console.error('Error fetching activity:', fetchError)
        throw fetchError
      }
      if (!activityData) {
        console.error('Activity not found')
        throw new Error('Activity not found')
      }

      console.log('Activity data before deletion:', activityData)

      const { error: updateError } = await supabase
        .from('client_activities')
        .update({ 
          is_deleted: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', activityId)

      if (updateError) {
        console.error('Error updating activity:', updateError)
        throw updateError
      }

      console.log('Activity marked as deleted')

      const { error: insertError } = await supabase
        .from('deleted_activities')
        .insert({
          client_activity_id: activityData.id,
          client_id: activityData.client_id,
          tipo_atividade: activityData.tipo_atividade,
          tipo_contato: activityData.tipo_contato,
          notes: activityData.notes,
          next_contact_date: activityData.next_contact_date,
          original_created_at: activityData.created_at,
          original_created_by: activityData.created_by,
          deleted_by: session.session.user.id
        })

      if (insertError) {
        console.error('Error inserting deleted activity:', insertError)
        throw insertError
      }

      console.log('Audit record created')

      await queryClient.invalidateQueries({ queryKey: ['clients'] })

      toast({
        title: "Atividade excluída",
        description: "A atividade foi excluída com sucesso",
      })
    } catch (error) {
      console.error('Error in handleDeleteActivity:', error)
      toast({
        variant: "destructive",
        title: "Erro ao excluir atividade",
        description: "Ocorreu um erro ao tentar excluir a atividade.",
      })
    }
  }

  return {
    registerAttempt,
    registerEffectiveContact,
    deleteActivity
  }
}
