
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
          src="/tytc-group-photo.jpg"
          alt="TYTC Group Photo"
          data-ai-hint="group photo tytc"
          width={500} 
          height={500} 
          objectFit="cover"
          className="rounded-lg shadow-xl" 
        />
        <div className="relative z-10 text-center text-primary-foreground">
          <h1 className="text-3xl font-bold mb-2">Proverbs 6:6</h1>
          <p className="text-lg mb-1 px-4">Go to the ant, you sluggard! Consider her ways and be wise,</p>
          <h2 className="text-2xl font-bold mt-4 mb-1">Proverbs 6:8</h2>
          <p className="text-lg mb-1 px-4">Provides her supplies in the summer, And gathers her food in the harvest.</p>
          <h2 className="text-2xl font-bold mt-4 mb-1">Proverbs 6:9</h2>
          <p className="text-lg px-4">How long will you slumber, O sluggard? When will you rise from your sleep?</p>
        </div>
      </div>
    </div>
  );
}
