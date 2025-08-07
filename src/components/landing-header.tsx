"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { NuBarberLogo } from "@/components/icons";

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center pl-6">
        <div className="mr-auto flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-foreground">
            <NuBarberLogo />
          </Link>
        </div>
        <nav className="hidden md:flex md:items-center md:gap-4">
          <Button variant="outline" asChild>
            <Link href="/dashboard">Login</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard">Get Started</Link>
          </Button>
        </nav>
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <div className="flex flex-col gap-4 py-8">
                <Link href="/dashboard" className="w-full">
                  <Button variant="outline" className="w-full">Login</Button>
                </Link>
                <Link href="/dashboard" className="w-full">
                  <Button className="w-full">Get Started</Button>
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
