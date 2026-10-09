# Placeholders

Screens that currently render **mock data**, and where each section's real data will come from.
When a section is wired up, replace its mock with an API call and remove it from this list.

## System Admin → Dashboard (`/system-admin/dashboard`)

- **Component:** `src/components/system-admin/system-admin-dashboard.tsx`
- **Mock data:** `src/mocks/system-admin/dashboard.ts` (`getSystemAdminDashboardMock()`, typed as `SystemAdminDashboardData`)

| Section | Mock fields | Future data source |
|---|---|---|
| KPI row (Total users + 7-day sign-up bars, Suspended + active ring, Staff accounts + breakdown by role) | `kpis` (incl. `signupsLast7Days`, `staffByRole`) | `users` table (counts by status, role, `createdAt` per day for the last 7 days; admin-issued accounts grouped by role) |
| Users by role | `usersByRole` | `users` table (count grouped by role) |
| Needs attention | `needsAttention` | `users` table (suspensions ending this week, staff still on a temporary password, student registrations today) |
| Recent account activity | `recentActivity` | A future `audit_log` table (account created / suspended / restored, branding changes). Does not exist yet. |
| Top status bar (server, academic year, registration, maintenance mode, last branding update) | `portalStatus` | Server: a health-check endpoint (does not exist yet). The rest: system settings and branding (`SystemSetting` rows, e.g. `system.themeBranding` `updatedAt`) |

Notes:
- The page refreshes every 60 s (and via the header button) through `useDashboardData()` in the component; swap its mock call for a fetch to the future dashboard endpoint.
- "Staff haven't changed their temporary password" needs a flag on `users` that doesn't exist yet.
- Maintenance mode, academic year, and registration policy are not persisted anywhere yet (the Settings and Maintenance pages are also placeholders).
