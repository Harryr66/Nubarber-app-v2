
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Calendar,
  Scissors,
  Users,
  Settings,
  LogOut,
  ChevronDown,
  Globe,
  BookUser,
} from "lucide-react";
import { NuBarberLogo } from "@/components/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "./ui/button";
import { useAuth } from "@/hooks/use-auth";
import { getFirebase } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const navItems = [
  { href: "/dashboard/overview", icon: <LayoutDashboard />, label: "Overview" },
  { href: "/dashboard/schedule", icon: <Calendar />, label: "Schedule" },
  { href: "/dashboard/services", icon: <Scissors />, label: "Services" },
  { href: "/dashboard/staff", icon: <Users />, label: "Staff" },
  { href: "/dashboard/clients", icon: <BookUser />, label: "Clients" },
  { href: "/dashboard/public-site", icon: <Globe />, label: "Public Site" },
  { href: "/dashboard/settings", icon: <Settings />, label: "Settings" },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, db: defaultDb } = useAuth(); // db from useAuth is the default one
  const [shopName, setShopName] = useState("Loading...");

  useEffect(() => {
    const fetchShopName = async () => {
      if(user && defaultDb) {
        // The 'shops' collection is always in the default DB
        const shopDocRef = doc(defaultDb, "shops", user.uid);
        const shopDoc = await getDoc(shopDocRef);
        if (shopDoc.exists()) {
          setShopName(shopDoc.data().name);
        }
      }
    };
    fetchShopName();
  }, [user, defaultDb]);

  const handleLogout = async () => {
    const { auth } = getFirebase();
    if (auth) {
        await auth.signOut();
    }
    router.push('/');
  };

  const getInitials = (email: string | null | undefined) => {
    return email ? email.substring(0, 2).toUpperCase() : 'U';
  }

  return (
    <Sidebar>
      <SidebarHeader className="py-4">
        <div className="flex items-center gap-2">
           <Link href="/dashboard/overview" className="flex items-center gap-2 font-bold text-lg text-foreground">
            <NuBarberLogo />
          </Link>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href}>
                <SidebarMenuButton
                  isActive={pathname.startsWith(item.href)}
                  tooltip={item.label}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={!user}>
            <Button variant="ghost" className="w-full justify-start p-2 h-auto">
              <div className="flex items-center gap-3 w-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="" alt="User" />
                  <AvatarFallback>{getInitials(user?.email)}</AvatarFallback>
                </Avatar>
                <div className="text-left group-data-[collapsible=icon]:hidden">
                  <p className="font-medium text-sm truncate">{user?.email || "User"}</p>
                  <p className="text-xs text-muted-foreground truncate">{shopName}</p>
                </div>
                <ChevronDown className="h-4 w-4 ml-auto group-data-[collapsible=icon]:hidden" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 mb-2" align="end">
             <Link href="/dashboard/settings">
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
            </Link>
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
