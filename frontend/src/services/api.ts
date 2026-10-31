const API_BASE = 'http://localhost:8000/api';

export const api = {
  // Auth
  login: async (username: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Login failed');
    return res.json();
  },
  getDemoUsers: async () => {
    const res = await fetch(`${API_BASE}/auth/demo-users`);
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
  sendMessage: async (data: any, token?: string) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to send message');
    return res.json();
  },
  markMessageRead: async (id: string) => {
    const res = await fetch(`${API_BASE}/messages/${id}/mark-read`, {
      method: 'POST'
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
  submitFDR: async (data: any, token?: string) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/fdrs`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to submit FDR');
    return res.json();
  },
  renewFDR: async (data: any, token?: string) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/fdrs/renew`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to submit renewal');
    return res.json();
  },
  simulateOCR: async (filename?: string) => {
    const res = await fetch(`${API_BASE}/fdrs/ocr-simulate?filename=${encodeURIComponent(filename || 'fdr_scan.pdf')}`, {
      method: 'POST'
    });
    return res.json();
  },

  // Bank Portal
  getBankRequest: async (token: string) => {
    const res = await fetch(`${API_BASE}/bank/request/${token}`);
    if (!res.ok) throw new Error((await res.json()).detail || 'Bank request not found');
    return res.json();
  },
  submitBankVerification: async (data: any) => {
    const res = await fetch(`${API_BASE}/bank/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Verification submission failed');
    return res.json();
  },
  getTokenQR: async (token: string) => {
    const res = await fetch(`${API_BASE}/bank/token-qr/${token}`);
    return res.json();
  },

  // Scrutiny
  submitScrutinyDecision: async (data: { fdr_id: string; decision: string; remarks: string }, token: string) => {
    const res = await fetch(`${API_BASE}/scrutiny/decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Scrutiny decision failed');
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
  applyLienRelease: async (data: { fdr_id: string; reason: string }, token?: string) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/release/apply`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Application failed');
    return res.json();
  },
  makerRecommendRelease: async (data: { release_id: string; decision: string; remarks: string }, token: string) => {
    const res = await fetch(`${API_BASE}/release/maker-recommend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Scrutiny recommendation failed');
    return res.json();
  },
  checkerApproveRelease: async (data: { release_id: string; decision: string; remarks: string }, token: string) => {
    const res = await fetch(`${API_BASE}/release/checker-approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Sanction authorization failed');
    return res.json();
  },
  executeDischarge: async (release_id: string) => {
    const res = await fetch(`${API_BASE}/release/execute-discharge/${release_id}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Discharge execution failed');
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
      method: 'POST'
    });
    return res.json();
  },
  restoreAuditBlock: async (blockIndex: number) => {
    const res = await fetch(`${API_BASE}/audit/restore-demo/${blockIndex}`, {
      method: 'POST'
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
      method: 'POST'
    });
    return res.json();
  },
  markAlertRead: async (id: string) => {
    const res = await fetch(`${API_BASE}/alerts/${id}/mark-read`, {
      method: 'POST'
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
  getInstitutions: async () => {
    const res = await fetch(`${API_BASE}/institutions`);
    return res.json();
  }
};
