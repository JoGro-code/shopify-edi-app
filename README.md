# Shopify EDI App (Remix + TypeScript)

Produktionsreife **Shopify Public App** mit Remix (Vite), Prisma (Postgres), Redis-Queues (BullMQ), Polaris UI und EDI-Funktionalität.

## Features (Auszug)

- **Inbound EDI**: EDIFACT `ORDERS` & X12 `850` → Normalized → DraftOrderCreate → Complete
- **Outbound EDI**: `DESADV`/`856` aus Fulfillment-Webhook generieren & per SFTP/HTTPS/AS2 versenden
- **Mapping**: Template + Partner-Overrides (JSON); Visual Assist (JSON-Editor)
- **Monitoring**: Documents-Liste, Status, DLQ/Retry (einzeln & bulkfähig erweiterbar), Download Hooks
- **Billing**: Recurring (Monat/Jahr, Trial) + Usage (Trigger bei Erfolgspunkten)
- **Security**: HMAC-Verify, AES-256-GCM Secret-Verschlüsselung, Mandanten-Trennung
- **Stack**: Remix + TS, Prisma/Postgres, BullMQ/Redis, Polaris, Pino, Zod

## Ordnerstruktur

```
app/              # Remix (routes, UI)
core/             # EDI Parser & Mapping
connectors/       # SFTP/HTTPS/AS2
worker/           # BullMQ Worker & Jobs
prisma/           # Prisma Schema & Seed
vite.config.ts    # Remix Vite
Dockerfile
```

## Setup

```bash
cp .env.example .env   # Variablen füllen (Shopify Keys, DATABASE_URL, REDIS_URL, ENCRYPTION_KEY)
pnpm i
pnpm generate && pnpm db:push
```

## Development

```bash
pnpm dev       # App (Remix Vite)
pnpm worker    # Worker (separat starten)
```

## Production

```bash
pnpm build && pnpm start
```

## Endpunkte

- `POST /api/inbound?partnerId=...` — Roh-EDI (EDIFACT ORDERS oder X12 850) einsenden; dedupe via SHA-256 Hash
- `POST /webhooks` — Shopify Webhooks (z. B. Fulfillment → erzeugt DESADV/856 und versendet gemäß Partner Outbound)

## Tests (Beispiele)

- Unit-Tests für Parser/Normalizer & Mapping (Vitest) — **Skizze**, erweiterbar

## Hinweise

- Für echte **VariantID-Auflösung** setze im Worker die Shop-Domain & Access-Token aus der Shopify-Session (hier vereinfacht).
- **AS2**: `connectors/as2.ts` sendet an konfiguriertes HTTP-Gateway (z. B. OpenAS2-Bridge). Header/Signaturen gemäß Provider.
- **Billing**: `admin/billing` enthält Beispiel-Mutation. Bitte Shop/Token aus Session injizieren und Pläne final konfigurieren.
- **HMAC**: Webhook HMAC wird gegen `SHOPIFY_API_SECRET` validiert.

## Release Notes (2025-08-27)

- Initiale, produktionstaugliche Public App-Struktur (Remix Vite, TS-only)
- EDI Inbound: EDIFACT ORDERS / X12 850 → Draft Order & Complete
- EDI Outbound: DESADV/856 aus Fulfillment; Versand via SFTP/HTTPS/AS2 Dispatcher
- Mapping Engine mit Overrides + UI
- Documents-Monitoring mit Retry
- Prisma Schema inkl. Session-Model
- Worker (BullMQ) inkl. Beispieljobs
- Security (AES-256-GCM), HMAC-Verify
- Billing (Subscription-Mutation Beispiel)
- README, .env.example, Dockerfile


## Neu in diesem Build (2025-08-27)

- **Webhook-Registrierung** bei OAuth-Callback (`fulfillments/create` → `/webhooks`)
- **HTTPS Signatur-Check** am Inbound-Endpoint (partner-spezifisch via HeaderName + Secret)
- **Normalized JSON Speicherung** im Document (Download: Raw/Normalized/Out)
- **Bulk-Retry** & **DLQ Restore** in Documents, plus Einzel-Retry
- **Downloads**: /admin/documents/:id/download?type=raw|normalized|out
- **SFTP Test** & **HTTPS Ping** Buttons in Partners
- **SFTP_POLL** Worker-Job (optional pro Partner), erzeugt INBOUND-Dokumente
- **Usage-Billing Trigger** (ORDERS/DESADV) – nur wenn Token verfügbar


## Session-basiertes Billing & Worker

- **Billing** (`/admin/billing`): Die Subscription-Mutation verwendet die **aktive Shopify-Session** (shop + access token). `test: true` ist gesetzt, bis du live gehst.
- **Worker**: Für EDI → Order-Erzeugung lädt der Worker das **Offline-Token** aus der Prisma Session Storage (`offline_{shop}`) anhand des Tenants. Keine Hardcodes mehr.


## Billing (final)

- **Monatlich:** 99 €/Monat + 0,05 €/Transaktion (14 Tage Trial)
- **Jährlich:** 499 €/Jahr + 0,02 €/Transaktion (14 Tage Trial)
- Usage wird automatisch gebucht:
  - nach erfolgreicher Order-Erstellung (Inbound ORDERS/850)
  - nach erfolgreichem DESADV-Versand (Outbound)


## Billing-Pläne (psychologisch optimiert)

- **Monatlich:** 99 € / 30 Tage **+ 0,05 € pro Transaktion** (Usage)
- **Yearly Saver (billed monthly):** 41,58 € / 30 Tage **+ 0,02 € pro Transaktion**  
  *Hinweis:* Shopify erlaubt **Usage** nur in **30-Tage-Intervallen**, daher wird der Yearly Saver **monatlich abgerechnet**, ist aber preislich äquivalent zu 499 €/Jahr.

Beide Pläne werden beim Abschluss als **kombinierte Subscription** (Recurring + Usage) erstellt. Die App löst `appUsageRecordCreate` bei:
- erfolgreicher **Inbound-Bestellerzeugung**
- erfolgreichem **DESADV-Versand**

Die `usageLineItemId` und die `usagePrice` werden pro Tenant gespeichert.

© ConscioAI Inh Jonathan Grochla – All rights reserved
