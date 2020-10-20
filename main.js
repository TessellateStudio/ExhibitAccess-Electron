const { app, BrowserWindow } = require('electron')
const path = require('path')

if (__dirname.match(/david/)) {
    require('electron-reload')(__dirname, {
        electron: path.join(__dirname, 'node_modules', '.bin', 'electron')
    })
}

// Allow the app to communicate with the iframe that holds the running display
app.commandLine.appendSwitch('disable-site-isolation-trials')
app.commandLine.appendSwitch('ignore-certificate-errors')

function createWindow () {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        fullscreen: true,
        frame: false,
        autoHideMenuBar: true,
        kiosk: true,
        icon: path.join(__dirname, 'icons', 'png', '64x64.png'),
        webPreferences: {
            nodeIntegration: true,
            webSecurity: false
        }
    })

    win.loadFile('index.html')
    win.webContents.openDevTools()
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

