import bcrypt from "bcryptjs";

const COST = 11;

// Compared against when the user does not exist, so response time does not reveal valid e-mails.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= bcrypt.hash("carsi-timing-equaliser", COST));

export function hashPassword(password: string, cost: number = COST): Promise<string> {
  return bcrypt.hash(password, cost);
}

export async function verifyPassword(password: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash) {
    await bcrypt.compare(password, await getDummyHash());
    return false;
  }
  return bcrypt.compare(password, hash);
}
