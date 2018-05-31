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

let availablePlayerAttributes = ['id', 'img', 'image'];

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

let db = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});
/*db.connect();

db.query('SELECT table_schema,table_name FROM information_schema.tables;', (err, res) => {
  if (err) throw err;
  for (let row of res.rows) {
    console.log(JSON.stringify(row));
  }
  db.end();
});*/

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
	let playerName = args.splice(1, args.length - 1).join(' ');
	logger.info('handleCmdPlayer for ' + playerName);
	if (playerName === '') {
		// answer = 'List of all registered playerName:\n***' + Object.keys(maps).join('***, ***') + '***' // TODO
	} else {
		let answer;
		let options;
		let fileName = 'data/players/' + playerName.toLowerCase() + '.json';
		loadJSON(fileName, (player) => {
			logger.info('player info ' + playerName);
			logger.info(player);
			answer = '**' + playerName + '**:\n ID: ' + player.id;
			if (player.image != undefined) {
				options = {files: [player.image]};
			}
			send(message, answer, options);
		}, () => {
			logger.info('handleCmdPlayer error loading file ' + fileName);
			// logger.info(xhr);
			answer = 'Player ***' + playerName + '*** is unknown. Did you write him correctly?';
			send(message, answer, options);
		});
	}
};

handleCmdSet = (message) => {
    let args = message.content.substring(4).split(' ');
	let attributeName = args[1];
	let attributeValue = args[2];
	let playerName = message.author.username;
	logger.info('handleCmdSet ' + attributeName + '  = ' + attributeValue + ' for user ' + playerName);
	if (attributeName === undefined) {
		answer = 'What attribute value do you want to set? Use ***sao set <attribute> <value>***';
	} else if (availablePlayerAttributes.indexOf(attributeName) === -1) {
		answer = 'You are not allowed to set the attribute ***' + attributeName + '***';
	} else if (attributeValue === undefined && attributeName != 'img' && attributeName != 'image') {
		answer = 'A value is needed. Use ***sao set <attribute> <value>***';
	} else {
		let answer;
		let fileName = 'data/players/' + playerName.toLowerCase() + '.json';
		if (attributeName === 'image' || attributeName === 'img') {
			if (message.attachments.length === 0) {
				answer = 'There is no picture attached to your message.';
				send(message, answer);
				return;
			}
			attributeName = 'image';
			// logger.info('message.attachments:');
			// logger.info(message.attachments);
			message.attachments.forEach(messageAttachment => {
				attributeValue = messageAttachment.url;
				// answer = 'Stored image for ' + playerName;
				// send(message, answer, {files: [messageAttachment.url]});
			});
		}
		let setAttribute = (player) => {
			player[attributeName] = attributeValue;
			saveJSON(fileName, player, () => {
				answer = 'Successfully set ' + attributeName + '  = ' + attributeValue + ' for ' + playerName;
				send(message, answer);
			}, () => {
				answer = 'Sorry ' + playerName + ', I failed to set ' + attributeName + '  = ' + attributeValue;
				send(message, answer);
			});
		};
		loadJSON(fileName, (player) => {
			logger.info('player info ' + playerName);
			logger.info(player);
			setAttribute(player);
		}, () => {
			logger.info('handleCmdSet file doesn\'t exist yet: ' + fileName);
			setAttribute({});
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
     } else if (message.content.substring(0, 3) === 'sao') {
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