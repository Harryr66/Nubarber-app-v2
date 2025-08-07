
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Calendar, Users, Scissors } from "lucide-react";
import PageHeader from "@/components/page-header";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { startOfMonth, endOfMonth, isToday, isWithinInterval } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";


interface Booking {
    id: string;
    bookingTime: Timestamp;
    customerName: string;
    customerEmail: string;
    serviceName: string;
    staffName: string;
    status: string;
    price: number;
}

const chartData = [
  { month: "January", total: 186 },
  { month: "February", total: 305 },
  { month: "March", total: 237 },
  { month: "April", total: 73 },
  { month: "May", total: 209 },
  { month: "June", total: 214 },
]
const chartConfig = {
  total: {
    label: "Bookings",
    color: "hsl(var(--chart-1))",
  },
}

export default function OverviewPage() {
  const { user, db } = useAuth();
  const [todaysAppointments, setTodaysAppointments] = useState<Booking[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    monthlyBookings: 0,
    newClients: 0,
    mostBookedService: "N/A"
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && db) {
      const fetchBookings = async () => {
        setIsLoading(true);
        try {
          const bookingsQuery = query(collection(db, "bookings"), where("shopOwnerId", "==", user.uid));
          const querySnapshot = await getDocs(bookingsQuery);
          const allBookings = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            bookingTime: doc.data().bookingTime as Timestamp
          })) as Booking[];

          // Filter for today's appointments
          const today = new Date();
          const todays = allBookings.filter(b => isToday(b.bookingTime.toDate()));
          setTodaysAppointments(todays.sort((a, b) => a.bookingTime.toMillis() - b.bookingTime.toMillis()));
          
          // Calculate Stats
          const now = new Date();
          const monthStart = startOfMonth(now);
          const monthEnd = endOfMonth(now);
          
          const monthlyBookingsList = allBookings.filter(b => isWithinInterval(b.bookingTime.toDate(), { start: monthStart, end: monthEnd }));

          const totalRevenue = allBookings
            .filter(b => b.status === "Paid") // Only count paid bookings for revenue
            .reduce((acc, curr) => acc + curr.price, 0);

          const serviceCounts = monthlyBookingsList.reduce((acc, booking) => {
            acc[booking.serviceName] = (acc[booking.serviceName] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          const mostBookedService = Object.keys(serviceCounts).length > 0
            ? Object.keys(serviceCounts).reduce((a, b) => serviceCounts[a] > serviceCounts[b] ? a : b)
            : "N/A";

          // Calculate new clients this month
          const clientsFirstBooking = new Map<string, Date>();
          allBookings.sort((a,b) => a.bookingTime.toMillis() - b.bookingTime.toMillis()).forEach(b => {
            if(!clientsFirstBooking.has(b.customerEmail)) {
                clientsFirstBooking.set(b.customerEmail, b.bookingTime.toDate());
            }
          });

          let newClientsThisMonth = 0;
          clientsFirstBooking.forEach(firstBookingDate => {
            if(isWithinInterval(firstBookingDate, { start: monthStart, end: monthEnd })) {
                newClientsThisMonth++;
            }
          });

          setStats({
            totalRevenue,
            monthlyBookings: monthlyBookingsList.length,
            newClients: newClientsThisMonth,
            mostBookedService
          });

        } catch (error) {
          console.error("Error fetching bookings:", error);
        }
        setIsLoading(false);
      };
      fetchBookings();
    } else if (!user) {
        setIsLoading(false);
    }
  }, [user, db]);

  const StatsCardSkeleton = () => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-7 w-1/3 mb-2" />
        <Skeleton className="h-3 w-full" />
      </CardContent>
    </Card>
  )

  const AppointmentsTableSkeleton = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Time</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Service</TableHead>
          <TableHead>Staff</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...Array(3)].map((_, i) => (
           <TableRow key={i}>
            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
            <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )

  return (
    <div>
      <PageHeader title="Overview" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {isLoading ? (
          <>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">All-time revenue from paid bookings</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bookings this Month</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+{stats.monthlyBookings}</div>
                <p className="text-xs text-muted-foreground">In the current calendar month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Clients this Month</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+{stats.newClients}</div>
                <p className="text-xs text-muted-foreground">First-time customers this month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Most Booked Service</CardTitle>
                <Scissors className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold truncate">{stats.mostBookedService}</div>
                <p className="text-xs text-muted-foreground">This calendar month</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card>
           <CardHeader>
            <CardTitle>Bookings Overview</CardTitle>
            <CardDescription>A chart showing total bookings per month for the last 6 months.</CardDescription>
          </CardHeader>
          <CardContent>
             <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
              <BarChart accessibilityLayer data={chartData}>
                 <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value.slice(0, 3)}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Bar dataKey="total" fill="var(--color-total)" radius={8} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Today's Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <AppointmentsTableSkeleton /> : todaysAppointments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {todaysAppointments.map((appt) => (
                      <TableRow key={appt.id}>
                        <TableCell>{appt.bookingTime.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                        <TableCell>{appt.customerName}</TableCell>
                        <TableCell>{appt.serviceName}</TableCell>
                        <TableCell>
                          <Badge
                            variant={appt.status === 'Paid' ? 'default' : 'secondary'}
                            className={cn(
                              appt.status === 'Paid' && 'bg-green-100 text-green-800 border-green-200',
                              appt.status === 'Confirmed' && 'bg-blue-100 text-blue-800 border-blue-200'
                            )}
                          >
                            {appt.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            ) : (
                <div className="text-center py-10">
                  <p className="font-semibold">No appointments scheduled for today.</p>
                  <p className="text-muted-foreground text-sm">Your schedule for today is clear.</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
