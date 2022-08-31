const path = require("path");
const os = require("os");
const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const imagemin = require("imagemin");
const imageminMozjpeg = require("imagemin-mozjpeg");
const imageminPngquant = require("imagemin-pngquant");
const slash = require("slash");
const log = require("electron-log");
if (require("electron-squirrel-startup")) return app.quit(); // prevents app from running while squirrel install is running

const isMac = process.platform === "darwin" ? true : false;

let mainWindow;
let aboutWindow;

function createMainWindow() {
  log.verbose("loading app..");
  mainWindow = new BrowserWindow({
    title: "simpleShrink",
    width: 500,
    height: 600,
    icon: `${__dirname}/assets/icons/simpleShrinkIcon256x256.png`,
    resizable: false,
    backgroundColor: "white",
    webPreferences: {
      nodeIntegration: true,
    },
  });
  log.verbose("app loaded");

  mainWindow.loadFile("./app/index.html");
  log.verbose("loaded main view");
}

function createAboutWindow() {
  aboutWindow = new BrowserWindow({
    parent: mainWindow,
    modal: true,
    title: "About simpleShrink",
    width: 300,
    height: 300,
    icon: `${__dirname}/assets/icons/simpleShrinkIcon256x256.png`,
    resizable: false,
    backgroundColor: "white",
  });
  aboutWindow.removeMenu();
  aboutWindow.loadFile("./app/about.html");
}

app.on("ready", () => {
  createMainWindow();
  const mainMenu = Menu.buildFromTemplate(menu);
  Menu.setApplicationMenu(mainMenu);
  mainWindow.on("closed", () => (mainWindow = null));
});

const menu = [
  ...(isMac
    ? [
        {
          label: app.name,
          submenu: [
            {
              label: "About",
              click: () => createAboutWindow(),
            },
          ],
        },
      ]
    : []),
  {
    label: "File",
    submenu: [
      {
        label: "Exit",
        click: () => app.quit(),
      },
    ],
  },
  {
    label: "Help",
    submenu: [
      {
        label: "About",
        click: () => createAboutWindow(),
      },
    ],
  },
];

ipcMain.on("image:minimize", (e, options) => {
  log.verbose("received call to shrink image");
  log.verbose("shrink details:");
  log.verbose(options);
  options.dest = path.join(os.homedir(), "simpleShrink");
  shrinkImage(options);
});

async function shrinkImage({ imgPath, quality, dest }) {
  log.verbose("starting shrink");
  try {
    const pngQuality = quality / 100;
    const files = await imagemin([slash(imgPath)], {
      destination: dest,
      plugins: [
        imageminMozjpeg({ quality }),
        imageminPngquant({
          quality: [pngQuality, pngQuality],
        }),
      ],
    });
    log.verbose("shrink finished");
    mainWindow.webContents.send("image:done");
  } catch (err) {
    log.error("Shrink error: " + err);
  }
}

app.on("window-all-closed", () => {
  if (!isMac) {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});
