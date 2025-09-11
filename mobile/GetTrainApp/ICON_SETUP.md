# GetTrain App Icon Setup

## 🎨 Icon Design Created
I've created a smart train icon design with:
- Modern train with blue gradient background
- Smart elements: WiFi signal, location pin, phone
- Train details: windows, wheels, accent stripe
- Tech theme with orange accents

## 📱 Easy Icon Generation Process

### Option 1: Use Android Asset Studio (Recommended)
1. Go to: https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html
2. Upload the `icon-design.svg` file from the `assets/` folder
3. Adjust settings as needed
4. Download the generated ZIP file
5. Extract and copy the `mipmap-*` folders to `android/app/src/main/res/`

### Option 2: Use the HTML Generator
1. Open `create-icon.html` in your browser
2. Click each download button to get all required sizes:
   - 48x48 (mdpi)
   - 72x72 (hdpi) 
   - 96x96 (xhdpi)
   - 144x144 (xxhdpi)
   - 192x192 (xxxhdpi)
3. Rename them to `ic_launcher.png` and place in respective folders

### Option 3: Online Converter
1. Use any SVG to PNG converter like:
   - https://convertio.co/svg-png/
   - https://cloudconvert.com/svg-to-png
2. Convert `icon-design.svg` to PNG at 192x192
3. Then resize to other required sizes

## 📁 File Placement
Replace the existing icons in these locations:

```
android/app/src/main/res/
├── mipmap-mdpi/ic_launcher.png (48x48)
├── mipmap-hdpi/ic_launcher.png (72x72)
├── mipmap-xhdpi/ic_launcher.png (96x96)
├── mipmap-xxhdpi/ic_launcher.png (144x144)
└── mipmap-xxxhdpi/ic_launcher.png (192x192)
```

## ✅ Ready to Build
Once icons are in place:
```bash
cd mobile/GetTrainApp
npm run android
```

The app will now show with your custom GetTrain icon!