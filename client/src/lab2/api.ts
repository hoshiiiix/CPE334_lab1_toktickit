const API_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:3000";

function authHeaders(requesterId: number | null): Record<string, string> {
  return requesterId ? { "X-Dev-Requester-Id": String(requesterId) } : {};
}

export interface Category {
  id: number;
  name: string;
}
export interface RelatedSystem {
  id: number;
  name: string;
}
export interface DevRequesterOption {
  id: number;
  name: string;
  email: string;
}
export interface Attachment {
  id: number;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  isRemoved: boolean;
  removedAt: string | null;
  removedReason: string | null;
}
export interface Ticket {
  id: number;
  ticketNumber: string;
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  description: string;
  requestedPriority: "LOW" | "MEDIUM" | "HIGH";
  itPriority: string | null;
  currentStatus: string;
  createdAt: string;
  updatedAt: string;
  attachments: Attachment[];
}
export interface Pagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

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
  if (!res.ok) {
    throw new ApiError(res.status, body.error || "Request failed", body.fields);
  }
  return body;
}

export async function fetchDevRequesters(): Promise<DevRequesterOption[]> {
  const res = await fetch(`${API_URL}/api/dev-requesters`);
  return parseOrThrow(res);
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/api/categories`);
  return parseOrThrow(res);
}

export async function fetchRelatedSystems(): Promise<RelatedSystem[]> {
  const res = await fetch(`${API_URL}/api/related-systems`);
  return parseOrThrow(res);
}

export async function createTicket(
  requesterId: number,
  formData: FormData
): Promise<Ticket & { failedAttachments: string[] }> {
  const res = await fetch(`${API_URL}/api/tickets`, {
    method: "POST",
    headers: authHeaders(requesterId),
    body: formData,
  });
  return parseOrThrow(res);
}

export interface TicketListParams {
  search?: string;
  categoryId?: number;
  requestedPriority?: string;
  status?: string;
  sort?: string;
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function fetchTickets(
  requesterId: number,
  params: TicketListParams
): Promise<{ data: Ticket[]; pagination: Pagination }> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  });
  const res = await fetch(`${API_URL}/api/tickets?${qs.toString()}`, {
    headers: authHeaders(requesterId),
  });
  return parseOrThrow(res);
}

export async function fetchTicket(requesterId: number, id: number): Promise<Ticket> {
  const res = await fetch(`${API_URL}/api/tickets/${id}`, {
    headers: authHeaders(requesterId),
  });
  return parseOrThrow(res);
}

export async function addAttachment(
  requesterId: number,
  ticketId: number,
  file: File
): Promise<Attachment> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
    method: "POST",
    headers: authHeaders(requesterId),
    body: formData,
  });
  return parseOrThrow(res);
}

export function downloadAttachmentUrl(id: number): string {
  return `${API_URL}/api/attachments/${id}/download`;
}

export async function removeAttachment(
  requesterId: number,
  id: number,
  reason: string
): Promise<Attachment> {
  const res = await fetch(`${API_URL}/api/attachments/${id}`, {
    method: "DELETE",
    headers: { ...authHeaders(requesterId), "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  return parseOrThrow(res);
}
