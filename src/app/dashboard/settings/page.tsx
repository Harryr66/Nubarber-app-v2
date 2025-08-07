
"use client";

import { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, ExternalLink, Loader2, Monitor, Moon, Sun } from "lucide-react";
import { getGmbAuthUrl } from "@/lib/gmb";
import { useSearchParams } from "next/navigation";
import { createStripeConnectAccount } from "@/lib/payments";
import { useTheme } from "next-themes";
import PageHeader from "@/components/page-header";

function SettingsContent() {
  const { user, db: defaultDb } = useAuth(); // db here is the default one for shop info
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const { setTheme } = useTheme();

  const [shopDetails, setShopDetails] = useState({ name: "", address: "", stripeAccountId: "" });
  const [stripeConnected, setStripeConnected] = useState(false);
  const [gmbConnected, setGmbConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // Check for callback query params
    if (searchParams.get('stripe_connected')) {
      setStripeConnected(true);
      toast({ title: "Success!", description: "Your Stripe account has been connected." });
      if(user && defaultDb) {
        updateDoc(doc(defaultDb, "shops", user.uid), { stripeConnected: true });
      }
    }
    if (searchParams.get('gmb_connected')) {
      setGmbConnected(true);
      toast({ title: "Success!", description: "Your Google My Business account has been connected." });
    }
    if (searchParams.get('error')) {
       toast({ title: "Connection Failed", description: "Could not connect to an external service.", variant: "destructive" });
    }

    const fetchShopDetails = async () => {
      if (!user || !defaultDb) {
          setIsLoading(false);
          return;
      };
      setIsLoading(true);
      try {
        // The 'shops' collection is always in the default DB
        const shopDocRef = doc(defaultDb, "shops", user.uid);
        const shopDoc = await getDoc(shopDocRef);
        if (shopDoc.exists()) {
          const data = shopDoc.data();
          setShopDetails({ name: data.name || "", address: data.address || "", stripeAccountId: data.stripeAccountId || "" });
          setStripeConnected(data.stripeConnected || false);
          // In a real app, you'd fetch this from the stored GMB tokens
          // For now, we simulate this based on a successful redirect.
          setGmbConnected(!!data.gmbAccessToken || !!searchParams.get('gmb_connected')); 
        } else {
          console.log("No such document! Creating one for the user.");
          setShopDetails({ name: "My Barbershop", address: "", stripeAccountId: "" });
        }
      } catch (error) {
        console.error("Error fetching shop details:", error);
        toast({ title: "Error", description: "Could not load shop details.", variant: "destructive"});
      }
      setIsLoading(false);
    };
    if (user) {
        fetchShopDetails();
    } else {
        setIsLoading(false);
    }
  }, [user, defaultDb, toast, searchParams]);

  const handleSave = async () => {
    if(!user || !defaultDb) {
      toast({ title: "Error", description: "You must be logged in to save.", variant: "destructive"});
      return;
    }
    setIsSaving(true);
    try {
      const shopDocRef = doc(defaultDb, "shops", user.uid);
      await setDoc(shopDocRef, {name: shopDetails.name, address: shopDetails.address }, { merge: true });
      toast({ title: "Success", description: "Shop details saved successfully." });
    } catch (error) {
      console.error("Error saving shop details:", error);
      toast({ title: "Error", description: "Could not save shop details.", variant: "destructive"});
    }
    setIsSaving(false);
  }

  const handleStripeConnect = async () => {
    if (!user) {
        toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
        return;
    }
    setIsConnecting(true);
    try {
        const { url, error } = await createStripeConnectAccount(user.uid);
        if (error || !url) {
            throw new Error(error || "Failed to get Stripe Connect URL");
        }
        window.location.href = url;
    } catch(error) {
         toast({ title: "Stripe Connection Failed", description: "Could not connect to Stripe. Please try again.", variant: "destructive" });
    } finally {
        setIsConnecting(false);
    }
  };
  
  const handleGmbConnect = async () => {
    setIsConnecting(true);
    try {
        const url = await getGmbAuthUrl();
        window.location.href = url;
    } catch (error) {
        toast({ title: "Error", description: "Could not connect to Google. Please ensure API credentials are set up correctly.", variant: "destructive" });
        setIsConnecting(false);
    }
  }


  return (
    <div>
      <PageHeader title="Settings" />
      <Tabs defaultValue="shop" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="shop">Shop Details</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="stripe">Stripe</TabsTrigger>
          <TabsTrigger value="gmb">Google My Business</TabsTrigger>
        </TabsList>
        <TabsContent value="shop">
          <Card>
            <CardHeader>
              <CardTitle>Shop Details</CardTitle>
              <CardDescription>Update your barbershop's information here.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
            {isLoading ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <Skeleton className="h-10 w-32" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="shopName">Shop Name</Label>
                    <Input 
                      id="shopName" 
                      value={shopDetails.name}
                      onChange={(e) => setShopDetails({ ...shopDetails, name: e.target.value })}
                      disabled={isSaving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input 
                      id="address" 
                      value={shopDetails.address}
                      onChange={(e) => setShopDetails({ ...shopDetails, address: e.target.value })}
                      disabled={isSaving}
                    />
                  </div>
                  <Button onClick={handleSave} disabled={isSaving || isLoading}>
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
         <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize the look and feel of your dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Label>Theme</Label>
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <Button variant="outline" onClick={() => setTheme("light")}><Sun className="mr-2"/>Light</Button>
                  <Button variant="outline" onClick={() => setTheme("dark")}><Moon className="mr-2"/>Dark</Button>
                  <Button variant="outline" onClick={() => setTheme("system")}><Monitor className="mr-2"/>System</Button>
                </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="stripe">
          <Card>
            <CardHeader>
              <CardTitle>Stripe Connection</CardTitle>
              <CardDescription>Manage your Stripe integration for secure payments.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? <Skeleton className="h-10 w-48" /> : stripeConnected ? (
                 <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                    <div>
                        <p className="font-semibold text-green-800">Your Stripe account is connected.</p>
                        <p className="text-sm text-green-700">You can now accept online payments.</p>
                         <Button variant="link" asChild className="p-0 h-auto mt-1 text-green-800">
                           <a href={`https://dashboard.stripe.com/connect/accounts/${shopDetails.stripeAccountId}`} target="_blank" rel="noopener noreferrer">
                                Go to Stripe Dashboard <ExternalLink className="h-4 w-4 ml-1" />
                            </a>
                        </Button>
                    </div>
                </div>
              ) : (
                <>
                  <p>Connect your Stripe account to start accepting online payments for bookings.</p>
                  <Button onClick={handleStripeConnect} disabled={isConnecting || isLoading}>
                    {isConnecting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Connecting...</> : "Connect with Stripe"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="gmb">
          <Card>
            <CardHeader>
              <CardTitle>Google My Business</CardTitle>
              <CardDescription>Sync your business info and manage reviews.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
             {gmbConnected ? (
                <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-800">Your Google My Business account is connected.</p>
                    <p className="text-sm text-green-700">Your business information can now be synced.</p>
                  </div>
                </div>
              ) : (
                <>
                  <p>Connect your Google My Business profile to keep your online presence up-to-date automatically.</p>
                  <Button onClick={handleGmbConnect} disabled={isConnecting || isLoading}>
                    {isConnecting ? "Connecting..." : "Connect with Google"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="flex w-full h-full justify-center items-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
      <SettingsContent />
    </Suspense>
  )
}
