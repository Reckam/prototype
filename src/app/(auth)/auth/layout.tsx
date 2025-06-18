
import { Logo } from "@/components/shared/Logo";

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
      {/* Updated classes to make scripture visible on smaller screens and stack appropriately */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-primary p-8 md:p-12 relative overflow-hidden mt-8 lg:mt-0">
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
