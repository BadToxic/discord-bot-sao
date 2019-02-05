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

const CRApi = require('wrap-royale-core').CRApi;
const utilText = require('../utils/util.text.js');

const baseUri = 'https://api.clashroyale.com/v1';
const apiToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiIsImtpZCI6IjI4YTMxOGY3LTAwMDAtYTFlYi03ZmExLTJjNzQzM2M2Y2NhNSJ9.eyJpc3MiOiJzdXBlcmNlbGwiLCJhdWQiOiJzdXBlcmNlbGw6Z2FtZWFwaSIsImp0aSI6ImRkMzMzZmFlLTIzMzktNGI2ZS04Mzk4LWVlMDVmZTA5NDFjYiIsImlhdCI6MTU0OTQwNjM5MSwic3ViIjoiZGV2ZWxvcGVyL2E1OTBmM2IxLTdlNmEtNGE3Ni00Yzg1LTdmNzBmZDI4YzNhMCIsInNjb3BlcyI6WyJyb3lhbGUiXSwibGltaXRzIjpbeyJ0aWVyIjoiZGV2ZWxvcGVyL3NpbHZlciIsInR5cGUiOiJ0aHJvdHRsaW5nIn0seyJjaWRycyI6WyI1Mi41MS4xNDguODgiLCI1Mi4yMDguMTQ1LjIyOCJdLCJ0eXBlIjoiY2xpZW50In1dfQ.33tcipoNI4hNrI4MHosHjgkn0fXrjU7QmvMtAW7RjqBJp3_1iU6Zqgu1QdSVgsDaWhM0AsyQvbzFjCyB9uaSWQ';
/*const apiToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiIsImtpZCI6IjI4YTMxOGY3LTAwMDAtYTFlYi03ZmExLTJjNzQzM2M2Y2NhNSJ9.eyJpc3MiOiJzdXBlcmNlbGwiLCJhdWQiOiJzdXBlcmNlbGw6Z2FtZWFwaSIsImp0aSI6IjA4YzNmNzBkLTk1ZDQtNDliMi1iMWExLTI1MzRjMGMwNTQ1ZSIsImlhdCI6MTU0OTQwNjc1Niwic3ViIjoiZGV2ZWxvcGVyL2E1OTBmM2IxLTdlNmEtNGE3Ni00Yzg1LTdmNzBmZDI4YzNhMCIsInNjb3BlcyI6WyJyb3lhbGUiXSwibGltaXRzIjpbeyJ0aWVyIjoiZGV2ZWxvcGVyL3NpbHZlciIsInR5cGUiOiJ0aHJvdHRsaW5nIn0seyJjaWRycyI6WyIzNy4yMDEuNi4xMDgiXSwidHlwZSI6ImNsaWVudCJ9XX0.wRTXSVpzgkYeeuf4gqy0JwATFkHfJNzqz71GLHgMePMr4o9pLzFM87XiNa_qlaMiTzV9tAvYbQBu3-icLiaGyA';*/

const TABLE_PLAYERS = 'crplayers';
const imgPath = './cr/img/'

const useMock = false;

const availablePlayerAttributes = ['id', 'altid', 'img', 'image', 'picture', 'avatar', 'level', 'lv', 'lvl', 'time', 'timezone', 'utc'];

const help = 
'Notice: When using a command do not include "<" and ">".\n' +
'(Example: cr TODO blabla)\n\n' +

'**cr help**  |  Displays this help message.\n\n' +

'***Ask information***\n' +
'**cr [TODO]**  |  Coming soon';

// Command handlers
createProfileCard = (row) => {
	return new Promise(function(resolve, reject) {
		let topPromise = Jimp.read(imgPath + 'profile/profile-top.png');             // 498 x 88
		let bottomPromise = Jimp.read(imgPath + 'profile/profile-bottom.png'); // 498 x 34
		let rowPromise = Jimp.read(imgPath + 'profile/profile-row.png');           // 498 x 54
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
			promises.push(Jimp.read(imgPath + 'profile/profile-sword.png'));     //    47 x 47
		}
		if (row.sao_id || row.sao_alt_id) {
			promises.push(Jimp.read(imgPath + 'profile/profile-flag.png'));     //    47 x 47
		}
		if (row.utc) {
			promises.push(Jimp.read(imgPath + 'profile/profile-map.png'));     //    47 x 47
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
					const cardPath = imgPath + 'card-' + row.discord_name + '.png';
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
		
		let topPromise = Jimp.read(imgPath + 'rank/rank-top.png');             // 347 x 34
		let bottomPromise = Jimp.read(imgPath + 'rank/rank-bottom.png'); // 347 x 35
		let rowPromise = Jimp.read(imgPath + 'rank/rank-row.png');           // 347 x 43
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
						const rankListPath = imgPath + 'rank-list.png';
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
				
				createRankList(result.rows).then((options) => {
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

init = (controller) => {
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

const cr = (controller, message) => {
	init(controller);
	
	let args = message.content.substring(3).split(' ');
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
		case 'cards':
			const api = new CRApi(baseUri, apiToken);
			api.cards().then((cards) => {
				const text = cards.items.map((item) => item.name).join(', ');
				logger.info(text);
				send(message, text);
			}).catch((err) => {
				logger.info(err);
			})
			break;
		case 'player':
		case 'players':
		case 'info':
			handleCmdPlayer(message);
			break;
		case 'rank':
		case 'ranking':
			handleCmdRank(message);
			break;
		case 'set':
			handleCmdSet(message);
			break;
		case 'utc':
		case 'time':
		case 'timezone':
		case 'timezones':
			handleCmdTimezones(TABLE_PLAYERS, message);
			break;
		default:
			send(message, 'Sorry, I don\'t know the command ***' + cmd + '***.\nType *cr help* for a list of the available commands.');
	}
};

module.exports = {
	handle: cr
}
