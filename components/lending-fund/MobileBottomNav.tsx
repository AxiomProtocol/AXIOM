import Link from 'next/link';
import { useRouter } from 'next/router';

export default function MobileBottomNav() {
  const router = useRouter();
  const currentPath = router.pathname;

  const isActive = (path: string) => {
    if (path === '/lending-fund') {
      return currentPath === '/lending-fund';
    }
    return currentPath.startsWith(path);
  };

  const getColor = (path: string) => isActive(path) ? '#00D4AA' : '#6b7280';

  return (
    <div className="fixed bottom-0 left-0 right-0 sm:hidden z-50" style={{ background: "#FFFFFF", borderTop: "1px solid #e5e7eb", boxShadow: "0 -4px 20px rgba(0,0,0,0.1)" }}>
      <div className="flex items-center justify-around py-2 px-4 safe-area-inset-bottom">
        <Link href="/lending-fund" className="flex flex-col items-center p-2 min-w-[64px] min-h-[48px] touch-manipulation active:opacity-70" style={{ color: getColor('/lending-fund') }}>
          <span className="text-xl">🏠</span>
          <span className="text-xs font-medium mt-1">Fund</span>
        </Link>
        <Link href="/lending-fund/onboarding" className="flex flex-col items-center p-2 min-w-[64px] min-h-[48px] touch-manipulation active:opacity-70" style={{ color: getColor('/lending-fund/onboarding') }}>
          <span className="text-xl">💵</span>
          <span className="text-xs font-medium mt-1">Invest</span>
        </Link>
        <Link href="/lending-fund/dashboard" className="flex flex-col items-center p-2 min-w-[64px] min-h-[48px] touch-manipulation active:opacity-70" style={{ color: getColor('/lending-fund/dashboard') }}>
          <span className="text-xl">📊</span>
          <span className="text-xs font-medium mt-1">Dashboard</span>
        </Link>
        <Link href="/lending-fund/docs" className="flex flex-col items-center p-2 min-w-[64px] min-h-[48px] touch-manipulation active:opacity-70" style={{ color: getColor('/lending-fund/docs') }}>
          <span className="text-xl">📄</span>
          <span className="text-xs font-medium mt-1">Docs</span>
        </Link>
      </div>
    </div>
  );
}
