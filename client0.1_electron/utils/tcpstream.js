/*
 * Utility functions for all sort of Object, Array and string operations
 * Initial author: Steffen Reimann
 * Created: 19.07.2019
 */
const path = require('path');
var fs = require('fs')
var Server = require('fast-tcp').Server;
var server = new Server(); 
var Socket = require('fast-tcp').Socket;
var socket = [];
var messure = require('./messure.js'); 

 /**
 * Creates TCP Server
 * @param number {number}
 * @return {Object} {error:boolean, obj:cloned object}
 */
function runTCP_Server(port, dir) {
    console.log('TCP Server Starting ...');
    server.on('connection', function (socket) {
        //console.log(socket);
        console.log('TCP Server Client Connection ...');
        socket.on('login', function (username) {
          console.log('Trying to login: ' + username);
        });
        socket.on('LT-Broadcast', function (data) {
          console.log('LT-Broadcast');
          console.log(data);
        });
        socket.on('download', function (info) {
            console.log('Server Download request from client');
            const readStream = fs.createReadStream(info.path);
            var WriteStream = server.stream('download');
            readStream.on('data', function(data){
                console.log('data download');
                const isReady = WriteStream.write(data);
                if(!isReady){
                    //wird der Inputstream gestoppt
                    readStream.pause();
                    //ist der resultstream wieder aufnahmefähig 
                    WriteStream.once('drain', function(){
                        //wird der inputstream gestartet
                        readStream.resume();
                    });  
                }
            });
            readStream.on('end', function() {
                WriteStream.end();
                console.log("File end");
            });
        });
        socket.on('upload', function (readStream, info) {
            var str = JSON.stringify(info.client); 
            console.log('Server upload new path');
            var base = path.basename(info.path)
            var tmp_path = path.join(dir, str + base)
            console.log(base);
            console.log(tmp_path);
            const Wstream = fs.createWriteStream(tmp_path);
            readStream.on('data', function(data){
                const isReady = Wstream.write(data);
                if(!isReady){
                    //wird der Inputstream gestoppt
                    readStream.pause();
                    //ist der resultstream wieder aufnahmefähig 
                    Wstream.once('drain', function(){
                        //wird der inputstream gestartet
                        readStream.resume();
                    });  
                }
            });
            readStream.on('end', function() {
                Wstream.end();
                console.log("File end");
            });
        });
    });
    server.listen(port);
}


 /**
 * Stops TCP Server 
 * @param obj {Object}
 * @return {Object} {error:boolean, obj:cloned object}
 */
function stopTCP_Server(port) {
    
}


 /**
 * Start an Client connection to server
 * @param host string
 * @param port number
 * @return 
 */
function runTCP_Client(host, port) {
    // Client
    socket.push(new Socket({
        host: host,
        port: port
    }));
    console.log(socket); 
    //socket.emit('login', 'alejandro');
}

 /**
 * Stops an Client connection to server
 * @param obj {Object}
 * @return {Object} {error:boolean, obj:cloned object}
 */
function stopTCP_Client(port) {
    
}

 /**
 * Stops an Client connection to server
 * @param obj {Object}
 * @return {Object} {error:boolean, obj:cloned object}
 */
function upload2server(params) {
    
}


function download(path, file, server) {
    var startTime = Date.now();
    console.log(file);
    console.log(server);
    console.log('Client Download request to server');
            //var base = path.basename(info.path)
            ///var tmp_path = path.join(dir, str + base)
            //console.log(base);
            //console.log(tmp_path);
    
    socket[server].emit('download', {'path': file, 'client': server});

    socket[server].on('download', function (readStream, info) {
            
        const WriteStream = fs.createWriteStream(path);
        readStream.on('data', function(data){
            const isReady = WriteStream.write(data);
            if(!isReady){
                //wird der Inputstream gestoppt
                readStream.pause();
                //ist der resultstream wieder aufnahmefähig 
                WriteStream.once('drain', function(){
                    //wird der inputstream gestartet
                    readStream.resume();
                });  
            }
        });
        readStream.on('end', function() {
            WriteStream.end();
            console.log("File end");
        });
    });

}

 /**
 * Upload an File to server
 * @param obj {Object}
 * @return {Object} {error:boolean, obj:cloned object}
 */
function upload(file, server) {
    var startTime = Date.now();
    //const inpu = fs.createReadStream('./games/GOPR0292.zip');
    console.log(file);
    console.log(fs.lstatSync(file).isFile());
    const inpu = fs.createReadStream(file);
    var inpu_size = 0
    //socket.emit('login', new User('alex', '1234'));
    var writeStream = socket[server].stream('upload', {'path': file, 'client': server});
    console.log('write stream to server ' + server);
    //fs.createReadStream('./games/img.zip').pipe(writeStream);

    inpu.on('data', function(data){

        var datas = messure.streamSize(data.length, true, "localhost" );
        inpu_size = inpu_size + datas.size;
        
        var sectionTime = Date.now() - startTime;
        sectionTime = sectionTime / 1000;
        //Schreibt Datenstream in result 
        const isReady = writeStream.write(data);
        //Wenn Result nicht Bereit ist 
        if(!isReady){
            //wird der Inputstream gestoppt
            inpu.pause();
            //ist der resultstream wieder aufnahmefiähig 
            writeStream.once('drain', function(){
                //wird der inputstream gestartet
                inpu.resume();
            });      
        }
    })
    inpu.on('end', function(data){
        writeStream.end();
        console.log('-- END --');
        console.log(inpu_size);
        var fullTime = Date.now() - startTime;
        fullTime = fullTime / 1000;
        var speed = messure.speed(inpu_size, fullTime)
        console.log(fullTime);
        console.log(speed);
        //console.log(datas);
        
        return messure.streamAnalyse(true, speed, inpu_size, "localhost");
    })
    inpu.on('error', function(data){
        console.log('-- ERROR --');
        console.log(data);
        return data
    })	
}


module.exports = {
    runServer: runTCP_Server,
    stopServer: stopTCP_Server,
    runClient: runTCP_Client,
    stopClient: stopTCP_Client,
    upload: upload,
    download: download
  };