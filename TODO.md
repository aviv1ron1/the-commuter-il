# GetTrain TODO List

## Bugs to Fix

### 1. Going back home - destination always Netivot
**Issue**: When returning home from an office, the destination is always set to Netivot, even when the user departed from a different station (Kiryat Gat or Lehavim).

**Expected behavior**: The app should remember which station the user parked at in the morning and use that as the return destination.

---

### 2. Leave now - shows trains many hours away
**Issue**: When using "Leave now" in the morning, the app shows trains that depart in the evening (many hours from now) instead of the next available trains.

**Expected behavior**: "Leave now" should show the next immediate trains available from the current time.

---

### 3. Android system back button - exits app
**Issue**: When pressing the Android system back button, the app exits completely instead of navigating back through the app screens.

**Expected behavior**: The Android back button should behave like the in-app GUI back button (navigate to previous screen), and only exit the app when on the home screen.

---
