import * as types from './types';

export const serverVersion = 'alpha-0';
export const serverProtocol = 7;

export interface IServerConfig {
	port: number;
	address: string;
	name: string;
	motd: string;
	public: boolean;
	maxplayers: number;
	chunkTransportCompression: boolean;
	connect: {
		address: string;
		port: number;
	};
}

export const serverDefaultConfig: IServerConfig = {
	port: 25565,
	address: '0.0.0.0',
	name: 'MCServer',
	motd: 'Another Minecraft2VoxelSRV proxy',
	public: false,
	maxplayers: 10,
	chunkTransportCompression: false,
	connect: {
		address: "localhost",
		port: 25566
	}
};

export let serverConfig: IServerConfig = serverDefaultConfig;

export function setConfig(config: object) {
	serverConfig = { ...serverDefaultConfig, ...config };
}

export const invalidNicknameRegex = new RegExp('[^a-zA-Z0-9_]');
