import { APP_NAME } from '@/lib/constants';
import { PiggyBank } from 'lucide-react'; // Changed back to PiggyBank
import Link from 'next/link';

interface LogoProps {
  href?: string;
  className?: string;
}

export function Logo({ href = "/", className }: LogoProps) {
  return (
    <Link href={href} className={`flex items-center gap-2 text-xl font-semibold text-primary ${className}`}>
      <PiggyBank className="h-7 w-7" /> {/* Changed back to PiggyBank */}
      <span>{APP_NAME}</span>
    </Link>
  );
}
