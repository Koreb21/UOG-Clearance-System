# Mobile App

Current stack:

- Expo
- React Native
- secure token storage with `expo-secure-store`

Current first-pass screens:

- login
- student request creation
- live clearance overview
- payment launch
- finance receipt view
- inquiry/reply tracking
- certificate view

Run after installing dependencies:

```powershell
cd C:\Users\PC\Desktop\Assignment\ClearanceSystem\mobile
npm install
npm run start
```

Set backend URL when needed:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL="http://YOUR-IP:8080/api/v1"
```

For a real phone, replace `localhost` with your computer's local network IP.
