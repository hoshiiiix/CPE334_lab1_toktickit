const API_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:3000";
import { ApiError, Ticket, Pagination } from "../lab2/api";

const withCreds: RequestInit = { credentials: "include" };

async function parseOrThrow(res: Response) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body.error || "Request failed", body.fields);
  return body;
}

export interface StaffTicketListParams {
  search?: string; categoryId?: number; requestedPriority?: string; itPriority?: string;
  status?: string; ownerId?: number; unassigned?: boolean;
  sort?: string; order?: "asc" | "desc"; page?: number; pageSize?: number;
}

export async function fetchStaffTickets(params: StaffTicketListParams): Promise<{ data: Ticket[]; pagination: Pagination }> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") qs.set(k, String(v)); });
  const res = await fetch(`${API_URL}/api/staff/tickets?${qs.toString()}`, withCreds);
  return parseOrThrow(res);
}

export async function fetchStaffTicket(id: number): Promise<Ticket & { requesterName: string }> {
  const res = await fetch(`${API_URL}/api/staff/tickets/${id}`, withCreds);
  return parseOrThrow(res);
}

export interface Assignee { id: number; name: string; role: "IT_STAFF" | "ADMINISTRATOR"; }

export async function fetchAssignees(): Promise<Assignee[]> {
  const res = await fetch(`${API_URL}/api/staff/tickets/assignees`, withCreds);
  return parseOrThrow(res);
}

export async function setTicketOwner(id: number, ownerId: number | null): Promise<Ticket> {
  const res = await fetch(`${API_URL}/api/staff/tickets/${id}/owner`, {
    ...withCreds, method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ownerId }),
  });
  return parseOrThrow(res);
}

export async function setItPriority(id: number, itPriority: string): Promise<Ticket> {
  const res = await fetch(`${API_URL}/api/staff/tickets/${id}/priority`, {
    ...withCreds, method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itPriority }),
  });
  return parseOrThrow(res);
}

export async function setTicketStatus(id: number, status: string): Promise<Ticket> {
  const res = await fetch(`${API_URL}/api/staff/tickets/${id}/status`, {
    ...withCreds, method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return parseOrThrow(res);
}

export interface CommentOrNote {
  id: number; authorId: number; authorName: string; authorRole?: string; content: string; createdAt: string;
}

export async function fetchComments(ticketId: number): Promise<CommentOrNote[]> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/comments`, withCreds);
  return parseOrThrow(res);
}
export async function postComment(ticketId: number, content: string): Promise<CommentOrNote> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/comments`, {
    ...withCreds, method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  return parseOrThrow(res);
}
export async function fetchNotes(ticketId: number): Promise<CommentOrNote[]> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/notes`, withCreds);
  return parseOrThrow(res);
}
export async function postNote(ticketId: number, content: string): Promise<CommentOrNote> {
  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/notes`, {
    ...withCreds, method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  return parseOrThrow(res);
}
