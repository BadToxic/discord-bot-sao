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




cr_init = (controller) => {
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
	cr_init(controller);
	
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
