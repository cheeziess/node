import * as dotenv from "dotenv";
import { IPBogon, IPinfoCore } from "../src/common";
import IPinfoCoreWrapper from "../src/ipinfoCoreWrapper";

const testIfTokenIsSet = process.env.IPINFO_TOKEN ? test : test.skip;

beforeAll(() => {
    dotenv.config();
});

describe("IPinfoCoreWrapper", () => {
    testIfTokenIsSet("lookupIp", async () => {
        const ipinfoWrapper = new IPinfoCoreWrapper(process.env.IPINFO_TOKEN!);

        // test multiple times for cache.
        for (let i = 0; i < 5; i++) {
            const data = (await ipinfoWrapper.lookupIp(
                "8.8.8.8"
            )) as IPinfoCore;

            // Basic fields
            expect(data.ip).toEqual("8.8.8.8");

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

            // Check nested as object with all fields
            expect(data.as).toBeDefined();
            expect(typeof data.as).toBe("object");
            expect(data.as.asn).toBeDefined();
            expect(data.as.name).toBeDefined();
            expect(data.as.domain).toBeDefined();
            expect(data.as.type).toBeDefined();

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
        const ipinfoWrapper = new IPinfoCoreWrapper(process.env.IPINFO_TOKEN!);

        const data = (await ipinfoWrapper.lookupIp("198.51.100.1")) as IPBogon;
        expect(data.ip).toEqual("198.51.100.1");
        expect(data.bogon).toEqual(true);
    });

    test("Error is thrown for invalid token", async () => {
        const ipinfo = new IPinfoCoreWrapper("invalid-token");
        await expect(ipinfo.lookupIp("1.2.3.4")).rejects.toThrow();
    });

    test("Error is thrown when response cannot be parsed as JSON", async () => {
        const baseUrlWithUnparseableResponse = "https://ipinfo.io/developers#";

        const ipinfo = new IPinfoCoreWrapper(
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
