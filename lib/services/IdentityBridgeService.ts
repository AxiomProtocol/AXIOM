import { db } from '../../server/db';
import { t3Identities, t3Claims } from '../../shared/erc3643Schema';
import { eq, and } from 'drizzle-orm';
import { CLAIM_TOPICS, COUNTRY_CODES } from '../../shared/contracts-3643';
import { ERC3643Service } from './ERC3643Service';

export class IdentityBridgeService {
  static async getKycSubmissions() {
    const result = await db.execute<{
      id: string;
      wallet_address: string;
      verification_status: string;
      risk_level: string;
      accredited_status: boolean;
      country: string;
    }>(
      `SELECT id, wallet_address, verification_status, risk_level, accredited_status, country
       FROM kyc_submissions
       WHERE verification_status = 'approved'
       ORDER BY created_at DESC`
    );
    return result.rows || [];
  }

  static mapVerificationToTopics(submission: {
    verification_status: string;
    risk_level: string;
    accredited_status: boolean;
  }): number[] {
    const topics: number[] = [];

    if (submission.verification_status === 'approved') {
      topics.push(CLAIM_TOPICS.KYC_VERIFIED);
      topics.push(CLAIM_TOPICS.SANCTIONS_CLEAR);
    }

    if (submission.accredited_status) {
      topics.push(CLAIM_TOPICS.ACCREDITED_INVESTOR);
    }

    return topics;
  }

  static async bridgeExistingKyc() {
    const submissions = await this.getKycSubmissions();
    const results = {
      total: submissions.length,
      bridged: 0,
      skipped: 0,
      errors: [] as { wallet: string; error: string }[],
    };

    for (const sub of submissions) {
      try {
        const existing = await db.select()
          .from(t3Identities)
          .where(eq(t3Identities.wallet, sub.wallet_address.toLowerCase()))
          .limit(1);

        if (existing.length > 0) {
          results.skipped++;
          continue;
        }

        const identity = await ERC3643Service.registerIdentity(
          sub.wallet_address,
          COUNTRY_CODES.US
        );

        const topics = this.mapVerificationToTopics(sub);
        for (const topic of topics) {
          await ERC3643Service.issueClaim(sub.wallet_address, topic);
        }

        await db.update(t3Identities)
          .set({
            kycSubmissionId: sub.id,
            verificationLevel: sub.accredited_status ? 2 : 1,
            updatedAt: new Date(),
          })
          .where(eq(t3Identities.wallet, sub.wallet_address.toLowerCase()));

        results.bridged++;
      } catch (err: any) {
        results.errors.push({
          wallet: sub.wallet_address,
          error: err.message,
        });
      }
    }

    return results;
  }
}
