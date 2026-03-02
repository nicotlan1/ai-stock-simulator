const handleConfirm = async () => {
  setSaving(true);
  try {
    const today = new Date().toISOString().split("T")[0];

    await base44.entities.UserConfig.create({
      goal_amount:                goalNum,
      initial_capital:            aiNum,
      deadline_months:            deadlineMonths,
      required_monthly_return:    requiredMonthlyReturn,
      risk_level:                 riskProfile.level,
      estimated_probability:      riskProfile.prob,
      start_date:                 today,
      initial_investment_pending: true
    });

    // FIX: campos correctos del schema + liquid_cash = aiNum
    await base44.entities.Wallet.create({
      free_balance: reserveNum,
      ai_capital:   aiNum,
      liquid_cash:  aiNum,   // ← FIX CRÍTICO: permite que aiEngine invierta
      net_worth:    totalNum
    });

    await base44.entities.WalletMovement.create({
      type:              "deposit",
      amount:            totalNum,
      resulting_balance: totalNum,
      notes:             "Depósito inicial de capital ficticio"
    });

    if (aiNum > 0) {
      await base44.entities.WalletMovement.create({
        type:              "send_to_ai",
        amount:            aiNum,
        resulting_balance: reserveNum,
        notes:             "Capital enviado a la IA al iniciar simulación"
      });
    }

    window.location.href = createPageUrl("Dashboard");
  } catch (err) {
    console.error("Setup error:", err.message);
    setSaving(false);
  }
};