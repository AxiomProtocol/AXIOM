# AXIOM PROTOCOL × UNIT BANKING — REPLIT AGENT PROMPT
### Paste this entire prompt into Replit Agent to build the full Unit BaaS integration

---

## CONTEXT & CODEBASE

You are building a Banking-as-a-Service integration for **Axiom Protocol** — a land-first community ownership platform for underserved communities, deployed on **Arbitrum One**. The existing stack is:

- **Framework**: Next.js 14 (Pages Router), TypeScript, TailwindCSS
- **Backend**: Node.js, Express, PostgreSQL with Drizzle ORM
- **Auth**: SIWE (Sign-In With Ethereum) — users authenticate with their wallet address
- **Blockchain**: Arbitrum One mainnet, Wagmi v2 + RainbowKit for wallet connections
- **Existing DB schema**: Uses `instrumentation.ts` to register all tables
- **API routes**: Live under `pages/api/`
- **Services**: Live under `lib/services/`
- **Shared schemas**: Live under `shared/`
- **Environment variables**: Stored in `.env` — DO NOT hardcode secrets

**Unit BaaS** is being integrated to provide:
1. User KYC onboarding + bank account creation (replacing manual compliance)
2. SUSU community savings pools with real FDIC-insured accounts
3. ACH payments + recurring contributions (member dues automation)
4. Axiom-branded debit cards for community members

Unit API docs: https://www.unit.co/docs/api/
Unit TypeScript SDK: `@unit-finance/unit-node-sdk`
Unit Sandbox base URL: `https://api.s.unit.sh/`
Unit Live base URL: `https://api.unit.co/`

---

## ENVIRONMENT VARIABLES TO ADD

Add these to `.env` and `.env.example`:

```env
# Unit Banking API
UNIT_API_TOKEN=your_unit_api_token_here
UNIT_API_URL=https://api.s.unit.sh  # sandbox; switch to https://api.unit.co for live
UNIT_WEBHOOK_SECRET=your_unit_webhook_secret_here
UNIT_ORG_ID=your_unit_org_id_here
```

---

## TASK 1 — INSTALL & CONFIGURE UNIT SDK

Install the Unit TypeScript SDK:
```bash
npm install @unit-finance/unit-node-sdk
```

Create `lib/unit/client.ts`:
```typescript
// Singleton Unit API client — used across all Unit services
import { UnitConfig } from '@unit-finance/unit-node-sdk'

if (!process.env.UNIT_API_TOKEN) {
  throw new Error('UNIT_API_TOKEN environment variable is required')
}

export const unitConfig: UnitConfig = {
  token: process.env.UNIT_API_TOKEN!,
  basePath: process.env.UNIT_API_URL || 'https://api.s.unit.sh',
}

// Export base URL for direct fetch calls where SDK doesn't cover
export const UNIT_BASE_URL = process.env.UNIT_API_URL || 'https://api.s.unit.sh'
export const UNIT_TOKEN = process.env.UNIT_API_TOKEN!
```

Create `lib/unit/helpers.ts`:
```typescript
// Shared helpers for Unit API interactions
export const unitHeaders = () => ({
  'Authorization': `Bearer ${process.env.UNIT_API_TOKEN}`,
  'Content-Type': 'application/vnd.api+json',
})

// Convert cents (Unit uses cents) to dollars for display
export const centsToDollars = (cents: number): number => cents / 100

// Convert dollars to cents for Unit API
export const dollarsToCents = (dollars: number): number => Math.round(dollars * 100)

// Format Unit amount for display
export const formatUnitAmount = (cents: number, currency = 'USD'): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100)

// Map Unit application status to Axiom status
export const mapApplicationStatus = (unitStatus: string): string => {
  const map: Record<string, string> = {
    'AwaitingDocuments': 'pending_documents',
    'PendingReview': 'under_review',
    'Approved': 'approved',
    'Denied': 'denied',
    'Pending': 'pending',
  }
  return map[unitStatus] || unitStatus.toLowerCase()
}
```

---

## TASK 2 — DATABASE SCHEMA

Create `shared/unitSchema.ts` with ALL Unit-related tables:

```typescript
import { pgTable, text, integer, boolean, timestamp, jsonb, varchar, uuid } from 'drizzle-orm/pg-core'

// Stores Unit customer records per Axiom wallet address
export const unitCustomers = pgTable('unit_customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  walletAddress: text('wallet_address').notNull().unique(),
  unitCustomerId: text('unit_customer_id').notNull().unique(),
  unitApplicationId: text('unit_application_id'),
  applicationStatus: text('application_status').notNull().default('pending'),
  // application_status: pending | pending_documents | under_review | approved | denied
  kycTier: text('kyc_tier').notNull().default('none'),
  // kyc_tier: none | basic | verified | accredited
  fullName: text('full_name'),
  email: text('email'),
  phone: text('phone'),
  dateOfBirth: text('date_of_birth'),
  addressLine1: text('address_line1'),
  addressLine2: text('address_line2'),
  city: text('city'),
  state: text('state'),
  postalCode: text('postal_code'),
  country: text('country').default('US'),
  ssn: text('ssn_last4'), // store only last 4 digits
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Stores Unit deposit accounts (FDIC-insured bank accounts)
export const unitAccounts = pgTable('unit_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  walletAddress: text('wallet_address').notNull(),
  unitCustomerId: text('unit_customer_id').notNull(),
  unitAccountId: text('unit_account_id').notNull().unique(),
  accountType: text('account_type').notNull(),
  // account_type: depositAccount | susuPool | savingsGoal
  accountName: text('account_name').notNull(),
  status: text('status').notNull().default('open'),
  // status: open | frozen | closed
  balanceCents: integer('balance_cents').notNull().default(0),
  holdCents: integer('hold_cents').notNull().default(0),
  availableCents: integer('available_cents').notNull().default(0),
  routingNumber: text('routing_number'),
  accountNumber: text('account_number'), // masked
  currency: text('currency').default('USD'),
  // Optional: link to SUSU group if this is a pool account
  susuGroupId: uuid('susu_group_id'),
  // Optional: link to savings goal
  savingsGoalId: uuid('savings_goal_id'),
  unitMetadata: jsonb('unit_metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Stores all Unit payment records
export const unitPayments = pgTable('unit_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  walletAddress: text('wallet_address').notNull(),
  unitPaymentId: text('unit_payment_id').notNull().unique(),
  unitAccountId: text('unit_account_id').notNull(),
  paymentType: text('payment_type').notNull(),
  // payment_type: ach | book | wire | recurring
  direction: text('direction').notNull(),
  // direction: debit | credit
  amountCents: integer('amount_cents').notNull(),
  status: text('status').notNull(),
  // status: Pending | PendingReview | Rejected | Clearing | Sent | Canceled | Returned
  description: text('description'),
  counterpartyName: text('counterparty_name'),
  counterpartyAccountId: text('counterparty_account_id'),
  // Purpose tag for Axiom-specific categorization
  purpose: text('purpose'),
  // purpose: susu_contribution | susu_payout | land_investment | bill_pay | p2p | ach_funding
  susuGroupId: uuid('susu_group_id'),
  idempotencyKey: text('idempotency_key').unique(),
  unitMetadata: jsonb('unit_metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  settledAt: timestamp('settled_at'),
})

// Stores recurring payment schedules linked to Unit
export const unitRecurringPayments = pgTable('unit_recurring_payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  walletAddress: text('wallet_address').notNull(),
  unitRecurringPaymentId: text('unit_recurring_payment_id').notNull().unique(),
  unitAccountId: text('unit_account_id').notNull(),
  amountCents: integer('amount_cents').notNull(),
  frequency: text('frequency').notNull(),
  // frequency: Monthly | Weekly | BiWeekly
  nextPaymentDate: text('next_payment_date').notNull(),
  status: text('status').notNull().default('Active'),
  description: text('description'),
  purpose: text('purpose'),
  // purpose: susu_contribution | savings_auto | loan_repayment
  susuGroupId: uuid('susu_group_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Stores Unit debit cards issued to Axiom members
export const unitCards = pgTable('unit_cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  walletAddress: text('wallet_address').notNull(),
  unitCustomerId: text('unit_customer_id').notNull(),
  unitAccountId: text('unit_account_id').notNull(),
  unitCardId: text('unit_card_id').notNull().unique(),
  cardType: text('card_type').notNull(),
  // card_type: individualDebitCard | businessDebitCard | virtualDebitCard
  last4: text('last4'),
  expirationDate: text('expiration_date'),
  status: text('status').notNull().default('Active'),
  // status: Active | Inactive | Stolen | Lost | Frozen | ClosedByCustomer | SuspectedFraud
  shippingAddress: jsonb('shipping_address'),
  designCode: text('design_code').default('axiom-community'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Stores Unit webhook events for audit and replay
export const unitWebhookEvents = pgTable('unit_webhook_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  unitEventId: text('unit_event_id').notNull().unique(),
  eventType: text('event_type').notNull(),
  resourceId: text('resource_id'),
  resourceType: text('resource_type'),
  payload: jsonb('payload').notNull(),
  processed: boolean('processed').default(false),
  processedAt: timestamp('processed_at'),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
```

Register all tables in `instrumentation.ts` by adding:
```typescript
import {
  unitCustomers,
  unitAccounts,
  unitPayments,
  unitRecurringPayments,
  unitCards,
  unitWebhookEvents,
} from './shared/unitSchema'
// Add to your existing schema registration
```

Run the Drizzle migration:
```bash
npm run db:push
```
or
```bash
npx drizzle-kit push:pg
```

---

## TASK 3 — UNIT CUSTOMER SERVICE (KYC + ONBOARDING)

Create `lib/services/UnitCustomerService.ts`:

```typescript
import { db } from '../db'
import { unitCustomers, unitAccounts } from '../../shared/unitSchema'
import { eq } from 'drizzle-orm'
import { UNIT_BASE_URL, unitHeaders, mapApplicationStatus } from '../unit/helpers'

export class UnitCustomerService {

  // Step 1: Create a Unit individual application (triggers KYC)
  static async createIndividualApplication(walletAddress: string, data: {
    fullName: string
    email: string
    phone: string       // format: "+12125551234"
    dateOfBirth: string // format: "YYYY-MM-DD"
    ssn: string         // full SSN for KYC — never stored, passed directly to Unit
    address: {
      street: string
      street2?: string
      city: string
      state: string     // 2-letter code
      postalCode: string
      country: string   // "US"
    }
  }) {
    // Check if customer already exists
    const existing = await db
      .select()
      .from(unitCustomers)
      .where(eq(unitCustomers.walletAddress, walletAddress))
      .limit(1)

    if (existing.length > 0 && existing[0].applicationStatus === 'approved') {
      return { success: true, customer: existing[0], alreadyExists: true }
    }

    const [firstName, ...lastNameParts] = data.fullName.trim().split(' ')
    const lastName = lastNameParts.join(' ') || firstName

    // Submit application to Unit
    const response = await fetch(`${UNIT_BASE_URL}/applications`, {
      method: 'POST',
      headers: unitHeaders(),
      body: JSON.stringify({
        data: {
          type: 'individualApplication',
          attributes: {
            fullName: {
              first: firstName,
              last: lastName,
            },
            email: data.email,
            phone: {
              countryCode: '1',
              number: data.phone.replace(/\D/g, '').slice(-10),
            },
            ssn: data.ssn.replace(/\D/g, ''),
            dateOfBirth: data.dateOfBirth,
            address: {
              street: data.address.street,
              street2: data.address.street2,
              city: data.address.city,
              state: data.address.state,
              postalCode: data.address.postalCode,
              country: data.address.country,
            },
            // Tag with Axiom wallet address for cross-reference
            tags: {
              axiomWallet: walletAddress,
              platform: 'axiom-protocol',
            },
          },
        },
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(`Unit application failed: ${JSON.stringify(result.errors)}`)
    }

    const unitApp = result.data
    const unitCustomerId = unitApp.relationships?.customer?.data?.id

    // Upsert customer record in Axiom DB
    const customerData = {
      walletAddress,
      unitCustomerId: unitCustomerId || unitApp.id,
      unitApplicationId: unitApp.id,
      applicationStatus: mapApplicationStatus(unitApp.attributes.status),
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      dateOfBirth: data.dateOfBirth,
      addressLine1: data.address.street,
      addressLine2: data.address.street2 || null,
      city: data.address.city,
      state: data.address.state,
      postalCode: data.address.postalCode,
      country: data.address.country,
      ssn: data.ssn.slice(-4), // store only last 4
      updatedAt: new Date(),
    }

    if (existing.length > 0) {
      await db
        .update(unitCustomers)
        .set(customerData)
        .where(eq(unitCustomers.walletAddress, walletAddress))
    } else {
      await db.insert(unitCustomers).values(customerData)
    }

    return {
      success: true,
      applicationId: unitApp.id,
      customerId: unitCustomerId,
      status: mapApplicationStatus(unitApp.attributes.status),
    }
  }

  // Step 2: Check application status (poll or webhook-driven)
  static async getApplicationStatus(walletAddress: string) {
    const customer = await db
      .select()
      .from(unitCustomers)
      .where(eq(unitCustomers.walletAddress, walletAddress))
      .limit(1)

    if (!customer.length) {
      return { status: 'not_started', customer: null }
    }

    // Fetch live status from Unit if not yet approved
    if (customer[0].unitApplicationId && customer[0].applicationStatus !== 'approved') {
      const response = await fetch(
        `${UNIT_BASE_URL}/applications/${customer[0].unitApplicationId}`,
        { headers: unitHeaders() }
      )
      const result = await response.json()

      if (response.ok) {
        const freshStatus = mapApplicationStatus(result.data.attributes.status)
        const unitCustomerId = result.data.relationships?.customer?.data?.id

        await db
          .update(unitCustomers)
          .set({
            applicationStatus: freshStatus,
            unitCustomerId: unitCustomerId || customer[0].unitCustomerId,
            kycTier: freshStatus === 'approved' ? 'verified' : customer[0].kycTier,
            updatedAt: new Date(),
          })
          .where(eq(unitCustomers.walletAddress, walletAddress))

        customer[0].applicationStatus = freshStatus
        if (unitCustomerId) customer[0].unitCustomerId = unitCustomerId
      }
    }

    return {
      status: customer[0].applicationStatus,
      kycTier: customer[0].kycTier,
      customer: customer[0],
    }
  }

  // Get Unit customer record for a wallet address
  static async getCustomer(walletAddress: string) {
    const customer = await db
      .select()
      .from(unitCustomers)
      .where(eq(unitCustomers.walletAddress, walletAddress))
      .limit(1)

    return customer[0] || null
  }

  // Check if wallet has approved Unit account (use for feature gating)
  static async isApproved(walletAddress: string): Promise<boolean> {
    const customer = await db
      .select({ status: unitCustomers.applicationStatus })
      .from(unitCustomers)
      .where(eq(unitCustomers.walletAddress, walletAddress))
      .limit(1)

    return customer.length > 0 && customer[0].status === 'approved'
  }
}
```

---

## TASK 4 — UNIT ACCOUNT SERVICE (DEPOSIT ACCOUNTS)

Create `lib/services/UnitAccountService.ts`:

```typescript
import { db } from '../db'
import { unitAccounts, unitCustomers } from '../../shared/unitSchema'
import { eq, and } from 'drizzle-orm'
import { UNIT_BASE_URL, unitHeaders, centsToDollars } from '../unit/helpers'

export class UnitAccountService {

  // Create a standard Axiom member deposit account
  static async createMemberAccount(walletAddress: string, accountName = 'Axiom Member Account') {
    const customer = await db
      .select()
      .from(unitCustomers)
      .where(eq(unitCustomers.walletAddress, walletAddress))
      .limit(1)

    if (!customer.length || customer[0].applicationStatus !== 'approved') {
      throw new Error('Customer must complete KYC before creating an account')
    }

    const response = await fetch(`${UNIT_BASE_URL}/accounts`, {
      method: 'POST',
      headers: unitHeaders(),
      body: JSON.stringify({
        data: {
          type: 'depositAccount',
          attributes: {
            depositProduct: 'checking',
            tags: {
              axiomWallet: walletAddress,
              accountType: 'member',
              platform: 'axiom-protocol',
            },
          },
          relationships: {
            customer: {
              data: {
                type: 'customer',
                id: customer[0].unitCustomerId,
              },
            },
          },
        },
      }),
    })

    const result = await response.json()
    if (!response.ok) {
      throw new Error(`Failed to create account: ${JSON.stringify(result.errors)}`)
    }

    const unitAccount = result.data

    // Save to Axiom DB
    const [saved] = await db.insert(unitAccounts).values({
      walletAddress,
      unitCustomerId: customer[0].unitCustomerId,
      unitAccountId: unitAccount.id,
      accountType: 'depositAccount',
      accountName,
      status: 'open',
      balanceCents: 0,
      holdCents: 0,
      availableCents: 0,
      routingNumber: unitAccount.attributes.routingNumber,
      accountNumber: unitAccount.attributes.accountNumber,
      currency: 'USD',
    }).returning()

    return saved
  }

  // Create a SUSU community pool account (linked to a group)
  static async createSusuPoolAccount(
    walletAddress: string, // group admin wallet
    susuGroupId: string,
    groupName: string
  ) {
    const customer = await db
      .select()
      .from(unitCustomers)
      .where(eq(unitCustomers.walletAddress, walletAddress))
      .limit(1)

    if (!customer.length || customer[0].applicationStatus !== 'approved') {
      throw new Error('Group admin must complete KYC before creating a pool account')
    }

    const response = await fetch(`${UNIT_BASE_URL}/accounts`, {
      method: 'POST',
      headers: unitHeaders(),
      body: JSON.stringify({
        data: {
          type: 'depositAccount',
          attributes: {
            depositProduct: 'savings',
            tags: {
              axiomWallet: walletAddress,
              accountType: 'susuPool',
              susuGroupId,
              groupName,
              platform: 'axiom-protocol',
            },
          },
          relationships: {
            customer: {
              data: {
                type: 'customer',
                id: customer[0].unitCustomerId,
              },
            },
          },
        },
      }),
    })

    const result = await response.json()
    if (!response.ok) {
      throw new Error(`Failed to create SUSU pool: ${JSON.stringify(result.errors)}`)
    }

    const unitAccount = result.data

    const [saved] = await db.insert(unitAccounts).values({
      walletAddress,
      unitCustomerId: customer[0].unitCustomerId,
      unitAccountId: unitAccount.id,
      accountType: 'susuPool',
      accountName: `${groupName} — SUSU Pool`,
      status: 'open',
      balanceCents: 0,
      holdCents: 0,
      availableCents: 0,
      routingNumber: unitAccount.attributes.routingNumber,
      accountNumber: unitAccount.attributes.accountNumber,
      currency: 'USD',
      susuGroupId,
    }).returning()

    return saved
  }

  // Sync account balance from Unit (call before displaying balance)
  static async syncBalance(unitAccountId: string) {
    const response = await fetch(`${UNIT_BASE_URL}/accounts/${unitAccountId}`, {
      headers: unitHeaders(),
    })

    const result = await response.json()
    if (!response.ok) return null

    const attrs = result.data.attributes

    await db
      .update(unitAccounts)
      .set({
        balanceCents: attrs.balance,
        holdCents: attrs.hold,
        availableCents: attrs.available,
        status: attrs.status,
        updatedAt: new Date(),
      })
      .where(eq(unitAccounts.unitAccountId, unitAccountId))

    return {
      balance: centsToDollars(attrs.balance),
      hold: centsToDollars(attrs.hold),
      available: centsToDollars(attrs.available),
      status: attrs.status,
    }
  }

  // Get all accounts for a wallet address
  static async getAccountsForWallet(walletAddress: string) {
    return db
      .select()
      .from(unitAccounts)
      .where(eq(unitAccounts.walletAddress, walletAddress))
  }

  // Get a specific account and sync its balance
  static async getAccountWithBalance(unitAccountId: string) {
    await this.syncBalance(unitAccountId)
    const [account] = await db
      .select()
      .from(unitAccounts)
      .where(eq(unitAccounts.unitAccountId, unitAccountId))
      .limit(1)
    return account || null
  }

  // Get SUSU pool account for a group
  static async getSusuPoolAccount(susuGroupId: string) {
    const [account] = await db
      .select()
      .from(unitAccounts)
      .where(and(
        eq(unitAccounts.accountType, 'susuPool'),
        eq(unitAccounts.susuGroupId, susuGroupId)
      ))
      .limit(1)

    if (account) {
      await this.syncBalance(account.unitAccountId)
    }
    return account || null
  }

  // Get transaction history for an account from Unit
  static async getTransactions(unitAccountId: string, limit = 25) {
    const response = await fetch(
      `${UNIT_BASE_URL}/transactions?filter[accountId]=${unitAccountId}&page[limit]=${limit}&sort=-createdAt`,
      { headers: unitHeaders() }
    )
    const result = await response.json()
    if (!response.ok) return []

    return result.data.map((tx: any) => ({
      id: tx.id,
      type: tx.type,
      amount: centsToDollars(tx.attributes.amount),
      direction: tx.attributes.direction,
      balance: centsToDollars(tx.attributes.balance),
      summary: tx.attributes.summary,
      createdAt: tx.attributes.createdAt,
    }))
  }
}
```

---

## TASK 5 — UNIT PAYMENT SERVICE (ACH + BOOK PAYMENTS + RECURRING)

Create `lib/services/UnitPaymentService.ts`:

```typescript
import { db } from '../db'
import { unitPayments, unitRecurringPayments, unitAccounts } from '../../shared/unitSchema'
import { eq } from 'drizzle-orm'
import { UNIT_BASE_URL, unitHeaders, dollarsToCents, centsToDollars } from '../unit/helpers'
import { v4 as uuidv4 } from 'uuid'

export class UnitPaymentService {

  // Book Payment: instant internal transfer between two Unit accounts (P2P, SUSU payout)
  // Zero fees, instant settlement — perfect for SUSU rotations
  static async createBookPayment(params: {
    fromAccountId: string  // Unit account ID
    toAccountId: string    // Unit account ID
    amountDollars: number
    description: string
    walletAddress: string
    purpose: string        // 'susu_payout' | 'p2p' | 'land_investment'
    susuGroupId?: string
  }) {
    const idempotencyKey = `book-${params.fromAccountId}-${params.toAccountId}-${Date.now()}`

    const response = await fetch(`${UNIT_BASE_URL}/payments`, {
      method: 'POST',
      headers: unitHeaders(),
      body: JSON.stringify({
        data: {
          type: 'bookPayment',
          attributes: {
            amount: dollarsToCents(params.amountDollars),
            description: params.description,
            idempotencyKey,
            tags: {
              purpose: params.purpose,
              axiomWallet: params.walletAddress,
              susuGroupId: params.susuGroupId || null,
              platform: 'axiom-protocol',
            },
          },
          relationships: {
            account: {
              data: { type: 'account', id: params.fromAccountId },
            },
            counterpartyAccount: {
              data: { type: 'account', id: params.toAccountId },
            },
          },
        },
      }),
    })

    const result = await response.json()
    if (!response.ok) {
      throw new Error(`Book payment failed: ${JSON.stringify(result.errors)}`)
    }

    const payment = result.data

    await db.insert(unitPayments).values({
      walletAddress: params.walletAddress,
      unitPaymentId: payment.id,
      unitAccountId: params.fromAccountId,
      paymentType: 'book',
      direction: 'debit',
      amountCents: dollarsToCents(params.amountDollars),
      status: payment.attributes.status,
      description: params.description,
      counterpartyAccountId: params.toAccountId,
      purpose: params.purpose,
      susuGroupId: params.susuGroupId || null,
      idempotencyKey,
      unitMetadata: payment,
    })

    return {
      paymentId: payment.id,
      status: payment.attributes.status,
      amount: params.amountDollars,
    }
  }

  // ACH Debit: pull money from member's external bank into their Axiom Unit account
  // Used for: funding accounts, SUSU contributions from external banks
  static async createAchDebit(params: {
    unitAccountId: string    // destination Unit account
    counterpartyId: string   // Unit counterparty (external bank) ID
    amountDollars: number
    description: string
    walletAddress: string
    purpose: string
    susuGroupId?: string
  }) {
    const idempotencyKey = `ach-debit-${params.unitAccountId}-${uuidv4()}`

    const response = await fetch(`${UNIT_BASE_URL}/payments`, {
      method: 'POST',
      headers: unitHeaders(),
      body: JSON.stringify({
        data: {
          type: 'achPayment',
          attributes: {
            amount: dollarsToCents(params.amountDollars),
            direction: 'Debit',
            description: params.description.substring(0, 10), // ACH limit: 10 chars
            addenda: params.description,
            idempotencyKey,
            sameDay: false,
            tags: {
              purpose: params.purpose,
              axiomWallet: params.walletAddress,
              platform: 'axiom-protocol',
            },
          },
          relationships: {
            account: {
              data: { type: 'account', id: params.unitAccountId },
            },
            counterparty: {
              data: { type: 'counterparty', id: params.counterpartyId },
            },
          },
        },
      }),
    })

    const result = await response.json()
    if (!response.ok) {
      throw new Error(`ACH debit failed: ${JSON.stringify(result.errors)}`)
    }

    const payment = result.data

    await db.insert(unitPayments).values({
      walletAddress: params.walletAddress,
      unitPaymentId: payment.id,
      unitAccountId: params.unitAccountId,
      paymentType: 'ach',
      direction: 'credit', // money coming IN to Axiom account
      amountCents: dollarsToCents(params.amountDollars),
      status: payment.attributes.status,
      description: params.description,
      purpose: params.purpose,
      susuGroupId: params.susuGroupId || null,
      idempotencyKey,
      unitMetadata: payment,
    })

    return {
      paymentId: payment.id,
      status: payment.attributes.status,
      amount: params.amountDollars,
      estimatedArrival: '1-2 business days',
    }
  }

  // Create recurring ACH payment (automated SUSU monthly contributions)
  static async createRecurringPayment(params: {
    unitAccountId: string
    counterpartyId: string
    amountDollars: number
    frequency: 'Monthly' | 'Weekly' | 'BiWeekly'
    nextPaymentDate: string // YYYY-MM-DD
    description: string
    walletAddress: string
    purpose: string
    susuGroupId?: string
  }) {
    const response = await fetch(`${UNIT_BASE_URL}/recurring-payments`, {
      method: 'POST',
      headers: unitHeaders(),
      body: JSON.stringify({
        data: {
          type: 'recurringCreditAchPayment',
          attributes: {
            amount: dollarsToCents(params.amountDollars),
            description: params.description.substring(0, 10),
            schedule: {
              interval: params.frequency,
              nextScheduledAction: params.nextPaymentDate,
            },
            tags: {
              purpose: params.purpose,
              axiomWallet: params.walletAddress,
              susuGroupId: params.susuGroupId || null,
              platform: 'axiom-protocol',
            },
          },
          relationships: {
            account: {
              data: { type: 'account', id: params.unitAccountId },
            },
            counterparty: {
              data: { type: 'counterparty', id: params.counterpartyId },
            },
          },
        },
      }),
    })

    const result = await response.json()
    if (!response.ok) {
      throw new Error(`Recurring payment creation failed: ${JSON.stringify(result.errors)}`)
    }

    const recurring = result.data

    await db.insert(unitRecurringPayments).values({
      walletAddress: params.walletAddress,
      unitRecurringPaymentId: recurring.id,
      unitAccountId: params.unitAccountId,
      amountCents: dollarsToCents(params.amountDollars),
      frequency: params.frequency,
      nextPaymentDate: params.nextPaymentDate,
      status: 'Active',
      description: params.description,
      purpose: params.purpose,
      susuGroupId: params.susuGroupId || null,
    })

    return {
      recurringPaymentId: recurring.id,
      status: 'Active',
      amount: params.amountDollars,
      frequency: params.frequency,
      nextPaymentDate: params.nextPaymentDate,
    }
  }

  // Cancel a recurring payment
  static async cancelRecurringPayment(unitRecurringPaymentId: string) {
    const response = await fetch(
      `${UNIT_BASE_URL}/recurring-payments/${unitRecurringPaymentId}/cancel`,
      { method: 'POST', headers: unitHeaders() }
    )
    if (!response.ok) {
      throw new Error('Failed to cancel recurring payment')
    }
    await db
      .update(unitRecurringPayments)
      .set({ status: 'Canceled', updatedAt: new Date() })
      .where(eq(unitRecurringPayments.unitRecurringPaymentId, unitRecurringPaymentId))

    return { success: true }
  }

  // SUSU payout rotation: distribute the pot to the winning member this cycle
  static async processSusuPayout(params: {
    poolAccountId: string    // SUSU group pool Unit account
    memberAccountId: string  // winning member's Unit account
    amountDollars: number
    groupName: string
    cycleNumber: number
    walletAddress: string
    susuGroupId: string
  }) {
    return this.createBookPayment({
      fromAccountId: params.poolAccountId,
      toAccountId: params.memberAccountId,
      amountDollars: params.amountDollars,
      description: `${params.groupName} — Cycle ${params.cycleNumber} Payout`,
      walletAddress: params.walletAddress,
      purpose: 'susu_payout',
      susuGroupId: params.susuGroupId,
    })
  }

  // Collect SUSU contribution: move from member account to pool
  static async collectSusuContribution(params: {
    memberAccountId: string
    poolAccountId: string
    amountDollars: number
    groupName: string
    walletAddress: string
    susuGroupId: string
  }) {
    return this.createBookPayment({
      fromAccountId: params.memberAccountId,
      toAccountId: params.poolAccountId,
      amountDollars: params.amountDollars,
      description: `${params.groupName} — Monthly Contribution`,
      walletAddress: params.walletAddress,
      purpose: 'susu_contribution',
      susuGroupId: params.susuGroupId,
    })
  }
}
```

---

## TASK 6 — UNIT CARD SERVICE (AXIOM DEBIT CARDS)

Create `lib/services/UnitCardService.ts`:

```typescript
import { db } from '../db'
import { unitCards, unitCustomers } from '../../shared/unitSchema'
import { eq } from 'drizzle-orm'
import { UNIT_BASE_URL, unitHeaders } from '../unit/helpers'

export class UnitCardService {

  // Issue a virtual debit card (instant, no shipping)
  static async issueVirtualCard(params: {
    walletAddress: string
    unitAccountId: string
    cardName?: string
  }) {
    const customer = await db
      .select()
      .from(unitCustomers)
      .where(eq(unitCustomers.walletAddress, params.walletAddress))
      .limit(1)

    if (!customer.length || customer[0].applicationStatus !== 'approved') {
      throw new Error('Customer must be KYC approved to receive a card')
    }

    const response = await fetch(`${UNIT_BASE_URL}/cards`, {
      method: 'POST',
      headers: unitHeaders(),
      body: JSON.stringify({
        data: {
          type: 'individualVirtualDebitCard',
          attributes: {
            tags: {
              axiomWallet: params.walletAddress,
              cardName: params.cardName || 'Axiom Community Card',
              platform: 'axiom-protocol',
            },
          },
          relationships: {
            account: {
              data: { type: 'depositAccount', id: params.unitAccountId },
            },
            customer: {
              data: { type: 'customer', id: customer[0].unitCustomerId },
            },
          },
        },
      }),
    })

    const result = await response.json()
    if (!response.ok) {
      throw new Error(`Virtual card creation failed: ${JSON.stringify(result.errors)}`)
    }

    const card = result.data

    const [saved] = await db.insert(unitCards).values({
      walletAddress: params.walletAddress,
      unitCustomerId: customer[0].unitCustomerId,
      unitAccountId: params.unitAccountId,
      unitCardId: card.id,
      cardType: 'virtualDebitCard',
      last4: card.attributes.last4Digits,
      expirationDate: card.attributes.expirationDate,
      status: 'Active',
    }).returning()

    return saved
  }

  // Issue a physical debit card (shipped to member)
  static async issuePhysicalCard(params: {
    walletAddress: string
    unitAccountId: string
    shippingAddress: {
      street: string
      city: string
      state: string
      postalCode: string
      country: string
    }
  }) {
    const customer = await db
      .select()
      .from(unitCustomers)
      .where(eq(unitCustomers.walletAddress, params.walletAddress))
      .limit(1)

    if (!customer.length || customer[0].applicationStatus !== 'approved') {
      throw new Error('Customer must be KYC approved to receive a card')
    }

    const response = await fetch(`${UNIT_BASE_URL}/cards`, {
      method: 'POST',
      headers: unitHeaders(),
      body: JSON.stringify({
        data: {
          type: 'individualDebitCard',
          attributes: {
            shippingAddress: {
              street: params.shippingAddress.street,
              city: params.shippingAddress.city,
              state: params.shippingAddress.state,
              postalCode: params.shippingAddress.postalCode,
              country: params.shippingAddress.country,
            },
            tags: {
              axiomWallet: params.walletAddress,
              platform: 'axiom-protocol',
            },
          },
          relationships: {
            account: {
              data: { type: 'depositAccount', id: params.unitAccountId },
            },
            customer: {
              data: { type: 'customer', id: customer[0].unitCustomerId },
            },
          },
        },
      }),
    })

    const result = await response.json()
    if (!response.ok) {
      throw new Error(`Physical card creation failed: ${JSON.stringify(result.errors)}`)
    }

    const card = result.data

    const [saved] = await db.insert(unitCards).values({
      walletAddress: params.walletAddress,
      unitCustomerId: customer[0].unitCustomerId,
      unitAccountId: params.unitAccountId,
      unitCardId: card.id,
      cardType: 'individualDebitCard',
      last4: card.attributes.last4Digits,
      expirationDate: card.attributes.expirationDate,
      status: 'Active',
      shippingAddress: params.shippingAddress,
    }).returning()

    return saved
  }

  // Freeze a card (lost/stolen/temp suspension)
  static async freezeCard(unitCardId: string) {
    const response = await fetch(`${UNIT_BASE_URL}/cards/${unitCardId}/freeze`, {
      method: 'POST',
      headers: unitHeaders(),
    })
    if (!response.ok) throw new Error('Failed to freeze card')
    await db
      .update(unitCards)
      .set({ status: 'Frozen', updatedAt: new Date() })
      .where(eq(unitCards.unitCardId, unitCardId))
    return { success: true, status: 'Frozen' }
  }

  // Unfreeze a card
  static async unfreezeCard(unitCardId: string) {
    const response = await fetch(`${UNIT_BASE_URL}/cards/${unitCardId}/unfreeze`, {
      method: 'POST',
      headers: unitHeaders(),
    })
    if (!response.ok) throw new Error('Failed to unfreeze card')
    await db
      .update(unitCards)
      .set({ status: 'Active', updatedAt: new Date() })
      .where(eq(unitCards.unitCardId, unitCardId))
    return { success: true, status: 'Active' }
  }

  // Get all cards for a wallet
  static async getCardsForWallet(walletAddress: string) {
    return db
      .select()
      .from(unitCards)
      .where(eq(unitCards.walletAddress, walletAddress))
  }
}
```

---

## TASK 7 — WEBHOOK HANDLER

Create `pages/api/unit/webhook.ts`:

```typescript
import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '../../../lib/db'
import { unitWebhookEvents, unitCustomers, unitPayments } from '../../../shared/unitSchema'
import { eq } from 'drizzle-orm'
import { mapApplicationStatus } from '../../../lib/unit/helpers'
import crypto from 'crypto'

export const config = { api: { bodyParser: false } }

async function getRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const rawBody = await getRawBody(req)

  // Verify webhook signature
  const signature = req.headers['x-unit-signature'] as string
  if (process.env.UNIT_WEBHOOK_SECRET && signature) {
    const expected = crypto
      .createHmac('sha256', process.env.UNIT_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex')
    if (signature !== expected) {
      return res.status(401).json({ error: 'Invalid signature' })
    }
  }

  const event = JSON.parse(rawBody.toString())
  const eventType = event.data?.type
  const resourceId = event.data?.id

  // Store event for audit trail
  try {
    await db.insert(unitWebhookEvents).values({
      unitEventId: event.data?.id || `evt-${Date.now()}`,
      eventType,
      resourceId,
      resourceType: event.data?.attributes?.resourceType,
      payload: event,
    }).onConflictDoNothing()
  } catch (_) {
    // Duplicate event — already processed
    return res.status(200).json({ received: true })
  }

  // Handle specific event types
  try {
    switch (eventType) {

      case 'application.approved':
      case 'application.denied':
      case 'application.awaitingDocuments':
      case 'application.pendingReview': {
        const appId = event.data?.relationships?.application?.data?.id
        const customerId = event.data?.relationships?.customer?.data?.id
        if (appId) {
          await db
            .update(unitCustomers)
            .set({
              applicationStatus: mapApplicationStatus(event.data?.attributes?.status || eventType.split('.')[1]),
              unitCustomerId: customerId || undefined,
              kycTier: eventType === 'application.approved' ? 'verified' : undefined,
              updatedAt: new Date(),
            })
            .where(eq(unitCustomers.unitApplicationId, appId))
        }
        break
      }

      case 'payment.sent':
      case 'payment.cleared':
      case 'payment.rejected':
      case 'payment.returned': {
        const status = eventType.split('.')[1]
        const capitalized = status.charAt(0).toUpperCase() + status.slice(1)
        await db
          .update(unitPayments)
          .set({
            status: capitalized,
            settledAt: ['sent', 'cleared'].includes(status) ? new Date() : undefined,
          })
          .where(eq(unitPayments.unitPaymentId, resourceId))
        break
      }
    }

    // Mark event as processed
    await db
      .update(unitWebhookEvents)
      .set({ processed: true, processedAt: new Date() })
      .where(eq(unitWebhookEvents.unitEventId, event.data?.id))

    res.status(200).json({ received: true })
  } catch (error: any) {
    await db
      .update(unitWebhookEvents)
      .set({ error: error.message })
      .where(eq(unitWebhookEvents.unitEventId, event.data?.id))

    res.status(500).json({ error: 'Webhook processing failed' })
  }
}
```

---

## TASK 8 — API ROUTES

### `pages/api/unit/onboard.ts` — KYC application submission
```typescript
import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { UnitCustomerService } from '../../../lib/services/UnitCustomerService'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  // Get wallet address from your existing SIWE session
  const session = req.cookies['siwe-session'] || req.headers['x-wallet-address']
  if (!session) return res.status(401).json({ error: 'Not authenticated' })

  const walletAddress = typeof session === 'string' ? session : session[0]

  try {
    const result = await UnitCustomerService.createIndividualApplication(
      walletAddress,
      req.body
    )
    res.json(result)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
}
```

### `pages/api/unit/status.ts` — KYC + account status check
```typescript
import type { NextApiRequest, NextApiResponse } from 'next'
import { UnitCustomerService } from '../../../lib/services/UnitCustomerService'
import { UnitAccountService } from '../../../lib/services/UnitAccountService'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()
  const walletAddress = req.cookies['siwe-session'] || req.headers['x-wallet-address'] as string
  if (!walletAddress) return res.status(401).end()

  const kycStatus = await UnitCustomerService.getApplicationStatus(walletAddress)
  const accounts = kycStatus.status === 'approved'
    ? await UnitAccountService.getAccountsForWallet(walletAddress)
    : []

  res.json({ ...kycStatus, accounts })
}
```

### `pages/api/unit/accounts/create.ts` — Create deposit or SUSU pool account
```typescript
import type { NextApiRequest, NextApiResponse } from 'next'
import { UnitAccountService } from '../../../../lib/services/UnitAccountService'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const walletAddress = req.cookies['siwe-session'] || req.headers['x-wallet-address'] as string
  if (!walletAddress) return res.status(401).end()

  const { accountType, susuGroupId, groupName, accountName } = req.body

  try {
    let account
    if (accountType === 'susuPool' && susuGroupId) {
      account = await UnitAccountService.createSusuPoolAccount(walletAddress, susuGroupId, groupName)
    } else {
      account = await UnitAccountService.createMemberAccount(walletAddress, accountName)
    }
    res.json(account)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
}
```

### `pages/api/unit/accounts/[accountId]/transactions.ts` — Transaction history
```typescript
import type { NextApiRequest, NextApiResponse } from 'next'
import { UnitAccountService } from '../../../../../lib/services/UnitAccountService'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()
  const { accountId } = req.query
  const walletAddress = req.cookies['siwe-session'] || req.headers['x-wallet-address'] as string
  if (!walletAddress) return res.status(401).end()

  const transactions = await UnitAccountService.getTransactions(accountId as string)
  res.json({ transactions })
}
```

### `pages/api/unit/payments/send.ts` — Send book payment (P2P / SUSU)
```typescript
import type { NextApiRequest, NextApiResponse } from 'next'
import { UnitPaymentService } from '../../../../lib/services/UnitPaymentService'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const walletAddress = req.cookies['siwe-session'] || req.headers['x-wallet-address'] as string
  if (!walletAddress) return res.status(401).end()

  const { fromAccountId, toAccountId, amountDollars, description, purpose, susuGroupId } = req.body

  try {
    const result = await UnitPaymentService.createBookPayment({
      fromAccountId, toAccountId, amountDollars, description,
      walletAddress, purpose, susuGroupId,
    })
    res.json(result)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
}
```

### `pages/api/unit/payments/recurring.ts` — Setup recurring ACH
```typescript
import type { NextApiRequest, NextApiResponse } from 'next'
import { UnitPaymentService } from '../../../../lib/services/UnitPaymentService'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const walletAddress = req.cookies['siwe-session'] || req.headers['x-wallet-address'] as string
  if (!walletAddress) return res.status(401).end()

  if (req.method === 'POST') {
    try {
      const result = await UnitPaymentService.createRecurringPayment({ ...req.body, walletAddress })
      res.json(result)
    } catch (error: any) {
      res.status(400).json({ error: error.message })
    }
  } else if (req.method === 'DELETE') {
    try {
      const result = await UnitPaymentService.cancelRecurringPayment(req.body.unitRecurringPaymentId)
      res.json(result)
    } catch (error: any) {
      res.status(400).json({ error: error.message })
    }
  } else {
    res.status(405).end()
  }
}
```

### `pages/api/unit/cards/issue.ts` — Issue virtual or physical card
```typescript
import type { NextApiRequest, NextApiResponse } from 'next'
import { UnitCardService } from '../../../../lib/services/UnitCardService'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const walletAddress = req.cookies['siwe-session'] || req.headers['x-wallet-address'] as string
  if (!walletAddress) return res.status(401).end()

  const { unitAccountId, cardType, shippingAddress } = req.body

  try {
    let card
    if (cardType === 'physical') {
      card = await UnitCardService.issuePhysicalCard({ walletAddress, unitAccountId, shippingAddress })
    } else {
      card = await UnitCardService.issueVirtualCard({ walletAddress, unitAccountId })
    }
    res.json(card)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
}
```

### `pages/api/unit/cards/[cardId]/freeze.ts` — Freeze/unfreeze card
```typescript
import type { NextApiRequest, NextApiResponse } from 'next'
import { UnitCardService } from '../../../../../lib/services/UnitCardService'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { cardId } = req.query
  const { action } = req.body // 'freeze' | 'unfreeze'

  try {
    const result = action === 'freeze'
      ? await UnitCardService.freezeCard(cardId as string)
      : await UnitCardService.unfreezeCard(cardId as string)
    res.json(result)
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
}
```

---

## TASK 9 — FRONTEND PAGES

### `pages/banking/index.tsx` — Main banking dashboard

Build a complete banking dashboard page at `/banking` with:

**Design direction:** Dark, premium financial aesthetic. Navy (#0A2240) base with gold (#C9A84C) accents. 
Use Google Font: `Syne` for headings, `DM Sans` for body. 
Add to `_document.tsx`: `<link href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />`

The page has 4 sections driven by a tab/step system:

**Section 1 — Identity Verification (KYC)**
- Show if `kycStatus !== 'approved'`
- Multi-step form: Personal Info → Address → Identity Documents
- Fields: Full name, email, phone, DOB, SSN (masked input), address
- Real-time status polling every 5 seconds after submission
- Status states: "Submitting..." → "Under Review" → "Approved ✓" → "Needs Documents"
- On approval: auto-advance to Section 2

**Section 2 — Your Axiom Account**
- Show FDIC-insured balance card with routing + account number (masked, click to reveal)
- "Fund Account" button → opens ACH setup flow
- Recent transactions list (last 10) with icons per type
- "Create Account" CTA if no account exists yet

**Section 3 — SUSU Pool**
- Show active SUSU pools the user is a member of
- Pool card: group name, current pool balance, members, cycle number, next payout date
- "Contribute Now" button → instant book payment from member account to pool
- "Set Up Auto-Contribute" → recurring ACH setup modal
- Pool transaction history

**Section 4 — Axiom Card**
- Card visual: sleek dark card with Axiom branding, last4, member name, expiry
- Issue Virtual Card / Request Physical Card buttons
- Card controls: Freeze / Unfreeze with toggle
- Spending summary (last 30 days)

### `components/unit/KycForm.tsx` — Reusable KYC form component
### `components/unit/AccountCard.tsx` — Balance display with masked account details
### `components/unit/SusuPoolCard.tsx` — SUSU group pool display
### `components/unit/CardDisplay.tsx` — Debit card visual component
### `components/unit/TransactionList.tsx` — Transaction history list

Add `/banking` to the nav under Products dropdown in `components/design-law/navItems.ts`.

---

## TASK 10 — SANDBOX TESTING UTILITIES

Create `lib/unit/sandbox.ts` — helpers for testing in Unit sandbox:

```typescript
// Only use in development/sandbox environment
export const sandboxSimulations = {
  // Simulate incoming ACH deposit to an account
  async simulateIncomingAch(unitAccountId: string, amountDollars: number) {
    const response = await fetch(
      `https://api.s.unit.sh/sandbox/accounts/${unitAccountId}/transactions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.UNIT_API_TOKEN}`,
          'Content-Type': 'application/vnd.api+json',
        },
        body: JSON.stringify({
          data: {
            type: 'achTransaction',
            attributes: {
              amount: amountDollars * 100,
              direction: 'Credit',
              description: 'SANDBOX TEST DEPOSIT',
            },
          },
        }),
      }
    )
    return response.json()
  },

  // Simulate application approval (sandbox only)
  async approveApplication(applicationId: string) {
    const response = await fetch(
      `https://api.s.unit.sh/sandbox/applications/${applicationId}/approve`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.UNIT_API_TOKEN}`,
          'Content-Type': 'application/vnd.api+json',
        },
      }
    )
    return response.json()
  },
}
```

Create `pages/api/dev/unit-sandbox.ts` — sandbox test endpoint (disable in production):
```typescript
import type { NextApiRequest, NextApiResponse } from 'next'
import { sandboxSimulations } from '../../../lib/unit/sandbox'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).end()
  }
  const { action, accountId, applicationId, amount } = req.body

  if (action === 'deposit') {
    const result = await sandboxSimulations.simulateIncomingAch(accountId, amount || 100)
    return res.json(result)
  }
  if (action === 'approve-application') {
    const result = await sandboxSimulations.approveApplication(applicationId)
    return res.json(result)
  }
  res.status(400).json({ error: 'Unknown action' })
}
```

---

## TASK 11 — RATE LIMITING & SECURITY

Apply rate limiting to all `/api/unit/*` routes using the existing `lib/middleware/withApiProtection.ts` pattern. Unit-specific routes should use `strict` tier (10 req/min) for payment endpoints and `default` tier (60 req/min) for read endpoints.

Add input validation to all routes:
- Dollar amounts: must be positive numbers, max $10,000 per transaction in sandbox
- Account IDs: must match UUID pattern or Unit's ID format
- SSN: validate format before sending to Unit, never log it

---

## TASK 12 — DOCUMENTATION FILE

Create `docs/unit-integration.md` with:
- Architecture overview diagram (ASCII)
- How Unit maps to each Axiom product
- Sandbox testing guide (how to use sandboxSimulations)
- Environment variable reference
- Webhook event types and what they trigger
- Go-live checklist: what changes from sandbox to live (just the API URL and token)

---

## FINAL CHECKLIST FOR REPLIT AGENT

Before marking complete, verify:
- [ ] `npm install @unit-finance/unit-node-sdk` succeeded
- [ ] All 5 DB tables created and migrated successfully
- [ ] `lib/unit/client.ts`, `helpers.ts`, `sandbox.ts` created
- [ ] All 4 service files created with no TypeScript errors
- [ ] All API routes created and respond correctly
- [ ] Webhook handler validates signatures and updates DB
- [ ] `/banking` page renders all 4 sections
- [ ] All Unit components created
- [ ] Sandbox test endpoint works in dev mode
- [ ] No API tokens or secrets hardcoded anywhere
- [ ] `/banking` added to nav
- [ ] `docs/unit-integration.md` created
- [ ] All files follow existing Axiom naming conventions

---

**Sandbox credentials note:** The API token from `.env` is your sandbox token from `app.s.unit.sh`. All Unit calls hit `https://api.s.unit.sh/` in sandbox. When going live, you'll get a live token from `app.unit.co` and change `UNIT_API_URL` to `https://api.unit.co/` — no code changes required.
