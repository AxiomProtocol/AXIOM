import { getUnitClient, isUnitConfigured } from '../unit/client';
import { isValidSsnFormat, normalizeSsn, lastFourSsn, mapApplicationStatus } from '../unit/helpers';
import { db } from '../../server/db';
import { unitCustomers } from '../../shared/unitSchema';
import { eq } from 'drizzle-orm';
import type { UnitCustomer } from '../../shared/unitSchema';

export interface KycApplicationInput {
  walletAddress: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  ssn: string;
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressPostalCode: string;
  addressCountry?: string;
}

export interface KycApplicationResult {
  success: boolean;
  applicationId?: string;
  status?: string;
  error?: string;
}

export class UnitCustomerService {
  async createIndividualApplication(input: KycApplicationInput): Promise<KycApplicationResult> {
    if (!isValidSsnFormat(input.ssn)) {
      return { success: false, error: 'Invalid SSN format. Use XXX-XX-XXXX or 9 digits.' };
    }

    const client = getUnitClient();
    if (!client) {
      return { success: false, error: 'Banking service is not configured. Please contact support.' };
    }

    try {
      const response = await client.applications.create({
        type: 'individualApplication',
        attributes: {
          fullName: {
            first: input.firstName.trim(),
            last: input.lastName.trim(),
          },
          email: input.email.trim().toLowerCase(),
          phone: { countryCode: '1', number: input.phone.replace(/\D/g, '') },
          dateOfBirth: input.dateOfBirth,
          ssn: normalizeSsn(input.ssn),
          address: {
            street: input.addressStreet.trim(),
            city: input.addressCity.trim(),
            state: input.addressState.toUpperCase(),
            postalCode: input.addressPostalCode.trim(),
            country: 'US' as const,
          },
          ip: '127.0.0.1',
        },
      } as Parameters<typeof client.applications.create>[0]);

      const appData = response.data;
      const applicationId = appData.id;
      const status = mapApplicationStatus((appData.attributes as { status?: string }).status ?? 'Pending');

      await db
        .insert(unitCustomers)
        .values({
          walletAddress: input.walletAddress.toLowerCase(),
          unitApplicationId: applicationId,
          applicationStatus: status,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          email: input.email.trim().toLowerCase(),
          phone: input.phone.replace(/\D/g, ''),
          dateOfBirth: input.dateOfBirth,
          ssnLastFour: lastFourSsn(input.ssn),
          addressStreet: input.addressStreet.trim(),
          addressCity: input.addressCity.trim(),
          addressState: input.addressState.toUpperCase(),
          addressPostalCode: input.addressPostalCode.trim(),
          addressCountry: input.addressCountry ?? 'US',
        })
        .onConflictDoUpdate({
          target: unitCustomers.walletAddress,
          set: {
            unitApplicationId: applicationId,
            applicationStatus: status,
            firstName: input.firstName.trim(),
            lastName: input.lastName.trim(),
            email: input.email.trim().toLowerCase(),
            updatedAt: new Date(),
          },
        });

      return { success: true, applicationId, status };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const axiosData = (err as { response?: { data?: unknown; status?: number } })?.response;
      console.error('[UnitCustomerService] createIndividualApplication error:', msg, JSON.stringify(axiosData?.data ?? {}));
      return { success: false, error: 'Failed to submit identity verification. Please try again.' };
    }
  }

  async getApplicationStatus(walletAddress: string): Promise<{
    status: string;
    applicationId?: string;
    customerId?: string;
    isApproved: boolean;
  }> {
    const wallet = walletAddress.toLowerCase();
    const [customer] = await db
      .select()
      .from(unitCustomers)
      .where(eq(unitCustomers.walletAddress, wallet))
      .limit(1);

    if (!customer) {
      return { status: 'NotStarted', isApproved: false };
    }

    if (customer.isApproved || customer.applicationStatus === 'Approved') {
      return {
        status: 'Approved',
        applicationId: customer.unitApplicationId ?? undefined,
        customerId: customer.unitCustomerId ?? undefined,
        isApproved: true,
      };
    }

    if (customer.unitApplicationId && isUnitConfigured()) {
      const client = getUnitClient();
      if (client) {
        try {
          const response = await client.applications.get(customer.unitApplicationId);
          const liveStatus = mapApplicationStatus(
            (response.data?.attributes as { status?: string })?.status ?? customer.applicationStatus ?? 'Pending'
          );
          const liveCustomerId = (response.data?.relationships as { customer?: { data?: { id?: string } } })?.customer?.data?.id;

          const updatePayload: Partial<typeof customer> & { updatedAt: Date; applicationStatus: string } = {
            applicationStatus: liveStatus,
            updatedAt: new Date(),
          };

          if (liveStatus === 'Approved') {
            updatePayload.isApproved = true;
            updatePayload.approvedAt = new Date();
            if (liveCustomerId) updatePayload.unitCustomerId = liveCustomerId;
          }
          if (liveStatus === 'Denied') {
            updatePayload.deniedAt = new Date();
          }

          await db
            .update(unitCustomers)
            .set(updatePayload as Record<string, unknown>)
            .where(eq(unitCustomers.walletAddress, wallet));

          return {
            status: liveStatus,
            applicationId: customer.unitApplicationId,
            customerId: liveCustomerId ?? customer.unitCustomerId ?? undefined,
            isApproved: liveStatus === 'Approved',
          };
        } catch {
          // Fall through to return cached status
        }
      }
    }

    return {
      status: customer.applicationStatus ?? 'Pending',
      applicationId: customer.unitApplicationId ?? undefined,
      customerId: customer.unitCustomerId ?? undefined,
      isApproved: false,
    };
  }

  async getCustomer(walletAddress: string): Promise<UnitCustomer | null> {
    const [customer] = await db
      .select()
      .from(unitCustomers)
      .where(eq(unitCustomers.walletAddress, walletAddress.toLowerCase()))
      .limit(1);
    return customer ?? null;
  }

  async isApproved(walletAddress: string): Promise<boolean> {
    const [customer] = await db
      .select({ isApproved: unitCustomers.isApproved })
      .from(unitCustomers)
      .where(eq(unitCustomers.walletAddress, walletAddress.toLowerCase()))
      .limit(1);
    return customer?.isApproved ?? false;
  }

  async syncCustomerFromWebhook(unitCustomerId: string, unitApplicationId: string): Promise<void> {
    await db
      .update(unitCustomers)
      .set({
        unitCustomerId,
        applicationStatus: 'Approved',
        isApproved: true,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(unitCustomers.unitApplicationId, unitApplicationId));
  }
}

export const unitCustomerService = new UnitCustomerService();
