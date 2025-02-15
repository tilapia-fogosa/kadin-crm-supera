
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SystemUserWithUnits } from "@/types/system-user";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  units: z.array(z.object({
    unit_id: z.string().min(1, "Unidade é obrigatória"),
    role: z.enum(["admin", "franqueador", "franqueado", "consultor"], {
      required_error: "Perfil é obrigatório",
    }),
  })).min(1, "Pelo menos uma unidade deve ser selecionada"),
});

interface SystemUserFormProps {
  user?: SystemUserWithUnits;
  onSubmit: (data: SystemUserWithUnits) => void;
}

export function SystemUserForm({ user, onSubmit }: SystemUserFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: user ? {
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      units: user.units.map(u => ({
        unit_id: u.unit_id,
        role: u.role,
      })),
    } : {
      name: "",
      email: "",
      phone: "",
      units: [{ unit_id: "", role: "consultor" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "units",
  });

  const { data: units } = useQuery({
    queryKey: ["units"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("*")
        .eq('active', true)
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async (data: z.infer<typeof formSchema>) => {
    const formattedData = {
      ...data,
      id: user?.id,
      created_at: user?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      active: true,
      units: data.units.map(unit => ({
        ...unit,
        id: "",
        user_id: user?.id || "",
        active: true,
      })),
    } as SystemUserWithUnits;

    onSubmit(formattedData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefone</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Unidades</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ unit_id: "", role: "consultor" })}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Unidade
            </Button>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-4 items-start">
              <FormField
                control={form.control}
                name={`units.${index}.unit_id`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Unidade</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma unidade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent position="popper" className="z-[60]">
                        {units?.map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`units.${index}.role`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Perfil</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um perfil" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent position="popper" className="z-[60]">
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="franqueador">Franqueador</SelectItem>
                        <SelectItem value="franqueado">Franqueado</SelectItem>
                        <SelectItem value="consultor">Consultor</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mt-8"
                  onClick={() => remove(index)}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-4">
          <Button type="submit">
            {user ? "Salvar Alterações" : "Criar Usuário"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
