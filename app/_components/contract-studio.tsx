"use client";

import {
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileUp,
  Fingerprint,
  LoaderCircle,
  LockKeyhole,
  Shield,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { ChatPanel } from "@/app/_components/chat-panel";

type PlanId = "basic" | "pro";

type AccessState = {
  hasAccess: boolean;
  plan: PlanId | null;
  remainingScans: number | null;
  expiresAt: string | null;
  label: string | null;
  isAdmin: boolean;
  source: "checkout" | "admin" | null;
};

type Clause = {
  title: string;
  severity: "critical" | "medium" | "safe";
  explanation: string;
  excerpt: string;
};

type AnalysisResponse = {
  contractType: string;
  parties: string[];
  summary: string;
  verdict: "critical" | "review" | "safe";
  riskScore: number;
  clauses: Clause[];
  hiddenObligations: string[];
  negotiationMoves: string[];
  disclaimer: string;
  access?: AccessState;
};

type ContractStudioProps = {
  access: AccessState;
  accessLoading: boolean;
  onOpenPlans: () => void;
  onAccessChange: (access: AccessState) => void;
  demoMode?: boolean;
  /** Se true, OPENAI_API_KEY è configurata e la chat può essere mostrata. */
  chatEnabled?: boolean;
};

const verdictCopy = {
  critical: {
    label: "Rischio alto",
    badgeClass:
      "bg-red-400/15 text-red-200 ring-1 ring-inset ring-red-400/25",
  },
  review: {
    label: "Da rivedere",
    badgeClass:
      "bg-amber-300/15 text-amber-100 ring-1 ring-inset ring-amber-300/25",
  },
  safe: {
    label: "Perlopiù standard",
    badgeClass:
      "bg-emerald-400/15 text-emerald-100 ring-1 ring-inset ring-emerald-400/25",
  },
} as const;

const severityCopy = {
  critical: {
    label: "Critico",
    icon: AlertTriangle,
    className: "text-red-300",
  },
  medium: {
    label: "Attenzione",
    icon: Shield,
    className: "text-amber-200",
  },
  safe: {
    label: "Sicura",
    icon: CheckCircle2,
    className: "text-emerald-200",
  },
} as const;

const scanningSteps = [
  "Rilevazione del tipo di documento e delle parti",
  "Lettura di rischi, obblighi e punti critici da approfondire",
  "Calcolo del risk score e della sintesi operativa",
];

const demoScriptText = `SCRITTURA PROFESSIONALE TRA COMMITTENTE E CONSULENTE

Tra ALFA SRL (Committente) e Mario Rossi (Consulente) si conviene quanto segue:
1) Oggetto: supporto strategico e operativo per 6 mesi.
2) Corrispettivo: euro 1.500 mensili, pagamento a 90 giorni data fattura.
3) Penale: in caso di recesso del Consulente prima della scadenza, penale pari a 6 mensilità.
4) Non concorrenza: divieto di collaborare con concorrenti per 24 mesi senza compenso dedicato.
5) Responsabilità: il Consulente risponde per ogni danno diretto e indiretto, senza limiti.
6) Foro competente esclusivo: Milano.
7) Riservatezza: obbligo per entrambe le parti per 5 anni.
8) Trattamento dati: le parti dichiarano di operare nel rispetto delle norme applicabili.`;

const demoAnalysisPayload: AnalysisResponse = {
  contractType: "Contratto di consulenza professionale",
  parties: ["ALFA SRL", "Mario Rossi"],
  summary:
    "Documento professionale con diverse clausole sbilanciate a sfavore del consulente. Le aree più critiche riguardano penale, non concorrenza e responsabilità illimitata. Struttura recuperabile con revisione mirata delle clausole economiche e di rischio.",
  verdict: "review",
  riskScore: 78,
  clauses: [
    {
      title: "Penale eccessiva su recesso anticipato",
      severity: "critical",
      explanation:
        "Penale pari a 6 mensilità senza criterio di proporzionalità. Clausola potenzialmente squilibrata rispetto all'interesse del committente.",
      excerpt:
        "in caso di recesso del Consulente prima della scadenza, penale pari a 6 mensilità",
    },
    {
      title: "Non concorrenza post-contrattuale senza corrispettivo",
      severity: "critical",
      explanation:
        "Vincolo di 24 mesi senza compenso dedicato: forte rischio di invalidità o riduzione, da rinegoziare in durata, perimetro e corrispettivo.",
      excerpt:
        "divieto di collaborare con concorrenti per 24 mesi senza compenso dedicato",
    },
    {
      title: "Responsabilità illimitata su danni indiretti",
      severity: "medium",
      explanation:
        "Assunzione di rischio eccessiva: manca un tetto massimo e manca distinzione tra colpa lieve, grave e dolo.",
      excerpt:
        "il Consulente risponde per ogni danno diretto e indiretto, senza limiti",
    },
    {
      title: "Riservatezza bilaterale standard",
      severity: "safe",
      explanation:
        "Clausola di riservatezza coerente con contratti professionali, se mantenuta bilaterale e ragionevole per durata e oggetto.",
      excerpt: "obbligo per entrambe le parti per 5 anni",
    },
  ],
  hiddenObligations: [
    "Il pagamento a 90 giorni espone il consulente a un carico finanziario non neutro.",
    "La combinazione tra penale e non concorrenza riduce fortemente la libertà professionale.",
    "La responsabilità illimitata può trasferire sul consulente rischi estranei al compenso pattuito.",
  ],
  negotiationMoves: [
    "Ridurre la penale con criterio progressivo o limite massimo ragionevole.",
    "Inserire compenso specifico per non concorrenza e ridurre durata/ambito territoriale.",
    "Introdurre un cap di responsabilità legato al valore complessivo del contratto.",
    "Portare termini pagamento da 90 a 30 giorni o inserire interessi automatici per ritardo.",
  ],
  disclaimer:
    "Analisi basata su AI a scopo informativo, non sostituisce il parere di un avvocato abilitato",
};

const complianceBadges = [
  {
    label: "Crittografia 256-bit",
    icon: LockKeyhole,
  },
  {
    label: "Compatibile con GDPR",
    icon: Fingerprint,
  },
  {
    label: "Nessuna conservazione permanente",
    icon: ShieldCheck,
  },
];

const acceptedFormatsLabel = "PDF, DOC, DOCX, PAGES, TXT, RTF, MD, CSV";
const supportedUploadExtensions = new Set([
  "pdf",
  "doc",
  "docx",
  "pages",
  "txt",
  "text",
  "rtf",
  "md",
  "markdown",
  "csv",
]);

const emptyAccessState: AccessState = {
  hasAccess: false,
  plan: null,
  remainingScans: null,
  expiresAt: null,
  label: null,
  isAdmin: false,
  source: null,
};

function formatAccessLabel(access: AccessState) {
  if (!access.hasAccess || !access.plan) {
    return "Nessun accesso attivo";
  }

  if (access.isAdmin) {
    return "Accesso admin di test";
  }

  if (access.plan === "basic") {
    const remaining = access.remainingScans ?? 0;
    return remaining === 1
      ? "Basic attivo · 1 analisi disponibile"
      : `Basic attivo · ${remaining} analisi disponibili`;
  }

  return "Pro attivo";
}

function getFileExtension(name: string) {
  const clean = name.toLowerCase().trim();
  const pieces = clean.split(".");
  return pieces.length > 1 ? pieces.pop() ?? "" : "";
}

export function ContractStudio({
  access,
  accessLoading,
  onOpenPlans,
  onAccessChange,
  demoMode = false,
  chatEnabled = false,
}: ContractStudioProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadNotice, setUploadNotice] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [scanIndex, setScanIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isPending) {
      setScanIndex(0);
      return;
    }

    const interval = window.setInterval(() => {
      setScanIndex((current) => (current + 1) % scanningSteps.length);
    }, 900);

    return () => window.clearInterval(interval);
  }, [isPending]);

  function validateUploadFile(file: File) {
    const extension = getFileExtension(file.name);

    if (!supportedUploadExtensions.has(extension)) {
      setUploadNotice("");
      setUploadError(
        "Formato non supportato. Carica un file PDF, DOC, DOCX, Pages o di testo."
      );
      return false;
    }

    return true;
  }

  async function extractDocument(file: File) {
    if (!validateUploadFile(file)) {
      if (inputRef.current) {
        inputRef.current.value = "";
      }

      return;
    }

    setIsExtracting(true);
    setUploadError("");
    setUploadNotice("");
    setAnalysis(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/extract-text", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as {
        error?: string;
        text?: string;
        filename?: string;
        detectedType?: string;
      };

      if (!response.ok || !data.text) {
        throw new Error(
          data.error ||
            "Non sono riuscito a leggere il documento. Prova a esportarlo in PDF o DOCX."
        );
      }

      setText(data.text);
      setUploadNotice(
        data.detectedType === "pdf-ocr"
          ? `${data.filename ?? file.name} caricato correttamente. Ho rilevato un PDF scannerizzato e ho estratto il testo con OCR.`
          : `${data.filename ?? file.name} caricato correttamente. Il testo è pronto per l'analisi.`
      );
    } catch (upload) {
      setUploadError(
        upload instanceof Error
          ? upload.message
          : "Upload non riuscito. Riprova tra poco."
      );
    } finally {
      setIsExtracting(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  async function handleFileSelection(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (file) {
      await extractDocument(file);
    }
  }

  async function handleIncomingFile(file: File | undefined) {
    if (!file) {
      return;
    }

    await extractDocument(file);
  }

  async function handleDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragging(false);
    await handleIncomingFile(event.dataTransfer.files?.[0]);
  }

  function handleDragOver(event: React.DragEvent<HTMLElement>) {
    if (!Array.from(event.dataTransfer.types).includes("Files")) {
      return;
    }

    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }

    setIsDragging(false);
  }

  async function analyzeContract() {
    if (demoMode) {
      setIsPending(true);
      setError("");
      setAnalysis(null);
      setUploadNotice("");

      try {
        await new Promise((resolve) => window.setTimeout(resolve, 2800));
        startTransition(() => {
          setAnalysis(demoAnalysisPayload);
        });
        setUploadNotice(
          "Demo completata. Questo output è simulato per presentazione marketing."
        );
      } finally {
        setIsPending(false);
      }

      return;
    }

    if (!access.hasAccess) {
      onOpenPlans();
      return;
    }

    setIsPending(true);
    setError("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contractText: text }),
      });

      const data = (await response.json()) as AnalysisResponse & {
        error?: string;
        code?: string;
        access?: AccessState;
      };

      if (!response.ok) {
        if (data.access) {
          onAccessChange(data.access);
        } else if (response.status === 402) {
          onAccessChange(emptyAccessState);
        }

        if (response.status === 402) {
          onOpenPlans();
        }

        throw new Error(data.error || "Analisi non disponibile.");
      }

      startTransition(() => {
        setAnalysis(data);
      });

      if (data.access) {
        onAccessChange(data.access);
      }

      if (access.plan === "basic" && data.access && !data.access.hasAccess) {
        setUploadNotice(
          "Il pass Basic è stato utilizzato. Per una nuova analisi puoi acquistare un altro pass oppure attivare Pro."
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Non sono riuscito ad analizzare il documento. Riprova tra poco."
      );
    } finally {
      setIsPending(false);
    }
  }

  const verdict = analysis ? verdictCopy[analysis.verdict] : null;

  const groupedClauses = useMemo(
    () => ({
      critical:
        analysis?.clauses.filter((clause) => clause.severity === "critical") ??
        [],
      medium:
        analysis?.clauses.filter((clause) => clause.severity === "medium") ??
        [],
      safe:
        analysis?.clauses.filter((clause) => clause.severity === "safe") ?? [],
    }),
    [analysis]
  );

  const panels = [
    {
      key: "critical",
      title: "Rischi critici",
      subtitle: "Clausole squilibrate, penali e responsabilità critiche",
      tone:
        "border-red-500/30 bg-[linear-gradient(180deg,rgba(127,29,29,0.28),rgba(15,23,42,0.82))]",
      badge:
        "bg-red-500/20 text-red-100 ring-1 ring-inset ring-red-400/30 shadow-[0_0_24px_rgba(239,68,68,0.18)]",
      signalTone:
        "border-red-500/35 bg-[linear-gradient(180deg,rgba(127,29,29,0.30),rgba(15,23,42,0.78))]",
      signalText: "text-red-100",
      dotClass:
        "border-red-400/55 bg-red-500 shadow-[0_0_42px_rgba(239,68,68,0.55)]",
      itemTone: "border-red-500/15 bg-[#14090d]",
      items: groupedClauses.critical,
      empty: "Nessuna criticità elevata rilevata.",
    },
    {
      key: "medium",
      title: "Attenzione richiesta",
      subtitle: "Punti da chiarire, rinegoziare o completare",
      tone:
        "border-amber-400/28 bg-[linear-gradient(180deg,rgba(120,53,15,0.24),rgba(15,23,42,0.82))]",
      badge:
        "bg-amber-400/18 text-amber-50 ring-1 ring-inset ring-amber-300/30 shadow-[0_0_24px_rgba(251,191,36,0.14)]",
      signalTone:
        "border-amber-400/35 bg-[linear-gradient(180deg,rgba(120,53,15,0.28),rgba(15,23,42,0.78))]",
      signalText: "text-amber-50",
      dotClass:
        "border-amber-300/60 bg-amber-400 shadow-[0_0_42px_rgba(250,204,21,0.5)]",
      itemTone: "border-amber-400/15 bg-[#161108]",
      items: groupedClauses.medium,
      empty: "Nessuna area intermedia particolarmente delicata.",
    },
    {
      key: "safe",
      title: "Standard / sicure",
      subtitle: "Clausole coerenti o non anomale per il contesto",
      tone:
        "border-emerald-400/28 bg-[linear-gradient(180deg,rgba(6,95,70,0.24),rgba(15,23,42,0.82))]",
      badge:
        "bg-emerald-400/18 text-emerald-50 ring-1 ring-inset ring-emerald-300/30 shadow-[0_0_24px_rgba(16,185,129,0.16)]",
      signalTone:
        "border-emerald-400/35 bg-[linear-gradient(180deg,rgba(6,95,70,0.28),rgba(15,23,42,0.78))]",
      signalText: "text-emerald-50",
      dotClass:
        "border-emerald-300/60 bg-emerald-400 shadow-[0_0_42px_rgba(16,185,129,0.5)]",
      itemTone: "border-emerald-400/15 bg-[#07140f]",
      items: groupedClauses.safe,
      empty: "Nessuna clausola standard evidenziata.",
    },
  ] as const;

  const smartRiskState = useMemo(() => {
    if (!analysis) {
      return null;
    }

    const criticalCount = groupedClauses.critical.length;
    const mediumCount = groupedClauses.medium.length;
    const weightedScore =
      analysis.riskScore + criticalCount * 18 + mediumCount * 7;

    if (
      analysis.verdict === "critical" ||
      analysis.riskScore >= 78 ||
      criticalCount >= 2 ||
      (criticalCount >= 1 && weightedScore >= 86)
    ) {
      return {
        level: "critical" as const,
        label: "Esposizione critica",
        scoreClass: "text-red-200",
        frameClass:
          "border-red-500/30 bg-[linear-gradient(180deg,rgba(127,29,29,0.28),rgba(15,23,42,0.74))]",
        helper:
          "Segnale rosso attivato: il punteggio e la densità di clausole critiche indicano un rischio legale o economico immediato.",
      };
    }

    if (
      analysis.verdict === "review" ||
      analysis.riskScore >= 42 ||
      criticalCount >= 1 ||
      mediumCount >= 2 ||
      weightedScore >= 62
    ) {
      return {
        level: "medium" as const,
        label: "Revisione elevata",
        scoreClass: "text-amber-100",
        frameClass:
          "border-amber-400/30 bg-[linear-gradient(180deg,rgba(120,53,15,0.22),rgba(15,23,42,0.74))]",
        helper:
          "Segnale giallo attivato: il documento resta gestibile, ma contiene condizioni che meritano chiarimento o revisione.",
      };
    }

    return {
      level: "safe" as const,
      label: "Rischio controllato",
      scoreClass: "text-emerald-200",
      frameClass:
        "border-emerald-400/28 bg-[linear-gradient(180deg,rgba(6,95,70,0.22),rgba(15,23,42,0.74))]",
      helper:
        "Segnale verde attivato: la struttura appare più standard e con un profilo di rischio più contenuto.",
    };
  }, [analysis, groupedClauses.critical.length, groupedClauses.medium.length]);

  const riskScoreClass = smartRiskState?.scoreClass ?? "text-white";
  const signalMapCard = (
    <div className="rounded-[1.45rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,18,31,0.98),rgba(7,16,28,0.96))] p-4 shadow-[0_20px_70px_rgba(2,6,23,0.4)] sm:rounded-[1.7rem] sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
            Semaforo rischio
          </p>
          <p className="mt-2 text-xl font-semibold tracking-[-0.04em] text-white sm:text-2xl">
            Il segnale operativo più importante del documento.
          </p>
        </div>
        {smartRiskState ? (
          <div
            className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${smartRiskState.frameClass}`}
          >
            {smartRiskState.label}
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex flex-col gap-4 lg:flex-row">
        <div className="rounded-[1.4rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(4,8,15,0.96))] px-3 py-4 sm:rounded-[1.8rem] sm:px-5 sm:py-6">
          <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400 md:mb-4">
            Focus segnali
          </p>
          <div className="grid grid-cols-3 gap-2 md:flex md:flex-col md:items-center md:gap-4">
            {panels.map((panel) => {
              const isActive = smartRiskState?.level === panel.key;

              return (
                <div
                  key={`signal-dot-${panel.key}`}
                  className="flex flex-col items-center gap-2"
                >
                  <div
                    className={`h-20 w-20 rounded-full border transition md:h-20 md:w-20 ${
                      isActive
                        ? `${panel.dotClass} scale-[1.04]`
                        : "border-white/10 bg-slate-900/90 opacity-40"
                    }`}
                  />
                  <span
                    className={`text-center text-[11px] font-semibold uppercase tracking-[0.16em] ${
                      isActive ? panel.signalText : "text-slate-500"
                    }`}
                  >
                    {panel.key === "critical"
                      ? "Critico"
                      : panel.key === "medium"
                        ? "Attenzione"
                        : "Sicuro"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          {smartRiskState ? (
            <div
              className={`rounded-[1.35rem] border p-4 ${smartRiskState.frameClass}`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">
                Soglia intelligente
              </p>
              <p
                className={`mt-3 text-2xl font-semibold tracking-[-0.04em] ${smartRiskState.scoreClass}`}
              >
                {smartRiskState.label}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                {smartRiskState.helper}
              </p>
            </div>
          ) : null}

          <div className="mt-4 space-y-3">
            {panels.map((panel) => {
              const isActive = smartRiskState?.level === panel.key;

              return (
                <div
                  key={`signal-${panel.key}`}
                  className={`rounded-[1.2rem] border p-3 transition ${
                    isActive
                      ? `${panel.signalTone} shadow-[0_0_0_1px_rgba(255,255,255,0.05)]`
                      : "border-white/8 bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`h-5 w-5 rounded-full border ${
                        isActive
                          ? panel.dotClass
                          : "border-white/10 bg-slate-700"
                      }`}
                    />
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-semibold ${
                          isActive ? panel.signalText : "text-white"
                        }`}
                      >
                        {panel.title}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-300">
                        {panel.subtitle}
                      </p>
                    </div>
                    <div
                      className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold ${panel.badge}`}
                    >
                      {panel.items.length}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
  const emptySignalMapCard = (
    <div className="rounded-[1.4rem] border border-white/10 bg-[#07101c] p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
        Semaforo rischio
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-300">
        Appena analizzi un documento, qui compare subito il segnale
        rosso, giallo o verde con il colpo d&apos;occhio principale del report.
      </p>
      <div className="mt-4 space-y-3">
        {panels.map((panel) => (
          <div
            key={`empty-${panel.key}`}
            className={`rounded-[1.1rem] border p-3 ${panel.signalTone}`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`h-14 w-14 rounded-full border shadow-[0_0_28px_rgba(255,255,255,0.06)] ${panel.dotClass}`}
              />
              <div>
                <p className={`text-sm font-semibold ${panel.signalText}`}>
                  {panel.title}
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  {panel.subtitle}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-5">
    <div className="grid gap-4 sm:gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:gap-6">
      <section
        className={`rounded-[1.45rem] border bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(9,15,28,0.92))] p-4 transition sm:rounded-[1.8rem] sm:p-5 lg:p-7 ${
          isDragging
            ? "border-emerald-400/50 shadow-[0_0_0_1px_rgba(52,211,153,0.18)]"
            : "border-white/10"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-xl">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                Caricamento documento
              </p>
              <h2 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-white sm:text-2xl lg:text-3xl">
                Carica o incolla il documento legale da analizzare.
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Supporta documenti {acceptedFormatsLabel}. Il contenuto estratto
                resta modificabile prima dell&apos;analisi.
              </p>
            </div>

            <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-200">
              {accessLoading ? "Verifica accesso..." : formatAccessLabel(access)}
            </div>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx,.pages,.txt,.rtf,.md,.csv"
            onChange={handleFileSelection}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={`mt-2 flex min-h-[112px] w-full flex-col items-center justify-center rounded-[1.4rem] border border-dashed px-4 text-center transition sm:min-h-[138px] sm:rounded-[1.6rem] sm:px-5 ${
              isDragging
                ? "border-emerald-400/60 bg-emerald-400/10"
                : "border-white/12 bg-[#07101d]"
            }`}
          >
            {isExtracting ? (
              <>
                <LoaderCircle size={18} className="animate-spin text-emerald-300" />
                <span className="mt-3 text-sm font-medium text-white">
                  Estrazione del testo in corso...
                </span>
                <span className="mt-1 text-xs text-slate-400">
                  Sto leggendo il documento e preparando il contenuto.
                </span>
              </>
            ) : (
              <>
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/8 text-emerald-300 sm:h-12 sm:w-12">
                  <FileUp size={22} />
                </div>
                <span className="mt-4 text-sm font-medium text-white">
                  Trascina qui il file oppure clicca per selezionarlo
                </span>
                <span className="mt-1 text-xs text-slate-400">
                  Formati supportati: {acceptedFormatsLabel}
                </span>
              </>
            )}
          </button>
        </div>

        {uploadNotice ? (
          <div className="mt-4 rounded-[1.2rem] border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
            {uploadNotice}
          </div>
        ) : null}

        {uploadError ? (
          <div className="mt-4 rounded-[1.2rem] border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-100">
            {uploadError}
          </div>
        ) : null}

        {demoMode ? (
          <button
            type="button"
            onClick={() => {
              setText(demoScriptText);
              setAnalysis(null);
              setError("");
              setUploadError("");
              setUploadNotice(
                "Script demo caricato. Premi 'Avvia analisi demo' per la registrazione."
              );
            }}
            className="mt-4 rounded-full border border-sky-400/25 bg-sky-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-200 transition hover:bg-sky-400/20"
          >
            Carica script demo per video
          </button>
        ) : null}

        <div
          className={`mt-5 rounded-[1.35rem] border transition sm:mt-6 sm:rounded-[1.5rem] ${
            isDragging
              ? "border-emerald-400/60 bg-emerald-400/5"
              : "border-white/10 bg-[#050b14]"
          }`}
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/8 px-5 py-3">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Testo del documento
            </span>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/[0.08]"
            >
              Carica file
            </button>
          </div>

          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onPaste={async (event) => {
              const file = event.clipboardData.files?.[0];

              if (file) {
                event.preventDefault();
                await handleIncomingFile(file);
              }
            }}
            placeholder="Incolla il testo del documento oppure trascina qui un PDF, Word o Pages..."
            className="h-[196px] w-full resize-none bg-transparent px-4 py-4 text-sm leading-7 text-slate-100 outline-none transition placeholder:text-slate-500 sm:h-[280px] sm:px-5 xl:h-[420px]"
          />
        </div>

        <div className="mt-4 flex flex-col gap-4 xl:mt-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
            {complianceBadges.map((badge) => {
              const Icon = badge.icon;

              return (
                <div
                  key={badge.label}
                  className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-200"
                >
                  <Icon size={14} className="text-emerald-300" />
                  <span>{badge.label}</span>
                </div>
              );
            })}
          </div>

          {access.hasAccess || demoMode ? (
            <button
              type="button"
              disabled={isPending || text.trim().length < 80}
              onClick={analyzeContract}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-[#04101c] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300 sm:w-auto"
            >
              {isPending ? (
                <>
                  <LoaderCircle size={16} className="animate-spin" />
                  Analisi in corso
                </>
              ) : (
                <>
                  {demoMode ? "Avvia analisi demo" : "Analizza documento"}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenPlans}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 sm:w-auto"
            >
              Sblocca analisi
              <Upload size={16} />
            </button>
          )}
        </div>

        {error ? (
          <div className="mt-4 rounded-[1.2rem] border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        {!accessLoading && !access.hasAccess && !demoMode ? (
          <div className="mt-4 rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200">
            Per analizzare il documento serve un accesso attivo. Il pass{" "}
            <span className="font-semibold text-white">Basic</span> sblocca 1
            analisi, mentre <span className="font-semibold text-white">Pro</span>{" "}
            apre l&apos;uso continuativo.
          </div>
        ) : null}
      </section>

      <section className="rounded-[1.45rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,29,0.95),rgba(11,23,40,0.96))] p-4 sm:rounded-[1.8rem] sm:p-5 lg:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
              Cruscotto rischio
            </p>
            <h2 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-white sm:text-2xl lg:text-3xl">
              {analysis ? "Analisi completata" : "In attesa di un documento"}
            </h2>
          </div>
          {verdict ? (
            <span
              className={`inline-flex self-start rounded-full px-3 py-1 text-xs font-medium ${verdict.badgeClass}`}
            >
              {verdict.label}
            </span>
          ) : null}
        </div>

        {isPending ? (
          <div className="mt-5 rounded-[1.45rem] border border-slate-700 bg-slate-950/40 p-4 sm:mt-6 sm:rounded-[1.6rem] sm:p-6">
            <div className="flex items-center gap-3 text-emerald-300">
              <LoaderCircle size={18} className="animate-spin" />
              <span className="text-sm uppercase tracking-[0.22em]">
                Analisi in corso
              </span>
            </div>
            <div className="mt-5 space-y-3">
              {scanningSteps.map((step, index) => (
                <div
                  key={step}
                  className={`rounded-2xl border px-4 py-3 text-sm transition ${
                    index === scanIndex
                      ? "border-emerald-400/40 bg-emerald-400/10 text-white"
                      : "border-white/8 bg-white/[0.03] text-slate-400"
                  }`}
                >
                  {step}
                </div>
              ))}
            </div>
          </div>
        ) : analysis ? (
          <div className="mt-6 space-y-4">
            {signalMapCard}

            <div className="rounded-[1.45rem] border border-white/8 bg-white/5 p-4 sm:rounded-[1.6rem] sm:p-5">
              <div className="-mx-1 mt-5 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
                <div className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-200">
                  {analysis.contractType}
                </div>
                {analysis.parties.map((party) => (
                  <div
                    key={party}
                    className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300"
                  >
                    {party}
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                    Risk score
                  </p>
                  <div
                    className={`mt-2 text-5xl font-semibold tracking-[-0.06em] sm:text-6xl ${riskScoreClass}`}
                  >
                    {analysis.riskScore}
                    <span className="ml-1 text-2xl text-slate-500 sm:text-3xl">/100</span>
                  </div>
                </div>

                <div className="rounded-[1.35rem] border border-white/8 bg-slate-950/30 px-4 py-4 sm:px-5">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                    Sintesi operativa
                  </p>
                  <p className="mt-3 text-sm leading-7 text-slate-300">
                    {analysis.summary}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
              {panels.map((panel) => (
                <article
                  key={panel.key}
                  className={`rounded-[1.5rem] border p-4 ${panel.tone}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {panel.title}
                      </h3>
                      <p className="mt-1 text-xs leading-6 text-slate-300">
                        {panel.subtitle}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${panel.badge}`}
                    >
                      {panel.items.length}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {panel.items.length > 0 ? (
                      panel.items.map((item) => {
                        const severity = severityCopy[item.severity];
                        const Icon = severity.icon;

                        return (
                          <div
                            key={`${panel.key}-${item.title}`}
                            className={`rounded-[1.1rem] border p-4 ${panel.itemTone}`}
                          >
                            <div className="flex items-start gap-3">
                              <Icon size={18} className={severity.className} />
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-white">
                                  {item.title}
                                </p>
                                <p className="mt-2 text-sm leading-6 text-slate-300">
                                  {item.explanation}
                                </p>
                                <p className="mt-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs leading-6 text-slate-400">
                                  “{item.excerpt}”
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div
                        className={`rounded-[1.1rem] border px-4 py-3 text-sm text-slate-300 ${panel.itemTone}`}
                      >
                        {panel.empty}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.04] p-4 sm:rounded-[1.5rem] sm:p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                  Obblighi nascosti
                </p>
                <ul className="mt-4 space-y-3">
                  {analysis.hiddenObligations.map((item) => (
                    <li
                      key={item}
                      className="rounded-2xl border border-white/8 bg-slate-950/30 px-4 py-3 text-sm leading-6 text-slate-200"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.04] p-4 sm:rounded-[1.5rem] sm:p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                  Leve di negoziazione
                </p>
                <ul className="mt-4 space-y-3">
                  {analysis.negotiationMoves.map((item) => (
                    <li
                      key={item}
                      className="rounded-2xl border border-white/8 bg-slate-950/30 px-4 py-3 text-sm leading-6 text-slate-200"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-white/10 bg-slate-950/40 px-4 py-3 text-xs leading-6 text-slate-400">
              {analysis.disclaimer}
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {emptySignalMapCard}

            <div className="rounded-[1.45rem] border border-white/8 bg-white/[0.04] p-4 sm:rounded-[1.6rem] sm:p-6">
              <h3 className="text-xl font-semibold text-white">
                Nessuna analisi disponibile
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                Carica un documento o incolla il contenuto del testo, poi avvia
                l&apos;analisi. Il sistema riconosce il tipo di documento legale e
                lo valuta con criteri coerenti al contesto.
              </p>

              <div className="mt-4 grid gap-3 xl:grid-cols-3">
                {[
                  "Classificazione del documento legale",
                  "Risk score e severità operative",
                  "Obblighi nascosti e negoziazione",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/8 bg-slate-950/30 px-4 py-4 text-sm leading-6 text-slate-200"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>

    {analysis && !demoMode && chatEnabled && (
      <ChatPanel
        contractText={text}
        analysis={analysis}
        disabled={!access.hasAccess}
        onAccessRequired={onOpenPlans}
      />
    )}
    </div>
  );
}
