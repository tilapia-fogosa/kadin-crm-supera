
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useCalendarActions() {
  const { toast } = useToast();

  const syncCalendars = async () => {
    try {
      console.log('Iniciando sincronização dos calendários');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No session token available');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error('User ID not found');
      
      const { data: settings } = await supabase
        .from('user_calendar_settings')
        .select('selected_calendars, sync_token')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!settings) {
        throw new Error('Calendar settings not found');
      }

      const { data: response, error } = await supabase.functions.invoke('google-calendar-manage', {
        body: { 
          path: 'sync-events',
          calendars: settings?.selected_calendars || [],
          syncToken: settings?.sync_token
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Error syncing calendars:', error);
        if (error.message.includes('token')) {
          toast({
            title: "Erro de autenticação",
            description: "Por favor, reconecte sua conta do Google Calendar",
            variant: "destructive"
          });
        }
        throw error;
      }

      await supabase
        .from('user_calendar_settings')
        .update({ 
          sync_token: response.nextSyncToken,
          last_sync: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
      
      toast({
        title: "Sincronização concluída",
        description: "Calendários atualizados com sucesso!",
      });

      return response.events;
    } catch (error) {
      console.error('Erro ao sincronizar calendários:', error);
      toast({
        title: "Erro na sincronização",
        description: "Não foi possível sincronizar os calendários",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateSelectedCalendars = async (calendarIds: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error('User ID not found');

      const { error } = await supabase
        .from('user_calendar_settings')
        .update({ 
          selected_calendars: calendarIds,
          sync_token: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Calendários atualizados",
        description: "Suas preferências foram salvas com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao atualizar calendários:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível atualizar suas preferências",
        variant: "destructive"
      });
    }
  };

  const setDefaultCalendar = async (calendarId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error('User ID not found');

      const { error } = await supabase
        .from('user_calendar_settings')
        .update({ 
          default_calendar_id: calendarId,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Calendário padrão atualizado",
        description: "Suas preferências foram salvas com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao definir calendário padrão:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível definir o calendário padrão",
        variant: "destructive"
      });
    }
  };

  const disconnectCalendar = async () => {
    try {
      console.log('Iniciando processo de desconexão do Google Calendar');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No session token available');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error('User ID not found');

      // 1. Primeiro revoga o acesso no Google
      console.log('Revogando acesso no Google');
      const { error: revokeError } = await supabase.functions.invoke('google-calendar-manage', {
        body: { path: 'revoke-access' },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (revokeError) {
        console.error('Error revoking access:', revokeError);
      }

      // 2. Deleta todos os eventos do calendário
      console.log('Deletando eventos do calendário');
      const { error: eventsError } = await supabase
        .from('calendar_events')
        .delete()
        .eq('user_id', user.id);

      if (eventsError) {
        console.error('Error deleting calendar events:', eventsError);
      }

      // 3. Deleta as configurações do usuário
      console.log('Deletando configurações do calendário');
      const { error: settingsError } = await supabase
        .from('user_calendar_settings')
        .delete()
        .eq('user_id', user.id);

      if (settingsError) {
        console.error('Error deleting calendar settings:', settingsError);
        throw settingsError;
      }

      toast({
        title: "Conta desconectada",
        description: "Sua conta do Google Calendar foi completamente desconectada",
      });
    } catch (error) {
      console.error('Erro ao desconectar conta:', error);
      toast({
        title: "Erro ao desconectar",
        description: "Não foi possível desconectar sua conta completamente",
        variant: "destructive"
      });
    }
  };

  return {
    syncCalendars,
    updateSelectedCalendars,
    setDefaultCalendar,
    disconnectCalendar
  };
}
