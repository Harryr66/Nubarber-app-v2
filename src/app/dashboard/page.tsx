
      
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NuBarberLogo } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirebase } from "@/lib/firebase"; 
import { doc, setDoc, addDoc, collection } from "firebase/firestore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const currencyMap: { [key: string]: { code: string; name: string }[] } = {
  us: [{ code: 'USD', name: 'USD - United States Dollar' }],
  eu: [{ code: 'EUR', name: 'EUR - Euro' }],
  uk: [{ code: 'GBP', name: 'GBP - British Pound' }],
};

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const defaultAvailability = daysOfWeek.map(day => ({
  day,
  isWorking: day !== "Sunday" && day !== "Saturday", 
  startTime: '09:00',
  endTime: '17:00'
}));


export default function DashboardAuthPage() {
  const router = useRouter();
  const { toast } = useToast();
  // Sign In State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Sign Up State
  const [shopName, setShopName] = useState("");
  const [locationType, setLocationType] = useState("physical");
  const [address, setAddress] = useState("");
  const [staffCount, setStaffCount] = useState("1");
  const [staffNames, setStaffNames] = useState<string[]>([""]);
  const [region, setRegion] = useState("us");
  const [currency, setCurrency] = useState("USD");
  
  const [isLoading, setIsLoading] = useState(false);
  
  // Update staff name fields when count changes
  useEffect(() => {
    const count = parseInt(staffCount, 10);
    if (isNaN(count) || count < 1) {
      setStaffNames([""]);
      return;
    }
    if (count > 20) { // Limit to 20 staff members for performance
        toast({ title: "Limit Reached", description: "You can add a maximum of 20 staff members during sign-up.", variant: "destructive" });
        setStaffCount("20");
        return;
    }
    const newStaffNames = Array.from({ length: count }, (_, i) => staffNames[i] || "");
    setStaffNames(newStaffNames);
  }, [staffCount, toast]);


  // Reset currency when region changes
  useEffect(() => {
    if (region && currencyMap[region]) {
      setCurrency(currencyMap[region][0].code);
    } else {
      setCurrency("");
    }
  }, [region]);

  const handleStaffNameChange = (index: number, name: string) => {
    const newStaffNames = [...staffNames];
    newStaffNames[index] = name;
    setStaffNames(newStaffNames);
  }

  const handleAuth = async (isSignUp: boolean) => {
    setIsLoading(true);
    const { auth, defaultDb: db } = getFirebase();

    if (!auth || !db) {
        toast({
            title: "Initialization Error",
            description: "Firebase is not configured correctly. Please check your environment variables and refresh the page.",
            variant: "destructive",
        });
        setIsLoading(false);
        return;
    }

    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    
    if (isSignUp) {
        if (!shopName || !locationType || !staffCount || !region || !currency || staffNames.some(name => name.trim() === '')) {
            toast({
                title: "Error",
                description: "Please fill out all the required fields, including all staff names.",
                variant: "destructive",
            });
            setIsLoading(false);
            return;
        }
        if (locationType === 'physical' && !address) {
            toast({
                title: "Error",
                description: "Please enter a business address for your physical location.",
                variant: "destructive",
            });
            setIsLoading(false);
            return;
        }
    }


    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Use the imported db instance directly
        await setDoc(doc(db, "shops", user.uid), {
          name: shopName,
          region: region,
          currency: currency,
          locationType: locationType,
          address: locationType === 'physical' ? address : "Mobile",
          staffCount: parseInt(staffCount, 10),
        });
        
        // Pre-install staff members
        for (const name of staffNames) {
            if (name.trim()) {
                await addDoc(collection(db, "staff"), {
                    name: name.trim(),
                    title: "Barber",
                    userId: user.uid,
                    availability: defaultAvailability,
                    avatarUrl: `https://placehold.co/40x40.png`,
                });
            }
        }


        toast({
          title: "Account Created",
          description: "Welcome! Your shop and staff have been set up.",
        });
        router.push("/dashboard/overview");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
         router.push("/dashboard/overview");
      }
     
    } catch (error: any) {
      console.error("Firebase Auth Error:", error);
      let errorMessage = "An unexpected error occurred.";
      switch (error.code) {
        case "auth/email-already-in-use":
          errorMessage = "This email is already registered. Please sign in.";
          break;
        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
          errorMessage = "Invalid credentials. Please check your email and password.";
          break;
        case "auth/weak-password":
          errorMessage = "The password is too weak. Please use at least 6 characters.";
          break;
        case "auth/invalid-api-key":
        case "auth/api-key-not-valid":
             errorMessage = "The Firebase API Key is invalid. Please check your configuration.";
             break;
        default:
          errorMessage = "An authentication error occurred. Please try again.";
          break;
      }
      toast({
        title: "Authentication Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <NuBarberLogo />
          </div>
          <CardTitle className="text-2xl font-headline">Welcome</CardTitle>
          <CardDescription>Sign in or create an account to continue</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="email-signin">Email</Label>
                  <Input
                    id="email-signin"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-signin">Password</Label>
                  <Input
                    id="password-signin"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>
              <Button onClick={() => handleAuth(false)} className="w-full mt-4" disabled={isLoading}>
                {isLoading ? "Signing In..." : "Sign In"}
              </Button>
            </TabsContent>

            <TabsContent value="signup">
               <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-signup">Email</Label>
                    <Input
                      id="email-signup"
                      type="email"
                      placeholder="m@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-signup">Password</Label>
                    <Input
                      id="password-signup"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shopName-signup">Shop Name</Label>
                    <Input
                      id="shopName-signup"
                      placeholder="e.g. The Modern Cut"
                      required
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Location Type</Label>
                    <RadioGroup value={locationType} onValueChange={setLocationType} className="flex gap-4">
                      <Label className="flex items-center gap-2 font-normal cursor-pointer">
                        <RadioGroupItem value="physical" id="physical" />
                        Physical Location
                      </Label>
                      <Label className="flex items-center gap-2 font-normal cursor-pointer">
                        <RadioGroupItem value="mobile" id="mobile" />
                        Mobile Barber
                      </Label>
                    </RadioGroup>
                  </div>
                  {locationType === 'physical' && (
                    <div className="space-y-2">
                        <Label htmlFor="address-signup">Business Address</Label>
                        <Input
                        id="address-signup"
                        placeholder="123 Main St, Anytown, USA"
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        disabled={isLoading}
                        />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="staff-count-signup">How many staff members?</Label>
                    <Input
                      id="staff-count-signup"
                      type="number"
                      min="1"
                      max="20"
                      placeholder="e.g. 5"
                      required
                      value={staffCount}
                      onChange={(e) => setStaffCount(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  
                  {parseInt(staffCount, 10) > 0 && (
                      <div className="space-y-3">
                        <Label>Staff Member Names</Label>
                        {staffNames.map((name, index) => (
                           <Input
                            key={index}
                            id={`staff-name-${index}`}
                            placeholder={`Staff Member ${index + 1}`}
                            required
                            value={name}
                            onChange={(e) => handleStaffNameChange(index, e.target.value)}
                            disabled={isLoading}
                            />
                        ))}
                      </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Business Region</Label>
                        <Select value={region} onValueChange={setRegion} required disabled={isLoading}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="us">United States</SelectItem>
                                <SelectItem value="eu">Europe</SelectItem>
                                <SelectItem value="uk">UK</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Select value={currency} onValueChange={setCurrency} required disabled={isLoading || !region}>
                          <SelectTrigger>
                              <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {region && currencyMap[region] ? (
                                currencyMap[region].map(c => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)
                            ) : null }
                          </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
               <Button onClick={() => handleAuth(true)} className="w-full mt-6" disabled={isLoading}>
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
    
