
'use server';

import { Resend } from 'resend';
import { BookingConfirmationEmail } from '@/components/emails/booking-confirmation';

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailDetails {
    customerName: string;
    customerEmail: string;
    bookingTime: Date;
    serviceName: string;
    staffName: string;
}

export async function sendBookingConfirmationEmail(details: EmailDetails) {
    const { customerName, customerEmail, bookingTime, serviceName, staffName } = details;

    try {
        const { data, error } = await resend.emails.send({
            from: 'NuBarber <noreply@nubarber.com>',
            to: [customerEmail],
            subject: 'Your Booking is Confirmed!',
            react: BookingConfirmationEmail({
                customerName,
                bookingTime,
                serviceName,
                staffName,
            })
        });

        if (error) {
            console.error("Resend error:", error);
            // We don't throw an error here to not fail the whole booking process if email fails
            return;
        }

        console.log("Confirmation email sent successfully:", data);
    } catch (error) {
        console.error('Failed to send confirmation email:', error);
    }
}
