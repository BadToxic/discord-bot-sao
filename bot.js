// let Discord = require('discord.io');
let Discord = require('discord.js');
let logger = require('winston');
let auth = require('./auth.json');

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
'**sao map** <Map name>  |  Shows the information about this map (monsters, NPCs & portals)';

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