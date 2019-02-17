// Must be set from outside
let logger;
let Jimp;
let send;
let getUserAvatarUrls;
let sendRandomFile;
let loadUserAvatars;
let removeSizeFromAvatarUrl;
let getDbClient;
let getTimeStamp;
let makeIteratorThatFillsWithColor;
let handleCmdTimezones;
let fontPath;

const utilText = require('../utils/util.text.js');

const mobs = require('./data/mobs.json');
const items = require('./data/items.json');
const maps = require('./data/maps.json');
const skills = require('./data/skills.json');
const mocks = require('./data/mocks.json');

const TABLE_PLAYERS = 'saoifplayers';
const sao_imgPath = './sao-if/img/';
const sao_maxLevel = 100; 		// The highest level a player can reach

const useMock = false;

const availablePlayerAttributes = ['id', 'altid', 'img', 'image', 'picture', 'avatar', 'level', 'lv', 'lvl', 'time', 'timezone', 'utc'];

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

sao_getBosses = () => {
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

sao_getMobsWithItem = (itemName) => {
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

sao_getSkillsWithPerson = (personName) => {
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
sao_getSkillsForWeapon = (weaponName) => {
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
sao_getSkillsWithStars = (starNumber) => {
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

sao_getMobsOnMap = (mapName) => {
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

// Command handlers
sao_handleCmdMob = (message, boss) => {
    let args = message.content.substring(4).split(' ');
	let mobName = args.splice(1, args.length - 1).join(' ');
	let answer;
	let options;
	let mobsToCheck = boss ? sao_getBosses() : mobs;
	logger.info('handleCmdMob for (boss only: ' + boss + ') ' + mobName);
	if (mobName === '') {
		let mobKeys = Object.keys(mobsToCheck);
		answer = 'List of all ' + mobKeys.length + ' registered ' + (boss ? 'bosses' : 'monsters') + ':\n***' + mobKeys.join(', ') + '***'
	} else {
		mobName = utilText.capitalizeFirstLetters(mobName);
		let mob = mobsToCheck[mobName];
		if (mob === undefined) {
			answer = (boss ? 'Boss' : 'Monster')  + ' ***' + mobName + '*** is unknown. Did you write it correctly?';
		} else {
			answer = '**' + mobName + '** drops: ***' + mob.drops.join('***, ***') + '***\n' +
							  'and can be found at: ***' + mob.maps.join('***, ***') + '***';
			options = {
				files: [
					sao_imgPath + 'mobs/' + mobName.toLowerCase().split(' - ').join('-').split(' ').join('-') + '.jpg'
				]
			}
		}
	}
	send(message, answer, options);
};

sao_handleCmdItem = (message) => {
    let args = message.content.substring(4).split(' ');
	let itemName = args.splice(1, args.length - 1).join(' ');
	let answer;
	let options;
	logger.info('handleCmdItem for ' + itemName);
	if (itemName === '') {
		let itemKeys = Object.keys(items);
		answer = 'List of all ' + itemKeys.length + ' registered items:\n***' + itemKeys.join('***, ***') + '***'
	} else {
		itemName = utilText.capitalizeFirstLetters(itemName);
		let mobsWithItem = sao_getMobsWithItem(itemName);
		if (mobsWithItem === undefined) {
			answer = 'Item ***' + itemName + '*** is unknown. Did you write it correctly?';
		} else {
			answer = '**' + itemName + '** is droped by: ***' + Object.keys(mobsWithItem).join('***, ***') + '***';
			/*options = {
				files: [
					sao_imgPath + 'items/' + itemName.toLowerCase().split(' - ').join('-').split(' ').join('-') + '.jpg'
				]
			}*/
		}
	}
	send(message, answer, options);
};

sao_createProfileCard = (row) => {
	return new Promise(function(resolve, reject) {
		let topPromise = Jimp.read(sao_imgPath + 'profile/profile-top.png');             // 498 x 88
		let bottomPromise = Jimp.read(sao_imgPath + 'profile/profile-bottom.png'); // 498 x 34
		let rowPromise = Jimp.read(sao_imgPath + 'profile/profile-row.png');           // 498 x 54
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
			promises.push(Jimp.read(sao_imgPath + 'profile/profile-sword.png'));     //    47 x 47
		}
		if (row.sao_id || row.sao_alt_id) {
			promises.push(Jimp.read(sao_imgPath + 'profile/profile-flag.png'));     //    47 x 47
		}
		if (row.utc) {
			promises.push(Jimp.read(sao_imgPath + 'profile/profile-map.png'));     //    47 x 47
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
					const cardPath = sao_imgPath + 'card-' + row.discord_name + '.png';
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
sao_handleCmdPlayer = (message) => {
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
				const query = 'SELECT discord_name FROM ' + TABLE_PLAYERS + ';'
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
				const query = 'SELECT * FROM ' + TABLE_PLAYERS + ' WHERE discord_id = \'' + player.id + '\';'
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
						sao_createProfileCard(row).then((options) => {
							send(message, answer, options);
						});
					}
					db.end();
				});
			}
        });
	}
};

sao_createRankList = (rows) => {
	
	let avatarSize = 32;
	let avatarPromises = loadUserAvatars(rows, avatarSize);
	
	let afterAvatarsLoadedCounter = 0;
	const afterAvatarsLoaded = () => {
		afterAvatarsLoadedCounter++;
		if (afterAvatarsLoadedCounter > 1) {
			logger.info('Called afterAvatarsLoaded again: ' + afterAvatarsLoadedCounter);
			return;
		}
		
		let topPromise = Jimp.read(sao_imgPath + 'rank/rank-top.png');             // 347 x 34
		let bottomPromise = Jimp.read(sao_imgPath + 'rank/rank-bottom.png'); // 347 x 35
		let rowPromise = Jimp.read(sao_imgPath + 'rank/rank-row.png');           // 347 x 43
		let fontPromise = Jimp.loadFont(fontPath);
		
		options = undefined;
		const cancelCard = () => {
			resolve(undefined);
		};
		let promises = [topPromise, bottomPromise, rowPromise, fontPromise];
			
		return Promise.all(promises).then((values) => {
			
			let topHeight = 32;
			let bottomHeight = 35;
			let rowHeight = 41;
			let rowNumber = rows.length;
			
			let totalRowHeight = rowNumber * rowHeight;
			let columnWidth = 347;
			let columnNumber = 1;
			let totalWidth = columnWidth;
			if (rows.length > 10) {
				totalWidth *= 2;
				totalRowHeight /= 2;
				columnNumber++;
			}
			let listHeight = topHeight + bottomHeight + totalRowHeight;
			
			return new Promise(function(resolve, reject) {
				new Jimp(totalWidth, listHeight, (err, rankList) => {
					if (err) {
						logger.info('Could not create rankList image');
						cancelCard();
					} else {
						
						let rowBackground = values[2];
						let font = values[3];
						// let xIcon = rankList.bitmap.width - 52;
						let xLeft = 0;
						let xText = 32;
						// let yIconOffset = 2;
						let yTextOffset = 7;
						
						// Add header and footer
						for (let columnIndex = 0; columnIndex < columnNumber; columnIndex++) {
							let xTopBottom = columnIndex * columnWidth;
							rankList.blit(values[0], xTopBottom, 0);
							rankList.blit(values[1], xTopBottom, rankList.bitmap.height - bottomHeight);
						}
						
						let yRow = topHeight;
						
						// Create rows
						let rowIndex = 0;
						rows.forEach((row) => {
							// logger.info('Checking ' + row.discord_name);
							
							// Background
							rankList.blit(rowBackground, xLeft, yRow);
							
							// Text
							const text = utilText.padLeft(row.rank, 2, '  ') + '.     Lv: ' + utilText.padLeft(row.sao_level, 3, '  ');
							rankList.print(font, xText, yRow + yTextOffset, text);
							rankList.print(font, xText + 194, yRow + yTextOffset, row.discord_name);
							
							// Add avatar
							if (row.avatar) {
								rankList.blit(row.avatar, xText + 154, yRow + 5);
							}
							
							yRow += rowHeight;
							rowIndex++;
							if (rowIndex === 10) {
								// Start next column
								xLeft += columnWidth;
								xText = xLeft + 32;
								yRow = topHeight;
							}
						});
						
						// Save on server
						const rankListPath = sao_imgPath + 'rank-list.png';
						rankList.write(rankListPath);
						logger.info('Saved rank list picture: ' + rankListPath);
						
						resolve({files: [rankListPath]});
					}
				});
			});
		}).catch(err => {
			logger.info('Error while resolving profile rank list promises: ' + err);
			// Only use the avatar image
			cancelCard();
		});
		
	};
	return Promise.all(avatarPromises).then((values) => {
		return afterAvatarsLoaded();
	}).catch(err => {
		logger.info('Error while resolving user discord avatars: ' + err);
		return afterAvatarsLoaded();
	}); 
};
sao_handleCmdRank = (message) => {
		
	const db = getDbClient();
	db.connect(connectionErr => {
		if (connectionErr) {
			answer = 'Sorry, I could not connect to the database.'
			logger.info('Could not connect to database.');
			logger.info(connectionErr);
			send(message, answer);
		} else {
			// logger.info('db connected');
			const query = 'SELECT * FROM ' + TABLE_PLAYERS + ' WHERE sao_level IS NOT NULL ORDER BY sao_level DESC;'
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
					
					// Take only the first 20 players
					if (result.rows.length > 20) {
						result.rows = result.rows.slice(0, 20);
					}
				
					// Search the user discord avatar urls
					getUserAvatarUrls(result.rows/*.filter(row => row.sao_level !== null)*/);
				}
				
				sao_createRankList(result.rows).then((options) => {
					// logger.info('Finished createRankList with options: ' + options);
					if (options !== undefined) {
						answer = '';
					}
					send(message, answer, options);
				});
				
				db.end();
			});
		}
	});
};

sao_handleCmdSet = (message) => {
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
		if (attributeName === 'image' || attributeName === 'img' || attributeName === 'picture' || attributeName === 'avatar') {
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
			if (isNaN(attributeValue)) {
				answer = 'The level must be a number.';
				send(message, answer);
				return;
			}
			if (attributeValue < 1 || attributeValue > sao_maxLevel) {
				answer = 'The level must be between 1 and ' + sao_maxLevel + '.';
				send(message, answer);
				return;
			}
			sqlAttributeName = 'sao_level';
		}  else if (attributeName === 'time' || attributeName === 'timezone' || attributeName === 'utc') {
			if (isNaN(attributeValue)) {
				answer = 'UTC must be a number.';
				send(message, answer);
				return;
			}
			if (attributeValue < -12 || attributeValue > 12) {
				answer = 'UTC must be between -12 and ' + 12 + '.';
				send(message, answer);
				return;
			}
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
				const query = 'INSERT INTO ' + TABLE_PLAYERS + ' (discord_id, discord_name, created, updated, ' + sqlAttributeName + ') '
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
						answer = 'Successfully set ' + attributeName + ' = ' + attributeValue + ' for ' + player.username;
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

sao_handleCmdMap = (message) => {
    let args = message.content.substring(4).split(' ');
	let mapName = args.splice(1, args.length - 1).join(' ');
	let answer;
	let options;
	logger.info('handleCmdMap for ' + mapName);
	if (mapName === '') {
		answer = 'List of all registered maps:\n***' + Object.keys(maps).join('***, ***') + '***'
	} else {
		mapName = utilText.capitalizeFirstLetters(mapName);
		let map = maps[mapName];
		if (map === undefined) {
			answer = 'Map ***' + mapName + '*** is unknown. Did you write it correctly?';
		} else {
			let mobsOnMap = sao_getMobsOnMap(mapName);
			if (mobsOnMap === undefined) {
				answer = 'Map ***' + mapName + '*** dosn\'t hold any mobs.';
			} else {
				answer = '**' + mapName + '** holds the following mobs: ***' + Object.keys(mobsOnMap).join('***, ***') + '***';
			}
			answer += '\nNPCs: ***' + map.npcs.join('***, ***') + '***\nPortals: ***' + map.portals.join('***, ***') + '***';
			options = {
				files: [
					sao_imgPath + 'maps/' + mapName.toLowerCase().split(' - ').join('-').split(' ').join('-') + '.jpg'
				]
			}
		}
	}
	send(message, answer, options);
};

sao_handleCmdSkill = (message) => {
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
			let person = utilText.capitalizeFirstLetter(arg2);
			let skillsOfPerson = sao_getSkillsWithPerson(person);
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
			let weapon = utilText.capitalizeFirstLetter(arg2).replace('1h', '1H').replace('2h', '2H');
			if (weapon === 'Sword' || weapon === 'Rapier' || weapon === 'Mace') {
				weapon = '1H ' + weapon;
			} else if (weapon === 'Axe' || weapon === 'Spear') {
				weapon = '2H ' + weapon;
			}
			let skillsForWeapon = sao_getSkillsForWeapon(weapon);
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
				let skillsWithStars = sao_getSkillsWithStars(starNumber);
				if (skillsWithStars === undefined) {
					answer = 'There are no skills with **' + starNumber + '** stars registered.';
				} else {
					skillsWithStars = Object.keys(skillsWithStars).map(skillKey => '[' + skillKey + '] ' + skills[skillKey].person);
					answer = 'Skills with **' + starNumber + ' stars**:\n***' + skillsWithStars.join('***, ***') + '***';
				}
			}
		}
	} else {
		skillName = utilText.capitalizeFirstLetters(skillName);
		let skill = skills[skillName];
		if (skill === undefined) {
			answer = 'Skill ***' + skillName + '*** is unknown. Did you write it correctly?';
		} else {
			answer = '***[' + skillName + '] ' + skill.person + '***';
			options = {
				files: [
					sao_imgPath + 'skills/' + skillName.toLowerCase().split(' - ').join('-').split(' ').join('-') + '.png'
				]
			}
		}
	}
	send(message, answer, options);
};

sao_handleCmdMeme = (message) => {
	sendRandomFile(message, sao_imgPath + 'memes/');
};
sao_handleCmdGirl = (message) => {
	sendRandomFile(message, sao_imgPath + 'girls/');
};


sao_handleCmdSpank = (message) => {
    let args = message.content.substring(4).split(' ');
	let answer;
	
	let player = message.author;
	
	if (message.mentions.members === null) {
		logger.info('Player not found in message. Cancel request.');
		answer = 'Player not found in message. Is this a private chat?';
		send(message, answer);
		return;
	}
	
	let otherPlayer = message.mentions.users.first();
	
	if (otherPlayer === undefined || otherPlayer === null) {
		answer = 'Player is unknown. Did you write him correctly?';
		send(message, answer);
		return;
	}
	if (!player.avatarURL) {
		answer = 'You don\'t have a discord avatar.';
		send(message, answer);
		return;
	}
	if (!otherPlayer.avatarURL) {
		answer = otherPlayer.name + ' has no discord avatar.';
		send(message, answer);
		return;
	}
	logger.info('handleCmdSpank ' + player.id + ' => ' + otherPlayer.id);
	
	player = removeSizeFromAvatarUrl({avatarURL: player.avatarURL});
	otherPlayer = removeSizeFromAvatarUrl({avatarURL: otherPlayer.avatarURL});
	
	let xMe = 299;
	let yMe = 149;
	let xOther = 600;
	let yOther = 404;
	const avatarSize = 256;
	
	let imagePromise = Jimp.read(sao_imgPath + 'spank.jpg');             // 934 x 1344
	let avatarPromises = loadUserAvatars([player, otherPlayer], avatarSize);
	
	
	Promise.all([imagePromise].concat(avatarPromises)).then((values) => {
		
		const image = values[0];
		let me = values[1];
		let other = values[2];
		
		if (me.bitmap.width < avatarSize) {
			me.resize(avatarSize, avatarSize);
		}
		if (other.bitmap.width < avatarSize) {
			other.resize(avatarSize, avatarSize);
		}
		
		// Add user avatars
		image.blit(me, xMe, yMe);
		image.blit(other, xOther, yOther);
		
		// Save on server
		image.write(sao_imgPath + 'spank-result.jpg');
		
		send(message, '', {files: [sao_imgPath + 'spank-result.jpg']});
		logger.info('Spank image created.');
	}).catch(err => {
		logger.info('Error while resolving user avatar and image creation promises: ' + err);
		answer =  'Could not load user avatars.';
		send(message, answer);
		return;
	});
};

sao_init = (controller) => {
	logger = controller.logger;
	Jimp = controller.Jimp;
	send = controller.send;
	getUserAvatarUrls = controller.getUserAvatarUrls;
	sendRandomFile = controller.sendRandomFile;
	loadUserAvatars = controller.loadUserAvatars;
	removeSizeFromAvatarUrl = controller.removeSizeFromAvatarUrl;
	removeSizeFromAvatarUrl = controller.removeSizeFromAvatarUrl;
	getDbClient = controller.getDbClient;
	getTimeStamp = controller.getTimeStamp;
	makeIteratorThatFillsWithColor = controller.makeIteratorThatFillsWithColor;
	handleCmdTimezones = controller.handleCmdTimezones;
	fontPath = controller.fontPath;
};

const sao = (controller, message) => {
	sao_init(controller);
	
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
			sao_handleCmdPlayer(message);
			break;
		case 'rank':
		case 'ranking':
			sao_handleCmdRank(message);
			break;
		case 'set':
			sao_handleCmdSet(message);
			break;
		case 'mob':
		case 'mobs':
		case 'monster':
		case 'monsters':
			sao_handleCmdMob(message, false);
			break;
		case 'boss':
		case 'bosses':
			sao_handleCmdMob(message, true);
			break;
		case 'item':
		case 'items':
		case 'drop':
		case 'drops':
			sao_handleCmdItem(message);
			break;
		case 'map':
		case 'maps':
			sao_handleCmdMap(message);
			break;
		case 'skill':
		case 'skills':
			sao_handleCmdSkill(message);
			break;
		case 'meme':
		case 'memes':
			sao_handleCmdMeme(message);
			break;
		case 'girl':
		case 'girls':
			sao_handleCmdGirl(message);
			break;
		case 'utc':
		case 'time':
		case 'timezone':
		case 'timezones':
			handleCmdTimezones(TABLE_PLAYERS, message);
			break;
		case 'spank':
		case 'spanking':
			sao_handleCmdSpank(message);
			break;
		default:
			send(message, 'Sorry, I don\'t know the command ***' + cmd + '***.\nType *sao help* for a list of the available commands.');
	}
};

module.exports = {
	handle: sao
}
