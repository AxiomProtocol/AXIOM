import { db } from '../../server/db';
import { smsSubscribers } from '../../shared/schema';
import { eq } from 'drizzle-orm';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { phone, name, email, categories } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    const normalizedPhone = cleanPhone.length === 10 ? `+1${cleanPhone}` : `+${cleanPhone}`;

    const existing = await db.select()
      .from(smsSubscribers)
      .where(eq(smsSubscribers.phone, normalizedPhone))
      .limit(1);

    if (existing.length > 0) {
      if (existing[0].status === 'unsubscribed') {
        await db.update(smsSubscribers)
          .set({
            status: 'active',
            categories: categories?.join(',') || 'all',
            name: name || existing[0].name,
            email: email || existing[0].email,
            optInTimestamp: new Date(),
            optOutTimestamp: null,
            updatedAt: new Date()
          })
          .where(eq(smsSubscribers.phone, normalizedPhone));

        return res.status(200).json({ success: true, message: 'Subscription reactivated' });
      }
      return res.status(400).json({ error: 'This phone number is already subscribed' });
    }

    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';

    await db.insert(smsSubscribers).values({
      phone: normalizedPhone,
      name: name || null,
      email: email || null,
      categories: categories?.join(',') || 'all',
      status: 'active',
      optInIp: typeof clientIp === 'string' ? clientIp.split(',')[0].trim() : '',
      optInTimestamp: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return res.status(200).json({ success: true, message: 'Successfully subscribed to SMS alerts' });

  } catch (error) {
    console.error('SMS subscribe error:', error);
    return res.status(500).json({ error: 'Failed to subscribe. Please try again.' });
  }
}
