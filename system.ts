// Network Hooking: Get login IP and XUID
import { events } from "bdsx/event";
import { bedrockServer } from "bdsx/launcher";
import * as http from 'http'
import * as https from 'https'
import { CommandResultType } from "bdsx/commandresult";
import { BuildPlatform } from "bdsx/common";

//!WEBHOOK URL
const webhookurl = "https://discord.com/api/webhooks/1100407101152563310/y3IW45Az3tUklEGMsRpPCF8UhC8Ecc-9BrSM8Df5qfNZvjhuTAtMvXtfGsfhTKhDfcRB"

async function checkips(ip: string): Promise<{ proxy: boolean, hosting: boolean, country: string, regionName: string, city: string, isp: string } | null> {
    const options = {
		hostname: 'ip-api.com',
		path: `/json/${encodeURI(ip.replace(/\|.*/,""))}?fields=status,country,regionName,city,isp,proxy,hosting`,
		method: 'GET',
	};
	return new Promise((resolve, reject) => {
		const req = http.request(options, (res) => {
			let data = '';

		res.on('data', (chunk) => {
			data += chunk;
		});

		res.on('end', () => {
			try {
				const jsonData = JSON.parse(data);
				const result = {
					proxy: jsonData.proxy,
					hosting: jsonData.hosting,
					country: jsonData.country,
					regionName: jsonData.regionName,
					city: jsonData.city,
					isp: jsonData.isp,
				};
				resolve(result);
			} catch (error) {
				reject(error);
				console.log(error)
			}
		  });
		});

		req.on('error', (error) => {
			reject(error);
			console.log(error)
		});
		req.end();
	});

}

console.log('[AntiVPN] Ready!')

// events.packetAfter(MinecraftPacketIds.Login).on(async (ptr, networkIdentifier, packetId) => {
	events.playerJoin.on(async ev => {
	const ni = await ev.player.getNetworkIdentifier()
	const p = await ev.player
    const ip = await ni.getAddress()
    const xuid = await p.getXuid()
    const username = await p.getName()
	const d = await p.getPlatform()
	const device = await `${BuildPlatform[d] || "UNKNOWN"}`


    // sendLog
	try {
		const ipInfo = await checkips(ip)
		if (!ipInfo) {
			console.log('[AntiVPN] oops! failed to check ip, returning...')
			return;
		}
		if (ipInfo.proxy === true || ipInfo.hosting === true) {
			console.log(`[AntiVPN] VPN/Proxy Detected!!`)
			console.log(`[AntiVPN] Connection: ${username}> IP=${ip}, XUID=${xuid}, PLATFORM=${device}`)
			const d = new Date();
			const u = d.getTime()
			const fxunix = Math.floor( u / 1000 );
			const res = bedrockServer.executeCommand(`kick ${username} \n§4§lVPNの使用は禁止されています！\n§4§lVPNを切断してください！`, CommandResultType.Data);
			console.log(`[AntiVPN] ${res.data.statusMessage.replace(/[\r\n]+/g, " ")}`)
			let discordbody = {
				username: "AntiVPN",
				embeds: [{
					title: "VPN/Proxyを検知しました。",
					color: 0xff0100,
					fields: [
						{
							name: "名前",
							value: username
						},
						{
							name: "検知時刻",
							value: `<t:${fxunix}:f>(<t:${fxunix}:R>)`
						},
						{
							name: "XUID",
							value: xuid
						},
						{
							name: "IP",
							value: ip,
							inline: true
						},
						{
							name: "国",
							value: ipInfo.country,
							inline: true
						},
						{
							name: "都道府県/地域",
							value: ipInfo.regionName,
							inline: true
						},
						{
							name: "市区町村",
							value: ipInfo.city,
							inline: true
						},
						{
							name: "ISP",
							value: ipInfo.isp,
							inline: true
						},
						{
							name: "その他",
							value: `Proxy: ${ipInfo.proxy}, Hosting: ${ipInfo.hosting}`
						}
					],
				}]
			}
			const data = JSON.stringify(discordbody)
			const options = {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
			}
			try {
				console.log('[AntiVPN] Posting...')
				const req = https.request(webhookurl, options);
				req.write(data)
				req.end()
				console.log('[AntiVPN] Posted!')
			} catch (e) {
				console.log(e)
			}
		}
	} catch(e) {
		console.log(`[AntiVPN] Something went wrong. ${e.message}`)
	}
});