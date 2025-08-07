import { LandingHeader } from "@/components/landing-header";
import { LandingFooter } from "@/components/landing-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clapperboard, CalendarCheck, CreditCard, Users, BookUser, BarChart, CheckCircle } from "lucide-react";
import Link from "next/link";

const features = [
  {
    icon: <Clapperboard className="w-8 h-8 text-primary" />,
    title: "Professional Website",
    description: "A beautiful, modern website to showcase your barbershop and attract new clients.",
  },
  {
    icon: <CalendarCheck className="w-8 h-8 text-primary" />,
    title: "Smart Booking System",
    description: "An intuitive booking system that lets clients schedule appointments 24/7.",
  },
  {
    icon: <CreditCard className="w-8 h-8 text-primary" />,
    title: "Secure Payments (Stripe)",
    description: "Accept online payments securely with Stripe integration. No more cash-only hassles.",
  },
  {
    icon: <Users className="w-8 h-8 text-primary" />,
    title: "Staff Management",
    description: "Manage your team's schedules, services, and permissions all in one place.",
  },
  {
    icon: <BookUser className="w-8 h-8 text-primary" />,
    title: "Client Management",
    description: "Keep track of client history, preferences, and notes to provide personalized service.",
  },
  {
    icon: <BarChart className="w-8 h-8 text-primary" />,
    title: "Analytics",
    description: "Gain insights into your business with powerful analytics and reporting tools.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LandingHeader />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="py-20 md:py-32 text-center">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-6xl font-bold font-headline text-foreground mb-4">
              The Ultimate Platform for Modern Barbers
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
             Streamline bookings, manage your team, and boost your income — all from one easy-to-use platform. Get your professional website with integrated payments and client management in seconds.
            </p>
            <Button asChild size="lg" className="px-16">
              <Link href="/dashboard">Get Started for Free</Link>
            </Button>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-card">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center font-headline text-card-foreground mb-12">
              Everything You Need to Succeed
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="text-center bg-background shadow-lg">
                  <CardHeader>
                    <div className="mx-auto bg-primary/10 rounded-full p-3 w-fit mb-4">
                      {feature.icon}
                    </div>
                    <CardTitle className="font-headline">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center font-headline text-foreground mb-12">
              Simple, Transparent Pricing
            </h2>
            <div className="flex flex-col lg:flex-row justify-center items-stretch gap-8">
              <Card className="w-full lg:w-1/3 flex flex-col shadow-xl border-primary border-2">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl font-headline">Primary Plan</CardTitle>
                  <p className="text-4xl font-bold">$30<span className="text-lg font-normal text-muted-foreground">/month</span></p>
                </CardHeader>
                <CardContent className="flex-grow">
                  <ul className="space-y-4">
                    {["Professional Website", "Smart Booking System", "Secure Payments", "Staff Management (1 user)", "Client Management", "Analytics"].map(item => (
                       <li key={item} className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <div className="p-6 pt-0">
                  <Button asChild className="w-full" size="lg">
                    <Link href="/dashboard">Choose Plan</Link>
                  </Button>
                </div>
              </Card>
              <Card className="w-full lg:w-1/3 flex flex-col shadow-lg">
                 <CardHeader className="text-center">
                  <CardTitle className="text-2xl font-headline">Add-ons</CardTitle>
                  <p className="text-4xl font-bold">Flexible</p>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold">Additional Staff</h3>
                    <p className="text-2xl font-bold">$10<span className="text-lg font-normal text-muted-foreground">/month per member</span></p>
                    <p className="text-sm text-muted-foreground mt-2">Scale your team as your business grows. Add more staff members to your plan at any time.</p>
                  </div>
                </CardContent>
                 <div className="p-6 pt-0">
                   <Button asChild className="w-full" variant="outline">
                    <Link href="/dashboard">Get Started</Link>
                  </Button>
                 </div>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
