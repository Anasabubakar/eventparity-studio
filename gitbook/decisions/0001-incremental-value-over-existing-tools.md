# ADR 0001: Why a separate report explorer

Status: accepted, 2026-10-07.

The engine's report is a JSON document. Its most important property, that unavailable history is shown as a coverage gap and never as a missing payment, is easy to lose in a wall of JSON or a CI log. A purpose-built page can draw coverage, put both sides' evidence next to each other and refuse reports that contradict themselves.

No existing tool was found that renders such reports because no existing tool, as read for the engine's ADR, produces them. The page has no live mode on purpose: a public host that accepted RPC or Horizon URLs could be used to reach arbitrary addresses.
