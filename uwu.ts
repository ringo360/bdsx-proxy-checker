// Network Hooking: Get login IP and XUID
import { NetworkIdentifier } from "bdsx/bds/networkidentifier";
import { MinecraftPacketIds } from "bdsx/bds/packetids";
import { BuildPlatform } from "bdsx/common";
import { events } from "bdsx/event";
import axios from "axios";

//!===WARNING===
//!必ず105行目にwebhook urlを入力してください!!
//!===WARNING===

export const connectionList = new Map<NetworkIdentifier, string>();

async function checkips(ip: string): Promise<{ proxy: boolean, hosting: boolean, country: string, regionName: string, city: string, isp: string } | null> {
    return axios.get(`http://ip-api.com/json/${encodeURI(ip)}?fields=status,country,regionName,city,isp,proxy,hosting`)
        .then(response => response.data)
        .then(data => {
            if (data.status === "success") {
                return { proxy: data.proxy, hosting: data.hosting, country: data.country, regionName: data.regionName, city: data.city, isp: data.isp };
            } else {
                console.log(`api吐血した!!!!!. Status: ${data.status}`);
                return null;
            }
        })
        .catch(error => {
            console.log(`something went wrong! ${error.message}`);
            throw error; // rethrow the error if needed
        });
}

events.packetAfter(MinecraftPacketIds.Login).on(async (ptr, networkIdentifier, packetId) => {
    const ip = networkIdentifier.getAddress();
    const connreq = ptr.connreq;
    if (connreq === null) return; // wrong client
    const cert = connreq.getCertificate();
    if (cert === null) return; // wrong client ?
    const xuid = cert.getXuid();
    const username = cert.getId();

    // sendLog
	try {
		const ipInfo = await checkips(ip)
		if (!ipInfo) {
			console.log('oops, ip-api failed. returning...')
			return;
		}
		const { proxy, hosting, country, regionName, city, isp } = ipInfo;
		if (proxy === true || hosting === true) {
			console.log(`VPN/Proxy Detected!!`)
			console.log(`Connection: ${username}> IP=${ip}, XUID=${xuid}, PLATFORM=${BuildPlatform[connreq.getDeviceOS()] || "UNKNOWN"}`)
			const d = new Date();
			const u = d.getTime()
			const fxunix = Math.floor( u / 1000 );
			let discordupdata = {
				username: "皐月電文BOT",
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
							value: country,
							inline: true
						},
						{
							name: "地域",
							value: regionName,
							inline: true
						},
						{
							name: "市区町村",
							value: city,
							inline: true
						},
						{
							name: "ISP",
							value: isp,
							inline: true
						},
						{
							name: "その他",
							value: `Proxy? ${proxy}, Hosting?: ${hosting}`
						}
					],
				}]
			}
			try {
				await axios.post("INPUT URL HERE.", discordupdata) //!put url here
			} catch (e) {
				console.log(e)
			}
		}
	} catch(e) {
		console.log(`something went wrong! ${e.message}`)
	}
});

events.playerJoin.on(ev => {
    ev.player.sendMessage("[message packet from bdsx]");
});
