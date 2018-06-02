// let Discord = require('discord.io');
let Discord = require('discord.js');
let logger = require('winston');
let auth = require('./auth.json');
let fs = require("fs");
let {Client} = require('pg');
// let XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
// let $ = require('jquery');

let mobs = require('./data/mobs.json');
let items = require('./data/items.json');
let maps = require('./data/maps.json');

let help = 
'Notice: When using a command do not include "<" and ">".\n' +
'(Example: sao mob Frenzy Boar)\n\n' +

'**sao help**  |  Displays this help message.\n\n' +

'***Ask information***\n' +
'**sao mob**  |  Lists all mobs currently registered\n' +
'**sao mob** <Mob name>  |  Shows the information about this mob (drops & locations)\n' +
'**sao boss**  |  Lists all bosses currently registered\n' +
'**sao boss** <Boss name>  |  Shows the information about this boss (drops & locations)\n' +
'**sao item**  |  Lists all items currently registered\n' +
'**sao item** <Item name>  |  Shows the information about this item (dropping monsters)\n' +
'**sao map**  |  Lists all maps currently registered\n' +
'**sao map** <Map name>  |  Shows the information about this map (monsters, NPCs & portals)\n' +
'**sao info** <Username>  |  Asks for information about this user\n' +
'**sao set** <attribute> <value>  |  Sets the value for my own attribute';

let availablePlayerAttributes = ['id', 'altid', 'img', 'image', 'level', 'lv'];

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
    colorize: true
});

logger.level = 'debug';

// Initialize Discord Bot
let bot = new Discord.Client(/*{
   token: auth.token,
   autorun: true
}*/);
bot.on('ready', (evt) => {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');
});

// Login to Discord with your app's token
bot.login(auth.token);


send = (message, answer, options) => {
	message.channel.send(answer, options);
};

getBosses = () => {
	let bosses = {};
	for (let mobName in mobs) {
		if (mobs.hasOwnProperty(mobName)) {
			let mob = mobs[mobName];
			if (mob['isBoss']) {
				bosses[mobName] = mob;
			}
		}
	}
	return bosses;
};

getMobsWithItem = (itemName) => {
	let mobsWithItem = {};
	let foundMobs = false;
	for (let mobName in mobs) {
		if (mobs.hasOwnProperty(mobName)) {
			let mob = mobs[mobName];
			if (mob['drops'].indexOf(itemName) != -1) {
				mobsWithItem[mobName] = mob;
				foundMobs = true;
			}
		}
	}
	return foundMobs ? mobsWithItem : undefined;
};

getMobsOnMap = (mapName) => {
	let mobsOnMap = {};
	let foundMobs = false;
	for (let mobName in mobs) {
		if (mobs.hasOwnProperty(mobName)) {
			let mob = mobs[mobName];
			if (mob['maps'].indexOf(mapName) != -1) {
				mobsOnMap[mobName] = mob;
				foundMobs = true;
			}
		}
	}
	return foundMobs ? mobsOnMap : undefined;
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

/*loadJSONxhr = (path, onSuccess, onError) => {
    let xhr = new XMLHttpRequest();
	logger.info('loadJSONxhr: ' + path);
    xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) { // 4: DONE
			// logger.info('DONE status: ' + xhr.status);
            if (xhr.status === 200) {
                if (onSuccess) {
                    onSuccess(JSON.parse(xhr.responseText));
				}
            } else if (onError) {
				onError(xhr);
            }
        }
    };
    xhr.open("GET", path, true);
    xhr.send();
};*/
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

// Command handlers
handleCmdMob = (message, boss) => {
    let args = message.content.substring(4).split(' ');
	let mobName = args.splice(1, args.length - 1).join(' ');
	let answer;
	let options;
	let mobsToCheck = boss ? getBosses() : mobs;
	logger.info('handleCmdMob for (boss only: ' + boss + ') ' + mobName);
	if (mobName === '') {
		answer = 'List of all registered ' + (boss ? 'bosses' : 'monsters') + ':\n***' + Object.keys(mobsToCheck).join('***, ***') + '***'
	} else {
		let mob = mobsToCheck[mobName];
		if (mob === undefined) {
			answer = (boss ? 'Boss' : 'Monster')  + ' ***' + mobName + '*** is unknown. Did you write it correctly?';
		} else {
			answer = '**' + mobName + '** drops: ***' + mob.drops.join('***, ***') + '***\n' +
							  'and can be found at: ***' + mob.maps.join('***, ***') + '***';
			options = {
				files: [
					'./img/mobs/' + mobName.toLowerCase().split(' - ').join('-').split(' ').join('-') + '.jpg'
				]
			}
		}
	}
	send(message, answer, options);
};

handleCmdItem = (message) => {
    let args = message.content.substring(4).split(' ');
	let itemName = args.splice(1, args.length - 1).join(' ');
	let answer;
	let options;
	logger.info('handleCmdItem for ' + itemName);
	if (itemName === '') {
		answer = 'List of all registered items:\n***' + Object.keys(items).join('***, ***') + '***'
	} else {
		let mobsWithItem = getMobsWithItem(itemName);
		if (mobsWithItem === undefined) {
			answer = 'Item ***' + itemName + '*** is unknown. Did you write it correctly?';
		} else {
			answer = '**' + itemName + '** is droped by: ***' + Object.keys(mobsWithItem).join('***, ***') + '***';
			/*options = {
				files: [
					'./img/items/' + itemName.toLowerCase().split(' - ').join('-').split(' ').join('-') + '.jpg'
				]
			}*/
		}
	}
	send(message, answer, options);
};

handleCmdPlayer = (message) => {
    let args = message.content.substring(4).split(' ');
	let playerID = args.splice(1, args.length - 1).join(' ');
	logger.info('handleCmdPlayer for ' + playerID);
	if (playerID === '') {
		// answer = 'List of all registered playerName:\n***' + Object.keys(maps).join('***, ***') + '***' // TODO
	} else {
		let answer;
		let options;
		// playerID = playerID.replace(/[<@!>]/g, '');
		// This can only be used when on same server:
		const player = message.mentions.members.first();
		/*bot.fetchUser(playerID).then(player => {
			// Do some stuff with the user object.
			logger.info('player:');
			logger.info(player);
		}, rejection => {
			// Handle the error in case one happens (that is, it could not find the user.)
			logger.info('No player with id ' + playerID + ' found.');
		});*/
		
		if (player === undefined || player === null) {
			answer = 'Player is unknown. Did you write him correctly?';
			send(message, answer);
			return;
		}
		
		const db = getDbClient();
		db.connect(connectionErr => {
			if (connectionErr) {
				answer = 'Sorry, I could not connect to the database.'
				logger.info('Could not connect to database.');
				logger.info(connectionErr);
				send(message, answer);
			} else {
				// logger.info('db connected');
				const query = 'SELECT * FROM players WHERE discord_id = \'' + player.id + '\';'
				// logger.info(query);
				db.query(query, (err, result) => {
					if (err) {
						logger.info('Error on querry!');
						logger.info(err);
						answer = 'Error: No info for player ***' + player.username + '*** found.';
					} else if (result.rowCount === 0) {
						answer = 'No info for player ***' + player.username + '*** found.';
					} else {
						const row = result.rows[0];
						// logger.info('result:');
						// logger.info(result);
						answer = '**' + row.discord_name + '**\n';
						if (row.sao_level) {
							answer += '**Level: ' + row.sao_level + '**\n';
						}
						if (row.sao_id) {
							answer += '**ID: ' + row.sao_id + '**\n';
						}
						if (row.sao_alt_id) {
							answer += 'Second Account ID: ' + row.sao_alt_id + '\n';
						}
						if (row.sao_image) {
							options = {files: [row.sao_image]};
						}
					}
					send(message, answer, options);
					db.end();
				});
			}
        });
	}
};

handleCmdSet = (message) => {
    let args = message.content.substring(4).split(' ');
	let attributeName = args[1];
	let attributeValue = args[2];
	let answer;
	
	const player = message.author; // message.mentions.members.first();
	
	// let playerName = message.author.username;
	logger.info('handleCmdSet ' + attributeName + ' = ' + attributeValue + ' for user ' + player.username + ' (' + player.id + ')');
	if (attributeName === undefined) {
		answer = 'What attribute value do you want to set? Use ***sao set <attribute> <value>***';
	} else if (availablePlayerAttributes.indexOf(attributeName) === -1) {
		answer = 'You are not allowed to set the attribute ***' + attributeName + '***';
	} else if (attributeValue === undefined && attributeName != 'img' && attributeName != 'image') {
		answer = 'A value is needed. Use ***sao set <attribute> <value>***';
	} else {
		// let fileName = 'data/players/' + playerName.toLowerCase() + '.json';
		let sqlAttributeName;
		if (attributeName === 'image' || attributeName === 'img') {
			if (message.attachments.length === 0) {
				answer = 'There is no picture attached to your message.';
				send(message, answer);
				return;
			}
			sqlAttributeName = 'sao_image';
			message.attachments.forEach(messageAttachment => {
				attributeValue = messageAttachment.url;
			});
		} else if (attributeName === 'level' || attributeName === 'lv') {
			sqlAttributeName = 'sao_level';
		} else if (attributeName === 'id') {
			sqlAttributeName = 'sao_id';
		} else if (attributeName === 'altid') {
			sqlAttributeName = 'sao_alt_id';
		}
		
		const db = getDbClient();
		db.connect(connectionErr => {
			if (connectionErr) {
				answer = 'Sorry, I could not connect to the database.'
				logger.info('Could not connect to database.');
				logger.info(connectionErr);
				send(message, answer);
			} else {
				// logger.info('db connected');
				const now = '\'' + getTimeStamp(new Date()) + '\'';
				const query = 'INSERT INTO players (discord_id, discord_name, created, updated, ' + sqlAttributeName + ') '
					+ 'VALUES (\'' + player.id + '\', \'' + player.username + '\', ' + now + ', ' + now + ', \'' + attributeValue + '\') '
					+ 'ON CONFLICT (discord_id) '
					+ 'DO UPDATE SET discord_name = Excluded.discord_name, updated = Excluded.updated, ' + sqlAttributeName + ' = Excluded.' + sqlAttributeName + ';'
				// logger.info(query);
				db.query(query, (err, result) => {
					if (err) {
						logger.info('Error on querry!');
						logger.info(err);
						answer = 'Sorry ' + player.username + ', I failed to set ' + attributeName + '  = ' + attributeValue;
					} else {
						// logger.info('result:');
						// logger.info(result);
						answer = 'Successfully set ' + attributeName + '  = ' + attributeValue + ' for ' + player.username;
					}
					send(message, answer);
					db.end();
				});
			}
        });
		return;
    }
	send(message, answer);
};

handleCmdMap = (message) => {
    let args = message.content.substring(4).split(' ');
	let mapName = args.splice(1, args.length - 1).join(' ');
	let answer;
	let options;
	logger.info('handleCmdMap for ' + mapName);
	if (mapName === '') {
		answer = 'List of all registered maps:\n***' + Object.keys(maps).join('***, ***') + '***'
	} else {
		let map = maps[mapName];
		if (map === undefined) {
			answer = 'Map ***' + mapName + '*** is unknown. Did you write it correctly?';
		} else {
			let mobsOnMap = getMobsOnMap(mapName);
			if (mobsOnMap === undefined) {
				answer = 'Map ***' + mapName + '*** dosn\'t hold any mobs.';
			} else {
				answer = '**' + mapName + '** holds the following mobs: ***' + Object.keys(mobsOnMap).join('***, ***') + '***';
			}
			answer += '\nNPCs: ***' + map.npcs.join('***, ***') + '***\nPortals: ***' + map.portals.join('***, ***') + '***';
			options = {
				files: [
					'./img/maps/' + mapName.toLowerCase().split(' - ').join('-').split(' ').join('-') + '.jpg'
				]
			}
		}
	}
	send(message, answer, options);
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

handleCmdMeme = (message) => {
	sendRandomFile(message, './img/memes/');
};
handleCmdGirl = (message) => {
	sendRandomFile(message, './img/girls/');
};

bot.on('message', message => {
	
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
        let args = message.content.substring(4).split(' ');
        logger.info(args);
        let cmd = args[0];
       
        // args = args.splice(1);
        switch(cmd) {
            case 'ping':
				send(message, 'Pong!');
				break;
            case 'h':
            case 'help':
				send(message, help);
				break;
            case 'player':
            case 'players':
            case 'info':
				handleCmdPlayer(message);
				break;
            case 'set':
				handleCmdSet(message);
				break;
            case 'mob':
            case 'mobs':
            case 'monster':
            case 'monsters':
				handleCmdMob(message, false);
				break;
            case 'boss':
				handleCmdMob(message, true);
				break;
            case 'item':
            case 'items':
            case 'drop':
            case 'drops':
				handleCmdItem(message);
				break;
            case 'map':
            case 'maps':
				handleCmdMap(message);
				break;
            case 'meme':
            case 'memes':
				handleCmdMeme(message);
				break;
            case 'girl':
            case 'girls':
				handleCmdGirl(message);
				break;
			default:
				send(message, 'Sorry, I don\'t know the command ***' + cmd + '***.\nType *sao help* for a list of the available commands.');
         }
     }
});