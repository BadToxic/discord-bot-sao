const Discord = require('discord.js');
const logger = require('winston');
const auth = require('./auth.json');
const fs = require("fs");
const {Client} = require('pg');
const Jimp = require('jimp');
// let XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
// let $ = require('jquery');

const sao = require('./sao-if/sao-if.js'); // Sword Art Online: Integral Factor
const cr = require('./cr/cr.js'); // Clash Royale

const DISCORD_MESSAGE_MAX_LENGTH = 2000;

const fontSize = 30;
const fontSep = 4;
const timeZoneWidth = 42;

const fontPath = 'fonts/sao-font-28-black.fnt';

const useMock = false;

const availablePlayerAttributes = ['id', 'altid', 'img', 'image', 'picture', 'avatar', 'level', 'lv', 'lvl', 'time', 'timezone', 'utc'];

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
    colorize: true
});

logger.level = 'debug';

// Initialize Discord Bot
const bot = new Discord.Client(/*{
   token: auth.token,
   autorun: true
}*/);
bot.on('ready', (evt) => {
    logger.info('Connected');
    // logger.info('Logged in as: ');
    // logger.info(bot.username + ' - (' + bot.id + ')');
});

// Login to Discord with your app's token
bot.login(auth.token);

send = (message, answer, options) => {
	if (answer.length <= DISCORD_MESSAGE_MAX_LENGTH) {
		message.channel.send(answer, options);
		return;
	}
	// If answer is too long for discord, split it to multiple answers
	const splitter = (longAnswer, allowedLength) => {
		var strs = [];
		while(longAnswer.length > allowedLength){
			let pos = longAnswer.substring(0, allowedLength).lastIndexOf(' ');
			pos = pos <= 0 ? allowedLength : pos;
			strs.push(longAnswer.substring(0, pos));
			let spaceIndex = longAnswer.indexOf(' ', pos) + 1;
			if(spaceIndex < pos || spaceIndex > pos + allowedLength) {
				spaceIndex = pos;
			}
			longAnswer = longAnswer.substring(spaceIndex);
		}
		strs.push(longAnswer);
		return strs;
	}
	const answers = splitter(answer, DISCORD_MESSAGE_MAX_LENGTH);
	let answerIndex = 1;
	answers.forEach((singleAnswer) => {
		message.channel.send(singleAnswer, answerIndex === answers.length ? options : undefined);
		answerIndex++;
	});
};

function makeIteratorThatFillsWithColor(color){
	return function (x, y, offset) {
		this.bitmap.data.writeUInt32BE(color, offset, true);
	}
};
function lighten(x, y, idx) {
	function bound(value) {
		if (value > 255) {
			return 255;
		}
		return value;
	};
	this.bitmap.data[idx] = bound(this.bitmap.data[idx] * 1.5);
	this.bitmap.data[idx + 1] = bound(this.bitmap.data[idx + 1] * 1.5);
	this.bitmap.data[idx + 2] = bound(this.bitmap.data[idx + 2] * 1.5);
};

getRandomFile = (folder) => {
	let fs = require('fs');
	let files = fs.readdirSync(folder);
	return folder + files[Math.floor(Math.random() * files.length)];
};

getTimeStamp = (date) => {
   return ((date.getMonth() + 1) + '/' + (date.getDate()) + '/' + date.getFullYear() + " " + date.getHours() + ':'
		+ ((date.getMinutes() < 10) ? ("0" + date.getMinutes()) : (date.getMinutes())) + ':' + ((date.getSeconds() < 10) ? ("0" + date.getSeconds()) : (date.getSeconds())));
}

getDbClient = () => {
   return  new Client({
	  user: process.env.PGUSER,
	  password: process.env.PGPASSWORD,
	  database: process.env.PGDATABASE,
	  host: 'ec2-79-125-110-209.eu-west-1.compute.amazonaws.com',
	  port: 5432,
	  ssl: true
	});
}

saveJSON = (path, jsonObj, onSuccess, onError) => {
	logger.info('saveJSON: ' + path);
	
	fs.writeFile(path, JSON.stringify(jsonObj), (err) => {
		if (err) {
			logger.info('saveJSON: could not write file ' + path);
			if (onError) {
				onError();
			}
			return;
		};
		if (onSuccess) {
			onSuccess();
		}
	});
};
loadJSON = (path, onSuccess, onError) => {
	logger.info('loadJSON: ' + path);
	fs.exists(path, (exists) => {
		if (exists) {
			let contents = fs.readFileSync(path);
			if (onSuccess) {
				onSuccess(JSON.parse(contents));
			}
		} else if (onError) {
			onError();
		}
	});
};

removeSizeFromAvatarUrl = (user) => {
	user.avatarURL = user.avatarURL.replace(user.avatarURL.substring(user.avatarURL.indexOf('size='), user.avatarURL.length), '');
	return user;
};

loadUserAvatars = (rows, avatarSize) => {
	
	// Iterate all players (rows)
	let avatarPromises = [];
	rows.forEach((row) => {
		if (row.avatarURL !== undefined && row.avatarURL !== null) {
			row.avatarURL += 'size=' + avatarSize;
			avatarPromises.push(Jimp.read(row.avatarURL)
				.then((avatar) => {
					logger.info('Successfully loaded user discord avatar: ' + row.avatarURL);
					row.avatar = avatar;
					return new Promise((resolve, reject) => {
						resolve(avatar);
					});
				})
				.catch(err => {
					logger.info('Could not load user discord avatar: ' + row.avatarURL);
					row.avatarURL = undefined;
				})
			);
		}
	});
	
	return avatarPromises;
};

sendRandomFile = (message, folder) => {
	options = {
		files: [
			getRandomFile(folder)
		]
	}
    logger.info('Random file from ' + folder + ' -> ' + options.files[0]);
	send(message, '', options);
};

getUserAvatarUrls = (rows) => {
	rows.forEach((row) => {
		// logger.info('getUserAvatarUrls: row.discord_id: ' + row.discord_id);
		const user = bot.users.get(row.discord_id);
		if (user !== undefined) {
			row.avatarURL = user.avatarURL;
			if (row.avatarURL === null) {
				row.avatarURL = undefined;
			} else {
				row = removeSizeFromAvatarUrl(row);
			}
		}
	});
};

createTimezoneMap = (message, timezones, font, result) => {

	result.rows.sort((a, b) => (a.utc > b.utc) ? 1 : ((b.utc > a.utc) ? -1 : 0)); 

	let middle = 505;
	let y = 60;
	let avatarSize = 32;
	
	// Iterate all players that have a timezone
	let avatarPromises = loadUserAvatars(result.rows, avatarSize);
	
	let afterAvatarsLoadedCounter = 0;
	const afterAvatarsLoaded = () => {
		afterAvatarsLoadedCounter++;
		if (afterAvatarsLoadedCounter > 1) {
			logger.info('Called afterAvatarsLoaded again: ' + afterAvatarsLoadedCounter);
			return;
		}
		// logger.info('Called afterAvatarsLoaded');
		result.rows.forEach((row) => {
			
			if (row.utc < -12) {
				row.utc = -12;
			} else if (row.utc > 12) {
				row.utc = 12;
			}
			let x = middle + timeZoneWidth * row.utc;
			let xName;
			if (x < 4) {
				x = 4;
			}
			let xMarker = x - 6;
			let text = row.discord_name.trim();
			let widthName = Jimp.measureText(font, text);
			let widthTotal;
			
			if (row.avatar !== undefined) {
				widthTotal = widthName + avatarSize + 4;
			} else {
				widthTotal = widthName;
			}
			
			if (x + widthTotal >= timezones.bitmap.width - 4) {
				x = timezones.bitmap.width - widthTotal - 4;
			}
			if (xMarker < 2) {
				xMarker = 2;
			}
			
			if (row.avatar !== undefined) {
				xName = x + avatarSize + 4;
			} else {
				xName = x;
			}
			
			// Draw background rectangle
			timezones.scan(xName - 2, y, widthName + 2, fontSize, lighten);
			
			// Draw avatar 
			if (row.avatar !== undefined) {
				// logger.info('Before Blit ' + text + ' (' + x + ', ' + y + ')');
				timezones.blit(row.avatar, x, y - 1);
				x += avatarSize + 4;
			}
			
			// Draw little marker
			timezones.scan(xMarker, y - 4, 8, 8, makeIteratorThatFillsWithColor(0x0030a1df));
			
			// Print name
			timezones.print(font, xName, y, text);
			
			y += fontSize + fontSep;
		});
		
		// Save on server
		timezones.write('./img/timezones-filled.jpg');
		
		send(message, 'Players with registered timezones:', {files: ['./img/timezones-filled.jpg']});
		logger.info('Timezones and users with avatars fetched and image created.');
	};
	Promise.all(avatarPromises).then((values) => {
		afterAvatarsLoaded();
	}).catch(err => {
		logger.info('Error while resolving user discord avatars: ' + err);
		afterAvatarsLoaded();
	});
};

handleCmdTimezones = (tableName, message) => {
	Jimp.read('./img/timezones.jpg', (err, timezones) => {
		if (err) {
			throw err;
		}
		Jimp.loadFont(fontPath).then(font => {
			let mapResults;
			if (useMock) { // Mock data
				mapResults = createTimezoneMap(message, timezones, font, mocks.timezone);
			} else {
				const db = getDbClient();
				db.connect(connectionErr => {
					if (connectionErr) {
						answer = 'Sorry, I could not connect to the database.'
						logger.info('Could not connect to database.');
						logger.info(connectionErr);
						send(message, answer);
					} else {
						const query = 'SELECT discord_name, utc, discord_id FROM ' + tableName + ' WHERE utc IS NOT NULL;'
						db.query(query, (err, result) => {
							if (err) {
								logger.info('Error on querry!');
								logger.info(err);
								answer = 'Error: No players found.';
								send(message, answer);
							} else if (result.rowCount === 0) {
								answer = 'No players with timezone found.';
								send(message, answer);
							} else {
								// Search the user discord avatar urls
								getUserAvatarUrls(result.rows);
								
								createTimezoneMap(message, timezones, font, result);
							}
							db.end();
						});
					}
				});
			}
		});
	});
};

bot.on('message', (message) => {
	
	controller = {
		logger: logger,
		Jimp: Jimp,
		send: send,
		getUserAvatarUrls: getUserAvatarUrls,
		sendRandomFile: sendRandomFile,
		loadUserAvatars: loadUserAvatars,
		removeSizeFromAvatarUrl: removeSizeFromAvatarUrl,
		getDbClient: getDbClient,
		getTimeStamp: getTimeStamp,
		makeIteratorThatFillsWithColor: makeIteratorThatFillsWithColor,
		handleCmdTimezones: handleCmdTimezones,
		fontPath: fontPath
	}
	
	// message.content = message.content.toLowerCase();
	
    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `!`
    if (message.content.substring(0, 1) === '!') {
        let args = message.content.substring(1).split(' ');
        let cmd = args[0];
       
        switch(cmd) {
            case 'ping':
				send(message, 'Pong!');
				break;
         }
     } else if (message.content.substring(0, 3).toLowerCase() === 'sao') {
        sao.handle(controller, message);
     } else if (message.content.substring(0, 2).toLowerCase() === 'cr') {
        cr.handle(controller, message);
     }
});