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
npx expo start
```
4. Open on device with the QR code or on emulator.

## Screens
- Auth: Login, Signup, Forgot Password (placeholders for full backend integration)
- Dashboard (tab)
- Calendar (tab)
- Events (tab)
- Event Definitions (tab)
- Profile (tab)

## Design System
Basic UI components live under `src/components/ui`:
- `Button` – primary / outline / danger variants
- `TextField` – labeled input with error state
- `MessageBox` – contextual messages (error, success, info)
- `BrandHeader` – product/company heading
- `HelpTooltip` – static help copy placeholder

Color palette in `src/constants/colors.ts` mirrors web naming (primary, secondary, third, surface, border, semantic colors, and dark placeholders).

## Auth Flow
- Unauthenticated users are redirected to `/(auth)/login`.
- Successful login stores a token (SecureStore on native; local fallback) and fetches `/profile`.
- Tabs are only accessible with a token.

## Next Steps
- Replace mock events with live API calls.
- Hook up Forgot Password & Signup endpoints.
- Add theming/dark mode parity with web.
- Reuse validation logic (e.g., zod) for inputs.
