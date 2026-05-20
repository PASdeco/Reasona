# Reasona

Reasona is a standalone GenLayer governance app for creator-led proposal publishing, voting, and whitelist management.

This project is connected to a live GenLayer intelligent contract on StudioNet and uses real wallet-based reads and writes.

## Live Deployment

- Owner wallet: `0xD0b8aEEdf195499773415323cae517e5b8369F94`
- Deployed contract: `0xEa7e3aE8Ed3E973250B2F584702Ba80312b4017F`
- Network: `StudioNet`

## Features

- Connect injected EVM wallets
- Read live proposal data from GenLayer
- Create proposals on-chain
- Vote on proposals on-chain
- Add and remove whitelisted creators from the owner wallet
- Close, archive, and unarchive proposals
- Clear active test proposals by archiving them
- Surface transaction diagnostics and write errors in the frontend

## Roles

### Owner

The owner wallet can:

- create proposals
- add creators to the whitelist
- remove creators from the whitelist
- close, archive, and unarchive proposals

### Whitelisted Creators

Whitelisted creators can:

- create proposals
- close proposals
- archive and unarchive proposals

### Community Wallets

Community wallets can:

- browse proposals
- vote on active proposals

## Tech Stack

- React
- TypeScript
- Vite
- TanStack Router
- Tailwind CSS
- `genlayer-js`

## Smart Contract

Contract file:

- `contracts/reasona.py`

Current contract methods:

- `get_owner`
- `get_whitelist`
- `is_whitelisted`
- `get_proposals`
- `get_archived_proposals`
- `get_proposal`
- `get_my_vote`
- `create_proposal`
- `submit_vote`
- `close_proposal`
- `archive_proposal`
- `unarchive_proposal`
- `add_creator`
- `remove_creator`

Note:
The currently deployed contract does not support hard deletion of proposals. To remove proposals from the active list, they must be archived.

## Frontend Integration

Main integration files:

- `src/lib/genlayer.ts`
- `src/lib/reasona.ts`
- `src/lib/wallets.ts`
- `src/store/app.tsx`

These files handle:

- wallet discovery
- provider selection
- live contract reads
- live contract writes
- transaction waiting
- error handling
- app-wide governance state

## Project Structure

```txt
contracts/
  reasona.py

src/
  components/
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
VITE_REASONA_CONTRACT_ADDRESS=0xEa7e3aE8Ed3E973250B2F584702Ba80312b4017F
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

Reasona uses injected wallet discovery and selected-provider transaction execution.

Supported wallet behavior depends on the wallet’s ability to:

- expose a standard injected EVM provider
- switch to the StudioNet chain
- sign and submit EVM-compatible transaction requests

The app is designed to work with injected wallets such as:

- MetaMask
- Rabby
- Zerion

## Admin Workflow

From the admin dashboard, authorized wallets can:

- publish proposals
- close proposals
- archive proposals
- unarchive proposals
- add creators
- remove creators
- clear active proposals

## Status

Reasona is configured as a live standalone GenLayer governance app connected to the deployed StudioNet contract.
