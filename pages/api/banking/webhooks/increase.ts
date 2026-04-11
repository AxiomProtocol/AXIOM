/**
 * Banking-namespace Increase webhook handler.
 * Route: POST /api/banking/webhooks/increase
 *
 * This module re-exports the canonical webhook handler at /api/webhooks/increase.
 * Both paths are registered so that Increase webhook subscriptions can target
 * /api/banking/webhooks/increase as specified in the Direct Deposit product spec.
 */
export { default, config } from '../../webhooks/increase';
