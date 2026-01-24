# WA CRM Worker Mobile App

A Flutter mobile application for workers to manage their assigned leads, chat via WhatsApp, and log calls.

## Features

- **Authentication**: Workers can login with their credentials
- **Dashboard**: View assigned leads, call stats, and pending follow-ups
- **Call Feature**: Initiate calls and log call details with status, outcome, notes
- **WhatsApp Chat**: Send and receive WhatsApp messages with leads
- **Follow-ups**: Track and manage scheduled follow-up calls

## Setup

### Prerequisites

- Flutter SDK (>=3.0.0)
- Android Studio / Xcode
- A running backend server

### Installation

1. Navigate to the mobile_app directory:
   ```bash
   cd wa_CRM/mobile_app
   ```

2. Install dependencies:
   ```bash
   flutter pub get
   ```

3. Configure the API URL in `lib/config/api_config.dart`:
   ```dart
   static const String baseUrl = 'https://your-api-url.com/api';
   ```

4. Run the app:
   ```bash
   flutter run
   ```

### Building for Release

**Android:**
```bash
flutter build apk --release
```

**iOS:**
```bash
flutter build ios --release
```

## Project Structure

```
lib/
├── main.dart              # App entry point
├── config/
│   └── api_config.dart    # API configuration
├── models/
│   └── models.dart        # Data models
├── services/
│   ├── auth_service.dart  # Authentication service
│   └── api_service.dart   # API service
└── screens/
    ├── login_screen.dart      # Login page
    ├── dashboard_screen.dart  # Main dashboard
    ├── chat_screen.dart       # WhatsApp chat
    └── call_log_screen.dart   # Call logging
```

## API Endpoints Used

- `POST /api/auth/login` - User login
- `GET /api/worker/leads` - Get assigned leads
- `GET /api/worker/stats` - Get worker statistics
- `GET /api/worker/calls` - Get call history
- `GET /api/worker/follow-ups` - Get pending follow-ups
- `GET /api/worker/messages/:phone` - Get WhatsApp messages
- `POST /api/whatsapp/send` - Send WhatsApp message
- `POST /api/worker/calls` - Log a call

## Permissions Required

**Android (android/app/src/main/AndroidManifest.xml):**
```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.CALL_PHONE"/>
```

**iOS (ios/Runner/Info.plist):**
```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```
