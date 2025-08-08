
'use server';

import Stripe from "stripe";
import { headers } from "next/headers";
import { getFirebase } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

interface BookingData {
    bookingId: string;
    shopOwnerId: string;
    serviceName: string;
    staffName: string;
    customerEmail: string;
    price: number;
}


export async function createCheckoutSession(bookingData: BookingData) {
    const headersList = headers();
    const origin = headersList.get('origin') || 'http://localhost:9002';
    const { defaultDb } = getFirebase();
    
    try {
        const shopDoc = await getDoc(doc(defaultDb, 'shops', bookingData.shopOwnerId));
        const shopData = shopDoc.data();

        if (!shopData?.stripeAccountId || !shopData?.stripeConnected) {
            throw new Error('The shop has not connected their Stripe account or the connection is not active.');
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'usd', // This should be dynamic based on shop settings in a real app
                    product_data: {
                        name: bookingData.serviceName,
                        description: `Appointment with ${bookingData.staffName}`,
                    },
                    unit_amount: bookingData.price * 100,
                },
                quantity: 1,
            }],
            customer_email: bookingData.customerEmail,
            mode: 'payment',
            success_url: `${origin}/barbers/${bookingData.shopOwnerId}/thank-you?session_id={CHECKOUT_SESSION_ID}&booking_id=${bookingData.bookingId}`,
            cancel_url: `${origin}/barbers/${bookingData.shopOwnerId}`,
            metadata: {
                bookingId: bookingData.bookingId,
                shopOwnerId: bookingData.shopOwnerId,
            },
            payment_intent_data: {
                application_fee_amount: Math.round(bookingData.price * 100 * 0.1), // 10% platform fee in cents
                transfer_data: {
                    destination: shopData.stripeAccountId,
                },
            },
        });

        return { url: session.url, error: null };

    } catch(error) {
        console.error("Stripe session creation failed:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { url: null, error: `Could not create Stripe checkout session: ${errorMessage}` };
    }
}


export async function createStripeConnectAccount(userId: string): Promise<{ url: string | null; error: string | null }> {
    if (!userId) return { url: null, error: "User not authenticated." };
    const { defaultDb } = getFirebase();
    const headersList = headers();
    const origin = headersList.get('origin') || 'http://localhost:9002';

    try {
        const account = await stripe.accounts.create({
            type: 'express',
            country: 'US', // This should be dynamic based on shop settings
            capabilities: {
                card_payments: { requested: true },
                transfers: { requested: true },
            },
        });

        const shopDocRef = doc(defaultDb, "shops", userId);
        await setDoc(shopDocRef, { stripeAccountId: account.id }, { merge: true });

        const accountLink = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: `${origin}/dashboard/settings`,
            return_url: `${origin}/dashboard/settings?stripe_connected=true`,
            type: 'account_onboarding',
        });

        return { url: accountLink.url, error: null };
    } catch (error) {
        console.error("Stripe Connect error:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { url: null, error: `Failed to create Stripe Connect account: ${errorMessage}` };
    }
}
