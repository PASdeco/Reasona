export type Role = "Owner" | "Creator" | "Community";

export const MOCK_WALLETS: Record<Role, string> = {
  Owner: "0xA1B2C3D4E5F60718293A4B5C6D7E8F9012345678",
  Creator: "0xBEEFC0DE1234567890ABCDEF1122334455667788",
  Community: "0xC0FFEE00112233445566778899AABBCCDDEEFF00",
};

export const initialWhitelist: string[] = [MOCK_WALLETS.Owner, MOCK_WALLETS.Creator];

export const shortAddr = (a?: string | null) =>
  !a ? "" : `${a.slice(0, 6)}...${a.slice(-4)}`;
