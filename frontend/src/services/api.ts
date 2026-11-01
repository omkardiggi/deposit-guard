// Backend origin. Override at build time with VITE_API_BASE_URL (see .env.example)
// so the same bundle can run locally and against a hosted backend.
export const API_ORIGIN: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://localhost:8000';

const API_BASE = `${API_ORIGIN}/api`;

// ---------------------------------------------------------------------------
// Auth token store — the real JWT issued by the backend on login is kept here
// (and mirrored to localStorage so a page refresh keeps the officer signed in).
// Every authenticated request pulls the token from here automatically, so no
// component ever has to pass a token by hand.
// ---------------------------------------------------------------------------
const TOKEN_KEY = 'depositguard_token';
const USER_KEY = 'depositguard_user';

let authToken: string | null = (typeof localStorage !== 'undefined' && localStorage.getItem(TOKEN_KEY)) || null;

export const auth = {
  setToken(token: string | null) {
    authToken = token;
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch { /* storage unavailable */ }
  },
  getToken(): string | null {
    return authToken;
  },
  setUser(user: any) {
    try {
      if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
      else localStorage.removeItem(USER_KEY);
    } catch { /* storage unavailable */ }
  },
  getUser(): any | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  clear() {
    authToken = null;
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch { /* storage unavailable */ }
  }
};

// Build headers, attaching the Bearer token automatically when one is present.
function headers(json: boolean = true): Record<string, string> {
  const h: Record<string, string> = {};
  if (json) h['Content-Type'] = 'application/json';
  if (authToken) h['Authorization'] = `Bearer ${authToken}`;
  return h;
}

async function parseError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    return body.detail || fallback;
  } catch {
    return fallback;
  }
}

export const api = {
  // Auth
  login: async (username: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) throw new Error(await parseError(res, 'Login failed'));
    const data = await res.json();
    // Persist the real JWT + user so subsequent authenticated calls work.
    auth.setToken(data.access_token);
    auth.setUser(data.user);
    return data;
  },
  logout: () => {
    auth.clear();
  },
  getAccounts: async () => {
    const res = await fetch(`${API_BASE}/auth/accounts`);
    return res.json();
  },

  // Messages between AICTE Officer & Bank Officer
  getMessages: async (params?: { role?: string; unread_only?: boolean; fdr_id?: string }) => {
    const query = new URLSearchParams();
    if (params?.role) query.append('role', params.role);
    if (params?.unread_only) query.append('unread_only', 'true');
    if (params?.fdr_id) query.append('fdr_id', params.fdr_id);
    const res = await fetch(`${API_BASE}/messages?${query.toString()}`);
    return res.json();
  },
  sendMessage: async (data: any) => {
    const res = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await parseError(res, 'Failed to send message'));
    return res.json();
  },
  markMessageRead: async (id: string) => {
    const res = await fetch(`${API_BASE}/messages/${id}/mark-read`, {
      method: 'POST',
      headers: headers(false)
    });
    return res.json();
  },
  getMessageUnreadCount: async (role: string) => {
    const res = await fetch(`${API_BASE}/messages/unread-count?role=${role}`);
    return res.json();
  },

  // FDRs
  getFDRs: async (params?: { institution_id?: string; status?: string; search?: string; bank?: string }) => {
    const query = new URLSearchParams();
    if (params?.institution_id) query.append('institution_id', params.institution_id);
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    if (params?.bank) query.append('bank', params.bank);
    const res = await fetch(`${API_BASE}/fdrs?${query.toString()}`);
    return res.json();
  },
  getFDRById: async (id: string) => {
    const res = await fetch(`${API_BASE}/fdrs/${id}`);
    if (!res.ok) throw new Error('FDR not found');
    return res.json();
  },
  submitFDR: async (data: any) => {
    const res = await fetch(`${API_BASE}/fdrs`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await parseError(res, 'Failed to submit FDR'));
    return res.json();
  },
  renewFDR: async (data: any) => {
    const res = await fetch(`${API_BASE}/fdrs/renew`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await parseError(res, 'Failed to submit renewal'));
    return res.json();
  },
  // Full dossier for one instrument: institution record, bank attestations,
  // hash-chained action history, renewal lineage, releases, alerts, notices.
  getFDRHistory: async (id: string) => {
    const res = await fetch(`${API_BASE}/fdrs/${id}/history`);
    if (!res.ok) throw new Error(await parseError(res, 'Could not load FDR history'));
    return res.json();
  },

  // Document upload + real text extraction (PDF text layer, or OCR for scans).
  // NOTE: no Content-Type header here — the browser must set the multipart
  // boundary itself, so we attach only the Authorization header.
  // Passing institutionId makes the backend cross-check the document's text
  // against that institution's name / AICTE ID and report a match verdict.
  uploadDocument: async (file: File, runOcr: boolean = true, institutionId?: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('run_ocr', String(runOcr));
    if (institutionId) form.append('institution_id', institutionId);
    const h: Record<string, string> = {};
    if (authToken) h['Authorization'] = `Bearer ${authToken}`;
    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: h,
      body: form
    });
    if (!res.ok) throw new Error(await parseError(res, 'Document upload failed'));
    return res.json();
  },

  // Parse FDR fields out of text extracted in the browser. Used when the
  // server has no OCR runtime available (e.g. a serverless deployment), so the
  // same parsing rules still apply wherever the text came from.
  parseExtractedText: async (payload: {
    text: string;
    filename?: string;
    method?: string;
    engine?: string;
    pages?: number;
    confidence?: number | null;
    institution_id?: string;
  }) => {
    const res = await fetch(`${API_BASE}/documents/parse-text`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(await parseError(res, 'Could not parse the extracted text'));
    return res.json();
  },

  documentUrl: (storedPath: string) => `${API_BASE}/documents/${storedPath}`,

  // Bank Portal
  getBankRequest: async (token: string) => {
    const res = await fetch(`${API_BASE}/bank/request/${token}`);
    if (!res.ok) throw new Error(await parseError(res, 'Bank request not found'));
    return res.json();
  },
  submitBankVerification: async (data: any) => {
    const res = await fetch(`${API_BASE}/bank/verify`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await parseError(res, 'Verification submission failed'));
    return res.json();
  },
  getTokenQR: async (token: string) => {
    const res = await fetch(`${API_BASE}/bank/token-qr/${token}`);
    return res.json();
  },

  // Scrutiny (AICTE Officer)
  submitScrutinyDecision: async (data: { fdr_id: string; decision: string; remarks: string }) => {
    const res = await fetch(`${API_BASE}/scrutiny/decision`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await parseError(res, 'Scrutiny decision failed'));
    return res.json();
  },

  // Releases
  getReleaseRequests: async (params?: { institution_id?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.institution_id) query.append('institution_id', params.institution_id);
    if (params?.status) query.append('status', params.status);
    const res = await fetch(`${API_BASE}/release/requests?${query.toString()}`);
    return res.json();
  },
  applyLienRelease: async (data: { fdr_id: string; reason: string }) => {
    const res = await fetch(`${API_BASE}/release/apply`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await parseError(res, 'Application failed'));
    return res.json();
  },
  makerRecommendRelease: async (data: { release_id: string; decision: string; remarks: string }) => {
    const res = await fetch(`${API_BASE}/release/maker-recommend`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await parseError(res, 'Scrutiny recommendation failed'));
    return res.json();
  },
  checkerApproveRelease: async (data: { release_id: string; decision: string; remarks: string }) => {
    const res = await fetch(`${API_BASE}/release/checker-approve`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await parseError(res, 'Sanction authorization failed'));
    return res.json();
  },
  executeDischarge: async (release_id: string) => {
    const res = await fetch(`${API_BASE}/release/execute-discharge/${release_id}`, {
      method: 'POST',
      headers: headers(false)
    });
    if (!res.ok) throw new Error(await parseError(res, 'Discharge execution failed'));
    return res.json();
  },

  // Audit
  getAuditChain: async (limit: number = 100) => {
    const res = await fetch(`${API_BASE}/audit/chain?limit=${limit}`);
    return res.json();
  },
  verifyAuditChain: async () => {
    const res = await fetch(`${API_BASE}/audit/verify`);
    return res.json();
  },
  tamperAuditBlock: async (blockIndex: number) => {
    const res = await fetch(`${API_BASE}/audit/tamper-demo/${blockIndex}`, {
      method: 'POST',
      headers: headers(false)
    });
    return res.json();
  },
  restoreAuditBlock: async (blockIndex: number) => {
    const res = await fetch(`${API_BASE}/audit/restore-demo/${blockIndex}`, {
      method: 'POST',
      headers: headers(false)
    });
    return res.json();
  },

  // Alerts
  getAlerts: async (params?: { recipient?: string; unread_only?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.recipient) query.append('recipient', params.recipient);
    if (params?.unread_only) query.append('unread_only', 'true');
    const res = await fetch(`${API_BASE}/alerts?${query.toString()}`);
    return res.json();
  },
  runMaturityScheduler: async () => {
    const res = await fetch(`${API_BASE}/alerts/run-scheduler`, {
      method: 'POST',
      headers: headers(false)
    });
    return res.json();
  },
  markAlertRead: async (id: string) => {
    const res = await fetch(`${API_BASE}/alerts/${id}/mark-read`, {
      method: 'POST',
      headers: headers(false)
    });
    return res.json();
  },

  // Dashboard & Institutions
  getDashboardStats: async () => {
    const res = await fetch(`${API_BASE}/dashboard/stats`);
    return res.json();
  },
  getAnalytics: async () => {
    const res = await fetch(`${API_BASE}/dashboard/analytics`);
    return res.json();
  },
  getInstitutions: async (params?: { search?: string; state?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.state) query.append('state', params.state);
    const res = await fetch(`${API_BASE}/institutions?${query.toString()}`);
    return res.json();
  },

  // Consolidated AICTE-officer view of one institution: document-upload state
  // per instrument plus every declared mismatch / deficiency.
  getInstitutionSummary: async (id: string) => {
    const res = await fetch(`${API_BASE}/institutions/${id}/summary`);
    if (!res.ok) throw new Error(await parseError(res, 'Could not load institution summary'));
    return res.json();
  },

  createInstitution: async (data: {
    aicte_id: string; name: string; institute_type: string;
    state: string; city: string; email: string;
    address?: string; contact_person?: string; phone?: string;
  }) => {
    const res = await fetch(`${API_BASE}/institutions`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await parseError(res, 'Could not add institution'));
    return res.json();
  }
};
