# button-automator

### Mac bash script for autostart

Save the following with no file extension
```
#!/bin/zsh
npm --prefix ~/projects/services/button-automater run watch
bash
```

> ⚙️ System Preferences > Users & Groups > 🔑 “Login Items” > Add your bash script and never move that file to another location or it will break

### Allow keyboard monitoring and typings functionality

When you want Node code to be able to output keyboard strokes or listen to keyboard strokes, follow the following:

> ⚙️ System Preferences > 🛡 Security & Privacy > ⌨️ Input Monitoring > Add your bash script

> Deprecated steps (use if above steps do not work) ~~⚙️ System Preferences > 🛡 Security & Privacy > ⌨️ Input Monitoring > Add Terminal and check the check boxes (⚠️ This may not be a safe security practice to give all of Terminal input monitoring)~~