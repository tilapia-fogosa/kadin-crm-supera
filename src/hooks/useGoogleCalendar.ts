
import { useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AuthWindowMessage {
  type: 'google-auth-success' | 'google-auth-error';
  code?: string;
  error?: string;
}

export function useGoogleCalendar() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [authWindow, setAuthWindow] = useState<Window | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Listener para mensagens do popup
    const handleMessage = async (event: MessageEvent<AuthWindowMessage>) => {
      // Verificar origem da mensagem (na produção, usar origem específica)
      if (event.data?.type === 'google-auth-success' && event.data.code) {
        await handleAuthCallback(event.data.code);
      } else if (event.data?.type === 'google-auth-error') {
        console.error('Erro na autenticação:', event.data.error);
        toast({
          title: "Erro na conexão",
          description: "Não foi possível conectar com o Google Calendar",
          variant: "destructive"
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    // Monitorar fechamento do popup
    if (authWindow) {
      const checkWindow = setInterval(() => {
        if (authWindow.closed) {
          setAuthWindow(null);
          setIsConnecting(false);
          clearInterval(checkWindow);
        }
      }, 500);

      return () => clearInterval(checkWindow);
    }
  }, [authWindow]);

  const startGoogleAuth = async () => {
    try {
      setIsConnecting(true);
      
      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: { path: 'init' }
      });

      if (error) throw error;

      // Configurações da janela de popup
      const width = 600;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      // Abrir popup centralizado
      const popup = window.open(
        data.url,
        'Google Calendar Auth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (popup) {
        setAuthWindow(popup);
      } else {
        throw new Error('Popup bloqueado pelo navegador');
      }

    } catch (error) {
      console.error('Erro ao iniciar autenticação:', error);
      toast({
        title: "Erro na conexão",
        description: "Não foi possível conectar com o Google Calendar. Verifique se os popups estão permitidos.",
        variant: "destructive"
      });
      setIsConnecting(false);
    }
  };

  const handleAuthCallback = async (code: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: { 
          path: 'callback',
          code 
        }
      });

      if (error) throw error;

      toast({
        title: "Conexão realizada",
        description: "Google Calendar conectado com sucesso!",
      });

      return true;
    } catch (error) {
      console.error('Erro ao processar callback:', error);
      toast({
        title: "Erro na conexão",
        description: "Não foi possível completar a conexão com o Google Calendar",
        variant: "destructive"
      });
      return false;
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
    startGoogleAuth,
    handleAuthCallback
  };
}
