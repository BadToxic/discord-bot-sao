// let Discord = require('discord.io');
const Discord = require('discord.js');
const logger = require('winston');
const auth = require('./auth.json');
const fs = require("fs");
const {Client} = require('pg');
const Jimp = require('jimp');
// let XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
// let $ = require('jquery');

const mobs = require('./data/mobs.json');
const items = require('./data/items.json');
const maps = require('./data/maps.json');
const skills = require('./data/skills.json');
const mocks = require('./data/mocks.json');

const DISCORD_MESSAGE_MAX_LENGTH = 2000;

const fontSize = 30;
const fontSep = 4;
const timeZoneWidth = 42;
// const fontPath = 'node_modules/@jimp/plugin-print/fonts/open-sans/open-sans-' + fontSize + '-black/open-sans-' + fontSize + '-black.fnt';
const fontPath = 'fonts/sao-font-28-black.fnt';

const useMock = false;

const availablePlayerAttributes = ['id', 'altid', 'img', 'image', 'level', 'lv', 'lvl', 'time', 'timezone', 'utc'];

const help = 
'Notice: When using a command do not include "<" and ">".\n' +
'(Example: sao mob Frenzy Boar)\n\n' +

'**sao help**  |  Displays this help message.\n\n' +

'***Ask information***\n' +
'**sao [mob, mobs, monster, monsters]**  |  Lists all mobs currently registered\n' +
'**sao [mob, mobs, monster, monsters]** <Mob name>  |  Shows the information about this mob (drops & locations)\n' +
'**sao [boss, bosses]**  |  Lists all bosses currently registered\n' +
'**sao [boss, bosses]** <Boss name>  |  Shows the information about this boss (drops & locations)\n' +
'**sao [item, items, drop, drops]**  |  Lists all items currently registered\n' +
'**sao [item, items, drop, drops]** <Item name>  |  Shows the information about this item (dropping monsters)\n' +
'**sao [skill, skills]**  |  Lists all skills currently registered\n' +
'**sao [skill, skills]** <Skill name>  |  Shows the information about this skill (image of skill record)\n' +
'**sao [skill, skills] [person, character, player, by, of]** <Person name> |  Lists all currently registered skills of this person\n' +
'**sao [skill, skills] [weapon, arm, for]** <Weapon name> |  Lists all currently registered skills for this weapon\n' +
'**sao [skill, skills] [star, stars]** <Number of stars> |  Lists all currently registered skills with this amount of stars\n' +
'**sao [map, maps]**  |  Lists all maps currently registered\n' +
'**sao [map, maps]** <Map name>  |  Shows the information about this map (monsters, NPCs & portals)\n' +
'**sao [info, player, players]**  |  Lists all players currently registered\n' +
'**sao [info, player, players]** <Username>  |  Asks for information about this user\n' +
'**sao set [' + availablePlayerAttributes.join(', ') + ']** <value>  |  Sets the value for my own attribute\n' +
'      If you choose to set your image you have to send it in the same message instead of a value.\n' +
'**sao rank**  |  Lists all players sorted by their level\n' +
'**sao [time, timezone, timezones, utc]**  |  Get a map of the players\' timezones\n\n' +

'***For Fun***\n' +
'**sao [meme, memes]**  |  Get a random SAO meme\n' +
'**sao [girl, girls]**  |  Get a random SAO girl';


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

capitalizeFirstLetter = (stringToChange) => {
    return stringToChange.charAt(0).toUpperCase() + stringToChange.slice(1);
}
capitalizeFirstLetters = (stringToChange) => {
    return stringToChange.split(' ').map(capitalizeFirstLetter).join(' ');
}

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

getSkillsWithPerson = (personName) => {
	let skillsWithPerson = {};
	let foundSkills = false;
	for (let skillName in skills) {
		if (skills.hasOwnProperty(skillName)) {
			let skill = skills[skillName];
			if (skill['person'] === personName) {
				skillsWithPerson[skillName] = skill;
				foundSkills = true;
			}
		}
	}
	return foundSkills ? skillsWithPerson : undefined;
};
getSkillsForWeapon = (weaponName) => {
	let skillsForWeapon = {};
	let foundSkills = false;
	for (let skillName in skills) {
		if (skills.hasOwnProperty(skillName)) {
			let skill = skills[skillName];
			if (skill['weapon'] === weaponName) {
				skillsForWeapon[skillName] = skill;
				foundSkills = true;
			}
		}
	}
	return foundSkills ? skillsForWeapon : undefined;
};
getSkillsWithStars = (starNumber) => {
	let skillsWithStars = {};
	let foundSkills = false;
	for (let skillName in skills) {
		if (skills.hasOwnProperty(skillName)) {
			let skill = skills[skillName];
			if (skill['stars'] === starNumber) {
				skillsWithStars[skillName] = skill;
				foundSkills = true;
			}
		}
	}
	return foundSkills ? skillsWithStars : undefined;
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
		let mobKeys = Object.keys(mobsToCheck);
		answer = 'List of all ' + mobKeys.length + ' registered ' + (boss ? 'bosses' : 'monsters') + ':\n***' + mobKeys.join(', ') + '***'
	} else {
		mobName = capitalizeFirstLetters(mobName);
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
		let itemKeys = Object.keys(items);
		answer = 'List of all ' + itemKeys.length + ' registered items:\n***' + itemKeys.join('***, ***') + '***'
	} else {
		itemName = capitalizeFirstLetters(itemName);
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

loadUserAvatars = (rows, avatarSize) => {
	
	// Iterate all players (rows)
	let avatarPromises = [];
	rows.forEach((row) => {
		if (row.avatarUrl !== undefined) {
			row.avatarUrl += 'size=' + avatarSize;
			avatarPromises.push(Jimp.read(row.avatarUrl)
				.then((avatar) => {
					// logger.info('Successfully loaded user discord avatar ' + row.discord_id + ' for timezone map: ' + row.avatarUrl);
					row.avatar = avatar;
					return new Promise((resolve, reject) => {
						resolve(avatar);
					});
				})
				.catch(err => {
					logger.info('Could not load user discord avatar ' + row.discord_id + ' for timezone map: ' + row.avatarUrl);
					row.avatarUrl = undefined;
				})
			);
		}
	});
	
	return avatarPromises;
};

createRankList = (rows) => {
	
	let avatarSize = 32;
	let avatarPromises = loadUserAvatars(rows, avatarSize);
	
	let afterAvatarsLoadedCounter = 0;
	const afterAvatarsLoaded = () => {
		afterAvatarsLoadedCounter++;
		if (afterAvatarsLoadedCounter > 1) {
			logger.info('Called afterAvatarsLoaded again: ' + afterAvatarsLoadedCounter);
			return;
		}
		
		logger.info('Called afterAvatarsLoaded');
		
		return new Promise(function(resolve, reject) {
			let topPromise = Jimp.read('./img/profile/profile-top.png');             // 498 x 88
			let bottomPromise = Jimp.read('./img/profile/profile-bottom.png'); // 498 x 34
			let rowPromise = Jimp.read('./img/profile/profile-row.png');           // 498 x 54
			let fontPromise = Jimp.loadFont(fontPath);
			
			options = undefined;
			const cancelCard = () => {
				resolve(undefined);
			};
			let promises = [topPromise, bottomPromise, rowPromise, fontPromise];
				
			Promise.all(promises).then((values) => {
				
				let topHeight = 88;
				let bottomHeight = 34;
				let rowHeight = 54;
				let rowNumber = rows.length;
				
				const totalRowHeight = rowNumber * rowHeight;
				let listHeight = topHeight + bottomHeight + totalRowHeight;
				
				new Jimp(498, listHeight, (err, rankList) => {
					if (err) {
						logger.info('Could not create rankList image');
						cancelCard();
					} else {
						
						let rowBackground = values[2];
						let font = values[3];
						// let xIcon = rankList.bitmap.width - 52;
						let xText = 32;
						// let yIconOffset = 2;
						let yTextOffset = 10;
						
						// Add header and footer
						rankList.blit(values[0], 0, 0);
						rankList.blit(values[1], 0, rankList.bitmap.height - bottomHeight);
						
						let yRow = topHeight;
						
						// Create rows
						rows.forEach((row) => {
							logger.info('Checking ' + row.discord_name);
							
							// Background
							rankList.blit(rowBackground, 0, yRow);
							
							// Icon
							/*if (icon) {
								rankList.blit(icon, xIcon, yRow + yIconOffset);
							}*/
							
							// Text
							const text = row.rank + '. Lv: ' + row.sao_level + '           ' + row.discord_name;
							rankList.print(font, xText /*- Jimp.measureText(font, text)*/, yRow + yTextOffset, text);
							
							// Add avatar
							if (row.avatar) {
								rankList.blit(avatar, xText + 64, yRow + 2);
							}
							
							yRow += rowHeight;
						});
						
						// Save on server
						const rankListPath = './img/rank-list.png';
						rankList.write(rankListPath);
						
						resolve({files: [rankListPath]});
					}
				});
			}).catch(err => {
				logger.info('Error while resolving profile rank list promises: ' + err);
				// Only use the avatar image
				cancelCard();
			});
		});
		
	};
	Promise.all(avatarPromises).then((values) => {
		afterAvatarsLoaded();
	}).catch(err => {
		logger.info('Error while resolving user discord avatars: ' + err);
		afterAvatarsLoaded();
	}); 
};
createProfileCard = (row) => {
	return new Promise(function(resolve, reject) {
		let topPromise = Jimp.read('./img/profile/profile-top.png');             // 498 x 88
		let bottomPromise = Jimp.read('./img/profile/profile-bottom.png'); // 498 x 34
		let rowPromise = Jimp.read('./img/profile/profile-row.png');           // 498 x 54
		let fontPromise = Jimp.loadFont(fontPath);
		
		options = undefined;
		const cancelCard = () => {
			if (row.sao_image) {
				options = {files: [row.sao_image]};
			}
			resolve(options);
		};
		let promises = [topPromise, bottomPromise, rowPromise, fontPromise];	
		
		if (row.sao_level) {
			promises.push(Jimp.read('./img/profile/profile-sword.png'));     //    47 x 47
		}
		if (row.sao_id || row.sao_alt_id) {
			promises.push(Jimp.read('./img/profile/profile-flag.png'));     //    47 x 47
		}
		if (row.utc) {
			promises.push(Jimp.read('./img/profile/profile-map.png'));     //    47 x 47
		}
			
		if (row.sao_image) {
			promises.push(Jimp.read(row.sao_image));
		}
			
		Promise.all(promises).then((values) => {
			
			let topHeight = 88;
			let bottomHeight = 34;
			let rowHeight = 54;
			let rowNumber = 0;
			if (row.sao_level) {
				rowNumber++;
			}
			if (row.sao_id) {
				rowNumber++;
			}
			if (row.sao_alt_id) {
				rowNumber++;
			}
			if (row.utc) {
				rowNumber++;
			}
			
			const totalRowHeight = rowNumber * rowHeight;
			let cardHeight = topHeight + bottomHeight + totalRowHeight;
			if (cardHeight < 284) {
				cardHeight = 284;
			}
			
			new Jimp(498, cardHeight, (err, card) => {
			    if (err) {
					logger.info('Could not create card image');
					cancelCard();
			    } else {
					
					let rowBackground = values[2];
					let font = values[3];
					let xIcon = card.bitmap.width - 52;
					let xAttributes = card.bitmap.width - 58;
					let yIconOffset = 2;
					let yTextOffset = 10;
					
					// Add header and footer
					card.blit(values[0], 0, 0);
					card.blit(values[1], 0, card.bitmap.height - bottomHeight);
					
					if (topHeight + totalRowHeight + bottomHeight < cardHeight) {
						// Background
						card.scan(0, topHeight + totalRowHeight, card.bitmap.width, cardHeight - topHeight - totalRowHeight - bottomHeight, makeIteratorThatFillsWithColor(0xa9aaafff));
					}
					
					// Print name
					card.print(font, 82, 45, row.discord_name);
					
					let yRow = topHeight;
					
					const createRow = (icon, text) => {
						// Background
						card.blit(rowBackground, 0, yRow);
						
						// Icon
						if (icon) {
							card.blit(icon, xIcon, yRow + yIconOffset);
						}
						
						// Text
						card.print(font, xAttributes - Jimp.measureText(font, text), yRow + yTextOffset, text);
						
						yRow += rowHeight;
					};
					
					let iconPromiseIndex = 4;
					// Level
					if (row.sao_level) {
						createRow(values[iconPromiseIndex++], 'Lv: ' + row.sao_level);
					}
					if (row.sao_id) {
						createRow(values[iconPromiseIndex], 'ID: ' + row.sao_id);
						if (!row.sao_alt_id) { // Would use the same icon
							iconPromiseIndex++;
						}
					}
					if (row.sao_alt_id) {
						createRow(values[iconPromiseIndex++], '2nd ID: ' + row.sao_alt_id);
					}
					if (row.utc) {
						createRow(values[iconPromiseIndex], 'Timezone: UTC ' + (row.utc > 0 ? '+' : '') + row.utc);
					}
					
					// Add avatar
					if (row.sao_image) {
						let avatar = values[values.length - 1];
						let avatarHeight = cardHeight - topHeight - bottomHeight;
						avatar.resize(Jimp.AUTO, avatarHeight);
						let xAvatar = 0;
						let yAvatar = topHeight;
						if (avatar.bitmap.width < 140) {
							xAvatar = 70 - avatar.bitmap.width / 2;
						} else if (avatar.bitmap.width > 206) {
							avatar.resize(206, Jimp.AUTO);
							// yAvatar += (avatarHeight - avatar.bitmap.height) / 2;
						}
						card.blit(avatar, xAvatar, yAvatar);
					}
		
					// Save on server
					const cardPath = './img/card-' + row.discord_name + '.png';
					card.write(cardPath);
					
					resolve({files: [cardPath]});
				}
			});
		}).catch(err => {
			logger.info('Error while resolving profile card promises: ' + err);
			// Only use the avatar image
			cancelCard();
		});
	}); 
};
handleCmdPlayer = (message) => {
    let args = message.content.substring(4).split(' ');
	let playerID = args.splice(1, args.length - 1).join(' ');
	logger.info('handleCmdPlayer for ' + playerID);
	if (playerID === '') {
		const db = getDbClient();
		db.connect(connectionErr => {
			if (connectionErr) {
				answer = 'Sorry, I could not connect to the database.'
				logger.info('Could not connect to database.');
				logger.info(connectionErr);
				send(message, answer);
			} else {
				const query = 'SELECT discord_name FROM players;'
				db.query(query, (err, result) => {
					if (err) {
						logger.info('Error on querry!');
						logger.info(err);
						answer = 'Error: No players found.';
					} else if (result.rowCount === 0) {
						answer = 'No players found.';
					} else {
						answer = 'List of all registered players:\n***' + result.rows.map(row => row.discord_name.trim()).join('***, ***') + '***';
					}
					send(message, answer);
					db.end();
				});
			}
        });
	} else {
		let answer;
		let options;
		// playerID = playerID.replace(/[<@!>]/g, '');
		// This can only be used when on same server:
		
		if (message.mentions.members === null) {
				logger.info('Player not found in message. Cancel request.');
				answer = 'Player not found in message. Is this a private chat?';
				send(message, answer);
				return;
		}
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
				answer = 'Sorry, I could not connect to the database.';
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
						/*answer = '**' + row.discord_name + '**\n';
						if (row.sao_level) {
							answer += '**Level: ' + row.sao_level + '**\n';
						}*/
						if (row.sao_id) {
							answer = '**' + row.sao_id + '**';
						} else if (row.sao_alt_id) {
							answer = '**' + row.sao_alt_id + '**';
						} else {
							answer = '';
						}
						/*if (row.utc) {
							answer += 'Timezone: UTC ' + (row.utc >= 0 ? '+' : '') + row.utc + '\n';
						}*/
						createProfileCard(row).then((options) => {
							send(message, answer, options);
						});
					}
					db.end();
				});
			}
        });
	}
};

handleCmdRank = (message) => {
		
	const db = getDbClient();
	db.connect(connectionErr => {
		if (connectionErr) {
			answer = 'Sorry, I could not connect to the database.'
			logger.info('Could not connect to database.');
			logger.info(connectionErr);
			send(message, answer);
		} else {
			// logger.info('db connected');
			const query = 'SELECT * FROM players ORDER BY sao_level DESC;'
			// logger.info(query);
			db.query(query, (err, result) => {
				if (err) {
					logger.info('Error on querry!');
					logger.info(err);
					answer = 'Error: No player ranks found.';
				} else if (result.rowCount === 0) {
					answer = 'No player ranks found.';
				} else {
					answer = '';
					let rank = 1;
					result.rows.forEach(player => {
						player.rank = rank;
						answer += (rank++) + '. **' + player.discord_name + '** (level **' + player.sao_level + '**)\n';
					});
				
					// Search the user discord avatar urls
					getUserAvatarUrls(result.rows);
				}
				
				createRankList(result.rows).then((options) => {
					send(message, answer, options);
				});
				
				db.end();
			});
		}
	});
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
		} else if (attributeName === 'level' || attributeName === 'lv' || attributeName === 'lvl') {
			sqlAttributeName = 'sao_level';
		}  else if (attributeName === 'time' || attributeName === 'timezone' || attributeName === 'utc') {
			sqlAttributeName = 'utc';
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
						answer = 'Sorry ' + player.username + ', I failed to set ' + attributeName + ' = ' + attributeValue;
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
		mapName = capitalizeFirstLetters(mapName);
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

handleCmdSkill = (message) => {
    let args = message.content.substring(4).split(' ');
	let arg1 = args[1]; // eg. 'person'
	let arg2 = args[2]; // eg. person's name
	let skillName = args.splice(1, args.length - 1).join(' '); // Will destroy args array
	let answer;
	let options;
	logger.info('handleCmdSkill for ' + skillName);
	if (skillName === '') {
		let skillNames = Object.keys(skills).map(skillKey => '[' + skillKey + '] ' + skills[skillKey].person);
		answer = 'List of all ' + skillNames.length + ' registered skills:\n***' + skillNames.join('***, ***') + '***'
	} else if (arg1 === 'person' || arg1 === 'character' || arg1 === 'player' || arg1 === 'by' || arg1 === 'of' || arg1 === 'spieler' || arg1 === 'von') {
		// Get skills of a person
		if (arg2 === undefined) {
			answer = 'Name the person you want to know the available skills of.'
		} else {
			let person = capitalizeFirstLetter(arg2);
			let skillsOfPerson = getSkillsWithPerson(person);
			if (skillsOfPerson === undefined) {
				answer = 'There are no skills registered for **' + person + '**.';
			} else {
				skillsOfPerson = Object.keys(skillsOfPerson);
				answer = '**' + person + '**\'s skills:\n***[' + skillsOfPerson.join(']***, ***[') + ']***';
			}
		}
	} else if (arg1 === 'weapon' || arg1 === 'arm'  || arg1 === 'waffe' || arg1 === 'for' || arg1 === 'für') {
		// Get skills for a weapon
		if (arg2 === undefined) {
			answer = 'Name the weapon type you want to know the available skills of.'
		} else {
			let weapon = capitalizeFirstLetter(arg2).replace('1h', '1H').replace('2h', '2H');
			if (weapon === 'Sword' || weapon === 'Rapier' || weapon === 'Mace') {
				weapon = '1H ' + weapon;
			} else if (weapon === 'Axe' || weapon === 'Spear') {
				weapon = '2H ' + weapon;
			}
			let skillsForWeapon = getSkillsForWeapon(weapon);
			if (skillsForWeapon === undefined) {
				answer = 'There are no known weapon type **' + weapon + '**.';
			} else {
				skillsForWeapon = Object.keys(skillsForWeapon).map(skillKey => '[' + skillKey + '] ' + skills[skillKey].person);
				answer = 'Skills for **' + weapon + '**:\n***' + skillsForWeapon.join('***, ***') + '***';
			}
		}
	} else if (arg1 === 'star' || arg1 === 'stars'  || arg1 === 'Sterne' || arg1 === 'Stern') {
		// Get skills with this number of stars
		if (arg2 === undefined) {
			answer = 'Name the number of stars you want to know the available skills with.'
		} else {
			let starNumber = parseInt(arg2, 10);
			if (starNumber === NaN || starNumber < 1 || starNumber > 4) {
				answer = starNumber + ' is not a valid number. The allowed range is 1 - 4.'
			} else {
				let skillsWithStars = getSkillsWithStars(starNumber);
				if (skillsWithStars === undefined) {
					answer = 'There are no skills with **' + starNumber + '** stars registered.';
				} else {
					skillsWithStars = Object.keys(skillsWithStars).map(skillKey => '[' + skillKey + '] ' + skills[skillKey].person);
					answer = 'Skills with **' + starNumber + ' stars**:\n***' + skillsWithStars.join('***, ***') + '***';
				}
			}
		}
	} else {
		skillName = capitalizeFirstLetters(skillName);
		let skill = skills[skillName];
		if (skill === undefined) {
			answer = 'Skill ***' + skillName + '*** is unknown. Did you write it correctly?';
		} else {
			answer = '***[' + skillName + '] ' + skill.person + '***';
			options = {
				files: [
					'./img/skills/' + skillName.toLowerCase().split(' - ').join('-').split(' ').join('-') + '.png'
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
		    logger.info('Draw background rectangle');
			timezones.scan(xName - 2, y, widthName + 2, fontSize, lighten);
			
			// Draw avatar 
			if (row.avatar !== undefined) {
				// logger.info('Before Blit ' + text + ' (' + x + ', ' + y + ')');
				timezones.blit(row.avatar, x, y - 1);
				x += avatarSize + 4;
			}
			
			// Draw little marker
		    logger.info('Draw little marker');
			timezones.scan(xMarker, y - 4, 8, 8, makeIteratorThatFillsWithColor(0x0030a1df));
			
			// Print name
		    logger.info('Print name');
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
getUserAvatarUrls = (rows) => {
	rows.forEach((row) => {
		logger.info('getUserAvatarUrls: row.discord_id: ' + row.discord_id);
		const user = bot.users.get(row.discord_id);
		if (user !== undefined) {
			row.avatarUrl = user.avatarURL;
			if (row.avatarUrl === null) {
				row.avatarUrl = undefined;
			} else {
				row.avatarUrl = row.avatarUrl.replace(row.avatarUrl.substring(row.avatarUrl.indexOf('size='), row.avatarUrl.length), '');
			}
		}
	});
};
handleCmdTimezones = (message) => {
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
						const query = 'SELECT discord_name, utc, discord_id FROM players WHERE utc IS NOT NULL;'
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
            case 'rank':
				handleCmdRank(message);
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
            case 'bosses':
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
            case 'skill':
            case 'skills':
				handleCmdSkill(message);
				break;
            case 'meme':
            case 'memes':
				handleCmdMeme(message);
				break;
            case 'girl':
            case 'girls':
				handleCmdGirl(message);
				break;
            case 'utc':
            case 'time':
            case 'timezone':
            case 'timezones':
				handleCmdTimezones(message);
				break;
			default:
				send(message, 'Sorry, I don\'t know the command ***' + cmd + '***.\nType *sao help* for a list of the available commands.');
         }
     }
});