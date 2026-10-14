/* =========================================================================
   CONTROL FROTA — Controle total, sem surpresas.
   Aplicativo 100% local: roda inteiro no navegador (GitHub Pages),
   sem backend. Todos os dados ficam salvos no localStorage do aparelho.
   Use a tela "Configurações" para fazer backup (exportar/importar JSON).
   Criado por Fabio Castro
   ========================================================================= */

const CONFIG = {
  APP_NAME: "Control Frota",
  APP_SLOGAN: "Controle total, sem surpresas."
};

/* -------------------------------------------------------------------------
   LOGIN DE ADMINISTRADOR
   Trava simples de UI (não é segurança real — o app roda 100% no
   navegador, então qualquer pessoa com acesso ao código-fonte poderia
   contornar isso). Serve para impedir toques acidentais/casuais de
   quem não deveria editar ou excluir dados.
   Para trocar usuário/senha, edite as constantes abaixo.
   ------------------------------------------------------------------------- */
const ADMIN_CREDENTIALS = { user: "fabio", pass: "1042" };

const Auth = {
  isAdmin() { return sessionStorage.getItem("checkcar_admin_session") === "1"; },
  login(user, pass) {
    if ((user || "").trim().toLowerCase() === ADMIN_CREDENTIALS.user.toLowerCase() && (pass || "") === ADMIN_CREDENTIALS.pass) {
      sessionStorage.setItem("checkcar_admin_session", "1");
      return true;
    }
    return false;
  },
  logout() { sessionStorage.removeItem("checkcar_admin_session"); }
};

/* -------------------------------------------------------------------------
   UTILITÁRIOS
   ------------------------------------------------------------------------- */
const Util = {
  uid(prefix) {
    const t = Date.now().toString(36);
    const r = Math.random().toString(36).slice(2, 8);
    return `${prefix ? prefix + "-" : ""}${t}${r}`.toUpperCase();
  },
  todayISO() { return new Date().toISOString().slice(0, 10); },
  nowTime() { return new Date().toTimeString().slice(0, 5); },
  nowStamp() { return new Date().toISOString(); },
  formatDateBR(iso) {
    if (!iso) return "—";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  },
  monthName(m) {
    const names = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    return names[parseInt(m, 10) - 1] || "";
  },
  escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  },
  fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },
  compressImage(dataUrl, maxDim = 1000, quality = 0.66) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round(height * (maxDim / width)); width = maxDim; }
          else { width = Math.round(width * (maxDim / height)); height = maxDim; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  },
  // pede a localização atual do navegador (com permissão do usuário).
  // Resolve com {lat,lng} ou null se não houver permissão/suporte/sinal
  // dentro do tempo limite — nunca trava a captura da foto por causa disso.
  getLocation(timeoutMs = 6000) {
    return new Promise((resolve) => {
      if (!("geolocation" in navigator)) { resolve(null); return; }
      let done = false;
      const finish = (val) => { if (!done) { done = true; resolve(val); } };
      const t = setTimeout(() => finish(null), timeoutMs);
      navigator.geolocation.getCurrentPosition(
        (pos) => { clearTimeout(t); finish({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
        () => { clearTimeout(t); finish(null); },
        { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 120000 }
      );
    });
  },
  // redimensiona/comprime a imagem E desenha um carimbo de data/hora e
  // localização no canto inferior, imitando um app de câmera com timestamp
  // — sem depender de nenhum aplicativo externo.
  stampImage(dataUrl, geo, maxDim = 1100, quality = 0.72) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round(height * (maxDim / width)); width = maxDim; }
          else { width = Math.round(width * (maxDim / height)); height = maxDim; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const now = new Date();
        const dataStr = now.toLocaleDateString("pt-BR");
        const horaStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        const locStr = geo ? `📍 ${geo.lat.toFixed(5)}, ${geo.lng.toFixed(5)}` : "📍 Localização indisponível";

        const barH = Math.max(38, Math.round(height * 0.11));
        ctx.fillStyle = "rgba(11,34,71,0.72)";
        ctx.fillRect(0, height - barH, width, barH);

        const fontSize = Math.max(12, Math.round(barH * 0.3));
        ctx.fillStyle = "#FFFFFF";
        ctx.textBaseline = "middle";
        ctx.font = `bold ${fontSize}px monospace`;
        ctx.fillText(`${dataStr}  ${horaStr}`, 10, height - barH * 0.68);
        ctx.font = `${fontSize - 1}px monospace`;
        ctx.fillStyle = "#F4B400";
        ctx.fillText(locStr, 10, height - barH * 0.28);

        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  },
  // usada apenas para gerar as fotos de demonstração no primeiro uso —
  // não é um "check real", só evita telas de cadastro vazias/quebradas
  placeholderPhoto(label, color) {
    const canvas = document.createElement("canvas");
    canvas.width = 480; canvas.height = 320;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = color || "#1E4D8C";
    ctx.fillRect(0, 0, 480, 320);
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, 460, 300);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, 240, 165);
    ctx.font = "13px monospace";
    ctx.fillText("foto de demonstração", 240, 195);
    return canvas.toDataURL("image/jpeg", 0.7);
  },
  downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  },
  csvEscape(v) {
    const s = String(v === undefined || v === null ? "" : v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  },
  isAndroid() { return /Android/i.test(navigator.userAgent); },
  isIOS() { return /iPhone|iPad|iPod/i.test(navigator.userAgent); }
};

/* -------------------------------------------------------------------------
   ARMAZENAMENTO LOCAL
   ------------------------------------------------------------------------- */
const Store = {
  KEYS: {
    vehicles: "checkcar_vehicles",
    drivers: "checkcar_drivers",
    records: "checkcar_records",
    fuel: "checkcar_fuel",
    maint: "checkcar_maintenance",
    settings: "checkcar_settings",
    seeded: "checkcar_seeded"
  },
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) {
      Toast.show("⚠️ Espaço de armazenamento do aparelho está cheio. Exporte um backup e limpe registros antigos em Configurações.", "err");
      return false;
    }
  }
};

const Settings = {
  get() {
    return Store.get(Store.KEYS.settings, {
      companyName: "Control Frota"
    });
  },
  save(patch) {
    const next = { ...Settings.get(), ...patch };
    Store.set(Store.KEYS.settings, next);
    return next;
  }
};

/* -------------------------------------------------------------------------
   CAMADA DE DADOS
   ------------------------------------------------------------------------- */
const DataService = {
  // ---- Veículos ----
  getVehicles() { return Store.get(Store.KEYS.vehicles, []); },
  getVehicle(id) { return DataService.getVehicles().find(v => v.id === id) || null; },
  saveVehicle(v) {
    const list = DataService.getVehicles();
    if (v.id) {
      const idx = list.findIndex(x => x.id === v.id);
      if (idx >= 0) list[idx] = { ...list[idx], ...v };
    } else {
      v.id = Util.uid("VEI");
      v.criadoEm = Util.nowStamp();
      v.status = v.status || "ativo";
      v.fotosCadastro = v.fotosCadastro || {};
      list.push(v);
    }
    Store.set(Store.KEYS.vehicles, list);
    return v;
  },
  setVehicleStatus(id, status) {
    const list = DataService.getVehicles();
    const v = list.find(x => x.id === id);
    if (v) { v.status = status; Store.set(Store.KEYS.vehicles, list); }
  },
  activeVehicles() { return DataService.getVehicles().filter(v => v.status !== "inativo"); },
  vehicleHasHistory(id) { return DataService.getRecords().some(r => r.veiculoId === id); },
  // exclui de verdade só se nunca foi usado em nenhum checklist; caso
  // contrário, desativa (preserva histórico e relatórios)
  removeOrDeactivateVehicle(id) {
    if (DataService.vehicleHasHistory(id)) {
      DataService.setVehicleStatus(id, "inativo");
      return "desativado";
    }
    const list = DataService.getVehicles().filter(v => v.id !== id);
    Store.set(Store.KEYS.vehicles, list);
    return "excluido";
  },
  // exclusão definitiva mesmo com histórico — usada quando o administrador
  // confirma explicitamente que quer excluir de qualquer forma. Os
  // registros antigos permanecem no histórico, mas passam a referenciar
  // um veículo que não existe mais no cadastro.
  forceDeleteVehicle(id) {
    const list = DataService.getVehicles().filter(v => v.id !== id);
    Store.set(Store.KEYS.vehicles, list);
  },
  vehicleCadastralPhotosComplete(v) {
    const slots = ["frente", "traseira", "lateralEsquerda", "lateralDireita"];
    return slots.every(s => v && v.fotosCadastro && v.fotosCadastro[s]);
  },

  // ---- Motoristas ----
  getDrivers() { return Store.get(Store.KEYS.drivers, []); },
  getDriver(id) { return DataService.getDrivers().find(d => d.id === id) || null; },
  saveDriver(d) {
    const list = DataService.getDrivers();
    if (d.id) {
      const idx = list.findIndex(x => x.id === d.id);
      if (idx >= 0) list[idx] = { ...list[idx], ...d };
    } else {
      d.id = Util.uid("MOT");
      d.criadoEm = Util.nowStamp();
      d.status = d.status || "ativo";
      list.push(d);
    }
    Store.set(Store.KEYS.drivers, list);
    return d;
  },
  setDriverStatus(id, status) {
    const list = DataService.getDrivers();
    const d = list.find(x => x.id === id);
    if (d) { d.status = status; Store.set(Store.KEYS.drivers, list); }
  },
  activeDrivers() { return DataService.getDrivers().filter(d => d.status !== "inativo"); },
  driverHasHistory(id) { return DataService.getRecords().some(r => r.motoristaId === id); },
  removeOrDeactivateDriver(id) {
    if (DataService.driverHasHistory(id)) {
      DataService.setDriverStatus(id, "inativo");
      return "desativado";
    }
    const list = DataService.getDrivers().filter(d => d.id !== id);
    Store.set(Store.KEYS.drivers, list);
    return "excluido";
  },
  forceDeleteDriver(id) {
    const list = DataService.getDrivers().filter(d => d.id !== id);
    Store.set(Store.KEYS.drivers, list);
  },

  // ---- Registros (checklists) ----
  // status: "aberto" (saída registrada, aguardando chegada) | "concluido"
  getRecords() { return Store.get(Store.KEYS.records, []); },
  getRecord(id) { return DataService.getRecords().find(r => r.id === id) || null; },

  isFirstRecordOfDay(vehicleId, dateISO, excludeId) {
    const recs = DataService.getRecords();
    return !recs.some(r => r.veiculoId === vehicleId && r.data === dateISO && r.id !== excludeId);
  },

  getOpenRecordForVehicle(vehicleId) {
    return DataService.getRecords().find(r => r.veiculoId === vehicleId && r.status === "aberto") || null;
  },
  openRecords() { return DataService.getRecords().filter(r => r.status === "aberto"); },

  // cria o registro de SAÍDA (status "aberto" — KM/hora de chegada ainda
  // não são exigidos nesse momento, apenas ao finalizar)
  openRecord(rec) {
    const list = DataService.getRecords();
    rec.id = rec.id || Util.uid("REG");
    rec.criadoEm = Util.nowStamp();
    rec.status = "aberto";
    rec.possuiSinistro = false;
    rec.tipoSinistro = ""; rec.descricaoSinistro = ""; rec.localDano = ""; rec.fotosSinistro = [];
    rec.observacoes = "";
    rec.kmChegada = null; rec.horaChegada = null; rec.kmRodados = null;
    list.unshift(rec);
    Store.set(Store.KEYS.records, list);
    return rec;
  },

  // fecha um registro em aberto, preenchendo os dados de CHEGADA
  finalizeRecord(id, patch) {
    const list = DataService.getRecords();
    const r = list.find(x => x.id === id);
    if (!r) return null;
    Object.assign(r, patch, { status: "concluido", finalizadoEm: Util.nowStamp() });
    Store.set(Store.KEYS.records, list);
    const vehicles = DataService.getVehicles();
    const v = vehicles.find(x => x.id === r.veiculoId);
    if (v && r.kmChegada && (!v.kmAtual || r.kmChegada > v.kmAtual)) {
      v.kmAtual = r.kmChegada;
      Store.set(Store.KEYS.vehicles, vehicles);
    }
    return r;
  },

  deleteRecord(id) {
    const list = DataService.getRecords().filter(r => r.id !== id);
    Store.set(Store.KEYS.records, list);
  },

  monthRecords(year, month) {
    return DataService.getRecords().filter(r => {
      const [y, m] = (r.data || "").split("-");
      return y === String(year) && m === String(month).padStart(2, "0");
    });
  },
  dayRecords(dateISO) {
    return DataService.getRecords().filter(r => r.data === dateISO);
  },
  rangeRecords(startISO, endISO) {
    return DataService.getRecords().filter(r => r.data >= startISO && r.data <= endISO);
  },

  // ---- Abastecimentos ----
  getFuelLogs() { return Store.get(Store.KEYS.fuel, []); },
  getFuelLog(id) { return DataService.getFuelLogs().find(f => f.id === id) || null; },
  saveFuelLog(f) {
    const list = DataService.getFuelLogs();
    if (f.id) {
      const idx = list.findIndex(x => x.id === f.id);
      if (idx >= 0) list[idx] = { ...list[idx], ...f };
    } else {
      f.id = Util.uid("ABT");
      f.criadoEm = Util.nowStamp();
      list.push(f);
    }
    Store.set(Store.KEYS.fuel, list);
    // acompanha o KM atual do veículo também pelos abastecimentos
    const vehicles = DataService.getVehicles();
    const v = vehicles.find(x => x.id === f.veiculoId);
    if (v && f.km && (!v.kmAtual || f.km > v.kmAtual)) { v.kmAtual = f.km; Store.set(Store.KEYS.vehicles, vehicles); }
    return f;
  },
  deleteFuelLog(id) {
    Store.set(Store.KEYS.fuel, DataService.getFuelLogs().filter(f => f.id !== id));
  },
  monthFuelLogs(year, month) {
    return DataService.getFuelLogs().filter(f => {
      const [y, m] = (f.data || "").split("-");
      return y === String(year) && m === String(month).padStart(2, "0");
    });
  },
  // calcula o consumo (km/l) entre abastecimentos consecutivos de um
  // veículo, ordenados por KM. O litro do abastecimento "atual" é o que
  // encheu o tanque para percorrer a distância desde o abastecimento
  // anterior (convenção padrão de cálculo tanque-cheio a tanque-cheio).
  fuelConsumptionIntervals(vehicleId) {
    const logs = DataService.getFuelLogs()
      .filter(f => f.veiculoId === vehicleId)
      .slice()
      .sort((a, b) => (a.km - b.km) || String(a.data).localeCompare(String(b.data)));
    const intervals = [];
    for (let i = 1; i < logs.length; i++) {
      const prev = logs[i - 1], cur = logs[i];
      const kmDiff = cur.km - prev.km;
      if (kmDiff > 0 && cur.litros > 0) {
        intervals.push({ data: cur.data, veiculoId: vehicleId, kmDiff, litros: cur.litros, kmPorLitro: kmDiff / cur.litros });
      }
    }
    return intervals;
  },

  // ---- Manutenções e lembretes ----
  MAINT_LEMBRETE_DIAS: 7,
  MAINT_LEMBRETE_KM: 500,
  getMaintenances() { return Store.get(Store.KEYS.maint, []); },
  getMaintenance(id) { return DataService.getMaintenances().find(m => m.id === id) || null; },
  saveMaintenance(m, opts) {
    const list = DataService.getMaintenances();
    if (m.id) {
      const idx = list.findIndex(x => x.id === m.id);
      if (idx >= 0) {
        const prev = list[idx];
        const merged = { ...prev, ...m };
        if (opts && opts.renew) {
          // "Renovar" sobrescreve a data da última realização; guardamos um
          // histórico para que relatórios de meses passados continuem
          // mostrando as manutenções que foram feitas naquele mês
          const hist = (prev.historico || []).slice();
          if (prev.dataUltima && !hist.some(h => h.data === prev.dataUltima)) hist.push({ data: prev.dataUltima, km: prev.kmUltima ?? null });
          if (merged.dataUltima && !hist.some(h => h.data === merged.dataUltima)) hist.push({ data: merged.dataUltima, km: merged.kmUltima ?? null });
          merged.historico = hist;
        }
        list[idx] = merged;
      }
    } else {
      m.id = Util.uid("MNT");
      m.criadoEm = Util.nowStamp();
      m.status = m.status || "ativo";
      list.push(m);
    }
    Store.set(Store.KEYS.maint, list);
    return m;
  },
  deleteMaintenance(id) {
    Store.set(Store.KEYS.maint, DataService.getMaintenances().filter(m => m.id !== id));
  },
  // retorna, para cada lembrete ativo, se está "vencido", "proximo" (dentro
  // da janela de aviso) ou "em_dia" — comparando com a data de hoje e/ou o
  // KM atual do veículo, o que vencer primeiro
  maintenanceAlertInfo(m) {
    const v = DataService.getVehicle(m.veiculoId);
    const today = Util.todayISO();
    let pior = "em_dia"; // em_dia < proximo < vencido
    let motivos = [];
    if (m.proximaData) {
      const diffDias = Math.round((new Date(m.proximaData) - new Date(today)) / 86400000);
      if (diffDias <= 0) { pior = "vencido"; motivos.push(`data venceu em ${Util.formatDateBR(m.proximaData)}`); }
      else if (diffDias <= DataService.MAINT_LEMBRETE_DIAS) { if (pior !== "vencido") pior = "proximo"; motivos.push(`faltam ${diffDias} dia(s) (${Util.formatDateBR(m.proximaData)})`); }
    }
    if (m.proximoKm && v && v.kmAtual != null) {
      const diffKm = m.proximoKm - v.kmAtual;
      if (diffKm <= 0) { pior = "vencido"; motivos.push(`KM já passou de ${m.proximoKm} (atual ${v.kmAtual})`); }
      else if (diffKm <= DataService.MAINT_LEMBRETE_KM) { if (pior !== "vencido") pior = "proximo"; motivos.push(`faltam ${diffKm} km (limite ${m.proximoKm})`); }
    }
    return { status: pior, motivos, veiculo: v };
  },
  maintenanceAlerts() {
    return DataService.getMaintenances()
      .filter(m => m.status === "ativo")
      .map(m => ({ maintenance: m, ...DataService.maintenanceAlertInfo(m) }))
      .filter(a => a.status !== "em_dia")
      .sort((a, b) => (a.status === b.status ? 0 : a.status === "vencido" ? -1 : 1));
  },

  // ---- Backup / restauração ----
  exportAll() {
    return {
      app: "check-car", versao: 3, exportadoEm: Util.nowStamp(),
      veiculos: DataService.getVehicles(),
      motoristas: DataService.getDrivers(),
      registros: DataService.getRecords(),
      abastecimentos: DataService.getFuelLogs(),
      manutencoes: DataService.getMaintenances(),
      configuracoes: Settings.get()
    };
  },
  importAll(data) {
    if (!data || typeof data !== "object") throw new Error("Arquivo inválido");
    if (data.tipo === "fechamento-mensal") {
      // fechamento mensal: ADICIONA ao que já existe (nunca substitui nem apaga)
      const merge = (key, incoming) => {
        if (!Array.isArray(incoming)) return;
        const cur = Store.get(key, []);
        const ids = new Set(cur.map(x => x.id));
        Store.set(key, cur.concat(incoming.filter(x => !ids.has(x.id))));
      };
      merge(Store.KEYS.records, data.registros);
      merge(Store.KEYS.fuel, data.abastecimentos);
      return;
    }
    if (Array.isArray(data.veiculos)) Store.set(Store.KEYS.vehicles, data.veiculos);
    if (Array.isArray(data.motoristas)) Store.set(Store.KEYS.drivers, data.motoristas);
    if (Array.isArray(data.registros)) Store.set(Store.KEYS.records, data.registros);
    if (Array.isArray(data.abastecimentos)) Store.set(Store.KEYS.fuel, data.abastecimentos);
    if (Array.isArray(data.manutencoes)) Store.set(Store.KEYS.maint, data.manutencoes);
    if (data.configuracoes) Store.set(Store.KEYS.settings, data.configuracoes);
  },
  wipeAll() {
    Object.values(Store.KEYS).forEach(k => localStorage.removeItem(k));
  },

  // ---- Dados de demonstração ----
  seedIfEmpty() {
    if (Store.get(Store.KEYS.seeded, false)) return;
    if (DataService.getVehicles().length === 0) {
      const fotos1 = {
        frente: { dataUrl: Util.placeholderPhoto("FRENTE", "#14315E") },
        traseira: { dataUrl: Util.placeholderPhoto("TRASEIRA", "#1E4D8C") },
        lateralEsquerda: { dataUrl: Util.placeholderPhoto("LATERAL ESQ.", "#0B2247") },
        lateralDireita: { dataUrl: Util.placeholderPhoto("LATERAL DIR.", "#2E5490") }
      };
      DataService.saveVehicle({ marca: "Fiat", modelo: "Strada", ano: "2023", placa: "ABC-1234", cor: "Branco", responsavel: "João da Silva", kmAtual: 23500, observacoes: "", status: "ativo", fotosCadastro: fotos1 });
      DataService.saveVehicle({ marca: "Chevrolet", modelo: "Onix", ano: "2022", placa: "DEF-5678", cor: "Prata", responsavel: "Setor Comercial", kmAtual: 41230, observacoes: "", status: "ativo", fotosCadastro: fotos1 });
    }
    if (DataService.getDrivers().length === 0) {
      DataService.saveDriver({ nome: "João da Silva", identificacao: "", telefone: "", observacoes: "", status: "ativo" });
      DataService.saveDriver({ nome: "Carlos Pereira", identificacao: "", telefone: "", observacoes: "", status: "ativo" });
    }
    Store.set(Store.KEYS.seeded, true);
  }
};

/* ---------------------------------------------------------------------
   TOAST / MODAL
   --------------------------------------------------------------------- */
/* -------------------------------------------------------------------------
   FECHAMENTO MENSAL AUTOMÁTICO
   No ÚLTIMO DIA DO MÊS, ao finalizar o check-out do último veículo em
   aberto, o app gera sozinho o relatório JSON do período (checklists
   finalizados + abastecimentos, com fotos) e baixa o arquivo. Depois,
   com um toque (ou automaticamente, se ligado em Configurações), apaga
   do aparelho o que já foi exportado, liberando o espaço do localStorage.
   - Registros ainda ABERTOS (pendentes) nunca são exportados nem apagados.
   - Veículos, motoristas e manutenções não são apagados.
   - O último abastecimento de cada veículo é mantido, para não quebrar o
     cálculo de consumo médio do mês seguinte.
   - Se o último dia passar sem ninguém finalizar um check-out, o app
     oferece o fechamento ao ser aberto no mês seguinte.
   ------------------------------------------------------------------------- */
const MonthlyClosure = {
  pad(n) { return String(n).padStart(2, "0"); },
  localISO(d) { d = d || new Date(); return `${d.getFullYear()}-${MonthlyClosure.pad(d.getMonth() + 1)}-${MonthlyClosure.pad(d.getDate())}`; },
  isLastDayOfMonth(d) { d = d || new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getDate() === 1; },
  lastDayPrevMonthISO() { const d = new Date(); return MonthlyClosure.localISO(new Date(d.getFullYear(), d.getMonth(), 0)); },

  closableRecords(cutoff) { return DataService.getRecords().filter(r => r.status === "concluido" && r.data && r.data <= cutoff); },
  closableFuel(cutoff) { return DataService.getFuelLogs().filter(f => f.data && f.data <= cutoff); },
  hasPending(cutoff) { return MonthlyClosure.closableRecords(cutoff).length > 0 || MonthlyClosure.closableFuel(cutoff).length > 0; },

  buildPackage(cutoff) {
    const registros = MonthlyClosure.closableRecords(cutoff);
    const abastecimentos = MonthlyClosure.closableFuel(cutoff);
    return {
      app: "check-car", tipo: "fechamento-mensal", versao: 3, exportadoEm: Util.nowStamp(), ate: cutoff,
      resumo: {
        checklists: registros.length,
        kmRodados: registros.reduce((a, r) => a + (Number(r.kmRodados) || 0), 0),
        sinistros: registros.filter(r => r.possuiSinistro).length,
        abastecimentos: abastecimentos.length,
        litros: abastecimentos.reduce((a, f) => a + (Number(f.litros) || 0), 0)
      },
      registros, abastecimentos
    };
  },

  // apaga do aparelho o que já foi exportado (ver regras no cabeçalho)
  purge(cutoff) {
    const recs = DataService.getRecords();
    const keepRecs = recs.filter(r => !(r.status === "concluido" && r.data && r.data <= cutoff));
    Store.set(Store.KEYS.records, keepRecs);

    const fuel = DataService.getFuelLogs();
    const latest = {};
    fuel.forEach(f => {
      const cur = latest[f.veiculoId];
      if (!cur || f.data > cur.data || (f.data === cur.data && (Number(f.km) || 0) >= (Number(cur.km) || 0))) latest[f.veiculoId] = f;
    });
    const keepFuel = fuel.filter(f => !(f.data && f.data <= cutoff) || latest[f.veiculoId] === f);
    Store.set(Store.KEYS.fuel, keepFuel);
    return { registros: recs.length - keepRecs.length, abastecimentos: fuel.length - keepFuel.length };
  },

  markExported(cutoff) { Settings.save({ ultimoFechamento: cutoff }); },

  // gatilho: chamado logo após um check-out ser finalizado
  onCheckout() {
    if (!MonthlyClosure.isLastDayOfMonth()) return;
    const abertos = DataService.openRecords().length;
    if (abertos > 0) {
      Toast.show(`Último dia do mês: o relatório JSON sai quando o último veículo em aberto (${abertos} restante/s) for finalizado.`, "ok");
      return;
    }
    MonthlyClosure.showModal(MonthlyClosure.localISO(), true);
  },

  // gatilho de segurança: o último dia passou sem fechamento
  checkOverdue() {
    if (sessionStorage.getItem("checkcar_closure_snooze") === "1") return;
    const cutoff = MonthlyClosure.lastDayPrevMonthISO();
    const s = Settings.get();
    if (s.ultimoFechamento && s.ultimoFechamento >= cutoff) return;
    if (!MonthlyClosure.hasPending(cutoff)) return;
    MonthlyClosure.showModal(cutoff, false);
  },

  showModal(cutoff, autoDownload) {
    const pkg = MonthlyClosure.buildPackage(cutoff);
    const filename = `controlfrota-fechamento-${cutoff.slice(0, 7)}.json`;
    const json = JSON.stringify(pkg);
    const sizeMb = (new Blob([json]).size / 1048576).toFixed(2);
    const autoPurge = !!Settings.get().limparAutomatico;
    let purged = null;

    const doDownload = () => { Util.downloadFile(filename, json, "application/json"); MonthlyClosure.markExported(cutoff); };
    if (autoDownload) {
      doDownload();
      if (autoPurge) purged = MonthlyClosure.purge(cutoff);
    }

    const canShare = (() => {
      try { return !!(navigator.share && navigator.canShare && navigator.canShare({ files: [new File([json], filename, { type: "application/json" })] })); }
      catch (e) { return false; }
    })();
    const r = pkg.resumo;
    Modal.open(`
      <h2>📦 Fechamento do mês — relatório JSON</h2>
      <p class="text-muted">Dados até ${Util.formatDateBR(cutoff)}</p>
      <div class="summary-list">
        <div class="summary-row"><span class="k">Checklists finalizados</span><span class="v mono">${r.checklists}</span></div>
        <div class="summary-row"><span class="k">KM rodados</span><span class="v mono">${r.kmRodados} km</span></div>
        <div class="summary-row"><span class="k">Sinistros</span><span class="v mono">${r.sinistros}</span></div>
        <div class="summary-row"><span class="k">Abastecimentos</span><span class="v mono">${r.abastecimentos} (${r.litros.toFixed(1)} L)</span></div>
        <div class="summary-row"><span class="k">Arquivo</span><span class="v mono">${sizeMb} MB</span></div>
      </div>
      ${purged
        ? `<div class="notice notice-info">✅ Arquivo baixado e espaço liberado: ${purged.registros} registro(s) e ${purged.abastecimentos} abastecimento(s) removidos deste aparelho. Guarde o arquivo <strong>${filename}</strong> em local seguro.</div>`
        : `<div class="notice notice-info">${autoDownload ? "⬇️ O download do arquivo já foi iniciado. " : ""}Confira que o arquivo foi salvo (Downloads) antes de liberar o espaço do aparelho.</div>`}
      <div class="flex gap-12 mt-16" style="flex-wrap:wrap;">
        ${purged ? "" : `<button class="btn btn-outline" id="fc-download">⬇️ ${autoDownload ? "Baixar de novo" : "Baixar JSON"}</button>`}
        ${canShare && !purged ? `<button class="btn btn-outline" id="fc-share">📤 Compartilhar</button>` : ""}
        ${purged ? "" : `<button class="btn btn-accent" id="fc-purge">✅ Já salvei — liberar espaço</button>`}
        <button class="btn btn-outline" id="fc-later">${purged ? "Fechar" : "Agora não"}</button>
      </div>
    `);

    const byId = (id) => document.getElementById(id);
    if (byId("fc-download")) byId("fc-download").onclick = () => { doDownload(); Toast.show("Download iniciado.", "ok"); };
    if (byId("fc-share")) byId("fc-share").onclick = async () => {
      try {
        const file = new File([json], filename, { type: "application/json" });
        await navigator.share({ files: [file], title: `Control Frota — fechamento ${cutoff.slice(0, 7)}` });
        MonthlyClosure.markExported(cutoff);
      } catch (e) { /* cancelado pelo usuário */ }
    };
    if (byId("fc-purge")) byId("fc-purge").onclick = () => {
      if (!confirm(`Apagar deste aparelho ${r.checklists} checklist(s) finalizado(s) e os abastecimentos até ${Util.formatDateBR(cutoff)}? Faça isso só depois de conferir que o arquivo foi salvo. Registros pendentes, veículos, motoristas e manutenções NÃO são apagados.`)) return;
      MonthlyClosure.markExported(cutoff);
      const res = MonthlyClosure.purge(cutoff);
      Modal.close();
      Toast.show(`Espaço liberado: ${res.registros} registro(s) removido(s).`, "ok");
      Router.navigate("dashboard");
    };
    if (byId("fc-later")) byId("fc-later").onclick = () => { sessionStorage.setItem("checkcar_closure_snooze", "1"); Modal.close(); };
  }
};

const Toast = {
  wrap: null,
  init() {
    Toast.wrap = document.createElement("div");
    Toast.wrap.className = "toast-wrap";
    document.body.appendChild(Toast.wrap);
  },
  show(msg, type) {
    if (!Toast.wrap) Toast.init();
    const el = document.createElement("div");
    el.className = "toast" + (type === "err" ? " err" : type === "ok" ? " ok" : "");
    el.textContent = msg;
    Toast.wrap.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }
};

const Modal = {
  open(innerHtml) {
    const root = document.getElementById("modal-root");
    root.innerHTML = `
      <div class="modal-backdrop" id="modal-backdrop">
        <div class="modal-sheet">
          <button class="modal-close" id="modal-close">✕</button>
          <div>${innerHtml}</div>
        </div>
      </div>`;
    document.getElementById("modal-backdrop").addEventListener("click", (e) => {
      if (e.target.id === "modal-backdrop") Modal.close();
    });
    document.getElementById("modal-close").addEventListener("click", Modal.close);
  },
  close() { document.getElementById("modal-root").innerHTML = ""; }
};

/* ---------------------------------------------------------------------
   LOGIN DE ADMINISTRADOR (UI)
   --------------------------------------------------------------------- */
function openAdminLoginModal(onSuccess) {
  Modal.open(`
    <h2>🔒 Login de administrador</h2>
    <p class="text-sm text-muted">Necessário para editar, desativar ou excluir veículos, motoristas, registros, abastecimentos, manutenções e para importar/apagar dados. Consultar relatórios, fazer checklists e lançar abastecimentos não exige login.</p>
    <form id="admin-login-form" class="form-card">
      <div class="field"><label>Usuário</label><input type="text" name="user" required autocomplete="username" autofocus></div>
      <div class="field"><label>Senha</label><input type="password" name="pass" required autocomplete="current-password"></div>
      <div id="admin-login-error"></div>
      <button type="submit" class="btn btn-primary btn-block">Entrar</button>
    </form>
    <p class="hint mt-16">⚠️ Como o Control Frota roda inteiro no navegador (sem servidor), este login é uma trava de uso simples — não substitui um sistema de autenticação real.</p>
  `);
  $("#admin-login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    if (Auth.login(fd.get("user"), fd.get("pass"))) {
      Modal.close();
      Toast.show("Login de administrador realizado.", "ok");
      updateAdminBadge();
      if (onSuccess) onSuccess();
    } else {
      $("#admin-login-error").innerHTML = `<div class="notice notice-bad">Usuário ou senha inválidos.</div>`;
    }
  });
}

function requireAdmin(action) {
  if (Auth.isAdmin()) { action(); return; }
  openAdminLoginModal(action);
}

function updateAdminBadge() {
  const el = document.getElementById("admin-badge");
  if (!el) return;
  if (Auth.isAdmin()) {
    el.textContent = "🔓";
    el.title = "Administrador conectado — toque para sair";
    el.onclick = () => {
      if (confirm("Sair do modo administrador?")) {
        Auth.logout(); updateAdminBadge();
        Toast.show("Sessão de administrador encerrada.", "ok");
        Router.resolve();
      }
    };
  } else {
    el.textContent = "🔒";
    el.title = "Entrar como administrador";
    el.onclick = () => openAdminLoginModal();
  }
}

/* ---------------------------------------------------------------------
   ROTEADOR
   --------------------------------------------------------------------- */
const Router = {
  routes: {},
  add(path, handler) { Router.routes[path] = handler; },
  start() {
    window.addEventListener("hashchange", Router.resolve);
    Router.resolve();
  },
  navigate(path) {
    // se o hash não mudar (ex.: tocar em "Checklist" de novo durante o
    // próprio assistente), o evento hashchange não dispara sozinho —
    // então resolvemos manualmente para a tela sempre responder ao toque.
    if (window.location.hash.replace(/^#\/?/, "") === path) { Router.resolve(); }
    else { window.location.hash = path; }
  },
  resolve() {
    const hash = window.location.hash.replace(/^#\/?/, "") || "dashboard";
    const [base, ...rest] = hash.split("/");
    const handler = Router.routes[base] || Router.routes["dashboard"];
    Modal.close();
    document.querySelectorAll(".nav-link, .bnav-item").forEach(el => {
      el.classList.toggle("active", el.dataset.nav === base);
    });
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    handler(rest);
  }
};

function view(html) { document.getElementById("app").innerHTML = `<div class="view">${html}</div>`; }
function $(sel, root) { return (root || document).querySelector(sel); }
function $all(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

/* =========================================================================
   CAPTURA DE FOTO — módulo genérico reutilizado em: fotos do cadastro do
   veículo, fotos de água/óleo do checklist e fotos de sinistro.
   Cada chamador passa seu próprio objeto de estado (não é preso ao "W"),
   então várias caixas de foto podem conviver na mesma tela (ex.: as 4
   fotos do cadastro do veículo).

   Toda foto tirada ou importada aqui recebe automaticamente um carimbo
   visual de DATA/HORA e, quando o navegador consegue obter a localização
   (com permissão do usuário), de COORDENADAS — sem depender de nenhum
   app externo de câmera.
   ========================================================================= */
function photoCaptureBoxHtml(state, field, label, icon, required, single, evidenceMode = false) {
  const val = state[field];
  const filled = single ? !!val : (val && val.length > 0);
  const previewHtml = single
    ? (val ? `<img src="${val.dataUrl}" class="photo-preview"><div class="photo-proof">${val.capturadoEm ? `📅 ${new Date(val.capturadoEm).toLocaleString("pt-BR")}` : ""}${val.latitude != null ? ` · 📍 ${Number(val.latitude).toFixed(5)}, ${Number(val.longitude).toFixed(5)}` : " · 📍 Localização indisponível"}${val.hashSha256 ? ` · SHA-256 ${val.hashSha256.slice(0,12)}…` : ""}</div>` : "")
    : (val && val.length ? `<div class="photo-thumbs">${val.map((p, i) => `<div style="position:relative;"><img src="${p.dataUrl}"><button type="button" class="btn btn-ghost" data-remove-photo="${i}" style="position:absolute;top:-6px;right:-6px;background:#DC2626;color:#fff;border-radius:50%;width:20px;height:20px;padding:0;font-size:11px;line-height:1;">✕</button></div>`).join("")}</div>` : "");
  return `
  <div class="photo-box ${filled ? "filled" : ""} ${required && !filled ? "required" : ""}" id="photobox-${field}" data-photo-field="${field}">
    <div style="font-size:26px;">${icon}</div>
    <strong>${label}</strong>
    ${evidenceMode ? `<div class="photo-proof-note">🔐 Evidência: somente câmera · carimbo de data/hora, GPS e hash SHA-256</div>` : ""}
    ${previewHtml}
    <div class="text-sm text-muted" id="photostatus-${field}"></div>
    <div class="photo-actions">
      <label class="btn btn-outline">📷 Câmera<input type="file" accept="image/*" capture="environment" data-photo-input="${field}" hidden ${single ? "" : "multiple"}></label>
      ${evidenceMode ? "" : `<label class="btn btn-outline">🖼️ Galeria<input type="file" accept="image/*" data-photo-input="${field}" hidden ${single ? "" : "multiple"}></label>`}
    </div>
  </div>`;
}

async function sha256Hex(dataUrl) {
  try {
    const bytes = Uint8Array.from(atob(dataUrl.split(",")[1]), c => c.charCodeAt(0));
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
  } catch (e) { return null; }
}

function wirePhotoCapture(state, field, single, label, icon, required, onChange, evidenceMode = false) {
  function bind() {
    const box = document.getElementById(`photobox-${field}`); if (!box) return;
    box.querySelectorAll(`[data-photo-input="${field}"]`).forEach(input => {
      input.onchange = async (e) => {
        const files = Array.from(e.target.files || []); if (!files.length) return;
        const statusEl = document.getElementById(`photostatus-${field}`);
        box.querySelectorAll("input,button").forEach(el => el.disabled = true);
        for (const file of files) {
          if (statusEl) statusEl.textContent = evidenceMode ? "🔐 Capturando evidência: GPS, hora e hash..." : "📍 Obtendo localização e carimbando data/hora...";
          const raw = await Util.fileToDataURL(file);
          const geo = await Util.getLocation();
          const stamped = await Util.stampImage(raw, geo);
          const capturedAt = Util.nowStamp();
          const hash = await sha256Hex(stamped);
          const photo = { dataUrl: stamped, capturadoEm: capturedAt, capturaMetodo: evidenceMode ? "camera" : "camera-ou-galeria", latitude: geo ? geo.lat : null, longitude: geo ? geo.lng : null, hashSha256: hash, idEvidencia: Util.uid("FOTO") };
          if (single) state[field] = photo; else (state[field] = state[field] || []).push(photo);
        }
        e.target.value = ""; refresh();
      };
    });
    box.querySelectorAll(`[data-remove-photo]`).forEach(btn => btn.onclick = () => { state[field].splice(parseInt(btn.dataset.removePhoto, 10), 1); refresh(); });
  }
  function refresh() {
    const box = document.getElementById(`photobox-${field}`); if (!box) return;
    box.outerHTML = photoCaptureBoxHtml(state, field, label, icon, required, single, evidenceMode); bind(); if (onChange) onChange(field);
  }
  bind();
}

/* =========================================================================
   DASHBOARD
   ========================================================================= */
function statusStampHtml(rec) {
  const primary = rec.status === "aberto"
    ? `<span class="stamp stamp-amber">🟡 Pendente</span>`
    : `<span class="stamp stamp-green">🟢 Finalizado</span>`;
  const sinistro = rec.possuiSinistro ? `<span class="stamp stamp-red">⚠️ Sinistro</span>` : "";
  return `<div style="display:flex; flex-direction:column; gap:6px; align-items:flex-end;">${primary}${sinistro}</div>`;
}

function recordCardHtml(r) {
  const veic = `${Util.escapeHtml(r.marca)} ${Util.escapeHtml(r.modelo)}`;
  const chegadaTxt = r.status === "aberto" ? "em andamento" : (r.horaChegada || "—");
  const kmTxt = r.status === "aberto"
    ? `${r.kmPartida ?? "—"} km → aguardando chegada`
    : `${r.kmPartida ?? "—"} km → ${r.kmChegada ?? "—"} km &nbsp;(${r.kmRodados ?? 0} km rodados)`;
  return `
    <div class="record-card" data-open-record="${r.id}">
      <div class="rc-main">
        <div class="rc-title">${Util.formatDateBR(r.data)} · ${veic}</div>
        <div class="rc-sub">${Util.escapeHtml(r.placa)} · ${Util.escapeHtml(r.motoristaNome || "—")} · saída ${r.horaPartida || "—"} → chegada ${chegadaTxt}</div>
        <div class="rc-km mono">${kmTxt}</div>
      </div>
      ${statusStampHtml(r)}
    </div>`;
}

function renderDashboard() {
  const vehicles = DataService.getVehicles();
  const records = DataService.getRecords();
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth() + 1;
  const monthRecs = DataService.monthRecords(y, m);
  const kmMonth = monthRecs.reduce((s, r) => s + (r.kmRodados || 0), 0);
  const sinistros = records.filter(r => r.possuiSinistro).length;
  const abertos = DataService.openRecords().length;
  const aguaCount = records.filter(r => r.primeiroRegistroDia && r.fotoAgua).length;
  const oleoCount = records.filter(r => r.primeiroRegistroDia && r.fotoOleo).length;
  const maintAlerts = DataService.maintenanceAlerts();

  view(`
    <div class="view-header">
      <div><h1>Olá 👋</h1><div class="subtitle">Painel geral da frota</div></div>
      <button class="btn btn-accent fab-new" data-nav="checklist">+ Novo Checklist</button>
    </div>

    <div class="grid grid-stats">
      <div class="stat-card"><div class="icon">🚗</div><div class="value">${vehicles.length}</div><div class="label">Veículos</div></div>
      <div class="stat-card"><div class="icon">📋</div><div class="value">${records.length}</div><div class="label">Checklists</div></div>
      <div class="stat-card"><div class="icon">🟠</div><div class="value">${abertos}</div><div class="label">Em aberto</div></div>
      <div class="stat-card"><div class="icon">⚠️</div><div class="value">${sinistros}</div><div class="label">Sinistros</div></div>
      <div class="stat-card"><div class="icon">🔧</div><div class="value">${maintAlerts.length}</div><div class="label">Manutenções</div></div>
      <div class="stat-card"><div class="icon">🛣️</div><div class="value">${kmMonth}</div><div class="label">KM no mês</div></div>
      <div class="stat-card"><div class="icon">💧</div><div class="value">${aguaCount}</div><div class="label">Água conferida</div></div>
      <div class="stat-card"><div class="icon">🛢️</div><div class="value">${oleoCount}</div><div class="label">Óleo conferido</div></div>
    </div>

    ${maintAlerts.length ? `
    <div class="section-title">🔧 Manutenções e lembretes</div>
    <div class="card scroll-card">
      <div class="scroll-list" id="dash-maint-list">
        ${maintAlerts.map(a => `
          <div class="record-card" data-goto="manutencoes">
            <div class="rc-main">
              <div class="rc-title">${Util.escapeHtml(a.maintenance.tipo === "Outro" ? a.maintenance.tipoOutro : a.maintenance.tipo)} — ${a.veiculo ? `${Util.escapeHtml(a.veiculo.marca)} ${Util.escapeHtml(a.veiculo.modelo)} (${Util.escapeHtml(a.veiculo.placa)})` : "Veículo removido"}</div>
              <div class="rc-sub">${a.motivos.map(Util.escapeHtml).join(" · ")}</div>
            </div>
            ${maintStatusStampHtml(a.status)}
          </div>`).join("")}
      </div>
    </div>` : ""}

    <div class="section-title">Checklists recentes</div>
    <div class="card scroll-card">
      <div class="scroll-head">
        <span class="text-sm text-muted" id="dash-count-label"></span>
        <select id="dash-status-filter" class="status-select">
          <option value="todos">Status: Todos</option>
          <option value="concluido">Finalizados</option>
          <option value="aberto">Pendentes</option>
        </select>
      </div>
      <div class="scroll-list" id="dash-record-list"></div>
    </div>
  `);

  function draw() {
    const filter = $("#dash-status-filter").value;
    let recs = records;
    if (filter === "concluido") recs = recs.filter(r => r.status === "concluido");
    if (filter === "aberto") recs = recs.filter(r => r.status === "aberto");
    $("#dash-count-label").textContent = `${recs.length} registro(s)`;
    $("#dash-record-list").innerHTML = recs.map(recordCardHtml).join("") || `<div class="empty-state"><div class="es-icon">📋</div><p>Nenhum registro com esse filtro.</p></div>`;
  }
  $("#dash-status-filter").addEventListener("change", draw);
  draw();
}

/* =========================================================================
   VEÍCULOS
   ========================================================================= */
function vehiclePhotoSlots() {
  return [
    { key: "frente", label: "Frente", icon: "🚘" },
    { key: "traseira", label: "Traseira", icon: "🚗" },
    { key: "lateralEsquerda", label: "Lateral esquerda", icon: "⬅️" },
    { key: "lateralDireita", label: "Lateral direita", icon: "➡️" }
  ];
}
function cadastroFotosStatusHtml(fotosCadastro) {
  return vehiclePhotoSlots().map(s => {
    const done = !!(fotosCadastro && fotosCadastro[s.key]);
    return `<div>${done ? "🟢" : "🔴"} ${s.label}</div>`;
  }).join("");
}

function renderVehiclesList() {
  const vehicles = DataService.getVehicles();
  const rows = vehicles.map(v => {
    const hasHistory = DataService.vehicleHasHistory(v.id);
    const photosOk = DataService.vehicleCadastralPhotosComplete(v);
    return `
    <div class="pick-tile" style="cursor:default;">
      <div class="avatar">${Util.escapeHtml((v.marca || "?").slice(0, 1))}</div>
      <div style="flex:1;">
        <div class="pt-title">${Util.escapeHtml(v.marca)} ${Util.escapeHtml(v.modelo)} <span class="plate">${Util.escapeHtml(v.placa)}</span> ${hasHistory ? `<span class="history-tag">com histórico</span>` : ""}</div>
        <div class="pt-sub">Responsável: ${Util.escapeHtml(v.responsavel || "—")} · KM atual: ${v.kmAtual ?? "—"} · ${v.status === "inativo" ? "⚪ Inativo" : "🟢 Ativo"}${photosOk ? "" : " · 📷 fotos do cadastro pendentes"}</div>
      </div>
      <div class="flex gap-8" style="flex-wrap:wrap; justify-content:flex-end;">
        <button class="btn btn-ghost" data-edit-vehicle="${v.id}">Editar</button>
        <button class="btn btn-ghost" data-history-vehicle="${v.id}">Histórico</button>
        ${hasHistory
          ? `<button class="btn btn-ghost" data-toggle-vehicle="${v.id}">${v.status === "inativo" ? "Ativar" : "Desativar"}</button>
             <button class="btn btn-danger" data-delete-vehicle="${v.id}" data-has-history="1">Excluir</button>`
          : `<button class="btn btn-danger" data-delete-vehicle="${v.id}">Excluir</button>`}
      </div>
    </div>`;
  }).join("") || `<div class="empty-state"><div class="es-icon">🚗</div><p>Nenhum veículo cadastrado.</p></div>`;

  view(`
    <div class="view-header">
      <div><h1>Veículos</h1><div class="subtitle">${vehicles.length} cadastrado(s)</div></div>
      <button class="btn btn-primary" data-admin-nav="veiculos/novo">+ Novo veículo</button>
    </div>
    <div class="admin-locked-note">🔒 Editar, ativar/desativar e excluir exigem login de administrador. Consultar não exige.</div>
    <div class="pick-grid">${rows}</div>
  `);
}

function renderVehicleForm(id) {
  const v = id ? DataService.getVehicle(id) : null;
  const VF = { fotosCadastro: v ? { ...(v.fotosCadastro || {}) } : {} };
  const slots = vehiclePhotoSlots();
  const gridHtml = slots.map(s => photoCaptureBoxHtml(VF.fotosCadastro, s.key, s.label, s.icon, true, true)).join("");

  view(`
    <div class="view-header"><h1>${v ? "Editar veículo" : "Novo veículo"}</h1></div>
    <form id="vehicle-form" class="card form-card">
      <div class="field-row">
        <div class="field"><label>Marca *</label><input type="text" name="marca" required value="${Util.escapeHtml(v?.marca || "")}"></div>
        <div class="field"><label>Modelo *</label><input type="text" name="modelo" required value="${Util.escapeHtml(v?.modelo || "")}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Ano</label><input type="text" name="ano" value="${Util.escapeHtml(v?.ano || "")}"></div>
        <div class="field"><label>Placa *</label><input type="text" name="placa" required value="${Util.escapeHtml(v?.placa || "")}" style="text-transform:uppercase;"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Cor</label><input type="text" name="cor" value="${Util.escapeHtml(v?.cor || "")}"></div>
        <div class="field"><label>KM atual</label><input type="number" name="kmAtual" min="0" value="${v?.kmAtual ?? ""}"></div>
      </div>
      <div class="field"><label>Responsável</label><input type="text" name="responsavel" value="${Util.escapeHtml(v?.responsavel || "")}"></div>
      <div class="field"><label>Observações</label><textarea name="observacoes" placeholder="Descreva alguma situação, problema ou observação sobre o veículo...">${Util.escapeHtml(v?.observacoes || "")}</textarea></div>

      <div class="section-title">📷 Fotos do cadastro</div>
      <div class="card" style="background:var(--gray-50); box-shadow:none; border:1px solid var(--gray-100);">
        <div id="cadastro-fotos-status" style="display:flex; flex-direction:column; gap:4px; font-size:13px; font-weight:700; margin-bottom:12px;">
          ${cadastroFotosStatusHtml(VF.fotosCadastro)}
        </div>
        <div class="cadastro-fotos" id="cadastro-fotos-grid">${gridHtml}</div>
        <p class="hint">As 4 fotos são obrigatórias para concluir o cadastro. Você pode substituir qualquer uma delas depois, editando o veículo.</p>
      </div>
      <div id="vehicle-photo-error"></div>

      <div class="flex gap-12 mt-16">
        <button type="button" class="btn btn-outline btn-block" data-nav="veiculos">Cancelar</button>
        <button type="submit" class="btn btn-primary btn-block" id="btn-save-vehicle">${v ? "Salvar alterações" : "Cadastrar veículo"}</button>
      </div>
    </form>
  `);

  slots.forEach(s => wirePhotoCapture(VF.fotosCadastro, s.key, true, s.label, s.icon, true, () => {
    $("#cadastro-fotos-status").innerHTML = cadastroFotosStatusHtml(VF.fotosCadastro);
    $("#vehicle-photo-error").innerHTML = "";
  }));

  $("#vehicle-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    if (!data.marca.trim() || !data.modelo.trim() || !data.placa.trim()) {
      Toast.show("Preencha marca, modelo e placa.", "err"); return;
    }
    if (!DataService.vehicleCadastralPhotosComplete(VF)) {
      $("#vehicle-photo-error").innerHTML = `<div class="notice notice-bad">📷 Faltam fotos obrigatórias do cadastro (veja acima quais estão em 🔴). Adicione todas para concluir.</div>`;
      $("#vehicle-photo-error").scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    data.placa = data.placa.trim().toUpperCase();
    data.kmAtual = data.kmAtual ? parseInt(data.kmAtual, 10) : (v?.kmAtual || 0);
    data.fotosCadastro = VF.fotosCadastro;
    if (v) data.id = v.id;
    DataService.saveVehicle(data);
    Toast.show("Veículo salvo com sucesso.", "ok");
    Router.navigate("veiculos");
  });
}

/* =========================================================================
   MOTORISTAS
   ========================================================================= */
function renderDriversList() {
  const drivers = DataService.getDrivers();
  const rows = drivers.map(d => {
    const hasHistory = DataService.driverHasHistory(d.id);
    return `
    <div class="pick-tile" style="cursor:default;">
      <div class="avatar">${Util.escapeHtml((d.nome || "?").slice(0, 1))}</div>
      <div style="flex:1;">
        <div class="pt-title">${Util.escapeHtml(d.nome)} ${hasHistory ? `<span class="history-tag">com histórico</span>` : ""}</div>
        <div class="pt-sub">${Util.escapeHtml(d.telefone || "sem telefone")} · ${d.status === "inativo" ? "⚪ Inativo" : "🟢 Ativo"}</div>
      </div>
      <div class="flex gap-8" style="flex-wrap:wrap; justify-content:flex-end;">
        <button class="btn btn-ghost" data-edit-driver="${d.id}">Editar</button>
        ${hasHistory
          ? `<button class="btn btn-ghost" data-toggle-driver="${d.id}">${d.status === "inativo" ? "Ativar" : "Desativar"}</button>
             <button class="btn btn-danger" data-delete-driver="${d.id}" data-has-history="1">Excluir</button>`
          : `<button class="btn btn-danger" data-delete-driver="${d.id}">Excluir</button>`}
      </div>
    </div>`;
  }).join("") || `<div class="empty-state"><div class="es-icon">🧑‍✈️</div><p>Nenhum motorista cadastrado.</p></div>`;

  view(`
    <div class="view-header">
      <div><h1>Motoristas</h1><div class="subtitle">${drivers.length} cadastrado(s)</div></div>
      <button class="btn btn-primary" data-admin-nav="motoristas/novo">+ Novo motorista</button>
    </div>
    <div class="admin-locked-note">🔒 Editar, ativar/desativar e excluir exigem login de administrador.</div>
    <div class="pick-grid">${rows}</div>
  `);
}

function renderDriverForm(id) {
  const d = id ? DataService.getDriver(id) : null;
  view(`
    <div class="view-header"><h1>${d ? "Editar motorista" : "Novo motorista"}</h1></div>
    <form id="driver-form" class="card form-card">
      <div class="field"><label>Nome *</label><input type="text" name="nome" required value="${Util.escapeHtml(d?.nome || "")}"></div>
      <div class="field-row">
        <div class="field"><label>CPF / identificação</label><input type="text" name="identificacao" value="${Util.escapeHtml(d?.identificacao || "")}"></div>
        <div class="field"><label>Telefone</label><input type="tel" name="telefone" value="${Util.escapeHtml(d?.telefone || "")}"></div>
      </div>
      <div class="field"><label>Observações</label><textarea name="observacoes">${Util.escapeHtml(d?.observacoes || "")}</textarea></div>
      <div class="flex gap-12">
        <button type="button" class="btn btn-outline btn-block" data-nav="motoristas">Cancelar</button>
        <button type="submit" class="btn btn-primary btn-block">Salvar motorista</button>
      </div>
    </form>
  `);

  $("#driver-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    if (!data.nome.trim()) { Toast.show("Informe o nome do motorista.", "err"); return; }
    if (d) data.id = d.id;
    DataService.saveDriver(data);
    Toast.show("Motorista salvo com sucesso.", "ok");
    Router.navigate("motoristas");
  });
}

/* =========================================================================
   NOVO CHECKLIST — SAÍDA (assistente em etapas)
   A partir desta versão, a chegada (KM final/horário) NÃO é mais exigida
   no momento da saída: o registro é salvo como "aberto" e deve ser
   finalizado depois (mesmo dia). Enquanto houver um registro aberto para
   um veículo, não é possível iniciar um novo checklist para ele.
   ========================================================================= */
let W = null; // estado do assistente de SAÍDA

function resetWizard() {
  W = {
    veiculoId: null, veiculo: null,
    motoristaId: null, motorista: null,
    data: Util.todayISO(),
    kmPartida: "", horaPartida: Util.nowTime(),
    isFirst: true,
    fotoAgua: null, fotoOleo: null,
    step: "veiculo",
    savedId: null
  };
}

function wizardSteps() {
  const steps = ["veiculo", "motorista", "kmhorario"];
  if (W.isFirst) steps.push("fotos");
  steps.push("confirmar");
  return steps;
}

function wizardProgressHtml() {
  const steps = wizardSteps();
  const idx = steps.indexOf(W.step);
  return `<div class="wizard-steps">${steps.map((s, i) =>
    `<div class="ws-dot ${i < idx ? "done" : ""} ${i === idx ? "active" : ""}"></div>`).join("")}</div>`;
}

function goWizardStep(step) { W.step = step; renderChecklist(); }
function wizardNextFrom(current) {
  const steps = wizardSteps();
  goWizardStep(steps[steps.indexOf(current) + 1]);
}
function wizardBackFrom(current) {
  const steps = wizardSteps();
  const idx = steps.indexOf(current);
  if (idx <= 0) { Router.navigate("dashboard"); return; }
  goWizardStep(steps[idx - 1]);
}

function renderChecklist() {
  if (!W) resetWizard();
  const step = W.step;
  if (step === "veiculo") return renderStepVeiculo();
  if (step === "motorista") return renderStepMotorista();
  if (step === "kmhorario") return renderStepKmHorario();
  if (step === "fotos") return renderStepFotos();
  if (step === "confirmar") return renderStepConfirmar();
  if (step === "sucesso") return renderStepSucesso();
}

/* ---- Passo 1: veículo (bloqueia se já houver saída em aberto) ---- */
function renderStepVeiculo() {
  const vehicles = DataService.activeVehicles();
  const tiles = vehicles.map(v => `
    <button type="button" class="pick-tile" data-pick-vehicle="${v.id}">
      <div class="avatar">${Util.escapeHtml((v.marca||"?").slice(0,1))}</div>
      <div style="flex:1;">
        <div class="pt-title">${Util.escapeHtml(v.marca)} ${Util.escapeHtml(v.modelo)} <span class="plate">${Util.escapeHtml(v.placa)}</span></div>
        <div class="pt-sub">Responsável: ${Util.escapeHtml(v.responsavel || "—")} · KM atual: ${v.kmAtual ?? "—"}</div>
      </div>
    </button>`).join("") || `<div class="empty-state"><div class="es-icon">🚗</div><p>Nenhum veículo ativo. Cadastre um veículo primeiro.</p></div>`;

  view(`
    <div class="view-header"><h1>Novo Checklist</h1><div class="subtitle">Etapa 1 de ${wizardSteps().length} · Selecione o veículo</div></div>
    ${wizardProgressHtml()}
    <div class="pick-grid">${tiles}</div>
  `);
  $all("[data-pick-vehicle]").forEach(btn => btn.addEventListener("click", () => {
    const v = DataService.getVehicle(btn.dataset.pickVehicle);
    const open = DataService.getOpenRecordForVehicle(v.id);
    if (open) { renderVehicleBlockedScreen(v, open); return; }
    W.veiculoId = v.id; W.veiculo = v;
    W.isFirst = DataService.isFirstRecordOfDay(v.id, W.data);
    goWizardStep("motorista");
  }));
}

function renderVehicleBlockedScreen(v, openRec) {
  view(`
    <div class="view-header"><h1>Novo Checklist</h1></div>
    <div class="notice notice-bad">⚠️ Este veículo já tem uma saída em aberto. Finalize-a (informe KM/horário de chegada) antes de iniciar um novo checklist.</div>
    <div class="card summary-list">
      <div class="summary-row"><span class="k">Veículo</span><span class="v">${Util.escapeHtml(v.marca)} ${Util.escapeHtml(v.modelo)} (${Util.escapeHtml(v.placa)})</span></div>
      <div class="summary-row"><span class="k">Motorista</span><span class="v">${Util.escapeHtml(openRec.motoristaNome)}</span></div>
      <div class="summary-row"><span class="k">Saída</span><span class="v mono">${Util.formatDateBR(openRec.data)} às ${openRec.horaPartida} — ${openRec.kmPartida} km</span></div>
    </div>
    <div class="wizard-nav">
      <button class="btn btn-outline" id="btn-outro-veiculo">Escolher outro veículo</button>
      <button class="btn btn-accent" id="btn-finalizar-agora">Finalizar este registro</button>
    </div>
  `);
  $("#btn-outro-veiculo").addEventListener("click", () => renderStepVeiculo());
  $("#btn-finalizar-agora").addEventListener("click", () => Router.navigate(`finalizar/${openRec.id}`));
}

/* ---- Passo 2: motorista (obrigatório) ---- */
function renderStepMotorista() {
  const drivers = DataService.activeDrivers();
  const tiles = drivers.map(d => `
    <button type="button" class="pick-tile" data-pick-driver="${d.id}">
      <div class="avatar">${Util.escapeHtml((d.nome||"?").slice(0,1))}</div>
      <div style="flex:1;"><div class="pt-title">${Util.escapeHtml(d.nome)}</div><div class="pt-sub">${Util.escapeHtml(d.telefone || "")}</div></div>
    </button>`).join("") || `<div class="empty-state"><div class="es-icon">🧑‍✈️</div><p>Nenhum motorista ativo. Cadastre um motorista primeiro.</p></div>`;

  view(`
    <div class="view-header"><h1>Novo Checklist</h1><div class="subtitle">Etapa 2 de ${wizardSteps().length} · Selecione o motorista (obrigatório)</div></div>
    ${wizardProgressHtml()}
    <div class="card" style="margin-bottom:14px;"><strong>Veículo:</strong> ${Util.escapeHtml(W.veiculo.marca)} ${Util.escapeHtml(W.veiculo.modelo)} — ${Util.escapeHtml(W.veiculo.placa)}</div>
    <div class="pick-grid">${tiles}</div>
    <div class="wizard-nav"><button class="btn btn-outline" id="wz-back">Voltar</button></div>
  `);
  $all("[data-pick-driver]").forEach(btn => btn.addEventListener("click", () => {
    const d = DataService.getDriver(btn.dataset.pickDriver);
    W.motoristaId = d.id; W.motorista = d;
    goWizardStep("kmhorario");
  }));
  $("#wz-back").addEventListener("click", () => wizardBackFrom("motorista"));
}

/* ---- Passo 3: data / KM e horário de PARTIDA (chegada fica para depois) ---- */
function renderStepKmHorario() {
  view(`
    <div class="view-header"><h1>Novo Checklist</h1><div class="subtitle">Etapa 3 de ${wizardSteps().length} · Saída</div></div>
    ${wizardProgressHtml()}
    <div class="notice notice-info">ℹ️ A chegada (KM final e horário) será informada depois, ao finalizar este checklist — não precisa saber agora.</div>
    <form id="km-form" class="card form-card">
      <div class="field"><label>Data</label><input type="date" name="data" value="${W.data}"></div>
      <div class="field-row">
        <div class="field"><label>KM de partida *</label><input type="number" name="kmPartida" min="0" required value="${W.kmPartida}"></div>
        <div class="field"><label>Horário de partida *</label><input type="time" name="horaPartida" required value="${W.horaPartida}"></div>
      </div>
      <div id="km-error"></div>
      <div class="wizard-nav">
        <button type="button" class="btn btn-outline" id="wz-back">Voltar</button>
        <button type="submit" class="btn btn-primary">Continuar</button>
      </div>
    </form>
  `);

  const form = $("#km-form");
  form.data.addEventListener("change", () => {
    W.data = form.data.value;
    W.isFirst = DataService.isFirstRecordOfDay(W.veiculoId, W.data);
  });

  $("#wz-back").addEventListener("click", () => wizardBackFrom("kmhorario"));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const kmPartida = parseInt(form.kmPartida.value, 10);
    const horaPartida = form.horaPartida.value;
    $("#km-error").innerHTML = "";
    if (!form.data.value || isNaN(kmPartida) || !horaPartida) {
      $("#km-error").innerHTML = `<div class="notice notice-bad">⚠️ Preencha todos os campos obrigatórios.</div>`; return;
    }
    if (!W.motoristaId) {
      Toast.show("Selecione o motorista antes de continuar.", "err");
      goWizardStep("motorista");
      return;
    }
    W.data = form.data.value;
    W.kmPartida = kmPartida; W.horaPartida = horaPartida;
    W.isFirst = DataService.isFirstRecordOfDay(W.veiculoId, W.data);
    wizardNextFrom("kmhorario");
  });
}

/* ---- Passo 4: fotos de água e óleo (apenas 1º registro do dia) ---- */
function renderStepFotos() {
  view(`
    <div class="view-header"><h1>Novo Checklist</h1><div class="subtitle">Etapa · Conferência do primeiro registro do dia</div></div>
    ${wizardProgressHtml()}
    <div class="notice notice-warn">📷 Primeiro registro do dia: as fotos da água e do óleo são obrigatórias.</div>
    ${photoCaptureBoxHtml(W, "fotoAgua", "Nível da água", "💧", true, true, true)}
    <div style="height:14px;"></div>
    ${photoCaptureBoxHtml(W, "fotoOleo", "Nível do óleo", "🛢️", true, true, true)}
    <div id="fotos-error"></div>
    <div class="wizard-nav">
      <button type="button" class="btn btn-outline" id="wz-back">Voltar</button>
      <button type="button" class="btn btn-primary" id="wz-next">Continuar</button>
    </div>
  `);
  wirePhotoCapture(W, "fotoAgua", true, "Nível da água", "💧", true, () => { $("#fotos-error").innerHTML = ""; }, true);
  wirePhotoCapture(W, "fotoOleo", true, "Nível do óleo", "🛢️", true, () => { $("#fotos-error").innerHTML = ""; }, true);
  $("#wz-back").addEventListener("click", () => wizardBackFrom("fotos"));
  $("#wz-next").addEventListener("click", () => {
    if (!W.fotoAgua || !W.fotoOleo) {
      $("#fotos-error").innerHTML = `<div class="notice notice-bad">⚠️ Adicione as duas fotografias (água e óleo) para continuar.</div>`;
      return;
    }
    wizardNextFrom("fotos");
  });
}

/* ---- Passo 5: confirmar SAÍDA ---- */
function renderStepConfirmar() {
  view(`
    <div class="view-header"><h1>Confira a saída</h1></div>
    ${wizardProgressHtml()}
    <div class="card summary-list">
      <div class="summary-row"><span class="k">Veículo</span><span class="v">${Util.escapeHtml(W.veiculo.marca)} ${Util.escapeHtml(W.veiculo.modelo)}</span></div>
      <div class="summary-row"><span class="k">Placa</span><span class="v mono">${Util.escapeHtml(W.veiculo.placa)}</span></div>
      <div class="summary-row"><span class="k">Motorista</span><span class="v">${Util.escapeHtml(W.motorista.nome)}</span></div>
      <div class="summary-row"><span class="k">Data</span><span class="v">${Util.formatDateBR(W.data)}</span></div>
      <div class="summary-row"><span class="k">KM de partida</span><span class="v mono">${W.kmPartida}</span></div>
      <div class="summary-row"><span class="k">Horário de partida</span><span class="v mono">${W.horaPartida}</span></div>
      <div class="summary-row"><span class="k">Água</span><span class="v">${W.isFirst ? (W.fotoAgua ? "✅ Fotografia registrada" : "❌ Sem foto") : "— não exigida hoje"}</span></div>
      <div class="summary-row"><span class="k">Óleo</span><span class="v">${W.isFirst ? (W.fotoOleo ? "✅ Fotografia registrada" : "❌ Sem foto") : "— não exigida hoje"}</span></div>
      <div class="summary-row"><span class="k">Chegada</span><span class="v">Será informada ao finalizar</span></div>
    </div>
    <div class="wizard-nav">
      <button type="button" class="btn btn-outline" id="wz-back">Voltar</button>
      <button type="button" class="btn btn-accent" id="wz-save">REGISTRAR SAÍDA</button>
    </div>
  `);
  $("#wz-back").addEventListener("click", () => wizardBackFrom("confirmar"));
  $("#wz-save").addEventListener("click", () => {
    if (!W.motoristaId) { Toast.show("Selecione o motorista antes de salvar.", "err"); goWizardStep("motorista"); return; }
    const rec = {
      data: W.data,
      horaRegistro: Util.nowTime(),
      veiculoId: W.veiculo.id, marca: W.veiculo.marca, modelo: W.veiculo.modelo, placa: W.veiculo.placa, responsavel: W.veiculo.responsavel,
      motoristaId: W.motorista.id, motoristaNome: W.motorista.nome,
      kmPartida: W.kmPartida, horaPartida: W.horaPartida,
      primeiroRegistroDia: W.isFirst,
      fotoAgua: W.isFirst ? W.fotoAgua : null, fotoOleo: W.isFirst ? W.fotoOleo : null
    };
    const saved = DataService.openRecord(rec);
    W.savedId = saved.id;
    W.step = "sucesso";
    renderChecklist();
  });
}

/* ---- Passo 6: sucesso da saída ---- */
function renderStepSucesso() {
  const r = DataService.getRecord(W.savedId);
  view(`
    <div class="success-screen">
      <div class="success-badge">✅</div>
      <h1>Saída registrada!</h1>
      <p class="text-muted">Registro Nº <span class="mono">${r.id}</span> — status: <strong>pendente de finalização</strong></p>
      <div class="card summary-list" style="text-align:left; max-width:420px; margin:20px auto;">
        <div class="summary-row"><span class="k">Veículo</span><span class="v">${Util.escapeHtml(r.marca)} ${Util.escapeHtml(r.modelo)}</span></div>
        <div class="summary-row"><span class="k">Motorista</span><span class="v">${Util.escapeHtml(r.motoristaNome)}</span></div>
        <div class="summary-row"><span class="k">Data</span><span class="v">${Util.formatDateBR(r.data)}</span></div>
        <div class="summary-row"><span class="k">Saída</span><span class="v mono">${r.horaPartida} — ${r.kmPartida} km</span></div>
      </div>
      <div class="flex gap-12" style="max-width:420px; margin:0 auto; flex-wrap:wrap; justify-content:center;">
        <button class="btn btn-accent" id="btn-finalize-now">Finalizar agora (chegada)</button>
        <button class="btn btn-primary" id="btn-new-record">Novo checklist</button>
        <button class="btn btn-outline" data-nav="dashboard">Voltar ao início</button>
      </div>
    </div>
  `);
  $("#btn-finalize-now").addEventListener("click", () => Router.navigate(`finalizar/${r.id}`));
  $("#btn-new-record").addEventListener("click", () => { resetWizard(); renderChecklist(); });
}

/* =========================================================================
   FINALIZAR CHECKLIST — CHEGADA (segundo assistente, separado do de saída)
   ========================================================================= */
let FW = null; // estado do assistente de CHEGADA/FINALIZAÇÃO

function startFinalizeWizard(recordId) {
  const rec = DataService.getRecord(recordId);
  if (!rec) { Toast.show("Registro não encontrado.", "err"); Router.navigate("pendencias"); return; }
  if (rec.status !== "aberto") { Toast.show("Este registro já foi finalizado.", "ok"); Router.navigate("historico"); return; }
  FW = {
    recordId: rec.id, record: rec,
    kmChegada: "", horaChegada: Util.nowTime(),
    possuiSinistro: null, tipoSinistro: "", descricaoSinistro: "", localDano: "", fotosSinistro: [],
    observacoes: "",
    step: "kmchegada"
  };
  renderFinalize();
}

function fwSteps() {
  const steps = ["kmchegada", "sinistro"];
  if (FW.possuiSinistro) steps.push("sinistroForm");
  steps.push("observacoes", "confirmar");
  return steps;
}
function fwProgressHtml() {
  const steps = fwSteps();
  const idx = steps.indexOf(FW.step);
  return `<div class="wizard-steps">${steps.map((s, i) =>
    `<div class="ws-dot ${i < idx ? "done" : ""} ${i === idx ? "active" : ""}"></div>`).join("")}</div>`;
}
function fwGo(step) { FW.step = step; renderFinalize(); }
function fwNextFrom(current) { const s = fwSteps(); fwGo(s[s.indexOf(current) + 1]); }
function fwBackFrom(current) {
  const s = fwSteps(); const idx = s.indexOf(current);
  if (idx <= 0) { Router.navigate("pendencias"); return; }
  fwGo(s[idx - 1]);
}

function renderFinalize() {
  if (!FW) { Router.navigate("pendencias"); return; }
  const step = FW.step;
  if (step === "kmchegada") return renderFwKmChegada();
  if (step === "sinistro") return renderFwSinistro();
  if (step === "sinistroForm") return renderFwSinistroForm();
  if (step === "observacoes") return renderFwObservacoes();
  if (step === "confirmar") return renderFwConfirmar();
  if (step === "sucesso") return renderFwSucesso();
}

function renderFwKmChegada() {
  const r = FW.record;
  view(`
    <div class="view-header"><h1>Finalizar checklist</h1><div class="subtitle">Etapa 1 de ${fwSteps().length} · Chegada</div></div>
    ${fwProgressHtml()}
    <div class="card" style="margin-bottom:14px;">
      <strong>${Util.escapeHtml(r.marca)} ${Util.escapeHtml(r.modelo)} — ${Util.escapeHtml(r.placa)}</strong>
      <div class="text-sm text-muted mt-8">Motorista: ${Util.escapeHtml(r.motoristaNome)} · Saída: ${r.horaPartida} — ${r.kmPartida} km (${Util.formatDateBR(r.data)})</div>
    </div>
    <form id="fw-km-form" class="card form-card">
      <div class="field-row">
        <div class="field"><label>KM de chegada *</label><input type="number" name="kmChegada" min="0" required value="${FW.kmChegada}"></div>
        <div class="field"><label>Horário de chegada *</label><input type="time" name="horaChegada" required value="${FW.horaChegada}"></div>
      </div>
      <div class="km-result"><div class="km-value mono" id="fw-km-live">0 km</div><div class="km-label">KM percorridos</div></div>
      <div id="fw-km-error"></div>
      <div class="wizard-nav">
        <button type="button" class="btn btn-outline" id="fw-back">Voltar</button>
        <button type="submit" class="btn btn-primary">Continuar</button>
      </div>
    </form>
  `);
  const form = $("#fw-km-form");
  const liveKm = () => {
    const c = parseInt(form.kmChegada.value || 0, 10);
    const km = c - r.kmPartida;
    $("#fw-km-live").textContent = (isFinite(km) && km >= 0 ? km : 0) + " km";
  };
  form.kmChegada.addEventListener("input", liveKm);
  liveKm();
  $("#fw-back").addEventListener("click", () => fwBackFrom("kmchegada"));
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const kmChegada = parseInt(form.kmChegada.value, 10);
    const horaChegada = form.horaChegada.value;
    $("#fw-km-error").innerHTML = "";
    if (isNaN(kmChegada) || !horaChegada) {
      $("#fw-km-error").innerHTML = `<div class="notice notice-bad">⚠️ Preencha o KM e o horário de chegada.</div>`; return;
    }
    if (kmChegada < r.kmPartida) {
      $("#fw-km-error").innerHTML = `<div class="notice notice-bad">⚠️ O KM final não pode ser menor que o KM de partida (${r.kmPartida}).</div>`; return;
    }
    FW.kmChegada = kmChegada; FW.horaChegada = horaChegada;
    fwNextFrom("kmchegada");
  });
}

function renderFwSinistro() {
  view(`
    <div class="view-header"><h1>Finalizar checklist</h1><div class="subtitle">Etapa · Danos / Sinistros</div></div>
    ${fwProgressHtml()}
    <div class="card">
      <p><strong>Foi identificado algum dano, problema ou sinistro durante o uso?</strong></p>
      <div class="choice-group">
        <button type="button" class="choice-btn ${FW.possuiSinistro === false ? "selected" : ""}" data-sinistro="nao">Não</button>
        <button type="button" class="choice-btn ${FW.possuiSinistro === true ? "selected danger" : ""}" data-sinistro="sim">Sim</button>
      </div>
    </div>
    <div class="wizard-nav">
      <button type="button" class="btn btn-outline" id="fw-back">Voltar</button>
      <button type="button" class="btn btn-primary" id="fw-next" ${FW.possuiSinistro === null ? "disabled" : ""}>Continuar</button>
    </div>
  `);
  $all("[data-sinistro]").forEach(btn => btn.addEventListener("click", () => {
    FW.possuiSinistro = btn.dataset.sinistro === "sim";
    if (!FW.possuiSinistro) { FW.tipoSinistro = ""; FW.descricaoSinistro = ""; FW.localDano = ""; FW.fotosSinistro = []; }
    renderFwSinistro();
  }));
  $("#fw-back").addEventListener("click", () => fwBackFrom("sinistro"));
  $("#fw-next").addEventListener("click", () => fwNextFrom("sinistro"));
}

const TIPOS_SINISTRO = ["Batida","Arranhão","Avaria","Pneu","Mecânica","Elétrica","Vidro","Lataria","Outro"];

function renderFwSinistroForm() {
  view(`
    <div class="view-header"><h1>Finalizar checklist</h1><div class="subtitle">Etapa · Detalhes da ocorrência</div></div>
    ${fwProgressHtml()}
    <div class="notice notice-bad">⚠️ Foi informado um sinistro. Adicione pelo menos uma fotografia da ocorrência.</div>
    <form id="fw-sinistro-form" class="card form-card">
      <div class="field">
        <label>Tipo da ocorrência *</label>
        <select name="tipoSinistro" required>
          <option value="">Selecione...</option>
          ${TIPOS_SINISTRO.map(t => `<option value="${t}" ${FW.tipoSinistro === t ? "selected" : ""}>${t}</option>`).join("")}
        </select>
      </div>
      <div class="field"><label>Local do dano no veículo</label><input type="text" name="localDano" value="${Util.escapeHtml(FW.localDano)}" placeholder="Ex.: para-choque dianteiro"></div>
      <div class="field"><label>Descrição *</label><textarea name="descricaoSinistro" required placeholder="Descreva o que aconteceu...">${Util.escapeHtml(FW.descricaoSinistro)}</textarea></div>
      <div class="field"><label>Fotografias da ocorrência *</label></div>
      ${photoCaptureBoxHtml(FW, "fotosSinistro", "Fotos do sinistro", "⚠️", true, false, true)}
      <div id="fw-sinistro-error"></div>
      <div class="wizard-nav">
        <button type="button" class="btn btn-outline" id="fw-back">Voltar</button>
        <button type="submit" class="btn btn-primary">Continuar</button>
      </div>
    </form>
  `);
  wirePhotoCapture(FW, "fotosSinistro", false, "Fotos do sinistro", "⚠️", true, () => { $("#fw-sinistro-error").innerHTML = ""; }, true);
  $("#fw-back").addEventListener("click", () => fwBackFrom("sinistroForm"));
  $("#fw-sinistro-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    if (!data.tipoSinistro || !data.descricaoSinistro.trim()) {
      $("#fw-sinistro-error").innerHTML = `<div class="notice notice-bad">⚠️ Preencha o tipo e a descrição da ocorrência.</div>`; return;
    }
    if (!FW.fotosSinistro || FW.fotosSinistro.length === 0) {
      $("#fw-sinistro-error").innerHTML = `<div class="notice notice-bad">⚠️ Adicione pelo menos uma fotografia do sinistro.</div>`; return;
    }
    FW.tipoSinistro = data.tipoSinistro; FW.descricaoSinistro = data.descricaoSinistro; FW.localDano = data.localDano;
    fwNextFrom("sinistroForm");
  });
}

function renderFwObservacoes() {
  view(`
    <div class="view-header"><h1>Finalizar checklist</h1><div class="subtitle">Etapa · Observações</div></div>
    ${fwProgressHtml()}
    <form id="fw-obs-form" class="card form-card">
      <div class="field">
        <label>Observações</label>
        <textarea name="observacoes" placeholder="Descreva alguma situação, problema ou observação sobre o veículo... (pneu murcho, luz do painel acesa, sujeira, combustível baixo, barulho diferente...)">${Util.escapeHtml(FW.observacoes)}</textarea>
      </div>
      <div class="wizard-nav">
        <button type="button" class="btn btn-outline" id="fw-back">Voltar</button>
        <button type="submit" class="btn btn-primary">Revisar e concluir</button>
      </div>
    </form>
  `);
  $("#fw-back").addEventListener("click", () => fwBackFrom("observacoes"));
  $("#fw-obs-form").addEventListener("submit", (e) => {
    e.preventDefault();
    FW.observacoes = new FormData(e.target).get("observacoes") || "";
    fwNextFrom("observacoes");
  });
}

function renderFwConfirmar() {
  const r = FW.record;
  view(`
    <div class="view-header"><h1>Confira a chegada</h1></div>
    ${fwProgressHtml()}
    <div class="card summary-list">
      <div class="summary-row"><span class="k">Veículo</span><span class="v">${Util.escapeHtml(r.marca)} ${Util.escapeHtml(r.modelo)}</span></div>
      <div class="summary-row"><span class="k">Motorista</span><span class="v">${Util.escapeHtml(r.motoristaNome)}</span></div>
      <div class="summary-row"><span class="k">KM partida → chegada</span><span class="v mono">${r.kmPartida} → ${FW.kmChegada}</span></div>
      <div class="summary-row"><span class="k">KM rodados</span><span class="v mono">${FW.kmChegada - r.kmPartida} km</span></div>
      <div class="summary-row"><span class="k">Horário</span><span class="v mono">${r.horaPartida} → ${FW.horaChegada}</span></div>
      <div class="summary-row"><span class="k">Sinistro</span><span class="v">${FW.possuiSinistro ? `⚠️ Sim — ${Util.escapeHtml(FW.tipoSinistro)} (${FW.fotosSinistro.length} foto/s)` : "❌ Não"}</span></div>
      <div class="summary-row"><span class="k">Observações</span><span class="v">${Util.escapeHtml(FW.observacoes) || "—"}</span></div>
    </div>
    <div class="wizard-nav">
      <button type="button" class="btn btn-outline" id="fw-back">Voltar</button>
      <button type="button" class="btn btn-accent" id="fw-save">CONFIRMAR E FINALIZAR</button>
    </div>
  `);
  $("#fw-back").addEventListener("click", () => fwBackFrom("confirmar"));
  $("#fw-save").addEventListener("click", () => {
    DataService.finalizeRecord(FW.recordId, {
      kmChegada: FW.kmChegada, horaChegada: FW.horaChegada, kmRodados: FW.kmChegada - FW.record.kmPartida,
      possuiSinistro: !!FW.possuiSinistro, tipoSinistro: FW.tipoSinistro, descricaoSinistro: FW.descricaoSinistro,
      localDano: FW.localDano, fotosSinistro: FW.fotosSinistro, observacoes: FW.observacoes
    });
    FW.step = "sucesso";
    renderFinalize();
    MonthlyClosure.onCheckout();
  });
}

function renderFwSucesso() {
  const r = DataService.getRecord(FW.recordId);
  view(`
    <div class="success-screen">
      <div class="success-badge">✅</div>
      <h1>Checklist finalizado!</h1>
      <p class="text-muted">Registro Nº <span class="mono">${r.id}</span></p>
      <div class="card summary-list" style="text-align:left; max-width:420px; margin:20px auto;">
        <div class="summary-row"><span class="k">Veículo</span><span class="v">${Util.escapeHtml(r.marca)} ${Util.escapeHtml(r.modelo)}</span></div>
        <div class="summary-row"><span class="k">Motorista</span><span class="v">${Util.escapeHtml(r.motoristaNome)}</span></div>
        <div class="summary-row"><span class="k">KM rodados</span><span class="v mono">${r.kmRodados} km</span></div>
      </div>
      <div class="flex gap-12" style="max-width:420px; margin:0 auto; flex-wrap:wrap; justify-content:center;">
        <button class="btn btn-primary" data-nav="checklist">Novo checklist</button>
        <button class="btn btn-outline" data-nav="historico">Ver histórico</button>
        <button class="btn btn-outline" data-nav="dashboard">Voltar ao início</button>
      </div>
    </div>
  `);
}

/* =========================================================================
   DETALHE DE UM REGISTRO (modal)
   ========================================================================= */
function openRecordModal(id) {
  const r = DataService.getRecord(id);
  if (!r) return;
  const photos = [];
  if (r.fotoAgua) photos.push(["💧 Água", r.fotoAgua]);
  if (r.fotoOleo) photos.push(["🛢️ Óleo", r.fotoOleo]);
  (r.fotosSinistro || []).forEach((p, i) => photos.push([`⚠️ Sinistro ${i + 1}`, p]));

  Modal.open(`
    <h2>${Util.escapeHtml(r.marca)} ${Util.escapeHtml(r.modelo)} <span class="plate">${Util.escapeHtml(r.placa)}</span></h2>
    <p class="text-muted">${Util.formatDateBR(r.data)} · Registro ${r.id} · ${r.status === "aberto" ? "🟡 Pendente" : "🟢 Finalizado"}</p>
    <div class="summary-list">
      <div class="summary-row"><span class="k">Motorista</span><span class="v">${Util.escapeHtml(r.motoristaNome)}</span></div>
      <div class="summary-row"><span class="k">Responsável do veículo</span><span class="v">${Util.escapeHtml(r.responsavel || "—")}</span></div>
      <div class="summary-row"><span class="k">Saída</span><span class="v mono">${r.horaPartida} — ${r.kmPartida} km</span></div>
      <div class="summary-row"><span class="k">Chegada</span><span class="v mono">${r.status === "aberto" ? "aguardando finalização" : `${r.horaChegada} — ${r.kmChegada} km`}</span></div>
      <div class="summary-row"><span class="k">KM rodados</span><span class="v mono">${r.status === "aberto" ? "—" : `${r.kmRodados} km`}</span></div>
      <div class="summary-row"><span class="k">1º registro do dia?</span><span class="v">${r.primeiroRegistroDia ? "Sim" : "Não"}</span></div>
      <div class="summary-row"><span class="k">Sinistro</span><span class="v">${r.possuiSinistro ? `⚠️ ${Util.escapeHtml(r.tipoSinistro)}` : (r.status === "aberto" ? "— a informar na finalização" : "Não")}</span></div>
      ${r.possuiSinistro ? `<div class="summary-row"><span class="k">Descrição</span><span class="v">${Util.escapeHtml(r.descricaoSinistro || "—")}</span></div>
      <div class="summary-row"><span class="k">Local do dano</span><span class="v">${Util.escapeHtml(r.localDano || "—")}</span></div>` : ""}
      <div class="summary-row"><span class="k">Observações</span><span class="v">${Util.escapeHtml(r.observacoes) || "—"}</span></div>
    </div>
    ${photos.length ? `<div class="section-title">Fotografias</div><div class="photo-thumbs">${photos.map(([label, p]) => `<div><img src="${p.dataUrl}" style="width:96px;height:96px;"><div class="text-sm text-muted" style="text-align:center;">${label}</div>${p.latitude != null ? `<div style="text-align:center;"><a href="https://www.google.com/maps?q=${p.latitude},${p.longitude}" target="_blank" rel="noopener" class="text-sm">📍 Ver no mapa</a></div>` : ""}${p.hashSha256 ? `<div class="photo-proof">🔐 SHA-256: ${p.hashSha256}</div>` : ""}${p.capturadoEm ? `<div class="photo-proof">📅 ${new Date(p.capturadoEm).toLocaleString("pt-BR")}</div>` : ""}</div>`).join("")}</div>` : ""}
    <div class="wizard-nav">
      ${r.status === "aberto" ? `<button class="btn btn-accent btn-block" id="btn-finalize-from-modal">Finalizar este registro</button>` : ""}
      <button class="btn btn-danger btn-block" id="btn-delete-record">Excluir registro</button>
    </div>
  `);
  const fzBtn = $("#btn-finalize-from-modal");
  if (fzBtn) fzBtn.addEventListener("click", () => { Modal.close(); Router.navigate(`finalizar/${r.id}`); });
  const delBtn = $("#btn-delete-record");
  if (delBtn) delBtn.addEventListener("click", () => {
    requireAdmin(() => {
      if (confirm("Excluir este registro definitivamente? Essa ação não pode ser desfeita.")) {
        DataService.deleteRecord(r.id);
        Modal.close();
        Toast.show("Registro excluído.", "ok");
        Router.resolve();
      }
    });
  });
}

/* =========================================================================
   HISTÓRICO
   ========================================================================= */
function renderHistorico() {
  const vehicles = DataService.getVehicles();
  const drivers = DataService.getDrivers();

  view(`
    <div class="view-header"><h1>Histórico</h1><div class="subtitle">Todos os registros do diário de bordo</div></div>
    <div class="filters-bar">
      <select id="f-vehicle"><option value="">Todos os veículos</option>${vehicles.map(v => `<option value="${v.id}">${Util.escapeHtml(v.marca)} ${Util.escapeHtml(v.modelo)} — ${Util.escapeHtml(v.placa)}</option>`).join("")}</select>
      <select id="f-driver"><option value="">Todos os motoristas</option>${drivers.map(d => `<option value="${d.id}">${Util.escapeHtml(d.nome)}</option>`).join("")}</select>
      <input type="month" id="f-month">
      <select id="f-status">
        <option value="">Todos os status</option>
        <option value="concluido">Só finalizados</option>
        <option value="aberto">Só pendentes</option>
      </select>
      <label class="text-sm flex items-center gap-8"><input type="checkbox" id="f-sinistro"> Só sinistros</label>
    </div>
    <div class="record-list" id="hist-list"></div>
  `);

  function draw() {
    let recs = DataService.getRecords();
    const v = $("#f-vehicle").value, d = $("#f-driver").value, mo = $("#f-month").value, st = $("#f-status").value;
    const soSinistro = $("#f-sinistro").checked;
    if (v) recs = recs.filter(r => r.veiculoId === v);
    if (d) recs = recs.filter(r => r.motoristaId === d);
    if (mo) recs = recs.filter(r => (r.data || "").slice(0, 7) === mo);
    if (st) recs = recs.filter(r => r.status === st);
    if (soSinistro) recs = recs.filter(r => r.possuiSinistro);
    $("#hist-list").innerHTML = recs.map(recordCardHtml).join("") || `<div class="empty-state"><div class="es-icon">🔎</div><p>Nenhum registro encontrado com esses filtros.</p></div>`;
  }
  ["#f-vehicle", "#f-driver", "#f-month", "#f-status"].forEach(sel => $(sel).addEventListener("change", draw));
  $("#f-sinistro").addEventListener("change", draw);
  draw();
}

/* =========================================================================
   RELATÓRIOS — Diário (com fotos) · Mensal (sem fotos) · Personalizado (sem fotos)
   ========================================================================= */
let reportType = "mensal";

function reportActionButtons() {
  return `<button class="btn btn-outline" id="btn-print">🖨️ Imprimir</button>`;
}

function renderRelatorio() {
  const now = new Date();
  const vehicles = DataService.getVehicles();
  const drivers = DataService.getDrivers();

  view(`
    <div class="view-header"><div><h1>📊 Relatórios</h1><div class="subtitle">Abastecimento, consumo, manutenção e utilização da frota</div></div></div>
    <div class="radio-group no-print">
      <button type="button" class="radio-chip ${reportType === "diario" ? "selected" : ""}" data-report-type="diario">Diário</button>
      <button type="button" class="radio-chip ${reportType === "mensal" ? "selected" : ""}" data-report-type="mensal">Utilização mensal</button>
      <button type="button" class="radio-chip ${reportType === "personalizado" ? "selected" : ""}" data-report-type="personalizado">Personalizado</button>
      <button type="button" class="radio-chip ${reportType === "abastecimento" ? "selected" : ""}" data-report-type="abastecimento">⛽ Abastecimento</button>
      <button type="button" class="radio-chip ${reportType === "manutencao" ? "selected" : ""}" data-report-type="manutencao">🔧 Manutenção</button>
    </div>
    <div id="report-filters" class="filters-bar no-print"></div>
    <div id="report-output"></div>
  `);

  $all("[data-report-type]").forEach(btn => btn.addEventListener("click", () => {
    reportType = btn.dataset.reportType;
    renderRelatorio();
  }));

  const vehicleOptions = `<option value="">Todos os veículos</option>${vehicles.map(v => `<option value="${v.id}">${Util.escapeHtml(v.marca)} ${Util.escapeHtml(v.modelo)} — ${Util.escapeHtml(v.placa)}</option>`).join("")}`;
  const filtersEl = $("#report-filters");
  if (reportType === "diario") {
    filtersEl.innerHTML = `<input type="date" id="r-date" value="${Util.todayISO()}"><select id="r-vehicle">${vehicleOptions}</select>${reportActionButtons()}`;
  } else if (reportType === "mensal") {
    filtersEl.innerHTML = `<select id="r-vehicle">${vehicleOptions}</select><select id="r-driver"><option value="">Todos os motoristas</option>${drivers.map(d => `<option value="${d.id}">${Util.escapeHtml(d.nome)}</option>`).join("")}</select><select id="r-month">${["01","02","03","04","05","06","07","08","09","10","11","12"].map(m => `<option value="${m}" ${String(now.getMonth()+1).padStart(2,"0")===m?"selected":""}>${Util.monthName(m)}</option>`).join("")}</select><select id="r-year">${[now.getFullYear()-1, now.getFullYear(), now.getFullYear()+1].map(y => `<option value="${y}" ${y===now.getFullYear()?"selected":""}>${y}</option>`).join("")}</select>${reportActionButtons()}<button class="btn btn-outline" id="btn-csv">📊 Exportar CSV</button>`;
  } else if (reportType === "personalizado") {
    const first = Util.todayISO().slice(0,8) + "01";
    filtersEl.innerHTML = `<input type="date" id="r-start" value="${first}"><span class="text-sm text-muted" style="align-self:center;">até</span><input type="date" id="r-end" value="${Util.todayISO()}"><select id="r-vehicle">${vehicleOptions}</select><select id="r-driver"><option value="">Todos os motoristas</option>${drivers.map(d => `<option value="${d.id}">${Util.escapeHtml(d.nome)}</option>`).join("")}</select>${reportActionButtons()}<button class="btn btn-outline" id="btn-csv">📊 Exportar CSV</button>`;
  } else if (reportType === "abastecimento") {
    filtersEl.innerHTML = `<select id="r-vehicle">${vehicleOptions}</select><select id="r-month">${["01","02","03","04","05","06","07","08","09","10","11","12"].map(m => `<option value="${m}" ${String(now.getMonth()+1).padStart(2,"0")===m?"selected":""}>${Util.monthName(m)}</option>`).join("")}</select><select id="r-year">${[now.getFullYear()-1, now.getFullYear(), now.getFullYear()+1].map(y => `<option value="${y}" ${y===now.getFullYear()?"selected":""}>${y}</option>`).join("")}</select>${reportActionButtons()}`;
  } else {
    filtersEl.innerHTML = `<select id="r-vehicle">${vehicleOptions}</select><select id="r-maint-status"><option value="">Todos os status</option><option value="vencido">Vencidas</option><option value="proximo">Chegando</option><option value="em_dia">Em dia</option></select>${reportActionButtons()}`;
  }

  ["#r-vehicle", "#r-driver", "#r-month", "#r-year", "#r-date", "#r-start", "#r-end", "#r-maint-status"].forEach(sel => { const el = $(sel); if (el) el.addEventListener("change", drawReport); });
  const printBtn = $("#btn-print"); if (printBtn) printBtn.addEventListener("click", printReportInNewWindow);
  drawReport();
}

function reportHeaderHtml(subtitleHtml) {
  return `<div class="flex items-center gap-12" style="margin-bottom:14px;"><img src="assets/icons/icon-96.png" style="width:44px;height:44px;border-radius:10px;"><div><h2 style="margin:0;">CONTROL FROTA</h2><div class="text-sm text-muted">Controle total, sem surpresas.</div></div></div><p>${subtitleHtml}</p>`;
}

function summaryCardsHtml(recs) {
  const concluidos = recs.filter(r => r.status === "concluido");
  const totalKm = concluidos.reduce((s, r) => s + (r.kmRodados || 0), 0);
  const motoristasSet = new Set(recs.map(r => r.motoristaId));
  const diasSet = new Set(recs.map(r => r.data));
  const sinistros = recs.filter(r => r.possuiSinistro).length;
  const pendentes = recs.filter(r => r.status === "aberto").length;
  return `<div class="grid grid-stats" style="margin-bottom:8px;"><div class="stat-card"><div class="label">Registros</div><div class="value">${recs.length}</div></div><div class="stat-card"><div class="label">KM total</div><div class="value">${totalKm}</div></div><div class="stat-card"><div class="label">Motoristas</div><div class="value">${motoristasSet.size}</div></div><div class="stat-card"><div class="label">Dias registrados</div><div class="value">${diasSet.size}</div></div><div class="stat-card"><div class="label">Pendentes</div><div class="value">${pendentes}</div></div><div class="stat-card"><div class="label">Sinistros</div><div class="value">${sinistros}</div></div></div>`;
}

/* ---- Resumo executivo do relatório mensal/personalizado ---- */
function lastDayOfMonthISO(year, month) {
  return `${year}-${String(month).padStart(2, "0")}-${String(new Date(Number(year), Number(month), 0).getDate()).padStart(2, "0")}`;
}

// situação atual de um tipo de manutenção (óleo / alinhamento) para um veículo
function maintRemainingInfo(v, tipo) {
  const list = DataService.getMaintenances().filter(m => m.status === "ativo" && m.veiculoId === v.id && m.tipo === tipo);
  if (!list.length) return { icon: "➖", text: "não cadastrado", rank: -1 };
  const order = { vencido: 2, proximo: 1, em_dia: 0 };
  const infos = list.map(m => ({ m, info: DataService.maintenanceAlertInfo(m) }))
    .sort((a, b) => order[b.info.status] - order[a.info.status]);
  const { m, info } = infos[0];
  const parts = [];
  if (m.proximoKm && v.kmAtual != null) {
    const diff = m.proximoKm - v.kmAtual;
    parts.push(diff <= 0 ? `VENCIDO (${Math.abs(diff)} km acima)` : `faltam ${diff} km`);
  }
  if (m.proximaData) {
    const dias = Math.round((new Date(m.proximaData) - new Date(Util.todayISO())) / 86400000);
    parts.push(dias <= 0 ? `data venceu ${Util.formatDateBR(m.proximaData)}` : `${dias} dia(s) (${Util.formatDateBR(m.proximaData)})`);
  }
  return { icon: info.status === "vencido" ? "🔴" : info.status === "proximo" ? "🟡" : "🟢", text: parts.join(" · ") || "—", rank: order[info.status] };
}

function periodSummaryData(start, end, vId, recs) {
  const vehicles = DataService.getVehicles();
  const fuel = DataService.getFuelLogs().filter(f => f.data && f.data >= start && f.data <= end && (!vId || f.veiculoId === vId));
  const rows = vehicles.filter(v => !vId || v.id === vId).map(v => {
    const vr = recs.filter(r => r.veiculoId === v.id);
    const vf = fuel.filter(f => f.veiculoId === v.id);
    const iv = DataService.fuelConsumptionIntervals(v.id).filter(i => i.data >= start && i.data <= end);
    const kmI = iv.reduce((a, i) => a + i.kmDiff, 0), lI = iv.reduce((a, i) => a + i.litros, 0);
    return {
      v, registros: vr.length,
      km: vr.filter(r => r.status === "concluido").reduce((a, r) => a + (Number(r.kmRodados) || 0), 0),
      sinistros: vr.filter(r => r.possuiSinistro).length,
      abast: vf.length, litros: vf.reduce((a, f) => a + (Number(f.litros) || 0), 0), gasto: vf.reduce((a, f) => a + (Number(f.valor) || 0), 0),
      kmI, lI, media: lI ? kmI / lI : null,
      oleo: maintRemainingInfo(v, "Troca de óleo"), alinh: maintRemainingInfo(v, "Alinhamento e balanceamento")
    };
  }).filter(r => vId || r.v.status !== "inativo" || r.registros || r.abast);
  const kmI = rows.reduce((a, r) => a + r.kmI, 0), lI = rows.reduce((a, r) => a + r.lI, 0);
  const feitas = [];
  DataService.getMaintenances().forEach(m => {
    if (vId && m.veiculoId !== vId) return;
    const hist = (m.historico || []).slice();
    if (m.dataUltima && !hist.some(h => h.data === m.dataUltima)) hist.push({ data: m.dataUltima, km: m.kmUltima ?? null });
    hist.forEach(h => { if (h.data && h.data >= start && h.data <= end) feitas.push({ m, data: h.data, km: h.km, v: DataService.getVehicle(m.veiculoId) }); });
  });
  feitas.sort((a, b) => a.data.localeCompare(b.data));
  return {
    rows, feitas, fuelCount: fuel.length,
    litros: rows.reduce((a, r) => a + r.litros, 0), gasto: rows.reduce((a, r) => a + r.gasto, 0),
    media: lI ? kmI / lI : null,
    sinistros: recs.filter(r => r.possuiSinistro).sort((a, b) => (a.data || "").localeCompare(b.data || ""))
  };
}

function periodSummaryHtml(start, end, vId, recs) {
  const d = periodSummaryData(start, end, vId, recs);
  const E = Util.escapeHtml;
  const cut = (t, n) => { t = String(t || "—"); return t.length > n ? t.slice(0, n - 1) + "…" : t; };

  const sinistroHtml = d.sinistros.length
    ? `<div class="notice notice-bad" style="border-left:6px solid #C0392B; font-size:14px;"><div style="width:100%;"><strong style="font-size:16px;">🚨 HOUVE ${d.sinistros.length} SINISTRO(S) NO PERÍODO</strong>${d.sinistros.map(r => `<div style="margin-top:8px; padding-top:8px; border-top:1px solid rgba(192,57,43,.25);"><strong>${Util.formatDateBR(r.data)}</strong> · ${E(r.marca)} ${E(r.modelo)} (${E(r.placa)}) · Motorista: ${E(r.motoristaNome)}<br><strong>${E(r.tipoSinistro || "Sinistro")}</strong>${r.localDano ? " — " + E(r.localDano) : ""}<br><span class="text-sm">${E(cut(r.descricaoSinistro, 220))}</span> <span class="text-sm">(${(r.fotosSinistro || []).length} foto/s — ver no relatório diário)</span></div>`).join("")}</div></div>`
    : `<div class="notice notice-good" style="font-size:14px;"><strong>✅ Nenhum sinistro registrado no período.</strong></div>`;

  const kmTotal = d.rows.reduce((a, r) => a + r.km, 0);
  const cards = `<div class="grid grid-stats" style="margin-bottom:8px;">
    <div class="stat-card"><div class="label">KM rodados</div><div class="value">${kmTotal}</div></div>
    <div class="stat-card"><div class="label">Abastecimentos</div><div class="value">${d.fuelCount}</div></div>
    <div class="stat-card"><div class="label">Litros</div><div class="value">${d.litros.toFixed(1)}</div></div>
    <div class="stat-card"><div class="label">Gasto (R$)</div><div class="value">${d.gasto ? d.gasto.toFixed(2) : "—"}</div></div>
    <div class="stat-card"><div class="label">Consumo médio</div><div class="value">${d.media ? d.media.toFixed(1) + " km/l" : "—"}</div></div>
    <div class="stat-card"><div class="label">Manutenções feitas</div><div class="value">${d.feitas.length}</div></div></div>`;

  const veh = d.rows.map(r => `<tr><td>${E(r.v.marca)} ${E(r.v.modelo)}<br><small>${E(r.v.placa)} · ${r.v.kmAtual != null ? r.v.kmAtual + " km" : "—"}</small></td><td>${r.km}</td><td>${r.abast ? r.litros.toFixed(1) + " L" : "—"}</td><td>${r.media ? r.media.toFixed(1) : "—"}</td><td>${r.sinistros ? "🚨 " + r.sinistros : "—"}</td><td>${r.oleo.icon} ${E(r.oleo.text)}</td><td>${r.alinh.icon} ${E(r.alinh.text)}</td></tr>`).join("")
    || `<tr><td colspan="7" class="empty-cell">Nenhum veículo.</td></tr>`;
  const vehTable = `<div class="section-title">Resumo por veículo</div><div class="table-wrap"><table class="data-table"><thead><tr><th>Veículo</th><th>KM rodados</th><th>Abastec.</th><th>Km/l</th><th>Sinistros</th><th>Troca de óleo (situação atual)</th><th>Alinh. e balanc. (situação atual)</th></tr></thead><tbody>${veh}</tbody></table></div>`;

  const feitasHtml = `<div class="section-title">Manutenções realizadas no período</div>` + (d.feitas.length
    ? `<div class="table-wrap"><table class="data-table"><thead><tr><th>Data</th><th>Veículo</th><th>Manutenção</th><th>KM</th></tr></thead><tbody>${d.feitas.map(f => `<tr><td>${Util.formatDateBR(f.data)}</td><td>${f.v ? E(f.v.marca + " " + f.v.modelo + " (" + f.v.placa + ")") : "Veículo removido"}</td><td>${E(f.m.tipo === "Outro" ? (f.m.tipoOutro || "Outro") : f.m.tipo)}</td><td>${f.km != null ? f.km : "—"}</td></tr>`).join("")}</tbody></table></div>`
    : `<p class="text-sm text-muted">Nenhuma manutenção registrada como realizada neste período.</p>`);

  const pend = recs.filter(r => r.status === "aberto").length;
  const linha = `<p class="text-sm text-muted">${recs.length} registro(s) · ${new Set(recs.map(r => r.data)).size} dia(s) · ${new Set(recs.map(r => r.motoristaId)).size} motorista(s)${pend ? ` · <strong>${pend} pendente(s)</strong>` : ""}</p>`;
  return `${sinistroHtml}<div class="section-title">Resumo do período</div>${cards}${linha}${vehTable}${feitasHtml}`;
}

function reportTableHtml(recs) {
  const rows = recs.map(r => `<tr><td>${Util.formatDateBR(r.data)}</td><td>${Util.escapeHtml(r.motoristaNome)}</td><td>${r.kmPartida}</td><td>${r.status === "aberto" ? "—" : r.kmChegada}</td><td>${r.status === "aberto" ? "—" : r.kmRodados}</td><td>${r.primeiroRegistroDia ? (r.fotoAgua ? "✅" : "❌") : "—"}</td><td>${r.primeiroRegistroDia ? (r.fotoOleo ? "✅" : "❌") : "—"}</td><td>${r.status === "aberto" ? "🟡 Pendente" : "🟢 Finalizado"}</td><td>${r.possuiSinistro ? "⚠️" : "❌"}</td></tr>`).join("") || `<tr><td colspan="9" style="text-align:center; font-family:var(--font-body); color:var(--gray-500);">Nenhum registro no período.</td></tr>`;
  return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Data</th><th>Motorista</th><th>KM Saída</th><th>KM Chegada</th><th>KM Rodados</th><th>Água</th><th>Óleo</th><th>Status</th><th>Sinistro</th></tr></thead><tbody>${rows}</tbody></table></div><p class="text-sm text-muted mt-8">O símbolo — significa que não era o primeiro registro do veículo naquele dia, ou que o registro ainda está pendente.</p>`;
}

function checklistPhotoBlockHtml(r) {
  const photos = [];
  if (r.fotoAgua) photos.push(["💧 Água", r.fotoAgua.dataUrl]);
  if (r.fotoOleo) photos.push(["🛢️ Óleo", r.fotoOleo.dataUrl]);
  (r.fotosSinistro || []).forEach((p, i) => photos.push([`⚠️ Sinistro ${i + 1}`, p.dataUrl]));
  return `<div class="report-checklist-block"><h4>${Util.escapeHtml(r.marca)} ${Util.escapeHtml(r.modelo)} — ${Util.escapeHtml(r.placa)}</h4><div class="text-sm text-muted">Motorista: ${Util.escapeHtml(r.motoristaNome)} · Saída ${r.horaPartida} (${r.kmPartida} km) → Chegada ${r.status==="aberto" ? "em andamento" : `${r.horaChegada} (${r.kmChegada} km)`}</div><div class="text-sm mt-8">${r.status === "aberto" ? "🟡 Pendente de finalização" : "🟢 Finalizado"}${r.possuiSinistro ? ` · ⚠️ Sinistro: ${Util.escapeHtml(r.tipoSinistro)} — ${Util.escapeHtml(r.descricaoSinistro||"")}` : ""}${r.observacoes ? ` · Obs.: ${Util.escapeHtml(r.observacoes)}` : ""}</div>${photos.length ? `<div class="report-photo-grid">${photos.map(([label,src]) => `<figure><img src="${src}"><figcaption>${label}</figcaption></figure>`).join("")}</div>` : `<p class="text-sm text-muted mt-8">Sem fotografias registradas.</p>`}</div>`;
}

function fuelReportData() {
  const month = $("#r-month").value, year = $("#r-year").value, vId = $("#r-vehicle").value;
  let logs = DataService.monthFuelLogs(year, month); if (vId) logs = logs.filter(f => f.veiculoId === vId);
  const intervals = logs.flatMap(f => DataService.fuelConsumptionIntervals(f.veiculoId).filter(i => i.data === f.data && (!vId || i.veiculoId === vId)));
  const uniqueIntervals = intervals.filter((item, idx, arr) => arr.findIndex(x => x.data === item.data && x.veiculoId === item.veiculoId && x.kmDiff === item.kmDiff && x.litros === item.litros) === idx);
  const litros = logs.reduce((s,f) => s + (Number(f.litros)||0), 0), gasto = logs.reduce((s,f) => s + (Number(f.valor)||0), 0);
  const km = uniqueIntervals.reduce((s,i) => s + i.kmDiff, 0), litrosCalc = uniqueIntervals.reduce((s,i) => s + i.litros, 0);
  return { logs: logs.slice().sort((a,b) => (a.data||"").localeCompare(b.data||"")), intervals: uniqueIntervals, litros, gasto, km, media: litrosCalc ? km/litrosCalc : null, month, year, vId };
}

function maintenanceReportData() {
  const vId = $("#r-vehicle").value, status = $("#r-maint-status").value;
  let items = DataService.getMaintenances().filter(m => m.status === "ativo").map(m => ({ m, info: DataService.maintenanceAlertInfo(m), v: DataService.getVehicle(m.veiculoId) }));
  if (vId) items = items.filter(x => x.m.veiculoId === vId); if (status) items = items.filter(x => x.info.status === status);
  return items.sort((a,b) => (a.info.status === b.info.status ? 0 : a.info.status === "vencido" ? -1 : 1));
}

function maintenanceStatusLabel(status) { return status === "vencido" ? "Vencida" : status === "proximo" ? "Chegando" : "Em dia"; }

function drawReport() {
  const out = $("#report-output"); if (!out) return;
  if (reportType === "abastecimento") {
    const d = fuelReportData(), v = d.vId ? DataService.getVehicle(d.vId) : null;
    const rows = d.logs.map(f => {
      const vehicle = DataService.getVehicle(f.veiculoId);
      const interval = d.intervals.find(i => i.data === f.data && i.veiculoId === f.veiculoId && i.litros === f.litros);
      const cost = f.valor != null ? "R$ " + Number(f.valor).toFixed(2) : "—";
      const consumption = interval ? interval.kmPorLitro.toFixed(1) + " km/l" : "—";
      return "<tr><td>" + Util.formatDateBR(f.data) + "</td><td>" + (vehicle ? Util.escapeHtml(vehicle.placa) : "—") + "</td><td>" + f.km + "</td><td>" + Number(f.litros).toFixed(2) + "</td><td>" + cost + "</td><td>" + consumption + "</td><td>" + Util.escapeHtml(f.posto || "—") + "</td></tr>";
    }).join("") || `<tr><td colspan="7" class="empty-cell">Nenhum abastecimento no período.</td></tr>`;
    out.innerHTML = `<div class="card" id="print-area">${reportHeaderHtml(`<strong>Relatório de abastecimento:</strong> ${Util.monthName(d.month)} / ${d.year}${v ? " · " + Util.escapeHtml(v.marca + " " + v.modelo + " (" + v.placa + ")") : ""}`)}<div class="grid grid-stats"><div class="stat-card"><div class="label">Abastecimentos</div><div class="value">${d.logs.length}</div></div><div class="stat-card"><div class="label">Litros</div><div class="value">${d.litros.toFixed(1)}</div></div><div class="stat-card"><div class="label">Custo total</div><div class="value">R$ ${d.gasto.toFixed(2)}</div></div><div class="stat-card"><div class="label">KM considerado</div><div class="value">${d.km}</div></div><div class="stat-card"><div class="label">Consumo médio</div><div class="value">${d.media ? d.media.toFixed(1) : "—"}</div><div class="label">km/l</div></div></div>${d.media === null ? `<div class="notice notice-info">ℹ️ A média exige dois abastecimentos com KM crescente. O primeiro lançamento serve como ponto inicial.</div>` : ""}<div class="section-title">Detalhamento dos abastecimentos</div><div class="table-wrap"><table class="data-table"><thead><tr><th>Data</th><th>Veículo</th><th>KM</th><th>Litros</th><th>Custo</th><th>Consumo</th><th>Posto</th></tr></thead><tbody>${rows}</tbody></table></div><p class="text-sm text-muted mt-16" style="text-align:center;">Média calculada pelo método tanque cheio a tanque cheio.</p></div>`;
    bindReportActions(`abastecimento-${d.year}-${d.month}`, `Relatório de abastecimento ${Util.monthName(d.month)} de ${d.year}`); return;
  }
  if (reportType === "manutencao") {
    const items = maintenanceReportData(), vId = $("#r-vehicle").value, v = vId ? DataService.getVehicle(vId) : null;
    const rows = items.map(({m,info,v}) => `<tr><td>${Util.escapeHtml(m.tipo === "Outro" ? m.tipoOutro : m.tipo)}</td><td>${v ? Util.escapeHtml(v.marca + " " + v.modelo + " (" + v.placa + ")") : "Veículo removido"}</td><td>${m.dataUltima ? Util.formatDateBR(m.dataUltima) : "—"}${m.kmUltima ? ` · ${m.kmUltima} km` : ""}</td><td>${m.proximaData ? Util.formatDateBR(m.proximaData) : "—"}${m.proximoKm ? ` · ${m.proximoKm} km` : ""}</td><td><span class="stamp ${info.status === "vencido" ? "stamp-red" : info.status === "proximo" ? "stamp-amber" : "stamp-green"}">${maintenanceStatusLabel(info.status)}</span><div class="text-sm text-muted">${info.motivos.map(Util.escapeHtml).join(" · ") || "Dentro do prazo"}</div></td><td>${Util.escapeHtml(m.observacoes || "—")}</td></tr>`).join("") || `<tr><td colspan="6" class="empty-cell">Nenhuma manutenção encontrada.</td></tr>`;
    out.innerHTML = `<div class="card" id="print-area">${reportHeaderHtml(`<strong>Relatório de manutenções:</strong> ${v ? Util.escapeHtml(v.marca + " " + v.modelo + " (" + v.placa + ")") : "toda a frota"}`)}<div class="grid grid-stats"><div class="stat-card"><div class="label">Manutenções</div><div class="value">${items.length}</div></div><div class="stat-card"><div class="label">Vencidas</div><div class="value">${items.filter(x => x.info.status === "vencido").length}</div></div><div class="stat-card"><div class="label">Chegando</div><div class="value">${items.filter(x => x.info.status === "proximo").length}</div></div><div class="stat-card"><div class="label">Em dia</div><div class="value">${items.filter(x => x.info.status === "em_dia").length}</div></div></div><div class="section-title">O que foi feito e quando será a próxima</div><div class="table-wrap"><table class="data-table"><thead><tr><th>Serviço realizado</th><th>Veículo</th><th>Última realização</th><th>Próxima manutenção</th><th>Status</th><th>Observações</th></tr></thead><tbody>${rows}</tbody></table></div><p class="text-sm text-muted mt-16" style="text-align:center;">A próxima manutenção é o primeiro limite atingido: data ou quilometragem.</p></div>`;
    bindReportActions(`manutencoes-${Util.todayISO()}`, "Relatório de manutenções da frota"); return;
  }
  let recs, subtitle, filenamePart, pStart, pEnd, pVeh;
  if (reportType === "diario") { const date = $("#r-date").value || Util.todayISO(), vId = $("#r-vehicle").value; recs = DataService.dayRecords(date); if (vId) recs = recs.filter(r => r.veiculoId === vId); recs.sort((a,b) => (a.horaPartida||"").localeCompare(b.horaPartida||"")); subtitle = `<strong>Relatório diário:</strong> ${Util.formatDateBR(date)}`; filenamePart = date; out.innerHTML = `<div class="card" id="print-area">${reportHeaderHtml(subtitle)}${summaryCardsHtml(recs)}<div class="section-title">Checklists do dia (com fotografias)</div>${recs.map(checklistPhotoBlockHtml).join("") || `<p class="text-muted">Nenhum checklist neste dia.</p>`}</div>`; bindReportActions(`diario-${filenamePart}`, `Relatório diário ${Util.formatDateBR(date)}`); return; }
  if (reportType === "mensal") { const month = $("#r-month").value, year = $("#r-year").value, vId = $("#r-vehicle").value, dId = $("#r-driver").value; recs = DataService.monthRecords(year, month); if (vId) recs = recs.filter(r => r.veiculoId === vId); if (dId) recs = recs.filter(r => r.motoristaId === dId); subtitle = `<strong>Relatório mensal:</strong> ${Util.monthName(month)} / ${year}`; filenamePart = `${year}-${month}`; pStart = `${year}-${month}-01`; pEnd = lastDayOfMonthISO(year, month); pVeh = vId; } else { const start = $("#r-start").value, end = $("#r-end").value, vId = $("#r-vehicle").value, dId = $("#r-driver").value; recs = DataService.rangeRecords(start, end); if (vId) recs = recs.filter(r => r.veiculoId === vId); if (dId) recs = recs.filter(r => r.motoristaId === dId); subtitle = `<strong>Relatório personalizado:</strong> ${Util.formatDateBR(start)} a ${Util.formatDateBR(end)}`; filenamePart = `${start}_a_${end}`; pStart = start; pEnd = end; pVeh = vId; }
  recs.sort((a,b) => (a.data + (a.horaPartida||"")).localeCompare(b.data + (b.horaPartida||"")));
  out.innerHTML = `<div class="card" id="print-area">${reportHeaderHtml(subtitle)}<p class="text-sm text-muted">Este relatório não inclui fotografias — use o relatório diário para consultar fotos.</p>${periodSummaryHtml(pStart, pEnd, pVeh, recs)}<div class="section-title">Registros do período</div>${reportTableHtml(recs)}</div>`;
  bindReportActions(`utilizacao-${filenamePart}`, `Relatório de utilização ${filenamePart}`);
  const csvBtn = $("#btn-csv"); if (csvBtn) csvBtn.onclick = () => exportReportCsv(recs, filenamePart);
}

function bindReportActions(filenamePart, shareText) {
}

function printReportInNewWindow() {
  const area = $("#print-area");
  if (!area) return;
  const printWindow = window.open("", "_blank");
  if (!printWindow) { Toast.show("O navegador bloqueou a janela de impressão. Permita pop-ups e tente novamente.", "err"); return; }
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).map(el => el.outerHTML).join("\n");
  printWindow.document.open();
  printWindow.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Control Frota - Relatório</title>${styles}<style>html,body{background:#fff!important;}body{padding:0!important;margin:0!important;}#print-area{display:block!important;visibility:visible!important;opacity:1!important;max-width:none!important;}@media print{.no-print,#btn-pdf,#btn-whatsapp,#btn-print{display:none!important;}}</style></head><body><div id="print-area">${area.innerHTML}</div></body></html>`);
  printWindow.document.close();
  const doPrint = () => { printWindow.focus(); printWindow.print(); };
  if (printWindow.document.fonts && printWindow.document.fonts.ready) printWindow.document.fonts.ready.then(() => setTimeout(doPrint, 250));
  else setTimeout(doPrint, 500);
}

function reportPdfOptions(filename) {
  return {
    margin: [8, 8, 8, 8], filename,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait", compress: true },
    pagebreak: { mode: ["css", "legacy"], avoid: [".stat-card", ".report-checklist-block", ".table-wrap"] }
  };
}

async function buildVisualReportPdf(filename) {
  const area = $("#print-area");
  if (!area) throw new Error("Área do relatório não encontrada.");
  if (!window.html2pdf) throw new Error("Biblioteca de PDF indisponível. Verifique a conexão com a internet.");
  const clone = area.cloneNode(true);
  clone.classList.add("pdf-exporting");
  // O html2canvas pode gerar uma tela vazia quando o elemento fica fora da
  // viewport (left negativo, display:none ou z-index negativo). Mantemos a
  // cópia em uma área renderizável, com layout real, durante a captura.
  clone.style.position = "absolute";
  clone.style.left = "0";
  clone.style.top = "0";
  clone.style.width = "1080px";
  clone.style.opacity = "1";
  clone.style.pointerEvents = "none";
  clone.style.zIndex = "10000";
  document.body.appendChild(clone);
  try {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    const images = Array.from(clone.querySelectorAll("img"));
    await Promise.all(images.map(img => img.complete ? Promise.resolve() : new Promise(resolve => {
      img.addEventListener("load", resolve, { once: true });
      img.addEventListener("error", resolve, { once: true });
    })));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const worker = window.html2pdf().set(reportPdfOptions(filename)).from(clone).toPdf();
    return await worker.output("blob");
  } finally { clone.remove(); }
}

async function exportVisualReportPdf(filename, shareToWhatsapp, text) {
  const buttons = $all("#btn-share");
  buttons.forEach(btn => btn.disabled = true);
  try {
    const blob = await buildVisualReportPdf(filename);
    if (shareToWhatsapp) {
      const file = new File([blob], filename, { type: "application/pdf" });
      // Alguns navegadores Android implementam share({files}) mas retornam
      // false em canShare; por isso tentamos o compartilhamento diretamente.
      if (navigator.share) {
        try { await navigator.share({ title: "Control Frota", text, files: [file] }); Toast.show("PDF visual compartilhado.", "ok"); return; }
        catch (e) { if (e.name === "AbortError") return; }
      }
      Util.downloadFile(filename, blob, "application/pdf");
      window.open(`https://wa.me/?text=${encodeURIComponent(text + "\n\nO PDF foi baixado. Anexe o arquivo " + filename + " nesta conversa.")}`, "_blank", "noopener");
      Toast.show("PDF visual baixado. O WhatsApp foi aberto para anexar o arquivo.", "ok");
    }
  } catch (err) {
    Toast.show("Não foi possível preparar o relatório para compartilhamento. Verifique sua conexão e tente novamente.", "err");
    console.error(err);
  } finally { buttons.forEach(btn => btn.disabled = false); }
}

function exportReportCsv(recs, filenamePart) {
  const header = ["Data","Motorista","Veiculo","Placa","KM Saida","KM Chegada","KM Rodados","Status","Primeiro Registro do Dia","Agua","Oleo","Sinistro","Tipo Sinistro","Descricao Sinistro","Observacoes"];
  const lines = [header.join(";")]; recs.forEach(r => lines.push([Util.formatDateBR(r.data), r.motoristaNome, `${r.marca} ${r.modelo}`, r.placa, r.kmPartida, r.status === "aberto" ? "" : r.kmChegada, r.status === "aberto" ? "" : r.kmRodados, r.status === "aberto" ? "Pendente" : "Finalizado", r.primeiroRegistroDia ? "Sim" : "Não", r.primeiroRegistroDia ? (r.fotoAgua ? "OK" : "FALTA") : "-", r.primeiroRegistroDia ? (r.fotoOleo ? "OK" : "FALTA") : "-", r.possuiSinistro ? "Sim" : "Não", r.tipoSinistro || "", r.descricaoSinistro || "", r.observacoes || ""].map(Util.csvEscape).join(";")));
  Util.downloadFile(`checkcar-relatorio-${filenamePart}.csv`, "\uFEFF" + lines.join("\n"), "text/csv;charset=utf-8"); Toast.show("CSV exportado.", "ok");
}

/* =========================================================================
   PENDÊNCIAS
   ========================================================================= */
function renderPendencias() {
  const vehicles = DataService.activeVehicles();
  const records = DataService.getRecords();
  const today = Util.todayISO();
  const issues = [];

  DataService.openRecords().forEach(r => {
    const atrasado = r.data !== today;
    issues.push({
      icon: "🟡",
      text: `${atrasado ? "⏰ Atrasado — " : ""}Checklist de ${r.placa} (${r.motoristaNome}) em aberto desde ${Util.formatDateBR(r.data)} ${r.horaPartida}, aguardando chegada.`,
      path: `finalizar/${r.id}`,
      actionLabel: "Finalizar"
    });
  });

  DataService.maintenanceAlerts().forEach(a => {
    const nome = a.maintenance.tipo === "Outro" ? a.maintenance.tipoOutro : a.maintenance.tipo;
    const veic = a.veiculo ? `${a.veiculo.marca} ${a.veiculo.modelo} (${a.veiculo.placa})` : "veículo removido";
    issues.push({
      icon: a.status === "vencido" ? "🔴" : "🟡",
      text: `${a.status === "vencido" ? "Vencido" : "Chegando"} — ${nome} de ${veic}: ${a.motivos.join(" · ")}`,
      path: "manutencoes",
      actionLabel: "Ver"
    });
  });

  vehicles.forEach(v => {
    const hasAny = records.some(r => r.veiculoId === v.id && r.data === today);
    if (!hasAny) issues.push({ icon: "🚗", text: `${v.marca} ${v.modelo} (${v.placa}) ainda não tem checklist hoje.` });
  });

  records.forEach(r => {
    if (r.primeiroRegistroDia && !r.fotoAgua) issues.push({ icon: "💧", text: `Registro de ${Util.formatDateBR(r.data)} (${r.placa}) — falta foto da água no 1º registro do dia.`, id: r.id });
    if (r.primeiroRegistroDia && !r.fotoOleo) issues.push({ icon: "🛢️", text: `Registro de ${Util.formatDateBR(r.data)} (${r.placa}) — falta foto do óleo no 1º registro do dia.`, id: r.id });
    if (r.status === "concluido") {
      if (r.possuiSinistro && !r.descricaoSinistro) issues.push({ icon: "⚠️", text: `Sinistro de ${Util.formatDateBR(r.data)} (${r.placa}) sem descrição.`, id: r.id });
      if (r.possuiSinistro && !(r.fotosSinistro || []).length) issues.push({ icon: "⚠️", text: `Sinistro de ${Util.formatDateBR(r.data)} (${r.placa}) sem fotografia.`, id: r.id });
    }
  });

  view(`
    <div class="view-header"><h1>Pendências</h1><div class="subtitle">${issues.length} alerta(s) identificado(s) automaticamente</div></div>
    <div class="record-list">
      ${issues.map(i => `
        <div class="record-card" ${i.path ? `data-goto="${i.path}"` : (i.id ? `data-open-record="${i.id}"` : "")}>
          <div class="rc-main"><div class="rc-title">${i.icon} ${Util.escapeHtml(i.text)}</div></div>
          ${i.actionLabel ? `<button class="btn btn-accent" style="pointer-events:none;">${i.actionLabel}</button>` : `<span class="stamp stamp-amber">Pendente</span>`}
        </div>`).join("") || `<div class="empty-state"><div class="es-icon">✅</div><p>Nenhuma pendência encontrada. Tudo em dia!</p></div>`}
    </div>
  `);
}

/* =========================================================================
   SINISTROS
   ========================================================================= */
function renderSinistros() {
  const vehicles = DataService.getVehicles();
  view(`
    <div class="view-header"><h1>🚨 Sinistros</h1><div class="subtitle">Ocorrências registradas</div></div>
    <div class="filters-bar">
      <select id="s-vehicle"><option value="">Todos os veículos</option>${vehicles.map(v => `<option value="${v.id}">${Util.escapeHtml(v.marca)} ${Util.escapeHtml(v.modelo)} — ${Util.escapeHtml(v.placa)}</option>`).join("")}</select>
      <input type="month" id="s-month">
    </div>
    <div class="record-list" id="sin-list"></div>
  `);
  function draw() {
    let recs = DataService.getRecords().filter(r => r.possuiSinistro);
    const v = $("#s-vehicle").value, mo = $("#s-month").value;
    if (v) recs = recs.filter(r => r.veiculoId === v);
    if (mo) recs = recs.filter(r => (r.data || "").slice(0, 7) === mo);
    $("#sin-list").innerHTML = recs.map(r => `
      <div class="record-card" data-open-record="${r.id}">
        <div class="rc-main">
          <div class="rc-title">${Util.formatDateBR(r.data)} · ${Util.escapeHtml(r.marca)} ${Util.escapeHtml(r.modelo)} — ${Util.escapeHtml(r.placa)}</div>
          <div class="rc-sub">Motorista: ${Util.escapeHtml(r.motoristaNome)} · Tipo: ${Util.escapeHtml(r.tipoSinistro)}</div>
          <div class="rc-sub">${Util.escapeHtml(r.descricaoSinistro || "")}</div>
        </div>
        <span class="stamp stamp-red">⚠️ Sinistro</span>
      </div>`).join("") || `<div class="empty-state"><div class="es-icon">🚨</div><p>Nenhum sinistro registrado com esses filtros.</p></div>`;
  }
  $("#s-vehicle").addEventListener("change", draw);
  $("#s-month").addEventListener("change", draw);
  draw();
}

/* =========================================================================
   ABASTECIMENTO — lançamento de litros/KM e relatório de consumo médio
   ========================================================================= */
function renderAbastecimento() {
  const vehicles = DataService.getVehicles();
  const now = new Date();

  view(`
    <div class="view-header">
      <div><h1>⛽ Abastecimento</h1><div class="subtitle">Lance litros e KM para acompanhar o consumo</div></div>
      <button class="btn btn-primary" data-nav="abastecimento/novo">+ Novo abastecimento</button>
    </div>

    <div class="section-title">Consumo médio do mês</div>
    <div class="filters-bar">
      <select id="fc-vehicle">${vehicles.map(v => `<option value="${v.id}">${Util.escapeHtml(v.marca)} ${Util.escapeHtml(v.modelo)} — ${Util.escapeHtml(v.placa)}</option>`).join("") || `<option value="">Nenhum veículo</option>`}</select>
      <select id="fc-month">${["01","02","03","04","05","06","07","08","09","10","11","12"].map(m => `<option value="${m}" ${String(now.getMonth()+1).padStart(2,"0")===m?"selected":""}>${Util.monthName(m)}</option>`).join("")}</select>
      <select id="fc-year">${[now.getFullYear()-1, now.getFullYear(), now.getFullYear()+1].map(y => `<option value="${y}" ${y===now.getFullYear()?"selected":""}>${y}</option>`).join("")}</select>
    </div>
    <div id="fc-summary"></div>

    <div class="section-title">Lançamentos</div>
    <div class="record-list" id="fuel-list"></div>
  `);

  function drawSummary() {
    const vId = $("#fc-vehicle").value, month = $("#fc-month").value, year = $("#fc-year").value;
    if (!vId) { $("#fc-summary").innerHTML = `<div class="empty-state"><div class="es-icon">🚗</div><p>Cadastre um veículo para acompanhar o consumo.</p></div>`; return; }
    const intervals = DataService.fuelConsumptionIntervals(vId).filter(i => (i.data || "").slice(0, 7) === `${year}-${month}`);
    const monthLogs = DataService.monthFuelLogs(year, month).filter(f => f.veiculoId === vId);
    const totalLitros = monthLogs.reduce((s, f) => s + (f.litros || 0), 0);
    const totalGasto = monthLogs.reduce((s, f) => s + (f.valor || 0), 0);
    const totalKm = intervals.reduce((s, i) => s + i.kmDiff, 0);
    const totalLitrosIntervalo = intervals.reduce((s, i) => s + i.litros, 0);
    const media = totalLitrosIntervalo > 0 ? (totalKm / totalLitrosIntervalo) : null;
    $("#fc-summary").innerHTML = `
      <div class="grid grid-stats">
        <div class="stat-card"><div class="label">Abastecimentos</div><div class="value">${monthLogs.length}</div></div>
        <div class="stat-card"><div class="label">Litros no mês</div><div class="value">${totalLitros.toFixed(1)}</div></div>
        <div class="stat-card"><div class="label">Gasto no mês</div><div class="value">R$ ${totalGasto.toFixed(0)}</div></div>
        <div class="stat-card"><div class="label">KM considerado</div><div class="value">${totalKm}</div></div>
        <div class="stat-card"><div class="label">Consumo médio</div><div class="value">${media ? media.toFixed(1) : "—"}</div><div class="label">km/l</div></div>
      </div>
      ${media === null ? `<div class="notice notice-info">ℹ️ São necessários pelo menos dois abastecimentos (com KM crescente) para calcular a média de consumo.</div>` : ""}
    `;
  }

  function drawList() {
    const logs = DataService.getFuelLogs().slice().sort((a, b) => (b.data || "").localeCompare(a.data || ""));
    $("#fuel-list").innerHTML = logs.map(f => {
      const v = DataService.getVehicle(f.veiculoId);
      return `
      <div class="record-card" style="cursor:default;">
        <div class="rc-main">
          <div class="rc-title">${Util.formatDateBR(f.data)} · ${v ? `${Util.escapeHtml(v.marca)} ${Util.escapeHtml(v.modelo)} (${Util.escapeHtml(v.placa)})` : "Veículo removido"}</div>
          <div class="rc-sub">${f.litros} litros · KM ${f.km}${f.valor ? ` · R$ ${Number(f.valor).toFixed(2)}` : ""}${f.posto ? ` · ${Util.escapeHtml(f.posto)}` : ""}</div>
        </div>
        <div class="flex gap-8">
          <button class="btn btn-ghost" data-edit-fuel="${f.id}">Editar</button>
          <button class="btn btn-ghost" data-delete-fuel="${f.id}">Excluir</button>
        </div>
      </div>`;
    }).join("") || `<div class="empty-state"><div class="es-icon">⛽</div><p>Nenhum abastecimento lançado ainda.</p></div>`;
  }

  ["#fc-vehicle", "#fc-month", "#fc-year"].forEach(sel => { const el = $(sel); if (el) el.addEventListener("change", drawSummary); });
  drawSummary();
  drawList();
}

function renderFuelForm(id) {
  const f = id ? DataService.getFuelLog(id) : null;
  const vehicles = DataService.activeVehicles();
  view(`
    <div class="view-header"><h1>${f ? "Editar abastecimento" : "Novo abastecimento"}</h1></div>
    <form id="fuel-form" class="card form-card">
      <div class="field">
        <label>Veículo *</label>
        <select name="veiculoId" required>${vehicles.map(v => `<option value="${v.id}" ${f?.veiculoId === v.id ? "selected" : ""}>${Util.escapeHtml(v.marca)} ${Util.escapeHtml(v.modelo)} — ${Util.escapeHtml(v.placa)}</option>`).join("")}</select>
      </div>
      <div class="field-row">
        <div class="field"><label>Data *</label><input type="date" name="data" required value="${f?.data || Util.todayISO()}"></div>
        <div class="field"><label>KM no abastecimento *</label><input type="number" name="km" min="0" required value="${f?.km ?? ""}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Litros *</label><input type="number" step="0.01" min="0" name="litros" required value="${f?.litros ?? ""}"></div>
        <div class="field"><label>Valor total (R$)</label><input type="number" step="0.01" min="0" name="valor" value="${f?.valor ?? ""}"></div>
      </div>
      <div class="field"><label>Posto (opcional)</label><input type="text" name="posto" value="${Util.escapeHtml(f?.posto || "")}"></div>
      <div id="fuel-error"></div>
      <div class="flex gap-12 mt-16">
        <button type="button" class="btn btn-outline btn-block" data-nav="abastecimento">Cancelar</button>
        <button type="submit" class="btn btn-primary btn-block">Salvar</button>
      </div>
    </form>
  `);
  $("#fuel-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    if (!data.veiculoId || !data.data || !data.km || !data.litros) {
      $("#fuel-error").innerHTML = `<div class="notice notice-bad">⚠️ Preencha veículo, data, KM e litros.</div>`; return;
    }
    data.km = parseInt(data.km, 10);
    data.litros = parseFloat(data.litros);
    data.valor = data.valor ? parseFloat(data.valor) : null;
    if (f) data.id = f.id;
    DataService.saveFuelLog(data);
    Toast.show("Abastecimento salvo.", "ok");
    Router.navigate("abastecimento");
  });
}

/* =========================================================================
   MANUTENÇÕES — lembretes por data e/ou KM (óleo, correia, alinhamento...)
   ========================================================================= */
const MAINT_TIPOS = ["Troca de óleo", "Correia dentada", "Alinhamento e balanceamento", "Revisão", "Filtro de ar", "Freios", "Outro"];

function maintStatusStampHtml(status) {
  if (status === "vencido") return `<span class="stamp stamp-red">🔴 Vencido</span>`;
  if (status === "proximo") return `<span class="stamp stamp-amber">🟡 Chegando</span>`;
  return `<span class="stamp stamp-green">🟢 Em dia</span>`;
}

function renderManutencoes() {
  const items = DataService.getMaintenances().filter(m => m.status === "ativo");
  const rows = items.map(m => {
    const info = DataService.maintenanceAlertInfo(m);
    const v = info.veiculo;
    return `
    <div class="record-card" style="cursor:default;">
      <div class="rc-main">
        <div class="rc-title">${Util.escapeHtml(m.tipo === "Outro" ? m.tipoOutro : m.tipo)} — ${v ? `${Util.escapeHtml(v.marca)} ${Util.escapeHtml(v.modelo)} (${Util.escapeHtml(v.placa)})` : "Veículo removido"}</div>
        <div class="rc-sub">${m.proximaData ? `Próxima data: ${Util.formatDateBR(m.proximaData)}` : ""}${m.proximaData && m.proximoKm ? " · " : ""}${m.proximoKm ? `Próximo KM: ${m.proximoKm}` : ""}</div>
        ${info.motivos.length ? `<div class="rc-sub">${info.motivos.map(Util.escapeHtml).join(" · ")}</div>` : ""}
      </div>
      <div style="display:flex; flex-direction:column; gap:6px; align-items:flex-end;">
        ${maintStatusStampHtml(info.status)}
        <div class="flex gap-8">
          <button class="btn btn-ghost" data-renew-maint="${m.id}">Renovar</button>
          <button class="btn btn-ghost" data-edit-maint="${m.id}">Editar</button>
          <button class="btn btn-ghost" data-delete-maint="${m.id}">Excluir</button>
        </div>
      </div>
    </div>`;
  }).join("") || `<div class="empty-state"><div class="es-icon">🔧</div><p>Nenhum lembrete de manutenção cadastrado.</p></div>`;

  view(`
    <div class="view-header">
      <div><h1>🔧 Manutenções</h1><div class="subtitle">Lembretes por data e/ou quilometragem</div></div>
      <button class="btn btn-primary" data-nav="manutencoes/novo">+ Novo lembrete</button>
    </div>
    <div class="admin-locked-note">🔒 Editar e excluir exigem login de administrador. Criar e renovar não exigem.</div>
    <div class="record-list">${rows}</div>
  `);
}

function renderMaintenanceForm(id, renewMode) {
  const m = id ? DataService.getMaintenance(id) : null;
  const vehicles = DataService.getVehicles();
  const v = m ? DataService.getVehicle(m.veiculoId) : null;

  // "Renovar" pré-preenche data/KM da última troca com hoje/KM atual,
  // mantendo os próximos alvos editáveis para o usuário atualizar
  const dataUltima = renewMode ? Util.todayISO() : (m?.dataUltima || "");
  const kmUltima = renewMode ? (v?.kmAtual ?? "") : (m?.kmUltima ?? "");

  view(`
    <div class="view-header"><h1>${renewMode ? "Renovar manutenção" : (m ? "Editar lembrete" : "Novo lembrete de manutenção")}</h1></div>
    <form id="maint-form" class="card form-card">
      <div class="field">
        <label>Veículo *</label>
        <select name="veiculoId" required>${vehicles.map(x => `<option value="${x.id}" ${(m?.veiculoId || "") === x.id ? "selected" : ""}>${Util.escapeHtml(x.marca)} ${Util.escapeHtml(x.modelo)} — ${Util.escapeHtml(x.placa)}</option>`).join("")}</select>
      </div>
      <div class="field">
        <label>Tipo *</label>
        <select name="tipo" id="maint-tipo" required>${MAINT_TIPOS.map(t => `<option value="${t}" ${(m?.tipo || "Troca de óleo") === t ? "selected" : ""}>${t}</option>`).join("")}</select>
      </div>
      <div class="field" id="maint-tipo-outro-field" style="display:${m?.tipo === "Outro" ? "block" : "none"};">
        <label>Qual manutenção?</label>
        <input type="text" name="tipoOutro" value="${Util.escapeHtml(m?.tipoOutro || "")}">
      </div>
      <div class="field-row">
        <div class="field"><label>Última realizada em (data)</label><input type="date" name="dataUltima" value="${dataUltima}"></div>
        <div class="field"><label>KM na última realização</label><input type="number" min="0" name="kmUltima" value="${kmUltima}"></div>
      </div>
      <div class="notice notice-info">ℹ️ Informe a próxima data OU o próximo KM (ou os dois) — o Control Frota avisa quando qualquer um deles estiver chegando ou vencido.</div>
      <div class="field-row">
        <div class="field"><label>Próxima data</label><input type="date" name="proximaData" value="${m?.proximaData || ""}"></div>
        <div class="field"><label>Próximo KM</label><input type="number" min="0" name="proximoKm" value="${m?.proximoKm ?? ""}"></div>
      </div>
      <div class="field"><label>Observações</label><textarea name="observacoes">${Util.escapeHtml(m?.observacoes || "")}</textarea></div>
      <div id="maint-error"></div>
      <div class="flex gap-12 mt-16">
        <button type="button" class="btn btn-outline btn-block" data-nav="manutencoes">Cancelar</button>
        <button type="submit" class="btn btn-primary btn-block">Salvar</button>
      </div>
    </form>
  `);

  $("#maint-tipo").addEventListener("change", (e) => {
    $("#maint-tipo-outro-field").style.display = e.target.value === "Outro" ? "block" : "none";
  });

  $("#maint-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    if (!data.veiculoId || !data.tipo) { $("#maint-error").innerHTML = `<div class="notice notice-bad">⚠️ Selecione o veículo e o tipo de manutenção.</div>`; return; }
    if (!data.proximaData && !data.proximoKm) {
      $("#maint-error").innerHTML = `<div class="notice notice-bad">⚠️ Informe a próxima data OU o próximo KM (pelo menos um dos dois).</div>`; return;
    }
    data.kmUltima = data.kmUltima ? parseInt(data.kmUltima, 10) : null;
    data.proximoKm = data.proximoKm ? parseInt(data.proximoKm, 10) : null;
    data.status = "ativo";
    if (m && !renewMode) data.id = m.id;
    else if (m && renewMode) data.id = m.id; // renovar atualiza o mesmo lembrete
    DataService.saveMaintenance(data, { renew: !!renewMode });
    Toast.show(renewMode ? "Manutenção renovada." : "Lembrete salvo.", "ok");
    Router.navigate("manutencoes");
  });
}

/* =========================================================================
   CONFIGURAÇÕES
   ========================================================================= */
function renderConfiguracoes() {
  const s = Settings.get();
  const recCount = DataService.getRecords().length;
  const approxSizeKb = Math.round(new Blob([JSON.stringify(DataService.exportAll())]).size / 1024);

  view(`
    <div class="view-header"><h1>Configurações</h1><div class="subtitle">O app funciona 100% local — todos os dados ficam salvos neste aparelho/navegador.</div></div>

    <div class="section-title">🔒 Administrador</div>
    <div class="card">
      <p class="text-sm">${Auth.isAdmin() ? "Você está conectado como administrador." : "Você não está conectado como administrador."} Algumas ações de edição, exclusão e gerenciamento de dados exigem login de administrador. Consultar dados, fazer/finalizar checklists e lançar abastecimentos não exigem.</p>
      ${Auth.isAdmin()
        ? `<button class="btn btn-outline mt-8" id="btn-admin-logout">Sair do modo administrador</button>`
        : `<button class="btn btn-primary mt-8" id="btn-admin-login">Entrar como administrador</button>`}
    </div>

    <div class="section-title">Empresa</div>
    <form id="settings-form" class="card form-card">
      <div class="field"><label>Nome da empresa</label><input type="text" name="companyName" value="${Util.escapeHtml(s.companyName)}"></div>
      <div class="notice notice-info">📍 Toda foto tirada pela Câmera ou escolhida na Galeria recebe automaticamente um carimbo de data/hora e, se você permitir o acesso à localização quando o navegador pedir, também as coordenadas do local — sem precisar de nenhum app externo.</div>
      <div class="field"><label style="display:flex; gap:8px; align-items:flex-start;"><input type="checkbox" name="limparAutomatico" ${s.limparAutomatico ? "checked" : ""} style="margin-top:3px;"><span>Liberar espaço automaticamente após o fechamento mensal (apaga do aparelho os registros finalizados assim que o JSON for baixado). Deixe desligado se quiser conferir o arquivo antes.</span></label></div>
      <button type="submit" class="btn btn-primary btn-block">Salvar configurações</button>
    </form>

    <div class="section-title">Backup dos dados</div>
    <div class="card">
      <p class="text-sm">Armazenamento local usado: ~${approxSizeKb} KB · ${recCount} registro(s). Como os dados ficam somente neste aparelho, faça backups regulares.</p>
      <div class="flex gap-12 mt-16" style="flex-wrap:wrap;">
        <button class="btn btn-outline" id="btn-export">⬇️ Exportar backup (JSON)</button>
        <button class="btn btn-outline" id="btn-closure">📦 Fechar mês agora</button>
        <button class="btn btn-outline" id="btn-import-trigger">⬆️ Importar backup 🔒</button>
        <input type="file" accept="application/json" id="import-input" hidden>
      </div>
    </div>

    <div class="section-title">Zona de risco 🔒</div>
    <div class="card">
      <p class="text-sm">Isso apaga permanentemente veículos, motoristas e registros deste aparelho. Exige login de administrador.</p>
      <button class="btn btn-danger mt-8" id="btn-wipe">🗑️ Apagar todos os dados</button>
    </div>
  `);

  const loginBtn = $("#btn-admin-login");
  if (loginBtn) loginBtn.addEventListener("click", () => openAdminLoginModal(() => renderConfiguracoes()));
  const logoutBtn = $("#btn-admin-logout");
  if (logoutBtn) logoutBtn.addEventListener("click", () => {
    Auth.logout(); updateAdminBadge(); Toast.show("Sessão de administrador encerrada.", "ok"); renderConfiguracoes();
  });

  $("#settings-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const patch = Object.fromEntries(fd.entries());
    patch.limparAutomatico = fd.has("limparAutomatico");
    Settings.save(patch);
    Toast.show("Configurações salvas.", "ok");
  });

  $("#btn-export").addEventListener("click", () => {
    Util.downloadFile(`checkcar-backup-${Util.todayISO()}.json`, JSON.stringify(DataService.exportAll(), null, 2), "application/json");
    Toast.show("Backup exportado.", "ok");
  });

  $("#btn-closure").addEventListener("click", () => MonthlyClosure.showModal(MonthlyClosure.localISO(), false));

  $("#btn-import-trigger").addEventListener("click", () => requireAdmin(() => $("#import-input").click()));
  $("#import-input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const isClosure = data && data.tipo === "fechamento-mensal";
      if (!confirm(isClosure
        ? "Este arquivo é um fechamento mensal. Os registros serão ADICIONADOS aos dados atuais (nada é substituído nem apagado). Continuar?"
        : "Importar este backup vai substituir os dados atuais salvos neste aparelho. Continuar?")) return;
      DataService.importAll(data);
      Toast.show("Backup importado com sucesso.", "ok");
      Router.navigate("dashboard");
    } catch (err) {
      Toast.show("Não foi possível ler este arquivo de backup.", "err");
    }
  });

  $("#btn-wipe").addEventListener("click", () => {
    requireAdmin(() => {
      if (confirm("Tem certeza? Todos os veículos, motoristas e registros serão apagados deste aparelho.")) {
        DataService.wipeAll();
        Toast.show("Dados apagados.", "ok");
        Router.navigate("dashboard");
        location.reload();
      }
    });
  });
}

/* =========================================================================
   ROTAS
   ========================================================================= */
Router.add("dashboard", renderDashboard);
Router.add("veiculos", (rest) => rest[0] === "novo" ? renderVehicleForm(null) : renderVehiclesList());
Router.add("motoristas", (rest) => rest[0] === "novo" ? renderDriverForm(null) : renderDriversList());
Router.add("checklist", () => { if (!W || W.step === "sucesso") resetWizard(); renderChecklist(); });
Router.add("finalizar", (rest) => startFinalizeWizard(rest[0]));
Router.add("historico", renderHistorico);
Router.add("relatorio", renderRelatorio);
Router.add("pendencias", renderPendencias);
Router.add("sinistros", renderSinistros);
Router.add("abastecimento", (rest) => rest[0] === "novo" ? renderFuelForm(null) : renderAbastecimento());
Router.add("manutencoes", (rest) => rest[0] === "novo" ? renderMaintenanceForm(null) : renderManutencoes());
Router.add("configuracoes", renderConfiguracoes);

/* =========================================================================
   DELEGAÇÃO GLOBAL DE CLIQUES
   ========================================================================= */
document.addEventListener("click", (e) => {
  const navBtn = e.target.closest("[data-nav]");
  if (navBtn) { Router.navigate(navBtn.dataset.nav); return; }

  // navegação que exige login de administrador (cadastrar veículo/motorista)
  const adminNav = e.target.closest("[data-admin-nav]");
  if (adminNav) { requireAdmin(() => Router.navigate(adminNav.dataset.adminNav)); return; }

  // navegação simples usada em cards de pendência ("Finalizar")
  const gotoBtn = e.target.closest("[data-goto]");
  if (gotoBtn) { Router.navigate(gotoBtn.dataset.goto); return; }

  const openRec = e.target.closest("[data-open-record]");
  if (openRec) { openRecordModal(openRec.dataset.openRecord); return; }

  const editVeh = e.target.closest("[data-edit-vehicle]");
  if (editVeh) { requireAdmin(() => renderVehicleForm(editVeh.dataset.editVehicle)); return; }

  const toggleVeh = e.target.closest("[data-toggle-vehicle]");
  if (toggleVeh) {
    requireAdmin(() => {
      const v = DataService.getVehicle(toggleVeh.dataset.toggleVehicle);
      DataService.setVehicleStatus(v.id, v.status === "inativo" ? "ativo" : "inativo");
      renderVehiclesList();
    });
    return;
  }

  const deleteVeh = e.target.closest("[data-delete-vehicle]");
  if (deleteVeh) {
    requireAdmin(() => {
      const v = DataService.getVehicle(deleteVeh.dataset.deleteVehicle);
      const hasHistory = deleteVeh.dataset.hasHistory === "1";
      if (hasHistory) {
        const count = DataService.getRecords().filter(r => r.veiculoId === v.id).length;
        const typed = prompt(`⚠️ Este veículo possui ${count} checklist(s) vinculado(s). O recomendado é DESATIVAR em vez de excluir, para manter o histórico e os relatórios íntegros.\n\nSe mesmo assim quiser excluir definitivamente, digite EXCLUIR abaixo (os checklists antigos continuarão existindo, mas ficarão sem o cadastro do veículo):`);
        if (typed === "EXCLUIR") {
          DataService.forceDeleteVehicle(v.id);
          Toast.show("Veículo excluído definitivamente.", "ok");
          renderVehiclesList();
        } else if (typed !== null) {
          Toast.show("Texto não confere — exclusão cancelada.", "err");
        }
      } else if (confirm(`Tem certeza que deseja excluir o veículo ${v.marca} ${v.modelo} (${v.placa})? Ele nunca foi usado em nenhum checklist.`)) {
        DataService.removeOrDeactivateVehicle(v.id);
        Toast.show("Veículo excluído.", "ok");
        renderVehiclesList();
      }
    });
    return;
  }

  const histVeh = e.target.closest("[data-history-vehicle]");
  if (histVeh) { Router.navigate("historico"); setTimeout(() => { const sel = $("#f-vehicle"); if (sel) { sel.value = histVeh.dataset.historyVehicle; sel.dispatchEvent(new Event("change")); } }, 0); return; }

  const editDrv = e.target.closest("[data-edit-driver]");
  if (editDrv) { requireAdmin(() => renderDriverForm(editDrv.dataset.editDriver)); return; }

  const toggleDrv = e.target.closest("[data-toggle-driver]");
  if (toggleDrv) {
    requireAdmin(() => {
      const d = DataService.getDriver(toggleDrv.dataset.toggleDriver);
      DataService.setDriverStatus(d.id, d.status === "inativo" ? "ativo" : "inativo");
      renderDriversList();
    });
    return;
  }

  const deleteDrv = e.target.closest("[data-delete-driver]");
  if (deleteDrv) {
    requireAdmin(() => {
      const d = DataService.getDriver(deleteDrv.dataset.deleteDriver);
      const hasHistory = deleteDrv.dataset.hasHistory === "1";
      if (hasHistory) {
        const count = DataService.getRecords().filter(r => r.motoristaId === d.id).length;
        const typed = prompt(`⚠️ Este motorista possui ${count} checklist(s) vinculado(s). O recomendado é DESATIVAR em vez de excluir, para manter o histórico e os relatórios íntegros.\n\nSe mesmo assim quiser excluir definitivamente, digite EXCLUIR abaixo:`);
        if (typed === "EXCLUIR") {
          DataService.forceDeleteDriver(d.id);
          Toast.show("Motorista excluído definitivamente.", "ok");
          renderDriversList();
        } else if (typed !== null) {
          Toast.show("Texto não confere — exclusão cancelada.", "err");
        }
      } else if (confirm(`Tem certeza que deseja excluir o motorista ${d.nome}? Ele nunca foi usado em nenhum checklist.`)) {
        DataService.removeOrDeactivateDriver(d.id);
        Toast.show("Motorista excluído.", "ok");
        renderDriversList();
      }
    });
    return;
  }

  const editFuel = e.target.closest("[data-edit-fuel]");
  if (editFuel) { requireAdmin(() => renderFuelForm(editFuel.dataset.editFuel)); return; }

  const deleteFuel = e.target.closest("[data-delete-fuel]");
  if (deleteFuel) {
    requireAdmin(() => {
      if (confirm("Excluir este lançamento de abastecimento?")) {
        DataService.deleteFuelLog(deleteFuel.dataset.deleteFuel);
        Toast.show("Abastecimento excluído.", "ok");
        renderAbastecimento();
      }
    });
    return;
  }

  const editMaint = e.target.closest("[data-edit-maint]");
  if (editMaint) { requireAdmin(() => renderMaintenanceForm(editMaint.dataset.editMaint)); return; }

  const renewMaint = e.target.closest("[data-renew-maint]");
  if (renewMaint) { renderMaintenanceForm(renewMaint.dataset.renewMaint, true); return; }

  const deleteMaint = e.target.closest("[data-delete-maint]");
  if (deleteMaint) {
    requireAdmin(() => {
      if (confirm("Excluir este lembrete de manutenção?")) {
        DataService.deleteMaintenance(deleteMaint.dataset.deleteMaint);
        Toast.show("Lembrete excluído.", "ok");
        renderManutencoes();
      }
    });
    return;
  }
});

/* =========================================================================
   INICIALIZAÇÃO
   ========================================================================= */
function updateOnlineBanner() {
  const banner = document.getElementById("offline-banner");
  if (!banner) return;
  banner.classList.toggle("hidden", navigator.onLine);
}

function init() {
  DataService.seedIfEmpty();
  Toast.init();
  updateAdminBadge();
  Router.start();
  MonthlyClosure.checkOverdue();
  window.addEventListener("online", updateOnlineBanner);
  window.addEventListener("offline", updateOnlineBanner);
  updateOnlineBanner();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => { /* PWA opcional */ });
    });
  }
}

document.addEventListener("DOMContentLoaded", init);
