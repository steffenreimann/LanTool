'use strict';
const electron = require('electron');
const path = require('path');
const url = require('url');
const configHelper = require('./config/configHelper');
const encryptAes = require('./utils/aesEncrypt');
var fs = require('fs')
const uuidv4 = require('uuid/v4');
var ping = require('ping');
var splitFile = require('./split-file.js'); 

const {app, BrowserWindow, Menu, ipcMain} = electron;

let mainWindow;
let pwWindow;
var user = {uuid: ""};

// SET ENV
process.env.NODE_ENV = 'development';

var ignoreFiles = [".DS_Store", ".gitkeep", ".gitignore"];

// Create menu template
const mainMenuTemplate =  [
	// Each object is a dropdown
	{
	  label: 'File',
	  submenu:[	 
		{
		  label:'Split File',
		  accelerator:process.platform == 'darwin' ? 'Command+S' : 'Ctrl+S',
		  click(){
			openSplitFile()
		  }
		},
		{
		  label:'Merge Files',
		  accelerator:process.platform == 'darwin' ? 'Command+M' : 'Ctrl+M',
		  click(){
			openMergeFile();
		  }
		},
		{
		  label: 'Quit',
		  accelerator:process.platform == 'darwin' ? 'Command+Q' : 'Ctrl+Q',
				  role: 'quit'
		}
	  ]
	}
  ];


  // If OSX, add empty object to menu
if(process.platform == 'darwin'){
	//mainMenuTemplate.unshift({});
}
// Add developer tools option if in dev
if(process.env.NODE_ENV !== 'production'){
	 mainMenuTemplate.push({
	   label: 'Developer Tools',
	   submenu:[
		   {
		   label:'Home',
		   accelerator:process.platform == 'darwin' ? 'Command+H' : 'Ctrl+H',
		   click(){
			 loadHTML('public/mainWindow.html');
		   }
		 }, 
		 {
		   label: 'Config',
		   accelerator:process.platform == 'darwin' ? 'Command+K' : 'Ctrl+K',
		   click(){
			 loadHTML('public/configWindow.html');
		   }
		 },
		 {
			label: 'Reload',
		   role: 'reload'
		 },
		 {
		   label: 'Toggle DevTools',
		   accelerator:process.platform == 'darwin' ? 'Command+I' : 'Ctrl+I',
		   click(item, focusedWindow){
			 focusedWindow.toggleDevTools();
		   }
		 }
	   ]
	 });
}
// Check Configuration directory
if (!configHelper.Init()) {
	configHelper.InitDirs();
	console.log('Created directory' + configHelper.GetBaseDir());
}


// Fast-TCP Testung ---------------------------------------------------
var Server = require('fast-tcp').Server;
var Socket = require('fast-tcp').Socket;
var server = new Server();
server.on('connection', function (socket) {
  socket.on('login', function (username) {
    console.log('Trying to login: ' + username);
  });
  socket.on('LT-Broadcast', function (data) {
    console.log('LT-Broadcast');
    console.log(data);
  });
});
server.listen('8090');
// Broadcast event to everyone, exclude sender
//socket.emit('LT-Broadcast', 'Hello, World!', { broadcast: true });
//socket.emit('login', 'alejandro');
// Fast-TCP Testung ---------------------------------------------------



// Listen for app to be ready
app.on('ready', function(){
  	//Create new window
  	//const readUserConfig = configHelper.LoadUserConfig("");
	mainWindow = new BrowserWindow({
		webPreferences: {
			nodeIntegration: true
		}
	});
	loadHTML('public/mainWindow.html');
  	// Quit app when closed
	mainWindow.on('closed', function(){
		app.quit();
	});
  	// Build menu from template
	const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
	// Insert menu
	Menu.setApplicationMenu(mainMenu);
});
ipcMain.on('openFile', (event, path) => { 
    openSplitFile(path)
}) 
ipcMain.on('openfile-merge', (event, data) => { 
   	openMergeFile(data)
}) 
ipcMain.on('splitfile', (event, path) => { 
   	console.log('File Split');
})  
ipcMain.on('saveConfig', (event, data) => { 
	const readUserConfig = configHelper.LoadUserConfig(data.config_pw);
	const cleanObject = {'config_user': data.config_user, 'config_uuid': null }
	if(readUserConfig.fileExists && readUserConfig.parseError){
		return;
	}
	if(!readUserConfig.fileExists){
		cleanObject.config_uuid = uuidv4(); // ⇨ '10ba038e-48da-487b-96e8-8d3b99b6d18a'
	}else{
		cleanObject.config_uuid = readUserConfig.userCfg.config_uuid;
	}
	user.uuid = true;
	loadHTML('public/mainWindow.html');
	configHelper.WriteUserConfig(data.config_pw, cleanObject);
	//{'config_pw': config_pw, 'config_user': config_user, 'config_uuid': config_uuid }
	mainWindow.webContents.send('saveConfig', cleanObject );
}) 
ipcMain.on('loadConfig', (event, data) => { 
	console.log(data);
	//{'config_pw': config_pw}
	const readUserConfig = configHelper.LoadUserConfig(data.config_pw);
	console.log('Loaded config:');
	console.log(readUserConfig);
	user.uuid = true;
	mainWindow.webContents.send('loadConfig', readUserConfig.userCfg );
	if(pwWindow != undefined){
		pwWindow.hide();
	}
	
}) 
ipcMain.on('saveSplitFile', (event, data) => {
    //console.log("Joo path" + data.path);
    savefile(data)
})
ipcMain.on('DOM', (event, data) => {
    console.log("DOM Data : " + data);      
})
ipcMain.on('ipscan', (event, data) => {
    console.log("DOM Data : " + data);    
})
ipcMain.on('tcpconnect', (event, data) => {
	console.log("tcpconnect Data : " + data);
	connectToServer(data);
})
function savefile(data) {
    const {dialog} = require('electron') 
    const fs = require('fs') 
    console.log(data.name)
    console.log(data.path)
    console.log(data.packSize) 
    dialog.showSaveDialog({ filters: [
     { defaultPath: data.path, extensions: ['*'] }
    ]}, function (fileName) {
    if (fileName === undefined) return;
        console.log(data)
		//split(data.path, data.packSize, fileName);
		fs.lstat(data.path , (err, stats) => {
			if(err) {
				return console.log(err); //Handle error
			}
			isFile = stats.isFile()	
			var path = data.path
			path = path.split('\\');
			var name = path.pop()
			path = path.join('\\');
			if(isFile)	{
				console.log(`!!!!!Is File: ${name}`);
				console.log(`!!!!!path: ${path}`);

				//addGame(path,name, "true")
				var addGameData = {path: x, size: 400, split: true}
				addGame(addGameData)
			}    
		});
	
   // fs.writeFile(fileName, data, function (err) { });

  }); 
  
}
function merge(data) {
	var t_start, t_end;
	t_start = new Date().getTime();
	console.log('Merge with ' + data.names);
	console.log('Merge path ' + data.path );
  	splitFile.mergeFiles(data.names, data.path + '/' + data.name + '.' + data.typ).then(() => {
  		console.log('Done!');
  		t_end = new Date().getTime();
  		console.log(t_end - t_start + 'ms');
  	})
  	.catch((err) => {
   		console.log('Error: ', err);
  	});
}
function openMergeFile(){
    const {dialog} = require('electron') 
	const fs = require('fs') 
	console.log('openfile');
	
	var selectedFiles = dialog.showOpenDialog({properties: ['openFile', 'multiSelections', 'openDirectory' ]});
	console.log('selectedFiles = ' + selectedFiles)

    if(selectedFiles != undefined) {
		fs.lstat(selectedFiles  + "/", (err, stats) => {
			if(err) {
				return console.log(err); //Handle error
			}
			
			isFile = stats.isFile()
			isDirectory = stats.isDirectory()
			console.log(isFile)
			if(isDirectory){
				fs.readdir(selectedFiles  + "/", (err, files) => {
					var g = files[0].split('.');
					var p = selectedFiles[0].split('.');
					var tmpFileArray = [];
					p = p.join('.')
					console.log('selectedFiles g = ' + g);
					console.log('selectedFiles p = ' + p);
					g.pop();
					var path = g.join('.') 
					var typ = g.pop();
					console.log('selectedFiles path = ' + path);
					console.log('selectedFiles typ = ' + typ);
					var name = g.join('.')
					console.log('selectedFiles name = ' + name);
					files.forEach(file => {
					  console.log('forEachfile = ' + file);
					  tmpFileArray.push(p + '/' + file);
					});
					console.log('tmpFileArray = ' + tmpFileArray);
					merge({path: p + '/', name: name, names: tmpFileArray, typ: typ});
				})
			}
		});
	}else{
        console.log('Bitte etwas auswählen');
    }
}  
function connectToServer(ip){
	var socket = new Socket({
		host: ip,
		port: 8090
	  });
	socket.emit('login', 'alejandro');
}
function openSplitFile(path){
	const {dialog} = require('electron') 
  	const fs = require('fs') 
  	console.log('openfile');
  	var selectedFiles = dialog.showOpenDialog({properties: ['openFile', 'multiSelections']});
   	if(selectedFiles != undefined) {
	   	console.log(selectedFiles)
		//filestats(selectedFiles[0])
		
		fs.lstat(selectedFiles[0], (err, stats) => {
			if(err)
			return console.log(err); //Handle error

			console.log(`Is file: ${stats.isFile()}`);
			console.log(`Is directory: ${stats.isDirectory()}`);
			console.log(`Is symbolic link: ${stats.isSymbolicLink()}`);
			console.log(`Is FIFO: ${stats.isFIFO()}`);
			console.log(`Is socket: ${stats.isSocket()}`);
			console.log(`Is character device: ${stats.isCharacterDevice()}`);
			console.log(`Is block device: ${stats.isBlockDevice()}`);
			//mainWindow.webContents.send('selectedFiles', file = {"path": selectedFiles[0], "stats": stats} );
			var FileSize = stats.size / 1000000;
			console.log(FileSize);
			FileSize = Math.round(FileSize)
			if(FileSize >= 1000){
			
				sizeMGB = FileSize / 1000
				sizeMGB = sizeMGB + " GB"
			}else{
				sizeMGB = FileSize + " MB"
			}
			mainWindow.webContents.send('DOM', {"id": "#size", "val": sizeMGB} );
			mainWindow.webContents.send('DOM', {"id": "#out", "val": selectedFiles[0]} );
			mainWindow.webContents.send('DOM', {"id": "#time", "val": ""} );
		});
	  	//mainWindow.webContents.send('selectedFiles', selectedFiles);
   	}else{
	   console.log('Bitte etwas auswählen');
	}
}
function loadHTML(data){
	const readUserConfig = configHelper.LoadUserConfig("");
	if(!readUserConfig.fileExists){
		console.log("Kein File vorhanden");
		mainWindow.loadURL(url.format({
			pathname: path.join(__dirname, 'public/loginWindow.html'),
			protocol: 'file:',
			slashes: true
		}));
	}
	if(readUserConfig.fileExists && !user.uuid) { 
		console.log("Nutzer vorhanden!! Please Login");
		createloginWindow();	
	}
	if(readUserConfig.fileExists && user.uuid){
		mainWindow.loadURL(url.format({
			pathname: path.join(__dirname, data),
			protocol: 'file:',
			slashes: true
		}));
	}
}
/**JSON  */
function addGame(da) {
	var basename = path.basename(da.path);
	fs.lstat(da.path, (err, stats) => {
		if(err) {
			return console.log(err); //Handle error
		}
		isFile = stats.isFile()
		isDirectory = stats.isDirectory() 
		if(isFile && !ignore(basename))	{
			console.log(`-- add game -- Is File: ${basename} --`);
			var tmpFiles = {name: da.path, stats: stats }
			FilePaths.myFiles.push(tmpFiles);
			if(da.split){
				checkFilestatus(da, LTsplit);
			}
		}
		if(isDirectory == true)	{
			console.log(`Bitte Komprimieren`);
		}  
	});

   var dirPath = 'mynewfolder';
   const mkdirSync = function (dirPath) {
	 try {
	   fs.mkdirSync(dirPath)
	   console.log('mkdir')
	 } catch (err) {
		 console.log(err)
	   if (err.code !== 'EEXIST') throw err
	 }
   }

}
/**String File Basename. return true if basename are an Ignored File */
function ignore(fileName){
	for (let i = 0; i < ignoreFiles.length; i++) {
		const element = ignoreFiles[i];
		if(fileName == element){
			console.log('ignore true = ' + element);
			return true;
		}
	}
	console.log('File Ignore false = ' + fileName);
	return false;
 }
let checkFilestatus = function checkFilestatus(da, callback){
	var basename = path.basename(da.path);
	var dirname = path.dirname(da.path);
	var filePath = path.join(dirname,'LT-' + basename, basename);
	var dirPath = path.join(dirname, 'LT-' + basename);
 
	if(!fs.existsSync(dirPath)){
		fs.mkdir(dirPath, { recursive: true }, (err) => {
			if (err) throw err;
			console.log('return false  ');
			return callback(da.path, da.size, filePath);
		});
	}else{
		console.log('Ordner Schon Vorhanden!');
		fs.readdir(dirPath, function(err, files) {
			console.log(files);
			if(files != undefined && files != "" ){
				files.forEach(file => {
					console.log('forEachfile = ' + file);
					if(file == "LT-Config.json"){
						console.log("LT-Config.json");
					}
				});
				console.log('return true  ');
				
			}else{
				console.log('return false  ');
				return callback(da.path, da.size, filePath);
			}
		});
	};
}
let LTsplit = function LTsplit(CompressedDIR, FileSize, fileName) {
   var isFile
   var isDirectory
   fs.lstat(CompressedDIR, (err, stats) => {
	   if(err)
	   return console.log(err); //Handle error
	   mainWindow.webContents.send('DOM', {"id": "#split-file", "show": false} );
	   
	   isFile = stats.isFile()
	   isDirectory = stats.isDirectory()

	   if(isDirectory) {
		   console.log('Muss gepackt sein also eine Datei Kein Ordner!'); 
	   }else if(isFile) {
		   var t_start, t_end;
		   t_start = new Date().getTime();
		   // Code, dessen Ausführungszeit wir messen wollen Start

		   FileSize = FileSize * 1000000;
		   splitFile.splitFileBySize(CompressedDIR, FileSize, fileName).then((names) => {
			   console.log("Names = " + names[0]);
			   console.log("Name = " + stats.name);
			   
			   // Code, dessen Ausführungszeit wir messen wollen End
			   t_end = new Date().getTime()
			   t_end = t_end - t_start;
			   t_end = t_end / 1000;
			   t_end = parseFloat(Math.round(t_end * 100) / 100).toFixed(2);

			   if(t_end >= 60){
				   t_end = t_end / 60;
				   t_end = parseFloat(Math.round(t_end * 100) / 100).toFixed(2);
				   t_end += " Minuten"
			   }else{
				   t_end += " Sekunden"
			   }
			   mainWindow.webContents.send('DOM', {"id": "#time", "val": "wurden in " + t_end + " geteilt"} );
			   mainWindow.webContents.send('DOM', {"id": "#split-file", "show": true} );

		   }).catch((err) => {
			   console.log('Error: ', err);
		   });
	   }
   });

}
function filestats(path) { 
   fs.lstat(path, (err, stats) => {
   if(err)
	   return console.log(err); //Handle error
	   console.log(`Is file: ${stats.isFile()}`);
	   console.log(`Is directory: ${stats.isDirectory()}`);
	   console.log(`Is symbolic link: ${stats.isSymbolicLink()}`);
	   console.log(`Is FIFO: ${stats.isFIFO()}`);
	   console.log(`Is socket: ${stats.isSocket()}`);
	   console.log(`Is character device: ${stats.isCharacterDevice()}`);
	   console.log(`Is block device: ${stats.isBlockDevice()}`);   
   });
}
//Input Data is array
function ipscan(data){
   var alive = [];
		 var i = data.length;
		 data.forEach(function(host){
			 ping.sys.probe(host, function(isAlive){
				 if(isAlive == true){
					 alive.push(host);			  		
				 }
				 i--
				 if(i==0){
					 console.log(alive)
					 
			   }
		   });
	   });
}
// Handle add item window
function createloginWindow(){
	pwWindow = new BrowserWindow({
	  width: 300,
	  height:200,
	  title:'Login'
	});
	pwWindow.loadURL(url.format({
	  pathname: path.join(__dirname, 'public/pwWindow.html'),
	  protocol: 'file:',
	  slashes:true
	}));
	// Handle garbage collection
	pwWindow.on('close', function(){
	  pwWindow = null;
	});
  }
