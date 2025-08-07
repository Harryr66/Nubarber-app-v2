
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import PageHeader from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Booking {
  id: string;
  customerName: string;
  customerEmail: string;
  bookingTime: Timestamp;
}

interface Client {
  email: string;
  name: string;
  appointmentCount: number;
  lastAppointment: Date;
}

export default function ClientsPage() {
  const { user, db } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && db) {
      const fetchClients = async () => {
        setIsLoading(true);
        try {
          const bookingsQuery = query(collection(db, "bookings"), where("shopOwnerId", "==", user.uid));
          const querySnapshot = await getDocs(bookingsQuery);
          const allBookings = querySnapshot.docs.map(doc => doc.data() as Booking);

          const clientData = new Map<string, { name: string, appointments: Date[] }>();

          allBookings.forEach(booking => {
            if (!clientData.has(booking.customerEmail)) {
              clientData.set(booking.customerEmail, { name: booking.customerName, appointments: [] });
            }
            clientData.get(booking.customerEmail)!.appointments.push(booking.bookingTime.toDate());
          });

          const processedClients: Client[] = Array.from(clientData.entries()).map(([email, data]) => ({
            email,
            name: data.name,
            appointmentCount: data.appointments.length,
            lastAppointment: new Date(Math.max(...data.appointments.map(d => d.getTime()))),
          })).sort((a,b) => b.lastAppointment.getTime() - a.lastAppointment.getTime());

          setClients(processedClients);

        } catch (error) {
          console.error("Error fetching clients:", error);
        }
        setIsLoading(false);
      };
      fetchClients();
    } else if (!user) {
        setIsLoading(false);
    }
  }, [user, db]);

  const TableSkeleton = () => (
     <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Client</TableHead>
          <TableHead>Appointments</TableHead>
          <TableHead>Last Visit</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...Array(5)].map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1">
                   <Skeleton className="h-4 w-24" />
                   <Skeleton className="h-3 w-32" />
                </div>
              </div>
            </TableCell>
            <TableCell><Skeleton className="h-5 w-12" /></TableCell>
            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div>
      <PageHeader title="Clients" />
      <Card>
        <CardHeader>
          <CardTitle>Your Client List</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <TableSkeleton /> : clients.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-center">Appointments</TableHead>
                  <TableHead>Last Visit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.email}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                           <Avatar>
                              <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
                           </Avatar>
                           <div>
                              <div className="font-medium">{client.name}</div>
                              <div className="text-sm text-muted-foreground">{client.email}</div>
                           </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{client.appointmentCount}</TableCell>
                      <TableCell>{client.lastAppointment.toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          ) : (
             <div className="text-center py-10">
                <p className="font-semibold">No clients yet.</p>
                <p className="text-muted-foreground text-sm">Your clients will appear here after they book an appointment.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
