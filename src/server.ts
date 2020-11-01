import { EventEmitter } from 'events';
import * as fs from 'fs';

import * as configs from './lib/configs';

import { serverVersion, serverProtocol, serverConfig, setConfig, serverDefaultConfig } from './values';
import * as console from './lib/console';
import {
	IActionClick,
	IActionInventoryClick,
	IActionBlockBreak,
	IActionBlockPlace,
	IActionClickEntity,
	IActionMessage,
	IActionMove,
	ILoginResponse,
} from 'voxelsrv-protocol/js/client';

import ndarray = require('ndarray');
import { IPlayerTeleport, IWorldChunkLoad } from 'voxelsrv-protocol/js/server';

import ClientClassic from 'minecraft-classic-protocol/src/client';

const mcm = require('minecraft-protocol');
import { Vec3 } from 'vec3';
import * as zlib from 'zlib';

const Chunk = require('prismarine-chunk')('1.16');
const modernData = require('minecraft-data')('1.16.3');

const mcc = require('minecraft-classic-protocol');
const classicData = require('minecraft-data')('0.30c');

const blockRegistry: { [index: string]: any } = {};

blockRegistry['air'] = 0;
blockRegistry['stone'] = 1
blockRegistry['grass_block'] = 2
blockRegistry['dirt'] = 3
blockRegistry['coarse_dirt'] = 3
blockRegistry['podzol'] = 2
blockRegistry['cobblestone'] = 4
blockRegistry['oak_planks'] = 5
blockRegistry['spruce_planks'] = 5
blockRegistry['birch_planks'] = 5
blockRegistry['jungle_planks'] = 5
blockRegistry['acacia_planks'] = 5
blockRegistry['dark_oak_planks'] = 5
blockRegistry['bedrock'] = 7
blockRegistry['grass'] = 6
blockRegistry['tall_grass'] = 6
blockRegistry['oak_log'] = 17
blockRegistry['oak_leaves'] = 18
blockRegistry['oak_wall_sign'] = 5
blockRegistry['oak_sign'] = 5



let server: Server;

export function getServerInstance(): Server {
	return server;
}

export function startServer(): Server {
	server = new Server();
	return server;
}

class Server extends EventEmitter {
	playerCount: number = 0;
	players: { [index: string]: any } = {};
	constructor() {
		super();
		this.startServer();
	}

	private async startServer() {
		console.log(`^yStarting fdae server version^: ${serverVersion} ^y[Protocol:^: ${serverProtocol}^y]`);
		['./config'].forEach((element) => {
			if (!fs.existsSync(element)) {
				try {
					fs.mkdirSync(element);
					console.log(`^BCreated missing directory: ^w${element}`);
				} catch (e) {
					console.log(`^rCan't create directory: ^w${element}! Reason: ${e}`);
					process.exit();
				}
			}
		});

		const config = { ...serverDefaultConfig, ...configs.load('', 'config') };
		setConfig(config);
		configs.save('', 'config', config);

		this.emit('config-update', config);

		const server = mcc.createServer({ port: serverConfig.port });

		server.on('login', this.connectPlayer);

		console.log('^yServer started on port: ^:' + serverConfig.port);
	}

	async connectPlayer(classic: ClientClassic) {
		let playerdata = { x: 0, y: 200, z: 0, chunk: 0 };

		let chunks = {};

		classic.on('player_identification', (d) => {
			playerdata = d;
		});

		const map = Buffer.alloc(4194308);
		map.writeInt32BE(32 * 256 * 32, 0);
		var compressedMap = zlib.gzipSync(map);

		for (var i = 0; i < compressedMap.length; i += 1024) {
			classic.write('level_data_chunk', {
				chunk_data: compressedMap.slice(i, Math.min(i + 1024, compressedMap.length)),
				percent_complete: i == 0 ? 0 : Math.ceil((i / compressedMap.length) * 100),
			});
		}

		classic.write('level_finalize', {
			x_size: 32,
			y_size: 256,
			z_size: 32,
		});

		classic.write('spawn_player', {
			player_id: -1,
			player_name: classic.username,
			x: 5 * 32,
			y: 200 * 32,
			z: 5 * 32,
			yaw: 0,
			pitch: 0,
		});

		const player = mcm.createClient({
			host: serverConfig.connect.address,
			port: serverConfig.connect.port,
			username: classic.username,
		});

		player.on('packet', (d, m) => {
			//console.obj(d, m);
		});

		player.on('error', (e) => {
			console.error(e);
		});

		player.on('login_plugin_request', (d) => {
			player.write('login_plugin_response', {
				messageId: d.messageId,
				success: false,
			});
		});

		player.on('chat', (d) => {
			const json = JSON.parse(d.message);
			let msg = json.text != undefined ? json.text : '';

			if (json.extra != undefined) {
				json.extra.forEach((x) => {
					msg = msg + x.text;
				});
			}
			classic.write('message', { message: msg });
		});

		player.on('position', async (d) => {
			playerdata.x = d.x;
			playerdata.y = d.y;
			playerdata.z = d.z;
		});

		player.on('disconnect', () => {});

		player.on('kick_disconnect', () => {});

		player.on('map_chunk', (p) => {
			const chunk = new Chunk();
			chunk.load(p.chunkData, p.bitMap, p.skyLightSent, p.groundUp);
			if (p.x == 20 && p.z == -6) {
				let x, y, z;
				for (x = 0; x < 16; x++) {
					for (y = 0; y < 256; y++) {
						for (z = 0; z < 16; z++) {
							let block = blockRegistry[chunk.getBlock(new Vec3(x, y, z)).name]
							if (block == undefined) block = 1

							classic.write('set_block', {
								x: x + 16,
								y: y + 16,
								z: z + 16,
								block_type: block,
							});
						}
					}
				}
			}
		});

		classic.on('message', (d) => {
			player.write('chat', { message: d.message });
		});
	}
}
