export const OWNER_ADDRESS = "0xD0b8aEEdf195499773415323cae517e5b8369F94" as const;

export type ProposalStatus = "ACTIVE" | "CLOSED" | "ARCHIVED";
export type Category =
  | "Governance"
  | "Treasury"
  | "Community"
  | "Technical"
  | "Partnerships"
  | "Protocol Upgrade";
export type VoteChoice = "Yes" | "No" | "Abstain";

export interface ClusterMember {
  address: string;
  reasoning: string;
}

export interface Cluster {
  id: string;
  label: string;
  side: "for" | "against" | "neutral";
  members: number;
  entries: ClusterMember[];
}

export interface Proposal {
  id: string;
  title: string;
  description: string;
  category: Category;
  status: ProposalStatus;
  previousStatus?: string;
  creator: string;
  createdAt: number;
  closesAt: number;
  closedAt?: number;
  yes: number;
  no: number;
  abstain: number;
  clusters: Cluster[];
  myVote?: { choice: VoteChoice; reasoning: string };
}

export interface Vote {
  vote: VoteChoice;
  reasoning: string;
  submittedAt: number;
  voter: string;
}

export const VOTING_WINDOW_HOURS = 48;

export function shortAddr(address?: string | null) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
