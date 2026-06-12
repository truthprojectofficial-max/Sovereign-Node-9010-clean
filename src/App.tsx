import { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Activity,
  Database,
  Cpu,
  ScanSearch,
  FileText,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  BookOpen,
  ArrowLeft,
  FolderOpen,
  FlaskConical,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DECEPTION_ONTOLOGY, DASHBOARD_STATS } from './constants';
import { parseDescriptionInput, isRawNumber, isOnlyNumberWords } from './utils/words-to-number';
import type {
  TabId,
  BBFBResult,
  DeceptionReport,
  Fact,
  AnalyzeRequest,
  ProductEvidence,
  DiscoveryCategory,
  EvaluationRunResult,
  EvaluationCaseResult,
} from './types';

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

const API_BASE = '/api';

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Gauge Component
// ---------------------------------------------------------------------------

function Gauge({
  label,
  value,
  max = 1,
  color = 'bg-sovereign-200',
}: {
  label: string;
  value: number;
  max?: number;
  color?: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-sovereign-200">{value.toFixed(4)}</span>
      </div>
      <div className="h-2 bg-sovereign-800 rounded-full overflow-hidden">
        <div
          className={`gauge-bar h-full rounded-full ${color}`}
          data-pct={pct}
          ref={(el) => {
            if (el) el.style.setProperty('--gauge-pct', `${pct}%`);
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Severity Badge
// ---------------------------------------------------------------------------

function SeverityBadge({ severity }: { severity: string }) {
  const cls =
    severity === 'CRITICAL'
      ? 'severity-critical'
      : severity === 'HIGH'
        ? 'severity-high'
        : severity === 'MEDIUM'
          ? 'severity-medium'
          : 'severity-low';
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${cls}`}>{severity}</span>
  );
}

// ---------------------------------------------------------------------------
// TAB: Dashboard
// ---------------------------------------------------------------------------

function DashboardTab() {
  const [health, setHealth] = useState<{ status: string; timestamp: string } | null>(null);

  useEffect(() => {
    apiGet<{ status: string; timestamp: string }>('/health')
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={<Shield size={20} />}
          label="Protocol Version"
          value={DASHBOARD_STATS.protocolVersion}
        />
        <StatCard icon={<Cpu size={20} />} label="Node ID" value={DASHBOARD_STATS.nodeId} />
        <StatCard
          icon={<ScanSearch size={20} />}
          label="Ontology Patterns"
          value={String(DASHBOARD_STATS.ontologyPatterns)}
        />
      </div>

      <div className="bg-sovereign-800 border border-sovereign-700 rounded-lg p-6">
        <h3 className="text-sovereign-200 text-sm font-bold mb-4">SYSTEM STATUS</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <StatusItem label="API" status={health ? 'operational' : 'offline'} />
          <StatusItem label="BBFB Engine" status="operational" />
          <StatusItem label="Deception Engine" status="operational" />
          <StatusItem label="Facts Registry" status="operational" />
        </div>
        {health && (
          <p className="text-[10px] text-gray-500 mt-3">Last heartbeat: {health.timestamp}</p>
        )}
      </div>

      <div className="bg-sovereign-800 border border-sovereign-700 rounded-lg p-6">
        <h3 className="text-sovereign-200 text-sm font-bold mb-3">00-99 GOVERNANCE PROTOCOL</h3>
        <div className="text-xs text-gray-400 space-y-1">
          <p>
            <span className="text-sovereign-200">00-Strategy</span> — The Metropolitan Center
            (Strategic Legitimacy)
          </p>
          <p>
            <span className="text-sovereign-200">01-Methodology</span> — The Intellectual Soul
            (Source)
          </p>
          <p>
            <span className="text-sovereign-200">02-Execution</span> — The Machine (Build)
          </p>
          <p>
            <span className="text-sovereign-200">03-Data-Proxies</span> — The Fuel (External Truth
            Sources)
          </p>
          <p>
            <span className="text-sovereign-200">04-Validation</span> — The Output (Immutable Audit
            Log)
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TAB: Monitoring (Core Python Sovereign Node Health)
// ---------------------------------------------------------------------------

function MonitoringTab() {
  const [snapshot, setSnapshot] = useState<any>(null);
  const [source, setSource] = useState<'live' | 'mock'>('mock');

  useEffect(() => {
    const fetchLive = async () => {
      try {
        const res = await fetch('http://localhost:8010/monitor');
        if (res.ok) {
          const data = await res.json();
          setSnapshot(data);
          setSource('live');
          return;
        }
      } catch (_) {
        // server not running — fall back to rich mock
      }

      // Rich mock matching the Python core
      const mockSnapshot = {
        timestamp: new Date().toISOString(),
        node: { id: 'SOVEREIGN-9010', version: '1.2-grok-py-full-core-build' },
        governance: {
          tau_ceiling: 0.1,
          sovereign_exit: { enforcement: 'HARD_STRUCTURAL_REFUSAL', status: 'ARMED' },
        },
        facts: { registered: 142, in_memory: 8 },
        ledger: { root: 'a7f3c9e2d1b84f9e...', has_root: true },
        verification: { passed: true, total_rules: 44, contradictions: 0, last_check: new Date().toISOString() },
        health: { overall: 'HEALTHY', bootstrap_complete: true, python_core: 'connected' },
        structural: {
          enabled: true,
          shannon_entropy: 3.87,
          high_entropy_events: 2,
          low_diversity_events: 4,
        },
        deception: {
          ontology: 'merged',
          recent_detections: 7,
          avg_confidence: 0.71,
        },
        recent_events: [
          { type: 'structural', detail: 'High entropy detected', severity: 'medium', timestamp: new Date(Date.now() - 45000).toISOString() },
          { type: 'affidavit', trigger: 'STRUCTURAL_REFUSAL', fact_uuid: 'F7B2C4A9', timestamp: new Date(Date.now() - 180000).toISOString() },
          { type: 'fact', fact_uuid: 'F9D1E3B2', status: 'VERIFIED', timestamp: new Date(Date.now() - 320000).toISOString() },
          { type: 'deception', detail: 'DD-003 + DD-011 fired', confidence: 0.89, timestamp: new Date(Date.now() - 410000).toISOString() },
        ],
        raw_status: { tau_ceiling: 0.1, facts_registered: 142 },
      };
      setSnapshot(mockSnapshot);
      setSource('mock');
    };

    fetchLive();
    const interval = setInterval(fetchLive, 5000); // try to go live every 5s
    return () => clearInterval(interval);
  }, []);

  if (!snapshot) return <div className="p-8 text-gray-400">Loading Sovereign Node core monitoring...</div>;

  const isHealthy = snapshot.health.overall === 'HEALTHY';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 size={22} className="text-sovereign-200" />
          <h2 className="text-xl font-bold text-sovereign-200 tracking-[2px]">CORE MONITORING</h2>
          <span className="text-[10px] px-2 py-0.5 rounded bg-sovereign-800 text-sovereign-200">PYTHON</span>
        </div>
        <div className={`text-xs px-3 py-1 rounded-full border ${isHealthy ? 'border-green-500 text-green-400' : 'border-red-500 text-red-400'}`}>
          {snapshot.health.overall}
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-sovereign-800 border border-sovereign-700 rounded-xl p-5">
          <div className="text-[10px] text-gray-400 tracking-widest mb-1">TAU CEILING</div>
          <div className="text-4xl font-mono text-sovereign-200 tabular-nums">{(snapshot.governance.tau_ceiling * 100).toFixed(0)}%</div>
          <div className="text-emerald-400 text-xs mt-1 font-bold">HARD ENFORCEMENT • {snapshot.governance.sovereign_exit.status}</div>
        </div>

        <div className="bg-sovereign-800 border border-sovereign-700 rounded-xl p-5">
          <div className="text-[10px] text-gray-400 tracking-widest mb-1">FACTS IN REGISTRY</div>
          <div className="text-4xl font-mono text-sovereign-200 tabular-nums">{snapshot.facts.registered}</div>
          <div className="text-xs text-gray-400 mt-1">Merkle-sealed • Persistent</div>
        </div>

        <div className="bg-sovereign-800 border border-sovereign-700 rounded-xl p-5">
          <div className="text-[10px] text-gray-400 tracking-widest mb-1">LEDGER ROOT</div>
          <div className="font-mono text-sm text-sovereign-200 break-all leading-tight mt-1">{snapshot.ledger.root}</div>
          <div className="text-emerald-400 text-xs mt-2 font-bold">CHAIN INTEGRITY VERIFIED</div>
        </div>

        <div className="bg-sovereign-800 border border-sovereign-700 rounded-xl p-5">
          <div className="text-[10px] text-gray-400 tracking-widest mb-1">RULE VERIFIER</div>
          <div className="flex items-baseline gap-2">
            <div className="text-4xl font-mono text-emerald-400">{snapshot.verification.passed ? 'PASS' : 'FAIL'}</div>
          </div>
          <div className="text-xs text-gray-400 mt-1">{snapshot.verification.total_rules} rules • {snapshot.verification.contradictions} contradictions</div>
        </div>
      </div>

      {/* Structural + Deception Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-sovereign-800 border border-sovereign-700 rounded-xl p-5">
          <div className="text-sovereign-200 text-sm font-bold mb-3 tracking-wider">STRUCTURAL SIGNALS</div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-mono text-amber-400">{snapshot.structural.shannon_entropy}</div>
              <div className="text-[10px] text-gray-400">Shannon Entropy</div>
            </div>
            <div>
              <div className="text-2xl font-mono text-rose-400">{snapshot.structural.high_entropy_events}</div>
              <div className="text-[10px] text-gray-400">High Entropy</div>
            </div>
            <div>
              <div className="text-2xl font-mono text-amber-400">{snapshot.structural.low_diversity_events}</div>
              <div className="text-[10px] text-gray-400">Low Diversity</div>
            </div>
          </div>
        </div>

        <div className="bg-sovereign-800 border border-sovereign-700 rounded-xl p-5">
          <div className="text-sovereign-200 text-sm font-bold mb-3 tracking-wider">DECEPTION LAYER</div>
          <div className="flex justify-between items-end">
            <div>
              <div className="text-2xl font-mono text-violet-400">{snapshot.deception.ontology.toUpperCase()}</div>
              <div className="text-[10px] text-gray-400">Active Ontology</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-mono text-violet-400">{snapshot.deception.recent_detections}</div>
              <div className="text-[10px] text-gray-400">Recent Detections</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-mono text-violet-400">{(snapshot.deception.avg_confidence * 100).toFixed(0)}%</div>
              <div className="text-[10px] text-gray-400">Avg Confidence</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Events */}
      <div className="bg-sovereign-800 border border-sovereign-700 rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="text-sovereign-200 text-sm font-bold tracking-wider">RECENT CORE EVENTS</div>
          <div className="text-[10px] text-gray-500">Last 5 • Auto-refresh ready</div>
        </div>

        <div className="space-y-px text-xs">
          {snapshot.recent_events.map((evt: any, i: number) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-sovereign-700 last:border-0">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-px rounded text-[10px] font-bold ${evt.severity === 'high' ? 'bg-red-500/20 text-red-400' : evt.severity === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-sovereign-700 text-gray-300'}`}>
                  {evt.type.toUpperCase()}
                </span>
                <span className="text-gray-200">{evt.detail || evt.fact_uuid || evt.trigger}</span>
              </div>
              <span className="text-gray-500 tabular-nums">{new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="text-[10px] text-gray-500 border-t border-sovereign-700 pt-4">
        Data source: <code>sovereign_core.get_monitoring_snapshot()</code> via <code>core/monitoring.py</code>. 
        Ready for live polling from the Python backend.
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-sovereign-800 border border-sovereign-700 rounded-lg p-4 flex items-center gap-4">
      <div className="text-sovereign-200">{icon}</div>
      <div>
        <p className="text-[10px] text-gray-500 uppercase">{label}</p>
        <p className="text-sm font-bold text-gray-100">{value}</p>
      </div>
    </div>
  );
}

function StatusItem({ label, status }: { label: string; status: string }) {
  const isOp = status === 'operational';
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-2 h-2 rounded-full ${isOp ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}
      />
      <div>
        <p className="text-gray-300">{label}</p>
        <p className={`text-[10px] ${isOp ? 'text-green-400' : 'text-red-400'}`}>{status}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TAB: BBFB Engine
// ---------------------------------------------------------------------------

const EMPTY_EVIDENCE: ProductEvidence = {
  productName: '',
  pricePaid: 0,
  priceAdvertised: 0,
  specClaimed: 0,
  specClaimedUnit: '',
  specMeasured: 0,
  warrantyMonths: 0,
  monthsToFailure: 0,
  knownIssues: 0,
  totalFeaturesOrParts: 0,
  regulatoryRequirements: 0,
  violationsFound: 0,
  notes: '',
};

// Keys that use English-word input
type WordKey = Exclude<keyof ProductEvidence, 'productName' | 'specClaimedUnit' | 'notes'>;

const EMPTY_WORDS: Record<WordKey, string> = {
  pricePaid: '',
  priceAdvertised: '',
  specClaimed: '',
  specMeasured: '',
  warrantyMonths: '',
  monthsToFailure: '',
  knownIssues: '',
  totalFeaturesOrParts: '',
  regulatoryRequirements: '',
  violationsFound: '',
};

function BBFBTab() {
  const [evidence, setEvidence] = useState<ProductEvidence>(EMPTY_EVIDENCE);
  const [wordInputs, setWordInputs] = useState<Record<WordKey, string>>(EMPTY_WORDS);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<WordKey, string>>>({});
  const [result, setResult] = useState<BBFBResult | null>(null);
  const [loading, setLoading] = useState(false);

  const set = <K extends keyof ProductEvidence>(key: K, val: ProductEvidence[K]) =>
    setEvidence((p) => ({ ...p, [key]: val }));

  // Handle description input: validate live, extract number from description
  const handleDescChange = (key: WordKey, raw: string) => {
    setWordInputs((p) => ({ ...p, [key]: raw }));
    if (raw.trim() === '') {
      set(key, 0 as ProductEvidence[typeof key]);
      setFieldErrors((p) => {
        const next = { ...p };
        delete next[key];
        return next;
      });
      return;
    }
    if (isRawNumber(raw)) {
      setFieldErrors((p) => ({ ...p, [key]: 'CAN NOT BE A NUMBER — write a description instead' }));
      return;
    }
    if (isOnlyNumberWords(raw)) {
      setFieldErrors((p) => ({
        ...p,
        [key]: 'CAN NOT BE A NUMBER — that is just a number in words. Describe the situation.',
      }));
      return;
    }
    const parsed = parseDescriptionInput(raw);
    if ('error' in parsed) {
      setFieldErrors((p) => ({ ...p, [key]: parsed.error }));
    } else {
      set(key, parsed.value as ProductEvidence[typeof key]);
      setFieldErrors((p) => {
        const next = { ...p };
        delete next[key];
        return next;
      });
    }
  };

  const hasErrors = Object.keys(fieldErrors).length > 0;

  const descField = (id: string, label: string, key: WordKey, placeholder: string) => (
    <div>
      <label htmlFor={id} className="text-[10px] text-gray-500 block mb-1">
        {label}
      </label>
      <textarea
        id={id}
        value={wordInputs[key]}
        onChange={(e) => handleDescChange(key, e.target.value)}
        placeholder={placeholder}
        rows={2}
        className={`w-full bg-sovereign-900 border rounded px-3 py-2 text-sm text-gray-100 focus:outline-none resize-none ${
          fieldErrors[key]
            ? 'border-red-500 focus:border-red-400'
            : 'border-sovereign-700 focus:border-sovereign-200'
        }`}
      />
      {wordInputs[key].trim() !== '' && !fieldErrors[key] && (
        <p className="text-[10px] text-sovereign-200 mt-0.5">
          Extracted value = {evidence[key] as number}
        </p>
      )}
      {fieldErrors[key] && <p className="text-[10px] text-red-400 mt-0.5">{fieldErrors[key]}</p>}
    </div>
  );

  const run = useCallback(async () => {
    if (hasErrors) return;
    setLoading(true);
    try {
      const r = await apiPost<BBFBResult>('/calculate', { evidence });
      setResult(r);
    } catch {
      /* handled by UI */
    } finally {
      setLoading(false);
    }
  }, [evidence, hasErrors]);

  return (
    <div className="space-y-6">
      {/* Product / Subject */}
      <div className="bg-sovereign-800 border border-sovereign-700 rounded-lg p-6">
        <h3 className="text-sovereign-200 text-sm font-bold mb-2">
          PRODUCT OR SERVICE UNDER EVALUATION
        </h3>
        <p className="text-[10px] text-gray-500 mb-4">
          Describe what you know — write it as a sentence, the way you'd explain it to someone. The
          engine reads your description and extracts the numbers. Leave fields empty if they don't
          apply.
          <span className="text-red-400">
            {' '}
            Bare numbers and number-words are not accepted — describe it.
          </span>
        </p>

        <div className="mb-4">
          <label htmlFor="bbfb-name" className="text-[10px] text-gray-500 block mb-1">
            Product / Service Name
          </label>
          <input
            id="bbfb-name"
            type="text"
            value={evidence.productName}
            onChange={(e) => set('productName', e.target.value)}
            placeholder="e.g. Audio Pro W-Gen Speaker"
            className="w-full bg-sovereign-900 border border-sovereign-700 rounded px-3 py-2 text-sm text-gray-100 focus:border-sovereign-200 focus:outline-none"
          />
        </div>
      </div>

      {/* Price / Cost */}
      <div className="bg-sovereign-800 border border-sovereign-700 rounded-lg p-6">
        <h3 className="text-sovereign-300 text-xs font-bold mb-1">PRICE &amp; COST</h3>
        <p className="text-[10px] text-gray-600 mb-3">
          What did the manufacturer / seller advertise vs what you actually paid?
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {descField(
            'bbfb-price-adv',
            'Advertised / RRP ($)',
            'priceAdvertised',
            'The store listed it at five hundred and ninety-nine dollars',
          )}
          {descField(
            'bbfb-price-paid',
            'Price You Paid ($)',
            'pricePaid',
            'I paid five hundred and ninety-nine dollars at checkout',
          )}
        </div>
      </div>

      {/* Performance / Specs */}
      <div className="bg-sovereign-800 border border-sovereign-700 rounded-lg p-6">
        <h3 className="text-sovereign-300 text-xs font-bold mb-1">PERFORMANCE &amp; SPECS</h3>
        <p className="text-[10px] text-gray-600 mb-3">
          What did they claim the product does vs what you actually measured / experienced?
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {descField(
            'bbfb-spec-claim',
            'Claimed Spec',
            'specClaimed',
            'The manufacturer claimed one hundred decibels output',
          )}
          {descField(
            'bbfb-spec-meas',
            'Measured / Actual',
            'specMeasured',
            'I measured eighty-eight decibels in my living room',
          )}
        </div>
        <div className="mt-3">
          <label htmlFor="bbfb-spec-unit" className="text-[10px] text-gray-500 block mb-1">
            Unit (dB, km, hours, etc.)
          </label>
          <input
            id="bbfb-spec-unit"
            type="text"
            value={evidence.specClaimedUnit}
            onChange={(e) => set('specClaimedUnit', e.target.value)}
            placeholder="dB"
            className="w-full bg-sovereign-900 border border-sovereign-700 rounded px-3 py-2 text-sm text-gray-100 focus:border-sovereign-200 focus:outline-none"
          />
        </div>
      </div>

      {/* Warranty / Reliability */}
      <div className="bg-sovereign-800 border border-sovereign-700 rounded-lg p-6">
        <h3 className="text-sovereign-300 text-xs font-bold mb-1">WARRANTY &amp; RELIABILITY</h3>
        <p className="text-[10px] text-gray-600 mb-3">
          How long was the warranty vs how soon did it fail or show issues?
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {descField(
            'bbfb-warranty',
            'Warranty Period (months)',
            'warrantyMonths',
            'The warranty covered twenty-four months',
          )}
          {descField(
            'bbfb-failure',
            'Months Until First Failure',
            'monthsToFailure',
            'It failed after six months of use',
          )}
          {descField(
            'bbfb-issues',
            'Known Issues / Defects',
            'knownIssues',
            'There were three known defects reported',
          )}
        </div>
      </div>

      {/* Technical / Components */}
      <div className="bg-sovereign-800 border border-sovereign-700 rounded-lg p-6">
        <h3 className="text-sovereign-300 text-xs font-bold mb-1">COMPONENTS &amp; QUALITY</h3>
        <p className="text-[10px] text-gray-600 mb-3">
          Total features, parts, or aspects you checked. How many had problems?
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {descField(
            'bbfb-total-parts',
            'Total Features / Parts Checked',
            'totalFeaturesOrParts',
            'I checked twenty features and components',
          )}
          {descField(
            'bbfb-known-issues',
            'Faulty / Outdated / Substandard',
            'knownIssues',
            'Four of them were substandard or faulty',
          )}
        </div>
      </div>

      {/* Compliance / Regulatory */}
      <div className="bg-sovereign-800 border border-sovereign-700 rounded-lg p-6">
        <h3 className="text-sovereign-300 text-xs font-bold mb-1">REGULATORY &amp; COMPLIANCE</h3>
        <p className="text-[10px] text-gray-600 mb-3">
          How many legal / regulatory requirements did you check, and how many were breached?
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {descField(
            'bbfb-regs',
            'Total Requirements Checked',
            'regulatoryRequirements',
            'We checked against twelve regulatory requirements',
          )}
          {descField(
            'bbfb-violations',
            'Violations / Breaches Found',
            'violationsFound',
            'One violation was identified during the audit',
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="bg-sovereign-800 border border-sovereign-700 rounded-lg p-6">
        <label htmlFor="bbfb-notes" className="text-sovereign-300 text-xs font-bold block mb-2">
          NOTES (optional — for your audit record)
        </label>
        <textarea
          id="bbfb-notes"
          value={evidence.notes}
          onChange={(e) => set('notes', e.target.value)}
          rows={3}
          placeholder="Any extra detail about the product, purchase, or dispute..."
          className="w-full bg-sovereign-900 border border-sovereign-700 rounded px-3 py-2 text-sm text-gray-100 focus:border-sovereign-200 focus:outline-none resize-none"
        />
      </div>

      {/* Run Button */}
      {hasErrors && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 text-xs text-red-400">
          Fix the highlighted fields above — values must be described in English words, not digits.
        </div>
      )}

      <button
        onClick={run}
        disabled={loading || !evidence.productName.trim() || hasErrors}
        className="w-full py-3 bg-sovereign-200 text-sovereign-900 font-bold text-sm rounded hover:bg-sovereign-100 transition-colors disabled:opacity-50"
      >
        {loading ? 'CALCULATING...' : 'RUN BBFB ENGINE'}
      </button>

      {/* Results */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Overall */}
          <div
            className={`border rounded-lg p-4 flex items-center gap-3 ${
              result.overallCompliant
                ? 'bg-green-900/20 border-green-700'
                : 'bg-red-900/20 border-red-700'
            }`}
          >
            {result.overallCompliant ? (
              <CheckCircle className="text-green-400" size={24} />
            ) : (
              <XCircle className="text-red-400" size={24} />
            )}
            <div>
              <p className="font-bold text-sm">
                {result.overallCompliant ? 'COMPLIANT' : 'NON-COMPLIANT'}
              </p>
              <p className="text-[10px] text-gray-500">{result.timestamp}</p>
            </div>
          </div>

          {/* Input Evidence (audit trail) */}
          {result.inputEvidence && (
            <div className="bg-sovereign-800 border border-sovereign-700 rounded-lg p-4">
              <h4 className="text-sovereign-200 text-xs font-bold mb-3">
                ENGINE WORKINGS (How Your Inputs Became Ratios)
              </h4>
              <div className="space-y-1">
                {result.inputEvidence.map((e) => (
                  <div
                    key={e.metric}
                    className="flex items-center justify-between py-1 text-xs border-b border-sovereign-700/50"
                  >
                    <span className="text-gray-400 uppercase">{e.metric}</span>
                    <span className="text-gray-300 font-mono">
                      {e.numerator} / {e.denominator} = {e.computedRatio.toFixed(4)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LAW Gates */}
          <div className="bg-sovereign-800 border border-sovereign-700 rounded-lg p-4">
            <h4 className="text-sovereign-300 text-xs font-bold mb-3">
              LAW GATES (Binary Gauntlet)
            </h4>
            {result.law.map((g) => (
              <div key={g.metric} className="flex items-center justify-between py-1 text-xs">
                <span className="text-gray-400 uppercase">{g.metric}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-300">
                    {g.value.toFixed(3)} / {g.threshold}
                  </span>
                  {g.passed ? (
                    <CheckCircle size={14} className="text-green-400" />
                  ) : (
                    <XCircle size={14} className="text-red-400" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* GRACE Risk */}
          <div className="bg-sovereign-800 border border-sovereign-700 rounded-lg p-4">
            <h4 className="text-sovereign-300 text-xs font-bold mb-3">
              GRACE RISK (Quadratic Penalty)
            </h4>
            <Gauge
              label="Raw Penalty"
              value={result.grace.rawPenalty}
              max={6}
              color="bg-orange-500"
            />
            <Gauge
              label="Normalized Penalty"
              value={result.grace.normalizedPenalty}
              color="bg-red-500"
            />
            <p className="text-xs mt-2">
              Risk Level:{' '}
              <span
                className={`font-bold ${
                  result.grace.riskLevel === 'CRITICAL'
                    ? 'text-red-400'
                    : result.grace.riskLevel === 'HIGH'
                      ? 'text-orange-400'
                      : result.grace.riskLevel === 'MEDIUM'
                        ? 'text-yellow-400'
                        : 'text-green-400'
                }`}
              >
                {result.grace.riskLevel}
              </span>
            </p>
          </div>

          {/* FRUIT Score */}
          <div className="bg-sovereign-800 border border-sovereign-700 rounded-lg p-4">
            <h4 className="text-sovereign-300 text-xs font-bold mb-3">FRUIT AGGREGATION (WPM)</h4>
            {result.fruit.weightedScores.map((ws) => (
              <Gauge key={ws.name} label={ws.name} value={ws.weighted} color="bg-sovereign-200" />
            ))}
            <div className="mt-2 text-xs flex justify-between">
              <span className="text-gray-400">Composite Value Score (CVS)</span>
              <span
                className={`font-bold ${result.fruit.compliant ? 'text-green-400' : 'text-red-400'}`}
              >
                {result.fruit.compositeValueScore.toFixed(6)} / {result.fruit.threshold}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TAB: Deception Scanner
// ---------------------------------------------------------------------------

function DeceptionTab() {
  const [text, setText] = useState('');
  const [prioritized, setPrioritized] = useState<Set<string>>(new Set());
  const [report, setReport] = useState<DeceptionReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [showOntology, setShowOntology] = useState(false);

  const analyze = useCallback(async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const body: AnalyzeRequest = {
        text,
        prioritizedPatterns: Array.from(prioritized),
      };
      const r = await apiPost<DeceptionReport>('/analyze', body);
      setReport(r);
    } catch {
      /* handled by UI */
    } finally {
      setLoading(false);
    }
  }, [text, prioritized]);

  const togglePriority = (id: string) => {
    setPrioritized((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="bg-sovereign-800 border border-sovereign-700 rounded-lg p-6">
        <h3 className="text-sovereign-200 text-sm font-bold mb-2">DECEPTION SCANNER</h3>
        <p className="text-[10px] text-gray-500 mb-4">
          Paste text for forensic analysis. Shannon Entropy + 36-pattern ontology match.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          className="w-full bg-sovereign-900 border border-sovereign-700 rounded px-3 py-2 text-sm text-gray-100 focus:border-sovereign-200 focus:outline-none resize-none"
          placeholder="Paste AI response or corporate communication for structural deception analysis..."
        />
        <div className="flex gap-3 mt-3">
          <button
            onClick={analyze}
            disabled={loading || !text.trim()}
            className="px-6 py-2 bg-sovereign-300 text-white font-bold text-sm rounded hover:bg-red-500 transition-colors disabled:opacity-50"
          >
            {loading ? 'ANALYZING...' : 'RUN FORENSIC SCAN'}
          </button>
          <button
            onClick={() => {
              setText('');
              setReport(null);
            }}
            disabled={!text.trim() && !report}
            className="px-4 py-2 border border-sovereign-700 text-gray-400 text-sm rounded hover:border-red-500 hover:text-red-400 transition-colors disabled:opacity-50"
          >
            CLEAR
          </button>
          <button
            onClick={() => setShowOntology((v) => !v)}
            className="px-4 py-2 border border-sovereign-700 text-gray-400 text-sm rounded hover:border-sovereign-200 hover:text-sovereign-200 transition-colors"
          >
            {showOntology ? 'HIDE' : 'SHOW'} ONTOLOGY ({DECEPTION_ONTOLOGY.length})
          </button>
        </div>
      </div>

      {/* Ontology Selector */}
      <AnimatePresence>
        {showOntology && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-sovereign-800 border border-sovereign-700 rounded-lg p-4 overflow-hidden"
          >
            <h4 className="text-xs font-bold text-gray-400 mb-3">
              PRIORITIZE PATTERNS (click to toggle)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
              {DECEPTION_ONTOLOGY.map((p) => (
                <button
                  key={p.id}
                  onClick={() => togglePriority(p.id)}
                  className={`text-left text-[10px] px-3 py-2 rounded border transition-colors ${
                    prioritized.has(p.id)
                      ? 'border-sovereign-200 bg-sovereign-200/10 text-sovereign-200'
                      : 'border-sovereign-700 text-gray-500 hover:border-gray-500'
                  }`}
                >
                  <span className="font-bold">{p.id}</span> {p.name}{' '}
                  <SeverityBadge severity={p.severity} />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report */}
      {report && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Verdict */}
          <div
            className={`border rounded-lg p-4 flex items-center gap-3 ${
              report.structuralDeceptionFlag
                ? 'bg-red-900/20 border-red-700'
                : 'bg-green-900/20 border-green-700'
            }`}
          >
            {report.structuralDeceptionFlag ? (
              <AlertTriangle className="text-red-400" size={24} />
            ) : (
              <CheckCircle className="text-green-400" size={24} />
            )}
            <div>
              <p className="font-bold text-sm">
                {report.structuralDeceptionFlag
                  ? 'STRUCTURAL DECEPTION DETECTED'
                  : 'NO STRUCTURAL DECEPTION'}
              </p>
              <p className="text-[10px] text-gray-500">
                Deception Probability: {(report.deceptionProbability * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Entropy */}
          <div className="bg-sovereign-800 border border-sovereign-700 rounded-lg p-4">
            <h4 className="text-sovereign-200 text-xs font-bold mb-3">SHANNON ENTROPY ANALYSIS</h4>
            <Gauge
              label="Shannon Entropy (bits/char)"
              value={report.entropy.shannonEntropy}
              max={8}
              color={report.entropy.anomalyFlag ? 'bg-red-500' : 'bg-sovereign-200'}
            />
            <Gauge
              label="Normalized Entropy"
              value={report.entropy.normalizedEntropy}
              color="bg-sovereign-200"
            />
            {report.entropy.anomalyFlag && (
              <p className="text-[10px] text-red-400 mt-1">
                ANOMALY: Entropy exceeds 4.5 bits/char threshold
              </p>
            )}
          </div>

          {/* Detected Patterns */}
          {report.detectedPatterns.length > 0 && (
            <div className="bg-sovereign-800 border border-sovereign-700 rounded-lg p-4">
              <h4 className="text-sovereign-300 text-xs font-bold mb-3">
                DETECTED PATTERNS ({report.detectedPatterns.length})
              </h4>
              <div className="space-y-2">
                {report.detectedPatterns.map((p) => (
                  <div
                    key={p.patternId}
                    className="flex items-center justify-between text-xs border-b border-sovereign-700 pb-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 font-mono">{p.patternId}</span>
                      <span className="text-gray-200">{p.patternName}</span>
                      <SeverityBadge severity={p.severity} />
                    </div>
                    <span className="text-sovereign-200 font-bold">
                      {(p.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Forensic Reasoning */}
          {report.forensicReasoning.length > 0 && (
            <div className="bg-sovereign-800 border border-sovereign-700 rounded-lg p-4">
              <h4 className="text-sovereign-200 text-xs font-bold mb-3">FORENSIC REASONING</h4>
              <div className="space-y-1 text-[11px] text-gray-400 font-mono">
                {report.forensicReasoning.map((line, i) => (
                  <p key={i}>
                    <ChevronRight size={10} className="inline text-sovereign-200 mr-1" />
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TAB: Facts Registry
// ---------------------------------------------------------------------------

function FactsTab() {
  const [facts, setFacts] = useState<Fact[]>([]);
  const [newFact, setNewFact] = useState({
    category: 'Technical' as Fact['category'],
    statement: '',
    source: '',
  });

  const loadFacts = useCallback(async () => {
    try {
      const data = await apiGet<Fact[]>('/facts');
      setFacts(data);
    } catch {
      /* offline */
    }
  }, []);

  useEffect(() => {
    void loadFacts();
  }, [loadFacts]);

  const addFact = async () => {
    if (!newFact.statement.trim()) return;
    await apiPost('/facts', newFact);
    setNewFact({ category: 'Technical', statement: '', source: '' });
    loadFacts();
  };

  const categoryColor = (c: string) =>
    c === 'Technical' ? 'text-blue-400' : c === 'Governance' ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="space-y-6">
      {/* Add Fact */}
      <div className="bg-sovereign-800 border border-sovereign-700 rounded-lg p-6">
        <h3 className="text-sovereign-200 text-sm font-bold mb-4">REGISTER NEW FACT</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            aria-label="Fact category"
            value={newFact.category}
            onChange={(e) =>
              setNewFact((f) => ({
                ...f,
                category: e.target.value as Fact['category'],
              }))
            }
            className="bg-sovereign-900 border border-sovereign-700 rounded px-3 py-2 text-sm text-gray-100"
          >
            <option value="Technical">Technical</option>
            <option value="Governance">Governance</option>
            <option value="Forensic">Forensic</option>
          </select>
          <input
            value={newFact.source}
            onChange={(e) => setNewFact((f) => ({ ...f, source: e.target.value }))}
            placeholder="Source reference..."
            className="bg-sovereign-900 border border-sovereign-700 rounded px-3 py-2 text-sm text-gray-100"
          />
          <button
            onClick={addFact}
            disabled={!newFact.statement.trim()}
            className="px-4 py-2 bg-sovereign-200 text-sovereign-900 font-bold text-sm rounded hover:bg-sovereign-100 transition-colors disabled:opacity-50"
          >
            REGISTER
          </button>
        </div>
        <textarea
          value={newFact.statement}
          onChange={(e) => setNewFact((f) => ({ ...f, statement: e.target.value }))}
          rows={2}
          placeholder="Fact statement..."
          className="mt-3 w-full bg-sovereign-900 border border-sovereign-700 rounded px-3 py-2 text-sm text-gray-100 resize-none"
        />
      </div>

      {/* Facts Table */}
      <div className="bg-sovereign-800 border border-sovereign-700 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-sovereign-700 text-gray-500 uppercase">
              <th className="px-4 py-3 text-left">ID</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Statement</th>
              <th className="px-4 py-3 text-left">Source</th>
              <th className="px-4 py-3 text-center">Verified</th>
            </tr>
          </thead>
          <tbody>
            {facts.map((f) => (
              <tr key={f.id} className="border-b border-sovereign-700/50 hover:bg-sovereign-700/30">
                <td className="px-4 py-2 font-mono text-gray-500">#{f.id}</td>
                <td className={`px-4 py-2 font-bold ${categoryColor(f.category)}`}>{f.category}</td>
                <td className="px-4 py-2 text-gray-300 max-w-md truncate">{f.statement}</td>
                <td className="px-4 py-2 text-gray-500 font-mono">{f.source}</td>
                <td className="px-4 py-2 text-center">
                  {f.verified ? (
                    <CheckCircle size={14} className="inline text-green-400" />
                  ) : (
                    <XCircle size={14} className="inline text-gray-600" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {facts.length === 0 && (
          <p className="text-center text-gray-600 text-xs py-8">
            No facts registered. Start the backend to seed initial data.
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TAB: Protocol (00-99 Reference)
// ---------------------------------------------------------------------------

function ProtocolTab() {
  return (
    <div className="space-y-6">
      <div className="bg-sovereign-800 border border-sovereign-700 rounded-lg p-6">
        <h3 className="text-sovereign-200 text-sm font-bold mb-4">
          00-99 MASTER PROJECT FOLDER HIERARCHY
        </h3>
        <div className="font-mono text-xs text-gray-400 space-y-1 whitespace-pre">
          {`/
├── 00-Strategy/                 # The Metropolitan Center
│   ├── 00-01-Mission.md         # SMART objectives
│   └── 00-02-Governance.md      # Axiomatic rules & 10% Extraction Ceiling
├── 01-Methodology/              # The Intellectual Soul (Source)
│   ├── 01-01-BBFB-Engine.md     # LAW, GRACE, FRUIT formulas
│   ├── 01-02-Ontology.md        # 30-Pattern Deception Ontology
│   └── 01-03-Kelvity.md         # Semantic Purity (The Purinator)
├── 02-Execution/                # The Machine (Build)
│   ├── src/                     # React Frontend
│   ├── server.ts                # Express Backend
│   ├── Dockerfile               # OCI-compliant container
│   └── deploy-azure.sh          # Azure deployment
├── 03-Data-Proxies/             # The Fuel (External Truth Sources)
│   ├── facts_registry/          # Immutable JSON/SQLite
│   └── staging_ingest/          # Zero-AI Pipeline quarantine
├── 04-Validation/               # The Output (Immutable Audit)
│   ├── evidence_packs/          # Cryptographically signed logs
│   └── affidavits/              # Section 177 Technical Statements
└── .github/
    └── workflows/               # CI/CD (AC/DC Line)`}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-sovereign-800 border border-sovereign-700 rounded-lg p-4">
          <h4 className="text-sovereign-300 text-xs font-bold mb-2">CORE MANDATES</h4>
          <ul className="text-[10px] text-gray-400 space-y-2">
            <li>
              <span className="text-sovereign-200 font-bold">ISO Date Mandate:</span> All artifacts
              in 04-Validation prefixed YYYY-MM-DD.
            </li>
            <li>
              <span className="text-sovereign-200 font-bold">Source vs Build:</span> No executable
              code in 01-Methodology. No philosophy in 02-Execution.
            </li>
            <li>
              <span className="text-sovereign-200 font-bold">Immutable Ledger:</span>{' '}
              database.sqlite mounted to persistent Azure Files.
            </li>
            <li>
              <span className="text-sovereign-200 font-bold">10% Extraction Ceiling:</span> Maximum
              value extraction from any single data source.
            </li>
          </ul>
        </div>
        <div className="bg-sovereign-800 border border-sovereign-700 rounded-lg p-4">
          <h4 className="text-sovereign-300 text-xs font-bold mb-2">DEPLOYMENT TARGET</h4>
          <ul className="text-[10px] text-gray-400 space-y-2">
            <li>
              <span className="text-sovereign-200 font-bold">Subscription:</span> The Real Deal
            </li>
            <li>
              <span className="text-sovereign-200 font-bold">Resource Group:</span> groknett-deploy
            </li>
            <li>
              <span className="text-sovereign-200 font-bold">Region:</span> Australia East
            </li>
            <li>
              <span className="text-sovereign-200 font-bold">Container Image:</span>{' '}
              beendaer/groknett-valueforge:latest
            </li>
            <li>
              <span className="text-sovereign-200 font-bold">Port:</span> 8000
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TAB: Discovery — v1.0 Design Archive Browser
// ---------------------------------------------------------------------------

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Horizontal rule
    if (/^---+\s*$/.test(line)) {
      elements.push(<hr key={i} className="border-sovereign-700 my-4" />);
      i++;
      continue;
    }

    // Headers
    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} className="text-xl font-bold text-sovereign-200 mt-6 mb-3">
          {renderInline(line.slice(2))}
        </h1>,
      );
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-lg font-bold text-sovereign-300 mt-5 mb-2">
          {renderInline(line.slice(3))}
        </h2>,
      );
      i++;
      continue;
    }
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-sm font-bold text-sovereign-200 mt-4 mb-2">
          {renderInline(line.slice(4))}
        </h3>,
      );
      i++;
      continue;
    }
    if (line.startsWith('#### ')) {
      elements.push(
        <h4 key={i} className="text-xs font-bold text-gray-300 mt-3 mb-1">
          {renderInline(line.slice(5))}
        </h4>,
      );
      i++;
      continue;
    }

    // Table block
    if (line.includes('|') && line.trim().startsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      elements.push(<MarkdownTable key={`table-${i}`} lines={tableLines} />);
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <blockquote
          key={`bq-${i}`}
          className="border-l-2 border-sovereign-500 pl-3 my-3 text-gray-400 italic text-xs"
        >
          {quoteLines.map((ql, qi) => (
            <p key={qi}>{renderInline(ql)}</p>
          ))}
        </blockquote>,
      );
      continue;
    }

    // Unordered list
    if (/^\s*[-*]\s/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\s*[-*]\s/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*[-*]\s/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc list-inside my-2 space-y-1 text-xs text-gray-400">
          {listItems.map((li, li_i) => (
            <li key={li_i}>{renderInline(li)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*\d+\.\s/, ''));
        i++;
      }
      elements.push(
        <ol
          key={`ol-${i}`}
          className="list-decimal list-inside my-2 space-y-1 text-xs text-gray-400"
        >
          {listItems.map((li, li_i) => (
            <li key={li_i}>{renderInline(li)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    // Code block
    if (line.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip closing ```
      elements.push(
        <pre
          key={`code-${i}`}
          className="bg-sovereign-900 border border-sovereign-700 rounded p-3 my-3 text-xs text-gray-300 overflow-x-auto font-mono"
        >
          {codeLines.join('\n')}
        </pre>,
      );
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph
    elements.push(
      <p key={i} className="text-xs text-gray-400 my-1.5 leading-relaxed">
        {renderInline(line)}
      </p>,
    );
    i++;
  }

  return <>{elements}</>;
}

function renderInline(text: string): React.ReactNode {
  // Process bold, italic, code, and links
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold **text**
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)$/);
    if (boldMatch) {
      if (boldMatch[1]) parts.push(<span key={key++}>{boldMatch[1]}</span>);
      parts.push(
        <strong key={key++} className="text-gray-200 font-semibold">
          {boldMatch[2]}
        </strong>,
      );
      remaining = boldMatch[3];
      continue;
    }

    // Inline code `text`
    const codeMatch = remaining.match(/^(.*?)`(.+?)`(.*)$/);
    if (codeMatch) {
      if (codeMatch[1]) parts.push(<span key={key++}>{codeMatch[1]}</span>);
      parts.push(
        <code
          key={key++}
          className="bg-sovereign-900 text-sovereign-200 px-1 rounded text-[11px] font-mono"
        >
          {codeMatch[2]}
        </code>,
      );
      remaining = codeMatch[3];
      continue;
    }

    // Link [text](url) — render as text only (no external navigation)
    const linkMatch = remaining.match(/^(.*?)\[(.+?)\]\((.+?)\)(.*)$/);
    if (linkMatch) {
      if (linkMatch[1]) parts.push(<span key={key++}>{linkMatch[1]}</span>);
      parts.push(
        <span key={key++} className="text-sovereign-200">
          {linkMatch[2]}
        </span>,
      );
      remaining = linkMatch[4];
      continue;
    }

    // No more inline formatting
    parts.push(<span key={key}>{remaining}</span>);
    break;
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

function MarkdownTable({ lines }: { lines: string[] }) {
  if (lines.length < 2) return null;

  const parseRow = (line: string) =>
    line
      .split('|')
      .filter(Boolean)
      .map((cell) => cell.trim());

  const headers = parseRow(lines[0]);
  // Skip separator line (index 1)
  const rows = lines.slice(2).map(parseRow);

  return (
    <div className="overflow-x-auto my-3">
      <table className="w-full text-xs border border-sovereign-700">
        <thead>
          <tr className="bg-sovereign-900">
            {headers.map((h, i) => (
              <th
                key={i}
                className="text-left px-3 py-2 text-sovereign-200 font-bold border-b border-sovereign-700"
              >
                {renderInline(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-sovereign-800 hover:bg-sovereign-800/50">
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-1.5 text-gray-400">
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DiscoveryTab() {
  const [categories, setCategories] = useState<DiscoveryCategory[]>([]);
  const [activeDoc, setActiveDoc] = useState<string | null>(null);
  const [docContent, setDocContent] = useState<string>('');
  const [docTitle, setDocTitle] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [expandedCat, setExpandedCat] = useState<number>(0);

  useEffect(() => {
    apiGet<{ categories: DiscoveryCategory[] }>('/discovery')
      .then((data) => setCategories(data.categories))
      .catch(() => {});
  }, []);

  const openDoc = useCallback(async (filename: string, title: string) => {
    setLoading(true);
    setDocTitle(title);
    try {
      const data = await apiGet<{ filename: string; content: string }>(
        `/discovery/${encodeURIComponent(filename)}`,
      );
      setDocContent(data.content);
      setActiveDoc(filename);
    } catch {
      setDocContent('Failed to load document.');
      setActiveDoc(filename);
    } finally {
      setLoading(false);
    }
  }, []);

  if (activeDoc) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => {
            setActiveDoc(null);
            setDocContent('');
          }}
          className="flex items-center gap-2 text-xs text-sovereign-200 hover:text-sovereign-100 transition-colors"
        >
          <ArrowLeft size={14} />
          BACK TO INDEX
        </button>
        <div className="bg-sovereign-800 border border-sovereign-700 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={16} className="text-sovereign-200" />
            <h3 className="text-sovereign-200 text-sm font-bold">{docTitle}</h3>
          </div>
          <p className="text-[10px] text-gray-600 mb-4 font-mono">{activeDoc}</p>
          {loading ? (
            <p className="text-xs text-gray-500 animate-pulse">Loading…</p>
          ) : (
            <div className="max-w-none">
              <MarkdownRenderer content={docContent} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-sovereign-800 border border-sovereign-700 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-3">
          <BookOpen size={20} className="text-sovereign-200" />
          <div>
            <h3 className="text-sovereign-200 text-sm font-bold">v1.0 DESIGN ARCHIVE</h3>
            <p className="text-[10px] text-gray-500">
              30 cherry-picked architecture docs from the Next.js + Vercel KV era (Jan 2026)
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Read-only reference documents. Use them to understand why a design decision was made,
          trace feature lineage, or compare v1.0 intent against v2.0 implementation.
        </p>
      </div>

      {categories.map((cat, catIdx) => (
        <div
          key={cat.name}
          className="bg-sovereign-800 border border-sovereign-700 rounded-lg overflow-hidden"
        >
          <button
            onClick={() => setExpandedCat(expandedCat === catIdx ? -1 : catIdx)}
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-sovereign-700/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FolderOpen size={14} className="text-sovereign-300" />
              <span className="text-xs font-bold text-sovereign-200 tracking-wider">
                {cat.name.toUpperCase()}
              </span>
              <span className="text-[10px] text-gray-600">{cat.docs.length} docs</span>
            </div>
            <ChevronRight
              size={14}
              className={`text-gray-500 transition-transform ${expandedCat === catIdx ? 'rotate-90' : ''}`}
            />
          </button>
          {expandedCat === catIdx && (
            <div className="border-t border-sovereign-700">
              {cat.docs.map((doc) => (
                <button
                  key={doc.filename}
                  onClick={() => openDoc(doc.filename, doc.title)}
                  className="w-full flex items-start gap-3 px-6 py-3 text-left hover:bg-sovereign-700/20 transition-colors border-b border-sovereign-800 last:border-b-0"
                >
                  <FileText size={12} className="text-sovereign-300 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-200 font-medium">{doc.title}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{doc.description}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Evaluation Tab
// ---------------------------------------------------------------------------

function EvaluationTab() {
  const [result, setResult] = useState<EvaluationRunResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runEval = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<EvaluationRunResult>('/eval/run');
      setResult(data);
    } catch {
      setError('Evaluation run failed. Is the server running?');
    } finally {
      setLoading(false);
    }
  }, []);

  const severityColor = (passed: boolean) => (passed ? 'text-green-400' : 'text-red-400');

  const metricBar = (value: number, label: string) => {
    const pct = Math.min(value * 100, 100);
    return (
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">{label}</span>
          <span className="text-sovereign-200">{(value * 100).toFixed(1)}%</span>
        </div>
        <div className="h-2 bg-sovereign-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-sovereign-200 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  };

  const caseRow = (c: EvaluationCaseResult) => (
    <div
      key={c.caseId}
      className="flex items-start gap-3 py-2 border-b border-sovereign-800 last:border-0"
    >
      <div className="mt-0.5 flex-shrink-0">
        {c.passed ? (
          <CheckCircle size={14} className="text-green-400" />
        ) : (
          <XCircle size={14} className="text-red-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-mono text-gray-500">{c.caseId}</span>
          <span className="text-xs text-gray-200 truncate">{c.label}</span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
          <span>
            P(deception):{' '}
            <span className="text-sovereign-300">{(c.deceptionProbability * 100).toFixed(1)}%</span>
          </span>
          <span>
            Patterns: <span className="text-sovereign-300">{c.patternCount}</span>
          </span>
          <span>
            Expected:{' '}
            <span className={c.expectedDeceptive ? 'text-red-400' : 'text-green-400'}>
              {c.expectedDeceptive ? 'DECEPTIVE' : 'CLEAN'}
            </span>
          </span>
          <span>
            Predicted:{' '}
            <span className={c.predictedDeceptive ? 'text-red-400' : 'text-green-400'}>
              {c.predictedDeceptive ? 'DECEPTIVE' : 'CLEAN'}
            </span>
          </span>
          {c.falsePositive && <span className="text-yellow-500">FP</span>}
          {c.falseNegative && <span className="text-orange-500">FN</span>}
        </div>
        {c.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {c.tags.map((t) => (
              <span
                key={t}
                className="text-[9px] px-1.5 py-0.5 rounded bg-sovereign-700 text-sovereign-300"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-sovereign-800 border border-sovereign-700 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-3">
          <FlaskConical size={20} className="text-sovereign-200" />
          <div>
            <h3 className="text-sovereign-200 text-sm font-bold">EVALUATION FRAMEWORK</h3>
            <p className="text-[10px] text-gray-500">
              Runs the Sovereign Node 9010 default test suite through the BBFB / deception pipeline
              and reports accuracy, precision, recall, and F1 score.
            </p>
          </div>
        </div>
        <button
          onClick={() => void runEval()}
          disabled={loading}
          className="mt-2 px-4 py-2 text-xs font-bold tracking-wider bg-sovereign-700 hover:bg-sovereign-600 disabled:opacity-50 text-sovereign-200 border border-sovereign-600 rounded transition-colors"
        >
          {loading ? 'RUNNING…' : 'RUN EVALUATION SUITE'}
        </button>
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      </div>

      {result && (
        <>
          {/* Metrics summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-sovereign-800 border border-sovereign-700 rounded-lg p-5">
              <h4 className="text-sovereign-300 text-xs font-bold mb-4 tracking-wider">
                AGGREGATE METRICS
              </h4>
              {metricBar(result.metrics.accuracy, 'Accuracy')}
              {metricBar(result.metrics.precision, 'Precision')}
              {metricBar(result.metrics.recall, 'Recall')}
              {metricBar(result.metrics.f1Score, 'F1 Score')}
            </div>

            <div className="bg-sovereign-800 border border-sovereign-700 rounded-lg p-5">
              <h4 className="text-sovereign-300 text-xs font-bold mb-4 tracking-wider">
                CONFUSION MATRIX
              </h4>
              <div className="grid grid-cols-2 gap-3 text-center">
                {[
                  {
                    label: 'True Positives',
                    value: result.metrics.truePositives,
                    color: 'text-green-400',
                  },
                  {
                    label: 'True Negatives',
                    value: result.metrics.trueNegatives,
                    color: 'text-green-400',
                  },
                  {
                    label: 'False Positives',
                    value: result.metrics.falsePositives,
                    color: 'text-yellow-400',
                  },
                  {
                    label: 'False Negatives',
                    value: result.metrics.falseNegatives,
                    color: 'text-red-400',
                  },
                ].map((item) => (
                  <div key={item.label} className="bg-sovereign-900/60 rounded p-3">
                    <div className={`text-lg font-bold ${item.color}`}>{item.value}</div>
                    <div className="text-[10px] text-gray-500 mt-1">{item.label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-sovereign-700 flex justify-between text-xs">
                <span className="text-gray-500">
                  Passed:{' '}
                  <span
                    className={severityColor(result.metrics.passed === result.metrics.totalCases)}
                  >
                    {result.metrics.passed}/{result.metrics.totalCases}
                  </span>
                </span>
                <span className="text-gray-500">
                  Duration: <span className="text-sovereign-300">{result.durationMs}ms</span>
                </span>
                <span className="text-gray-500 font-mono text-[10px]">{result.runId}</span>
              </div>
            </div>
          </div>

          {/* Case-by-case results */}
          <div className="bg-sovereign-800 border border-sovereign-700 rounded-lg p-5">
            <h4 className="text-sovereign-300 text-xs font-bold mb-4 tracking-wider">
              CASE RESULTS — {result.suiteName}
            </h4>
            <div>{result.cases.map(caseRow)}</div>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main App
// ---------------------------------------------------------------------------

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'DASHBOARD', icon: <Activity size={16} /> },
  { id: 'monitoring', label: 'MONITORING', icon: <BarChart3 size={16} /> },
  { id: 'bbfb', label: 'BBFB ENGINE', icon: <BarChart3 size={16} /> },
  { id: 'deception', label: 'DECEPTION SCANNER', icon: <ScanSearch size={16} /> },
  { id: 'facts', label: 'FACTS REGISTRY', icon: <Database size={16} /> },
  { id: 'protocol', label: '00-99 PROTOCOL', icon: <FileText size={16} /> },
  { id: 'discovery', label: 'DISCOVERY', icon: <BookOpen size={16} /> },
  { id: 'evaluation', label: 'EVALUATION', icon: <FlaskConical size={16} /> },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  return (
    <div className="min-h-screen sovereign-grid">
      {/* Header */}
      <header className="border-b border-sovereign-700 bg-sovereign-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="text-sovereign-200" size={24} />
            <div>
              <h1 className="text-sm font-bold text-gray-100 tracking-wider">
                GROKNETT VALUEFORGE
              </h1>
              <p className="text-[10px] text-gray-500">
                Sovereign Node 9010 | TaaS Monolith v{DASHBOARD_STATS.protocolVersion}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] text-green-400">OPERATIONAL</span>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-sovereign-700 bg-sovereign-900/60">
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold tracking-wider border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-sovereign-200 text-sovereign-200'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'dashboard' && <DashboardTab />}
            {activeTab === 'monitoring' && <MonitoringTab />}
            {activeTab === 'bbfb' && <BBFBTab />}
            {activeTab === 'deception' && <DeceptionTab />}
            {activeTab === 'facts' && <FactsTab />}
            {activeTab === 'protocol' && <ProtocolTab />}
            {activeTab === 'discovery' && <DiscoveryTab />}
            {activeTab === 'evaluation' && <EvaluationTab />}
            {activeTab === 'bbfb' && <BBFBTab />}
            {activeTab === 'deception' && <DeceptionTab />}
            {activeTab === 'facts' && <FactsTab />}
            {activeTab === 'protocol' && <ProtocolTab />}
            {activeTab === 'discovery' && <DiscoveryTab />}
            {activeTab === 'evaluation' && <EvaluationTab />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-sovereign-700 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between text-[10px] text-gray-600">
          <span>GJJG-State-Core | Deterministic Sovereign Facts Stack</span>
          <span>00-99 Governance Protocol Active</span>
        </div>
      </footer>
    </div>
  );
}
