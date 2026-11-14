# Future access-control concept

This is a product and architecture proposal only. It does not add authentication,
shared health records, database tables, or permissions to the current application.
Health check-ins remain local to the browser and are not shared by this concept.

## Proposed roles

| Role | Intended access if shared mission data is introduced |
| --- | --- |
| Astronaut / crew member | View and manage only their own explicitly linked health records. |
| Medical team | View records only for crew members assigned to them and only for the active mission. |
| Mission control | View mission context and explicitly approved operational summaries; raw health records are not granted by default. |
| System administrator | Manage accounts, mission membership, and role assignments; no routine access to health values. |

Roles describe a starting point, not permission by themselves. Access should also
be scoped to a mission and (for medical staff) an assigned crew relationship.
Emergency or exceptional access would need a separate, audited policy rather
than an implicit administrator bypass.

## Required safeguards before implementation

- Keep browser-local records local until the user explicitly opts into a defined
  sharing flow. No background upload or automatic synchronization.
- Enforce authentication and authorization on the server for every record
  operation. Hiding interface controls is not access control.
- Use database policies that deny access by default and scope records to the
  authenticated user, mission membership, and assigned care relationship.
- Separate account administration from reading health values. Audit access and
  role changes without copying health values into general-purpose logs.
- Define consent, revocation, retention, recovery, account removal, and incident
  handling before collecting shared records.
- Never present access roles or automated pattern screening as clinical
  certification or a substitute for professional care.

## Implementation boundary

The current repository has no health-record tables in its generated Supabase
types, and its Drizzle schema is intentionally empty. Any future shared-record
schema and row-level policies must be created through Lovable's database
workflow, not by editing generated types or migration files by hand. This
document is not a claim that the safeguards are already implemented.
