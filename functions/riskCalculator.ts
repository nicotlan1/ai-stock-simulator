// Función auxiliar para calcular perfil de riesgo (reutilizable)
// Se usa en Setup, SendToAIModal y otros componentes que necesiten recalcular el perfil

export function calcRiskProfile(monthlyReturnPct) {
  if (monthlyReturnPct < 5)  return { level: "conservative",   name: "Conservador",    prob: 65, color: "#3b82f6", desc: "La IA operará con posiciones pequeñas, stop-loss ajustado y priorizará preservar el capital." };
  if (monthlyReturnPct < 15) return { level: "moderate",       name: "Moderado",       prob: 35, color: "#fbbf24", desc: "La IA balanceará riesgo y retorno, abriendo posiciones medianas con análisis técnico y fundamental." };
  if (monthlyReturnPct < 30) return { level: "aggressive",     name: "Agresivo",       prob: 12, color: "#ff4757", desc: "La IA tomará posiciones más grandes y frecuentes buscando rendimientos altos con mayor volatilidad." };
  return                      { level: "ultra_aggressive",     name: "Ultra Agresivo", prob: 3,  color: "#ff0000", desc: "La IA operará con máximo riesgo. Es posible perder gran parte del capital invertido." };
}

export function calcRequiredMonthlyReturn(initialCapital, goalAmount, deadlineMonths) {
  return deadlineMonths > 0 && initialCapital > 0 && goalAmount > initialCapital
    ? (Math.pow(goalAmount / initialCapital, 1 / deadlineMonths) - 1) * 100
    : 0;
}