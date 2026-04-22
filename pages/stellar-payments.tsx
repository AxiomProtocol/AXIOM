/**
 * /stellar-payments — redirects to /axiom-payment-rails
 * Kept for backwards compatibility with any existing bookmarks or links.
 */
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async () => {
  return { redirect: { destination: '/axiom-payment-rails', permanent: true } };
};

export default function StellarPaymentsRedirect() {
  return null;
}
