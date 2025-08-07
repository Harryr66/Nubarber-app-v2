
'use server';

import { google } from 'googleapis';

export async function getGmbAuthUrl(): Promise<string> {
    const { GMB_CLIENT_ID, GMB_CLIENT_SECRET, GMB_REDIRECT_URI } = process.env;

    if (!GMB_CLIENT_ID || !GMB_CLIENT_SECRET || !GMB_REDIRECT_URI) {
        throw new Error("Google My Business API credentials are not set in environment variables.");
    }
    
    const oauth2Client = new google.auth.OAuth2(
        GMB_CLIENT_ID,
        GMB_CLIENT_SECRET,
        GMB_REDIRECT_URI
    );

    const scopes = [
        'https://www.googleapis.com/auth/business.manage',
    ];

    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
    });

    return url;
}
