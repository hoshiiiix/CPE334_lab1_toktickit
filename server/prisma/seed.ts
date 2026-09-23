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

  console.log("Seed complete.");
  console.log(`Local dev login for any seeded active user: <email> / ${DEV_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
