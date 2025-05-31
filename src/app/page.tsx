
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PiggyBank, LogIn, UserPlus, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
// Image import removed

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Link href="/" className="flex items-center space-x-2">
            <PiggyBank className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg leading-none">{APP_NAME}</span>
          </Link>
          <nav className="ml-auto flex items-center space-x-2">
            <Button variant="ghost" asChild>
              <Link href="/auth/login">User Login</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/register">Register</Link>
            </Button>
             <Button variant="outline" asChild>
              <Link href="/auth/admin-login">Admin Login</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12"> {/* Adjusted grid layout */}
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    Secure Your Future with <span className="text-primary">{APP_NAME}</span>
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Effortlessly manage your SACCO savings, apply for loans, and track your financial growth. Join us today and take control of your finances.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button size="lg" asChild>
                    <Link href="/auth/register">
                      Get Started
                      <UserPlus className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button variant="secondary" size="lg" asChild>
                    <Link href="/auth/login">
                      Access Your Account
                      <LogIn className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                </div>
              </div>
              {/* Image component removed from here. The div will now take full width on larger screens if not constrained. */}
              <div className="flex items-center justify-center bg-muted rounded-xl p-8 lg:p-12 shadow-lg">
                <PiggyBank className="h-32 w-32 text-primary" />
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm">Key Features</div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Everything You Need in One Place</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  {APP_NAME} provides a comprehensive suite of tools for users to manage savings and loans efficiently and securely.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-2 mt-12"> 
              <Card>
                <CardHeader>
                  <PiggyBank className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Savings Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>Track your total savings, view history, and see your profits grow over time. Secure and transparent.</CardDescription>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-primary mb-2 lucide lucide-landmark"><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>
                  <CardTitle>Loan Applications</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>Easily submit loan requests and track their status (pending, approved, or rejected) with real-time notifications.</CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link href="#" className="text-xs hover:underline underline-offset-4 text-muted-foreground" prefetch={false}>
            Terms of Service
          </Link>
          <Link href="#" className="text-xs hover:underline underline-offset-4 text-muted-foreground" prefetch={false}>
            Privacy Policy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
