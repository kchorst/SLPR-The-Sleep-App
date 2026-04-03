# SLPR: The Sleep App (v1.0)

SLPR is a cognitive shuffle sleep aid app. It reads randomized words from your personal word bank using system text-to-speech (TTS) to help disrupt coherent thought patterns so you can fall asleep.

## How It Works

SLPR uses the "cognitive shuffle" technique - a scientifically-backed method that helps transition your brain from active thinking to restful sleep. The app reads your personalized word list aloud, one word at a time, with configurable gaps between words. This randomization prevents your mind from forming coherent thoughts, allowing you to drift off naturally.

## Features

- **Cognitive shuffle technique**
- **Personal word bank**
- **System voice selection** (device TTS voices)
- **Sleep-friendly dark UI** with dim playback mode
- **Session duration presets** (5 to 30 minutes)
- **Session history**
- **Playback controls** (start, pause/resume, stop)

## Technical Architecture

### Core Components
- **OnboardingScreen** - First-run intro
- **VoiceSetupScreen** - Voice selection + session duration
- **SimpleSessionScreen** - Session setup + playback (intro phrases then countdown)
- **WordBankScreen** - Add/remove words + preview (TTS)

### State Management
- **VoiceContext** - Global TTS settings (voice ID, speech rate)
- **WordListContext** - Word bank management with AsyncStorage persistence

### Audio System
- **expo-speech** (v12.0.2) - Text-to-speech engine
- **expo-av** (v14.0.5) - Audio session management
- Configured for background playback and interruption handling

## Dependencies

### Core Framework
- **React Native** (0.74.5) - Mobile app framework
- **Expo** (51.0.0) - Development platform and SDK
- **TypeScript** (5.3.3) - Type safety

### Navigation & UI
- **@react-navigation/native** (6.1.18) - Navigation framework
- **@react-navigation/stack** (6.3.20) - Stack navigator
- **@react-native-community/slider** (4.5.2) - Custom slider controls
- **@react-native-picker/picker** (2.7.5) - Voice selection dropdown

### Storage & Utilities
- **@react-native-async-storage/async-storage** (1.23.1) - Local data persistence
- **expo-haptics** (13.0.1) - Haptic feedback
- **expo-status-bar** (12.0.1) - Status bar management

### Audio & Speech
- **expo-speech** (12.0.2) - Text-to-speech synthesis
- **expo-av** (14.0.5) - Audio session configuration

## Permissions

### Android
- `MODIFY_AUDIO_SETTINGS` - Configure audio output for TTS
- `ACCESS_NETWORK_STATE` - Network access for voice data

### iOS
- `NSMicrophoneUsageDescription` - Audio access for speech synthesis
- `NSSpeechRecognitionUsageDescription` - Speech recognition capabilities

## Installation & Setup

### Prerequisites
- Node.js 16+ 
- Expo CLI (`npm install -g expo-cli`)
- Android Studio (for Android development)
- Xcode (for iOS development)

### Quick Start
```bash
# Install dependencies
npm install

# Start development server
npm start
```

Notes:
- On Windows, if PowerShell blocks `npx` scripts, run from Command Prompt or change your PowerShell execution policy.

## Usage

1. **Onboarding (first run)**
   - A short intro screen sequence.
2. **Voice setup (first run, and whenever you change settings)**
   - Pick a device voice (tap to preview).
   - Pick a session duration.
3. **Session**
   - Press Start Session.
   - You’ll hear preparatory phrases first.
   - The countdown starts after the intro phrases.
4. **Word bank**
   - Add/remove words.
   - Preview TTS.

## Session Flow

```
Onboarding (first run)
  → Voice Setup (required once)
  → Session
  → Dim playback
```

## Audio Configuration

The app configures audio sessions for optimal sleep experience:
- **Background Playback** - Continues when screen is off
- **Silent Mode Override** - Works even when phone is muted
- **Audio Ducking** - Lowers volume for interruptions
- **No Recording** - Privacy-focused, only audio output

## Data Storage

- **Word Lists** - Stored locally using AsyncStorage
- **Voice Preferences** - Persisted across app launches
- **Session History** - Tracks usage patterns locally
- **No Cloud Sync** - All data remains on device

## Release Notes

### v1.0
- **First-run onboarding** followed by **required voice setup**
- **Voice selection + duration** in a dedicated setup screen
- **Session intro phrases play before the session countdown begins**
- **Default word gap**: 8 seconds
- **Dim playback mode** during session
- **Word Bank** management + voice preview
- **Session history** saved locally

## Known Issues

- **Android TTS cold start can briefly return 0 voices**
  - Some devices intermittently return an empty array from `expo-speech` immediately after app launch.
  - Waiting a moment and reopening Voice Setup typically resolves it.
- **Voice list availability depends on system TTS**
  - If the device has no voice data installed for your language, SLPR cannot synthesize speech.
- **Tunnel mode issues (ngrok)**
  - `expo start --tunnel` can fail depending on ngrok availability/outages.

## Troubleshooting

### TTS Not Working
Android can report installed voices but still return an empty list briefly after a cold start.

If SLPR shows no voices:

1. Install voice data:
   - Android Settings
   - General Management
   - Language & Input
   - Text-to-Speech Output
   - Install voice data
2. Restart SLPR.
3. Open the Voice Setup screen and wait a second, then try again.

If you still have no voices:

1. Confirm your device TTS engine is set (Android Settings → Text-to-Speech Output).
2. Download additional voice data (same settings screen).
3. Reboot the phone (some OEM TTS engines don’t load voices reliably until after a reboot).

### “No Voice Selected”
- Open **Voice Setup** and pick a voice (tap a voice to preview).
- SLPR persists the selected voice ID for future launches.

### Expo dev server issues

- If you see Metro/bundler cache errors:
  - `npx expo start --clear`
- If PowerShell blocks `npx` script execution:
  - Use Command Prompt, or adjust your PowerShell execution policy.
- If tunnel mode fails:
  - Prefer LAN: `npx expo start --lan`

### Audio Issues
1. Check device volume levels
2. Verify silent mode is handled correctly
3. Test with different voice options
4. Restart audio session in device settings

## Development

### Project Structure
```
SLPR/
├── screens/           # React Native screens
├── utils/            # Utility functions
├── assets/           # Static assets
├── App.tsx           # Main app component
├── screens/VoiceContext.tsx  # TTS state management
├── WordListContext.tsx       # Word bank state
└── app.json          # Expo configuration
```

### Scripts
- `npm start` - Start Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator
- `npm run web` - Run in web browser (limited functionality)

## EAS Build (Quick Reference)

Prereqs:

- `npm i -g eas-cli`
- `eas login`

Common commands:

```bash
eas whoami
eas build:configure

# Dev client build
eas build -p android --profile development

# Preview / internal testing
eas build -p android --profile preview

# Production
eas build -p android --profile production
```

## License

MIT © [kchorst](https://github.com/kchorst)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on real devices
5. Submit a pull request

## Support

For issues, feature requests, or questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Include device information and error logs
