export type ProposalStatus = "ACTIVE" | "CLOSED" | "ARCHIVED";
export type Category = "Governance" | "Treasury" | "Community" | "Technical" | "Partnerships" | "Protocol Upgrade";
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
  creator: string;
  createdAt: number; // ms timestamp
  yes: number;
  no: number;
  abstain: number;
  clusters: Cluster[];
  myVote?: { choice: VoteChoice; reasoning: string };
}

const HOUR = 3_600_000;
const now = Date.now();

const addr = (s: string) => `0x${s}`;

function genEntries(prefix: string, n: number, reasoning: string): ClusterMember[] {
  return Array.from({ length: n }).map((_, i) => ({
    address: addr(`${prefix}${i.toString(16).padStart(2, "0")}...${(i * 37 % 256).toString(16).padStart(2, "0")}F`),
    reasoning,
  }));
}

const baseClusters = (): Cluster[] => [
  { id: "A", label: "Cross-chain interoperability is essential for ecosystem growth", side: "for", members: 67,
    entries: genEntries("A1B2", 6, "Cross-chain interoperability is essential for ecosystem growth") },
  { id: "B", label: "Bridge protocol reduces friction for new users onboarding", side: "for", members: 45,
    entries: genEntries("C3D4", 5, "Bridge protocol reduces friction for new users onboarding") },
  { id: "C", label: "Security risks of bridges outweigh the benefits right now", side: "against", members: 28,
    entries: genEntries("E5F6", 4, "Security risks of bridges outweigh the benefits right now") },
  { id: "D", label: "Implementation timeline is too aggressive without proper audits", side: "against", members: 10,
    entries: genEntries("9876", 3, "Implementation timeline is too aggressive without proper audits") },
  { id: "E", label: "Need more technical audit details before making a decision", side: "neutral", members: 15,
    entries: genEntries("4567", 3, "Need more technical audit details before making a decision") },
];

export const initialProposals: Proposal[] = [
  {
    id: "1",
    title: "Integrate Cross-Chain Bridge Protocol",
    description:
      "Proposal to integrate a cross-chain bridge protocol enabling seamless asset transfers between our ecosystem and external chains including Ethereum, Arbitrum, and Optimism.",
    category: "Technical",
    status: "ACTIVE",
    creator: "0xA1B2...93F4",
    createdAt: now - 6 * HOUR,
    yes: 142, no: 38, abstain: 21,
    clusters: baseClusters(),
  },
  {
    id: "2",
    title: "Allocate 50,000 USDC to Community Grants",
    description:
      "This proposal seeks to allocate 50,000 USDC from the treasury to fund community-led initiatives, developer grants, and ecosystem growth programs for Q3.",
    category: "Treasury",
    status: "ACTIVE",
    creator: "0x77E1...22A9",
    createdAt: now - 20 * HOUR,
    yes: 89, no: 201, abstain: 44,
    clusters: [
      { id: "A", label: "Grants accelerate ecosystem builders and adoption", side: "for", members: 52,
        entries: genEntries("AAA1", 4, "Grants accelerate ecosystem builders and adoption") },
      { id: "B", label: "Treasury runway is too short for this allocation", side: "against", members: 120,
        entries: genEntries("BBB2", 6, "Treasury runway is too short for this allocation") },
      { id: "C", label: "Grant criteria are not clearly defined", side: "against", members: 60,
        entries: genEntries("CCC3", 4, "Grant criteria are not clearly defined") },
      { id: "D", label: "Need clearer KPIs before voting", side: "neutral", members: 28,
        entries: genEntries("DDD4", 3, "Need clearer KPIs before voting") },
    ],
  },
  {
    id: "3",
    title: "Establish Core Contributor Compensation Framework",
    description:
      "A framework defining compensation tiers, vesting schedules, and performance milestones for core contributors across engineering, marketing, and operations.",
    category: "Governance",
    status: "CLOSED",
    creator: "0xC0DE...BEEF",
    createdAt: now - 90 * HOUR,
    yes: 310, no: 95, abstain: 67,
    clusters: [
      { id: "A", label: "Clear compensation attracts and retains talent", side: "for", members: 180,
        entries: genEntries("CFA1", 6, "Clear compensation attracts and retains talent") },
      { id: "B", label: "Tiers are aligned with market standards", side: "for", members: 110,
        entries: genEntries("CFB2", 5, "Tiers are aligned with market standards") },
      { id: "C", label: "Vesting is too long for early stage", side: "against", members: 70,
        entries: genEntries("CFC3", 4, "Vesting is too long for early stage") },
      { id: "D", label: "Need more transparency on milestones", side: "neutral", members: 40,
        entries: genEntries("CFD4", 3, "Need more transparency on milestones") },
    ],
  },
  {
    id: "4",
    title: "Partner with ZKsync Ecosystem Fund",
    description:
      "Formal partnership proposal with the ZKsync Ecosystem Fund to co-fund ZK-native tooling, joint developer events, and shared grant programs.",
    category: "Partnerships",
    status: "CLOSED",
    creator: "0xZK00...EE11",
    createdAt: now - 200 * HOUR,
    yes: 178, no: 52, abstain: 29,
    clusters: [
      { id: "A", label: "Strategic alignment with ZK-native infrastructure", side: "for", members: 110,
        entries: genEntries("ZKA1", 6, "Strategic alignment with ZK-native infrastructure") },
      { id: "B", label: "Joint events expand developer reach", side: "for", members: 60,
        entries: genEntries("ZKB2", 4, "Joint events expand developer reach") },
      { id: "C", label: "Diverts focus from core roadmap", side: "against", members: 40,
        entries: genEntries("ZKC3", 3, "Diverts focus from core roadmap") },
      { id: "D", label: "Need clarity on revenue split", side: "neutral", members: 20,
        entries: genEntries("ZKD4", 3, "Need clarity on revenue split") },
    ],
  },
  {
    id: "5",
    title: "Launch Community Ambassador Program",
    description:
      "Program to recruit, train, and reward community ambassadors who represent the platform at events, moderate communities, and onboard new members globally.",
    category: "Community",
    status: "ARCHIVED",
    creator: "0xC0FF...EE99",
    createdAt: now - 500 * HOUR,
    yes: 94, no: 44, abstain: 18,
    clusters: [
      { id: "A", label: "Ambassadors drive grassroots adoption", side: "for", members: 60,
        entries: genEntries("AMA1", 4, "Ambassadors drive grassroots adoption") },
      { id: "B", label: "Rewards may be gamed by farmers", side: "against", members: 30,
        entries: genEntries("AMB2", 3, "Rewards may be gamed by farmers") },
      { id: "C", label: "Need stronger vetting process", side: "neutral", members: 15,
        entries: genEntries("AMC3", 3, "Need stronger vetting process") },
    ],
  },
];

export const VOTING_WINDOW_HOURS = 48;
