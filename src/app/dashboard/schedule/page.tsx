
"use client"

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import PageHeader from "@/components/page-header";
import { collection, query, where, getDocs, Timestamp, addDoc, deleteDoc, doc } from "firebase/firestore";
import { isSameDay, getDay, parse, differenceInMinutes } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Booking {
  id: string;
  bookingTime: Timestamp;
  customerName: string;
  serviceName: string;
  duration: number; // Assuming services have durations
}

interface TimeOff {
    id: string;
    staffId: string;
    staffName: string;
    date: Timestamp;
    reason: string;
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
  availability?: Availability[];
}

const dayMap = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function SchedulePage() {
  const { user, db } = useAuth();
  const { toast } = useToast();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [timeOffEvents, setTimeOffEvents] = useState<TimeOff[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [bookingDensity, setBookingDensity] = useState<Record<string, number>>({});
  
  // Time Off Dialog State
  const [isTimeOffDialogOpen, setIsTimeOffDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [timeOffReason, setTimeOffReason] = useState("");

  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
      if (!user || !db) {
          setIsLoading(false);
          return;
      };
      setIsLoading(true);
      try {
        const bookingsQuery = query(collection(db, "bookings"), where("shopOwnerId", "==", user.uid));
        const timeOffQuery = query(collection(db, "timeOff"), where("shopOwnerId", "==", user.uid));
        const staffQuery = query(collection(db, "staff"), where("userId", "==", user.uid));

        const [bookingsSnapshot, timeOffSnapshot, staffSnapshot] = await Promise.all([
            getDocs(bookingsQuery),
            getDocs(timeOffQuery),
            getDocs(staffQuery)
        ]);

        const bookings = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
        setAllBookings(bookings.sort((a, b) => a.bookingTime.toMillis() - b.bookingTime.toMillis()));

        const timeOffs = timeOffSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TimeOff));
        setTimeOffEvents(timeOffs);
        
        const staffList = staffSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StaffMember));
        setStaff(staffList);

      } catch (error) {
        console.error("Error fetching schedule data:", error);
      }
      setIsLoading(false);
  };

  useEffect(() => {
    if (user && db) {
      fetchData();
    } else if (!user) {
        setIsLoading(false);
    }
  }, [user, db]);

  // Calculate booking density when data is available
  useEffect(() => {
    if (isLoading || staff.length === 0) return;

    const density: Record<string, number> = {};
    const dailyBookings: Record<string, number> = {};
    allBookings.forEach(booking => {
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

  }, [allBookings, staff, isLoading]);


  const handleBookTimeOff = async () => {
    if (!user || !selectedStaff || !date || !db) {
        toast({ title: "Error", description: "Please select a staff member and date.", variant: "destructive" });
        return;
    }
    try {
        const staffMember = staff.find(s => s.id === selectedStaff);
        await addDoc(collection(db, "timeOff"), {
            shopOwnerId: user.uid,
            staffId: selectedStaff,
            staffName: staffMember?.name || "Unknown Staff",
            date: Timestamp.fromDate(date),
            reason: timeOffReason || "Personal Time Off",
        });
        toast({ title: "Success", description: "Time off has been booked." });
        fetchData(); // Refetch data
        setIsTimeOffDialogOpen(false);
        setSelectedStaff("");
        setTimeOffReason("");
    } catch (error) {
        console.error("Error booking time off:", error);
        toast({ title: "Error", description: "Could not book time off.", variant: "destructive"});
    }
  }

  const handleDeleteTimeOff = async (id: string) => {
    if (!user || !db) return;
    try {
        await deleteDoc(doc(db, "timeOff", id));
        toast({ title: "Success", description: "Time off entry has been removed." });
        fetchData();
    } catch(error) {
         console.error("Error deleting time off:", error);
        toast({ title: "Error", description: "Could not delete time off entry.", variant: "destructive"});
    }
  }

  const selectedDayBookings = date 
    ? allBookings.filter(booking => isSameDay(booking.bookingTime.toDate(), date))
    : [];
  
  const selectedDayTimeOffs = date
    ? timeOffEvents.filter(event => isSameDay(event.date.toDate(), date))
    : [];
    
  const AppointmentListSkeleton = () => (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="p-3 bg-muted rounded-lg">
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  )

  const getDayClassName = (day: Date) => {
    const dayKey = day.toISOString().split('T')[0];
    const density = bookingDensity[dayKey];
    if (density === undefined) return "";
    if (density >= 75) return "heatmap-red";
    if (density >= 40) return "heatmap-amber";
    if (density > 0) return "heatmap-green";
    return "";
  };

  return (
    <div>
      <PageHeader title="Schedule" actionButton={
        <Dialog open={isTimeOffDialogOpen} onOpenChange={setIsTimeOffDialogOpen}>
            <DialogTrigger asChild>
                <Button><PlusCircle className="mr-2"/>Book Time Off</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Book Time Off</DialogTitle>
                    <DialogDescription>Select a staff member and date to block off their schedule.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Staff Member</Label>
                        <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a staff member" />
                            </SelectTrigger>
                            <SelectContent>
                                {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label>Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left font-normal">
                                    {date ? date.toLocaleDateString() : "Pick a date"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label>Reason (Optional)</Label>
                        <Input value={timeOffReason} onChange={(e) => setTimeOffReason(e.target.value)} placeholder="e.g., Vacation"/>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsTimeOffDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleBookTimeOff}>Confirm Time Off</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      } />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
               <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="p-0"
                classNames={{
                  root: 'w-full',
                  months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 p-4',
                  month: 'space-y-4 w-full',
                  table: 'w-full border-collapse space-y-1',
                  head_row: "flex justify-around",
                  row: 'flex w-full mt-2 justify-around',
                  day: cn(
                    "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-md"
                  ),
                }}
                modifiers={{
                    booked: Object.keys(bookingDensity).map(key => new Date(key + 'T12:00:00')) // Use a neutral time
                }}
                modifiersClassNames={{
                  booked: getDayClassName(date || new Date()),
                }}
                components={{
                    Day: ({ date, displayMonth }) => {
                        const dayClassName = getDayClassName(date);
                        const isSelected = isSameDay(date, date || new Date());
                        const isOutside = date.getMonth() !== displayMonth.getMonth();
                        return (
                            <div className={cn("h-9 w-9 p-0 relative", dayClassName, isOutside && "text-muted-foreground opacity-50")}>
                                <button
                                    onClick={() => setDate(date)}
                                    className={cn("w-full h-full flex items-center justify-center rounded-md", isSelected && "bg-primary text-primary-foreground")}
                                >
                                    {date.getDate()}
                                </button>
                            </div>
                        );
                    }
                }}
                disabled={isLoading}
              />
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>
                Schedule for {date ? date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '...'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <AppointmentListSkeleton />
              ) : selectedDayBookings.length > 0 || selectedDayTimeOffs.length > 0 ? (
                <ul className="space-y-4">
                  {selectedDayBookings.map((appt) => (
                    <li key={appt.id} className="p-3 bg-muted rounded-lg">
                      <p className="font-semibold">
                        {appt.bookingTime.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {appt.customerName}
                      </p>
                      <p className="text-sm text-muted-foreground">{appt.serviceName}</p>
                    </li>
                  ))}
                  {selectedDayTimeOffs.map((event) => (
                    <li key={event.id} className="p-3 bg-red-50 border border-red-200 rounded-lg flex justify-between items-center">
                      <div>
                          <p className="font-semibold text-red-800">
                            Time Off - {event.staffName}
                          </p>
                          <p className="text-sm text-red-700">{event.reason}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="text-red-600 hover:bg-red-100 hover:text-red-700" onClick={() => handleDeleteTimeOff(event.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-center py-10">No appointments or time off for this day.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
