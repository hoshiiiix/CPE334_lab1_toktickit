import { getPrisma } from "../src/prisma.js";
import { hashPassword } from "../src/utils/password.js";

const CATEGORY_NAMES = ["Account and Access", "Hardware", "Software", "Network"];
const RELATED_SYSTEM_NAMES = [
  "Email", "Campus Wi-Fi", "VPN", "LEB2 App", "Grade Submission App", "Printer", "Corporate Laptop",
];

// BR-18 (Option A): these used to be DevRequester rows in Lab 2 and keep the
// same identity/role=REQUESTER. mustChangePassword=false so local testing can
// log straight in — documented as local-dev-only, not real credentials.
const DEV_PASSWORD = "DevPass123!"; // local development only — never a real secret

const REQUESTERS = [
  { name: "Jennifer Anderson", email: "jennifer.anderson@example.com", isActive: true },
  { name: "Michael Brown", email: "michael.brown@example.com", isActive: true },
  { name: "Sarah Johnson", email: "sarah.johnson@example.com", isActive: true },
  { name: "David Lee", email: "david.lee@example.com", isActive: true },
  { name: "Inactive Test User", email: "inactive.user@example.com", isActive: false },
];

const IT_STAFF = [
  { name: "Emily Davis", email: "emily.davis@example.com", isActive: true },
  { name: "Kevin Patel", email: "kevin.patel@example.com", isActive: true },
  { name: "Lisa Martinez", email: "lisa.martinez@example.com", isActive: true },
  { name: "Robert Wilson", email: "robert.wilson@example.com", isActive: false },
];

const ADMINISTRATORS = [
  { name: "John Smith", email: "john.smith@example.com", isActive: true },
];

async function main() {
  const prisma = getPrisma();

  for (const name of CATEGORY_NAMES) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const name of RELATED_SYSTEM_NAMES) {
    await prisma.relatedSystem.upsert({ where: { name }, update: {}, create: { name } });
  }

  const passwordHash = await hashPassword(DEV_PASSWORD);

  for (const r of REQUESTERS) {
    await prisma.user.upsert({
      where: { email: r.email },
      update: { isActive: r.isActive, name: r.name, passwordHash },
      create: { ...r, passwordHash, role: "REQUESTER", mustChangePassword: false },
    });
  }
  for (const s of IT_STAFF) {
    await prisma.user.upsert({
      where: { email: s.email },
      update: { isActive: s.isActive, name: s.name, passwordHash },
      create: { ...s, passwordHash, role: "IT_STAFF", mustChangePassword: false },
    });
  }
  for (const a of ADMINISTRATORS) {
    await prisma.user.upsert({
      where: { email: a.email },
      update: { isActive: a.isActive, name: a.name, passwordHash },
      create: { ...a, passwordHash, role: "ADMINISTRATOR", mustChangePassword: false },
    });
  }

  await seedDemoTickets(prisma);

  console.log("Seed complete.");
  console.log(`Local dev login for any seeded active user: <email> / ${DEV_PASSWORD}`);
}

// ---------------------------------------------------------------------------
// Demo tickets (Lab 3 §5.3): realistic data spread across requesters, statuses,
// priorities and owners, with example Public Comments and Internal Notes.
// Idempotent: a ticket is created only if its Ticket Number does not exist yet,
// so running the seed repeatedly never duplicates data or touches real tickets.
// ---------------------------------------------------------------------------
type DemoTicket = {
  n: number; requester: string; category: string; system: string; summary: string; description: string;
  req: "LOW" | "MEDIUM" | "HIGH"; it: "LOW" | "MEDIUM" | "HIGH" | null;
  status: "NEW" | "OPEN" | "IN_PROGRESS" | "WAITING_FOR_REQUESTER" | "RESOLVED" | "CLOSED" | "REOPENED" | "CANCELLED";
  owner: string | null; daysAgo: number; marked?: boolean;
  comments?: [by: string, text: string][]; notes?: [by: string, text: string][];
};

const J = "jennifer.anderson@example.com", M = "michael.brown@example.com", S = "sarah.johnson@example.com", D = "david.lee@example.com";
const E = "emily.davis@example.com", K = "kevin.patel@example.com", L = "lisa.martinez@example.com";

const DEMO_TICKETS: DemoTicket[] = [
  { n: 1, requester: J, category: "Hardware", system: "Corporate Laptop", summary: "Laptop battery drains quickly", description: "The battery drains much faster than usual, even when the laptop is idle. It started after last week's Windows update.", req: "MEDIUM", it: "MEDIUM", status: "IN_PROGRESS", owner: E, daysAgo: 24,
    comments: [[J, "Just adding that this happens even when I close all applications."], [E, "We are investigating the issue on your device and will update you shortly."]], notes: [[E, "Battery health report shows 61% capacity. Checking power plan and recent driver updates."]] },
  { n: 2, requester: M, category: "Network", system: "VPN", summary: "Cannot connect to VPN from home", description: "The VPN client stops at 'Authenticating' and then reports a timeout. Works fine on campus Wi-Fi.", req: "HIGH", it: "HIGH", status: "OPEN", owner: K, daysAgo: 23,
    comments: [[K, "Could you tell us which VPN client version you are using?"]] },
  { n: 3, requester: S, category: "Software", system: "Email", summary: "Email not syncing on mobile", description: "My phone has not received new email since Monday. Webmail works normally.", req: "MEDIUM", it: "MEDIUM", status: "WAITING_FOR_REQUESTER", owner: L, daysAgo: 22,
    comments: [[L, "Please remove and re-add the account on your phone, then tell us if the sync resumes."]], notes: [[L, "Server-side mailbox healthy. Likely a stale token on the device."]] },
  { n: 4, requester: D, category: "Account and Access", system: "LEB2 App", summary: "New employee setup request", description: "A new teaching assistant needs access to the LEB2 App starting next Monday.", req: "LOW", it: "LOW", status: "RESOLVED", owner: E, daysAgo: 21, marked: true,
    comments: [[E, "Access has been granted. Please confirm that you can sign in."], [D, "Confirmed, it works. Thank you!"]] },
  { n: 5, requester: J, category: "Hardware", system: "Printer", summary: "Printer keeps showing offline", description: "The shared printer on the 3rd floor appears offline from every computer in the office.", req: "MEDIUM", it: "LOW", status: "OPEN", owner: K, daysAgo: 20,
    notes: [[K, "Print spooler restarted on the print server. Monitoring for a day."]] },
  { n: 6, requester: M, category: "Account and Access", system: "Grade Submission App", summary: "Request access to Grade Submission App", description: "I need submission rights for the Software Engineering course sections this semester.", req: "LOW", it: null, status: "NEW", owner: null, daysAgo: 19 },
  { n: 7, requester: S, category: "Software", system: "LEB2 App", summary: "LEB2 App crashes when opening reports", description: "Every time I open the monthly report the application closes without an error message.", req: "HIGH", it: "HIGH", status: "IN_PROGRESS", owner: E, daysAgo: 18,
    comments: [[E, "We reproduced the crash and are preparing a fix."]], notes: [[E, "Stack trace points to the report export module. Raised with the developers."]] },
  { n: 8, requester: D, category: "Hardware", system: "Corporate Laptop", summary: "Docking station not detected", description: "The laptop does not detect the docking station or the external monitors after a restart.", req: "MEDIUM", it: "MEDIUM", status: "RESOLVED", owner: L, daysAgo: 17,
    comments: [[L, "Firmware updated on the dock. Please try again."]] },
  { n: 9, requester: J, category: "Software", system: "Corporate Laptop", summary: "Software installation request", description: "Please install the latest version of the statistics package on my laptop.", req: "LOW", it: "LOW", status: "CLOSED", owner: K, daysAgo: 16, comments: [[K, "Installed and verified. Closing this ticket."]] },
  { n: 10, requester: M, category: "Hardware", system: "Corporate Laptop", summary: "Multi-monitor setup not detected", description: "Only one of my two monitors is detected since the office move.", req: "MEDIUM", it: "LOW", status: "IN_PROGRESS", owner: L, daysAgo: 15 },
  { n: 11, requester: S, category: "Network", system: "Campus Wi-Fi", summary: "Wi-Fi drops every few minutes in building B", description: "The connection drops every five to ten minutes in the second floor meeting rooms.", req: "HIGH", it: "HIGH", status: "OPEN", owner: E, daysAgo: 14, notes: [[E, "Access point B2-04 logs show repeated channel changes."]] },
  { n: 12, requester: D, category: "Account and Access", system: "Email", summary: "Password reset not working", description: "The reset link says it has expired immediately after I click it.", req: "MEDIUM", it: "MEDIUM", status: "NEW", owner: null, daysAgo: 13 },
  { n: 13, requester: J, category: "Software", system: "Grade Submission App", summary: "Grade export shows blank column", description: "The exported CSV has an empty 'Section' column for all students.", req: "LOW", it: "LOW", status: "WAITING_FOR_REQUESTER", owner: K, daysAgo: 12, comments: [[K, "Could you attach the file you exported so we can compare it?"]] },
  { n: 14, requester: M, category: "Network", system: "Campus Wi-Fi", summary: "Cannot join the guest Wi-Fi", description: "Visitors cannot reach the guest portal login page.", req: "LOW", it: null, status: "NEW", owner: null, daysAgo: 11 },
  { n: 15, requester: S, category: "Hardware", system: "Printer", summary: "Printer prints blank pages", description: "Every job from the second floor printer comes out blank.", req: "MEDIUM", it: "MEDIUM", status: "REOPENED", owner: L, daysAgo: 10, comments: [[S, "The problem is back after two days."]], notes: [[L, "Replacing the toner cartridge did not help; checking the drum unit."]] },
  { n: 16, requester: D, category: "Software", system: "Email", summary: "Calendar invitations are not delivered", description: "Colleagues say they never receive my calendar invitations.", req: "MEDIUM", it: null, status: "NEW", owner: null, daysAgo: 9 },
  { n: 17, requester: J, category: "Account and Access", system: "VPN", summary: "VPN account locked after password change", description: "I changed my password yesterday and now my VPN account is locked.", req: "HIGH", it: "HIGH", status: "IN_PROGRESS", owner: K, daysAgo: 8, comments: [[K, "We have unlocked the account. Please try again with your new password."]] },
  { n: 18, requester: M, category: "Software", system: "LEB2 App", summary: "Need a larger upload limit for course files", description: "I cannot upload lecture videos larger than 100 MB.", req: "LOW", it: "LOW", status: "CANCELLED", owner: E, daysAgo: 7, comments: [[M, "I found another way, please cancel this request."]] },
  { n: 19, requester: S, category: "Network", system: "VPN", summary: "VPN very slow during video calls", description: "Video calls over the VPN freeze often in the afternoon.", req: "MEDIUM", it: "MEDIUM", status: "OPEN", owner: L, daysAgo: 6 },
  { n: 20, requester: D, category: "Hardware", system: "Corporate Laptop", summary: "Keyboard keys not responding", description: "Several keys on the left side of my laptop keyboard do not respond.", req: "HIGH", it: "MEDIUM", status: "NEW", owner: null, daysAgo: 5 },
  { n: 21, requester: J, category: "Software", system: "LEB2 App", summary: "Cannot see my new course in LEB2", description: "The course created yesterday does not appear in my course list.", req: "MEDIUM", it: "MEDIUM", status: "IN_PROGRESS", owner: E, daysAgo: 4, comments: [[E, "The course exists; we are checking the enrollment synchronisation."]] },
  { n: 22, requester: M, category: "Account and Access", system: "Email", summary: "Shared mailbox access request", description: "Please give me access to the department shared mailbox.", req: "LOW", it: null, status: "NEW", owner: null, daysAgo: 3 },
  { n: 23, requester: S, category: "Hardware", system: "Printer", summary: "Printer paper jam error persists", description: "The printer shows a paper jam error although there is no paper inside.", req: "LOW", it: "LOW", status: "OPEN", owner: K, daysAgo: 2 },
  { n: 24, requester: D, category: "Network", system: "Campus Wi-Fi", summary: "No network in meeting room 305", description: "Neither Wi-Fi nor the wall sockets work in meeting room 305.", req: "HIGH", it: "HIGH", status: "OPEN", owner: E, daysAgo: 1, notes: [[E, "Switch port is down. Technician scheduled for tomorrow morning."]] },
];

async function seedDemoTickets(prisma: ReturnType<typeof getPrisma>) {
  const users = new Map((await prisma.user.findMany()).map((u) => [u.email, u.id]));
  const categories = new Map((await prisma.category.findMany()).map((c) => [c.name, c.id]));
  const systems = new Map((await prisma.relatedSystem.findMany()).map((r) => [r.name, r.id]));
  const year = new Date().getFullYear();
  let created = 0;

  for (const t of DEMO_TICKETS) {
    const ticketNumber = `TKT-${year}-${String(t.n).padStart(6, "0")}`;
    if (await prisma.ticket.findUnique({ where: { ticketNumber } })) continue;

    const createdAt = new Date(Date.now() - t.daysAgo * 24 * 60 * 60 * 1000);
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber, ticketYear: year, yearSequence: t.n,
        requesterId: users.get(t.requester)!, ticketOwnerId: t.owner ? users.get(t.owner)! : null,
        categoryId: categories.get(t.category)!, relatedSystemId: systems.get(t.system)!,
        summary: t.summary, description: t.description,
        requestedPriority: t.req, itPriority: t.it, currentStatus: t.status,
        requesterMarkedResolved: Boolean(t.marked),
        createdAt, updatedAt: new Date(createdAt.getTime() + 60 * 60 * 1000),
      },
    });
    let minutes = 30;
    for (const [by, content] of t.comments ?? []) {
      await prisma.publicComment.create({ data: { ticketId: ticket.id, authorId: users.get(by)!, content, createdAt: new Date(createdAt.getTime() + (minutes += 45) * 60000) } });
    }
    for (const [by, content] of t.notes ?? []) {
      await prisma.internalNote.create({ data: { ticketId: ticket.id, authorId: users.get(by)!, content, createdAt: new Date(createdAt.getTime() + (minutes += 45) * 60000) } });
    }
    created++;
  }
  console.log(`Demo tickets: ${created} created, ${DEMO_TICKETS.length - created} already present.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
