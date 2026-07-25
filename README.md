# Portl - Modern Society Management App

Portl is a comprehensive, native-feeling society management application built with Expo (React Native) and Supabase. It features real-time visitor management, community engagement tools, and robust admin controls.

## Features

- **Role-Based Access**: Distinct interfaces for Admins, Guards, and Residents using a single app.
- **Visitor Management**: Real-time visitor requests with push-like WebSocket notifications. Guards log entries, residents approve/deny with one tap.
- **Community Tools**: Notice boards, dynamic polls, amenity bookings, and a complaint resolution system.
- **Staff Directory**: Admin-curated service provider directory with a personal "Trust" system for residents.
- **Premium UX**: Smooth micro-interactions, haptic feedback, loading skeletons, and empty states.

## Tech Stack

- **Frontend**: React Native, Expo, NativeWind (Tailwind CSS), Lucide Icons, Expo Haptics
- **Backend & Auth**: Supabase (PostgreSQL, Row Level Security, Realtime Subscriptions)

## Quick Start (Local Setup)

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd portl
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Variables:**
   Create a `.env` file in the root directory and add your Supabase keys:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Database Setup:**
   - Execute the SQL from `supabase/schema.sql` in your Supabase SQL Editor to create tables and RLS policies.
   - Execute the SQL from `supabase/seed.sql` to populate the demo society, towers, flats, and invites.

5. **Run the App:**
   ```bash
   npx expo start
   ```
   Scan the QR code with **Expo Go** on your physical iOS/Android device for the best experience (including haptics and camera support).

## Demo Credentials

The database is pre-seeded with three demo accounts, one for each role. The OTP verification is disabled in the backend for these tests, so any 6-digit code (e.g., `123456`) will log you in.

| Role | Phone Number | OTP | Notes |
| :--- | :--- | :--- | :--- |
| **Admin** | `+91 9999999999` | `123456` | Master Dashboard, Society CRUD, Notices |
| **Guard** | `+91 8888888888` | `123456` | Gate logging, QR scanning, Visitor requests |
| **Resident**| `+91 7777777777` | `123456` | Approves visitors for Flat 402, Books amenities |

## Testing the Core Flow (Visitor Approval)

To test the core visitor loop, you need two devices or simulators:
1. Log into Device A as the **Guard**.
2. Log into Device B as the **Resident**.
3. On Device A, tap **New Visitor**, enter details, and select Flat 402 (Resident's flat).
4. On Device B, watch the request appear instantly on the dashboard.
5. Tap **Approve** on Device B (feel the haptic feedback!).
6. Device A will automatically update to show the visitor is approved. 

---
*Built for the Agentic Coding Challenge.*
