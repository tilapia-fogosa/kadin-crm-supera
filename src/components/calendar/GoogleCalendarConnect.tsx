
import { Button } from "@/components/ui/button";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { 
  Calendar, 
  Loader2, 
  RefreshCw, 
  Settings,
  CheckCircle2,
  XCircle 
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";

export function GoogleCalendarConnect() {
  const { 
    isConnecting,
    isLoading,
    settings,
    calendars,
    startGoogleAuth,
    syncCalendars,
    updateSelectedCalendars
  } = useGoogleCalendar();

  const [isSyncing, setIsSyncing] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    await syncCalendars();
    setIsSyncing(false);
  };

  const handleCalendarToggle = async (calendarId: string) => {
    const currentSelected = settings?.selected_calendars || [];
    let newSelected: string[];

    if (currentSelected.includes(calendarId)) {
      newSelected = currentSelected.filter(id => id !== calendarId);
    } else {
      newSelected = [...currentSelected, calendarId];
    }

    await updateSelectedCalendars(newSelected);
  };

  if (isLoading) {
    return (
      <Button variant="outline" disabled className="gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando...
      </Button>
    );
  }

  if (!settings?.google_account_email) {
    return (
      <Button 
        variant="outline" 
        className="gap-2" 
        onClick={startGoogleAuth}
        disabled={isConnecting}
      >
        {isConnecting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Conectando...
          </>
        ) : (
          <>
            <Calendar className="h-4 w-4" />
            Conectar Google Calendar
          </>
        )}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="outline"
              size="icon"
              onClick={handleSync}
              disabled={isSyncing}
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Sincronizar calendários agora</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Configurações do Google Calendar</SheetTitle>
            <SheetDescription>
              Gerencie sua conexão com o Google Calendar e escolha quais calendários deseja sincronizar.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <div className="space-y-2">
              <h4 className="font-medium">Conta conectada</h4>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                {settings.google_account_email}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Última sincronização</h4>
              <div className="text-sm text-muted-foreground">
                {settings.last_sync ? (
                  format(new Date(settings.last_sync), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })
                ) : (
                  "Nunca sincronizado"
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Calendários disponíveis</h4>
              <ScrollArea className="h-[300px] rounded-md border p-4">
                <div className="space-y-4">
                  {calendars?.map((calendar) => (
                    <div key={calendar.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: calendar.backgroundColor }}
                        />
                        <span className="text-sm">{calendar.summary}</span>
                      </div>
                      <Switch
                        checked={settings.selected_calendars.includes(calendar.id)}
                        onCheckedChange={() => handleCalendarToggle(calendar.id)}
                      />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="pt-4">
              <Button 
                variant="outline" 
                className="w-full gap-2 text-destructive" 
                onClick={startGoogleAuth}
              >
                <XCircle className="h-4 w-4" />
                Desconectar conta
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
