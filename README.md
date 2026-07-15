# Reasona

Reasona is a GenLayer-native governance and reasoning platform where proposal analysis, vote interpretation, clustering, and synthesis happen inside an Intelligent Contract through GenLayer consensus.

Instead of acting like a normal deterministic poll or proposal store, Reasona uses onchain AI reasoning to:

- analyze proposal source material from the web
- interpret voter reasoning
- group similar arguments into clusters
- synthesize a live governance overview from the arguments on each side

## What Makes Reasona GenLayer-Native

Reasona is designed around GenLayer's nondeterministic execution model.

Inside the Intelligent Contract, it uses:

- `gl.nondet.web.render(...)` to fetch source content from the web
- `gl.nondet.exec_prompt(...)` to analyze proposals and votes
- `gl.vm.run_nondet_unsafe(...)` so validators independently verify the reasoning output through consensus

This means the reasoning flow is not done offchain in the frontend or a backend helper. It is executed and validated inside the contract itself.

## Core Flow

### Proposal Creation

When a whitelisted creator publishes a proposal, Reasona can:

- detect a source URL in the proposal description
- fetch the source content onchain
- generate a structured source summary
- attach evidence bullets grounded in that source

### Vote Submission

When a voter submits a vote with reasoning, Reasona can:

- analyze the argument behind the vote
- determine the stance
- generate a reusable cluster label and cluster summary
- decide whether the vote belongs in an existing argument cluster or a new one
- store the individual vote under a voter-specific key
- update bounded aggregate vote and cluster statistics

### Proposal Intelligence Refresh

Reasona can also refresh bounded proposal-level intelligence by:

- refreshing source analysis
- re-synthesizing the proposal overview from aggregate vote and cluster statistics

## Live Deployment

- Network: `StudioNet`
- Contract address: `0x2C97F6aEe54B080440c57945E0f4661bCA1565E4`
- Owner wallet: initialized dynamically from the deployer address in the contract constructor

## Validation Status

This deployment was validated live on StudioNet.

Confirmed successfully:

- proposal creation
- source-aware proposal analysis inside the contract
- vote submission
- onchain vote reasoning analysis
- reasoning cluster creation
- multi-voter clustering behavior
- synthesized proposal overview updates
- read methods against live contract state

Validated examples included:

- one supporting vote that produced a `for` cluster
- one opposing vote that produced an `against` cluster
- a contested overview generated from both sides

## Features

- Live GenLayer contract reads and writes
- Proposal publishing by whitelisted creators
- Community voting with reasoning
- Onchain reasoning clusters for support and opposition
- Source-aware proposal summaries
- Synthesized proposal overviews
- Whitelist management for creators
- Proposal closing, archiving, and unarchiving
- Frontend transaction diagnostics for StudioNet writes

## Roles

### Owner

The owner wallet can:

- create proposals
- add creators to the whitelist
- remove creators from the whitelist
- close proposals
- archive proposals
- unarchive proposals

### Whitelisted Creators

Whitelisted creators can:

- create proposals
- close proposals
- archive proposals
- unarchive proposals

### Community Wallets

Community wallets can:

- browse proposals
- submit votes with reasoning
- contribute to the evolving argument map around a proposal

## Smart Contract

Contract file:

- `contracts/reasona.py`

Key public methods:

- `get_owner`
- `get_whitelist`
- `is_whitelisted`
- `get_proposals`
- `get_archived_proposals`
- `get_proposal`
- `has_voted`
- `get_vote`
- `get_votes` for explicit voter address batches
- `get_my_vote`
- `get_my_votes`
- `create_proposal`
- `submit_vote`
- `refresh_proposal_intelligence`
- `close_proposal`
- `archive_proposal`
- `unarchive_proposal`
- `add_creator`
- `remove_creator`

Key onchain storage:

- proposals store bounded metadata, vote totals, `cluster_count`, `source`, and `overview`
- individual votes are stored under direct `proposal_id:voter` keys with the submitted reasoning and analysis
- cluster aggregates are stored under separate per-cluster keys with label, side, member count, and confidence
- proposal JSON does not contain voter lists, raw vote reasoning arrays, or per-vote cluster entries

## Frontend

The frontend is a React + TypeScript app connected directly to the live GenLayer contract.

Main integration files:

- `src/lib/genlayer.ts`
- `src/lib/reasona.ts`
- `src/lib/wallets.ts`
- `src/store/app.tsx`

These handle:

- injected wallet discovery
- StudioNet wallet setup
- live contract reads
- live contract writes
- transaction waiting and recovery
- app-wide governance state

## Tech Stack

- React
- TypeScript
- Vite
- TanStack Router
- Tailwind CSS
- `genlayer-js`
- GenLayer Intelligent Contracts

## Project Structure

```txt
contracts/
  reasona.py

src/
  components/
    ProposalCard.tsx
    VotePanel.tsx
    WalletConnect.tsx
    WalletPicker.tsx
  lib/
    genlayer.ts
    reasona.ts
    wallets.ts
  routes/
    admin.tsx
    analytics.tsx
    explore.tsx
    index.tsx
    proposals.$id.tsx
  store/
    app.tsx
```

## Environment

Create a `.env` file:

```env
# Replace with the address returned by redeploying contracts/reasona.py.
VITE_REASONA_CONTRACT_ADDRESS=0x2C97F6aEe54B080440c57945E0f4661bCA1565E4
```

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Production Build

```bash
npm run build
```

## Wallet Support

Reasona uses injected EVM wallets for frontend transaction execution on StudioNet.

It is designed to work with wallets such as:

- MetaMask
- Rabby
- Zerion

Supported behavior depends on whether the wallet can:

- expose an injected EVM provider
- switch or add the StudioNet chain
- sign and submit EVM-compatible transaction requests

## Notes

- Proposals are not hard-deleted from the current deployment.
- To remove a proposal from the active list, archive it.
- StudioNet transactions can take time to move through consensus stages, so the frontend includes extended receipt waiting and better handling for long-running transactions.

## Summary

Reasona turns governance from a plain vote counter into an onchain reasoning system.

It lets people not only vote, but explain why they voted, then uses GenLayer consensus to structure those arguments into clusters and proposal-level intelligence that other participants can inspect.
