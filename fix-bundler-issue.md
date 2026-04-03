# Fix Bundler Cache Issue

## Problem
The bundler cache is corrupted and causing:
```
CommandError: TypeError: Cannot read properties of undefined (reading 'body')
```

## Solution Steps

### Step 1: Clear All Caches
```bash
# Delete these folders:
- D:\SLPR\node_modules\.cache
- D:\SLPR\.expo  
- D:\SLPR\.expo-shared

# Or run manually:
rmdir /s /q "D:\SLPR\.expo"
rmdir /s /q "D:\SLPR\.expo-shared" 
rmdir /s /q "D:\SLPR\node_modules\.cache"
```

### Step 2: Clear Metro Cache
```bash
# In D:\SLPR directory:
npx expo start --clear
```

### Step 3: Alternative - Use Expo CLI Directly
```bash
# If you have Expo CLI installed globally:
expo start --clear
```

### Step 4: Use Development Batch File
```bash
# If you have slpr_dev.bat:
slpr_dev.bat
```

### Step 5: Last Resort - Reinstall Dependencies
```bash
# Delete node_modules folder
# Then run:
npm install
expo start --clear
```

## What to Avoid
- Don't use --tunnel flag for now (ngrok may have issues)
- Don't use PowerShell if it blocks npx (use Command Prompt instead)
- Don't run multiple Expo instances simultaneously

## Expected Result
After clearing cache, you should see:
```
Starting Metro Bundler
✓ Metro Bundler ready
```

Then the app should load properly with the TTS fixes we implemented.
