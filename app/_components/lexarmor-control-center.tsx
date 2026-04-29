"use client";

import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Fingerprint,
  LockKeyhole,
  ShieldCheck,
  Users2,
  WalletCards,
} from "lucide-react";
import { ContractStudio } from "@/app/_components/contract-studio";

type TabId = "analysis" | "plans" | "security" | "segments";
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

type CheckoutBanner = {
  tone: string;
  title: string;
  body: string;
};

const fullTabs: Array<{ id: TabId; label: string }> = [
  { id: "analysis", label: "Analisi" },
  { id: "plans", label: "Piani" },
  { id: "security", label: "Sicurezza" },
  { id: "segments", label: "Segmenti" },
];

const demoTabs: Array<{ id: TabId; label: string }> = [
  { id: "analysis", label: "Demo analisi" },
  { id: "security", label: "Sicurezza" },
  { id: "segments", label: "Casi d'uso" },
];

const planCards = [
  {
    id: "basic" as const,
    name: "Basic",
    price: "19€",
    frequency: "per analisi",
    description: "Per revisioni singole prima della firma.",
    points: [
      "1 analisi documentale completa",
      "Risk score e clausole per severità",
      "Obblighi nascosti e leve di negoziazione",
      "Upload documenti supportato",
    ],
    icon: CircleDollarSign,
    tone: "border-slate-700 bg-slate-900/70",
    buttonClass: "bg-white text-slate-950 hover:bg-slate-200",
    cta: "Acquista Basic",
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: "49€",
    frequency: "al mese",
    description: "Per team che analizzano documenti legali in modo continuativo.",
    points: [
      "Analisi continuative per il team",
      "Pensato per agenzie e consulenti",
      "Stessa UX operativa senza riacquisti singoli",
      "Accesso pronto all'uso subito dopo il checkout",
    ],
    icon: WalletCards,
    tone:
      "border-emerald-500/30 bg-[linear-gradient(180deg,rgba(16,185,129,0.14),rgba(15,23,42,0.92))]",
    buttonClass: "bg-emerald-500 text-slate-950 hover:bg-emerald-400",
    cta: "Attiva Pro",
  },
];

const securityCards = [
  {
    title: "Crittografia 256-bit",
    body: "Trasmissione protetta tra browser e server durante l'intero flusso di analisi e checkout.",
    icon: LockKeyhole,
  },
  {
    title: "Compatibile con GDPR",
    body: "Flusso impostato per una comunicazione privacy-first verso clienti, artisti, studi e agenzie.",
    icon: Fingerprint,
  },
  {
    title: "Nessuna conservazione permanente",
    body: "Il testo caricato non viene presentato in interfaccia come archivio permanente della piattaforma.",
    icon: ShieldCheck,
  },
];

const segmentCards = [
  {
    title: "Privati",
    body: "Per chi deve capire rapidamente il rischio di un documento legale: contratti, diffide, scritture private, atti civili, documenti penali o materiali di compliance.",
    icon: ShieldCheck,
  },
  {
    title: "Team e Organizzazioni",
    body: "Per aziende, agenzie, procurement, HR, compliance e realtà operative che vogliono un primo screening leggibile prima dell'escalation a legale o direzione.",
    icon: Building2,
  },
  {
    title: "Consulenti e Studi",
    body: "Per consulenti, studi e professionisti che vogliono una revisione preliminare ordinata, presentabile e coerente con qualsiasi tipologia di documento legale.",
    icon: Users2,
  },
];

const legalDisclaimer =
  "LexArmor fornisce uno screening automatizzato a solo scopo informativo. Non costituisce consulenza legale, non sostituisce un avvocato e non assume responsabilità, nei limiti di legge, per decisioni, danni o conseguenze derivanti dall'uso del servizio o dei contenuti generati.";

const emptyAccessState: AccessState = {
  hasAccess: false,
  plan: null,
  remainingScans: null,
  expiresAt: null,
  label: null,
  isAdmin: false,
  source: null,
};

const demoAccessState: AccessState = {
  hasAccess: true,
  plan: "pro",
  remainingScans: null,
  expiresAt: null,
  label: "Accesso demo",
  isAdmin: false,
  source: "admin",
};

function formatAccessStatus(access: AccessState) {
  if (!access.hasAccess) {
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

function isTabId(value: string | null): value is TabId {
  return (
    value === "analysis" ||
    value === "plans" ||
    value === "security" ||
    value === "segments"
  );
}

function isPlanId(value: string | null): value is PlanId {
  return value === "basic" || value === "pro";
}

function readLocationState() {
  if (typeof window === "undefined") {
    return {
      tab: null as TabId | null,
      checkoutState: null as "success" | "cancel" | null,
      checkoutPlan: null as PlanId | null,
      sessionId: null as string | null,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const tab = params.get("tab");
  const checkout = params.get("checkout");
  const plan = params.get("plan");
  const sessionId = params.get("session_id");

  return {
    tab: isTabId(tab) ? tab : null,
    checkoutState:
      checkout === "success" || checkout === "cancel" ? checkout : null,
    checkoutPlan: isPlanId(plan) ? plan : null,
    sessionId,
  };
}

function replaceUrlWithTab(tab: TabId) {
  if (typeof window === "undefined") {
    return;
  }

  const nextUrl = new URL(window.location.href);
  nextUrl.search = "";
  nextUrl.searchParams.set("tab", tab);
  window.history.replaceState({}, "", nextUrl.toString());
}

function buildCheckoutSuccessBanner(plan: PlanId): CheckoutBanner {
  return plan === "basic"
    ? {
        tone: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
        title: "Accesso Basic attivato.",
        body: "Il pagamento è confermato. Puoi usare subito la tua analisi singola nel pannello Analisi.",
      }
    : {
        tone: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
        title: "Accesso Pro attivato.",
        body: "L'abbonamento è confermato. Il workspace è pronto per un uso continuativo.",
      };
}

const demoBanner: CheckoutBanner = {
  tone: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
  title: "Modalità demo attiva.",
  body:
    "Questo workspace è ottimizzato per registrare video marketing: analisi simulata, nessun checkout richiesto e narrativa stabile.",
};

export function LexArmorControlCenter({
  demoMode = false,
  chatEnabled = false,
}: {
  demoMode?: boolean;
  /** True solo se OPENAI_API_KEY è valorizzata: abilita la chat post-analisi. */
  chatEnabled?: boolean;
}) {
  const tabs = demoMode ? demoTabs : fullTabs;
  const [activeTab, setActiveTab] = useState<TabId>(
    () => {
      const detectedTab = readLocationState().tab ?? "analysis";
      if (demoMode && detectedTab === "plans") {
        return "analysis";
      }

      return detectedTab;
    }
  );
  const [access, setAccess] = useState<AccessState>(
    demoMode ? demoAccessState : emptyAccessState
  );
  const [adminConfigured, setAdminConfigured] = useState(demoMode);
  const [accessLoading, setAccessLoading] = useState(!demoMode);
  const [checkoutBannerCopy, setCheckoutBannerCopy] =
    useState<CheckoutBanner | null>(demoMode ? demoBanner : null);

  useEffect(() => {
    if (demoMode) {
      return;
    }

    let cancelled = false;

    async function syncState() {
      const location = readLocationState();

      if (location.checkoutState === "success" && location.sessionId) {
        const response = await fetch("/api/checkout/confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId: location.sessionId }),
        });

        const data = (await response.json()) as {
          error?: string;
          access?: AccessState;
          adminConfigured?: boolean;
        };

        if (cancelled) {
          return;
        }

        if (response.ok && data.access) {
          setAccess(data.access);
          setAdminConfigured(Boolean(data.adminConfigured));
          setCheckoutBannerCopy(
            buildCheckoutSuccessBanner(location.checkoutPlan ?? "basic")
          );
          setActiveTab("analysis");
          replaceUrlWithTab("analysis");
        } else {
          setCheckoutBannerCopy({
            tone: "border-red-400/20 bg-red-400/10 text-red-100",
            title: "Pagamento non confermato.",
            body:
              data.error ||
              "Non sono riuscito a confermare il checkout. Riapri il piano e riprova.",
          });
          setActiveTab("plans");
          replaceUrlWithTab("plans");
        }

        setAccessLoading(false);
        return;
      }

      const response = await fetch("/api/access");
      const data = (await response.json()) as {
        access?: AccessState;
        adminConfigured?: boolean;
      };

      if (cancelled) {
        return;
      }

      setAccess(data.access ?? emptyAccessState);
      setAdminConfigured(Boolean(data.adminConfigured));

      if (location.checkoutState === "cancel") {
        setCheckoutBannerCopy({
          tone: "border-white/10 bg-white/[0.04] text-slate-100",
          title: "Checkout interrotto.",
          body:
            "Nessun addebito effettuato. Puoi riprendere il pagamento in qualsiasi momento dal pannello Piani.",
        });
        setActiveTab("plans");
        replaceUrlWithTab("plans");
      }

      setAccessLoading(false);
    }

    void syncState();

    return () => {
      cancelled = true;
    };
  }, [demoMode]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.06),transparent_18%),radial-gradient(circle_at_top_left,rgba(59,130,246,0.05),transparent_22%),#020817] text-white">
      <div className="mx-auto max-w-[1440px] px-3 py-3 sm:px-4 sm:py-5 lg:px-6 lg:py-6">
        <header className="rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,8,23,0.96))] px-4 py-4 shadow-[0_20px_80px_rgba(0,0,0,0.28)] sm:rounded-[1.9rem] sm:px-5 sm:py-5 lg:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-slate-950 sm:h-12 sm:w-12">
                LA
              </span>
              <div>
                <div className="text-base font-semibold tracking-[0.08em] text-white sm:text-lg">
                  LexArmor
                </div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400 sm:text-xs sm:tracking-[0.24em]">
                  {demoMode ? "Workspace demo social" : "Analisi rischio contrattuale"}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              {demoMode ? (
                <span className="rounded-full border border-sky-400/25 bg-sky-400/10 px-3 py-1 text-xs font-medium text-sky-200">
                  Modalità demo
                </span>
              ) : null}
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
                Trasmissione cifrata
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
                Nessuna conservazione permanente
              </span>
              <button
                type="button"
                onClick={() => setActiveTab("analysis")}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 sm:w-auto"
              >
                Apri analisi
                <ArrowUpRight size={15} />
              </button>
            </div>
          </div>

          <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1 sm:mt-5 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
            {tabs.map((tab) => {
              const selected = tab.id === activeTab;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                    selected
                      ? "bg-white text-slate-950"
                      : "border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </header>

        {checkoutBannerCopy ? (
          <section
            className={`mt-4 rounded-[1.4rem] border px-4 py-3 sm:mt-5 sm:rounded-[1.6rem] sm:px-5 sm:py-4 ${checkoutBannerCopy.tone}`}
          >
            <p className="text-sm font-semibold">{checkoutBannerCopy.title}</p>
            <p className="mt-1 text-sm leading-7 opacity-90">
              {checkoutBannerCopy.body}
            </p>
          </section>
        ) : null}

        <section className="mt-4 rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,8,23,0.96))] p-4 shadow-[0_20px_80px_rgba(0,0,0,0.22)] sm:mt-5 sm:rounded-[1.9rem] sm:p-5 lg:p-7">
          {activeTab === "analysis" ? (
            <ContractStudio
              access={access}
              accessLoading={accessLoading}
              onOpenPlans={() =>
                setActiveTab(demoMode ? "analysis" : "plans")
              }
              onAccessChange={setAccess}
              demoMode={demoMode}
              chatEnabled={chatEnabled}
            />
          ) : null}
          {activeTab === "plans" && !demoMode ? (
            <PlansBoard
              access={access}
              adminConfigured={adminConfigured}
              accessLoading={accessLoading}
              onAccessChange={setAccess}
              onCheckoutBannerChange={setCheckoutBannerCopy}
            />
          ) : null}
          {activeTab === "security" ? <SecurityBoard /> : null}
          {activeTab === "segments" ? <SegmentsBoard /> : null}
        </section>

        <footer className="mt-4 border-t border-white/8 pt-3 sm:mt-5 sm:pt-4">
          <p className="text-[10px] leading-5 text-slate-500 sm:text-[11px]">
            {legalDisclaimer}
          </p>
        </footer>
      </div>
    </main>
  );
}

function PlansBoard({
  access,
  adminConfigured,
  accessLoading,
  onAccessChange,
  onCheckoutBannerChange,
}: {
  access: AccessState;
  adminConfigured: boolean;
  accessLoading: boolean;
  onAccessChange: (access: AccessState) => void;
  onCheckoutBannerChange: (banner: CheckoutBanner | null) => void;
}) {
  const [pendingPlan, setPendingPlan] = useState<PlanId | null>(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminPending, setAdminPending] = useState(false);

  async function startCheckout(planId: PlanId) {
    setPendingPlan(planId);
    setCheckoutError("");
    onCheckoutBannerChange(null);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan: planId }),
      });

      const data = (await response.json()) as {
        url?: string;
        error?: string;
      };

      if (!response.ok || !data.url) {
        throw new Error(
          data.error || "Non sono riuscito ad aprire il checkout Stripe."
        );
      }

      window.location.assign(data.url);
    } catch (error) {
      setCheckoutError(
        error instanceof Error
          ? error.message
          : "Checkout non disponibile. Riprova tra poco."
      );
      setPendingPlan(null);
    }
  }

  async function activateAdminAccess() {
    setAdminPending(true);
    setAdminError("");
    setCheckoutError("");
    onCheckoutBannerChange(null);

    try {
      const response = await fetch("/api/admin/access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ key: adminKey }),
      });

      const data = (await response.json()) as {
        error?: string;
        access?: AccessState;
      };

      if (!response.ok || !data.access) {
        throw new Error(
          data.error || "Non sono riuscito ad attivare l'accesso admin."
        );
      }

      onAccessChange(data.access);
      onCheckoutBannerChange({
        tone: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
        title: "Accesso admin attivato.",
        body:
          "Puoi testare il workspace senza passare da Stripe su questo browser.",
      });
      setAdminKey("");
    } catch (error) {
      setAdminError(
        error instanceof Error
          ? error.message
          : "Accesso admin non disponibile. Riprova tra poco."
      );
    } finally {
      setAdminPending(false);
    }
  }

  async function clearAdminAccess() {
    setAdminPending(true);
    setAdminError("");
    onCheckoutBannerChange(null);

    try {
      const response = await fetch("/api/admin/access", {
        method: "DELETE",
      });

      const data = (await response.json()) as { access?: AccessState };
      onAccessChange(data.access ?? emptyAccessState);
      onCheckoutBannerChange({
        tone: "border-white/10 bg-white/[0.04] text-slate-100",
        title: "Accesso admin rimosso.",
        body: "Il browser è tornato allo stato standard del workspace.",
      });
    } catch {
      setAdminError(
        "Non sono riuscito a rimuovere l'accesso admin. Riprova tra poco."
      );
    } finally {
      setAdminPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 2xl:grid-cols-[0.9fr_1.1fr]">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
            Piani
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
            Accessi pronti per Stripe Checkout.
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Il piano Basic sblocca 1 analisi. Il piano Pro attiva l&apos;accesso
            continuo per il workspace.
          </p>
        </div>

        <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
            Stato accesso
          </p>
          <div className="mt-3 text-lg font-semibold text-white">
            {accessLoading ? "Verifica accesso in corso..." : formatAccessStatus(access)}
          </div>
          <p className="mt-2 text-sm leading-7 text-slate-300">
            {access.hasAccess
              ? access.isAdmin
                ? "Accesso interno attivo per testare il prodotto senza acquisto."
                : "Puoi tornare subito nel pannello Analisi e usare il workspace."
              : "Completa il checkout e l'accesso viene attivato automaticamente su questo browser."}
          </p>
          {!accessLoading && access.hasAccess ? (
            <button
              type="button"
              onClick={() => onAccessChange(access)}
              className="mt-4 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-100"
            >
              {access.isAdmin ? "Accesso admin rilevato" : "Accesso rilevato"}
            </button>
          ) : null}

          {adminConfigured ? (
            <div className="mt-5 rounded-[1.4rem] border border-white/10 bg-slate-950/40 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                Test interno
              </p>
              <h3 className="mt-2 text-base font-semibold text-white">
                Accesso admin per test
              </h3>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                Attivalo solo sul tuo browser per provare l&apos;esperienza completa
                senza passare da Stripe.
              </p>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  type="password"
                  value={adminKey}
                  onChange={(event) => setAdminKey(event.target.value)}
                  placeholder="Inserisci la chiave admin"
                  className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400/40"
                />
                <button
                  type="button"
                  onClick={() => void activateAdminAccess()}
                  disabled={adminPending || !adminKey.trim()}
                  className="rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {adminPending ? "Attivazione..." : "Attiva accesso admin"}
                </button>
              </div>

              {access.isAdmin ? (
                <button
                  type="button"
                  onClick={() => void clearAdminAccess()}
                  disabled={adminPending}
                  className="mt-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Disattiva accesso admin
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {checkoutError ? (
        <div className="rounded-[1.4rem] border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          {checkoutError}
        </div>
      ) : null}

      {adminError ? (
        <div className="rounded-[1.4rem] border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          {adminError}
        </div>
      ) : null}

      <div className="grid gap-5 2xl:grid-cols-2">
        {planCards.map((plan) => {
          const Icon = plan.icon;

          return (
            <article
              key={plan.name}
              className={`flex min-h-[420px] flex-col rounded-[1.8rem] border p-7 ${plan.tone}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {plan.name}
                  </p>
                  <div className="mt-4 flex items-end gap-2">
                    <span className="text-5xl font-semibold tracking-[-0.05em] text-white">
                      {plan.price}
                    </span>
                    <span className="pb-2 text-sm text-slate-400">
                      {plan.frequency}
                    </span>
                  </div>
                </div>
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
                  <Icon size={22} />
                </div>
              </div>

              <p className="mt-5 text-sm leading-7 text-slate-300">
                {plan.description}
              </p>

              <ul className="mt-6 grid gap-3">
                {plan.points.map((point) => (
                  <li key={point} className="flex gap-3 text-sm text-slate-100">
                    <CheckCircle2 size={17} className="mt-0.5 text-emerald-300" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => startCheckout(plan.id)}
                disabled={pendingPlan !== null}
                className={`mt-auto inline-flex items-center gap-2 self-start rounded-full px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${plan.buttonClass}`}
              >
                {pendingPlan === plan.id ? "Reindirizzamento a Stripe..." : plan.cta}
                <ArrowUpRight size={15} />
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function SecurityBoard() {
  return (
    <div className="space-y-4">
      <div className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
          Sicurezza
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
          Protezione leggibile, senza rumore inutile.
        </h2>
      </div>

      <div className="grid gap-5 2xl:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-5">
          {securityCards.map((card) => {
            const Icon = card.icon;

            return (
              <article
                key={card.title}
                className="rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-6"
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
                  <Icon size={20} />
                </div>
                <h3 className="mt-4 text-2xl font-semibold text-white">
                  {card.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  {card.body}
                </p>
              </article>
            );
          })}
        </div>

        <div className="rounded-[1.8rem] border border-white/10 bg-slate-900/70 p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
            Fiducia operativa
          </p>
          <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
            Informazioni chiare vicino al flusso di lavoro.
          </h3>
          <div className="mt-6 grid gap-3">
            {[
              "Privacy comunicata accanto al punto di upload",
              "Stato accesso e checkout integrati nel workspace",
              "Segnali di sicurezza visibili senza linguaggio promozionale",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-100"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SegmentsBoard() {
  return (
    <div className="space-y-4">
      <div className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
          Casi d&apos;uso
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
          Screening legale trasversale, in contesti diversi.
        </h2>
      </div>

      <div className="grid gap-5 2xl:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-5">
          {segmentCards.map((segment) => {
            const Icon = segment.icon;

            return (
              <article
                key={segment.title}
                className="rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-6"
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/8 text-slate-100">
                  <Icon size={20} />
                </div>
                <h3 className="mt-4 text-2xl font-semibold text-white">
                  {segment.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  {segment.body}
                </p>
              </article>
            );
          })}
        </div>

        <div className="rounded-[1.8rem] border border-white/10 bg-slate-900/70 p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
            Focus segmenti
          </p>
          <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
            Lo stesso motore si adatta a casistiche molto diverse.
          </h3>
          <div className="mt-6 grid gap-3">
            {[
              "Privati: lettura rapida del rischio prima di firmare o rispondere",
              "Team: primo screening su documenti civili, penali, commerciali e compliance",
              "Studi: revisione preliminare più ordinata e presentabile",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-100"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
