import React from "react";
import PlaceholderModule from "@/components/shared/PlaceholderModule";
import { Bell } from "lucide-react";

export default function Alerts() {
  return (
    <PlaceholderModule
      title="Alertas"
      icon={Bell}
      description="Notificaciones de movimientos importantes, metas alcanzadas y eventos del mercado."
    />
  );
}