
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUnits } from "@/hooks/useUnits";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserDialog({ open, onOpenChange }: UserDialogProps) {
  const [email, setEmail] = useState("");
  const [unitId, setUnitId] = useState("");
  const { data: units } = useUnits();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // First, try to get the user's session data
    const { data: sessionData } = await supabase.auth.getUser(email);
    
    // If no user is found, show error
    if (!sessionData?.user) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Usuário não encontrado.",
      });
      return;
    }

    // Add user-unit relationship
    const { error: linkError } = await supabase
      .from('unit_users')
      .insert({
        user_id: sessionData.user.id,
        unit_id: unitId,
      });

    if (linkError) {
      // Check if it's a unique constraint violation
      if (linkError.code === '23505') {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Este usuário já está vinculado a esta unidade.",
        });
        return;
      }

      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível vincular o usuário à unidade.",
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: "Usuário adicionado com sucesso.",
    });

    queryClient.invalidateQueries({ queryKey: ['unit-users'] });
    setEmail("");
    setUnitId("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Usuário</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email do Usuário</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit">Unidade</Label>
            <Select value={unitId} onValueChange={setUnitId} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma unidade" />
              </SelectTrigger>
              <SelectContent>
                {units?.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end">
            <Button type="submit">Adicionar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
