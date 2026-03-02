import React from "react";
import PlaceholderModule from "@/components/shared/PlaceholderModule";
import { Bot } from "lucide-react";

export default function AILog() {
  return (
    <PlaceholderModule
      title="Decisiones IA"
      icon={Bot}
      description="Registro detallado de cada compra y venta con la lógica y razonamiento de la IA."
    />
  );
}