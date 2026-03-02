import React from "react";
import PlaceholderModule from "@/components/shared/PlaceholderModule";
import { TrendingUp } from "lucide-react";

export default function Performance() {
  return (
    <PlaceholderModule
      title="Rendimiento"
      icon={TrendingUp}
      description="Gráficos de rendimiento, métricas históricas y análisis comparativo con el mercado."
    />
  );
}