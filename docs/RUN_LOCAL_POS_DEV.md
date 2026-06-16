# How to Run POS in Development Mode for Fast Testing

Instead of waiting 5-7 minutes for each rebuild, you can run the POS locally with hot reload and instant feedback!

## Quick Start (3 Steps)

### Step 1: Open Command Prompt
Press `Win + R` and type `cmd`

### Step 2: Go to the Latest Generated POS
Run this command (copy-paste):

```
cd "D:\DEV projects\Carthaposforprod-main (1)\Carthaposforprod-main\backend\generated-pos"
```

Then find the most recent folder:
```
dir /b /o-d | findstr /r "pos-restaurant" | head -1
```

Copy the folder name, then:
```
cd pos-XXXX-YYYY
```

(Replace `pos-XXXX-YYYY` with the folder name you copied)

### Step 3: Install Dependencies (first time only)

```
npm ci --legacy-peer-deps
```

This takes ~2-3 minutes. After that, you can skip this step.

### Step 4: Run in Development Mode

```
npm run electron-dev
```

The app will:
1. Start a dev server on http://localhost:5173
2. Launch the Electron app
3. Hot reload any changes you make to source files
4. Show errors in the dev tools console

## What You Can Do

### View the App Console
- In the Electron app window, press `F12` to open DevTools
- Click "Console" tab
- Any errors will show here

### Edit Source Files and See Changes
Edit any file in `src/` and the app will automatically reload

### Access the Backend Database
The POS will use your local database in:
```
C:\Users\windows 11\AppData\Roaming\pos-restaurant-le-gourmet\data\
```

## Troubleshooting

### npm ci fails
```
npm install --legacy-peer-deps
```

### Port 5173 already in use
Kill the process using it:
```
npx kill-port 5173
```

Then try again.

### Dependencies are broken
Delete node_modules and reinstall:
```
rmdir /s node_modules
npm ci --legacy-peer-deps
```

## Finding the Error

When the app crashes in dev mode:

1. The console will show the exact error
2. Stack trace will show which file and line
3. You can make fixes and the app will auto-reload
4. Test instantly without waiting for build

## Going Back to Production Build

Once you've fixed the issue:
```
npm run build:electron
```

This creates the final .exe for distribution.

why 