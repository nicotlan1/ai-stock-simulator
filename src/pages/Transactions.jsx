import React from "react";
import PlaceholderModule from "@/components/shared/PlaceholderModule";
import { List } from "lucide-react";

export default function Transactions() {
  return (
    <PlaceholderModule
      title="Transacciones"
      icon={List}
      description="Historial completo de todas las operaciones de compra y venta realizadas."
    />
  );
}