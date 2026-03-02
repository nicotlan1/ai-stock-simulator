import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const [configs, wallets, holdings, transactions] = await Promise.all([
      base44.asServiceRole.entities.UserConfig.list(),
      base44.asServiceRole.entities.Wallet.list(),
      base44.asServiceRole.entities.Holding.list(),
      base44.asServiceRole.entities.Transaction.list('-executed_at', 200)
    ]);

    if (!configs.length || !wallets.length) {
      return Response.json({ skipped: true, reason: "No config or wallet" });
    }

    const config = configs[0];
    const wallet = wallets[0];

    // Today's trades
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayTxs = transactions.filter(t => {
      if (!t.executed_at) return false;
      return new Date(t.executed_at) >= todayStart;
    });

    const buys = todayTxs.filter(t => t.type === "buy");
    const sells = todayTxs.filter(t => t.type === "sell");
    const todayPnl = sells.reduce((sum, t) => sum + (t.realized_pnl || 0), 0);

    // Current portfolio value
    const investedValue = holdings.reduce((s, h) => s + (h.current_value || 0), 0);
    const totalPortfolio = (wallet.liquid_cash || 0) + investedValue;
    const initialCapital = config.initial_capital || totalPortfolio;
    const totalPnlPct = ((totalPortfolio - initialCapital) / initialCapital) * 100;

    // Goal progress
    const goalAmount = config.goal_amount || 0;
    const goalProgress = goalAmount > 0
      ? Math.min(100, ((totalPortfolio - initialCapital) / (goalAmount - initialCapital)) * 100)
      : 0;

    const sign = todayPnl >= 0 ? "+" : "";
    const message = `📊 Resumen del día: ${buys.length} compra(s), ${sells.length} venta(s). ` +
      `P&L del día: ${sign}$${todayPnl.toFixed(2)}. ` +
      `Portafolio total: $${totalPortfolio.toFixed(2)} (${totalPnlPct >= 0 ? "+" : ""}${totalPnlPct.toFixed(2)}% desde inicio). ` +
      `Progreso hacia la meta: ${goalProgress.toFixed(1)}%.`;

    await base44.asServiceRole.entities.Alert.create({
      type: "info",
      message,
      is_read: false
    });

    // Check milestone alerts (25, 50, 75, 100%)
    const milestones = [25, 50, 75, 100];
    for (const milestone of milestones) {
      if (goalProgress >= milestone) {
        // Check if we already sent this milestone alert
        const existingAlerts = await base44.asServiceRole.entities.Alert.filter({
          type: "goal_reached",
          message: { $regex: `${milestone}%` }
        });

        // Simple check: look for milestone keyword in existing alerts
        const allGoalAlerts = await base44.asServiceRole.entities.Alert.filter({ type: "goal_reached" });
        const alreadySent = allGoalAlerts.some(a => a.message && a.message.includes(`${milestone}%`));

        if (!alreadySent) {
          const emojis = { 25: "🌱", 50: "🚀", 75: "💫", 100: "🏆" };
          await base44.asServiceRole.entities.Alert.create({
            type: "goal_reached",
            message: `${emojis[milestone]} ¡Hito alcanzado! Tu portafolio ha llegado al ${milestone}% del camino hacia tu meta. Portafolio actual: $${totalPortfolio.toFixed(2)} de $${goalAmount.toFixed(2)}.`,
            is_read: false
          });
        }
      }
    }

    return Response.json({ success: true, summary: message, trades_today: todayTxs.length });
  } catch (error) {
    console.error("dailySummary error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});