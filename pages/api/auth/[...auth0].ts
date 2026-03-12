import { handleAuth, handleCallback } from '@auth0/nextjs-auth0';
import { pool } from '../../../server/db';

const afterCallback = async (_req: any, _res: any, session: any) => {
  const { user } = session;
  try {
    await pool.query(
      `INSERT INTO auth0_users (auth0_sub, email, name, picture)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (auth0_sub)
       DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name, picture = EXCLUDED.picture`,
      [user.sub, user.email || null, user.name || null, user.picture || null]
    );
  } catch (err) {
    console.error('[Auth0] Failed to upsert auth0_users:', err);
  }
  return session;
};

export default handleAuth({
  callback: handleCallback({ afterCallback }),
});
