import * as dotenv from "dotenv";
import { IPBogon, IPinfoPlus } from "../src/common";
import IPinfoPlusWrapper from "../src/ipinfoPlusWrapper";

const testIfTokenIsSet = process.env.IPINFO_TOKEN ? test : test.skip;

beforeAll(() => {
    dotenv.config();
});

describe("IPinfoPlusWrapper", () => {
    testIfTokenIsSet("lookupIp", async () => {
        const ipinfoWrapper = new IPinfoPlusWrapper(process.env.IPINFO_TOKEN!);

        // test multiple times for cache.
        for (let i = 0; i < 5; i++) {
            const data = (await ipinfoWrapper.lookupIp(
                "8.8.8.8"
            )) as IPinfoPlus;

            // Basic fields
            expect(data.ip).toEqual("8.8.8.8");
            expect(data.hostname).toBeDefined();

            // Check nested geo object with all fields
            expect(data.geo).toBeDefined();
            expect(typeof data.geo).toBe("object");
            expect(data.geo.city).toBeDefined();
            expect(data.geo.region).toBeDefined();
            expect(data.geo.region_code).toBeDefined();
            expect(data.geo.country).toBeDefined();
            expect(data.geo.country_code).toBeDefined();
            expect(data.geo.continent).toBeDefined();
            expect(data.geo.continent_code).toBeDefined();
            expect(data.geo.latitude).toBeDefined();
            expect(data.geo.longitude).toBeDefined();
            expect(data.geo.timezone).toBeDefined();
            expect(data.geo.postal_code).toBeDefined();
            expect(data.geo.dma_code).toBeDefined();
            expect(data.geo.geoname_id).toBeDefined();
            expect(data.geo.radius).toBeDefined();

            // Check nested as object with all fields
            expect(data.as).toBeDefined();
            expect(typeof data.as).toBe("object");
            expect(data.as.asn).toBeDefined();
            expect(data.as.name).toBeDefined();
            expect(data.as.domain).toBeDefined();
            expect(data.as.type).toBeDefined();
            expect(data.as.last_changed).toBeDefined();

            // Check mobile and anonymous objects
            expect(data.mobile).toBeDefined();
            expect(typeof data.mobile).toBe("object");
            expect(data.anonymous).toBeDefined();
            expect(typeof data.anonymous).toBe("object");
            expect(data.anonymous.is_proxy).toBeDefined();
            expect(data.anonymous.is_relay).toBeDefined();
            expect(data.anonymous.is_tor).toBeDefined();
            expect(data.anonymous.is_vpn).toBeDefined();

            // Check all network/type flags
            expect(data.is_anonymous).toBeDefined();
            expect(data.is_anycast).toBeDefined();
            expect(data.is_hosting).toBeDefined();
            expect(data.is_mobile).toBeDefined();
            expect(data.is_satellite).toBeDefined();

            // Check geo formatting was applied
            expect(data.geo.country_name).toBeDefined();
            expect(data.geo.isEU).toBeDefined();
            expect(data.geo.country_flag_url).toBeDefined();
        }
    });

    testIfTokenIsSet("isBogon", async () => {
        const ipinfoWrapper = new IPinfoPlusWrapper(process.env.IPINFO_TOKEN!);

        const data = (await ipinfoWrapper.lookupIp("198.51.100.1")) as IPBogon;
        expect(data.ip).toEqual("198.51.100.1");
        expect(data.bogon).toEqual(true);
    });

    test("Error is thrown for invalid token", async () => {
        const ipinfo = new IPinfoPlusWrapper("invalid-token");
        await expect(ipinfo.lookupIp("1.2.3.4")).rejects.toThrow();
    });

    test("Error is thrown when response cannot be parsed as JSON", async () => {
        const baseUrlWithUnparseableResponse = "https://ipinfo.io/developers#";

        const ipinfo = new IPinfoPlusWrapper(
            "token",
            undefined,
            undefined,
            undefined,
            baseUrlWithUnparseableResponse
        );

        await expect(ipinfo.lookupIp("1.2.3.4")).rejects.toThrow();

        const result = await ipinfo
            .lookupIp("1.2.3.4")
            .then((_) => "parseable")
            .catch((_) => "unparseable");

        expect(result).toEqual("unparseable");
    });
});
