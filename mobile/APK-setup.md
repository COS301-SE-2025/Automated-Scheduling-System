# Prequisites

- An Expo account (create one at https://expo.dev if you don’t have it).
- Node/npm available (you already have a project).
- (Optional) To build locally instead of cloud: Docker installed.

# Steps (run these in WSL; adapt path if needed):

1. Open a shell in the mobile folder:

```bash

cd mobile

```
2. Install EAS CLI (one-time):

```bash

npm install -g eas-cli
# or use npx: npx eas --version

```
3. Login to Expo:

```bash

eas login
# follow prompts to sign in

```

4. Start a cloud build for Android using the preview (APK) profile:

```bash

eas build --platform android --profile preview

```

- The CLI will prompt for credentials if needed (it can manage/auto-generate an Android keystore for internal/testing builds).
- It uploads the project and starts a cloud build. At the end you’ll get a link to download the APK.

5. Download/install:

- After build finishes, copy the APK download link from the CLI web page or run:
```bash

eas build:list --platform android

```
Use the build ID to download:

```bash

eas build:download --platform android --id <BUILD_ID>

```

Transfer the APK to your phone (USB, email, or direct download) and install (enable Install unknown apps on Android settings if needed).