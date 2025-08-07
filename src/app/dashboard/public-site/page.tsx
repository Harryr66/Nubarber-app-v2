
"use client";

import { useState, useEffect } from 'react';
import PageHeader from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { Copy, Eye } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

export default function PublicSitePage() {
  const { user, db: defaultDb } = useAuth(); // 'shops' is in the default db
  const { toast } = useToast();
  const [siteSettings, setSiteSettings] = useState({
    headline: "Book your next appointment with us",
    description: "Easy and fast booking, available 24/7."
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [publicUrl, setPublicUrl] = useState("");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    // Ensure window is defined (runs only on client)
    if (typeof window !== 'undefined') {
        setOrigin(window.location.origin);
    }

    const fetchSiteSettings = async () => {
      if (!user || !defaultDb) {
          setIsLoading(false);
          return;
      };

      setIsLoading(true);
      setPublicUrl(`/barbers/${user.uid}`);
      try {
        const shopDocRef = doc(defaultDb, "shops", user.uid);
        const shopDoc = await getDoc(shopDocRef);
        if (shopDoc.exists()) {
          const data = shopDoc.data();
          setSiteSettings({
            headline: data.headline || "Book your next appointment with us",
            description: data.description || "Easy and fast booking, available 24/7."
          });
        }
      } catch (error) {
        console.error("Error fetching site settings:", error);
        toast({ title: "Error", description: "Could not load site settings.", variant: "destructive" });
      }
      setIsLoading(false);
    };

    if (user) {
      fetchSiteSettings();
    } else {
        setIsLoading(false);
    }
  }, [user, defaultDb, toast]);

  const handleSave = async () => {
    if (!user || !defaultDb) {
      toast({ title: "Not Authenticated", description: "You must be logged in to save settings.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const shopDocRef = doc(defaultDb, "shops", user.uid);
      await setDoc(shopDocRef, { 
        headline: siteSettings.headline,
        description: siteSettings.description,
      }, { merge: true });

      toast({
        title: "Success!",
        description: "Your public site has been updated.",
      });
    } catch (error) {
       console.error("Error saving site settings:", error);
       toast({ title: "Error", description: "Could not save your settings.", variant: "destructive" });
    }
    setIsSaving(false);
  };

  return (
    <div>
      <PageHeader title="Public Site" actionButton={<Button onClick={handleSave} disabled={isSaving || isLoading}>{isSaving ? "Saving..." : "Save Changes"}</Button>} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Customize Your Booking Page</CardTitle>
              <CardDescription>
                This is what your clients will see when they visit your booking page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoading ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="headline">Headline</Label>
                    <Input 
                      id="headline" 
                      value={siteSettings.headline}
                      onChange={(e) => setSiteSettings({...siteSettings, headline: e.target.value})}
                      disabled={isSaving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea 
                      id="description"
                      value={siteSettings.description}
                      onChange={(e) => setSiteSettings({...siteSettings, description: e.target.value})}
                      disabled={isSaving}
                      rows={3}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1">
           <Card>
            <CardHeader>
              <CardTitle>Your Booking URL</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-10 w-full" />
                   <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-2">Share this link with your clients:</p>
                  <div className="flex items-center space-x-2">
                    <Input readOnly value={`${origin}${publicUrl}`} />
                    <Button variant="secondary" onClick={() => {
                      navigator.clipboard.writeText(`${origin}${publicUrl}`);
                      toast({title: "Copied to clipboard"});
                    }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button asChild className="w-full mt-4">
                      <Link href={publicUrl} target="_blank">
                        <Eye className="h-4 w-4 mr-2" />
                        Preview Website
                      </Link>
                    </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
