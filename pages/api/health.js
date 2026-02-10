let startupLogged = false;

export default function handler(req, res) {
  if (!startupLogged) {
    try {
      const { ACTIVE_AXUSD, ACTIVE_PSM, EULER_AXUSD, EULER_PSM, DO_NOT_MIX, assertActiveContracts } = require('../../src/config/activeContracts.generated');
      assertActiveContracts();
      console.log('[STARTUP] Active contracts verified:');
      console.log(`  PRIMARY_AXUSD: ${ACTIVE_AXUSD}`);
      console.log(`  PRIMARY_PSM:   ${ACTIVE_PSM}`);
      console.log(`  EULER_AXUSD:   ${EULER_AXUSD}`);
      console.log(`  EULER_PSM:     ${EULER_PSM}`);
      console.log(`  RULE: ${DO_NOT_MIX}`);
      startupLogged = true;
    } catch (e) {
      console.error('[STARTUP] Active contract assertion FAILED:', e.message);
    }
  }
  res.status(200).send('ok');
}
