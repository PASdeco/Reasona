# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json

OWNER_ADDRESS = "0xD0b8aEEdf195499773415323cae517e5b8369F94"
WINDOW_MS = 48 * 60 * 60 * 1000


class Reasona(gl.Contract):
    proposals: TreeMap[str, str]
    proposal_ids: DynArray[str]
    votes: TreeMap[str, str]
    proposal_voters: TreeMap[str, str]
    whitelist: TreeMap[str, str]
    owner: str
    next_id: str

    def __init__(self) -> None:
        self.owner = OWNER_ADDRESS
        self.whitelist[self.owner.lower()] = "1"
        self.next_id = "1"

    def _empty_clusters(self) -> list:
        return []

    def _get_now(self) -> int:
        import time
        return int(time.time() * 1000)

    def _load_proposal(self, proposal_id: str) -> dict:
        return json.loads(self.proposals[proposal_id])

    def _save_proposal(self, proposal_id: str, proposal: dict) -> None:
        self.proposals[proposal_id] = json.dumps(proposal)

    def _normalize(self, addr: str) -> str:
        return addr.lower()

    def _is_whitelisted(self, addr: str) -> bool:
        key = self._normalize(addr)
        return key in self.whitelist

    def _vote_label(self, vote: str) -> str:
        if vote == "yes":
            return "Yes"
        if vote == "no":
            return "No"
        return "Abstain"

    def _update_vote_counts(self, proposal: dict, vote: str) -> None:
        if vote == "yes":
            proposal["yes"] = proposal.get("yes", 0) + 1
        elif vote == "no":
            proposal["no"] = proposal.get("no", 0) + 1
        else:
            proposal["abstain"] = proposal.get("abstain", 0) + 1

    def _update_clusters(self, proposal: dict, voter: str, vote: str, reasoning: str) -> None:
        clusters = proposal.get("clusters", [])
        label = reasoning.strip()[:80] if reasoning.strip() else f"{self._vote_label(vote)} vote"
        side = "for" if vote == "yes" else "against" if vote == "no" else "neutral"
        match = None
        for i, cluster in enumerate(clusters):
            if cluster.get("side") == side and cluster.get("label") == label:
                match = i
                break
        entry = {"address": voter, "reasoning": reasoning}
        if match is None:
            clusters.append({
                "id": f"{side}-{len(clusters) + 1}",
                "label": label,
                "side": side,
                "members": 1,
                "entries": [entry],
            })
        else:
            clusters[match]["members"] = clusters[match].get("members", 0) + 1
            clusters[match]["entries"] = clusters[match].get("entries", []) + [entry]
        proposal["clusters"] = clusters

    def _update_status(self, proposal: dict) -> None:
        yes = proposal.get("yes", 0)
        no = proposal.get("no", 0)
        total = max(1, yes + no + proposal.get("abstain", 0))
        if proposal.get("status") == "active" and self._get_now() >= proposal.get("closes_at", 0):
            proposal["status"] = "closed"
            proposal["closed_at"] = self._get_now()
        proposal["yes"] = yes
        proposal["no"] = no
        proposal["abstain"] = proposal.get("abstain", 0)
        proposal["created_at"] = proposal.get("created_at", 0)
        proposal["closes_at"] = proposal.get("closes_at", proposal["created_at"] + WINDOW_MS)
        proposal["closed_at"] = proposal.get("closed_at", 0)
        proposal["previous_status"] = proposal.get("previous_status", proposal.get("status", "active"))

    def _visible_proposal(self, proposal_id: str) -> dict:
        proposal = self._load_proposal(proposal_id)
        self._update_status(proposal)
        return proposal

    @gl.public.view
    def get_owner(self) -> str:
        return self.owner

    @gl.public.view
    def get_whitelist(self) -> list:
        return [addr for addr in self.whitelist]

    @gl.public.view
    def is_whitelisted(self, addr: str) -> bool:
        return self._is_whitelisted(addr)

    @gl.public.view
    def get_proposals(self) -> list:
        result = []
        for proposal_id in self.proposal_ids:
            if proposal_id in self.proposals:
                proposal = self._visible_proposal(proposal_id)
                if proposal.get("status") != "archived":
                    result.append(proposal)
        result.sort(key=lambda x: x.get("created_at", 0), reverse=True)
        return result

    @gl.public.view
    def get_archived_proposals(self) -> list:
        result = []
        for proposal_id in self.proposal_ids:
            if proposal_id in self.proposals:
                proposal = self._visible_proposal(proposal_id)
                if proposal.get("status") == "archived":
                    result.append(proposal)
        result.sort(key=lambda x: x.get("created_at", 0), reverse=True)
        return result

    @gl.public.view
    def get_proposal(self, proposal_id: str) -> dict:
        if proposal_id not in self.proposals:
            return {}
        return self._visible_proposal(proposal_id)

    @gl.public.view
    def get_votes(self, proposal_id: str) -> list:
        voters = self.proposal_voters[proposal_id] if proposal_id in self.proposal_voters else ""
        if not voters:
            return []
        result = []
        for voter in voters.split(","):
            voter = voter.strip()
            if not voter:
                continue
            key = f"{proposal_id}:{voter}"
            if key in self.votes:
                result.append(json.loads(self.votes[key]))
        return result

    @gl.public.view
    def get_my_vote(self, proposal_id: str, voter: str) -> dict:
        key = f"{proposal_id}:{self._normalize(voter)}"
        if key not in self.votes:
            return {}
        return json.loads(self.votes[key])

    @gl.public.view
    def get_my_votes(self, voter: str) -> list:
        voter_lower = self._normalize(voter)
        result = []
        for proposal_id in self.proposal_ids:
            key = f"{proposal_id}:{voter_lower}"
            if key in self.votes:
                result.append({
                    "proposal": self._visible_proposal(proposal_id),
                    "vote": json.loads(self.votes[key]),
                })
        return result

    @gl.public.write
    def create_proposal(self, title: str, description: str, category: str) -> None:
        caller = self._normalize(str(gl.message.sender_address))
        assert caller in self.whitelist, "Not whitelisted"
        assert len(title) > 0, "Title required"
        assert len(description) > 0, "Description required"

        now = self._get_now()
        pid = self.next_id
        proposal = {
            "id": pid,
            "title": title,
            "description": description,
            "category": category,
            "status": "active",
            "previous_status": "active",
            "created_at": now,
            "closes_at": now + WINDOW_MS,
            "closed_at": 0,
            "creator": caller,
            "yes": 0,
            "no": 0,
            "abstain": 0,
            "clusters": [],
        }
        self.proposals[pid] = json.dumps(proposal)
        self.proposal_ids.append(pid)
        self.proposal_voters[pid] = ""
        self.next_id = str(int(self.next_id) + 1)

    @gl.public.write
    def submit_vote(self, proposal_id: str, vote: str, reasoning: str) -> None:
        caller = self._normalize(str(gl.message.sender_address))
        assert vote in ("yes", "no", "abstain"), "Invalid vote"
        assert proposal_id in self.proposals, "Proposal not found"

        proposal = self._visible_proposal(proposal_id)
        assert proposal["status"] == "active", "Proposal not active"

        voters = self.proposal_voters[proposal_id] if proposal_id in self.proposal_voters else ""
        existing = [v.strip() for v in voters.split(",") if v.strip()]
        assert caller not in existing, "Already voted"

        now = self._get_now()
        vote_obj = {
            "voter": caller,
            "vote": vote,
            "reasoning": reasoning,
            "submitted_at": now,
        }
        self.votes[f"{proposal_id}:{caller}"] = json.dumps(vote_obj)
        existing.append(caller)
        self.proposal_voters[proposal_id] = ",".join(existing)

        self._update_vote_counts(proposal, vote)
        self._update_clusters(proposal, caller, vote, reasoning)
        self._update_status(proposal)
        self._save_proposal(proposal_id, proposal)

    @gl.public.write
    def close_proposal(self, proposal_id: str) -> None:
        caller = self._normalize(str(gl.message.sender_address))
        assert caller in self.whitelist, "Not whitelisted"
        assert proposal_id in self.proposals, "Not found"
        proposal = self._visible_proposal(proposal_id)
        assert proposal["status"] != "archived", "Proposal is archived"
        proposal["status"] = "closed"
        proposal["closed_at"] = self._get_now()
        self._save_proposal(proposal_id, proposal)

    @gl.public.write
    def archive_proposal(self, proposal_id: str) -> None:
        caller = self._normalize(str(gl.message.sender_address))
        assert caller in self.whitelist, "Not whitelisted"
        assert proposal_id in self.proposals, "Not found"
        proposal = self._visible_proposal(proposal_id)
        if proposal["status"] == "archived":
            return
        proposal["previous_status"] = proposal["status"]
        proposal["status"] = "archived"
        self._save_proposal(proposal_id, proposal)

    @gl.public.write
    def unarchive_proposal(self, proposal_id: str) -> None:
        caller = self._normalize(str(gl.message.sender_address))
        assert caller in self.whitelist, "Not whitelisted"
        assert proposal_id in self.proposals, "Not found"
        proposal = self._visible_proposal(proposal_id)
        if proposal["status"] != "archived":
            return
        proposal["status"] = proposal.get("previous_status", "active")
        proposal["previous_status"] = "active"
        self._save_proposal(proposal_id, proposal)

    @gl.public.write
    def add_creator(self, addr: str) -> None:
        assert self._normalize(str(gl.message.sender_address)) == self.owner.lower(), "Owner only"
        self.whitelist[self._normalize(addr)] = "1"

    @gl.public.write
    def remove_creator(self, addr: str) -> None:
        assert self._normalize(str(gl.message.sender_address)) == self.owner.lower(), "Owner only"
        assert self._normalize(addr) != self.owner.lower(), "Cannot remove owner"
        if self._normalize(addr) in self.whitelist:
            del self.whitelist[self._normalize(addr)]
