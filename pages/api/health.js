let startupLogged = false;

export default function handler(req, res) {
  if (!startupLogged) {
    try {
      const { ACTIVE_AXUSD, ACTIVE_PSM, EULER_AXUSD, EULER_PSM, assertActiveContracts } = require('../../src/config/activeContracts.generated');
      assertActiveContracts();
      console.log('[STARTUP] Active contracts verified:');
      console.log(`  Primary AXUSD: ${ACTIVE_AXUSD} (GENIUS)`);
      console.log(`  Primary PSM:   ${ACTIVE_PSM} (GENIUS)`);
      console.log(`  Euler AXUSD:   ${EULER_AXUSD} (Original)`);
      console.log(`  Euler PSM:     ${EULER_PSM} (Original)`);
      startupLogged = true;
    } catch (e) {
      console.error('[STARTUP] Active contract assertion FAILED:', e.message);
    }
  }
  res.status(200).send('ok');
}
