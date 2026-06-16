# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json
import re
from typing import Any

OWNER_ADDRESS = "0xD0b8aEEdf195499773415323cae517e5b8369F94"
WINDOW_MS = 48 * 60 * 60 * 1000
MAX_REASONING_CHARS = 2_000
MAX_CONTEXT_CHARS = 12_000


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

    def _get_now(self) -> int:
        import time
        return int(time.time() * 1000)

    def _normalize(self, addr: Any) -> str:
        return str(addr).lower().strip()

    def _is_whitelisted(self, addr: str) -> bool:
        return self._normalize(addr) in self.whitelist

    def _proposal_key(self, proposal_id: Any) -> str:
        return str(proposal_id).strip()

    def _load_proposal(self, proposal_id: str) -> dict:
        proposal_id = self._proposal_key(proposal_id)
        return json.loads(self.proposals[proposal_id])

    def _save_proposal(self, proposal_id: str, proposal: dict) -> None:
        proposal_id = self._proposal_key(proposal_id)
        self.proposals[proposal_id] = json.dumps(proposal, ensure_ascii=False, separators=(",", ":"))

    def _sanitize_text(self, value: str, limit: int) -> str:
        collapsed = re.sub(r"\s+", " ", value.replace("\r", " ")).strip()
        return collapsed[:limit]

    def _extract_first_url(self, text: str) -> str:
        match = re.search(r"https?://[^\s)]+", text)
        return match.group(0) if match else ""

    def _vote_label(self, vote: str) -> str:
        if vote == "yes":
            return "support"
        if vote == "no":
            return "oppose"
        return "abstain"

    def _load_votes(self, proposal_id: str) -> list:
        proposal_id = self._proposal_key(proposal_id)
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

    def _candidate_clusters(self, proposal: dict, stance: str) -> list:
        candidates = []
        for cluster in proposal.get("clusters", []):
            if cluster.get("side") == stance:
                candidates.append(
                    {
                        "id": cluster.get("id", ""),
                        "label": cluster.get("label", ""),
                        "summary": cluster.get("summary", ""),
                        "members": int(cluster.get("members", 0)),
                    }
                )
        return candidates

    def _proposal_source_summary(self, proposal: dict) -> dict:
        source = proposal.get("source", {}) if isinstance(proposal.get("source"), dict) else {}
        return {
            "url": str(source.get("url", "")),
            "title": str(source.get("title", "")),
            "summary": str(source.get("summary", "")),
            "evidence": source.get("evidence", []),
        }

    def _default_vote_analysis(self, vote: str, reasoning: str) -> dict:
        cleaned = self._sanitize_text(reasoning, MAX_REASONING_CHARS)
        fallback_label = cleaned[:72] if cleaned else f"{self._vote_label(vote).title()} position"
        return {
            "stance": "for" if vote == "yes" else "against" if vote == "no" else "neutral",
            "theme": fallback_label,
            "cluster_label": fallback_label,
            "cluster_summary": cleaned[:220] if cleaned else fallback_label,
            "rationale_summary": cleaned[:220] if cleaned else fallback_label,
            "evidence_used": [],
            "new_cluster": True,
            "matching_cluster_id": "",
            "confidence": 60,
        }

    def _default_source_analysis(self, url: str) -> dict:
        return {
            "url": url,
            "title": "No external source analyzed",
            "summary": "",
            "evidence": [],
            "fetched": False,
        }

    def _default_overview(self, proposal: dict) -> dict:
        total_votes = proposal.get("yes", 0) + proposal.get("no", 0) + proposal.get("abstain", 0)
        return {
            "headline": f"{proposal.get('title', 'Proposal')} has {total_votes} recorded vote(s).",
            "support_summary": "",
            "oppose_summary": "",
            "neutral_summary": "",
            "key_tradeoffs": [],
            "consensus_temperature": "forming" if total_votes > 0 else "early",
            "recommended_focus": "Collect more votes and reasoning to strengthen the governance signal.",
        }

    def _analyze_proposal_source(self, title: str, description: str) -> dict:
        url = self._extract_first_url(description)
        if not url:
            return self._default_source_analysis("")
        criteria = """
Return strict JSON with:
- url: original URL string
- title: short source title
- summary: 2-4 sentences summarizing stable facts relevant to the proposal
- evidence: array of 2-5 short evidence bullets grounded in the source
- fetched: boolean

Requirements:
- Use only information present in the source content.
- Ignore unstable values like timestamps, counters, ads, comments, and recommendation widgets.
- Keep evidence bullets short and factual.
- If the page is noisy, focus on the main article or document body only.
"""

        def leader_fn():
            source_html = gl.nondet.web.render(url, mode="html")
            source_text = re.sub(r"\s+", " ", str(source_html).replace("\r", " ")).strip()[:MAX_CONTEXT_CHARS]
            prompt = f"""
You are Reasona's proposal source analyst.

Proposal title:
{title}

Proposal description:
{description}

Source URL:
{url}

Source content:
<source>{source_text}</source>

{criteria}
"""
            result = gl.nondet.exec_prompt(prompt, response_format="json")
            if not isinstance(result, dict):
                raise gl.vm.UserError("Proposal source analysis must return JSON.")
            return result

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            data = leader_result.calldata
            if not isinstance(data, dict):
                return False
            title_value = str(data.get("title", "")).strip()
            summary_value = str(data.get("summary", "")).strip()
            evidence = data.get("evidence")
            fetched = data.get("fetched")
            if type(fetched) is not bool:
                return False
            if not isinstance(evidence, list):
                return False
            if len(title_value) == 0 or len(title_value) > 180:
                return False
            if len(summary_value) > 700:
                return False
            if len(evidence) > 5:
                return False
            for item in evidence:
                if not isinstance(item, str) or len(item.strip()) == 0 or len(item.strip()) > 180:
                    return False
            source_html = gl.nondet.web.render(url, mode="html")
            source_text = re.sub(r"\s+", " ", str(source_html).replace("\r", " ")).strip()[:MAX_CONTEXT_CHARS]
            verdict = gl.nondet.exec_prompt(
                f"""
You are a GenLayer validator checking whether a leader's proposal source summary is faithful.

Proposal title:
{title}

Proposal description:
{description}

Source URL:
{url}

Source content:
<source>{source_text}</source>

Leader output:
{json.dumps(data, ensure_ascii=False)}

Reply with only true or false.
Return true only if:
- the title, summary, and evidence are materially supported by the source
- the output stays focused on governance-relevant facts
- the output does not rely on unstable webpage details
"""
            )
            return str(verdict).strip().lower() == "true"

        try:
            result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
            if not isinstance(result, dict):
                return self._default_source_analysis(url)
            return {
                "url": url,
                "title": str(result.get("title", "")).strip(),
                "summary": str(result.get("summary", "")).strip(),
                "evidence": [str(item).strip() for item in result.get("evidence", []) if isinstance(item, str)],
                "fetched": bool(result.get("fetched", False)),
            }
        except Exception:
            return self._default_source_analysis(url)

    def _analyze_vote_reasoning(self, proposal: dict, vote: str, reasoning: str) -> dict:
        reasoning_clean = self._sanitize_text(reasoning, MAX_REASONING_CHARS)
        source_summary = self._proposal_source_summary(proposal)
        candidates = self._candidate_clusters(
            proposal,
            "for" if vote == "yes" else "against" if vote == "no" else "neutral",
        )

        task = "Analyze a governance vote explanation and assign it to the right reasoning cluster."
        criteria = """
Return strict JSON with:
- stance: one of "for", "against", "neutral"
- theme: short phrase naming the core argument
- cluster_label: 2-8 word reusable cluster label
- cluster_summary: 1-2 sentence summary of the argument cluster
- rationale_summary: 1 sentence summary of this specific vote
- evidence_used: array of 0-3 short phrases grounded in the proposal source if relevant
- new_cluster: boolean
- matching_cluster_id: existing cluster id or empty string
- confidence: integer 0-100

Requirements:
- Respect the user's chosen vote side.
- Use the proposal source summary when it materially grounds the reasoning.
- Reuse an existing cluster only when the argument is substantively the same.
- Do not invent facts beyond the voter reasoning and proposal source summary.
- Keep labels stable and reusable across similar future votes.
"""

        def leader_fn():
            prompt = f"""
You are Reasona's onchain governance analyst.

Proposal title:
{proposal.get("title", "")}

Proposal description:
{proposal.get("description", "")}

Proposal category:
{proposal.get("category", "")}

Proposal source summary:
{json.dumps(source_summary, ensure_ascii=False)}

Existing candidate clusters for this stance:
{json.dumps(candidates, ensure_ascii=False)}

Declared vote:
{vote}

Voter reasoning:
{reasoning_clean}

{criteria}
"""
            result = gl.nondet.exec_prompt(prompt, response_format="json")
            if not isinstance(result, dict):
                raise gl.vm.UserError("Vote analysis must return JSON.")
            return result

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            data = leader_result.calldata
            if not isinstance(data, dict):
                return False
            stance = data.get("stance")
            theme = str(data.get("theme", "")).strip()
            cluster_label = str(data.get("cluster_label", "")).strip()
            cluster_summary = str(data.get("cluster_summary", "")).strip()
            rationale_summary = str(data.get("rationale_summary", "")).strip()
            evidence_used = data.get("evidence_used")
            new_cluster = data.get("new_cluster")
            matching_cluster_id = str(data.get("matching_cluster_id", "")).strip()
            confidence = data.get("confidence")

            expected_stance = "for" if vote == "yes" else "against" if vote == "no" else "neutral"
            if stance != expected_stance:
                return False
            if type(new_cluster) is not bool:
                return False
            if not isinstance(evidence_used, list):
                return False
            if not isinstance(confidence, int):
                return False
            if confidence < 0 or confidence > 100:
                return False
            if len(theme) == 0 or len(theme) > 90:
                return False
            if len(cluster_label) == 0 or len(cluster_label) > 90:
                return False
            if len(cluster_summary) == 0 or len(cluster_summary) > 320:
                return False
            if len(rationale_summary) == 0 or len(rationale_summary) > 220:
                return False
            if len(evidence_used) > 3:
                return False
            for item in evidence_used:
                if not isinstance(item, str) or len(item.strip()) == 0 or len(item.strip()) > 160:
                    return False
            if not new_cluster and len(matching_cluster_id) == 0:
                return False
            verdict = gl.nondet.exec_prompt(
                f"""
You are a GenLayer validator checking a governance vote analysis.

Proposal title:
{proposal.get("title", "")}

Proposal description:
{proposal.get("description", "")}

Proposal category:
{proposal.get("category", "")}

Proposal source summary:
{json.dumps(source_summary, ensure_ascii=False)}

Existing candidate clusters for this stance:
{json.dumps(candidates, ensure_ascii=False)}

Declared vote:
{vote}

Voter reasoning:
{reasoning_clean}

Leader output:
{json.dumps(data, ensure_ascii=False)}

Reply with only true or false.
Return true only if:
- the stance matches the declared vote
- the cluster label and summary reflect the actual reasoning
- any cluster reuse is substantively justified
- no facts are invented beyond the reasoning and source summary
"""
            )
            return str(verdict).strip().lower() == "true"

        result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        if not isinstance(result, dict):
            raise gl.vm.UserError("Vote analysis did not produce structured output.")
        return {
            "stance": str(result.get("stance", "neutral")),
            "theme": self._sanitize_text(str(result.get("theme", "")), 90),
            "cluster_label": self._sanitize_text(str(result.get("cluster_label", "")), 90),
            "cluster_summary": self._sanitize_text(str(result.get("cluster_summary", "")), 320),
            "rationale_summary": self._sanitize_text(str(result.get("rationale_summary", "")), 220),
            "evidence_used": [
                self._sanitize_text(str(item), 160)
                for item in result.get("evidence_used", [])
                if isinstance(item, str) and len(str(item).strip()) > 0
            ],
            "new_cluster": bool(result.get("new_cluster", True)),
            "matching_cluster_id": self._sanitize_text(str(result.get("matching_cluster_id", "")), 120),
            "confidence": int(result.get("confidence", 60)),
        }

    def _synthesize_proposal_overview(self, proposal: dict) -> dict:
        source_summary = self._proposal_source_summary(proposal)
        clusters = []
        for cluster in proposal.get("clusters", []):
            clusters.append(
                {
                    "id": cluster.get("id", ""),
                    "label": cluster.get("label", ""),
                    "side": cluster.get("side", ""),
                    "members": int(cluster.get("members", 0)),
                    "summary": cluster.get("summary", ""),
                    "top_quotes": cluster.get("top_quotes", []),
                }
            )

        task = "Summarize the current governance reasoning landscape for this proposal."
        criteria = """
Return strict JSON with:
- headline: one short sentence
- support_summary: short paragraph
- oppose_summary: short paragraph
- neutral_summary: short paragraph
- key_tradeoffs: array of 2-5 concise tradeoffs or decision tensions
- consensus_temperature: one of "early", "forming", "contested", "leaning", "settled"
- recommended_focus: one short sentence about what delegates should inspect next

Requirements:
- Use only proposal metadata, source summary, and cluster summaries supplied.
- Reflect the strongest visible arguments, not just vote totals.
- If one side has no clusters yet, say so briefly instead of inventing one.
"""

        def leader_fn():
            prompt = f"""
You are Reasona's proposal synthesis judge.

Proposal:
{json.dumps({
    "title": proposal.get("title", ""),
    "description": proposal.get("description", ""),
    "category": proposal.get("category", ""),
    "yes": proposal.get("yes", 0),
    "no": proposal.get("no", 0),
    "abstain": proposal.get("abstain", 0),
}, ensure_ascii=False)}

Source summary:
{json.dumps(source_summary, ensure_ascii=False)}

Reasoning clusters:
{json.dumps(clusters, ensure_ascii=False)}

{criteria}
"""
            result = gl.nondet.exec_prompt(prompt, response_format="json")
            if not isinstance(result, dict):
                raise gl.vm.UserError("Proposal overview must return JSON.")
            return result

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            data = leader_result.calldata
            if not isinstance(data, dict):
                return False
            headline = str(data.get("headline", "")).strip()
            support_summary = str(data.get("support_summary", "")).strip()
            oppose_summary = str(data.get("oppose_summary", "")).strip()
            neutral_summary = str(data.get("neutral_summary", "")).strip()
            key_tradeoffs = data.get("key_tradeoffs")
            temperature = data.get("consensus_temperature")
            recommended_focus = str(data.get("recommended_focus", "")).strip()

            if not isinstance(key_tradeoffs, list):
                return False
            if temperature not in ("early", "forming", "contested", "leaning", "settled"):
                return False
            if len(headline) == 0 or len(headline) > 180:
                return False
            if len(support_summary) > 320 or len(oppose_summary) > 320 or len(neutral_summary) > 240:
                return False
            if len(recommended_focus) == 0 or len(recommended_focus) > 180:
                return False
            if len(key_tradeoffs) > 5:
                return False
            for item in key_tradeoffs:
                if not isinstance(item, str) or len(item.strip()) == 0 or len(item.strip()) > 180:
                    return False
            verdict = gl.nondet.exec_prompt(
                f"""
You are a GenLayer validator checking a proposal reasoning overview.

Proposal:
{json.dumps({
    "title": proposal.get("title", ""),
    "description": proposal.get("description", ""),
    "category": proposal.get("category", ""),
    "yes": proposal.get("yes", 0),
    "no": proposal.get("no", 0),
    "abstain": proposal.get("abstain", 0),
}, ensure_ascii=False)}

Source summary:
{json.dumps(source_summary, ensure_ascii=False)}

Reasoning clusters:
{json.dumps(clusters, ensure_ascii=False)}

Leader output:
{json.dumps(data, ensure_ascii=False)}

Reply with only true or false.
Return true only if:
- the overview reflects the visible clusters and vote distribution
- the summaries do not invent arguments not present in the inputs
- the tradeoffs and temperature are reasonable given the inputs
"""
            )
            return str(verdict).strip().lower() == "true"

        try:
            result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
            if not isinstance(result, dict):
                return self._default_overview(proposal)
            return {
                "headline": self._sanitize_text(str(result.get("headline", "")), 180),
                "support_summary": self._sanitize_text(str(result.get("support_summary", "")), 320),
                "oppose_summary": self._sanitize_text(str(result.get("oppose_summary", "")), 320),
                "neutral_summary": self._sanitize_text(str(result.get("neutral_summary", "")), 240),
                "key_tradeoffs": [
                    self._sanitize_text(str(item), 180)
                    for item in result.get("key_tradeoffs", [])
                    if isinstance(item, str) and len(str(item).strip()) > 0
                ],
                "consensus_temperature": str(result.get("consensus_temperature", "forming")),
                "recommended_focus": self._sanitize_text(str(result.get("recommended_focus", "")), 180),
            }
        except Exception:
            return self._default_overview(proposal)

    def _refresh_overview(self, proposal: dict) -> None:
        proposal["overview"] = self._synthesize_proposal_overview(proposal)

    def _apply_vote_analysis(self, proposal: dict, voter: str, vote_obj: dict, analysis: dict) -> None:
        clusters = proposal.get("clusters", [])
        cluster_id = str(analysis.get("matching_cluster_id", "")).strip()
        chosen_index = -1

        if not bool(analysis.get("new_cluster", True)) and cluster_id:
            for i, cluster in enumerate(clusters):
                if str(cluster.get("id", "")) == cluster_id:
                    chosen_index = i
                    break

        if chosen_index < 0:
            cluster_number = len(clusters) + 1
            cluster_id = f"{analysis.get('stance', 'neutral')}-{cluster_number}"
            clusters.append(
                {
                    "id": cluster_id,
                    "label": analysis.get("cluster_label", ""),
                    "side": analysis.get("stance", "neutral"),
                    "theme": analysis.get("theme", ""),
                    "summary": analysis.get("cluster_summary", ""),
                    "members": 0,
                    "confidence": int(analysis.get("confidence", 60)),
                    "entries": [],
                    "top_quotes": [],
                    "evidence_used": analysis.get("evidence_used", []),
                }
            )
            chosen_index = len(clusters) - 1

        cluster = clusters[chosen_index]
        cluster["label"] = analysis.get("cluster_label", cluster.get("label", ""))
        cluster["side"] = analysis.get("stance", cluster.get("side", "neutral"))
        cluster["theme"] = analysis.get("theme", cluster.get("theme", ""))
        cluster["summary"] = analysis.get("cluster_summary", cluster.get("summary", ""))
        cluster["confidence"] = int(analysis.get("confidence", cluster.get("confidence", 60)))
        cluster["evidence_used"] = analysis.get("evidence_used", cluster.get("evidence_used", []))

        entries = cluster.get("entries", [])
        entry = {
            "address": voter,
            "reasoning": vote_obj["reasoning"],
            "summary": analysis.get("rationale_summary", ""),
            "evidence_used": analysis.get("evidence_used", []),
        }
        entries.append(entry)
        cluster["entries"] = entries
        cluster["members"] = len(entries)

        quotes = cluster.get("top_quotes", [])
        if len(quotes) < 3 and len(vote_obj["reasoning"]) > 0:
            quote = vote_obj["reasoning"][:160]
            if quote not in quotes:
                quotes.append(quote)
        cluster["top_quotes"] = quotes[:3]

        proposal["clusters"] = clusters

    def _update_vote_counts(self, proposal: dict, vote: str) -> None:
        if vote == "yes":
            proposal["yes"] = proposal.get("yes", 0) + 1
        elif vote == "no":
            proposal["no"] = proposal.get("no", 0) + 1
        else:
            proposal["abstain"] = proposal.get("abstain", 0) + 1

    def _update_status(self, proposal: dict) -> None:
        yes = int(proposal.get("yes", 0))
        no = int(proposal.get("no", 0))
        abstain = int(proposal.get("abstain", 0))
        if proposal.get("status") == "active" and self._get_now() >= int(proposal.get("closes_at", 0)):
            proposal["status"] = "closed"
            proposal["closed_at"] = self._get_now()
        proposal["yes"] = yes
        proposal["no"] = no
        proposal["abstain"] = abstain
        proposal["created_at"] = int(proposal.get("created_at", 0))
        proposal["closes_at"] = int(proposal.get("closes_at", proposal["created_at"] + WINDOW_MS))
        proposal["closed_at"] = int(proposal.get("closed_at", 0))
        proposal["previous_status"] = proposal.get("previous_status", proposal.get("status", "active"))

    def _visible_proposal(self, proposal_id: str) -> dict:
        proposal_id = self._proposal_key(proposal_id)
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
        proposal_id = self._proposal_key(proposal_id)
        if proposal_id not in self.proposals:
            return {}
        return self._visible_proposal(proposal_id)

    @gl.public.view
    def get_votes(self, proposal_id: str) -> list:
        proposal_id = self._proposal_key(proposal_id)
        return self._load_votes(proposal_id)

    @gl.public.view
    def get_my_vote(self, proposal_id: str, voter: str) -> dict:
        proposal_id = self._proposal_key(proposal_id)
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
                result.append(
                    {
                        "proposal": self._visible_proposal(proposal_id),
                        "vote": json.loads(self.votes[key]),
                    }
                )
        return result

    @gl.public.write
    def create_proposal(self, title: str, description: str, category: str) -> None:
        caller = self._normalize(str(gl.message.sender_address))
        assert caller in self.whitelist, "Not whitelisted"

        clean_title = self._sanitize_text(title, 180)
        clean_description = self._sanitize_text(description, 4_000)
        assert len(clean_title) > 0, "Title required"
        assert len(clean_description) > 0, "Description required"

        now = self._get_now()
        pid = self.next_id
        source_summary = self._analyze_proposal_source(clean_title, clean_description)
        proposal = {
            "id": pid,
            "title": clean_title,
            "description": clean_description,
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
            "source": source_summary,
            "overview": self._default_overview(
                {
                    "title": clean_title,
                    "description": clean_description,
                    "category": category,
                    "yes": 0,
                    "no": 0,
                    "abstain": 0,
                }
            ),
        }

        self._save_proposal(pid, proposal)
        self.proposal_ids.append(pid)
        self.proposal_voters[pid] = ""
        self.next_id = str(int(self.next_id) + 1)

    @gl.public.write
    def submit_vote(self, proposal_id: str, vote: str, reasoning: str) -> None:
        proposal_id = self._proposal_key(proposal_id)
        caller = self._normalize(str(gl.message.sender_address))
        assert vote in ("yes", "no", "abstain"), "Invalid vote"
        assert proposal_id in self.proposals, "Proposal not found"

        proposal = self._visible_proposal(proposal_id)
        assert proposal["status"] == "active", "Proposal not active"

        voters = self.proposal_voters[proposal_id] if proposal_id in self.proposal_voters else ""
        existing = [v.strip() for v in voters.split(",") if v.strip()]
        assert caller not in existing, "Already voted"

        reasoning_clean = self._sanitize_text(reasoning, MAX_REASONING_CHARS)
        assert len(reasoning_clean) > 0, "Reasoning required"

        analysis = self._analyze_vote_reasoning(proposal, vote, reasoning_clean)
        now = self._get_now()
        vote_obj = {
            "voter": caller,
            "vote": vote,
            "reasoning": reasoning_clean,
            "submitted_at": now,
            "analysis": analysis,
        }
        self.votes[f"{proposal_id}:{caller}"] = json.dumps(vote_obj, ensure_ascii=False, separators=(",", ":"))

        existing.append(caller)
        self.proposal_voters[proposal_id] = ",".join(existing)

        self._update_vote_counts(proposal, vote)
        self._apply_vote_analysis(proposal, caller, vote_obj, analysis)
        self._update_status(proposal)
        self._refresh_overview(proposal)
        self._save_proposal(proposal_id, proposal)

    @gl.public.write
    def close_proposal(self, proposal_id: str) -> None:
        proposal_id = self._proposal_key(proposal_id)
        caller = self._normalize(str(gl.message.sender_address))
        assert caller in self.whitelist, "Not whitelisted"
        assert proposal_id in self.proposals, "Not found"
        proposal = self._visible_proposal(proposal_id)
        assert proposal["status"] != "archived", "Proposal is archived"
        proposal["status"] = "closed"
        proposal["closed_at"] = self._get_now()
        self._refresh_overview(proposal)
        self._save_proposal(proposal_id, proposal)

    @gl.public.write
    def archive_proposal(self, proposal_id: str) -> None:
        proposal_id = self._proposal_key(proposal_id)
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
        proposal_id = self._proposal_key(proposal_id)
        caller = self._normalize(str(gl.message.sender_address))
        assert caller in self.whitelist, "Not whitelisted"
        assert proposal_id in self.proposals, "Not found"
        proposal = self._visible_proposal(proposal_id)
        if proposal["status"] != "archived":
            return
        proposal["status"] = proposal.get("previous_status", "active")
        proposal["previous_status"] = "active"
        self._refresh_overview(proposal)
        self._save_proposal(proposal_id, proposal)

    @gl.public.write
    def refresh_proposal_intelligence(self, proposal_id: str) -> None:
        proposal_id = self._proposal_key(proposal_id)
        caller = self._normalize(str(gl.message.sender_address))
        assert caller in self.whitelist, "Not whitelisted"
        assert proposal_id in self.proposals, "Not found"
        proposal = self._visible_proposal(proposal_id)
        proposal["source"] = self._analyze_proposal_source(
            str(proposal.get("title", "")),
            str(proposal.get("description", "")),
        )
        proposal["clusters"] = []
        proposal["yes"] = 0
        proposal["no"] = 0
        proposal["abstain"] = 0

        votes = self._load_votes(proposal_id)
        for vote_obj in votes:
            vote = str(vote_obj.get("vote", "abstain"))
            analysis = self._analyze_vote_reasoning(proposal, vote, str(vote_obj.get("reasoning", "")))
            vote_obj["analysis"] = analysis
            self._update_vote_counts(proposal, vote)
            self._apply_vote_analysis(proposal, str(vote_obj.get("voter", "")), vote_obj, analysis)
            voter = self._normalize(str(vote_obj.get("voter", "")))
            self.votes[f"{proposal_id}:{voter}"] = json.dumps(
                vote_obj,
                ensure_ascii=False,
                separators=(",", ":"),
            )

        self._update_status(proposal)
        self._refresh_overview(proposal)
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
