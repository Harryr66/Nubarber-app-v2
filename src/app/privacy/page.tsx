import { LandingHeader } from "@/components/landing-header";
import { LandingFooter } from "@/components/landing-footer";

export default function PrivacyPolicy() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LandingHeader />
      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto bg-card p-8 rounded-lg shadow-md">
          <h1 className="text-3xl font-bold font-headline mb-6 text-card-foreground">Privacy Policy</h1>
          <div className="space-y-4 text-muted-foreground">
            <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
            <p>
              Welcome to NuBarber! We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application.
            </p>
            <h2 className="text-xl font-semibold font-headline text-card-foreground pt-4">1. Information We Collect</h2>
            <p>
              We may collect personal information from you such as your name, email address, and payment information when you register for an account, book an appointment, or use our services. We also collect information about your barbershop, including services offered and staff details.
            </p>
            <h2 className="text-xl font-semibold font-headline text-card-foreground pt-4">2. How We Use Your Information</h2>
            <p>
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>Provide, operate, and maintain our services.</li>
              <li>Improve, personalize, and expand our services.</li>
              <li>Process your transactions and manage your bookings.</li>
              <li>Communicate with you, either directly or through one of our partners, for customer service, to provide you with updates and other information relating to the app, and for marketing and promotional purposes.</li>
              <li>Send you emails.</li>
              <li>Find and prevent fraud.</li>
            </ul>
            <h2 className="text-xl font-semibold font-headline text-card-foreground pt-4">3. Sharing Your Information</h2>
            <p>
              We do not sell, trade, or otherwise transfer to outside parties your Personally Identifiable Information unless we provide users with advance notice. This does not include website hosting partners and other parties who assist us in operating our application, conducting our business, or serving our users, so long as those parties agree to keep this information confidential.
            </p>
            <h2 className="text-xl font-semibold font-headline text-card-foreground pt-4">4. Data Security</h2>
            <p>
              We implement a variety of security measures to maintain the safety of your personal information. Your personal information is contained behind secured networks and is only accessible by a limited number of persons who have special access rights to such systems, and are required to keep the information confidential.
            </p>
            <h2 className="text-xl font-semibold font-headline text-card-foreground pt-4">5. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at support@nubarber.com.
            </p>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
