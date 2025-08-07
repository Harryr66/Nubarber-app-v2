
"use client";

import Link from 'next/link';
import { useEffect, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getUserDb } from '@/lib/firebase';
import { sendBookingConfirmationEmail } from '@/lib/email';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Loader2 } from 'lucide-react';

function ThankYouContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const sessionId = searchParams.get('session_id');
  const bookingId = searchParams.get('booking_id');
  const status = searchParams.get('status');
  
  const confirmBooking = useCallback(async (bookingId: string) => {
    try {
      const db = await getUserDb();
      const bookingRef = doc(db, 'bookings', bookingId);
      const bookingDoc = await getDoc(bookingRef);

      if (bookingDoc.exists() && bookingDoc.data().status === 'pending') {
        // Update status to confirm the booking.
        await updateDoc(bookingRef, { status: 'Paid' });

        const bookingData = bookingDoc.data();
        await sendBookingConfirmationEmail({
            customerName: bookingData.customerName,
            customerEmail: bookingData.customerEmail,
            bookingTime: bookingData.bookingTime.toDate(),
            serviceName: bookingData.serviceName,
            staffName: bookingData.staffName,
        });
        toast({ title: "Success", description: "Your payment was successful and your booking is confirmed." });
      }
    } catch (error) {
      console.error("Failed to confirm booking:", error);
      toast({ title: "Error", description: "There was an issue confirming your booking. Please contact support.", variant: "destructive" });
    }
  }, [toast]);
  
  useEffect(() => {
    // If redirected from Stripe with a session_id, confirm the booking.
    if (sessionId && bookingId) {
        confirmBooking(bookingId);
    }
    // If it's a direct booking (no payment), the status is already 'confirmed'.
    // We can just show the success message.
    if (status === 'confirmed') {
         toast({ title: "Success", description: "Your booking is confirmed." });
    }

  }, [sessionId, bookingId, status, confirmBooking, toast]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md mx-auto text-center">
        <CardHeader>
          <div className="mx-auto w-fit bg-green-100 p-4 rounded-full">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-headline mt-4">Booking Confirmed!</CardTitle>
          <CardDescription>
            Thank you for your booking. A confirmation email has been sent to your address.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6">We look forward to seeing you soon!</p>
          <Button asChild>
            <Link href="/">Back to Home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ThankYouLoading() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">Confirming your booking...</p>
            </div>
        </div>
    )
}

export default function ThankYouPage() {
    return (
        <Suspense fallback={<ThankYouLoading />}>
            <ThankYouContent />
        </Suspense>
    )
}
