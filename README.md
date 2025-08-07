# NuBarber - All-in-One Barbershop Platform

This is a Next.js application built with Firebase, Stripe, and ShadCN UI. It provides a complete solution for barbershops to manage their business online, including a public booking site and a private admin dashboard.

## Getting Started Locally

To run this project on your local machine, follow these steps. This is the recommended approach to avoid potential environment issues with cloud-based IDEs.

### Prerequisites

*   **Node.js**: Make sure you have Node.js (version 18 or later) installed. You can download it from [nodejs.org](https://nodejs.org/).
*   **Firebase Project**: You must have a Firebase project. If you don't have one, create one at the [Firebase Console](https://console.firebase.google.com/).
*   **npm**: This project uses `npm` as the package manager, which comes with Node.js.

### 1. Download and Unzip the Code

First, download the project code as a `.zip` file and unzip it on your computer.

### 2. Set Up Environment Variables

This project uses a `.env.local` file to manage all secret keys and credentials.

1.  In the root of the project folder, you will find a file named `.env.local`.
2.  You need to populate this file with your credentials from various services. Follow the instructions below for each service.

---

#### **Finding Your Credentials**

##### **Firebase (`NEXT_PUBLIC_FIREBASE_*`)**
These keys connect your app to your Firebase project.

1.  **Open Firebase Console**: Go to [https://console.firebase.google.com/](https://console.firebase.google.com/) and select your project.
2.  **Project Settings**: Click the **gear icon (⚙️)** and select **Project settings**.
3.  **Find Your Web App**: Under the "General" tab, scroll to the "Your apps" section.
4.  **Copy Config**: In your web app's card, find the **Firebase SDK snippet** and select the **Config** option. You'll see an object like `const firebaseConfig = { ... }`.
5.  **Paste into `.env.local`**: Copy the values from that object into the corresponding `NEXT_PUBLIC_FIREBASE_*` fields in your `.env.local` file.

##### **Resend (`RESEND_API_KEY`)**
This key allows your app to send emails.

1.  **Log in to Resend**: Go to [https://resend.com/login](https://resend.com/login).
2.  **API Keys**: In the left menu, click **API Keys**.
3.  **Create API Key**: Click **+ Create API Key**. Give it a name (e.g., "NuBarber Project") and set permissions to **Full access**.
4.  **Copy Key**: Copy the new API key immediately and paste it into the `RESEND_API_KEY` field in `.env.local`.

##### **Google My Business (`GMB_*`)**
These keys allow your app to connect to the Google My Business API.

1.  **Google Cloud Console**: Go to [https://console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials). Ensure the correct project is selected.
2.  **Create Credentials**: Click **+ CREATE CREDENTIALS** > **OAuth client ID**.
3.  **Configure Consent Screen**: If prompted, configure the OAuth consent screen. Add your email to the "Test users" section for now.
4.  **Set Application Type**: Choose **Web application**.
5.  **Add Redirect URI**: Under **Authorized redirect URIs**, click **+ ADD URI**.
    *   For local development, enter `http://localhost:9002/api/auth/gmb/callback`.
    *   For production, you will need to add your live site's callback URL.
    *   Paste this URI into the `GMB_REDIRECT_URI` field in `.env.local`.
6.  **Copy Client ID and Secret**: After creating the credential, a popup will show your **Client ID** and **Client Secret**. Copy these into the `GMB_CLIENT_ID` and `GMB_CLIENT_SECRET` fields in `.env.local`.

---

### 3. Install Dependencies

Open your terminal (like Command Prompt, PowerShell, or the terminal in VS Code), navigate into the project folder, and run the following command to install all the necessary packages:

```bash
npm install
```

### 4. Run the Development Server

Once the installation is complete, start the Next.js development server by running:

```bash
npm run dev
```

Your application should now be running locally. You can view it by opening your browser and navigating to [http://localhost:9002](http://localhost:9002).
