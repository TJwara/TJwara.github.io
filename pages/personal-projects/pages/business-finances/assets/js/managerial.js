/* Cost and managerial calculations over a shared company snapshot.
   These views reuse the register and ledger data maintained by core.js and accounting.js. */
(() => {
  "use strict";
  const IA = window.IAP;
  const U = IA.Util;
  const round = (value) => Math.round((U.number(value) + Number.EPSILON) * 100) / 100;
  const d = (row) => (row && row.data ? row.data : row || {});
  const active = (row) => !["Inactive", "Cancelled"].includes(d(row).status);
  const by = (rows, key, value) =>
    (rows || []).find(
      (row) => String(d(row)[key] || "").toUpperCase() === String(value || "").toUpperCase(),
    ) || null;

  // Convert pay components into a comparable monthly labour cost.
  function employeeMonthlyCost(employee) {
    const x = d(employee),
      base = U.number(x.basePay),
      hours = U.number(x.hoursPerWeek, 40);
    const factor =
      {
        Hourly: (hours * 52) / 12,
        Daily: (5 * 52) / 12,
        Weekly: 52 / 12,
        Fortnightly: 26 / 12,
        Monthly: 1,
        Annual: 1 / 12,
      }[x.payBasis] || 1;
    return round(
      base * factor +
        U.number(x.expectedOvertimeHours) * U.number(x.overtimeRate) +
        U.number(x.monthlyAllowances) +
        U.number(x.employerContributions),
    );
  }
  function recurringMonthlyCost(expense) {
    const x = d(expense),
      factor =
        { Weekly: 52 / 12, Monthly: 1, Quarterly: 1 / 3, "Every 6 months": 1 / 6, Annual: 1 / 12 }[
          x.frequency
        ] || 1;
    return round(U.number(x.amount) * factor);
  }
  function equipmentHourlyCost(equipment) {
    const x = d(equipment);
    if (x.ownership === "Owned")
      return round(U.number(x.operatingCostPerHour) + U.number(x.depreciationPerHour));
    return round(U.number(x.hireRatePerHour) + U.number(x.operatingCostPerHour));
  }
  // Combine material movements into inventory availability and valuation.
  function inventory(snap) {
    const results = new Map();
    (snap.data.materials || [])
      .filter(active)
      .forEach((row) =>
        results.set(row.data.code, {
          code: row.data.code,
          name: row.data.name,
          unit: row.data.unit,
          quantity: 0,
          value: 0,
          averageCost: U.number(row.data.standardCost),
          reorderLevel: U.number(row.data.reorderLevel),
          safetyStock: U.number(row.data.safetyStock),
        }),
      );
    (snap.data.inventory_movements || [])
      .filter((row) => row.data.status === "Posted")
      .sort((a, b) => a.data.date.localeCompare(b.data.date))
      .forEach((row) => {
        const x = row.data,
          item = results.get(x.materialCode);
        if (!item) return;
        const incoming = ["Opening", "Receipt", "Return", "Adjustment increase"].includes(x.type),
          qty = U.number(x.quantity),
          cost = U.number(x.unitCost) || item.averageCost;
        if (incoming) {
          item.value += qty * cost;
          item.quantity += qty;
        } else {
          item.value -= qty * item.averageCost;
          item.quantity -= qty;
        }
        item.value = round(item.value);
        item.quantity = round(item.quantity);
        item.averageCost = item.quantity > 0 ? round(item.value / item.quantity) : cost;
      });
    const rows = Array.from(results.values()).map((item) =>
      Object.assign(item, {
        shortage: round(Math.max(0, item.reorderLevel - item.quantity)),
        status:
          item.quantity <= item.safetyStock
            ? "Below safety stock"
            : item.quantity <= item.reorderLevel
              ? "Reorder"
              : "Healthy",
      }),
    );
    return {
      rows,
      totalValue: round(U.sum(rows, (x) => x.value)),
      reorderCount: rows.filter((x) => x.status !== "Healthy").length,
    };
  }

  // Allocate indirect costs through the configured cost pools and drivers.
  function overheadPools(snap) {
    const explicit = (snap.data.overhead_pools || [])
      .filter(active)
      .map((row) => ({
        code: row.data.code,
        name: row.data.name,
        monthlyAmount: U.number(row.data.monthlyAmount),
        allocationBasis: row.data.allocationBasis || "Direct cost",
        costBehaviour: row.data.costBehaviour,
        source: "Entered overhead pool",
      }));
    const linkedAccounts = new Set(
      (snap.data.overhead_pools || [])
        .filter(active)
        .map((row) => row.data.expenseAccount)
        .filter(Boolean),
    );
    const indirectPayroll = U.sum(
      (snap.data.employees || []).filter(
        (row) => active(row) && !row.data.productCode && !row.data.projectCode,
      ),
      employeeMonthlyCost,
    );
    const directRecurring = (snap.data.recurring_expenses || []).filter(
      (row) =>
        active(row) &&
        !row.data.productCode &&
        !row.data.projectCode &&
        row.data.cashClassification !== "Capital expenditure" &&
        !linkedAccounts.has(row.data.expenseAccount),
    );
    const recurring = U.sum(directRecurring, recurringMonthlyCost);
    const depreciation = U.sum((snap.data.fixed_assets || []).filter(active), (row) => {
      const x = row.data;
      return (
        Math.max(0, U.number(x.purchaseCost) - U.number(x.residualValue)) /
        (U.number(x.usefulLifeYears) * 12 || 1)
      );
    });
    const derived = [];
    if (indirectPayroll)
      derived.push({
        code: "AUTO-PAYROLL",
        name: "Indirect salaries, wages and employer costs",
        monthlyAmount: round(indirectPayroll),
        allocationBasis: "Direct labour hours",
        costBehaviour: "Fixed",
        source: "Calculated from employees",
      });
    if (recurring)
      derived.push({
        code: "AUTO-OPERATING",
        name: "Rent, utilities and other operating expenses",
        monthlyAmount: round(recurring),
        allocationBasis: "Direct cost",
        costBehaviour: "Fixed",
        source: "Calculated from recurring expenses",
      });
    if (depreciation)
      derived.push({
        code: "AUTO-DEPR",
        name: "Equipment and asset depreciation",
        monthlyAmount: round(depreciation),
        allocationBasis: "Equipment hours",
        costBehaviour: "Fixed",
        source: "Calculated from assets",
      });
    const rows = explicit.concat(derived);
    return {
      rows,
      totalMonthly: round(U.sum(rows, (x) => x.monthlyAmount)),
      explicitMonthly: round(U.sum(explicit, (x) => x.monthlyAmount)),
      calculatedMonthly: round(U.sum(derived, (x) => x.monthlyAmount)),
    };
  }

  function directProductCosts(snap) {
    const materials = new Map((snap.data.materials || []).map((row) => [row.data.code, row.data]));
    const labour = new Map(
      (snap.data.labour_resources || []).map((row) => [row.data.code, row.data]),
    );
    const equipment = new Map((snap.data.equipment || []).map((row) => [row.data.code, row.data]));
    return (snap.data.products || []).filter(active).map((productRow) => {
      const p = productRow.data,
        materialLines = (snap.data.product_materials || []).filter(
          (row) => active(row) && row.data.productCode === p.code,
        ),
        labourLines = (snap.data.product_labour || []).filter(
          (row) => active(row) && row.data.productCode === p.code,
        ),
        equipmentLines = (snap.data.product_equipment || []).filter(
          (row) => active(row) && row.data.productCode === p.code,
        ),
        operations = (snap.data.product_operations || []).filter(
          (row) => active(row) && row.data.productCode === p.code,
        );
      const materialCost = U.sum(materialLines, (row) => {
        const x = row.data,
          m = materials.get(x.materialCode);
        return (
          U.number(x.quantityPerUnit) *
          (1 + U.number(x.wastagePercent) / 100) *
          U.number(m && m.standardCost)
        );
      });
      const labourHours = U.sum(labourLines, (row) => row.data.hoursPerUnit);
      const labourCost = U.sum(labourLines, (row) => {
        const x = row.data,
          l = labour.get(x.labourCode) || {};
        const overtime = U.number(x.overtimePercent) / 100;
        return (
          U.number(x.hoursPerUnit) *
          ((1 - overtime) * U.number(l.normalRate) +
            overtime * (U.number(l.overtimeRate) || U.number(l.normalRate)))
        );
      });
      const equipmentHours = U.sum(equipmentLines, (row) => row.data.hoursPerUnit);
      const equipmentCost = U.sum(equipmentLines, (row) => {
        const x = row.data,
          e = equipment.get(x.equipmentCode);
        return U.number(x.hoursPerUnit) * equipmentHourlyCost(e || {});
      });
      const productionMinutes = U.sum(
        operations,
        (row) =>
          U.number(row.data.setupMinutes) / Math.max(1, U.number(row.data.batchSize, 1)) +
          U.number(row.data.runMinutesPerUnit) +
          U.number(row.data.waitMinutes) / Math.max(1, U.number(row.data.batchSize, 1)),
      );
      return {
        code: p.code,
        name: p.name,
        type: p.type,
        unit: p.unit,
        sellingPrice: U.number(p.sellingPrice),
        volume: U.number(p.expectedMonthlyVolume),
        targetMargin: U.number(p.targetMargin),
        materialCost: round(materialCost),
        labourCost: round(labourCost),
        equipmentCost: round(equipmentCost),
        labourHours: round(labourHours),
        equipmentHours: round(equipmentHours),
        productionMinutes: round(productionMinutes),
        directCost: round(materialCost + labourCost + equipmentCost),
        overheadPerUnit: 0,
        fullCost: round(materialCost + labourCost + equipmentCost),
      };
    });
  }

  // Roll direct inputs and allocated overhead into product or service unit costs.
  function productCosts(snap) {
    const rows = directProductCosts(snap),
      pools = overheadPools(snap);
    pools.rows.forEach((pool) => {
      const driver = (item) => {
        if (pool.allocationBasis === "Expected sales value") return item.sellingPrice * item.volume;
        if (pool.allocationBasis === "Expected units") return item.volume;
        if (pool.allocationBasis === "Direct labour hours") return item.labourHours * item.volume;
        if (pool.allocationBasis === "Equipment hours") return item.equipmentHours * item.volume;
        if (pool.allocationBasis === "Equal share") return item.volume > 0 ? 1 : 0;
        return item.directCost * item.volume;
      };
      let totalDriver = U.sum(rows, driver);
      rows.forEach((item) => {
        const share =
          totalDriver > 0 ? driver(item) / totalDriver : rows.length ? 1 / rows.length : 0;
        item.overheadPerUnit +=
          item.volume > 0 ? (U.number(pool.monthlyAmount) * share) / item.volume : 0;
      });
    });
    rows.forEach((item) => {
      item.overheadPerUnit = round(item.overheadPerUnit);
      item.fullCost = round(item.directCost + item.overheadPerUnit);
      item.unitProfit = round(item.sellingPrice - item.fullCost);
      item.marginPercent = item.sellingPrice
        ? round((item.unitProfit / item.sellingPrice) * 100)
        : 0;
      item.monthlyRevenue = round(item.sellingPrice * item.volume);
      item.monthlyProfit = round(item.unitProfit * item.volume);
      item.priceHealth =
        item.sellingPrice < item.directCost
          ? "Below direct cost"
          : item.unitProfit < 0
            ? "Below full cost"
            : item.marginPercent < item.targetMargin
              ? "Below target"
              : "Healthy";
    });
    return {
      rows,
      pools: pools.rows,
      totalMonthlyRevenue: round(U.sum(rows, (x) => x.monthlyRevenue)),
      totalMonthlyProfit: round(U.sum(rows, (x) => x.monthlyProfit)),
      totalMonthlyOverhead: pools.totalMonthly,
    };
  }

  // Compare costs, target margins and existing selling prices.
  function pricing(snap) {
    const costing = productCosts(snap);
    const assumptions = new Map(
      (snap.data.pricing_assumptions || [])
        .filter(active)
        .map((row) => [row.data.productCode, row.data]),
    );
    const rows = costing.rows.map((item) => {
      const a = assumptions.get(item.code) || {},
        reference = U.number(a.referencePrice) || item.sellingPrice || item.fullCost,
        baseVolume = U.number(a.baselineMonthlyVolume) || item.volume,
        elasticity = U.number(a.priceElasticity, 1),
        capacity = U.number(a.capacityMonthly) || Number.POSITIVE_INFINITY,
        target = U.number(a.targetMargin) || item.targetMargin || 20;
      const floor = round(
        Math.max(item.directCost, item.fullCost / Math.max(0.01, 1 - target / 100)),
      );
      const minimum = U.number(a.minimumPrice) || Math.max(item.directCost, reference * 0.7),
        maximum = U.number(a.maximumPrice) || Math.max(floor * 1.5, reference * 1.5),
        step = U.number(a.priceStep) || Math.max(0.01, (maximum - minimum) / 40);
      let best = { price: floor, volume: baseVolume, profit: (floor - item.fullCost) * baseVolume };
      for (let price = minimum; price <= maximum + 0.0001; price += step) {
        const volume = Math.max(
          0,
          Math.min(
            capacity,
            baseVolume * (1 - (elasticity * (price - reference)) / Math.max(reference, 0.01)),
          ),
        );
        const profit = (price - item.directCost) * volume - item.overheadPerUnit * item.volume;
        if (profit > best.profit) best = { price, volume, profit };
      }
      const recommended = round(Math.max(floor, best.price)),
        expectedVolume = Math.max(0, round(best.volume));
      return Object.assign({}, item, {
        costRecoveryPrice: item.fullCost,
        targetMarginPrice: floor,
        profitMaximisingPrice: round(best.price),
        recommendedPrice: recommended,
        expectedVolumeAtRecommendedPrice: expectedVolume,
        expectedMonthlyProfit: round(
          (recommended - item.directCost) * expectedVolume - item.overheadPerUnit * item.volume,
        ),
        enteredPriceDifference: round(item.sellingPrice - recommended),
        recommendation:
          item.sellingPrice < item.directCost
            ? "Urgent: entered price does not cover direct cost"
            : item.sellingPrice < item.fullCost
              ? "Entered price does not cover all allocated costs"
              : item.sellingPrice < recommended
                ? "Consider increasing the price"
                : item.sellingPrice > recommended * 1.2
                  ? "Check whether volume may fall at this price"
                  : "Entered price is within a reasonable range",
      });
    });
    return {
      rows,
      note: "The recommendation maximises estimated monthly contribution within the entered price range, demand sensitivity and capacity, then enforces the full-cost target-margin floor. It is decision support, not a guarantee of market demand.",
    };
  }

  function breakEven(snap) {
    const costing = productCosts(snap),
      products = costing.rows.filter((x) => x.volume > 0),
      totalVolume = U.sum(products, (x) => x.volume);
    const weightedPrice = totalVolume
      ? U.sum(products, (x) => x.sellingPrice * x.volume) / totalVolume
      : 0;
    const weightedVariable = totalVolume
      ? U.sum(products, (x) => x.directCost * x.volume) / totalVolume
      : 0;
    const contribution = round(weightedPrice - weightedVariable),
      fixedCosts = round(costing.totalMonthlyOverhead),
      units = contribution > 0 ? round(fixedCosts / contribution) : null;
    return {
      weightedSellingPrice: round(weightedPrice),
      weightedVariableCost: round(weightedVariable),
      weightedContribution: contribution,
      contributionMarginPercent: weightedPrice ? round((contribution / weightedPrice) * 100) : 0,
      monthlyFixedCosts: fixedCosts,
      breakEvenUnits: units,
      breakEvenSales: units == null ? null : round(units * weightedPrice),
      expectedUnits: round(totalVolume),
      marginOfSafetyUnits: units == null ? null : round(totalVolume - units),
      marginOfSafetyPercent:
        totalVolume && units != null ? round(((totalVolume - units) / totalVolume) * 100) : null,
      status:
        contribution <= 0
          ? "Prices do not cover variable cost"
          : totalVolume >= units
            ? "Expected sales cover all monthly costs"
            : "Expected sales are below break-even",
    };
  }

  function ledgerActual(snap, accountCode, period, filters = {}) {
    const account = by(snap.data.accounts, "code", accountCode),
      lines = IA.Accounting.allLines(snap, { from: `${period}-01`, to: `${period}-31` }).filter(
        (line) =>
          line.accountCode === accountCode &&
          (!filters.costCentreCode || line.costCentreCode === filters.costCentreCode) &&
          (!filters.productCode || line.productCode === filters.productCode) &&
          (!filters.projectCode || line.projectCode === filters.projectCode),
      );
    const debit = U.sum(lines, (line) => line.debit),
      credit = U.sum(lines, (line) => line.credit);
    return account && ["Revenue", "Liability", "Equity"].includes(account.data.type)
      ? round(credit - debit)
      : round(debit - credit);
  }
  // Align budget rows with ledger actuals over a selected reporting period.
  function budgetActual(snap, options = {}) {
    const lines = (snap.data.budget_lines || []).filter(
      (row) =>
        (!options.period || row.data.period === options.period) &&
        (!options.version || row.data.version === options.version) &&
        (!options.costCentreCode || row.data.costCentreCode === options.costCentreCode) &&
        (!options.productCode || row.data.productCode === options.productCode) &&
        (!options.projectCode || row.data.projectCode === options.projectCode) &&
        ["Approved", "Revised"].includes(row.data.status),
    );
    const rows = lines.map((row) => {
      const x = row.data,
        account = by(snap.data.accounts, "code", x.accountCode),
        actual = ledgerActual(snap, x.accountCode, x.period, x),
        budget = U.number(x.amount),
        revenue = account && account.data.type === "Revenue",
        variance = round(revenue ? actual - budget : budget - actual);
      return {
        code: x.code,
        period: x.period,
        accountCode: x.accountCode,
        accountName: account ? account.data.name : "Unknown account",
        accountType: account ? account.data.type : "",
        costCentreCode: x.costCentreCode,
        productCode: x.productCode,
        projectCode: x.projectCode,
        budget,
        actual,
        variance,
        variancePercent: budget ? round((variance / Math.abs(budget)) * 100) : null,
        result: variance >= 0 ? "Favourable" : "Unfavourable",
      };
    });
    return {
      rows,
      budget: round(U.sum(rows, (x) => x.budget)),
      actual: round(U.sum(rows, (x) => x.actual)),
      favourable: round(
        U.sum(
          rows.filter((x) => x.variance >= 0),
          (x) => x.variance,
        ),
      ),
      unfavourable: round(
        U.sum(
          rows.filter((x) => x.variance < 0),
          (x) => Math.abs(x.variance),
        ),
      ),
    };
  }

  // Explain the difference between planned production inputs and actual use.
  function productionVariances(snap) {
    const materials = new Map((snap.data.materials || []).map((row) => [row.data.code, row.data])),
      labour = new Map((snap.data.labour_resources || []).map((row) => [row.data.code, row.data]));
    const matReq = snap.data.product_materials || [],
      labReq = snap.data.product_labour || [];
    const rows = (snap.data.production_actuals || []).map((row) => {
      const x = row.data,
        m = materials.get(x.materialCode) || {},
        l = labour.get(x.labourCode) || {},
        pm = matReq.find(
          (r) => r.data.productCode === x.productCode && r.data.materialCode === x.materialCode,
        ),
        pl = labReq.find(
          (r) => r.data.productCode === x.productCode && r.data.labourCode === x.labourCode,
        ),
        units = U.number(x.unitsProduced);
      const standardMaterialQty =
          units *
          U.number(pm && pm.data.quantityPerUnit) *
          (1 + U.number(pm && pm.data.wastagePercent) / 100),
        standardMaterialCost = standardMaterialQty * U.number(m.standardCost),
        standardLabourHours = units * U.number(pl && pl.data.hoursPerUnit),
        standardLabourCost = standardLabourHours * U.number(l.normalRate);
      return {
        code: x.code,
        date: x.date,
        productCode: x.productCode,
        units,
        materialUsageVariance: round(
          (standardMaterialQty - U.number(x.actualMaterialQuantity)) * U.number(m.standardCost),
        ),
        materialPriceVariance: round(
          U.number(x.actualMaterialQuantity) *
            (U.number(m.standardCost) -
              (U.number(x.actualMaterialQuantity)
                ? U.number(x.actualMaterialCost) / U.number(x.actualMaterialQuantity)
                : 0)),
        ),
        totalMaterialVariance: round(standardMaterialCost - U.number(x.actualMaterialCost)),
        labourEfficiencyVariance: round(
          (standardLabourHours - U.number(x.actualLabourHours)) * U.number(l.normalRate),
        ),
        labourRateVariance: round(
          U.number(x.actualLabourHours) *
            (U.number(l.normalRate) -
              (U.number(x.actualLabourHours)
                ? U.number(x.actualLabourCost) / U.number(x.actualLabourHours)
                : 0)),
        ),
        totalLabourVariance: round(standardLabourCost - U.number(x.actualLabourCost)),
      };
    });
    return {
      rows,
      materialVariance: round(U.sum(rows, (x) => x.totalMaterialVariance)),
      labourVariance: round(U.sum(rows, (x) => x.totalLabourVariance)),
    };
  }

  function latestProgress(snap, taskCode, asOf) {
    return (
      (snap.data.project_progress || [])
        .filter((row) => row.data.taskCode === taskCode && (!asOf || row.data.date <= asOf))
        .sort((a, b) => b.data.date.localeCompare(a.data.date))[0] || null
    );
  }
  // Measure a project using its progress, costs and revenue as of one date.
  function projectMetrics(snap, projectCode, asOf = U.today()) {
    const projectRow = by(snap.data.projects, "code", projectCode);
    if (!projectRow) return null;
    const p = projectRow.data,
      tasks = (snap.data.project_tasks || []).filter((row) => row.data.projectCode === projectCode),
      taskBudget = U.sum(tasks, (row) => row.data.budget),
      BAC = U.number(p.approvedBudget) || taskBudget;
    let PV = 0,
      EV = 0;
    tasks.forEach((row) => {
      const t = row.data,
        duration = Math.max(1, U.daysBetween(t.startDate, t.endDate)),
        elapsed = U.clamp(U.daysBetween(t.startDate, asOf), 0, duration),
        plannedPercent =
          asOf >= t.endDate ? 100 : asOf < t.startDate ? 0 : (elapsed / duration) * 100,
        progress = latestProgress(snap, t.code, asOf),
        actualPercent = progress
          ? U.number(progress.data.physicalPercent)
          : t.status === "Completed"
            ? 100
            : 0;
      PV += (U.number(t.budget) * plannedPercent) / 100;
      EV += (U.number(t.budget) * actualPercent) / 100;
    });
    if (!tasks.length) {
      const duration = Math.max(1, U.daysBetween(p.startDate, p.endDate)),
        elapsed = U.clamp(U.daysBetween(p.startDate, asOf), 0, duration);
      PV = BAC * (asOf >= p.endDate ? 1 : asOf < p.startDate ? 0 : elapsed / duration);
      EV = 0;
    }
    const entered = (snap.data.project_costs || []).filter(
        (row) => row.data.projectCode === projectCode && row.data.approved && row.data.date <= asOf,
      ),
      AC = U.sum(entered, (row) => row.data.amount),
      committed = U.sum(
        entered.filter((row) => row.data.committed),
        (row) => row.data.amount,
      ),
      CPI = AC > 0 ? EV / AC : EV > 0 ? 1 : 0,
      SPI = PV > 0 ? EV / PV : EV > 0 ? 1 : 0,
      EAC = CPI > 0 ? BAC / CPI : BAC + AC,
      ETC = Math.max(0, EAC - AC),
      VAC = BAC - EAC;
    const plannedDays = Math.max(1, U.daysBetween(p.startDate, p.endDate)),
      elapsedDays = U.clamp(U.daysBetween(p.startDate, asOf), 0, plannedDays),
      remainingDays = Math.max(0, U.daysBetween(asOf, p.endDate));
    return {
      code: p.code,
      name: p.name,
      status: p.status,
      contractValue: U.number(p.contractValue),
      BAC: round(BAC),
      PV: round(PV),
      EV: round(EV),
      AC: round(AC),
      committed: round(committed),
      costVariance: round(EV - AC),
      scheduleVariance: round(EV - PV),
      CPI: round(CPI),
      SPI: round(SPI),
      EAC: round(EAC),
      ETC: round(ETC),
      VAC: round(VAC),
      forecastProfit: round(U.number(p.contractValue) - EAC),
      physicalProgress: BAC ? round((EV / BAC) * 100) : 0,
      plannedProgress: BAC ? round((PV / BAC) * 100) : 0,
      plannedDays,
      elapsedDays,
      remainingDays,
      forecastDays: SPI > 0 ? round(plannedDays / SPI) : plannedDays,
      forecastFinish: new Date(
        new Date(`${p.startDate}T00:00:00Z`).valueOf() +
          Math.ceil(SPI > 0 ? plannedDays / SPI : plannedDays) * 864e5,
      )
        .toISOString()
        .slice(0, 10),
      health: CPI < 0.9 || SPI < 0.9 ? "At risk" : CPI < 1 || SPI < 1 ? "Watch" : "Healthy",
    };
  }
  function projectPortfolio(snap, asOf = U.today()) {
    const rows = (snap.data.projects || [])
      .filter((row) => !["Cancelled"].includes(row.data.status))
      .map((row) => projectMetrics(snap, row.data.code, asOf))
      .filter(Boolean);
    return {
      rows,
      approvedBudget: round(U.sum(rows, (x) => x.BAC)),
      actualCost: round(U.sum(rows, (x) => x.AC)),
      forecastCost: round(U.sum(rows, (x) => x.EAC)),
      forecastProfit: round(U.sum(rows, (x) => x.forecastProfit)),
      atRisk: rows.filter((x) => x.health === "At risk").length,
    };
  }

  function profitability(snap, options = {}) {
    const costing = productCosts(snap),
      costMap = new Map(costing.rows.map((x) => [x.code, x]));
    const sales = (snap.data.customer_invoices || []).filter(
      (row) =>
        ["Approved", "Posted"].includes(row.data.status) &&
        (!options.from || row.data.date >= options.from) &&
        (!options.to || row.data.date <= options.to),
    );
    const map = new Map();
    sales.forEach((row) => {
      const x = row.data,
        key =
          options.by === "customer"
            ? x.customerCode || "Unassigned"
            : x.productCode || "Unassigned",
        item = map.get(key) || { code: key, revenue: 0, cost: 0, profit: 0, quantity: 0 };
      const net =
          U.number(x.quantity) * U.number(x.unitPrice) * (1 - U.number(x.discountPercent) / 100),
        productCost = costMap.get(x.productCode);
      item.revenue += net;
      item.quantity += U.number(x.quantity);
      item.cost += U.number(x.quantity) * U.number(productCost && productCost.fullCost);
      map.set(key, item);
    });
    const rows = Array.from(map.values())
      .map((x) =>
        Object.assign(x, {
          revenue: round(x.revenue),
          cost: round(x.cost),
          profit: round(x.revenue - x.cost),
          marginPercent: x.revenue ? round(((x.revenue - x.cost) / x.revenue) * 100) : 0,
        }),
      )
      .sort((a, b) => b.profit - a.profit);
    return {
      rows,
      revenue: round(U.sum(rows, (x) => x.revenue)),
      cost: round(U.sum(rows, (x) => x.cost)),
      profit: round(U.sum(rows, (x) => x.profit)),
    };
  }

  function scenarios(snap) {
    const base = productCosts(snap),
      productMap = new Map(base.rows.map((x) => [x.code, x]));
    return (snap.data.scenarios || []).map((row) => {
      const x = row.data,
        products = x.productCode ? [productMap.get(x.productCode)].filter(Boolean) : base.rows;
      const revenue = U.sum(
          products,
          (p) =>
            p.sellingPrice *
            (1 + U.number(x.priceChange) / 100) *
            p.volume *
            (1 + U.number(x.volumeChange) / 100),
        ),
        variable = U.sum(
          products,
          (p) =>
            p.directCost *
            (1 + (U.number(x.materialChange) + U.number(x.labourChange)) / 200) *
            p.volume *
            (1 + U.number(x.volumeChange) / 100),
        ),
        overhead = base.totalMonthlyOverhead * (1 + U.number(x.overheadChange) / 100);
      return {
        code: x.code,
        name: x.name,
        revenue: round(revenue),
        variableCost: round(variable),
        overhead: round(overhead),
        profit: round(revenue - variable - overhead),
        changeFromBaseline: round(revenue - variable - overhead - base.totalMonthlyProfit),
      };
    });
  }
  function decisions(snap) {
    return (snap.data.decision_models || []).map((row) => {
      const x = row.data,
        a = U.number(x.optionARevenue) - U.number(x.optionACost),
        b = U.number(x.optionBRevenue) - U.number(x.optionBCost);
      return {
        code: x.code,
        name: x.name,
        type: x.type,
        optionA: x.optionA,
        optionANetBenefit: round(a),
        optionB: x.optionB,
        optionBNetBenefit: round(b),
        difference: round(Math.abs(a - b)),
        recommendation: a >= b ? x.optionA || "Option A" : x.optionB || "Option B",
        qualitativeFactors: x.qualitativeFactors,
        status: x.status,
      };
    });
  }
  function npv(rate, flows) {
    return flows.reduce((total, flow, index) => total + flow / Math.pow(1 + rate, index), 0);
  }
  function irr(flows) {
    let low = -0.99,
      high = 10;
    for (let i = 0; i < 120; i += 1) {
      const mid = (low + high) / 2;
      if (npv(mid, flows) > 0) low = mid;
      else high = mid;
    }
    return (low + high) / 2;
  }
  function investments(snap) {
    return (snap.data.capital_investments || []).map((row) => {
      const x = row.data,
        annual = String(x.annualCashFlows)
          .split(/[,;\n]/)
          .map(U.number)
          .filter((_, i, all) => i < U.number(x.lifeYears)),
        flows = [-U.number(x.initialInvestment)].concat(annual);
      while (flows.length <= U.number(x.lifeYears)) flows.push(0);
      flows[flows.length - 1] += U.number(x.residualValue);
      let cumulative = 0,
        payback = null;
      flows.slice(1).forEach((flow, index) => {
        if (payback != null) return;
        const before = cumulative;
        cumulative += flow;
        if (cumulative >= U.number(x.initialInvestment))
          payback = index + (U.number(x.initialInvestment) - before) / Math.max(flow, 0.01);
      });
      const value = npv(U.number(x.discountRate) / 100, flows);
      return {
        code: x.code,
        name: x.name,
        initialInvestment: U.number(x.initialInvestment),
        NPV: round(value),
        IRR: round(irr(flows) * 100),
        paybackYears: payback == null ? null : round(payback),
        decision:
          value > 0
            ? "Financially acceptable at the selected discount rate"
            : "Does not meet the selected return requirement",
        status: x.status,
      };
    });
  }
  function tenders(snap) {
    const rows = (snap.data.tender_items || []).map((row) => {
      const x = row.data,
        base =
          U.number(x.material) +
          U.number(x.labour) +
          U.number(x.equipment) +
          U.number(x.subcontractor) +
          U.number(x.riskWastage) +
          U.number(x.preliminaries) +
          U.number(x.overhead),
        rate = base * (1 + U.number(x.profitPercent) / 100);
      return {
        code: x.code,
        tenderNumber: x.tenderNumber,
        itemNumber: x.itemNumber,
        description: x.description,
        unit: x.unit,
        quantity: U.number(x.quantity),
        costRate: round(base),
        sellingRate: round(rate),
        total: round(rate * U.number(x.quantity)),
        profit: round((rate - base) * U.number(x.quantity)),
      };
    });
    return {
      rows,
      tenderValue: round(U.sum(rows, (x) => x.total)),
      estimatedProfit: round(U.sum(rows, (x) => x.profit)),
    };
  }

  function workingCapital(snap, asOf = U.today()) {
    const position = IA.Accounting.financialPosition(snap, asOf),
      ar = IA.Accounting.aging(snap, "receivables", asOf),
      ap = IA.Accounting.aging(snap, "payables", asOf),
      stock = inventory(snap),
      cash = U.sum(IA.Accounting.bankSummary(snap, asOf), (x) => x.balance);
    const currentAssets = round(
      U.sum(
        position.assets.filter((x) => /current/i.test(x.subtype || x.statementSection || "")),
        (x) => x.balance,
      ),
    );
    const currentLiabilities = round(
      U.sum(
        position.liabilities.filter((x) => /current/i.test(x.subtype || x.statementSection || "")),
        (x) => x.balance,
      ),
    );
    return {
      cash: round(cash),
      receivables: ar.total,
      inventory: stock.totalValue,
      payables: ap.total,
      currentAssets,
      currentLiabilities,
      netWorkingCapital: round(currentAssets - currentLiabilities),
      currentRatio: currentLiabilities ? round(currentAssets / currentLiabilities) : null,
      quickRatio: currentLiabilities
        ? round((currentAssets - stock.totalValue) / currentLiabilities)
        : null,
    };
  }
  // Project short-term cash movements from known balances and scheduled items.
  function cashForecast(snap) {
    const wc = workingCapital(snap),
      recurring = U.sum((snap.data.recurring_expenses || []).filter(active), recurringMonthlyCost),
      payroll = U.sum((snap.data.employees || []).filter(active), employeeMonthlyCost),
      debt = IA.Accounting.loanRegister(snap).nextMonthlyInstalments;
    const invoicedRevenue = U.sum(
      (snap.data.products || []).filter(active),
      (row) => U.number(row.data.sellingPrice) * U.number(row.data.expectedMonthlyVolume),
    );
    const months = [],
      base = new Date();
    let cash = wc.cash;
    for (let i = 0; i < 12; i += 1) {
      const date = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + i, 1)),
        inflows = i === 0 ? invoicedRevenue + wc.receivables * 0.5 : invoicedRevenue,
        outflows = payroll + recurring + debt + (i === 0 ? wc.payables * 0.5 : 0);
      cash += inflows - outflows;
      months.push({
        period: date.toISOString().slice(0, 7),
        opening: round(cash - inflows + outflows),
        inflows: round(inflows),
        outflows: round(outflows),
        closing: round(cash),
      });
    }
    return {
      rows: months,
      lowestCash: round(Math.min(...months.map((x) => x.closing))),
      fundingGap: round(Math.max(0, -Math.min(...months.map((x) => x.closing)))),
      assumptions:
        "Uses expected product sales, half of current receivables/payables in month one, payroll, recurring operating expenses and loan instalments. Replace assumptions with an approved cash budget before making funding commitments.",
    };
  }
  // Assemble the headline metrics displayed by the managerial dashboard.
  function dashboard(snap, options = {}) {
    const month = options.month || U.month(U.today()),
      statement = IA.Accounting.incomeStatement(snap, { from: `${month}-01`, to: `${month}-31` }),
      costing = productCosts(snap),
      be = breakEven(snap),
      projects = projectPortfolio(snap),
      wc = workingCapital(snap),
      diagnostics = IA.Accounting.diagnostics(snap);
    return {
      month,
      revenue: statement.revenue,
      grossProfit: statement.grossProfit,
      netProfit: statement.netProfit,
      marginPercent: statement.revenue ? round((statement.netProfit / statement.revenue) * 100) : 0,
      expectedMonthlyRevenue: costing.totalMonthlyRevenue,
      expectedMonthlyProfit: costing.totalMonthlyProfit,
      breakEven: be,
      projects,
      workingCapital: wc,
      productAlerts: costing.rows.filter((x) => x.priceHealth !== "Healthy"),
      diagnostics: diagnostics.findings,
    };
  }

  IA.Managerial = {
    employeeMonthlyCost,
    recurringMonthlyCost,
    equipmentHourlyCost,
    inventory,
    overheadPools,
    directProductCosts,
    productCosts,
    pricing,
    breakEven,
    ledgerActual,
    budgetActual,
    productionVariances,
    projectMetrics,
    projectPortfolio,
    profitability,
    scenarios,
    decisions,
    investments,
    tenders,
    workingCapital,
    cashForecast,
    dashboard,
  };
})();
