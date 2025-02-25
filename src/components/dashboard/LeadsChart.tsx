
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Mapa de cores fixas para origens específicas
const sourceColors: Record<string, string> = {
  facebook: "#3b5998", // Azul do Facebook
  instagram: "#e1306c", // Rosa do Instagram
  indicacao: "#F97316", // Laranja para Indicação
};

// Função para gerar uma cor HSL aleatória para outras origens
const getColorForSource = (source: string, index: number) => {
  if (source.toLowerCase() in sourceColors) {
    return sourceColors[source.toLowerCase()];
  }
  return `hsl(${index * 50}, 70%, 50%)`;
};

export function LeadsChart() {
  const { data, isLoading } = useQuery({
    queryKey: ['leads-by-month-and-source'],
    queryFn: async () => {
      const now = new Date();
      const sixMonthsAgo = subMonths(now, 6);

      // Buscar leads dos últimos 6 meses
      const { data: leads, error } = await supabase
        .from('clients')
        .select('created_at, lead_source')
        .eq('active', true)
        .gte('created_at', sixMonthsAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Agrupar leads por mês e origem
      const leadsByMonth = leads?.reduce((acc: any, lead) => {
        const date = new Date(lead.created_at);
        const monthKey = format(date, 'MMM/yy', { locale: ptBR });
        
        if (!acc[monthKey]) {
          acc[monthKey] = {};
        }
        
        const source = lead.lead_source || 'outros';
        acc[monthKey][source] = (acc[monthKey][source] || 0) + 1;
        acc[monthKey].month = monthKey;
        
        return acc;
      }, {});

      // Converter para array e formatar para o Recharts
      const chartData = Object.values(leadsByMonth || {});
      
      // Obter todas as origens únicas para criar as barras empilhadas
      const allSources = Array.from(
        new Set(
          leads?.map(lead => lead.lead_source || 'outros') || []
        )
      );

      return {
        data: chartData,
        sources: allSources
      };
    },
    staleTime: 60 * 60 * 1000, // 1 hora
    refetchOnWindowFocus: false
  });

  if (isLoading) {
    return (
      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Novos Leads por Mês</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          Carregando...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Novos Leads por Mês</CardTitle>
      </CardHeader>
      <CardContent className="pl-2">
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data?.data}>
            <XAxis
              dataKey="month"
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}`}
            />
            <Tooltip />
            <Legend />
            {data?.sources.map((source, index) => (
              <Bar
                key={source}
                dataKey={source}
                name={source.charAt(0).toUpperCase() + source.slice(1)}
                stackId="a"
                fill={getColorForSource(source, index)}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
