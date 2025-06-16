# Logout Button Debug Guide

## 🔍 Where the Logout Button Should Appear

The logout button should be in the **top navigation bar**, to the right of your username.

### Expected Location:
```
[Board Game Player]                    [Admin Panel] [Connected] [Welcome, username] [🚪 Logout]
```

## 🧪 Testing Steps

### 1. Test the Button Directly
Visit: `http://localhost:3000/test-logout-button.html`

This page shows exactly where the button should appear with a test user already "logged in".

### 2. Test in Real Player Interface
1. Go to `http://localhost:3000/player.html`
2. **Login using any method:**
   - Quick login buttons (admin, player2, anweather)
   - Or type username/password manually
3. **After login:** Look at the top-right navbar
4. **You should see:** `Welcome, [username] [🚪 Logout]`

## 🐛 Troubleshooting

### If you don't see the logout button:

#### Check 1: Are you logged in?
- The logout button is **hidden until you login**
- Look for "Welcome, [username]" in the navbar
- If you only see "Connecting..." you're not logged in yet

#### Check 2: Screen size
- **Desktop:** Shows "🚪 Logout" button with text
- **Mobile:** Shows just the "🚪" icon (to save space)
- Try resizing your browser window

#### Check 3: Browser console
1. Press F12 → Console tab
2. Look for any JavaScript errors
3. Try typing: `document.getElementById('logout-btn')`
4. Should return the button element (not null)

#### Check 4: Force show user info
In browser console, try:
```javascript
document.getElementById('user-info').style.display = 'block';
```

## 📱 Expected Behavior

### Desktop (>576px wide):
```
Welcome, username [🚪 Logout]
```

### Mobile (<576px wide):
```
Welcome, username [🚪]
```

### On Click:
- Clears all user data
- Returns to login screen
- Shows "Logged out successfully" notification

## 🔧 Quick Fix

If the button still doesn't appear, try this temporary fix:

1. Go to player.html
2. Find the user-info span (around line 87)
3. Temporarily change `style="display: none;"` to `style="display: block;"`
4. Refresh page - you should now see the button immediately

This will help determine if it's a JavaScript issue or CSS issue.

## 📞 What to Report

If you still don't see the button, please report:
1. What you see in the navbar after logging in
2. Browser console errors (if any)
3. Screen size/device type
4. Result of the test page (`test-logout-button.html`)