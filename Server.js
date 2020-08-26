// Constants //
const dgram = require('dgram');
const bcrypt = require('bcrypt')
const request = require('request')
const fs = require('fs');
const server = dgram.createSocket('udp4');

// Variables //
var database = JSON.parse( fs.readFileSync( 'Database.json' ) );
var logURL = ""

// Server functions //
function handleMessage(action, data, ip, port) {
    if (action == 'register') {
        // Check for variables
        if (data.username && data.password) {
            // Check if name and password is valid
            if (data.username.match(/^[A-Za-z0-9]+$/g) == null || data.password.match(/^[A-Za-z0-9]+$/g) == null) {
                server.send(JSON.stringify({
                    status: 0,
                    message: "Invalid username or password."
                }), port, ip);
            } else {
                // Check if username is taken
                if (database[data.username] !== undefined) {
                    server.send(JSON.stringify({
                        status: 0,
                        message: "Username taken."
                    }), port, ip);
                } else {
                    // Add user to database
                    database[data.username] = {
                        password: bcrypt.hashSync(data.password, 10),
                        points: 0,
                        debounce: 0
                    };
                    server.send(JSON.stringify({
                        status: 1,
                        message: "Success!"
                    }), port, ip);
                }
            }
        }
    }

    if (action == 'login') {
        // Check for variables
        if (data.username && data.password) {
            // Check if name and password is valid
            if (data.username.match(/^[A-Za-z0-9]+$/g) == null || data.password.match(/^[A-Za-z0-9]+$/g) == null) {
                server.send(JSON.stringify({
                    status: 0,
                    message: "Invalid username or password."
                }), port, ip);
            } else {
                // Check if username is valid
                if (database[data.username] == undefined) {
                    server.send(JSON.stringify({
                        status: 0,
                        message: "Invalid credentials."
                    }), port, ip);
                } else {
                    // Check credentials
                    if (bcrypt.compareSync(data.password, database[data.username].password)) {
                        server.send(JSON.stringify({
                            status: 1,
                            message: "Success!"
                        }), port, ip);
                    } else {
                        server.send(JSON.stringify({
                            status: 0,
                            message: "Invalid credentials."
                        }), port, ip);
                    }
                }
            }
        }
    }

    if (action == 'add_point') {
        // Check for variables
        if (data.username && data.password) {
            // Check if name and password is valid
            if (data.username.match(/^[A-Za-z0-9]+$/g) == null || data.password.match(/^[A-Za-z0-9]+$/g) == null) {
                server.send(JSON.stringify({
                    status: 0,
                    message: "Invalid username or password."
                }), port, ip);
            } else {
                // Check if username is valid
                if (database[data.username] == undefined) {
                    server.send(JSON.stringify({
                        status: 0,
                        message: "Invalid credentials."
                    }), port, ip);
                } else {
                    // Check credentials
                    if (bcrypt.compareSync(data.password, database[data.username].password)) {
                        // Check if points can be added
                        var secondsSinceEpoch = Math.round(new Date().getTime() / 1000)
                        if (secondsSinceEpoch - database[data.username].debounce > 2)
                            database[data.username].points++;

                        server.send(JSON.stringify({
                            status: 1,
                            message: "Success!"
                        }), port, ip);
                        request.post(logURL, {
                            json: {
                                content: data.username + " | Added 1 point. | " + database[data.username].points + " points."
                            }
                        })
                    } else {
                        server.send(JSON.stringify({
                            status: 0,
                            message: "Invalid credentials."
                        }), port, ip);
                    }
                }
            }
        }
    }

    if (action == 'get_points') {
        // Check for variables
        console.log('retreive')
        if (data.username) {
            // Check if name is valid
            if (data.username.match(/^[A-Za-z0-9]+$/g) == null) {
                server.send(JSON.stringify({
                    status: 0,
                    message: "Invalid username."
                }), port, ip);
            } else {
                // Check if username is valid
                if (database[data.username] == undefined) {
                    server.send(JSON.stringify({
                        status: 0,
                        message: "Invalid username."
                    }), port, ip);
                } else {
                    // Send back points
                    server.send(JSON.stringify({
                        status: 1,
                        message: database[data.username].points
                    }), port, ip);
                }
            }
        }
    }
}

// Server events //
server.on('listening', () => {
    const address = server.address();
    console.log(`[hackBlade] started listening on port ${address.port}`);
});

server.on('error', (err) => {
    // Log error stack
    console.log(`[hackBlade] an error occurred.`);
    console.log(err.stack);

    // Close server to prevent client issues
    server.close();
});

server.on('message', (msg, rinfo) => {
    // Refresh database
    database = JSON.parse( fs.readFileSync( 'Database.json' ) );

    // Send information to handler
    var actionobject = JSON.parse(msg.toString());
    handleMessage( actionobject.action, actionobject.data, rinfo.address, rinfo.port );

    // Save to database
	fs.writeFileSync('Database.json', JSON.stringify(database, null, 4));
});
server.bind(6969)