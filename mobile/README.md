# Automated Scheduling - Mobile (Expo)

This is the React Native (Expo) mobile app for the Automated Scheduling System. It mirrors core functionality of the web app and connects to the same backend.

## Prerequisites
- Node.js LTS
- npm or yarn
- Expo CLI (`npm i -g expo-cli`) or use `npx expo`
- Expo Go on device OR Android/iOS emulator

## Setup
1. Copy `.env.example` to `.env` and set API URL:
```
EXPO_PUBLIC_API_URL=http://localhost:8080/api
```
2. Install dependencies:
```
npm install
```
3. Start the dev server:
```
npm start
```
4. Open on device with the QR code or on emulator.

## Screens
- Dashboard (default tab): shows basic counts from mock data.
- Calendar: groups mock events by date.
- Events: lists mock events with status and attendees.
- Event Definitions: lists mock definitions and whether required.
- Profile: placeholder for user settings.

## Mock Data
Under `src/mock/data.ts`. Replace with real API calls later via `src/services/api.ts`.

## Structure
- `app/` - file-based routing via expo-router (tabs)
- `src/services/api.ts` - axios client configured from env

## Notes
- Uses `expo-router` Tabs with two screens: Home and Profile.
- Home screen fetches `/rules/metadata` and lists the top-level keys.
