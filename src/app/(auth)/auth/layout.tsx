import { Logo } from "@/components/shared/Logo";
import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 lg:p-12 space-y-6">
        <Logo className="mb-8 text-3xl" />
        {children}
      </div>
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-primary p-12 relative overflow-hidden">
        <Image
          src="https://picsum.photos/800/1000"
          alt="Savings Central illustration"
          data-ai-hint="financial growth savings"
          layout="fill"
          objectFit="cover"
          className="opacity-30"
        />
        <div className="relative z-10 text-center text-primary-foreground">
          <h1 className="text-4xl font-bold mb-4">Welcome to Savings Central</h1>
          <p className="text-lg">Your trusted partner for managing savings and loans effectively.</p>
        </div>
      </div>
    </div>
  );
}
