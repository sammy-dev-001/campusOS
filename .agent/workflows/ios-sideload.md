---
description: Build and sideload EduFi to iOS without App Store (7-day method)
---

# iOS Sideloading Workflow

This workflow creates an unsigned iOS build that can be sideloaded via Sideloadly/AltStore. The app will expire every 7 days and require re-signing.

## Prerequisites

Before starting, ensure you have:

1. **Sideloadly** installed - Download from [sideloadly.io](https://sideloadly.io)
2. **iTunes or Apple Music** (desktop version) - Required for iOS device drivers
3. **7-Zip or WinRAR** - For extracting .tar.gz files on Windows
4. **Apple ID** - Free account is fine (no paid developer account needed)
5. **iPhone with USB cable** - For sideloading

---

## Step 1: Build the iOS App

Run the EAS build command with the `sideload` profile:

```bash
cd "c:\Users\USER\Documents\CODE X\EDUFI\campusOS"
eas build --platform ios --profile sideload
```

**What happens:**
- EAS creates a simulator build
- Build takes ~10-20 minutes
- You'll get a link to download a `.tar.gz` file

**Note:** If asked to log in, use `eas login` first.

---

## Step 2: Download the Build

1. When the build completes, EAS will provide a download link
2. Click the link or copy it to your browser
3. Download the `.tar.gz` file to your Downloads folder

---

## Step 3: Convert .tar.gz to .ipa (Windows)

### 3a. Extract the .tar.gz

1. Right-click the downloaded `.tar.gz` file
2. Select **7-Zip → Extract Here** (or use WinRAR)
3. You'll get a folder with a name like `EduFi.app` or similar

### 3b. Create the IPA structure

1. Create a **new folder** named exactly `Payload` (capital P is mandatory)
2. **Move** (not copy) the `.app` folder **into** the `Payload` folder
3. Your structure should look like:
   ```
   Payload/
   └── EduFi.app/
       ├── Info.plist
       ├── (other files)
   ```

### 3c. Compress to ZIP

1. Right-click the `Payload` folder
2. Select **Send to → Compressed (zipped) folder**
3. Windows will create `Payload.zip`

### 3d. Rename to .ipa

1. Rename `Payload.zip` to `EduFi.ipa`
2. Confirm the extension change when Windows warns you

**Result:** You now have `EduFi.ipa` ready for sideloading!

---

## Step 4: Install iTunes/Apple Music

If you haven't already:

1. Download **iTunes** (Windows) or **Apple Music** from Apple's website
2. Install the desktop version (not the Microsoft Store version)
3. This provides the device drivers needed for Sideloadly

---

## Step 5: Sideload with Sideloadly

### 5a. Open Sideloadly

1. Launch **Sideloadly**
2. Connect your iPhone to your PC via USB cable
3. Unlock your iPhone and tap "Trust This Computer" if prompted

### 5b. Configure Sideloadly

1. **IPA File:** Drag `EduFi.ipa` into the Sideloadly window
2. **Device:** Your iPhone should appear in the device dropdown
3. **Apple Account:** Enter your Apple ID email
4. **Password:** Enter your Apple ID password
   - If using 2FA, you'll need an app-specific password (generate at appleid.apple.com)

### 5c. Install

1. Click **Start**
2. Wait for Sideloadly to:
   - Sign the app with your Apple ID
   - Install it on your iPhone
3. This takes 1-3 minutes

### 5d. Trust the Developer Certificate (First Time Only)

1. On your iPhone, go to **Settings → General → VPN & Device Management**
2. Find your Apple ID under "Developer App"
3. Tap it and select **Trust**
4. Confirm by tapping **Trust** again

**Done!** EduFi is now installed on your iPhone.

---

## Step 6: Using the App

1. Open EduFi from your home screen
2. The app works exactly like a regular app
3. **Important:** It will expire in 7 days

---

## Step 7: Re-signing After 7 Days

When the app expires (crashes on launch):

1. **Don't delete the app** from your iPhone
2. Connect your iPhone to your PC via USB
3. Open Sideloadly
4. Drag the **same `EduFi.ipa`** file into Sideloadly
5. Click **Start**
6. Sideloadly will re-sign and reinstall (keeps your data)

**Repeat this process every 7 days.**

---

## Alternative: Use Expo Go Instead

If the 7-day expiration is annoying, consider using **Expo Go** for testing:

```bash
# Publish an update
eas update --branch production --message "Latest version"

# Share this link with testers
exp://u.expo.dev/4db3bf0f-f0fc-4892-b786-3ff8f17744b0?channel-name=production
```

**Benefits:**
- ✅ No 7-day expiration
- ✅ Instant updates (no reinstalling)
- ✅ Works on Android too
- ✅ No IPA conversion needed

**Downside:**
- Requires Expo Go app to be installed (free from App Store)

---

## Troubleshooting

**"Simulator builds can't be installed on real devices"**
- This error means the build profile needs adjustment. Ensure `eas.json` has the `sideload` profile configured correctly.

**"Lockdown error" in Sideloadly**
- Reconnect your iPhone and tap "Trust This Computer" again
- Try a different USB cable or port

**"App crashes immediately"**
- Ensure you trusted the developer certificate in Settings
- If it's been 7+ days, the app expired - re-sign it

**Build produces .ipa directly instead of .tar.gz**
- Great! Skip Step 3 entirely and use the .ipa directly in Step 5

**Apple ID requires app-specific password**
- Go to [appleid.apple.com](https://appleid.apple.com)
- Generate an app-specific password under Security
- Use that password instead of your regular password in Sideloadly
