# Product Requirements Document: Zewijuna

## 1. Project Overview
**Zewijuna** is a modern Muslim dating application designed to provide a secure and culturally appropriate platform for individuals seeking serious relationships and marriage. The app features a swipe-based interface, real-time messaging, and comprehensive profile management.

## 2. Target Audience
- Individuals looking for serious marriage partners within the Muslim community.
- Users who value privacy and Islamic values in their search process.

## 3. Technology Stack
- **Frontend:** Expo (React Native) for cross-platform mobile support.
- **Backend:** Hono (Node.js) server.
- **Database/Auth:** Supabase (PostgreSQL, Real-time updates, Authentication).
- **Other Integrations:** Arifpay for payment processing, Framer for landing page components.

## 4. Key Features

### 4.1 Onboarding & Authentication
- Secure login using Supabase Auth.
- Profile setup including essential details (hobbies, preferences, bio).
- Identity verification (optional/planned).

### 4.2 Discovery (Swipe Interface)
- Swipe left/right to browse potential matches.
- Filtering based on location, age, and other preferences.
- Like/Superlike functionality.

### 4.3 Real-time Messaging
- Secure chat between matched users.
- Support for text and potentially media sharing.
- Push notifications for new messages and matches.

### 4.4 Membership & Payment
- Multi-tier membership plans.
- Daily usage limits (swipes, matches) that decrement upon use.
- Secure payment integration via Arifpay.

### 4.5 Admin Dashboard
- Web-based dashboard (`admin.html`) for user management.
- Analytics for tracking app growth and engagement.
- CRUD operations for managing app content and settings.

## 5. User Flows

### 5.1 Registration Flow
1. User opens the app.
2. User signs up via email/password.
3. User completes their profile (adds photos, description).
4. User enters the discovery screen.

### 5.2 Match & Chat Flow
1. User swipes right on a profile.
2. If the other user also swipes right, a "Match" is created.
3. Chat is enabled between the two users.
4. Users can send and receive messages in real-time.

## 6. Functional Requirements
- The swipe interface must be smooth and responsive.
- Profile images must load efficiently.
- Message history must persist and sync across sessions.
- Payment processing must be secure and update user membership state immediately.

## 7. Non-Functional Requirements
- **Security:** User data must be encrypted and stored securely in Supabase.
- **Performance:** Low latency for messaging and image loading.
- **Scalability:** Architecture should support a growing user base.
