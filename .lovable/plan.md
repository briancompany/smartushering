
# Smart Ushering — Phase 2 Platform Upgrade

This is a large scope, so I'll deliver the **10 highest-impact features** first (your explicit ask), with **Email & Notifications prioritized as #1**. Remaining items (careers page, blog, payments scaffolding, search, performance/SEO polish) can ship as Phase 3.

## Phase 2 — Top 10 Features

1. **Email Automation (Lovable Emails)** — branded transactional templates sent to `ayietalensa@gmail.com` (admin alerts) and to customers for: booking received, approved, rejected, quote delivered, contact form, chat alert.
2. **Admin Notification Center** — in-app bell with unread counts for new bookings, chats, contact submissions, quote requests; persisted in `notifications` table with realtime updates.
3. **Audit Logs** — every admin action (price change, booking approval/rejection, gallery edit, service edit, assignment) written to `audit_logs` with actor, action, target, before/after JSON; viewable in admin.
4. **Booking Calendar** — admin calendar view (month/week/day) showing approved/pending/completed events, click-through to booking detail.
5. **Staff Assignment System** — `staff` + `booking_assignments` tables; after approval admin assigns ushers, team leader, reporting time, venue; per-usher status (assigned → confirmed → attended → completed).
6. **Quotation PDF Generator** — server function renders branded PDF quote (customer, event, package, ushers, transport, totals); admin "Send Quote" emails it to the customer.
7. **Analytics Dashboard** — revenue (today/week/month), booking funnel counts, chat stats, popular services, all from SQL aggregations.
8. **Admin Security Hardening** — bcrypt already in place; add session expiry (8h sliding), failed-login throttling (5 tries / 15min lockout), activity log, inactivity auto-logout (30min) on client.
9. **Server-side Rate Limiting & Input Validation** — Zod schemas on booking/contact/chat endpoints; per-IP rate limits on public mutations; secure headers on responses.
10. **Reviews/Testimonials Admin CRUD + Media Manager** — admin can add/edit/feature testimonials and reorder/delete gallery images and albums (categories).

## Technical Approach

**Database (single migration):**
```text
notifications        (id, type, title, body, link, read_at, created_at)
audit_logs           (id, actor, action, entity, entity_id, diff jsonb, created_at)
staff                (id, full_name, phone, role, is_active)
booking_assignments  (id, booking_id, staff_id, is_team_leader, report_time, status)
admin_sessions      → add expires_at, last_active_at
admin_login_attempts (ip, username, success, created_at) — for throttling
quotes               (id, booking_id?, customer info, items jsonb, total, pdf_url, sent_at)
```
All with RLS + service_role GRANTs; admin tables locked to service_role only.

**Email:** Use Lovable Emails infra. Templates: `booking-received`, `booking-approved`, `booking-rejected`, `quote-delivered`, `contact-confirmation`, `admin-alert`. Triggered from server functions on insert/status change. Admin alerts CC `ayietalensa@gmail.com`.

**PDF:** Generate quotes via `pdf-lib` in a server function, upload to a new `quotes` storage bucket, return signed URL, attach link in email.

**Realtime:** `notifications` table added to `supabase_realtime` publication; bell subscribes via supabase channel.

**Calendar:** Use existing `react-day-picker` + custom month grid; data from filtered `bookings` query.

**Audit logging:** Centralized `logAudit(ctx, action, entity, diff)` helper called from every admin mutation server function.

**Rate limiting:** Lightweight in-memory token bucket per IP in server functions (sufficient for current traffic; documented limitation).

**Security headers:** Added via root server response (CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy).

## Out of Scope (Phase 3 — call out when ready)
Careers page + CV uploads, Blog/News CMS, Smart search, M-Pesa/payments scaffolding, CDN/Vercel migration (currently runs on Lovable's edge — already CDN-backed), PageSpeed >90 audit pass, backup tooling beyond Supabase's automatic daily backups (already enabled).

## Notes
- Lovable Cloud already provides automatic daily DB backups, HTTPS, edge CDN, and auto-restart — items 1, 17, parts of 3 from your list are already covered by the platform.
- Email domain setup will be required before sending — I'll trigger the setup dialog as the first step.

Approve to begin. I'll start with the email domain + infrastructure setup, then ship features 1–10 in order.
