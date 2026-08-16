import { getPrisma } from "../src/prisma.js";

// Issue 3 — seed the four supported categories.
// Uses upsert (not create) so re-running this seed never creates
// duplicate categories — satisfies the Issue 3 idempotency requirement.
const CATEGORY_NAMES = ["Account and Access", "Hardware", "Software", "Network"];

async function main() {
  const prisma = getPrisma();
  for (const name of CATEGORY_NAMES) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log("Seed complete. Categories:", CATEGORY_NAMES.join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });