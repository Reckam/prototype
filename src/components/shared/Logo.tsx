import { APP_NAME } from '@/lib/constants';
import { Shapes } from 'lucide-react'; // Changed from PiggyBank to Shapes
import Link from 'next/link';

interface LogoProps {
  href?: string;
  className?: string;
}

export function Logo({ href = "/", className }: LogoProps) {
  return (
    <Link href={href} className={`flex items-center gap-2 text-xl font-semibold text-primary ${className}`}>
      <Shapes className="h-7 w-7" /> {/* Changed from PiggyBank to Shapes */}
      <span>{APP_NAME}</span>
    </Link>
  );
}
