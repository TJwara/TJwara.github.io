/* Browser data layer. Modules share window.IAP; core.js must load before the other accounting scripts.
   Company data and audit history live in this browser's IndexedDB, not on a server. */
(() => {
  "use strict";
  const IA = (window.IAP = window.IAP || {});
  const DB_NAME = "integrated-accounting-platform";
  const DB_VERSION = 1;
  const stores = ["companies", "records", "audits", "settings"];
  let database;

  // Shared parsing, formatting, identity and download helpers used across the platform.
  const Util = {
    uid(prefix = "id") {
      const random =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      return `${prefix}-${random}`;
    },
    number(value, fallback = 0) {
      if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
      const parsed = Number(String(value == null ? "" : value).replace(/[,\sR$£€]/g, ""));
      return Number.isFinite(parsed) ? parsed : fallback;
    },
    bool(value) {
      if (typeof value === "boolean") return value;
      return ["true", "yes", "1", "y"].includes(
        String(value || "")
          .trim()
          .toLowerCase(),
      );
    },
    sum(rows, getter = (x) => x) {
      return (rows || []).reduce((total, row) => total + Util.number(getter(row)), 0);
    },
    money(value, currency = "ZAR") {
      return new Intl.NumberFormat("en-ZA", {
        style: "currency",
        currency: currency || "ZAR",
        maximumFractionDigits: 2,
      }).format(Util.number(value));
    },
    percent(value) {
      return `${Util.number(value).toLocaleString("en-ZA", { maximumFractionDigits: 2 })}%`;
    },
    date(value) {
      if (!value) return "—";
      const iso = Util.isoDate(value);
      if (!iso) return String(value);
      return new Intl.DateTimeFormat("en-ZA", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(`${iso}T00:00:00`));
    },
    isoDate(value) {
      if (!value) return "";
      if (value instanceof Date && !Number.isNaN(value.valueOf()))
        return value.toISOString().slice(0, 10);
      const text = String(value).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
      const match = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
      if (match) return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
      const parsed = new Date(text);
      return Number.isNaN(parsed.valueOf()) ? "" : parsed.toISOString().slice(0, 10);
    },
    month(value) {
      return Util.isoDate(value).slice(0, 7);
    },
    today() {
      return new Date().toISOString().slice(0, 10);
    },
    stamp() {
      return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    },
    daysBetween(start, end) {
      const a = new Date(`${Util.isoDate(start)}T00:00:00`),
        b = new Date(`${Util.isoDate(end)}T00:00:00`);
      return Number.isFinite(a.valueOf()) && Number.isFinite(b.valueOf())
        ? Math.round((b - a) / 864e5)
        : 0;
    },
    clamp(value, min, max) {
      return Math.min(max, Math.max(min, Util.number(value)));
    },
    escape(value) {
      return String(value == null ? "" : value).replace(
        /[&<>'"]/g,
        (character) =>
          ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character],
      );
    },
    title(value) {
      return String(value || "")
        .replace(/[_-]+/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/\b\w/g, (x) => x.toUpperCase());
    },
    slug(value) {
      return String(value || "file")
        .normalize("NFKD")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase();
    },
    download(blob, filename) {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    naturalSide(accountType) {
      return ["Asset", "Expense", "Cost of Sales"].includes(accountType) ? "Debit" : "Credit";
    },
  };

  // IndexedDB access is centralised here so all records use the same stores and transactions.
  const DB = {
    async init() {
      if (database) return database;
      database = await new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          stores.forEach((name) => {
            if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: "id" });
          });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(request.error || new Error("The local accounting database could not be opened."));
      });
      return database;
    },
    async transaction(store, mode, operation) {
      const db = await DB.init();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const objectStore = tx.objectStore(store);
        let result;
        try {
          result = operation(objectStore);
        } catch (error) {
          reject(error);
          return;
        }
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error || new Error("Database operation failed."));
        tx.onabort = () => reject(tx.error || new Error("Database operation was cancelled."));
      });
    },
    async all(store) {
      const db = await DB.init();
      return new Promise((resolve, reject) => {
        const request = db.transaction(store, "readonly").objectStore(store).getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    },
    async get(store, id) {
      const db = await DB.init();
      return new Promise((resolve, reject) => {
        const request = db.transaction(store, "readonly").objectStore(store).get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    },
    async put(store, value) {
      await DB.transaction(store, "readwrite", (objectStore) => objectStore.put(value));
      return value;
    },
    async remove(store, id) {
      return DB.transaction(store, "readwrite", (objectStore) => objectStore.delete(id));
    },
    async clear(store) {
      return DB.transaction(store, "readwrite", (objectStore) => objectStore.clear());
    },
  };

  // Preserve a change history alongside user and system edits.
  const Audit = {
    async log(companyId, action, entityType, entityId, reason = "") {
      const row = {
        id: Util.uid("audit"),
        companyId,
        timestamp: new Date().toISOString(),
        user: "Local user",
        action,
        entityType,
        entityId,
        reason,
      };
      await DB.put("audits", row);
      return row;
    },
    async list(companyId = "") {
      return (await DB.all("audits"))
        .filter((row) => !companyId || row.companyId === companyId)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    },
  };

  // Company lifecycle; clearing company data is distinct from deleting the company.
  const Companies = {
    async list() {
      return (await DB.all("companies")).sort((a, b) =>
        (a.tradingName || a.legalName).localeCompare(b.tradingName || b.legalName),
      );
    },
    get(id) {
      return DB.get("companies", id);
    },
    async save(data, existing = null) {
      const legalName = String(data.legalName || "").trim();
      if (!legalName) throw new Error("Legal Company Name is required.");
      const all = await Companies.list();
      const suppliedCode = String(data.companyCode || (existing && existing.companyCode) || "")
          .trim()
          .toUpperCase(),
        baseCode =
          legalName
            .replace(/[^A-Za-z0-9]/g, "")
            .slice(0, 10)
            .toUpperCase() || "COMPANY";
      let companyCode = suppliedCode || baseCode,
        sequence = 2;
      while (
        !suppliedCode &&
        all.some(
          (company) =>
            company.id !== (existing && existing.id) && company.companyCode === companyCode,
        )
      ) {
        companyCode = `${baseCode.slice(0, 7)}${String(sequence).padStart(3, "0")}`;
        sequence += 1;
      }
      const duplicate = all.find(
        (company) =>
          company.id !== (existing && existing.id) &&
          (company.companyCode === companyCode ||
            company.legalName.toLowerCase() === legalName.toLowerCase()),
      );
      if (duplicate) throw new Error("A company with this code or legal name already exists.");
      const now = new Date().toISOString();
      const row = Object.assign({}, existing || {}, data, {
        id: existing ? existing.id : Util.uid("company"),
        companyCode,
        legalName,
        tradingName: String(data.tradingName || legalName).trim(),
        currency: data.currency || "ZAR",
        vatRegistered: Util.bool(data.vatRegistered),
        vatRate: Util.number(data.vatRate, 15),
        financialYearEndMonth: Util.number(data.financialYearEndMonth, 2),
        createdAt: existing ? existing.createdAt : now,
        updatedAt: now,
      });
      await DB.put("companies", row);
      await Audit.log(
        row.id,
        existing ? "Updated" : "Created",
        "company",
        row.id,
        "Company profile saved",
      );
      return row;
    },
    async remove(id) {
      const company = await Companies.get(id);
      if (!company) return null;
      await Companies.clearData(id, { log: false });
      await DB.remove("companies", id);
      return company;
    },
    async clearData(id, options = {}) {
      const company = await Companies.get(id);
      if (!company) throw new Error("The company could not be found.");
      const records = (await DB.all("records")).filter((row) => row.companyId === id);
      for (const record of records) await DB.remove("records", record.id);
      const audits = (await DB.all("audits")).filter((row) => row.companyId === id);
      for (const row of audits) await DB.remove("audits", row.id);
      if (options.log !== false)
        await Audit.log(
          id,
          "Cleared",
          "company_data",
          id,
          `${records.length} company records removed`,
        );
      return { recordsRemoved: records.length, auditsRemoved: audits.length };
    },
  };

  // Coerce submitted fields according to the register schema before persistence.
  function normalise(schema, data) {
    const output = {};
    schema.fields.forEach((field) => {
      let value = data[field.key];
      if ((value === "" || value == null) && field.default != null) value = field.default;
      if (field.type === "currency" || field.type === "number" || field.type === "percent")
        value = value === "" || value == null ? 0 : Util.number(value);
      else if (field.type === "boolean") value = Util.bool(value);
      else if (field.type === "date") value = Util.isoDate(value);
      else if (field.type === "json") {
        if (Array.isArray(value) || (value && typeof value === "object")) value = value;
        else if (!value) value = [];
        else {
          try {
            value = JSON.parse(value);
          } catch (_) {
            throw new Error(`${field.label} must contain valid structured data.`);
          }
        }
      } else value = value == null ? "" : String(value).trim();
      output[field.key] = value;
    });
    return output;
  }

  function generatedCode(schema, number) {
    const separator = schema.codeSeparator == null ? "-" : schema.codeSeparator;
    return `${schema.codePrefix}${separator}${String(number).padStart(schema.codeDigits || 3, "0")}`;
  }

  // Generic register operations back the schema-driven forms and accounting modules.
  const Records = {
    async list(companyId, type = "") {
      return (await DB.all("records"))
        .filter((row) => row.companyId === companyId && (!type || row.type === type))
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    },
    get(id) {
      return DB.get("records", id);
    },
    async save(companyId, type, data, existing = null, source = "manual", options = {}) {
      const schema = IA.Schemas && IA.Schemas.get(type);
      if (!schema) throw new Error(`Unknown data register: ${type}`);
      const values = normalise(schema, data);
      const identityField =
        schema.identity && schema.fields.find((field) => field.key === schema.identity);
      if (identityField && identityField.generated && !values[schema.identity])
        values[schema.identity] = await Records.suggestCode(companyId, type);
      const findings = IA.Schemas.validate(type, values);
      if (findings.length) throw new Error(findings.join(" "));
      let linkedJournalToReplace = null;
      if (existing && schema.autoPost) {
        const linkedJournal = (await Records.list(companyId, "journals")).find(
          (journal) => journal.data.sourceId === existing.id && journal.data.status === "Posted",
        );
        if (linkedJournal && JSON.stringify(values) !== JSON.stringify(existing.data)) {
          if (!options.replacePosted)
            throw new Error(
              `This record has already posted journal ${linkedJournal.data.journalNumber}. Reverse that journal before changing or cancelling the source record.`,
            );
          linkedJournalToReplace = linkedJournal;
        }
      }
      if (schema.identity && values[schema.identity]) {
        const duplicate = (await Records.list(companyId, type)).find(
          (row) =>
            row.id !== (existing && existing.id) &&
            String(row.data[schema.identity]).toLowerCase() ===
              String(values[schema.identity]).toLowerCase(),
        );
        if (duplicate)
          throw new Error(
            `${schema.label} ${values[schema.identity]} already exists in this company.`,
          );
      }
      if (linkedJournalToReplace)
        await Records.remove(linkedJournalToReplace.id, { force: true, silent: true });
      const now = new Date().toISOString();
      const row = {
        id: existing ? existing.id : Util.uid(type),
        companyId,
        type,
        data: values,
        source,
        createdAt: existing ? existing.createdAt : now,
        updatedAt: now,
      };
      await DB.put("records", row);
      if (!options.silent)
        await Audit.log(companyId, existing ? "Updated" : "Created", type, row.id, source);
      return row;
    },
    async internalSave(companyId, type, data, existing = null, source = "system") {
      return Records.save(companyId, type, data, existing, source, { silent: true });
    },
    async remove(id, options = {}) {
      const record = await Records.get(id);
      if (!record) return { deletedCount: 0 };
      const root = !options._cascadeState,
        cascadeState = options._cascadeState || { visited: new Set(), deletedCount: 0 };
      if (cascadeState.visited.has(id)) return { deletedCount: cascadeState.deletedCount };
      cascadeState.visited.add(id);
      if (!options.force && IA.Schemas) {
        const all = await Records.list(record.companyId),
          schema = IA.Schemas.get(record.type),
          identity = schema && schema.identity && record.data[schema.identity];
        const externalBillNumber = record.type === "supplier_bills" ? record.data.billNumber : "";
        const dependencies = all.filter((candidate) => {
          if (candidate.id === record.id || cascadeState.visited.has(candidate.id)) return false;
          if (candidate.type === "journals" && candidate.data.sourceId === record.id) return true;
          const candidateSchema = IA.Schemas.get(candidate.type);
          if (!candidateSchema) return false;
          return candidateSchema.fields.some((field) => {
            const value = candidate.data[field.key];
            if (identity && field.ref === record.type && value === identity) return true;
            if (identity && field.key === schema.identity && value === identity) return true;
            if (externalBillNumber && field.key === "billNumber" && value === externalBillNumber)
              return true;
            return false;
          });
        });
        if (dependencies.length && !options.cascade) {
          const refs = dependencies.slice(0, 3).map((candidate) => {
            const candidateSchema = IA.Schemas.get(candidate.type);
            return `${candidateSchema.label}: ${candidate.data[candidateSchema.identity] || candidate.id}`;
          });
          throw new Error(
            `This record cannot be deleted because it is used by ${refs.join(", ")}. Remove or change those links first.`,
          );
        }
        for (const dependency of dependencies)
          await Records.remove(
            dependency.id,
            Object.assign({}, options, {
              cascade: true,
              silent: true,
              _cascadeState: cascadeState,
            }),
          );
      }
      await DB.remove("records", id);
      cascadeState.deletedCount += 1;
      if (root && !options.silent)
        await Audit.log(
          record.companyId,
          "Deleted",
          record.type,
          id,
          options.cascade && cascadeState.deletedCount > 1
            ? `${cascadeState.deletedCount} linked records deleted`
            : "Record deleted",
        );
      return { deletedCount: cascadeState.deletedCount };
    },
    async suggestCode(companyId, type) {
      const schema = IA.Schemas.get(type);
      if (!schema || !schema.codePrefix) return "";
      const rows = await Records.list(companyId, type);
      const used = new Set(
        rows.map((row) => String(row.data[schema.identity] || "").toUpperCase()),
      );
      const escapedPrefix = String(schema.codePrefix).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        escapedSeparator = String(
          schema.codeSeparator == null ? "-" : schema.codeSeparator,
        ).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        pattern = new RegExp(`^${escapedPrefix}${escapedSeparator}(\\d+)$`, "i");
      let next =
        Math.max(
          0,
          ...Array.from(used, (value) => {
            const match = value.match(pattern);
            return match ? Number(match[1]) : 0;
          }),
        ) + 1;
      while (used.has(generatedCode(schema, next))) next += 1;
      return generatedCode(schema, next);
    },
    async backfillGenerated(companyId) {
      if (!IA.Schemas) return;
      const rows = (await DB.all("records")).filter(
        (row) => !companyId || row.companyId === companyId,
      );
      const grouped = new Map();
      rows.forEach((row) => {
        const key = `${row.companyId}\u0000${row.type}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(row);
      });
      for (const group of grouped.values()) {
        const schema = IA.Schemas.get(group[0].type);
        if (!schema || !schema.generatedIdentity || !schema.identity) continue;
        const used = new Set(
          group.map((row) => String(row.data[schema.identity] || "").toUpperCase()).filter(Boolean),
        );
        const escapedPrefix = String(schema.codePrefix).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          escapedSeparator = String(
            schema.codeSeparator == null ? "-" : schema.codeSeparator,
          ).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          pattern = new RegExp(`^${escapedPrefix}${escapedSeparator}(\\d+)$`, "i");
        let next =
          Math.max(
            0,
            ...Array.from(used, (value) => {
              const match = value.match(pattern);
              return match ? Number(match[1]) : 0;
            }),
          ) + 1;
        for (const row of group
          .filter((candidate) => !candidate.data[schema.identity])
          .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))) {
          while (used.has(generatedCode(schema, next))) next += 1;
          row.data[schema.identity] = generatedCode(schema, next);
          row.updatedAt = row.updatedAt || new Date().toISOString();
          used.add(row.data[schema.identity]);
          await DB.put("records", row);
          next += 1;
        }
      }
    },
    async snapshot(companyId) {
      await Records.backfillGenerated(companyId);
      const rows = await Records.list(companyId);
      const data = {};
      if (IA.Schemas) IA.Schemas.list().forEach((schema) => (data[schema.key] = []));
      rows.forEach((row) => (data[row.type] || (data[row.type] = [])).push(row));
      return { companyId, rows, data };
    },
  };

  const Settings = {
    async get(key, fallback = null) {
      const row = await DB.get("settings", key);
      return row ? row.value : fallback;
    },
    async set(key, value) {
      await DB.put("settings", { id: key, value, updatedAt: new Date().toISOString() });
      return value;
    },
  };

  // Import/export complete browser-held data for manual backup and restore.
  const Backup = {
    async create(companyId = "") {
      const companies = (await Companies.list()).filter(
        (company) => !companyId || company.id === companyId,
      );
      const ids = new Set(companies.map((company) => company.id));
      const records = (await DB.all("records")).filter((row) => ids.has(row.companyId));
      const audits = (await DB.all("audits")).filter((row) => ids.has(row.companyId));
      const payload = {
        product: "Integrated Accounting Platform",
        version: "0.1.4",
        createdAt: new Date().toISOString(),
        data: { companies, records, audits },
      };
      Util.download(
        new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
        `integrated-accounting-backup-${Util.stamp()}.json`,
      );
      return payload;
    },
    async read(file) {
      const payload = JSON.parse(await file.text());
      if (
        payload.product !== "Integrated Accounting Platform" ||
        !payload.data ||
        !Array.isArray(payload.data.companies)
      )
        throw new Error("This is not a valid Integrated Accounting Platform backup.");
      return payload;
    },
    async restore(payload, replace = false) {
      if (replace) for (const store of ["companies", "records", "audits"]) await DB.clear(store);
      const idMap = {};
      for (const company of payload.data.companies) {
        const copy = Object.assign({}, company);
        if (!replace && (await Companies.get(copy.id))) {
          const old = copy.id;
          copy.id = Util.uid("company");
          copy.legalName += " — Restored";
          copy.tradingName += " — Restored";
          copy.companyCode = `${copy.companyCode}-R${Date.now().toString().slice(-4)}`;
          idMap[old] = copy.id;
        }
        await DB.put("companies", copy);
      }
      for (const record of payload.data.records || [])
        await DB.put(
          "records",
          Object.assign({}, record, {
            id: replace ? record.id : Util.uid(record.type),
            companyId: idMap[record.companyId] || record.companyId,
          }),
        );
      for (const audit of payload.data.audits || [])
        await DB.put(
          "audits",
          Object.assign({}, audit, {
            id: replace ? audit.id : Util.uid("audit"),
            companyId: idMap[audit.companyId] || audit.companyId,
          }),
        );
    },
  };

  // Expose only the shared services consumed by the subsequently loaded modules.
  IA.Util = Util;
  IA.DB = DB;
  IA.Audit = Audit;
  IA.Companies = Companies;
  IA.Records = Records;
  IA.Settings = Settings;
  IA.Backup = Backup;
})();
