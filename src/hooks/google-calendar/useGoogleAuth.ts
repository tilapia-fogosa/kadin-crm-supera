
import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AuthWindowMessage } from './types';

export function useGoogleAuth(onAuthSuccess: () => Promise<void>) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [authWindow, setAuthWindow] = useState<Window | null>(null);
  const { toast } = useToast();

  const validateSession = async (): Promise<boolean> => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.access_token) {
      console.error('[GoogleCalendar] Erro de sessão:', error);
      return false;
    }
    return true;
  };

  const startGoogleAuth = async () => {
    try {
      setIsConnecting(true);
      
      console.log('[GoogleCalendar] Iniciando autenticação');

      const isSessionValid = await validateSession();
      if (!isSessionValid) {
        throw new Error('Usuário não autenticado');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Token de acesso não disponível');
      }

      console.log('[GoogleCalendar] Sessão válida, obtendo URL de autenticação');

      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: { path: 'init' },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('[GoogleCalendar] Erro ao obter URL:', error);
        throw error;
      }

      console.log('[GoogleCalendar] URL de autenticação recebida:', data.url);

      const width = 600;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        data.url,
        'Google Calendar Auth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (popup) {
        console.log('[GoogleCalendar] Popup aberto com sucesso');
        setAuthWindow(popup);
      } else {
        console.error('[GoogleCalendar] Popup bloqueado pelo navegador');
        throw new Error('Popup bloqueado pelo navegador');
      }

    } catch (error) {
      console.error('[GoogleCalendar] Erro ao iniciar autenticação:', error);
      toast({
        title: "Erro na conexão",
        description: "Não foi possível conectar com o Google Calendar. Verifique se os popups estão permitidos.",
        variant: "destructive"
      });
      setIsConnecting(false);
    }
  };

  const handleAuthCallback = async (code: string): Promise<boolean> => {
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 1000; // 1 segundo

    const attemptCallback = async (): Promise<boolean> => {
      try {
        console.log('[GoogleCalendar] Tentativa', retryCount + 1, 'de processar callback');

        const isSessionValid = await validateSession();
        if (!isSessionValid) {
          throw new Error('Sessão inválida');
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('No session token available');

        const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
          body: { 
            path: 'callback',
            code 
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });

        if (error) throw error;

        console.log('[GoogleCalendar] Autenticação completada com sucesso');
        toast({
          title: "Conexão realizada",
          description: "Google Calendar conectado com sucesso!",
        });

        // Pequeno delay antes de chamar onAuthSuccess para garantir que tudo está sincronizado
        await new Promise(resolve => setTimeout(resolve, 500));
        await onAuthSuccess();

        return true;
      } catch (error) {
        console.error('[GoogleCalendar] Erro ao processar callback:', error);
        
        if (retryCount < maxRetries) {
          retryCount++;
          console.log(`[GoogleCalendar] Tentando novamente em ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return attemptCallback();
        }

        toast({
          title: "Erro na conexão",
          description: "Não foi possível completar a conexão com o Google Calendar",
          variant: "destructive"
        });
        return false;
      }
    };

    try {
      return await attemptCallback();
    } finally {
      setIsConnecting(false);
      if (authWindow) {
        authWindow.close();
        setAuthWindow(null);
      }
    }
  };

  return {
    isConnecting,
    authWindow,
    setAuthWindow,
    startGoogleAuth,
    handleAuthCallback
  };
}

