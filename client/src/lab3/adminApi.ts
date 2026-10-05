import { ApiError } from "../lab2/api";

const API_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:3000";
const withCreds: RequestInit = { credentials: "include" };
const jsonHeaders = { "Content-Type": "application/json" };

async function parseOrThrow(res: Response) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body.error || "Request failed", body.fields);
  return body;
}

export type UserRole = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword?: boolean;
}

export interface CreateUserInput {
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  initialPassword: string;
}

export type UpdateUserInput = Partial<Pick<AdminUser, "name" | "email" | "role" | "isActive">>;

export async function listUsers(params: { search?: string; role?: string } = {}): Promise<AdminUser[]> {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.role) qs.set("role", params.role);
  const res = await fetch(`${API_URL}/api/admin/users?${qs.toString()}`, withCreds);
  return parseOrThrow(res);
}

export async function createUser(input: CreateUserInput): Promise<AdminUser> {
  const res = await fetch(`${API_URL}/api/admin/users`, {
    ...withCreds, method: "POST", headers: jsonHeaders, body: JSON.stringify(input),
  });
  return parseOrThrow(res);
}

export async function updateUser(id: number, patch: UpdateUserInput): Promise<AdminUser> {
  const res = await fetch(`${API_URL}/api/admin/users/${id}`, {
    ...withCreds, method: "PATCH", headers: jsonHeaders, body: JSON.stringify(patch),
  });
  return parseOrThrow(res);
}

export async function setInitialPassword(id: number, newInitialPassword: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/admin/users/${id}/reset-password`, {
    ...withCreds, method: "POST", headers: jsonHeaders, body: JSON.stringify({ newInitialPassword }),
  });
  await parseOrThrow(res);
}
