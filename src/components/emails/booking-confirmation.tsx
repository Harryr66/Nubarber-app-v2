
import * as React from 'react';

interface EmailTemplateProps {
  customerName: string;
  bookingTime: Date;
  serviceName: string;
  staffName: string;
}

export const BookingConfirmationEmail: React.FC<Readonly<EmailTemplateProps>> = ({
  customerName,
  bookingTime,
  serviceName,
  staffName,
}) => (
  <div style={{ fontFamily: 'sans-serif', padding: '20px', color: '#333' }}>
    <h1 style={{ color: '#2E5266' }}>Your Booking is Confirmed!</h1>
    <p>Hi {customerName},</p>
    <p>
      Thank you for booking with us. Here are your appointment details:
    </p>
    <div style={{ border: '1px solid #D4DADE', padding: '15px', borderRadius: '5px', backgroundColor: '#f9fafa' }}>
      <p><strong>Service:</strong> {serviceName}</p>
      <p><strong>With:</strong> {staffName}</p>
      <p><strong>Date & Time:</strong> {new Date(bookingTime).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}</p>
    </div>
    <p>
      We look forward to seeing you!
    </p>
    <p style={{ marginTop: '30px', fontSize: '12px', color: '#999' }}>
      - The NuBarber Team
    </p>
  </div>
);
