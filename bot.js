// let Discord = require('discord.io');
let Discord = require('discord.js');
let logger = require('winston');
let auth = require('./auth.json');

let mobs = require('./data/mobs.json');

let help = 
'Notice: When using a command do not include "<" and ">".\n' +
'(Example: sao mob Frenzy Boar)\n\n' +

'**sao help**  |  Displays this help message.\n\n' +

'***Ask information***\n' +
'**sao mob**  |  Lists all mobs currently registered\n' +
'**sao mob** <Mob name>  |  Shows the information about this mob (drops & locations)';

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


// login to Discord with your app's token
bot.login(auth.token);


send = (message, answer, options) => {
	message.channel.send(answer, options);
    /*bot.sendMessage({
		to: channelID,
		message: answer
	});*/
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
				let mobName = args.splice(1, 2).join(' ');
				let answer;
				let options;
                logger.info(mobName);
				if (mobName === '') {
					answer = 'List of all registered monsters:\n***' + Object.keys(mobs).join('***, ***') + '***'
				} else {
				    let mob = mobs[mobName];
					answer = '**' + mobName + '** drops: ***' + mob.drops.join('***, ***') + '***\n' +
					                  'and can be found at: ***' + mob.maps.join('***, ***') + '***';
					options = {
						files: [
							'./img/mobs/' + mobName.toLowerCase().replace(' - ', '-').replace(' ', '-') + '.jpg'
						]
					}
				}
				send(message, answer, options);
				break;
         }
     }
});