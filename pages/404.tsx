import Link from 'next/link';
import { DesignLawLayout } from '../components/design-law';

export default function Custom404() {
  return (
    <DesignLawLayout>
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h1 className="font-dl-serif text-5xl text-dl-navy mb-4">
          404
        </h1>
        <p className="text-lg text-dl-gray mb-8 max-w-md">
          This page could not be found. It may have been moved or no longer exists.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-7 py-3 bg-dl-navy text-white text-sm font-medium"
        >
          Return to Home
        </Link>
      </div>
    </DesignLawLayout>
  );
}
