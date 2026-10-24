from enum import Enum

class ClaimType(str, Enum):
    NUMERIC = "numeric"
    DIRECTIONAL = "directional"
    QUALITATIVE = "qualitative"
    FORWARD_LOOKING = "forward_looking"
    EXISTENCE = "existence"

class Verdict(str, Enum):
    VERIFIED = "Verified"
    CONFLICT = "Conflicts with source"
    UNSUPPORTED = "Not supported"
    OUTDATED = "Outdated"
    NEEDS_REVIEW = "Needs review"
    
    # Aliases
    SUPPORTED = "Verified"
    CONTRADICTED = "Conflicts with source"
    STALE = "Outdated"

class MessageType(str, Enum):
    REQUEST = "REQUEST"
    EVIDENCE = "EVIDENCE"
    CLAIM_SET = "CLAIM_SET"
    VERDICT = "VERDICT"
    CHALLENGE = "CHALLENGE"
    REBUTTAL = "REBUTTAL"
    FLAG = "FLAG"

class FlagSeverity(str, Enum):
    CONTRADICTION = "contradiction"
    OMISSION = "omission"
    STALE = "stale"
    UNSUPPORTED = "unsupported"
    NEEDS_REVIEW = "needs_review"

class OmissionStatus(str, Enum):
    ADDRESSED = "Addressed"
    OMITTED = "Disclosed but not mentioned in draft"
    NOT_FOUND = "Not found in provided documents"

class ReportStatus(str, Enum):
    DRAFT = "Draft"
    UNDER_REVIEW = "Under Review"
    APPROVED = "Approved for Consideration"
    REJECTED = "Rejected"

class ReviewerActionType(str, Enum):
    ACCEPT_VERDICT = "accept_verdict"
    OVERRIDE_VERDICT = "override_verdict"
    CHOOSE_AUTHORITY = "choose_authority"
    REJECT_CLAIM = "reject_claim"
    ADD_NOTE = "add_note"
    APPROVE_REPORT = "approve_report"
    REJECT_REPORT = "reject_report"
