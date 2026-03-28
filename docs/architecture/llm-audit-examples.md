# LLM Payload Audit Examples

## Example sanitized recommendation context

```json
{
  "persona_id": "thin-checking-upcoming-bills",
  "health_score": 58.4,
  "safe_to_spend_this_week": 42.0,
  "active_risks": [
    "Checking buffer looks tight before payday",
    "Interest and fees are rising"
  ],
  "top_categories": [
    {
      "category_key": "bills",
      "label": "Bills",
      "amount": 1885.0,
      "share": 0.47,
      "trend_vs_baseline": 0.0
    }
  ],
  "debt_summary": [
    {
      "strategy": "cash_preserving",
      "title": "Cash Preserving",
      "projected_interest_cost": 622.4
    }
  ],
  "subscriptions": [
    {
      "merchant_key": "hulu",
      "label": "Hulu",
      "monthly_amount": 8.99
    }
  ],
  "assumptions": [
    "Structured finance metrics are computed before any language generation.",
    "External LLM mode is disabled by default in this MVP."
  ]
}
```

## Blocked fields

These fields must not cross the model boundary:

- raw account names and suffixes
- raw merchant descriptions
- full names
- email addresses
- phone numbers
- physical addresses
- routing or account numbers
- institution identifiers when not required for the reasoning task

## Audit log intent

`llm_payload_audit_logs` records:

- `agent_name`
- `payload_hash`
- `payload_json`
- `mode`
- `blocked_fields`
- `allowed_fields`

This gives the product an auditable record of what a model would have been allowed to see.
