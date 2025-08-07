
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { collection, getDocs, query, where, doc, getDoc, Timestamp, addDoc, deleteDoc } from "firebase/firestore";
import { getUserDb } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Loader2 } from "lucide-react";
import { createCheckoutSession } from "@/lib/payments";
import { getDay, parse, format, addMinutes, isSameDay, differenceInMinutes } from 'date-fns';
import { cn } from "@/lib/utils";
import { sendBookingConfirmationEmail } from "@/lib/email";


// --- Data Types ---
interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
  userId: string;
}

interface Availability {
    day: string;
    isWorking: boolean;
    startTime: string;
    endTime: string;
}

interface StaffMember {
  id: string;
  name: string;
  title: string;
  avatarUrl?: string;
  userId: string;
  availability?: Availability[];
}

interface TimeOff {
    staffId: string;
    date: Timestamp;
}

interface BookingRecord {
    id: string;
    bookingTime: Timestamp;
}

interface ShopDetails {
    name: string;
    address: string;
    headline?: string;
    description?: string;
    stripeConnected?: boolean;
}

const dayMap = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function BarberBookingPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const username = params.username as string;

  // --- State Management ---
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [timeOff, setTimeOff] = useState<TimeOff[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [bookingDensity, setBookingDensity] = useState<Record<string, number>>({});
  const [shopDetails, setShopDetails] = useState<ShopDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  
  const [booking, setBooking] = useState({
    service: null as Service | null,
    staff: null as StaffMember | null,
    date: new Date(),
    time: "",
    customerName: "",
    customerEmail: "",
  });

  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [isClient, setIsClient] = useState(false);


  // --- Data Fetching ---
  useEffect(() => {
    setIsClient(true);
    if (!username) return;

    const fetchShopData = async () => {
      setIsLoading(true);
      try {
        const userId = username;
        const db = await getUserDb();
        
        // Fetch Shop Details, Services, Staff, Time Off, and Bookings concurrently
        const shopDocRef = doc(db, "shops", userId);
        const servicesQuery = query(collection(db, "services"), where("userId", "==", userId));
        const staffQuery = query(collection(db, "staff"), where("userId", "==", userId));
        const timeOffQuery = query(collection(db, "timeOff"), where("shopOwnerId", "==", userId));
        const bookingsQuery = query(collection(db, "bookings"), where("shopOwnerId", "==", userId));


        const [shopDoc, servicesSnapshot, staffSnapshot, timeOffSnapshot, bookingsSnapshot] = await Promise.all([
            getDoc(shopDocRef),
            getDocs(servicesQuery),
            getDocs(staffQuery),
            getDocs(timeOffQuery),
            getDocs(bookingsQuery),
        ]);

        if (shopDoc.exists()) {
            setShopDetails(shopDoc.data() as ShopDetails);
        }

        const servicesList = servicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
        const staffList = staffSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StaffMember));
        const timeOffList = timeOffSnapshot.docs.map(doc => doc.data() as TimeOff);
        const bookingsList = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BookingRecord));

        setServices(servicesList);
        setStaff(staffList);
        setTimeOff(timeOffList);
        setBookings(bookingsList);

      } catch (error) {
        console.error("Error fetching shop data:", error);
        toast({ title: "Error", description: "Could not load shop details.", variant: "destructive" });
      }
      setIsLoading(false);
    };

    fetchShopData();
  }, [username, toast]);

    // --- Heatmap Density Calculation ---
    useEffect(() => {
        if (isLoading || staff.length === 0) return;

        const density: Record<string, number> = {};
        const dailyBookings: Record<string, number> = {};
        bookings.forEach(booking => {
            const dayKey = booking.bookingTime.toDate().toISOString().split('T')[0];
            dailyBookings[dayKey] = (dailyBookings[dayKey] || 0) + 1;
        });

        // Calculate density for each day in dailyBookings
        for (const dayKey in dailyBookings) {
            const day = new Date(dayKey);
            const dayName = dayMap[getDay(day)];
            let totalSlots = 0;

            staff.forEach(staffMember => {
                const availability = staffMember.availability?.find(a => a.day === dayName);
                if (availability && availability.isWorking) {
                    const start = parse(availability.startTime, 'HH:mm', day);
                    const end = parse(availability.endTime, 'HH:mm', day);
                    const totalMinutes = differenceInMinutes(end, start);
                    // Assuming an average appointment slot of 30 minutes for density calculation
                    totalSlots += Math.floor(totalMinutes / 30);
                }
            });

            if (totalSlots > 0) {
                density[dayKey] = (dailyBookings[dayKey] / totalSlots) * 100;
            } else {
                density[dayKey] = 0;
            }
        }
        setBookingDensity(density);

    }, [bookings, staff, isLoading]);


  // --- Time Slot Generation ---
  useEffect(() => {
    if (!booking.staff || !booking.date || !booking.service) {
      setAvailableTimes([]);
      return;
    }
    
    // Check if the selected date is a day off for the staff member
    const isDayOff = timeOff.some(
        off => off.staffId === booking.staff!.id && isSameDay(off.date.toDate(), booking.date)
    );

    if (isDayOff) {
        setAvailableTimes([]);
        return;
    }

    // Get the availability for the selected day of the week
    const dayName = dayMap[getDay(booking.date)];
    const dayAvailability = booking.staff.availability?.find(a => a.day === dayName);

    if (!dayAvailability || !dayAvailability.isWorking) {
        setAvailableTimes([]);
        return;
    }

    const serviceDuration = booking.service.duration;
    const { startTime, endTime } = dayAvailability;
    
    const start = parse(startTime, 'HH:mm', booking.date);
    const end = parse(endTime, 'HH:mm', booking.date);
    
    let currentTime = start;
    const slots: string[] = [];

    while (addMinutes(currentTime, serviceDuration) <= end) {
        slots.push(format(currentTime, 'HH:mm'));
        currentTime = addMinutes(currentTime, 30); // Assuming booking slots are every 30 mins
    }
    
    setAvailableTimes(slots);
    
    // Reset time if the current selection is no longer valid
    if (booking.time && !slots.includes(booking.time)) {
        setBooking(b => ({...b, time: ""}));
    }

  }, [booking.staff, booking.date, booking.service, timeOff]);


  // --- Event Handlers ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBookingReady) {
        toast({title: "Incomplete Form", description: "Please fill all fields to book.", variant: "destructive"});
        return;
    }
    
    setIsBooking(true);
    const db = await getUserDb();

    const bookingDateTime = new Date(booking.date);
    const [hours, minutes] = booking.time.split(':').map(Number);
    bookingDateTime.setHours(hours, minutes, 0, 0);

    const bookingData = {
        shopOwnerId: username,
        serviceId: booking.service!.id,
        serviceName: booking.service!.name,
        staffId: booking.staff!.id,
        staffName: booking.staff!.name,
        bookingTime: Timestamp.fromDate(bookingDateTime),
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        price: booking.service!.price,
        status: 'pending', // Default status
    };
    
    const requiresPayment = !!shopDetails?.stripeConnected;
    let bookingRef;

    try {
        // Create a booking record first for all booking types
        bookingRef = await addDoc(collection(db, "bookings"), bookingData);
        
        if (requiresPayment) {
             const { url, error } = await createCheckoutSession({
                bookingId: bookingRef.id,
                shopOwnerId: username,
                serviceName: booking.service!.name,
                staffName: booking.staff!.name,
                customerEmail: booking.customerEmail,
                price: booking.service!.price,
            });

            if (error || !url) {
                throw new Error(error || "Failed to create checkout session");
            }
            router.push(url);

        } else {
            // If no payment, confirm booking directly and redirect
            await sendBookingConfirmationEmail({
                customerName: booking.customerName,
                customerEmail: booking.customerEmail,
                bookingTime: bookingDateTime,
                serviceName: booking.service!.name,
                staffName: booking.staff!.name
            });
            const bookingId = bookingRef.id;
            router.push(`/barbers/${username}/thank-you?booking_id=${bookingId}&status=confirmed`);
        }

    } catch(error) {
        console.error("Error creating booking:", error);
        toast({title: "Booking Failed", description: "Something went wrong. Please try again.", variant: "destructive"});
        // If any step fails, delete the pending booking to avoid orphans
        if (bookingRef) {
            await deleteDoc(doc(db, 'bookings', bookingRef.id));
        }
    } finally {
        setIsBooking(false);
    }
  };

  const getDayClassName = (day: Date) => {
    const dayKey = day.toISOString().split('T')[0];
    const density = bookingDensity[dayKey];
    if (density === undefined) return "";
    if (density >= 75) return "heatmap-red";
    if (density >= 40) return "heatmap-amber";
    if (density > 0) return "heatmap-green";
    return "";
  };


  const isBookingReady = booking.service && booking.staff && booking.date && booking.time && booking.customerName && booking.customerEmail;

  // --- Components ---
  const BookingSummary = () => (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle>Booking Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium">Service</p>
          <p className="text-muted-foreground">{booking.service?.name || 'Not selected'}</p>
        </div>
        <div>
          <p className="text-sm font-medium">Staff</p>
          <p className="text-muted-foreground">{booking.staff?.name || 'Not selected'}</p>
        </div>
        <div>
          <p className="text-sm font-medium">Date & Time</p>
          <p className="text-muted-foreground">
            {isClient && booking.date ? booking.date.toLocaleDateString() : ''} {booking.time ? `at ${booking.time}` : ''}
          </p>
        </div>
        <Separator />
        <div className="flex justify-between font-bold text-lg">
          <p>Total</p>
          <p>${booking.service?.price?.toFixed(2) || '0.00'}</p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-12 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Column */}
          <div className="lg:col-span-1">
            <div className="flex flex-col gap-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src="https://placehold.co/100x100.png" data-ai-hint="shop logo" />
                      <AvatarFallback>{shopDetails?.name?.charAt(0) || "B"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="text-xl font-bold">{shopDetails?.name || "Loading..."}</h2>
                      <p className="text-muted-foreground">{shopDetails?.address || ""}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <BookingSummary />
            </div>
          </div>
          
          {/* Right Column */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-headline">{shopDetails?.headline || "Book Your Appointment"}</CardTitle>
                <CardDescription>{shopDetails?.description || "Select a service, staff, and time that works for you."}</CardDescription>

              </CardHeader>
              <CardContent>
                 {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                       <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                 ) : (
                    <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Service Selection */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">1. Select a Service</h3>
                        <RadioGroup onValueChange={(value) => setBooking({ ...booking, service: services.find(s => s.id === value) || null })}>
                            {services.map((service) => (
                            <Label key={service.id} htmlFor={`service-${service.id}`} className="flex items-center justify-between p-4 border rounded-md cursor-pointer hover:bg-muted has-[input:checked]:bg-muted has-[input:checked]:border-primary">
                                <div>
                                <p className="font-medium">{service.name}</p>
                                <p className="text-sm text-muted-foreground">{service.duration} min</p>
                                </div>
                                <div className="flex items-center gap-4">
                                <p className="font-semibold">${service.price.toFixed(2)}</p>
                                <RadioGroupItem value={service.id} id={`service-${service.id}`} />
                                </div>
                            </Label>
                            ))}
                        </RadioGroup>
                    </div>

                    <Separator/>

                    {/* Staff Selection */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">2. Select a Staff Member</h3>
                        <RadioGroup onValueChange={(value) => setBooking({ ...booking, staff: staff.find(s => s.id === value) || null })}>
                            {staff.map((staffMember) => (
                            <Label key={staffMember.id} htmlFor={`staff-${staffMember.id}`} className="flex items-center justify-between p-4 border rounded-md cursor-pointer hover:bg-muted has-[input:checked]:bg-muted has-[input:checked]:border-primary">
                            <p className="font-medium">{staffMember.name}</p>
                            <RadioGroupItem value={staffMember.id} id={`staff-${staffMember.id}`} />
                            </Label>
                            ))}
                        </RadioGroup>
                    </div>

                    <Separator/>

                    {/* Date & Time Selection */}
                    <fieldset className="space-y-4" disabled={!booking.service || !booking.staff}>
                        <h3 className="text-lg font-semibold">3. Select Date & Time</h3>
                        <div className="flex flex-col md:flex-row gap-8">
                        <Calendar
                            mode="single"
                            selected={booking.date}
                            onSelect={(date) => setBooking({ ...booking, date: date || new Date() })}
                            className="rounded-md border mx-auto"
                            disabled={(date) => date < new Date(new Date().toDateString())}
                            modifiers={{
                                booked: Object.keys(bookingDensity).map(key => new Date(key + 'T12:00:00'))
                            }}
                            modifiersClassNames={{
                                booked: getDayClassName(new Date()),
                            }}
                            components={{
                                Day: ({ date: dayDate, displayMonth }) => {
                                    const dayClassName = getDayClassName(dayDate);
                                    const isSelected = isClient && booking.date ? isSameDay(dayDate, booking.date) : false;
                                    const isOutside = dayDate.getMonth() !== displayMonth.getMonth();
                                    return (
                                        <div className={cn("h-9 w-9 p-0 relative", dayClassName, isOutside && "text-muted-foreground opacity-50")}>
                                            <button
                                                type="button"
                                                onClick={() => setBooking({ ...booking, date: dayDate })}
                                                className={cn("w-full h-full flex items-center justify-center rounded-md", isSelected && "bg-primary text-primary-foreground")}
                                            >
                                                {dayDate.getDate()}
                                            </button>
                                        </div>
                                    );
                                }
                            }}
                            />
                        <div className="flex-1">
                            <div className="grid grid-cols-3 gap-2">
                            {availableTimes.length > 0 ? availableTimes.map(time => (
                                <Button key={time} type="button" variant={booking.time === time ? "default" : "outline"} onClick={() => setBooking({...booking, time})}>{time}</Button>
                            )) : (
                                <p className="col-span-3 text-muted-foreground text-center py-4">
                                    {!booking.staff ? "Select a staff member to see availability." : "No available times for this day."}
                                </p>
                            )}
                            </div>
                        </div>
                        </div>
                    </fieldset>

                    <Separator/>

                    {/* Customer Details */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">4. Your Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input id="name" value={booking.customerName} onChange={(e) => setBooking({...booking, customerName: e.target.value})} required />
                            </div>
                            <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" value={booking.customerEmail} onChange={(e) => setBooking({...booking, customerEmail: e.target.value})} required />
                            </div>
                        </div>
                    </div>
                    
                    <Button type="submit" className="w-full text-lg py-6" disabled={!isBookingReady || isBooking}>
                        {isBooking ? (
                           <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Booking...
                           </>
                        ) : (shopDetails?.stripeConnected ? (
                            <>
                                <CreditCard className="mr-2" />
                                Pay & Confirm Booking
                            </>
                        ) : "Confirm Booking")}
                    </Button>
                    </form>
                 )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
