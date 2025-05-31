
"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  PiggyBank,
  Landmark,
  FileText,
  Bell,
  LogOut,
  Users,
  Settings,
  UserCircle,
  ShieldCheck,
  FileClock,
  UserPlus,
  Edit3,
  BarChart3,
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Logo } from "@/components/shared/Logo";
import { APP_NAME } from "@/lib/constants";
import { getCurrentUser, getCurrentAdmin, logoutUser, logoutAdmin } from "@/lib/authService";
import { useEffect, useState } from "react";
import type { User, Admin } from "@/types";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  activePaths?: string[];
}

interface DashboardLayoutProps {
  children: ReactNode;
  role: "user" | "admin";
}

const commonNavItems: NavItem[] = [
  // Common items can be added here if any in future
];

const userNavItems: NavItem[] = [
  { href: "/dashboard/user", label: "Overview", icon: Home, activePaths: ["/dashboard/user"] },
  { href: "/dashboard/user/savings", label: "Savings", icon: PiggyBank, activePaths: ["/dashboard/user/savings"] },
  { href: "/dashboard/user/loans", label: "Loans", icon: Landmark, activePaths: ["/dashboard/user/loans", "/dashboard/user/loans/request"] },
  { href: "/dashboard/user/history", label: "History", icon: FileText, activePaths: ["/dashboard/user/history"] },
  { href: "/dashboard/user/notifications", label: "Notifications", icon: Bell, activePaths: ["/dashboard/user/notifications"] },
];

const adminNavItems: NavItem[] = [
  { href: "/dashboard/admin", label: "Overview", icon: Home, activePaths: ["/dashboard/admin"] },
  { href: "/dashboard/admin/users", label: "Manage Users", icon: Users, activePaths: ["/dashboard/admin/users", "/dashboard/admin/users/add"] },
  { href: "/dashboard/admin/loans", label: "Loan Requests", icon: Landmark, activePaths: ["/dashboard/admin/loans"] },
  { href: "/dashboard/admin/savings", label: "Savings Records", icon: Edit3, activePaths: ["/dashboard/admin/savings"] },
  { href: "/dashboard/admin/reports", label: "Reports", icon: BarChart3, activePaths: ["/dashboard/admin/reports"] },
  { href: "/dashboard/admin/audit-log", label: "Audit Log", icon: FileClock, activePaths: ["/dashboard/admin/audit-log"] },
];

export default function DashboardLayout({ children, role }: DashboardLayoutProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentAdmin, setCurrentAdmin] = useState<Admin | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (role === "user") {
      const user = getCurrentUser();
      if (!user) router.push("/auth/login");
      else setCurrentUser(user);
    } else if (role === "admin") {
      const admin = getCurrentAdmin();
      if (!admin) router.push("/auth/admin-login");
      else setCurrentAdmin(admin);
    }
  }, [role, router]);


  const handleLogout = () => {
    if (role === "user") {
      logoutUser();
      router.push("/auth/login");
    } else {
      logoutAdmin();
      router.push("/auth/admin-login");
    }
    setIsMobileMenuOpen(false); 
  };

  const navItems = role === "user" ? userNavItems : adminNavItems;
  const profileName = role === "user" ? currentUser?.name : currentAdmin?.name;
  const profileIdentifier = role === "user" ? currentUser?.username : currentAdmin?.email; 
  const profileRoleIcon = role === "user" ? UserCircle : ShieldCheck;
  // Use profilePhotoDataUrl from user state for AvatarImage src
  const profilePhotoToDisplay = role === "user" ? currentUser?.profilePhotoUrl : undefined;


  if (!isClient || (role === "user" && !currentUser) || (role === "admin" && !currentAdmin)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const NavContent = () => (
    <>
      <div className="flex h-14 items-center border-b border-sidebar-border px-4 lg:h-[60px] lg:px-6">
        <Logo href={role === "user" ? "/dashboard/user" : "/dashboard/admin"} />
      </div>
      <nav className="flex-1 overflow-auto py-4 px-2 text-sm font-medium lg:px-4">
        {navItems.map((item) => (
          <SheetClose asChild key={item.label + '-mobile-nav'}>
            <Link
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 my-1 text-sidebar-foreground transition-all hover:text-sidebar-primary-foreground hover:bg-sidebar-accent ${
                item.activePaths?.some(path => router.pathname?.startsWith(path)) ? "bg-sidebar-accent text-sidebar-primary-foreground font-semibold" : ""
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          </SheetClose>
        ))}
      </nav>
      <div className="mt-auto p-4 border-t border-sidebar-border">
        <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:text-sidebar-primary-foreground hover:bg-sidebar-accent" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </>
  );

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      
      <aside className="hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b border-sidebar-border px-4 lg:h-[60px] lg:px-6">
            <Logo href={role === "user" ? "/dashboard/user" : "/dashboard/admin"} />
          </div>
          <nav className="flex-1 overflow-auto py-4 px-2 text-sm font-medium lg:px-4">
            {navItems.map((item) => (
              <Link
                key={item.label + '-desktop-nav'}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 my-1 text-sidebar-foreground transition-all hover:text-sidebar-primary-foreground hover:bg-sidebar-accent ${
                  item.activePaths?.some(path => router.pathname?.startsWith(path)) ? "bg-sidebar-accent text-sidebar-primary-foreground font-semibold" : ""
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto p-4 border-t border-sidebar-border">
            <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:text-sidebar-primary-foreground hover:bg-sidebar-accent" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0 w-[220px] sm:w-[280px] bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
              <NavContent />
            </SheetContent>
          </Sheet>
          
          <div className="w-full flex-1">
            {/* Optional: Search bar or breadcrumbs */}
          </div>

          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <Avatar>
                  <AvatarImage src={profilePhotoToDisplay || undefined} alt={profileName || "User"} />
                  <AvatarFallback>{profileName?.charAt(0).toUpperCase() || (role === "user" ? "U" : "A")}</AvatarFallback>
                </Avatar>
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="flex items-center gap-2">
                <profileRoleIcon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div>{profileName}</div>
                  <div className="text-xs text-muted-foreground">{profileIdentifier}</div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { router.push(role === "user" ? "/dashboard/user/profile" : "/dashboard/admin/profile"); setIsMobileMenuOpen(false);}}>
                <UserCircle className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { router.push(role === "user" ? "/dashboard/user/settings" : "/dashboard/admin/settings"); setIsMobileMenuOpen(false);}}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 overflow-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
