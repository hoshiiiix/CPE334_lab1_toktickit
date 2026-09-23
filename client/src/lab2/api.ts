const API_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:3000";

class ApiError extends Error {
  status: number;
  fields?: Record<string, string>;
  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}
export { ApiError };

async function parseOrThrow(res: Response) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body.error || "Request failed", body.fields);
  return body;
}

// credentials: "include" is required on EVERY call so the browser sends/
// receives the httpOnly session cookie (BR-08). This replaces Lab 2's
// X-Dev-Requester-Id header entirely.
const withCreds: RequestInit = { credentials: "include" };

export interface CurrentUser {
  id: number;
  name: string;
  email?: string;
  role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  mustChangePassword: boolean;
}

export async function login(email: string, password: string): Promise<CurrentUser> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    ...withCreds,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return parseOrThrow(res);
}

export async function logout(): Promise<void> {
  await fetch(`${API_URL}/api/auth/logout`, { ...withCreds, method: "POST" });
}

export async function fetchMe(): Promise<CurrentUser> {
  const res = await fetch(`${API_URL}/api/auth/me`, withCreds);
  return parseOrThrow(res);
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<void> {
  const res = await fetch(`${API_URL}/api/auth/change-password`, {
    ...withCreds,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
  });
  await parseOrThrow(res);
}

// --- Lab 1/2 reference data & tickets (now cookie-authenticated) ---

export interface Category { id: number; name: string; }
export interface RelatedSystem { id: number; name: string; }
export interface Attachment {
  id: number; originalFilename: string; mimeType: string; sizeBytes: number;
  uploadedAt: string; isRemoved: boolean; removedAt: string | null; removedReason: string | null;
}
export interface Ticket {
  id: number; ticketNumber: string; requesterId: number;
  ticketOwnerId: number | null; ticketOwnerName: string | null;
  categoryId: number; relatedSystemId: number; summary: string; description: string;
  requestedPriority: "LOW" | "MEDIUM" | "HIGH"; itPriority: string | null;
  currentStatus: string; requesterMarkedResolved: boolean;
  createdAt: string; updatedAt: string; attachments: Attachment[];
}
export interface Pagination { page: number; pageSize: number; totalItems: number; totalPages: number; }

export async function fetchCategories(): Promise<Category[]> {
  return parseOrThrow(await fetch(`${API_URL}/api/categories`));
}
export async function fetchRelatedSystems(): Promise<RelatedSystem[]> {
  return parseOrThrow(await fetch(`${API_URL}/api/related-systems`));
}

export async function createTicket(formData: FormData): Promise<Ticket & { failedAttachments: string[] }> {
  const res = await fetch(`${API_URL}/api/tickets`, { ...withCreds, method: "POST", body: formData });
  return parseOrThrow(res);
}

export interface TicketListParams {
  search?: string; categoryId?: number; requestedPriority?: string; status?: string;
  sort?: string; order?: "asc" | "desc"; page?: number; pageSize?: number;
}

export async function fetchTickets(params: TicketListParams): Promise<{ data: Ticket[]; pagination: Pagination }> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") qs.set(k, String(v)); });
  const res = await fetch(`${API_URL}/api/tickets?${qs.toString()}`, withCreds);
  return parseOrThrow(res);
}

export async function fetchTicket(id: number): Promise<Ticket> {
  const res = await fetch(`${API_URL}/api/tickets/${id}`, withCreds);
  return parseOrThrow(res);
}

export async function markTicketResolved(id: number): Promise<{ requesterMarkedResolved: boolean }> {
  const res = await fetch(`${API_URL}/api/tickets/${id}/mark-resolved`, { ...withCreds, method: "PATCH" });
  return parseOrThrow(res);
}

export async function addAttachment(ticketId: number, file: File): Promise<Attachment> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, { ...withCreds, method: "POST", body: formData });
  return parseOrThrow(res);
}

export function downloadAttachmentUrl(id: number): string {
  return `${API_URL}/api/attachments/${id}/download`;
}

export async function removeAttachment(id: number, reason: string): Promise<Attachment> {
  const res = await fetch(`${API_URL}/api/attachments/${id}`, {
    ...withCreds,
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  return parseOrThrow(res);
}
